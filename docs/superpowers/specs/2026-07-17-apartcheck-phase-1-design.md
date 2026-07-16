# ApartCheck Phase 1 Design

**Status:** Approved for planning

**Date:** 2026-07-17

**Source brief:** `docs/spec.md`

## 1. Purpose

ApartCheck is an accountability and evidence layer for apartment maintenance. The complete product will connect complaints, physical assets, vendor work, cost, evidence, resident verification, and an immutable history.

This design covers Phase 1 only: a deployable foundation for one pilot society. It establishes identity, role boundaries, society-scoped data, physical asset records, and QR-based asset lookup. Later phases will add tickets, evidence, SLAs, vendors, audit events, and analytics through separate design and implementation cycles.

## 2. Phase 1 Outcomes

Phase 1 must let a pilot operator:

1. Bootstrap exactly one society and its first admin.
2. Create and manage units, resident accounts, technician accounts, and assets.
3. Sign in as admin, resident, or technician through role-gated interfaces.
4. Require admin-created users to replace a generated temporary password on first login.
5. Print a QR identity label for each asset.
6. Scan a QR, authenticate when needed, and arrive at the correct protected asset page.
7. Run the complete system from one public URL.

## 3. Non-Goals

Phase 1 does not include:

- Tickets, comments, assignment, status transitions, or audit events
- Vendors or vendor scorecards
- Evidence uploads or Cloudinary
- SLA deadlines, cron jobs, or escalation email
- CSV imports
- Public asset pages
- Password recovery by email
- Multiple societies in product UI
- Offline behavior, native apps, or WhatsApp API integration
- Separate frontend and backend deployments

Test fixtures may create a second society to prove data isolation. This does not expose multi-society product behavior.

## 4. Architecture

### 4.1 Repository

Use one npm-workspaces monorepo:

```text
ApartCheck/
  client/                 React and Vite SPA
  server/                 Express REST API and production host
  docs/
  package.json            workspace scripts
  .env.example
  README.md
```

The client and server remain separate workspaces and communicate only through REST. In production, Express serves the compiled React assets and `/api` from one Render web service. This gives the pilot one origin, one public URL, and straightforward secure-cookie authentication. The API boundary allows a later split deployment without redesigning feature behavior.

### 4.2 Server Boundaries

The server is a modular monolith. Each Phase 1 feature owns its model, validation, service logic, controller, routes, and tests:

- `auth`
- `societies`
- `units`
- `users`
- `assets`

Shared infrastructure provides database connection, authentication, authorization, society scope, origin checks, rate limiting, request logging, error mapping, and health checks.

Controllers translate HTTP requests and responses. Services own authorization-sensitive business rules and database operations. Models own persistence shape and indexes. Do not add generic repository classes or a shared package until concrete duplication requires one.

### 4.3 Client Boundaries

The client uses one responsive shell with role-aware navigation. Feature directories own pages, forms, API calls, and local UI components. React Query owns remote state, caching, invalidation, loading, and mutation errors. Auth context stores the current user only; browser JavaScript never receives or reads the JWT.

Client route guards improve navigation but do not enforce security. The server remains authoritative for every resource and action.

## 5. Domain Model

All records use Mongoose timestamps. MongoDB identifiers are internal and never accepted as proof of ownership.

### 5.1 Society

```text
name: string
address: string
singletonKey: "primary"
createdAt: Date
updatedAt: Date
```

`singletonKey` has a unique index. Unit count is derived rather than stored.

### 5.2 Unit

```text
societyId: ObjectId -> Society
building: string
floor: string
unitNumber: string
archivedAt: Date | null
createdAt: Date
updatedAt: Date
```

`floor` and `unitNumber` are strings so values such as `G`, `B1`, and `12A` remain valid. Building, floor, and unit number are trimmed and compared case-insensitively. A compound unique index on society, normalized building, normalized floor, and normalized unit number prevents duplicates. An active unit cannot be archived while active residents reference it.

### 5.3 User

```text
name: string
email: string
phone: string
passwordHash: string
role: "resident" | "admin" | "technician"
societyId: ObjectId -> Society
unitId: ObjectId -> Unit | null
mustChangePassword: boolean
tokenVersion: number
active: boolean
createdAt: Date
updatedAt: Date
```

Email is lowercased, trimmed, and globally unique because it is the login identifier. Phone is stored in normalized E.164 form. `unitId` is required for residents and absent for admins and technicians. Users are disabled, not deleted. The last active admin cannot be disabled or changed to another role.

### 5.4 Asset

```text
societyId: ObjectId -> Society
assetCode: string
name: string
category: "lift" | "plumbing" | "electrical"
locationDescription: string
installDate: Date | null
qrToken: string
archivedAt: Date | null
createdAt: Date
updatedAt: Date
```

`assetCode` is an immutable, server-generated category prefix plus six random uppercase alphanumeric characters, such as `LFT-4F2A91`. It is unique within a society and gives the physical label a readable identifier without adding a counter collection.

`qrToken` is an immutable random value with at least 128 bits of entropy and a global unique index. The QR stores `${APP_BASE_URL}/scan/${qrToken}`. QR images are generated on demand; image data is not stored in MongoDB.

Assets are archived, not deleted. Normal resident and technician queries omit archived assets.

## 6. Authentication And Authorization

### 6.1 Bootstrap

`GET /api/bootstrap/status` publicly returns only `{ initialized: boolean }`.

`POST /api/bootstrap` validates society and first-admin data, then creates both in one MongoDB transaction. The society singleton index prevents concurrent successful bootstraps. A later attempt returns `409 BOOTSTRAP_COMPLETE`.

The first admin chooses their own compliant password and does not require a first-login change. Successful bootstrap creates the session and sends the admin to the setup dashboard.

### 6.2 Sessions

Login issues an eight-hour JWT in a host-only cookie. Production attributes are:

```text
HttpOnly
Secure
SameSite=Lax
Path=/
```

The token contains user ID, society ID, token version, issued time, and expiry. Authorization does not trust a role claim from the token. Authentication middleware verifies the signature, loads the active user, confirms society and token version, and supplies actor context to downstream services.

Logout clears the cookie. Phase 1 has no refresh-token flow.

Changing or resetting a password increments `tokenVersion`, invalidating prior sessions. Disabling a user also increments `tokenVersion`, so an old session cannot revive if the account is later re-enabled. Middleware reloads the user on every authenticated request.

### 6.3 Passwords

- Bcrypt cost factor: 12
- User-selected length: 12 to 72 bytes
- No arbitrary symbol or uppercase composition rules
- Admin-created temporary passwords: at least 16 random characters
- Temporary plaintext returned once and never logged or persisted
- Admin shares temporary credentials outside ApartCheck

Until `mustChangePassword` becomes false, middleware permits only session inspection, password change, and logout.

There is no self-service recovery in Phase 1. Admins can issue a new temporary password for another user; they use the normal change-password flow for themselves. Recovery of the only admin is an operator procedure documented in README.

### 6.4 Permission Matrix

| Capability | Admin | Resident | Technician |
|---|---:|---:|---:|
| View own session/profile | Yes | Yes | Yes |
| Edit own name/phone | Yes | Yes | Yes |
| View society identity | Yes | Yes | Yes |
| Edit society | Yes | No | No |
| Manage units | Yes | No | No |
| Manage users | Yes | No | No |
| List/view active assets | Yes | Yes | Yes |
| Create/edit/archive assets | Yes | No | No |
| Generate/print asset QR | Yes | No | No |

Each service receives actor context and adds `societyId` to its own queries. The client cannot choose trusted society ownership. An absent resource and a resource outside the actor's society both return `404`.

## 7. REST Contract

### 7.1 Response Shapes

Single-resource responses use a named envelope:

```json
{ "asset": {} }
```

Collection responses use:

```json
{
  "assets": [],
  "pagination": { "page": 1, "pageSize": 25, "total": 0, "pages": 0 }
}
```

Default page size is 25; maximum is 100.

Errors use:

```json
{
  "error": {
    "code": "UNIT_HAS_ACTIVE_RESIDENTS",
    "message": "Move or disable active residents before archiving this unit.",
    "fieldErrors": { "unitNumber": "Unit number is already in use." },
    "requestId": "req_..."
  }
}
```

`fieldErrors` appears only for field-specific failures. Every error includes `requestId` for support correlation.

### 7.2 Endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/bootstrap/status` | Public | Report whether setup is complete |
| POST | `/api/bootstrap` | Public until initialized | Create society and first admin |
| POST | `/api/auth/login` | Public | Create session cookie |
| POST | `/api/auth/logout` | Public, origin-checked | Idempotently clear any session cookie |
| GET | `/api/auth/me` | Authenticated | Return current user and password-change state |
| POST | `/api/auth/change-password` | Authenticated | Replace own password and session |
| GET | `/api/society` | Authenticated | Return current society |
| PATCH | `/api/society` | Admin | Edit society name/address |
| GET | `/api/units` | Admin | List/search units |
| POST | `/api/units` | Admin | Create unit |
| PATCH | `/api/units/:id` | Admin | Edit unit |
| DELETE | `/api/units/:id` | Admin | Archive unit |
| GET | `/api/users` | Admin | List/filter users |
| POST | `/api/users` | Admin | Create user and return temporary password once |
| PATCH | `/api/users/:id` | Admin | Edit account identity, role, or unit |
| PATCH | `/api/users/:id/status` | Admin | Disable or re-enable account |
| POST | `/api/users/:id/reset-password` | Admin | Issue temporary password and invalidate sessions |
| PATCH | `/api/users/me` | Authenticated | Edit own name/phone |
| GET | `/api/assets` | Authenticated | List/search visible assets |
| POST | `/api/assets` | Admin | Create asset and identifiers |
| GET | `/api/assets/:id` | Authenticated | View visible asset by internal ID |
| PATCH | `/api/assets/:id` | Admin | Edit mutable asset fields |
| DELETE | `/api/assets/:id` | Admin | Archive asset |
| GET | `/api/assets/:id/qr.svg` | Admin | Download printable QR image |
| GET | `/api/assets/scan/:qrToken` | Authenticated | Resolve protected QR token to active asset |
| GET | `/api/health/live` | Public | Report process liveness |
| GET | `/api/health/ready` | Public | Report database readiness |

List query parameters are explicitly allowlisted. Asset lists accept `page`, `pageSize`, `search`, and `category`. Unit and user lists accept their documented search/filter fields. Unknown body fields and unsupported query fields are rejected.

Successful user creation and password reset return `{ user, temporaryPassword }`. No later endpoint can retrieve that temporary plaintext.

## 8. Primary Flows

### 8.1 Initial Setup

1. Client checks bootstrap status.
2. If uninitialized, `/setup` collects society and first-admin details.
3. Server atomically creates both and sets session cookie.
4. Admin lands on dashboard setup checklist: units, users, then assets.
5. If already initialized, `/setup` redirects to login or dashboard.

### 8.2 Admin-Created Account

1. Admin creates units before resident accounts.
2. Admin submits name, email, phone, role, and resident unit where required.
3. Server generates temporary password and stores only its hash.
4. Response displays plaintext once in a focused handoff dialog.
5. User logs in and is redirected to `/change-password` before accessing application data.
6. Password change increments token version and replaces the session.

### 8.3 QR Asset Lookup

1. Admin creates an asset.
2. Server generates asset code and QR token.
3. Admin previews or prints the identity plate and QR.
4. Scanner opens `/scan/:qrToken`.
5. If unauthenticated, login preserves this intended path.
6. Client calls the protected scan endpoint and renders asset detail.
7. Unknown, cross-society, or archived tokens show an unavailable state without leaking details.

## 9. Frontend Experience

### 9.1 Routes

Public routes:

- `/setup`
- `/login`

Protected shared routes:

- `/change-password`
- `/dashboard`
- `/assets`
- `/assets/:id`
- `/scan/:qrToken`
- `/profile`

Admin routes:

- `/admin/society`
- `/admin/units`
- `/admin/users`
- `/admin/assets`

The shared shell uses compact mobile navigation and a desktop utility spine. Admin dashboard shows setup progress and direct creation actions. Resident and technician dashboards prioritize asset search and category filtering.

### 9.2 Visual Identity

The visual language comes from apartment maintenance artifacts: painted service signage, inspection labels, utility cabinets, service ledgers, and physical QR plates.

Color tokens:

| Token | Hex | Use |
|---|---|---|
| Plaster | `#EEF0EC` | Main canvas |
| Chalk | `#FBFCF8` | Working surfaces |
| Monsoon Slate | `#20343B` | Primary text and navigation |
| Pump-room Blue | `#315C66` | Controls and selected states |
| Inspection Marigold | `#F2B134` | Setup gaps and temporary-credential attention |
| Verified Green | `#237A63` | Complete and active states |

No gradients. Red is reserved for destructive and failed states.

Typography:

- Barlow Condensed, 600-700: page titles, asset names, building identifiers
- Hind, 400-600: body copy, labels, forms, and navigation
- IBM Plex Mono, 500: asset codes, unit numbers, dates, QR metadata, and system states

Desktop uses a fixed utility spine and ruled work surface instead of dashboard card grids. Rules encode actual record boundaries. Asset directory is a scan-friendly ledger; mobile converts rows into stacked label/value groups without turning every item into a floating rounded card.

### 9.3 Signature Element

Asset detail centers a large printable asset identity plate containing category code, location, QR, install date, and active state. Letting the physical identity dominate is the deliberate visual risk: it replaces generic dashboard metrics with the object that connects physical maintenance work to ApartCheck.

A successful QR resolution may use one 250 ms inspection-stamp reveal. Other screens avoid ornamental motion. `prefers-reduced-motion` removes the reveal.

### 9.4 Interaction And Copy

- Controls name outcomes: `Create account`, `Issue new temporary password`, `Archive asset`, `Print asset label`.
- Empty states explain the next useful action.
- Recoverable form errors preserve entered values and focus the first invalid field.
- Server field errors render beside their fields.
- Session expiry returns to login while preserving safe intended destination.
- Mobile acceptance starts at 360 px without horizontal scrolling.
- Keyboard focus is always visible.
- QR label printing targets desktop but asset lookup remains mobile-first.

## 10. Security Controls

- Enforce `societyId` inside every resource service query.
- Return `404` for absent and inaccessible records alike.
- Reject unsafe-method requests from unexpected origins.
- Rate-limit bootstrap and login endpoints.
- Validate params, query, and body before service logic.
- Reject unknown fields rather than silently accepting them.
- Limit JSON body size conservatively.
- Apply security headers and a production Content Security Policy.
- Never log passwords, temporary credentials, cookies, authorization values, or full request bodies.
- Use generic login failures so account existence is not disclosed.
- Prevent an admin from disabling or demoting the last active admin.
- Do not expose update or delete behavior for future immutable audit events in this phase.

## 11. Failure Handling

| Status | Meaning |
|---|---|
| `400` | Malformed or invalid input |
| `401` | Missing, invalid, or expired session |
| `403` | Authenticated role cannot perform known action |
| `404` | Resource absent or inaccessible |
| `409` | Bootstrap, uniqueness, last-admin, or archive dependency conflict |
| `429` | Rate limit exceeded |
| `500` | Unexpected failure with safe message and request ID |

Route-level client failures distinguish retryable server errors, expired sessions, and unavailable assets. Errors use direct recovery language and do not apologize or expose internals.

## 12. Testing Strategy

### 12.1 Server Unit Tests

- Password acceptance and temporary-password generation
- Permission policy decisions
- Asset-code format and QR-token entropy/immutability
- Error mapping

### 12.2 Server Integration Tests

- Only one bootstrap succeeds under repeated or concurrent attempts
- Login success and generic login failure
- Forced-password route restriction
- Password change and reset invalidate older sessions
- Disabled user loses access
- Last active admin cannot be disabled or demoted
- Duplicate unit rejection
- Unit with active residents cannot be archived
- Resident and technician cannot mutate assets
- Resident and technician can read active society assets
- A user from fixture Society A cannot read Society B resources
- Unknown, archived, and cross-society QR tokens do not disclose asset data

### 12.3 Client Tests

- Protected-route and role-route behavior
- Forced-password redirect
- Form validation and server field errors
- Temporary-password one-time handoff dialog
- Asset ledger loading, empty, error, and populated states
- QR unavailable state

### 12.4 Browser Smoke Test

One end-to-end smoke path must:

1. Bootstrap society and first admin.
2. Create unit, resident, technician, and one asset.
3. Capture resident temporary password.
4. Log out and log in as resident.
5. Replace temporary password.
6. Open QR route and view asset.
7. Confirm mutation controls are absent and API mutation is denied.

Accessibility verification covers keyboard operation, visible focus, form labels, error association, color contrast, and reduced motion. Responsive checks cover 360 px mobile and a standard desktop viewport.

## 13. Deployment And Operations

### 13.1 Production Topology

- Render free web service: Express API plus compiled React SPA
- MongoDB Atlas M0: application data
- GitHub Actions: CI

Render build installs both workspaces, builds the client and server, and starts Express. Express serves `/api`, compiled static assets, and SPA fallback for non-API routes.

Atlas uses TLS and a dedicated least-privilege application user. Network access and credentials are documented without committing secrets.

### 13.2 Environment Contract

Root `.env.example` documents:

```text
NODE_ENV
PORT
MONGODB_URI
JWT_SECRET
APP_BASE_URL
```

Production startup fails clearly when required values are absent. `APP_BASE_URL` is the canonical public origin embedded in QR codes.

### 13.3 Health And Logs

- `/api/health/live` confirms the process can answer requests.
- `/api/health/ready` confirms MongoDB connectivity.
- Structured JSON logs include request ID, method, route template, status, duration, and safe actor ID.
- Unexpected errors include request ID in response and logs.
- Render logs are sufficient for Phase 1; no paid monitoring service is added.

README warns that Render free-tier cold starts can delay the first page load. The project does not use artificial keep-awake traffic.

### 13.4 Continuous Integration

GitHub Actions runs on every push:

1. Dependency installation from lockfile
2. Formatting check
3. Lint
4. Client and server TypeScript checks
5. Client and server tests
6. Production build

A failing check means the revision is not deployment-ready.

## 14. Definition Of Done

Phase 1 is complete when current deployed code and automated evidence demonstrate all conditions below:

1. Fresh database can bootstrap exactly one society and first admin.
2. Admin can create, edit, search, and archive units and assets.
3. Admin can create, edit, disable, re-enable, and reset users without exposing stored passwords.
4. Generated temporary password forces replacement before application access.
5. Admin can print a QR asset identity label.
6. Authenticated QR scan resolves to the correct active asset and survives login redirect.
7. Residents and technicians have read-only access to active assets.
8. Role violations and society-isolation attempts fail in automated tests.
9. CI passes formatting, lint, type, test, and build checks.
10. Main flows remain usable at 360 px and meet stated accessibility checks.
11. Render service and Atlas database are publicly reachable through one application URL.
12. README documents setup, architecture, environment, cold-start behavior, public URL, and owner-admin recovery procedure.

## 15. Future Phase Boundary

Phase 2 may consume `User`, `Society`, `Unit`, and `Asset` through their existing service and REST boundaries. It will introduce its own design for Vendor, Ticket, Comment, AuditEvent, Cloudinary evidence, and guarded ticket transitions. Phase 1 must not add placeholders or partial implementations for those features.
