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
rounded:
  none: '0'
spacing:
  control-x: '18px'
  control-y: '10px'
  field-gap: '6px'
  mobile-gutter: '18px'
  page-gutter: 'clamp(1.125rem, 4vw, 4rem)'
  section: 'clamp(4rem, 9vw, 9rem)'
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
---

# Design System: ApartCheck

## Overview

**Creative North Star: "The Maintenance Artifact"**

ApartCheck looks like a durable field record attached to physical infrastructure: pale plaster and chalk stock, dark monsoon-slate ink, ruled ledgers, registration marks, identity plates, and immutable lifecycle records. The visual system is operational rather than ornamental. Structure comes from borders, alignment, typography, and recorded states instead of soft cards, decorative imagery, or generic SaaS chrome.

Condensed display type supplies the force of stamped headings and Asset Codes. Humanist body type keeps instructions and evidence readable, while monospaced labels make metadata, controls, stages, and system boundaries feel recorded. Pump blue identifies primary action, marigold marks a trace or selected edge, and verified green is reserved for positive state.

**Key Characteristics:**

- Hard-edged, square-cornered surfaces with visible construction.
- Oversized condensed headings paired with compact monospaced record labels.
- Flat plaster and chalk fields separated by slate rules.
- Identity plates, ledgers, and lifecycle histories as the recurring information forms.
- Sparse, functional color that distinguishes action, trace, and state.

## Colors

The palette reproduces painted plaster, paper stock, technical ink, pump hardware, and inspection markings; the frontmatter values are normative.

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

- **Display** (700, fluid 3.5rem to 6rem, line-height 0.9): Section statements, generally balanced and held near 12 characters per line.
- **Headline** (700, fluid 4.5rem to 6rem on desktop, line-height 0.84): The landing statement; compact tracking and a narrow measure create the stamped first-viewport silhouette.
- **Title** (600, 2.4rem, line-height 1): Record and section titles inside operational surfaces.
- **Body** (400, 17px base, line-height up to 1.6): Explanations, instructions, and proof descriptions; long measures stop at 70ch.
- **Label** (500, 0.72rem, line-height 1.3, tracking 0.08em): Uppercase metadata, Asset labels, stage numbers, architecture boundaries, and compact navigation.

### Named Rules

**The Three-Voice Rule.** Condensed type states, Hind explains, and mono labels. Do not interchange those jobs for novelty.

**The Direct-Heading Rule.** Major headings begin the section directly; generic eyebrow text above a headline is not part of this system.

## Layout

The authenticated shell uses a fixed 248px slate utility spine and a flexible work surface. Operational pages are centered to 1080px with 48px horizontal padding and 64px vertical padding. Asset and Ticket ledgers use strong top rules, lighter row separators, explicit columns, and content-aligned density rather than floating cards. Ticket detail pages keep the current status, linked record definition, role-valid actions, and immutable history in that reading order.

The public landing boundary uses a fluid gutter and section rhythm from the frontmatter. A pair of full-height inset guide rules and section borders maintain the record-sheet construction without images or gradients. Desktop hero content uses an asymmetric copy/plate split and a four-column trace rail. The trace plate, not a generic illustration, is the visual anchor.

At 979px and below, the landing hero becomes one column and scope content reduces to two columns. At 759px and below, the gutter is 18px, masthead navigation becomes a full second row, actions become full-width, the trace plate becomes one column, trace and proof ledgers stack, architecture connectors turn vertical, and scope/footer grids collapse. At 700px and below, the authenticated shell replaces its spine with the mobile bar; operational ledgers and identity plates stack.

The minimum supported viewport is 360px. At 360px, no content may force horizontal scrolling: the landing headline narrows to 7ch, both hero actions remain visible before the plate, the plate is `100vw - 48px`, its QR mark is at most 150px, and stage rows stack with 44px minimum navigation/control targets.

**The Ledger-First Rule.** Repeated records use ruled rows and explicit columns on wide screens, then labeled stacked records on narrow screens. Do not convert the same information into unrelated card tiles.

**The Boundary Rule.** The landing trace sequence is reusable when explaining physical Asset to protected record traceability. Its exact hero composition, synthetic `LFT-0007` plate, four-stage first-viewport rail, and section order are landing-surface expressions, not a template for authenticated screens.

## Elevation & Depth

The system is flat by default. Plaster, chalk, and slate tonal contrast plus hard rules establish depth. Offset solid shadows are structural marks reserved for temporary overlays or plates; there are no ambient blur shadows. Landing plates use a one-sided marigold offset to suggest an attached tag rather than elevation.

### Shadow Vocabulary

- **Confirmation Offset** (`8px 8px 0 var(--color-slate)`): Fixed confirmation panels.
- **Dialog Offset** (`10px 10px 0 var(--color-slate)`): Credential dialogs above the slate backdrop.
- **Trace Edge** (`12px 0 0 var(--color-marigold)`): Landing trace plate identity edge, including the 360px composition.

### Named Rules

**The Flat-By-Default Rule.** Resting surfaces use borders and tonal fields. Do not add blur shadows, glass effects, or floating-card depth.

## Shapes

All documented surfaces and controls use square corners. One- and two-pixel slate rules, heavier top rules, asymmetric accent edges, and registration corners provide shape. Identity plates use a 2px perimeter plus a marigold left edge in the product or a marigold right offset on the landing trace plate. QR substrates remain square and high contrast.

**The No-Radius Rule.** Buttons, fields, ledgers, plates, dialogs, labels, and navigation stay at zero radius.

**The Identity-Plate Rule.** An identity plate must visibly bind an Asset Code, Asset name, location or state metadata, and a square QR region inside one bordered record. It is not a generic content card.

## Components

### Buttons

- **Shape:** Square, hard-bordered controls with a minimum 44px target; authenticated primary controls use 46px.
- **Primary:** Pump fill, chalk text, bold label or body weight, and a 2px matching border.
- **Hover / Focus:** Primary hover shifts to slate. Every keyboard-focusable control receives the global 2px marigold outline with a 3px offset.
- **Secondary:** Transparent with slate text and strong block-axis rules; landing hover uses marigold fill without removing the text label.
- **Disabled:** Preserve the control silhouette at 0.55 opacity and use a not-allowed cursor.

### Navigation

- **Authenticated:** Slate spine with chalk text; hover and active states add a 2px marigold left rule and a restrained translucent white field. At 700px it becomes a slate mobile bar with a native disclosure menu.
- **Landing:** Chalk masthead bounded by 2px rules. Mono uppercase links occupy divided cells; below 759px they form a full-width second row with 44px targets.
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

### Trace Sequence

- **Pattern:** Four ordered stages, Register, Label, Scan, Retrieve, connect one physical Asset to one protected Society-scoped record.
- **Reuse:** Use the sequence only for traceability explanation, onboarding, or documentation where all four stages are truthful. Operational ledgers should reuse rules and type roles, not this narrative composition.
- **Motion:** Stages reveal over 480ms with `cubic-bezier(0.16, 1, 0.3, 1)` and 90ms increments. Motion changes opacity and vertical position only; reduced-motion mode displays all stages immediately with no transform.

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
- **Do** honor `prefers-reduced-motion`: remove transitions, reduce animation duration to 0.01ms globally, and reveal trace stages without transform.
- **Do** keep QR marks square, high contrast, textually identified, and attached to the relevant Asset record.
- **Do** present Ticket status, assignment, actions, and immutable history as one accountable record with a stable reading order.

### Don't:

- **Don't** use gradients, background images, glassmorphism, blurred ambient shadows, rounded cards, pills, or soft floating containers.
- **Don't** use a generic centered SaaS hero, feature-card grid, ornamental eyebrow, or decorative illustration in place of an implemented record form.
- **Don't** promote the landing page's synthetic record, exact trace rail, or section sequence into a system-wide layout requirement.
- **Don't** use marigold as a broad fill or verified green as decoration.
- **Don't** communicate error, archive, active, or verified state through color alone.
- **Don't** visualize vendors, costs, uploads/media, SLAs, notifications, analytics, integrations, or multi-Society administration as shipped behavior.
- **Don't** turn Ticket statuses into decorative pills, hide lifecycle meaning behind color, or detach history from its Ticket record.
- **Don't** remove semantic landmarks, labels, skip links, programmatic errors, expected dialog focus/Escape behavior, or the single-main-landmark contract for visual cleanliness.
