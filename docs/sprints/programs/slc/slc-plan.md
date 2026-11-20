# Program SLC Plan: Post-SSG Local Cleanup and Subtraction

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, architects, developers, and TEA engineers |
| BMAD Owner | Product Manager (John) with Architect (Winston), UX Designer (Sally), Developer (Amelia), TEA, and Tech Writer |
| Source of Truth | This plan, [`./INDEX.md`](./INDEX.md), [`./DECISIONS.tsv`](../../_active/DECISIONS.tsv), and [`../programs/ssg/ssg-local-backlog.md`](../ssg/ssg-local-backlog.md) |
| Status | **Graduated (`2026-11-20`)** (`SPRINT-SLC-00` through `SPRINT-SLC-04` `DONE`; archived to `docs/sprints/programs/slc/`) |
| Program | SLC, Post-SSG Local Cleanup and Subtraction |
| Consensus Kernel | `clm-kernel@0.0.24` |
| Drift Gate | `npm run docs:check` |

## Outcome

Program SLC executes the five deferred local subtraction items tracked in [`../programs/ssg/ssg-local-backlog.md`](../ssg/ssg-local-backlog.md) sequentially across five self-contained sprints (`SPRINT-SLC-00` through `SPRINT-SLC-04`). Across five ordered commits, the repository retires dead Kubernetes/ArgoCD/Grafana-collector infrastructure, legacy browser example games (`games/`, `3DGames/`, `tic-tac-toe-p2p/`), the legacy Mission Control `app.astro` page and `MCardManager` stack, unreferenced Redux stores and `@reduxjs/toolkit` dependencies, and the orphaned `/api/auth` router (`routes/auth.js`), while keeping the Astro responsive workbench, Universal 4-Modality MCard viewer, `clm-kernel@0.0.24` SQLite Triad, `fiber-inspector.html`, protected `fiber-conformance.html`, Petri net P-invariants, and Linux Docker `bombadil-gate` green.

## Locked Program Decisions (`SLC-D01` .. `SLC-D06`)

1. **`SLC-D01` (Sequential 5-Sprint Structure).** Execute the five items from `ssg-local-backlog.md` as ordered sprints `SPRINT-SLC-00` through `SPRINT-SLC-04` under `docs/sprints/_active/`, gating every sprint on `npm run docs:check`, `node scripts/check-package-source-parity.mjs`, `npm run check:net`, `npm run check:explorable-gui`, `npm run check:bombadil-nets`, `npm run stageshow:check-css`, `npm run build`, `npm run test:unit`, and relevant Playwright suites. Explicit operator graduation approval is required after `SPRINT-SLC-04` before archiving into `docs/sprints/programs/slc/`.
2. **`SLC-D02` (`SPRINT-SLC-00` Infrastructure Subtraction Scope).** Delete `k8s/`, root `argocd-application.yaml`, `argocd-project.yaml`, `argocd-repo-secret.yaml`, `.github/workflows/deploy-k8s.yml`, `.github/workflows/grafana-metrics-collector.yml`, `.github/workflows/grafana-metrics-21055165491/`, `.github/workflows/grafana-metrics-21056336713/`, `.github/workflows/README-GRAFANA-METRICS.md`, `.github/workflows/SETUP-GRAFANA-SECRETS.md`, `.github/scripts/collect_grafana_metrics.py`, `.github/scripts/collect_all_dashboard_metrics.py`, `.github/scripts/convert_metrics_to_markdown.py`, `.github/scripts/upload_metrics_to_minio.py`, and `.github/scripts/README.md`. Keep `.github/workflows/clm-test-all-components.yml`, `.github/workflows/playwright-quality.yml`, `.github/workflows/daily-commit-summary.yml`, `Dockerfile`, `docker-compose.yml`, `docker-compose.stun.yml`, and `docker/bombadil/` intact.
3. **`SLC-D03` (`SPRINT-SLC-01` Legacy Example Games Scope).** Delete `public/examples/games/`, `public/examples/3DGames/`, `js/modules/tic-tac-toe-p2p/`, and `docs/06-components/games/`. Remove `p_external_games` and `t_open_external_{monopoly,chess,go}` from `src/net/workbench-net.yaml` and game containers from `src/pages/app.astro`, regenerate `workbench-net.md` and `workbench-net.ts`, and update affected unit, benchmark, and Playwright specs. Keep `public/examples/Music/`, `public/examples/WaveVisualizers/`, `public/examples/THREEJS_ANIMEJS/`, and `public/examples/location-map.html`.
4. **`SLC-D04` (`SPRINT-SLC-02` Full `app.astro` Retirement).** Fully retire and delete `src/pages/app.astro`, `public/js/app-bootstrap.js`, `public/js/mcard-kernel/MCardManager.js`, `public/js/mcard-kernel/UIComponents.js`, and `public/css/mcard-manager.css` (and unused `public/js/ui-inline-handlers.js` if unreferenced). Preserve `public/js/mcard-kernel/compat.js`, `bundle-entry.js`, `indexeddb-backend.js`, and `node-shims/` because `src/pages/fiber-conformance.astro` (protected), `src/pages/fiber-inspector.astro`, `scripts/build-mcard-bundle.js`, and `scripts/check-docs.mjs` depend on them. Remove `p_page_app`, `t_link_lab_to_app`, and `t_link_app_to_index` from `src/net/workbench-net.yaml`, remove `local-ui-app` from `app-config.json`, update PenPot navigation (`js/nav.js` and `design/landing-navigation.penpot`), drop `/app.html` from StageShow sweep (`20` snapshots across `5` routes), and update baselines, coverage manifests, and tests.
5. **`SLC-D05` (`SPRINT-SLC-03` Redux Cleanup).** Delete `js/redux/`, `js/store/`, `js/libs/redux*.js`, and `public/vendor/redux/`, uninstall `@reduxjs/toolkit` and `redux` from `package.json` and `package-lock.json`, remove Redux import-map entries, and remove dead Redux script/store hooks in `js/modules/webrtc-dashboard/`.
6. **`SLC-D06` (`SPRINT-SLC-04` Auth Route Retirement and Graduation).** Delete `routes/auth.js`, remove `/api/auth` mounting in `ws-server.js`, update `ws-server.js` size, SHA-256, and route manifest in `scripts/package-source-parity.json`, remove `/api/auth/*` from `scripts/check-net.mjs` and `src/net/workbench-net.yaml`, decouple or remove orphaned auth client callers while keeping `tests/unit/pkc-lifecycle.test.mjs` passing, verify full host and Docker `bombadil-gate` batteries, and request operator approval before archiving into `docs/sprints/programs/slc/`.

## Protected Files and Boundaries

| Path | Protection Rule | Active Sprints |
| --- | --- | --- |
| `src/pages/fiber-conformance.astro` | Permanently read-only (Darwin screenshot baselines locked) | `SLC-00` through `SLC-04` |
| `public/js/mcard-kernel/compat.js`, `bundle-entry.js`, `indexeddb-backend.js`, `node-shims/` | Protected shared kernel compatibility modules used by `fiber-conformance.astro`, `fiber-inspector.astro`, `scripts/build-mcard-bundle.js`, and `scripts/check-docs.mjs` | `SLC-00` through `SLC-04` |
| `ws-server.js` and `scripts/package-source-parity.json` | SHA-locked and untouched during `SLC-00..03`; explicitly unlocked only in `SPRINT-SLC-04` | `SLC-00` through `SLC-03` |
| `data/` | Mutable seed corpus stays unmodified during source/test work | `SLC-00` through `SLC-04` |
| `tools/stageshow/kit/` | Upstream SHA-256 verified toolkit stays unmodified | `SLC-00` through `SLC-04` |
| Parent repository (`../`) | Strict submodule sovereignty (`INV-SMO-01`) | `SLC-00` through `SLC-04` |

## Sprint Execution Sequence

| Order | Sprint | Status | Target Surface | Specification |
| ---: | --- | :---: | --- | --- |
| 1 | `SPRINT-SLC-00` | `IN_PROGRESS` | Legacy `k8s/`, root `argocd-*.yaml`, `deploy-k8s.yml`, and Grafana metrics collector assets | [`SPRINT-SLC-00`](./SPRINT-SLC-00-k8s-argocd-grafana-subtraction.md) |
| 2 | `SPRINT-SLC-01` | `PLANNED` | `public/examples/games/`, `public/examples/3DGames/`, `js/modules/tic-tac-toe-p2p/`, `docs/06-components/games/`, net/app/test game refs | [`SPRINT-SLC-01`](./SPRINT-SLC-01-legacy-example-games-subtraction.md) |
| 3 | `SPRINT-SLC-02` | `PLANNED` | `src/pages/app.astro`, `MCardManager`, `app-bootstrap.js`, `mcard-manager.css`, `p_page_app`, PenPot nav, StageShow `5`-route sweep | [`SPRINT-SLC-02`](./SPRINT-SLC-02-app-astro-full-retirement.md) |
| 4 | `SPRINT-SLC-03` | `PLANNED` | `js/redux/`, `js/store/`, `js/libs/redux*.js`, `public/vendor/redux/`, `@reduxjs/toolkit`, `redux`, import maps | [`SPRINT-SLC-03`](./SPRINT-SLC-03-redux-store-and-deps-cleanup.md) |
| 5 | `SPRINT-SLC-04` | `PLANNED` | `routes/auth.js`, `/api/auth` unmount in `ws-server.js`, parity SHA refresh, Docker `bombadil-gate`, docs sync, graduation | [`SPRINT-SLC-04`](./SPRINT-SLC-04-auth-route-retirement-and-graduation.md) |

## Graduation Criteria

Program SLC is eligible for graduation archival into `docs/sprints/programs/slc/` only after:
1. All five sprints (`SPRINT-SLC-00` through `SPRINT-SLC-04`) show `Status: DONE`, checked DoDs, recorded evidence under `docs/sprints/_active/evidence/SLC-0N-*.md`, and completion rows in [`./DECISIONS.tsv`](../../_active/DECISIONS.tsv).
2. Host gates (`docs:check`, `check-package-source-parity.mjs`, `check:net`, `check:explorable-gui`, `check:bombadil-nets`, `check:playwright-discovery`, `stageshow:check-css`, `stageshow:sweep --strict`, `build`, `test:unit`, `test:smoke`, `test:components`, `test:features`, `test:smoke:cross-browser`) and local Docker `bombadil-gate` pass after final edits.
3. Explicit operator graduation sign-off is recorded in `DECISIONS.tsv`.
