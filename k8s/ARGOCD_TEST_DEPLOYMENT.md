# ArgoCD Test Deployment - Separate Namespace

This is a **test deployment** in a separate namespace to avoid conflicts with existing resources.

## 🎯 Purpose

- Test ArgoCD functionality without affecting existing `default` namespace deployment
- Learn ArgoCD workflows in isolation
- Safe environment for experimentation

---

## 🚀 Quick Deploy - Copy This YAML

### For ArgoCD UI (https://argocd.pkc.pub)

**Copy and paste this into ArgoCD UI:**

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

## 📋 What This Creates

### New Namespace
- **Namespace**: `landingpage-argocd` (created automatically)

### Resources (all prefixed with `argocd-test-`)
- **Deployment**: `argocd-test-landingpage-dev`
- **ConfigMaps**: 
  - `argocd-test-landingpage-dev-config`
  - `argocd-test-landingpage-test-config`
  - `argocd-test-landingpage-pkc-config`
- **Service**: `argocd-test-landingpage-dev`
- **Ingress**: `argocd-test-landingpage-dev-ingress`

### Key Differences from Production

| Aspect | Production (default namespace) | Test (landingpage-argocd namespace) |
|--------|-------------------------------|-------------------------------------|
| **Namespace** | `default` | `landingpage-argocd` |
| **App Name** | `thkmesh-landingpage` | `landingpage-argocd-test` |
| **Resource Prefix** | None | `argocd-test-` |
| **Deployment Name** | `landingpage-dev` | `argocd-test-landingpage-dev` |
| **Service Name** | `landingpage-dev` | `argocd-test-landingpage-dev` |
| **Purpose** | Production/Dev | ArgoCD Testing |

---

## ✅ Deployment Steps

### Step 1: Delete Old Application (Optional)

If you want to remove the conflicting application first:

1. Go to ArgoCD UI
2. Find `thkmesh-landingpage` application
3. Click **"DELETE"**
4. Uncheck **"Cascade"** (keeps existing resources running)
5. Confirm deletion

### Step 2: Create New Test Application

1. Go to https://argocd.pkc.pub/applications
2. Click **"+ NEW APP"**
3. Switch to **"EDIT AS YAML"** tab
4. **Copy and paste** the YAML above
5. Click **"CREATE"**

### Step 3: Watch Deployment

The application will:
1. ✅ Create namespace `landingpage-argocd`
2. ✅ Deploy all resources with `argocd-test-` prefix
3. ✅ Start pods in the new namespace
4. ✅ Show "Synced" and "Healthy" status

---

## 🔍 Verify Deployment

### In ArgoCD UI

You should see:
```
Application: landingpage-argocd-test
Namespace: landingpage-argocd
Status: Synced ✅
Health: Healthy ✅

Resources:
├── 📦 Deployment: argocd-test-landingpage-dev
│   └── 🟢 Pod: argocd-test-landingpage-dev-xxxxx
├── 📋 ConfigMap: argocd-test-landingpage-dev-config
├── 📋 ConfigMap: argocd-test-landingpage-test-config
├── 📋 ConfigMap: argocd-test-landingpage-pkc-config
├── 🔌 Service: argocd-test-landingpage-dev
└── 🌐 Ingress: argocd-test-landingpage-dev-ingress
```

### Check Resources (if you have kubectl access)

```bash
# List all resources in the test namespace
kubectl get all -n landingpage-argocd

# Check pods
kubectl get pods -n landingpage-argocd

# Check services
kubectl get svc -n landingpage-argocd

# Check configmaps
kubectl get configmap -n landingpage-argocd

# View pod logs
kubectl logs -n landingpage-argocd -l app=landingpage-dev
```

---

## 🌐 Access the Test Application

### Update Ingress Host (Optional)

If you want to access this test deployment via a different URL, you'll need to:

1. Update `k8s/ingress.yaml` to add a test host
2. Or use port-forwarding for testing

### Port Forward (Recommended for Testing)

```bash
# Forward local port 8080 to the test deployment
kubectl port-forward -n landingpage-argocd \
  deployment/argocd-test-landingpage-dev 8080:3000

# Access at:
# http://localhost:8080
# http://localhost:8080/health
```

---

## 🧪 Test ArgoCD Features

### Test 1: Auto-Sync

1. Edit `k8s/configmap-dev.yaml` in your repo
2. Add a comment: `# ArgoCD test change`
3. Commit and push to GitHub
4. Watch ArgoCD detect and sync automatically (within 3 minutes)

### Test 2: Self-Heal

1. Manually edit a resource (if you have kubectl):
   ```bash
   kubectl edit deployment argocd-test-landingpage-dev -n landingpage-argocd
   # Change replicas to 2
   ```
2. Watch ArgoCD detect drift
3. See it automatically revert to Git state (replicas back to 1)

### Test 3: Manual Sync

1. Disable auto-sync in ArgoCD UI
2. Make a change in Git
3. Watch status show "OutOfSync"
4. Manually click "SYNC" button
5. Re-enable auto-sync

### Test 4: Rollback

1. Make a change and sync
2. Go to "History and Rollback" tab
3. Select previous revision
4. Click "Rollback"
5. Verify application reverts to previous state

---

## 🗑️ Clean Up Test Deployment

### When You're Done Testing

**Option 1: Delete Application and Resources**
```bash
# Via ArgoCD UI
1. Click on "landingpage-argocd-test"
2. Click "DELETE"
3. Check "Cascade" to delete all resources
4. Confirm deletion
```

**Option 2: Keep Application, Delete Resources**
```bash
# Deletes resources but keeps ArgoCD app config
1. Click "DELETE"
2. Uncheck "Cascade"
3. Confirm
```

**Option 3: Delete Namespace (if using kubectl)**
```bash
# This removes everything in the namespace
kubectl delete namespace landingpage-argocd
```

---

## 📊 Comparison: Test vs Production

### Your Setup Now

```
┌─────────────────────────────────────────┐
│         Kubernetes Cluster               │
│                                          │
│  ┌────────────────────────────────┐    │
│  │  Namespace: default             │    │
│  │                                  │    │
│  │  • landingpage-dev (existing)   │    │
│  │  • 3 pods running               │    │
│  │  • Accessible at dev.pkc.pub    │    │
│  └────────────────────────────────┘    │
│                                          │
│  ┌────────────────────────────────┐    │
│  │  Namespace: landingpage-argocd  │    │
│  │                                  │    │
│  │  • argocd-test-landingpage-dev  │    │
│  │  • Managed by ArgoCD            │    │
│  │  • For testing only             │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Benefits

✅ **No Conflicts** - Separate namespace avoids selector conflicts  
✅ **Safe Testing** - Won't affect production deployment  
✅ **Easy Cleanup** - Delete namespace when done  
✅ **Learn ArgoCD** - Experiment without risk  
✅ **Side-by-Side** - Compare ArgoCD vs manual deployment  

---

## 🎯 Success Criteria

Your test deployment is successful when:

✅ Application created: `landingpage-argocd-test`  
✅ Namespace created: `landingpage-argocd`  
✅ Status shows: **Synced** + **Healthy**  
✅ All resources have `argocd-test-` prefix  
✅ Pods are running in new namespace  
✅ No conflicts with existing deployment  
✅ Auto-sync works (test by making Git changes)  

---

## 📚 Next Steps After Testing

Once you're comfortable with ArgoCD:

1. **Migrate Production** - Move existing `default` namespace deployment to ArgoCD
2. **Add More Environments** - Create staging, production namespaces
3. **Implement CI/CD** - Auto-build and deploy on Git push
4. **Add Monitoring** - Prometheus, Grafana integration
5. **Secrets Management** - Use Sealed Secrets or Vault

---

## 🆘 Troubleshooting

### If Namespace Already Exists

```bash
# Check if namespace exists
kubectl get namespace landingpage-argocd

# If it exists and has resources, delete them first
kubectl delete all --all -n landingpage-argocd
```

### If Resources Still Conflict

The `namePrefix: argocd-test-` should prevent conflicts, but if issues occur:

1. Change the prefix in the YAML to something else
2. Or use a different namespace name
3. Or delete conflicting resources manually

---

## 📝 Quick Reference

### Application Details
- **Name**: `landingpage-argocd-test`
- **Namespace**: `landingpage-argocd`
- **Prefix**: `argocd-test-`
- **Repository**: https://github.com/xlp0/LandingPage.git
- **Path**: `k8s`
- **Auto-Sync**: Enabled ✅
- **Self-Heal**: Enabled ✅
- **Auto-Prune**: Enabled ✅

### Useful Commands

```bash
# Watch application status
kubectl get application -n argocd landingpage-argocd-test -w

# List all resources in test namespace
kubectl get all -n landingpage-argocd

# View logs
kubectl logs -n landingpage-argocd -l app=landingpage-dev -f

# Port forward
kubectl port-forward -n landingpage-argocd \
  deployment/argocd-test-landingpage-dev 8080:3000

# Delete everything
kubectl delete namespace landingpage-argocd
```

---

**Ready to deploy!** Just copy the YAML above into ArgoCD UI and click CREATE. 🚀
