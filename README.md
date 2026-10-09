# Seedkeep Workbench web prototype

This is a client-only Seedkeep web/PWA prototype in the Workbench visual style
(Direction 1b). It uses one fictional sample household and a fixed sample date
of **2026-10-09**. It supersedes the Daily Folio prototype preserved at the
`daily-folio-baseline` Git tag.

Household edits live in memory and reset to the sample on reload. Nothing is
synced, uploaded, extracted from a photo, or sent to an AI provider. Add seed's
photo and barcode flows use sample results; Sprout replies are canned. Settings
keeps only a masked API-key preview; the entered key is discarded and never
sent. The theme preference is the only app preference saved in local storage.

## Run and verify

Requires Node.js; the handoff environment reported `node --version` as
`v26.8.1`.

```sh
npm install
npm run dev       # Vite dev server, bound to 127.0.0.1
npm run check     # SvelteKit sync and svelte-check
npm test          # Vitest run
npm run build     # static production build
npm run preview   # preview build, bound to 127.0.0.1
```

## Routes and overlays

| Route | Surface |
| --- | --- |
| `/` | Today |
| `/seeds` | Seeds inventory |
| `/garden` | Garden bed planner |
| `/windows` | Planting windows |
| `/settings` | Settings |

Global overlays: ⌘K command palette, Add seed modal, Sprout drawer, and the
keyboard shortcuts dialog. Escape closes/cancels the top overlay. Single-key
shortcuts and route chords are suspended in modals; typing fields, key repeats,
and IME composition are ignored.

| Action | Shortcut |
| --- | --- |
| Command menu | ⌘K (also Ctrl+K) |
| Add a seed | `N` |
| Filter seeds | `/` |
| Ask Sprout | `A` |
| Go to Today | `G`, then `T` |
| Go to Seeds | `G`, then `S` |
| Go to Garden | `G`, then `B` |
| Go to Planting windows | `G`, then `W` |
| Go to Settings | `G`, then `P` |
| Close / cancel | `Esc` |
| Open shortcuts list | `?` |

The second key in a `G` route chord must be pressed within 900 ms.

## Code map

- `src/lib/domain/`: shared types, sample household data, fixed-date helpers,
  derived rows, CSV parsing/export, garden calculations, and Sprout sample replies.
- `src/lib/state/`: `garden.svelte.ts` owns in-memory garden data and actions;
  `ui.svelte.ts` owns overlays, theme and view state; `commands.ts` coordinates
  actions/navigation; `addFlow.svelte.ts`, `sprout.svelte.ts`, and `palette.ts`
  implement the respective flows.
- `src/lib/components/`: shared shell and dialog/toast/print components, plus
  `garden/`, `overlays/`, `seeds/`, `shell/`, `today/`, and `windows/` surfaces.
- `src/routes/`: root layout and Today, Seeds, Garden, Settings, and Windows pages.
- `src/lib/components/Dialog.svelte`: shared accessible modal, palette, sheet,
  and non-modal drawer primitive.
- `src/app.css`: light/dark theme tokens, base styles, visible focus treatment,
  and narrow/coarse-pointer target sizing.

State code follows the runes and data-flow rules in
[`docs/workbench/README.md`](docs/workbench/README.md): use Svelte 5 runes,
read derived data with domain selectors inside `$derived`, keep store state
reactive (no long-lived spreads/destructured snapshots), edit by ID through
actions, and use keyed each blocks.

## Accessibility and demo limits

The shell provides a skip link; navigation marks the current page. Interactive
controls have visible focus styles and accessible names, and overlays manage
focus, modal inertness, and Escape through the shared dialog/command behavior.
Narrow or coarse-pointer controls target at least 44 px. Status is not conveyed
by color alone.

This is not an account or connected service. The sample ZIP, weather-like
daylight, contribution statuses, extraction, barcode match, and Sprout chat are
prototype data or simulated behavior, not live results.

## Design documents and follow-ups

Phase design/implementation notes are in [`docs/workbench/`](docs/workbench/);
the umbrella plan is `~/git/seedkeep/.docs/ai/phases/2026-10-09-workbench-web-plan.md`.

Not built: Journal page; PWA installation guidance and service worker; sample
reset control; real authentication, sync, server, or CloudKit migration; and
real photo extraction, barcode lookup, or AI provider integration.
