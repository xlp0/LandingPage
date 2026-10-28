# 🧭 LandingPage Functional Specifications Library

| Field | Value |
| --- | --- |
| Audience | Engineers, architects, and QA reviewers consulting capability-level reference architecture |
| BMAD Owner | Tech Writer (`bmad-agent-tech-writer`) and Architect (`bmad-agent-architect`) |
| Classification | Maintained Capability Reference (`DECISIONS.tsv` row 63), distinct from operational quickstarts |
| Source of Truth | [../01-architecture/landing-page-architecture.md](../01-architecture/landing-page-architecture.md), [../../package.json](../../package.json), and linked runtime modules |
| Operational Guide | [../00-getting-started/START_HERE.md](../00-getting-started/START_HERE.md) |

> **Location**: [`LandingPage/docs/functionalities/README.md`](./README.md)  
> **Platform**: GovTech OS / Personal Knowledge Container (`pkc-landing-page-monorepo`)  
> **Target Base**: [`LandingPage/`](../../README.md)  
> **Status**: Comprehensive Functional Documentation

---

## 📖 Introduction

This directory contains the **authoritative, exhaustive functional documentation series** for the **LandingPage** project. Each document extracts and specifies a major functional domain of the platform, detailing its architecture, data models, runtime engines, API endpoints, wire protocols, UI interactions, and underlying source files.

---

## 📚 Specification Index

| Index | Functional Specification Document | Domain & Key Technologies |
| :---: | :--- | :--- |
| **00** | [**Master Overview & Architecture Map**](00-OVERVIEW-AND-FUNCTIONALITY-MAP.md) | Platform topology, monorepo packages, capability taxonomy, master entry points. |
| **01** | [**Mission Control & MCard Management**](01-MISSION-CONTROL-AND-MCARD-MANAGEMENT.md) | `app.html`, `ViewManager`, SQLite WAL backend, card lifecycle, PWA offline engine. |
| **02** | [**Polymorphic Content Rendering Pipeline**](02-POLYMORPHIC-CONTENT-RENDERING-PIPELINE.md) | `RendererRegistry`, Markdown with alerts, KaTeX/MathJax, TikZ-CD, Tone.js audio, PDF.js. |
| **03** | [**Cubical Logic Model (CLM) & Fiber Correctness**](03-CUBICAL-LOGIC-MODEL-AND-FIBER-CORRECTNESS.md) | `clm-kernel@0.0.13`, iframe membrane isolation, Fiber Inspector, Redux CLM middleware. |
| **04** | [**WebRTC P2P Mesh & Real-Time Collaboration**](04-WEBRTC-P2P-MESH-AND-REALTIME-COLLABORATION.md) | Dual-mode networking (serverless QR/SDP vs WebSocket signaling), `RoomService v3`, video meeting, STUN/TURN. |
| **05** | [**Real-Time Multiplayer Board Games**](05-REALTIME-MULTIPLAYER-BOARD-GAMES.md) | P2P Tic-Tac-Toe, Authenticated Monopoly, Chess, Go, D&D Bali engine, move reconciliation. |
| **06** | [**Authentication & Identity System**](06-AUTHENTICATION-AND-IDENTITY-SYSTEM.md) | Zitadel OAuth2/OIDC, PKCE code exchange, secure cookies, token rotation, Redux auth slice. |
| **07** | [**In-Browser AI & WebLLM Runtime**](07-IN-BROWSER-AI-AND-WEB-LLM-RUNTIME.md) | Zero-server WebGPU LLM execution (`@mlc-ai/web-llm`), Phi-2/Llama-2, streaming token chat. |
| **08** | [**Observability, Lagrangian Mechanics & Telemetry**](08-OBSERVABILITY-LAGRANGIAN-AND-TELEMETRY.md) | Software Lagrangian ($\mathcal{L} = S - H$), Fibration dashboard, Grafana Faro RUM, Web Vitals. |
| **09** | [**Responsive UI Lab, Penpot & Design System**](09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md) | Viewport workbench (`responsive-lab.html`), device registry (RVP-02), Penpot drift verification, CSS tokens. |
| **10** | [**DevOps, ArgoCD GitOps & Cloud Infrastructure**](10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md) | Docker, Kubernetes 3-replica HA deployment, ArgoCD GitOps, Cloudflare R2 storage, automated reporting. |

---

## 🎯 Role-Based Reading Tracks

Depending on your engineering focus, we recommend the following reading paths:

```mermaid
graph TD
    Start([Choose Role Track]) --> Arch[System Architects]
    Start --> Front[Frontend & UI Engineers]
    Start --> Realtime[Realtime & P2P Specialists]
    Start --> Sec[Security & Identity Engineers]
    Start --> Ops[DevOps & Platform SREs]

    Arch --> D00[00: Master Overview]
    Arch --> D03[03: Cubical Logic Model]
    Arch --> D08[08: Observability & Lagrangian]

    Front --> D01[01: Mission Control]
    Front --> D02[02: Rendering Pipeline]
    Front --> D09[09: Responsive Lab & Penpot]

    Realtime --> D04[04: WebRTC P2P Mesh]
    Realtime --> D05[05: Multiplayer Board Games]

    Sec --> D06[06: Authentication & Zitadel]
    Sec --> D07[07: Sovereign In-Browser AI]

    Ops --> D10[10: DevOps & ArgoCD GitOps]
```

---

## 🗺️ Codebase Traceability Matrix

| Functional Domain | Primary Source Files | Key Tests | Configuration / Specs |
| :--- | :--- | :--- | :--- |
| **MCard Management** | [`app.html`](../../src/pages/app.astro), [`public/js/ViewManager.js`](../../public/js/ViewManager.js), [`server/mcard-api.mjs`](../../server/mcard-api.mjs) | `tests/smoke/landing-page.spec.js` | `public/config/app-views.json` |
| **Content Renderers**| [`js/renderers/`](../../js/renderers), [`packages/markdown-renderer/`](../../packages/markdown-renderer/README.md) | `tests/components/` | `assets/tikz-diagrams/diagram-manifest.json` |
| **Cubical Logic Model**| [`server/mcard-modality.mjs`](../../server/mcard-modality.mjs), [`js/clm-iframe-loader.js`](../../js/clm-iframe-loader.js) | `tests/features/fiber-conformance.spec.js` | `public/conformance/witness.json` |
| **WebRTC Networking**| [`js/modules/p2p-serverless/`](../../js/modules/p2p-serverless/README.md), [`js/modules/webrtc-dashboard/`](../../js/modules/webrtc-dashboard/README.md), [`ws-server.js`](../../ws-server.js) | `tests/components/test-clm-p2p-status.spec.cjs` | `docker-compose.stun.yml` |
| **Board Games** | [`js/modules/tic-tac-toe-p2p/`](../../js/modules/tic-tac-toe-p2p/README.md), [`public/examples/games/`](../../public/examples/games) | `tests/features/chat-panel.spec.js` | `docs/MONOPOLY_GAME_DOCUMENTATION.md` |
| **Authentication** | [`routes/auth.js`](../../routes/auth.js), [`js/modules/auth-manager.js`](../../js/modules/auth-manager.js) | `tests/components/AuthStatusComponent.js` | `public/config/zitadel-config.js` |
| **In-Browser AI** | [`js/modules/web-llm/`](../../js/modules/web-llm) | Client WebGPU integration tests | `js/modules/web-llm/config.js` |
| **Observability** | [`js/observability/`](../../js/observability), [`js/telemetry/faro-collector.js`](../../js/telemetry/faro-collector.js) | `tests/observability/correctness.test.js` | `mcard.yaml` (`lagrangian_weights`) |
| **Responsive Lab** | [`responsive-lab.html`](../../src/pages/responsive-lab.astro), [`js/device-registry.js`](../../js/device-registry.js) | `tests/features/responsive-rotation-and-devices.spec.js` | `design/landing-navigation.penpot` |
| **DevOps & GitOps** | [`Dockerfile`](../../Dockerfile), [`k8s/`](../../k8s/README.md), [`argocd-application.yaml`](../../argocd-application.yaml) | GitHub Actions CI pipelines | `k8s/kustomization.yaml` |
