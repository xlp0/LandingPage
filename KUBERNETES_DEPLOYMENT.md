# WebRTC Dashboard - Kubernetes Deployment Guide

## 🚢 Kubernetes Deployment

### Prerequisites

- Kubernetes cluster running
- `kubectl` configured
- Docker image built and pushed to registry

## 📦 Deployment Configuration

### 1. Deployment YAML

Create `k8s/webrtc-dashboard-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webrtc-dashboard
  labels:
    app: webrtc-dashboard
spec:
  replicas: 1  # Start with 1, scale as needed
  selector:
    matchLabels:
      app: webrtc-dashboard
  template:
    metadata:
      labels:
        app: webrtc-dashboard
    spec:
      containers:
      - name: webrtc-dashboard
        image: your-registry/webrtc-dashboard:latest
        ports:
        - containerPort: 8765
          name: http-ws
          protocol: TCP
        env:
        - name: PORT
          value: "8765"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 8765
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8765
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2. Service YAML

Create `k8s/webrtc-dashboard-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webrtc-dashboard
  labels:
    app: webrtc-dashboard
spec:
  type: ClusterIP
  ports:
  - port: 8765
    targetPort: 8765
    protocol: TCP
    name: http-ws
  selector:
    app: webrtc-dashboard
```

### 3. Ingress YAML (for dev.pkc.pub)

Create `k8s/webrtc-dashboard-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webrtc-dashboard
  annotations:
    # Enable WebSocket support
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/websocket-services: "webrtc-dashboard"
    
    # SSL/TLS
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    
    # CORS if needed
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - dev.pkc.pub
    secretName: dev-pkc-pub-tls
  rules:
  - host: dev.pkc.pub
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: webrtc-dashboard
            port:
              number: 8765
```

## 🚀 Deployment Steps

### 1. Build Docker Image

```bash
# Build image
docker build -t your-registry/webrtc-dashboard:latest .

# Push to registry
docker push your-registry/webrtc-dashboard:latest
```

### 2. Apply Kubernetes Manifests

```bash
# Create namespace (optional)
kubectl create namespace webrtc

# Apply configurations
kubectl apply -f k8s/webrtc-dashboard-deployment.yaml -n webrtc
kubectl apply -f k8s/webrtc-dashboard-service.yaml -n webrtc
kubectl apply -f k8s/webrtc-dashboard-ingress.yaml -n webrtc
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n webrtc

# Check service
kubectl get svc -n webrtc

# Check ingress
kubectl get ingress -n webrtc

# View logs
kubectl logs -f deployment/webrtc-dashboard -n webrtc
```

## 🔧 WebSocket Configuration

### CRITICAL: Ingress Annotations for WebSocket

```yaml
annotations:
  # WebSocket timeout (1 hour)
  nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
  
  # Enable WebSocket upgrade
  nginx.ingress.kubernetes.io/websocket-services: "webrtc-dashboard"
  
  # Connection upgrade headers
  nginx.ingress.kubernetes.io/configuration-snippet: |
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
```

## 🐛 Troubleshooting

### Issue: WebSocket Connection Failed

**Symptom:**
```
WebSocket connection to 'ws://localhost:8765/ws/' failed
```

**Cause:** Browser cache loading old JavaScript

**Solution:**
```bash
# 1. Bump version in index.html
# Change: ?v=3.0 → ?v=4.0

# 2. Rebuild and redeploy
docker build -t your-registry/webrtc-dashboard:v4.0 .
docker push your-registry/webrtc-dashboard:v4.0

# 3. Update deployment
kubectl set image deployment/webrtc-dashboard \
  webrtc-dashboard=your-registry/webrtc-dashboard:v4.0 -n webrtc

# 4. Force browser refresh
# Ctrl+Shift+R or Cmd+Shift+R
```

### Issue: WebSocket Connects but Disconnects

**Check Ingress Timeout:**
```bash
kubectl describe ingress webrtc-dashboard -n webrtc
```

**Increase timeout:**
```yaml
nginx.ingress.kubernetes.io/proxy-read-timeout: "86400"  # 24 hours
```

### Issue: 502 Bad Gateway

**Check pod status:**
```bash
kubectl get pods -n webrtc
kubectl logs deployment/webrtc-dashboard -n webrtc
```

**Check service endpoints:**
```bash
kubectl get endpoints webrtc-dashboard -n webrtc
```

## 📊 Monitoring

### Check WebSocket Connections

```bash
# View logs
kubectl logs -f deployment/webrtc-dashboard -n webrtc | grep WebSocket

# Should see:
# WebSocket server listening on port 8765
# Client connected
# Broadcasting message type "room-created"
```

### Health Checks

```bash
# Check pod health
kubectl get pods -n webrtc -w

# Describe pod
kubectl describe pod <pod-name> -n webrtc

# Port forward for testing
kubectl port-forward deployment/webrtc-dashboard 8765:8765 -n webrtc
```

## 🔄 Rolling Updates

```bash
# Update image
kubectl set image deployment/webrtc-dashboard \
  webrtc-dashboard=your-registry/webrtc-dashboard:v2.0 -n webrtc

# Check rollout status
kubectl rollout status deployment/webrtc-dashboard -n webrtc

# Rollback if needed
kubectl rollout undo deployment/webrtc-dashboard -n webrtc
```

## 📈 Scaling

### Horizontal Scaling

**⚠️ WARNING:** WebRTC Dashboard uses in-memory room state. Scaling to multiple replicas requires:

1. **Shared state storage** (Redis, etc.)
2. **Session affinity** (sticky sessions)

```yaml
# For now, keep replicas: 1
spec:
  replicas: 1
```

### Vertical Scaling

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## 🔐 Security

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: webrtc-dashboard-policy
spec:
  podSelector:
    matchLabels:
      app: webrtc-dashboard
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8765
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53  # DNS
```

## 🎯 Production Checklist

- ✅ SSL/TLS certificate configured
- ✅ WebSocket timeout set to high value
- ✅ Resource limits defined
- ✅ Health checks configured
- ✅ Logging enabled
- ✅ Monitoring setup
- ✅ Backup strategy
- ✅ Rollback plan
- ✅ Cache busting enabled (version query params)

## 📝 Cache Busting Strategy

To force browser cache refresh after deployment:

1. **Bump version in HTML:**
   ```html
   <script src="dashboard-manager.js?v=4.0"></script>
   ```

2. **Use commit hash:**
   ```bash
   VERSION=$(git rev-parse --short HEAD)
   sed -i "s/?v=[0-9.]*/?v=$VERSION/g" index.html
   ```

3. **Add to CI/CD:**
   ```yaml
   # .github/workflows/deploy.yml
   - name: Update cache version
     run: |
       VERSION=$(date +%s)
       find . -name "*.html" -exec sed -i "s/?v=[0-9.]*/?v=$VERSION/g" {} \;
   ```

## 🌐 Multi-Environment Setup

### Development (dev.pkc.pub)
```yaml
host: dev.pkc.pub
replicas: 1
resources: minimal
```

### Production (pkc.pub)
```yaml
host: pkc.pub
replicas: 1  # or more with shared state
resources: production-grade
monitoring: enabled
```

## 📞 Support

If WebSocket still fails:
1. Check browser console for actual URL
2. Verify ingress annotations
3. Test WebSocket directly: `wscat -c wss://dev.pkc.pub/ws/`
4. Check pod logs for connection attempts
