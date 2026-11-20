# SPRINT-SLC-04 Evidence: Auth Route Retirement and Program SLC Graduation

## Summary

- **Retired Backend Router and Orphaned Client Auth Modules**:
  - Deleted `routes/auth.js`, `js/modules/auth-manager.js`, `js/modules/auth-module.js`, and `js/components/AuthStatusComponent.js`.
  - Unmounted `authRoutes` and `/api/auth` in `ws-server.js` and updated `serverOwnership.variants.rootServer` in `scripts/package-source-parity.json` (`bytes` `15799` to `15722`, `sha256` `d6ba0a7c...` to `ac2012f4...`, `"/api/auth/*"` removed from `routes`) while keeping `packageServer`, `sourcePairs`, and protected files (`src/pages/fiber-conformance.astro`, `public/js/mcard-kernel/{compat.js,bundle-entry.js,indexeddb-backend.js,node-shims/}`, `data/`, `tools/stageshow/kit/`, `packages/server/src/ws-server.js`) untouched.
- **Updated Petri Net, AppEntry, Test Harnesses, and Living Docs**:
  - Removed the `/api/auth` router mount from `scripts/check-net.mjs` and the three `/api/auth/*` entries from `src/net/workbench-net.yaml`, then regenerated `docs/01-architecture/workbench-net.md` and `tests/bombadil/generated/workbench-net.ts`.
  - Updated `js/app-entry.js`, `tests/unit/pkc-lifecycle.test.mjs`, `tests/fixtures/app-fixtures.js`, `tests/features/performance-baselines.spec.js`, authentication, architecture, and capability docs, `README.md`, and `CHANGELOG.md`.
- **Graduation (`DoD-SLC-04-03`)**:
  - Operator approval received on `2026-11-20`; archived `slc-plan.md`, `SPRINT-SLC-00..04`, and `SLC-00..04` evidence into `docs/sprints/programs/slc/` with all relative links rewritten, and restored `docs/sprints/_active/` to standby (`INDEX.md`, `README.md`, `DECISIONS.tsv`).
- **Working Tree Recovery Note**:
  - Two agent-server restarts during verification re-saved stale editor buffers over uncommitted files (interleaved old and new content). The corrupted diffs were preserved outside the repository, the tree was reset to `edabd5c`, and all `SPRINT-SLC-04` edits were reapplied from scratch before the receipts below.

## Verification Receipts

| Check | Result |
| --- | --- |
| Deleted auth files & protected files guard | `routes/auth.js`, `js/modules/auth-manager.js`, `js/modules/auth-module.js`, and `js/components/AuthStatusComponent.js` absent; zero diffs in `src/pages/fiber-conformance.astro`, `public/js/mcard-kernel/`, `data/`, `tools/stageshow/kit/`, `packages/server/src/ws-server.js`, `package.json`, and `package-lock.json`; `ws-server.js` `15722` bytes matching the manifest SHA-256 |
| Static gates (`docs:check`, parity, `check:net`, `check:explorable-gui`, `check:bombadil-nets`, `check:playwright-discovery`, `stageshow:check-css`) | `docs:check PASS (files=281)`, `parity-ok pairs=4 uiCalls=22`, `check:net PASS` (`38` places, `85` transitions, `sessionPInvariant=true`), `explorable-gui PASS`, `bombadil:nets PASS`, discovery `smoke 24/9`, `components 18/14`, `features 638/30`, `0` CSS clashes (`85` files) |
| `npm run build` and `npm run test:unit` | `gqc-net-parity PASS pages=5`; `300 pass, 0 fail, 0 skipped` |
| `SKIP_BUILD=1 npm run stageshow:sweep -- --strict` and `node scripts/bombadil/canary.mjs` | `snapshots=20 findings=0 errors=0 clipped=0 overflows=0`; canary detected in `5` of `5` runs (need `4`) |
| Playwright (`TEST_PORT=3011`): smoke, components, features, cross-browser smoke | `24 passed`, `18 passed`, `621 passed` (`0` failed), `48 passed` (Firefox and WebKit) |
| Docker `bombadil-gate` (rebuilt image) and `bombadil-scheduler` | Exit `0` on `HEAD` after `down -v` and rebuild: `build:astro PASS`, `build-scenes.mjs --check` ok, `0` CSS clashes, `bombadil:nets PASS`, `explorable-gui PASS`, `check:net PASS (38/85)`, `docs:check PASS (files=281)`, `test:unit 300/300`, Linux Chromium `stageshow:sweep --strict` `20/20` (`0/0/0/0`); `landingpage-bombadil-bombadil-scheduler-1` restarted `Up` |
