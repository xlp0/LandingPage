# ArgoCD Test Deployment Setup - Complete Guide

## 🎯 What Was Changed

You now have a complete setup for deploying to `test.pkc.pub` with ArgoCD, including:

1. ✅ **New Ingress**: `k8s/ingress-test.pkc.pub.yaml` - Routes traffic to `test.pkc.pub`
2. ✅ **Updated Kustomization**: Points to the new ingress
3. ✅ **ArgoCD Application**: `k8s/argocd-application-test.yaml` - Manages the deployment
4. ✅ **GitHub Actions Job**: `deploy-to-test` - Runs after all tests (regardless of pass/fail)
5. ✅ **Documentation**: Complete setup and troubleshooting guide

---

## 🚀 Quick Start

### Step 1: Deploy ArgoCD Application

Choose one method:

#### Method A: ArgoCD UI (Easiest)

1. Go to https://argocd.pkc.pub/applications
2. Click "New App"
3. Copy this YAML:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: landingpage-test
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/xlp0/LandingPage.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: landingpage-test
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

4. Click "Create"

#### Method B: kubectl

```bash
kubectl apply -f k8s/argocd-application-test.yaml
```

#### Method C: ArgoCD CLI

```bash
argocd app create -f k8s/argocd-application-test.yaml
```

### Step 2: Verify Deployment

```bash
# Check status
kubectl get application -n argocd landingpage-test

# Watch pods
kubectl get pods -n landingpage-test -w
```

### Step 3: Access Application

- **URL**: https://test.pkc.pub
- **Health**: https://test.pkc.pub/health
- **ArgoCD UI**: https://argocd.pkc.pub/applications/landingpage-test

---

## 🔧 How It Works

### GitHub Actions Workflow

```
┌─────────────────────────────────────────┐
│ Push to main branch                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ detect-changes job                      │
│ (Identify changed components)           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ test-components job (parallel)          │
│ (Run tests for changed components)      │
│                                         │
│ ✅ Tests can PASS or FAIL              │
│ ✅ Deployment continues regardless     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ deploy-to-test job                      │
│ (Trigger ArgoCD sync)                   │
│                                         │
│ ✅ Runs ALWAYS (even if tests fail)    │
│ ✅ Only on main branch                 │
│ ✅ Provides deployment summary          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ ArgoCD Sync (within 3 minutes)          │
│                                         │
│ ✅ Creates namespace                   │
│ ✅ Deploys pods                        │
│ ✅ Configures ingress                  │
│ ✅ Updates service                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ Application Live at test.pkc.pub        │
└─────────────────────────────────────────┘
```

### ArgoCD Sync Policy

```yaml
syncPolicy:
  automated:
    prune: true        # Remove deleted resources
    selfHeal: true     # Fix configuration drift
    allowEmpty: false  # Don't allow empty syncs
  syncOptions:
    - CreateNamespace=true  # Auto-create namespace
    - Validate=true         # Validate manifests
  retry:
    limit: 5           # Retry up to 5 times
    backoff:
      duration: 5s     # Start with 5s backoff
      factor: 2        # Double each retry
      maxDuration: 3m  # Max 3 minutes
```

---

## 🔍 Fixing ArgoCD Issues

### Issue 1: Application Shows "OutOfSync"

**Cause**: Cluster state doesn't match Git state

**Solution**:
```bash
# Manual sync
argocd app sync landingpage-test

# Or via kubectl
kubectl patch application landingpage-test -n argocd \
  --type merge -p '{"operation":{"sync":{}}}'
```

### Issue 2: Pods Not Starting

**Check**:
```bash
# View pod status
kubectl get pods -n landingpage-test

# View logs
kubectl logs -n landingpage-test -l app=landingpage

# Describe pod
kubectl describe pod -n landingpage-test -l app=landingpage
```

**Common Causes**:
- ❌ Image not found → Check Docker Hub image tag
- ❌ ConfigMap missing → Check `kubectl get configmap -n landingpage-test`
- ❌ Resource limits → Check node capacity with `kubectl top nodes`

### Issue 3: Ingress Not Working

**Check**:
```bash
# View ingress
kubectl get ingress -n landingpage-test

# Describe ingress
kubectl describe ingress -n landingpage-test

# Check service
kubectl get svc -n landingpage-test
```

**Common Causes**:
- ❌ Service name mismatch → Should be `landingpage-dev`
- ❌ Port mismatch → Should be `80` → `3000`
- ❌ DNS not resolving → Check with `nslookup test.pkc.pub`

### Issue 4: Configuration Not Applied

**Solution**:
```bash
# Check ConfigMap
kubectl get configmap -n landingpage-test landingpage-dev-config -o yaml

# Restart pods to pick up new config
kubectl rollout restart deployment -n landingpage-test landingpage-dev
```

### Issue 5: ArgoCD Application Error

**Check**:
```bash
# View application details
argocd app get landingpage-test

# View sync errors
kubectl describe application -n argocd landingpage-test

# View ArgoCD logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
```

---

## 📊 Monitoring

### Real-time Monitoring

```bash
# Watch application status
kubectl get application -n argocd landingpage-test -w

# Watch pods
kubectl get pods -n landingpage-test -w

# Watch deployment rollout
kubectl rollout status deployment -n landingpage-test landingpage-dev
```

### View Logs

```bash
# Application logs
kubectl logs -n landingpage-test -l app=landingpage -f

# Previous logs (if pod crashed)
kubectl logs -n landingpage-test -l app=landingpage --previous

# All logs
kubectl logs -n landingpage-test -l app=landingpage --all-containers=true
```

### ArgoCD UI

1. Open https://argocd.pkc.pub/applications
2. Click `landingpage-test`
3. View:
   - **Sync Status**: Current state vs desired state
   - **Resource Tree**: All deployed resources
   - **Deployment History**: Previous syncs
   - **Logs**: Real-time sync logs

---

## 📝 Configuration Files

### New Files Created

| File | Purpose |
|------|---------|
| `k8s/ingress-test.pkc.pub.yaml` | Routes traffic to test.pkc.pub |
| `k8s/argocd-application-test.yaml` | ArgoCD application manifest |
| `k8s/ARGOCD_TEST_DEPLOYMENT_SETUP.md` | Detailed setup guide |
| `.github/workflows/clm-test-all-components.yml` | Updated with deploy-to-test job |

### Modified Files

| File | Change |
|------|--------|
| `k8s/kustomization.yaml` | Now uses ingress-test.pkc.pub.yaml |
| `.github/workflows/clm-test-all-components.yml` | Added deploy-to-test job |

---

## 🔄 Deployment Flow

### When You Push to main

1. **GitHub Actions triggers**
   - Detects changed components
   - Runs tests in parallel
   - Tests can pass or fail ✅

2. **deploy-to-test job runs**
   - Runs regardless of test results
   - Only on main branch
   - Logs deployment info

3. **ArgoCD syncs (within 3 minutes)**
   - Compares Git vs Cluster
   - Creates namespace if needed
   - Deploys/updates resources
   - Self-heals any drift

4. **Application updates**
   - Pods restart with new code
   - Configuration applied
   - Ingress routes traffic
   - Available at test.pkc.pub

---

## ✅ Verification Checklist

- [ ] ArgoCD application created (`landingpage-test`)
- [ ] Namespace created (`landingpage-test`)
- [ ] Deployment running (3 replicas)
- [ ] Service created (`landingpage-dev`)
- [ ] Ingress created (routes to `test.pkc.pub`)
- [ ] Application accessible at https://test.pkc.pub
- [ ] Health check passes at https://test.pkc.pub/health
- [ ] ArgoCD shows "Synced" status
- [ ] GitHub Actions deploy-to-test job completes

---

## 🚀 Next Steps

1. **Deploy the application**
   ```bash
   kubectl apply -f k8s/argocd-application-test.yaml
   ```

2. **Verify deployment**
   ```bash
   kubectl get application -n argocd landingpage-test
   kubectl get pods -n landingpage-test
   ```

3. **Access application**
   - https://test.pkc.pub

4. **Monitor in ArgoCD**
   - https://argocd.pkc.pub/applications/landingpage-test

5. **Make changes and push**
   - GitHub Actions will automatically deploy

---

## 📚 Documentation

- **Setup Guide**: `k8s/ARGOCD_TEST_DEPLOYMENT_SETUP.md`
- **Workflow File**: `.github/workflows/clm-test-all-components.yml`
- **Application Manifest**: `k8s/argocd-application-test.yaml`
- **Ingress Config**: `k8s/ingress-test.pkc.pub.yaml`

---

## 💡 Key Points

✅ **Tests don't block deployment** - deploy-to-test runs regardless of pass/fail  
✅ **Automatic syncing** - ArgoCD continuously ensures cluster matches Git  
✅ **Self-healing** - ArgoCD fixes configuration drift automatically  
✅ **Easy rollback** - Just revert Git commit and ArgoCD syncs back  
✅ **Full visibility** - GitHub Actions + ArgoCD UI show everything  

---

## ❓ Questions?

Refer to:
- `k8s/ARGOCD_TEST_DEPLOYMENT_SETUP.md` - Detailed setup guide
- `k8s/ARGOCD_EXPLAINED.md` - GitOps concepts
- ArgoCD UI: https://argocd.pkc.pub
- GitHub Actions: https://github.com/xlp0/LandingPage/actions
