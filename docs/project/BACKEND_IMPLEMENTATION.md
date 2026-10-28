# Backend Implementation Summary (`ws-server.js`)

| Field | Value |
| --- | --- |
| Audience | Backend engineers and operators maintaining Express, WebSocket, and Astro SSR middleware |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`ws-server.js`](../../ws-server.js), [`server/mcard-api.mjs`](../../server/mcard-api.mjs), and [`server/test-run-api.mjs`](../../server/test-run-api.mjs) |
| Drift Gate | `npm run docs:check` |

Root [`ws-server.js`](../../ws-server.js) is the sole supported LandingPage server entry point (`packages/server/src/ws-server.js` is an unused dormant legacy copy locked by `scripts/check-package-source-parity.mjs`).

## Port and Middleware Summary

- **Default Port `3000`** serves HTTP, REST routers (`/api/mcard`, `/api/test-runs`, `/api/clm`, `/api/auth`), hoisted config endpoints (`/app-config.json` and `/api/config`), WebSocket `/ws/`, and the `@astrojs/node` SSR middleware (`dist/server/entry.mjs`).
- **Playwright `TEST_PORT=3001`** runs an isolated `ws-server.js` instance backed by a temporary `MCARD_DB_PATH`.
- **Dev Port `4322`** runs `astro dev --port 4322` alongside `ws-server.js` on `3000` during `npm run dev`.

For deployment and container mappings (`EXPOSE 3000`, `docker-compose.yml` `8765:3000`), see [docs/07-deployment/BACKEND_IMPLEMENTATION.md](../07-deployment/BACKEND_IMPLEMENTATION.md) and [docs/01-architecture/astro-host-and-islands.md](../01-architecture/astro-host-and-islands.md).
