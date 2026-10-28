# System Architecture

| Field | Value |
| --- | --- |
| Audience | Architects, developers, and QA engineers navigating the LandingPage architecture tier |
| BMAD Owner | Architect (`bmad-agent-architect`) |
| Source of Truth | [`ws-server.js`](../../ws-server.js), [`astro.config.mjs`](../../astro.config.mjs), [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml), and [`package.json`](../../package.json) |
| Consensus Kernel | `clm-kernel@0.0.13` |

This directory documents the verified architecture, Petri net topology, Astro island boundaries, and MCard storage contracts of the **LandingPage** repository.

---

## Monorepo Context and Estate Boundaries (`ULR-01`)

Within the `MCard_TDD` workspace, `LandingPage` serves as **Estate 4 (Submodule 3)** consuming published `clm-kernel@0.0.13`.

```
┌────────────────────────────────────────────────────────┐
│                      MCard_TDD                         │
│        Estate 1: Root Coordinator & Common Schemas     │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       ┌────────▼────────┐      ┌────────▼────────┐
       │      clm/       │      │  mcard-studio/  │
       │ Estate 2: Pure  │      │ Estate 3: Host  │
       │   Microkernel   │      │    Workspace    │
       └────────┬────────┘      └────────┬────────┘
                │                        │
                └───────────┬────────────┘
                            │ (consumes clm-kernel@0.0.13)
                   ┌────────▼────────┐
                   │  LandingPage/   │
                   │ Estate 4: Sub 3 │
                   └─────────────────┘
```

1. **Estate 1 (`MCard_TDD`)** coordinates cross-estate schemas and retirement gates.
2. **Estate 2 (`clm/`)** provides the pure Cubical Logic Model microkernel published as `clm-kernel@0.0.13`.
3. **Estate 3 (`mcard-studio/`)** provides the multi-panel desktop and web studio workspace.
4. **Estate 4 (`LandingPage/`)** provides the Responsive UI Lab workbench (`responsive-lab.html`), the single-page 4-modality MCard viewer (`/?noredirect=1`), and the SSRF-guarded external portal membrane.

---

## Core Architectural Pillars

### 1. Responsive Test Workbench (`responsive-lab.html`)

Hosted by `src/pages/responsive-lab.astro` (`astro-islands`, 7 Preact islands) and served by `ws-server.js` on port `3000` (`3001` under Playwright `TEST_PORT`, `4322` for `astro dev` alongside Express `3000`).

- **Viewport Stage and Containment (`js/harness/viewport-stage.js`)** enforces physical 2D orientation swapping (`INV-RVP-01`) and layout-box scaling $s = \min(1, W/w, H/h)$ (`INV-RVP-02`).
- **Guided SPA Workflow and Petri Net Verification (`js/harness/spa-test-workflow.js`, `scripts/check-net.mjs`)** models Pages as `PlaceMCard` nodes and Functional Links as `TransitionMCard` edges across `src/net/workbench-net.yaml` (`31` Places, `65` Transitions) and `tests/fixtures/spa-test-target.graph.json`.
- **Membrane Interceptor and Ring Buffer (`js/harness/target-membrane.js`, `js/harness/recorder.js`)** records normalized coordinates $[0.0, 1.0]$, audits $\ge 44\text{px}$ tap targets, redacts sensitive inputs, and stamps `clmKernel: '0.0.13'` on new `responsive_test_run:v1` runs while keeping historical `0.0.10` records readable.
- **Triad Persistence, Replay, and Conformance (`server/test-run-api.mjs`, `scripts/playwright-replay-driver.mjs`)** persists canonical Blake3-addressed test runs, `NetMCard` snapshots, `FiringReceiptMCard` receipts, and `urn:gqc:navigation-run-link:v1` linkage records in the SQLite Triad (`card`, `handle_registry`, `handle_history`).

### 2. Single-Page 4-Modality MCard Viewer (`/?noredirect=1`)

- Distills the landing page as `urn:mcard:content:landing_page` via `js/landing-page-mcard.js` and `server/mcard-modality.mjs` (`clm-kernel@0.0.13`).
- Serves the 6-sample corpus (`data/samples/portal_samples.mcard.db`) on the canonical 3-table SQLite Triad (`card`, `handle_registry`, `handle_history`).
- Renders `media`, `document`, inert `code` (`data-execution="inert"`), and sandboxed `webapp` payloads without `allow-same-origin` leaks.

### 3. SSRF-Guarded External Portal Membrane

- Enforces DNS resolution validation, loopback/private IP blocking, redirect hop checks, and a 2MB response cap (`server/mcard-probe-policy.mjs`, `js/external-portal-membrane.js`).
- Scopes cross-origin `lab-probe-agent.js` handshakes to approved origins from `/app-config.json`.

---

## Documents in This Section

- **[landing-page-architecture.md](./landing-page-architecture.md)** covers the end-to-end workbench vs target boundary, invariants, three hash domains, Page-as-Place and Functional-Link-as-Transition contracts, and PenPot scope.
- **[astro-host-and-islands.md](./astro-host-and-islands.md)** covers `astro@7.4.2`, `@astrojs/node@11.1.9` middleware order, the 7 Preact islands on `responsive-lab.html`, port assignments, and UI server-call policy.
- **[workbench-net.md](./workbench-net.md)** provides the generated reference table and Mermaid topology for all `31` Places and `65` Transitions in `src/net/workbench-net.yaml`.
- **[UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md](./UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md)** covers the 4-modality MCard classifier (`media`, `document`, `code`, `webapp`) backed by `clm-kernel@0.0.13`.
- **[MCARD_MODULAR_ARCHITECTURE.md](./MCARD_MODULAR_ARCHITECTURE.md)** covers MCard package boundaries, the three hash domains, and `scripts/check-package-source-parity.mjs`.
- **[CUBIC-LOGIC-MODEL.md](./CUBIC-LOGIC-MODEL.md)** introduces the Abstract, Concrete, and Balanced CLM dimensions.
- **[redux-clm-type-theory.md](./redux-clm-type-theory.md)** documents categorical state typing for isolated CLM renderers.
- **[MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md)** documents standalone ES module capabilities in `modules.json` and `js/pkc-core.js`.
- **[architecture-serverless-p2p.md](./architecture-serverless-p2p.md)**, **[webrtc-communication-design.md](./webrtc-communication-design.md)**, and **[webrtc-connection-handshake-flow.md](./webrtc-connection-handshake-flow.md)** document optional WebRTC P2P modules.

## Related Documentation Tiers

- [**00-getting-started/**](../00-getting-started/README.md) covers setup, commands, and port usage.
- [**03-data-management/**](../03-data-management/README.md) covers SQLite Triad storage and MCard schemas.
- [**08-testing/**](../08-testing/README.md) covers `node:test` unit suites and Playwright smoke, component, and feature projects.
- [**09-performance/**](../09-performance/README.md) covers island byte budgets and paired latency baselines.
