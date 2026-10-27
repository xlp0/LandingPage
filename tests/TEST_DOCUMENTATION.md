# Test Suite Documentation

This reference describes the Playwright project layout, policies, fixtures, and CI stages for the LandingPage repository.

## Project Partitioning

`playwright.config.js` partitions specs into three non-overlapping category projects. Every spec uses pure ES modules (`*.spec.js`).

| Project | Directory | Spec Files | Timeout | Local Retries | CI Retries | Retry Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `smoke` | `tests/smoke/` | 11 | 30s | 0 | 0 | TEA |
| `components` | `tests/components/` | 14 | 60s | 0 | 0 | TEA |
| `features` | `tests/features/` | 17 | 120s | 0 | 1 | TEA (SPRINT-GQC-02) |

Global `retries` is `0` so project-level retries never compound.

## Browser Matrix and Snapshot Policy

- Pull request runs execute `Desktop Chrome` across `smoke`, `components`, and `features`.
- Scheduled and dispatched cross-browser smoke runs set `PW_CROSS_BROWSER=1` to add `smoke-firefox` (`Desktop Firefox`) and `smoke-webkit` (`Desktop Safari`).
- Visual PNG baselines under `tests/features/fiber-conformance.spec.js-snapshots/` target `darwin`. `SNAPSHOT_POLICY` (owned by `Architect and TEA`) sets `ignoreSnapshots` on non-Darwin platforms so Linux CI executes every DOM and structural assertion without missing-baseline failures.

## Directory Map

```text
tests/
├── smoke/
│   ├── landing-page.spec.js
│   ├── single-page-mcard.spec.js
│   ├── clm-dashboard.spec.js
│   ├── apps-menu.spec.js
│   ├── root-index.spec.js
│   ├── root-responsive-lab.spec.js
│   ├── root-app.spec.js
│   ├── root-fiber-conformance.spec.js
│   ├── root-fiber-inspector.spec.js
│   ├── root-sprint-registry.spec.js
│   └── root-pkc-docs-index.spec.js
├── components/
│   └── test-clm-*.spec.js (14 isolated CLM component specs)
├── features/
│   └── *.spec.js (17 deep workbench, responsive lab, fiber, and P2P specs)
├── observability/
│   ├── alignment.test.js
│   └── correctness.test.js
├── unit/
│   ├── gui-coverage-registry.test.mjs
│   ├── playwright-trust-contracts.test.mjs
│   └── *.test.mjs
├── fixtures/
│   ├── server-contract.js
│   ├── test-config.js
│   └── clm-helpers.js
└── gui-coverage.json
```

## Root HTML Characterization Specs

Each of the seven root HTML files has a dedicated smoke characterization spec asserting HTTP status, document title, accessible semantic landmarks, and outgoing same-origin links.

| Root HTML File | Characterization Spec | Registered Surface ID |
| --- | --- | --- |
| `index.html` | `tests/smoke/root-index.spec.js` | `workbench-landing-portal` |
| `responsive-lab.html` | `tests/smoke/root-responsive-lab.spec.js` | `workbench-responsive-lab` |
| `app.html` | `tests/smoke/root-app.spec.js` | `workbench-legacy-mission-control` |
| `fiber-conformance.html` | `tests/smoke/root-fiber-conformance.spec.js` | `workbench-fiber-conformance` |
| `fiber-inspector.html` | `tests/smoke/root-fiber-inspector.spec.js` | `workbench-fiber-inspector` |
| `sprint-registry.html` | `tests/smoke/root-sprint-registry.spec.js` | `workbench-sprint-registry` |
| `pkc-docs-index.html` | `tests/smoke/root-pkc-docs-index.spec.js` | `workbench-pkc-docs-index` |

## Shared Fixtures

### `tests/fixtures/server-contract.js`

Exports `resolvePlaywrightServerContract(env)`, `EXPRESS_DEFAULT_PORT` (`3000`), `PLAYWRIGHT_DEFAULT_PORT` (`3001`), `ASTRO_DEV_PORT` (`4322`), and `DEFAULT_TEST_SERVER_COMMAND` (`node ws-server.js`). It configures `/health` readiness checks, blocks accidental foreign server reuse unless `PW_REUSE_SERVER=1` is set outside CI, and redirects `ws-server.js` SQLite writes to an isolated `MCARD_DB_PATH`.

### `tests/fixtures/test-config.js`

Exports `resolveTestConfig(env)`, route constants, and `ROOT_PAGE_CHARACTERIZATIONS`. All URLs derive from `TEST_PORT` and `BASE_URL`.

### `tests/fixtures/clm-helpers.js`

Exports `navigateToDashboard`, `waitForDashboardReady`, `clickComponent`, `verifyComponentIframe`, `getComponentFrame`, `setupComponent`, `takeScreenshot`, `stubExternalComponentRequests`, and `collectOutgoingSameOriginLinks`. External third-party embeds, APIs, and telemetry collectors are stubbed at the Playwright route boundary.

## CI Pipelines

### `.github/workflows/playwright-quality.yml`

1. `discovery-and-unit` runs `npm run check:playwright-discovery` and `npm run test:unit` on Node 24.
2. `smoke-and-components` runs `npm run test:smoke` and `npm run test:components` with `CI=1` and uploads `playwright-report/` and `test-results/`.
3. `features` runs `npm run test:features` with `CI=1` and uploads `playwright-report/` and `test-results/`.
4. `cross-browser-smoke` runs on schedule or manual dispatch with `PW_CROSS_BROWSER=1` across Chromium, Firefox, and WebKit.

### `.github/workflows/clm-test-all-components.yml`

Runs changed `tests/components/test-clm-*.spec.js` specs on Node 24 with `--project=components`, fails the job on any test failure without committing artifacts back to Git, and uploads `playwright-report/` and `test-results/`.
