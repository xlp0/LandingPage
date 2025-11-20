# WebSocket Configuration Fix - Developer Guide

## Quick Summary
The WebSocket connection fails because the backend is missing the `/api/config` endpoint that the frontend expects to load configuration from.

---

## The Fix (Copy-Paste Ready)

### File to Edit
`/app/ws-server.js`

### Location
Add this code after the `/api/env` endpoint (around line 155) and before the "Start server" comment.

### Code to Add

```javascript
// Serve configuration endpoint
app.get('/api/config', (req, res) => {
    const config = {
        WEBSOCKET_URL: process.env.WEBSOCKET_URL || null,
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3000
    };
    
    console.log('[Server] Serving /api/config:', config);
    
    res.json(config);
});
```

---

## Why This Works

### Current Flow (Broken)
```
1. Browser loads app
2. config.js tries: fetch('/api/config')
3. Backend returns: 404 Not Found ❌
4. Frontend falls back to auto-detection
5. Auto-detection tries: wss://dev.pkc.pub/ws/
6. Ingress routing fails ❌
7. WebSocket connection fails ❌
```

### Fixed Flow
```
1. Browser loads app
2. config.js tries: fetch('/api/config')
3. Backend returns: {WEBSOCKET_URL: "wss://dev.pkc.pub/ws/"} ✅
4. Frontend uses configured URL
5. WebSocket connects to: wss://dev.pkc.pub/ws/ ✅
6. Ingress properly routes ✅
7. WebSocket connection succeeds ✅
```

---

## Testing After Fix

### Test 1: Verify Endpoint
```bash
curl http://localhost:3000/api/config
```

Expected:
```json
{
  "WEBSOCKET_URL": null,
  "NODE_ENV": "development",
  "PORT": "3000"
}
```

### Test 2: With Environment Variables
```bash
WEBSOCKET_URL=wss://dev.pkc.pub/ws/ NODE_ENV=production PORT=3000 node ws-server.js
```

Then:
```bash
curl http://localhost:3000/api/config
```

Expected:
```json
{
  "WEBSOCKET_URL": "wss://dev.pkc.pub/ws/",
  "NODE_ENV": "production",
  "PORT": "3000"
}
```

### Test 3: Browser Console
After deploying the fix, open browser DevTools and check console for:
```
[Config] Loaded from server: {WEBSOCKET_URL: "wss://dev.pkc.pub/ws/", ...}
[Config] WebSocket URL configured: wss://dev.pkc.pub/ws/
[WSBroadcast] ✅ WebSocket connected
```

---

## Files Involved

### Frontend Files (No Changes Needed)
- `/app/js/modules/webrtc-dashboard/config.js` - Already expects `/api/config`
- `/app/js/modules/webrtc-dashboard/websocket-broadcast-service.js` - Already uses `window.__WEBSOCKET_URL__`

### Backend File (Needs Fix)
- `/app/ws-server.js` - Missing `/api/config` endpoint

---

## Deployment Steps

1. **Update the source code** with the fix above
2. **Rebuild Docker image**:
   ```bash
   docker build -t henry768/landingpage:latest_landingpage .
   docker push henry768/landingpage:latest_landingpage
   ```

3. **Restart Kubernetes deployments**:
   ```bash
   kubectl rollout restart deployment landingpage-dev
   kubectl rollout restart deployment landingpage-test
   kubectl rollout restart deployment landingpage-pkc
   ```

4. **Verify in browser**:
   - Open https://dev.pkc.pub
   - Check browser console
   - Verify WebSocket connects (Network tab → WS filter)

---

## What Environment Variables Are Available

The `/api/config` endpoint will expose:
- `WEBSOCKET_URL` - Set in Kubernetes deployment
- `NODE_ENV` - Set in Kubernetes deployment
- `PORT` - Set in Kubernetes deployment

These are already being injected by Kubernetes, so no additional configuration is needed.

---

## Troubleshooting

### If endpoint still returns 404
- Make sure the code is added to the correct file: `/app/ws-server.js`
- Make sure it's added BEFORE the "Start server" section
- Make sure the Docker image was rebuilt and pushed
- Make sure Kubernetes pods were restarted

### If WEBSOCKET_URL is null
- Check that the environment variable is set in Kubernetes deployment
- Verify with: `kubectl get deployment landingpage-dev -o yaml | grep WEBSOCKET_URL`

### If WebSocket still doesn't connect
- Check browser console for any other errors
- Verify ingress is properly configured
- Test direct connection to pod: `kubectl port-forward svc/landingpage-dev-service 3000:3000`

---

## Questions?

Refer to the detailed analysis: `/tmp/WEBSOCKET_FAILURE_ANALYSIS.md`

