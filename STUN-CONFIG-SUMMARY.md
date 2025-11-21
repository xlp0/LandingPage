# STUN Server Configuration Summary

## ✅ What We Accomplished

Made STUN servers fully configurable via environment variables, just like WebSocket URLs!

## 🎯 How It Works

### Configuration Priority (Highest to Lowest):

1. **Environment Variable** → `STUN_SERVERS` in docker-compose.yml or .env
2. **app-config.json** → Local development fallback
3. **Default Google STUN** → Last resort if nothing else is configured

### Environment Variable Format:

```bash
# Single STUN server
STUN_SERVERS=stun:your-server.com:3478

# Multiple STUN servers (comma-separated)
STUN_SERVERS=stun:primary.com:3478,stun:backup.com:3478

# Local STUN server
STUN_SERVERS=stun:192.168.1.149:7302
```

## 📝 Quick Start Examples

### Example 1: Docker Compose (Production)

```yaml
services:
  landingpage:
    environment:
      - WEBSOCKET_URL=wss://your-domain.com/ws/
      - STUN_SERVERS=stun:your-stun-server.com:3478
```

### Example 2: Docker Compose (Local Network)

```yaml
services:
  landingpage:
    environment:
      - WEBSOCKET_URL=ws://192.168.1.149:8765/ws/
      - STUN_SERVERS=stun:192.168.1.149:7302
```

### Example 3: .env File (Local Development)

```bash
WEBSOCKET_URL=ws://localhost:8765/ws/
STUN_SERVERS=stun:localhost:7302
```

### Example 4: Multiple STUN Servers (Redundancy)

```yaml
services:
  landingpage:
    environment:
      - STUN_SERVERS=stun:primary.example.com:3478,stun:backup.example.com:3478,stun:stun.l.google.com:19302
```

## 🔍 How to Verify

Open browser console and look for:

```
[Config] Loaded from server: {
  WEBSOCKET_URL: "ws://192.168.1.149:8765/ws/",
  STUN_SERVERS: [{urls: "stun:192.168.1.149:7302"}]
}
[Config] STUN servers configured:
   1. stun:192.168.1.149:7302

🌐 [RoomConnectionManager] Loaded ICE servers from environment:
   1. stun:192.168.1.149:7302
```

## 🚀 Current Configuration

Your current setup (docker-compose.yml):

```yaml
environment:
  - WEBSOCKET_URL=ws://192.168.1.149:8765/ws/
  - STUN_SERVERS=stun:192.168.1.149:7302
```

This means:
- ✅ Using your local STUN server on port 7302
- ✅ No dependency on Google STUN servers
- ✅ Full privacy and control
- ✅ Works on same WiFi network

## 📚 Files Changed

1. **unified-server.js** - Parse STUN_SERVERS env var and expose via API
2. **config.js** - Load STUN servers from API and set global variable
3. **room-connection-manager.js** - Use environment STUN servers first
4. **docker-compose.yml** - Added STUN_SERVERS environment variable
5. **.env.example** - Documented STUN_SERVERS with examples
6. **CONFIGURATION.md** - Complete configuration guide

## 🎉 Benefits

1. **Consistent Pattern** - Same as WEBSOCKET_URL configuration
2. **Docker-Friendly** - Easy to configure in docker-compose.yml
3. **Flexible** - Supports multiple STUN servers
4. **Fallback** - Still works with app-config.json for local dev
5. **No Rebuild** - Change STUN servers without rebuilding image
6. **Privacy** - Use your own STUN server instead of Google

## 🔄 To Change STUN Servers

1. Edit `docker-compose.yml`:
   ```yaml
   - STUN_SERVERS=stun:new-server.com:3478
   ```

2. Restart:
   ```bash
   docker-compose restart
   ```

3. Hard refresh browser:
   ```
   Cmd + Shift + R (Mac)
   Ctrl + Shift + R (Windows)
   ```

That's it! No code changes needed! 🎯
