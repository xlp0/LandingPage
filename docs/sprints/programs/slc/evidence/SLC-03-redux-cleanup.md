# SPRINT-SLC-03 Evidence: Residual Redux Store and Dependencies Cleanup

## Summary

- **Removed Legacy Redux Trees, Vendored Bundles, and npm Dependencies**:
  - Deleted `js/redux/`, `js/store/`, `public/vendor/redux/`, `js/libs/redux.esm.js`, `js/libs/redux.min.js`, `js/libs/redux-toolkit.esm.js`, and `js/libs/redux-toolkit.min.js`.
  - Removed `@reduxjs/toolkit` and `redux` from `package.json` and synchronized `package-lock.json` and `node_modules/` via `npm install` (removing `7` packages with `clm-kernel@0.0.24`, `astro@7.4.2`, `@astrojs/node@11.1.9`, `@astrojs/preact@6.1.1`, and `preact@11.1.0` unchanged).
- **Replaced Runtime Redux Consumers and Cleaned Legacy Dashboard / Import Maps**:
  - Replaced `/js/redux/` imports in `archive/html/index-clm-dashboard.html` with an inline vanilla JavaScript pub/sub store preserving `window.reduxStore`, `fetchCLMRegistry`, `componentLoaded`, `setActiveComponent`, `logoutUser`, `selectCLMState`, `selectUser`, and `selectIsAuthenticated` contracts for `components/redux-state-viewer.html`.
  - Removed external Redux ESM bundling stubs from `tests/fixtures/clm-helpers.js`.
  - Moved `CONTENT_TYPES` directly into `js/renderers/index.js` and replaced `window.RTK` in `js/modules/auth-manager.js` with an in-memory pub/sub auth store (`initStateStore()`).
  - Emptied legacy Redux import maps and cache lists across `public/js/importmap-init.js`, `public/js/config/auto-import-map.js`, `public/js/config/env-detector.js`, `public/sw-clm.js`, and `public/js/env-shim.js`.
  - Removed Redux script tags, initialization, and unused `reduxStore` constructor parameters from `js/modules/webrtc-dashboard/{index.html,dashboard-manager-v2.js,room-service-v3.js,services/room-creator.js}`.
- **Updated Documentation and Preserved Protected Contracts**:
  - Updated `docs/05-state-management/README.md`, `docs/01-architecture/landing-page-architecture.md`, `docs/functionalities/03-CUBICAL-LOGIC-MODEL-AND-FIBER-CORRECTNESS.md`, `docs/sprints/01-architecture/sprint-smo03-four-estate-cross-boundary-contracts.md`, `docs/04-networking/README.md`, `docs/06-components/README.md`, `docs/INDEX.md`, `docs/README.md`, and `README.md`.
  - Preserved `ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, `public/js/mcard-kernel/{compat.js,bundle-entry.js,indexeddb-backend.js,node-shims/}`, `data/`, `tools/stageshow/kit/`, and self-contained examples in `public/examples/Music/`.

## Verification Receipts

| Check | Result |
| --- | --- |
| Deleted paths & lockfile guard | `bad=[]`, `lockBad=[]`, `clm-kernel="0.0.24"`, `astro="7.4.2"` |
| `npm run docs:check` | `[docs:check] PASS (files=279, allowlisted=13, netIds=131)` |
| `node scripts/check-package-source-parity.mjs` | `[parity-ok] pairs=4 uiCalls=22` |
| `npm run check:net` | `PASS` (`workbench-net`: `38` places, `85` transitions, `sessionPInvariant=true`; `spa-test-target-net`: `3` places, `4` transitions) |
| `npm run check:explorable-gui` | `[explorable-gui] PASS` |
| `npm run check:bombadil-nets` | `[bombadil:nets] PASS` |
| `npm run check:playwright-discovery` | `smoke 24/9`, `components 18/14`, `features 638/30` (`53` unique, `0` cross-browser repeats) |
| `npm run stageshow:check-css` | `0` clashes (`85` CSS files, `4` explicit bundles) |
| `npm run build` | `PASS` (`build:astro` `pages=5` + `build:packages`) |
| `npm run test:unit` | `300 pass, 0 fail, 0 skipped` across `20` suites |
| `TEST_PORT=3011 npm run test:smoke` | `24 passed` (`24.4s`) |
| `TEST_PORT=3011 npm run test:components` | `18 passed` (`9.6s`) |
| `SKIP_BUILD=1 npm run stageshow:sweep -- --strict` | `snapshots=20 findings=0 errors=0 clipped=0 overflows=0` |
| Protected files check | `ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, `public/js/mcard-kernel/`, `data/`, `tools/stageshow/kit/`, `public/examples/Music/` |
