# Landing Page and Responsive Test Workbench Architecture

| Field | Value |
| --- | --- |
| Audience | Architects, developers, product managers, and QA engineers working on the LandingPage workbench and MCard browser |
| BMAD Owner | Architect (`bmad-agent-architect`) and Product Manager (`bmad-agent-pm`) |
| Source of Truth | [`ws-server.js`](../../ws-server.js), [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml), [`server/mcard-api.mjs`](../../server/mcard-api.mjs), [`server/test-run-api.mjs`](../../server/test-run-api.mjs), and [`js/harness/`](../../js/harness/) |
| Drift Gate | `npm run check:net`, `node scripts/check-package-source-parity.mjs`, `npm run docs:check`, and `npm run build` |

This document describes the verified architectural contracts of the **LandingPage** repository (`LandingPage/`) within the **MCard_TDD** workspace.

---

## 1. System Mission and Surface Boundaries

`LandingPage` operates as **Estate 4 (Submodule 3)** in the `MCard_TDD` Four-Estate Architecture (`ULR-01`). Rather than acting as an unconstrained portal, `LandingPage` separates the **workbench** from **targets under test** and **MCard viewer modes**.

| Surface Category | Route or Fixture | Workbench Place / Role | Contract |
| --- | --- | --- | --- |
| **Responsive Test Workbench** | `/responsive-lab.html` (`/` redirects here by default) | `p_page_responsive_lab` | Primary P0 full-window workbench (`astro-islands`, 7 Preact islands) that embeds, probes, records, replays, and certifies a chosen target URL |
| **Approved SPA Target Under Test** | `/tests/fixtures/spa-test-target.html` | Target net `spa-test-target-net` (`tests/fixtures/spa-test-target.graph.json`) | Deterministic client-routed SPA target assessed inside `#mission-control-iframe` without conflating target Places with workbench Places |
| **Single-Page 4-Modality MCard Viewer** | `/?noredirect=1` and `/index.html?noredirect=1` | `p_view_index_mcard_viewer` | Renders `urn:mcard:content:landing_page` and the 6-sample Triad corpus across `media`, `document`, `code`, and `webapp` modalities; also acts as an MPA candidate when loaded inside the Lab iframe |
| **Mission Control MCard Host** | `/app.html` | `p_page_app` | Legacy Mission Control MCard Manager (`astro-wrapped`), classified as an MCard `webapp` target pending Product Manager review |
| **Cross-Origin and Policy Probe Fixtures** | `/tests/fixtures/probe-target.html`, `/tests/fixtures/no-probe-target.html`, blocked cross-origin URLs | Exercised via `p_pending_probe_handshake` and `p_error_*` Places | Verify opt-in `lab-probe-agent.js` postMessage handshakes, 5000ms timeouts, and fail-closed blocked-origin recovery |
| **Internal CLM and Fiber Diagnostics** | `/sprint-registry.html`, `/fiber-inspector.html`, `/fiber-conformance.html` | `p_page_sprint_registry`, `p_page_fiber_inspector`, `p_page_fiber_conformance` | Read-only `astro-wrapped` diagnostic pages with `0 B` island JS |

---

## 2. Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LandingPage Submodule                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │       Responsive UI Lab Workbench (`responsive-lab.html`)      │   │
│   │                                                                │   │
│   │   ┌───────────────┐  ┌───────────────────┐  ┌───────────────┐  │   │
│   │   │  Lab Toolbar  │  │  Viewport Stage   │  │  SPA Workflow │  │   │
│   │   │ & Target Sel  │  │   & Scale Wrap    │  │  (5-Step Tab) │  │   │
│   │   └───────┬───────┘  └─────────┬─────────┘  └───────┬───────┘  │   │
│   │           │                    │                    │          │   │
│   │   ┌───────▼────────────────────▼────────────────────▼───────┐  │   │
│   │   │         Target Membrane Interceptor (`target-membrane`) │  │   │
│   │   │    - Coords Normalization [0.0, 1.0] (`INV-ERB-02`)     │  │   │
│   │   │    - Tap Target Audit >= 44px (`INV-DEV-02`)            │  │   │
│   │   │    - Sensitive Input Redaction (`INV-PRV-01`)           │  │   │
│   │   └────────────────────────────┬────────────────────────────┘  │   │
│   │                                │                               │   │
│   │   ┌────────────────────────────▼────────────────────────────┐  │   │
│   │   │       Event Ring Buffer (FIFO, N <= 2048) & FSM         │  │   │
│   │   │       (`INV-ERB-01`, `INV-ERB-03`, `clmKernel 0.0.13`)  │  │   │
│   │   └────────────────────────────┬────────────────────────────┘  │   │
│   └────────────────────────────────┼───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │        Backend & Persistence Layer (`server/test-run-api.mjs`) │   │
│   │   - SQLite Triad (`card`, `handle_registry`, `handle_history`) │   │
│   │   - Canonical JSON Serialization & Blake3 (`clm-kernel@0.0.13`)│   │
│   │   - Layer 1 Workbench NetMCard & Layer 4 Target Receipts       │   │
│   │   - Headless Playwright Replay Driver (1x, 2x, 5x, fast)       │   │
│   │   - 15-Check Device Conformance Catalog & Certification        │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Architectural Invariants

| ID | Title | Architectural Contract |
| :--- | :--- | :--- |
| **`INV-STU-01`** | Single `iframe.src` Writer | All target URL changes route through `TargetMembrane.bindTarget()`. Direct mutation of `iframe.src` is forbidden. |
| **`INV-STU-02`** | Single Target Registry | Built-in target URLs load from `/app-config.json` (`urn:gqc:lab-config:v1`, distinct from runtime env endpoint `/api/config` using `urn:gqc:runtime-config:v1`). |
| **`INV-RVP-01`** | Physical 2D Orientation Swap | Toggling orientation physically transposes $W \leftrightarrow H$ across all 8 device presets without distortion. |
| **`INV-RVP-02`** | Layout-Box Stage Containment | The target viewport scales by $s = \min(1, W_{\text{available}}/w, H_{\text{available}}/h)$ within `.viewport-scale-wrapper` without producing window scrollbars. |
| **`INV-REF-01`** | Browser Kernel Isolation | Browser islands and harness modules never import `clm-kernel` or Node `crypto`. Viewport scaling uses CSS custom properties (`--frame-target-width`, `--frame-target-height`, `--frame-scale-factor`). |
| **`INV-ERB-01`** | Bounded Memory Footprint | `EventRingBuffer` uses a preallocated circular slot array ($N \le 2048$). Pushing to a full buffer drops the oldest event in $O(1)$ without memory reallocation. |
| **`INV-ERB-02`** | Spatial Invariance | Pointer coordinates normalize to $[0.0, 1.0]$ relative to the target's internal viewport where $x_{\text{norm}} = (x - \text{rect.left}) / w$. |
| **`INV-ERB-03`** | Deterministic Recording FSM | State transitions between `IDLE`, `RECORDING`, `PAUSED`, and `STOPPED` obey a closed 20-pair transition table. |
| **`INV-ERB-04`** | Content-Addressed Test Runs | Test run payloads sort keys canonically and hash via `clm-kernel@0.0.13` Blake3 before storage in the SQLite Triad. |
| **`INV-DSF-01`** | Declared Fidelity Tiers | Every run declares its emulation capability tier across T0 (Lab iframe), T1 (Playwright context), T2 (CDP throttling), or T3 (real physical hardware). |
| **`INV-PRV-01`** | Privacy by Construction | Password fields, PIN inputs, and sensitive attributes are masked and redacted prior to ring buffer entry. |
| **`INV-DEV-01`** | Zero Horizontal Bleed | `document.documentElement.scrollWidth <= window.innerWidth` is enforced across all viewports. |
| **`INV-DEV-02`** | Touch Target Ergonomics | Interactive targets on coarse-pointer devices meet minimum tap dimensions ($\ge 44\text{px} \times 44\text{px}$). |
| **`INV-DEV-04`** | Frame Latency Budget | Animation frames during orientation swapping observe the $16.6\text{ms}$ budget ($60\text{fps}$). |

---

## 4. Kernel Provenance, Three Hash Domains, and PenPot Boundaries

### 4.1 Published Kernel Consensus (`clm-kernel@0.0.13`)

`LandingPage` pins published `clm-kernel@0.0.13` in [`package.json`](../../package.json) and `package-lock.json`. [`server/mcard-modality.mjs`](../../server/mcard-modality.mjs) exports `KERNEL_PROVENANCE = 'clm-kernel@0.0.13'`, and [`js/harness/recorder.js`](../../js/harness/recorder.js) exports `DEFAULT_CLM_KERNEL_VERSION = '0.0.13'` (with injectable `clmKernelVersion` option and optional `<meta name="lab-kernel-version">` lookup) so newly recorded `urn:mcard:schema:responsive_test_run:v1` payloads stamp `lab.clmKernel: '0.0.13'`. Historical `responsive_test_run:v1` records stamped during earlier SMO sprints with `lab.clmKernel: '0.0.10'` remain valid and readable without rewriting (`DECISIONS.tsv` row 63).

### 4.2 Three Distinct Hash Domains

`LandingPage` never conflates server Triad content addressing with client IndexedDB IDs or design-file drift digests.

| Hash Domain | Module | Algorithm and Scope | Authority Rule |
| --- | --- | --- | --- |
| **1. Triad Content Hash** | [`server/mcard-api.mjs`](../../server/mcard-api.mjs) and [`server/test-run-api.mjs`](../../server/test-run-api.mjs) via `clm-kernel@0.0.13` | Canonical Blake3 (with SHA-256 verification compatibility) over raw card bytes or `canonicalJson()` payloads in SQLite `card(hash, content, g_time)` | Sole authoritative hash for MCard persistence, `NetMCard`, `FiringReceiptMCard`, `responsive_test_run:v1`, and certification records |
| **2. Browser Compatibility Hash** | [`public/js/mcard-kernel/compat.js`](../../public/js/mcard-kernel/compat.js) | Web Crypto SHA-256 (`crypto.subtle.digest`) with deterministic fallback for local IndexedDB keys inside `app.html` (`MCardManager`) | Scoped strictly to browser-local Mission Control IndexedDB state; never accepted as a server Triad Blake3 digest |
| **3. PenPot Navigation Graph Hash** | [`scripts/penpot-zip.mjs`](../../scripts/penpot-zip.mjs) and [`scripts/penpot-drift.mjs`](../../scripts/penpot-drift.mjs) | Node `crypto` SHA-256 over canonicalized PenPot navigation graph JSON extracted from `design/landing-navigation.penpot` | Used strictly at build/CI time to detect drift between `design/landing-navigation.penpot` and generated `js/nav.js` |

### 4.3 PenPot Navigation SSOT vs Deferred MPA Target Assessment

[`design/landing-navigation.penpot`](../../design/landing-navigation.penpot) is the visual navigation source of truth for **LandingPage's own navigation bar** (`INV-CDO-11`), compiled into [`js/nav.js`](../../js/nav.js) via `scripts/penpot-nav.mjs` and checked by `scripts/penpot-drift.mjs`. Assessing an external **PenPot-exported MPA target** inside Responsive UI Lab is **Optional / Deferred** and requires explicit Product Manager approval, a real multi-page target fixture, and live Playwright verification before adoption.

---

## 5. Astro Host Composition, Ports, and Store Ownership

Earlier phase notes stating that `LandingPage` did not adopt Astro or Vitest are **superseded for Astro** (`astro@7.4.2`, `@astrojs/node@11.1.9` in middleware mode, `@astrojs/preact@6.1.1`, and `preact@11.1.0` are active), while **Vitest remains un-adopted** (`node:test` and Playwright are the canonical test runners). Full host, port (`3000` app server, `3001` Playwright `TEST_PORT`, `4322` `astro dev` avoiding external target port `4321`), and island details live in [Astro Host and Preact Islands](./astro-host-and-islands.md) and [Workbench Navigation Net Reference](./workbench-net.md).

| Page Entry | Astro Source | Workbench Place | Host Mode | Runtime Owner and Store |
| :--- | :--- | :--- | :--- | :--- |
| `responsive-lab.html` | [`src/pages/responsive-lab.astro`](../../src/pages/responsive-lab.astro) | `p_page_responsive_lab` | `astro-islands` (7 Preact islands) | `js/harness/lab-runtime.js` singleton (`window.__lab`, including `window.__lab.workflow`) |
| `index.html` | [`src/pages/index.astro`](../../src/pages/index.astro) | `p_page_index`, `p_view_index_mcard_viewer` | `astro-wrapped` | Redirects `/` to `/responsive-lab.html`; mounts `js/landing-page-mcard.js` and `js/nav.js` at `?noredirect=1` |
| `app.html` | [`src/pages/app.astro`](../../src/pages/app.astro) | `p_page_app` | `astro-wrapped` | `public/js/app-bootstrap.js` and `MCardManager` (`window.mcardManager`), classified as `webapp` pending Product Manager review |
| `sprint-registry.html` | [`src/pages/sprint-registry.astro`](../../src/pages/sprint-registry.astro) | `p_page_sprint_registry` | `astro-wrapped` | Inline `/api/clm/registry` projection owned by Scrum Master |
| `fiber-inspector.html` | [`src/pages/fiber-inspector.astro`](../../src/pages/fiber-inspector.astro) | `p_page_fiber_inspector` | `astro-wrapped` | `public/js/fibers/registry.js` diagnostic harness owned by Architect |
| `fiber-conformance.html` | [`src/pages/fiber-conformance.astro`](../../src/pages/fiber-conformance.astro) | `p_page_fiber_conformance` | `astro-wrapped` | `public/js/fibers/registry.js` conformance harness owned by Architect |

Two legacy Redux stores remain intentionally separate because zero active workbench pages share user state across them.
1. `js/redux/store.js` (`clm`, `auth`, `ui`, and `navigation` slices on `window.__REDUX_STORE__`) is imported only by `js/renderers/index.js` for CLM component isolation.
2. `js/store/store.js` (`auth`, `music`, and `room` slices) is imported only by `js/modules/auth-manager.js`, `js/modules/webrtc-dashboard/index.html`, and standalone music demos under `public/examples/Music/`.

Standalone browser capability descriptors in [`modules.json`](../../modules.json) (`markdown-renderer`, `net-gateway`, `p2p-serverless`, and `tic-tac-toe-p2p`) carry explicit `owner` and `required` metadata enforced by `PKC.init()` and `PKC.stop()` in [`js/pkc-core.js`](../../js/pkc-core.js).

---

## 6. CLM Page-as-Place, Functional-Link-as-Transition, and Triad Persistence

[`scripts/net-to-netmcard.mjs`](../../scripts/net-to-netmcard.mjs) and [`server/test-run-api.mjs`](../../server/test-run-api.mjs) model both the workbench and targets under test as Colored Petri Nets persisted through `CanonicalTriadBackend` in the three-table SQLite Triad (`card`, `handle_registry`, `handle_history`) without adding SQL tables or mutating `urn:mcard:schema:responsive_test_run:v1`.

1. **Page-as-Place (`PlaceMCard` vs Route Handles).** Every workbench Place (`31` Places in [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml)) and every approved target Page (such as `p_spa_overview`, `p_spa_details`, and `p_spa_missing_transition` in [`tests/fixtures/spa-test-target.graph.json`](../../tests/fixtures/spa-test-target.graph.json)) maps to a `PlaceMCard` with a `clm://type/view/...` type URI (or `clm/views/petri/v1` net view contract). Human-readable route handles (`mcard:route:/...`, `mcard:workbench:/...`, `mcard:target:/...`) stay in a separate `urn:gqc:net-bindings:v1` MCard so route or owner metadata edits never mutate the `NetMCard` topology hash.
2. **Functional-Link-as-Transition (`TransitionMCard` and `FiringReceiptMCard`).** Every navigation link, redirect, client-route switch, server-call lifecycle step (`server-call-request`, `server-call-ok`, `server-call-fail`), external popup (`open-external`), and recovery action (`recover`) is a `TransitionMCard` (`65` Transitions in `workbench-net.yaml`). Firing a target Transition via `POST /api/test-runs/navigation/session` and `POST /api/test-runs/navigation/fire` executes inside `Layer4TrellisNavigationNet`, serializes per-session requests, deduplicates `(sessionId, requestId)` retries, and persists an immutable `FiringReceiptMCard` in the Triad.
3. **Visible Error Places and Explicit Recovery.** Invalid or unmapped target transitions trap the navigation session in `p_error_modal` (and surface `p_spa_missing_transition` in the guided SPA workflow), returning HTTP `409` (`requiresRecovery`) on normal transitions until an explicit recovery transition (`t_spa_recover_overview`) or new session runs. Workbench failures likewise enter explicit error Places (`p_error_target_blocked`, `p_error_capture_unavailable`, `p_error_handshake_timeout`, `p_error_target_unapproved`, `p_error_post_test_runs`) with dedicated `t_recover_*` transitions.
4. **Closed `responsive_test_run:v1` Schema and Separate Navigation Linkage.** `urn:mcard:schema:responsive_test_run:v1` remains a closed 12-key schema (`validateTestRun` rejects unknown top-level keys). Linking a completed test run to its target `NetMCard` and verified `FiringReceiptMCard` hashes writes a **separate** `urn:gqc:navigation-run-link:v1` MCard at handle `nav_run_link_<runHash>` via `POST /api/test-runs/navigation/link` after verifying every referenced hash exists in the Triad. Interrupted captures store separately as `urn:gqc:interrupted-capture:v1` (`incomplete` `true`, `passing` `false`, `certified` `false`), and unsupported schema versions fail visibly (`400` on write, `422` on read without silent downgrade).

---

## 7. Package Source Ownership and Server Policy

[`scripts/package-source-parity.json`](../../scripts/package-source-parity.json) and [`scripts/check-package-source-parity.mjs`](../../scripts/check-package-source-parity.mjs) enforce ownership across all four workspace package pairs and client server calls.

- **`@pkc/markdown-renderer` (`shared-source`).** [`packages/markdown-renderer/src/index.js`](../../packages/markdown-renderer/src/index.js) is the canonical source built to `packages/markdown-renderer/dist/index.js` and re-exported by `js/modules/markdown-renderer/index.js`.
- **`@pkc/core` vs `js/pkc-core.js` (`separate-product-variant`).** Kept distinct because `js/pkc-core.js` implements `SPRINT-GQC-04` lifecycle ordering and failure isolation while `@pkc/core` remains the standalone v1.0.0 package.
- **`@pkc/p2p` (`unmigrated-exact-copy-gated`) and `pkc-server` (`unused-package-copy`).** Guarded against silent drift by SHA-256 parity checks in `scripts/check-package-source-parity.mjs`.
- **Renderer Registry Separation.** `js/landing-page-mcard.js` and `server/mcard-modality.mjs` own the 4-modality viewer (`media`, `document`, `code`, `webapp`) on `index.html?noredirect=1`, whereas `js/renderers/RendererRegistry.js` owns MIME-keyed component isolation under `js/renderers/index.js`.
