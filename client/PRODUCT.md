# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

ApartCheck is presented primarily as a portfolio demonstration for people evaluating product thinking, frontend and backend engineering, security, accessibility, and deployment quality.

Within the product, a Society has three Member roles:

- An Administrator configures the Society and manages Units, Members, and shared Assets.
- A Resident is associated with one current Unit and needs reliable read-only access to shared Asset records.
- A Technician inspects and maintains shared Assets and needs the same reliable Asset identification and lookup foundation without membership-management authority.

## Product Purpose

ApartCheck demonstrates a complete, deployable Phase 1 foundation and a locally implemented Phase 2 maintenance workflow in one residential Society. It establishes trusted Society, Unit, Member, and Asset records; connects physical Assets to protected digital records through printable QR labels; and adds accountable Ticket reporting, internal Technician assignment, notes-only completion proof, Administrator verification, and immutable history.

Success means the shipped workflow is understandable, secure, accessible at desktop and phone widths, verifiable through automated tests, and usable in a live synthetic demonstration without implying capabilities that are not implemented or publicly verified.

The longer-term direction is an evidence-backed accountability workflow connecting Tickets, physical Assets, assignments, vendor work, costs, proof, verification, and history. Vendor identity, costs, uploads/media, SLA/due-date policy, notifications, analytics/exports, integrations, and multiple-Society administration remain future direction.

## Positioning

ApartCheck is an Asset identity and accountability foundation rather than a generic property-management dashboard or helpdesk. Its distinguishing mechanism is the durable bridge between a shared physical Asset, its human-readable Asset Code, its printable QR label, and a Society-scoped authenticated record.

Phase 1 answers what the Asset is and where it is. The local Phase 2 slice answers who reported a maintenance Ticket, who is assigned, what textual completion proof was submitted, and whether an Administrator verified it. Public deployment verification for this Ticket behavior remains outstanding.

## Operating Context

One first Administrator bootstraps a single Society, then creates Units, Members, and shared Assets. Administrators print Asset Identity Plates and place them near physical systems such as lifts, plumbing equipment, and electrical infrastructure. Authenticated Members can scan a QR label on a phone, sign in when required, and return safely to the protected Asset record.

The production demonstration runs as one same-origin web service backed by MongoDB Atlas. Demo records are synthetic and credentials remain private. Local ephemeral mode supports full setup and workflow evaluation without a persistent local database.

## Capabilities and Constraints

- The shipped workflow includes one-time Society setup, email/password sessions, forced temporary-password replacement, Administrator recovery, and session invalidation.
- Administrators can manage Units, Members, and Assets; Asset records support search, category filtering, editing, archiving, printable identity plates, QR download, and protected QR lookup.
- Roles are exactly Administrator, Resident, and Technician. Asset categories are exactly Lift, Plumbing, and Electrical. Every resource operation is scoped by the authenticated Society.
- Unknown, archived, malformed, and cross-Society QR lookups must remain indistinguishable. Browser code never reads session tokens, and temporary passwords must never be persisted, cached, stored, or logged.
- Phase 2 is implemented locally: Residents and Administrators report Tickets; Administrators assign active Technicians, verify or return work, cancel/archive terminal records; Technicians submit notes-only completion proof; immutable Ticket history is visible to authorized roles. Public verification remains outstanding.
- Vendors, costs, uploads/media, SLAs, notifications, analytics/exports, multiple-Society administration, offline scanning, and native clients remain future direction.

## Brand Commitments

The product name is **ApartCheck**. Future product language uses the canonical terms Society, Member, Administrator, Resident, Technician, Unit, Asset, Asset Code, QR Token, and Archive as defined in the repository's `CONTEXT.md`.

Copy should be direct and operational. Controls name outcomes, and empty, loading, and error states explain the current condition or recovery action. Current shell phrases such as “MAINTENANCE ARTIFACT” are implementation copy, not confirmed product claims or durable taglines.

## Evidence on Hand

- The verified public deployment is `https://apartcheck-heykay-47.onrender.com` and contains synthetic data; no public demo credentials are provided.
- The repository includes an end-to-end browser flow covering bootstrap, Unit and Member creation, Asset and QR creation, forced password change, and role denial.
- Automated accessibility checks cover representative Administrator screens at 360 by 800 and 1440 by 900, including keyboard behavior and serious or critical axe violations.
- Integration tests prove Society isolation for Units, Members, Assets, and QR Tokens. CI runs formatting, linting, type checking, unit and integration tests, builds, browser tests, and accessibility checks.
- There are no customer testimonials, production usage metrics, public case studies, formal WCAG conformance claims, or evidence for assignment, SLA, inspection, verification, or analytics metrics. Future work must not fabricate them.

## Product Principles

1. Demonstrate a small, complete, deployed workflow before expanding product breadth.
2. Anchor accountability in physical Asset identity and trustworthy Society-scoped records.
3. Let the server enforce role, Society, archive, credential, and disclosure boundaries.
4. Archive operational records instead of erasing them, and never leak inaccessible information.
5. Describe only behavior supported by working code and verifiable evidence.

## Accessibility & Inclusion

ApartCheck must remain keyboard operable, responsive at widths of 360 pixels and above, understandable without color alone, and respectful of reduced-motion preferences. Forms expose labels and programmatic error relationships; dialogs preserve expected focus and Escape behavior; protected pages provide a skip link and one main landmark.

Current automated coverage is evidence for representative routes and states, not a formal WCAG conformance claim. The interface is currently English-only and uses `en-US` date formatting; localization and additional assistive-technology validation remain open decisions.
