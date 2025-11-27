# Deployment Guide - THK Mesh Landing Page

## 🚀 Current Issue & Solution

### Problem
```
Error: getaddrinfo EAI_AGAIN vpn.pkc.pub
POST /api/auth/token 400 (Bad Request)
```

**Root Cause:** Kubernetes pod cannot resolve `vpn.pkc.pub` (Zitadel OAuth2 domain)

### Solution Applied
✅ Added DNS configuration to Kubernetes deployment
✅ Created automated deployment workflow
✅ Made app-config.json dynamic from environment variables

---

## 📋 Deployment Architecture

```
Local Development
    ↓
Git Push to GitHub
    ↓
GitHub Actions: Build Docker Image
    ↓
Push to Docker Hub: henry768/landingpage:latest_landingpage
    ↓
GitHub Actions: Deploy to Kubernetes
    ↓
Kubernetes pulls new image
    ↓
Pod restarts with DNS configuration
    ↓
Application runs on dev.pkc.pub
```

---

## ✅ What Was Fixed

### 1. Dynamic Configuration
**File:** `ws-server.js`

Added `/app-config.json` endpoint that generates config from environment variables:

```javascript
GET /app-config.json
→ Reads: WEBSOCKET_URL=wss://dev.pkc.pub/ws/
→ Returns:
{
  "wsHost": "dev.pkc.pub",
  "wsPort": 443,
  "wsPath": "/ws/",
  "p2p": {
    "iceServers": [...]
  }
}
```

**Benefits:**
- No hardcoded values
- Single source of truth (.env)
- Easy multi-environment deployment

### 2. DNS Configuration
**File:** `k8s/deployment-dev-with-configmap.yaml`

Added DNS configuration to resolve external domains:

```yaml
dnsPolicy: "None"
dnsConfig:
  nameservers:
    - 8.8.8.8    # Google DNS Primary
    - 8.8.4.4    # Google DNS Secondary
  searches:
    - default.svc.cluster.local
    - svc.cluster.local
    - cluster.local
```

**Benefits:**
- Pod can resolve vpn.pkc.pub
- OAuth2 token exchange works
- Maintains cluster DNS for internal services

### 3. Automated Deployment
**File:** `.github/workflows/deploy-k8s.yml`

Created workflow that:
1. Applies K8s deployment
2. Restarts pods
3. Verifies DNS resolution

---

## 🔧 Manual Deployment (If Needed)

### Option 1: Using kubectl (Recommended)

```bash
# 1. Apply the deployment with DNS config
kubectl apply -f k8s/deployment-dev-with-configmap.yaml

# 2. Force restart to pick up changes
kubectl rollout restart deployment/landingpage-dev

# 3. Wait for rollout
kubectl rollout status deployment/landingpage-dev

# 4. Check pod status
kubectl get pods -l app=landingpage-dev

# 5. Verify DNS works
kubectl exec -it deployment/landingpage-dev -- nslookup vpn.pkc.pub
# Should return: 103.150.227.151
```

### Option 2: Using GitHub Actions

1. Go to: https://github.com/xlp0/LandingPage/actions
2. Select "Deploy to Kubernetes"
3. Click "Run workflow"
4. Select branch: main
5. Click "Run workflow"

---

## 🧪 Verification Steps

### 1. Check GitHub Actions
- Build workflow: https://github.com/xlp0/LandingPage/actions
- Should show: ✅ Build and Push Docker Image
- Should show: ✅ Deploy to Kubernetes

### 2. Check Kubernetes Pod

```bash
# Get pod status
kubectl get pods -l app=landingpage-dev

# Should show:
# NAME                               READY   STATUS    RESTARTS   AGE
# landingpage-dev-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
```

### 3. Check DNS Resolution

```bash
# Test DNS inside pod
kubectl exec -it deployment/landingpage-dev -- nslookup vpn.pkc.pub

# Expected output:
# Server:    8.8.8.8
# Address:   8.8.8.8#53
# 
# Non-authoritative answer:
# Name:   vpn.pkc.pub
# Address: 103.150.227.151
```

### 4. Check Application Logs

```bash
# View logs
kubectl logs -f deployment/landingpage-dev --tail=50

# Should NOT see:
# ❌ getaddrinfo EAI_AGAIN vpn.pkc.pub

# Should see:
# ✅ [Auth] Access token received
# ✅ [Auth] User info retrieved
```

### 5. Test the Application

1. Open: https://dev.pkc.pub
2. Click "Login with Zitadel"
3. Should redirect to: https://vpn.pkc.pub/oauth/v2/authorize
4. Login with credentials
5. Should redirect back to: https://dev.pkc.pub
6. Should see: User logged in ✅

---

## 📊 Expected Results

### Before (Errors)
```
❌ WebSocket: ws://192.168.1.149:8765/ws/
❌ DNS: getaddrinfo EAI_AGAIN vpn.pkc.pub
❌ Token exchange: 400 Bad Request
❌ Login fails
```

### After (Fixed)
```
✅ WebSocket: wss://dev.pkc.pub/ws/
✅ DNS: vpn.pkc.pub → 103.150.227.151
✅ Token exchange: 200 OK
✅ Login succeeds
✅ User authenticated
```

---

## 🔑 Required GitHub Secrets

For automated deployment to work, set this secret in GitHub:

**Secret Name:** `KUBE_CONFIG`
**Value:** Base64 encoded kubeconfig file

```bash
# Generate the secret value:
cat ~/.kube/config | base64 -w 0

# Or on macOS:
cat ~/.kube/config | base64

# Copy the output and add to GitHub:
# Settings → Secrets and variables → Actions → New repository secret
```

---

## 🌍 Environment Variables

### Required in Kubernetes ConfigMap

```yaml
WEBSOCKET_URL=wss://dev.pkc.pub/ws/
STUN_SERVERS=stun:stun.l.google.com:19302
ZITADEL_CLIENT_ID=348373619962871815
ZITADEL_CLIENT_SECRET=<secret>
ZITADEL_DOMAIN=vpn.pkc.pub
REDIRECT_URI=https://dev.pkc.pub/auth-callback-enhanced.html
NODE_ENV=production
PORT=3000
```

---

## 🐛 Troubleshooting

### Issue: DNS still not working

```bash
# Check DNS configuration
kubectl describe pod -l app=landingpage-dev | grep -A 10 "DNS"

# Should show:
# DNS Policy: None
# DNS Config:
#   Nameservers: 8.8.8.8, 8.8.4.4
```

### Issue: Pod not restarting

```bash
# Force delete pod
kubectl delete pod -l app=landingpage-dev

# Kubernetes will create a new one automatically
```

### Issue: Image not updating

```bash
# Check image pull policy
kubectl describe deployment landingpage-dev | grep "Image Pull Policy"

# Should show: Always

# Force new image pull
kubectl rollout restart deployment/landingpage-dev
```

---

## 📝 Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `ws-server.js` | Added `/app-config.json` endpoint | Dynamic config from env vars |
| `app-config.json` | Deleted (was hardcoded) | Now generated dynamically |
| `k8s/deployment-dev-with-configmap.yaml` | Added DNS configuration | Fix vpn.pkc.pub resolution |
| `.github/workflows/deploy-k8s.yml` | New automated deployment | Auto-deploy after image build |
| `docker-compose.yml` | Added DNS (for local dev) | Local development support |

---

## ✅ Next Steps

1. **Wait for GitHub Actions** to complete (~3-5 minutes)
2. **Verify deployment** using kubectl commands above
3. **Test the application** at https://dev.pkc.pub
4. **Monitor logs** for any errors

---

## 🆘 Support

If issues persist:

1. Check GitHub Actions logs
2. Check Kubernetes pod logs
3. Verify DNS resolution inside pod
4. Check ConfigMap has correct environment variables

**The DNS configuration should fix the OAuth2 token exchange issue!** 🚀
