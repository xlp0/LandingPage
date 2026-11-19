# Active Sprint Index

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, developers, and operators |
| BMAD Owner | Product Manager (John) with UX Designer (Sally), Architect (Winston), Developer (Amelia), and TEA |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md), [`./DECISIONS.tsv`](./DECISIONS.tsv), [`./evidence/SSG-pre-program-spike.md`](./evidence/SSG-pre-program-spike.md), [`./evidence/SSG-egm-review.md`](./evidence/SSG-egm-review.md), and [`../INDEX.md`](../INDEX.md) |
| Status | `ACTIVE` (`Program SSG` `SPRINT-SSG-00` `IN_PROGRESS`; `SPRINT-SSG-01..08` `PLANNED`) |
| Consensus Kernel | `clm-kernel@0.0.24` |
| Drift Gate | `npm run docs:check` |

## Active program status

**Active. Program SSG (`StageShow Craft, Bombadil Dashboard Handles, and Coherent Device, Orientation, and Mode Layout`, `2026-11-19`).**

StageShow `1.1.1` (`benjitaylor/skills`, commit `299140fafd08df55a9c234e610c3f64af3f45531`) is installed into `tools/stageshow/` and `.agents/skills/stageshow/` with hermetic runner `scripts/stageshow/run.mjs`. Initial `stageshow:check-css` (`0` clashes across `83` CSS files), unit verification (`tests/unit/stageshow-install.test.mjs`), `npm run test:unit` baseline (`281` tests across `19` suites and `40` files), and a `24`-snapshot baseline sweep are recorded in [`./evidence/SSG-pre-program-spike.md`](./evidence/SSG-pre-program-spike.md). The `9`-sprint design incorporating StageShow workbench architecture and Bombadil event-triggering dashboard handles is tracked alongside two-round EGM + Stage 4/5 review audits in [`./evidence/SSG-egm-review.md`](./evidence/SSG-egm-review.md).

## Active sprint series (`SPRINT-SSG-00` .. `SPRINT-SSG-08`)

| Order | Sprint | Status | Effort | Goal | Specification |
| ---: | --- | :---: | :---: | --- | --- |
| 1 | `SPRINT-SSG-00` | `IN_PROGRESS` | 2d | Complete StageShow `1.1.1` install, `lucide-react` shim + `postcss`, `PUT /api/mcard/landing` + auto-build + strict bounds in `run.mjs`, `preact/compat` scene bundler, npm pack exclusion, and design contract. | [StageShow installation and layout gate](./SPRINT-SSG-00-stageshow-installation-and-layout-gate.md) |
| 2 | `SPRINT-SSG-01` | `PLANNED` | 2d | Subtract duplicate CSS/tokens, adopt StageShow surface scale, fix `.orientation-*` / `mcard-manager.css` / `app.astro`, deduplicate conformance listeners, and fix non-Lab layout voids/overflows. | [CSS and chrome subtraction](./SPRINT-SSG-01-css-and-chrome-subtraction.md) |
| 3 | `SPRINT-SSG-02` | `PLANNED` | 3d | Unify device catalogs, orientation math, memoized conformance fetches, `Full`/`Custom` Persistence Projection, `interrupted-capture:v1`, `window.__lab.geometry`, and Test 11. | [Viewport and device domain model](./SPRINT-SSG-02-viewport-and-device-domain-model.md) |
| 4 | `SPRINT-SSG-03` | `PLANNED` | 3d | Build StageShow playground `.stage-toolbar`/`.stage-well`/`.stage-transport` layout and `6` parametric bezels around `1:1` inner pixels + `4`-corner `1:1` pan. | [StageShow device frames and stage geometry](./SPRINT-SSG-03-stageshow-device-frames-and-stage.md) |
| 5 | `SPRINT-SSG-04` | `PLANNED` | 3d | Build Bombadil runner service spawning `scripts/bombadil/run.mjs`, `/api/test-runs/bombadil/*` REST + `fetch` SSE endpoints, Triad MCard handle schemas, `window.__lab.bombadil`, and CustomEvent handles. | [Bombadil handles and runner API](./SPRINT-SSG-04-bombadil-handles-and-runner-api.md) |
| 6 | `SPRINT-SSG-05` | `PLANNED` | 3d | Restyle workbench shell with StageShow rules and `js/ui/icons.js`, add thin `BombadilDashboardIsland` (`8th` island) + `4` modes, and share `PresentationController`. | [StageShow workbench shell and Bombadil dashboard](./SPRINT-SSG-05-stageshow-workbench-and-bombadil-dashboard.md) |
| 7 | `SPRINT-SSG-06` | `PLANNED` | 2d | Ship `desktop >= 1280px`, `tablet 600..1279px`, and `compact < 600px` (`358px`) tiers plus multi-route bidirectional Playwright suite and strict sweep. | [Host responsive tiers and compact layouts](./SPRINT-SSG-06-host-responsive-tiers-and-compact-layouts.md) |
| 8 | `SPRINT-SSG-07` | `PLANNED` | 2d | Compile `1` `preact/compat` StageShow `Device pair` portal showcase illustrating Bombadil handles on `index.astro?noredirect=1`, rehearsed via `film --gate`. | [Portal StageShow showcase and rehearsal](./SPRINT-SSG-07-portal-stageshow-showcase-and-rehearsal.md) |
| 9 | `SPRINT-SSG-08` | `PLANNED` | 2d | Wire Docker StageShow gates, sync maintained docs including `BOMBADIL_PROPERTY_TESTING.md`, run full matrix, and archive to `docs/sprints/programs/ssg/`. | [Verification baselines, Docker gate, and graduation](./SPRINT-SSG-08-verification-baselines-and-graduation.md) |

## Key workspace artifacts

- **Master program plan.** [`./ssg-plan.md`](./ssg-plan.md)
- **Pre-program spike and measured sweep baseline.** [`./evidence/SSG-pre-program-spike.md`](./evidence/SSG-pre-program-spike.md)
- **EGM multi-agent review ledger.** [`./evidence/SSG-egm-review.md`](./evidence/SSG-egm-review.md)
- **Decision ledger.** [`./DECISIONS.tsv`](./DECISIONS.tsv)
- **StageShow toolkit and runner.** [`../../../tools/stageshow/UPSTREAM.json`](../../../tools/stageshow/UPSTREAM.json) and [`../../../scripts/stageshow/run.mjs`](../../../scripts/stageshow/run.mjs)

## Verification gates for active work

| Gate | Command | Scope |
| --- | --- | --- |
| StageShow CSS clash check | `npm run stageshow:check-css` | Verifies `0` class collisions across StageShow kit, examples, teaching pairs, and authored scenes (`83` CSS files checked) |
| StageShow host layout sweep | `npm run stageshow:sweep` | Captures `24` Chromium snapshots across `6` routes at `1440px`, `820px`, `390px`, and `358px` using ephemeral SQLite storage |
| Unit, observability, and contract suite | `npm run test:unit` | Runs `tests/unit/stageshow-install.test.mjs` alongside all `40` unit, observability, and contract test files on `clm-kernel@0.0.24` (`281` tests across `19` suites passing) |
| Docs, net, GUI, and build parity | `npm run check:net`, `npm run docs:check`, `npm run check:explorable-gui`, `npm run check:bombadil-nets`, `npm run build` | Enforces Petri net P-invariants, living-doc drift checks, `data-testid` / `data-effect` lint, and bundle parity |
| Playwright verification projects | `npm run test:smoke`, `npm run test:components`, `npm run test:features`, `npm run test:smoke:cross-browser` | Executes `--project=smoke`, `--project=components`, `--project=features`, `--project=smoke-firefox`, and `--project=smoke-webkit` |

## Graduated programs

| Program | Code | Archive | Graduation date | Status |
| --- | :---: | --- | :---: | :---: |
| Bombadil Property Verification and Explorable GUI | `BPV` | [programs/bpv](../programs/bpv/INDEX.md) | 2026-11-18 | Graduated |
| Guided SPA Workbench, Astro Islands, Petri Net, and Docs Gates | `GQC` | [programs/gqc](../programs/gqc/INDEX.md) | 2026-11-18 | Graduated |
| Device-Sensitive Testing Infrastructure | `ERB` | [08-testing](../08-testing/INDEX.md) | 2026-10-21 | Graduated |
| Submodule Modularity and Universal MCard Browser | `SMO` | [01-architecture](../01-architecture/INDEX.md) | 2026-10-21 | Graduated |
