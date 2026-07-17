# ApartCheck Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publicly deploy ApartCheck's single-society foundation with secure role-based authentication, unit and user onboarding, protected asset records, and printable QR identity labels.

**Architecture:** Use an npm-workspaces monorepo containing a React/Vite client and an Express modular-monolith server. Express serves both `/api` and the compiled SPA from one Render service, while Mongoose persists society-scoped data in MongoDB Atlas and an `HttpOnly` JWT cookie carries the session.

**Tech Stack:** Node.js 22.12+, TypeScript, React 19, Vite 8, Tailwind CSS 4, TanStack Query 5, React Router, Express 5.2+, Mongoose 9+, Zod, bcrypt, JSON Web Token, Vitest, Testing Library, Supertest, MongoDB Memory Server, Playwright, MongoDB Atlas, Render, GitHub Actions.

## Global Constraints

- Implement only Phase 1 from `docs/superpowers/specs/2026-07-17-apartcheck-phase-1-design.md`.
- Support one product-visible society; retain `societyId` filtering in every resource service.
- Use exactly `resident`, `admin`, and `technician` roles.
- Use exactly `lift`, `plumbing`, and `electrical` asset categories.
- Store JWT only in a host-only `HttpOnly`, `SameSite=Lax` cookie; add `Secure` in production.
- Use bcrypt cost factor 12 and accept user passwords from 12 through 72 bytes.
- Return every API error as `{ error: { code, message, fieldErrors?, requestId } }`.
- Never return password hashes, JWTs, cookies, or previously issued temporary passwords.
- Use the approved Plaster, Chalk, Monsoon Slate, Pump-room Blue, Inspection Marigold, and Verified Green visual tokens without gradients.
- Self-host Barlow Condensed, Hind, and IBM Plex Mono through package-managed font files.
- Keep controls and messages outcome-focused: `Create account`, `Issue new temporary password`, `Archive asset`, and `Print asset label`.
- Preserve visible keyboard focus, reduced-motion behavior, and a 360 px minimum viewport without horizontal scrolling.
- Do not add tickets, vendors, comments, audit events, evidence uploads, Cloudinary, email, cron jobs, analytics, CSV import, or multi-society UI.
- Follow red-green-refactor for every behavior task and stage only files listed by that task.

## File Map

### Root

- `package.json`: npm workspaces and cross-workspace scripts.
- `package-lock.json`: reproducible dependency graph.
- `tsconfig.base.json`: shared strict TypeScript options.
- `eslint.config.js`: flat ESLint configuration for server and client.
- `.prettierrc.json`: formatting policy.
- `.gitignore`: generated files, local environment, logs, and Playwright artifacts.
- `.env.example`: complete environment contract without secrets.
- `render.yaml`: one Render web service.
- `.github/workflows/ci.yml`: formatting, lint, type, test, build, and browser checks.
- `README.md`: problem, architecture, setup, recovery, deployment, and pilot usage.

### Server

- `server/src/app.ts`: Express application composition and production SPA host.
- `server/src/server.ts`: environment validation, database lifecycle, and listener startup.
- `server/src/config/env.ts`: typed environment parsing.
- `server/src/config/database.ts`: Mongoose connect/disconnect helpers.
- `server/src/http/app-error.ts`: typed operational errors.
- `server/src/http/error-handler.ts`: canonical API error response.
- `server/src/http/request-context.ts`: request ID and structured request logging.
- `server/src/http/origin-guard.ts`: unsafe-method same-origin enforcement.
- `server/src/http/authenticate.ts`: cookie verification and active-user loading.
- `server/src/http/authorize.ts`: role policy middleware.
- `server/src/http/require-password-change.ts`: forced-password route restriction.
- `server/src/http/not-found.ts`: API `404` conversion.
- `server/src/types/express.d.ts`: authenticated actor request augmentation.
- `server/src/scripts/recover-admin.ts`: operator-only owner-admin recovery wrapper.
- `server/src/features/auth/*`: bootstrap, login, logout, session, and password flows.
- `server/src/features/societies/*`: society model and read/update behavior.
- `server/src/features/units/*`: unit model and admin CRUD behavior.
- `server/src/features/users/*`: user model and admin account behavior.
- `server/src/features/assets/*`: asset model, protected reads, and QR generation.
- `server/tests/setup.ts`: replica-set test database lifecycle.
- `server/tests/helpers/factories.ts`: direct test fixtures for isolation scenarios.
- `server/tests/unit/*`: deterministic policy and generator tests.
- `server/tests/integration/*`: HTTP and database behavior tests.

Each server feature uses `*.model.ts`, `*.schema.ts`, `*.service.ts`, `*.controller.ts`, and `*.routes.ts` files. Schema files contain Zod request validation, not Mongoose persistence definitions.

### Client

- `client/src/main.tsx`: browser entry.
- `client/src/app/providers.tsx`: QueryClient, router, and auth composition.
- `client/src/app/router.tsx`: route tree and role metadata.
- `client/src/app/api.ts`: credentialed fetch wrapper and `ApiError`.
- `client/src/app/query-client.ts`: query defaults.
- `client/src/styles/tokens.css`: approved CSS custom properties and fonts.
- `client/src/styles/global.css`: Tailwind import, reset, focus, and base layout.
- `client/src/components/*`: shared shell, ledger, fields, dialogs, feedback, and guards.
- `client/src/features/auth/*`: setup, login, forced password, profile, and auth query.
- `client/src/features/dashboard/*`: role-specific landing content.
- `client/src/features/society/*`: society settings.
- `client/src/features/units/*`: unit management.
- `client/src/features/users/*`: account management and credential handoff.
- `client/src/features/assets/*`: asset ledger, editor, detail, scan resolver, and label.
- `client/src/test/*`: Testing Library setup and render helpers.
- `client/e2e/phase-one.spec.ts`: complete pilot browser flow.
- `client/e2e/accessibility.spec.ts`: keyboard, viewport, reduced-motion, and axe checks.

---

### Task 1: Scaffold Workspaces And Executable Baseline

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.base.json`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/vitest.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/App.test.tsx`
- Create: `client/src/test/setup.ts`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`
- Create: `server/tests/test-env.ts`
- Create: `server/tests/live.test.ts`
- Track: `docs/spec.md`

**Interfaces:**
- Produces: `createApp(): Express` from `server/src/app.ts`.
- Produces: root scripts `dev`, `build`, `test`, `typecheck`, `lint`, `format`, and `format:check`.

- [ ] **Step 1: Create workspace manifests and install dependencies**

Run:

```bash
npm init -y
npm pkg set private=true
npm pkg set engines.node=">=22.12.0"
npm pkg set "workspaces[0]=client" "workspaces[1]=server"
npm create vite@latest client -- --template react-ts
mkdir server
npm init -w server -y
npm install -D concurrently prettier eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh
npm install express@^5.2.0 mongoose@^9.0.1 zod bcrypt jsonwebtoken cookie-parser helmet express-rate-limit pino pino-http qrcode -w server
npm install -D typescript tsx vitest supertest mongodb-memory-server @types/node @types/express @types/bcrypt @types/jsonwebtoken @types/cookie-parser @types/supertest @types/qrcode -w server
npm install react@^19 react-dom@^19 react-router-dom @tanstack/react-query react-hook-form @hookform/resolvers zod @fontsource/barlow-condensed @fontsource/hind @fontsource/ibm-plex-mono -w client
npm install -D vite@^8 @vitejs/plugin-react @tailwindcss/vite tailwindcss vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @axe-core/playwright -w client
```

Expected: npm creates one root lockfile and reports both workspaces without dependency-resolution errors.

- [ ] **Step 2: Set root scripts and strict shared TypeScript options**

Set root scripts to:

```json
{
  "dev": "concurrently -k \"npm run dev -w server\" \"npm run dev -w client\"",
  "build": "npm run build -w client && npm run build -w server",
  "test": "npm run test -w server && npm run test -w client",
  "typecheck": "npm run typecheck -w server && npm run typecheck -w client",
  "lint": "eslint client server",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

Set server workspace scripts to:

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "test": "vitest run",
  "typecheck": "tsc -p tsconfig.json --noEmit"
}
```

Set client workspace scripts to:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "test": "vitest run",
  "typecheck": "tsc -b --pretty false"
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

Configure Prettier with `semi: false`, `singleQuote: true`, and `trailingComma: "all"`. Ignore `node_modules`, both `dist` directories, coverage, `playwright-report`, `test-results`, and local `.env` files.

Configure ESLint flat config from `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`. Apply recommended JavaScript and TypeScript rules to both workspaces, React Hooks and refresh rules to `client/**/*.{ts,tsx}`, and ignore generated directories listed above.

- [ ] **Step 3: Write failing server and client baseline tests**

Create `server/tests/live.test.ts`:

```ts
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

describe('GET /api/health/live', () => {
  it('reports process liveness', async () => {
    const response = await request(createApp()).get('/api/health/live')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})
```

Create `client/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('identifies the product', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'ApartCheck' })).toBeVisible()
  })
})
```

- [ ] **Step 4: Run tests to verify red state**

Run: `npm test`

Expected: FAIL because `createApp` and the named `App` export do not yet satisfy the tests.

- [ ] **Step 5: Implement minimal executable apps**

Create `server/src/app.ts`:

```ts
import express, { type Express } from 'express'

export function createApp(): Express {
  const app = express()
  app.get('/api/health/live', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })
  return app
}
```

Create `server/src/server.ts`:

```ts
import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3000)

createApp().listen(port, () => {
  process.stdout.write(`ApartCheck listening on ${port}\n`)
})
```

Create `client/src/App.tsx`:

```tsx
export function App() {
  return <h1>ApartCheck</h1>
}
```

Point `client/src/main.tsx` at `<App />`. Import `@testing-library/jest-dom/vitest` from `client/src/test/setup.ts`; configure client Vitest with `jsdom`, globals disabled, and that setup file. Configure server Vitest for Node with `server/tests/test-env.ts`, which sets deterministic test values for all five environment variables before module imports. Configure Vite's development proxy:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:3000',
  },
}
```

- [ ] **Step 6: Verify baseline**

Run: `npm test && npm run typecheck && npm run build`

Expected: two test files pass, both TypeScript checks exit 0, and `client/dist` plus `server/dist` exist.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json eslint.config.js .prettierrc.json .gitignore .env.example client server docs/spec.md
git commit -m "chore: scaffold ApartCheck workspaces"
```

### Task 2: Add Server Runtime, Error Contract, And Security Shell

**Files:**
- Create: `server/src/config/env.ts`
- Create: `server/src/config/database.ts`
- Create: `server/src/http/app-error.ts`
- Create: `server/src/http/error-handler.ts`
- Create: `server/src/http/not-found.ts`
- Create: `server/src/http/origin-guard.ts`
- Create: `server/src/http/request-context.ts`
- Create: `server/src/types/express.d.ts`
- Create: `server/tests/error-contract.test.ts`
- Create: `server/tests/origin-guard.test.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/server.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `env` with `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`, and `APP_BASE_URL`.
- Produces: `AppError(status, code, message, fieldErrors?)`.
- Produces: `connectDatabase(uri): Promise<void>` and `disconnectDatabase(): Promise<void>`.
- Produces: every request has `request.id`; every API error contains `requestId`.

- [ ] **Step 1: Write failing error and origin tests**

Request unknown `/api/missing` and assert:

```ts
expect(response.status).toBe(404)
expect(response.body).toEqual({
  error: {
    code: 'ROUTE_NOT_FOUND',
    message: 'API route not found.',
    requestId: expect.any(String),
  },
})
```

Unit-test `originGuard` with mocked request/response/next objects. An unsafe request with `Origin: https://evil.example` returns `403 ORIGIN_NOT_ALLOWED`; an origin equal to `APP_BASE_URL` and a request without an `Origin` header both call `next()`.

Send malformed JSON and assert `400 INVALID_JSON` with a request ID. Before database connection, assert `/api/health/ready` returns `503` with code `DATABASE_UNAVAILABLE` and a request ID.

- [ ] **Step 2: Run focused tests to verify red state**

Run: `npm run test -w server -- error-contract origin-guard`

Expected: FAIL because canonical errors, request IDs, and origin checks do not exist.

- [ ] **Step 3: Implement typed configuration and database lifecycle**

Parse environment with this shape:

```ts
const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  APP_BASE_URL: z.string().url(),
})
```

Use `mongoose.connect(uri)` and `mongoose.disconnect()`. In `server.ts`, validate environment, connect before listening, set `app.set('trust proxy', 1)` in production, and close HTTP plus MongoDB on `SIGTERM` and `SIGINT`.

Add `GET /api/health/ready`: return `200 { status: 'ok' }` only when `mongoose.connection.readyState === 1`; otherwise return canonical `503 DATABASE_UNAVAILABLE`. Extend Express request typing so `request.id` is a required string.

- [ ] **Step 4: Implement HTTP shell**

Create `AppError` with readonly `status`, `code`, and optional `fieldErrors`. Add middleware in this order:

1. request ID from valid incoming `X-Request-Id` or `crypto.randomUUID()`
2. `pino-http` with cookie, authorization, password, and temporary-password redaction
3. `helmet()`
4. `express.json({ limit: '100kb' })`
5. unsafe-method origin guard for `/api`
6. routes
7. API not-found handler
8. production static host and SPA fallback added by Task 13
9. four-argument error handler, always last

Map Zod errors to `400 VALIDATION_ERROR`, Mongoose duplicate-key errors to `409 DUPLICATE_RESOURCE`, operational `AppError` values unchanged, and unknown errors to `500 INTERNAL_ERROR` with message `An unexpected error occurred.` Every branch includes `requestId`.

- [ ] **Step 5: Verify runtime shell**

Run: `npm run test -w server -- error-contract origin-guard && npm run typecheck -w server`

Expected: focused tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit**

```bash
git add server/src/config server/src/http server/src/types/express.d.ts server/src/app.ts server/src/server.ts server/tests/error-contract.test.ts server/tests/origin-guard.test.ts .env.example
git commit -m "feat(server): add secure HTTP runtime"
```

### Task 3: Define Persistence Models And Replica-Set Test Harness

**Files:**
- Create: `server/src/features/societies/society.model.ts`
- Create: `server/src/features/units/unit.model.ts`
- Create: `server/src/features/users/user.model.ts`
- Create: `server/src/features/assets/asset.model.ts`
- Create: `server/tests/setup.ts`
- Create: `server/tests/helpers/factories.ts`
- Create: `server/tests/models.test.ts`
- Modify: `server/vitest.config.ts`
- Modify: `server/src/server.ts`

**Interfaces:**
- Produces: `SocietyModel`, `UnitModel`, `UserModel`, and `AssetModel`.
- Produces: `createSocietyFixture`, `createUnitFixture`, `createUserFixture`, and `createAssetFixture` for tests only.

- [ ] **Step 1: Write failing model tests**

Cover these exact cases:

```ts
it('rejects a second primary society', async () => {
  await SocietyModel.create({ name: 'Lake View', address: 'Chennai', singletonKey: 'primary' })
  await expect(
    SocietyModel.create({ name: 'Park View', address: 'Chennai', singletonKey: 'primary' }),
  ).rejects.toMatchObject({ code: 11000 })
})

it('compares unit identity case-insensitively', async () => {
  const society = await createSocietyFixture()
  await UnitModel.create({ societyId: society.id, building: 'Tower A', floor: 'G', unitNumber: 'A1' })
  await expect(
    UnitModel.create({ societyId: society.id, building: 'tower a', floor: 'g', unitNumber: 'a1' }),
  ).rejects.toMatchObject({ code: 11000 })
})
```

Also assert global normalized email uniqueness, resident `unitId` requirement, non-resident `unitId` absence, asset category enum, unique `qrToken`, and default `tokenVersion: 0`, `active: true`, and `archivedAt: null` values.

- [ ] **Step 2: Run model tests to verify red state**

Run: `npm run test -w server -- models`

Expected: FAIL because models and replica-set setup do not exist.

- [ ] **Step 3: Build replica-set test lifecycle**

Use `MongoMemoryReplSet.create({ replSet: { count: 1 } })` in setup, connect Mongoose before tests, synchronize model indexes, delete all collection documents after each test, and stop Mongoose plus the replica set after all tests. Configure `server/vitest.config.ts` with `server/tests/test-env.ts` followed by `server/tests/setup.ts` and set `maxWorkers: 1` for integration consistency.

- [ ] **Step 4: Implement exact schema fields and indexes**

Use schema timestamps and JSON transforms that expose `id` and remove `_id`, `__v`, `passwordHash`, normalization keys, and `qrToken` unless a service explicitly selects the token. Store `singletonKey` as a required string; product bootstrap always writes `primary`, while the test-only society factory writes a unique fixture key so it can construct Society B without exposing multi-society product behavior.

Define these indexes:

```ts
societySchema.index({ singletonKey: 1 }, { unique: true })
unitSchema.index(
  { societyId: 1, buildingKey: 1, floorKey: 1, unitNumberKey: 1 },
  { unique: true },
)
userSchema.index({ email: 1 }, { unique: true })
assetSchema.index({ societyId: 1, assetCode: 1 }, { unique: true })
assetSchema.index({ qrToken: 1 }, { unique: true })
assetSchema.index({ societyId: 1, category: 1, archivedAt: 1 })
```

Store trimmed lowercase `buildingKey`, `floorKey`, and `unitNumberKey` alongside display values. Mongoose validation enforces resident/non-resident unit rules before save.

After production database connection and before listening, await `init()` for all four models so bootstrap cannot receive traffic before unique indexes exist.

- [ ] **Step 5: Add direct test factories**

Factories accept explicit overrides, hash a fixed test password, and create records directly through models. They must support a second society without calling product bootstrap so isolation tests can construct hostile fixtures.

- [ ] **Step 6: Verify models**

Run: `npm run test -w server -- models && npm run typecheck -w server`

Expected: all model cases pass; TypeScript exits 0.

- [ ] **Step 7: Commit**

```bash
git add server/src/features/societies server/src/features/units server/src/features/users server/src/features/assets server/src/server.ts server/tests/setup.ts server/tests/helpers server/tests/models.test.ts server/vitest.config.ts
git commit -m "feat(server): add foundation data models"
```

### Task 4: Implement Atomic Bootstrap And Session Primitives

**Files:**
- Create: `server/src/features/auth/auth.schema.ts`
- Create: `server/src/features/auth/auth.service.ts`
- Create: `server/src/features/auth/auth.controller.ts`
- Create: `server/src/features/auth/auth.routes.ts`
- Create: `server/src/features/auth/password.ts`
- Create: `server/src/features/auth/session.ts`
- Create: `server/tests/integration/bootstrap.test.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Produces: `hashPassword`, `verifyPassword`, and `generateTemporaryPassword`.
- Produces: `signSession`, `verifySession`, `setSessionCookie`, and `clearSessionCookie`.
- Produces: `GET /api/bootstrap/status` and `POST /api/bootstrap`.

- [ ] **Step 1: Write failing bootstrap tests**

Assert uninitialized status, successful creation, session cookie attributes, and second-attempt conflict:

```ts
const response = await request(createApp()).post('/api/bootstrap').send({
  society: { name: 'Ananya Enclave', address: 'Velachery, Chennai' },
  admin: {
    name: 'Meera Raman',
    email: 'meera@example.com',
    phone: '+919876543210',
    password: 'correct horse battery staple',
  },
})

expect(response.status).toBe(201)
expect(response.body.society.name).toBe('Ananya Enclave')
expect(response.body.user).not.toHaveProperty('passwordHash')
expect(response.headers['set-cookie'][0]).toContain('HttpOnly')
```

Send two bootstrap requests concurrently and assert one `201`, one `409 BOOTSTRAP_COMPLETE`, and exactly one society plus one admin in MongoDB.

- [ ] **Step 2: Run bootstrap tests to verify red state**

Run: `npm run test -w server -- bootstrap`

Expected: FAIL with missing bootstrap routes.

- [ ] **Step 3: Implement password and session primitives**

Use `bcrypt.hash(password, 12)`, `bcrypt.compare`, and `crypto.randomBytes` for a 16-character temporary password. Reject selected passwords outside 12 through 72 UTF-8 bytes.

JWT payload type:

```ts
type SessionPayload = {
  sub: string
  societyId: string
  tokenVersion: number
}
```

Sign with HS256 for `8h` and verify with an explicit HS256 algorithm allowlist. Use cookie name `apartcheck_session` in development and `__Host-apartcheck_session` in production. Cookie helpers must share identical path and production attributes so logout reliably clears it.

- [ ] **Step 4: Implement transaction-backed bootstrap**

Validate with strict Zod objects. In `mongoose.connection.transaction(async (session) => {})`, create `Society` with `singletonKey: 'primary'`, hash the admin password, create the active admin with `mustChangePassword: false`, and return both safe JSON objects. Convert duplicate singleton failure to `409 BOOTSTRAP_COMPLETE`.

After commit, sign and set the session cookie. Do not set a cookie if the transaction aborts.

Apply a bootstrap limiter of five attempts per IP per hour.

- [ ] **Step 5: Verify bootstrap**

Run: `npm run test -w server -- bootstrap && npm run typecheck -w server`

Expected: all bootstrap tests pass, including concurrent attempts.

- [ ] **Step 6: Commit**

```bash
git add server/src/features/auth server/src/app.ts server/tests/integration/bootstrap.test.ts
git commit -m "feat(auth): add atomic society bootstrap"
```

### Task 5: Complete Authentication And Role Middleware

**Files:**
- Create: `server/src/http/authenticate.ts`
- Create: `server/src/http/authorize.ts`
- Create: `server/src/http/require-password-change.ts`
- Modify: `server/src/types/express.d.ts`
- Create: `server/tests/integration/auth.test.ts`
- Create: `server/tests/unit/authorization.test.ts`
- Modify: `server/src/features/auth/auth.schema.ts`
- Modify: `server/src/features/auth/auth.service.ts`
- Modify: `server/src/features/auth/auth.controller.ts`
- Modify: `server/src/features/auth/auth.routes.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Produces: `request.actor` with `userId`, `societyId`, `role`, `mustChangePassword`, and `tokenVersion`.
- Produces: `authenticate`, `authorize(...roles)`, and `requirePasswordChanged` middleware.
- Produces: login, logout, current-session, and own-password-change endpoints.

- [ ] **Step 1: Write failing auth lifecycle tests**

Cover login success, generic login failure, current session, idempotent logout with an invalid cookie, forced-password restriction, password change, old-session invalidation, disabled-user denial, and rate limiting.

The forced-password assertion must call a protected test route and expect:

```ts
expect(response.status).toBe(403)
expect(response.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED')
```

After password change, assert the old cookie receives `401 INVALID_SESSION` while the replacement cookie can access the route.

- [ ] **Step 2: Write failing policy unit tests**

For `authorize('admin')`, assert admin continues and resident plus technician receive `403 FORBIDDEN`. Assert unauthenticated requests receive `401 AUTHENTICATION_REQUIRED` from `authenticate` before role policy runs.

- [ ] **Step 3: Run auth tests to verify red state**

Run: `npm run test -w server -- auth authorization`

Expected: FAIL because middleware and auth endpoints are incomplete.

- [ ] **Step 4: Implement active-user authentication**

Read only the environment-specific session cookie. Verify JWT, then query:

```ts
const user = await UserModel.findOne({
  _id: payload.sub,
  societyId: payload.societyId,
  active: true,
}).select('+tokenVersion')
```

Reject missing users and token-version mismatch with `401 INVALID_SESSION`. Populate `request.actor` from the loaded user, not from a role claim in JWT.

- [ ] **Step 5: Implement auth endpoints and forced-password gate**

Routes and access:

```text
POST /api/auth/login             public, rate-limited
POST /api/auth/logout            public, origin-checked
GET  /api/auth/me                authenticated, allowed before password change
POST /api/auth/change-password   authenticated, allowed before password change
```

Login always returns `401 INVALID_CREDENTIALS` for absent user, wrong password, or inactive user. Password change verifies current password, hashes the new password, increments `tokenVersion`, clears `mustChangePassword`, and issues a replacement cookie using the new version.

Apply a login limiter of ten failed attempts per IP per 15 minutes and set `skipSuccessfulRequests: true`.

Mount `requirePasswordChanged` after auth routes and before all resource routes.

- [ ] **Step 6: Verify authentication**

Run: `npm run test -w server -- auth authorization && npm run typecheck -w server`

Expected: all auth and policy tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/http/authenticate.ts server/src/http/authorize.ts server/src/http/require-password-change.ts server/src/types/express.d.ts server/src/features/auth server/src/app.ts server/tests/integration/auth.test.ts server/tests/unit/authorization.test.ts
git commit -m "feat(auth): enforce secure user sessions"
```

### Task 6: Add Society And Unit Administration APIs

**Files:**
- Create: `server/src/features/societies/society.schema.ts`
- Create: `server/src/features/societies/society.service.ts`
- Create: `server/src/features/societies/society.controller.ts`
- Create: `server/src/features/societies/society.routes.ts`
- Create: `server/src/features/units/unit.schema.ts`
- Create: `server/src/features/units/unit.service.ts`
- Create: `server/src/features/units/unit.controller.ts`
- Create: `server/src/features/units/unit.routes.ts`
- Create: `server/tests/integration/society-units.test.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Produces: `SocietyService.getCurrent`, `SocietyService.updateCurrent`.
- Produces: `UnitService.list`, `UnitService.create`, `UnitService.update`, `UnitService.archive`.

- [ ] **Step 1: Write failing society and unit API tests**

Assert all roles can `GET /api/society`, only admin can patch it, only admin can access unit routes, list pagination has `{ page, pageSize, total, pages }`, search is case-insensitive, duplicate normalized identity returns `409 DUPLICATE_UNIT`, and a unit with an active resident returns `409 UNIT_HAS_ACTIVE_RESIDENTS` on archive.

Create Society A and Society B through factories. Authenticate a Society A admin, request a Society B unit ID, and assert `404 UNIT_NOT_FOUND` for read, update, and archive attempts.

- [ ] **Step 2: Run focused tests to verify red state**

Run: `npm run test -w server -- society-units`

Expected: FAIL with missing routes.

- [ ] **Step 3: Implement strict request schemas**

Society update accepts only non-empty `name` and `address`. Unit create/update accepts only `building`, `floor`, and `unitNumber`. Unit list accepts `page` default 1, `pageSize` default 25 and maximum 100, plus optional `search`. Unknown fields fail with `400 VALIDATION_ERROR`.

- [ ] **Step 4: Implement society-scoped services and routes**

Every unit query starts with `{ societyId: actor.societyId }`. Search escapes regex metacharacters and matches display building, floor, or unit number. Archive uses one conditional update after checking active residents in the same society; set `archivedAt` to current time and never delete.

Mount routes after `authenticate` and `requirePasswordChanged`; add `authorize('admin')` to all mutation and unit routes.

- [ ] **Step 5: Verify society and units**

Run: `npm run test -w server -- society-units && npm run typecheck -w server`

Expected: all tests pass, including isolation and archive conflict.

- [ ] **Step 6: Commit**

```bash
git add server/src/features/societies server/src/features/units server/src/app.ts server/tests/integration/society-units.test.ts
git commit -m "feat(admin): manage society units"
```

### Task 7: Add Secure User Administration APIs

**Files:**
- Create: `server/src/features/users/user.schema.ts`
- Create: `server/src/features/users/user.service.ts`
- Create: `server/src/features/users/user.controller.ts`
- Create: `server/src/features/users/user.routes.ts`
- Create: `server/src/features/users/recover-admin.ts`
- Create: `server/src/scripts/recover-admin.ts`
- Create: `server/tests/integration/users.test.ts`
- Create: `server/tests/integration/recover-admin.test.ts`
- Modify: `server/src/app.ts`
- Modify: `server/package.json`

**Interfaces:**
- Produces: `UserService.list`, `create`, `update`, `setStatus`, `resetPassword`, and `updateSelf`.
- Produces: `{ user, temporaryPassword }` only from account creation and password reset.

- [ ] **Step 1: Write failing user-management tests**

Cover:

- Admin creates resident with active same-society unit and receives a 16-character temporary password once.
- Stored hash differs from temporary plaintext.
- Technician and admin reject `unitId`; resident requires it.
- Archived and cross-society units return `404 UNIT_NOT_FOUND`.
- Non-admin user routes return `403`.
- Reset increments token version and invalidates an existing session.
- Disable increments token version; re-enable does not revive old cookie.
- Last active admin cannot be disabled or demoted and returns `409 LAST_ACTIVE_ADMIN`.
- User lists never contain `passwordHash`, `qrToken`, or a temporary password.
- Any role can update only their own name and phone through `/api/users/me`.
- Recovery command accepts one admin email, re-enables that admin, issues one temporary password, increments token version, and prints plaintext once without logging it elsewhere.

- [ ] **Step 2: Run user tests to verify red state**

Run: `npm run test -w server -- users`

Expected: FAIL with missing user routes.

- [ ] **Step 3: Implement validation and safe serialization**

Use strict schemas. Normalize email with trim plus lowercase. Trim phone and require already explicit E.164 form with `^\+[1-9]\d{7,14}$`; never infer a country code. Permit roles only from the global enum. When role becomes resident, require active same-society `unitId`; when it becomes admin or technician, clear `unitId`.

User list accepts `page`, `pageSize`, `search`, `role`, and `active`. Search matches escaped name, email, and phone values within actor society. Apply default page size 25 and maximum 100.

Define the one-time response exactly:

```ts
type SafeUser = {
  id: string
  name: string
  email: string
  phone: string
  role: 'resident' | 'admin' | 'technician'
  societyId: string
  unitId: string | null
  mustChangePassword: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

type TemporaryCredentialResponse = {
  user: SafeUser
  temporaryPassword: string
}
```

- [ ] **Step 4: Implement user service invariants**

All target lookups include actor society. Create and reset generate a temporary password, hash it, set `mustChangePassword: true`, and return plaintext only from the current service call. Reset, disable, and role changes increment `tokenVersion`. Last-admin checks run inside a transaction with the target update.

Self-update ignores identity parameters from the body and uses `actor.userId`; it accepts only `name` and `phone`.

Implement `recoverAdmin(email): Promise<TemporaryCredentialResponse>` in `server/src/features/users/recover-admin.ts`. It finds an admin by normalized email, generates and hashes a temporary password, sets `active: true`, sets `mustChangePassword: true`, increments `tokenVersion`, and returns plaintext only from that call.

Implement `server/src/scripts/recover-admin.ts` as an operator-only CLI wrapper. It validates exactly one email argument, connects through validated environment, calls `recoverAdmin`, prints the email and temporary password once, disconnects, and exits nonzero without plaintext output on failure. Add server script `"recover:admin": "tsx src/scripts/recover-admin.ts"`.

- [ ] **Step 5: Verify user administration**

Run: `npm run test -w server -- users recover-admin && npm run typecheck -w server`

Expected: all user tests pass, including session invalidation and last-admin protection.

- [ ] **Step 6: Commit**

```bash
git add server/src/features/users server/src/scripts/recover-admin.ts server/src/app.ts server/tests/integration/users.test.ts server/tests/integration/recover-admin.test.ts server/package.json package-lock.json
git commit -m "feat(admin): manage user accounts"
```

### Task 8: Add Protected Asset And QR APIs

**Files:**
- Create: `server/src/features/assets/asset.schema.ts`
- Create: `server/src/features/assets/asset-code.ts`
- Create: `server/src/features/assets/asset.service.ts`
- Create: `server/src/features/assets/asset.controller.ts`
- Create: `server/src/features/assets/asset.routes.ts`
- Create: `server/tests/unit/asset-code.test.ts`
- Create: `server/tests/integration/assets.test.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Produces: `generateAssetCode(category): string` and `generateQrToken(): string`.
- Produces: asset list, create, read, update, archive, QR SVG, and protected scan endpoints.

- [ ] **Step 1: Write failing generator tests**

```ts
expect(generateAssetCode('lift')).toMatch(/^LFT-[A-Z0-9]{6}$/)
expect(generateAssetCode('plumbing')).toMatch(/^PLB-[A-Z0-9]{6}$/)
expect(generateAssetCode('electrical')).toMatch(/^ELC-[A-Z0-9]{6}$/)
expect(Buffer.from(generateQrToken(), 'base64url').byteLength).toBeGreaterThanOrEqual(16)
```

Generate 10,000 codes/tokens and assert no duplicates in that sample.

- [ ] **Step 2: Write failing asset API tests**

Assert admin creation returns immutable `assetCode` but not `qrToken`; all roles list and read active same-society assets; residents and technicians receive `403` for mutations and QR download; category and search filters work; archive hides asset from normal reads; QR SVG has `Content-Type: image/svg+xml`; scan resolves active same-society asset; unknown, archived, and cross-society tokens all return the same `404 ASSET_UNAVAILABLE` shape.

- [ ] **Step 3: Run asset tests to verify red state**

Run: `npm run test -w server -- asset-code assets`

Expected: FAIL because generators and routes do not exist.

- [ ] **Step 4: Implement identifiers and asset service**

Use `crypto.randomBytes`, remove ambiguous characters `0`, `O`, `1`, and `I` from asset-code alphabet, and retry MongoDB duplicate-key collisions up to five times. Generate QR token from 16 random bytes encoded as base64url.

Strict create fields are `name`, `category`, `locationDescription`, and optional ISO install date. Updates accept the same mutable fields; never accept `assetCode`, `qrToken`, `societyId`, or `archivedAt` from clients.

Asset list accepts `page`, `pageSize`, `search`, and `category`, with default page size 25 and maximum 100. Every query includes actor society and active state where required. Escape search input before matching asset code, name, or location.

- [ ] **Step 5: Generate protected QR SVG**

Build URL with `new URL(`/scan/${asset.qrToken}`, env.APP_BASE_URL).toString()`. Call `QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 })`. Set `Content-Type: image/svg+xml; charset=utf-8` and `Content-Disposition` with sanitized asset code.

- [ ] **Step 6: Verify assets and QR**

Run: `npm run test -w server -- asset-code assets && npm run typecheck -w server`

Expected: generator and API tests pass, including indistinguishable unavailable-token responses.

- [ ] **Step 7: Commit**

```bash
git add server/src/features/assets server/src/app.ts server/tests/unit/asset-code.test.ts server/tests/integration/assets.test.ts
git commit -m "feat(assets): add protected QR records"
```

### Task 9: Build Client Runtime, Visual System, And Auth Routes

**Files:**
- Create: `client/src/app/api.ts`
- Create: `client/src/app/query-client.ts`
- Create: `client/src/app/providers.tsx`
- Create: `client/src/app/router.tsx`
- Create: `client/src/styles/tokens.css`
- Create: `client/src/styles/global.css`
- Create: `client/src/components/AppShell.tsx`
- Create: `client/src/components/RouteGuard.tsx`
- Create: `client/src/components/FormField.tsx`
- Create: `client/src/components/Feedback.tsx`
- Create: `client/src/features/auth/auth-api.ts`
- Create: `client/src/features/auth/LoginPage.tsx`
- Create: `client/src/features/auth/SetupPage.tsx`
- Create: `client/src/features/auth/ChangePasswordPage.tsx`
- Create: `client/src/features/auth/ProfilePage.tsx`
- Create: `client/src/features/auth/auth-routes.test.tsx`
- Create: `client/src/features/dashboard/DashboardPage.tsx`
- Create: `client/src/test/render.tsx`
- Modify: `client/src/main.tsx`
- Delete: `client/src/App.tsx`
- Delete: `client/src/App.test.tsx`

**Interfaces:**
- Produces: `api<T>(path, init): Promise<T>` and `ApiError`.
- Produces: `useCurrentUser`, `useLogin`, `useLogout`, and `useChangePassword`.
- Produces: route guards for unauthenticated, password-change-required, and role-denied states.

- [ ] **Step 1: Write failing API wrapper and auth-route tests**

Mock fetch and assert `credentials: 'include'`, JSON headers, parsed success bodies, and `ApiError` fields. Use an in-memory router to assert:

- unauthenticated `/assets` redirects to `/login?returnTo=%2Fassets`
- `mustChangePassword: true` redirects `/dashboard` to `/change-password`
- resident opening `/admin/users` renders access denied
- authenticated login page redirects to `/dashboard`

- [ ] **Step 2: Run client tests to verify red state**

Run: `npm run test -w client -- auth-routes`

Expected: FAIL because API wrapper and router do not exist.

- [ ] **Step 3: Implement design tokens and base layout**

Import package font files and define:

```css
:root {
  --color-plaster: #eef0ec;
  --color-chalk: #fbfcf8;
  --color-slate: #20343b;
  --color-pump: #315c66;
  --color-marigold: #f2b134;
  --color-verified: #237a63;
  --font-display: 'Barlow Condensed', sans-serif;
  --font-body: 'Hind', sans-serif;
  --font-utility: 'IBM Plex Mono', monospace;
}
```

Set body to Plaster/Slate, use no gradients, define a 2 px visible `:focus-visible` outline, and disable non-essential transitions under `prefers-reduced-motion: reduce`. Configure Tailwind 4 through `@tailwindcss/vite` and `@import 'tailwindcss';`.

- [ ] **Step 4: Implement API, auth queries, and route guards**

`api` parses successful JSON, throws `ApiError` with status/code/message/field errors/request ID, and on `401` invalidates current-user query without creating a redirect loop.

Router defines `/setup`, `/login`, `/change-password`, `/dashboard`, `/profile`, `/assets`, `/assets/:id`, `/scan/:qrToken`, and `/admin/*`. Preserve only same-origin path/query/hash in `returnTo`; reject absolute and protocol-relative return targets.

`/setup` queries `/api/bootstrap/status`: initialized visitors redirect to login or dashboard, while uninitialized visitors see society plus first-admin fields and submit the bootstrap contract from Task 4.

- [ ] **Step 5: Implement shared shell and auth forms**

Desktop uses the utility spine and ruled work surface; mobile uses a compact top bar and disclosure navigation. Navigation is derived from current role. Forms use React Hook Form plus Zod, retain input after recoverable errors, and focus the first invalid field. Button labels match global constraints.

- [ ] **Step 6: Verify client runtime**

Run: `npm run test -w client -- auth-routes && npm run typecheck -w client && npm run build -w client`

Expected: auth route tests pass and production client build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src client/vite.config.ts client/package.json package-lock.json
git commit -m "feat(client): add auth shell and visual system"
```

### Task 10: Build Society, Dashboard, And Unit Interfaces

**Files:**
- Create: `client/src/features/society/society-api.ts`
- Create: `client/src/features/society/SocietySettingsPage.tsx`
- Create: `client/src/features/units/unit-api.ts`
- Create: `client/src/features/units/UnitsPage.tsx`
- Create: `client/src/features/units/UnitForm.tsx`
- Create: `client/src/features/units/units.test.tsx`
- Create: `client/src/features/dashboard/AdminDashboard.tsx`
- Create: `client/src/features/dashboard/AssetDashboard.tsx`
- Modify: `client/src/features/dashboard/DashboardPage.tsx`
- Modify: `client/src/app/router.tsx`

**Interfaces:**
- Consumes: authenticated `api`, role guards, and query client from Task 9.
- Produces: society settings, setup checklist, and paginated unit management UI.

- [ ] **Step 1: Write failing unit-interface tests**

Mock API responses and assert:

- admin dashboard reports missing units, users, and assets as actionable setup rows
- `Create unit` submits display values and invalidates `['units']`
- server `fieldErrors.unitNumber` appears beside unit-number input
- successful archive removes row after confirmation
- `UNIT_HAS_ACTIVE_RESIDENTS` renders its server recovery message
- resident navigation contains no society or unit management links

- [ ] **Step 2: Run focused client tests to verify red state**

Run: `npm run test -w client -- units`

Expected: FAIL because dashboard and unit screens do not exist.

- [ ] **Step 3: Implement query and form contracts**

Use query keys `['society']` and `['units', filters]`. Build the setup checklist from three existing count requests: `/api/units?pageSize=1`, `/api/users?pageSize=1`, and `/api/assets?pageSize=1`; do not add a summary endpoint. Unit form fields are `building`, `floor`, and `unitNumber`; labels remain visible above inputs. Search updates a deferred filter value and resets pagination to page 1.

- [ ] **Step 4: Implement ledger UI**

Desktop rows show unit number, building, floor, and actions separated by rules. Mobile rows stack the same label/value pairs. Empty state says `No units yet. Create the first unit before adding resident accounts.` After successful creation, offer `Create another unit`, which clears unit fields while leaving the form open. Archive confirmation names the unit and uses `Archive unit` consistently.

- [ ] **Step 5: Verify society and units UI**

Run: `npm run test -w client -- units && npm run typecheck -w client`

Expected: all unit-interface tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/features/society client/src/features/units client/src/features/dashboard client/src/app/router.tsx
git commit -m "feat(client): add society unit setup"
```

### Task 11: Build User Management And Credential Handoff

**Files:**
- Create: `client/src/features/users/user-api.ts`
- Create: `client/src/features/users/UsersPage.tsx`
- Create: `client/src/features/users/UserForm.tsx`
- Create: `client/src/features/users/TemporaryPasswordDialog.tsx`
- Create: `client/src/features/users/users.test.tsx`
- Modify: `client/src/app/router.tsx`

**Interfaces:**
- Consumes: unit query for resident assignment and `TemporaryCredentialResponse` from Task 7.
- Produces: account creation, editing, status change, reset, filters, and one-time credential handoff.

- [ ] **Step 1: Write failing user-interface tests**

Assert role selection shows unit only for residents, inactive/archived units are unavailable, `Create account` opens a non-dismissible-by-backdrop credential dialog, copy button writes only the current password, closing removes plaintext from DOM and query cache, reset uses `Issue new temporary password`, last-admin error remains visible, and status labels are textual rather than color-only.

- [ ] **Step 2: Run user UI tests to verify red state**

Run: `npm run test -w client -- users`

Expected: FAIL because user management screens do not exist.

- [ ] **Step 3: Implement user queries and forms**

Use query key `['users', filters]`. Submit resident `unitId`; omit it for admin and technician. Never place temporary password in URL, local storage, session storage, global auth context, query cache, or retained mutation cache. Copy the successful mutation response into dialog component state, call the mutation's `reset()`, and set that mutation's `gcTime` to 0.

- [ ] **Step 4: Implement credential handoff and account actions**

Dialog title is `Share temporary password`. Include user name, login email, temporary password in a utility-font read-only field, `Copy password`, and `I have shared it`. On final action, clear component state before closing. Disable/demote controls for current last admin based on server error, not client assumptions.

- [ ] **Step 5: Verify user UI**

Run: `npm run test -w client -- users && npm run typecheck -w client`

Expected: all user-management tests pass and no temporary password survives dialog closure.

- [ ] **Step 6: Commit**

```bash
git add client/src/features/users client/src/app/router.tsx
git commit -m "feat(client): add account administration"
```

### Task 12: Build Asset Ledger, QR Scan, And Identity Plate

**Files:**
- Create: `client/src/features/assets/asset-api.ts`
- Create: `client/src/features/assets/AssetsPage.tsx`
- Create: `client/src/features/assets/AssetForm.tsx`
- Create: `client/src/features/assets/AssetDetailPage.tsx`
- Create: `client/src/features/assets/AssetIdentityPlate.tsx`
- Create: `client/src/features/assets/ScanAssetPage.tsx`
- Create: `client/src/features/assets/assets.test.tsx`
- Create: `client/src/features/assets/asset-print.css`
- Modify: `client/src/app/router.tsx`
- Modify: `client/src/features/dashboard/AssetDashboard.tsx`

**Interfaces:**
- Consumes: asset API from Task 8 and auth return-path behavior from Task 9.
- Produces: role-aware asset directory, protected scan resolution, and admin-only printable identity label.

- [ ] **Step 1: Write failing asset-interface tests**

Assert category labels and filters, deferred search, admin create/edit/archive controls, no mutation controls for residents or technicians, protected scan query, identical unavailable state for unknown/archived responses, login return to encoded scan path, QR image fetch only for admin, and reduced-motion suppression of scan reveal.

Render the identity plate and assert asset code, name, category, location, install date, active state, and QR image accessible name.

- [ ] **Step 2: Run asset UI tests to verify red state**

Run: `npm run test -w client -- assets`

Expected: FAIL because asset screens do not exist.

- [ ] **Step 3: Implement asset query and mutation contracts**

Use keys `['assets', filters]`, `['asset', id]`, and `['asset-scan', token]`. Asset forms submit only name, category, location description, and optional install date. Category controls contain exactly Lift, Plumbing, and Electrical.

Admin QR download fetches the protected SVG with credentials, creates a temporary object URL for preview/print, and revokes that URL on replacement or component cleanup.

- [ ] **Step 4: Implement ledger and identity plate**

Desktop ledger columns are asset code, asset name, location, category, and state. Mobile keeps those labels in stacked rows. Identity plate visually dominates detail with utility-font code, high-contrast QR, and print dimensions that fit A6 paper. `asset-print.css` hides shell/navigation/actions and preserves black QR on white.

- [ ] **Step 5: Implement scan reveal and unavailable state**

After successful scan query, add one `data-revealed` state that runs at most 250 ms. Under reduced motion, render final state immediately. Unavailable copy is `This asset is unavailable. Check the label or ask the society admin.` Do not distinguish reason.

- [ ] **Step 6: Verify asset experience**

Run: `npm run test -w client -- assets && npm run typecheck -w client && npm run build -w client`

Expected: asset tests pass and client production build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/features/assets client/src/app/router.tsx client/src/features/dashboard/AssetDashboard.tsx
git commit -m "feat(client): add asset identity experience"
```

### Task 13: Add Production SPA Hosting And End-To-End Quality Gates

**Files:**
- Create: `client/playwright.config.ts`
- Create: `client/e2e/phase-one.spec.ts`
- Create: `client/e2e/accessibility.spec.ts`
- Create: `server/tests/e2e-server.ts`
- Create: `server/tests/integration/isolation.test.ts`
- Create: `server/tests/integration/production-host.test.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/server.ts`
- Modify: `server/package.json`
- Modify: `client/package.json`
- Modify: `package.json`

**Interfaces:**
- Produces: production Express static host with API-safe SPA fallback.
- Produces: browser commands `test:e2e` and `test:a11y`.

- [ ] **Step 1: Write failing production-host test**

Build a temporary client fixture containing `index.html`. Pass its path through an optional `createApp({ clientDistPath })` test parameter. In production app mode assert `/login` returns that HTML, `/assets/example` returns that HTML, hashed static asset requests are served, and unknown `/api/missing` still returns JSON `404`, never HTML.

- [ ] **Step 2: Run host test to verify red state**

Run: `npm run test -w server -- production-host`

Expected: FAIL because SPA hosting is not wired.

- [ ] **Step 3: Implement Express static host**

After all API routes and the API `404` handler, but before the four-argument error handler, use `express.static(clientDistPath, { index: false, maxAge: '1h' })`. Default `clientDistPath` to `path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')`, which is stable whether npm starts the server from root or its workspace. For non-API `GET` requests, send that directory's `index.html`. Give fingerprinted `/assets/*` responses one-year immutable caching; give `index.html` `no-cache`.

- [ ] **Step 4: Write full browser flow**

Create `server/tests/e2e-server.ts` to start a one-node `MongoMemoryReplSet`; set `NODE_ENV=test`, `PORT=3000`, `MONGODB_URI` to replica-set URI, `JWT_SECRET=apartcheck-e2e-secret-at-least-32-bytes`, and `APP_BASE_URL=http://127.0.0.1:5173` before dynamically importing the app. Connect Mongoose, initialize indexes, listen on port 3000, and stop HTTP, Mongoose, and replica set on termination. Add server script `"dev:e2e": "tsx tests/e2e-server.ts"`.

Configure Playwright with base URL `http://127.0.0.1:5173` and two web servers. Set each web server's `cwd` to repository root. Run `npm run dev:e2e -w server` and wait on `/api/health/ready`; run `npm run dev -w client -- --host 127.0.0.1` and wait on port 5173. Add client scripts `"test:e2e": "playwright test e2e/phase-one.spec.ts"` and `"test:a11y": "playwright test e2e/accessibility.spec.ts"`; root scripts delegate each command to the client workspace.

`phase-one.spec.ts` performs:

1. setup status and first-admin bootstrap
2. unit creation
3. resident and technician creation
4. resident temporary-password capture
5. asset creation and identity-plate check
6. logout and resident login
7. forced password replacement
8. QR scan route
9. read-only UI assertion
10. direct asset mutation request expecting `403`

Use deterministic seeded names but do not hardcode generated credentials.

- [ ] **Step 5: Add isolation and accessibility gates**

Server isolation test directly creates Society B and attempts unit, user, asset ID, and QR-token access with Society A cookie; every attempt returns `404` without Society B names in body.

Accessibility test runs axe on login, admin dashboard, unit form, user form, asset ledger, and identity plate; assert zero serious or critical violations. Test keyboard-only menu/form/dialog flow at 360 x 800 and desktop 1440 x 900. Emulate reduced motion and assert scan plate has no transition duration.

- [ ] **Step 6: Verify all local quality gates**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
```

Expected: every command exits 0; browser tests report no failed cases.

- [ ] **Step 7: Commit**

```bash
git add client/playwright.config.ts client/e2e client/package.json server/src/app.ts server/src/server.ts server/tests/e2e-server.ts server/package.json server/tests/integration/isolation.test.ts server/tests/integration/production-host.test.ts package.json package-lock.json
git commit -m "test: verify Phase 1 pilot flow"
```

### Task 14: Add CI, Operations Documentation, And Public Deployment

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `render.yaml`
- Create: `README.md`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Consumes: all build and verification scripts from Tasks 1 through 13.
- Produces: repeatable CI, documented owner-admin recovery, Render deployment, and public health evidence.

- [ ] **Step 1: Write CI workflow**

Configure Ubuntu runner with Node 22.12 and npm cache. Run these exact commands in order:

```yaml
- run: npm ci
- run: npm run format:check
- run: npm run lint
- run: npm run typecheck
- run: npm test
- run: npm run build
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e
- run: npm run test:a11y
```

Trigger on pushes and pull requests. Upload Playwright report only when browser checks fail.

- [ ] **Step 2: Define Render service**

Create `render.yaml` with one Node web service using `npm ci && npm run build`, start command `npm run start -w server`, health path `/api/health/ready`, Node version `22.12.0`, and environment keys `MONGODB_URI`, `JWT_SECRET`, and `APP_BASE_URL` marked `sync: false`. Set `NODE_ENV=production`.

- [ ] **Step 3: Write operational README**

Include:

- accountability problem and Phase 1 boundary
- Mermaid diagram for browser -> Express -> MongoDB Atlas
- stack table
- prerequisites and exact local commands
- replica-set test explanation
- all environment variables
- first-admin bootstrap and generated-credential workflow
- owner-admin recovery using `npm run recover:admin -w server -- admin@example.com`, which re-enables the admin and prints one generated temporary password
- Render cold-start warning
- public URL location
- test and CI commands
- deferred Phase 2 features

- [ ] **Step 4: Verify repository before deployment**

Run:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:a11y
git status --short
```

Expected: all checks exit 0; status lists only intended Task 14 files before staging.

- [ ] **Step 5: Commit CI and deployment configuration**

```bash
git add .github/workflows/ci.yml render.yaml README.md .env.example package.json package-lock.json
git commit -m "ci: add Phase 1 deployment pipeline"
```

- [ ] **Step 6: Provision free production resources**

In MongoDB Atlas, create an M0 cluster, a dedicated application database user, and TLS connection URI. Restrict permissions to the ApartCheck database. Configure Atlas network access for Render's available egress model and document the resulting security trade-off without recording credentials.

Create Render service from `render.yaml`. Set a cryptographically random JWT secret of at least 32 bytes, Atlas URI, and the final Render origin as `APP_BASE_URL`. Deploy the committed revision.

- [ ] **Step 7: Verify public deployment**

Run with the actual Render origin exported in the shell:

```bash
curl --fail --silent --show-error "$APARTCHECK_URL/api/health/live"
curl --fail --silent --show-error "$APARTCHECK_URL/api/health/ready"
curl --fail --silent --show-error "$APARTCHECK_URL/login"
```

Expected: both health endpoints return `{"status":"ok"}` and login returns HTML. Complete bootstrap through browser, create one asset, scan its printed QR from a phone, and confirm resident read-only access at 360 px.

- [ ] **Step 8: Record deployed URL**

Replace README's deployment-location instruction with the verified Render URL, then run `npm run format:check`.

```bash
git add README.md
git commit -m "docs: record ApartCheck deployment"
```

## Final Verification Checklist

- [ ] Fresh database bootstraps exactly one society and first admin.
- [ ] Admin manages society, units, users, and assets.
- [ ] Temporary password plaintext exists only during one handoff.
- [ ] Forced password change blocks all resource routes.
- [ ] Password reset and account disable invalidate old sessions.
- [ ] Residents and technicians read active assets but cannot mutate them.
- [ ] QR labels resolve through login to the protected active asset.
- [ ] Unknown, archived, and cross-society QR tokens reveal no asset details.
- [ ] Society A cannot read or mutate Society B fixtures.
- [ ] UI follows approved ledger and identity-plate direction at 360 px and desktop.
- [ ] Keyboard, focus, contrast, dialogs, errors, and reduced motion pass checks.
- [ ] Formatting, lint, type checks, unit tests, integration tests, production build, browser flow, and accessibility tests pass in CI.
- [ ] Render and Atlas respond from one public URL; README contains verified URL and cold-start note.
