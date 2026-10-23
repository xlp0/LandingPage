# Changelog

All notable changes to the PKC Landing Page are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Responsive UI Lab Omnibar & Target Switching (`responsive-lab.html`, `js/harness/lab-toolbar.js`)**: Added direct URL typing omnibar with `normalizeInputUrl` and preset target switching coordinated via `TargetMembrane` (`INV-STU-01`, `INV-STU-02`).

### Changed
- **Penpot Navigation Flow & Display Registry Projection (`index.html`, `js/nav.js`, `design/landing-navigation.penpot`, `clm-registry.yaml`)**: Synchronized the Penpot navigation flow graph digest (`7fc5562f37de5880c28963dfbfeb7b976cafb6feb6e8698078528a9d63a41fb4`) and refreshed `clm-registry.yaml` to project the `EPIC-KX` (`KX-01`..`KX-07`) sprint records.
- **EPIC-KX Consumer Lockstep Boundary**: Verified that `LandingPage` remains exact-pinned to published `clm-kernel@0.0.10` in lockstep with `mcard-studio` (`scripts/ci/check_kx_release_artifacts.py`).

## [0.3.0] — 2026-10-21

### Completed & Graduated — Program SMO (Submodule Modularity, Universal MCard Content Browser, and Organizational Alignment)
Successfully implemented, verified, and graduated all 6 sprints of **Program SMO** (`SMO-00` through `SMO-05`) from `docs/sprints/_active/` to permanent architectural home `docs/sprints/01-architecture/`.

- **SMO-00 (Program Charter & Invariants)**: Defined Program Charter, established invariants `INV-SMO-01..05`, standardized the Universal 4-Modality MCard Content Browser architecture (Static Media, Text/Documents, Inert Source Code, Sandboxed Executable Web Pages), and aligned four-estate positioning across `MCard_TDD`, `clm`, `mcard-studio`, and `LandingPage`.
- **SMO-01 (Submodule Topology, Monorepo Duality & Binary-Safe Triad API)**: Enforced submodule sovereignty (`INV-SMO-01`, zero cross-submodule imports) and monorepo duality. Upgraded `CanonicalTriadBackend` in `server/mcard-api.mjs` to verify digests over raw `Buffer` / `Uint8Array` bytes before UTF-8 decoding (`INV-SMO-03`), preventing binary corruption for media files, and implemented raw byte streaming via `GET /api/mcard/:hash/raw` with `X-Content-Type-Options: nosniff`.
- **SMO-02 (Published Latest `clm-kernel@0.0.10` Consensus & Universal Type Judgment)**: Enforced exact-pin parity on published `clm-kernel@0.0.10` across `package.json`, `package-lock.json`, and `recorder.js` (`INV-SMO-02`), passing live npm registry consensus checks. Integrated `clm-kernel`'s 48-type `TypeInterpreter`, `detectMime`, and `isBinary` into `server/mcard-modality.mjs` to classify all content into the four universal modalities.
- **SMO-03 (Four-Estate Cross-Boundary Contracts & 4-Modality Browser Membrane)**: Unified `js/landing-page-mcard.js`, `js/renderers/RendererRegistry.js`, and `js/external-portal-membrane.js` into an execution-isolated 4-modality browser dispatcher (`INV-SMO-03`, `INV-SMO-04`). Hardened `EmbedRenderer.js` with `sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer"`. Seeded deterministic 4-modality sample corpus in `scripts/seed-portal-samples.mjs` and permitted `:5320` workbench target.
- **SMO-04 (Documentation Hygiene, Universal MCard Canon & Tier Reorganization)**: Eliminated loose root documentation sprawl in `docs/` by relocating files to numbered tiers (`02-authentication/`, `03-data-management/`, `06-components/games/`, `archive/`). Authored canonical architecture specification `docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md` and synchronized `docs/INDEX.md` and `docs/README.md`.
- **SMO-05 (Master README Alignment & Full-Program Verification)**: Overhauled root `README.md` to document the Universal 4-Modality MCard Content Browser and testing workbench, cross-estate positioning, and verified the complete test battery across `LandingPage`.

### Verification Battery
- **Kernel Version Consensus**: 100% green against live npm registry `clm-kernel@0.0.10` (`check-kernel-version-consensus.mjs`).
- **Single-Page MCard Tests**: 24/24 passing (`node --test tests/single-page-mcard.test.mjs`).
- **Unit Test Suite**: 97/97 passing (`npm run test:unit`).
- **Portal Sample Corpus**: 6/6 samples seeded and verified with 4 modalities (`node scripts/seed-portal-samples.mjs`).
- **Submodule Boundary**: 0 cross-submodule filesystem imports in `server/`, `js/`, `scripts/`, `tests/`.
- **Documentation Integrity**: 100% relative link resolution in `README.md`, `docs/INDEX.md`, and all sprint specs.

## [0.2.0] — 2026-10-21

### Completed & Graduated — Program ERB (Device-Sensitive Testing Infrastructure)
Successfully implemented, verified, and graduated all 7 sprints of the **Event Capture Ring Buffer & Device-Sensitive Testing Infrastructure** (`SPRINT-ERB-00` through `SPRINT-ERB-06`) from `docs/sprints/_active/` to permanent functional home `docs/sprints/08-testing/`.

- **ERB-00 (Infrastructure Modularization)**: Decomposed monolithic `responsive-lab.html` into clean ES modules under `js/harness/` (`viewport-stage.js`, `target-membrane.js`, `lab-toolbar.js`). Preserved all stage invariants (`INV-RVP-01..03`, `INV-REF-01`) with zero regression.
- **ERB-01 (Ring Buffer Core & State Engine)**: Implemented bounded in-memory `EventRingBuffer` (`INV-ERB-01`) and deterministic `RecordingStateMachine` (`INV-ERB-03`) with loss detection via gap-free sequence numbers, transition table enforcement, and monotonic injected timebase.
- **ERB-05 (Device Capability Profiles & Fidelity Tiers)**: Upgraded `DeviceRegistry` to schema v2 with comprehensive capability profiles (touch, pointer, mobile, hover, safe-area insets, pixelRatio) and declared fidelity tiers T0–T3 (`INV-DSF-01`, `INV-DSF-02`).
- **ERB-02 (Target Membrane & Touch Ergonomics)**: Implemented parent-iframe membrane interception (`membrane-interceptor.js`), opt-in cross-origin probe agent (`lab-probe-agent.js`) with origin- and nonce-checked validation, scale-free coordinate normalization $[0.0, 1.0]$ (`INV-ERB-02`), and privacy redaction (`INV-PRV-01`). Added live tap-target ergonomic inspection ($\ge 44\text{px} \times 44\text{px}$, `INV-DEV-02`).
- **ERB-03 (Device Telemetry & MCard Persistence)**: Implemented in-target telemetry collector (`telemetry-collector.js`) detecting horizontal bleed (`INV-DEV-01`), frame timing budget ($16.6\text{ms}$ / $60\text{fps}$) and layout stability CLS (`INV-DEV-04`). Integrated SQLite Triad test-run persistence (`/api/test-runs`, `data/mcard-api.db`) with canonical Blake3 hashing via `clm-kernel` (`INV-ERB-04`).
- **ERB-04 (Playwright Replay & Systematic Sweeps)**: Delivered headless Playwright deterministic replay driver (`scripts/playwright-replay-driver.mjs`) supporting paced (1×/2×/5×) and instant execution, paired with a 16-configuration systematic multi-device sweep matrix (`tests/features/systematic-landing-test.spec.js`, `npm run test:responsive`, `npm run test:replay`).
- **ERB-06 (Device Conformance Suite & Certification)**: Implemented 15-check modular conformance catalog under `tests/conformance/checks/`, automated regression verification (`tests/features/device-conformance.spec.js`, `npm run test:conformance`), and minted official responsive certification record `urn:mcard:certification:responsive:v1`.

### Verification Battery
- **Unit Tests**: 73/73 passing (`npm run test:unit`).
- **Orientation & Viewport Integration**: 17/17 passing (`tests/features/responsive-rotation-and-devices.spec.js`).
- **Event Capture**: 8/8 passing (`tests/features/responsive-capture.spec.js`).
- **Deterministic Replay**: 4/4 passing (`npm run test:replay`).
- **Systematic Device Sweeps**: 16/16 passing across 8 device profiles × portrait/landscape (`npm run test:responsive`).
- **Device Conformance & Certification**: 16/16 passing checks with minted MCard certificate (`npm run test:conformance`).
### Documentation Architecture & 12-Tier Monorepo Alignment
- **Four-Estate Alignment (`ULR-01`)**: Realigned all 12 architectural documentation tiers (`docs/00-getting-started` through `docs/11-standards`) to reflect LandingPage's role as Submodule 3 (Estate 4) within the `MCard_TDD` monorepo (Responsive Test Workbench, single-page distillation `SMR-09`, and SSRF-guarded portal membrane).
- **Onboarding Overhaul (`docs/00-getting-started/`)**: Modernized `START_HERE.md`, `QUICKSTART.md`, and `OPEN_AND_USE.md` to document the Responsive UI Lab (`responsive-lab.html`), server startup on port 3001, target URL ingestion (`?target=<URL>`), and test suites. Populated `STATUS.md` with 100% certified status and Program ERB graduation records.
- **Architectural Specification (`docs/01-architecture/`)**: Rewrote `landing-page-architecture.md` detailing the 14 core system invariants (`INV-STU-*`, `INV-RVP-*`, `INV-ERB-*`, `INV-DSF-*`, `INV-PRV-*`, `INV-DEV-*`), stage containment, and clean-room unit contracts.
- **Data Management & Kernel Consensus (`docs/03-data-management/`)**: Populated authoritative specifications for `CONTENT_RENDERING_SYSTEM.md` (Markdown, KaTeX/MathJax dual engine, Three.js 3D, Mermaid), `MCARD_LIBRARY_STRATEGY.md` (`clm-kernel@0.0.9` consensus, zero duplicate hash providers, canonical SQLite Triad schema), `MCARD_LIBRARY_USAGE.md`, and `MCARD_LIBRARY_ISSUE.md`.
- **Master Navigation**: Overhauled `docs/INDEX.md` and `docs/README.md` with complete 12-tier categorized directory tables, direct relative links, and Program ERB graduation pointers.

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
