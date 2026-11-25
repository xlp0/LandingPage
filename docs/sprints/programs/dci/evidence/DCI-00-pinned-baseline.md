# DCI-00 Pinned Baseline and Stored Interface State Evidence

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-00` |
| Start commit | `7837fab779360ee8daaeb941ee06f809465e6260` |
| Consensus Kernel | `clm-kernel@0.0.26` |
| Entry Condition | `test -z "$(git status --porcelain | grep -v ' docs/sprints/')"` exited `0`; `src/islands/PkcCardIsland.jsx` present at start commit |
| Date | `2026-11-26` (`+08:00` local) |

## Entry and Baseline Gate Runs on Start Commit

All `14` graduation gate commands from [`../dci-plan.md`](../dci-plan.md) ran sequentially on pinned commit `7837fab779360ee8daaeb941ee06f809465e6260` and exited `0`.

| Command | Exit | Observed Result on Start Commit |
| --- | :---: | --- |
| `npm run stageshow:check-css` | 0 | `85` CSS files, `4` explicit bundles, `0` overlapping class namespaces |
| `npm run stageshow:sweep -- --strict` | 0 | `snapshots=20`, `findings=0`, `errors=0`, `clipped=0`, `overflows=0` |
| `node scripts/check-package-source-parity.mjs` | 0 | `[parity-ok] pairs=4 uiCalls=22` |
| `npm run check:net` | 0 | `workbench-net.yaml`: `places=38 transitions=85`; `spa-test-target.graph.json`: `places=3 transitions=4` |
| `npm run check:explorable-gui` | 0 | `[explorable-gui] PASS` |
| `npm run check:bombadil-nets` | 0 | `[bombadil:nets] PASS` |
| `npm run check:playwright-discovery` | 0 | `smoke` (`24`/`9`), `components` (`18`/`14`), `features` (`638`/`30`), `53` unique specs |
| `npm run docs:check` | 0 | `[docs:check] PASS (files=291, allowlisted=13, netIds=131)` |
| `npm run build` | 0 | Astro `5` pages (`[gqc-net-parity] PASS`), `@pkc/core`, `@pkc/markdown-renderer` |
| `npm run test:unit` | 0 | `304` passed, `0` failed, `0` skipped across `20` suites |
| `npm run test:smoke` | 0 | `24 passed` (`25.4s`) |
| `npm run test:components` | 0 | `18 passed` (`10.5s`) |
| `npm run test:features` | 0 | `621 passed`, `17 skipped` (`1.5m`) |
| `npm run test:smoke:cross-browser` | 0 | `48 passed` (`33.9s`) |

## Baseline Re-Measurements on Start Commit

| Measure | Value on `2026-11-24` | Measured on `7837fab` | Status |
| --- | --- | --- | --- |
| Native dialog calls on `js/runtime` and `js/landing-page-mcard.js` | `2` | `2` | Unchanged |
| Page Places with no arc in, or none out | `3` | `3` | Unchanged |
| Same-origin links pinned for registry, inspector, conformance (`tests/fixtures/test-config.js`) | `0`, `0`, `0` | `0`, `0`, `0` | Unchanged |
| `innerHTML` writes in `src/pages/sprint-registry.astro` | `2` | `2` | Unchanged |
| Query parameters that `js/harness/lab-toolbar.js` reads | `1` | `1` | Unchanged |
| Island files in `src/islands/` | `9` | `9` | Unchanged |

## Stored Interface State Verification

Added `## Stored interface state` with all `10` storage rows to [`../../../01-architecture/astro-host-and-islands.md`](../../../../01-architecture/astro-host-and-islands.md), matching `js/runtime/presentation-controller.js`, `js/device-registry.js`, `js/harness/page-state.js`, `js/harness/lab-toolbar.js`, `src/pages/fiber-inspector.astro`, `src/pages/index.astro`, `src/pages/fiber-conformance.astro`, `js/harness/viewport-stage.js`, `js/harness/lab-runtime.js`, and `src/islands/PkcCardIsland.jsx`.
