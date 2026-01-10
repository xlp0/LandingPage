# ArgoCD Test Deployment Setup - test.pkc.pub

## Overview

This guide explains how to deploy the Landing Page to `test.pkc.pub` using ArgoCD. This is a **continuous deployment environment** where:

- ✅ Deploys automatically on every push to `main`
- ✅ Tests do NOT need to pass for deployment
- ✅ ArgoCD continuously syncs the cluster state
- ✅ Self-healing enabled (fixes configuration drift)

---

## Quick Start

### Option 1: Deploy via ArgoCD UI (Recommended)

1. **Open ArgoCD UI**: https://argocd.pkc.pub/applications
2. **Click "New App"** or use this pre-filled URL:
   ```
   https://argocd.pkc.pub/applications?new=%7B%22apiVersion%22%3A%22argoproj.io%2Fv1alpha1%22%2C%22kind%22%3A%22Application%22%2C%22metadata%22%3A%7B%22name%22%3A%22landingpage-test%22%2C%22namespace%22%3A%22argocd%22%7D%2C%22spec%22%3A%7B%22project%22%3A%22default%22%2C%22source%22%3A%7B%22repoURL%22%3A%22https%3A%2F%2Fgithub.com%2Fxlp0%2FLandingPage.git%22%2C%22targetRevision%22%3A%22main%22%2C%22path%22%3A%22k8s%22%7D%2C%22destination%22%3A%7B%22server%22%3A%22https%3A%2F%2Fkubernetes.default.svc%22%2C%22namespace%22%3A%22landingpage-test%22%7D%2C%22syncPolicy%22%3A%7B%22automated%22%3A%7B%22prune%22%3Atrue%2C%22selfHeal%22%3Atrue%7D%2C%22syncOptions%22%3A%5B%22CreateNamespace%3Dtrue%22%5D%7D%7D%7D
   ```

3. **Fill in the form**:
   - **Application Name**: `landingpage-test`
   - **Project**: `default`
   - **Repository URL**: `https://github.com/xlp0/LandingPage.git`
   - **Revision**: `main`
   - **Path**: `k8s`
   - **Cluster URL**: `https://kubernetes.default.svc`
   - **Namespace**: `landingpage-test`
   - **Sync Policy**: `Automatic` ✅
   - **Prune Resources**: ✅
   - **Self Heal**: ✅
   - **Auto-Create Namespace**: ✅

4. **Click "Create"**

### Option 2: Deploy via kubectl

```bash
kubectl apply -f k8s/argocd-application-test.yaml
```

### Option 3: Deploy via ArgoCD CLI

```bash
argocd login argocd.pkc.pub
argocd app create -f k8s/argocd-application-test.yaml
```

---

## Verify Deployment

```bash
# Check application status
kubectl get application -n argocd landingpage-test

# Watch sync progress
kubectl get application -n argocd landingpage-test -w

# Check pods
kubectl get pods -n landingpage-test -l app=landingpage -w

# Check service
kubectl get svc -n landingpage-test

# Check ingress
kubectl get ingress -n landingpage-test
```

---

## Access Application

After deployment completes:

- **URL**: https://test.pkc.pub
- **Health Check**: https://test.pkc.pub/health
- **ArgoCD UI**: https://argocd.pkc.pub/applications/landingpage-test

---

## GitHub Actions Integration

The `clm-test-all-components.yml` workflow now includes a `deploy-to-test` job that:

1. **Runs after all component tests** (regardless of pass/fail)
2. **Only on `main` branch** (not on PRs)
3. **Triggers ArgoCD to sync** the cluster
4. **Provides deployment summary** in GitHub Actions

### Workflow Trigger

```yaml
on:
  push:
    branches:
      - main
      - develop
```

When you push to `main`, the workflow:
1. Runs all component tests in parallel
2. After tests complete, triggers deployment to `test.pkc.pub`
3. ArgoCD syncs within 3 minutes

---

## Configuration

### Namespace

- **Namespace**: `landingpage-test`
- **Auto-created**: Yes (via `CreateNamespace=true`)

### Deployment

- **Image**: `henry768/landingpage:argocd-latest`
- **Replicas**: 3 (high availability)
- **Health Checks**: Enabled (liveness & readiness probes)

### ConfigMap

- **WebSocket URL**: `wss://test.pkc.pub/ws/`
- **Node Env**: `production`
- **Port**: `3000`
- **Zitadel OAuth2**: Configured

### Ingress

- **Host**: `test.pkc.pub`
- **Service**: `landingpage-dev`
- **Port**: `80` → `3000`
- **WebSocket Support**: Enabled
- **CORS**: Enabled
- **TLS**: Enabled (Let's Encrypt)

---

## Sync Policy

### Automated Sync

```yaml
syncPolicy:
  automated:
    prune: true        # Remove deleted resources
    selfHeal: true     # Fix configuration drift
    allowEmpty: false  # Don't allow empty syncs
```

### Retry Policy

```yaml
retry:
  limit: 5             # Retry up to 5 times
  backoff:
    duration: 5s       # Initial backoff: 5 seconds
    factor: 2          # Double backoff each retry
    maxDuration: 3m    # Max backoff: 3 minutes
```

---

## Making Changes

### Update Application Code

1. **Make changes** to your code
2. **Commit and push** to `main` branch
3. **GitHub Actions** builds and pushes Docker image
4. **ArgoCD** automatically syncs within 3 minutes
5. **Application** updates at https://test.pkc.pub

### Update Configuration

1. **Edit** `k8s/configmap-dev.yaml`
2. **Commit and push** to `main` branch
3. **ArgoCD** automatically applies changes
4. **Pods** restart with new configuration

### Manual Sync

```bash
# Via CLI
argocd app sync landingpage-test

# Via kubectl
kubectl patch application landingpage-test -n argocd \
  --type merge -p '{"operation":{"sync":{}}}'
```

---

## Troubleshooting

### Application Not Syncing

```bash
# Check application status
argocd app get landingpage-test

# View sync errors
kubectl describe application -n argocd landingpage-test

# Force sync
argocd app sync landingpage-test --force
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n landingpage-test

# View pod logs
kubectl logs -n landingpage-test -l app=landingpage

# Describe pod for events
kubectl describe pod -n landingpage-test -l app=landingpage
```

### Configuration Not Applied

```bash
# Check ConfigMap
kubectl get configmap -n landingpage-test landingpage-dev-config -o yaml

# Restart deployment
kubectl rollout restart deployment -n landingpage-test landingpage-dev
```

### Service Not Accessible

```bash
# Check service
kubectl get svc -n landingpage-test

# Check ingress
kubectl get ingress -n landingpage-test

# Check ingress details
kubectl describe ingress -n landingpage-test
```

---

## Monitoring

### ArgoCD UI

1. Open https://argocd.pkc.pub/applications
2. Click `landingpage-test`
3. View:
   - Resource tree
   - Sync status
   - Deployment history
   - Pod logs

### kubectl

```bash
# Watch deployment progress
kubectl rollout status deployment -n landingpage-test landingpage-dev

# Watch pod creation
kubectl get pods -n landingpage-test -w

# View logs
kubectl logs -n landingpage-test -l app=landingpage -f
```

---

## Important Notes

⚠️ **Test Environment Characteristics**:
- Deploys on every push to `main` (even if tests fail)
- Meant for continuous testing and validation
- Not a stable production environment
- Configuration may change frequently

✅ **Best Practices**:
- Use this environment to test new features
- Monitor logs and metrics regularly
- Don't rely on this for critical operations
- Use production environment for stable releases

---

## Next Steps

1. ✅ Deploy application via ArgoCD
2. ✅ Verify at https://test.pkc.pub
3. ✅ Monitor in ArgoCD UI
4. ✅ Make changes and watch auto-deployment
5. ✅ Scale to production when ready

---

## Additional Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://www.gitops.tech/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
