# Landing Page & Responsive Test Workbench Architecture

This document describes the architectural design of the **LandingPage** submodule (`LandingPage/`) within the **MCard_TDD** framework.

---

## 1. System Mission & Boundaries

`LandingPage` operates as **Estate 4 (Submodule 3)** in the `MCard_TDD` Four-Estate Architecture (`ULR-01`).

Rather than functioning as an unconstrained web portal or an ad-hoc demo collection, `LandingPage` provides:
1. **The Responsive Test Workbench (`responsive-lab.html`)**: A dedicated testing laboratory to certify the device-sensitive behavior of a chosen target URL against physical device profiles, layout reflow, touch ergonomics, and performance budgets.
2. **Single-Page MCard Distillation (`SMR-09`)**: A content-addressed corpus supplier emitting `urn:mcard:content:landing_page` and maintaining the 6-sample portal database (`portal_samples.mcard.db`) on the canonical Triad SQLite schema.
3. **SSRF-Guarded External Portal Membrane**: A secure boundary that inspects, sanitizes, and safely embeds external web targets without exposing internal network endpoints or suffering cross-origin leaks.

---

## 2. Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LandingPage Submodule                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │         Responsive UI Lab Stage (`responsive-lab.html`)        │   │
│   │                                                                │   │
│   │   ┌───────────────┐  ┌───────────────────┐  ┌───────────────┐   │   │
│   │   │  Lab Toolbar  │  │  Viewport Stage   │  │   Telemetry   │   │   │
│   │   │ & Target Sel  │  │   & Scale Wrap    │  │   Collector   │   │   │
│   │   └───────┬───────┘  └─────────┬─────────┘  └───────┬───────┘   │   │
│   │           │                    │                    │           │   │
│   │   ┌───────▼────────────────────▼────────────────────▼───────┐   │   │
│   │   │         Target Membrane Interceptor (`target-membrane`) │   │   │
│   │   │    - Coords Normalization [0.0, 1.0] (`INV-ERB-02`)     │   │   │
│   │   │    - Tap Target Audit >= 44px (`INV-DEV-02`)            │   │   │
│   │   │    - Sensitive Input Redaction (`INV-PRV-01`)           │   │   │
│   │   └────────────────────────────┬────────────────────────────┘   │   │
│   │                                │                                │   │
│   │   ┌────────────────────────────▼────────────────────────────┐   │   │
│   │   │       Event Ring Buffer (FIFO, N <= 2048) & FSM         │   │   │
│   │   │               (`INV-ERB-01`, `INV-ERB-03`)              │   │   │
│   │   └────────────────────────────┬────────────────────────────┘   │   │
│   └────────────────────────────────┼────────────────────────────────┘   │
│                                    │                                    │
│   ┌────────────────────────────────▼────────────────────────────────┐   │
│   │        Backend & Persistence Layer (`server/test-run-api.mjs`)  │   │
│   │   - SQLite Triad Persistence (`data/mcard-api.db`)              │   │
│   │   - Canonical JSON Serialization & Blake3 Hashing (`clm-kernel`)│   │
│   │   - Headless Playwright Replay Driver (1x, 2x, 5x, fast)        │   │
│   │   - 15-Check Device Conformance Catalog & Certification         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Architectural Invariants

| ID | Title | Architectural Contract |
| :--- | :--- | :--- |
| **`INV-STU-01`** | Single `iframe.src` Writer | All target URL changes must route through `TargetMembrane.bindTarget()`. Direct mutation of `iframe.src` is forbidden. |
| **`INV-STU-02`** | Single Target Registry | Built-in target URLs are loaded exclusively from `app-config.json#labTargets`. |
| **`INV-RVP-01`** | Physical 2D Orientation Swap | Toggling orientation physically transposes $W \leftrightarrow H$ across all 8 device presets without distortion. |
| **`INV-RVP-02`** | Layout-Box Stage Containment | The target viewport is scaled by $s = \min(1, W_{\text{available}}/w, H_{\text{available}}/h)$ within `.viewport-scale-wrapper`. The window never produces scrollbars. |
| **`INV-REF-01`** | Zero Runtime NPM Dependencies | The client-side stage and ring buffer operate on pure vanilla ECMAScript and native CSS custom properties (`--frame-target-width`, `--frame-target-height`, `--frame-scale-factor`). |
| **`INV-ERB-01`** | Bounded Memory Footprint | `EventRingBuffer` uses a preallocated circular slot array ($N \le 2048$). Pushing to a full buffer drops the oldest event in $O(1)$ without memory reallocation. |
| **`INV-ERB-02`** | Spatial Invariance | Pointer coordinates are normalized to $[0.0, 1.0]$ relative to the target's internal viewport: $x_{\text{norm}} = (x - \text{rect.left}) / w$. |
| **`INV-ERB-03`** | Deterministic Recording FSM | State transitions between `IDLE`, `RECORDING`, `PAUSED`, and `STOPPED` obey a closed 20-pair transition table. |
| **`INV-ERB-04`** | Content-Addressed Test Runs | Test run payloads are sorted, canonicalized, and hashed via `clm-kernel` Blake3 before storage in the SQLite Triad. |
| **`INV-DSF-01`** | Declared Fidelity Tiers | Every run explicitly declares its emulation capability tier: T0 (Lab iframe), T1 (Playwright context), T2 (CDP throttling), or T3 (Real physical hardware). |
| **`INV-PRV-01`** | Privacy by Construction | Password fields, PIN inputs, and sensitive attributes are masked and redacted prior to ring buffer entry. |
| **`INV-DEV-01`** | Zero Horizontal Bleed | `document.documentElement.scrollWidth <= window.innerWidth` is enforced across all viewports. |
| **`INV-DEV-02`** | Touch Target Ergonomics | Interactive targets on coarse-pointer devices must meet minimum tap dimensions ($\ge 44\text{px} \times 44\text{px}$). |
| **`INV-DEV-04`** | Frame Latency Budget | Animation frames during orientation swapping must observe the $16.6\text{ms}$ budget ($60\text{fps}$). |

---

## 4. Interaction with the MCard_TDD Monorepo

1. **Kernel Pinning**: `LandingPage` consumes published `clm-kernel@0.0.9`. Any version update must be synchronized with `mcard-studio` via `mcard-studio/scripts/config/kernel-version-consensus.json` and validated by root CI (`check_landingpage_retirement.py`).
2. **Hash Purity**: `LandingPage` owns no local hash provider. All content-addressing (MCard hashes, test-run hashes, canonical JSON IDs) delegates directly to `clm-kernel`.
3. **Retired Surfaces**: Legacy experimental multi-card surfaces have been retired and logged in `retired-islands.yaml`. Any resurrection of retired components is rejected by CI.
4. **Visual Navigation SSOT (`INV-CDO-11`)**: Visual navigation is authored in `design/landing-navigation.penpot`. The generation scripts (`scripts/penpot-nav.mjs`, `scripts/penpot-render.mjs`) compile the Penpot archive into `index.html` and `js/nav.js`, with automated drift detection (`scripts/penpot-drift.mjs`).

---

## 5. Page composition and store ownership (`SPRINT-GQC-04`)

`LandingPage` serves six Astro-hosted workbench Places declared in `src/net/workbench-net.yaml` through `@astrojs/node` middleware mounted in `ws-server.js`, while tombstoned static files such as `pkc-docs-index.html` fall through to Express static hosting. Astro's client router remains disabled so page transitions execute as full document navigations verified by `scripts/check-net.mjs`.

| Page Entry | Astro Source | Workbench Place | Host Mode | Runtime owner and store |
| :--- | :--- | :--- | :--- | :--- |
| `responsive-lab.html` | `src/pages/responsive-lab.astro` | `p_page_responsive_lab` | `astro-islands` (7 Preact islands) | `js/harness/lab-runtime.js` singleton (`window.__lab`, including `window.__lab.workflow`) |
| `index.html` | `src/pages/index.astro` | `p_page_index`, `p_view_index_mcard_viewer` | `astro-wrapped` | Redirects `/` to `/responsive-lab.html`. mounts `js/landing-page-mcard.js` and `js/nav.js` at `?noredirect=1` |
| `app.html` | `src/pages/app.astro` | `p_page_app` | `astro-wrapped` | `public/js/app-bootstrap.js` and `MCardManager` (`window.mcardManager`). classified as `webapp` pending Product Manager review |
| `sprint-registry.html` | `src/pages/sprint-registry.astro` | `p_page_sprint_registry` | `astro-wrapped` | Inline `/api/clm/registry` projection owned by Scrum Master |
| `fiber-inspector.html` | `src/pages/fiber-inspector.astro` | `p_page_fiber_inspector` | `astro-wrapped` | `public/js/fibers/registry.js` diagnostic harness owned by Architect |
| `fiber-conformance.html` | `src/pages/fiber-conformance.astro` | `p_page_fiber_conformance` | `astro-wrapped` | `public/js/fibers/registry.js` conformance harness owned by Architect |

Two legacy Redux stores remain intentionally separate because zero active workbench pages share user state across them:
1. `js/redux/store.js` (`clm`, `auth`, `ui`, and `navigation` slices on `window.__REDUX_STORE__`) is imported only by `js/renderers/index.js` for CLM component isolation.
2. `js/store/store.js` (`auth`, `music`, and `room` slices) is imported only by `js/modules/auth-manager.js`, `js/modules/webrtc-dashboard/index.html`, and standalone music demos under `public/examples/Music/`.

Standalone browser capability descriptors in `modules.json` (`markdown-renderer`, `net-gateway`, `p2p-serverless`, and `tic-tac-toe-p2p`) carry explicit `owner` and `required` metadata enforced by `PKC.init()` and `PKC.stop()` in `js/pkc-core.js`.

---

## 6. Responsive Lab island map and dual-net boundary (`SPRINT-GQC-04`)

`src/pages/responsive-lab.astro` validates `src/net/workbench-net.yaml` and `tests/fixtures/spa-test-target.graph.json` in Node frontmatter using `scripts/check-net.mjs`, `assertDisjointNetIds()`, and `Layer4TrellisNavigationNet` from `clm-kernel`, then passes plain JSON `targetNets` props to `SpaTestWorkflow`. Browser islands never import `clm-kernel` or Node `crypto`.

| Island | Source File | Directive | Mounted Vanilla Module | BMAD Owner |
| :--- | :--- | :--- | :--- | :--- |
| `TargetToolbarIsland` | `src/islands/TargetToolbarIsland.jsx` | `client:load` | `js/harness/lab-toolbar.js`, `js/harness/target-membrane.js` | Architect and Dev |
| `DevicePresetsIsland` | `src/islands/DevicePresetsIsland.jsx` | `client:load` | `js/harness/device-presets-ui.js`, `js/device-registry.js` | UX Designer and Dev |
| `ViewportStageIsland` | `src/islands/ViewportStageIsland.jsx` | `client:only="preact"` | `js/harness/viewport-stage.js`, `#mission-control-iframe` | Architect and TEA |
| `RecordingRibbonIsland` | `src/islands/RecordingRibbonIsland.jsx` | `client:load` | `js/harness/recording-ribbon.js`, `js/harness/recorder.js` | TEA and Dev |
| `SpaTestWorkflow` | `src/islands/SpaTestWorkflow.jsx` | `client:load` | `js/harness/spa-test-workflow.js` | Product Manager, Architect, TEA, and UX Designer |
| `ConformancePanelIsland` | `src/islands/ConformancePanelIsland.jsx` | `client:visible` | `js/harness/conformance-panel.js` | TEA and UX Designer |
| `MCardResultIsland` | `src/islands/MCardResultIsland.jsx` | `client:visible` | `runtime.recorder.lastSavedRun`, `runtime.subscribeSavedRun` | Product Manager and Dev |

Full ownership details, bundle byte budgets, lifecycle leak counters, and paired cold-load measurements live in `docs/sprints/_active/evidence/GQC-04-module-and-island-ownership.md`.
