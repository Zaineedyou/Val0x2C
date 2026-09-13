import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createFile, deleteFileByOwner, getFileByShareToken, listFilesByOwner } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";

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
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  files: router({
    list: protectedProcedure.query(({ ctx }) => listFilesByOwner(ctx.user.id)),
    upload: protectedProcedure.input(uploadInput).mutation(async ({ ctx, input }) => {
      if (input.sizeBytes > MAX_FILE_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ukuran file maksimal 25 MB." });
      }
      const bytes = Buffer.from(input.base64, "base64");
      if (bytes.length !== input.sizeBytes || bytes.length > MAX_FILE_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Data file tidak valid atau melebihi batas ukuran." });
      }
      const safeName = input.filename.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || "file";
      const { key, url } = await storagePut(`dropvault/${ctx.user.id}/${Date.now()}-${safeName}`, bytes, input.mimeType);
      return createFile({
        ownerId: ctx.user.id,
        originalName: input.filename,
        storageKey: key,
        storageUrl: url,
        mimeType: input.mimeType,
        sizeBytes: bytes.length,
        shareToken: nanoid(12),
      });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const deleted = await deleteFileByOwner(input.id, ctx.user.id);
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "File tidak ditemukan." });
      return { success: true } as const;
    }),
    getPublic: publicProcedure.input(z.object({ token: z.string().min(8).max(32) })).query(async ({ input }) => {
      const file = await getFileByShareToken(input.token);
      if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "Link file tidak ditemukan atau sudah dihapus." });
      return file;
    }),
  }),
});

export type AppRouter = typeof appRouter;
