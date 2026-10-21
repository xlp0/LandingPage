# 🚢 Deployment, GitOps & Infrastructure

This directory documents the deployment strategies, ArgoCD GitOps pipelines, containerization, and caching architecture for `LandingPage`.

---

## 🎯 Infrastructure Overview

`LandingPage` is designed for hybrid deployment:
1. **Containerized Node.js Runtime**:
   - Runs `ws-server.js` (Express + WebSocket) serving static assets, the Responsive UI Lab, MCard SQLite API, and WebSocket signaling.
2. **ArgoCD GitOps Automation**:
   - Declarative Kubernetes deployment pipeline syncing repository changes to staging (`https://dev.pkc.pub`) and production (`https://henry.pkc.pub`).
3. **Cloudflare R2 & Self-Hosted CDN**:
   - High-throughput blob and media asset storage backed by Cloudflare R2 with localized edge caching rules.
4. **Pre-Deployment CI Gates (`check_landingpage_retirement.py`)**:
   - Monorepo CI verifies kernel consensus (`clm-kernel@0.0.9`), checks zero duplicate hash providers, ensures no resurrected retired islands, and runs unit and conformance batteries before deployment approval.

---

## 📚 Documents in This Section

### ArgoCD GitOps
- **[ARGOCD_DEPLOYMENT.md](ARGOCD_DEPLOYMENT.md)** — Complete ArgoCD Kubernetes pipeline setup and cluster configuration.
- **[ARGOCD_QUICK_GUIDE.md](ARGOCD_QUICK_GUIDE.md)** — Quick reference for manual sync, rollout restarts, and health checks.
- **[ARGOCD_PRESENTATION.md](ARGOCD_PRESENTATION.md)** — Architectural presentation on GitOps principles in the PKC ecosystem.

### Infrastructure & Storage
- **[BACKEND_IMPLEMENTATION.md](BACKEND_IMPLEMENTATION.md)** — Node.js Express/WebSocket backend server configuration and environment setup.
- **[R2_SETUP.md](R2_SETUP.md)** — Cloudflare R2 bucket configuration and S3-compatible credentials.
- **[SELF-HOSTED-CDN.md](SELF-HOSTED-CDN.md)** — Architecture for self-hosted caching proxies and fallback CDNs.
- **[SSH-KEY-SETUP.md](SSH-KEY-SETUP.md)** — Deploy key generation and repository authentication.

### Performance & Caching
- **[caching-strategy.md](caching-strategy.md)** — HTTP caching headers, Service Worker asset caching, and dynamic API cache invalidation.

---

## 🚀 Pre-Deployment Verification Checklist

Before deploying changes to staging or production, run the full verification gate:

```bash
# 1. Run unit test suite
npm run test:unit

# 2. Run multi-device responsive sweep
npm run test:responsive

# 3. Run device conformance & mint responsive certificate
npm run test:conformance

# 4. (From monorepo root) Validate estate boundary and retirement rules
python3 scripts/ci/check_landingpage_retirement.py
python3 scripts/ci/check_ulr_census.py
```

---

## 🧭 Related Functional Tiers

- [**00-getting-started/**](../00-getting-started/README.md) — Local development server startup.
- [**08-testing/**](../08-testing/README.md) — Automated testing and conformance suites.
- [**09-performance/**](../09-performance/README.md) — Web Vitals and Grafana observability.
