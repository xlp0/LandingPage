# Program SLC: Post-SSG Local Cleanup and Subtraction (Graduated)

> **Program SLC Graduated (2026-11-20).** All five sprints (`SPRINT-SLC-00` through `SPRINT-SLC-04`) are completed, verified, and sealed into `docs/sprints/programs/slc/` with explicit operator graduation approval recorded in `DECISIONS.tsv` on `2026-11-20`.

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, architects, developers, QA engineers, and operators |
| BMAD Owner | Product Manager (John) with Architect (Winston), UX Designer (Sally), Developer (Amelia), TEA, Tech Writer, and Scrum Master |
| Source of Truth | [`./slc-plan.md`](./slc-plan.md), [`../ssg/ssg-local-backlog.md`](../ssg/ssg-local-backlog.md), [`../../_active/DECISIONS.tsv`](../../_active/DECISIONS.tsv), and [`./evidence/SLC-04-auth-and-graduation.md`](./evidence/SLC-04-auth-and-graduation.md) |
| Status | **Graduated (`2026-11-20`)** |
| Consensus Kernel | `clm-kernel@0.0.24` |

## Program summary

Program SLC executed the five deferred post-SSG local cleanup items from [`ssg-local-backlog.md`](../ssg/ssg-local-backlog.md) in five ordered commits:

- Removed `61` unmaintained Kubernetes, ArgoCD, and Grafana metrics collector files while keeping `Dockerfile`, `docker-compose*.yml`, `docker/bombadil/`, and CI test workflows.
- Removed legacy browser example games (`public/examples/games/`, `public/examples/3DGames/` with its `3DObjectViewer` submodule, `js/modules/tic-tac-toe-p2p/`) and their net transitions while keeping `Music/`, `WaveVisualizers/`, `THREEJS_ANIMEJS/`, and `location-map.html`.
- Retired `src/pages/app.astro` and the legacy Mission Control stack (`MCardManager`, `UIComponents`, `app-bootstrap.js`, `mcard-manager.css`, `ViewManager.js`, `local-ui-app`), reducing the workbench net to `38` Places and `85` Transitions and the StageShow sweep to `20` snapshots, while keeping `public/js/mcard-kernel/compat.js` for `fiber-conformance.astro`.
- Removed `js/redux/`, `js/store/`, vendored Redux bundles, and the `@reduxjs/toolkit` and `redux` npm packages.
- Retired `routes/auth.js` (`/api/auth/*`) and orphaned client auth modules, unmounted the router from `ws-server.js`, and deliberately updated the `rootServer` bytes, SHA-256, and routes in `scripts/package-source-parity.json`.

## Sprint specifications (`SLC-00` .. `SLC-04`)

| Order | Sprint | Goal | Evidence | Specification |
| ---: | --- | --- | --- | --- |
| 1 | `SPRINT-SLC-00` | Remove `k8s/`, root `argocd-*.yaml`, `deploy-k8s.yml`, and Grafana metrics collector dumps and scripts. | [`SLC-00-infra-subtraction.md`](./evidence/SLC-00-infra-subtraction.md) | [Legacy Kubernetes, ArgoCD, and Grafana subtraction](./SPRINT-SLC-00-k8s-argocd-grafana-subtraction.md) |
| 2 | `SPRINT-SLC-01` | Remove legacy example games, the `3DGames` submodule, and game net transitions. | [`SLC-01-games-subtraction.md`](./evidence/SLC-01-games-subtraction.md) | [Legacy example games subtraction](./SPRINT-SLC-01-legacy-example-games-subtraction.md) |
| 3 | `SPRINT-SLC-02` | Fully retire `app.astro` and Mission Control while keeping `compat.js`. | [`SLC-02-app-retirement.md`](./evidence/SLC-02-app-retirement.md) | [Full app.astro retirement](./SPRINT-SLC-02-app-astro-full-retirement.md) |
| 4 | `SPRINT-SLC-03` | Remove residual Redux stores, vendored bundles, and npm dependencies. | [`SLC-03-redux-cleanup.md`](./evidence/SLC-03-redux-cleanup.md) | [Residual Redux store cleanup](./SPRINT-SLC-03-redux-store-and-deps-cleanup.md) |
| 5 | `SPRINT-SLC-04` | Retire `routes/auth.js`, update the parity manifest, pass host and Docker gates, and graduate. | [`SLC-04-auth-and-graduation.md`](./evidence/SLC-04-auth-and-graduation.md) | [Auth route retirement and graduation](./SPRINT-SLC-04-auth-route-retirement-and-graduation.md) |

## Graduation verification summary (2026-11-20)

See [`./evidence/SLC-04-auth-and-graduation.md`](./evidence/SLC-04-auth-and-graduation.md) for exact host and Linux Docker `bombadil-gate` receipts.

## Related archives

- **Program SSG**: [docs/sprints/programs/ssg/INDEX.md](../ssg/INDEX.md) (Graduated `2026-11-20`)
- **Program BPV**: [docs/sprints/programs/bpv/INDEX.md](../bpv/INDEX.md) (Graduated `2026-11-18`)
- **Program GQC**: [docs/sprints/programs/gqc/INDEX.md](../gqc/INDEX.md) (Graduated `2026-11-18`)
- **Program ERB**: [docs/sprints/08-testing/INDEX.md](../../08-testing/INDEX.md) (Graduated `2026-10-21`)
- **Program SMO**: [docs/sprints/01-architecture/INDEX.md](../../01-architecture/INDEX.md) (Graduated `2026-10-21`)
