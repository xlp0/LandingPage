# Kubernetes Deployment with ConfigMap & ArgoCD

## Overview

This directory contains Kubernetes manifests for deploying the LandingPage application with **ConfigMap-based configuration** and **ArgoCD GitOps deployment**. This approach allows you to change configuration without rebuilding Docker images and enables automated continuous deployment.

---

## Files

```
k8s/
├── configmap-dev.yaml              # Dev environment config
├── configmap-test.yaml             # Test environment config
├── configmap-prod.yaml             # Production environment config
├── deployment-dev-with-configmap.yaml  # Example deployment using ConfigMap
├── service.yaml                    # Service definition
├── ingress.yaml                    # Ingress configuration
├── kustomization.yaml              # Kustomize configuration
├── argocd-application.yaml         # Main ArgoCD application
├── argocd-application-dev.yaml     # Dev environment ArgoCD app
├── argocd-application-prod.yaml    # Prod environment ArgoCD app
├── argocd-simple.yaml              # Simple ArgoCD config for UI
├── ARGOCD_QUICK_START.md           # Quick start guide
├── ARGOCD_DEPLOYMENT_GUIDE.md      # Complete ArgoCD guide
└── README.md                       # This file
```

---

## 🚀 ArgoCD Deployment (Recommended)

### Quick Deploy with ArgoCD

**Copy and paste this YAML into ArgoCD UI:**

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

**Or use kubectl:**

```bash
kubectl apply -f k8s/argocd-simple.yaml
```

**📚 For complete ArgoCD documentation, see:**
- [ARGOCD_QUICK_START.md](./ARGOCD_QUICK_START.md) - Quick reference
- [ARGOCD_DEPLOYMENT_GUIDE.md](./ARGOCD_DEPLOYMENT_GUIDE.md) - Complete guide

---

## Manual Deployment (Alternative)

### 1. Apply ConfigMap

```bash
# For dev environment
kubectl apply -f k8s/configmap-dev.yaml

# For test environment
kubectl apply -f k8s/configmap-test.yaml

# For production environment
kubectl apply -f k8s/configmap-prod.yaml
```

### 2. Apply Deployment

```bash
kubectl apply -f k8s/deployment-dev-with-configmap.yaml
```

### 3. Verify

```bash
# Check if ConfigMap was created
kubectl get configmap landingpage-dev-config -o yaml

# Check if deployment is using the ConfigMap
kubectl describe deployment landingpage-dev

# Test the health endpoint
kubectl port-forward deployment/landingpage-dev 3000:3000
curl http://localhost:3000/health
```

---

## Benefits of ConfigMap Approach

### ✅ **No Image Rebuild Required**

Change configuration without rebuilding Docker images:

```bash
# Edit the ConfigMap
kubectl edit configmap landingpage-dev-config

# Restart pods to pick up new config
kubectl rollout restart deployment/landingpage-dev
```

### ✅ **Environment-Specific Configuration**

Different configs for dev/test/prod:

- `dev.pkc.pub` → uses `landingpage-dev-config`
- `test.pkc.pub` → uses `landingpage-test-config`
- `pkc.pub` → uses `landingpage-pkc-config`

### ✅ **Health Checks Built-In**

The `/health` endpoint provides:
- Application status
- Version information
- Environment variables
- WebSocket connection count
- Uptime

### ✅ **Easy Debugging**

Check what config is actually being used:

```bash
# View ConfigMap
kubectl get configmap landingpage-dev-config -o yaml

# View environment variables in pod
kubectl exec deployment/landingpage-dev -- printenv | grep WEBSOCKET

# Check health endpoint
curl https://dev.pkc.pub/health
```

---

## How to Update Configuration

### Method 1: Edit ConfigMap Directly

```bash
kubectl edit configmap landingpage-dev-config
```

Change the values, save, then:

```bash
kubectl rollout restart deployment/landingpage-dev
```

### Method 2: Update YAML File

Edit `k8s/configmap-dev.yaml`, then:

```bash
kubectl apply -f k8s/configmap-dev.yaml
kubectl rollout restart deployment/landingpage-dev
```

### Method 3: Patch ConfigMap

```bash
kubectl patch configmap landingpage-dev-config \
  -p '{"data":{"WEBSOCKET_URL":"wss://new-domain.com/ws/"}}'

kubectl rollout restart deployment/landingpage-dev
```

---

## Migrating Existing Deployment

If you have an existing deployment with inline environment variables:

### Step 1: Create ConfigMap

```bash
kubectl apply -f k8s/configmap-dev.yaml
```

### Step 2: Update Deployment

Change from:

```yaml
env:
  - name: WEBSOCKET_URL
    value: "wss://dev.pkc.pub/ws/"
  - name: NODE_ENV
    value: "production"
  - name: PORT
    value: "3000"
```

To:

```yaml
envFrom:
  - configMapRef:
      name: landingpage-dev-config
```

### Step 3: Apply Changes

```bash
kubectl apply -f your-deployment.yaml
```

---

## Health Check Endpoint

The `/health` endpoint returns:

```json
{
  "status": "ok",
  "version": "abc123",
  "uptime": 3600.5,
  "timestamp": "2024-11-20T08:00:00.000Z",
  "endpoints": {
    "websocket": "/ws/",
    "config": "/api/config",
    "env": "/api/env"
  },
  "environment": {
    "NODE_ENV": "production",
    "PORT": "3000",
    "WEBSOCKET_URL": "wss://dev.pkc.pub/ws/"
  },
  "websocket": {
    "connected_clients": 5
  }
}
```

### Use Cases:

1. **Kubernetes Probes**: Liveness and readiness checks
2. **Debugging**: Verify what config is actually loaded
3. **Monitoring**: Track uptime and connections
4. **Version Tracking**: See which version is deployed

---

## Troubleshooting

### ConfigMap not found

```bash
# List all ConfigMaps
kubectl get configmaps

# Check if it exists in the right namespace
kubectl get configmap landingpage-dev-config -n default
```

### Environment variables not loaded

```bash
# Check pod environment
kubectl exec deployment/landingpage-dev -- printenv

# Check if ConfigMap is referenced correctly
kubectl describe deployment landingpage-dev | grep -A 5 "Environment Variables"
```

### Changes not taking effect

```bash
# Restart deployment to pick up new ConfigMap values
kubectl rollout restart deployment/landingpage-dev

# Watch rollout status
kubectl rollout status deployment/landingpage-dev
```

### Health check failing

```bash
# Check pod logs
kubectl logs deployment/landingpage-dev

# Test health endpoint directly
kubectl port-forward deployment/landingpage-dev 3000:3000
curl http://localhost:3000/health
```

---

## Best Practices

1. **Use ConfigMaps for all environment-specific config**
   - WebSocket URLs
   - API endpoints
   - Feature flags
   - Non-sensitive configuration

2. **Use Secrets for sensitive data**
   - API keys
   - Database passwords
   - TLS certificates

3. **Always restart deployment after ConfigMap changes**
   ```bash
   kubectl rollout restart deployment/landingpage-dev
   ```

4. **Version your ConfigMaps in Git**
   - Keep `k8s/configmap-*.yaml` files in version control
   - Document changes in commit messages

5. **Test health endpoint after deployment**
   ```bash
   curl https://dev.pkc.pub/health
   ```

---

## Next Steps

1. ✅ Apply ConfigMaps for all environments
2. ✅ Update deployments to use ConfigMaps
3. ✅ Test health endpoint
4. ✅ Update ingress to use health checks
5. ✅ Monitor application logs

---

## Support

For issues or questions:
1. Check pod logs: `kubectl logs deployment/landingpage-dev`
2. Check health endpoint: `curl https://dev.pkc.pub/health`
3. Verify ConfigMap: `kubectl get configmap landingpage-dev-config -o yaml`
