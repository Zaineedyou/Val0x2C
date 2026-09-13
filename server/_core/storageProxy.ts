import type { Express } from "express";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./env";
import { logger } from "./logger";
import { LOCAL_STORAGE_DIR, localPath } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      try {
        const filePath = localPath(key);
        const info = await stat(filePath);
        res.set("Content-Length", String(info.size));
        res.set("Cache-Control", "private, max-age=3600");
        createReadStream(filePath).pipe(res);
      } catch (error) {
        logger.warn("storage.local_get.failed", { key, directory: LOCAL_STORAGE_DIR, error: error instanceof Error ? error.message : String(error) });
        res.status(404).send("File not found");
      }
      return;
    }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        logger.error("storage.proxy.forge_failed", `HTTP ${forgeResp.status}`, { key, status: forgeResp.status, body });
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        logger.error("storage.proxy.empty_url", "Empty signed URL from backend", { key });
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (error) {
      logger.error("storage.proxy.failed", error, { key });
      res.status(502).send("Storage proxy error");
    }
  });
}
