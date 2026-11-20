# Authentication and Identity System

| Field | Value |
| --- | --- |
| Audience | Engineers, architects, and QA reviewers consulting capability-level reference architecture |
| BMAD Owner | Architect (`bmad-agent-architect`) |
| Classification | Maintained Capability Reference (`DECISIONS.tsv` row 63), distinct from operational quickstarts |
| Operational Guide | [../02-authentication/README.md](../02-authentication/README.md) |
| Status | Retired in `SPRINT-SLC-04` (active security invariants remain enforced in `ws-server.js` and `membrane-interceptor.js`) |

---

## 1. Current Security Invariants

Legacy backend OAuth/PKCE endpoints (`routes/auth.js`: `POST /api/auth/token`, `POST /api/auth/refresh`, `POST /api/auth/logout`) and orphaned client auth helpers (`js/modules/auth-manager.js`, `js/modules/auth-module.js`, `js/components/AuthStatusComponent.js`) were removed in `SPRINT-SLC-04`. Active runtime security guarantees in `LandingPage` consist of:

- **Unified Content Security Policy (CSP)**: [`ws-server.js`](../../ws-server.js) attaches `buildContentSecurityPolicy()` from [`js/harness/target-membrane.js`](../../js/harness/target-membrane.js) across all routes without `unsafe-eval`.
- **Origin Allowlist Policy**: [`ws-server.js`](../../ws-server.js) restricts cross-origin access via `buildCorsAllowlist()`.
- **Privacy Redaction by Construction (`INV-PRV-01`)**: [`js/harness/membrane-interceptor.js`](../../js/harness/membrane-interceptor.js) strips password inputs, PIN fields, and sensitive attributes before captured events enter `EventRingBuffer`.
- **SSRF and Frame Membrane**: [`js/harness/target-membrane.js`](../../js/harness/target-membrane.js) enforces approved target origins and protocol allowlists before iframe or probe execution.

---

## 2. Historical Background

Prior Zitadel OIDC / PKCE backend integration guides remain archived under [`docs/02-authentication/`](../02-authentication/README.md) and legacy component references (`components/auth-status.html`) for historical traceability.
