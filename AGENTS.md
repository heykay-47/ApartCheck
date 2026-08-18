# ApartCheck Agent Notes

## Workspace

- npm workspaces: `client/` is React/Vite; `server/` is Express/Mongoose. Production Express serves `client/dist` and the SPA fallback from one origin.
- Node must be `>=22.12.0`; use the root lockfile with `npm ci`.
- Server feature modules own model, Zod schema, service, controller, and routes. Mount resource routes through `createProtectedApiRouter()` so authentication and forced-password checks cannot be bypassed.

## Environment

- Local MongoDB must be a replica set; bootstrap and user/unit invariants use transactions. Tests start their own one-node `MongoMemoryReplSet`.
- npm workspace scripts run with `server/` as cwd. For normal local development, copy the root template to `server/.env`, not root `.env`: `cp .env.example server/.env`.
- Required server values: `MONGODB_URI`, `JWT_SECRET` (32+ chars), and `APP_BASE_URL`. Local development uses bounded in-memory image storage when Cloudinary values are blank; production additionally requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_AUTH_TOKEN_KEY` in the deployment secret store. Keep `TRUST_PROXY_HOPS=0` locally; Render sets it to `1`.
- Quick manual stack without local Mongo: run `PORT=3301 npm run dev:e2e -w server`, then `VITE_API_TARGET=http://127.0.0.1:3301 npm run dev -w client -- --host 0.0.0.0`. Data is ephemeral.

## Verification

- CI order: `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, `npm run test:a11y`. Keep E2E and a11y sequential because both own frontend port `5173`; browser server setup injects fake image storage and needs no Cloudinary credentials.
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
- Ticket Evidence queries must include authenticated `societyId` and `ticketId`; provider IDs never authorize access. Only the assigned Technician can upload or remove active evidence during assigned/in-progress work. Submission seals an immutable evidence set; sealed photos have no ordinary deletion path and signed view URLs never enter Ticket cache or persisted DTOs.

## Scope And Operations

- The deployed scope includes society setup, units, users, assets, QR lookup, role-gated views, and the Phase 2 Ticket lifecycle with completion photo evidence and immutable attempts. Vendors, costs, PDFs, comments, richer uploads/media, SLAs, notifications, analytics, integrations, and multi-Society administration remain deferred.
- `render.yaml` deploys one web service. Atlas/Render provisioning, Cloudinary credential setup, and public URL/browser verification remain manual; do not claim live photo delivery or deployment verification until README curl and browser checks pass.
