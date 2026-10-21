# 🏗️ System Architecture

This section documents the technical architecture, design patterns, and component interactions of the **LandingPage** submodule within the **MCard_TDD** monorepo.

---

## 🏛️ Monorepo Framework: The Four-Estate Architecture (`ULR-01`)

Under the `ULR-01` architectural census, the `MCard_TDD` monorepo is partitioned into four distinct estates with clear boundary contracts:

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
                            │ (consumes clm-kernel@0.0.9)
                   ┌────────▼────────┐
                   │  LandingPage/   │
                   │ Estate 4: Sub 3 │
                   └─────────────────┘
```

1. **Estate 1 (Root Coordinator — `MCard_TDD`)**: Owns shared schema, registries, cross-submodule CI verification gates (`check_ulr_census.py`, `check_landingpage_retirement.py`, `check_ulr_root_dependencies.py`, `check_ulr_convergence.py`).
2. **Estate 2 (Pure Microkernel — `clm/`)**: Formal Cubical Logic Model mathematics, pure algorithms, and the canonical kernel library (`clm-kernel`).
3. **Estate 3 (Host Workspace — `mcard-studio/`)**: Electron/Vite desktop and web studio host, multi-view dockview, spatial canvas, human interface.
4. **Estate 4 (Submodule 3 — `LandingPage/`)**: Responsive test workbench, single-page MCard manager, and SSRF-guarded portal membrane.

---

## 🔬 Submodule 3: Core Architectural Pillars

`LandingPage` is organized around three pillars:

### 1. Responsive Test Workbench (`responsive-lab.html`)
A static-first, modular testing workbench for certifying the device-sensitive functionality of any chosen target web application.
- **Viewport Stage & Containment (`js/harness/viewport-stage.js`)**: Physical 2D orientation swapping (`INV-RVP-01`) and automatic layout-box scaling $s = \min(1, W/w, H/h)$ (`INV-RVP-02`).
- **Device Registry & Fidelity Tiers (`js/device-registry.js`, `js/harness/fidelity.js`)**: Schema v2 device profiles across 8 presets with declared fidelity tiers T0 (iframe viewport), T1 (Playwright context), T2 (CDP throttling), and T3 (real device) (`INV-DSF-01`, `INV-DSF-02`).
- **Membrane Interceptor & Touch Ergonomics (`js/harness/membrane-interceptor.js`)**: Single-writer iframe target membrane (`INV-STU-01`), scale-free coordinate normalization $[0.0, 1.0]$ (`INV-ERB-02`), privacy redaction (`INV-PRV-01`), and coarse-pointer tap target auditing ($\ge 44\text{px} \times 44\text{px}$, `INV-DEV-02`).
- **In-Memory Ring Buffer & State Engine (`js/harness/event-ring-buffer.js`, `recording-state-machine.js`)**: Bounded FIFO event ring buffer ($N \le 2048$, `INV-ERB-01`) and 20-pair deterministic state machine (`INV-ERB-03`).
- **In-Target Telemetry & CLM Persistence (`js/harness/telemetry-collector.js`, `server/test-run-api.mjs`)**: Horizontal bleed detection (`INV-DEV-01`), frame budget & CLS observation (`INV-DEV-04`), and SQLite Triad persistence with Blake3 hashing (`INV-ERB-04`).
- **Deterministic Replay Driver & Systematic Sweeps (`scripts/playwright-replay-driver.mjs`)**: Headless Playwright replay driver supporting paced and instant runs, and 16-combination sweep matrix.
- **Device Conformance Catalog & Certification (`tests/conformance/checks/`)**: 15 modular checks generating regression diffs and the responsive certification record `urn:mcard:certification:responsive:v1`.

### 2. Single-Page MCard Distillation (`SMR-09`)
- Emits the landing page as an immutable, content-addressed MCard (`urn:mcard:content:landing_page`) via `js/landing-page-mcard.js`.
- Hosts the 6-sample portal database (`data/samples/portal_samples.mcard.db`) on the canonical 3-table SQLite schema (`cards`, `handles`, `blobs`).
- Consumes published `clm-kernel@0.0.9` with zero duplicate local hash providers.

### 3. SSRF-Guarded External Portal Membrane
- Enforces strict network-level SSRF guards (`js/external-portal-membrane.js`, `server/mcard-api.mjs`):
  - DNS resolution validation
  - Loopback, link-local, and private IP blocking
  - Redirect validation and body size limits (2MB cap)
  - Opt-in cross-origin probe agent with origin- and nonce-checked validation (`js/harness/lab-probe-agent.js`).

---

## 📚 Documents in This Section

- **[landing-page-architecture.md](landing-page-architecture.md)** — Architectural blueprint of the landing page and test workbench.
- **[MCARD_MODULAR_ARCHITECTURE.md](MCARD_MODULAR_ARCHITECTURE.md)** — MCard distillation, canonical Triad storage, and handle resolution.
- **[CUBIC-LOGIC-MODEL.md](CUBIC-LOGIC-MODEL.md)** — Three Sets (三套東西) theory: Abstract, Concrete, Balanced.
- **[redux-clm-type-theory.md](redux-clm-type-theory.md)** — State typing and categorical semantics for CLM execution.
- **[MODULAR_ARCHITECTURE.md](MODULAR_ARCHITECTURE.md)** — ES module decomposition and zero-dependency guarantees.
- **[architecture-serverless-p2p.md](architecture-serverless-p2p.md)** — WebRTC peer-to-peer data mesh design.
- **[webrtc-communication-design.md](webrtc-communication-design.md)** — WebRTC channel architecture.
- **[webrtc-connection-handshake-flow.md](webrtc-connection-handshake-flow.md)** — Peer connection handshake sequence.

---

## 🧭 Related Functional Tiers

- [**08-testing/**](../08-testing/README.md) — Comprehensive guide to the device-sensitive testing infrastructure.
- [**03-data-management/**](../03-data-management/README.md) — MCard SQLite Triad persistence and sample corpus.
- [**06-components/**](../06-components/README.md) — Viewport stage and CLM component specs.
