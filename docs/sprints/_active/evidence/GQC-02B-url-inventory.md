# GQC-02B URL and Asset Inventory (PR-GQC-02B.1)

## 1. Pinned Runtime Dependencies

Exact versions pinned in `package.json` and `package-lock.json` for the Astro host shell.

| Package | Pinned Version | npm Release Timestamp (UTC) | Role |
| --- | --- | --- | --- |
| `astro` | `7.4.2` | `2026-10-21T14:18:56.764Z` | Astro page compiler, Vite build pipeline, and integration hooks |
| `@astrojs/node` | `11.1.9` | `2026-10-19T14:11:53.666Z` | Node middleware adapter (`mode: 'middleware'`) mounted in `ws-server.js` |
| `@astrojs/preact` | `6.1.1` | `2026-10-21T14:14:36.814Z` | Preact island integration ready for `PR-GQC-02B.2` |
| `preact` | `11.1.0` | `2026-10-27T11:52:26.844Z` | Client runtime for upcoming Responsive Lab islands |

Because `express@4.18.2` pins `cookie@0.7.2` and `send@0.19.2` at `node_modules/` root while `astro@7.4.2` and `@astrojs/node@11.1.9` install nested `cookie@2.0.1` and `send@1.2.1`, `astro.config.mjs` includes `gqc-resolve-astro-nested-deps` so `dist/server/entry.mjs` and the prerender bundle bind directly to Astro's nested copies without altering Express module resolution.

## 2. Place Migration Inventory and On-Disk File Disposition

| Place ID | Kind | Public URLs | Astro Source | Migration State | Legacy Root File Disposition |
| --- | --- | --- | --- | --- | --- |
| `p_page_index` | `page` | `/`, `/index.html` | `src/pages/index.astro` | `astro-wrapped` | Retained on disk for `tests/single-page-mcard.test.mjs:351` and `scripts/penpot-drift.mjs:129`; HTTP `/` and `/index.html` serve `dist/client/index.html` |
| `p_view_index_mcard_viewer` | `view` | `/?noredirect=1`, `/index.html?noredirect=1` | `src/pages/index.astro` | `astro-wrapped` (via `p_page_index`) | Same document as `p_page_index` |
| `p_page_responsive_lab` | `page` | `/responsive-lab.html`, `/responsive-lab.html?target=<url>` | `src/pages/responsive-lab.astro` | `astro-wrapped` | Deleted `responsive-lab.html` after parity passed |
| `p_page_app` | `page` | `/app.html` | `src/pages/app.astro` | `astro-wrapped` | Deleted `app.html` after parity passed |
| `p_page_sprint_registry` | `page` | `/sprint-registry.html` | `src/pages/sprint-registry.astro` | `astro-wrapped` | Deleted `sprint-registry.html` after parity passed |
| `p_page_fiber_inspector` | `page` | `/fiber-inspector.html` | `src/pages/fiber-inspector.astro` | `astro-wrapped` | Deleted `fiber-inspector.html` after parity passed |
| `p_page_fiber_conformance` | `page` | `/fiber-conformance.html` | `src/pages/fiber-conformance.astro` | `astro-wrapped` | Deleted `fiber-conformance.html` after parity passed |
| `p_page_pkc_docs_index` | `page` | `/pkc-docs-index.html` | None | `undecided` | Untouched legacy static file served by Express |

Every Astro-served document emits `<meta name="x-gqc-host" content="astro">` from `src/layouts/WorkbenchLayout.astro`, allowing HTTP and Playwright checks to verify that `dist/client/index.html` wins over the retained root `index.html` while `/pkc-docs-index.html` continues serving from Express static middleware.

## 3. Referenced `/public/...` and `/js/...` Asset URLs

All legacy asset mounts in `ws-server.js` remain active until consumers move in `GQC-03` and `GQC-04`.

| Migrated Source | Asset / Fetch Reference | Serving Mount in `ws-server.js` |
| --- | --- | --- |
| `src/pages/index.astro` | `./public/css/semantic-tokens.css` | `app.use('/public', express.static('public'))` |
| `src/pages/index.astro` | `js/nav.js` | `app.use(express.static(__dirname))` |
| `src/pages/index.astro` | `./js/runtime/presentation-controller.js` | `app.use(express.static(__dirname))` |
| `src/pages/index.astro` | `./js/telemetry/faro-collector.js` | `app.use(express.static(__dirname))` |
| `src/pages/index.astro` | `./js/runtime/deployment-inspector.js` | `app.use(express.static(__dirname))` |
| `src/pages/index.astro` | `./js/runtime/least-action-navigator.js` | `app.use(express.static(__dirname))` |
| `src/pages/index.astro` | `./js/landing-page-mcard.js` | `app.use(express.static(__dirname))` |
| `src/pages/index.astro` | `./js/external-portal-membrane.js` | `app.use(express.static(__dirname))` |
| `src/pages/index.astro` | `./data/samples/portal_samples_manifest.json` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `/public/css/semantic-tokens.css` | `app.use('/public', express.static('public'))` |
| `src/pages/responsive-lab.astro` | `./js/device-registry.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/viewport-stage.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/target-membrane.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/lab-toolbar.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/device-presets-ui.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/lab-api.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/membrane-interceptor.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/recorder.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/recording-ribbon.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/fidelity.js` | `app.use(express.static(__dirname))` |
| `src/pages/responsive-lab.astro` | `./js/harness/conformance-panel.js` | `app.use(express.static(__dirname))` |
| `src/pages/app.astro` | `/public/css/semantic-tokens.css`, `/public/css/mcard-manager.css`, `/public/css/content-renderers.css` | `app.use('/public', express.static('public'))` |
| `src/pages/app.astro` | `/public/manifest.json`, `/public/icon.svg` | `app.use('/public', express.static('public'))` |
| `src/pages/app.astro` | `/public/js/app-bootstrap.js`, `/public/js/app-bootstrap.js?v=18`, `/public/js/env-shim.js`, `/public/js/importmap-init.js` | `app.use('/public', express.static('public'))` |
| `src/pages/app.astro` | `/public/js/ui-inline-handlers.js`, `/public/js/performance-monitor.js`, `/public/js/lazy-iframe-loader.js`, `/public/js/ViewManager.js`, `/public/js/PWAInstallModal.js`, `/public/js/PWAManager.js` | `app.use('/public', express.static('public'))` |
| `src/pages/app.astro` | `/public/vendor/lucide/lucide.min.js`, `/public/vendor/js-yaml.min.js` | `app.use('/public', express.static('public'))` |
| `src/pages/app.astro` | `/public/examples/location-map.html`, `/public/examples/THREEJS_ANIMEJS/Theater_Example.html`, `/public/examples/Music/SyncedMusicVisualizerV5.html`, `/public/examples/3DGames/MorphismCube/Morphism_FirstTry.html`, `/public/examples/3DGames/MorphismCube/Morphism_SecondTry.html`, `/public/examples/games/monopoly.html` | `app.use('/public', express.static('public'))` |
| `src/pages/sprint-registry.astro` | `/public/css/tokens.css`, `/public/css/semantic-tokens.css` | `app.use('/public', express.static('public'))` |
| `src/pages/fiber-inspector.astro` | `./public/js/fibers/registry.js`, `./public/js/mcard-kernel/compat.js`, `./public/conformance/harness-data.json`, `./public/conformance/unit-lint.json`, `./public/conformance/witness.json` | `app.use('/public', express.static('public'))` |
| `src/pages/fiber-conformance.astro` | `./public/js/fibers/registry.js`, `./public/js/mcard-kernel/compat.js`, `./public/conformance/harness-data.json` | `app.use('/public', express.static('public'))` |

## 4. Middleware Order and `/app-config.json` Shadow Analysis for GQC-03

In `ws-server.js`, request resolution now proceeds in this exact order.

1. CORS middleware and `/api/test-runs` (`express.json({ limit: '2mb' })`).
2. `/api` body parsers (`app.use('/api', express.json())` and `app.use('/api', express.urlencoded({ extended: true }))`) so non-`/api` request streams stay unconsumed for Astro endpoints and Actions.
3. Cache-Control and CSP header middleware, followed by `/api/auth`, `/api/clm`, and `/api/mcard`.
4. `express.static(path.join(__dirname, 'dist', 'client'))` and `astroSsrHandler` from `dist/server/entry.mjs`.
5. `/public` static mount, `express.static(path.join(__dirname, 'public'))`, and `express.static(path.join(__dirname))`.
6. Dynamic GET handlers `/health`, `/api/rooms`, `/api/env`, `/api/config`, and `/app-config.json`.

Because `astro.config.mjs` points `publicDir` at the empty directory `./.cache/astro-public`, `dist/client/` contains no `app-config.json`. Requests for `GET /app-config.json` fall through `dist/client/` and `astroSsrHandler` via `next()` and continue hitting the static `LandingPage/app-config.json` file through `express.static(path.join(__dirname))` ahead of the dynamic `app.get('/app-config.json')` handler at bottom of `ws-server.js`. This preserves trunk's exact `labTargets` payload while isolating the static-shadow seam for `SPRINT-GQC-03` to unify cleanly.

## 5. Build-Time Net Parity Report

`src/integrations/net-parity.mjs` executes inside `astro build` via `astro:build:done`. On the 6 `astro-wrapped` Places, `gqc-net-parity` reports `pages=6`, `staticTriggered=5` (`t_link_lab_to_app`, `t_link_lab_to_index`, `t_link_viewer_to_app`, `t_link_viewer_to_index`, `t_link_viewer_to_lab`), and `untriggered=40` covering JS-driven navigations (`t_redirect_index_to_lab`, `t_link_app_to_index`, `t_open_external_monopoly`, `t_open_external_chess`, `t_open_external_go`) and runtime HTTP/MCard/conformance request-result triples.

## 6. Run Commands Recorded for GQC-07

| Command | Behavior |
| --- | --- |
| `npm run build:astro` | Runs `astro build`, writing prerendered HTML to `dist/client/`, middleware entrypoint to `dist/server/entry.mjs`, and enforcing `gqc-net-parity`. |
| `npm run build:packages` | Builds workspace packages `@pkc/core` and `@pkc/markdown-renderer`. |
| `npm run build` | Runs `npm run build:astro && npm run build:packages`. |
| `npm start` | Runs `node ws-server.js`, serving built Astro pages and Express API/WebSocket routes on one port (`PORT || 3000`). |
| `npm run dev` | Runs `node ws-server.js` (`:3000`) and `astro dev --port 4322` (`:4322`) concurrently with Vite proxy forwarding `/api`, `/ws`, `/app-config.json`, `/health`, `/public`, `/js`, and static asset prefixes to Express. |
| `npx playwright test` | Builds Astro once via `webServer` (`npm run build:astro && node ws-server.js`) and runs against the single-port production topology on `TEST_PORT` (`3001`). |
