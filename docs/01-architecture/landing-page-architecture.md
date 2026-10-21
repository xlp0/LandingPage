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
