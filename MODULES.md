# PKC Modules Guide

This document explains how to add modular functionality to PKC-LandingPage using a lightweight runtime (`pkc-core`) and a manifest (`modules.json`). The goal is progressive enhancement: the site works as a static drop-in, and optional modules add features when supported.

## Runtime Overview

- Entry: `js/pkc-core.js`
- Responsibilities:
  - Capability detection (WebSocket, WebRTC, storage)
  - Module registry and lifecycle
  - Manifest loading and dynamic `import()` of module entries

```js
// Load all enabled modules from manifest
import { PKC } from './js/pkc-core.js';
PKC.load('/modules.json');
```

## Manifest: `modules.json`

```json
{
  "modules": [
    {
      "id": "markdown-renderer",
      "entry": "/js/modules/markdown-renderer/index.js",
      "enabled": true,
      "config": { }
    }
  ]
}
```

Fields:
- `id` (string, required): Unique module identifier
- `entry` (string, required): ES module path loaded via `import()`
- `enabled` (bool, default true): Load/start this module
- `config` (object, optional): Module-specific configuration
- `when` (string, optional): Simple capability condition (`webrtc`, `websocket`, `storage.idb`)

## Module API

Each module must export an object (default or named) with:

```js
export default {
  id: 'your-module-id',
  async init({ pkc, config, capabilities }) {
    // one-time initialization, DOM hooks, config parsing
  },
  async start() {
    // activate behavior, attach listeners
  },
  async stop() {
    // cleanup listeners/state when disabled
  }
};
```

- `pkc`: Core runtime reference
- `config`: The `config` object from manifest
- `capabilities`: Detected features e.g. `{ websocket, webrtc, storage: { idb, opfs } }`

## Capability Conditions

Set `when` in the manifest to guard module loading:

```json
{
  "id": "p2p-serverless",
  "entry": "/js/modules/p2p-serverless/index.js",
  "enabled": true,
  "when": "webrtc",
  "config": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" }
    ],
    "channelName": "pkc-p2p-discovery"
  }
}
```

## Example: Baseline Module

`js/modules/markdown-renderer/index.js`
```js
export default {
  id: 'markdown-renderer',
  async init({ pkc, config, capabilities }) {
    pkc.ctx.log('markdown-renderer:init', { capabilities });
  },
  async start() {},
  async stop() {}
};
```

## Security & CSP

For static hosting, prefer a strict CSP; add `connect-src` only if needed for WebSocket/signaling:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:; 
  font-src 'self';
  connect-src 'self' ws://localhost:3001 wss://your-endpoint.example; 
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'self';
  upgrade-insecure-requests;
```

## Nginx WS Proxy (optional)

```
map $http_upgrade $connection_upgrade { default upgrade; '' close; }
server {
  listen 8081;
  location /ws/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_pass http://127.0.0.1:3001;
  }
}
```

## Authoring Checklist

- [ ] Create module folder under `js/modules/<id>/`
- [ ] Export `init/start/stop`
- [ ] Add entry to `modules.json` with `id`, `entry`, and optional `config`/`when`
- [ ] Test locally (check console for `[PKC] Started module: <id>`) 
- [ ] Update CSP and server config if the module uses network features

## Roadmap Examples

- `net-gateway` (optional): WebSocket demo (echo) behind feature detection
- `p2p-serverless` (optional): Serverless WebRTC P2P with manual invitation exchange
- `service-worker` (optional): Offline caching for docs

This system keeps the site portable and static-first while enabling controlled, incremental enhancements.
