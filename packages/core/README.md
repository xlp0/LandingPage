# @pkc/core

Standalone PKC module loader and browser capability detector (`@pkc/core` `1.0.0`).

## Ownership and workspace status

- Workspace package name is `@pkc/core` (`1.0.0`), registered in root `package.json#workspaces`.
- Ownership classification in `scripts/package-source-parity.json` is `separate-product-variant`.
- Standalone package source lives in `packages/core/src/index.js`, `packages/core/src/pkc-core.js` (`4,080 B`), and `packages/core/src/capabilities.js`, bundled by `npm run build` into `packages/core/dist/index.js`.
- LandingPage browser runtime uses `js/pkc-core.js` (`6,888 B`), which adds `SPRINT-GQC-04` topological `dependsOn` ordering, reverse `PKC.stop()` teardown, and `onModuleError` failure isolation for optional modules. Both variants remain separate in `SPRINT-GQC-05`.

## Installation and build

```bash
cd packages/core
npm run build
```

## Environment requirements

`packages/core/dist/index.js` evaluates `document.baseURI` and browser capability globals (`RTCPeerConnection`, `WebSocket`, `indexedDB`, and `navigator.storage`) at module load time. Import `@pkc/core` in a browser runtime or supply a minimal `globalThis.document` shim in Node unit tests, as demonstrated in `tests/unit/package-source-parity.test.mjs`.

## Usage

```javascript
import { PKC } from '@pkc/core';

const modules = await PKC.init({
  modules: [
    {
      id: 'markdown-renderer',
      entry: '/js/modules/markdown-renderer/index.js',
      enabled: true
    }
  ]
});

if (PKC.capabilities.webrtc && PKC.capabilities.storage.idb) {
  console.log(Object.keys(modules));
}
```

## Exported API

- `PKC.capabilities` exposes detected `webrtc`, `websocket`, `storage.idb`, and `storage.opfs` flags. Capabilities are exposed on `PKC.capabilities` rather than a standalone named function export.
- `PKC.init(config)` loads enabled module descriptors and resolves to the initialized module map.
- `PKC.register(definition)` registers an inline module definition.

## License

ISC
