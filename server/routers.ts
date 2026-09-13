import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createFile, deleteFileByOwner, getFileByShareToken, listFilesByOwner } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { logger } from "./_core/logger";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const uploadInput = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().max(160).default("application/octet-stream"),
  sizeBytes: z.number().int().positive().max(MAX_FILE_BYTES),
  base64: z.string().min(1).max(36_000_000),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      logger.info("auth.me", { userId: opts.ctx.user?.id ?? null });
      return opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      logger.info("auth.logout", { userId: ctx.user?.id ?? null });
      return {
        success: true,
      } as const;
    }),
  }),
  files: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const files = await listFilesByOwner(ctx.user.id);
      logger.info("files.list.completed", { userId: ctx.user.id, count: files.length });
      return files;
    }),
    upload: protectedProcedure.input(uploadInput).mutation(async ({ ctx, input }) => {
      const startedAt = Date.now();
      logger.info("files.upload.started", { userId: ctx.user.id, filename: input.filename, bytes: input.sizeBytes, mimeType: input.mimeType });
      if (input.sizeBytes > MAX_FILE_BYTES) {
        logger.warn("files.upload.rejected", { userId: ctx.user.id, reason: "size_limit", bytes: input.sizeBytes });
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ukuran file maksimal 25 MB." });
      }
      const bytes = Buffer.from(input.base64, "base64");
      if (bytes.length !== input.sizeBytes || bytes.length > MAX_FILE_BYTES) {
        logger.warn("files.upload.rejected", { userId: ctx.user.id, reason: "invalid_payload", declaredBytes: input.sizeBytes, decodedBytes: bytes.length });
        throw new TRPCError({ code: "BAD_REQUEST", message: "Data file tidak valid atau melebihi batas ukuran." });
      }
      const safeName = input.filename.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || "file";
      try {
        const { key, url } = await storagePut(`dropvault/${ctx.user.id}/${Date.now()}-${safeName}`, bytes, input.mimeType);
        const created = await createFile({
        ownerId: ctx.user.id,
        originalName: input.filename,
        storageKey: key,
        storageUrl: url,
        mimeType: input.mimeType,
        sizeBytes: bytes.length,
        shareToken: nanoid(12),
        });
        logger.info("files.upload.completed", { userId: ctx.user.id, fileId: created.id, bytes: bytes.length, durationMs: Date.now() - startedAt });
        return created;
      } catch (error) {
        logger.error("files.upload.failed", error, { userId: ctx.user.id, filename: input.filename, bytes: input.sizeBytes, durationMs: Date.now() - startedAt });
        throw error;
      }
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      logger.info("files.delete.started", { userId: ctx.user.id, fileId: input.id });
      const deleted = await deleteFileByOwner(input.id, ctx.user.id);
      if (!deleted) {
        logger.warn("files.delete.not_found", { userId: ctx.user.id, fileId: input.id });
        throw new TRPCError({ code: "NOT_FOUND", message: "File tidak ditemukan." });
      }
      logger.info("files.delete.completed", { userId: ctx.user.id, fileId: input.id });
      return { success: true } as const;
    }),
    getPublic: publicProcedure.input(z.object({ token: z.string().min(8).max(32) })).query(async ({ input }) => {
      logger.info("files.public_lookup.started", { tokenLength: input.token.length });
      const file = await getFileByShareToken(input.token);
      if (!file) {
        logger.warn("files.public_lookup.not_found", { tokenLength: input.token.length });
        throw new TRPCError({ code: "NOT_FOUND", message: "Link file tidak ditemukan atau sudah dihapus." });
      }
      logger.info("files.public_lookup.completed", { fileId: file.id });
      return file;
    }),
  }),
});

export type AppRouter = typeof appRouter;
