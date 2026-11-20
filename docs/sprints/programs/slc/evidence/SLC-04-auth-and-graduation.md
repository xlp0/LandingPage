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
| Deleted auth files & protected files guard | Pending final run |
| Static gates (`docs:check`, parity, `check:net`, `check:explorable-gui`, `check:bombadil-nets`, `check:playwright-discovery`, `stageshow:check-css`) | Pending final run |
| `npm run build` and `npm run test:unit` | Pending final run |
| `SKIP_BUILD=1 npm run stageshow:sweep -- --strict` and `node scripts/bombadil/canary.mjs` | Pending final run |
| Playwright (`TEST_PORT=3011`): smoke, components, features, cross-browser smoke | Pending final run |
| Docker `bombadil-gate` (rebuilt image) and `bombadil-scheduler` | Pending final run |
