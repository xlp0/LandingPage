# Authentication and Identity System

| Field | Value |
| --- | --- |
| Audience | Developers and operators configuring Zitadel OIDC, PKCE, and session security |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`ws-server.js`](../../ws-server.js), [`routes/auth.js`](../../routes/auth.js), and [`js/harness/membrane-interceptor.js`](../../js/harness/membrane-interceptor.js) |
| Drift Gate | `npm run docs:check` |

## Security Model

1. **Zitadel OIDC with PKCE** authenticates browser sessions via Authorization Code Flow with Proof Key for Code Exchange (`routes/auth.js`), avoiding browser-exposed client secrets. Note that `/api/auth/*` endpoints belong to an undecided auth capability outside active workbench UI flows (`src/net/workbench-net.yaml`).
2. **Unified CSP without `unsafe-eval`** attaches in `ws-server.js` across all routes.
3. **Privacy Redaction by Construction (`INV-PRV-01`)** masks password inputs, PIN fields, and sensitive attributes inside `js/harness/membrane-interceptor.js` before events enter `EventRingBuffer`.

## Local Redirect Port Note

`ws-server.js` listens on **`http://localhost:3000`** by default (`npm start`), while `TEST_PORT=3001` is reserved for automated Playwright runs and `4322` serves `astro dev` during `npm run dev`. Configure local Zitadel redirect URIs against port `3000` (for example `http://localhost:3000/app.html`) unless testing against a custom `PORT`.

## Documents in This Section

- [ZITADEL_SETUP.md](./ZITADEL_SETUP.md), [ZITADEL_INTEGRATION_GUIDE.md](./ZITADEL_INTEGRATION_GUIDE.md), and [ZITADEL_SETUP_INSTRUCTIONS.md](./ZITADEL_SETUP_INSTRUCTIONS.md)
- [ZITADEL_CLIENT_SECRET_GUIDE.md](./ZITADEL_CLIENT_SECRET_GUIDE.md), [SETUP_ZITADEL_SECRET.md](./SETUP_ZITADEL_SECRET.md), [GENERATE_CLIENT_SECRET.md](./GENERATE_CLIENT_SECRET.md), and [FIND_REGENERATE_SECRET.md](./FIND_REGENERATE_SECRET.md)
- [PKCE_IMPLEMENTATION.md](./PKCE_IMPLEMENTATION.md), [PKCE_ZITADEL_CONFIG.md](./PKCE_ZITADEL_CONFIG.md), [OAUTH_BACKEND_INTEGRATION.md](./OAUTH_BACKEND_INTEGRATION.md), [OAUTH_IMPLEMENTATION_COMPLETE.md](./OAUTH_IMPLEMENTATION_COMPLETE.md), and [GOOGLE_OAUTH_SETUP_GUIDE.md](./GOOGLE_OAUTH_SETUP_GUIDE.md)
