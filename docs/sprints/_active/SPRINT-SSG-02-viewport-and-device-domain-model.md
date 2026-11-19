# SPRINT-SSG-02 Viewport and device domain model

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SSG-02` |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SSG-02` |
| Status | `PLANNED` |
| Depends on | `SPRINT-SSG-01` |
| Unblocks | `SPRINT-SSG-03`, `SPRINT-SSG-04` |
| Execution unit | `PR-SSG-02` |
| Poteto playbook | `feature` with `principle-model-the-domain` and `principle-migrate-callers-then-delete-legacy-apis` |
| BMAD roles | Product Manager, UX Designer, Architect, Developer, TEA |
| Effort | 3 days (guess) |

## Outcome

All device catalogs, screen dimensions, orientations, `frameStyle` assignments, and `Full` / `Custom` persistence projections converge into one pure ESM owner (`js/harness/viewport-geometry.js`) and `js/device-registry.js`. Selecting any preset initializes `device.defaultOrientation` so desktop presets never boot sideways, `Full (100%)` and square custom dimensions mark `rotatable: false` with cleared `#btn-orient-*` state, `DeviceRegistry.#load()` merges updated code built-in fields ahead of stale `localStorage` copies while keeping `STORAGE_KEY_V1` dual-write intact (`DeviceRegistry.add` forwards optional `frameStyle`), `conformance-panel.js` memoizes `(targetUrl, selectionKey, orientation)` on `lab:viewport-change` so resizes trigger `0` extra fetches while `lab:target-change` invalidates and re-fetches, saved test runs never forge `:desktop-fhd:` keys, mid-session unapproved redirects emit valid `urn:gqc:interrupted-capture:v1` records before FSM stop, and `presentation-lattice.spec.js` Test 11 plus all unit/feature callers migrate together.

## Work sequence

1. Reconcile `BUILTIN_DEVICES` in `js/device-registry.js` and `#device-form` in `src/pages/responsive-lab.astro`:
   - Reconcile `BUILTIN_DEVICES` with `LandingPage/mcard.yaml` `type_lattice.form_factors` using kebab-case IDs (`mobile-large` `430x932`, `tablet-standard` `768x1024`, `desktop-standard` `1440x900`, `desktop-ultrawide` `2560x1080` beside existing `8` presets including `375x667`), map custom user-saved `'wearable'` presets in `CATEGORY_DEFAULTS` to `'hairline-ruler'` (keeping built-ins scoped to the `12` real phone/tablet/desktop presets without bespoke watch fixtures), set `deviceMatrix()` default `categories` in `tests/fixtures/device-matrix.js:53-59` from `null` to `['phone', 'tablet', 'desktop']`, update `tests/features/device-conformance.spec.js:196`, `tests/unit/device-registry-v2.test.mjs:13-14` (`8` -> `12` built-in devices plus `frameStyle` check), and `tests/unit/fidelity.test.mjs:54-57` (`16` combinations / `8` built-ins -> `24` combinations / `12` built-ins, matching `deviceMatrix().length`), add `safeAreaInsets: { top: 20, right: 0, bottom: 0, left: 0 }` on `iphone-se`, add optional `frameStyle` (`'phone-ios' | 'phone-android' | 'tablet' | 'browser-window' | 'hairline-ruler' | 'unframed'`) accepted in `validateDevice` (`js/device-registry.js:209-287`) and backed by `CATEGORY_DEFAULTS` + `withCapabilityDefaults()`, and forward `frameStyle: data?.frameStyle` inside `DeviceRegistry.add(data)` (`js/device-registry.js:318-333`) before calling `withCapabilityDefaults({...})`.
   - Update `DeviceRegistry.#load()` (`js/device-registry.js:467`) so `BUILTIN_DEVICES` properties win over stale cached `localStorage` copies (`{ ...(byId.get(b.id) ?? {}), ...b, isBuiltin: true }`), delivering `frameStyle` and `safeAreaInsets` to returning users while preserving custom user presets and dual-write to `STORAGE_KEY_V1` (`js/device-registry.js:483-484`).
   - Update `#conformance-status-badge` (`src/pages/responsive-lab.astro:151` initial conformance badge text `>Standby<` -> `>Uncertified<`) plus `#device-form` (`src/pages/responsive-lab.astro:182`), apply Schema v2 category defaults in `js/harness/device-presets-ui.js` for custom preset creation, and replace duplicate `DIM_MIN`/`DIM_MAX`/`gcd`/`aspectRatio` definitions in `js/device-registry.js:12-13, 180-192` with imports/re-exports from `js/harness/viewport-geometry.js`.
2. Consolidate all pure selection and frame geometry math inside `js/harness/viewport-geometry.js` (no split second domain file):
   - Define `ViewportSelection` (`{ kind: 'full' } | { kind: 'preset', deviceId, orientation } | { kind: 'custom', width, height, label }`), `selectDevicePreset(device)`, `applyCustomViewport(width, height)`, `rotateViewportSelection(selection)`, `resolveViewportMetrics(selection, registry, containerRect)`, and `resolveFrame(selection, device)` returning `{ frameStyle, chromeInsets }` and `scale` using `(innerWidth + chromeInsets.x, innerHeight + chromeInsets.y)` (insets initialized at `{ x: 0, y: 0 }` in `SSG-02` until `SSG-03` enables outer bezels).
   - Preset selection initializes `orientation = device.defaultOrientation` and assigns landscape `(max(w,h), min(w,h))` versus portrait `(min(w,h), max(w,h))`. `Full (100%)` resolves `rotatable: false`, `orientation: 'responsive'`, and measured stage pixels. Square custom dimensions (`w === h`) resolve `rotatable: false`, `orientation: 'square'`. Both clear active state (`aria-pressed="false"`) and set `disabled` / `aria-disabled="true"` on `#btn-rotate-viewport`, `#btn-orient-vertical`, and `#btn-orient-horizontal`.
3. Define and implement the closed-schema **Persistence Projection Table** in `js/harness/recorder.js` (stripping UI-only `frameStyle` and `defaultOrientation` fields and keeping `urn:mcard:schema:responsive_test_run:v1` intact without breaking historical `:desktop-fhd:` history per `INV-REF-03`):

   | `ViewportSelection` | `run.device.id` | `run.device.width x height` | `run.orientation` | Rule when container `< 100px` or resized mid-run |
   | --- | --- | --- | --- | --- |
   | `preset` | `device.id` | `Math.round` active preset `(w, h)` | `'portrait' \| 'landscape'` | Uses preset active dimensions |
   | `custom` (`w !== h`) | `'custom-' + w + 'x' + h` | Integer `[100, 7680]` | `w > h ? 'landscape' : 'portrait'` | Clamped by `clampDimension`; `name <= 40` chars (`Custom (<w>x<h>)`) |
   | `custom` (`w === h`) | `'custom-' + w + 'x' + h` | Integer `[100, 7680]` | `'portrait'` | `validateTestRun` requires `'portrait' \| 'landscape'` |
   | `full` (`100%`) | `'viewport-full'` | Measured container integer px locked at `recorder.start()` via injected `measureFullStage()` (preserving valid default descriptor when called bare in Node `GQC-07-UNIT-03`) | `lockedW >= lockedH ? 'landscape' : 'portrait'` | Blocks persist with visible `#rec-saved-pill` / `#mcard-result-disclosure` / `#page-status` error if `< 100px`; mid-run host resizes never mutate locked run ID |

4. Fix `InteractionRecorder` filtering, tuple memoization, and interrupted-capture persistence:
   - In `js/harness/recorder.js` (`_onViewportChange`), record `viewport_change` / `orientation_change` events only for intentional target-viewport causes (`'preset' | 'custom' | 'rotate'`), filtering out `'resize'`, `'arrangement'`, and `'scale-mode'` noise so dock/window shifts do not pollute test recordings.
   - Memoize `js/harness/conformance-panel.js` on `(targetUrl, selectionKey, orientation)` where `selectionKey` distinguishes `'viewport-full'`, `'custom-<w>x<h>'`, and `device.id` (reporting `'Uncertified'` rather than `'Standby'`) across repeated `lab:viewport-change` dispatches (`0` repeat `GET /api/test-runs/conformance/latest` fetches when the tuple is unchanged), while invalidating and re-fetching on `lab:target-change`. Update `tests/unit/pkc-lifecycle.test.mjs:365-391` to test unchanged `lab:viewport-change` (`fetchCalls === 1`), changed device/orientation (`fetchCalls === 2`), `lab:target-change` (`fetchCalls === 3`), and post-`destroy()` stability (`3`).
   - Add `recorder.saveInterruptedCapture({ sessionId, target, reason, lifecycleState })` sending all `validateInterruptedCapture`-required fields (`{ schema: 'urn:gqc:interrupted-capture:v1', sessionId, target: { url, slug }, reason, lifecycleState: priorState, capturedAt, incomplete: true, passing: false, certified: false }`) and update `handleMidSessionRedirectInvalidation` in `js/harness/lab-runtime.js:65-77` to capture `const priorState = recorder.state` (`'RECORDING' | 'PAUSED'`) **before** calling `recorder.invalidateActiveCapture(reason)`. Update `js/harness/spa-test-workflow.js:673` and guard `src/islands/MCardResultIsland.jsx:80-87` against missing `device`/`metrics` fields to display interrupted captures (`incomplete: true`) distinctly.
5. Migrate every consumer in one wave and delete `internalOrientation` (`horizontal` | `vertical` viewport states) and legacy `rotateViewport`:
   - Migrate `js/harness/viewport-stage.js` (exposing `rotateStageViewport`), `js/harness/device-presets-ui.js` (fixing `markActiveChip('full')` and syncing `W:`/`H:` inputs), `js/harness/lab-runtime.js`, `js/harness/lab-api.js` (updating `window.__lab.geometry.get()` / `setOrientation()` and `lab:viewport-change` detail while keeping `window.__lab.version === 1`), `js/harness/spa-test-workflow.js`, `js/harness/recording-ribbon.js`, `js/harness/capture-same-origin.js`, and `js/harness/membrane-interceptor.js:20` (`800x600 -> 'landscape'`).
   - Keep `SpaTestWorkflow.jsx` Step 2 concise per "Say it once" (`device-summary` pill showing active device + dimensions, P0 quick switches `iPhone 16 Pro`, `iPad Air 11"`, `Full (100%)`, and `Browse All Presets` focusing `#device-presets-container`, paired in `SPRINT-SSG-05` with switching `data-workbench-mode` to `'explore'` before focus, deleting `[data-testid="workflow-rotate-device"]` inside Step 2 and updating `tests/bombadil/workbench.bombadil.ts:183`).
   - Update `js/harness/target-membrane.js` (`recoverToDefault`) to default to `/tests/fixtures/spa-test-target.html` consistently with `app-config.json`.
6. Migrate `tests/unit/viewport-geometry.test.mjs:8,34-47` (`rotateViewport` -> `rotateViewportSelection`, asserting `'portrait' | 'landscape' | 'responsive' | 'square'`), `tests/unit/device-registry-v2.test.mjs:13-14`, `tests/unit/fidelity.test.mjs:54-57`, `tests/unit/pkc-lifecycle.test.mjs:365-391`, `tests/fixtures/app-fixtures.js:168,213` (`rotateViewport` -> `rotateStageViewport`), `tests/features/device-conformance.spec.js:196` (deriving `new Set(matrix.map((m) => m.profile.id)).size` -> `12`), `tests/features/presentation-lattice.spec.js` Test 11 (`lines 257-390`, removing hardcoded workstation screenshot path at `:322` and updating Full/orient/status expectations), `tests/features/responsive-rotation-and-devices.spec.js` (selecting a rotatable preset before toggling `#btn-orient-*` in preset tests, and removing `:328` or moving `#btn-orient-vertical` after `#btn-apply-custom-dim` at `RVP-T06:325-331` while on `Full (100%)`), `tests/features/spa-test-workbench.spec.js:69,76` (`workflow-rotate-device` -> `#btn-rotate-viewport` / `workbench.rotateStageViewport()`), `tests/features/performance-baselines.spec.js:298,303,305` (`GQC-06-E2E-02`, replacing `workflow-rotate-device` clicks with `#btn-rotate-viewport` / `workbench.rotateStageViewport()`, and applying the same rotation replacement in `tests/performance/run-paired-benchmark.mjs:468` and `tests/performance/run-live-lanes.mjs:269,271,478`), `tests/features/spa-workbench-journey.spec.js:51,57`, `tests/features/responsive-lab-islands.spec.js:314,410,428,432` (`'Uncertified'`, updating `:314` and `:432` to `workbench.rotateStageViewport()`, removing `:428` `#btn-orient-vertical` click on `Full (100%)`, plus resize memoization count check), `tests/features/explorable-gui.spec.js:69-94` (selecting a rotatable preset before clicking `#btn-orient-*`), `tests/features/responsive-capture.spec.js:60-61,420-436` (selecting `#btn-size-mobile` before `#btn-orient-vertical` or removing redundant pre-preset `:60` click on disabled `Full (100%)` orient controls in `test C2`, and updating `GQC-03-E2E-05` to assert `storedRun.schema === 'urn:gqc:interrupted-capture:v1'`, `incomplete: true`, `passing: false`, `certified: false`, and `lifecycleState === 'RECORDING'` instead of reading `storedRun.events`), and `tests/features/spa-failure-recovery.spec.js`. Selectively re-capture `tests/baselines/layout-baseline.json` (`STY_FREEZE_PAGES=responsive-lab` if Step-2 DOM changed) and record `docs/sprints/_active/evidence/SSG-02-viewport-domain.md` + [`./DECISIONS.tsv`](./DECISIONS.tsv).

## Files

- Edit `js/harness/viewport-geometry.js` and `js/device-registry.js`
- Edit `js/harness/viewport-stage.js`, `js/harness/device-presets-ui.js`, `js/harness/lab-runtime.js`, `js/harness/lab-api.js`, `js/harness/spa-test-workflow.js`, `js/harness/conformance-panel.js`, `js/harness/recording-ribbon.js`, `js/harness/recorder.js`, `js/harness/capture-same-origin.js`, `js/harness/membrane-interceptor.js`, and `js/harness/target-membrane.js`
- Edit `src/pages/responsive-lab.astro`, `src/islands/DevicePresetsIsland.jsx`, `src/islands/SpaTestWorkflow.jsx`, `src/islands/ConformancePanelIsland.jsx`, and `src/islands/MCardResultIsland.jsx`
- Edit `tests/fixtures/device-matrix.js`, `tests/fixtures/app-fixtures.js`, `tests/bombadil/workbench.bombadil.ts`, `tests/unit/viewport-geometry.test.mjs`, `tests/unit/device-registry-v2.test.mjs`, `tests/unit/fidelity.test.mjs`, `tests/unit/pkc-lifecycle.test.mjs`, `tests/unit/test-run-schema.test.mjs`, `tests/unit/target-policy-and-config.test.mjs`, `tests/performance/run-paired-benchmark.mjs`, and `tests/performance/run-live-lanes.mjs`
- Edit `tests/features/device-conformance.spec.js`, `tests/features/presentation-lattice.spec.js`, `tests/features/responsive-rotation-and-devices.spec.js`, `tests/features/spa-test-workbench.spec.js`, `tests/features/performance-baselines.spec.js`, `tests/features/spa-workbench-journey.spec.js`, `tests/features/responsive-lab-islands.spec.js`, `tests/features/explorable-gui.spec.js`, `tests/features/responsive-capture.spec.js`, `tests/features/spa-failure-recovery.spec.js`, and `tests/baselines/layout-baseline.json`
- Create `docs/sprints/_active/evidence/SSG-02-viewport-domain.md` and append row to [`./DECISIONS.tsv`](./DECISIONS.tsv)

## BMAD responsibilities

### Product Manager

- Sign off on the unified `BUILTIN_DEVICES` catalog (`12` real phone/tablet/desktop presets matching `type_lattice.form_factors` + factory presets, mapping user custom `wearable` to `'hairline-ruler'`) and concise `SpaTestWorkflow` Step 2 device summary.

### UX Designer

- Confirm preset transitions feel predictable (MacBook/Desktop open landscape, phones open portrait, `Full` and square custom dims unpress `#btn-orient-*` and disable both `#btn-rotate-viewport` and `#btn-orient-*` without ambiguity) and zero duplicate controls remain in Step 2.

### Architect

- Enforce single pure domain ownership in `js/harness/viewport-geometry.js`, closed `responsive_test_run:v1` Persistence Projection boundaries (`frameStyle` stripped), `urn:gqc:interrupted-capture:v1` lifecycle semantics, and conformance selection memoization.

### Developer

- Migrate all harness, island, fixture, and Bombadil callers plus `window.__lab.geometry` in one wave, delete `internalOrientation` and legacy `rotateViewport`, and implement filtered recorder events.

### TEA

- Expand unit and Playwright coverage across preset transitions, square/`Full` disabled rotate, `< 100px` visible guard, Persistence Projection, `interrupted-capture:v1` redirect handling, resize memoization (`0` repeat conformance fetches), and migrated Test 11.

## Acceptance criteria

- Selecting `MacBook Air 13"` (`1280x832`) or `Desktop 1080p` (`1920x1080`) opens in landscape regardless of prior viewport state, and selecting `iPhone 16 Pro` (`393x852`) opens in portrait.
- `Full (100%)` and `Custom 500x500` disable `#btn-rotate-viewport` and `#btn-orient-*` (`disabled`, `aria-disabled="true"`), unpress `#btn-orient-*` (`aria-pressed="false"`), report `responsive` / `square` in UI labels, and persist valid `responsive_test_run:v1` payloads under `viewport-full` / `custom-500x500` with `portrait` / `landscape` mapped orientation (`frameStyle` stripped).
- `DeviceRegistry.#load()` delivers code-updated `frameStyle` and `safeAreaInsets` fields even when an older `pkc_responsive_lab_devices_v2` entry exists in `localStorage` while preserving `STORAGE_KEY_V1` dual-write.
- Unapproved mid-session target redirects emit an `urn:gqc:interrupted-capture:v1` record accepted with HTTP `201`/`200` by `POST /api/test-runs` with non-`FINALIZED` `lifecycleState` and visible `incomplete: true` badge in `MCardResultIsland`.
- Zero references to `internalOrientation`, `'horizontal'|'vertical'` viewport orientation states, or standalone `rotateViewport` survive in `src/` or `js/`, and host resizes trigger `0` repeat `/api/test-runs/conformance/latest` fetches.

## Test design

- `tests/unit/viewport-geometry.test.mjs`, `tests/unit/device-registry-v2.test.mjs`, `tests/unit/fidelity.test.mjs`, `tests/unit/pkc-lifecycle.test.mjs`, and `tests/unit/test-run-schema.test.mjs` test `ViewportSelection` transitions, `12`-device built-in / `24`-matrix reconciliation, `DeviceRegistry.add` `frameStyle` preservation, Persistence Projection table rows, disabled `rotate` on `full` and `square`, `< 100px` visible guard, `interrupted-capture:v1` validation, and `lab:viewport-change` memoization vs `lab:target-change` invalidation.
- Playwright specs (`presentation-lattice.spec.js`, `responsive-rotation-and-devices.spec.js`, `spa-test-workbench.spec.js`, `spa-workbench-journey.spec.js`, `responsive-lab-islands.spec.js`, `explorable-gui.spec.js`, `responsive-capture.spec.js`, `spa-failure-recovery.spec.js`) verify end-to-end orientation behavior, `0` conformance fetches on resize, Test 11 migration, and redirect interruption persistence.

## Non-goals

- Rendering outer hardware bezels or StageShow workbench `.stage-toolbar` / `.stage-well` / `.stage-transport` layout (`SPRINT-SSG-03` and `SPRINT-SSG-05`).
- Adding Bombadil dashboard handles or UI (`SPRINT-SSG-04` and `SPRINT-SSG-05`).

## Definition of done

- [ ] **DoD-SSG-02-01.** `js/harness/viewport-geometry.js` owns all viewport/orientation math and `internalOrientation` plus legacy `rotateViewport` are completely removed (`rotateStageViewport` untouched). Verified by `! grep -rnwE 'internalOrientation|rotateViewport' src js tests && node --test tests/unit/viewport-geometry.test.mjs tests/unit/test-run-schema.test.mjs`.
- [ ] **DoD-SSG-02-02.** Catalog reconciliation, `#load()` builtin merge, Persistence Projection (`viewport-full`, `custom-<w>x<h>`), `interrupted-capture:v1`, memoized conformance keys, and filtered recorder events pass unit checks. Verified by `npm run test:unit`.
- [ ] **DoD-SSG-02-03.** Migrated Playwright workbench, device conformance, performance baselines, capture, GUI, and failure-recovery suites pass against updated `tests/baselines/layout-baseline.json`. Verified by `npx playwright test tests/features/device-conformance.spec.js tests/features/presentation-lattice.spec.js tests/features/responsive-rotation-and-devices.spec.js tests/features/spa-test-workbench.spec.js tests/features/performance-baselines.spec.js tests/features/spa-workbench-journey.spec.js tests/features/responsive-lab-islands.spec.js tests/features/explorable-gui.spec.js tests/features/responsive-capture.spec.js tests/features/spa-failure-recovery.spec.js tests/features/layout-freeze.spec.js --project=features`.
- [ ] **DoD-SSG-02-04.** Evidence in `evidence/SSG-02-viewport-domain.md` and `DECISIONS.tsv` row are recorded with all core gates and build passing. Verified by `test -s docs/sprints/_active/evidence/SSG-02-viewport-domain.md && grep -qE $'\tSSG-02\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run test:unit && npm run build`.
