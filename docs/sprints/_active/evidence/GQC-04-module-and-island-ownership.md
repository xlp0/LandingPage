# GQC-04 module and island ownership map

## Metadata

- Sprint ID is `SPRINT-GQC-04`.
- Execution unit is `PR-GQC-04`.
- Base commit is `c402d86` (`PR-GQC-03`).
- Workbench Petri net specification is `src/net/workbench-net.yaml`.
- P0 SPA target Petri net fixture is `tests/fixtures/spa-test-target.graph.json`.
- Read-only upstream inputs are `docs/sprints/_active/evidence/GQC-00-consumer-map.md` and `docs/sprints/_active/evidence/GQC-02B-island-map.md`.
- Live 10-lane verification packet is `/tmp/swarm-PR-GQC-04/lanes-all.json`.
- Paired performance benchmark artifact is `/tmp/swarm-PR-GQC-04/perf-results.json`.

## Workbench and target net separation

The Responsive UI Lab separates workbench orchestration from target application navigation across two disjoint GQC-02A Petri net envelopes.

1. `src/net/workbench-net.yaml` (`28` Places and `56` Transitions) models LandingPage workbench pages, query views, server request lifecycles, and target policy error states.
2. `tests/fixtures/spa-test-target.graph.json` (`3` Places and `4` Transitions) models the P0 SPA target under test inside `#mission-control-iframe`.
3. `assertDisjointNetIds()` in `js/harness/spa-test-workflow.js` runs inside `src/pages/responsive-lab.astro` frontmatter at build or request time and rejects any shared Place ID or Transition ID between the two nets.
4. `js/nav.js` describes PenPot frame links for LandingPage itself and is never read as a target route graph.

## Page composition roots

Six root pages correspond to Astro routes under `src/pages/` and declared Places in `src/net/workbench-net.yaml`. One additional root HTML file, `pkc-docs-index.html`, remains a tombstoned static file outside `workbench-net.yaml` and falls through Astro middleware to Express static hosting. Astro's client router stays disabled across all pages.

| HTML entry | Astro page | Workbench Place ID | Host mode | Boot script and modules | State store | Ready marker | Retained globals | Outgoing declared Transitions | BMAD owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `index.html` | `src/pages/index.astro` | `p_page_index` and `p_view_index_mcard_viewer` | `astro-wrapped` | Inline redirect to `/responsive-lab.html` on default entry. `?noredirect=1` mounts `js/nav.js`, `js/landing-page-mcard.js`, `js/external-portal-membrane.js`, and `js/runtime/presentation-controller.js` | Local controller state in `mountSinglePageMCard()` | Redirect to `/responsive-lab.html`, or `#mcard-modality-tabs` visible at `?noredirect=1` | `window.PENPOT_NAV` | `t_redirect_index_to_lab`, `t_enter_index_mcard_viewer`, `t_link_viewer_to_lab`, `t_link_viewer_to_app`, `t_req_get_env`, `t_req_get_mcard_landing`, `t_req_put_mcard_landing`, `t_req_get_clm_program_artifact` | Product Manager and UX Designer |
| `responsive-lab.html` | `src/pages/responsive-lab.astro` | `p_page_responsive_lab` | `astro-islands` | Seven Preact islands under `src/islands/*.jsx` mounting `js/harness/*.js` and `js/device-registry.js` | `js/harness/lab-runtime.js` singleton | `body:not(.lab-booting)` and `[data-testid="spa-test-workflow"][data-workflow-ready="true"]` | `window.__lab` (including `window.__lab.workflow`) | `t_link_lab_to_index`, `t_link_lab_to_app`, `t_req_get_app_config`, `t_req_post_test_runs`, `t_req_get_conformance_latest`, `t_req_probe_handshake`, `t_enter_target_blocked`, `t_enter_capture_unavailable`, `t_enter_target_unapproved` | Product Manager and TEA |
| `app.html` | `src/pages/app.astro` | `p_page_app` | `astro-wrapped` | `/public/js/app-bootstrap.js?v=18`, `public/js/mcard-kernel/MCardManager.js`, `public/js/ViewManager.js`, `public/js/PWAManager.js` | `MCardManager` IndexedDB and in-memory collection | `#mcard-list` populated and `window.mcardManager` initialized | `window.mcardManager`, `window.viewManager` | `t_link_app_to_index`, `t_open_external_monopoly`, `t_open_external_chess`, `t_open_external_go` | Product Manager |
| `sprint-registry.html` | `src/pages/sprint-registry.astro` | `p_page_sprint_registry` | `astro-wrapped` | Inline script fetching `/api/clm/registry` | Local DOM table state | `#registry-body` rendered | None required by tests | `t_req_get_clm_registry` | Scrum Master |
| `fiber-inspector.html` | `src/pages/fiber-inspector.astro` | `p_page_fiber_inspector` | `astro-wrapped` | `public/js/fibers/registry.js` and `public/js/mcard-kernel/compat.js` | `FiberRegistry` instance | `#fiber-stage` rendered | None required by tests | `t_req_get_fiber_inspector_harness` | Architect |
| `fiber-conformance.html` | `src/pages/fiber-conformance.astro` | `p_page_fiber_conformance` | `astro-wrapped` | `public/js/fibers/registry.js` and `/public/conformance/membrane-probe.html` | `FiberRegistry` instance | `#conformance-results` rendered | None required by tests | `t_req_get_fiber_conformance_harness` | Architect |
| `pkc-docs-index.html` | None (static fall-through) | Tombstoned in `retired-islands.yaml` | Static legacy HTML | Static anchor list with no module bootstrap | None | Static document load | None | Tombstoned catalog outside active workbench net | Product Manager |

`app.html` remains `astro-wrapped` in `PR-GQC-04`. `GQC-00-consumer-map.md` classifies `app.html` as `undecided` and tombstoned in `retired-islands.yaml`, so `PR-GQC-04` assigns zero regions of `src/pages/app.astro` to Preact islands and keeps `app.html` labeled `webapp` (`Not Classified as SPA`) when loaded inside the Responsive Lab.

## Responsive Lab island ownership and cleanup

`src/pages/responsive-lab.astro` composes seven Preact islands. Each island owns one interactive region, mounts an existing plain JavaScript module from `js/harness/`, and cleans up its listeners, observers, and timers on unmount. Zero files under `src/islands/`, `js/harness/`, or `dist/client/_astro/` import `clm-kernel` or Node `crypto`.

| Island | Source file | DOM container | Directive | Mounted modules | Built client bundle | Cold load bytes | Deferred bytes | BMAD owner | Unmount cleanup path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TargetToolbarIsland` | `src/islands/TargetToolbarIsland.jsx` | `#lab-toolbar` | `client:load` | `js/harness/lab-toolbar.js`, `js/harness/target-membrane.js` | `TargetToolbarIsland.BgXTzVtd.js` (`12,505 B`) | `12,505 B` | `0 B` | Architect and Dev | `toolbar.destroy()` and `runtime.unregisterIsland('TargetToolbarIsland')` |
| `DevicePresetsIsland` | `src/islands/DevicePresetsIsland.jsx` | `#device-presets-region` | `client:load` | `js/harness/device-presets-ui.js`, `js/device-registry.js` | `DevicePresetsIsland.DC6YwwdV.js` (`8,216 B`) | `8,216 B` | `0 B` | UX Designer and Dev | `presetsUi.destroy()` and `runtime.unregisterIsland('DevicePresetsIsland')` |
| `ViewportStageIsland` | `src/islands/ViewportStageIsland.jsx` | `#viewport-stage-island-root` | `client:only="preact"` | `js/harness/viewport-stage.js`, `#mission-control-iframe` | `ViewportStageIsland.B4nWIs2d.js` (`1,960 B`) | `1,960 B` | `0 B` | Architect and TEA | `runtime.detachStageSurface()` and `runtime.unregisterIsland('ViewportStageIsland')` |
| `RecordingRibbonIsland` | `src/islands/RecordingRibbonIsland.jsx` | `#recording-ribbon` | `client:load` | `js/harness/recording-ribbon.js`, `js/harness/recorder.js` | `RecordingRibbonIsland.ByRqaKDX.js` (`8,524 B`) | `8,524 B` | `0 B` | TEA and Dev | `ribbon.destroy()` and `runtime.unregisterIsland('RecordingRibbonIsland')` |
| `SpaTestWorkflow` | `src/islands/SpaTestWorkflow.jsx` | `#spa-test-workflow` | `client:load` | `js/harness/spa-test-workflow.js` | `SpaTestWorkflow.C8OapK95.js` (`33,732 B`) | `33,732 B` | `0 B` | Product Manager, Architect, TEA, and UX Designer | `unsub()`, `runtime.detachWorkflow(workflow)`, and `workflow.destroy()` |
| `ConformancePanelIsland` | `src/islands/ConformancePanelIsland.jsx` | `#conformance-panel-root` | `client:visible` | `js/harness/conformance-panel.js` | `ConformancePanelIsland.BiMoxIK1.js` (`3,994 B`) | `0 B` | `3,994 B` | TEA and UX Designer | `panel.destroy()`, disclosure `toggle` listener removal, and `runtime.unregisterIsland('ConformancePanelIsland')` |
| `MCardResultIsland` | `src/islands/MCardResultIsland.jsx` | `#mcard-result-panel` | `client:visible` | `runtime.recorder.lastSavedRun`, `runtime.subscribeSavedRun` | `MCardResultIsland.BFyFcmOz.js` (`2,969 B`) | `0 B` | `2,969 B` | Product Manager and Dev | Saved-run unsubscribe, disclosure `toggle` listener removal, and `runtime.unregisterIsland('MCardResultIsland')` |

### Closed GQC-02B cleanup gap

`GQC-00-consumer-map.md` recorded a listener mismatch in `js/harness/conformance-panel.js`. `ConformancePanel` previously registered `lab:viewport-change` and `lab:target-change` on `window`, while `ViewportStage` and `TargetMembrane` dispatched non-bubbling `CustomEvent` instances on `document`. `PR-GQC-04` binds and removes both listeners on `document` inside `ConformancePanel`, closing the leak and restoring live conformance refreshes on viewport and target changes.

## Module lifecycle contract and capability descriptors

`js/pkc-core.js`, `modules.json`, `js/cubical-core.js`, `js/components/HeroContentComponent.js`, and `js/app-entry.js` implement an explicit startup and teardown contract tested in `tests/unit/pkc-lifecycle.test.mjs`.

### Capability descriptors in modules.json

`modules.json` is owned by the Architect for standalone `PKC.init()` browser harnesses. None of the six Astro workbench pages fetch `modules.json` during cold boot. Each descriptor declares an explicit `owner` and `required` flag:

| Capability ID | Entry module | Required | Owner | Cleanup resources |
| --- | --- | --- | --- | --- |
| `markdown-renderer` | `./js/modules/markdown-renderer/index.js` | `false` | Dev | Stateless renderer with no `stop()` method |
| `net-gateway` | `./js/modules/net-gateway/index.js` | `false` | Architect | WebSocket client when enabled |
| `p2p-serverless` | `./js/modules/p2p-serverless/index.js` | `false` | Architect | WebRTC and signaling handles when started |
| `tic-tac-toe-p2p` | `./js/modules/tic-tac-toe-p2p/index.js` | `false` | Dev | Game session listeners when started |

### Startup, dependency ordering, failure isolation, and cleanup

1. `PKC.init(options)` initializes modules sequentially in descriptor order and validates `dependsOn` prerequisites before calling `mod.init(context)` and `mod.start()`. If a dependency is missing or failed to start, `PKC.init()` rejects a required consumer with an error naming the module `id`, `owner`, and missing dependency.
2. When a module with `required: true` fails to import, lacks `init()`, or throws during `init()` or `start()`, `PKC.init()` throws an `Error` naming the module `id` and `owner` and stops subsequent dependent startup.
3. When an optional module (`required !== true`) fails, `PKC.init()` appends `{ id, owner, required: false, error }` to `PKC.failures`, invokes `options.onModuleError` if supplied, logs a warning, and continues initializing sibling modules.
4. `PKC.stop()` is idempotent. It iterates started modules in reverse startup order, calls `await instance.api.stop()` only on modules that allocate stateful resources, clears `PKC.modules`, and resets `PKC.started` so a subsequent `PKC.init()` starts cleanly.
5. `CubicalComponent` in `js/cubical-core.js` defines no ceremonial `dispose()` method. `HeroContentComponent` allocates a `2000 ms` `setInterval` handle (`this._envTimer`) and clears it in `destroy()`, which `CubicalApp.clear()` and `AppEntry.destroy()` invoke.

## State store and global namespace ownership

`PR-GQC-04` maps every state store and global namespace to its concrete callers without merging unrelated Redux stores.

| Store or coordinator | Source path | Slices or state | Active callers | Owner | GQC-04 decision |
| --- | --- | --- | --- | --- | --- |
| Responsive Lab runtime | `js/harness/lab-runtime.js` | `stage`, `membrane`, `recorder`, `registry`, `workflow`, mounted island set | `src/pages/responsive-lab.astro` and all seven `src/islands/*.jsx` files | Architect, TEA, and Dev | Retained as the single browser coordinator backing `window.__lab` |
| Guided SPA workflow model | `js/harness/spa-test-workflow.js` | Five-step tab state, target classification, live iframe Place observer, capture completeness, optional module warnings | `src/islands/SpaTestWorkflow.jsx` and `window.__lab.workflow` | Product Manager, Architect, and TEA | Mounted by `SpaTestWorkflow` and exposed under `window.__lab.workflow` without adding a new top-level global |
| CLM Redux store | `js/redux/store.js` | `clm`, `auth`, `ui`, `navigation` (`window.__REDUX_STORE__`) | `js/renderers/index.js` and CLM isolation docs | Architect | Kept separate. zero Astro workbench pages import `js/redux/store.js` |
| Feature demo Redux store | `js/store/store.js` | `auth`, `music`, `room` | `js/modules/auth-manager.js`, `js/modules/webrtc-dashboard/index.html`, `public/examples/Music/SyncedMusicVisualizerV2..V5.html` | Dev | Kept separate. zero Astro workbench pages share user state with `js/redux/store.js` |
| Mission Control MCard store | `public/js/mcard-kernel/MCardManager.js` | IndexedDB card cache and view state (`window.mcardManager`) | `src/pages/app.astro` via `/public/js/app-bootstrap.js?v=18` | Product Manager | Retained on `astro-wrapped` `app.html` until Product Manager classifies Mission Control |

## Seam evaluation and interface decision

`GQC-04.3` requires evaluating whether a shared module seam earns extraction across at least two real callers.

### Cross-page audit

`GQC-00-consumer-map.md` shows that `responsive-lab.html`, `index.html?noredirect=1`, and `app.html` run disjoint user journeys and disjoint runtime modules. Byte-identical browser and `packages/*` copies (`js/pkc-core.js` vs `packages/core/src/pkc-core.js`, `js/modules/p2p-serverless/*` vs `packages/p2p/src/*`) belong to `SPRINT-GQC-07` workspace consolidation rather than GUI composition. No cross-page module extraction is warranted in `PR-GQC-04`.

### Two options for the Lab guide and net-handoff seam

Within `responsive-lab.html`, two execution environments share target-net validation and normalization logic: `src/pages/responsive-lab.astro` frontmatter running in Node and `src/islands/SpaTestWorkflow.jsx` running in Chromium. Two interface designs were compared:

1. **Option A (selected).** Place pure functions `assertDisjointNetIds(workbenchEnvelope, targetEnvelope)`, `serializeTargetNetEnvelope(targetEnvelope)`, and `resolveStepIdForKey(key, currentStepId)` directly inside `js/harness/spa-test-workflow.js` alongside `createSpaTestWorkflow(deps)`. `src/pages/responsive-lab.astro` imports `assertDisjointNetIds` and `serializeTargetNetEnvelope` in Node frontmatter, validates `src/net/workbench-net.yaml` and `tests/fixtures/spa-test-target.graph.json` via `scripts/check-net.mjs` and `Layer4TrellisNavigationNet`, and passes plain JSON `targetNets` props to `SpaTestWorkflow.jsx`. `SpaTestWorkflow.jsx` constructs `createSpaTestWorkflow` with injected `membrane`, `stage`, `registry`, and `recorder` dependencies from `lab-runtime.js`.
2. **Option B (rejected).** Extract a separate `js/harness/target-net-bridge.js` wrapper file plus a second `TargetNetInspectorIsland` Preact island that forwards target net state to the workflow view. Rejected because `target-net-bridge.js` would be a thin pass-through layer over `spa-test-workflow.js`, and a prop-forwarding island violates the `SPRINT-GQC-04` Architect rule of one owner per independently interactive region.

### Interface contract of js/harness/spa-test-workflow.js

- **Inputs.** `targetNets` plain JSON map keyed by normalized target path, plus injected `membrane`, `stage`, `registry`, `recorder`, `selectTarget`, `recoverTarget`, `selectDevicePreset`, `documentRef`, and `moduleLoader` dependencies.
- **Outputs.** Immutable state snapshots via `getState()` and `subscribe(listener)`, target navigation trace via `targetTrace()`, initialization timing via `metrics()`, and optional extension loader `loadOptionalModules(descriptors)`.
- **Ordering.** Steps follow `WORKFLOW_STEPS` (`step-target`, `step-device`, `step-places`, `step-transitions`, `step-evidence`), while roving-tab selection allows keyboard inspection in any order without mutating the target iframe URL.
- **Errors.** Blocked origins (`p_error_target_blocked`), unapproved external targets (`p_error_target_unapproved`), unavailable capture channels (`p_error_capture_unavailable`), unmapped SPA transitions (`p_spa_missing_transition`), interrupted captures (`Incomplete Capture`), and optional module load failures (`moduleWarnings`) surface explicit state fields and ARIA announcements.
- **Cleanup.** `destroy()` disconnects the iframe `MutationObserver`, removes iframe `load` and `document` custom-event listeners, unsubscribes `membrane`, `stage`, `registry`, and `recorder` callbacks, stops optional modules via `PKC.stop()`, and clears subscriber sets.

## Guided SPA workflow and Petri net mapping

All five workflow tabs render inside Place `p_page_responsive_lab` of `src/net/workbench-net.yaml`. Selecting a step tab updates view state inside `p_page_responsive_lab`. Actions within a step that fetch configuration, enforce target policy, probe a cross-origin target, fetch conformance history, or persist a test run fire existing declared workbench Transitions.

| Step ID | Visible tab label | Workbench Place | Workbench Transitions triggered by step actions | Target net (`spa-test-target-net`) Places and Transitions observed |
| --- | --- | --- | --- | --- |
| `step-target` | `1. Target` | `p_page_responsive_lab` | `t_req_get_app_config`, `t_ok_get_app_config`, `t_fail_get_app_config`, `t_enter_target_blocked`, `t_recover_target_blocked`, `t_enter_target_unapproved`, `t_recover_target_unapproved`, `t_enter_capture_unavailable`, `t_recover_capture_unavailable`, `t_req_probe_handshake`, `t_ok_probe_handshake`, `t_timeout_probe_handshake` | Binds `p_spa_overview` when `/tests/fixtures/spa-test-target.html` is selected. marks `app.html` as `webapp` and `index.html` as `mpa-candidate` (`Optional / Deferred`) |
| `step-device` | `2. Device` | `p_page_responsive_lab` | `t_req_get_conformance_latest`, `t_ok_get_conformance_latest`, `t_fail_get_conformance_latest` | Verifies `p_spa_overview` or `p_spa_details` and `data-boot-nonce` conservation across `iphone-16-pro`, `ipad-air-11`, and orientation rotation |
| `step-places` | `3. Pages & Places` | `p_page_responsive_lab` | Pure read of serialized `targetNets` props and live DOM observer | Displays `p_spa_overview` (`page_spa_overview`), `p_spa_details` (`page_spa_details`), and `p_spa_missing_transition` (`page_spa_missing_transition`) with distinct `routeHandle` and `clmTypeUri` columns |
| `step-transitions` | `4. Links & Transitions` | `p_page_responsive_lab` | Pure observation of target iframe interactions | Tracks `t_spa_open_details` (`p_spa_overview` to `p_spa_details`), `t_spa_back_overview` (`p_spa_details` to `p_spa_overview`), `t_spa_invalid_unmapped` (trapped in `Error: p_spa_missing_transition` without incrementing `Valid Navigations`), and `t_spa_recover_overview` |
| `step-evidence` | `5. Capture & Evidence` | `p_page_responsive_lab` | `t_req_post_test_runs`, `t_ok_post_test_runs`, `t_fail_post_test_runs`, `t_recover_post_test_runs` | Seals ERB events into closed `responsive_test_run:v1` MCard payload, displays MCard `handle` and Blake3 `hash`, flags interrupted runs as `Incomplete Capture (Not Pass / Not Certified)`, and notes `SPRINT-GQC-05` `navigation_run_link:v1` provenance |

In `src/pages/responsive-lab.astro`, Node frontmatter instantiates `new Layer4TrellisNavigationNet()` from `clm-kernel` to verify that `link_spa_open_details` commits `p_spa_details` and `link_spa_invalid_unmapped` traps into `p_error_modal` when `clmTypeUri` values remain distinct from `mcard:target:...` route handles.

## Verification, lifecycle audit, and performance evidence

### Automated test gates

- `npm run build` exited `0` and emitted `12` client JavaScript chunks under `dist/client/_astro/` with `0` matches for `clm-kernel`.
- `npm run check:net` exited `0` on `src/net/workbench-net.yaml` and `tests/fixtures/spa-test-target.graph.json`.
- `npm run test:unit` passed `158` tests (`0` failures), including `6` lifecycle tests in `tests/unit/pkc-lifecycle.test.mjs` and `5` workflow tests in `tests/unit/spa-test-workflow.test.mjs`.
- `npm run check:playwright-discovery` exited `0`.
- `npx playwright test tests/features/spa-test-workbench.spec.js --project=features` passed `3 of 3` end-to-end tests, replaying recorded traces through both `workbench-net.yaml` and `spa-test-target.graph.json` via `ColoredPetriVM` and replaying persisted MCard runs via `replayRun()`.
- `npx playwright test tests/features/responsive-lab-islands.spec.js --project=features` passed `9 of 9` tests, including 50 full unmount and remount cycles across all seven islands with `0` net listener, `ResizeObserver`, `setInterval`, or `setTimeout` growth.
- `npm run test:smoke` passed `30 of 30` tests and `npm run test:components` passed `18 of 18` tests.
- Live 10-lane Chromium verification (`/tmp/swarm-PR-GQC-04/lanes-all.json` and `/tmp/swarm-PR-GQC-04/worker-1/lane-1.png` through `lane-10.png`) passed `10 of 10` lanes with `0` uncaught page or console errors.

### Paired cold-load performance benchmark

Measured on an Apple M4 Max (16 cores, Node `v24.21.0`) using 2 warmup pairs followed by 10 interleaved cold Chromium contexts alternating between unmodified trunk (`c402d86`) and head (`PR-GQC-04`) on `/responsive-lab.html?target=/tests/fixtures/spa-test-target.html` with external non-loopback network stubs (`/tmp/swarm-PR-GQC-04/perf-results.json`):

| Build | Runs | Hydrated of total islands | Cold JS bundles | Cold decoded JS bytes | `responseEnd` p50 and p75 (ms) | `readyMs` p50 (ms) | `readyMs` p75 (ms) | `readyMs` min..max (ms) | `guideInitMs` p50 and p75 (ms) | Errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Trunk (`c402d86`) | `10` | `4 of 6` | `8` | `102,247 B` | `1.70 and 1.77` | `236.75` | `252.75` | `235.17..253.96` | n/a | `0` |
| Head (`PR-GQC-04`) | `10` | `5 of 7` | `9` | `137,032 B` | `1.70 and 1.80` | `253.39` | `254.23` | `237.31..254.54` | `0.10 and 0.18` | `0` |

**Verdict and limiter.** `readyMs` shows no practical difference at p75 (`+1.48 ms`, `+0.59%`, overlapping ranges `235.17..253.96 ms` on trunk versus `237.31..254.54 ms` on head) and steps by `+16.64 ms` at p50 (one `16.67 ms` 60 Hz frame tick), well inside the `+10%` and `+100 ms` advisory budget. `SpaTestWorkflow` initialization (`guideInitMs`) takes `0.10 ms` at p50 (`0.10..0.20 ms`). A separate Chrome DevTools Protocol CPU and Performance profile run (`253.65 ms` total wall time) recorded `5.46 ms` of `ScriptDuration` (`6` of `189` CPU samples in `/_astro/*.js`) and `37.34 ms` of `LayoutDuration`, while `175` of `189` samples (`92.6%`) sat idle waiting on headless Chromium 60 Hz `requestAnimationFrame` ticks (`67.95 ms` between `DOMContentLoaded` at `170.64 ms` and the two-frame `lab-booting` barrier in `js/harness/lab-runtime.js`, plus sub-document `#mission-control-iframe` commit). Frame-cadence synchronization, rather than JavaScript execution, bounds cold boot latency.
