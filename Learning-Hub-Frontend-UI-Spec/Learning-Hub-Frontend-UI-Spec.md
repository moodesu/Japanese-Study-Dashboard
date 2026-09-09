# Japanese Learning Hub — Front-End & UI Specification

**Version:** v1.0  
**Date:** 9 September 2026  
**Purpose:** Authoritative reference for discussing, designing, implementing, and reviewing the Learning Hub front end.

---

## 1. Purpose and authority

This document defines the **shared visual language, layout rules, component terminology, responsive behaviour, and route-level expectations** for the Japanese Learning Hub.

It exists so that future requests such as:

- “make the grammar cards tighter”
- “change the reference buttons”
- “adjust the Hub section header”
- “the lesson hero is too large”
- “make this match the rest of the shell”

refer to a common set of named UI components and rules.

### Source of truth

The production app should have **one authoritative application stylesheet:**

`styles.css`

The file should be internally organised into sections, but the app should not depend on successive override files such as `hub-polish.css`, `site-shell.css`, etc.

Specialist source-rendering CSS may remain separate only when genuinely required for isolated third-party/source content and when it does not redefine the main application shell.

---

# 2. Design direction

The Learning Hub should feel like a **calm, academic, modern study application** rather than a marketing site.

Core characteristics:

- warm off-white background
- dark navy primary text
- teal accent
- subtle grey-blue muted text
- restrained borders
- very light or no shadows
- flatter cards
- rounded but not bubbly geometry
- hierarchy created by spacing, typography and tinted surfaces
- compact controls
- minimal visual noise
- no oversized call-to-action buttons
- no nested “card inside card inside card” appearance

The design should remain structurally identical in light and dark modes. Theme changes affect colour and surface contrast, **not geometry**.

---

# 3. UI vocabulary

Use these terms consistently in future discussions.

## 3.1 App Shell

The persistent chrome surrounding every route.

Includes:

- Learning Hub brand / app mark
- primary desktop navigation
- utility navigation
- account sync state
- Furigana toggle
- theme toggle
- logout/login controls
- mobile bottom navigation
- mobile More menu

The App Shell must remain visually stable across routes.

## 3.2 Page Shell

The common content frame beneath the App Shell.

Every major route lives inside the same page-width and gutter system.

Examples:

- Home
- Plan
- Lessons
- Hub
- Repository
- Grammar Library
- Grammar Guide
- WaniKani

## 3.3 Page Hero

The major route header immediately below the App Shell.

Typical contents:

- eyebrow
- page title
- subtitle
- optional metadata
- optional right-aligned actions

All Page Heroes use the same outer width, padding, radius and border.

A reading page may use a narrower **body column**, but the hero itself remains aligned with the Page Shell.

## 3.4 Section Header

A heading that introduces a major page section.

May include:

- Font Awesome icon
- section title
- short explanatory subtitle
- chevron if collapsible

Hub Section Headers are collapsible. Ordinary article sections are not unless explicitly required.

## 3.5 Surface Card

Default reusable content card.

Used for:

- Dashboard panels
- programme cards
- Hub resource cards
- Repository entry cards
- WaniKani panels
- supplementary resources

## 3.6 Compact Card

Inset/sub-item card inside a larger section.

Used for:

- grammar forms / variants
- reference examples
- course-occurrence rows
- supplementary practice rows
- correction pattern rows
- compact metadata items

## 3.7 Article Card

A larger reading-oriented container that groups related prose sections.

Used especially for Grammar Guide content.

## 3.8 Resource Row

A horizontal item representing a reference or external/private resource.

Structure:

`[title + short description]      [action]`

Examples:

- A Dictionary of Japanese Grammar → Open reference
- NINJAL 文型バンク → Open examples
- A Dictionary of Basic Japanese Grammar → Open
- supplementary grammar workbook → Open practice

All Resource Rows must share the same geometry and action styling.

## 3.9 Status Badge

A small non-interactive pill indicating state.

Examples:

- Matched
- Related
- Pending
- Active
- Optional
- Available
- Learning

Status Badges are not buttons.

## 3.10 Action Button

Use one of the shared button families:

- Primary
- Secondary
- Ghost
- Text/link action
- Icon-only

Do not introduce route-specific button geometries.

---

# 4. Layout system

## 4.1 Main application width

Target desktop application content width:

**approximately 1216 px max-width**

The exact implementation value may be adjusted slightly, but all major routes should use the same value.

## 4.2 Page gutters

Desktop:
- approximately 20–24 px internal page gutter

Tablet:
- approximately 16–20 px

Mobile:
- approximately 10–14 px

The visual edge of a route's hero, major cards and section containers should align.

## 4.3 Readable article width

Long-form content may use an inner readable column of roughly:

**880–960 px**

This applies to:

- Grammar Guide prose
- long reference text
- documentation-like sections

Important: the readable column is **inside** the normal Page Shell. Do not shrink the whole route's hero to the article width.

## 4.4 Vertical rhythm

Preferred vertical hierarchy:

- major route block gap: 14–18 px
- section gap: 12–16 px
- card-to-card gap: 8–12 px
- compact internal gap: 6–9 px

Avoid large unexplained vertical gaps.

---

# 5. Geometry tokens

Use a small fixed set.

## Radii

- Page Hero / major section: ~16 px
- Surface Card: ~12–14 px
- Compact Card / Resource Row: ~10–12 px
- Button: ~8–9 px
- Pill / badge: 999 px

## Card padding

Use standard sizes rather than per-route values.

Suggested:

- Standard Surface Card: 16 px
- Compact Card: 12–14 px
- Dense resource row: 10–12 px
- Page Hero: 18–20 px desktop

Mobile may reduce card padding slightly but must remain consistent.

## Shadows

Default: none or extremely subtle.

Do not use large material-style shadows.

---

# 6. Typography

## Page Hero

Eyebrow:
- uppercase
- teal
- small
- letter-spaced
- strong weight

Title:
- dark navy
- bold
- compact line height
- consistent across routes

Subtitle:
- muted
- normal weight
- approximately 1 rem

## Section title

- bold
- approximately 1.05–1.2 rem
- normally paired with a small teal-tinted icon where useful

## Card title

- bold
- slightly smaller than section heading
- Japanese content may be larger when it is the primary study target

## Metadata

- muted
- smaller
- never compete with body text

---

# 7. Shared button system

All application actions derive from the same primitives.

## 7.1 Desktop dimensions

Target normal control height:

**34–36 px**

## 7.2 Mobile dimensions

Minimum touch target:

**40 px**

## 7.3 Primary button

Use for the single main action in a context.

Examples:

- Capture
- Activate programme
- Save
- Start

Appearance:
- dark navy fill
- white text
- compact radius
- no oversized padding

## 7.4 Secondary button

Use for ordinary actions.

Examples:

- Open reference
- Open examples
- Open practice
- Browse exercises
- Import JSON

Appearance:
- light/transparent surface
- restrained border
- navy text
- teal hover/focus accent

## 7.5 Ghost / text action

Use for low-emphasis actions such as:

- Clear filters
- Back
- inline navigation

## 7.6 Icon-only

Use only when meaning is obvious and a tooltip/accessible label exists.

Examples:

- theme
- search
- compact close

## 7.7 Resource action rule

These must be the **same visual component**:

- Open reference ↗
- Open examples ↗
- Open ↗
- Open practice

Underlying HTML may differ, but markup should expose a shared class such as:

`resource-action`

CSS should style that class once.

---

# 8. Page Hero specification

Every route Hero should use the same outer geometry.

Standard:

- same max width as Page Shell
- same left/right alignment
- same 16 px-ish radius
- same border treatment
- same 18–20 px desktop padding
- same title/subtitle hierarchy

### Hero actions

Right-aligned actions are allowed when relevant.

Examples:

Repository:
- Capture
- Import JSON
- Grammar Library
- Export

Grammar Guide:
- normally no large action group; metadata remains compact

### Do not

- use a narrower hero on Grammar than Repository
- use substantially different padding between routes
- put route content outside the shared gutter system

---

# 9. Card system

## 9.1 Surface Card

Default:

- light card surface
- thin restrained border
- standard radius
- standard padding
- no heavy shadow

## 9.2 Compact Card

Used for child items.

Must use the same:
- border colour
- radius family
- muted background family
- 12–14 px inset

Examples:
- Grammar Forms / Variants
- Reference Examples
- course occurrence rows
- correction patterns

## 9.3 Whole-card interaction

When the entire card is clickable:
- cursor indicates interaction
- hover changes border/surface subtly
- avoid nested competing buttons unless necessary

---

# 10. Hub specification

## 10.1 Major sections

Examples:

- Active programme
- Planned programmes
- Book library
- Study tools & input

Major Hub sections may be collapsible.

## 10.2 Collapsible section header

Structure:

`[small chevron] [section icon] [title + optional subtitle]`

Rules:

- small Font Awesome chevron on the LEFT
- section icon immediately after chevron
- whole header is accessible toggle
- `aria-expanded`
- collapsed state persists in localStorage
- sections expanded by default for a new user
- chevron should never float on the far right

## 10.3 Book library

Cards should be relatively compact.

Desktop:
- target 4 columns where space permits

Tablet:
- 3 columns

Mobile:
- 2 columns where viable

Book-cover area should not make cards disproportionately tall.

## 10.4 Study tools

Cards include:
- small type/status badges
- title
- concise description
- optional compact secondary action

Example:
`Browse exercises` should be a compact secondary action, not a large full-width CTA.

---

# 11. Repository specification

The Repository list is one of the reference layouts for the overall shell.

## Repository Hero

- same Page Hero geometry as all other routes
- actions aligned on right
- no route-specific padding system

## Filter bar

- same surface-card geometry
- labels use standard metadata typography
- form controls use standard input radius and height

## Entry cards

Structure:

- kind label
- status badge
- Japanese
- English
- metadata

Card padding and radius should use shared Surface Card tokens.

## Correction Patterns sidebar

Uses shared Surface Card / Compact Card primitives.

---

# 12. Grammar Library specification

## 12.1 Library cards

Preferred structure:

`[canonical grammar]                         [Matched]`

`meaning`

`matched-form / related information`

Rules:

- status badge top-right
- `Matched`, `Related`, and `Pending` visually distinct
- badge is non-interactive
- matched explanation appears in a subtle footer area
- do not bury the word “Matched” inside prose

## 12.2 Grammar navigation state

Routes:

- `/grammar`
- `/grammar/<id>`

must highlight **Grammar**, not Repository.

---

# 13. Grammar Guide specification

The Grammar Guide is a reading-oriented page inside the normal shell.

## 13.1 Overall structure

1. Page Hero
2. Optional Practice block
3. Main Article Card
4. contextual sections such as:
   - My examples
   - Reference examples
   - Used in your books
   - Related grammar
   - References & further study

All major blocks share the same outer alignment.

## 13.2 Hero

Contents:

- Back to Grammar Library
- `GRAMMAR REFERENCE` eyebrow
- canonical grammar title
- concise meaning
- metadata pills such as register/status

## 13.3 Main guide article

Typical sections:

- Overview
- Formation
- Usage and nuance
- Forms / variants
- Combined forms
- Clarifications

Major section titles may include a small Font Awesome icon.

The article remains readable and uncluttered.

## 13.4 Forms / variants

Must use Compact Cards rather than bare horizontal table rows.

Example:

`[ 〜終えた ]`
`Formation`
`A written-style alternative using 終える rather than 終わる.`

Consistent with Reference Example and course-context card geometry.

## 13.5 Reference examples

Each example uses Compact Card styling.

## 13.6 Used in your books

Course-occurrence rows use Compact Card / Resource Row geometry.

Example:

`TOBIRA Beginning Japanese II · 12-week foundation    LESSON 15 · GRAMMAR 2`

## 13.7 Practice

Optional practice should look like a normal resource surface.

The action uses the shared Secondary/Resource Action style.

## 13.8 References & further study

Every resource uses one Resource Row component.

Do not separately style:
- dictionary button
- NINJAL summary action
- external reference action

They should share one action class and one padding model.

---

# 14. Supplementary resource specification

Supplementary resources are independent of programme lifecycle.

Examples:
- Multimedia Exercises for Basic Japanese Grammar

## Hub card

- resource type badge
- optional badge
- Japanese title
- English title
- concise metadata
- compact `Browse exercises` action

## Browser

- independent of current programme
- search/filter
- unit number
- source heading
- printed page
- linked canonical grammar
- compact `Open practice` action

No mastery, confidence, SRS or required completion indicators.

---

# 15. Lessons / Guided Lesson specification

Preserve existing functional behaviour:

- task-linked Pomodoro
- inline audio/media persistence
- lesson reference
- private textbook new-tab opening
- task completion / notes / accumulated Pomodoro time only

Visual rules:

- avoid nested bordered cards on mobile
- task hierarchy should be created with spacing and subtle surfaces
- Step badge/header clearly visible
- media panel should visually belong to the task
- buttons use global button primitives

---

# 16. WaniKani specification

WaniKani is a supporting-resource page inside the same Page Shell.

It may have route-specific charts/data displays, but:

- Page Hero uses shared geometry
- panels use Surface Cards
- controls use shared buttons
- no alternate radius/padding system

---

# 17. Forms and inputs

All application inputs use a shared geometry.

Standard:

- same border colour
- same radius
- same font
- same focus ring
- same theme behaviour

Mobile input font size must remain at least 16 px where needed to avoid iOS focus zoom.

---

# 18. Dark mode

Dark mode changes tokens, not structure.

Must preserve exactly the same:

- widths
- heights
- padding
- radius
- layout
- button geometry
- card geometry
- hero geometry

Only colours/surfaces/borders change.

---

# 19. Responsive specification

## Desktop

Target design baseline:
- 1440 px+ viewport
- compact desktop navigation
- Page Shell centered
- 4-column Hub book grid when viable

## Tablet

- reduce columns
- retain same component hierarchy
- no overflow

## Mobile

Primary rules:

- fixed bottom navigation
- More sheet for utilities
- no horizontal scrolling
- 40 px+ touch targets
- compact section headers
- physical hierarchy flattened
- avoid card-inside-card visual clutter
- two-column book grid where usable; otherwise one
- resource rows may wrap vertically if necessary

---

# 20. Route ownership

Use these names when discussing future changes.

| Route / Area | Name to use |
|---|---|
| `/` / dashboard | Home / Dashboard |
| programme overview | Plan |
| lesson list / guided lesson | Lessons |
| `/books` | Hub |
| book grid | Book Library |
| tools grid | Study tools & input |
| `/repository` | Repository |
| repository filters | Repository Filter Bar |
| repository sentence cards | Repository Entry Cards |
| `/grammar` | Grammar Library |
| Grammar Library tiles | Grammar Cards |
| `/grammar/<id>` | Grammar Guide |
| grammar top block | Grammar Hero |
| Overview/Formation/etc | Grammar Article |
| forms / variants | Variant Cards |
| personal saved sentences | My Examples |
| built-in guide examples | Reference Examples |
| textbook occurrences | Used in Your Books |
| dictionary/NINJAL/external references | References & Further Study |
| reference item row | Resource Row |
| resource row right-side action | Resource Action |
| supplementary workbook listing | Supplementary Resource Browser |
| WaniKani route | WaniKani Dashboard |

---

# 21. CSS architecture

## Required production structure

Prefer:

`styles.css`

as the one authoritative application stylesheet.

Inside that file organise sections:

1. Tokens
2. Base / reset
3. App Shell
4. Typography
5. Buttons / controls
6. Page Shell / Heroes
7. Cards / surfaces
8. Forms
9. Home
10. Plan
11. Lessons
12. Hub
13. Repository
14. Grammar
15. Supplementary resources
16. WaniKani
17. Dialogs
18. Dark mode
19. Responsive

## Avoid

- `hub-polish.css`
- `site-shell.css`
- “load this file last to override everything”
- repeated `!important` patches
- element-specific rules for visually identical actions
- route-specific duplicate button systems

## Specialist CSS

A specialist stylesheet may remain only when it is truly isolated source-rendering code.

It must not redefine:
- app width
- cards
- buttons
- hero
- navigation
- global typography

---

# 22. Markup architecture

Prefer semantic shared classes over CSS inference.

Good:

```html
<a class="resource-row">
  ...
  <span class="resource-action">Open ↗</span>
</a>
```

and:

```html
<button class="button button-secondary">Open reference ↗</button>
```

Avoid styling based on incidental HTML structure:

```css
.grammar-source-row > b
details > summary > b
div + button.smallbtn
```

Visually equivalent components should expose the same class.

---

# 23. Accessibility

Required:

- visible keyboard focus
- semantic buttons for actions
- links for navigation
- `aria-expanded` for collapse controls
- tooltips/accessible names for icon-only controls
- sufficient contrast in both themes
- mobile tap targets
- no loss of meaning when colour is unavailable

Status badges should contain text, not colour alone.

---

# 24. Acceptance checklist for any UI change

Before accepting a visual change, compare at least:

- Home
- Hub
- Repository
- Grammar Library
- Grammar Guide
- WaniKani

Check:

### Alignment
- same route gutters
- same hero alignment
- same major-card alignment

### Geometry
- same hero padding
- same card padding
- same button height
- same button horizontal padding
- shared radii

### Theme
- same geometry in light/dark
- no theme-only layout changes

### Responsive
- desktop
- tablet
- narrow mobile
- no horizontal overflow

### Function
- navigation unchanged
- route state unchanged
- no completion/data behaviour changed

---

# 25. How to request future UI changes

Use the component names from this document.

Examples:

> “In the Grammar Guide, reduce the padding of Variant Cards.”

> “Make Resource Actions in References & Further Study less prominent.”

> “The Repository Hero should match the Hub Page Hero.”

> “Reduce the Book Library card height without changing Study Tools cards.”

> “On mobile, the Hub Section Header has too much vertical padding.”

This avoids ambiguous descriptions such as “the box near the bottom” or “the button on the grammar page.”

---

# 26. Visual principle

When deciding between two implementations, prefer the one that makes the Learning Hub feel like **one application**.

A new route or component should not introduce a new:

- button geometry
- card radius
- padding scale
- page width
- hero style
- badge style
- navigation treatment

unless there is a clear functional reason.

The goal is not uniformity for its own sake. The goal is a consistent visual grammar so that differences communicate meaning rather than implementation history.
