# Active Sprint Index

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, developers, and operators |
| BMAD Owner | Product Manager (John) with Architect (Winston), UX Designer (Sally), Developer (Amelia), and TEA |
| Source of Truth | [`./slc-plan.md`](./slc-plan.md), [`./DECISIONS.tsv`](./DECISIONS.tsv), [`../programs/ssg/ssg-local-backlog.md`](../programs/ssg/ssg-local-backlog.md), and [`../INDEX.md`](../INDEX.md) |
| Status | `ACTIVE` (`Program SLC` `SPRINT-SLC-00` `IN_PROGRESS`; `SPRINT-SLC-01..04` `PLANNED`) |
| Consensus Kernel | `clm-kernel@0.0.24` |
| Drift Gate | `npm run docs:check` |

## Active program status

**Active. Program SLC (`Post-SSG Local Cleanup and Subtraction`, `2026-11-20`).**

Program SLC executes the five deferred local subtraction items from [`../programs/ssg/ssg-local-backlog.md`](../programs/ssg/ssg-local-backlog.md) sequentially across `SPRINT-SLC-00` through `SPRINT-SLC-04`. Protected `src/pages/fiber-conformance.astro`, `public/js/mcard-kernel/compat.js`, `data/`, and `tools/stageshow/kit/` stay untouched throughout, while `ws-server.js` and `scripts/package-source-parity.json` stay locked until `SPRINT-SLC-04` unmounts `/api/auth`.

## Active sprint series (`SPRINT-SLC-00` .. `SPRINT-SLC-04`)

| Order | Sprint | Status | Effort | Goal | Specification |
| ---: | --- | :---: | :---: | --- | --- |
| 1 | `SPRINT-SLC-00` | `IN_PROGRESS` | 1d | Remove legacy `k8s/`, root `argocd-*.yaml`, `deploy-k8s.yml`, and Grafana metrics collector dumps and scripts while keeping Docker and CI test workflows intact. | [Legacy Kubernetes, ArgoCD, and Grafana subtraction](./SPRINT-SLC-00-k8s-argocd-grafana-subtraction.md) |
| 2 | `SPRINT-SLC-01` | `PLANNED` | 1d | Remove legacy `public/examples/games/`, `3DGames/`, `tic-tac-toe-p2p/`, `docs/06-components/games/`, game net transitions, and game tests while preserving `Music`/`WaveVisualizers`/`THREEJS_ANIMEJS`. | [Legacy example games subtraction](./SPRINT-SLC-01-legacy-example-games-subtraction.md) |
| 3 | `SPRINT-SLC-02` | `PLANNED` | 2d | Fully retire `src/pages/app.astro`, `MCardManager`, `app-bootstrap.js`, `mcard-manager.css`, `p_page_app`, PenPot `app.html` link, and update StageShow `5`-route sweep while keeping `compat.js` for `fiber-conformance.astro`. | [Full app.astro retirement](./SPRINT-SLC-02-app-astro-full-retirement.md) |
| 4 | `SPRINT-SLC-03` | `PLANNED` | 1d | Remove `js/redux/`, `js/store/`, `js/libs/redux*.js`, `public/vendor/redux/`, uninstall `@reduxjs/toolkit` and `redux`, and clean import maps and `webrtc-dashboard/` hooks. | [Residual Redux store cleanup](./SPRINT-SLC-03-redux-store-and-deps-cleanup.md) |
| 5 | `SPRINT-SLC-04` | `PLANNED` | 1d | Retire `routes/auth.js`, unmount `/api/auth` in `ws-server.js`, update parity SHA manifest, run full host and Docker `bombadil-gate` suites, and archive to `docs/sprints/programs/slc/`. | [Auth route retirement and graduation](./SPRINT-SLC-04-auth-route-retirement-and-graduation.md) |

## Key workspace artifacts

- **Master program plan.** [`./slc-plan.md`](./slc-plan.md)
- **Originating backlog.** [`../programs/ssg/ssg-local-backlog.md`](../programs/ssg/ssg-local-backlog.md)
- **Canonical decision ledger.** [`./DECISIONS.tsv`](./DECISIONS.tsv)

## Verification gates for active work

| Gate | Command | Scope |
| --- | --- | --- |
| StageShow CSS clash check | `npm run stageshow:check-css` | Verifies `0` class collisions across StageShow kit, examples, teaching pairs, and authored scene bundles (`85` CSS files, `4` explicit bundles) |
| StageShow host layout sweep | `npm run stageshow:sweep` | Captures `24` Chromium snapshots (`20` after `app.html` retirement in `SLC-02`) across active routes at `1440px`, `820px`, `390px`, and `358px` |
| Unit, observability, and contract suite | `npm run test:unit` | Runs all unit, observability, and contract tests on `clm-kernel@0.0.24` (`300` tests across `20` suites passing at baseline) |
| Docs, net, GUI, and build parity | `npm run check:net`, `npm run docs:check`, `npm run check:explorable-gui`, `npm run check:bombadil-nets`, `npm run build` | Enforces Petri net P-invariants, living-doc drift checks, `data-testid` / `data-effect` lint, and bundle parity |
| Playwright verification projects | `npm run test:smoke`, `npm run test:components`, `npm run test:features`, `npm run test:smoke:cross-browser` | Executes `--project=smoke`, `--project=components`, `--project=features`, `--project=smoke-firefox`, and `--project=smoke-webkit` |

## Graduated programs

| Program | Code | Archive | Graduation date | Status |
| --- | :---: | --- | :---: | :---: |
| StageShow Craft, Bombadil Dashboard Handles, and Coherent Layout | `SSG` | [programs/ssg](../programs/ssg/INDEX.md) | 2026-11-20 | Graduated |
| Bombadil Property Verification and Explorable GUI | `BPV` | [programs/bpv](../programs/bpv/INDEX.md) | 2026-11-18 | Graduated |
| Guided SPA Workbench, Astro Islands, Petri Net, and Docs Gates | `GQC` | [programs/gqc](../programs/gqc/INDEX.md) | 2026-11-18 | Graduated |
| Device-Sensitive Testing Infrastructure | `ERB` | [08-testing](../08-testing/INDEX.md) | 2026-10-21 | Graduated |
| Submodule Modularity and Universal MCard Browser | `SMO` | [01-architecture](../01-architecture/INDEX.md) | 2026-10-21 | Graduated |
