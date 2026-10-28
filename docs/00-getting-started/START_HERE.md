# Developer Onboarding Guide

| Field | Value |
| --- | --- |
| Audience | Developers and QA engineers onboarding to the LandingPage repository |
| BMAD Owner | Developer (`bmad-agent-dev`) and Architect (`bmad-agent-architect`) |
| Source of Truth | [`package.json`](../../package.json), [`ws-server.js`](../../ws-server.js), [`astro.config.mjs`](../../astro.config.mjs), and [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml) |
| Consensus Kernel | `clm-kernel@0.0.13` |

## Prerequisites and Setup

Requires Node.js `>= 18.0.0` and npm `>= 9.0.0`.

```bash
cd LandingPage
npm install
npm run install-browsers
npm run build
```

## Running the Workbench and Understanding Ports

```bash
npm start
```

| Mode | Command | Port(s) | Notes |
| --- | --- | --- | --- |
| **Production / Built Local Server** | `npm start` or `npm run ws-server` | **`3000`** | Default `ws-server.js` HTTP, REST API, WebSocket `/ws/`, and Astro SSR middleware port (`PORT` overrides) |
| **Interactive Astro + API Dev** | `npm run dev` | **`4322`** and **`3000`** | Runs `astro dev --port 4322` plus `node ws-server.js` on `3000`. Port `4322` avoids colliding with external target port `4321` |
| **Automated Playwright Runner** | `npm test` / `npx playwright test` | **`3001`** (`TEST_PORT`) | Boots an isolated `ws-server.js` on `127.0.0.1:3001` with a temporary `MCARD_DB_PATH` |
| **Docker Compose** | `docker compose up` | **`8765` -> `3000`** | Maps host port `8765` to container port `3000` (`Dockerfile` `EXPOSE 3000`) |

### Key Application Routes (on `http://localhost:3000`)

| Route | Workbench Place / Role | Description |
| :--- | :--- | :--- |
| `/responsive-lab.html` (`/` redirects here) | `p_page_responsive_lab` | **Primary Workbench** (`astro-islands`, 7 Preact islands) with device presets, viewport stage, 5-step SPA Petri net workflow, recorder, conformance matrix, and MCard result panel |
| `/responsive-lab.html?target=/tests/fixtures/spa-test-target.html` | Workbench + target `spa-test-target-net` | Loads the deterministic SPA fixture target inside `#mission-control-iframe` |
| `/?noredirect=1` or `/index.html?noredirect=1` | `p_view_index_mcard_viewer` | **Single-Page 4-Modality MCard Viewer** (`media`, `document`, `code`, `webapp`); `/index.html` also acts as an MPA candidate when embedded in the Lab iframe |
| `/app.html` | `p_page_app` | **Mission Control** (`astro-wrapped`), legacy IndexedDB MCard host classified as an MCard `webapp` target |
| `/sprint-registry.html` | `p_page_sprint_registry` | CLM sprint registry catalog backed by `/api/clm/registry` |
| `/fiber-inspector.html` and `/fiber-conformance.html` | `p_page_fiber_inspector`, `p_page_fiber_conformance` | Internal CLM fiber diagnostics (`0 B` island JS) |
| `/app-config.json` and `/api/config` | Config endpoints | `/app-config.json` serves `urn:gqc:lab-config:v1` target presets; `/api/config` serves `urn:gqc:runtime-config:v1` runtime environment config |

## Running Verification Gates and Tests

```bash
npm run check:net
node scripts/check-package-source-parity.mjs
npm run docs:check
npm run test:unit
npm run check:playwright-discovery
npm run test:smoke
npm run test:components
npm run test:responsive
npm run test:replay
npm run test:conformance
```

`LandingPage` uses **`node:test`** (`npm run test:unit`) and **Playwright** (`smoke`, `components`, `features` projects). Earlier notes stating Astro was not adopted are superseded (`astro@7.4.2` and `@astrojs/preact@6.1.1` are active), while **Vitest remains un-adopted**.

## Repository Structure

```text
LandingPage/
├── astro.config.mjs              # Astro 7.4.2 + @astrojs/node middleware + @astrojs/preact
├── ws-server.js                  # Sole supported Express + WS + Astro middleware server (:3000)
├── package.json                  # Scripts and pinned dependencies (clm-kernel@0.0.13)
├── app-config.json               # Approved Responsive Lab target URLs (urn:gqc:lab-config:v1)
├── retired-islands.yaml          # Tombstoned legacy surfaces
├── src/
│   ├── pages/                    # Six Astro workbench pages (.astro -> .html routes)
│   ├── islands/                  # Seven Preact islands mounted on responsive-lab.astro
│   └── net/workbench-net.yaml    # Canonical 31-Place, 65-Transition workbench Petri net
├── js/
│   ├── harness/                  # Viewport stage, membrane, ring buffer, recorder (0.0.13), SPA workflow
│   ├── device-registry.js        # Schema v2 device profiles (8 presets)
│   ├── landing-page-mcard.js     # Single-page 4-modality MCard viewer controller
│   ├── external-portal-membrane.js # SSRF-guarded external portal membrane
│   └── nav.js                    # Navigation bar generated from design/landing-navigation.penpot
├── server/
│   ├── mcard-api.mjs             # SQLite Triad backend and /api/mcard routes (Triad Blake3)
│   ├── mcard-modality.mjs        # 4-modality classifier (KERNEL_PROVENANCE = clm-kernel@0.0.13)
│   ├── mcard-probe-policy.mjs    # DNS, private-IP, redirect, and framing SSRF guards
│   └── test-run-api.mjs          # /api/test-runs, NetMCard, FiringReceiptMCard, and run-link API
├── scripts/                      # Net, parity, docs, PenPot, seed, and replay CLI tools
├── tests/                        # node:test unit suites, Playwright specs, conformance, perf
└── docs/                         # 12 engineering tiers, functionalities/, and sprints/
```

## Key Architectural Rules

1. **Kernel Consensus (`clm-kernel@0.0.13`).** Server Triad hashing and modality classification delegate to `clm-kernel@0.0.13`, and `js/harness/recorder.js` stamps `lab.clmKernel: '0.0.13'` on new test runs while preserving readability of historical `0.0.10` records. Browser islands never import `clm-kernel`.
2. **Three Distinct Hash Domains.** Server Triad Blake3 (`server/mcard-api.mjs`), browser compatibility SHA-256 (`public/js/mcard-kernel/compat.js` for `app.html` IndexedDB), and build-time PenPot graph SHA-256 (`scripts/penpot-zip.mjs`) never mix.
3. **Declared Net Transitions.** Every UI-reachable client server call under `src/` or `js/harness/` must be declared in `src/net/workbench-net.yaml` and passes `node scripts/check-package-source-parity.mjs`.
4. **PenPot Boundary.** `design/landing-navigation.penpot` drives LandingPage's own navigation (`js/nav.js`), while external PenPot MPA target assessment in the Lab remains Optional / Deferred pending Product Manager approval.
