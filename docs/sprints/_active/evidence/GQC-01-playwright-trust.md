# GQC-01 Playwright Trust Foundation Evidence

## Metadata

- Sprint ID `SPRINT-GQC-01`
- Execution Unit `PR-GQC-01`
- Trunk Baseline Commit `843cf65`
- Head Base Commit `4c214a9`
- Node Runtime `v24.21.0` (CI pinned to Node `24`)
- Playwright Version `1.63.0`

## 1. Module Format Proof and Migration (GQC-01.1)

`package.json` declares `"type": "module"`. All 14 component specs under `tests/components/`, `tests/smoke/clm-dashboard.spec.js`, and shared helpers under `tests/fixtures/` (`server-contract.js`, `test-config.js`, `clm-helpers.js`) now use pure ES modules (`*.spec.js` and `*.js`).

| Phase | Command | Exit Status | Result |
| --- | --- | --- | --- |
| Pre-migration baseline | `npx playwright test tests/components/test-clm-welcome.spec.cjs --project=components` | `1` | `Error No tests found` |
| Pre-migration discovery gate | `npm run check:playwright-discovery` | `1` | `components discovered 0 tests in 0 files and has no approved exception` |
| Single-spec ESM proof | `npx playwright test tests/components/test-clm-welcome.spec.js --project=components` | `0` | `3 passed (6.0s)` |
| Full component suite | `npx playwright test --project=components` | `0` | `18 passed (8.1s)` across all 14 spec files |

`stubExternalComponentRequests` in `tests/fixtures/clm-helpers.js` intercepts external embeds, third-party APIs, and Grafana Faro collectors at the Playwright route boundary while serving local ESM bundles for `redux-thunk`, `immer`, and `reselect`.

## 2. Project Discovery and Partitioning (GQC-01.2)

`playwright.config.js` defines three disjoint category projects and removes the catch-all `chromium` and duplicate `presentation-lattice` projects. `KNOWN_ZERO_TEST_EXCEPTIONS` in `scripts/check-playwright-discovery.mjs` is now empty (`{}`).

| Project | Directory | Spec Files | Discovered Tests | Mode |
| --- | --- | --- | --- | --- |
| `smoke` | `tests/smoke/` | 11 | 30 | Default + PR |
| `components` | `tests/components/` | 14 | 18 | Default + PR |
| `features` | `tests/features/` | 17 | 557 | Default + PR |
| **Total Default** | `tests/` | **42 unique** | **605** | `npx playwright test --list` |
| `smoke-firefox` | `tests/smoke/` | 11 (repeat) | 30 | `PW_CROSS_BROWSER=1` |
| `smoke-webkit` | `tests/smoke/` | 11 (repeat) | 30 | `PW_CROSS_BROWSER=1` |

`tests/smoke/clm-dashboard.spec.js` belongs to `smoke`, preserving exact 14-file ownership in `components`. Unassigned zero-test projects fail `runPlaywrightDiscovery` and name the offending project (`GQC-01-UNIT-01`).

## 3. Server, Port, and Database Isolation Contract (GQC-01.3)

`tests/fixtures/server-contract.js` centralizes runtime server configuration for both `playwright.config.js` and `tests/fixtures/test-config.js`.

| Setting | Default Value | Override Mechanism | Purpose |
| --- | --- | --- | --- |
| Standalone Express port | `3000` | `PORT` | Default `node ws-server.js` developer port |
| Playwright test port | `3001` | `TEST_PORT` | Default `baseURL` (`http://localhost:3001`) |
| Astro migration port | `4322` | `TEST_PORT=4322` | Reserved `astro dev` port for `GQC-02B` |
| Server boot command | `node ws-server.js` | `TEST_SERVER_COMMAND` | Single-value switch for `GQC-02B` Astro host |
| Readiness probe | `http://localhost:3001/health` | `BASE_URL` / `TEST_PORT` | HTTP 200 readiness check |
| Server reuse | `false` | `PW_REUSE_SERVER=1` (non-CI only) | Blocks accidental foreign server reuse |
| SQLite store | Temp dir per run | `MCARD_DB_PATH` | Prevents writes to `data/mcard-api.db` |

`server-contract.js` registers a Node 24 `module.registerHooks` preload via `NODE_OPTIONS` so `ws-server.js` redirects `server/mcard-api.mjs` away from `data/mcard-api.db` without modifying production server files. Pointing `MCARD_DB_PATH` at `data/mcard-api.db` throws immediately (`GQC-01-UNIT-03`).

## 4. Root HTML Characterization Matrix (GQC-01.6)

Each root HTML page from the `GQC-00` census has one URL-level characterization spec under `tests/smoke/` registered in `tests/gui-coverage.json` and `ROOT_PAGE_CHARACTERIZATIONS` for `GQC-02A` site-net import.

| Root HTML File | Spec Path | Route Asserted | HTTP | Primary Landmarks | Outgoing Same-Origin Links |
| --- | --- | --- | --- | --- | --- |
| `index.html` | `tests/smoke/root-index.spec.js` | `/`, `/index.html` -> `/responsive-lab.html`; `/?noredirect=1`, `/index.html?noredirect=1` | `200` | `navigation` (`#penpot-site-nav`), `region` (`#single-page-mcard-host`) | `/`, `/app.html`, `/index.html`, `/responsive-lab.html` |
| `responsive-lab.html` | `tests/smoke/root-responsive-lab.spec.js` | `/responsive-lab.html` | `200` | `main#lab-stage-container`, `#lab-main-heading` | `/`, `/app.html` |
| `app.html` | `tests/smoke/root-app.spec.js` | `/app.html` | `200` | `h1` (`MCard Manager`), `#sidebar`, `.main-content` | None |
| `fiber-conformance.html` | `tests/smoke/root-fiber-conformance.spec.js` | `/fiber-conformance.html` | `200` | `main#harness` | None |
| `fiber-inspector.html` | `tests/smoke/root-fiber-inspector.spec.js` | `/fiber-inspector.html` | `200` | `main#inspector`, `h1` (`Fiber Inspector`) | None |
| `sprint-registry.html` | `tests/smoke/root-sprint-registry.spec.js` | `/sprint-registry.html` | `200` | `main`, `h1` (`CLM Sprint Registry`), `#sprint-grid` | None |
| `pkc-docs-index.html` | `tests/smoke/root-pkc-docs-index.spec.js` | `/pkc-docs-index.html` | `200` | `h1` (`PKC Design Documents`) | 5 `/pkc-viewer.html?doc=...` links |

 During smoke triage (`GQC-01.4`), `tests/smoke/landing-page.spec.js` was updated to assert the approved `/` redirect to `/responsive-lab.html` and `?noredirect=1` portal landmarks across 5 tests, and `tests/smoke/apps-menu.spec.js` was updated to target `/app.html` and exercise `window.viewManager` plus `Close` controls across all 5 embedded views.

## 5. Retry, Browser Matrix, Snapshot, and Unit Test Policies (GQC-01.4, GQC-01.5)

- **Retry policy (`RETRY_POLICY`)** sets global `retries` to `0`. `smoke` and `components` run with `0` retries locally and in CI (owner `TEA`). `features` runs with `0` local retries and `1` CI retry owned by `TEA (SPRINT-GQC-02)` until legacy wall-clock waits and multi-context WebRTC handshakes are refactored in `SPRINT-GQC-02`.
- **Browser matrix (`BROWSER_MATRIX`)** runs `Desktop Chrome` on pull requests across all three category projects and `Desktop Chrome`, `Desktop Firefox`, and `Desktop Safari` on scheduled or dispatched smoke runs (`PW_CROSS_BROWSER=1`).
- **Snapshot baseline policy (`SNAPSHOT_POLICY`)** is owned by `Architect and TEA`. Committed PNG baselines under `tests/features/fiber-conformance.spec.js-snapshots/` target `darwin`. Non-Darwin runners set `ignoreSnapshots` to `true` so Ubuntu CI executes all DOM and structural assertions without missing-baseline errors.
- **Unit and observability suite (`npm run test:unit`)** converted `tests/observability/alignment.test.js` and `tests/observability/correctness.test.js` from uninstalled `vitest` imports to `node:test` and `node:assert/strict`. `npm run test:unit` executes **121 tests across 14 suites with 0 failures**.
- **CI workflows** updated `.github/workflows/clm-test-all-components.yml` (Node 24, `npm ci`, `tests/components/test-clm-*.spec.js`, `--project=components`, no `continue-on-error`, no Git result commits, artifact upload enabled, `deploy-to-test` condition unchanged) and added `.github/workflows/playwright-quality.yml` (Stage 1 discovery + unit, Stage 2 smoke + components, Stage 3 features, plus scheduled/dispatch cross-browser smoke).

## 6. Ten-Lane Live Verification Summary

All 10 live verification lanes executed against real Chromium processes with visual artifacts stored in `/tmp/swarm-PR-GQC-01/worker-1/lane-1.png` through `lane-10.png`.

| Lane | Verification Scope | Exit Status | Observed Outcome | Screenshot |
| --- | --- | --- | --- | --- |
| 1 | Trunk (`843cf65`) vs Head workbench entry parity (`/` and `/index.html?noredirect=1`) | `0` | Identical redirect target (`/responsive-lab.html`), titles, and landmarks | `lane-1.png` |
| 2 | Full `npx playwright test --project=components` run | `0` | 14 spec files, 18/18 tests passed in 8.5s | `lane-2.png` |
| 3 | `features` partition `--list` audit + live `sprint-registry` and `fiber-inspector` specs | `0` | 557 tests in 17 files, zero overlap; 11/11 live assertions passed in 2.2s | `lane-3.png` |
| 4 | Full `npx playwright test --project=smoke` run | `0` | 11 spec files, 30/30 tests passed in 21.8s | `lane-4.png` |
| 5 | Disposable `/tmp` failing spec under `CI=1` | `1` (expected) | Non-zero exit; emitted failure PNG, `trace.zip`, `junit.xml`, and HTML report | `lane-5.png` |
| 6 | Cold `webServer` boot on closed `TEST_PORT=3207` via `/health` | `0` | Port closed before and after run; 6/6 smoke tests passed in 2.2s | `lane-6.png` |
| 7 | Foreign HTTP server occupying `TEST_PORT=3208` under `CI=1` | `1` (expected) | Refused foreign server before running any spec | `lane-7.png` |
| 8 | Two-run `MCARD_DB_PATH` isolation + `data/mcard-api.db` SHA-256 check | `0` | Run 2 started unbound (`404`, zero state leak); repo DB SHA-256 unchanged (`896d1894...f7ff`) | `lane-8.png` |
| 9 | Desktop Chrome smoke subset (`root-index`, `root-responsive-lab`) | `0` | 3/3 passed in 1.6s at `1280x720` viewport | `lane-9.png` |
| 10 | Documented `npm run test:smoke` and `npm run test:components` | `0` | `30 passed (21.9s)` and `18 passed (8.0s)` | `lane-10.png` |

## 7. Paired Trunk-vs-Head Performance Benchmark

Measured on Apple M4 Max (16 cores, Darwin arm64, Node `v24.21.0`) with 1 discarded warmup per server, 3 cold `webServer` startup-to-`/health` boots per side, and 10 interleaved cold `BrowserContext` navigations per route (`0` HTTP or assertion errors; raw samples in `/tmp/swarm-PR-GQC-01/perf-results.json`).

| Metric | Trunk `843cf65` p50 | Trunk p95 | Head `PR-GQC-01` p50 | Head p95 | p50 Delta |
| --- | --- | --- | --- | --- | --- |
| `webServer` startup to `GET /health` (3 boots) | 137.10 ms | 140.00 ms | 135.99 ms | 136.31 ms | -1.11 ms |
| Cold navigation `/responsive-lab.html` -> `main#lab-stage-container` (n=10) | 352.94 ms | 359.95 ms | 352.43 ms | 480.64 ms | -0.51 ms (-0.14%) |
| Cold navigation `/index.html?noredirect=1` -> `#mcard-sovereign-pill` (n=10) | 44.40 ms | 45.79 ms | 44.79 ms | 46.20 ms | +0.39 ms (+0.88%) |

## 8. Remaining Flake Risks for SPRINT-GQC-02

- Legacy specs under `tests/features/` retain wall-clock `waitForTimeout` calls and multi-tab WebRTC ICE timing dependencies; `RETRY_POLICY` bounds this to `1` CI retry on `features` under owner `TEA (SPRINT-GQC-02)`.
- `tests/features/penpot-navigation.spec.js` navigates to `/index.html` expecting pre-redirect portal DOM without `?noredirect=1`; `GQC-02A` owns feature-level transition alignment against the site Petri net.
