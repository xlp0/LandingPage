# Chapter 10: Service

This chapter demonstrates how to deploy HTTP services using the PTR `static_server` builtin.

---

## The `static_server` Builtin

PTR provides a native `static_server` builtin that works identically across **Python** and **JavaScript** runtimes. This allows you to deploy, check status, and stop HTTP static file servers using simple CLM specifications.

### Features

- **Cross-runtime consistency**: Same behavior in Python and JavaScript runtimes
- **Works with both CLM runners**: Python CLI and JavaScript CLI
- **Background process management**: Server runs as a detached process
- **PID tracking**: Process IDs are saved for clean shutdown
- **IPv4/IPv6 support**: Works with both network protocols

### Supported Runtimes

| Runtime | CLI Command | Builtin Support |
|---------|-------------|-----------------|
| Python | `uv run python -m mcard.ptr.cli run ...` | ✅ Yes |
| JavaScript | `npm --prefix mcard-js run demo:clm -- ...` | ✅ Yes |

---

## Quick Start (CLM Commands)

Both Python and JavaScript runtimes support the `static_server` builtin:

### Deploy the Server

**Python:**
```bash
uv run python -m mcard.ptr.cli run chapters/chapter_10_service/static_server_deploy.yaml
```

**JavaScript:**
```bash
npm --prefix mcard-js run demo:clm -- ../chapters/chapter_10_service/static_server_deploy.yaml
```

**Output:**
```json
{
  "success": true,
  "message": "Server deployed successfully",
  "pid": 39051,
  "port": 8888,
  "url": "http://localhost:8888",
  "root_dir": "/path/to/LandingPage",
  "status": "running"
}
```

### Check Server Status

**Python:**
```bash
uv run python -m mcard.ptr.cli run chapters/chapter_10_service/static_server_status.yaml
```

**JavaScript:**
```bash
npm --prefix mcard-js run demo:clm -- ../chapters/chapter_10_service/static_server_status.yaml
```

### Stop the Server

**Python:**
```bash
uv run python -m mcard.ptr.cli run chapters/chapter_10_service/static_server_stop.yaml
```

**JavaScript:**
```bash
npm --prefix mcard-js run demo:clm -- ../chapters/chapter_10_service/static_server_stop.yaml
```

### Access the Application

Open your browser to: **http://localhost:8888**

---

## CLM Specification

The `static_server` builtin uses a simple CLM structure:

```yaml
clm:
  concrete_impl:
    builtin: static_server # Runtime inferred automatically
    config:
      root_dir: "LandingPage"  # Directory to serve
      port: 8888               # Port number
      host: "localhost"        # Bind address
      action: "deploy"         # deploy | status | stop
```

### Actions

| Action | Description |
|--------|-------------|
| `deploy` | Start the HTTP server as a background process |
| `status` | Check if the server is running |
| `stop` | Gracefully stop the server |

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `root_dir` | `.` | Directory containing files to serve |
| `port` | `8080` | HTTP port |
| `host` | `localhost` | Bind address |

---

## Files in This Chapter

| File | Purpose |
|------|---------|
| `static_server_deploy.yaml` | CLM to deploy HTTP static server |
| `static_server_status.yaml` | CLM to check HTTP server status |
| `static_server_stop.yaml` | CLM to stop HTTP server |
| `ws_server_deploy.yaml` | CLM to deploy WebSocket server |
| `ws_server_status.yaml` | CLM to check WebSocket server status |
| `ws_server_stop.yaml` | CLM to stop WebSocket server |
| `README.md` | This documentation |

---

## The `websocket_server` Builtin

PTR also provides a `websocket_server` builtin for managing the WebSocket gateway server (`ws-server.js`).

### WebSocket Server CLM Specification

```yaml
clm:
  concrete_impl:
    builtin: websocket_server
    config:
      server_script: "LandingPage/ws-server.js"
      port: 3000               # Port number
      host: "localhost"        # Bind address
      action: "deploy"         # deploy | status | stop
```

### WebSocket Server Commands

**Deploy:**
```bash
# Python
uv run python -m mcard.ptr.cli run chapters/chapter_10_service/ws_server_deploy.yaml

# JavaScript
npm --prefix mcard-js run demo:clm -- ../chapters/chapter_10_service/ws_server_deploy.yaml
```

**Status:**
```bash
uv run python -m mcard.ptr.cli run chapters/chapter_10_service/ws_server_status.yaml
```

**Stop:**
```bash
uv run python -m mcard.ptr.cli run chapters/chapter_10_service/ws_server_stop.yaml
```

### WebSocket Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `server_script` | `LandingPage/ws-server.js` | Path to WebSocket server script |
| `port` | `3000` | Server port |
| `host` | `localhost` | Bind address |

---

## How It Works

The `static_server` builtin:

1. **Spawns `python3 -m http.server`** as a detached background process
2. **Saves the PID** to `.static_server_{port}.pid` for tracking
3. **Uses `lsof`** to check port usage (supports IPv4/IPv6)
4. **Returns JSON** with success status, PID, and URL

The `websocket_server` builtin:

1. **Spawns `node ws-server.js`** as a detached background process
2. **Sets PORT environment variable** for the Node.js server
3. **Saves the PID** to `.websocket_server_{port}.pid` for tracking
4. **Returns JSON** with success status, PID, WebSocket URL, and health URL

Both Python and JavaScript runtimes use the same implementation, ensuring consistent behavior.

---

## Troubleshooting

### Port Already in Use

```bash
# Static server
lsof -ti :8888 | xargs kill -9

# WebSocket server
lsof -ti :3000 | xargs kill -9
```

### Server Not Responding

Check if the root directory exists and contains an `index.html`:

```bash
ls -la LandingPage/index.html
```

For WebSocket server, check health endpoint:

```bash
curl http://localhost:3000/health
```

---

## See Also

- [PTR Runtime Overview](../../docs/PTR_Runtime_Overview.md)
- [CLM Language Specification](../../docs/CLM_Language_Specification.md)

