# 🚀 Developer Onboarding Guide — Start Here

Welcome to the **PKC Landing Page & Responsive Test Workbench** codebase! This document provides complete onboarding context for developers joining the project.

---

## 🎯 What is the LandingPage Project?

Within the **MCard_TDD** monorepo framework, `LandingPage` functions as **Submodule 3** (Estate 4 under the ULR-01 architectural census). Rather than functioning as a traditional static landing page, it is specialized into three core responsibilities:

1. **Responsive Test Workbench (`responsive-lab.html`)**:
   A dedicated testing workbench for certifying the **device-sensitive functionality** of any chosen target web application. It emulates 8 modern devices across phones, tablets, and desktops, tracks 7 device dimensions (orientation reflow, horizontal bleed, touch ergonomics, event capture ring buffer, frame timing, CLS, and Triad persistence), and provides deterministic Playwright replay.

2. **Single-Page MCard Distillation (`SMR-09`)**:
   Emits the landing page as a self-describing, content-addressed MCard (`urn:mcard:content:landing_page`) and hosts a 6-sample portal database (`data/samples/portal_samples.mcard.db`) on the canonical 3-table Triad SQLite schema.

3. **SSRF-Guarded External Portal Membrane**:
   Provides secure iframe embedding and URL probing with connection-level DNS, loopback/link-local/private-IP blocking, and redirect validation (`js/external-portal-membrane.js`, `server/mcard-api.mjs`).

---

## 💻 Prerequisites & Setup

### Prerequisites
- **Node.js**: $\ge 18.0.0$ (LTS recommended)
- **npm**: $\ge 9.0.0$
- Modern browser (Chromium, Firefox, or WebKit)

### Quick Setup

```bash
# 1. Navigate to the repository
cd LandingPage

# 2. Install dependencies
npm install

# 3. (Optional) Install Playwright browser binaries for testing
npm run install-browsers
```

---

## 🚀 Running the Workbench

Start the local development server:

```bash
npm run dev
# Or: npm run ws-server
```

The server starts on port **3001** (or the port defined in `.env`).

### Key Application Routes

| Route | Description |
| :--- | :--- |
| **`http://localhost:3001/responsive-lab.html`** | **Primary Workbench**: Responsive UI Lab viewport stage, device registry, interaction recorder, and telemetry inspector. |
| **`http://localhost:3001/responsive-lab.html?target=http://localhost:4321/`** | **Target Testing**: Launches the lab pointing to an external or local application (e.g., local Astro dev server). |
| **`http://localhost:3001/index.html`** | **Portal Entry**: Auto-navigates to the Responsive UI Lab at top level while remaining embeddable as an iframe target. |
| **`http://localhost:3001/app.html`** | **Mission Control**: Cockpit for MCard browsing, WebLLM AI runtime, and Lagrangian mechanics telemetry. |
| **`http://localhost:3001/api/test-runs`** | **Test Runs REST API**: SQLite Triad endpoint for persisting and querying test sessions with Blake3 hashing. |
| **`http://localhost:3001/api/mcard`** | **MCard API**: ESM endpoint querying SQLite content-addressed cards and handles. |

---

## 🧪 Running the Automated Verification Battery

All capabilities are verified through automated unit tests, feature specs, replay drivers, and conformance checks:

```bash
# Run all unit tests (73 tests across 12 suites)
npm run test:unit

# Run multi-device systematic sweep across 8 profiles × 2 orientations (16 tests)
npm run test:responsive

# Run deterministic Playwright replay driver at 1×, 2×, 5× (4 tests)
npm run test:replay

# Run 15-check device conformance catalog & mint responsive certificate (16 tests)
npm run test:conformance

# Run viewport rotation and device containment tests (17 tests)
npx playwright test tests/features/responsive-rotation-and-devices.spec.js --project=features

# Run event capture and telemetry tests (8 tests)
npx playwright test tests/features/responsive-capture.spec.js --project=features
```

---

## 📁 Repository Directory Structure

```
LandingPage/
├── responsive-lab.html           # Primary Responsive UI Lab & Test Workbench
├── index.html                    # Streamlined portal entry & embeddable target
├── app.html                      # Mission Control cockpit
├── ws-server.js                  # Express & WebSocket server with CORS allowlist
├── package.json                  # Dependencies (clm-kernel@0.0.9 pin)
├── app-config.json               # Lab target URLs registry (INV-STU-02)
├── retired-islands.yaml          # Formal catalog of retired legacy surfaces
├── js/
│   ├── harness/                  # Lab ESM harness (ERB-00..06 modules)
│   │   ├── viewport-stage.js     # Viewport geometry & containment (INV-RVP-01..02)
│   │   ├── target-membrane.js    # Single-writer iframe membrane (INV-STU-01)
│   │   ├── lab-toolbar.js        # Lab UI controls & target selector
│   │   ├── event-ring-buffer.js  # Bounded FIFO ring buffer (INV-ERB-01)
│   │   ├── recording-state-machine.js # 20-pair deterministic FSM (INV-ERB-03)
│   │   ├── fidelity.js           # Declared fidelity tiers T0–T3 (INV-DSF-01)
│   │   ├── membrane-interceptor.js # Parent-iframe event interceptor & tap ergonomics
│   │   ├── lab-probe-agent.js    # Opt-in cross-origin probe agent
│   │   ├── normalize-event.js    # Scale-free coordinate normalization (INV-ERB-02)
│   │   ├── telemetry-collector.js# Bleed, frame budget & CLS tracking (INV-DEV-01..04)
│   │   └── test-run-schema.js    # Triad serialization & Blake3 hashing (INV-ERB-04)
│   ├── device-registry.js        # Schema v2 device profiles (8 built-in devices)
│   ├── landing-page-mcard.js     # SMR-09 single-page MCard distillation
│   ├── external-portal-membrane.js # SSRF-guarded portal membrane
│   └── nav.js                    # Penpot-generated navigation logic
├── server/
│   ├── test-run-api.mjs          # /api/test-runs SQLite Triad router
│   └── mcard-api.mjs             # /api/mcard ESM API router
├── data/
│   ├── mcard-api.db              # SQLite Triad database for test runs and MCards
│   └── samples/                  # Deterministic 6-sample portal corpus
├── scripts/
│   ├── playwright-replay-driver.mjs # Headless Playwright replay driver
│   └── seed-portal-samples.mjs   # Seed script for portal sample corpus
├── tests/
│   ├── unit/                     # node:test unit suites
│   ├── features/                 # Playwright feature specs
│   └── conformance/              # 15-check modular conformance catalog
└── docs/                         # Tiered documentation directory
    ├── 00-getting-started/       # Onboarding, quickstart, status
    ├── 01-architecture/          # System design & Monorepo estate boundaries
    ├── 02-authentication/        # Zitadel OIDC & PKCE authentication
    ├── 03-data-management/       # MCard Triad storage & clm-kernel integration
    ├── 04-networking/            # WebRTC P2P mesh & signaling
    ├── 05-state-management/      # Redux store & state slices
    ├── 06-components/            # UI components & CLM framework
    ├── 07-deployment/            # ArgoCD GitOps, Docker, CDN
    ├── 08-testing/               # Device-sensitive testing infrastructure
    ├── 09-performance/           # Observability, Faro telemetry, Web Vitals
    ├── 10-project-management/    # Epics, stories, and sprint tracking
    └── 11-standards/             # Coding guidelines, CSS rules, standards
```

---

## 🏛️ Monorepo Position & Boundary Discipline

When contributing to `LandingPage`, keep in mind these architectural invariants:
- **Estate Separation (`ULR-01`)**: `LandingPage` is a consumer of `clm-kernel` and does not define its own cryptographic primitives or alternative logic engines.
- **Kernel Consensus**: Both `LandingPage` and `mcard-studio` pin `clm-kernel@0.0.9`. Any version change must be coordinated across the monorepo via `kernel-version-consensus.json`.
- **SSOT Integrity**: Navigation routes and structure are authored in `design/landing-navigation.penpot` and verified via `scripts/penpot-drift.mjs`.
- **Zero Runtime Dependencies for Lab Stage (`INV-REF-01`)**: The core viewport stage and event ring buffer run in vanilla JavaScript with native CSS custom properties.
