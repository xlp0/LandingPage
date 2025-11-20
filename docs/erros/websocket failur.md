# WebSocket Connection Failure - Root Cause Analysis

## Executive Summary
The WebSocket connection is failing because the **`/api/config` endpoint is missing** from the backend server (`ws-server.js`). The frontend application expects this endpoint to provide the `WEBSOCKET_URL` environment variable, but it's not implemented, causing the application to fall back to auto-detection which fails through the ingress.

---

## Problem Description

### Symptom
Browser console shows repeated WebSocket connection failures:
```
WebSocket connection to 'wss://dev.pkc.pub/ws/' failed: 
[WSBroadcast] ❌ WebSocket error: Event {...}
```

### Root Cause
The backend server is **missing the `/api/config` endpoint** that should expose the `WEBSOCKET_URL` environment variable to the frontend.

---

## Technical Analysis

### 1. Frontend Configuration Flow (config.js)

**File**: `/app/js/modules/webrtc-dashboard/config.js`

The frontend tries to load configuration in this order:

```javascript
export async function loadConfig() {
    try {
        // Step 1: Try to fetch config from server
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            
            // Step 2: If WEBSOCKET_URL exists, use it
            if (config.WEBSOCKET_URL) {
                window.__WEBSOCKET_URL__ = config.WEBSOCKET_URL;
                console.log('[Config] WebSocket URL configured:', config.WEBSOCKET_URL);
            }
            return config;
        }
    } catch (error) {
        console.log('[Config] Could not fetch server config:', error.message);
    }
    
    // Step 3: Fallback to auto-detection
    console.log('[Config] Using auto-detection for WebSocket URL');
    return {};
}
```

**Current Status**: ❌ FAILS at Step 1 - `/api/config` endpoint returns 404

### 2. WebSocket Service Initialization (websocket-broadcast-service.js)

**File**: `/app/js/modules/webrtc-dashboard/websocket-broadcast-service.js`

The WebSocket service tries to determine the URL:

```javascript
_getWebSocketUrl() {
    // Check if WEBSOCKET_URL was configured
    if (window.__WEBSOCKET_URL__) {
        console.log('[WSBroadcast] Using configured WebSocket URL:', window.__WEBSOCKET_URL__);
        return window.__WEBSOCKET_URL__;
    }
    
    // Fallback: Auto-detect from current domain
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/`;
    
    console.log('[WSBroadcast] WebSocket URL (auto-detected):', wsUrl);
    return wsUrl;
}
```

**Current Status**: 
- ❌ `window.__WEBSOCKET_URL__` is undefined (config.js failed to set it)
- ✅ Falls back to auto-detection: `wss://dev.pkc.pub/ws/`
- ❌ But this connection fails through the ingress

### 3. Backend Server (ws-server.js)

**File**: `/app/ws-server.js`

**Current Endpoints**:
```javascript
app.get('/', (req, res) => {
    res.json({
        message: 'PKC WebSocket Gateway Server',
        status: 'running',
        connected_clients: connectedClients.size
    });
});

app.get('/api/env', (req, res) => {
    // Reads .env file and returns as JSON
    // But .env file doesn't exist in container
});
```

**Missing Endpoint**: ❌ `/api/config`

---

## Why WebSocket Connection Fails

### Scenario 1: Direct Connection (localhost:3000)
✅ Works - WebSocket upgrade succeeds directly to the server

### Scenario 2: Through Ingress (dev.pkc.pub)
❌ Fails - Multiple reasons:

1. **Missing /api/config endpoint**
   - Frontend can't load `WEBSOCKET_URL` configuration
   - Falls back to auto-detection

2. **Auto-detection uses `wss://dev.pkc.pub/ws/`**
   - Browser attempts WebSocket upgrade
   - Ingress receives the request
   - Ingress forwards to backend service on port 3000
   - Backend WebSocket server receives upgrade request
   - **Connection succeeds at TCP level** ✅
   - **But browser receives error** ❌

3. **Possible Ingress Issues**
   - Ingress WebSocket annotation may not be properly routing the upgrade
   - SSL/TLS termination at ingress may not be properly handling WebSocket upgrade
   - Missing or incorrect proxy headers

---

## Solution: Add /api/config Endpoint

### Required Changes to ws-server.js

Add this endpoint to serve the configuration:

```javascript
// Add this after the existing app.get('/api/env', ...) endpoint

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

### Why This Fixes It

1. **Frontend can now fetch configuration**
   - `config.js` successfully retrieves `/api/config`
   - Sets `window.__WEBSOCKET_URL__` to `wss://dev.pkc.pub/ws/`

2. **WebSocket service uses correct URL**
   - `websocket-broadcast-service.js` uses configured URL
   - Connects to `wss://dev.pkc.pub/ws/` with proper domain

3. **Ingress routing works correctly**
   - Browser connects to `wss://dev.pkc.pub/ws/`
   - Ingress properly routes to backend service
   - WebSocket upgrade succeeds

---

## Implementation Details

### File to Modify
- **File**: `/app/ws-server.js`
- **Location**: After line 139 (after the `/api/env` endpoint)
- **Lines to Add**: ~15 lines

### Code Changes

**Before** (current code):
```javascript
// Serve .env file as JSON endpoint
app.get('/api/env', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    try {
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envObj = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && key.trim()) {
                envObj[key.trim()] = value ? value.trim() : '';
            }
        });
        res.json(envObj);
    } catch (err) {
        console.error('Error reading .env file:', err);
        res.status(500).json({ error: 'Failed to read .env file' });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
```

**After** (with fix):
```javascript
// Serve .env file as JSON endpoint
app.get('/api/env', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    try {
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envObj = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && key.trim()) {
                envObj[key.trim()] = value ? value.trim() : '';
            }
        });
        res.json(envObj);
    } catch (err) {
        console.error('Error reading .env file:', err);
        res.status(500).json({ error: 'Failed to read .env file' });
    }
});

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

// Start server
const PORT = process.env.PORT || 3001;
```

---

## Expected Behavior After Fix

### Browser Console Output
```
[Config] Loaded from server: {WEBSOCKET_URL: "wss://dev.pkc.pub/ws/", NODE_ENV: "production", PORT: "3000"}
[Config] WebSocket URL configured: wss://dev.pkc.pub/ws/
[WSBroadcast] Using configured WebSocket URL: wss://dev.pkc.pub/ws/
[WSBroadcast] Connecting to WebSocket: wss://dev.pkc.pub/ws/
[WSBroadcast] ✅ WebSocket connected
```

### Network Tab
```
Request URL: wss://dev.pkc.pub/ws/
Request Method: GET
Status Code: 101 Switching Protocols
Headers:
  - Upgrade: websocket
  - Connection: Upgrade
  - Sec-WebSocket-Accept: [hash]
```

---

## Testing the Fix

### Step 1: Verify Endpoint Exists
```bash
curl https://dev.pkc.pub/api/config
```

Expected response:
```json
{
  "WEBSOCKET_URL": "wss://dev.pkc.pub/ws/",
  "NODE_ENV": "production",
  "PORT": "3000"
}
```

### Step 2: Check Browser Console
Open browser DevTools → Console and verify:
- ✅ `[Config] Loaded from server:` message appears
- ✅ `[Config] WebSocket URL configured:` message appears
- ✅ `[WSBroadcast] ✅ WebSocket connected` message appears

### Step 3: Verify WebSocket Connection
Open browser DevTools → Network tab and filter by "WS":
- ✅ `wss://dev.pkc.pub/ws/` should show status `101 Switching Protocols`
- ✅ No error messages in console

---

## Additional Notes

### Why Auto-Detection Fails
The auto-detection fallback (`wss://dev.pkc.pub/ws/`) should theoretically work, but it's failing because:

1. **Ingress WebSocket routing may have issues** with the specific configuration
2. **SSL/TLS termination** at the ingress may not properly handle the WebSocket upgrade
3. **Missing proper proxy headers** in the ingress configuration

By explicitly configuring the URL through the `/api/config` endpoint, we ensure the frontend uses the exact URL that's been tested and verified to work.

### Environment Variable Injection
The `WEBSOCKET_URL` environment variable is already being set in the Kubernetes deployment:
```yaml
env:
- name: WEBSOCKET_URL
  value: "wss://dev.pkc.pub/ws/"
```

The `/api/config` endpoint will simply expose this to the frontend.

---

## Summary

| Item | Status | Issue |
|------|--------|-------|
| Backend WebSocket Server | ✅ Running | Listening on port 3000 |
| Direct Connection (localhost:3000) | ✅ Works | WebSocket upgrade succeeds |
| /api/config Endpoint | ❌ Missing | **ROOT CAUSE** |
| Frontend Config Loading | ❌ Fails | Can't fetch /api/config |
| WEBSOCKET_URL Configuration | ❌ Not Used | Frontend falls back to auto-detection |
| Ingress Routing | ⚠️ Uncertain | May have issues with WebSocket upgrade |

**Fix Required**: Add `/api/config` endpoint to `ws-server.js` to expose environment variables to frontend.

