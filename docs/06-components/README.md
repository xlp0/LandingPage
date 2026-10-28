# 🧩 Component Architecture & CLM Framework

| Field | Value |
| --- | --- |
| Audience | Engineers, architects, and QA reviewers working in this documentation tier |
| BMAD Owner | Developer (`bmad-agent-dev`) and UX Designer (`bmad-agent-ux-designer`) |
| Source of Truth | [`src/islands/`](../../src/islands/) and [`js/harness/`](../../js/harness/) |
This directory documents the component specifications, the Responsive UI Lab harness modules, the Cubical Logic Model (CLM) component framework, and the interactive observability panels in `LandingPage`.

---

## 🎯 Component Systems Overview

`LandingPage` features two complementary component tiers:

```
┌────────────────────────────────────────────────────────┐
│                   Component Systems                    │
│                                                        │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │    Responsive Lab Stage  │  │   CLM Framework    │  │
│  │   Harness Modules (ESM)  │  │ (Three Sets / 3D)  │  │
│  ├──────────────────────────┤  ├────────────────────┤  │
│  │ • ViewportStage          │  │ • Abstract (What)  │  │
│  │ • LabToolbar             │  │ • Concrete (How)   │  │
│  │ • TargetMembrane         │  │ • Balanced (Why)   │  │
│  │ • MembraneInterceptor    │  │ • Dynamic Registry │  │
│  │ • TelemetryCollector     │  │ • 3D Theater       │  │
│  └──────────────────────────┘  └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Responsive UI Lab Harness Modules (`js/harness/`)**:
   - Modular ES components extracted during ERB-00.
   - Strictly encapsulated: single-writer target membrane (`INV-STU-01`), layout-box scaling (`INV-RVP-02`), scale-free coordinate normalization (`INV-ERB-02`), tap ergonomics (`INV-DEV-02`), and live telemetry collectors (`INV-DEV-01..04`).
2. **Cubical Logic Model (CLM) Components (`js/components/`)**:
   - Components structured around the Three Sets (三套東西) principle:
     - **Abstract Dimension**: Problem definition, interface contracts, and invariants.
     - **Concrete Dimension**: DOM/SVG/WebGL implementation and event handlers.
     - **Balanced Dimension**: Verification, test runners, and business value.
3. **Observability & Inspection Components (`js/observability/`)**:
   - Correctness inspector with Hoare triple tables ($\{P\}\;C\;\{Q\}$) and Map/Territory separation.
   - Least-action navigator computing Software Lagrangian $\mathcal{L} = S_T - H_T$ and vector compass directionality.
   - 3D Theater component using Three.js for spatial MCard rendering.

---

## 📚 Documents in This Section

### Responsive Lab Harness
- See [**08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md**](../08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md) for full harness API documentation (`ViewportStage`, `TargetMembrane`, `LabToolbar`, `MembraneInterceptor`, `TelemetryCollector`).

### CLM Framework & Architecture
- **[CLM_Language_Specification.md](CLM_Language_Specification.md)** - Formal specification of the Cubical Logic Model language.
- **[CLM-DYNAMIC-LOADING.md](CLM-DYNAMIC-LOADING.md)** - Dynamic component discovery and on-demand script injection.
- **[CLM_REGISTRY_ALIGNMENT.md](CLM_REGISTRY_ALIGNMENT.md)** - Component registry alignment with `clm-registry.yaml`.
- **[CLM_UNIFIED_WORKFLOW.md](CLM_UNIFIED_WORKFLOW.md)** - Unified lifecycle from specification to verified component.
- **[CLM_WORKFLOW_RACE_CONDITION_FIX.md](CLM_WORKFLOW_RACE_CONDITION_FIX.md)** - Prevention of race conditions during component registration.
- **[clm-iframe-architecture.md](clm-iframe-architecture.md)** - Sandboxed iframe isolation for untrusted component rendering.
- **[clm-implementation-guide.md](clm-implementation-guide.md)** - Step-by-step tutorial for authoring new CLM components.
- **[clm-think-structure.md](clm-think-structure.md)** - Cognitive model and dimensional decomposition.
- **[cubical-logic-model-for-webrtc.md](cubical-logic-model-for-webrtc.md)** - Applying CLM dimensions to WebRTC signaling.

### Individual Component Specifications (`components/`)
- `clm-app-entry-narrative.md` - Application entry and hero narrative component.
- `clm-auth-status-component.md` - Authentication state badge and user profile popover.
- `clm-hero-content-component.md` - Dynamic hero banner with responsive layout reflow.
- `clm-p2p-status-component.md` - Peer connection health indicator and latency graph.
- `clm-ws-status-component.md` - WebSocket signaling connection status badge.
- `clm-welcome-component.md` - Interactive welcome card with handle resolution.
- `clm-basic-text-component.md` - Pure typographic text component.

### 3D & Visualization
- **[3d-theater-component.md](3d-theater-component.md)** - Three.js WebGL visualization engine for spatial MCards.

### Testing & Verification
- **[CLM_TESTING_SYSTEM.md](CLM_TESTING_SYSTEM.md)** - Component unit testing and verification harnesses.
- **[CLM_TESTING_QUICK_REFERENCE.md](CLM_TESTING_QUICK_REFERENCE.md)** - Quick reference for test assertions and runners.
- **[CLM_MULTI_COMPONENT_TESTING.md](CLM_MULTI_COMPONENT_TESTING.md)** - Inter-component composition testing.

---

## 🧭 Related Functional Tiers

- [**01-architecture/**](../01-architecture/README.md) - System architecture and modularity principles.
- [**05-state-management/**](../05-state-management/README.md) - Redux integration via `clmSlice.js`.
- [**08-testing/**](../08-testing/README.md) - Automated testing and Playwright replay.
