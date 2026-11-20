# SPRINT-SLC-02 Evidence: Full `app.astro` and Legacy Mission Control Retirement

## Summary

- **Deleted Pages, Mission Control Assets, and Legacy Tests (`12` files)**:
  - Retired `src/pages/app.astro`, `public/js/app-bootstrap.js`, `public/js/mcard-kernel/MCardManager.js`, `public/js/mcard-kernel/UIComponents.js`, `public/css/mcard-manager.css`, `public/js/ViewManager.js`, `public/config/app-views.json`, and `public/js/ui-inline-handlers.js`.
  - Removed legacy Mission Control Playwright specs (`tests/smoke/root-app.spec.js`, `tests/smoke/apps-menu.spec.js`, `tests/features/chat-panel.spec.js`, and `tests/features/new-text-card.spec.js`).
- **Updated Targets, Islands, Service Workers, PenPot, and Petri Net**:
  - Updated `app-config.json` (`local-ui-app` removed; `defaultTargetId` set to `spa-test-target`; `11` lab targets total) and aligned `src/pages/responsive-lab.astro`, `js/harness/{lab-toolbar,recorder,spa-test-workflow}.js`, `src/islands/{SpaTestWorkflow,TargetToolbarIsland}.jsx`, `sw.js`, `public/sw.js`, `retired-islands.yaml`, `scripts/penpot-init.mjs`, and `scripts/penpot-render.mjs`.
  - Removed legacy app page/transition nodes and obsolete config entries from `src/net/workbench-net.yaml`, regenerated `docs/01-architecture/workbench-net.md` (`38` places, `85` transitions) and `tests/bombadil/generated/workbench-net.ts`, updated `scripts/stageshow/run.mjs` (`5` sweep routes), `scripts/check-explorable-gui.mjs`, `tests/bombadil/{lab-smoke.bombadil.ts,scope.json}`, and `tests/gui-coverage.json`.
  - Updated unit fixtures/tests (`tests/fixtures/test-config.js`, `tests/fixtures/net-core-golden.json`, `tests/unit/*.test.mjs`), feature specs/benchmarks (`tests/features/*.spec.js`, `tests/performance/*.mjs`), `tests/baselines/layout-baseline.json` (dropped `pages.app`, refreshed `pages.responsive-lab` to `724` elements, added `SPRINT-SLC-02` rebaseline entry), and living documentation (`README.md`, `docs/README.md`, `docs/INDEX.md`, `docs/00-getting-started/*.md`, `docs/01-architecture/*.md`, `docs/09-performance/gqc-06-spa-and-island-baselines.md`, `docs/functionalities/*.md`, `tests/TEST_DOCUMENTATION.md`).
- **Preserved Protected Contracts**:
  - Kept `src/pages/fiber-conformance.astro`, `public/js/mcard-kernel/{compat.js,bundle-entry.js,indexeddb-backend.js,node-shims/}`, `ws-server.js`, `scripts/package-source-parity.json`, `data/`, and `tools/stageshow/kit/` untouched.

## Verification Receipts

| Check | Result |
| --- | --- |
| `TEST_PORT=3011 npm run test:smoke` | `24 passed` (`25.0s`) |
| `TEST_PORT=3011 npm run test:components` | `18 passed` (`9.8s`) |
| `TEST_PORT=3011 npx playwright test tests/features/layout-freeze.spec.js --project=features` | `25 passed, 1 skipped` (`15.3s`) |
| `TEST_PORT=3011 npx playwright test --project=features --workers=3` | `621 passed, 17 skipped` (`1.8m`) |
| `SKIP_BUILD=1 npm run stageshow:sweep -- --strict` | `snapshots=20 findings=0 errors=0 clipped=0 overflows=0` (`5` routes x `4` viewports) |
| Static, net, parity, unit, and docs gates | Verified in closing `SPRINT-SLC-02` gate command (`docs:check`, `check-package-source-parity`, `check:net`, `check:explorable-gui`, `check:bombadil-nets`, `check:playwright-discovery`, `stageshow:check-css`, `test:unit`) |
| Protected files check | `ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, `public/js/mcard-kernel/compat.js`, `data/`, and `tools/stageshow/kit/` untouched |
