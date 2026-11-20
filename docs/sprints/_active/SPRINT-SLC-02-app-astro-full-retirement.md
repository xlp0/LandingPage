# SPRINT-SLC-02 Full app.astro and Legacy Mission Control Retirement

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SLC-02` |
| Source of Truth | [`./slc-plan.md`](./slc-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SLC-02` |
| Status | `PLANNED` |
| Depends on | `SPRINT-SLC-01` |
| Unblocks | `SPRINT-SLC-03` |
| Execution unit | `PR-SLC-02` |
| Decision Ref | `SLC-D04` |
| BMAD roles | Product Manager, Architect, UX Designer, Developer, TEA |
| Effort | 2 days |

## Outcome

Fully retire the legacy `/app.html` Mission Control page (`src/pages/app.astro`), its IndexedDB manager UI (`public/js/app-bootstrap.js`, `public/js/mcard-kernel/MCardManager.js`, `public/js/mcard-kernel/UIComponents.js`, `public/css/mcard-manager.css`, and unreferenced `public/js/ui-inline-handlers.js`), `local-ui-app` target preset, and `p_page_app` Petri net Place while preserving shared kernel compatibility files (`public/js/mcard-kernel/compat.js`, `bundle-entry.js`, `indexeddb-backend.js`, `node-shims/`) required by `fiber-inspector.astro`, protected `fiber-conformance.astro`, `scripts/build-mcard-bundle.js`, and `scripts/check-docs.mjs`. Update PenPot navigation (`design/landing-navigation.penpot`, `js/nav.js`), StageShow sweep (`20` snapshots across `5` routes), layout freeze baselines, and test suites.

## Work sequence

1. Delete `src/pages/app.astro`, `public/js/app-bootstrap.js`, `public/js/mcard-kernel/MCardManager.js`, `public/js/mcard-kernel/UIComponents.js`, `public/css/mcard-manager.css`, and unreferenced `public/js/ui-inline-handlers.js`, while updating service worker precache lists (`sw.js`, `public/sw.js`) and explicitly keeping `public/js/mcard-kernel/{compat.js,bundle-entry.js,indexeddb-backend.js,node-shims/}` untouched.
2. Remove `p_page_app`, `t_link_lab_to_app`, and `t_link_app_to_index` from `src/net/workbench-net.yaml`, remove `local-ui-app` from `app-config.json` (and update fallback defaults in `js/harness/recorder.js`, `js/harness/spa-test-workflow.js`, `src/islands/SpaTestWorkflow.jsx`, `src/islands/TargetToolbarIsland.jsx`), regenerate `workbench-net.md` and `workbench-net.ts`, and update `design/landing-navigation.penpot` + `scripts/penpot-*` + `js/nav.js` to drop the Mission Control `/app.html` destination.
3. Update `scripts/stageshow/run.mjs` sweep route list (`5` routes x `4` widths = `20` snapshots), `scripts/check-explorable-gui.mjs`, `tests/gui-coverage.json`, `tests/bombadil/scope.json`, `retired-islands.yaml`, `tests/baselines/layout-baseline.json` (selective removal/rebaseline with attribution), and retire or migrate Mission Control tests (`tests/smoke/root-app.spec.js`, `tests/features/chat-panel.spec.js`, `tests/features/new-text-card.spec.js`, `tests/features/layout-freeze.spec.js`, `tests/unit/page-state.test.mjs`, `tests/unit/target-membrane.test.mjs`, etc.).
4. Verify all static, build (`5` pages), unit, StageShow sweep (`20/20`), and Playwright smoke/components/features suites pass, record `docs/sprints/_active/evidence/SLC-02-app-retirement.md` and `DECISIONS.tsv`, and commit.

## Files

- Delete `src/pages/app.astro`, `public/js/app-bootstrap.js`, `public/js/mcard-kernel/MCardManager.js`, `public/js/mcard-kernel/UIComponents.js`, `public/css/mcard-manager.css`
- Edit `src/net/workbench-net.yaml`, `app-config.json`, `scripts/stageshow/run.mjs`, `scripts/check-explorable-gui.mjs`, `tests/gui-coverage.json`, `tests/bombadil/scope.json`, `tests/baselines/layout-baseline.json`, `retired-islands.yaml`, `js/nav.js`, and affected harness/test/doc files
- Create `docs/sprints/_active/evidence/SLC-02-app-retirement.md`

## Acceptance criteria

- `/app.html` and `src/pages/app.astro` are completely retired; `astro build` emits `5` remaining pages passing `net-parity`.
- `public/js/mcard-kernel/compat.js`, `bundle-entry.js`, `indexeddb-backend.js`, `node-shims/`, `fiber-inspector.astro`, and `fiber-conformance.astro` remain intact and passing.
- `stageshow:sweep --strict` passes (`20` snapshots, `0` clips, `0` overflows) alongside `docs:check`, `check:net`, `test:unit`, `test:smoke`, `test:components`, and `test:features`.

## Non-goals

- Removing `public/js/mcard-kernel/compat.js` or editing `src/pages/fiber-conformance.astro`.

## Definition of done

- [ ] **DoD-SLC-02-01.** `src/pages/app.astro` and Mission Control `MCardManager` UI assets are deleted while `compat.js` and `fiber-conformance.astro` remain intact.
- [ ] **DoD-SLC-02-02.** `workbench-net.yaml`, `app-config.json`, PenPot nav, StageShow sweep (`20/20`), `check:explorable-gui`, `docs:check`, `test:unit`, and Playwright suites pass.
- [ ] **DoD-SLC-02-03.** Closure evidence is recorded in `docs/sprints/_active/evidence/SLC-02-app-retirement.md` and `DECISIONS.tsv`.
