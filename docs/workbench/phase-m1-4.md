# Web M1 · Phase 4 — Real data and sign-in

Umbrella plan: `~/git/seedkeep/.docs/ai/phases/2026-10-09-web-app-plan.md`.
Server contract: `~/git/seedkeep-server` branches `web/m1-p2-sessions`
(PR #6: sign-in, cookies, CSRF, households) and `web/m1-p3-integrity`
(PR #7: versions, cascades, client ids, location in `GET /households/me`).
Read the server source for the exact request and response shapes. It is
the source of truth.

Goal: the Workbench app talks to `seedkeep-server`.
- Users sign in with an email code.
- They create or choose a household (the "garden").
- Every garden screen reads and writes real data with optimistic, versioned
  writes.

There is no more sample data in the running app. Features that aren't real
yet are hidden.

## Decisions baked into this contract
- **No delta sync.** The web client loads a full baseline (`since=0`,
  following every page) at sign-in, on window focus (throttled to once per
  30 s) and every 120 s while visible. Server rows replace local rows,
  except records with a pending mutation, which keep their optimistic
  value until it settles.
- **Writes.**
  - Optimistic, per record:
    - apply locally
    - mark the record pending
    - call the API with `If-Match` set to the record's current version
  - On success, replace the record with the server row (new version).
  - On 409 `version_conflict`, replace the record with `data.current` and
    toast "This changed elsewhere, so it was reloaded."
  - On a timeout or network error, the outcome is ambiguous: refetch the
    baseline.
  - On any other error, roll back only that record and toast the server's
    message.
- **Creates use client ids:** `crypto.randomUUID()` with a type prefix, for
  example `seed_web_<uuid>`. Retries replay safely.
- **Dates:** `TODAY` becomes the real local date. `dates.ts` exports a live
  `TODAY` binding plus `setToday(ymd)` (tests use it to pin 2026-10-09).
  The app calls `setToday(localYMD())` at startup and again after
  midnight.
- **Home and daylight:**
  - `Home` comes from `household.location`: ZIP, zone, `avgFirstFrost` and
    `avgLastFrost` (MM-DD, projected to the next upcoming date), and
    latitude/longitude.
  - Sunrise, sunset and day length are computed client-side from the
    coordinates and today's date (NOAA solar algorithm, `solar.ts`).
  - No location → `home.hasLocation=false`. Today shows a "Set your home
    ZIP" prompt instead of daylight and frost.
- **Verdicts and windows:**
  - Seeds with a `catalog_id` get catalog details from `GET /api/catalog/:id`
    (name, variety, company, type, growing info), cached per session.
  - `POST /api/recommendations/bulk` (≤200 ids per call) maps
    `verdict` → `Seed.verdict` and `recommendedRange` → `Seed.window`.
  - Pending ids, 409 `no_household_location`, or no catalog id → verdict
    null ("Not in the catalog" or "Set your ZIP").
- **Feature flags** (`src/lib/config.ts`): the M2 features are hidden
  entirely, not shown as demos. `sprout`, `packetPhoto`, `barcodeScan`,
  `csvImport`, `aiKey` and `catalogCorrections` are all false in M1.
  Hidden means no button, palette item, shortcut or Settings section.
  "Sample data" markers and demo copy are removed.

## Rules added after the Sol contract review (binding)

1. **Async creates.** Every consumer of a create (`addSeed`, `addEvent`,
   `addBed`, `addLocation`, `addTag`) awaits the typed result. It handles
   failure before navigating, selecting or showing a success toast. Owners
   are listed below; nothing is left unassigned.
2. **Generations.** Each operation captures `{ userId, householdId,
   generation }`. A household switch or sign-out bumps the generation.
   Stale completions are discarded. A switch or sign-out resets UI
   selections, drafts, pending state and photo blob URLs.
3. **401s and sign-out.**
   - Every protected request that gets a 401 calls one handler. It
     invalidates outstanding operations, clears private state and sets
     `signed-out`.
   - Sign-out and household changes are broadcast to other tabs through
     `BroadcastChannel('seedkeep-session')`, with a storage-event fallback.
     Other tabs react the same way.
4. **Repository semantics.**
   - Writes are serialized per record (a per-id queue). Deletes leave a
     tombstone marker until confirmed.
   - Baselines are stamped with a generation and start time. A baseline
     never overwrites a record acknowledged or mutated after it started,
     and never resurrects a delete-marked record.
   - Cascades (seed or bed delete, location or tag delete) are reconciled
     by an unthrottled refetch after success.
5. **Error recovery.**
   - Timeouts and network errors run an unthrottled reconcile. A create
     keeps its client id, so retries replay.
   - A 404 on update or delete removes the local row.
   - A 409 maps `data.current` through the DTO adapter.
   - A late response never overwrites a newer local or server state.
6. **Photos.** Load through `fetch` with credentials and `X-Household-Id`,
   then a blob URL cached per photo id and revoked on household switch,
   sign-out or eviction. `photoUrl` is replaced by `photoBlobUrl(photoId):
   Promise<string>`. Uploading or deleting a photo refetches the seed for
   its new version. Development runs the app and the API on the same
   hostname (`localhost`); staging and production share the
   `seedkeep.app` site.
7. **Planting events.**
   - No `note` kind in any control. The server rejects it, so
     SquareDetails offers Sow, Transplant and Harvest.
   - `done` ↔ `completed_at` (a timestamp, or null).
   - Client ids are `se_`, `pe_`, `bd_`, `lo_`, `tg_` or `ph_` plus a
     UUID, which fits the server's id limits (events ≤ 64 characters).
   - Locations and tags carry a `version`.
8. **Auth responses.**
   - Normalize both better-auth and envelope error shapes, with fallback
     messages and `retry_after_seconds` countdowns.
   - OTP calls: `POST /api/auth/email-otp/send-verification-otp` with
     `{ email, type: 'sign-in' }`, then `POST /api/auth/sign-in/email-otp`
     with `{ email, otp }`.
   - Sign-out is `POST /api/auth/sign-out` with credentials.
9. **Recommendations.**
   - Parse `{ recommendations, pending }`; `recommendedRange` is
     `{ start, end }`.
   - Pending ids show as "Calculating…" and are retried after 5 s, up to 3
     times.
   - "Set your ZIP" (no location) is distinct from "Not in the catalog".
10. **Catalog and journal.**
    - Catalog entries use `common_name` and have no type. A seed's type is
      `custom_type`, or "Untyped".
    - Journal entries are camelCase. Paginate fully and take the latest by
      `occurredOn` (then id).
    - `GardenData.note` can be null, which shows an empty state.
11. **Clock.** `src/lib/state/clock.svelte.ts` holds the rune-backed clock
    (`clock.today`, `clock.now`, `setToday`).
    - `dates.ts` reads `clock.today` through a function, so every
      `$derived` that uses the date helpers re-runs at midnight. There is
      no module-level `TODAY` constant.
    - `isOld` uses the current year.
    - The clock re-syncs on focus and visibility.
    - Unknown coordinates, missing frost averages, polar day or night, and
      DST are all explicit states. Zero coordinates are valid.
12. **Flags.** Hidden features are also unreachable:
    - their shortcut handlers are no-ops
    - palette items are filtered
    - the drawers and modals don't mount
    - corrections are hidden

## Contract files (parent-owned)
- `src/lib/config.ts`: `API_BASE` (from `VITE_API_BASE`, default
  `http://localhost:8787`) and `FEATURES`.
- `src/lib/state/session.svelte.ts`: the session store API (stub).
- `src/lib/api/index.ts`: the endpoint function signatures (stub).
- `src/lib/domain/types.ts`:
  - `Seed` gains `version`, `catalogId`, `source`.
  - `Location`, `Tag`, `Bed` and `PlantingEvent` gain `version`.
  - `Home` gains `hasLocation`, `latitude` and `longitude`.
  - `SeedPhoto` is added.

## File ownership

| Files | Owner |
|---|---|
| `src/lib/api/**` (client, DTO mapping, endpoints), `src/lib/state/session.svelte.ts`, `src/lib/state/garden.svelte.ts` (repository), `src/lib/state/clock.svelte.ts` (tick and rollover bodies), `src/lib/state/commands.ts`, `src/lib/state/addFlow.svelte.ts`, `src/lib/state/palette.ts`, `src/lib/keys.ts` (flag gating), `src/lib/domain/{dates,derive,csv,garden}.ts`, new `src/lib/domain/solar.ts`, `src/lib/components/garden/{BedGrid,SquareDetails,BedEvents}.svelte` (await creates, no `note` kind, completion mapping), tests for all of these | **Luna** |
| `src/routes/signin/+page.svelte`, `src/routes/onboarding/+page.svelte`, `src/routes/+layout.svelte` (auth guard, loading and error states, `clock.start()`, overlay mounts gated by flags, `pageMeta(key, garden, session.household?.name)`), shell household name and switcher (Sidebar/NarrowHeader), `src/routes/settings/+page.svelte` (real ZIP and location states, Account with real email and sign-out, hide flagged sections), `src/lib/components/seeds/SeedDetail.svelte` (photos section using `photoBlobUrl`, hidden corrections), `src/lib/components/garden/NewBedForm.svelte` (await `addBed`), `src/lib/components/today/{DaylightCard,LatestNote}.svelte` (no-location, polar and empty-note states), `src/lib/components/overlays/{AddSeedModal,ShortcutsDialog}.svelte` (flag-hidden tabs and rows), PageHeader (flag-hidden Import), removal of the "Sample data" markers | **Haiku** |
| contract files above, docs | Parent |

## Session store (`session`)

`status`: `'loading' | 'signed-out' | 'no-household' | 'ready' | 'error'`

| Member | Behaviour |
|---|---|
| `user` | `{ id, email, name }` or null |
| `households` | the caller's households |
| `householdId` | the current household id |
| `household` | `{ id, name }` or null |
| `init()` | Call `/api/me`. Signed in → list households → pick the stored choice (localStorage key `seedkeep.household.<userId>`, guarded) or the newest → `garden.load()`. Signed out → `signed-out`. No household → `no-household`. |
| `sendCode(email)` | Throws `ApiError` (for example `rate_limited` with `retry_after_seconds`, or `invalid_email`). |
| `verifyCode(email, code)` | On success, behaves like `init()`. |
| `createHousehold(name, zip?)` | Creates the household, then sets the location if `zip` is given (an invalid or unknown ZIP surfaces as `ApiError` after the household exists), then `ready`. |
| `selectHousehold(id)` | Switches household, clears the garden store and reloads. |
| `signOut()` | `POST /api/auth/sign-out`, then clear stores, the localStorage household key and photo object URLs → `signed-out`. |

Every API call sends `X-Household-Id: householdId` once one is chosen.

## Garden store (repository)

The class shape and action names stay as they are, so the views keep
working.
- **Data:** the collections start empty. New fields: `loading`, `loadError`
  and `pending` (a `ReadonlySet` of record ids).
- **Mutating actions return Promises**, resolved after the server settles.
  Views may ignore them.
- **New actions:**
  - `load()`
  - `refresh()` (throttled)
  - `seedPhotos(seedId) → Promise<SeedPhoto[]>`
  - `uploadSeedPhoto(seedId, file, role)`
  - `deleteSeedPhoto(photoId)`
  - `photoUrl(photoId)`: `${API_BASE}/api/photos/<id>`, cookie-authenticated,
    so it can be used directly in `<img>`
- **saveZip:** `PUT /api/households/me/location`. On success, `home` updates
  and recommendations reload.
- **Local-only data:** `note` (the latest journal entry, read-only in M1,
  from `GET /api/journal`), `contributions` (empty, flag-hidden),
  `key` (unused) and `thread` (unused).
- **CSV:** export still works from the loaded data. Import is flag-hidden.

## Acceptance

Run locally against a dev server with `MAIL_PROVIDER=log` and
`APP_ORIGINS=http://localhost:5199`:
1. Sign in with the code from the server log.
2. Create "Rivera garden" with ZIP 64110.
3. Add, edit and delete seeds, locations, tags, beds and plantings.
4. Paint the garden.
5. Complete a task, then Undo it.
6. Upload and delete a seed photo.
7. Reload: everything persists.
8. A second tab editing the same seed shows the conflict toast.
9. Sign out, then sign back in.

Additional acceptance checks:
- **Rapid edits:** Undo pressed twice quickly; a stale baseline refresh
  that must not resurrect or overwrite.
- **Recovery:** a timeout followed by a replayed create; a 401 mid-session
  and sign-out in another tab.
- **Households and recommendations:** a household-switch race; pending
  recommendations.
- **Clock and location:** midnight rollover (with a pinned clock); the
  no-location and polar daylight states.
- **Browser cookies and CORS** with the dev server on 5199 and on 5173.

Gates: `npm run check` 0/0, Vitest (with mocked fetch), build. M2-flagged
features are invisible. There is no sample data at runtime.

## Status (2026-10-12)

- **Gates pass:** `npm run check` 0/0, Vitest 117/117, build, `npm run lint`.
- **Reviews:** Opus 5.5 and GPT-6.1 Sol reviewed every fix round. Both
  confirmed "no blocking issues" at the final repository round.
- **Not yet run:**
  - the live local acceptance above, which needs Docker Desktop for the
    local Postgres
  - real-browser cookie and CORS checks
- **Low follow-ups** are tracked in the umbrella roadmap:
  - `saveZip` does not cut off older recommendations for catalog ids
    outside its request.
  - `pendingRecommendations` is replaced whole by responses that cover only
    some ids.
  - Cascade sanitization runs only in `load()`, not on write acknowledgements.
