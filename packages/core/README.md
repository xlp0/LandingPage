# @pkc/core

PKC Core - Lightweight module loader and capability detection for browser environments.

## Installation

```bash
npm install @pkc/core
```

## Features

- **Module Lifecycle Management**: Init/start pattern for module loading
- **Capability Detection**: Automatic detection of WebRTC, WebSocket, IndexedDB support
- **Configuration Loading**: Dynamic app-config.json loading
- **Zero Dependencies**: Pure browser JavaScript, no external dependencies

## Usage

```javascript
import { PKC } from '@pkc/core';

// Initialize with configuration
const modules = await PKC.init({
  modules: [
    {
      id: 'my-module',
      entry: '/path/to/module.js',
      enabled: true,
      when: 'webrtc' // Optional: load only if WebRTC is available
    }
  ]
});

// Check capabilities
if (PKC.capabilities.webrtc) {
  console.log('WebRTC is supported');
}

if (PKC.capabilities.storage.idb) {
  console.log('IndexedDB is available');
}
```

## API

### `PKC.capabilities`

Object containing detected browser capabilities:
- `webrtc`: WebRTC API support
- `websocket`: WebSocket API support
- `storage.idb`: IndexedDB support
- `storage.opfs`: Origin Private File System support

### `PKC.init(config)`

Initialize and load modules based on configuration.

**Parameters:**
- `config`: Configuration object or path to modules.json

**Returns:** Promise resolving to loaded modules map

### `PKC.register(def)`

Register a module definition.

## License

ISC
