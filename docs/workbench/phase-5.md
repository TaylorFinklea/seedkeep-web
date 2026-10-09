# Phase 5 — Overlays

Goal: the export's overlays work, using the Phase 1 `Dialog` primitive and
the overlay stack (`ui.open/close/isOpen`):
- ⌘K command palette (export lines 354–365; items at 466–472; logic in
  `seedkeep-data.js` `palette`)
- Add seed modal (333–352; `addFlow`)
- Sprout drawer (318–331; `sprout`, `reply`)
- Keyboard shortcuts dialog (367–374; list at 482)

The demo-honesty copy changes apply. All overlays are mounted in the root
layout outside `#app-root`, and `AVAILABLE_OVERLAYS` now includes every
overlay. The parent does both in the contract commit.

## File ownership

| File | Owner |
|---|---|
| `src/lib/state/addFlow.svelte.ts` (bodies), `src/lib/state/sprout.svelte.ts` (bodies), `src/lib/domain/sprout.ts` | **Luna** |
| `src/lib/components/overlays/CommandPalette.svelte`, plus a new `src/lib/state/palette.ts` (items and filtering) | **Luna** |
| tests (`addFlow`, `sprout`, `palette`) | **Luna** |
| `src/lib/components/overlays/AddSeedModal.svelte`, `SproutDrawer.svelte`, `ShortcutsDialog.svelte` | **Haiku** |
| `+layout.svelte` mounts, `ui.svelte.ts` `AVAILABLE_OVERLAYS`, contracts, docs | Parent |

Haiku renders the controllers' state and calls their methods. Haiku never
implements controller logic. Luna never edits Haiku's views.

## Contracts

- **Add seed.**
  - `addFlow` (`addFlow.svelte.ts`) exposes `form`, `extra`, `files`,
    `phase`, `over`, `banner`, `error`, `mode`, `fields` and `canSave`, plus
    the methods `reset`, `setMode`, `setField`, `onDragOver`, `onDragLeave`,
    `onDrop`, `pickFiles`, `useSample`, `startScan`, `save` and `close`.
  - The modal's `open` is `ui.isOpen('add')`.
  - The view tracks `const open = $derived(ui.isOpen('add'))` and the
    previous value:
    - On false → true it calls `untrack(() => addFlow.reset())`.
    - On true → false it calls `addFlow.dispose()`.
    - It also calls `addFlow.dispose()` in `onDestroy`.

    Escape and backdrop clicks close through `ui`, so `dispose` is the only
    cleanup that always runs.
- **Sprout.**
  - `sprout` (`sprout.svelte.ts`) exposes `draft`, `thinking`,
    `suggestions`, `send(q?)` and `cancel()`.
  - Messages come from `garden.thread`.
  - The drawer's `open` is `ui.isOpen('sprout')`; close it with
    `ui.close('sprout')`.
  - `send` is ignored while `thinking`.
  - The view disables Send and the suggestion buttons while `thinking`, and
    calls `sprout.cancel()` in `onDestroy`. `cancel` also clears `thinking`.
- **Palette.**
  - `palette.ts` exports `PaletteItem { id; label; group: 'Action' | 'Go to'
    | 'Bed' | 'Seed' | 'Help'; hint?; run(): void }`,
    `paletteItems(g): PaletteItem[]` and `filterItems(items, q)`.
  - `filterItems` returns at most 9 items, case-insensitive across label,
    hint and group.
  - The component keeps `q` and `index` local and resets them when it
    opens.
- **Shortcuts.** `ShortcutsDialog` renders a fixed list:
  - Command menu ⌘K
  - Add a seed N
  - Filter seeds /
  - Ask Sprout A
  - Go to Today G T
  - Go to Seeds G S
  - Go to Garden G B
  - Go to Planting windows G W
  - Go to Settings G P
  - Close / cancel Esc
  - This list ?

  Its `open` is `ui.isOpen('shortcuts')`.

## Luna

1. **`addFlow`:**
   - `mode` mirrors `ui.addMode`; `setMode` sets it.
   - `fields` follows the export's order and labels. Status options come
     from `STATES`; Stored in is "Not set" plus `garden.locations`.
   - **Photo:**
     - Accept up to 2 `image/*` files. Store object URLs, then set
       `phase='reading'`.
     - After ~1400ms, fill the form from `SAMPLE_EXTRACT` (catalog fields go
       into `extra`), set `mode='manual'` and set the banner to: "Sample
       extraction (demo). Your photo stayed in this browser and was not read.
       Check the details before you save."
     - `useSample` does the same with no files.
   - **Scan:** set `phase='scanning'`. After ~1600ms, fill from
     `SAMPLE_CATALOG_HIT` and set the banner to: "Simulated scan (demo):
     sample catalog match for barcode 0 71834 05213 9. Growing details are
     filled in." Never call `getUserMedia`.
   - **Timers:** every timer is tracked and cancelled by `reset`/`close`/a
     mode change. A generation token stops a stale timer from writing into a
     reopened flow. Object URLs are revoked on `reset`/`close`.
   - **Save:**
     - Name is required (`canSave`).
     - Year must be blank or a 4-digit year from 1900 to 2100.
     - Packets must be blank or an integer from 0 to 999.
     - On invalid input, set `error` and return null.
     - Otherwise: `garden.addSeed({...form, ...extra})`, close, toast "Added
       <title>.", then `commands.openSeed(id)`.
2. **`sprout` and `sampleReply`:** port `reply()` from `seedkeep-data.js`, but
   derive every claim from the current data.
   - The bed branch names the bed with the most empty squares, using
     `buildCells`, and its free-square count.
   - The default branch lists active `plant_now` seeds plus active `late`
     seeds ("closing soon"), with their days labels.
   - No hard-coded seed or bed names.
   - Tool captions read "sample · <caption>".
   - The suggestions are the export's three prompts.
   - Track the reply timer and cancel it in `cancel()`.
3. **CommandPalette:**
   - `<Dialog variant="palette" width="580px" label="Command menu">`.
   - The input has `role="combobox"`, `aria-expanded="true"`,
     `aria-controls` pointing at the listbox and `aria-activedescendant`, with
     placeholder "Type a command or search seeds…".
   - Results are a `role="listbox"` of `role="option"` rows with
     `aria-selected`. Columns follow the export: group (70px, faint), label,
     and hint (mono).
   - The input has an accessible label: `aria-label="Search commands and
     seeds"`.
   - Options are not in the Tab order (`tabindex="-1"`; clicking still
     works).
   - The index resets to 0 on every query change and is clamped to
     `[0, results.length-1]`. Omit `aria-activedescendant` when there are no
     results.
   - Enter, or clicking a row: close the palette, `await tick()`, then run
     the item. Items that navigate set focus at their destination (for
     example `focusSeedFilter`, or the opened seed's detail); otherwise
     focus returns to the trigger.
   - Escape is handled globally.
   - Empty state: "No matches."
   - Footer hints: ↑↓ move · ↵ run · esc close.
   - Items match the export:
     - Actions: Add a seed (N), Scan a barcode, Add from packet photo,
       Import CSV, Export library as CSV, Print inventory, Ask Sprout (A),
       Switch to dark/light mode
     - Help: Keyboard shortcuts (?)
     - Go to: the five routes, with chords
     - Beds: `w×l`. Running one sets `ui.garden.bedId = bed.id`, clears
       `selEv`, then goes to Garden.
     - Seeds: the state label; running one calls `commands.openSeed`
4. **Tests:**
   - `filterItems`: cap of 9, case-insensitive, matches the group.
   - `addFlow`:
     - photo and scan fill-ins, validated with fake timers
     - a stale timer after `close` writes nothing
     - URL revocation (stub `URL.revokeObjectURL`)
     - save validation
   - `sampleReply` for the frost, old-packets, bed and default branches.

## Haiku

1. **AddSeedModal:**
   - `<Dialog variant="modal" width="640px" labelledby=…>`.
   - Header: "Add a seed" (16px, 700) and a Close × button labelled "Close".
   - Mode switch: three buttons (Type it in / From a photo / Scan a barcode)
     with `aria-pressed`, in the export's segmented style.
   - **Photo mode:** a dropzone wired to `onDragOver/onDragLeave/onDrop`.
     Its background is `--sel` while `over`, otherwise `--panel2`.
     - Idle: the text "Drop packet photos here" and "JPG or PNG. Photos stay
       in this browser.", with the buttons **Choose files** (`pickFiles`) and
       **Use sample** (`useSample`).
     - While reading: a mono line "reading sample (demo)…".
   - **Scan mode:** a decorative camera-preview block (`aria-hidden`, export
     line 340), status text "simulating scan…" while scanning, otherwise
     "center the barcode in the frame". Below it, a **Simulate scan (demo)**
     button (`startScan`).
   - **Manual mode:**
     - When the banner is set: a banner (`--accentSoft`) with up to two
       38px thumbnails (`alt=""`) and the text, in a `role="status"`
       container.
     - A field grid using `repeat(auto-fit, minmax(min(100%,180px),1fr))`,
       with labelled inputs or selects bound through `setField`.
     - A Notes textarea.
     - The `error` text in `--warn` with `role="alert"`.
     - Cancel (`close`) and **Save seed** (disabled unless `canSave`; calls
       `save`).
2. **SproutDrawer:**
   - `<Dialog variant="drawer" width="380px" label="Sprout">`.
   - Header: "Sprout", then the subline "Sample replies · no AI provider is
     called". Close × calls `ui.close('sprout')`.
   - Messages area: a `role="log"` with `aria-live="polite"`.
     - Bot bubbles use `--panel2` with a 1px line. An optional caption chip
       (mono 11.5px, accent on `--accentSoft`) shows the tool text.
     - User bubbles are right-aligned on `--accent`.
     - While thinking: the mono line "running sample reply…".
   - Suggestion buttons call `sprout.send(text)`.
   - Footer: an input labelled "Ask about your garden" bound to
     `sprout.draft`, plus a Send button.
     - Enter sends unless `e.isComposing`.
     - Escape is left to the global handler: never handle it locally, and
       never stopPropagation it.
     - Send and the suggestions are disabled while `sprout.thinking`.
   - The log has `aria-label="Sprout conversation"`. Suggestion buttons sit
     outside the log.
3. **ShortcutsDialog:**
   - `<Dialog variant="modal" width="420px" label="Keyboard shortcuts">`.
   - A heading, then rows of label plus a `<kbd>` styled as the export's
     bordered mono chip.

## Acceptance

- The gates pass.
- ⌘K, N, A and `?`, plus their buttons, open the matching overlay. Escape
  closes only the top layer and focus returns to the trigger. With two
  layers open (for example Sprout plus the palette), Tab stays in the top
  layer.
- **Palette:**
  - Typing "gar" lists Garden and the Garlic seed.
  - ↑, ↓ and Enter run the item.
  - Running "Scan a barcode" opens Add in scan mode.
- **Add:**
  - Manual save adds the seed and opens its detail.
  - The photo and sample paths fill the form after the delay, with the demo
    banner.
  - Closing during "reading" leaves no late fill-in on reopen.
  - Scan never prompts for the camera.
- **Sprout:** suggestions reply after ~1s with "sample ·" captions. The page
  stays usable while the drawer is open (non-modal).
- **Shortcuts:** the list matches the export.
- At 390×844 every overlay fits the viewport, and the palette's input stays
  visible. Both themes.
