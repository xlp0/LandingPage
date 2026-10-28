# LandingPage Test Suite

| Field | Value |
| --- | --- |
| Audience | Developers and QA engineers running or authoring unit, smoke, component, feature, replay, and conformance tests |
| BMAD Owner | Test Architect and Developer (`bmad-agent-dev`) |
| Source of Truth | [`playwright.config.js`](../playwright.config.js), [`package.json`](../package.json), [`tests/fixtures/server-contract.js`](./fixtures/server-contract.js), and [`tests/gui-coverage.json`](./gui-coverage.json) |
| Drift Gate | `npm run check:playwright-discovery` and `npm run docs:check` |

This directory holds `node:test` unit and observability suites plus Playwright smoke, component, and feature suites for the LandingPage workbench and its target fixtures. Earlier phase notes referencing Vitest remain un-adopted (`node:test` and Playwright are the sole canonical test runners), whereas Astro (`astro@7.4.2`) and Preact (`preact@11.1.0`) are active in the workbench host.

## Setup

```bash
npm ci
npm run install-browsers
npm run build
```

## Commands

| Command | Scope |
| --- | --- |
| `npm run check:net` | Validates Petri net topology and bindings across `src/net/workbench-net.yaml` and `tests/fixtures/spa-test-target.graph.json` |
| `node scripts/check-package-source-parity.mjs` | Verifies workspace package SHA-256 parity and zero undeclared client network calls |
| `npm run docs:check` | Verifies living documentation links, script/project flags, kernel/port consensus, net IDs, and generated `workbench-net.md` |
| `npm run check:playwright-discovery` | Verifies non-zero discovery and zero spec overlap across `smoke`, `components`, and `features` |
| `npm run test:unit` | Runs `node --test` across `tests/*.test.*`, `tests/unit/**/*.test.*`, and `tests/observability/**/*.test.*` |
| `npm run test:smoke` | Runs `--project=smoke` (11 spec files, 30 tests) |
| `npm run test:components` | Runs `--project=components` (14 spec files, 18 tests) |
| `npm run test:features` | Runs `--project=features` (23 spec files, 596 tests) |
| `npm run test:smoke:cross-browser` | Runs `smoke`, `smoke-firefox`, and `smoke-webkit` when `PW_CROSS_BROWSER=1` |
| `npm test` | Runs all three default Playwright category projects (`48` spec files, `644` tests total) |
| `npm run test:responsive` | Runs the 16-combination multi-device systematic sweep |
| `npm run test:replay` | Runs deterministic Playwright replay across 1x, 2x, 5x, and fast modes |
| `npm run test:conformance` | Runs the 15-check device conformance suite and certification checks |
| `npm run report` | Opens the HTML report from `playwright-report/` |

## GUI Coverage Registry and Reusable Fixtures

- [`tests/gui-coverage.json`](./gui-coverage.json) tracks supported workbench surfaces, target surfaces, and journey traceability without duplicating route graphs.
- [`tests/unit/gui-coverage-registry.test.mjs`](./unit/gui-coverage-registry.test.mjs) validates the registry and checks [`tests/fixtures/spa-test-target.graph.json`](./fixtures/spa-test-target.graph.json) through `clm-kernel/layer1` (`parsePetriNetYaml`, `IncidenceMatrix`, and `ColoredPetriVM`).
- [`tests/fixtures/app-fixtures.js`](./fixtures/app-fixtures.js) provides isolated browser cleanup, external boundary stubs, an isolated Canonical Triad SQLite persistence harness (`clm-kernel@0.0.13`), and the Responsive Lab workbench helper.
- [`tests/fixtures/spa-test-target.html`](./fixtures/spa-test-target.html) and [`tests/fixtures/spa-test-target.graph.json`](./fixtures/spa-test-target.graph.json) define the deterministic same-origin SPA target and its Petri net envelope (`p_spa_overview`, `p_spa_details`, and `p_spa_missing_transition`, with transitions `t_spa_open_details`, `t_spa_back_overview`, `t_spa_invalid_unmapped`, and `t_spa_recover_overview`).
- [`tests/features/spa-workbench-journey.spec.js`](./features/spa-workbench-journey.spec.js), [`tests/features/spa-failure-recovery.spec.js`](./features/spa-failure-recovery.spec.js), and [`tests/features/spa-test-workbench.spec.js`](./features/spa-test-workbench.spec.js) exercise P0 SPA capture, device rotation, Layer 4 `FiringReceiptMCard` and `urn:gqc:navigation-run-link:v1` Triad linkage, deterministic replay, `p_error_modal` recovery, and keyboard-only navigation.

## Port and Server Contract

[`tests/fixtures/server-contract.js`](./fixtures/server-contract.js) defines the runtime server contract shared by [`playwright.config.js`](../playwright.config.js) and [`tests/fixtures/test-config.js`](./fixtures/test-config.js).

| Port | Owner | Purpose |
| --- | --- | --- |
| `3000` | `ws-server.js` (`npm start`) | Default standalone Express, WebSocket `/ws/`, and Astro SSR middleware port when `PORT` is unset |
| `3001` | Playwright `webServer` (`TEST_PORT`) | Default isolated test server port probed via `GET /health` during Playwright runs |
| `4322` | `astro dev` (`npm run dev`) | Active Astro development server port run alongside `ws-server.js` on `3000`, avoiding external Lab target port `4321` |

### Server Reuse and Database Isolation

- `reuseExistingServer` defaults to `false` locally and in CI so Playwright fails fast if an unrelated server occupies `TEST_PORT`.
- Set `PW_REUSE_SERVER=1` outside CI only when intentionally attaching to a pre-started local server.
- Each Playwright run assigns an isolated temporary `MCARD_DB_PATH` and rejects `data/mcard-api.db`, keeping the tracked repository SQLite database untouched.

## Lab Target Configuration vs Runtime Environment Configuration

`ws-server.js` serves two distinct configuration schemas.

1. **`GET /app-config.json` (`urn:gqc:lab-config:v1`)** from [`app-config.json`](../app-config.json) supplies approved `labTargets`, `defaultTargetId`, and `p2p` ICE defaults for Responsive UI Lab (`INV-STU-02`).
2. **`GET /api/config` (`urn:gqc:runtime-config:v1`)** supplies runtime WebSocket host/port/path and auth environment settings without colliding with `app-config.json`.

## Artifact Locations

- HTML report output writes to `playwright-report/`.
- JUnit XML writes to `test-results/junit.xml`.
- Performance reports write to `test-results/performance/`.
- Failure screenshots and `trace.zip` archives write to `test-results/`.
