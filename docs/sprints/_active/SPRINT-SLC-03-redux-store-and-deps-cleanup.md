# SPRINT-SLC-03 Residual Redux Store and Dependencies Cleanup

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SLC-03` |
| Source of Truth | [`./slc-plan.md`](./slc-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SLC-03` |
| Status | `DONE` |
| Depends on | `SPRINT-SLC-02` |
| Unblocks | `SPRINT-SLC-04` |
| Execution unit | `PR-SLC-03` |
| Decision Ref | `SLC-D05` |
| BMAD roles | Architect, Developer, TEA, Tech Writer |
| Effort | 1 day |

## Outcome

Remove residual legacy Redux store trees (`js/redux/`, `js/store/`), vendored browser Redux bundles (`js/libs/redux*.js`, `public/vendor/redux/`), and npm dependencies (`@reduxjs/toolkit`, `redux`) from `package.json` and `package-lock.json`, strip unused Redux import-map entries and dead store parameters in `js/modules/webrtc-dashboard/`, and align `docs/05-state-management/`.

## Work sequence

1. Delete `js/redux/`, `js/store/`, `js/libs/redux.esm.js`, `js/libs/redux.min.js`, `js/libs/redux-toolkit.esm.js`, `js/libs/redux-toolkit.min.js`, and `public/vendor/redux/`.
2. Remove `@reduxjs/toolkit` and `redux` from `package.json` and refresh `package-lock.json` via `npm install --package-lock-only` (without touching protected `clm-kernel` or Astro pins).
3. Clean Redux references in `public/js/config/auto-import-map.js`, `public/js/config/env-detector.js`, `public/js/importmap-init.js`, and dead Redux `<script>` / `reduxStore` references in `js/modules/webrtc-dashboard/`.
4. Update `docs/05-state-management/README.md`, `README.md`, and `docs/INDEX.md` state-management summaries so documentation reflects `lab-runtime.js` coordinator and Astro Preact island state without broken Redux links.
5. Verify `npm run docs:check`, `node scripts/check-package-source-parity.mjs`, `npm run check:net`, `npm run check:explorable-gui`, `npm run stageshow:check-css`, `npm run build`, and `npm run test:unit`, record `docs/sprints/_active/evidence/SLC-03-redux-cleanup.md` and `DECISIONS.tsv`, and commit.

## Files

- Delete `js/redux/`, `js/store/`, `js/libs/redux*.js`, `public/vendor/redux/`
- Edit `package.json`, `package-lock.json`, `public/js/config/auto-import-map.js`, `public/js/config/env-detector.js`, `public/js/importmap-init.js`, `js/modules/webrtc-dashboard/`, `docs/05-state-management/README.md`, `docs/INDEX.md`, `README.md`
- Create `docs/sprints/_active/evidence/SLC-03-redux-cleanup.md`

## Acceptance criteria

- Zero `redux` or `@reduxjs/toolkit` packages or `js/redux/` / `js/store/` directories remain in `LandingPage`.
- `npm run docs:check`, `npm run build`, `npm run test:unit`, `npm run test:smoke`, and `npm run stageshow:sweep --strict` pass with `ws-server.js` and protected files untouched.

## Non-goals

- Modifying Redux copies inside `public/examples/Music/` self-contained examples (`public/examples/Music/js/lib/redux.min.js` if isolated inside preserved Music examples).

## Definition of done

- [x] **DoD-SLC-03-01.** `js/redux/`, `js/store/`, `js/libs/redux*.js`, `public/vendor/redux/`, and `@reduxjs/toolkit` + `redux` package dependencies are removed.
- [x] **DoD-SLC-03-02.** Import maps, `webrtc-dashboard/`, docs, build, unit tests, and Playwright smoke pass.
- [x] **DoD-SLC-03-03.** Closure evidence is recorded in `docs/sprints/_active/evidence/SLC-03-redux-cleanup.md` and `DECISIONS.tsv`.
