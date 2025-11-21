# Configuration Guide

## Environment Variables

The application can be configured using environment variables. These can be set in:
1. `.env` file (copy from `.env.example`)
2. `docker-compose.yml` environment section
3. System environment variables

### Available Configuration

#### `NODE_ENV`
- **Description:** Node environment mode
- **Default:** `development`
- **Values:** `development`, `production`
- **Example:** `NODE_ENV=production`

#### `PORT`
- **Description:** Server port
- **Default:** `3000`
- **Example:** `PORT=8765`

#### `WEBSOCKET_URL`
- **Description:** WebSocket server URL for client connections
- **Default:** Auto-detected from current domain
- **When to set:** Production deployments with specific domains
- **Examples:**
  ```bash
  WEBSOCKET_URL=wss://dev.pkc.pub/ws/
  WEBSOCKET_URL=wss://pkc.pub/ws/
  WEBSOCKET_URL=ws://192.168.1.149:8765/ws/
  ```

#### `STUN_SERVERS`
- **Description:** Comma-separated list of STUN server URLs for WebRTC
- **Default:** Falls back to `app-config.json` or Google STUN servers
- **Format:** `stun:host:port,stun:host:port`
- **Examples:**
  ```bash
  # Google STUN servers
  STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
  
  # Your own STUN server
  STUN_SERVERS=stun:your-server.com:3478
  
  # Local STUN server (same WiFi network)
  STUN_SERVERS=stun:192.168.1.149:7302
  ```

## Configuration Priority

The application uses the following priority order for STUN servers:

1. **Environment Variable** (`STUN_SERVERS`) - Highest priority
2. **app-config.json** - Fallback for local development
3. **Default Google STUN** - Last resort

This allows you to:
- Use environment variables in production (Docker, cloud deployments)
- Use `app-config.json` for local development
- Always have a working fallback

## Docker Compose Configuration

### Example: Production Deployment

```yaml
services:
  landingpage:
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WEBSOCKET_URL=wss://your-domain.com/ws/
      - STUN_SERVERS=stun:your-stun-server.com:3478
```

### Example: Local Network Testing

```yaml
services:
  landingpage:
    environment:
      - NODE_ENV=production
      - PORT=3000
      - WEBSOCKET_URL=ws://192.168.1.149:8765/ws/
      - STUN_SERVERS=stun:192.168.1.149:7302
```

### Example: Multiple STUN Servers

```yaml
services:
  landingpage:
    environment:
      - STUN_SERVERS=stun:primary.example.com:3478,stun:backup.example.com:3478
```

## Local Development

For local development without Docker:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings:
   ```bash
   NODE_ENV=development
   PORT=8765
   WEBSOCKET_URL=ws://localhost:8765/ws/
   STUN_SERVERS=stun:localhost:7302
   ```

3. Start the server:
   ```bash
   npm start
   ```

## Verification

To verify your configuration is loaded correctly, check the browser console:

```
[Config] Loaded from server: {
  WEBSOCKET_URL: "ws://192.168.1.149:8765/ws/",
  NODE_ENV: "production",
  PORT: 8765,
  STUN_SERVERS: [{urls: "stun:192.168.1.149:7302"}]
}
[Config] WebSocket URL configured: ws://192.168.1.149:8765/ws/
[Config] STUN servers configured:
   1. stun:192.168.1.149:7302
```

And when creating peer connections:

```
🌐 [RoomConnectionManager] Loaded ICE servers from environment:
   1. stun:192.168.1.149:7302
```

## Best Practices

1. **Production:** Always use environment variables in `docker-compose.yml`
2. **Development:** Use `.env` file or `app-config.json`
3. **Security:** Never commit `.env` file to git (it's in `.gitignore`)
4. **STUN Servers:** 
   - Use your own STUN server for privacy and control
   - Have multiple STUN servers for redundancy
   - Use Google STUN as fallback if needed

## Troubleshooting

### STUN servers not loading

Check the console for:
```
🌐 [RoomConnectionManager] Loaded ICE servers from environment:
```

If you see "Using default ICE servers (Google STUN)", your environment variable isn't being read.

### WebSocket connection fails

1. Check `WEBSOCKET_URL` matches your server
2. Verify the server is running on the correct port
3. Check firewall allows the port

### Configuration not updating

1. Restart Docker containers: `docker-compose restart`
2. Hard refresh browser: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
3. Clear browser cache
