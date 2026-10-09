# Phase 2 — Seeds workbench

Goal: the Seeds route matches the export (lines 122–213): a toolbar, an
editable spreadsheet, a bulk bar, and a detail panel. It is a side column when
wide and a sheet when narrow. Also CSV in the header, the print-only
inventory, and `/` focusing the filter.

## File ownership

| File | Owner |
|---|---|
| `src/routes/seeds/+page.svelte` | **Luna** (composition) |
| `src/lib/components/seeds/SeedsToolbar.svelte`, `SeedsTable.svelte`, `BulkBar.svelte` (new) | **Luna** |
| `src/lib/components/PrintInventory.svelte` (new) | **Luna** |
| `src/lib/domain/derive.ts` (add `sortRows` and `typeOptions`; keep existing exports) | **Luna** |
| `src/lib/state/commands.ts` (`escape`, as below) | **Luna** |
| `src/lib/components/Dialog.svelte` (implement the new `returnFocus` prop) | **Luna** |
| tests for the above | **Luna** |
| `src/lib/components/seeds/SeedDetail.svelte`, `CorrectionForm.svelte` (new) | **Haiku** |
| `src/routes/+layout.svelte` (mounts `<PrintInventory />`), `ui.svelte.ts` `AVAILABLE_OVERLAYS` (adds `detail`), docs | Parent |

Everything else is read-only for both workers. Contract stubs for
`SeedDetail.svelte`, `CorrectionForm.svelte` and `PrintInventory.svelte`
already exist with their final props; replace their bodies.

## Contracts

- `SeedDetail.svelte` props: `{ seedId: string; onclose: () => void }`. It
  reads `garden` and the selectors itself and edits through `garden`
  actions. It renders a content panel only; the container (aside or sheet)
  belongs to the page.
- `CorrectionForm.svelte` props: `{ seedId: string }`.
  - Local draft state: open, field (default `CORR_FIELDS[0]`) and value.
  - Send is disabled until the trimmed value is non-empty. It calls
    `garden.addContribution(seedId, field, value)`, then
    `ui.showToast('Saved your correction locally (demo).')`, then resets.
  - The toggle button has `aria-expanded`.
- Escape inside a field that consumes it (an inline cell revert) must call
  `e.stopPropagation()` so the global handler does not also close layers.
  The global handler listens on `window` in the bubble phase.
- Detail container (Luna, in the page):
  - When `ui.wide`: a sticky 360px `<aside aria-label="Seed details">` next
    to the table (export line 500).
  - When narrow: `<Dialog variant="sheet" open={ui.isOpen('detail')}
    label="Seed details" onclose={...}>`.
  - Opening a row calls `ui.seeds.seedId = id`, plus `ui.open('detail')` when
    narrow.
  - Closing clears `seedId` and closes `detail`.
  - Crossing the 900px boundary while open keeps the seed shown in the right
    container. Track the previous `ui.wide`:
    - Wide → narrow with a `seedId`: `ui.open('detail')`.
    - Narrow → wide: `ui.close('detail')` and keep `seedId`.
  - At narrow widths, once the `detail` overlay is closed, `seedId` must also
    be cleared, whether by Escape, the backdrop or the close button.
    `commands.escape` handles this: when `ui.top === 'detail'`, it clears
    `ui.seeds.seedId` before `closeTop()`.
  - Wide aside: `flex: 0 0 360px`, `position: sticky`, `top: 12px`,
    `align-self: flex-start`. The inner panel has `max-height: calc(100vh -
    110px)` and scrolls (export lines 173–174).
- **Scroll ownership.** Luna's wide aside wrapper is the only scroller at
  wide widths; the Dialog sheet panel is the only scroller at narrow widths.
  Haiku's `SeedDetail` root sets no overflow or height. Its header is
  `position: sticky; top: 0` with the panel background, so it sticks inside
  whichever container scrolls.
- **Route teardown.** When the Seeds page unmounts, it calls
  `ui.close('detail')` and keeps `seedId`. On mount, if `!ui.wide &&
  ui.seeds.seedId`, it calls `ui.open('detail')`. Only deliberate dismissal
  (close button, Escape, backdrop) clears `seedId`.
- **Focus targets (page-owned).** Row open buttons carry
  `data-open-seed="<id>"`.
  - When the detail closes, focus returns to that row's open button. If the
    row isn't rendered, focus goes to `#seed-filter`. Use the Dialog's
    `returnFocus` for the sheet; for the aside, the page focuses after
    `tick()`.
  - On a breakpoint switch while focus is inside the detail, focus moves to
    the detail's close button in the new container after `tick()`. The
    button carries `data-detail-close`; Haiku adds it.
- **Correction drafts are per seed.** `SeedDetail` renders `{#key seedId}<CorrectionForm
  {seedId} />{/key}`, so a draft never carries from one seed to another.
  Breakpoint remounts may discard an unsent draft; that is acceptable.
- Print: `PrintInventory.svelte` renders a print-only table of every seed
  (Name, Variety, Type, Company, Year, Pkts, Status, Stored in, Window),
  grouped or sorted by state then name. Its own `@media print` `:global`
  rules hide `#app-root`, overlays and the toast. On screen it is
  `display:none`.

## Luna

1. **Toolbar.** State tabs are All (total) plus the four states with counts.
   Buttons use `aria-pressed`; changing a tab clears the selection.
   - Filter: `<input id="seed-filter" type="search" aria-label="Filter seeds"
     placeholder="Filter seeds   /">`, updating `ui.seeds.q` live (`oninput`).
   - Type select: "All types" plus the sorted distinct types, labelled.
   - Row count in mono: "16 rows".
2. **Table.** Follow export lines 144–169.
   - Grid columns: 36px, minmax(150px,1.3fr), minmax(140px,1.2fr), 108px,
     minmax(150px,1.2fr), 64px, 56px, 108px, 150px, 176px, 34px. Minimum
     width 1060px.
   - Scrolling: at ≥900px the table wrapper is a bounded viewport
     (`overflow:auto; max-height: calc(100vh - 190px)`) so the sticky header
     stays visible while scrolling in either direction. Below 900px the
     wrapper only scrolls horizontally, and the header need not stick.
   - Use `role="table"`/`row`/`columnheader`/`cell` (or a real `<table>` with
     CSS grid rows).
   - Header buttons sort (toggle direction on the same key) and set
     `aria-sort` on the columnheader.
   - The sort comparator `sortRows(g, rows, sort)` goes in `derive.ts`.
     Verdict sorts by `VERDICT.order`; missing values sort last; text
     comparison is locale-aware and case-insensitive.
   - Inline cells (name, variety, type, company, year, packets) are inputs.
     - Each has an `aria-label` like "Name for Garlic — Music".
     - Commit on `change` (blur or Enter). Enter also blurs.
     - Escape restores the stored value and blurs, with `stopPropagation`.
     - Year must be blank (→ null) or a 4-digit year from 1900 to 2100.
       Packets must be an integer from 0 to 999. Invalid input restores the
       stored value and toasts "Year must be a 4-digit year." or "Packets must
       be a whole number from 0 to 999."
   - Status and Stored-in selects commit on `change` and are labelled.
   - The Window cell shows a dot, `verdictShort` (coloured) and `daysLabel`
     (mono, muted).
   - The year text uses `--warn` when `old`.
   - Row checkbox ("Select <title>") and header checkbox ("Select all shown
     rows"). Header state is checked when every shown row is selected, and
     `indeterminate` when some are.
   - The open button `›` has `aria-label="Open <title>"`.
   - Selected rows and the open seed use the `--sel` background.
   - Empty state: "No seeds match these filters."
   - Footer hint: "Click any cell to edit. Changes save when you press Enter
     or leave the cell. Years in orange are three or more seasons old; test
     germination first."
3. **Bulk bar.** Follow export lines 133–143, including the inverted colours.
   - Set-status buttons; then toast "Moved N seeds to <State>." and clear the
     selection.
   - "Move to…" select; then toast "Updated N seeds.", then reset the select.
   - "Add tag…" select; then toast "Tagged N seeds.", then reset the select.
   - Delete calls `commands.deleteSeeds`, then toasts "Deleted N seeds."
   - Clear.
   - Every select is labelled. Visible text "N selected".
   - A persistently mounted visually hidden `role="status" aria-live="polite"`
     region on the page announces "N selected" when the count changes and
     "Selection cleared" when it returns to 0.
4. **CSV.** The header Import and Export buttons already call `commands`.
   Verify that they and the sidebar Tools work, and that the import toast
   lists the ignored columns.
5. **`/` shortcut.** `commands.focusSeedFilter` must focus `#seed-filter`
   after navigation from any route.
6. **Tests.** Cover `sortRows` (every key, both directions, nulls last,
   verdict order), `typeOptions`, and inline-edit validation helpers if you
   extract them to TS.

## Haiku

Follow export lines 172–211 for the detail panel content.

- **Header.** Sticky, inside the panel.
  - Small muted line: "<type> · <state label>".
  - Title: 18px, 700.
  - Provenance: muted.
  - Close button: `×`, `aria-label="Close seed details"`, calls `onclose`.
- **Verdict card** (bordered, 8px radius):
  - The verdict label, coloured by `dot`, with a 9px dot.
  - `daysLabel` in mono.
  - `windowLabel` in mono, 13px.
  - "ZIP <zip> · Zone <zone>".
  - Uncatalogued seeds show "Not in the catalog" in `--muted` with no dot.
- **Tags.** One pill per store tag. Each is a toggle button (`aria-pressed`)
  that adds or removes the tag through `garden.updateSeed`.
- **Growing details.** `infoRows` as label/value rows (value in mono,
  right-aligned), then the instructions paragraph. Without info: "Not in the
  shared catalog yet."
- **Notes.** A labelled textarea that updates `garden.updateSeed(id, { notes })`
  on input.
- **Plantings.** The seed's events as rows: date (mono), "<kind> · <bed>",
  and the due label. Empty: "Not planned in a bed."
- **Correction.** `<CorrectionForm seedId>`.
- If `seedId` no longer exists, render nothing.

## Acceptance

Additional checks (parent), at 900/899px and 390×844, in both themes:
- Submitting a correction adds a "Saved locally (demo)" row; switching
  seeds mid-draft discards the draft.
- Detail updates reactively when a table cell or bulk action changes the
  seed.
- The breakpoint focus handoff works.
- Navigating to another route with the detail open, then coming back,
  restores it with no stuck overlay (G-chords still work while away).
- Escape in a table cell reverts only the cell. Escape in the sheet's
  notes/correction field closes the sheet.
- Print while the sheet is open still prints the inventory.
- The print output excludes `.skip-link`; PrintInventory's print rules hide
  it.


- The gates pass.
- At 1280×820 Seeds matches the export: tabs and counts, table, colours,
  old years and verdict cells, in light and dark.
- Inline edits persist across navigation. Sorting a column doesn't move the
  row being edited until you commit. Invalid year or packets restore and toast.
- Selection and bulk actions work. Deleting the open seed closes its detail.
- Wide: the detail is a side column. 899px and below: a sheet that traps
  focus, closes with Escape and returns focus to the row's open button.
- The `/` shortcut works from any route. The Print preview shows only the
  inventory table, from any route.
