# Project Status

| Field | Value |
| --- | --- |
| Audience | Product managers, Scrum masters, developers, and operators |
| BMAD Owner | Scrum Master and Product Manager (`bmad-agent-pm`) |
| Source of Truth | [`docs/sprints/INDEX.md`](../sprints/INDEX.md), [`docs/sprints/_active/INDEX.md`](../sprints/_active/INDEX.md), and [`package.json`](../../package.json) |
| Consensus Kernel | `clm-kernel@0.0.13` |

## Program Summary

| Program | Scope | Status | Location |
| --- | --- | --- | --- |
| **Program SMO (`SMO-00..05`)** | Submodule modularity, 3-table SQLite Triad, Universal 4-Modality MCard Browser (historical `0.0.10` pin upgraded to `0.0.13`) | Graduated (2026-10-21) | [`docs/sprints/01-architecture/`](../sprints/01-architecture/INDEX.md) |
| **Program ERB (`ERB-00..06`)** | Viewport stage, bounded ring buffer, membrane normalization, Triad test-run persistence, Playwright replay, 15-check conformance | Graduated (2026-10-21) | [`docs/sprints/08-testing/`](../sprints/08-testing/INDEX.md) |
| **Program GQC (`SPRINT-GQC-00..07`)** | Petri net topology (`31` Places, `65` Transitions), Astro `7.4.2` + `7` Preact islands, SPA workbench workflow, Layer 1/Layer 4 `NetMCard` + `FiringReceiptMCard` Triad persistence, performance baselines, and CI documentation gates | Completed in `_active/` awaiting operator graduation | [`docs/sprints/_active/`](../sprints/_active/INDEX.md) |

## Certified Device-Sensitive and Petri Net Capabilities

| Capability | Invariant or Contract | Primary Implementation | Automated Verification |
| :--- | :--- | :--- | :--- |
| **Geometry and Orientation Swap** | `INV-RVP-01`, `INV-RVP-02` | `js/harness/viewport-stage.js` | `tests/features/responsive-rotation-and-devices.spec.js` |
| **Declared Fidelity Tiers** | `INV-DSF-01`, `INV-DSF-02` | `js/device-registry.js`, `js/harness/fidelity.js` | `tests/unit/fidelity.test.mjs`, `tests/unit/device-registry-v2.test.mjs` |
| **Bleed, Tap Targets, and Frame Budget** | `INV-DEV-01`, `INV-DEV-02`, `INV-DEV-04` | `js/harness/telemetry-collector.js`, `js/harness/membrane-interceptor.js` | `tests/features/device-conformance.spec.js` |
| **Normalized Capture and Privacy** | `INV-ERB-01..04`, `INV-PRV-01` | `js/harness/recorder.js` (`clmKernel: '0.0.13'`), `js/harness/test-run-schema.js` | `tests/unit/test-run-schema.test.mjs`, `tests/features/responsive-capture.spec.js` |
| **Workbench and Target Petri Nets** | `urn:gqc:net-envelope:v1` | `src/net/workbench-net.yaml`, `scripts/check-net.mjs`, `server/test-run-api.mjs` | `npm run check:net`, `tests/features/spa-workbench-journey.spec.js`, `tests/features/spa-failure-recovery.spec.js` |
| **Astro Host and 7 Preact Islands** | `astro@7.4.2`, `preact@11.1.0` | `ws-server.js`, `src/pages/*.astro`, `src/islands/*.jsx` | `tests/features/astro-host-parity.spec.js`, `tests/features/responsive-lab-islands.spec.js`, `tests/features/performance-baselines.spec.js` |
| **Living Docs and Parity Gates** | `GQC-05`, `GQC-07` | `scripts/check-package-source-parity.mjs`, `scripts/check-docs.mjs` | `npm run docs:check`, `tests/unit/check-docs-net-ids.test.mjs` |

## Standard Verification Battery

```bash
npm run check:net
node scripts/check-package-source-parity.mjs
npm run docs:check
npm run build
npm run test:unit
npm run check:playwright-discovery
npm run test:smoke
npm run test:components
npm run test:responsive
npm run test:replay
npm run test:conformance
```
