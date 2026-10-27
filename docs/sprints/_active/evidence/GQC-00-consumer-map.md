# Project census and consumer map

## Metadata

- Sprint ID is `SPRINT-GQC-00`.
- Execution unit is `PR-GQC-00`.
- Observed trunk anchor is `843cf65`.
- Coverage registry artifact is `tests/gui-coverage.json`.
- Kernel probe artifact is `docs/sprints/_active/evidence/GQC-00-layer4-api-probe.md`.
- Astro and performance baseline artifact is `docs/sprints/_active/evidence/GQC-00-astro-readiness.md`.

## Surface taxonomy and separation rules

The repository contains three distinct UI roles that must never be conflated:

1. **Workbench pages.** `responsive-lab.html` and top-level `index.html` host the testing controls, viewport stage, target selector, recording ribbon, and conformance panel.
2. **Single-page MCard viewer.** `index.html?noredirect=1` mounts `js/landing-page-mcard.js` to inspect four MCard content modalities (`markdown`, `TextMarkup`, `webapp`, and `binary`). Viewing an MCard card is not SPA route-graph testing.
3. **Target applications.** The iframe `#mission-control-iframe` inside `responsive-lab.html` loads a target application under test. A target application has its own Petri net of Pages (Places) and Functional Links (Transitions), separate from the workbench net and separate from LandingPage's `js/nav.js`.

## HTML census across the repository

Excluding `node_modules`, `playwright-report`, and `test-results`, the repository contains 75 HTML files across six directories:

| Directory | File count | Product classification | Notes |
| --- | --- | --- | --- |
| Repository root (`/*.html`) | 7 | 2 P0 workbench pages, 1 unclassified legacy page, 3 tombstoned internal diagnostics, 1 tombstoned legacy catalog | Listed individually in the root inventory table below. |
| `public/**/*.html` | 27 | 1 probe fixture, 4 legacy utilities, 3 auth game popup wrappers, 19 demo catalog pages | Candidate workbench Places cataloged in `GQC-00-astro-readiness.md`; all outside the P0 SPA denominator. |
| `components/*.html` | 17 | CLM component isolation fragments | Loaded by `js/clm-iframe-loader.js` and `/api/clm/registry`; paired with 14 undiscovered `tests/components/*.spec.cjs` files owned by `SPRINT-GQC-01`. |
| `archive/html/*.html` | 14 | Historical archived pages | Retained as non-runtime history (`mcard-manager.html`, `index-clm.html`, `pkc-viewer.html`, and 11 sibling snapshots). |
| `tests/fixtures/*.html` | 4 | Deterministic test probe fixtures | `probe-target.html`, `probe-target-noagent.html`, `conformance-good.html`, and `conformance-bad.html`. |
| `js/modules/**` and `packages/p2p/src/**` | 6 | Standalone module developer harnesses | `js/modules/p2p-serverless/{debug-test,example}.html`, `packages/p2p/src/{debug-test,example}.html`, `js/modules/video-meeting/index.html`, and `js/modules/webrtc-dashboard/index.html`. |

### Root HTML and PenPot route inventory

| File | Surface kind | Target type | Place ID | Route handle | CLM type URI | Owner | Primary journey | Support status and docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `responsive-lab.html` | `workbench` | `workbench` | `p_workbench_responsive_lab` | `mcard:route:/responsive-lab.html` | `clm://type/view/workbench/responsive-lab` | Product Manager and TEA | `workbench-lab-shell` | Approved P0 workbench (`SPRINT-GQC-00-project-census-and-behavior-baseline.md`). |
| `index.html` | `workbench` | `workbench` | `p_workbench_landing_portal` | `mcard:route:/index.html` | `clm://type/view/workbench/landing-portal` | Product Manager and UX Designer | `workbench-entry-redirect` and `single-page-mcard-viewer` | Approved P0 workbench entry redirecting `/` to `responsive-lab.html` (`index.html:12-14`), plus SMO viewer at `?noredirect=1`. |
| `app.html` | `workbench` and default `target` | `undecided` | `p_legacy_mission_control` / `p_target_unclassified_app` | `mcard:route:/app.html` / `mcard:target:/app.html` | `clm://type/view/legacy/mission-control` | Product Manager | `legacy-mission-control-characterization` | Tombstoned in `retired-islands.yaml:134-171`; remains unclassified until Product Manager decision in `SPRINT-GQC-00`. |
| `fiber-conformance.html` | `workbench` | `internal-diagnostic` | `p_diag_fiber_conformance` | `mcard:route:/fiber-conformance.html` | `clm://type/view/diagnostic/fiber-conformance` | Architect | `diagnostic-fiber-conformance` | Tombstoned internal diagnostic (`retired-islands.yaml:70-92`). |
| `fiber-inspector.html` | `workbench` | `internal-diagnostic` | `p_diag_fiber_inspector` | `mcard:route:/fiber-inspector.html` | `clm://type/view/diagnostic/fiber-inspector` | Architect | `diagnostic-fiber-inspector` | Tombstoned internal diagnostic (`retired-islands.yaml:94-114`). |
| `sprint-registry.html` | `workbench` | `internal-diagnostic` | `p_diag_sprint_registry` | `mcard:route:/sprint-registry.html` | `clm://type/view/diagnostic/sprint-registry` | Scrum Master | `diagnostic-sprint-registry` | Tombstoned internal planning projection (`retired-islands.yaml:116-132`). |
| `pkc-docs-index.html` | `workbench` | `legacy-catalog` | `p_legacy_pkc_docs_index` | `mcard:route:/pkc-docs-index.html` | `clm://type/view/legacy/pkc-docs-index` | Product Manager | `legacy-pkc-docs-catalog` | Tombstoned legacy catalog (`retired-islands.yaml:172-192`); lines 122, 132, 142, 152, and 162 link to missing root `pkc-viewer.html` (archived at `archive/html/pkc-viewer.html` and componentized at `components/pkc-viewer.html`). |

### PenPot navigation inventory

`design/landing-navigation.penpot` generates `js/nav.js` with `PENPOT_GRAPH_HASH` `7fc5562f37de5880c28963dfbfeb7b976cafb6feb6e8698078528a9d63a41fb4` and `PENPOT_ARCHIVE_HASH` `e4d0e5fd22a754d51d60c7609cfefc92249b93b53edf5826cbfb1e57548f18ad`. It defines 3 LandingPage frames and 4 click interactions:

- `d7570000-0000-8000-8000-000000000011` (`Home`, `index.html`, starting frame) links to `app.html` (`Mission Control`) and `responsive-lab.html` (`Responsive UI Lab`).
- `d7570000-0000-8000-8000-000000000012` (`Mission Control`, `app.html`) links back to `index.html` (`Home`).
- `d7570000-0000-8000-8000-000000000013` (`Responsive UI Lab`, `responsive-lab.html`) links back to `index.html` (`Home`).

This graph describes LandingPage workbench routes only. External MPA target assessment via PenPot is marked `optional` (`targetType: "mpa-candidate"`), excluded from the P0 SPA coverage denominator, and deferred to `SPRINT-GQC-05`.

### Responsive Lab target and fixture inventory

| Target URL or path | Source | Target type | Place ID | Owner | Support status |
| --- | --- | --- | --- | --- | --- |
| `tests/fixtures/spa-test-target.html` | Planned in `SPRINT-GQC-02` | `spa` | `p_target_spa_home`, `p_target_spa_details`, `p_error_modal` | Product Manager and TEA | Approved P0 deterministic SPA fixture (`status: "planned-gqc-02"`). |
| `app.html` | `app-config.json:4-8` | `undecided` | `p_target_unclassified_app` | Product Manager | Current default `labTarget`; unclassified, excluded from P0 SPA denominator. |
| `index.html` | `app-config.json:10-14` | `webapp` | `p_target_portal_viewer` | Product Manager | Portal 4-modality MCard viewer when embedded in iframe; not an SPA target. |
| `http://localhost:4321/` | `app-config.json:16-20` | `undecided` | `p_target_ext_4321` | Product Manager | Unclassified external local origin; policy owned by `SPRINT-GQC-03`. |
| `http://127.0.0.1:5320/` | `app-config.json:22-26` | `undecided` | `p_target_ext_5320` | Product Manager | Unclassified MCard Studio external origin; policy owned by `SPRINT-GQC-03`. |
| `http://127.0.0.1:3001/tests/fixtures/probe-target.html` | `app-config.json:28-32` and `tests/fixtures/probe-target.html` | `probe-fixture` | `p_target_probe_agent` | TEA | Active cross-origin capture and replay probe fixture with `lab-probe-agent.js`. |
| `http://127.0.0.1:3001/tests/fixtures/probe-target-noagent.html` | `app-config.json:34-38` and `tests/fixtures/probe-target-noagent.html` | `probe-fixture` | `p_target_probe_noagent` | TEA | Active cross-origin fallback probe fixture without agent. |
| `tests/fixtures/conformance-good.html` | `tests/features/device-conformance.spec.js` | `probe-fixture` | `p_target_conformance_good` | TEA | Active positive conformance fixture. |
| `tests/fixtures/conformance-bad.html` | `tests/features/device-conformance.spec.js` | `probe-fixture` | `p_target_conformance_bad` | TEA | Active negative conformance violation fixture. |
| `public/conformance/membrane-probe.html` | `fiber-conformance.html:141` | `probe-fixture` | `p_target_membrane_probe` | Architect | Active fiber conformance membrane probe fixture. |
| `https://github.com`, `https://www.google.com`, `https://developer.mozilla.org` | `app-config.json:40-59` | `undecided` | `p_target_blocked_github`, `p_target_blocked_google`, `p_target_blocked_mdn` | Product Manager and UX Designer | Blocked external reference targets; `ws-server.js:56-68` currently adds their origins to CORS (`SPRINT-GQC-03` security fix). |

## Application-level Petri net and MCard schema contract

- **Target Page to Place mapping.** Every approved target Page or View maps to a CLM Layer 1 Place (exposed through the optional Layer 4 `ViewPlaceMCard` facade). Every Functional Link maps to a Transition with `fromPlaceId`, `action`, and `toPlaceId` (or `p_error_modal` for invalid actions).
- **Identifier separation.** Place IDs (`p_target_spa_home`), route handles (`mcard:target:/tests/fixtures/spa-test-target.html#home` or `mcard:route:/index.html`), CLM type URIs (`clm://type/view/target/spa-fixture-home`), MCard Blake3 content hashes, and `PENPOT_GRAPH_HASH` remain separate fields. Passing `mcard:route:/index.html` as a CLM type URI bails to `p_error_modal` during `LOADING` (see `GQC-00-layer4-api-probe.md`).
- **Closed `responsive_test_run:v1` schema.** `js/harness/test-run-schema.js:14-27` enforces a closed 12-key top-level set (`schema`, `sessionId`, `target`, `captureSource`, `device`, `orientation`, `fidelity`, `lab`, `metrics`, `telemetry`, `finalState`, and `events`) and rejects unknown top-level keys (`js/harness/test-run-schema.js:126-130`). `responsive_test_run:v1` remains unchanged; `SPRINT-GQC-05` links navigation net provenance through a separate `navigation_run_link:v1` MCard.

## P0 SPA workbench journey and TEA risk matrix

The P0 SPA coverage denominator comprises exactly 2 journeys (`guided-spa-test` and `spa-failure-recovery`) on the planned deterministic fixture `tests/fixtures/spa-test-target.html` (`SPRINT-GQC-02`):

| Journey step | Workbench and harness modules | Existing or planned tests | Playwright project | Visible outcome | TEA risk category and sprint owner |
| --- | --- | --- | --- | --- | --- |
| 1. Select SPA target | `responsive-lab.html`, `js/harness/lab-toolbar.js`, `js/harness/target-membrane.js`, `app-config.json` | `tests/unit/target-membrane.test.mjs`; planned `tests/features/spa-workbench-journey.spec.js` | `features` | `#public-site-selector` updates `#mission-control-iframe` and status pill. | **Security** (`SPRINT-GQC-03`) empty `allowedOrigins` in `createCaptureSource` fails open; static `app-config.json` shadows `ws-server.js:367`. |
| 2. Choose device and viewport | `js/device-registry.js`, `js/harness/device-presets-ui.js`, `js/harness/viewport-stage.js` | `tests/unit/device-registry-v2.test.mjs`, `tests/unit/viewport-geometry.test.mjs`, `tests/features/responsive-rotation-and-devices.spec.js` | `features` | `#controlled-panel-frame` resizes and swaps portrait or landscape without overflow. | **Technical** (`SPRINT-GQC-04`) `conformance-panel.js:96-97` listens on `window` while `viewport-stage.js:68` and `target-membrane.js:64` dispatch non-bubbling events on `document`. |
| 3. Exercise functional link or invalid action | `js/harness/capture-probe-agent.js`, `js/harness/lab-probe-agent.js`, `js/harness/membrane-interceptor.js` | `tests/unit/normalize-event.test.mjs`; planned `spa-workbench-journey.spec.js` and `spa-failure-recovery.spec.js` | `features` | SPA target transitions view state or surfaces deterministic error recovery UI. | **Technical and UX** (`SPRINT-GQC-02`, `SPRINT-GQC-03`) unbounded probe handshake timeout needs 5 s recovery state. |
| 4. Record and replay journey | `js/harness/recorder.js`, `js/harness/recording-ribbon.js`, `js/harness/recording-state-machine.js`, `scripts/playwright-replay-driver.mjs` | `tests/unit/recorder.test.mjs`, `tests/unit/recording-state-machine.test.mjs`, `tests/features/responsive-capture.spec.js`, `tests/features/responsive-replay.spec.js` | `features` | Recording ribbon seals event count and replay reproduces final DOM digest. | **Data** (`SPRINT-GQC-05`) `recorder.js:193` stamps `0.0.10` while `server/mcard-api.mjs:24` stamps `clm-kernel@0.0.12`. |
| 5. Inspect MCard test-run result | `server/test-run-api.mjs`, `server/mcard-api.mjs`, `js/harness/conformance-panel.js` | `tests/unit/test-run-api.test.mjs`, `tests/unit/test-run-schema.test.mjs`, `tests/unit/conformance-api.test.mjs` | `features` | `POST /api/test-runs` returns Blake3 hash and `GET /api/test-runs/:hash` returns sealed MCard JSON. | **Performance and Operations** (`SPRINT-GQC-01`, `SPRINT-GQC-06`) `clm-test-all-components.yml` uses `continue-on-error` and stale paths; frame limits conflict at 16.6, 20, and 25 ms. |

## Runtime module, package copy, renderer, and server consumer map

### Byte-identical and diverging browser vs workspace package pairs

| Browser or root path | Workspace package path | Bytes / lines | SHA-256 | Identical | Live callers and build status |
| --- | --- | --- | --- | --- | --- |
| `js/pkc-core.js` | `packages/core/src/pkc-core.js` | 4,080 / 120 | `28044be02851c73f2d71f619be876451c1794f2ef860e6e6fed1ab61ec71bc30` | Yes | Imported by `js/app-entry.js:8` and `packages/core/src/index.js:2`. `packages/core` esbuild succeeds. |
| `js/modules/markdown-renderer/index.js` | `packages/markdown-renderer/src/index.js` | 458 / 14 | `6ef063d4759a7fd35540232e827fc1631c3d31a0dbbc914e01d3ec1329babda3` | Yes | Referenced in `modules.json` and `js/app-entry.js:75`. `packages/markdown-renderer` esbuild succeeds. |
| `js/modules/p2p-serverless/config.js` | `packages/p2p/src/config.js` | 1,357 / 48 | `adb3e1a100b0a9fb97e6e814bcd2421e4523eb2245755951d4b722af498bb856` | Yes | Imported by `js/modules/p2p-serverless/index.js` and `js/modules/webrtc-dashboard/room-service.old.js:6`. |
| `js/modules/p2p-serverless/connection.js` | `packages/p2p/src/connection.js` | 11,298 / 406 | `7f63bed15ff7c2e2cb7b95575ba78f2c097a1bd9d2a77ba1095dc1bfcf261f48` | Yes | Imported by `tic-tac-toe-p2p/index.js:5`, `video-meeting/video-meeting.js:3`, and `p2p-serverless/index.js`. |
| `js/modules/p2p-serverless/discovery.js` | `packages/p2p/src/discovery.js` | 8,487 / 324 | `0c46339e4a375220832fc471211ee98bb1c453e123e82bba3da9621c999573e8` | Yes | Imported by `tic-tac-toe-p2p/index.js:6`, `video-meeting/video-meeting.js:4`, and `p2p-serverless/index.js`. |
| `js/modules/p2p-serverless/index.js` | `packages/p2p/src/index.js` | 16,273 / 547 | `96d0e04ad7dc137f16a588fd2e6b1cc218642fdbb854306bf9e8a9bd8ede09e5` | Yes | Referenced in `modules.json` and `js/app-entry.js:77`. |
| `js/modules/p2p-serverless/qr-code.js` | `packages/p2p/src/qr-code.js` | 6,375 / 225 | `c063d91e5336355c332ce0a1e5da33bc7d2857a892648599f500b5d82da94f0f` | Yes | Imported by `p2p-serverless/index.js`. |
| `js/modules/p2p-serverless/debug-test.html` | `packages/p2p/src/debug-test.html` | HTML harness | `4e1c508e913b073fcb71b55b0fa417cdcc22c94dae1bdf11ccaf828968965418` | Yes | Standalone developer harness. |
| `js/modules/p2p-serverless/example.html` | `packages/p2p/src/example.html` | HTML harness | `40b42fd0baabcc3250084d0837e75d01b9015e6e330d440c404f8d07cacf91ca` | Yes | Linked from `js/components/HeroContentComponent.js:18`. |
| Absent in `js/modules/p2p-serverless/` | `packages/p2p/src/main.js` | 440 / 13 | `1ad9cb2c99b00019fab74efbfa7f91ca2701b6e498b0f2f71a600c32bb93d4c0` | No | **Broken build baseline.** `node build.js` in `packages/p2p` exits 1 because `src/main.js:9-12` re-exports `default` from `connection.js`, `discovery.js`, `qr-code.js`, and `config.js`, which only define named exports. |
| `room-registry.mjs` | `packages/server/src/room-registry.mjs` | 3,492 / 136 | `c302da1e6649a3fd6c74a7e3835b331769067213c852c65469a0bcc9ff6825ea` | Yes | Imported by `ws-server.js:21`, `packages/server/src/ws-server.js:21`, and `packages/server/src/index.js:3`. |
| `ws-server.js` | `packages/server/src/ws-server.js` | 12,993 (401 lines) vs 18,594 (535 lines) | `597757cf4e187d24e08cbc9c37cfe67fcc8bc4a839e2d824898e8e41823d8dc1` vs `8c850486a016a90c04db29716110369b184313c346b43f7a1c0919c3ded777bf` | No | **Broken build baseline.** Root `ws-server.js` is the sole live server imported by `index.js`, `bin/pkc-landing.js`, `package.json#scripts.dev`, and `playwright.config.js:406`. `packages/server` has zero repo callers, comments out `mcard-api.mjs`, lacks `/api/test-runs`, and fails `esbuild` on missing `./room-message-handler-server.mjs`, `./routes/auth.js`, and `./routes/clm.js`. |

### Additional runtime entry points and rendering paths

- **`modules.json`** declares 4 browser capability entries (`markdown-renderer`, `net-gateway` pointing to `ws://localhost:3000/ws/`, `p2p-serverless`, and `tic-tac-toe-p2p`) read by `js/pkc-core.js:50`.
- **`js/app-entry.js`** imports `CubicalApp`, `PKC` (`./pkc-core.js`), and `AuthManager`, and sets `window.app` at `js/app-entry.js:90`, but **zero live root or `public/` HTML files import `js/app-entry.js`**. Root `app.html:605` instead loads `/public/js/app-bootstrap.js?v=18`, which mounts `public/js/mcard-kernel/MCardManager.js` onto `window.mcardManager`.
- **MCard rendering split.** `index.html:523` mounts `js/landing-page-mcard.js`, which classifies payloads into 4 modalities via `server/mcard-modality.mjs` and uses `js/renderers/EmbedRenderer.js` (`sandbox="allow-scripts allow-forms"`) for `webapp` cards. Separately, `js/renderers/RendererRegistry.js` registers MIME-keyed renderers (`MarkdownRenderer`, `LatexRenderer`, `PDFRenderer`, `CLMRenderer`, and media renderers) with zero direct root HTML importers outside `js/renderers/index.js`, while `app.html` uses `public/js/mcard-kernel/UIComponents.js`. `SPRINT-GQC-05` preserves the 4-modality contract separately from `RendererRegistry`.

### Root server endpoint map (`ws-server.js`)

| Mount or route | Source file and line | Purpose |
| --- | --- | --- |
| `/api/test-runs` (`POST /`, `GET /`, `GET /:hash`, `GET /latest/history`, `GET /conformance/latest`, `GET /conformance/diff`) | `ws-server.js:76`, `server/test-run-api.mjs:35-386` | Triad SQLite storage and conformance diffing for ERB test runs. |
| `/api/auth` (`POST /token`, `POST /refresh`, `POST /logout`) | `ws-server.js:110`, `routes/auth.js:38-175` | Zitadel OAuth token exchange, refresh, and logout proxy. |
| `/api/clm` (`GET /registry`, `GET /component/:id`, `GET /health/:componentId`, `POST /telemetry`, `GET /program-artifact`) | `ws-server.js:113`, `routes/clm.js:25-146` | CLM YAML registry, component metadata, health, and telemetry. |
| `/api/mcard` (`POST /`, `GET /`, `GET /landing`, `PUT /landing`, `GET /probe-url`, `GET /stats`, `GET /search`, `GET /:hash`, `GET /:hash/raw`, `DELETE /:hash`) | `ws-server.js:116`, `server/mcard-api.mjs:314-439` | Canonical Triad SQLite MCard CRUD, landing binding, and external URL membrane probe. |
| `GET /health`, `GET /api/rooms`, `GET /api/env`, `GET /api/config`, `GET /app-config.json` | `ws-server.js:321-378` | Health check, WebRTC rooms, Zitadel env, dynamic WS URL config, and shadowed dynamic `/app-config.json` route (shadowed by `express.static(__dirname)` at `ws-server.js:138`). |
| `ws://<host>:<port>/ws/` | `ws-server.js:164` | WebSocket room signaling gateway backed by `room-registry.mjs`. |

## Test discovery and project overlap baseline

Commands executed on clean checkout `c658f40` (trunk code identical to `843cf65`) on macOS Darwin arm64 with Node `v24.21.0`:

| Command | Exit code | Discovered tests | Discovered files | Notes |
| --- | --- | --- | --- | --- |
| `npm run test:unit` | 0 | 97 baseline pass (+ unit registry tests added in `PR-GQC-00`) | 14 baseline files (`13` under `tests/unit/*.test.mjs` + `tests/single-page-mcard.test.mjs`) | Excludes `tests/observability/alignment.test.js` and `tests/observability/correctness.test.js` (`SPRINT-GQC-01` assigns ownership). |
| `npx playwright test --list --project=smoke` | 0 | 16 | 3 | `apps-menu.spec.js`, `landing-page.spec.js` (stale assertion against `MCard Manager` title while `index.html` redirects to `responsive-lab.html`), and `single-page-mcard.spec.js`. Excludes `tests/smoke/clm-dashboard.spec.cjs`. |
| `npx playwright test --list --project=components` | 1 | 0 | 0 | `playwright.config.js:24` sets `testMatch: '**/*.spec.js'`, excluding all 14 `tests/components/*.spec.cjs` files. Guarded as an expiring `SPRINT-GQC-01` exception in `scripts/check-playwright-discovery.mjs`. |
| `npx playwright test --list --project=features` | 0 | 557 | 17 | Includes 60 Darwin-only snapshot PNGs under `tests/features/fiber-conformance.spec.js-snapshots/*-darwin.png`. |
| `npx playwright test --list --project=presentation-lattice` | 0 | 12 | 1 | Duplicates `tests/features/presentation-lattice.spec.js` already included in `features`. |
| `npx playwright test --list --project=chromium` | 0 | 573 | 20 | Catch-all project duplicating all 16 `smoke` tests and all 557 `features` tests. |
| `npx playwright test --list` | 0 | 1,158 | 20 unique files | Exact sum across projects is `16 + 0 + 557 + 12 + 573 = 1,158` executions over 20 unique `.spec.js` files. |

## Open decisions and BMAD resolution ledger

Every product, architecture, and test policy question has a named owner and decision sprint (cross-referenced with `DECISIONS.tsv` rows 46 through 51):

| Topic | Current status in GQC-00 | Owner | Decision sprint |
| --- | --- | --- | --- |
| Supported GUI surfaces and P0 SPA denominator | `responsive-lab.html` and `index.html` approved as P0 workbench; `guided-spa-test` and `spa-failure-recovery` on `spa-test-target.html` form the 2-journey P0 SPA denominator; `app.html` remains unclassified (`undecided`). | Product Manager and Analyst | `SPRINT-GQC-00` and `SPRINT-GQC-02` |
| PenPot MPA target assessment | Marked `optional` (`mpa-candidate`) and excluded from P0 SPA denominator; read-only adapter scope held for later review. | Product Manager and Architect | `SPRINT-GQC-05` |
| Provisional navigation regression guard (10 percent and 100 ms) | **Advisory / report-only** in `SPRINT-GQC-00` through `SPRINT-GQC-05`; no PR fails on unratified latency thresholds before 21-sample spread ratification. | TEA and Product Manager | `SPRINT-GQC-00` (advisory) and `SPRINT-GQC-06` (ratification) |
| Component `.spec.cjs` discovery, project overlap, Darwin snapshots, and CD gate | Convert `.spec.cjs` and hybrid helpers to ESM, partition non-overlapping Chromium gates, resolve Ubuntu vs Darwin snapshot policy, and require green gates before deploy. | TEA, Product Manager, and Operations | `SPRINT-GQC-01` |
| Local, Playwright, and Astro dev ports plus `publicDir` | Express default 3000, Playwright `TEST_PORT` 3001 with isolated `MCARD_DB_PATH`, Astro dev proxy 4322, and `publicDir: './astro-public'`. | Architect and TEA | `SPRINT-GQC-01`, `SPRINT-GQC-02B`, and `SPRINT-GQC-07` |
| Deterministic auth, P2P, and WebLLM test boundaries | Stub out-of-P0 external dependencies at Playwright network boundaries without mock flags in production modules. | Product Manager and TEA | `SPRINT-GQC-02` |
| Workbench Petri net Places and Transitions | Author `workbench-net.yaml` on `clm-kernel/layer1` with outer `bindings` envelope and duplicate-ID check. | Product Manager and Architect | `SPRINT-GQC-02A` |
| Astro middleware mount order, island rules, and SW dev guard | Mount `@astrojs/node` middleware in `ws-server.js` with verified fall-through, Preact islands wrapping vanilla ERB/SMO modules, client router off, and zero `clm-kernel` browser imports. | Architect and Product Manager | `SPRINT-GQC-02B` and `SPRINT-GQC-04` |
| Capture origin policy, `/app-config.json` shadowing, CORS blocked origins, and CSP | Enforce fail-closed `allowedOrigins`, hoist `/app-config.json`, drop blocked targets from CORS, and tighten wildcard CSP while preserving legacy `app.html` inline compatibility. | Product Manager, Architect, and Security Owner | `SPRINT-GQC-03` |
| Server product count, browser/package deduplication, renderer boundaries, and `responsive_test_run:v1` net linkage | Root `ws-server.js` is sole server product; keep 4-modality viewer and `RendererRegistry` distinct; link net runs via `navigation_run_link:v1` MCard; gate source consolidation on 5-part consumer matrix; unify `clm-kernel@0.0.12` provenance in `SPRINT-GQC-07`. | Architect, Product Manager, and TEA | `SPRINT-GQC-05` and `SPRINT-GQC-07` |
