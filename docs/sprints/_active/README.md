# LandingPage Active Sprint Workspace

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role leads, developers, and operators |
| BMAD Owner | Scrum Master |
| Source of Truth | [`./INDEX.md`](./INDEX.md), [`./slc-plan.md`](./slc-plan.md), [`./DECISIONS.tsv`](./DECISIONS.tsv), and [`../INDEX.md`](../INDEX.md) |
| Status | `ACTIVE` (`Program SLC`: `SPRINT-SLC-00..02` `DONE`; `SPRINT-SLC-03` `NEXT`; `SPRINT-SLC-04` `PLANNED`) |
| Consensus Kernel | `clm-kernel@0.0.24` |
| Drift Gate | `npm run docs:check` |

## Workspace status

**Active program in flight (`2026-11-20`) is Program SLC (`SPRINT-SLC-00` through `SPRINT-SLC-04`).**

Program SLC executes the five deferred post-SSG local cleanup items tracked in [`../programs/ssg/ssg-local-backlog.md`](../programs/ssg/ssg-local-backlog.md): retiring `k8s/`, root ArgoCD YAML, and Grafana metrics collector dumps (`SPRINT-SLC-00`), legacy example games (`SPRINT-SLC-01`), `src/pages/app.astro` and `MCardManager` UI assets while keeping `compat.js` (`SPRINT-SLC-02`), residual Redux stores and dependencies (`SPRINT-SLC-03`), and `routes/auth.js` (`SPRINT-SLC-04`).

## Active artifacts

- **Program plan.** [`./slc-plan.md`](./slc-plan.md)
- **Completed (`DONE`).** [`./SPRINT-SLC-00-k8s-argocd-grafana-subtraction.md`](./SPRINT-SLC-00-k8s-argocd-grafana-subtraction.md) ([evidence](./evidence/SLC-00-infra-subtraction.md)), [`./SPRINT-SLC-01-legacy-example-games-subtraction.md`](./SPRINT-SLC-01-legacy-example-games-subtraction.md) ([evidence](./evidence/SLC-01-games-subtraction.md)), and [`./SPRINT-SLC-02-app-astro-full-retirement.md`](./SPRINT-SLC-02-app-astro-full-retirement.md) ([evidence](./evidence/SLC-02-app-retirement.md))
- **Next sprint (`NEXT`).** [`./SPRINT-SLC-03-redux-store-and-deps-cleanup.md`](./SPRINT-SLC-03-redux-store-and-deps-cleanup.md)
- **Active decision ledger.** [`./DECISIONS.tsv`](./DECISIONS.tsv)

## Graduated archives

- **Program SSG.** [`docs/sprints/programs/ssg/INDEX.md`](../programs/ssg/INDEX.md) (`2026-11-20`, StageShow `1.1.1` layout craft, Bombadil runner dashboard handles, responsive tiers, and Shadow DOM portal showcase)
- **Program BPV.** [`docs/sprints/programs/bpv/INDEX.md`](../programs/bpv/INDEX.md) (`2026-11-18`, with local Docker `bombadil-scheduler` running daily at `02:30` UTC)
- **Program GQC.** [`docs/sprints/programs/gqc/INDEX.md`](../programs/gqc/INDEX.md) (`2026-11-18`)
- **Program ERB.** [`docs/sprints/08-testing/INDEX.md`](../08-testing/INDEX.md) (`2026-10-21`)
- **Program SMO.** [`docs/sprints/01-architecture/INDEX.md`](../01-architecture/INDEX.md) (`2026-10-21`)

Review [`./INDEX.md`](./INDEX.md) for the full `SLC-00`..`SLC-04` dependency sequence and verified gate commands.
