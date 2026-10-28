# Documentation Structure Guide

| Field | Value |
| --- | --- |
| Audience | All contributors, architects, QA engineers, and operators navigating `docs/` |
| BMAD Owner | Tech Writer (`bmad-agent-tech-writer`) and Architect (`bmad-agent-architect`) |
| Source of Truth | [`docs/INDEX.md`](./INDEX.md), [`package.json`](../package.json), and [`src/net/workbench-net.yaml`](../src/net/workbench-net.yaml) |
| Drift Gate | `npm run docs:check` |

## Documentation Taxonomy and Ownership

`docs/` separates operational how-to guides, architectural contracts, capability references, and sprint records so each set has one clear owner and role.

| Documentation Set | Path | Classification | Primary BMAD Owner |
| --- | --- | --- | --- |
| **Onboarding and Operations** | [`00-getting-started/`](00-getting-started/README.md) | Maintained operational guides | Developer and Tech Writer |
| **Architecture and Petri Net** | [`01-architecture/`](01-architecture/README.md) | Maintained architectural contracts and generated net reference (`workbench-net.md`) | Architect |
| **Domain Engineering Tiers** | [`02-authentication/`](02-authentication/README.md) through [`11-standards/`](11-standards/README.md) | Maintained domain guides and performance baselines | Domain Lead per tier `README.md` |
| **Capability Reference Library** | [`functionalities/`](functionalities/README.md) | Maintained capability reference (`DECISIONS.tsv` row 63), distinct from operational quickstarts | Tech Writer and Architect |
| **Graduated Sprint Archives** | [`sprints/01-architecture/`](sprints/01-architecture/INDEX.md), [`sprints/08-testing/`](sprints/08-testing/INDEX.md) | Immutable historical sprint records (`SMO-00..05`, `ERB-00..06`) | Scrum Master |
| **Active Sprint Workspace** | [`sprints/_active/`](sprints/_active/INDEX.md) | Program GQC (`SPRINT-GQC-00..07`) specs, `DECISIONS.tsv`, and evidence reports awaiting operator graduation | Scrum Master |
| **Legacy Archive** | [`archive/`](archive/REORGANIZATION_PROPOSAL.md) | Historical pre-reorganization snapshots | Tech Writer |

---

## Directory Structure

```text
docs/
├── README.md                         # Documentation taxonomy and structure guide
├── INDEX.md                          # Master navigation index
├── functionalities/                  # Maintained capability reference library (00..10)
├── 00-getting-started/               # Onboarding, quickstart, port map, status, lab usage
├── 01-architecture/                  # System architecture, Astro islands, generated workbench-net.md
├── 02-authentication/                # Zitadel OIDC, Google OAuth, PKCE, privacy redaction
├── 03-data-management/               # SQLite Triad, clm-kernel@0.0.13, MCard rendering
├── 04-networking/                    # WebRTC P2P mesh, WebSocket /ws/ on port 3000, SSRF guards
├── 05-state-management/              # lab-runtime.js coordinator, isolated Redux stores, FSM
├── 06-components/                    # Preact islands, CLM components, 3D Theater, games
├── 07-deployment/                    # Docker (EXPOSE 3000 / 8765:3000), ArgoCD, R2 CDN
├── 08-testing/                       # node:test, Playwright projects, replay, conformance
├── 09-performance/                   # GQC-06 island/place baselines, Grafana Faro/Loki
├── 10-project-management/            # BMAD workflow state, epics, stories
├── 11-standards/                     # CSS token contracts and coding standards
├── project/                          # Supplementary implementation notes and diagrams
├── rules/                            # Focused styling rules
├── sprints/                          # Graduated archives (01-architecture, 08-testing) and _active/
└── archive/                          # Historical reorganization records
```

---

## Quick Navigation by Task

### Get Started
- Developer onboarding in [00-getting-started/START_HERE.md](00-getting-started/START_HERE.md)
- Five-minute local run in [00-getting-started/QUICKSTART.md](00-getting-started/QUICKSTART.md)
- Interactive workbench walkthrough in [00-getting-started/OPEN_AND_USE.md](00-getting-started/OPEN_AND_USE.md)
- Current program and gate status in [00-getting-started/STATUS.md](00-getting-started/STATUS.md)

### Understand the Architecture
- Workbench vs target boundaries, three hash domains, and CLM Page-as-Place contracts in [01-architecture/landing-page-architecture.md](01-architecture/landing-page-architecture.md)
- Astro 7 middleware, 7 Preact islands, and server-call policy in [01-architecture/astro-host-and-islands.md](01-architecture/astro-host-and-islands.md)
- Generated `31`-Place / `65`-Transition Petri net reference in [01-architecture/workbench-net.md](01-architecture/workbench-net.md)
- Universal 4-Modality MCard Browser in [01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md](01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md)
- Package and kernel boundaries in [01-architecture/MCARD_MODULAR_ARCHITECTURE.md](01-architecture/MCARD_MODULAR_ARCHITECTURE.md)

### Verify, Measure, and Deploy
- Device-sensitive testing and Playwright replay in [08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md](08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md)
- Island byte budgets and navigation latency baselines in [09-performance/gqc-06-spa-and-island-baselines.md](09-performance/gqc-06-spa-and-island-baselines.md)
- Container and ArgoCD deployment in [07-deployment/README.md](07-deployment/README.md)
- Capability Reference Library in [functionalities/README.md](functionalities/README.md)
