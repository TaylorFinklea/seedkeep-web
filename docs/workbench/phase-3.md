# Phase 3 — Garden painter

Goal: the Garden route matches the export (template lines 215–263, logic in
`renderVals` lines 441–459 and 504–511). It covers:
- bed tabs and the inline new-bed form
- the "Paint with a seed" brush list
- the square-foot grid with paint and select semantics
- square details
- the bed events table

## File ownership

| File | Owner |
|---|---|
| `src/lib/domain/garden.ts` (implement the stubs) and `garden.test.ts` | **Luna** |
| `src/routes/garden/+page.svelte` (composition) | **Luna** |
| `src/lib/components/garden/BedGrid.svelte`, `SquareDetails.svelte`, `BedEvents.svelte` | **Luna** |
| `src/lib/components/garden/BedTabs.svelte`, `NewBedForm.svelte`, `BrushList.svelte`, `Legend.svelte` | **Haiku** |
| contract stubs, `docs/**` | Parent |

Stubs for every component already exist with their final props (none: each
reads `garden` and `ui` directly unless noted). Replace their bodies only.

**Composition and roots** (export lines 216–262):
- **The page (Luna)** owns two outer rows:
  - a toolbar row: `<BedTabs />` then `<NewBedForm />`, as a flex row with
    gap 10px, wrapping, margin-bottom 14px
  - a flex row with gap 14px, wrapping, aligned to the start:
    `<BrushList />`, `<BedGrid />` and `<SquareDetails />`

  Then `<BedEvents />` below.
- **Each component owns its own `<section>` root** and flex sizing, with the
  panel chrome (background `--panel`, 1px `--line` border, 10px radius):
  - BrushList: `flex: 1 1 210px; max-width: 100%`
  - BedGrid: `flex: 3 1 420px; min-width: 0`
  - SquareDetails: `flex: 1 1 240px; max-width: 100%`
  - BedEvents: margin-top 14px
- **BedGrid** renders the header row (bed name, description, brush hint), the
  grid, and then `<Legend />` below it.
- **NewBedForm** owns its toggle button and the inline form.
- Haiku's components never import Luna's, and vice versa, except BedGrid
  importing Legend.

## Contracts

`src/lib/domain/garden.ts` (pure, tested):
- `cellIndex(bed, e)`: `{ row: clamp(floor(e.x), 0, w-1), col: clamp(floor(e.y), 0, l-1) }`.
- `buildCells(g, bed, selEv)`: returns `GardenCell[]` in row-major order,
  `w` rows by `l` columns. A cell holds every event of that bed mapped to it.
  - Shown event: the first unfinished event, otherwise the first event.
  - `count`: the number of events in the cell.
  - `abbr`: `abbr(seed)`, plus `+` when `count > 1`; `''` when empty.
  - `sub`: `'done'` for a done event, otherwise `fmt(date)`; `''` when empty.
  - `kind` (or null) and `done`.
  - `selected`: the shown event's id equals `selEv`.
  - `frost`: the shown event's `eventRow(...).hasFrost`.
  - `label` (accessible name): "Row 1, square 2: Garlic — Music, Sow Oct 12"
    (add ", done" when done, ", frost risk" when frost, ", 2 plantings" when
    `count > 1`). Empty cells read "Row 1, square 2, empty".
- `planDate(seed)`: `window[0]` when the seed has a window, `diff(window[0]) > 0`
  and the verdict isn't `too_late`; otherwise `TODAY`.
- `brushRows(g)`: active seeds as `SeedRow`s sorted by `VERDICT.order`
  (missing verdict last), keeping store order within a verdict.

## Interaction semantics (Luna, BedGrid)

| Brush | Cell | Click result |
|---|---|---|
| none | occupied | `selEv` = the shown event |
| none | empty | `selEv` = null |
| set | empty | `const event = garden.addEvent({ bed: bed.id, seed: ui.garden.brush, kind: 'sowing', date: planDate(seed), x: row + 0.5, y: col + 0.5 })`; `ui.garden.selEv = event.id`; the brush is **kept** (painting continues) |
| set | occupied | `selEv` = the shown event; brush cleared |

**Brush hint** in the grid header: "Painting <title> · Esc to stop" (accent),
or "Select a seed to start painting" (muted).

**Visuals:**
- Cell backgrounds:
  - empty: `var(--panel2)`
  - done: `var(--k-note)`
  - otherwise: `var(--k-<kind>)`
- Ring: `inset 0 0 0 2px` in `var(--accent)` when selected, `var(--warn)`
  when frost, otherwise transparent.
- The grid uses `repeat(l, minmax(0,1fr))`, gap 3px, on a `var(--line)`
  background with a 3px border. Cells are square (`aspect-ratio: 1`).
- Abbreviation: mono, 12px, weight 500. The date is 10px muted.
- Below 900px or on coarse pointers, cells are at least 44px and the grid
  wrapper scrolls horizontally.
- Each cell is `<button type="button" aria-label={cell.label}
  aria-pressed={cell.selected}>`, with `{#each}` keyed by
  `` `${cell.row}-${cell.col}` `` (never by event id).
- Cells are reachable with Tab in row-major order, activate with Enter and
  Space (native button), and show the global focus ring. The `title`
  attribute may repeat the label.

**Square details** (the selected event, in the current bed only):
- Seed title.
- "Row r, square c · spacing N in" (or "—" when the spacing is unknown).
- Task select (labelled) → `garden.updateEvent(id, { kind })`.
- Date input (`type=date`, labelled) → `updateEvent(id, { date })` only when
  `isYMD`.
- Done checkbox (labelled) → `garden.toggleDone`.
- Frost note in `warnSoft`.
- "Clear square" → `commands.removeEvent(id)`.
- With nothing selected: "Pick a seed on the left, then click empty squares
  to plan it. Click a planted square to edit it."

**Bed events table:**
- The bed's events, sorted by date.
- Columns: checkbox ("Mark <title> done") → `garden.toggleDone`; Date
  (mono); Task; Seed (struck through when done); Square ("R1 · S2", mono);
  Status (mono) — `done`, or the lower-cased due label, coloured warn when
  overdue and `--v-plant_now` today.
- The row tint is `warnSoft` when the event has frost.
- The outer viewport is `min-width: 0; max-width: 100%; overflow-x: auto`.
  The inner table has `min-width: 620px` (export line 258).

## Haiku

- **BedTabs.** A segmented control of beds, each showing its name and
  `w×l` in mono.
  - Buttons use `aria-pressed`.
  - Selecting sets `ui.garden.bedId` and clears `ui.garden.selEv`.
  - The segment scrolls horizontally at narrow widths.
- **NewBedForm.** A "+ New bed" toggle (dashed border, `aria-expanded`)
  opens an inline form.
  - Fields: Bed name (optional, defaults to "New bed"), W ft and L ft, all
    labelled.
  - W and L must be whole numbers from 1 to 20. Show an inline error that
    the inputs reference via `aria-describedby`.
  - Add calls `garden.addBed`, sets `ui.garden.bedId`, toasts "Added <name>.",
    then closes and resets. Cancel closes.
  - Defaults are W 4, L 8, as in the export.
- **BrushList.** A section headed "Paint with a seed" listing
  `brushRows(garden)`.
  - Each row is a toggle button (`aria-pressed`) with the abbreviation chip
    (mono 11px on `--k-sowing`), the title (truncated) and the verdict dot
    with visually hidden verdict text.
  - Selected rows use `--sel` and weight 600.
  - Picking toggles `ui.garden.brush` and clears `selEv`.
  - The list scrolls with `max-height: 520px`.
- **Legend.** Sow, Transplant and Harvest swatches (`--k-*`) plus "1 square
  = 1 sq ft" in mono.

## Acceptance

- The gates pass, with `garden.ts` unit tests. Use a non-square bed fixture
  (for example w 2, l 5):
  - `x` maps to rows and `y` to columns; out-of-range values clamp to the
    last row and column.
  - Multi-event cells: the first unfinished event in store order is shown,
    with `+`. When every event is done, the first event is shown as done.
    Completing or removing the shown event reveals the next one.
  - Frost, selected and labels (including the ", 2 plantings" and empty
    forms).
  - `planDate` for a future window start, a window starting today, a past
    window, a missing window, and a `too_late` seed whose window start is in
    the future (→ TODAY).
  - `brushRows` ordering and active-only membership.
- At 1280×820 Garden matches the export in light and dark: the South raised
  bed shows Gam (Oct 12), Onw (Oct 20), Kal (Oct 9) and Spb (Oct 5) where the
  export shows them.
- Reactivity: renaming a seed or changing its state on Seeds updates the
  brush list (title, membership). Completing an event in the bed table
  updates the grid cell.
- `commands.planSeed(id)`, called from the console, lands on Garden with the
  brush set. The Today and Windows Plan buttons are tested in Phase 4.
- Keyboard-only: Tab to a seed in the brush list, press Enter, Tab to an
  empty cell, press Enter. A planting appears and is announced by its new
  label.
- Painting:
  - Painting several empty squares keeps the brush.
  - Clicking a planted square with a brush selects it and stops painting.
  - Escape stops painting, then clears the selection.
- Square details edits update the grid and the table live. Clear square
  removes one event.
- A new bed with invalid dimensions shows the error; a valid one becomes the
  current bed.
- At 390×844 the cells are at least 44px, the grid scrolls horizontally, and
  there is no page-level horizontal scroll.
