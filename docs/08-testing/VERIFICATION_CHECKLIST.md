# Pre-Release Verification Checklist

| Field | Value |
| --- | --- |
| Audience | Release engineers, QA engineers, and Scrum masters |
| BMAD Owner | Test Architect and Scrum Master |
| Source of Truth | [`package.json`](../../package.json), [`.github/workflows/playwright-quality.yml`](../../.github/workflows/playwright-quality.yml), and [`tests/README.md`](../../tests/README.md) |
| Drift Gate | `npm run docs:check` |

## Current Release Gate Checklist (`Program GQC`)

Run all automated gates from the repository root (`LandingPage/`) before approving release or sprint graduation:

- [x] **Petri Net Parity** via `npm run check:net` (`src/net/workbench-net.yaml` and `tests/fixtures/spa-test-target.graph.json`)
- [x] **Package and Endpoint Parity** via `node scripts/check-package-source-parity.mjs`
- [x] **Generated Net Reference Parity** via `npm run docs:gen-net` and `npm run docs:check`
- [x] **Zero-Island Wrapper Enforcement** via `node tests/performance/place-bytes.mjs --enforce-zero-island-places`
- [x] **Production Astro Build** via `npm run build` (`[gqc-net-parity] PASS`)
- [x] **Playwright Project Non-Overlap** via `npm run check:playwright-discovery` (`48` specs, `644` tests across `smoke`, `components`, `features`)
- [x] **Node Unit and Contract Suites** via `npm run test:unit` (`clm-kernel@0.0.13` consensus and historical `0.0.10` read compatibility)
- [x] **Playwright Smoke, Component, and Feature Suites** via `npm run test:smoke`, `npm run test:components`, and `npm run test:features` on isolated `TEST_PORT=3001`

> [!NOTE]
> Historical THK Mesh prototype checklist items (`landing-enhanced.html`, `landing.html`, `config.js`) from the initial 2024 static prototype have been retired under `retired-islands.yaml` and superseded by the Astro 7 workbench pages (`src/pages/*.astro`) and the automated gates above. See [DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md](./DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md) and [tests/TEST_DOCUMENTATION.md](../../tests/TEST_DOCUMENTATION.md) for active route and spec coverage.
