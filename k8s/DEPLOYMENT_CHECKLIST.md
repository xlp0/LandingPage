# ArgoCD Deployment Checklist

Use this checklist to ensure a smooth deployment of THK Mesh Landing Page with ArgoCD.

## Pre-Deployment Checklist

### ✅ Prerequisites

- [ ] ArgoCD is installed and accessible at https://argocd.pkc.pub
- [ ] You have access to ArgoCD (username/password or SSO)
- [ ] kubectl is configured and connected to your cluster
- [ ] GitHub repository is accessible: https://github.com/xlp0/LandingPage
- [ ] Docker image exists: `henry768/landingpage:latest_landingpage`

### ✅ Verify Files

- [ ] `k8s/deployment-dev-with-configmap.yaml` exists
- [ ] `k8s/configmap-dev.yaml` exists
- [ ] `k8s/service.yaml` exists
- [ ] `k8s/ingress.yaml` exists
- [ ] `k8s/argocd-simple.yaml` exists

### ✅ Configuration Review

- [ ] ConfigMap has correct WebSocket URL: `wss://dev.pkc.pub/ws/`
- [ ] Zitadel Client ID is set: `348373619962871815`
- [ ] Ingress host is correct: `dev.pkc.pub`
- [ ] Docker image tag is correct: `latest_landingpage`
- [ ] Namespace is correct: `default`

---

## Deployment Steps

### Step 1: Create ArgoCD Application

Choose one method:

#### Method A: ArgoCD UI (Recommended for First Time)

- [ ] Open https://argocd.pkc.pub/applications
- [ ] Click "New App" button
- [ ] Copy YAML from `k8s/argocd-simple.yaml`
- [ ] Paste into the YAML editor
- [ ] Click "Create"
- [ ] Verify application appears in the list

#### Method B: kubectl

```bash
kubectl apply -f k8s/argocd-simple.yaml
```

- [ ] Command executed successfully
- [ ] No errors in output

#### Method C: ArgoCD CLI

```bash
argocd app create -f k8s/argocd-application.yaml
```

- [ ] Command executed successfully
- [ ] Application created

### Step 2: Verify Application Creation

- [ ] Application appears in ArgoCD UI
- [ ] Application name: `thkmesh-landingpage`
- [ ] Status shows "OutOfSync" or "Syncing"
- [ ] No errors in application details

### Step 3: Initial Sync

If auto-sync is not enabled or you want to sync manually:

```bash
argocd app sync thkmesh-landingpage
```

- [ ] Sync initiated
- [ ] Watch sync progress in UI
- [ ] All resources show "Synced"
- [ ] All resources show "Healthy"

### Step 4: Verify Kubernetes Resources

```bash
# Check all resources
kubectl get all -l app=landingpage-dev

# Check ConfigMap
kubectl get configmap landingpage-dev-config

# Check Service
kubectl get svc landingpage-dev

# Check Ingress
kubectl get ingress landingpage-dev-ingress
```

- [ ] Deployment exists and shows 1/1 ready
- [ ] Pod is running
- [ ] Service exists
- [ ] Ingress exists
- [ ] ConfigMap exists

### Step 5: Verify Pod Health

```bash
# Check pod status
kubectl get pods -l app=landingpage-dev

# Check pod logs
kubectl logs -l app=landingpage-dev --tail=50

# Describe pod for events
kubectl describe pod -l app=landingpage-dev
```

- [ ] Pod status is "Running"
- [ ] No error messages in logs
- [ ] No warning events in pod description
- [ ] Health checks are passing

### Step 6: Test Application

```bash
# Test health endpoint
curl https://dev.pkc.pub/health

# Or port-forward for local testing
kubectl port-forward deployment/landingpage-dev 3000:3000
curl http://localhost:3000/health
```

- [ ] Health endpoint returns 200 OK
- [ ] Health response shows correct status
- [ ] Application is accessible at https://dev.pkc.pub
- [ ] WebSocket connection works

### Step 7: Verify ArgoCD Sync

- [ ] ArgoCD UI shows "Synced" status
- [ ] ArgoCD UI shows "Healthy" status
- [ ] Resource tree displays all resources
- [ ] No sync errors or warnings

---

## Post-Deployment Verification

### ✅ Functional Tests

- [ ] Landing page loads at https://dev.pkc.pub
- [ ] No console errors in browser
- [ ] WebSocket connects successfully
- [ ] OAuth login works (if configured)
- [ ] All static assets load correctly

### ✅ Monitoring

- [ ] Health endpoint accessible: https://dev.pkc.pub/health
- [ ] Logs are clean (no errors)
- [ ] Resource usage is within limits
- [ ] Pod is not restarting

### ✅ ArgoCD Configuration

- [ ] Auto-sync is enabled (if desired)
- [ ] Self-heal is enabled (if desired)
- [ ] Auto-prune is enabled (if desired)
- [ ] Sync policy matches requirements

---

## Testing GitOps Workflow

### Test 1: Configuration Change

- [ ] Edit `k8s/configmap-dev.yaml` locally
- [ ] Change a value (e.g., add a comment)
- [ ] Commit and push to GitHub
- [ ] Wait for ArgoCD to detect change (max 3 min)
- [ ] Verify ArgoCD shows "OutOfSync"
- [ ] If auto-sync enabled, verify it syncs automatically
- [ ] If manual sync, click "Sync" in UI
- [ ] Verify pods restart with new config
- [ ] Verify change is reflected in application

### Test 2: Application Update

- [ ] Update image tag in `k8s/deployment-dev-with-configmap.yaml`
- [ ] Commit and push to GitHub
- [ ] Wait for ArgoCD to detect change
- [ ] Verify sync occurs
- [ ] Verify new pods are created
- [ ] Verify old pods are terminated
- [ ] Verify application works with new version

### Test 3: Self-Heal

- [ ] Manually edit a resource with kubectl
  ```bash
  kubectl edit deployment landingpage-dev
  # Change replicas to 2
  ```
- [ ] Wait for ArgoCD to detect drift
- [ ] Verify ArgoCD shows "OutOfSync"
- [ ] If self-heal enabled, verify it reverts change
- [ ] Verify replicas return to 1

---

## Troubleshooting Checklist

### If Application Won't Sync

- [ ] Check ArgoCD application logs
- [ ] Verify GitHub repository is accessible
- [ ] Check for YAML syntax errors
- [ ] Verify namespace exists
- [ ] Check ArgoCD has permissions to namespace

### If Pods Won't Start

- [ ] Check pod events: `kubectl describe pod -l app=landingpage-dev`
- [ ] Check pod logs: `kubectl logs -l app=landingpage-dev`
- [ ] Verify image exists and is pullable
- [ ] Check ConfigMap exists
- [ ] Verify resource limits are not too low

### If Health Checks Fail

- [ ] Verify `/health` endpoint exists in application
- [ ] Check if port 3000 is correct
- [ ] Verify health check timing (initialDelaySeconds)
- [ ] Check application logs for errors

### If Ingress Not Working

- [ ] Verify Ingress controller is installed
- [ ] Check Ingress resource: `kubectl describe ingress landingpage-dev-ingress`
- [ ] Verify DNS points to cluster
- [ ] Check TLS certificate (if using HTTPS)
- [ ] Verify ingress class is correct

---

## Rollback Checklist

### If Something Goes Wrong

#### Option 1: ArgoCD UI Rollback

- [ ] Open application in ArgoCD UI
- [ ] Click "History and Rollback"
- [ ] Select previous working revision
- [ ] Click "Rollback"
- [ ] Verify rollback completes
- [ ] Test application

#### Option 2: Git Revert

- [ ] Identify last working commit
- [ ] Revert to that commit
  ```bash
  git revert <commit-hash>
  git push
  ```
- [ ] Wait for ArgoCD to sync
- [ ] Verify application is restored

#### Option 3: kubectl Rollback

- [ ] Rollback deployment
  ```bash
  kubectl rollout undo deployment/landingpage-dev
  ```
- [ ] Verify pods are restored
- [ ] Test application

---

## Cleanup Checklist (If Needed)

### To Remove Application

- [ ] Delete ArgoCD application
  ```bash
  argocd app delete thkmesh-landingpage
  # or
  kubectl delete application -n argocd thkmesh-landingpage
  ```
- [ ] Verify all resources are removed
- [ ] Check for orphaned resources
  ```bash
  kubectl get all -l app=landingpage-dev
  ```

---

## Documentation Checklist

### Files to Keep Handy

- [ ] `ARGOCD_QUICK_START.md` - Quick reference
- [ ] `ARGOCD_DEPLOYMENT_GUIDE.md` - Complete guide
- [ ] `ARCHITECTURE.md` - System architecture
- [ ] `DEPLOYMENT_CHECKLIST.md` - This file
- [ ] `README.md` - Overview

### Share with Team

- [ ] Share ArgoCD URL: https://argocd.pkc.pub
- [ ] Share application URL: https://dev.pkc.pub
- [ ] Share documentation location
- [ ] Document any custom configurations
- [ ] Note any known issues or workarounds

---

## Success Criteria

Your deployment is successful when:

✅ ArgoCD application shows "Synced" and "Healthy"  
✅ All Kubernetes resources are created and running  
✅ Application is accessible at https://dev.pkc.pub  
✅ Health endpoint returns 200 OK  
✅ WebSocket connections work  
✅ GitOps workflow functions (changes sync automatically)  
✅ No errors in logs  
✅ Monitoring shows healthy metrics  

---

## Next Steps After Successful Deployment

- [ ] Set up monitoring/alerting (Prometheus, Grafana)
- [ ] Configure backup strategy
- [ ] Document runbook for common issues
- [ ] Set up production environment
- [ ] Configure CI/CD pipeline for image builds
- [ ] Implement secrets management (Sealed Secrets, Vault)
- [ ] Set up log aggregation (ELK, Loki)
- [ ] Configure auto-scaling (HPA)
- [ ] Implement network policies
- [ ] Set up disaster recovery plan

---

## Notes

Use this space to document any custom configurations or issues encountered:

```
Date: ___________
Issue/Note: 




Resolution: 




```

---

## Quick Commands Reference

```bash
# Check application status
kubectl get application -n argocd thkmesh-landingpage

# Watch pods
kubectl get pods -l app=landingpage-dev -w

# View logs
kubectl logs -l app=landingpage-dev -f

# Sync application
argocd app sync thkmesh-landingpage

# Get application details
argocd app get thkmesh-landingpage

# Restart deployment
kubectl rollout restart deployment/landingpage-dev

# Check health
curl https://dev.pkc.pub/health

# Port forward for local testing
kubectl port-forward deployment/landingpage-dev 3000:3000
```

---

**Good luck with your deployment! 🚀**
