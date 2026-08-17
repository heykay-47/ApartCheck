---
name: ApartCheck
description: A hard-edged maintenance-artifact system for physical Asset identity, Tickets, and accountable records.
colors:
  plaster: '#eef0ec'
  chalk: '#fbfcf8'
  slate: '#20343b'
  pump: '#315c66'
  marigold: '#f2b134'
  verified: '#237a63'
  error: '#a32626'
  white: '#ffffff'
  landing-ink: '#171a18'
  landing-muted: '#626761'
  landing-line: '#d9ddd7'
  landing-paper: '#f7f8f4'
  landing-panel: '#ffffff'
  landing-accent: '#f0a51a'
  landing-deep: '#27332f'
typography:
  display:
    fontFamily: 'Barlow Condensed, sans-serif'
    fontSize: 'clamp(3.5rem, 7vw, 6rem)'
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Barlow Condensed, sans-serif'
    fontSize: 'clamp(4.5rem, 7vw, 6rem)'
    fontWeight: 700
    lineHeight: 0.84
    letterSpacing: '-0.035em'
  title:
    fontFamily: 'Barlow Condensed, sans-serif'
    fontSize: '2.4rem'
    fontWeight: 600
    lineHeight: 1
  body:
    fontFamily: 'Hind, sans-serif'
    fontSize: '17px'
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: 'IBM Plex Mono, monospace'
    fontSize: '0.72rem'
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: '0.08em'
  landing-headline:
    fontFamily: 'Hind, sans-serif'
    fontSize: 'clamp(3.8rem, 6.2vw, 5.75rem)'
    fontWeight: 600
    lineHeight: 0.91
    letterSpacing: '-0.035em'
  landing-body:
    fontFamily: 'Hind, sans-serif'
    fontSize: 'clamp(1rem, 1.3vw, 1.15rem)'
    fontWeight: 400
    lineHeight: 1.55
  landing-label:
    fontFamily: 'IBM Plex Mono, monospace'
    fontSize: '0.68rem'
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: '0.08em'
rounded:
  none: '0'
spacing:
  control-x: '18px'
  control-y: '10px'
  field-gap: '6px'
  mobile-gutter: '18px'
  page-gutter: 'clamp(1.125rem, 4vw, 4rem)'
  section: 'clamp(4rem, 9vw, 9rem)'
  landing-gutter: 'clamp(1.25rem, 4vw, 4.75rem)'
  landing-section: 'clamp(5rem, 10vw, 10rem)'
components:
  button-primary:
    backgroundColor: '{colors.pump}'
    textColor: '{colors.chalk}'
    typography: '{typography.label}'
    rounded: '{rounded.none}'
    padding: '10px 18px'
    height: '46px'
  button-primary-hover:
    backgroundColor: '{colors.slate}'
    textColor: '{colors.chalk}'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.slate}'
    typography: '{typography.label}'
    rounded: '{rounded.none}'
    padding: '10px 18px'
    height: '44px'
  field:
    backgroundColor: '{colors.chalk}'
    textColor: '{colors.slate}'
    typography: '{typography.body}'
    rounded: '{rounded.none}'
    padding: '10px 12px'
    height: '46px'
  identity-plate:
    backgroundColor: '{colors.chalk}'
    textColor: '{colors.slate}'
    rounded: '{rounded.none}'
    padding: '28px'
  landing-primary-action:
    backgroundColor: '{colors.landing-ink}'
    textColor: '{colors.landing-panel}'
    typography: '{typography.landing-label}'
    rounded: '{rounded.none}'
    padding: '12px 18px'
    height: '44px'
  landing-secondary-action:
    backgroundColor: 'transparent'
    textColor: '{colors.landing-ink}'
    typography: '{typography.landing-label}'
    rounded: '{rounded.none}'
    padding: '12px 18px'
    height: '44px'
---

# Design System: ApartCheck

## Overview

**Creative North Star: "The Maintenance Artifact"**

ApartCheck looks like a durable field record attached to physical infrastructure: pale plaster and chalk stock, dark monsoon-slate ink, ruled ledgers, registration marks, identity plates, and immutable lifecycle records. The authenticated product remains operational rather than ornamental. Structure comes from borders, alignment, typography, and recorded states instead of soft cards, decorative imagery, or generic SaaS chrome.

The public landing surface is a deliberately scoped Lifecycle Control Room expression of that system. It uses warm and cool white planes, graphite structure, a signal-amber trace, and precise square product geometry to explain one Ticket lifecycle before an existing Member signs in. These landing tokens and compositions do not replace the authenticated shell's Maintenance Artifact rules.

Condensed display type supplies the force of stamped headings and Asset Codes. Humanist body type keeps instructions and evidence readable, while monospaced labels make metadata, controls, stages, and system boundaries feel recorded. Pump blue identifies primary action, marigold marks a trace or selected edge, and verified green is reserved for positive state.

**Key Characteristics:**

- Hard-edged, square-cornered surfaces with visible construction.
- Strong readable landing statements paired with compact monospaced record labels.
- Flat plaster and chalk fields separated by slate rules.
- Identity plates, ledgers, and lifecycle histories as the recurring information forms.
- Sparse, functional color that distinguishes action, trace, and state.

## Colors

The palette reproduces painted plaster, paper stock, technical ink, pump hardware, and inspection markings; the frontmatter values are normative.

The public landing adds a warmer paper/graphite subset so the product tour reads as a customer-facing control room without changing authenticated color semantics.

### Primary

- **Pump Blue:** The primary action fill and interactive text accent. It remains distinct from the darker structural ink.

### Secondary

- **Marigold Trace:** A narrow trace mark, active navigation edge, focus outline, or status label. Its rarity makes it directional.
- **Verified Green:** Positive and verified state only; it is not a general decorative accent.
- **Record Error:** Field and feedback errors, with accompanying text or programmatic state rather than color alone.

### Neutral

- **Plaster Field:** The default page and work-surface ground.
- **Chalk Stock:** Identity plates, fields, mastheads, and raised record surfaces.
- **Monsoon Slate:** Primary text, borders, rules, navigation spines, and dark inverse sections.
- **QR White:** The explicit white substrate behind generated QR marks where printer and scanner contrast requires it.
- **Landing Graphite:** Public landing ink and structure; it is local to the Lifecycle Control Room surface.
- **Landing Paper:** Public landing ground and panel fields; it is not an authenticated work-surface replacement.
- **Landing Signal Amber:** Public landing CTA, selected workflow edge, and focus support only.

### Named Rules

**The Hard-Ink Rule.** Slate rules define hierarchy. Do not replace borders and ruled divisions with low-contrast card shadows or decorative gradients.

**The Trace-Accent Rule.** Marigold appears as a narrow edge, focus ring, or compact label, never as a broad page wash.

**The State-Is-Redundant Rule.** Error, archived, active, and verified meaning must remain available in text or semantics, never color alone.

## Typography

**Display Font:** Barlow Condensed (with sans-serif)
**Body Font:** Hind (with sans-serif)
**Label/Mono Font:** IBM Plex Mono (with monospace)

**Character:** The pairing combines stamped industrial authority with readable operational prose. Mono type labels records and controls; it does not replace body copy.

### Hierarchy

- **Display** (700, fluid 3.5rem to 6rem, line-height 0.9): Section statements and Asset identity in authenticated surfaces.
- **Headline** (700, fluid 4.5rem to 6rem on desktop, line-height 0.84): Authenticated shell statements; the public landing uses its scoped readable landing headline instead.
- **Title** (600, 2.4rem, line-height 1): Record and section titles inside operational surfaces.
- **Body** (400, 17px base, line-height up to 1.6): Explanations, instructions, and proof descriptions; long measures stop at 70ch.
- **Label** (500, 0.72rem, line-height 1.3, tracking 0.08em): Uppercase metadata, Asset labels, stage numbers, architecture boundaries, and compact navigation.
- **Landing headline** (600, fluid `clamp(3.8rem, 6.2vw, 5.75rem)`, line-height 0.91): The public first-viewport value statement in readable Hind rather than condensed display type.
- **Landing body** (400, fluid `clamp(1rem, 1.3vw, 1.15rem)`, line-height 1.55): Public product explanation and benefit copy.
- **Landing label** (500, 0.68rem, line-height 1.2, tracking 0.08em): Public masthead, preview metadata, evidence labels, and workflow controls.

### Named Rules

**The Three-Voice Rule.** Condensed type states, Hind explains, and mono labels. Do not interchange those jobs for novelty.

**The Direct-Heading Rule.** Major headings begin the section directly; generic eyebrow text above a headline is not part of this system.

## Layout

The authenticated shell uses a fixed 248px slate utility spine and a flexible work surface. Operational pages are centered to 1080px with 48px horizontal padding and 64px vertical padding. Asset and Ticket ledgers use strong top rules, lighter row separators, explicit columns, and content-aligned density rather than floating cards. Ticket detail pages keep the current status, linked record definition, role-valid actions, and immutable history in that reading order.

The public landing boundary uses a fluid `landing-gutter` and `landing-section` rhythm. Its sticky masthead is a solid paper surface with divided mono navigation and safe `8rem` anchor offsets. The desktop hero uses an asymmetric copy/preview split; the layered synthetic Ticket workspace is the visual anchor, not a generic illustration.

At 1099px and below, the landing hero becomes one column. At 760px and below, the landing masthead navigation becomes a full second row and the hero/benefit/workflow compositions stack; at 600px the gutter is 18px, preview definitions and history rows expose labels, workflow tabs become vertical, and offsets stay within the viewport. The authenticated shell still replaces its spine with the mobile bar at 700px.

The minimum supported viewport is 360px. At 360px, no content may force horizontal scrolling, both hero actions remain visible before the preview, preview rows remain legible, and all navigation and control targets remain at least 44px.

**The Ledger-First Rule.** Repeated records use ruled rows and explicit columns on wide screens, then labeled stacked records on narrow screens. Do not convert the same information into unrelated card tiles.

**The Boundary Rule.** The public Lifecycle Control Room is a landing-only explanation of the shipped Ticket lifecycle. Its synthetic preview, section pacing, and workflow tour are not templates for authenticated screens.

## Elevation & Depth

The authenticated system is flat by default. Plaster, chalk, and slate tonal contrast plus hard rules establish depth. Offset solid shadows are structural marks reserved for temporary overlays or plates; there are no ambient blur shadows. The public landing uses restrained solid graphite offsets on its Ticket preview to create layered control-room depth, never ambient glow.

### Shadow Vocabulary

- **Confirmation Offset** (`8px 8px 0 var(--color-slate)`): Fixed confirmation panels.
- **Dialog Offset** (`10px 10px 0 var(--color-slate)`): Credential dialogs above the slate backdrop.
- **Landing Preview Offset** (`9px 9px 0 #171a18`): Public Ticket preview depth, kept inside the mobile viewport.

### Named Rules

**The Flat-By-Default Rule.** Resting surfaces use borders and tonal fields. Do not add blur shadows, glass effects, or floating-card depth.

## Shapes

All documented surfaces and controls use square corners. One- and two-pixel slate rules, heavier top rules, and asymmetric accent edges provide shape. Identity plates use a 2px perimeter plus a marigold left edge in the authenticated product. The public Ticket preview uses square borders and restrained graphite offsets; QR substrates remain square and high contrast.

**The No-Radius Rule.** Buttons, fields, ledgers, plates, dialogs, labels, and navigation stay at zero radius.

**The Identity-Plate Rule.** An identity plate must visibly bind an Asset Code, Asset name, location or state metadata, and a square QR region inside one bordered record. It is not a generic content card.

## Components

### Buttons

- **Shape:** Square, hard-bordered controls with a minimum 44px target; authenticated primary controls use 46px.
- **Primary:** Pump fill, chalk text, bold label or body weight, and a 2px matching border.
- **Hover / Focus:** Primary hover shifts to slate. Every keyboard-focusable control receives the global 2px marigold outline with a 3px offset.
- **Secondary:** Transparent with slate text and strong block-axis rules; landing hover uses graphite fill without removing the text label.
- **Disabled:** Preserve the control silhouette at 0.55 opacity and use a not-allowed cursor.

### Navigation

- **Authenticated:** Slate spine with chalk text; hover and active states add a 2px marigold left rule and a restrained translucent white field. At 700px it becomes a slate mobile bar with a native disclosure menu.
- **Landing:** Paper masthead with a solid background, divided mono uppercase links, sticky positioning, and a full-width second row below 760px. Hash targets clear the masthead, and all controls retain 44px targets.
- **Focus:** The same global marigold focus outline applies; skip links move into view only on keyboard focus.

### Inputs / Fields

- **Style:** Chalk fill, slate text, one-pixel slate border, square corners, inherited Hind body type, and a 46px default minimum height.
- **Labels:** Mono uppercase labels sit above controls with a compact 6px to 8px gap.
- **Focus:** Global marigold focus outline supplements rather than replaces the visible field border.
- **Error / Disabled:** Error copy uses the record-error token and programmatic field relationships. Disabled behavior must remain visibly and semantically disabled.

### Ledgers / Record Rows

- **Structure:** A 2px slate top rule and one-pixel separators; column widths follow the record's information hierarchy.
- **Labels:** Asset Codes, headers, counts, metadata, and responsive generated labels use mono type.
- **State:** Hover may add a restrained chalk tint, but row boundaries and text remain readable without hover.
- **Responsive:** At 700px and below, multi-column Asset and Ticket rows become stacked records and expose `data-label` text; headers may hide only when each value retains a visible label.

### Ticket Lifecycle Record

- **Ledger:** Ticket rows expose title, Unit, optional Asset, lifecycle status, assignee, and update time inside one ruled record. Status remains written in full and never becomes a decorative pill.
- **Detail hierarchy:** Current status follows the Ticket title and description; linked Unit, Asset, Reporter, Assignee, and timestamps form a compact definition record before actions.
- **Actions:** Controls appear only when valid for the current role and status. Primary lifecycle actions use Pump Blue; return, cancel, and archive remain explicit text actions with destructive meaning in words as well as color.
- **History:** Every lifecycle event is a ruled row naming the actor, action, status transition, optional assignee or note, and timestamp. Notes use a narrow marigold left rule to mark evidence without turning the history into cards.

### Asset Identity Plate

- **Structure:** Chalk stock, 2px slate perimeter, 12px marigold left edge, 28px padding, and a two-column copy/220px QR layout.
- **Identity:** The Asset Code and name dominate in condensed type; mono labels identify category and metadata.
- **QR:** A white square substrate, up to 220px, with pixelated image rendering. Alt text names the Asset Code; loading and download behavior retain readable labels.
- **Responsive:** Below 700px, the plate stacks with 20px padding and the QR region remains bounded.

### Landing Ticket Preview

- **Pattern:** A static synthetic Ticket record exposes Ticket identity, Unit, Asset, Reporter, Owner, latest note, and chronological Reported/Assigned/Submitted/Verified history.
- **States:** `data-step` changes the written lifecycle state and marks reached history rows with redundant text; it never relies on color alone.
- **Depth:** The preview uses square borders and restrained solid graphite offsets, with a compact stacked form at mobile widths.

### Workflow Tour

- **Pattern:** Four visible Report, Assign, Complete, and Verify tabs synchronize one preview inside a labeled tablist and tabpanel.
- **Interaction:** Pointer selection and ArrowLeft/ArrowRight/Home/End movement select and focus the same step; only one tab is in the tab order.
- **Motion:** Progressive page reveals use opacity and vertical translation only; reduced motion reveals every `[data-reveal]` target immediately.

### State and Feedback

- **Positive:** Verified green is reserved for explicit positive state.
- **Error / Destructive:** Record error marks error copy and destructive actions, always accompanied by text.
- **Archived / Active:** State is written as canonical text on the identity plate and in records.
- **Overlays:** Confirmation and credential surfaces use chalk, a 2px slate border, a solid slate offset, and a 72% slate backdrop.

## Do's and Don'ts

### Do:

- **Do** build hierarchy with plaster/chalk fields, slate rules, square geometry, and the three established type voices.
- **Do** preserve canonical terms including Society, Member, Administrator, Resident, Technician, Unit, Asset, Asset Code, QR Token, and Archive.
- **Do** keep controls keyboard operable, expose a visible `:focus-visible` treatment, and maintain 44px minimum targets on narrow screens.
- **Do** stack grids and ledgers deliberately at the documented breakpoints and verify the complete 360px width without horizontal overflow.
- **Do** honor `prefers-reduced-motion`: remove transitions, reduce animation duration to 0.01ms globally, and reveal every landing content target without transform.
- **Do** keep QR marks square, high contrast, textually identified, and attached to the relevant Asset record.
- **Do** present Ticket status, assignment, actions, and immutable history as one accountable record with a stable reading order.

### Don't:

- **Don't** use gradients, background images, glassmorphism, blurred ambient shadows, rounded cards, pills, or soft floating containers.
- **Don't** use a generic centered SaaS hero, feature-card grid, ornamental eyebrow, or decorative illustration in place of an implemented record form.
- **Don't** promote the landing page's synthetic Ticket preview, workflow tour, or section sequence into a system-wide layout requirement.
- **Don't** use marigold as a broad fill or verified green as decoration.
- **Don't** communicate error, archive, active, or verified state through color alone.
- **Don't** visualize vendors, costs, uploads/media, SLAs, notifications, analytics, integrations, or multi-Society administration as shipped behavior.
- **Don't** turn Ticket statuses into decorative pills, hide lifecycle meaning behind color, or detach history from its Ticket record.
- **Don't** remove semantic landmarks, labels, skip links, programmatic errors, expected dialog focus/Escape behavior, or the single-main-landmark contract for visual cleanliness.
