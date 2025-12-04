# ArgoCD Quick Start - THK Mesh Landing Page

## 🚀 Copy-Paste YAML for ArgoCD UI

### Method 1: Simple YAML (Recommended for UI)

Copy this entire block and paste into ArgoCD UI:

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

### Method 2: Full YAML with All Options

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: thkmesh-landingpage
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/xlp0/LandingPage.git
    targetRevision: HEAD
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
      - Validate=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## 📋 UI Form Values

If using the ArgoCD UI form instead of YAML:

| Field | Value |
|-------|-------|
| **Application Name** | `thkmesh-landingpage` |
| **Project** | `default` |
| **Sync Policy** | `Automatic` ✅ |
| **Auto-Create Namespace** | ✅ |
| **Repository URL** | `https://github.com/xlp0/LandingPage.git` |
| **Revision** | `HEAD` |
| **Path** | `k8s` |
| **Cluster URL** | `https://kubernetes.default.svc` |
| **Namespace** | `default` |
| **Prune Resources** | ✅ |
| **Self Heal** | ✅ |

## 🔗 Pre-filled ArgoCD URL

Click this link to open ArgoCD with pre-filled values:

```
https://argocd.pkc.pub/applications?new=%7B%22apiVersion%22%3A%22argoproj.io%2Fv1alpha1%22%2C%22kind%22%3A%22Application%22%2C%22metadata%22%3A%7B%22name%22%3A%22thkmesh-landingpage%22%7D%2C%22spec%22%3A%7B%22destination%22%3A%7B%22namespace%22%3A%22default%22%2C%22server%22%3A%22https%3A%2F%2Fkubernetes.default.svc%22%7D%2C%22source%22%3A%7B%22path%22%3A%22k8s%22%2C%22repoURL%22%3A%22https%3A%2F%2Fgithub.com%2Fxlp0%2FLandingPage.git%22%2C%22targetRevision%22%3A%22HEAD%22%7D%2C%22project%22%3A%22default%22%2C%22syncPolicy%22%3A%7B%22automated%22%3A%7B%22prune%22%3Atrue%2C%22selfHeal%22%3Atrue%7D%7D%7D%7D
```

## ⚡ Command Line Deployment

### Using kubectl:
```bash
kubectl apply -f k8s/argocd-simple.yaml
```

### Using ArgoCD CLI:
```bash
argocd app create thkmesh-landingpage \
  --repo https://github.com/xlp0/LandingPage.git \
  --path k8s \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --auto-prune \
  --self-heal
```

## ✅ Verify Deployment

```bash
# Check application status
kubectl get application -n argocd thkmesh-landingpage

# Watch sync progress
kubectl get pods -l app=landingpage-dev -w

# Check service
kubectl get svc landingpage-dev

# Check ingress
kubectl get ingress landingpage-dev-ingress
```

## 🌐 Access Application

After deployment, access at:
- **URL:** https://dev.pkc.pub
- **Health Check:** https://dev.pkc.pub/health

## 📊 Monitor in ArgoCD

1. Open: https://argocd.pkc.pub/applications
2. Click: `thkmesh-landingpage`
3. View: Resource tree, sync status, logs

## 🔄 Sync Manually

```bash
# Via CLI
argocd app sync thkmesh-landingpage

# Via kubectl
kubectl patch application thkmesh-landingpage -n argocd \
  --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{}}}'
```

## 🗑️ Delete Application

```bash
# Via CLI
argocd app delete thkmesh-landingpage --yes

# Via kubectl
kubectl delete application -n argocd thkmesh-landingpage
```

## 📚 Full Documentation

See `ARGOCD_DEPLOYMENT_GUIDE.md` for complete documentation.
