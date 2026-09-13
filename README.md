# Val0x2C

Val0x2C is a compact MediaFire-style file hosting app built with React, tRPC, Drizzle, PostgreSQL, and the built-in object storage layer.

## Included

- Google OAuth sign-in
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

The project expects the environment variables described in `server/_core/env.ts`. Google OAuth and the locally signed application session are the default authentication path. Manus OAuth is optional and is enabled only when `OAUTH_SERVER_URL` is set. Do not commit `.env` files or storage credentials.

## Database

PostgreSQL is the primary database because the application has relational ownership, account, and file metadata with transactional writes. Set `DATABASE_URL` to a PostgreSQL connection string such as `postgresql://user:password@host:5432/val0x2c`, then run `pnpm db:push` to generate and apply the Drizzle migration.

## Google OAuth setup

Create a free OAuth 2.0 Web application client in Google Cloud Console. Add the exact redirect URI `https://YOUR_DOMAIN/api/auth/google/callback` (or `http://localhost:3000/api/auth/google/callback` for local development), then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optionally `GOOGLE_REDIRECT_URI` from `.env.example`. The app handles state validation, code exchange, Google profile lookup, account upsert, and the signed session cookie at `/api/auth/google`.

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
