# PKC Landing Page, Universal 4-Modality MCard Browser, and Responsive Test Workbench

| Field | Value |
| --- | --- |
| Audience | Developers, architects, QA engineers, and operators working on LandingPage in standalone or `MCard_TDD` monorepo mode |
| BMAD Owner | Product Manager (`bmad-agent-pm`), Architect (`bmad-agent-architect`), and Tech Writer (`bmad-agent-tech-writer`) |
| Source of Truth | [`package.json`](./package.json), [`ws-server.js`](./ws-server.js), [`astro.config.mjs`](./astro.config.mjs), and [`src/net/workbench-net.yaml`](./src/net/workbench-net.yaml) |
| Consensus Kernel | `clm-kernel@0.0.14` (`KERNEL_PROVENANCE = 'clm-kernel@0.0.14'`, `DEFAULT_CLM_KERNEL_VERSION = '0.0.14'`) |
| Drift Gates | `npm run check:net`, `node scripts/check-package-source-parity.mjs`, `npm run docs:check`, and `npm run build` |

## Quick Start and Port Map

Run these commands from the repository root (`LandingPage/`).

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000/responsive-lab.html` in Chromium, Firefox, or WebKit. Visiting `http://localhost:3000/` redirects automatically to `/responsive-lab.html`, while `http://localhost:3000/?noredirect=1` opens the single-page 4-modality MCard viewer directly.

| Port | Owner / Command | Purpose |
| --- | --- | --- |
| **`3000`** | `npm start` or `npm run ws-server` (`node ws-server.js`) | Default Express API, WebSocket `/ws/`, and built Astro SSR middleware port (`PORT` overrides) |
| **`4322`** + **`3000`** | `npm run dev` (`astro dev --port 4322 & node ws-server.js`) | Parallel Astro dev server on `4322` plus Express API/WS server on `3000`. Port `4322` avoids colliding with external Lab target port `4321` |
| **`3001`** | `npm test` / `npx playwright test` (`TEST_PORT=3001`) | Isolated Playwright test server port with temporary `MCARD_DB_PATH` |
| **`4321`** | External target under test (optional) | Default external local target port selectable via `?target=http://localhost:4321/` |
| **`8765:3000`** | `docker-compose.yml` | Host-to-container port mapping when running the containerized `ws-server.js` image (`EXPOSE 3000`) |

---

## Core Roles and Surface Boundaries

`LandingPage` operates as **Estate 4 (Submodule 3)** of the `MCard_TDD` four-estate workspace (`ULR-01`). It maintains a strict boundary between the **workbench** and **targets under test**.

1. **Responsive UI Lab Workbench (`/responsive-lab.html`, Place `p_page_responsive_lab`)**
   Hosted by [`src/pages/responsive-lab.astro`](src/pages/responsive-lab.astro) (`astro@7.4.2`, `@astrojs/node@11.1.9` middleware, `@astrojs/preact@6.1.1`, `preact@11.1.0`) with 7 Preact islands. Certifies a chosen target URL across 8 device presets, 2D orientation swap (`INV-RVP-01`), scale-free interaction capture (`[0.0, 1.0]`, `INV-ERB-02`), 5-step guided SPA Petri net verification, Triad persistence, and deterministic Playwright replay.
2. **Targets Under Test (Distinct from the Workbench)**
   - **Approved SPA Target** at [`/tests/fixtures/spa-test-target.html`](tests/fixtures/spa-test-target.html) modeled by [`tests/fixtures/spa-test-target.graph.json`](tests/fixtures/spa-test-target.graph.json) (`spa-test-target-net`).
   - **MPA Candidate** at `/index.html` when embedded inside `#mission-control-iframe`.
   - **MCard `webapp` Target** at `/app.html` (`src/pages/app.astro`, legacy Mission Control IndexedDB host).
   - **Cross-Origin and Policy Probe Fixtures** (`/tests/fixtures/probe-target.html`, `/tests/fixtures/no-probe-target.html`, and blocked cross-origin targets).
3. **Single-Page 4-Modality MCard Content Browser (`/?noredirect=1`, Place `p_view_index_mcard_viewer`)**
   Powered by [`server/mcard-api.mjs`](server/mcard-api.mjs), [`server/mcard-modality.mjs`](server/mcard-modality.mjs) (`clm-kernel@0.0.13`), and [`js/landing-page-mcard.js`](js/landing-page-mcard.js). Verifies raw bytes in the canonical 3-table SQLite Triad (`card`, `handle_registry`, `handle_history`) and renders `media`, `document`, inert `code` (`data-execution="inert"`), and sandboxed `webapp` payloads.

---

## CLM Petri Net, Three Hash Domains, and PenPot Scope

- **Page-as-Place and Functional-Link-as-Transition.** Workbench routes (`31` Places, `65` Transitions in [`src/net/workbench-net.yaml`](src/net/workbench-net.yaml)) and SPA target views map Pages to `PlaceMCard` nodes (`clm://type/view/...` and `clm/views/petri/v1`, kept separate from `mcard:route:/...` and `mcard:target:/...` handles in `urn:gqc:net-bindings:v1`) and Functional Links to `TransitionMCard` edges producing `FiringReceiptMCard` receipts. Invalid target transitions enter `p_error_modal` (`p_spa_missing_transition`) and require explicit recovery (`t_spa_recover_overview`).
- **Closed `responsive_test_run:v1` Schema.** `urn:mcard:schema:responsive_test_run:v1` stays closed at 12 keys (`js/harness/recorder.js` stamps `lab.clmKernel: '0.0.13'`, while historical `0.0.10` records remain readable without rewriting). Navigation receipts attach via a separate `urn:gqc:navigation-run-link:v1` MCard (`nav_run_link_<runHash>`), and interrupted captures persist as `urn:gqc:interrupted-capture:v1`.
- **Three Distinct Hash Domains.**
  1. **Triad Blake3** in [`server/mcard-api.mjs`](server/mcard-api.mjs) via `clm-kernel@0.0.13` (sole server MCard and receipt authority).
  2. **Browser Compatibility Hash** in [`public/js/mcard-kernel/compat.js`](public/js/mcard-kernel/compat.js) (Web Crypto SHA-256 for local `app.html` IndexedDB keys only).
  3. **PenPot Graph Hash** in [`scripts/penpot-zip.mjs`](scripts/penpot-zip.mjs) (build-time SHA-256 over `design/landing-navigation.penpot` for `js/nav.js` drift checks).
- **PenPot Scope.** [`design/landing-navigation.penpot`](design/landing-navigation.penpot) compiles LandingPage's own navigation bar into [`js/nav.js`](js/nav.js). Assessing an external PenPot MPA target in Responsive UI Lab is **Optional / Deferred** pending Product Manager approval and live Playwright verification.
- **Stack Note.** Earlier statements saying `LandingPage` did not adopt Astro or Vitest are **superseded for Astro** (`astro@7.4.2` + Preact `11.1.0` islands are active), while **Vitest remains un-adopted** (`node:test` and Playwright are canonical).

---

## Verification Commands

```bash
npm run check:net
node scripts/check-package-source-parity.mjs
npm run docs:gen-net
npm run docs:check
npm run build
npm run test:unit
npm run check:playwright-discovery
npm run test:smoke
npm run test:components
npm run test:responsive
npm run test:replay
npm run test:conformance
```

---

## Sprint Programs

| Program | Directory | Scope | Status |
| --- | --- | --- | --- |
| **Program SMO** (`SMO-00..05`) | [`docs/sprints/01-architecture/`](docs/sprints/01-architecture/INDEX.md) | Submodule modularity, 3-table SQLite Triad, 4-modality MCard browser (historical `clm-kernel@0.0.10` baseline, now `0.0.13`) | Graduated |
| **Program ERB** (`ERB-00..06`) | [`docs/sprints/08-testing/`](docs/sprints/08-testing/INDEX.md) | Viewport stage, ring buffer, membrane normalization, Triad test-run persistence, Playwright replay, 15-check conformance | Graduated |
| **Program GQC** (`SPRINT-GQC-00..07`) | [`docs/sprints/_active/`](docs/sprints/_active/INDEX.md) | Petri net verification, Astro 7 + 7 Preact islands, SPA target workbench, Layer 1/Layer 4 `NetMCard` + `FiringReceiptMCard` Triad persistence, performance baselines, and living docs gate (`npm run docs:check`) | Completed in `_active/` awaiting operator graduation |

---

## Documentation Directory (`docs/`)

See **[`docs/INDEX.md`](docs/INDEX.md)** and **[`docs/README.md`](docs/README.md)** for full navigation.

| Tier | Category | Key Guides | Entry Point |
| :---: | :--- | :--- | :--- |
| **00** | **Getting Started** | Onboarding, 5-minute setup, port map, interactive lab controls | [docs/00-getting-started/](docs/00-getting-started/README.md) |
| **01** | **Architecture** | [LandingPage Architecture](docs/01-architecture/landing-page-architecture.md), [Astro Host and Islands](docs/01-architecture/astro-host-and-islands.md), [Workbench Net](docs/01-architecture/workbench-net.md), [Universal 4-Modality MCard Browser](docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md) | [docs/01-architecture/](docs/01-architecture/README.md) |
| **02** | **Authentication** | Zitadel OIDC with PKCE, Google OAuth setup, auth-gated CSP, privacy redaction (`INV-PRV-01`) | [docs/02-authentication/](docs/02-authentication/README.md) |
| **03** | **Data Management** | Canonical SQLite Triad (`card`, `handle_registry`, `handle_history`), `clm-kernel@0.0.13`, 6-sample corpus | [docs/03-data-management/](docs/03-data-management/README.md) |
| **04** | **Networking** | WebRTC P2P mesh, WebSocket `/ws/` signaling on port `3000`, SSRF membrane guards | [docs/04-networking/](docs/04-networking/README.md) |
| **05** | **State Management** | `lab-runtime.js` coordinator, isolated legacy Redux stores, 20-pair `RecordingStateMachine` | [docs/05-state-management/](docs/05-state-management/README.md) |
| **06** | **Components** | Preact islands, Responsive Lab ES modules, CLM Three Sets framework, multiplayer games | [docs/06-components/](docs/06-components/README.md) |
| **07** | **Deployment** | Docker (`EXPOSE 3000`, compose `8765:3000`), ArgoCD GitOps, R2 storage, CI gates | [docs/07-deployment/](docs/07-deployment/README.md) |
| **08** | **Testing** | `node:test` unit suites, Playwright `smoke`/`components`/`features` projects, replay, conformance | [docs/08-testing/](docs/08-testing/README.md) |
| **09** | **Performance** | [GQC-06 SPA and Island Baselines](docs/09-performance/gqc-06-spa-and-island-baselines.md), place byte budgets, Grafana Faro/Loki | [docs/09-performance/](docs/09-performance/README.md) |
| **10** | **Project Management** | BMAD ownership, agile workflows, epics, and stories | [docs/10-project-management/](docs/10-project-management/README.md) |
| **11** | **Standards** | CSS token contracts (`tokens.css`, `semantic-tokens.css`), clean-room and documentation gates | [docs/11-standards/](docs/11-standards/README.md) |

Additional references include the **[Capability Reference Library (`docs/functionalities/`)](docs/functionalities/README.md)**, **[Test Suite Guide (`tests/README.md`)](tests/README.md)**, and **[Playwright Test Documentation (`tests/TEST_DOCUMENTATION.md`)](tests/TEST_DOCUMENTATION.md)**.
