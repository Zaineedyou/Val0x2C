import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

const LOCAL_STORAGE_DIR = process.env.UPLOAD_DIR || "/tmp/val0x2c-uploads";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) return null;
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function localPath(key: string): string {
  const normalized = normalizeKey(key);
  const resolved = path.resolve(LOCAL_STORAGE_DIR, normalized);
  const root = path.resolve(LOCAL_STORAGE_DIR);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const bytes = typeof data === "string" ? Buffer.byteLength(data) : data.length;
  const forge = getForgeConfig();

  logger.info("storage.put.started", { key, bytes, contentType, backend: forge ? "forge" : "local" });

  if (!forge) {
    const target = localPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    logger.warn("storage.put.local_fallback", { key, bytes, reason: "Forge storage env is missing" });
    logger.info("storage.put.completed", { key, bytes, backend: "local" });
    return { key, url: `/manus-storage/${key}` };
  }

  const presignUrl = new URL("v1/storage/presign/put", `${forge.forgeUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forge.forgeKey}` },
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    logger.error("storage.presign.put.failed", `HTTP ${presignResp.status}`, { key, status: presignResp.status });
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) {
    logger.error("storage.presign.put.empty", "Forge returned empty presign URL", { key });
    throw new Error("Forge returned empty presign URL");
  }

  const blob = typeof data === "string"
    ? new Blob([data], { type: contentType })
    : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadResp.ok) {
    logger.error("storage.put.failed", `HTTP ${uploadResp.status}`, { key, status: uploadResp.status });
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  logger.info("storage.put.completed", { key, bytes, backend: "forge" });
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const forge = getForgeConfig();
  if (!forge) return `/manus-storage/${normalizeKey(relKey)}`;
  const key = normalizeKey(relKey);
  const getUrl = new URL("v1/storage/presign/get", `${forge.forgeUrl}/`);
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forge.forgeKey}` },
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    logger.error("storage.presign.get.failed", `HTTP ${resp.status}`, { key, status: resp.status });
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = (await resp.json()) as { url: string };
  return url;
}

export { LOCAL_STORAGE_DIR, localPath };
