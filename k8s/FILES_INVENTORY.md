# Kubernetes Files Inventory

**Last Updated:** Dec 6, 2025  
**Cleanup Commit:** `3a7d282`

---

## 📦 Active Kubernetes Resources

### Core Deployment Files (Used by Kustomize)

| File | Purpose | Status |
|------|---------|--------|
| `kustomization.yaml` | Kustomize configuration - defines all resources to deploy | ✅ **ACTIVE** |
| `deployment-dev-with-configmap.yaml` | Main deployment manifest (3 replicas) | ✅ **ACTIVE** |
| `configmap-dev.yaml` | Environment variables and configuration | ✅ **ACTIVE** |
| `service.yaml` | Kubernetes service (ClusterIP) | ✅ **ACTIVE** |
| `ingress-argocd-test.yaml` | Ingress for argocd-test.pkc.pub with HTTPS | ✅ **ACTIVE** |
| `secret-r2-credentials.yaml` | Template for Cloudflare R2 credentials | ✅ **ACTIVE** |

### ArgoCD Application Definition

| File | Purpose | Status |
|------|---------|--------|
| `argocd-test-no-kustomize.yaml` | ArgoCD Application resource (applied to ArgoCD) | ✅ **ACTIVE** |

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main k8s directory documentation |
| `ARCHITECTURE.md` | Architecture overview and design |
| `ARGOCD_DEPLOYMENT_GUIDE.md` | Comprehensive ArgoCD deployment guide |
| `ARGOCD_QUICK_START.md` | Quick start guide for ArgoCD |
| `ARGOCD_TEST_DEPLOYMENT.md` | Test deployment documentation |
| `DEPLOYMENT_CHECKLIST.md` | Deployment checklist and procedures |
| `TEST_VS_PROD_DIAGRAM.md` | Test vs Production comparison |
| `FILES_INVENTORY.md` | This file - inventory of k8s files |

---

## 🗑️ Deleted Files (Cleanup on Dec 6, 2025)

### Unused ArgoCD Application Files
- ❌ `argocd-application-dev.yaml` - Unused dev application definition
- ❌ `argocd-application-prod.yaml` - Unused prod application definition
- ❌ `argocd-application.yaml` - Unused generic application
- ❌ `argocd-simple.yaml` - Unused simple config
- ❌ `argocd-test-namespace.yaml` - Unused namespace config
- ❌ `argocd-test-simple.yaml` - Duplicate/unused test config

### Unused Config Files
- ❌ `configmap-prod.yaml` - Not referenced in kustomization
- ❌ `configmap-test.yaml` - Not referenced in kustomization
- ❌ `ingress.yaml` - Old ingress for dev.pkc.pub (replaced by ingress-argocd-test.yaml)

**Reason for deletion:** These files were not referenced in `kustomization.yaml` and not used by the active ArgoCD deployment.

---

## 🔄 Resource Relationships

```
argocd-test-no-kustomize.yaml (ArgoCD Application)
    ↓
kustomization.yaml (Kustomize Config)
    ↓
    ├── deployment-dev-with-configmap.yaml (Deployment)
    │   ├── Uses: configmap-dev.yaml
    │   └── Uses: secret-r2-credentials.yaml (optional)
    │
    ├── service.yaml (Service)
    │   └── Selects: Pods from deployment
    │
    └── ingress-argocd-test.yaml (Ingress)
        ├── Routes: argocd-test.pkc.pub
        ├── Backend: service.yaml
        └── TLS: landingpage-argocd-test-tls (cert-manager)
```

---

## 🎯 Current Deployment Configuration

### Application Details
- **Name:** `landingpage-argocd-test`
- **Namespace:** `default`
- **Replicas:** 3 (high availability)
- **Image:** `henry768/landingpage:argocd-latest`
- **Domain:** https://argocd-test.pkc.pub
- **Health Endpoint:** https://argocd-test.pkc.pub/health

### Resources Referenced by Kustomization
```yaml
resources:
  - deployment-dev-with-configmap.yaml  # Main deployment
  - configmap-dev.yaml                  # Configuration
  - service.yaml                        # Service
  - ingress-argocd-test.yaml           # Ingress with HTTPS
```

### Environment Variables
- **ConfigMap:** `landingpage-dev-config` (from configmap-dev.yaml)
- **Secret:** `cloudflare-r2-credentials` (optional, from secret-r2-credentials.yaml)

---

## 📝 File Usage Guidelines

### When to Add New Files

**Deployment Variants:**
```bash
# Create environment-specific deployments
deployment-staging.yaml
deployment-production.yaml
```

**Config Variants:**
```bash
# Create environment-specific configs
configmap-staging.yaml
configmap-production.yaml
```

**Remember to add to kustomization.yaml:**
```yaml
resources:
  - deployment-staging.yaml
  - configmap-staging.yaml
```

### When to Delete Files

Delete a file if:
1. ❌ Not referenced in `kustomization.yaml`
2. ❌ Not used by any active ArgoCD application
3. ❌ Not referenced by any active deployment
4. ❌ Duplicate or obsolete

**Always check before deleting:**
```bash
# Search for file references
grep -r "filename.yaml" .

# Check kustomization
cat k8s/kustomization.yaml | grep "filename.yaml"
```

---

## 🔍 Verification Commands

### Check Active Resources
```bash
# List all resources in kustomization
kubectl kustomize k8s/

# Check what ArgoCD will deploy
argocd app get landingpage-argocd-test

# List deployed resources
kubectl get all -n default -l managed-by=argocd
```

### Verify File Usage
```bash
# Check if file is referenced
grep -r "filename.yaml" k8s/

# List all YAML files
ls -lh k8s/*.yaml

# Count YAML files
ls k8s/*.yaml | wc -l
```

---

## 📊 Statistics

### Before Cleanup
- **Total YAML files:** 15
- **Active files:** 6
- **Unused files:** 9
- **Cleanup needed:** ⚠️ Yes

### After Cleanup (Current)
- **Total YAML files:** 7
- **Active files:** 7
- **Unused files:** 0
- **Status:** ✅ Clean

### Documentation
- **Total .md files:** 8
- **Purpose:** Reference, guides, architecture

---

## 🚀 Next Steps

### If You Need to Add More Environments

**1. Create Staging Environment:**
```bash
# Copy and modify
cp deployment-dev-with-configmap.yaml deployment-staging.yaml
cp configmap-dev.yaml configmap-staging.yaml

# Update kustomization.yaml
# Add to resources list
```

**2. Create Production Environment:**
```bash
# Copy and modify
cp deployment-dev-with-configmap.yaml deployment-production.yaml
cp configmap-dev.yaml configmap-production.yaml

# Update for production:
# - Increase replicas (5-10)
# - Change image tag to latest_landingpage
# - Update resource limits
```

**3. Create ArgoCD Application:**
```bash
# Create application manifest
cat > k8s/argocd-application-staging.yaml <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: landingpage-staging
spec:
  source:
    path: k8s
    repoURL: https://github.com/xlp0/LandingPage.git
  destination:
    namespace: staging
EOF

# Apply to ArgoCD
kubectl apply -f k8s/argocd-application-staging.yaml -n argocd
```

---

## 🔒 Security Notes

### Files That Should NEVER Be Committed
- ❌ `*-credentials-real.yaml` (actual credentials)
- ❌ `*.secret.yaml` (secret data)
- ❌ `.secrets/` directory

### Files That Are Safe to Commit
- ✅ `secret-r2-credentials.yaml` (template only, no real credentials)
- ✅ All deployment manifests
- ✅ All configmaps (no sensitive data)
- ✅ All ingress and service files

**See `.gitignore` for full list of excluded patterns.**

---

## 📞 Support

**Issues with deployment?**
1. Check ArgoCD dashboard: https://argocd.pkc.pub
2. Review logs: `kubectl logs -n default -l app=landingpage-dev`
3. Check events: `kubectl get events -n default --sort-by='.lastTimestamp'`
4. Consult documentation in this directory

**Need to restore deleted files?**
```bash
# View deleted files
git log --diff-filter=D --summary

# Restore a specific file
git checkout 89d7072 -- k8s/filename.yaml
```

---

**Maintained by:** THK Mesh Team  
**Repository:** https://github.com/xlp0/LandingPage  
**ArgoCD:** https://argocd.pkc.pub
