# Environment Configuration Guide

## 🎯 Overview

The WebRTC Dashboard supports configuration via environment variables (`.env` file). This allows you to customize the WebSocket URL for different deployments without changing code.

## 📋 Configuration Options

### `WEBSOCKET_URL` (Optional)

Explicitly set the WebSocket URL for the client to use.

**When to use:**
- Deploying to a public domain (e.g., `dev.pkc.pub`, `pkc.pub`)
- Using a reverse proxy with a different domain
- Custom WebSocket server setup

**When NOT to use (leave empty):**
- Local development (auto-detection works)
- Same domain as the app (auto-detection works)

**Examples:**

```env
# Development
WEBSOCKET_URL=wss://dev.pkc.pub/ws/

# Production
WEBSOCKET_URL=wss://pkc.pub/ws/

# Local development (optional, auto-detected)
WEBSOCKET_URL=ws://localhost:8765/ws/
```

### `NODE_ENV`

Set the Node.js environment.

```env
NODE_ENV=production
```

### `PORT`

Server port (default: 8765).

```env
PORT=8765
```

## 🚀 Deployment Scenarios

### Scenario 1: Local Development

**No `.env` needed** - auto-detection works:

```
Access: http://localhost:8765/...
WebSocket: ws://localhost:8765/ws/
```

### Scenario 2: dev.pkc.pub

**Create `.env`:**

```env
NODE_ENV=production
WEBSOCKET_URL=wss://dev.pkc.pub/ws/
```

**Result:**
```
Access: https://dev.pkc.pub/...
WebSocket: wss://dev.pkc.pub/ws/
```

### Scenario 3: pkc.pub (Production)

**Create `.env`:**

```env
NODE_ENV=production
WEBSOCKET_URL=wss://pkc.pub/ws/
```

**Result:**
```
Access: https://pkc.pub/...
WebSocket: wss://pkc.pub/ws/
```

### Scenario 4: Custom Reverse Proxy

If using Nginx/HAProxy with a different domain:

```env
NODE_ENV=production
WEBSOCKET_URL=wss://custom-domain.com/websocket/
```

## 📦 Docker Deployment

### Using Docker Compose

1. **Create `.env` file:**

```bash
cat > .env << EOF
NODE_ENV=production
WEBSOCKET_URL=wss://dev.pkc.pub/ws/
EOF
```

2. **Start container:**

```bash
docker-compose up -d --build
```

3. **Verify:**

```bash
docker-compose logs -f landingpage | grep "Config API"
```

Expected output:
```
[Config API] Serving config: { WEBSOCKET_URL: 'wss://dev.pkc.pub/ws/', NODE_ENV: 'production' }
```

### Using Docker CLI

```bash
docker run -d \
  -p 8765:8765 \
  -e WEBSOCKET_URL=wss://dev.pkc.pub/ws/ \
  -e NODE_ENV=production \
  --name webrtc-dashboard \
  your-registry/webrtc-dashboard:latest
```

## ☸️ Kubernetes Deployment

### Using ConfigMap

1. **Create ConfigMap from `.env`:**

```bash
kubectl create configmap webrtc-config \
  --from-literal=WEBSOCKET_URL=wss://dev.pkc.pub/ws/ \
  --from-literal=NODE_ENV=production \
  -n webrtc
```

2. **Update Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webrtc-dashboard
spec:
  template:
    spec:
      containers:
      - name: webrtc-dashboard
        image: your-registry/webrtc-dashboard:latest
        envFrom:
        - configMapRef:
            name: webrtc-config
```

### Using Secrets (for sensitive data)

```bash
kubectl create secret generic webrtc-secrets \
  --from-literal=WEBSOCKET_URL=wss://dev.pkc.pub/ws/ \
  -n webrtc
```

## 🔍 How It Works

### Configuration Loading Flow

```
1. Browser loads index.html
   ↓
2. config.js runs on page load
   ↓
3. Fetch /api/config from server
   ↓
4. Server reads .env file
   ↓
5. Returns config as JSON
   ↓
6. Sets window.__WEBSOCKET_URL__ if WEBSOCKET_URL is configured
   ↓
7. WebSocketBroadcastService checks window.__WEBSOCKET_URL__
   ↓
8. Uses configured URL OR falls back to auto-detection
```

### Console Output

**With configured URL:**
```javascript
[Config] Loaded from server: { WEBSOCKET_URL: 'wss://dev.pkc.pub/ws/', NODE_ENV: 'production' }
[Config] WebSocket URL configured: wss://dev.pkc.pub/ws/
[WSBroadcast] Using configured WebSocket URL: wss://dev.pkc.pub/ws/
```

**With auto-detection:**
```javascript
[Config] Could not fetch server config: ...
[Config] Using auto-detection for WebSocket URL
[WSBroadcast] WebSocket URL (auto-detected): wss://dev.pkc.pub/ws/
```

## 🔐 Security Notes

- **Never commit `.env` to Git** - add to `.gitignore`
- Use `.env.example` to document available options
- For production, use secrets management (Kubernetes Secrets, AWS Secrets Manager, etc.)
- Don't expose sensitive URLs in client-side code

## ✅ Verification Checklist

After deployment:

1. **Check server logs:**
   ```bash
   docker-compose logs -f landingpage | grep "Config API"
   ```

2. **Check browser console:**
   - Open DevTools → Console
   - Look for `[Config]` and `[WSBroadcast]` messages
   - Verify correct WebSocket URL is being used

3. **Test WebSocket connection:**
   ```bash
   # From browser console
   fetch('/api/config').then(r => r.json()).then(console.log)
   ```

4. **Verify connection:**
   - Create a room
   - Join from another browser
   - Check participant count updates
   - Send a message

## 🆘 Troubleshooting

### Issue: WebSocket still using localhost

**Check:**
1. Is `.env` file present?
2. Is `WEBSOCKET_URL` set correctly?
3. Did you restart the server?
4. Hard refresh browser (`Cmd+Shift+R`)

**Solution:**
```bash
# Verify .env exists
cat .env

# Restart server
docker-compose restart landingpage

# Check logs
docker-compose logs -f landingpage | grep Config
```

### Issue: Config API returns null

**Check:**
1. Is `dotenv` installed? (`npm list dotenv`)
2. Is `.env` file readable?
3. Is `WEBSOCKET_URL` set in `.env`?

**Solution:**
```bash
# Check .env file
cat .env

# Reinstall dependencies
npm install

# Restart server
docker-compose restart landingpage
```

### Issue: WebSocket connection fails

**Check:**
1. Is the URL correct?
2. Is the server running?
3. Is the WebSocket endpoint accessible?

**Solution:**
```bash
# Test WebSocket endpoint
wscat -c wss://dev.pkc.pub/ws/

# Check server logs
docker-compose logs -f landingpage | grep WebSocket
```

## 📝 Example Deployments

### Example 1: Local Development

`.env`:
```env
NODE_ENV=development
# WEBSOCKET_URL not set - auto-detection
```

### Example 2: Development Server

`.env`:
```env
NODE_ENV=production
WEBSOCKET_URL=wss://dev.pkc.pub/ws/
PORT=8765
```

### Example 3: Production Server

`.env`:
```env
NODE_ENV=production
WEBSOCKET_URL=wss://pkc.pub/ws/
PORT=8765
```

### Example 4: Kubernetes

```bash
kubectl create configmap webrtc-config \
  --from-literal=NODE_ENV=production \
  --from-literal=WEBSOCKET_URL=wss://dev.pkc.pub/ws/ \
  -n webrtc
```

## 🎯 Best Practices

1. **Use auto-detection when possible** - simpler and more flexible
2. **Only set WEBSOCKET_URL when necessary** - reverse proxy, custom domain
3. **Use environment variables for deployment** - don't hardcode URLs
4. **Document your configuration** - keep `.env.example` updated
5. **Test after deployment** - verify WebSocket connection in browser console
6. **Use secrets management** - Kubernetes Secrets, not plain text files
