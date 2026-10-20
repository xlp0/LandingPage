# Changelog

All notable changes to the PKC Landing Page are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] — 2026-10-20

### Added
- **Responsive UI Lab Target (`responsive-lab.html`)**: Added `http://localhost:4321/` to `#public-site-selector` for live iframe viewport inspection and responsive reflow testing of local Astro and frontend applications.
- **CORS Allowlist (`ws-server.js`)**: Added `http://localhost:4321` to allowed origins for local cross-origin WebSocket and REST API interoperability.

### Changed
- **Portal Streamlining & Direct Navigation (`index.html`)**: Streamlined `index.html` to present Responsive UI Lab as the single choice and added top-level automatic navigation to `responsive-lab.html` (`window.self === window.top`), while preserving iframe embeddability and vertical scrollability invariants.
- **Dependency Alignment (`package.json`, `package-lock.json`)**: Upgraded `clm-kernel` dependency to published `0.0.9`.

## 0.1.0 — 2026-10-18

### Added — SMR-09: Single-Page MCard Distillation & Portal Samples

- **Single-page MCard distillation** (`js/landing-page-mcard.js`): the landing page renders as a self-describing content-addressed MCard record, completing the corpus-supplier role under `EPIC-SMR`.
- **External portal membrane** (`js/external-portal-membrane.js`): third-party portal embedding is isolated behind an explicit membrane boundary.
- **Portal sample corpus**: `data/samples/` and `scripts/seed-portal-samples.mjs` provide deterministic seed records for local development and verification.
- **Tests**: `tests/single-page-mcard.test.mjs` (node:test) and `tests/smoke/single-page-mcard.spec.js` (Playwright smoke spec).
- **Registry projection**: `clm-registry.yaml` refreshed to project all 218 encoded sprints (including the newly registered `SMR-19`..`SMR-30`).

### Changed

- **`server/mcard-api.mjs`**: ESM MCard API surface, replacing the legacy CommonJS `server/mcard-api.js` (removed).
- **`index.html` / `js/nav.js`**: wired the single-page MCard and portal membrane surfaces into the page.

### Sprint status

- `DoD-SMR-09`: **8/8 verified** — first SMR sprint fully green in the umbrella program.
