# ArgoCD Deployment Guide for THK Mesh Landing Page

## Overview

This guide explains how to deploy the THK Mesh Landing Page using ArgoCD for GitOps-based continuous deployment.

## Prerequisites

1. **ArgoCD installed** on your Kubernetes cluster
2. **Access to ArgoCD UI** at https://argocd.pkc.pub
3. **GitHub repository** access: https://github.com/xlp0/LandingPage
4. **kubectl** configured to access your cluster

## Quick Start

### Option 1: Deploy via ArgoCD UI

1. **Navigate to ArgoCD UI**
   - URL: https://argocd.pkc.pub/applications

2. **Click "New App" or use the pre-filled URL**
   ```
   https://argocd.pkc.pub/applications?new=%7B%22apiVersion%22%3A%22argoproj.io%2Fv1alpha1%22%2C%22kind%22%3A%22Application%22%2C%22metadata%22%3A%7B%22name%22%3A%22thkmesh-landingpage%22%7D%2C%22spec%22%3A%7B%22destination%22%3A%7B%22namespace%22%3A%22default%22%2C%22server%22%3A%22https%3A%2F%2Fkubernetes.default.svc%22%7D%2C%22source%22%3A%7B%22path%22%3A%22k8s%22%2C%22repoURL%22%3A%22https%3A%2F%2Fgithub.com%2Fxlp0%2FLandingPage.git%22%2C%22targetRevision%22%3A%22HEAD%22%7D%2C%22project%22%3A%22default%22%7D%7D
   ```

3. **Fill in the form:**
   - **Application Name:** `thkmesh-landingpage`
   - **Project:** `default`
   - **Sync Policy:** Automatic (recommended) or Manual
   - **Repository URL:** `https://github.com/xlp0/LandingPage.git`
   - **Revision:** `HEAD` (or specific branch/tag)
   - **Path:** `k8s`
   - **Cluster URL:** `https://kubernetes.default.svc`
   - **Namespace:** `default`

4. **Click "Create"**

### Option 2: Deploy via kubectl (Recommended)

Apply the ArgoCD Application manifest directly:

```bash
# Navigate to the k8s directory
cd /Users/Henrykoo/Documents/GovTech/THKMesh/LandingPage/k8s

# Apply the ArgoCD application
kubectl apply -f argocd-application.yaml

# Check application status
kubectl get application -n argocd thkmesh-landingpage

# Watch the sync progress
kubectl get application -n argocd thkmesh-landingpage -w
```

### Option 3: Deploy via ArgoCD CLI

```bash
# Login to ArgoCD
argocd login argocd.pkc.pub

# Create application from file
argocd app create -f argocd-application.yaml

# Or create application with CLI parameters
argocd app create thkmesh-landingpage \
  --repo https://github.com/xlp0/LandingPage.git \
  --path k8s \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# Sync the application
argocd app sync thkmesh-landingpage

# Get application status
argocd app get thkmesh-landingpage
```

## Environment-Specific Deployments

### Development Environment

```bash
kubectl apply -f argocd-application-dev.yaml
```

**Configuration:**
- Namespace: `default`
- Auto-sync: Enabled
- Self-heal: Enabled
- ConfigMap: `configmap-dev.yaml`

### Production Environment

```bash
kubectl apply -f argocd-application-prod.yaml
```

**Configuration:**
- Namespace: `production`
- Auto-sync: Disabled (manual approval required)
- Self-heal: Disabled
- ConfigMap: `configmap-prod.yaml`

## ArgoCD Application Files

### 1. `argocd-application.yaml`
Main ArgoCD application manifest with automated sync enabled.

### 2. `argocd-application-dev.yaml`
Development environment with aggressive auto-sync and self-healing.

### 3. `argocd-application-prod.yaml`
Production environment with manual sync for controlled deployments.

## Kubernetes Resources Deployed

The ArgoCD application will deploy the following resources:

1. **Deployment** (`deployment-dev-with-configmap.yaml`)
   - Container: `henry768/landingpage:latest_landingpage`
   - Replicas: 1
   - Health checks configured
   - Resource limits set

2. **ConfigMap** (`configmap-dev.yaml`)
   - Environment variables
   - Zitadel OAuth2 configuration
   - WebSocket URL
   - STUN servers

3. **Service** (`service.yaml`)
   - Type: ClusterIP
   - Ports: 80, 443 → 3000

4. **Ingress** (`ingress.yaml`)
   - Host: `dev.pkc.pub`
   - WebSocket support
   - CORS enabled

## Monitoring Deployment

### Via ArgoCD UI

1. Navigate to https://argocd.pkc.pub/applications
2. Click on `thkmesh-landingpage`
3. View resource tree and sync status
4. Check logs and events

### Via kubectl

```bash
# Check application status
kubectl get application -n argocd thkmesh-landingpage -o yaml

# Check deployed resources
kubectl get all -l app=landingpage-dev

# Check pods
kubectl get pods -l app=landingpage-dev

# View pod logs
kubectl logs -l app=landingpage-dev -f

# Check service
kubectl get svc landingpage-dev

# Check ingress
kubectl get ingress landingpage-dev-ingress
```

### Via ArgoCD CLI

```bash
# Get application details
argocd app get thkmesh-landingpage

# View sync status
argocd app sync thkmesh-landingpage --dry-run

# View application logs
argocd app logs thkmesh-landingpage

# View application history
argocd app history thkmesh-landingpage
```

## Sync Policies

### Automated Sync (Default)

The application automatically syncs when:
- Git repository changes are detected
- Application is out of sync
- Resources are manually deleted (auto-prune)
- Resources drift from desired state (self-heal)

### Manual Sync

To disable automated sync, modify the `syncPolicy` section:

```yaml
syncPolicy:
  automated: null  # Remove automated sync
```

Then sync manually:

```bash
argocd app sync thkmesh-landingpage
```

## Troubleshooting

### Application Not Syncing

```bash
# Check application status
kubectl describe application -n argocd thkmesh-landingpage

# View sync errors
argocd app get thkmesh-landingpage

# Force sync
argocd app sync thkmesh-landingpage --force
```

### Resources Not Deploying

```bash
# Check if namespace exists
kubectl get namespace default

# Check RBAC permissions
kubectl auth can-i create deployments --namespace=default

# View ArgoCD controller logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
```

### Sync Fails with Validation Errors

```bash
# Validate manifests locally
kubectl apply --dry-run=client -f k8s/

# Skip validation (not recommended)
argocd app sync thkmesh-landingpage --validate=false
```

## Updating the Application

### Update via Git

1. Make changes to Kubernetes manifests in the repository
2. Commit and push to GitHub
3. ArgoCD automatically detects changes and syncs (if automated sync is enabled)

### Update ConfigMap

```bash
# Edit configmap
kubectl edit configmap landingpage-dev-config

# Or update via Git
git add k8s/configmap-dev.yaml
git commit -m "Update configuration"
git push

# Force restart deployment to pick up new config
kubectl rollout restart deployment landingpage-dev
```

### Update Docker Image

Update the image tag in `deployment-dev-with-configmap.yaml`:

```yaml
containers:
  - name: landingpage
    image: henry768/landingpage:v2.0.0  # Update tag
```

Commit and push to trigger sync.

## Rollback

### Via ArgoCD UI

1. Navigate to application
2. Click "History and Rollback"
3. Select previous revision
4. Click "Rollback"

### Via ArgoCD CLI

```bash
# View history
argocd app history thkmesh-landingpage

# Rollback to specific revision
argocd app rollback thkmesh-landingpage <revision-id>
```

### Via kubectl

```bash
# Rollback deployment
kubectl rollout undo deployment landingpage-dev

# Rollback to specific revision
kubectl rollout undo deployment landingpage-dev --to-revision=2
```

## Deleting the Application

### Via ArgoCD UI

1. Navigate to application
2. Click "Delete"
3. Confirm deletion
4. Choose whether to cascade delete resources

### Via kubectl

```bash
# Delete application (keeps resources)
kubectl delete application -n argocd thkmesh-landingpage

# Delete application and all resources
kubectl delete application -n argocd thkmesh-landingpage --cascade=foreground
```

### Via ArgoCD CLI

```bash
# Delete application
argocd app delete thkmesh-landingpage

# Delete without confirmation
argocd app delete thkmesh-landingpage --yes
```

## Best Practices

1. **Use Git as Single Source of Truth**
   - All changes should be made via Git commits
   - Avoid manual kubectl edits in production

2. **Environment Separation**
   - Use separate namespaces for dev/test/prod
   - Use different ArgoCD projects for isolation

3. **Secrets Management**
   - Don't commit secrets to Git
   - Use Sealed Secrets or External Secrets Operator
   - Consider using Vault for sensitive data

4. **Health Checks**
   - Configure proper liveness and readiness probes
   - Monitor application health in ArgoCD UI

5. **Resource Limits**
   - Set appropriate CPU and memory limits
   - Monitor resource usage

6. **Sync Waves**
   - Use sync waves for ordered deployment
   - Deploy dependencies before applications

## Additional Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [GitOps Principles](https://www.gitops.tech/)

## Support

For issues or questions:
- GitHub Issues: https://github.com/xlp0/LandingPage/issues
- ArgoCD Slack: https://argoproj.github.io/community/join-slack/
