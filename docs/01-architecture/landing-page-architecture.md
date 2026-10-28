# Landing Page and Responsive Test Workbench Architecture

This document describes the architectural design of the **LandingPage** submodule (`LandingPage/`) within the **MCard_TDD** framework.

---

## 1. System Mission and Boundaries

`LandingPage` operates as **Estate 4 (Submodule 3)** in the `MCard_TDD` Four-Estate Architecture (`ULR-01`).

Rather than functioning as an unconstrained web portal or an ad-hoc demo collection, `LandingPage` delivers three core capabilities.
1. **The Responsive Test Workbench (`responsive-lab.html`)** certifies the device-sensitive behavior of a chosen target URL against physical device profiles, layout reflow, touch ergonomics, and performance budgets.
2. **Single-Page MCard Distillation (`SMR-09`)** supplies `urn:mcard:content:landing_page` and maintains the 6-sample portal database (`portal_samples.mcard.db`) on the canonical Triad SQLite schema.
3. **SSRF-Guarded External Portal Membrane** inspects, sanitizes, and safely embeds external web targets without exposing internal network endpoints or suffering cross-origin leaks.

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
│   │   - Layer 1 Workbench NetMCard & Layer 4 Target Receipts        │   │
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
| **`INV-ERB-02`** | Spatial Invariance | Pointer coordinates are normalized to $[0.0, 1.0]$ relative to the target's internal viewport where $x_{\text{norm}} = (x - \text{rect.left}) / w$. |
| **`INV-ERB-03`** | Deterministic Recording FSM | State transitions between `IDLE`, `RECORDING`, `PAUSED`, and `STOPPED` obey a closed 20-pair transition table. |
| **`INV-ERB-04`** | Content-Addressed Test Runs | Test run payloads are sorted, canonicalized, and hashed via `clm-kernel` Blake3 before storage in the SQLite Triad. |
| **`INV-DSF-01`** | Declared Fidelity Tiers | Every run explicitly declares its emulation capability tier across T0 (Lab iframe), T1 (Playwright context), T2 (CDP throttling), or T3 (Real physical hardware). |
| **`INV-PRV-01`** | Privacy by Construction | Password fields, PIN inputs, and sensitive attributes are masked and redacted prior to ring buffer entry. |
| **`INV-DEV-01`** | Zero Horizontal Bleed | `document.documentElement.scrollWidth <= window.innerWidth` is enforced across all viewports. |
| **`INV-DEV-02`** | Touch Target Ergonomics | Interactive targets on coarse-pointer devices must meet minimum tap dimensions ($\ge 44\text{px} \times 44\text{px}$). |
| **`INV-DEV-04`** | Frame Latency Budget | Animation frames during orientation swapping must observe the $16.6\text{ms}$ budget ($60\text{fps}$). |

---

## 4. Interaction with the MCard_TDD Monorepo

1. **Kernel Pinning and Provenance Gap** `LandingPage` pins published `clm-kernel@0.0.12` in `package.json` and `package-lock.json`, and `server/mcard-modality.mjs` exports `KERNEL_PROVENANCE = 'clm-kernel@0.0.12'`. `js/harness/recorder.js` still stamps `lab.clmKernel` as `'0.0.10'` on newly recorded `responsive_test_run:v1` payloads. `SPRINT-GQC-05` records this provenance mismatch without mutating stored v1 records, and `SPRINT-GQC-07` owns selecting the canonical version source with Product Manager approval and TEA historical-read tests.
2. **Hash Purity** `LandingPage` owns no local hash provider. All content-addressing (MCard hashes, test-run hashes, canonical JSON IDs, `NetMCard` hashes, and `FiringReceiptMCard` hashes) delegates directly to `clm-kernel` on the server.
3. **Retired Surfaces** Legacy experimental multi-card surfaces have been retired and logged in `retired-islands.yaml`. Any resurrection of retired components is rejected by CI.
4. **Visual Navigation SSOT (`INV-CDO-11`)** Visual navigation for LandingPage itself is authored in `design/landing-navigation.penpot`. The generation scripts (`scripts/penpot-nav.mjs`, `scripts/penpot-render.mjs`) compile the Penpot archive into `js/nav.js`, with automated drift detection (`scripts/penpot-drift.mjs`). External PenPot MPA target assessment remains optional and deferred until Product Manager approval and a live target exist.

---

## 5. Page Composition and Store Ownership (`SPRINT-GQC-04`)

`LandingPage` serves six Astro-hosted workbench Places declared in `src/net/workbench-net.yaml` (`31` Places and `65` Transitions as of `SPRINT-GQC-05`) through `@astrojs/node` middleware mounted in `ws-server.js`, while tombstoned static files such as `pkc-docs-index.html` fall through to Express static hosting. Astro's client router remains disabled so page transitions execute as full document navigations verified by `scripts/check-net.mjs`.

| Page Entry | Astro Source | Workbench Place | Host Mode | Runtime owner and store |
| :--- | :--- | :--- | :--- | :--- |
| `responsive-lab.html` | `src/pages/responsive-lab.astro` | `p_page_responsive_lab` | `astro-islands` (7 Preact islands) | `js/harness/lab-runtime.js` singleton (`window.__lab`, including `window.__lab.workflow`) |
| `index.html` | `src/pages/index.astro` | `p_page_index`, `p_view_index_mcard_viewer` | `astro-wrapped` | Redirects `/` to `/responsive-lab.html`. mounts `js/landing-page-mcard.js` and `js/nav.js` at `?noredirect=1` |
| `app.html` | `src/pages/app.astro` | `p_page_app` | `astro-wrapped` | `public/js/app-bootstrap.js` and `MCardManager` (`window.mcardManager`). classified as `webapp` pending Product Manager review |
| `sprint-registry.html` | `src/pages/sprint-registry.astro` | `p_page_sprint_registry` | `astro-wrapped` | Inline `/api/clm/registry` projection owned by Scrum Master |
| `fiber-inspector.html` | `src/pages/fiber-inspector.astro` | `p_page_fiber_inspector` | `astro-wrapped` | `public/js/fibers/registry.js` diagnostic harness owned by Architect |
| `fiber-conformance.html` | `src/pages/fiber-conformance.astro` | `p_page_fiber_conformance` | `astro-wrapped` | `public/js/fibers/registry.js` conformance harness owned by Architect |

Two legacy Redux stores remain intentionally separate because zero active workbench pages share user state across them.
1. `js/redux/store.js` (`clm`, `auth`, `ui`, and `navigation` slices on `window.__REDUX_STORE__`) is imported only by `js/renderers/index.js` for CLM component isolation.
2. `js/store/store.js` (`auth`, `music`, and `room` slices) is imported only by `js/modules/auth-manager.js`, `js/modules/webrtc-dashboard/index.html`, and standalone music demos under `public/examples/Music/`.

Standalone browser capability descriptors in `modules.json` (`markdown-renderer`, `net-gateway`, `p2p-serverless`, and `tic-tac-toe-p2p`) carry explicit `owner` and `required` metadata enforced by `PKC.init()` and `PKC.stop()` in `js/pkc-core.js`.

---

## 6. Responsive Lab Island Map and Dual-Net Boundary (`SPRINT-GQC-04`)

`src/pages/responsive-lab.astro` validates `src/net/workbench-net.yaml` and `tests/fixtures/spa-test-target.graph.json` in Node frontmatter using `scripts/check-net.mjs`, `assertDisjointNetIds()`, and `scripts/net-to-netmcard.mjs`, then passes plain JSON `targetNets` props (including persisted `NetMCard` and `bindings` hashes) to `SpaTestWorkflow`. Browser islands never import `clm-kernel` or Node `crypto`.

| Island | Source File | Directive | Mounted Vanilla Module | BMAD Owner |
| :--- | :--- | :--- | :--- | :--- |
| `TargetToolbarIsland` | `src/islands/TargetToolbarIsland.jsx` | `client:load` | `js/harness/lab-toolbar.js`, `js/harness/target-membrane.js` | Architect and Dev |
| `DevicePresetsIsland` | `src/islands/DevicePresetsIsland.jsx` | `client:load` | `js/harness/device-presets-ui.js`, `js/device-registry.js` | UX Designer and Dev |
| `ViewportStageIsland` | `src/islands/ViewportStageIsland.jsx` | `client:only="preact"` | `js/harness/viewport-stage.js`, `#mission-control-iframe` | Architect and TEA |
| `RecordingRibbonIsland` | `src/islands/RecordingRibbonIsland.jsx` | `client:load` | `js/harness/recording-ribbon.js`, `js/harness/recorder.js` | TEA and Dev |
| `SpaTestWorkflow` | `src/islands/SpaTestWorkflow.jsx` | `client:load` | `js/harness/spa-test-workflow.js` | Product Manager, Architect, TEA, and UX Designer |
| `ConformancePanelIsland` | `src/islands/ConformancePanelIsland.jsx` | `client:visible` | `js/harness/conformance-panel.js` | TEA and UX Designer |
| `MCardResultIsland` | `src/islands/MCardResultIsland.jsx` | `client:visible` | `runtime.recorder.lastSavedRun`, `runtime.subscribeSavedRun` | Product Manager and Dev |

Full island ownership details, bundle byte budgets, lifecycle leak counters, and `SPRINT-GQC-04` cold-load measurements live in `docs/sprints/_active/evidence/GQC-04-module-and-island-ownership.md`.

---

## 7. MCard Process Persistence, Package Ownership, Renderer Boundaries, and Server Policy (`SPRINT-GQC-05`)

### 7.1 Workbench Site Net and Target Navigation Net in the Triad

`scripts/net-to-netmcard.mjs` and `server/test-run-api.mjs` persist both Petri nets through `CanonicalTriadBackend` in the existing three-table SQLite Triad without adding SQL tables or altering `responsive_test_run:v1`.

1. **Layer 1 Workbench Site Net** `persistWorkbenchNetToTriad()` builds `NetMCard` (`ad37468e01f934a9f9b4ea6dda1dcc7acf2e84e92e99e603ac4807b9acafd5e3`) from `topology` in `src/net/workbench-net.yaml` via `NetMCard.create` and stores `bindings` (`2613f1ddf25da06b465492048a76ffab11f65bd7663927ea4fbf391412d0e817`) as a separate `urn:gqc:net-bindings:v1` MCard so route or owner edits never mutate the topology digest. `persistWorkbenchTraceToTriad()` replays Playwright traces through `ColoredPetriVM` and persists the resulting Layer 1 `FiringRecord` sequence as `urn:gqc:workbench-firing-trace:v1`.
2. **Layer 4 Target Navigation Net** `createLayer4TargetAdapter()` maps each approved target Page to a `PlaceMCard` whose `typeExpr` matches `clm://type/view/<segment>` and keeps `mcard:target:...` route handles in `bindings`. Functional Links register as `TransitionMCard` entries in `Layer4TrellisNavigationNet`. Because `Layer4TrellisNavigationNet` exposes no `toNetMCard()` helper, `buildTargetLayer4Snapshot()` assembles the immutable `NetMCard` (`02fa9716c7880820a00e97c77eb3d292a11a015db5c654768188b70aa1ea6c4f` for `spa-test-target-net`) and separate `bindings` MCard (`f1f8fb4a33d98193f45db0f97e5b89eb3889d0c8856bcdb66d1502a220fbe84c`).
3. **Session Serialization, Error Recovery, and Run Linkage** `POST /api/test-runs/navigation/session` (`p_pending_post_nav_session` via `t_req_post_nav_session`), `POST /api/test-runs/navigation/fire` (`p_pending_post_nav_fire` via `t_req_post_nav_fire`), and `POST /api/test-runs/navigation/link` (`p_pending_post_nav_link` via `t_req_post_nav_link`) serialize transitions per session, deduplicate `(sessionId, requestId)` retries, and persist each `FiringReceiptMCard`. Invalid links trap the session at `p_error_modal` and return HTTP `409` (`requiresRecovery`) on normal transitions until an explicit recovery transition (`t_spa_recover_overview`) or a new session runs. Completed `responsive_test_run:v1` records link to their target `NetMCard` and verified `FiringReceiptMCard` hashes through a separate `urn:gqc:navigation-run-link:v1` MCard bound to `nav_run_link_<runHash>` only after every referenced card verifies in the Triad. Interrupted captures store as `urn:gqc:interrupted-capture:v1` (`incomplete` `true`, `passing` `false`, `certified` `false`), and unrecognized schema versions fail visibly (`400` on write, `422` with `downgradedToV1` `false` on read).

### 7.2 Package Source Ownership and Renderer Separation

`scripts/package-source-parity.json` and `scripts/check-package-source-parity.mjs` enforce ownership across all four package pairs and both renderer registries.

- **`@pkc/markdown-renderer` (`shared-source`)** `packages/markdown-renderer/src/index.js` is the single migrated canonical source in `SPRINT-GQC-05`, built to `packages/markdown-renderer/dist/index.js` and re-exported in-repo by `js/modules/markdown-renderer/index.js`.
- **`@pkc/core` vs `js/pkc-core.js` (`separate-product-variant`)** Kept separate because `js/pkc-core.js` carries `SPRINT-GQC-04` lifecycle ordering and error containment whereas `@pkc/core` remains the standalone v1.0.0 loader.
- **`@pkc/p2p` (`unmigrated-exact-copy-gated`) and `pkc-server` (`unused-package-copy`)** Guarded against silent drift by SHA-256 checks in `scripts/check-package-source-parity.mjs` pending dedicated build and retirement stories.
- **Renderer Separation** `js/landing-page-mcard.js` and `server/mcard-modality.mjs` own the four-modality single-page viewer (`media`, `document`, `code`, `webapp`) on `index.html?noredirect=1`, preserving inert `<pre data-execution="inert">` code display and `<iframe sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer">` portal isolation. `js/renderers/RendererRegistry.js` remains separate for MIME-keyed component isolation under `js/renderers/index.js`.

### 7.3 Server Product Ownership and UI Server-Call Policy

Root `ws-server.js` is the sole supported LandingPage server product mounting Express API routers (`/api/mcard`, `/api/test-runs`, `/api/clm`, `/api/auth`), hoisted config endpoints (`/app-config.json`, `/api/config`), WebSocket signaling (`/ws/`), narrowed CORS, unified CSP without `unsafe-eval`, and the Astro `dist/client` plus `dist/server/entry.mjs` handlers. `packages/server/src/ws-server.js` is a dormant unsupported variant that does not serve Astro pages and remains untouched.

Under the `SPRINT-GQC-05` server-call policy (`DECISIONS.tsv` row 51), existing Express routes stay in place, new UI-reachable server calls default to Astro endpoints or Astro Actions unless WebSocket signaling state, shared Express middleware state, or an existing Express router (`/api/test-runs`) is required, and every client server call under `src/` or `js/harness/` must be declared in `src/net/workbench-net.yaml`. `scripts/check-package-source-parity.mjs` fails whenever an undeclared `fetch`, `sendBeacon`, or `XMLHttpRequest` appears.

Full ownership tables, Triad digests, 10-lane verification results, and paired modality latency benchmarks live in `docs/sprints/_active/evidence/GQC-05-mcard-process-and-ownership.md`.
