# Deployment, Containers, and GitOps Infrastructure

| Field | Value |
| --- | --- |
| Audience | DevOps engineers, operators, and release owners deploying LandingPage |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`Dockerfile`](../../Dockerfile), [`docker-compose.yml`](../../docker-compose.yml), [`ws-server.js`](../../ws-server.js), and [`.github/workflows/playwright-quality.yml`](../../.github/workflows/playwright-quality.yml) |
| Consensus Kernel | `clm-kernel@0.0.13` |

## Runtime and Container Port Map

| Environment | Host / Service Port | Container / Process Port | Details |
| --- | --- | --- | --- |
| **Standalone Node (`npm start`)** | `3000` (`PORT` env overrides) | `3000` | Runs `node ws-server.js` serving Express APIs, `/ws/`, `dist/client`, and Astro SSR (`dist/server/entry.mjs`) |
| **Local Astro + API Dev (`npm run dev`)** | `4322` + `3000` | `4322` (`astro dev`), `3000` (`ws-server.js`) | Keeps `4321` free for external Responsive UI Lab targets |
| **Playwright CI (`npm test`)** | `3001` (`TEST_PORT`) | `3001` | Isolated `ws-server.js` process with temporary `MCARD_DB_PATH` |
| **Dockerfile** | Configured by orchestrator | `EXPOSE 3000` | Container listens on `PORT=3000` with `/health` liveness endpoint |
| **Docker Compose (`docker-compose.yml`)** | `8765` | `3000` (`8765:3000`) | Maps host port `8765` to unified HTTP + WebSocket container port `3000` |

## Pre-Deployment CI Verification Gates

```bash
npm run check:net
node scripts/check-package-source-parity.mjs
npm run docs:check
npm run build
npm run check:playwright-discovery
npm run test:unit
npm run test:smoke
npm run test:components
npm run test:responsive
npm run test:conformance
```

## Documents in This Section

- [ARGOCD_DEPLOYMENT.md](./ARGOCD_DEPLOYMENT.md), [ARGOCD_QUICK_GUIDE.md](./ARGOCD_QUICK_GUIDE.md), and [ARGOCD_PRESENTATION.md](./ARGOCD_PRESENTATION.md)
- [BACKEND_IMPLEMENTATION.md](./BACKEND_IMPLEMENTATION.md), [R2_SETUP.md](./R2_SETUP.md), [SELF-HOSTED-CDN.md](./SELF-HOSTED-CDN.md), [SSH-KEY-SETUP.md](./SSH-KEY-SETUP.md), and [caching-strategy.md](./caching-strategy.md)
