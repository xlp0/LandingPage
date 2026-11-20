# SPRINT-SLC-00 Evidence: Legacy Kubernetes, ArgoCD, and Grafana Metrics Subtraction

## Summary

- **Removed Paths (`61` files across `k8s/`, root `argocd-*.yaml`, and `.github/`)**:
  - Removed all `19` files under `k8s/` and `3` root manifests (`argocd-application.yaml`, `argocd-project.yaml`, `argocd-repo-secret.yaml`).
  - Removed `.github/workflows/deploy-k8s.yml`, `.github/workflows/grafana-metrics-collector.yml`, `README-GRAFANA-METRICS.md`, `SETUP-GRAFANA-SECRETS.md`, both `grafana-metrics-*` run snapshot directories (`30` files total), and `5` `.github/scripts/` Grafana metrics helpers (`README.md`, `collect_grafana_metrics.py`, `collect_all_dashboard_metrics.py`, `convert_metrics_to_markdown.py`, `upload_metrics_to_minio.py`).
- **Preserved Infrastructure**: Kept `Dockerfile`, `docker-compose.yml`, `docker-compose.stun.yml`, `docker/bombadil/`, `.github/workflows/clm-test-all-components.yml`, `.github/workflows/playwright-quality.yml`, `.github/workflows/daily-commit-summary.yml`, non-metrics helpers in `.github/scripts/`, and protected files (`ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, `data/`).
- **Updated Documentation**: Rewrote [docs/functionalities/10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md](../../../../docs/functionalities/10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md) and updated [docs/functionalities/README.md](../../../../docs/functionalities/README.md), [docs/07-deployment/README.md](../../../../docs/07-deployment/README.md), [docs/09-performance/observability/GRAFANA-DASHBOARD-OBSERVABILITY.md](../../../../docs/09-performance/observability/GRAFANA-DASHBOARD-OBSERVABILITY.md), [docs/09-performance/observability/README.md](../../../../docs/09-performance/observability/README.md), [docs/INDEX.md](../../../../docs/INDEX.md), [docs/README.md](../../../../docs/README.md), and [README.md](../../../../README.md).

## Verification Receipts

| Check | Result |
| --- | --- |
| Removed paths & kept files guard | `test ! -e k8s && test ! -e argocd-application.yaml && test ! -e .github/workflows/deploy-k8s.yml && test ! -e .github/workflows/grafana-metrics-collector.yml && test -s Dockerfile && test -s docker/bombadil/compose.yml` exit `0` |
| `npm run docs:check` | `[docs:check] PASS (files=281, allowlisted=13, netIds=138)` |
| `node scripts/check-package-source-parity.mjs` | `[parity-ok] pairs=4 uiCalls=22` |
| `npm run check:net` | `PASS` (`workbench-net`: `40` places, `90` transitions, `sessionPInvariant=true`; `spa-test-target-net`: `3` places, `4` transitions) |
| `npm run check:explorable-gui` | `[explorable-gui] PASS` |
| `npm run check:bombadil-nets` | `[bombadil:nets] PASS` |
| `npm run check:playwright-discovery` | `smoke 30/11`, `components 18/14`, `features 651/32` (`57` unique files) |
| `npm run stageshow:check-css` | `0` clashes (`85` CSS files, `4` explicit bundles) |
| `npm run build` | `PASS` (`build:astro` `pages=6` + `build:packages`) |
| `npm run test:unit` | `300 passed, 0 failed, 0 skipped` across `20` suites |
| `TEST_PORT=3011 npm run test:smoke` | `30 passed` (`24.5s`) |
| Protected files check | Clean (`ws-server.js`, `scripts/package-source-parity.json`, `src/pages/fiber-conformance.astro`, `data/`) |
