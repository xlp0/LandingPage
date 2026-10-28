# Astro Host and Preact Islands Architecture

| Field | Value |
| --- | --- |
| Audience | Frontend engineers, backend engineers, architects, and QA engineers maintaining workbench pages and client islands |
| BMAD Owner | Architect (`bmad-agent-architect`), UX Designer (`bmad-agent-ux-designer`), and Developer (`bmad-agent-dev`) |
| Source of Truth | [`astro.config.mjs`](../../astro.config.mjs), [`ws-server.js`](../../ws-server.js), [`src/pages/`](../../src/pages/), [`src/islands/`](../../src/islands/), and [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml) |
| Drift Gate | `npm run check:net`, `node scripts/check-package-source-parity.mjs`, `npm run docs:check`, and `npm run build` |

## Stack Adoption Status and Historical Reconciliation

`LandingPage` adopts Astro and Preact for its workbench host layer while keeping `node:test` and Playwright as its sole automated test runners.

| Stack Layer | Package and Version | Current Status | Notes |
| --- | --- | --- | --- |
| Page Host and SSR Middleware | `astro@7.4.2`, `@astrojs/node@11.1.9` (`mode: 'middleware'`) | Active in production and development | Mounted inside `ws-server.js` after Express API and security middleware |
| Interactive Client Islands | `@astrojs/preact@6.1.1`, `preact@11.1.0` | Active on `responsive-lab.html` (`7` islands) | Zero island JS is emitted on `astro-wrapped` pages |
| Petri Net and MCard Kernel | `clm-kernel@0.0.13` | Server and build-time Node only | Never imported inside browser islands or client bundles |
| Unit and Integration Runner | `node:test` (`npm run test:unit`) | Canonical | Earlier statements saying `LandingPage` did not adopt Astro or Vitest are superseded for Astro, while **Vitest remains un-adopted** |
| Browser E2E and Replay Runner | `@playwright/test@^1.57.0` (`1.64.1` locked) (`npm test`) | Canonical | Runs against `ws-server.js` on isolated `TEST_PORT=3001` |

## Commands and Port Ownership

Run these commands from the repository root.

```bash
npm run build
npm start
```

| Command | Port(s) | Behavior |
| --- | --- | --- |
| `npm start` or `npm run ws-server` | `3000` (or `PORT` env) | Runs `node ws-server.js`, serving Express APIs, WebSocket `/ws/`, built `dist/client` assets, and the built Astro SSR middleware (`dist/server/entry.mjs`) |
| `npm run dev` | `4322` and `3000` | Starts `astro dev --port 4322` alongside `node ws-server.js` on `3000`. Port `4322` avoids colliding with external Responsive UI Lab target port `4321` |
| `npm run build` | Build-time only | Runs `astro build`, invoking the `gqc-net-parity` integration ([`src/integrations/net-parity.mjs`](../../src/integrations/net-parity.mjs)) before emitting `dist/client/` and `dist/server/entry.mjs` |
| `npm test` / `npx playwright test` | `3001` (`TEST_PORT`) | Boots `ws-server.js` on `127.0.0.1:3001` with an isolated temporary `MCARD_DB_PATH` |

## Express and Astro Middleware Mount Order

`ws-server.js` remains the single supported server entry point (`packages/server/src/ws-server.js` is a dormant unsupported legacy copy). Requests pass through `ws-server.js` in a deterministic order so API contracts, security headers, and legacy `.html` URLs stay intact.

1. Request logging, narrowed CORS policy, and unified Content Security Policy headers (without `unsafe-eval`) attach first.
2. Hoisted configuration routes (`/app-config.json` with schema `urn:gqc:lab-config:v1` and `/api/config` with schema `urn:gqc:runtime-config:v1`) and health checks respond before static or SSR handlers.
3. Express API routers mount at `/api/mcard`, `/api/test-runs`, `/api/clm`, and `/api/auth`, alongside WebSocket signaling on `/ws/`.
4. Built client assets under `dist/client/_astro` serve with immutable cache headers, followed by the `@astrojs/node` SSR handler (`dist/server/entry.mjs`) which renders the six workbench Places at both `/` and `.html` paths (`build.format: 'file'`).
5. Static assets under `public/`, `js/`, `css/`, `tests/fixtures/`, and tombstoned non-workbench static files such as `pkc-docs-index.html` fall through to Express static middleware.

Astro's client router remains disabled. Every workbench page switch executes as a full document navigation tracked in [`workbench-net.md`](./workbench-net.md).

## Workbench Pages and Host Modes

| Route | Astro Page Source | Workbench Place(s) | Migration State | Island Count | Client Runtime Owner |
| --- | --- | --- | --- | --- | --- |
| `/` and `/index.html` | [`src/pages/index.astro`](../../src/pages/index.astro) | `p_page_index`, `p_view_index_mcard_viewer` | `astro-wrapped` | `0` | Redirects `/` to `/responsive-lab.html`. Mounts `js/landing-page-mcard.js` and `js/nav.js` when `?noredirect=1` is present |
| `/responsive-lab.html` | [`src/pages/responsive-lab.astro`](../../src/pages/responsive-lab.astro) | `p_page_responsive_lab` | `astro-islands` | `7` | `js/harness/lab-runtime.js` coordinator (`window.__lab`) |
| `/app.html` | [`src/pages/app.astro`](../../src/pages/app.astro) | `p_page_app` | `astro-wrapped` | `0` | `public/js/app-bootstrap.js` and `MCardManager` (`window.mcardManager`) |
| `/sprint-registry.html` | [`src/pages/sprint-registry.astro`](../../src/pages/sprint-registry.astro) | `p_page_sprint_registry` | `astro-wrapped` | `0` | Inline `/api/clm/registry` viewer owned by Scrum Master |
| `/fiber-inspector.html` | [`src/pages/fiber-inspector.astro`](../../src/pages/fiber-inspector.astro) | `p_page_fiber_inspector` | `astro-wrapped` | `0` | `public/js/fibers/registry.js` inspector harness owned by Architect |
| `/fiber-conformance.html` | [`src/pages/fiber-conformance.astro`](../../src/pages/fiber-conformance.astro) | `p_page_fiber_conformance` | `astro-wrapped` | `0` | `public/js/fibers/registry.js` conformance harness owned by Architect |

`node tests/performance/place-bytes.mjs --enforce-zero-island-places` verifies in CI that every `astro-wrapped` Place downloads `0 B` of `_astro/` island JavaScript.

## Responsive Lab 7-Island Ownership Map

`src/pages/responsive-lab.astro` validates `src/net/workbench-net.yaml` and `tests/fixtures/spa-test-target.graph.json` in Node frontmatter via `scripts/check-net.mjs`, `assertDisjointNetIds()`, and `scripts/net-to-netmcard.mjs`. Frontmatter passes plain JSON `targetNets` props to `SpaTestWorkflow`. Zero client files import `clm-kernel` or Node `crypto`.

| Island | Source File | DOM Container | Hydration Directive | Wrapped Vanilla Modules | Cold Load vs Deferred | BMAD Owner | Unmount Cleanup Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `TargetToolbarIsland` | [`src/islands/TargetToolbarIsland.jsx`](../../src/islands/TargetToolbarIsland.jsx) | `#lab-toolbar` | `client:load` | `js/harness/lab-toolbar.js`, `js/harness/target-membrane.js` | Eager (`~12.5 KB`) | Architect and Dev | `toolbar.destroy()` and `runtime.unregisterIsland('TargetToolbarIsland')` |
| `DevicePresetsIsland` | [`src/islands/DevicePresetsIsland.jsx`](../../src/islands/DevicePresetsIsland.jsx) | `#device-presets-region` | `client:load` | `js/harness/device-presets-ui.js`, `js/device-registry.js` | Eager (`~8.2 KB`) | UX Designer and Dev | `presetsUi.destroy()` and `runtime.unregisterIsland('DevicePresetsIsland')` |
| `ViewportStageIsland` | [`src/islands/ViewportStageIsland.jsx`](../../src/islands/ViewportStageIsland.jsx) | `#viewport-stage-island-root` | `client:only="preact"` | `js/harness/viewport-stage.js`, `#mission-control-iframe` | Eager client-only (`~2.0 KB`) | Architect and TEA | `runtime.detachStageSurface()` and `runtime.unregisterIsland('ViewportStageIsland')` |
| `RecordingRibbonIsland` | [`src/islands/RecordingRibbonIsland.jsx`](../../src/islands/RecordingRibbonIsland.jsx) | `#recording-ribbon` | `client:load` | `js/harness/recording-ribbon.js`, `js/harness/recorder.js` | Eager (`~8.5 KB`) | TEA and Dev | `ribbon.destroy()` and `runtime.unregisterIsland('RecordingRibbonIsland')` |
| `SpaTestWorkflow` | [`src/islands/SpaTestWorkflow.jsx`](../../src/islands/SpaTestWorkflow.jsx) | `#spa-test-workflow` | `client:load` | `js/harness/spa-test-workflow.js` | Eager (`~33.7 KB`) | Product Manager, Architect, TEA, and UX Designer | `unsub()`, `runtime.detachWorkflow(workflow)`, and `workflow.destroy()` |
| `ConformancePanelIsland` | [`src/islands/ConformancePanelIsland.jsx`](../../src/islands/ConformancePanelIsland.jsx) | `#conformance-panel-root` | `client:visible` | `js/harness/conformance-panel.js` | Deferred until `<details id="conformance-disclosure">` opens (`~4.0 KB`) | TEA and UX Designer | `panel.destroy()`, disclosure `toggle` listener removal, and `runtime.unregisterIsland('ConformancePanelIsland')` |
| `MCardResultIsland` | [`src/islands/MCardResultIsland.jsx`](../../src/islands/MCardResultIsland.jsx) | `#mcard-result-panel` | `client:visible` | `runtime.recorder.lastSavedRun`, `runtime.subscribeSavedRun` | Deferred until `<details id="mcard-result-disclosure">` opens (`~3.0 KB`) | Product Manager and Dev | Saved-run unsubscribe, disclosure `toggle` listener removal, and `runtime.unregisterIsland('MCardResultIsland')` |

`body.lab-booting` clears after two `requestAnimationFrame` ticks once the eager boot islands mount and apply the initial device preset and `?target=` parameter, while `[data-testid="spa-test-workflow"][data-workflow-ready="true"]` marks the five-step guided workflow ready.

## UI Server-Call Placement Policy

Under the `SPRINT-GQC-05` server-call placement policy (`DECISIONS.tsv` row 51), four rules govern client network calls.

1. Existing Express routes (`/api/mcard`, `/api/test-runs`, `/api/clm`, `/api/auth`, `/app-config.json`, `/api/config`) remain in place without gratuitous rewrites.
2. New UI-reachable server calls default to Astro endpoints (`src/pages/api/*`) or Astro Actions unless the handler requires WebSocket `/ws/` signaling state, shared Express middleware state, or an existing Express router such as `/api/test-runs`.
3. Every browser `fetch`, `navigator.sendBeacon`, or `XMLHttpRequest` inside `src/` or `js/harness/` must map to a declared `server-call-request`, `server-call-ok`, and `server-call-fail` Transition triple (plus pending and error/recovery Places) in [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml).
4. [`scripts/check-package-source-parity.mjs`](../../scripts/check-package-source-parity.mjs) statically scans client sources in CI and rejects any undeclared network endpoint.

See [LandingPage Architecture](./landing-page-architecture.md) and [Workbench Navigation Net Reference](./workbench-net.md) for the complete Petri net and MCard persistence contracts.
