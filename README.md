# DropVault

DropVault is a compact MediaFire-style file hosting app built with React, tRPC, Drizzle, MySQL/TiDB, and the built-in object storage layer.

## Included

- Manus OAuth sign-in
- Authenticated file dashboard
- Upload files up to 25 MB per file
- Object storage-backed file bytes; database stores metadata only
- Unique public share links under `/s/:token`
- Copy-link, open-link, download, refresh, and delete actions
- Per-user file ownership checks on list and delete operations
- Public link lookup without exposing the owner dashboard

## Development

```bash
pnpm install
pnpm dev
```

The project expects the platform-provided environment variables described in `server/_core/env.ts`. Do not commit `.env` files or storage credentials.

## Data model

The `files` table stores the owner id, original filename, MIME type, byte size, storage key/url, share token, and creation timestamp. File contents are uploaded through `storagePut()` and are never stored in database columns.

## Limits and safety

Uploads are limited to 25 MB. The server validates both the declared byte size and the decoded payload size before uploading. Share tokens are generated with `nanoid`, and every private dashboard mutation is protected by the authenticated user context.

## Verification

```bash
pnpm check
pnpm test
pnpm build
```

## Project structure

- `client/src/pages/Home.tsx` — public landing page and authenticated file dashboard
- `client/src/pages/SharePage.tsx` — public file download page
- `server/routers.ts` — upload, list, delete, and public lookup procedures
- `server/db.ts` — database query helpers
- `server/storage.ts` — preconfigured object storage helpers
- `drizzle/schema.ts` — users and files schema
