import crypto from "node:crypto";
import type { Request } from "express";

export type LogFields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, error: unknown, fields: LogFields = {}) =>
    write("error", event, {
      ...fields,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
};

export function requestId(req: Request): string {
  const incoming = req.headers["x-request-id"];
  return typeof incoming === "string" && incoming.length <= 128
    ? incoming
    : crypto.randomUUID();
}

export function safeRequestLog(req: Request) {
  return {
    requestId: requestId(req),
    method: req.method,
    path: req.path,
  };
}
