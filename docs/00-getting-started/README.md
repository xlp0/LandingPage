# Getting Started

| Field | Value |
| --- | --- |
| Audience | New contributors, operators, and QA engineers setting up and running LandingPage |
| BMAD Owner | Developer (`bmad-agent-dev`) and Tech Writer (`bmad-agent-tech-writer`) |
| Source of Truth | [`package.json`](../../package.json), [`ws-server.js`](../../ws-server.js), and [`astro.config.mjs`](../../astro.config.mjs) |
| Drift Gate | `npm run docs:check` |

Welcome to the **PKC Landing Page, Universal 4-Modality MCard Browser, and Responsive Test Workbench** (`LandingPage/`).

## Quick Run (60 Seconds)

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000/responsive-lab.html` in your browser.

| Command | Port(s) | Purpose |
| --- | --- | --- |
| `npm start` or `npm run ws-server` | `3000` | Starts `ws-server.js` serving Express APIs, WebSocket `/ws/`, and built Astro SSR pages |
| `npm run dev` | `4322` and `3000` | Starts `astro dev --port 4322` alongside `ws-server.js` on `3000` (avoiding external target port `4321`) |
| `npm test` | `3001` (`TEST_PORT`) | Runs Playwright suites against an isolated `ws-server.js` instance on `127.0.0.1:3001` |

## Role in the MCard_TDD Workspace

`LandingPage` operates as **Estate 4 (Submodule 3)** consuming published `clm-kernel@0.0.13`.

1. **Responsive UI Lab Workbench (`/responsive-lab.html`)** certifies chosen web targets (such as `/tests/fixtures/spa-test-target.html`, `/index.html`, `/app.html`, or external `http://localhost:4321/`) across 8 device presets, orientation swap, Petri net Places/Transitions, Triad persistence, and Playwright replay.
2. **Single-Page 4-Modality MCard Viewer (`/?noredirect=1`)** renders `urn:mcard:content:landing_page` and the 6-sample Triad corpus (`data/samples/portal_samples.mcard.db`) across `media`, `document`, `code`, and `webapp` modalities.
3. **SSRF-Guarded External Portal Membrane** isolates untrusted URL probes behind DNS, private-IP, and framing guards (`server/mcard-probe-policy.mjs`, `js/external-portal-membrane.js`).

## Documents in This Section

- **[START_HERE.md](./START_HERE.md)** covers repository layout, ports, Astro/Preact and kernel boundaries, and verification commands.
- **[QUICKSTART.md](./QUICKSTART.md)** walks through a 5-minute install, build, run, and test check.
- **[OPEN_AND_USE.md](./OPEN_AND_USE.md)** explains how to operate Responsive UI Lab, the 5-step SPA workflow, recording, and replay.
- **[STATUS.md](./STATUS.md)** summarizes Program SMO, ERB, and GQC status alongside current verification commands.

## Next Steps

- [01-architecture/README.md](../01-architecture/README.md) for system architecture, Astro islands, and `workbench-net.md`.
- [08-testing/README.md](../08-testing/README.md) for `node:test` and Playwright suites.
- [03-data-management/README.md](../03-data-management/README.md) for SQLite Triad storage and `clm-kernel@0.0.13`.
