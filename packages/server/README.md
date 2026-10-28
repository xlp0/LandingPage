# pkc-server

Dormant server package directory (`packages/server`) retained for dead-code review.

## Product ownership decision in SPRINT-GQC-05

- Ownership classification in `scripts/package-source-parity.json` is `dormant-unsupported-variant` (`unused-package-copy` for `packages/server/src/room-registry.mjs`), owned by the Platform Dead-Code Backlog Owner.
- Root `ws-server.js` is the sole supported LandingPage server product used by `npm start`, `npm run dev`, `Dockerfile`, `docker-entrypoint.sh`, and `playwright.config.js`.
- `packages/server` is not listed in root `package.json#workspaces`, has zero runtime callers, and is not a supported deployment variant.

## Verified differences from root ws-server.js

1. Astro host support is absent in `packages/server/src/ws-server.js`. Root `ws-server.js` mounts `dist/client` static assets and `dist/server/entry.mjs` SSR middleware, whereas `packages/server/src/ws-server.js` serves neither.
2. API coverage is incomplete in `packages/server/src/ws-server.js`. `mcard-api.mjs` is commented out and `/api/test-runs` is absent.
3. Standalone build and startup fail in `packages/server`. `packages/server/src/ws-server.js` imports missing relative modules `./room-message-handler-server.mjs`, `./routes/auth.js`, and `./routes/clm.js`, and `packages/server/src/index.js` imports a nonexistent default export from `./ws-server.js`.
4. Security and configuration policies predated `SPRINT-GQC-03`. `packages/server/src/ws-server.js` retains wildcard `Access-Control-Allow-Origin` headers, `unsafe-eval` in its cookie-branched CSP, and `express.static` ahead of `/app-config.json`.

## Drift protection

`packages/server/src/ws-server.js` and `packages/server/src/room-registry.mjs` remain untouched in `SPRINT-GQC-05` per the sprint non-goals. `scripts/check-package-source-parity.mjs` verifies SHA-256 parity between root `room-registry.mjs` and `packages/server/src/room-registry.mjs` until a dedicated retirement PR removes or archives `packages/server`.

## License

ISC
