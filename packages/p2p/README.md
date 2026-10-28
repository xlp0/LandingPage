# @pkc/p2p

WebRTC serverless peer-to-peer package directory (`packages/p2p`).

## Ownership and build status in SPRINT-GQC-05

- Ownership classification in `scripts/package-source-parity.json` is `unmigrated-exact-copy-gated`, owned by the P2P Feature Owner.
- `packages/p2p` is not registered in root `package.json#workspaces` and is not built by `npm run build`.
- `js/modules/p2p-serverless/` (`index.js`, `config.js`, `connection.js`, `discovery.js`, and `qr-code.js`) is the canonical shipped browser implementation used by `modules.json` and `public/examples/`.
- Standalone `node build.js` inside `packages/p2p` is currently gated on a pre-existing export mismatch in `packages/p2p/src/main.js`, which re-exports `default` from `./connection.js`, `./discovery.js`, `./qr-code.js`, and `./config.js` even though those modules only declare named exports.
- `scripts/check-package-source-parity.mjs` enforces byte-for-byte SHA-256 parity across all five copied source files until a dedicated package build story resolves `packages/p2p/src/main.js` and adds tarball consumer coverage.

## Supported browser import path inside LandingPage

Browser callers inside `LandingPage` must import from `js/modules/p2p-serverless/index.js` (or configure `modules.json` entry `./js/modules/p2p-serverless/index.js`) rather than `packages/p2p/dist/index.js`.

```javascript
import P2PServerless from '/js/modules/p2p-serverless/index.js';
```

## License

ISC
