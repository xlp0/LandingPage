# 📚 Documentation Structure Guide

> **Last Updated:** October 2026  
> **Status:** Organized & Verified (`Program SMO` Complete)

## 🌟 Authoritative Functional Specifications

> For the comprehensive functional documentation library covering all systems of the platform, see:  
> 📖 [**Functional Specifications Library (`docs/functionalities/`)**](functionalities/README.md)
>
> - [00. Master Overview & Architecture Map](functionalities/00-OVERVIEW-AND-FUNCTIONALITY-MAP.md)
> - [01. Mission Control & MCard Management](functionalities/01-MISSION-CONTROL-AND-MCARD-MANAGEMENT.md)
> - [02. Polymorphic Content Rendering Pipeline](functionalities/02-POLYMORPHIC-CONTENT-RENDERING-PIPELINE.md)
> - [03. Cubical Logic Model (CLM) & Fiber Correctness](functionalities/03-CUBICAL-LOGIC-MODEL-AND-FIBER-CORRECTNESS.md)
> - [04. WebRTC P2P Mesh & Real-Time Collaboration](functionalities/04-WEBRTC-P2P-MESH-AND-REALTIME-COLLABORATION.md)
> - [05. Real-Time Multiplayer Board Games](functionalities/05-REALTIME-MULTIPLAYER-BOARD-GAMES.md)
> - [06. Authentication & Identity System (Zitadel OIDC)](functionalities/06-AUTHENTICATION-AND-IDENTITY-SYSTEM.md)
> - [07. In-Browser AI & WebLLM Runtime](functionalities/07-IN-BROWSER-AI-AND-WEB-LLM-RUNTIME.md)
> - [08. Observability, Lagrangian Mechanics & Telemetry](functionalities/08-OBSERVABILITY-LAGRANGIAN-AND-TELEMETRY.md)
> - [09. Responsive UI Lab, Penpot & Design System](functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md)
> - [10. DevOps, ArgoCD GitOps & Cloud Infrastructure](functionalities/10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md)

---

## 🏗️ Documentation Architecture

This directory contains all technical documentation for the **PKC Landing Page, Universal 4-Modality MCard Content Browser, and Responsive Test Workbench** (Submodule 3 of `MCard_TDD`). Only `INDEX.md` and `README.md` reside at the `docs/` root; all domain documents live inside numbered tiers (`00-getting-started/` through `11-standards/`), `functionalities/`, `sprints/`, `project/`, `rules/`, or `archive/`.

---

## 📁 Directory Structure

```text
docs/
├── functionalities/                  # Comprehensive Functional Specifications Library
├── README.md                         # This file - Documentation guide
├── INDEX.md                          # Master navigation index
│
├── 00-getting-started/               # Entry point for new developers
│   ├── README.md
│   ├── START_HERE.md
│   ├── QUICKSTART.md
│   ├── STATUS.md
│   └── OPEN_AND_USE.md
│
├── 01-architecture/                  # System architecture & Universal MCard Browser
│   ├── README.md
│   ├── UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md
│   ├── landing-page-architecture.md
│   ├── webrtc-communication-design.md
│   ├── webrtc-connection-handshake-flow.md
│   ├── CUBIC-LOGIC-MODEL.md
│   ├── MODULAR_ARCHITECTURE.md
│   ├── MCARD_MODULAR_ARCHITECTURE.md
│   └── architecture-serverless-p2p.md
│
├── 02-authentication/                # Auth & security (Zitadel OIDC, OAuth, PKCE)
│   ├── README.md
│   ├── ZITADEL_SETUP.md
│   ├── ZITADEL_INTEGRATION_GUIDE.md
│   ├── ZITADEL_SETUP_INSTRUCTIONS.md
│   ├── GOOGLE_OAUTH_SETUP_GUIDE.md
│   └── PKC_ZITADEL_Game_Board_Planning.md
│
├── 03-data-management/               # MCard CAS, Canonical Triad SQLite & clm-kernel@0.0.10
│   ├── README.md
│   ├── MCARD-JS-SETUP.md
│   ├── MCARD_LIBRARY_STRATEGY.md
│   ├── MCARD_LIBRARY_USAGE.md
│   ├── MCARD_LIBRARY_ISSUE.md
│   ├── CONTENT_RENDERING_SYSTEM.md
│   └── mcard/
│
├── 04-networking/                    # WebRTC & P2P mesh
│   ├── README.md
│   └── webrtc-*.md
│
├── 05-state-management/              # Redux Toolkit store & slices
│   ├── README.md
│   └── redux/
│
├── 06-components/                    # UI components, 3D Theater & Multiplayer Games
│   ├── README.md
│   ├── components/
│   └── games/
│       ├── CHESS_GAME_DOCUMENTATION.md
│       ├── DND_BALI_GAME_DOCUMENTATION.md
│       ├── GO_GAME_DOCUMENTATION.md
│       ├── MONOPOLY_GAME_DOCUMENTATION.md
│       └── dungeons-and-dragons/
│
├── 07-deployment/                    # CI/CD, ArgoCD & R2 CDN
│   ├── README.md
│   ├── ARGOCD_DEPLOYMENT.md
│   ├── ARGOCD_QUICK_GUIDE.md
│   ├── R2_SETUP.md
│   ├── SELF-HOSTED-CDN.md
│   └── BACKEND_IMPLEMENTATION.md
│
├── 08-testing/                       # Device-Sensitive Testing Infrastructure
│   ├── README.md
│   ├── DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md
│   └── VERIFICATION_CHECKLIST.md
│
├── 09-performance/                   # Performance & observability
│   ├── README.md
│   ├── optimization/
│   └── observability/
│
├── 10-project-management/            # Epics, stories & BMAD workflow state
│   ├── README.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── bmm-workflow-status.yaml
│   ├── epics/
│   └── stories/
│
├── 11-standards/                     # Coding standards & CSS contracts
│   ├── README.md
│   ├── rules/
│   └── features/
│
├── sprints/                          # Graduated sprint programs & active pointer
│   ├── _active/                      # Active sprints pointer (currently idle)
│   ├── 01-architecture/              # Program SMO: Submodule Modularity (SMO-00..05)
│   └── 08-testing/                   # Program ERB: Device-Sensitive Testing (ERB-00..06)
│
└── archive/                          # Historical & superseded documentation
    ├── PHASE1_COMPLETE.md
    ├── REORGANIZATION_PROPOSAL.md
    └── STATUS_ROOT_LEGACY.md
```

---

## 🎯 Quick Navigation by Task

### 🚀 Get Started
- New to project -> [00-getting-started/START_HERE.md](00-getting-started/START_HERE.md)
- Quick setup -> [00-getting-started/QUICKSTART.md](00-getting-started/QUICKSTART.md)
- Check status -> [00-getting-started/STATUS.md](00-getting-started/STATUS.md)

### 🏗️ Understand the Architecture
- Universal 4-Modality MCard Browser -> [01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md](01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md)
- LandingPage Architecture -> [01-architecture/landing-page-architecture.md](01-architecture/landing-page-architecture.md)
- Cubical Logic Model -> [01-architecture/CUBIC-LOGIC-MODEL.md](01-architecture/CUBIC-LOGIC-MODEL.md)
- Modular Architecture -> [01-architecture/MODULAR_ARCHITECTURE.md](01-architecture/MODULAR_ARCHITECTURE.md)

### 🔐 Set Up Authentication
- Zitadel OAuth -> [02-authentication/ZITADEL_SETUP.md](02-authentication/ZITADEL_SETUP.md)
- Zitadel Integration Guide -> [02-authentication/ZITADEL_INTEGRATION_GUIDE.md](02-authentication/ZITADEL_INTEGRATION_GUIDE.md)
- Google OAuth Setup -> [02-authentication/GOOGLE_OAUTH_SETUP_GUIDE.md](02-authentication/GOOGLE_OAUTH_SETUP_GUIDE.md)
- Client secrets -> [02-authentication/GENERATE_CLIENT_SECRET.md](02-authentication/GENERATE_CLIENT_SECRET.md)
- Backend integration -> [02-authentication/OAUTH_BACKEND_INTEGRATION.md](02-authentication/OAUTH_BACKEND_INTEGRATION.md)

### 💾 Work with MCard & Storage
- MCard Setup -> [03-data-management/MCARD-JS-SETUP.md](03-data-management/MCARD-JS-SETUP.md)
- Usage Tutorial -> [03-data-management/mcard/how_to_use_mcard_js.md](03-data-management/mcard/how_to_use_mcard_js.md)
- Library Strategy -> [03-data-management/MCARD_LIBRARY_STRATEGY.md](03-data-management/MCARD_LIBRARY_STRATEGY.md)
- Content Rendering System -> [03-data-management/CONTENT_RENDERING_SYSTEM.md](03-data-management/CONTENT_RENDERING_SYSTEM.md)

### 🌐 Implement WebRTC
- Communication Design -> [01-architecture/webrtc-communication-design.md](01-architecture/webrtc-communication-design.md)
- Connection Handshake Flow -> [01-architecture/webrtc-connection-handshake-flow.md](01-architecture/webrtc-connection-handshake-flow.md)
- P2P Serverless -> [04-networking/p2p-serverless-implementation.md](04-networking/p2p-serverless-implementation.md)

### 🎨 Build Components & Games
- Component Overview -> [06-components/README.md](06-components/README.md)
- CLM Registry Alignment -> [06-components/CLM_REGISTRY_ALIGNMENT.md](06-components/CLM_REGISTRY_ALIGNMENT.md)
- CLM Dynamic Loading -> [06-components/CLM-DYNAMIC-LOADING.md](06-components/CLM-DYNAMIC-LOADING.md)
- Chess Game Docs -> [06-components/games/CHESS_GAME_DOCUMENTATION.md](06-components/games/CHESS_GAME_DOCUMENTATION.md)
- Go Game Docs -> [06-components/games/GO_GAME_DOCUMENTATION.md](06-components/games/GO_GAME_DOCUMENTATION.md)
- Monopoly Game Docs -> [06-components/games/MONOPOLY_GAME_DOCUMENTATION.md](06-components/games/MONOPOLY_GAME_DOCUMENTATION.md)
- D&D Bali Game Docs -> [06-components/games/DND_BALI_GAME_DOCUMENTATION.md](06-components/games/DND_BALI_GAME_DOCUMENTATION.md)

### 🚢 Deploy & Debug
- ArgoCD Deployment -> [07-deployment/ARGOCD_DEPLOYMENT.md](07-deployment/ARGOCD_DEPLOYMENT.md)
- ArgoCD Quick Guide -> [07-deployment/ARGOCD_QUICK_GUIDE.md](07-deployment/ARGOCD_QUICK_GUIDE.md)
- R2 Storage -> [07-deployment/R2_SETUP.md](07-deployment/R2_SETUP.md)
- Troubleshooting -> [09-performance/observability/TROUBLESHOOTING.md](09-performance/observability/TROUBLESHOOTING.md)
- WebRTC Connectivity -> [04-networking/webrtc-connectivity-issues.md](04-networking/webrtc-connectivity-issues.md)
