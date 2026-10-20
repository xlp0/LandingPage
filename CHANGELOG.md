# Changelog

All notable changes to the PKC Landing Page are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] — 2026-10-20

### Added
- **Responsive UI Lab Target (`responsive-lab.html`)**: Added `http://localhost:4321/` to `#public-site-selector` for live iframe viewport inspection and responsive reflow testing of local Astro and frontend applications.
- **CORS Allowlist (`ws-server.js`)**: Added `http://localhost:4321` to allowed origins for local cross-origin WebSocket and REST API interoperability.

### Changed
- **Portal Streamlining & Direct Navigation (`index.html`)**: Streamlined `index.html` to present Responsive UI Lab as the single choice and added top-level automatic navigation to `responsive-lab.html` (`window.self === window.top`), while preserving iframe embeddability and vertical scrollability invariants.
- **Dependency Alignment (`package.json`, `package-lock.json`)**: Upgraded `clm-kernel` dependency to published `0.0.9`.

### Documentation — ERB Sprint Series Refinement
- **New sprints**: `SPRINT-ERB-00` (Responsive Lab refactor baseline, R0–R7), `SPRINT-ERB-05` (device capability profiles v2 and fidelity tiers T0–T3), and `SPRINT-ERB-06` (device-sensitive functionality conformance suite with MCard regression history).
- **`docs/sprints/_active/INDEX.md`**: Rewritten around device-sensitive testing. It adds a fidelity-tier matrix, a baseline-versus-gap table verified against the code, the execution DAG (ERB-00 → 01 ∥ 05 → 02 → 03 → 04 → 06), an 18-step master refactoring sequence, and new invariants (`INV-STU-02`, `INV-ERB-04`, `INV-ERB-05`, `INV-DSF-01`, `INV-DSF-02`, `INV-PRV-01`).
- **ERB-01**: Separates the ring buffer (data) from the recording state machine (control); adds an exhaustive transition table, gap-free `seq` for loss detection, and an injected clock.
- **ERB-02**: Corrects the cross-origin capture design (a parent cannot attach listeners to a cross-origin iframe). Adds a nonce-armed probe agent that reuses `createTelemetryReceiver` from `js/external-portal-membrane.js`, normalizes in the child viewport, and redacts sensitive inputs.
- **ERB-03**: Uses a dedicated `/api/test-runs` router that shares the existing `CanonicalTriadBackend`. Fixes the global 100 KB `express.json()` limit for large sessions. Adds canonical serialization and latest-run handles for regression chains.
- **ERB-04**: Derives the device matrix from `js/device-registry.js` (removes the non-existent "iPad Pro 11" entry), unifies spec names, pins `retries: 0`, and preflights external targets.
- **BMAD roster**: Persona names aligned with the installed BMAD skills (Mary, Sally); pstack playbooks reference real skill names.
- **`README.md`, `docs/INDEX.md`, `docs/functionalities/09-…md`**: Planned ERB capabilities are now marked as planned, device names match the registry, and the T0 viewport-only fidelity limit is stated.

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
