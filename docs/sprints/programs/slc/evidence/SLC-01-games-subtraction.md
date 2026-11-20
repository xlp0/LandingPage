# SPRINT-SLC-01 Evidence: Legacy Example Games Subtraction

## Summary

- **Removed Game Directories and Submodule**:
  - Deinitialized and deleted nested git submodule `public/examples/3DGames/3DObjectViewer` plus `.gitmodules`, then deleted `public/examples/3DGames/` (`MorphismCube/`, `README.md`), `public/examples/games/` (`8` files), `js/modules/tic-tac-toe-p2p/` (`10` files), and `docs/06-components/games/` (`6` docs).
  - Preserved non-game examples (`public/examples/Music/`, `public/examples/WaveVisualizers/`, `public/examples/THREEJS_ANIMEJS/`, and `public/examples/location-map.html`).
- **Updated Net, Views, Tests, and Docs**:
  - Removed `tic-tac-toe-p2p` from [modules.json](../../../../../modules.json), game view panels from `src/pages/app.astro` (retired `SLC-02`) and `public/config/app-views.json` (retired `SLC-02`), and the dead link in [js/components/HeroContentComponent.js](../../../../../js/components/HeroContentComponent.js).
  - Removed `p_external_games` and `t_open_external_{monopoly,chess,go}` from [src/net/workbench-net.yaml](../../../../../src/net/workbench-net.yaml) and regenerated [docs/01-architecture/workbench-net.md](../../../../01-architecture/workbench-net.md) (`39` Places, `87` Transitions) and [tests/bombadil/generated/workbench-net.ts](../../../../../tests/bombadil/generated/workbench-net.ts).
  - Updated [tests/fixtures/net-core-golden.json](../../../../../tests/fixtures/net-core-golden.json), [tests/unit/pkc-lifecycle.test.mjs](../../../../../tests/unit/pkc-lifecycle.test.mjs), [tests/unit/net-trace-replay.test.mjs](../../../../../tests/unit/net-trace-replay.test.mjs), [tests/unit/target-policy-and-config.test.mjs](../../../../../tests/unit/target-policy-and-config.test.mjs), `tests/smoke/apps-menu.spec.js` (retired `SLC-02`), [tests/features/performance-baselines.spec.js](../../../../../tests/features/performance-baselines.spec.js), and [tests/performance/run-paired-benchmark.mjs](../../../../../tests/performance/run-paired-benchmark.mjs).

## Verification Receipts

| Check | Result |
| --- | --- |
| Game deletions & preserved examples guard | `public/examples/games`, `3DGames`, `tic-tac-toe-p2p`, `docs/06-components/games` absent; `Music`, `WaveVisualizers`, `THREEJS_ANIMEJS`, `location-map.html` present |
| `npm run docs:check` | `[docs:check] PASS (files=276, allowlisted=13, netIds=134)` |
| `node scripts/check-package-source-parity.mjs` | `[parity-ok] pairs=4 uiCalls=22` |
| `npm run check:net` | `PASS` (`workbench-net`: `39` places, `87` transitions, `sessionPInvariant=true`; `spa-test-target-net`: `3` places, `4` transitions) |
| `npm run check:explorable-gui` | `[explorable-gui] PASS` |
| `npm run check:bombadil-nets` | `[bombadil:nets] PASS` |
| `npm run check:playwright-discovery` | `smoke 29/11`, `components 18/14`, `features 651/32` (`57` unique files) |
| `npm run stageshow:check-css` | `0` clashes (`85` CSS files, `4` explicit bundles) |
| `npm run build` | `PASS` (`build:astro` `pages=6` + `build:packages`) |
| `npm run test:unit` | `300 passed, 0 failed, 0 skipped` across `20` suites |
| `TEST_PORT=3011 npm run test:smoke` | `29 passed` (`24.1s`) |
| `TEST_PORT=3011 npx playwright test tests/features/performance-baselines.spec.js --project=features` | `7 passed` (`10.6s`) |
| `SKIP_BUILD=1 npm run stageshow:sweep -- --strict` | `snapshots=24 findings=0 errors=0 clipped=0 overflows=0` |
| Protected files check | Clean (`ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, `data/`, `public/js/mcard-kernel/compat.js`) |
