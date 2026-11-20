# SPRINT-SLC-04 Auth Route Retirement, Final Verification, and Graduation

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SLC-04` |
| Source of Truth | [`./slc-plan.md`](./slc-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SLC-04` |
| Status | `GRADUATED` (`2026-11-20`) |
| Depends on | `SPRINT-SLC-03` |
| Unblocks | Graduation of `Program SLC` to `docs/sprints/programs/slc/` |
| Execution unit | `PR-SLC-04` |
| Decision Ref | `SLC-D06` |
| BMAD roles | Product Manager, Architect, Developer, TEA, Tech Writer, Scrum Master |
| Effort | 1 day |

## Outcome

Retire the legacy backend OAuth/PKCE router (`routes/auth.js`), unmount `/api/auth` in `ws-server.js`, deliberately update `ws-server.js` byte count, SHA-256 digest, and route list in `scripts/package-source-parity.json`, remove `/api/auth/*` expectations from `scripts/check-net.mjs` and `src/net/workbench-net.yaml`, clean up orphaned auth client callers (`js/modules/auth-manager.js`, `js/modules/auth-module.js`, `js/components/AuthStatusComponent.js`, `js/app-entry.js` + `tests/unit/pkc-lifecycle.test.mjs`, `tests/fixtures/app-fixtures.js`), align `docs/02-authentication/` and maintained documentation, pass full host + Docker `bombadil-gate` verification matrices, and archive `Program SLC` into `docs/sprints/programs/slc/` upon explicit operator approval.

## Work sequence

1. Delete `routes/auth.js` and unmount `authRoutes` + `/api/auth` from `ws-server.js`.
2. Recompute `ws-server.js` bytes and SHA-256 (`shasum -a 256 ws-server.js`) and update `scripts/package-source-parity.json` (`serverOwnership.variants.rootServer.bytes`, `.sha256`, and `.routes` without `/api/auth/*`).
3. Remove `/api/auth/*` from `scripts/check-net.mjs`, `src/net/workbench-net.yaml`, `tests/fixtures/app-fixtures.js`, `tests/gui-coverage.json`, and `tests/features/performance-baselines.spec.js`; regenerate `workbench-net.md` (`npm run docs:gen-net`) and `workbench-net.ts` (`npm run bombadil:nets`); retire orphaned client auth modules (`js/modules/auth-manager.js`, `js/modules/auth-module.js`, `js/components/AuthStatusComponent.js`) and update `js/app-entry.js` + `tests/unit/pkc-lifecycle.test.mjs`.
4. Update `docs/02-authentication/`, `docs/functionalities/06-AUTHENTICATION-AND-IDENTITY-SYSTEM.md`, `docs/functionalities/README.md`, `docs/sprints/programs/ssg/ssg-local-backlog.md` notes, `README.md`, and `CHANGELOG.md`.
5. Run full host sequential verification battery (`docs:check`, `check-package-source-parity.mjs`, `check:net`, `check:explorable-gui`, `check:bombadil-nets`, `check:playwright-discovery`, `stageshow:check-css`, `build`, `test:unit`, `stageshow:sweep --strict`, `node scripts/bombadil/canary.mjs`, `test:smoke`, `test:components`, `test:features`, `test:smoke:cross-browser`) plus local Docker `bombadil-gate`, record `docs/sprints/_active/evidence/SLC-04-auth-and-graduation.md`, obtain explicit operator graduation approval, append `SLC-graduation` to `DECISIONS.tsv`, and archive into `docs/sprints/programs/slc/` restoring `docs/sprints/_active/` to standby.

## Files

- Delete `routes/auth.js`, orphaned auth client modules (`js/modules/auth-manager.js`, `js/modules/auth-module.js`, `js/components/AuthStatusComponent.js`)
- Edit `ws-server.js`, `scripts/package-source-parity.json`, `scripts/check-net.mjs`, `src/net/workbench-net.yaml`, `docs/01-architecture/workbench-net.md`, `tests/bombadil/generated/workbench-net.ts`, `js/app-entry.js`, `tests/unit/pkc-lifecycle.test.mjs`, `tests/fixtures/app-fixtures.js`, `tests/gui-coverage.json`, `tests/features/performance-baselines.spec.js`, `docs/02-authentication/`, `docs/functionalities/`, `README.md`, `CHANGELOG.md`
- Create `docs/sprints/_active/evidence/SLC-04-auth-and-graduation.md` and `docs/sprints/programs/slc/INDEX.md` (at archival)

## Acceptance criteria

- `routes/auth.js` is removed and `/api/auth` is unmounted from `ws-server.js`, with `node scripts/check-package-source-parity.mjs` passing against the updated SHA-256 manifest.
- Complete host verification matrix and local Docker `bombadil-gate` pass after final documentation edits.
- Program SLC archives into `docs/sprints/programs/slc/` upon explicit operator sign-off leaving `docs/sprints/_active/` in standby.

## Non-goals

- Editing protected `src/pages/fiber-conformance.astro` or `data/`.

## Definition of done

- [x] **DoD-SLC-04-01.** `routes/auth.js` is deleted, `/api/auth` is unmounted from `ws-server.js`, `scripts/package-source-parity.json` matches new SHA-256/routes, and `check:net` / `docs:check` / parity gates pass.
- [x] **DoD-SLC-04-02.** Full host verification matrix (`build`, `test:unit`, `stageshow:sweep --strict`, `canary.mjs`, `test:smoke`, `test:components`, `test:features`, `test:smoke:cross-browser`) and local Docker `bombadil-gate` exit `0`.
- [x] **DoD-SLC-04-03.** Operator graduation approval is recorded in `DECISIONS.tsv` (`SLC-graduation`), Program SLC is archived into `docs/sprints/programs/slc/`, and `docs/sprints/_active/` is restored to standby.

Closure evidence: [`./evidence/SLC-04-auth-and-graduation.md`](./evidence/SLC-04-auth-and-graduation.md).
