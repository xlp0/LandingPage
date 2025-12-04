# ArgoCD Test Deployment - Quick Summary

## 🎯 What We're Doing

Creating a **separate ArgoCD test deployment** in a new namespace to avoid conflicts with your existing deployment.

---

## 📋 Copy This YAML into ArgoCD UI

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: landingpage-argocd-test
spec:
  destination:
    namespace: landingpage-argocd
    server: https://kubernetes.default.svc
  source:
    path: k8s
    repoURL: https://github.com/xlp0/LandingPage.git
    targetRevision: HEAD
    kustomize:
      namePrefix: argocd-test-
  project: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

---

## 🚀 Deployment Steps

### 1. Go to ArgoCD UI
Open: https://argocd.pkc.pub/applications

### 2. Create New Application
- Click **"+ NEW APP"**
- Switch to **"EDIT AS YAML"** tab
- **Paste the YAML above**
- Click **"CREATE"**

### 3. Watch It Deploy
- Application: `landingpage-argocd-test`
- Namespace: `landingpage-argocd` (auto-created)
- Status: Should show "Syncing" → "Synced" → "Healthy"

---

## ✅ What Gets Created

### In New Namespace: `landingpage-argocd`

All resources get `argocd-test-` prefix to avoid conflicts:

```
📦 Deployment: argocd-test-landingpage-dev
   └── 🟢 Pod: argocd-test-landingpage-dev-xxxxx

📋 ConfigMap: argocd-test-landingpage-dev-config
📋 ConfigMap: argocd-test-landingpage-test-config  
📋 ConfigMap: argocd-test-landingpage-pkc-config

🔌 Service: argocd-test-landingpage-dev

🌐 Ingress: argocd-test-landingpage-dev-ingress
```

---

## 🔄 Your Setup: Before vs After

### Before (Current State)
```
Namespace: default
├── landingpage-dev (11 days old)
├── 3 pods running
└── Accessible at dev.pkc.pub
```

### After (With Test Deployment)
```
Namespace: default
├── landingpage-dev (unchanged)
├── 3 pods running
└── Accessible at dev.pkc.pub

Namespace: landingpage-argocd (NEW)
├── argocd-test-landingpage-dev
├── 1 pod running
└── Managed by ArgoCD
```

**No conflicts!** They're in separate namespaces.

---

## 🎯 Why This Approach?

✅ **No Conflicts** - Different namespace = no selector conflicts  
✅ **Safe** - Existing deployment keeps running  
✅ **Clean** - Easy to delete when done testing  
✅ **Learn** - Experiment with ArgoCD safely  
✅ **Compare** - See ArgoCD vs manual deployment side-by-side  

---

## 🧪 Test ArgoCD Features

### After Deployment Succeeds

1. **Test Auto-Sync**
   - Edit any file in `k8s/` folder
   - Commit and push to GitHub
   - Watch ArgoCD auto-sync within 3 minutes

2. **View in ArgoCD UI**
   - See resource tree
   - Check sync status
   - View logs

3. **Test Self-Heal**
   - ArgoCD will revert any manual changes
   - Keeps Git as source of truth

---

## 🗑️ Clean Up When Done

### Delete Test Deployment

In ArgoCD UI:
1. Click on `landingpage-argocd-test`
2. Click **"DELETE"**
3. Check **"Cascade"** (deletes all resources)
4. Confirm

This removes:
- The ArgoCD application
- The `landingpage-argocd` namespace
- All test resources

Your original `default` namespace deployment stays untouched!

---

## 📊 Quick Comparison

| Aspect | Original Deployment | Test Deployment |
|--------|-------------------|-----------------|
| **Namespace** | `default` | `landingpage-argocd` |
| **App Name** | `thkmesh-landingpage` | `landingpage-argocd-test` |
| **Managed By** | Manual/kubectl | ArgoCD |
| **Resource Prefix** | None | `argocd-test-` |
| **Purpose** | Production/Dev | ArgoCD Testing |
| **Can Delete?** | No (in use) | Yes (test only) |

---

## 🎉 Success Looks Like

In ArgoCD UI, you'll see:

```
Application: landingpage-argocd-test
Status: Synced ✅
Health: Healthy ✅
Namespace: landingpage-argocd
Resources: 6 (all green)
```

---

## 📚 Documentation Files

- **`k8s/argocd-test-simple.yaml`** - Simple YAML for UI
- **`k8s/argocd-test-namespace.yaml`** - Full configuration
- **`k8s/ARGOCD_TEST_DEPLOYMENT.md`** - Complete guide
- **`ARGOCD_TEST_SUMMARY.md`** - This file (quick reference)

---

## 🆘 If You Need Help

See the complete guide: `k8s/ARGOCD_TEST_DEPLOYMENT.md`

---

**Ready?** Copy the YAML above and create the application in ArgoCD UI! 🚀

The deployment should complete in 2-3 minutes with no conflicts.
