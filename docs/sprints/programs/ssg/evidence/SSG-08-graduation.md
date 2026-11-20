# SPRINT-SSG-08 Verification Receipts and Graduation Report

## Summary and Status

- **Completed Sprints.** `SPRINT-SSG-00` through `SPRINT-SSG-08` are `DONE` and verified.
- **SPRINT-SSG-08 Code, Docker Gate, and Docs Complete.** [docker/bombadil/Dockerfile](../../../../../docker/bombadil/Dockerfile) (`fonts-dejavu-core`, `CHROME_PATH=/usr/bin/chromium`, `STAGESHOW_NO_SANDBOX=1`), [docker/bombadil/compose.yml](../../../../../docker/bombadil/compose.yml) (including read-only `/docs/sprints/programs:ro` for `/api/clm/program-artifact`), and [scripts/bombadil/nightly.sh](../../../../../scripts/bombadil/nightly.sh) are wired and passing inside Linux Docker (`bombadil-gate`), net projections ([docs/01-architecture/workbench-net.md](../../../../01-architecture/workbench-net.md), [tests/bombadil/generated/workbench-net.ts](../../../../../tests/bombadil/generated/workbench-net.ts)) and all 13 maintained documentation targets match measured code, `.mcard-sovereign-pill select` (`font-family: inherit; width: 12.5rem; box-sizing: border-box;`) eliminates OS native select width jitter across all `layout-freeze` viewports, and container-safe standalone path guards pass in [tests/unit/stageshow-install.test.mjs](../../../../../tests/unit/stageshow-install.test.mjs) and [tests/single-page-mcard.test.mjs](../../../../../tests/single-page-mcard.test.mjs).
- **Docker Gate Passed (`DoD-SSG-08-01`).** `docker compose -f docker/bombadil/compose.yml down -v && docker compose -f docker/bombadil/compose.yml build` and `docker compose -f docker/bombadil/compose.yml --profile manual run --rm bombadil-gate` both exited `0` on Linux container Chromium with `299/299` unit tests passing (`0` skipped) and `24/24` strict StageShow sweep snapshots (`0/0/0/0`).
- **Graduated (`DoD-SSG-08-04`).** Explicit operator graduation approval was recorded on `2026-11-20` as `SSG-graduation` in [DECISIONS.tsv](../../../_active/DECISIONS.tsv), `SPRINT-SSG-08` moved to `DONE`, and Program SSG files plus evidence reports were archived into `docs/sprints/programs/ssg/` leaving `docs/sprints/_active/` in standby.

## Docker Gate Receipts (`DoD-SSG-08-01`)

| Step inside `bombadil-gate` | Result |
| --- | --- |
| `docker compose -f docker/bombadil/compose.yml build` | `landingpage-bombadil:local` built on Debian bookworm (`chromium`, `fonts-liberation`, `fonts-dejavu-core`, `fonts-noto-color-emoji`) |
| `npm run build:astro` | `PASS` (`pages=6 staticTriggered=5 untriggered=85`) |
| `node tools/stageshow/build-scenes.mjs --check` | `ok` (`canary` `46966 B` embed gzip, `workbench-bombadil-pair` `35515 B` embed gzip) |
| `npm run stageshow:check-css` | `0` clashes (`85 CSS files, 4 explicit bundles`) |
| `npm run check:bombadil-nets` | `[bombadil:nets] PASS` |
| `npm run check:explorable-gui` | `[explorable-gui] PASS` |
| `npm run check:net` | `PASS` (`40 places, 90 transitions, sessionPInvariant=true`) |
| `npm run docs:check` | `PASS` |
| `npm run test:unit` | `299 passed, 0 failed, 0 skipped` across `20` suites |
| `env SKIP_BUILD=1 npm run stageshow:sweep -- --strict` | `snapshots=24 findings=0 errors=0 clipped=0 overflows=0` (Linux Chromium) |

## Static, Parity, Net, and Docs Gates (`DoD-SSG-08-02`)

| Check | Result |
| --- | --- |
| `node scripts/check-package-source-parity.mjs` | `[parity-ok] pairs=4 uiCalls=22` |
| `npm run check:net` | `PASS` (`workbench-net` `places=40 transitions=90 reachableMarkings=39 sessionPInvariant=true coverage=19/90`; `spa-test-target-net` `places=3 transitions=4 reachableMarkings=3 sessionPInvariant=true coverage=4/4`) |
| `npm run check:explorable-gui` | `[explorable-gui] PASS` |
| `npm run check:bombadil-nets` | `[bombadil:nets] PASS` |
| `npm run check:playwright-discovery` | `smoke 30 (11 files), components 18 (14 files), features 651 (32 files), total 57 unique` |
| `npm run docs:check` | `PASS (0 errors, 13 allowlisted, 138 netIds)` |
| `npm run stageshow:check-css` | `0` clashes (`85 CSS files, 4 explicit bundles`) |
| `node tools/stageshow/build-scenes.mjs --check` | `ok` (`canary` `46749 B` embed gzip, `workbench-bombadil-pair` `35331 B` embed gzip) |

## Host Sequential Execution Matrix (`DoD-SSG-08-03`)

| Check | Result |
| --- | --- |
| `npm run build` | `PASS` (`build:astro` `[gqc-net-parity] PASS pages=6 staticTriggered=5 untriggered=85` and `build:packages`) |
| `npm run test:unit` | `299 passed, 0 failed, 0 skipped` across `20` suites |
| `SKIP_BUILD=1 npm run stageshow:sweep -- --strict` | `snapshots=24 findings=0 errors=0 clipped=0 overflows=0` |
| `node scripts/bombadil/canary.mjs` | `detected in 5 of 5 runs, need 4` (exit `0`) |
| `npm run test:smoke` | `30 passed` (`24.8s`) |
| `npm run test:components` | `18 passed` (`9.9s`) |
| `npm run test:features` | `634 passed, 17 skipped, 0 failed` (`1.4m`) |
| `npm run test:smoke:cross-browser` | `60 passed` (`31.9s`, `smoke-firefox` and `smoke-webkit`) |
| Protected files check | Clean (`ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, `.github/workflows/`, `data/`) |

## Graduation Status (`DoD-SSG-08-04`)

| Gate | Status | Result |
| --- | --- | --- |
| `DoD-SSG-08-01` (`bombadil-gate`) | `PASS` | Verified exit `0` across container build, `299/299` unit tests, and `24/24` strict Linux Chromium sweep |
| `DoD-SSG-08-04` (graduation archival) | `PASS` | Graduated `2026-11-20` on operator approval; archived to `docs/sprints/programs/ssg/` and `docs/sprints/_active/` restored to standby |
