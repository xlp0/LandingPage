# WebSocket Failure - Analysis Summary

## Problem
WebSocket connections to `wss://dev.pkc.pub/ws/` are failing repeatedly with connection errors.

---

## Root Cause
**The backend server is missing the `/api/config` endpoint.**

The frontend application (`config.js`) expects to fetch configuration from `/api/config` to get the `WEBSOCKET_URL` environment variable. When this endpoint doesn't exist (returns 404), the frontend falls back to auto-detection, which fails through the Kubernetes ingress.

---

## Technical Details

### What Happens Now (Broken)
1. Browser loads `https://dev.pkc.pub`
2. `config.js` tries to fetch `/api/config`
3. Backend returns `404 Not Found` ❌
4. Frontend logs: `[Config] Could not fetch server config`
5. Frontend falls back to auto-detection: `wss://dev.pkc.pub/ws/`
6. Browser attempts WebSocket connection
7. Ingress routing fails (WebSocket upgrade not properly handled)
8. Browser console: `WebSocket connection to 'wss://dev.pkc.pub/ws/' failed`

### What Should Happen (Fixed)
1. Browser loads `https://dev.pkc.pub`
2. `config.js` tries to fetch `/api/config`
3. Backend returns `{WEBSOCKET_URL: "wss://dev.pkc.pub/ws/", ...}` ✅
4. Frontend logs: `[Config] Loaded from server`
5. Frontend sets `window.__WEBSOCKET_URL__` to configured value
6. WebSocket service uses configured URL
7. Browser connects to `wss://dev.pkc.pub/ws/`
8. Ingress properly routes the WebSocket upgrade
9. Browser console: `[WSBroadcast] ✅ WebSocket connected`

---

## Solution

### Add Missing Endpoint
**File**: `/app/ws-server.js`  
**Location**: After line 155 (after `/api/env` endpoint)  
**Lines to Add**: 14 lines

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

## Why This Fixes It

### Current Endpoints
```
GET /                  → Returns server status (works)
GET /api/env          → Returns .env file contents (works, but .env doesn't exist)
GET /api/config       → ❌ MISSING (this is the problem)
```

### After Fix
```
GET /                  → Returns server status (works)
GET /api/env          → Returns .env file contents (works)
GET /api/config       → ✅ Returns configuration with WEBSOCKET_URL
```

### Frontend Behavior
- **Before**: Falls back to auto-detection → fails through ingress
- **After**: Uses configured URL from `/api/config` → works through ingress

---

## Implementation Checklist

- [ ] Add `/api/config` endpoint to `ws-server.js`
- [ ] Rebuild Docker image: `docker build -t henry768/landingpage:latest_landingpage .`
- [ ] Push to registry: `docker push henry768/landingpage:latest_landingpage`
- [ ] Restart deployments: `kubectl rollout restart deployment landingpage-dev`
- [ ] Test endpoint: `curl https://dev.pkc.pub/api/config`
- [ ] Verify in browser: Check console for `[Config] Loaded from server`
- [ ] Verify WebSocket: Check Network tab for `wss://dev.pkc.pub/ws/` with status `101`

---

## Testing

### Verify Endpoint Works
```bash
# Direct test
curl http://localhost:3000/api/config

# Expected response
{
  "WEBSOCKET_URL": null,
  "NODE_ENV": "development",
  "PORT": "3000"
}
```

### Verify in Browser
1. Open https://dev.pkc.pub
2. Open DevTools → Console
3. Look for: `[Config] Loaded from server: {WEBSOCKET_URL: "wss://dev.pkc.pub/ws/", ...}`
4. Look for: `[WSBroadcast] ✅ WebSocket connected`
5. Open DevTools → Network tab
6. Filter by "WS"
7. Should see `wss://dev.pkc.pub/ws/` with status `101 Switching Protocols`

---

## Files Provided

1. **WEBSOCKET_FAILURE_ANALYSIS.md** - Detailed technical analysis
2. **DEVELOPER_FIX_GUIDE.md** - Step-by-step fix guide
3. **CODE_DIFF.patch** - Exact code changes in patch format
4. **ANALYSIS_SUMMARY.md** - This file

---

## Key Points

✅ **Root Cause Identified**: Missing `/api/config` endpoint  
✅ **Solution Provided**: Add 14 lines of code  
✅ **No Infrastructure Changes Needed**: Only backend code change  
✅ **Environment Variables Already Set**: Kubernetes deployment already has `WEBSOCKET_URL`  
✅ **Frontend Already Supports It**: `config.js` already expects this endpoint  

---

## Questions for Developer

1. **Is the Docker image being built from the correct source?**
   - The source should have `ws-server.js` in the `/app` directory

2. **Are environment variables being injected correctly?**
   - Verify: `kubectl get deployment landingpage-dev -o yaml | grep WEBSOCKET_URL`

3. **Is the image being rebuilt after code changes?**
   - Must rebuild and push after modifying `ws-server.js`

---

## Next Steps

1. Send this analysis to the developer
2. Developer adds the `/api/config` endpoint
3. Developer rebuilds and pushes Docker image
4. Restart Kubernetes deployments
5. Test in browser
6. WebSocket should now connect successfully

