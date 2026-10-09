# Phase 4 — Today, Planting windows, Settings

Goal: the three remaining routes match the export.
- Today: template lines 75–120; logic around lines 413–416 and 485–487.
- Planting windows: lines 265–275; logic lines 461–464.
- Settings: lines 277–312; logic lines 513–519.

Each route applies the plan's demo-honesty deviations.

## File ownership

| File | Owner |
|---|---|
| `src/routes/+page.svelte` (Today composition), `src/lib/components/today/*.svelte` | **Haiku** |
| `src/routes/windows/+page.svelte`, `src/lib/components/windows/WindowsTable.svelte` | **Haiku** |
| `src/routes/settings/+page.svelte`, `src/lib/components/settings/*.svelte` | **Luna** |
| tests for any TS helpers Luna adds | **Luna** |
| docs, contracts | Parent |

Route bodies are placeholders today; replace them. Use the existing
`garden`, `ui`, `commands`, selectors and constants. Add no new store fields.
Settings drafts (ZIP draft, key draft, new location/tag names) are
component-local `$state`, so the key draft never reaches a store.

## Shared contracts

- **Completing on Today:** `commands.completeEvent(id)` toggles the event and
  shows a toast with **Undo**. Completed items leave "Due now", as in the
  export. The checkbox is labelled `Mark <kind label> <seed title> done`.
- **Plan:** `commands.planSeed(seedId)` (Garden brush, navigate, toast).
- **Open a seed:** `commands.openSeed(seedId)`.
- **Clock:** Today's daylight "now" marker reads from these steps:
  - `let now = $state(new Date())`.
  - A synchronous `onMount` starts `setInterval(() => { now = new Date() },
    60_000)` and returns the cleanup.
  - The marker reads `const day = $derived(daylight(garden, now))`.

  Dates stay on the fixed sample TODAY.
- **Focus after completion:** a completed row leaves "Due now", which
  removes its focused checkbox. Focus moves to the next remaining checkbox,
  else the previous one, else the "Due now" heading (`tabindex="-1"`).
- **Grid tracks:** use `minmax(0,1fr)` (never bare `1fr`) plus `min-width:
  0` on truncating cells.
- **Touch targets:** under `(max-width: 899px), (pointer: coarse)`,
  checkboxes sit in a 44x44 labelled target and the first column widens to
  44px.
- **Group visibility:** Planting windows renders only groups with
  `count > 0`. Plan buttons appear in every group except `later`.

## Haiku — Today

Composition (export lines 76–119):
- Frost banners: one per `frostWarnings(garden)` row. `--warnSoft`
  background, `--warn` text, radius 8, padding 10px 14px, margin-bottom 14px,
  weight 500. A mono "FROST" badge with a 1px currentColor border, then
  "<bed>: <frost sentence>".
- A grid with `repeat(auto-fit, minmax(min(100%, 340px), 1fr))` and gap 14px
  holding five sections, each a panel (`--panel` background, 1px `--line`
  border, 10px radius):

1. **Due now.**
   - Header: "Due now" (700) plus the count (mono, muted).
   - Rows use a 22px / 1fr / auto grid: a checkbox (accent colour, labelled),
     then "<kindLabel> <seedTitle>" (EventRow fields; 500, truncated) over the bed (muted,
     12.5px), then the due label (mono 12px; `--warn` when overdue,
     `--v-plant_now` when today, otherwise muted).
   - Empty state: "Nothing due."
2. **Next 7 days** (`upcomingEvents(garden, 7)`):
   - Header with the count.
   - Rows use a 56px / minmax(0,1fr) / auto grid: `dateLabel` (mono),
     "<kindLabel> <seedTitle>", `bed` (muted).
   - Empty state: "Nothing planned this week."
3. **Daylight.**
   - Header: "Daylight" plus `dateParts().long` (mono).
   - The bar is 28px tall with `--panel2` and a 1px line. The day span is
     `--k-harvest` (left and width from `daylight()`). The now marker is a
     2px `--warn` line.
   - The bar has `role="img"` and the aria-label "Daylight 7:22 AM to 6:53 PM".
   - Hour labels: 12a 6a 12p 6p 12a (mono, 11px, faint).
   - Three stats: Sunrise, Sunset, Length (label 12px muted, value mono 15px).
   - Footer row: "First frost, Zone <zone>" and "<date> · <daysText>" in mono
     `--warn`.
4. **Plant now** (`whatToPlant(garden)[0].rows`):
   - Header plus an "All windows →" link (`<a href="/windows">`, accent).
   - Rows use an 8px / 1fr / auto / auto grid: verdict dot (visually hidden
     verdict text), title button (→ `openSeed`), days label (mono, muted),
     and a **Plan** button (→ `planSeed`).
5. **Latest note:** header plus the date (mono), then the body at 15px with
   `text-wrap: pretty`.

## Haiku — Planting windows

- A real `<table>` inside a panel with an `overflow:auto` wrapper. The
  table has `width:100%; min-width:760px; table-layout:fixed`; the wrapper
  has `max-width:100%`.
- A `<colgroup>` sets widths: Seed takes the remaining width, then Status
  100px, Window 150px, Timing 150px, Planned 150px, actions 90px.
- Six `<th scope="col">` headers.
- Header columns: Seed, Status, Window, Timing, Planned, plus an empty
  column for actions with a visually hidden "Actions" header.
- Each non-empty group is a `<tbody>` whose first row is a group header
  (`<th colspan="6" scope="rowgroup">`, `--panel2`): a 9px dot, the label
  (700) and the count (mono, faint).
  - Dots: now → `--v-plant_now`; soon → `--v-plant_soon`; late →
    `--v-late`; later → `--v-too_late`.
- Rows:
  - Seed: a title button → `openSeed` (500, truncated).
  - Status: `stateLabel` (muted).
  - Window: `windowLabel` (mono 12.5px).
  - Timing: `daysLabel` (mono 12px, coloured with the row's `dot`).
  - Planned: `plannedFor(garden, id)` (muted).
  - Plan button: right-aligned. In `later` rows the sixth `<td>` is
    present but empty.

## Luna — Settings

Grid: `repeat(auto-fit, minmax(min(100%, 360px), 1fr))`, gap 14px, aligned
to the start. Every section is a panel with 14px padding and a 700 heading.

1. **Home location.**
   - Copy: "Changes the displayed ZIP only. Planting windows, frost dates,
     and daylight use the sample location."
   - The ZIP input is labelled "Home ZIP", `inputmode="numeric"`, mono,
     maxlength 5. Save calls `garden.saveZip`.
     - Invalid input toasts "Enter a 5-digit ZIP."
     - Valid input toasts "ZIP updated. Windows, frost dates, and daylight
       still use the sample location."
   - Below: "<place> · Zone <zone>".
2. **AI provider.**
   - Copy: "Only a masked preview stays in this tab. The key itself is
     discarded after saving and never sent."
   - A segmented Anthropic/OpenAI control (`aria-pressed`) →
     `garden.setProvider`.
   - When `garden.key.saved`: the masked key (mono) and a Remove button →
     `removeKey`.
   - A password input labelled "API key" (`autocomplete="off"`,
     placeholder "Paste API key"), with **Save key**.
     - On success: clear the draft and toast "Saved a masked preview. The
       key itself was discarded."
     - Empty: toast "Paste a key first."
3. **Storage locations.**
   - Rows: name, count of seeds stored there (mono), and an × button
     labelled "Remove location <name>" → `removeLocation`.
   - The add input is labelled "New location"; Add → `addLocation`. A null
     result toasts "Enter a new, unique location name."
4. **Tags.**
   - Pills: name, count (mono) and × ("Remove tag <name>").
   - The add input is labelled "New tag"; Add → `addTag`, with the same
     null handling.
5. **Catalog corrections:** a muted caption "Sample history. New corrections
   stay in this browser." Then `garden.contributions` rows with the seed
   (600), a status pill, the change (mono, muted) and when (faint). Empty:
   "No corrections yet."
6. **What's new:** a muted caption "Sample release notes." Then the
   `CHANGELOG` entries, with each line's `k` in mono accent (68px) followed
   by its text.
7. **Account:**
   - A label/value grid: Email `SAMPLE_USER.email`, Household
     `SAMPLE_USER.household`, Server "Not connected (prototype)".
   - **Sign out** (`--warn` text) toasts "Sign-in isn't part of this
     prototype."

Forms submit on Enter: each add/save row is a `<form>` that calls
`preventDefault`.

## Acceptance

- The gates pass.
- At 1280×820, light and dark, Today, Planting windows and Settings match the
  export, apart from the deliberate copy changes.
- **Today:**
  - Due now shows Spinach (4 days late), Kale (Today) and Lettuce (Today).
  - Completing one removes it and shows Undo; Undo restores it.
  - Next 7 days shows Oct 10–14 items.
  - The frost banner names Herb spiral / Basil.
  - Plan → Garden with the brush set; the title → Seeds detail.
- **Windows:**
  - Four groups with counts (Plant now 4, Plant soon 2, Closing soon 3,
    Later and missed 11).
  - No Plan buttons in "Later and missed".
  - Planned shows "South raised bed, Oct 12" for Garlic.
- **Settings:**
  - ZIP validation and toasts work.
  - A key is never written to `localStorage`/`sessionStorage`.
  - Removing a location clears it in Seeds.
  - Removing a tag strips it from seeds.
  - Adding a duplicate is rejected.
- At 390×844 there is no page-level horizontal scroll (tables scroll inside
  their wrappers) and every target is at least 44px.
