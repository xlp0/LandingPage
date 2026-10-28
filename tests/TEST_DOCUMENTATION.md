# Playwright and Unit Test Suite Documentation

| Field | Value |
| --- | --- |
| Audience | QA engineers, Test Architects, and developers maintaining Playwright and `node:test` suites |
| BMAD Owner | Test Architect and Architect (`bmad-agent-architect`) |
| Source of Truth | [`playwright.config.js`](../playwright.config.js), [`.github/workflows/playwright-quality.yml`](../.github/workflows/playwright-quality.yml), and [`tests/gui-coverage.json`](./gui-coverage.json) |
| Drift Gate | `npm run check:playwright-discovery` and `npm run docs:check` |

This reference describes the Playwright project layout, unit test runner, fixtures, and CI stages for the LandingPage repository.

## Project Partitioning

[`playwright.config.js`](../playwright.config.js) partitions `48` E2E spec files (`644` tests total) into three non-overlapping category projects. Every spec uses pure ES modules (`*.spec.js`).

| Project | Directory | Spec Files | Discovered Tests | Timeout | Local Retries | CI Retries | Retry Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `smoke` | `tests/smoke/` | 11 | 30 | 30s | 0 | 0 | TEA |
| `components` | `tests/components/` | 14 | 18 | 60s | 0 | 0 | TEA |
| `features` | `tests/features/` | 23 | 596 | 120s | 0 | 1 | TEA |

Global `retries` is `0` so project-level retries never compound. Unit and contract suites run via `node --test` (`npm run test:unit`) across `tests/*.test.*`, `tests/unit/*.test.mjs`, and `tests/observability/*.test.js`. Vitest is not used.

## Browser Matrix and Snapshot Policy

- Pull request runs execute `Desktop Chrome` across `smoke`, `components`, and `features` on `TEST_PORT=3001` (with production app default on `3000` and `astro dev` on `4322`).
- Scheduled and dispatched cross-browser smoke runs set `PW_CROSS_BROWSER=1` to add `smoke-firefox` (`Desktop Firefox`) and `smoke-webkit` (`Desktop Safari`).
- Visual PNG baselines under `tests/features/fiber-conformance.spec.js-snapshots/` target `darwin`. `SNAPSHOT_POLICY` (owned by Architect and TEA) sets `ignoreSnapshots` on non-Darwin platforms so Linux CI executes every DOM and structural assertion without missing-baseline failures.

## Directory Map

```text
tests/
├── smoke/                        # 11 fast smoke and root page characterization specs (30 tests)
├── components/                   # 14 isolated CLM component iframe specs (18 tests)
├── features/                     # 23 workbench, Astro island, SPA net, MCard, perf, and P2P specs (596 tests)
├── conformance/                  # 15 modular device conformance checks and *.conformance.json specs
├── performance/                  # place-bytes.mjs, metrics-model.mjs, run-paired-benchmark.mjs
├── observability/                # alignment.test.js and correctness.test.js (node:test)
├── unit/                         # Pure Node contract suites (net, recorder 0.0.13, Triad, docs gate)
├── fixtures/                     # server-contract.js, app-fixtures.js, net-trace.js, spa-test-target.*
└── gui-coverage.json             # Surface-to-spec coverage registry
```

## Root Page Characterization Specs

Each of the six Astro-hosted workbench routes plus the tombstoned static `pkc-docs-index.html` surface has a dedicated smoke characterization spec asserting HTTP status, document title, semantic landmarks, and outgoing same-origin links.

| Route | Host Mode | Characterization Spec | Registered Surface ID |
| --- | --- | --- | --- |
| `index.html` (`/` and `/?noredirect=1`) | `astro-wrapped` | [`tests/smoke/root-index.spec.js`](./smoke/root-index.spec.js) | `workbench-landing-portal` |
| `responsive-lab.html` | `astro-islands` (`7` Preact islands) | [`tests/smoke/root-responsive-lab.spec.js`](./smoke/root-responsive-lab.spec.js) | `workbench-responsive-lab` |
| `app.html` | `astro-wrapped` | [`tests/smoke/root-app.spec.js`](./smoke/root-app.spec.js) | `workbench-legacy-mission-control` |
| `fiber-conformance.html` | `astro-wrapped` | [`tests/smoke/root-fiber-conformance.spec.js`](./smoke/root-fiber-conformance.spec.js) | `workbench-fiber-conformance` |
| `fiber-inspector.html` | `astro-wrapped` | [`tests/smoke/root-fiber-inspector.spec.js`](./smoke/root-fiber-inspector.spec.js) | `workbench-fiber-inspector` |
| `sprint-registry.html` | `astro-wrapped` | [`tests/smoke/root-sprint-registry.spec.js`](./smoke/root-sprint-registry.spec.js) | `workbench-sprint-registry` |
| `pkc-docs-index.html` | Static Express fallback (tombstoned) | [`tests/smoke/root-pkc-docs-index.spec.js`](./smoke/root-pkc-docs-index.spec.js) | `workbench-pkc-docs-index` |

## Shared Fixtures

### `tests/fixtures/server-contract.js`

Exports `resolvePlaywrightServerContract(env)`, `EXPRESS_DEFAULT_PORT` (`3000`), `PLAYWRIGHT_DEFAULT_PORT` (`3001`), `ASTRO_DEV_PORT` (`4322`), and `DEFAULT_TEST_SERVER_COMMAND` (`node ws-server.js`). Configures `/health` readiness checks, blocks accidental foreign server reuse unless `PW_REUSE_SERVER=1` is set outside CI, and redirects SQLite writes to an isolated `MCARD_DB_PATH`.

### `tests/fixtures/net-trace.js`

Attaches workbench Petri net tracing to Playwright pages and replays observed navigation and server-call transitions against `src/net/workbench-net.yaml` via `scripts/check-net.mjs`.

### `tests/fixtures/clm-helpers.js`

Provides isolated CLM component navigation, iframe inspection, screenshot helpers, and route-boundary stubs for external embeds and telemetry collectors.

## CI Pipelines

### `.github/workflows/playwright-quality.yml`

1. `discovery-and-unit` runs `npm run check:net`, `node scripts/check-package-source-parity.mjs`, `npm run docs:check`, `npm run build`, `npm run check:playwright-discovery`, and `npm run test:unit` on Node 24.
2. `smoke-and-components` builds the Astro host, runs `npm run test:smoke` and `npm run test:components` with `CI=1`, and uploads `playwright-report/` and `test-results/`.
3. `features` builds the Astro host, runs `npm run test:features` with `CI=1`, and uploads `playwright-report/` and `test-results/`.
4. `cross-browser-smoke` runs on schedule or manual dispatch with `PW_CROSS_BROWSER=1` across Chromium, Firefox, and WebKit.

### `.github/workflows/clm-test-all-components.yml`

Runs changed `tests/components/test-clm-*.spec.js` specs on Node 24 with `--project=components` and uploads artifacts without committing outputs back to Git.
