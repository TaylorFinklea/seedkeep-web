# Workbench design QA — 2026-10-09

The prototype was compared against the Claude Design export
`Seedkeep Web B - Workbench.dc.html`. The export was rendered locally from
`~/git/seedkeep/scratch/design-export/`; the prototype ran under `vite dev`.
Both ran in the Claude desktop browser pane with the viewport emulated. This
records what was checked and what still needs to be checked; it is not a
release sign-off.

## Viewports and themes

| Check | Result |
|---|---|
| 1280×820, light: Today, Seeds (table and detail), Garden, Planting windows, Settings | Matches the export's layout, type, spacing and colours, except the deliberate deviations below |
| 1280×820, dark: shell, Seeds, Garden, Add seed, Sprout | Matches the export's dark token values; the first visit follows the OS setting |
| 900 / 899px | Sidebar at 900px; narrow header with a scrolling nav at 899px; the "Sample data" marker shows in both |
| 390×844 and 360×740, every route | No page-level horizontal scroll. Every button, link, select and text input is ≥44px tall; checkboxes sit in 44px-tall labels; garden cells are 44×44 |
| 640×410 (a 1280×820 window at 200% zoom), every route | No horizontal overflow; the page header and Add seed stay reachable |
| Overlays at 390×844 (palette, Add, Shortcuts, Sprout) | All fit in the viewport |

## Interactions verified in the browser

- **Shell:**
  - `G` chords; ⌘K, N, A and `?`; Escape closes only the topmost layer.
  - The theme toggle persists across reloads.
  - Direct refresh on deep routes works.
- **Seeds:**
  - Inline edit commits on Enter or blur, and Escape reverts.
  - Invalid year or packets restores the stored value and toasts.
  - After a Tab commit re-sorts the table, focus stays on the next cell.
  - Sorting sets `aria-sort`. Selection uses a live region and an
    indeterminate select-all.
  - Bulk status shows a toast.
  - The detail panel is an aside when wide and a modal sheet when narrow.
    Breakpoint handoff and focus return to the row's opener both work.
- **Garden:**
  - Painting keeps the brush. Clicking a planted square selects it and stops
    painting. Escape stops painting, then deselects.
  - The grid fills its panel up to 72px cells.
  - Brushes are active seeds only.
- **Today:** completing a task shows Undo; Undo restores it; focus moves to
  the next checkbox. The frost banner, Next 7 days and Plant now all work.
- **Planting windows:** the groups and counts are 4, 2, 3 and 11. "Later and
  missed" has no Plan buttons, and only active seeds show Plan.
- **Settings:**
  - ZIP validation works.
  - The API key keeps only a masked preview. The raw value is absent from the
    DOM, localStorage and sessionStorage.
  - Long names wrap without overflow.
- **Overlays:**
  - Palette: combobox and listbox semantics; Enter focuses the destination.
  - Add seed:
    - Manual save opens the new seed's detail.
    - The simulated photo fill moves focus to Name and announces the
      sample-extraction banner.
    - The banner survives mode switches while sample data is present.
    - Closing mid-read leaves no late fill-in.
  - Sprout is non-modal, its replies come from live data, and typing in its
    input triggers no shortcuts.
  - With stacked layers (palette over Sprout), Escape closes one layer at a
    time.

## Deliberate deviations from the export

- **Demo-honesty copy:**
  - "Sample data" marker.
  - Display-only ZIP.
  - Masked-preview-only key.
  - "Sample replies · no AI provider is called".
  - "Sample extraction (demo)" and "Simulated scan (demo)"; no camera
    request.
  - Corrections and What's new are captioned as sample content.
  - Account server "Not connected (prototype)".
  - Sign out explains that sign-in isn't part of the prototype.
- **Behaviour fixes:**
  - Cells commit on Enter or blur (the export claimed "as you type").
  - Validated numbers.
  - Escape closes one layer at a time.
  - Palette index is clamped.
  - Removing a location or tag clears it from seeds.
  - CSV import keeps 0 packets and lists the columns it ignored; CSV export
    neutralises formulas.
  - New-bed dimensions are limited to 1–20 ft.
  - Print inventory works from any route.
  - Plan is offered only for active seeds.
- **Small layout differences:**
  - Add seed is vertically centred (the export sits 7vh from the top).
  - Sprout suggestions sit above the input, outside the conversation log.
  - The "All windows →" link is underlined.
  - Bed tabs and the nav scroller hide their scrollbars.

## Not verified

- Real devices: iOS Safari and Android Chrome. Touch was emulated by viewport
  only.
- A screen-reader pass with VoiceOver or NVDA. Names, roles and live regions
  were checked in the DOM only.
- Printed output. The print stylesheet was inspected, but no print preview
  was generated.
- Browser zoom itself. It was approximated by the 640×410 viewport.
- PWA install, offline behaviour, and any real data, auth or sync. These are
  out of scope.
