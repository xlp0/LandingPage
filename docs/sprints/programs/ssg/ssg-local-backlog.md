# Program SSG Local Cleanup Backlog

- **Status**: All 5 deferred local items (`1`..`5` below) were executed and graduated in `Program SLC` (`SPRINT-SLC-00` through `SPRINT-SLC-04`; archive at [`docs/sprints/programs/slc/INDEX.md`](../slc/INDEX.md)).
- **Scope**: `LandingPage`-only post-SSG cleanup items deferred out of `EPIC-FRO` per `FRO-D09` so active `Program SSG` server SHA locks (`ws-server.js` at `15,799` bytes and `routes/auth.js`) remain undisturbed during cross-estate reorganization.
- **Authority**: Recorded under `FRO-05` (`INV-FRO-06`).

## Deferred Local Items

1. **`k8s/`, `argocd-*.yaml`, and `grafana-metrics-*` cleanup**: Archive or remove legacy Kubernetes, ArgoCD, and Grafana manifests that are no longer deployed by `LandingPage` once standalone hosting profiles are finalized.
2. **Example games subtraction**: Retire legacy demo/game bundles not referenced by the Astro responsive workbench or `Program SSG` suites.
3. **`src/pages/app.astro` transition**: Complete migration away from legacy `app.astro` Mission Control scaffolding after `Program SSG` graduation and remove remaining Penpot navigation test references.
4. **Redux store cleanup**: Remove residual client Redux state slices superseded by Astro island local state and `clm-registry.yaml` projections.
5. **Post-SSG `routes/auth.js` retirement**: Keep `routes/auth.js` and SHA-locked `ws-server.js` untouched while `Program SSG` verification runs; retire `routes/auth.js` only after `Program SSG` graduates and `check-package-source-parity.mjs` is updated.
