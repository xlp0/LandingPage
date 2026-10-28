# Master Documentation Index

| Field | Value |
| --- | --- |
| Audience | Developers, architects, product managers, QA engineers, and operators |
| BMAD Owner | Tech Writer (`bmad-agent-tech-writer`) |
| Source of Truth | [`README.md`](../README.md), [`docs/README.md`](./README.md), and [`src/net/workbench-net.yaml`](../src/net/workbench-net.yaml) |
| Consensus Kernel | `clm-kernel@0.0.13` |

Welcome to the master documentation index for **PKC Landing Page, Universal 4-Modality MCard Content Browser, and Responsive Test Workbench** (Estate 4 / Submodule 3 of `MCard_TDD`).

---

## Sprint Programs and Governance

- **[Program GQC (`docs/sprints/_active/`)](sprints/_active/INDEX.md)** (Completed in `_active/`, awaiting operator graduation)
  - [Program GQC Plan](sprints/_active/gqc-plan.md)
  - [SPRINT-GQC-07 Documentation Alignment and Gates](sprints/_active/SPRINT-GQC-07-documentation-alignment-and-gates.md)
  - [GQC-07 Evidence and Graduation Report](sprints/_active/evidence/GQC-07-docs-and-graduation.md)
- **[Program SMO (`docs/sprints/01-architecture/`)](sprints/01-architecture/INDEX.md)** (Graduated 2026-10-21; historical `clm-kernel@0.0.10` baseline, superseded by `0.0.13`)
  - [00. Program Charter](sprints/01-architecture/00-submodule-modularity-and-organizational-program-charter.md)
  - [SMO-01 Submodule Topology and Binary-Safe Triad API](sprints/01-architecture/sprint-smo01-submodule-topology-and-monorepo-duality.md)
  - [SMO-02 Published Kernel Consensus (Historical 0.0.10)](sprints/01-architecture/sprint-smo02-published-kernel-consensus-and-dependency-parity.md)
  - [SMO-03 Four-Estate Contracts and 4-Modality Membrane](sprints/01-architecture/sprint-smo03-four-estate-cross-boundary-contracts.md)
  - [SMO-04 Documentation Hygiene and Tier Reorganization](sprints/01-architecture/sprint-smo04-documentation-hygiene-and-tier-reorganization.md)
  - [SMO-05 Master README Alignment and Verification](sprints/01-architecture/sprint-smo05-master-readme-alignment-and-verification.md)
- **[Program ERB (`docs/sprints/08-testing/`)](sprints/08-testing/INDEX.md)** (Graduated 2026-10-21)
  - [SPRINT-ERB-00 Infrastructure Modularization](sprints/08-testing/SPRINT-ERB-00-infrastructure-refactoring.md)
  - [SPRINT-ERB-01 Bounded Event Ring Buffer and FSM](sprints/08-testing/SPRINT-ERB-01-ring-buffer-core.md)
  - [SPRINT-ERB-05 Device Capability Profiles and Fidelity Tiers](sprints/08-testing/SPRINT-ERB-05-device-capability-profiles.md)
  - [SPRINT-ERB-02 Target Membrane Interceptor and Normalization](sprints/08-testing/SPRINT-ERB-02-membrane-normalization.md)
  - [SPRINT-ERB-03 Device Telemetry Collector and Triad Persistence](sprints/08-testing/SPRINT-ERB-03-mcard-clm-persistence.md)
  - [SPRINT-ERB-04 Deterministic Playwright Replay and Sweeps](sprints/08-testing/SPRINT-ERB-04-playwright-deterministic-replay.md)
  - [SPRINT-ERB-06 Device-Sensitive Conformance Suite and Certification](sprints/08-testing/SPRINT-ERB-06-device-sensitive-conformance.md)

---

## Capability Reference Library (`docs/functionalities/`)

Maintained capability reference documents (`DECISIONS.tsv` row 63), complementing the operational how-to guides in `00-getting-started/` through `11-standards/`.

- **[Capability Reference Index (`docs/functionalities/README.md`)](functionalities/README.md)**
  - [00. Master Overview and Functionality Map](functionalities/00-OVERVIEW-AND-FUNCTIONALITY-MAP.md)
  - [01. Mission Control and MCard Management](functionalities/01-MISSION-CONTROL-AND-MCARD-MANAGEMENT.md)
  - [02. Polymorphic Content Rendering Pipeline](functionalities/02-POLYMORPHIC-CONTENT-RENDERING-PIPELINE.md)
  - [03. Cubical Logic Model and Fiber Correctness](functionalities/03-CUBICAL-LOGIC-MODEL-AND-FIBER-CORRECTNESS.md)
  - [04. WebRTC P2P Mesh and Real-Time Collaboration](functionalities/04-WEBRTC-P2P-MESH-AND-REALTIME-COLLABORATION.md)
  - [05. Real-Time Multiplayer Board Games](functionalities/05-REALTIME-MULTIPLAYER-BOARD-GAMES.md)
  - [06. Authentication and Identity System](functionalities/06-AUTHENTICATION-AND-IDENTITY-SYSTEM.md)
  - [07. In-Browser AI and WebLLM Runtime](functionalities/07-IN-BROWSER-AI-AND-WEB-LLM-RUNTIME.md)
  - [08. Observability, Lagrangian Mechanics, and Telemetry](functionalities/08-OBSERVABILITY-LAGRANGIAN-AND-TELEMETRY.md)
  - [09. Responsive UI Lab, PenPot Navigation, and Design System](functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md)
  - [10. DevOps, ArgoCD GitOps, and Cloud Infrastructure](functionalities/10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md)

---

## Categorized Engineering Tiers (`00` through `11`)

| Domain | Scope | Entry Point |
| :--- | :--- | :--- |
| **00. Getting Started** | Developer onboarding, port map (`3000`, `4322`, `3001`), operational status, interactive lab guide | [00-getting-started/README.md](00-getting-started/README.md) |
| **01. Architecture** | [LandingPage Architecture](01-architecture/landing-page-architecture.md), [Astro Host and Islands](01-architecture/astro-host-and-islands.md), [Workbench Net](01-architecture/workbench-net.md), [Universal 4-Modality MCard Browser](01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md) | [01-architecture/README.md](01-architecture/README.md) |
| **02. Authentication** | Zitadel OIDC, Google OAuth setup, PKCE flow, privacy redaction (`INV-PRV-01`) | [02-authentication/README.md](02-authentication/README.md) |
| **03. Data Management** | Canonical SQLite Triad, `clm-kernel@0.0.13` consensus, three hash domains, sample corpus | [03-data-management/README.md](03-data-management/README.md) |
| **04. Networking** | WebRTC P2P data mesh, WebSocket `/ws/` signaling on port `3000`, SSRF membrane | [04-networking/README.md](04-networking/README.md) |
| **05. State Management** | `lab-runtime.js` coordinator, isolated legacy Redux stores, 20-pair recording FSM | [05-state-management/README.md](05-state-management/README.md) |
| **06. Components** | Preact islands, Responsive Lab harness modules, CLM Three Sets, 3D Theater, games | [06-components/README.md](06-components/README.md) |
| **07. Deployment** | Docker (`EXPOSE 3000`, compose `8765:3000`), ArgoCD GitOps, R2 CDN, CI gates | [07-deployment/README.md](07-deployment/README.md) |
| **08. Testing** | `node:test` unit suites, Playwright `smoke`/`components`/`features` projects, replay, conformance | [08-testing/README.md](08-testing/README.md) |
| **09. Performance** | [GQC-06 SPA and Island Baselines](09-performance/gqc-06-spa-and-island-baselines.md), place byte budgets, Grafana Faro/Loki | [09-performance/README.md](09-performance/README.md) |
| **10. Project Management** | BMAD ownership, agile workflows, epics, and stories | [10-project-management/README.md](10-project-management/README.md) |
| **11. Standards** | CSS token contracts (`tokens.css`, `semantic-tokens.css`), clean-room and docs gates | [11-standards/README.md](11-standards/README.md) |
