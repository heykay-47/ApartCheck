# ApartCheck Agent Notes

## Workspace

- npm workspaces: `client/` is React/Vite; `server/` is Express/Mongoose. Production Express serves `client/dist` and the SPA fallback from one origin.
- Node must be `>=22.12.0`; use the root lockfile with `npm ci`.
- Server feature modules own model, Zod schema, service, controller, and routes. Mount resource routes through `createProtectedApiRouter()` so authentication and forced-password checks cannot be bypassed.

## Environment

- Local MongoDB must be a replica set; bootstrap and user/unit invariants use transactions. Tests start their own one-node `MongoMemoryReplSet`.
- npm workspace scripts run with `server/` as cwd. For normal local development, copy the root template to `server/.env`, not root `.env`: `cp .env.example server/.env`.
- Required server values: `MONGODB_URI`, `JWT_SECRET` (32+ chars), and `APP_BASE_URL`. Keep `TRUST_PROXY_HOPS=0` locally; Render sets it to `1`.
- Quick manual stack without local Mongo: run `PORT=3301 npm run dev:e2e -w server`, then `VITE_API_TARGET=http://127.0.0.1:3301 npm run dev -w client -- --host 0.0.0.0`. Data is ephemeral.

## Verification

- CI order: `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, `npm run test:a11y`.
- Focus server test: `npm run test -w server -- tests/integration/auth.test.ts`.
- Focus client test: `npm run test -w client -- src/features/assets/assets.test.tsx`.
- Playwright requires free frontend port `5173` and backend port `3000`. If `3000` is occupied, use `E2E_SERVER_PORT=3301 npm run test:e2e`; run E2E and a11y sequentially because both use `5173`.

## Invariants

- Product UI supports one society, but every resource query must include authenticated `societyId`; isolation tests create a second society directly.
- Roles are exactly `admin`, `resident`, `technician`. Asset categories are exactly `lift`, `plumbing`, `electrical`.
- Browser code never reads JWTs. Sessions use an HttpOnly cookie; password reset, disable, and recovery increment `tokenVersion`.
- API collections use `{ assets|units|users, pagination }`; single resources use named envelopes. Errors use `{ error: { code, message, fieldErrors?, requestId } }`.
- Temporary passwords may appear only in creation/reset/recovery responses and one UI handoff; never persist them in query/mutation cache, storage, logs, or models.
- Unknown, archived, malformed-ID, and cross-society QR lookups must remain indistinguishable `404` responses.

## Scope And Operations

- The deployed scope includes society setup, units, users, assets, QR lookup, role-gated views, and the Phase 2 Ticket lifecycle. Vendors, costs, uploads/media, SLAs, notifications, analytics, integrations, and multi-Society administration remain deferred.
- `render.yaml` deploys one web service. Atlas/Render provisioning and public URL verification remain manual; do not claim deployment until README curl and browser checks pass.
