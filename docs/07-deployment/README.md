# 🚢 Deployment

CI/CD, deployment strategies, and infrastructure setup.

## Documents in This Section

### ArgoCD Deployment
- **ARGOCD_DEPLOYMENT.md** - Complete ArgoCD setup
- **ARGOCD_QUICK_GUIDE.md** - Quick deployment guide
- **ARGOCD_PRESENTATION.md** - ArgoCD presentation

### Infrastructure
- **BACKEND_IMPLEMENTATION.md** - Backend server setup
- **R2_SETUP.md** - Cloudflare R2 storage setup
- **SELF-HOSTED-CDN.md** - Self-hosted CDN architecture

### Performance
- **caching-strategy.md** - Caching optimization

## Deployment Environments

### Development
- **URL:** http://localhost:8765
- **Docker:** Local container
- **Storage:** Local IndexedDB

### Staging
- **URL:** https://dev.pkc.pub
- **ArgoCD:** Auto-deployment
- **Storage:** R2 + IndexedDB

### Production
- **URL:** https://henry.pkc.pub
- **ArgoCD:** Manual approval
- **Storage:** R2 + IndexedDB

## Quick Deployment

### Local Development
```bash
docker-compose up --build -d
```

### ArgoCD Deployment
1. Follow [ARGOCD_QUICK_GUIDE.md](ARGOCD_QUICK_GUIDE.md)
2. Configure R2 with [R2_SETUP.md](R2_SETUP.md)
3. Setup CDN with [SELF-HOSTED-CDN.md](SELF-HOSTED-CDN.md)

## Related Sections

- [00-getting-started/](../00-getting-started/) - Local setup
- [09-performance/](../09-performance/) - Performance monitoring
- [08-testing/](../08-testing/) - Pre-deployment testing
