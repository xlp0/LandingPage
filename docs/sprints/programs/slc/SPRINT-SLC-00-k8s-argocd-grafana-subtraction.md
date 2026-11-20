# SPRINT-SLC-00 Legacy Kubernetes, ArgoCD, and Grafana Metrics Subtraction

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SLC-00` |
| Source of Truth | [`./slc-plan.md`](./slc-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SLC-00` |
| Status | `DONE` |
| Depends on | Program SSG Graduated (`v0.0.1`) |
| Unblocks | `SPRINT-SLC-01` |
| Execution unit | `PR-SLC-00` |
| Decision Ref | `SLC-D02` |
| BMAD roles | Architect, Developer, TEA, Tech Writer, Scrum Master |
| Effort | 1 day |

## Outcome

Remove retired Kubernetes manifests (`k8s/`), root ArgoCD application/project manifests (`argocd-*.yaml`), Kubernetes deployment workflow (`.github/workflows/deploy-k8s.yml`), and static Grafana dashboard metrics collector dumps and scripts (`.github/workflows/grafana-metrics-*` and `.github/scripts/*metrics*`) while keeping Docker (`Dockerfile`, `docker-compose.yml`, `docker/bombadil/`) and active CI workflows (`playwright-quality.yml`, `clm-test-all-components.yml`, `daily-commit-summary.yml`) intact and maintaining zero broken Markdown links (`npm run docs:check`).

## Work sequence

1. Delete legacy Kubernetes and ArgoCD files:
   - Remove `k8s/` (`20` files) and root `argocd-application.yaml`, `argocd-project.yaml`, `argocd-repo-secret.yaml`.
   - Remove `.github/workflows/deploy-k8s.yml`.
2. Delete retired Grafana metrics collector workflows, scripts, and JSON/Markdown snapshots:
   - Remove `.github/workflows/grafana-metrics-collector.yml`, `.github/workflows/grafana-metrics-21055165491/`, `.github/workflows/grafana-metrics-21056336713/`, `.github/workflows/README-GRAFANA-METRICS.md`, and `.github/workflows/SETUP-GRAFANA-SECRETS.md`.
   - Remove `.github/scripts/collect_grafana_metrics.py`, `.github/scripts/collect_all_dashboard_metrics.py`, `.github/scripts/convert_metrics_to_markdown.py`, `.github/scripts/upload_metrics_to_minio.py`, and `.github/scripts/README.md`.
   - Preserve non-metrics CI helpers in `.github/scripts/` (`process_commits.py`, `push-test-results.sh`, `convert_to_pdf.py`, `upload_to_minio.py`, `create_calendar_events.py`, `update-all-workflows.py`) and active workflows (`clm-test-all-components.yml`, `playwright-quality.yml`, `daily-commit-summary.yml`).
3. Update documentation referencing deleted deployment/Grafana-collector paths:
   - Update `docs/functionalities/10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md` and `docs/functionalities/README.md` (`DevOps & GitOps` row) to remove dead `k8s/` and `argocd-application.yaml` links and document the active Docker, Docker Compose, local `docker/bombadil/`, and Playwright CI pipelines alongside historical retirement note for `k8s/`.
   - Update `docs/07-deployment/README.md`, `docs/INDEX.md`, and `README.md` tier `07` descriptions so standalone Docker + `docker/bombadil/` is accurately described and `npm run docs:check` passes with zero broken links.
4. Run full static, build, unit, and Playwright smoke verification (`ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, and `data/` untouched), write `docs/sprints/_active/evidence/SLC-00-infra-subtraction.md`, update `INDEX.md`/`README.md`, append `SLC-00` to [`./DECISIONS.tsv`](../../_active/DECISIONS.tsv), and commit.

## Files

- Delete `k8s/`, `argocd-application.yaml`, `argocd-project.yaml`, `argocd-repo-secret.yaml`, `.github/workflows/deploy-k8s.yml`, `.github/workflows/grafana-metrics-collector.yml`, `.github/workflows/grafana-metrics-21055165491/`, `.github/workflows/grafana-metrics-21056336713/`, `.github/workflows/README-GRAFANA-METRICS.md`, `.github/workflows/SETUP-GRAFANA-SECRETS.md`, `.github/scripts/collect_grafana_metrics.py`, `.github/scripts/collect_all_dashboard_metrics.py`, `.github/scripts/convert_metrics_to_markdown.py`, `.github/scripts/upload_metrics_to_minio.py`, `.github/scripts/README.md`
- Edit `docs/functionalities/10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md`, `docs/functionalities/README.md`, `docs/07-deployment/README.md`, `docs/INDEX.md`, `README.md`
- Create `docs/sprints/_active/evidence/SLC-00-infra-subtraction.md` and update `docs/sprints/_active/DECISIONS.tsv`, `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/README.md`

## Acceptance criteria

- Zero legacy Kubernetes, ArgoCD YAML, or Grafana metrics collector snapshot files remain in `k8s/`, repo root, or `.github/workflows/grafana-metrics-*`.
- `Dockerfile`, `docker-compose.yml`, `docker-compose.stun.yml`, `docker/bombadil/`, and active CI test workflows remain intact.
- Protected files (`ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, `data/`) show zero changes.
- All static, docs, parity, net, StageShow CSS, build, unit (`300/300`), and Playwright smoke (`30/30`) checks pass.

## Non-goals

- Removing local runtime Grafana Faro/Loki documentation or `js/telemetry/faro-collector.js`.
- Modifying `.github/workflows/clm-test-all-components.yml`, `.github/workflows/playwright-quality.yml`, or `docker/bombadil/`.

## Definition of done

- [x] **DoD-SLC-00-01.** Legacy `k8s/`, root `argocd-*.yaml`, `.github/workflows/deploy-k8s.yml`, and Grafana metrics collector dumps/scripts (`61` files) are deleted and active CI/Docker files are preserved. Verified by `test ! -e k8s && test ! -e argocd-application.yaml && test ! -e .github/workflows/deploy-k8s.yml && test ! -e .github/workflows/grafana-metrics-collector.yml && test -s Dockerfile && test -s docker/bombadil/compose.yml`.
- [x] **DoD-SLC-00-02.** Living documentation links and tier summaries are updated with zero broken Markdown links, zero protected-file edits, and full build/unit/smoke pass (`300/300` unit, `30/30` smoke). Verified by `npm run docs:check && node scripts/check-package-source-parity.mjs && npm run check:net && npm run check:explorable-gui && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run stageshow:check-css && npm run build && npm run test:unit` plus `TEST_PORT=3011 npm run test:smoke`.
- [x] **DoD-SLC-00-03.** Closure evidence is recorded in [`./evidence/SLC-00-infra-subtraction.md`](./evidence/SLC-00-infra-subtraction.md) and [`./DECISIONS.tsv`](../../_active/DECISIONS.tsv) with `npm run docs:check` passing.
