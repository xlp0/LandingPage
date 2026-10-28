# DevOps, ArgoCD GitOps & Cloud Infrastructure

| Field | Value |
| --- | --- |
| Audience | Engineers, architects, and QA reviewers consulting capability-level reference architecture |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Classification | Maintained Capability Reference (`DECISIONS.tsv` row 63), distinct from operational quickstarts |
| Operational Guide | [../07-deployment/README.md](../07-deployment/README.md) |
> **Location**: [`LandingPage/docs/functionalities/10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md`](./10-DEV-OPS-ARGO-CD-AND-INFRASTRUCTURE.md)  
> **Source Directories**: [`k8s/`](../../k8s/README.md), [`.github/workflows/`](../../.github/workflows), [`daily-reports/`](../../daily-reports)  
> **Deployment Files**: [`Dockerfile`](../../Dockerfile), [`argocd-application.yaml`](../../argocd-application.yaml), [`docker-compose.yml`](../../docker-compose.yml)  
> **Status**: Comprehensive Functional Specification

---

## 1. Overview & Cloud-Native Topology

The LandingPage infrastructure is engineered for continuous delivery and high availability across Kubernetes clusters using declarative **ArgoCD GitOps** patterns. Changes committed to `main` are automatically reconciled, deployed, tested, and monitored across development and production environments.

```mermaid
graph TD
    GitRepo[Git Repository: GitHub] -->|Webhook / Push| ArgoCD[ArgoCD GitOps Controller]
    
    subgraph "Kubernetes Cluster (Dev / Prod)"
        ArgoCD -->|Reconcile State| Kustomize[Kustomize Manifests: k8s/]
        Kustomize --> Deployment[Deployment: 3 Replicas]
        Kustomize --> Service[Kubernetes Service: ClusterIP]
        Kustomize --> Ingress[Traefik / NGINX Ingress Controller]
        Ingress --> SSL[TLS Certificate: Let's Encrypt]
    end

    subgraph "External Storage & NAT Services"
        Deployment <-->|Asset Sync / Backups| R2[Cloudflare R2 Storage S3-API]
        Deployment <-->|ICE Traversal| STUN[Coturn STUN/TURN Service]
        Deployment <-->|OIDC Auth| Zitadel[Zitadel Identity Provider]
    end

    subgraph "Automated Observability"
        Deployment --> Faro[Grafana Faro Telemetry]
        Cron[GitHub Actions Scheduled Cron] --> Reports[Daily LaTeX/PDF Reports Generator]
        Reports --> R2
    end
```

---

## 2. Containerization: [`Dockerfile`](../../Dockerfile)

The application container is built using a secure multi-stage Node.js Alpine base:

- **Security Hardening**:
  - Non-root execution (`USER node`).
  - Read-only container root filesystem where applicable.
  - Stripped build dependencies in the runtime image.
- **Exposed Ports**:
  - `3000`: Unified HTTP web application, Astro SSR middleware, REST APIs (`/api/mcard`, `/api/test-runs`, `/api/auth`, `/api/clm`), and WebSocket `/ws/` signaling (`docker-compose.yml` maps `8765:3000`).
  - `3001`: Isolated Playwright `TEST_PORT` used during automated CI and local test runs (`4322` serves `astro dev` during `npm run dev`).
- **Health Checks**: Implements standard liveness probe hitting `/health` returning `{ status: "ok", timestamp }`.

---

## 3. Kubernetes & ArgoCD GitOps Engine ([`k8s/`](../../k8s/README.md))

### 3.1 High-Availability Deployment ([`deployment-dev-with-configmap.yaml`](../../k8s/deployment-dev-with-configmap.yaml))
- **Replica Strategy**: 3 replicas with rolling updates (`maxUnavailable: 0`, `maxSurge: 1`).
- **Custom DNS Policy**: Configured with `dnsPolicy: "None"` and explicit upstream nameservers (`8.8.8.8`, `8.8.4.4`) to ensure reliable external resolution of the Zitadel identity endpoint (`vpn.pkc.pub`).
- **Resource Constraints**: Explicit CPU and memory limits preventing noisy-neighbor degradation.

### 3.2 Ingress Routing & SSL Termination
- [`ingress-test.pkc.pub.yaml`](../../k8s/ingress-test.pkc.pub.yaml): Maps public domain traffic to the internal ClusterIP service on port 3000.
- Automatic HTTPS certificate provisioning using Cert-Manager and ACME DNS-01 challenges.

### 3.3 ArgoCD Application Specification ([`argocd-application.yaml`](../../argocd-application.yaml))
- **Automated Sync Policy**: Enables automated prune and self-heal (`automated: { prune: true, selfHeal: true }`).
- **Sync Options**: Creates namespace dynamically if missing; validates schema syntax before applying changes.

---

## 4. Cloudflare R2 Object Storage & Asset CDN

- **S3 API Compatibility**: R2 provides zero-egress fee cloud storage for heavy assets (videos, 3D models, PDF documentation, MCard SQLite backups).
- **Credentials Secret** ([`k8s/secret-r2-credentials.yaml`](../../k8s/secret-r2-credentials.yaml)): Mounts access keys, endpoint URLs, and bucket names securely as environment variables.
- **Cache Strategy**: Assets served from R2 leverage Cloudflare edge cache rules with immutable content-hash headers (`Cache-Control: public, max-age=31536000, immutable`).

---

## 5. Automated CI/CD & Daily Reporting Engine

Located in [`.github/workflows/`](../../.github/workflows) and [`daily-reports/`](../../daily-reports):

1. **Automated Component Battery** ([`clm-test-all-components.yml`](../../.github/workflows/clm-test-all-components.yml)): Runs Playwright browser integration tests on every pull request, certifying all 12 viewports and WebRTC data channels.
2. **Daily Commit Summaries** ([`daily-commit-summary.yml`](../../.github/workflows/daily-commit-summary.yml)): Aggregates commits, issues, and PRs across the day, generating human-readable changelog digests.
3. **Zitadel Monitoring & PDF Generator** ([`generate_zitadel_report.py`](../../daily-reports/generate_zitadel_report.py), [`convert_md_to_latex_to_pdf.py`](../../daily-reports/convert_md_to_latex_to_pdf.py)):
   - Queries Zitadel management APIs for active user sessions and authentication failures.
   - Compiles structured Markdown into publication-grade LaTeX and PDF reports.
   - Uploads compiled PDFs to MinIO/R2 and sends automated distribution notifications.
