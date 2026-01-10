# ArgoCD Setup Summary - THK Mesh Landing Page

## ✅ What Was Created

I've created a complete ArgoCD deployment configuration for your THK Mesh Landing Page application. Here's what's available:

### 📁 New Files Created

1. **k8s/argocd-simple.yaml** - Simple copy-paste YAML for ArgoCD UI
2. **k8s/argocd-application.yaml** - Full ArgoCD application with all options
3. **k8s/argocd-application-dev.yaml** - Development environment config
4. **k8s/argocd-application-prod.yaml** - Production environment config
5. **k8s/service.yaml** - Kubernetes Service definition
6. **k8s/ingress.yaml** - Ingress configuration with WebSocket support
7. **k8s/kustomization.yaml** - Kustomize configuration for resource management
8. **k8s/ARGOCD_QUICK_START.md** - Quick reference guide
9. **k8s/ARGOCD_DEPLOYMENT_GUIDE.md** - Complete deployment documentation
10. **k8s/README.md** - Updated with ArgoCD information

---

## 🚀 Quick Start - Copy This YAML

### For ArgoCD UI (https://argocd.pkc.pub)

**Just copy and paste this:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: thkmesh-landingpage
spec:
  destination:
    namespace: default
    server: https://kubernetes.default.svc
  source:
    path: k8s
    repoURL: https://github.com/xlp0/LandingPage.git
    targetRevision: HEAD
  project: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Or Use This Pre-filled URL

```
https://argocd.pkc.pub/applications?new=%7B%22apiVersion%22%3A%22argoproj.io%2Fv1alpha1%22%2C%22kind%22%3A%22Application%22%2C%22metadata%22%3A%7B%22name%22%3A%22thkmesh-landingpage%22%7D%2C%22spec%22%3A%7B%22destination%22%3A%7B%22namespace%22%3A%22default%22%2C%22server%22%3A%22https%3A%2F%2Fkubernetes.default.svc%22%7D%2C%22source%22%3A%7B%22path%22%3A%22k8s%22%2C%22repoURL%22%3A%22https%3A%2F%2Fgithub.com%2Fxlp0%2FLandingPage.git%22%2C%22targetRevision%22%3A%22HEAD%22%7D%2C%22project%22%3A%22default%22%2C%22syncPolicy%22%3A%7B%22automated%22%3A%7B%22prune%22%3Atrue%2C%22selfHeal%22%3Atrue%7D%7D%7D%7D
```

---

## 📋 What This Deploys

When you create the ArgoCD application, it will automatically deploy:

1. **Deployment** - Your landing page application
   - Image: `henry768/landingpage:latest_landingpage`
   - Replicas: 1
   - Health checks configured
   - Resource limits set

2. **ConfigMap** - Environment configuration
   - WebSocket URL: `wss://dev.pkc.pub/ws/`
   - Zitadel OAuth2 settings
   - STUN servers for WebRTC

3. **Service** - Internal networking
   - Type: ClusterIP
   - Ports: 80, 443 → 3000

4. **Ingress** - External access
   - Host: `dev.pkc.pub`
   - WebSocket support enabled
   - CORS enabled

---

## 🎯 Key Features

### ✅ Automated Sync
- Automatically deploys when you push to GitHub
- Self-healing: fixes drift from desired state
- Auto-prune: removes deleted resources

### ✅ GitOps Workflow
- Git is the single source of truth
- All changes tracked in version control
- Easy rollback to any previous version

### ✅ Multiple Environments
- **Dev**: `argocd-application-dev.yaml` (auto-sync enabled)
- **Prod**: `argocd-application-prod.yaml` (manual sync for control)

### ✅ Health Monitoring
- Built-in health checks
- Visual resource tree in ArgoCD UI
- Real-time sync status

---

## 📖 Documentation Files

### Quick Reference
- **ARGOCD_QUICK_START.md** - Copy-paste commands and YAML
- **k8s/README.md** - Overview and quick start

### Complete Guides
- **ARGOCD_DEPLOYMENT_GUIDE.md** - Full deployment documentation
  - Deployment methods (UI, CLI, kubectl)
  - Monitoring and troubleshooting
  - Rollback procedures
  - Best practices

---

## 🔧 Next Steps

### 1. Deploy to ArgoCD

**Option A: Via UI**
1. Go to https://argocd.pkc.pub/applications
2. Click "New App"
3. Paste the YAML above
4. Click "Create"

**Option B: Via kubectl**
```bash
kubectl apply -f k8s/argocd-simple.yaml
```

**Option C: Via ArgoCD CLI**
```bash
argocd app create -f k8s/argocd-application.yaml
```

### 2. Monitor Deployment

```bash
# Check application status
kubectl get application -n argocd thkmesh-landingpage

# Watch pods
kubectl get pods -l app=landingpage-dev -w

# Check logs
kubectl logs -l app=landingpage-dev -f
```

### 3. Verify Application

- **URL:** https://dev.pkc.pub
- **Health Check:** https://dev.pkc.pub/health
- **ArgoCD UI:** https://argocd.pkc.pub/applications/thkmesh-landingpage

---

## 🔄 Making Changes

### Update Configuration

1. Edit `k8s/configmap-dev.yaml` in your repository
2. Commit and push to GitHub
3. ArgoCD automatically syncs the changes
4. Pods restart with new configuration

### Update Application Code

1. Build and push new Docker image
2. Update image tag in `k8s/deployment-dev-with-configmap.yaml`
3. Commit and push to GitHub
4. ArgoCD automatically deploys new version

### Manual Sync

```bash
# Force sync
argocd app sync thkmesh-landingpage

# Or via kubectl
kubectl patch application thkmesh-landingpage -n argocd \
  --type merge -p '{"operation":{"sync":{}}}'
```

---

## 🛠️ Troubleshooting

### Application Not Syncing

```bash
# Check application status
argocd app get thkmesh-landingpage

# View sync errors
kubectl describe application -n argocd thkmesh-landingpage

# Force sync
argocd app sync thkmesh-landingpage --force
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -l app=landingpage-dev

# View pod logs
kubectl logs -l app=landingpage-dev

# Describe pod for events
kubectl describe pod -l app=landingpage-dev
```

### Configuration Not Applied

```bash
# Check ConfigMap
kubectl get configmap landingpage-dev-config -o yaml

# Restart deployment
kubectl rollout restart deployment landingpage-dev
```

---

## 📚 Additional Resources

### Files to Reference

1. **k8s/argocd-simple.yaml** - Simplest configuration
2. **k8s/ARGOCD_QUICK_START.md** - Quick commands
3. **k8s/ARGOCD_DEPLOYMENT_GUIDE.md** - Complete guide
4. **k8s/README.md** - Overview

### External Documentation

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://www.gitops.tech/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

## ✨ Summary

You now have:

✅ **Complete ArgoCD configuration** for automated deployments  
✅ **GitOps workflow** with Git as source of truth  
✅ **Multiple environments** (dev, prod) with different sync policies  
✅ **Automated sync** with self-healing and auto-prune  
✅ **Comprehensive documentation** for all deployment scenarios  
✅ **Copy-paste ready YAML** for immediate deployment  

**Ready to deploy!** Just copy the YAML above into ArgoCD UI or run:

```bash
kubectl apply -f k8s/argocd-simple.yaml
```

---

## 🎉 What's Next?

1. **Deploy to ArgoCD** using the YAML above
2. **Monitor in ArgoCD UI** at https://argocd.pkc.pub
3. **Verify application** at https://dev.pkc.pub
4. **Make changes** via Git and watch auto-deployment
5. **Scale to production** using `argocd-application-prod.yaml`

Happy deploying! 🚀
