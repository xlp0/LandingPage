# MCard Library and REST API Usage Guide

| Field | Value |
| --- | --- |
| Audience | Backend and frontend developers reading or persisting MCards and test-run artifacts |
| BMAD Owner | Developer (`bmad-agent-dev`) and Architect (`bmad-agent-architect`) |
| Source of Truth | [`server/mcard-api.mjs`](../../server/mcard-api.mjs), [`server/test-run-api.mjs`](../../server/test-run-api.mjs), and [`js/landing-page-mcard.js`](../../js/landing-page-mcard.js) |
| Drift Gate | `npm run docs:check` |

## Server REST Endpoints (Port `3000` Default, `3001` Playwright `TEST_PORT`)

```bash
curl -s http://localhost:3000/api/mcard/landing
curl -s http://localhost:3000/api/mcard/stats
```

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/mcard/landing` | `GET`, `PUT` | Reads or updates the `landing_page` handle (`urn:mcard:content:landing_page`) rendered on `/?noredirect=1` |
| `/api/mcard` | `GET`, `POST` | Programmatic MCard list and Triad Blake3 write endpoints |
| `/api/mcard/:hash` and `/api/mcard/:hash/raw` | `GET`, `DELETE` | Verified JSON envelope lookup, binary-safe media streaming (`nosniff`), and handle release |
| `/api/mcard/probe-url` | `GET` | SSRF-guarded external URL framing and reachability probe |
| `/api/test-runs` | `GET`, `POST` | Persists and queries `responsive_test_run:v1` (`clmKernel: '0.0.13'`), `urn:gqc:interrupted-capture:v1`, replay, and conformance records |
| `/api/test-runs/navigation/session`, `/fire`, `/link` | `POST` | Executes Layer 4 target transitions (`FiringReceiptMCard`) and writes separate `urn:gqc:navigation-run-link:v1` MCards |

## Seeding the 6-Sample Corpus

```bash
node scripts/seed-portal-samples.mjs
```

Writes deterministic `media`, `document`, `code`, and `webapp` cards to `data/samples/portal_samples.mcard.db`. See [Universal 4-Modality MCard Browser Architecture](../01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md).
