# 📚 Documentation Structure Guide

> **Last Updated:** December 11, 2025  
> **Status:** Organized & Documented

## 🏗️ Documentation Architecture

This directory contains all technical documentation for the THK Mesh Landing Page project. The documentation is organized by category to help you quickly find what you need.

---

## 📁 Directory Structure

```
docs/
├── README.md                    # This file - Documentation guide
├── INDEX.md                     # Quick navigation index
├── STATUS.md                    # Current project status
├── START_HERE.md                # New developer onboarding
├── QUICKSTART.md                # 5-minute setup guide
│
├── 🏗️ architecture/            # System architecture & design
│   ├── landing-page-architecture.md
│   ├── webrtc-communication-design.md
│   └── webrtc-connection-handshake-flow.md
│
├── 🧩 components/               # UI component documentation
│   ├── clm-*.md                # CLM component specs
│   └── [component-name].md     # Individual component docs
│
├── 📊 redux/                    # Redux state management
│   ├── INDEX.md                # Redux overview
│   ├── REDUX_ARCHITECTURE.md   # State architecture
│   └── slices/                 # Redux slice documentation
│       ├── auth-slice.md
│       ├── clm-slice.md
│       └── [slice-name].md
│
├── 📋 epics/                    # Project epics (large features)
│   ├── README.md                # Epic guidelines
│   └── EPIC-XXX-*.md          # Individual epics
│
├── 📝 stories/                  # User stories (small features)
│   └── STORY-XXX-*.md         # Individual stories
│
├── 🗄️ mcard/                    # MCard system documentation
│   ├── README.md                # MCard overview
│   ├── how_to_use_mcard_js.md  # Usage guide
│   └── CLM_Language_Specification_v2.md
│
├── 📈 observability/            # Monitoring & debugging
│   ├── TROUBLESHOOTING.md      # Debug guide
│   ├── client-side-tracking.md
│   └── grafana-*.md            # Grafana setup
│
├── ⚡ performance/              # Performance optimization
│   ├── library-comparison.md
│   └── tikz-*.md               # TikZ rendering optimization
│
├── 📏 rules/                    # Development standards
│   └── css.md                  # CSS guidelines
│
├── ✨ features/                 # Feature documentation
│   └── nested-sidebar.md       # Feature specs
│
└── 🗄️ archive/                  # Deprecated documentation
    └── p2p-libp2p-old-*/       # Old implementations
```

---

## 🗺️ Documentation Categories

### 🚀 Getting Started
Essential documents for new developers and quick setup.

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [`START_HERE.md`](START_HERE.md) | New developer onboarding | 15 min |
| [`QUICKSTART.md`](QUICKSTART.md) | 5-minute project setup | 5 min |
| [`STATUS.md`](STATUS.md) | Current project status | 3 min |
| [`INDEX.md`](INDEX.md) | Quick navigation | 2 min |

### 🏗️ Architecture & Design
System design, architecture decisions, and technical specifications.

| Category | Key Documents | Description |
|----------|---------------|-------------|
| **System Architecture** | `architecture/*.md` | Overall system design |
| **WebRTC** | `webrtc-*.md`, `p2p-*.md` | P2P communication |
| **CLM Framework** | `CLM_*.md`, `CUBIC-LOGIC-MODEL.md` | Cubical Logic Model |
| **Redux State** | `redux/*.md` | State management |

### 🔧 Implementation Guides
Step-by-step implementation and setup instructions.

| Topic | Document | Purpose |
|-------|----------|---------|
| **OAuth/Zitadel** | `ZITADEL_*.md`, `OAUTH_*.md` | Authentication setup |
| **MCard System** | `MCARD-JS-SETUP.md`, `mcard/*.md` | Content management |
| **Backend** | `BACKEND_IMPLEMENTATION.md` | Server implementation |
| **ArgoCD** | `ARGOCD_*.md` | Deployment & CI/CD |
| **Self-Hosted CDN** | `SELF-HOSTED-CDN.md` | Resource hosting |

### 🧩 Components & Features
UI components, features, and their specifications.

| Type | Location | Description |
|------|----------|-------------|
| **CLM Components** | `components/clm-*.md` | CLM UI components |
| **Features** | `features/*.md` | Feature documentation |
| **Content Rendering** | `CONTENT_RENDERING_SYSTEM.md` | Rendering system |

### 📊 State Management
Redux store, slices, and state architecture.

| Slice | Document | Purpose |
|-------|----------|---------|
| **Auth** | `redux/slices/auth-slice.md` | Authentication state |
| **CLM** | `redux/slices/clm-slice.md` | CLM component state |
| **RTC** | `redux/slices/rtc-connection-slice.md` | WebRTC connections |
| **Participants** | `redux/slices/participants-slice.md` | User management |
| **Invitations** | `redux/slices/invitations-slice.md` | Invitation system |

### 🔍 Testing & Verification
Testing strategies, test cases, and verification checklists.

| Document | Purpose |
|----------|---------|
| `CLM_TESTING_*.md` | CLM testing framework |
| `REDUX_AUTH_TESTING.md` | Auth testing |
| `VERIFICATION_CHECKLIST.md` | Release checklist |
| `p2p-testing-guide.md` | P2P testing |

### 📈 Performance & Monitoring
Performance optimization and observability.

| Category | Documents | Focus |
|----------|-----------|-------|
| **Performance** | `performance/*.md` | Optimization strategies |
| **Observability** | `observability/*.md` | Monitoring & debugging |
| **Caching** | `caching-strategy.md` | Cache optimization |

### 📋 Project Management
Epics, stories, and workflow documentation.

| Type | Format | Location |
|------|--------|----------|
| **Epics** | `EPIC-XXX-[name].md` | `epics/` |
| **Stories** | `STORY-XXX-[name].md` | `stories/` |
| **Workflows** | `*_WORKFLOW_*.md` | Root directory |

---

## 🎯 Quick Navigation by Task

### "I want to..."

#### 🚀 **Get Started**
- New to project → [`START_HERE.md`](START_HERE.md)
- Quick setup → [`QUICKSTART.md`](QUICKSTART.md)
- Check status → [`STATUS.md`](STATUS.md)

#### 🔐 **Set Up Authentication**
- Zitadel OAuth → [`ZITADEL_SETUP.md`](ZITADEL_SETUP.md)
- Client secrets → [`GENERATE_CLIENT_SECRET.md`](GENERATE_CLIENT_SECRET.md)
- Backend integration → [`OAUTH_BACKEND_INTEGRATION.md`](OAUTH_BACKEND_INTEGRATION.md)

#### 💾 **Work with MCard**
- Setup guide → [`MCARD-JS-SETUP.md`](MCARD-JS-SETUP.md)
- Usage tutorial → [`mcard/how_to_use_mcard_js.md`](mcard/how_to_use_mcard_js.md)
- Library strategy → [`MCARD_LIBRARY_STRATEGY.md`](MCARD_LIBRARY_STRATEGY.md)

#### 🌐 **Implement WebRTC**
- Architecture → [`architecture/webrtc-communication-design.md`](architecture/webrtc-communication-design.md)
- Connection flow → [`architecture/webrtc-connection-handshake-flow.md`](architecture/webrtc-connection-handshake-flow.md)
- P2P serverless → [`p2p-serverless-implementation.md`](p2p-serverless-implementation.md)

#### 🎨 **Build Components**
- CLM components → [`components/clm-*.md`](components/)
- Component registry → [`CLM_REGISTRY_ALIGNMENT.md`](CLM_REGISTRY_ALIGNMENT.md)
- Dynamic loading → [`CLM-DYNAMIC-LOADING.md`](CLM-DYNAMIC-LOADING.md)

#### 🚢 **Deploy Application**
- ArgoCD setup → [`ARGOCD_DEPLOYMENT.md`](ARGOCD_DEPLOYMENT.md)
- Quick guide → [`ARGOCD_QUICK_GUIDE.md`](ARGOCD_QUICK_GUIDE.md)
- R2 storage → [`R2_SETUP.md`](R2_SETUP.md)

#### 🐛 **Debug Issues**
- Troubleshooting → [`observability/TROUBLESHOOTING.md`](observability/TROUBLESHOOTING.md)
- WebRTC issues → [`webrtc-connectivity-issues.md`](webrtc-connectivity-issues.md)
- Performance → [`performance/`](performance/)

---

## 📝 Documentation Standards

### File Naming Convention

```
TYPE-NUMBER-Description.md
```

- **TYPE:** `EPIC`, `STORY`, `GUIDE`, component name
- **NUMBER:** Sequential numbering (001, 002, etc.)
- **Description:** Clear, kebab-case description

### Document Structure

Each document should follow this template:

```markdown
# Document Title

## Overview
Brief description of the document's purpose.

## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)

## Content
Main content organized by sections.

## Related Documents
- Links to related documentation
- References to dependencies

## Status
Current status and last update date.
```

### Categories

Documents are organized into these primary categories:

1. **🚀 Getting Started** - Onboarding and setup
2. **🏗️ Architecture** - System design and patterns
3. **🧩 Components** - UI component specifications
4. **📊 State Management** - Redux and state docs
5. **🔐 Authentication** - OAuth and security
6. **💾 Data Management** - MCard and storage
7. **🌐 Networking** - WebRTC and P2P
8. **📈 Performance** - Optimization guides
9. **🔍 Testing** - Test strategies and cases
10. **🚢 Deployment** - CI/CD and deployment
11. **📋 Project Management** - Epics and stories
12. **🗄️ Archive** - Deprecated documentation

---

## 🔄 Recent Updates

| Date | Document | Change |
|------|----------|--------|
| 2024-12-11 | `STATUS.md` | Project status report |
| 2024-12-11 | `MCARD-JS-SETUP.md` | mcard-js v2.1.11 update |
| 2024-12-11 | `SELF-HOSTED-CDN.md` | CDN architecture |
| 2024-12-10 | Redux slices | State management docs |

---

## 🎓 Learning Paths

### 👶 **Beginner Path**
1. [`START_HERE.md`](START_HERE.md) - Overview
2. [`QUICKSTART.md`](QUICKSTART.md) - Setup
3. [`architecture/landing-page-architecture.md`](architecture/landing-page-architecture.md) - Basic architecture
4. [`components/`](components/) - UI components

### 🧑‍💻 **Developer Path**
1. [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) - Implementation
2. [`redux/`](redux/) - State management
3. [`CLM_Language_Specification.md`](CLM_Language_Specification.md) - CLM framework
4. [`mcard/`](mcard/) - Content management

### 🏗️ **Architect Path**
1. [`architecture/`](architecture/) - System design
2. [`CUBIC-LOGIC-MODEL.md`](CUBIC-LOGIC-MODEL.md) - CLM theory
3. [`p2p-serverless-design-choices.md`](p2p-serverless-design-choices.md) - Design decisions
4. [`MODULAR_ARCHITECTURE.md`](MODULAR_ARCHITECTURE.md) - Modular patterns

### 🚀 **DevOps Path**
1. [`ARGOCD_*.md`](.) - ArgoCD deployment
2. [`R2_SETUP.md`](R2_SETUP.md) - Storage setup
3. [`observability/`](observability/) - Monitoring
4. [`performance/`](performance/) - Optimization

---

## 🧹 Maintenance Notes

### Documents to Review
- Empty component files in `components/` need content
- Consider consolidating similar CLM documents
- Archive old P2P implementation docs

### Recommended Actions
1. **Clean up root directory** - Move topic-specific docs to subdirectories
2. **Standardize naming** - Use consistent naming convention
3. **Remove duplicates** - Consolidate similar documents
4. **Update INDEX.md** - Ensure it reflects current structure
5. **Archive old docs** - Move deprecated content to `archive/`

---

## 📮 Contributing

When adding new documentation:

1. **Choose the right category** - Place in appropriate subdirectory
2. **Follow naming convention** - Use standard format
3. **Update this README** - Add to relevant sections
4. **Link related docs** - Cross-reference dependencies
5. **Add to INDEX.md** - Update navigation index

---

## 🔗 Quick Links

- **Project Repository:** [GitHub - xlp0/LandingPage](https://github.com/xlp0/LandingPage)
- **Live Demo:** http://localhost:8765
- **Status Dashboard:** [`STATUS.md`](STATUS.md)
- **Support:** Create an issue in the repository

---

**Documentation is a living system. Keep it updated, organized, and accessible!** 📚✨
