# Phase 1 — Foundation

Goal: a working Workbench shell (sidebar, narrow header, page header, toast,
light/dark) on top of real domain logic, store actions, keyboard shortcuts and
an accessible Dialog primitive. Route bodies stay placeholders.

## File ownership

| File | Owner | Notes |
|---|---|---|
| `src/lib/domain/types.ts`, `constants.ts`, `sample.ts`, `src/lib/nav.ts`, `src/routes/+layout.ts`, route `+page.svelte` placeholders, `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `docs/**` | Parent | Contract; do not edit |
| `src/lib/domain/dates.ts`, `derive.ts`, `csv.ts` | **Luna** | Implement the stubs; keep exported signatures |
| `src/lib/state/garden.svelte.ts`, `ui.svelte.ts`, `commands.ts` | **Luna** | Implement bodies; keep fields and signatures |
| `src/lib/keys.ts` | **Luna** | |
| `src/lib/components/Dialog.svelte` | **Luna** | Keep props |
| `src/**/*.test.ts` (new) | **Luna** | |
| `src/app.css`, `src/app.html` | **Haiku** | |
| `src/routes/+layout.svelte` | **Haiku** | |
| `src/lib/components/shell/*.svelte` (new), `src/lib/components/Toast.svelte` (new) | **Haiku** | |

## Luna — logic, store, keyboard, Dialog, tests

1. Port the behaviour of `seedkeep-data.js` into `dates.ts`, `derive.ts` and
   `csv.ts`, following each stub's doc comment. Notes:
   - `seedRow.dot` is `var(--v-<verdict>)`, or `transparent` when there is no
     verdict.
   - `seedRow.old` uses `isOld`.
   - `whatToPlant` returns all four groups in order, each with `count`. Rows
     inside a group sort by `windowLabel`, as in the export.
   - `daylight` returns percentage strings for `left`, `width` and `now`
     (`riseMin/1440`, `(setMin-riseMin)/1440`, current minutes `/1440`).
   - `plannedFor` returns `"<bed name>, <fmt(date)>"` for the first
     unfinished event of the seed, or `—`.
2. Implement every action in `garden.svelte.ts` as documented, mutating
   `$state` arrays and objects so the changes are reactive (reassigning with
   `map`/`filter` is fine). Cascades:
   - `removeSeeds` also removes their events.
   - `removeLocation` clears `loc` on the affected seeds.
   - `removeTag` strips the tag from every seed.

   Coercion (`addSeed`, `importCSV`):
   - A blank name becomes `Untitled seed`; a blank type becomes `Untyped`.
   - `packets` is a non-negative integer. Blank becomes 1, or 0 for wishlist.
     Invalid input falls back to the same default.
   - `year` is a 4-digit integer or null.
   - `catalog` is `!!verdict`.
3. `ui.svelte.ts`:
   - `open` respects `AVAILABLE_OVERLAYS`: an overlay whose UI has not shipped
     only shows the "arrives in a later build phase" toast. This stops
     invisible modal entries from suspending shortcuts.
   - Overlay stack: `open` moves an overlay to the top without duplicates.
     `close` and `toggle` behave as named. `closeTop` returns whether
     something closed.
   - Toast: replace any current toast, increment `id`, auto-dismiss (2800ms,
     or 6000ms with an action), and clear the pending timer whenever the toast
     is replaced or dismissed.
   - Theme: `initTheme`/`toggleTheme` set `document.documentElement.dataset.theme`
     and `style.colorScheme`. They persist `seedkeep-theme` in `localStorage`
     inside try/catch, and fall back to `matchMedia('(prefers-color-scheme: dark)')`.
4. `commands.ts`: implement every command as documented.
   - Navigate with `goto(hrefFor(key))` from `$app/navigation`, then `await
     tick()`.
   - `escape` order: if `ui.closeTop()` closed something, stop. Otherwise, on
     the `seeds` route clear `ui.seeds.seedId`. Otherwise, on `garden`, clear
     `ui.garden.brush` if it is set, else `selEv`. Use `routeKey(page.url.pathname)`
     with `page` from `$app/state`.
   - `togglePalette`: close the palette if it is open; ignore it while another
     modal is open; otherwise open it.
   - `openAdd(mode)` sets `ui.addMode`, then opens `add`.
   - `focusSeedFilter`: go to seeds, then focus `#seed-filter` if it exists.
   - `importCSV`: create a hidden `<input type=file accept=".csv,text/csv">`
     and call `garden.importCSV` on the chosen file's text.
     - With rows: toast `Imported N seeds.`, adding ` Not imported: <cols>.`
       when columns were ignored.
     - With none: toast `No rows found in that file.`
   - `exportCSV`: Blob download of `seedkeep-library.csv`; revoke the object
     URL afterwards. Toast `Exported N seeds as CSV.`
   - `printInventory`: `window.print()` for now.
   - `deleteSeeds` and `removeEvent` clear stale UI references as documented.
   - `openSeed(id)`: set `ui.seeds.state` to that seed's state unless it is
     `all`, set `seedId`, go to seeds, and open the `detail` overlay when
     `!ui.wide`.
   - `completeEvent(id)`: toggle the event. When it is now done, toast
     `Marked <kind> <seed title> done.` with an **Undo** action that toggles
     it back.
   - `planSeed(id)`: set `brush`, clear `selEv`, go to garden, toast
     `Click empty squares to plan <title>.`
5. `keys.ts`: implement per the doc comment. Escape and ⌘K/Ctrl+K are handled
   even while typing; `e.preventDefault()` for handled keys. While
   `isModalOpen()`, only Escape and ⌘K pass. The `G` chord expires after 900ms;
   keys are case-insensitive except `?`.
6. `Dialog.svelte`: implement the behaviour in its header comment, including
   portal to `document.body`, focus management, the focus trap, `inert` on
   `#app-root`, backdrop click and variant styles. Panels fit within
   `100dvh`/`100vw` with internal scroll.
7. Vitest. Use `*.test.ts` for plain modules and `*.svelte.test.ts` for
   anything importing runes modules. Cover:
   - dates: diff, fmt, dueLabel, plural, dateParts (`Friday, October 9`),
     isYMD
   - derive:
     - `seedRow` for s1 and s19 (no verdict)
     - `windowDays` for every verdict
     - `isOld`; `abbr` (Garlic/Music → `Gam`)
     - `infoRows` ranges and null filtering
     - `dueEvents`/`upcomingEvents` against the sample
     - `frostWarnings`: Basil harvest Oct 24 warns; Pepper harvest Oct 11
       does not
     - `whatToPlant` excludes archived and includes wishlist/saved
     - `daylight` with a fixed Date; `frost` (12 days); `plannedFor`
   - csv:
     - export→parse round trip with commas, quotes and newlines; CRLF; blank
       rows
     - `rowsToSeedInputs`: status label/key mapping, packets 0 stays 0,
       wishlist blank → 0, invalid year → null, ignored columns
   - garden store: each action and cascade, plus `saveZip`/`saveKey`
     validation (use `new Garden()` per test)
   - ui store: overlay stack, `modalOpen`, toast replacement and timers (fake
     timers)
   - keys: chords, typing guard, the modal guard, ⌘K while typing, repeat and
     composition ignored (dispatch `KeyboardEvent`-like objects on a test
     `EventTarget`)

## Haiku — shell, tokens, toast

Follow the export's template lines 14–70 (shell) and 376–378 (toast) exactly,
using tokens.

1. `app.css`:
   - The 44px minimum applies to `button`, `select`, `input` and interactive
     `a` under both `(max-width: 899px)` and `(pointer: coarse)`.
   - Light tokens on `:root` (from export line 16) and dark tokens on
     `:root[data-theme="dark"]` (the `DARK` object, export line 405), each
     setting `color-scheme`. Also `--sans`/`--mono`.
   - Base: `box-sizing`, `body{margin:0; background:var(--bg); color:var(--ink);
     font:14px/1.45 var(--sans)}`; links use the accent.
   - `input,select,textarea,button{font:inherit;color:inherit}`.
   - `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`.
   - `.sr-only`; a skip link; 44px minimum controls under `(max-width: 899px),
     (pointer: coarse)`.
   - `.placeholder{color:var(--muted)}`.
2. `+layout.svelte`:
   - Import `../app.css` and the fontsource CSS: Public Sans 400/500/600/700
     plus 400 italic; JetBrains Mono 400/500.
   - `<svelte:head><title>{title} · Seedkeep</title>`.
   - Skip link to `#main`.
   - Inside `<div id="app-root">`: the sidebar (only when `ui.wide`), the
     column with NarrowHeader (only when `!ui.wide`), PageHeader, and
     `<main id="main">` with `padding:18px 22px 80px`.
   - Outside `#app-root`: `<Toast />`.
   - `onMount`: call `ui.initTheme()`, then return `bindShortcuts({...})`,
     wired to `commands` as follows (`isModalOpen: () => ui.modalOpen`):

     | Handler | Calls |
     |---|---|
     | `palette` | `togglePalette` |
     | `escape` | `escape` |
     | `add` | `openAdd()` |
     | `filter` | `focusSeedFilter()` |
     | `shortcuts` | `openShortcuts` |
     | `sprout` | `toggleSprout` |
     | `go` | `go` |
   - Route key and metadata must be reactive:
     `const key = $derived(routeKey(page.url.pathname))` (`page` from
     `$app/state`) and `const meta = $derived(pageMeta(key, garden))`. Render
     from `meta`; never copy them into plain `const` values.
3. `shell/Sidebar.svelte`:
   - Brand row: logo `/logo-mark.png` (alt ""), "Seedkeep", ZIP from
     `garden.home.zip`.
   - The ⌘K button calls `commands.togglePalette`.
   - Nav renders `NAV` as `<a href>` links styled like the export's buttons,
     with `aria-current="page"` on the active one. Counts come from
     `navCount(key, garden)` inside `$derived`; chord hints go in `--mono`.
   - Tools: Import CSV, Export CSV, Print inventory, and Keyboard shortcuts
     (`?`), calling the matching commands.
   - Footer: Ask Sprout (A hint, `commands.toggleSprout`). Then a row with
     `SAMPLE_USER.name`, a theme toggle and a small "Sample data" marker (muted
     mono 11px pill).
   - The theme toggle's visible text is "Dark" in light mode and "Light" in
     dark mode, with `aria-label="Switch to dark/light mode"`.
4. `shell/NarrowHeader.svelte`: the sticky top bar. It shows the logo,
   "Seedkeep", the same "Sample data" marker, and Search (palette), Sprout and
   theme buttons, then a horizontally scrolling nav of `<a>` pills
   (`aria-current`). Pills and buttons meet the 44px minimum.
5. `shell/PageHeader.svelte` (props `title`, `sub`, `route`): an `h1` (18px,
   700) and the subtitle. On the right, when `route === 'seeds'`, Import CSV
   and Export buttons. Always **Add seed** (accent, with a mono "N" hint) →
   `commands.openAdd()`.
6. `Toast.svelte`:
   - Reads `ui.toast` inside an always-present `role="status"
     aria-live="polite"` container.
   - Visual: fixed bottom-centre, `background:var(--ink)`, `color:var(--bg)`,
     radius 8, shadow.
   - An optional action button (for example Undo) runs `action.run()`, then
     `ui.dismissToast()`.

## Acceptance (parent verifies after merge)

- All gates pass (0 errors and 0 warnings; tests green; build).
- At 1280×820 the shell matches the export's sidebar and header (fonts,
  spacing, colours) in light and dark. At 390×844 the narrow header and nav
  scroller fit with no horizontal page scroll.
- At 900px the sidebar layout is used; at 899px the narrow header is. The
  "Sample data" marker is visible in both.
- ⌘K, N, A, `?` and the matching buttons only toast "arrives in a later build
  phase", and `G` chords keep working afterwards (no invisible modal).
- `G T/S/B/W/P` navigate; the nav highlights the current route; a direct
  refresh on `/garden` works; back and forward work.
- Theme: the toggle persists across reload, and the first visit follows the
  OS setting.
- Nav counts come from the store: Today 3, Seeds 22, Garden 4.
- The Import and Export CSV commands work from the sidebar.
- Deferred to later phases:
  - the palette, Add, Sprout and Shortcuts UIs (Phase 5)
  - `/` focusing the filter, and the print view (Phase 2)
  - Dialog browser checks (initial focus, Tab cycling, backdrop close,
    Escape, focus restore, inert cleanup, stacked overlays, non-modal drawer).
    These run when Dialog is first consumed: the narrow detail sheet in Phase
    2, then the Phase 5 overlays.
