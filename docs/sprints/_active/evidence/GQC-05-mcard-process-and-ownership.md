# GQC-05 Evidence Report for MCard Process Data and Package Ownership

## Metadata

| Field | Value |
| --- | --- |
| Sprint | `SPRINT-GQC-05` |
| PR | `PR-GQC-05` |
| Base Commit | `7734a24` (`PR-GQC-04`) |
| Parity Manifest | `scripts/package-source-parity.json` |
| Parity Checker | `scripts/check-package-source-parity.mjs` |
| NetMCard Builder | `scripts/net-to-netmcard.mjs` |
| Live Browser Matrix | `10/10` lanes passed on Chromium `156.0.8078.4` |
| Paired Perf Probe | `10` interleaved cold-context pairs after `2` warmup pairs per modality |

## Consumer and Maintainer Impact

Downstream package consumers of `@pkc/markdown-renderer` now import the same module descriptor that the browser runtime loads through `js/modules/markdown-renderer/index.js`. Maintainers no longer carry duplicate copies of `markdown-renderer` across `packages/` and `js/modules/`, and `scripts/check-package-source-parity.mjs` enforces ownership classifications and SHA-256 digests across all four workspace-to-app source pairs on every test run.

Operators running `ws-server.js` gain Triad-backed process persistence for both Layer 1 workbench Petri nets and Layer 4 Guided SPA target navigation without adding `clm-kernel` to any browser bundle. Each target step in `/responsive-lab.html` records a verifiable `FiringReceiptMCard`, routes unmapped steps to `p_error_modal` with HTTP `409` lock semantics until explicit recovery, links completed `responsive_test_run:v1` captures via `urn:gqc:navigation-run-link:v1`, and quarantines interrupted captures under `urn:gqc:interrupted-capture:v1` with `passing` and `certified` fixed to `false`.

## GQC-05.1 and GQC-05.2 Package Ownership and Tarball Verification

`scripts/package-source-parity.json` classifies every duplicated or paired source surface between `packages/` and root runtime paths. `@pkc/markdown-renderer` is the single pair migrated in `GQC-05`, matching the one-pair migration cap for this sprint.

| Pair ID | Classification | Owner | Canonical or App Path | Bytes / SHA-256 | Paired Path | Bytes / SHA-256 | Verification Gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `markdown-renderer` | `shared-source` | Renderer Surface Owner | `packages/markdown-renderer/src/index.js` | `189 B` / `53aaabaa0a5843dd99600741001332074dedea97009d24990f59fd861f895ebb` | `js/modules/markdown-renderer/index.js` (re-exports canonical source) | `76 B` / `057304fd5bb393d94ea6d6eb720afba58980d743cdeb75870a5a9bb8372c7f79` | `scripts/check-package-source-parity.mjs` + `npm pack` consumer import test |
| `pkc-core` | `separate-product-variant` | Browser Module Runtime Owner | `js/pkc-core.js` (`dependsOn` topological sort, reverse `stop()`, `onModuleError`) | `6,888 B` / `5af77ec9a3dbb6de133a6576079c1af976c8450ecb48749306c3afefeac940f1` | `packages/core/src/pkc-core.js` (`@pkc/core` v1.0.0 standalone baseline) | `4,080 B` / `28044be02851c73f2d71f619be876451c1794f2ef860e6e6fed1ab61ec71bc30` | `scripts/check-package-source-parity.mjs` + `npm pack` consumer import test |
| `p2p-serverless` | `unmigrated-exact-copy-gated` | P2P Transport Owner | `js/modules/p2p-serverless/{index,config,connection,discovery,qr-code}.js` | `43,790 B` total across `5` files (`96d0e04a...`, `adb3e1a1...`, `7f63bed1...`, `0c46339e...`, `c063d91e...`) | `packages/p2p/src/{index,config,connection,discovery,qr-code}.js` | Identical `43,790 B` across `5` files | Byte-identical SHA-256 gate in `scripts/check-package-source-parity.mjs` |
| `room-registry` | `unused-package-copy` | Platform Dead-Code Backlog Owner | `room-registry.mjs` | `3,492 B` / `c302da1e6649a3fd6c74a7e3835b331769067213c852c65469a0bcc9ff6825ea` | `packages/server/src/room-registry.mjs` | `3,492 B` / `c302da1e6649a3fd6c74a7e3835b331769067213c852c65469a0bcc9ff6825ea` | Byte-identical SHA-256 gate + dormant server isolation |

`tests/unit/package-source-parity.test.mjs` runs `npm pack` for `@pkc/core`, `@pkc/markdown-renderer`, and `@pkc/p2p` into an isolated `os.tmpdir()` consumer directory, extracts each tarball, verifies `package/dist/index.js` presence, imports the packed entrypoint, and confirms zero relative-escape imports outside the extracted package root. `packages/markdown-renderer/README.md`, `packages/core/README.md`, `packages/p2p/README.md`, and `packages/server/README.md` document actual exports and browser runtime relationships.

## GQC-05.3 Renderer Contract Preservation

The two active rendering surfaces keep distinct contracts and remain regression-verified across unit tests, Playwright feature tests, and live Chromium lanes.

| Surface | Entrypoint | Contract | Security and Isolation Controls |
| --- | --- | --- | --- |
| Single-page MCard viewer | `js/landing-page-mcard.js` + `server/mcard-modality.mjs` | Classifies Triad payloads into `document`, `code`, `media`, `webapp`, and unsupported binary download fallback | Code renders inside inert `<pre><code>` with `data-execution="inert"`. External webapps validate through `validateExternalUrl`, obey `frame-src` in `server/mcard-probe-policy.mjs`, and mount with `sandbox="allow-scripts allow-forms"` plus `referrerpolicy="no-referrer"`. |
| MIME viewer surface | `js/renderers/RendererRegistry.js` + `js/renderers/MarkdownRenderer.js` | Dispatches content by MIME type on `/mcard-viewer.html` with explicit renderer registration | Isolated from single-page modality classification and covered by `tests/unit/server-and-renderer-contracts.test.mjs`. |
| Lifecycle module descriptor | `packages/markdown-renderer/src/index.js` | Exports `{ id, init, start, stop }` for `js/pkc-core.js` module lifecycle tests | Does not claim or shadow DOM Markdown rendering. |

## GQC-05.4 Server Product Decision and UI Server-Call Policy

Root `ws-server.js` is the sole supported server product for `LandingPage`. `packages/server/src/ws-server.js` is a dormant unsupported variant retained untouched as dead-code backlog for `GQC-07`.

| Capability | Root `ws-server.js` (`15,365 B`, `e7dafe7f...`) | Dormant `packages/server/src/ws-server.js` (`18,594 B`, `8c850486...`) |
| --- | --- | --- |
| Product status | Supported production and dev host | Dormant unsupported variant |
| Deployment callers | `package.json` (`start`, `dev`), `Dockerfile`, `docker-entrypoint.sh`, `playwright.config.mjs` | None |
| Astro page mount (`servesAstroPages`) | `true` via `dist/client` (`X-GQC-Page-Mount` `astro-prerendered`) and `dist/server/entry.mjs` (`astro-ssr-handler`) | `false` (no `dist/client` or `dist/server/entry.mjs` mount) |
| HTTP API routes | `/health`, `/api/rooms`, `/api/env`, `/api/config`, `/app-config.json`, `/api/auth/*`, `/api/clm/*`, `/api/mcard/*`, `/api/test-runs/*` | Missing `/api/test-runs/*` and comments out `/api/mcard/*` |
| WebSocket signaling | `/ws/` room signaling | `/ws/` room signaling |
| CORS policy | Narrowed origin allowlist via `resolveAllowedOrigins` | Wildcard `Access-Control-Allow-Origin` `*` |
| CSP policy | Unified `buildContentSecurityPolicy` without `unsafe-eval` | Cookie-branched `mcard_auth=1` CSP containing `unsafe-eval` |
| Config route precedence | Hoists validated `/app-config.json` and `/api/config` ahead of static middleware | Mounts `express.static(__dirname)` ahead of dynamic `/app-config.json` |

`scripts/check-package-source-parity.mjs` enforces the UI server-call policy across `src/` and `js/harness/`. Existing Express routes stay unchanged. New UI server calls default to Astro endpoints or Astro Actions unless extending an existing Express router such as `/api/test-runs/*`, and every client `fetch` route (`13` checked calls) must be declared in `src/net/workbench-net.yaml` before merge (`GQC-05-UNIT-03` verifies rejection of undeclared calls).

## GQC-05.5 Runtime Provenance Gap Audit

| Surface | Recorded `clm-kernel` Version | Disposition | Follow-Up Owner |
| --- | --- | --- | --- |
| `node_modules/clm-kernel/package.json` | `0.0.12` | Installed workspace dependency | Platform Host Owner |
| `server/mcard-modality.mjs` | `clm-kernel@0.0.12` | Matches installed package | MCard Server Owner |
| `docs/01-architecture/landing-page-architecture.md` | Updated from `0.0.9` to `0.0.12` | Architecture prose aligned in `GQC-05` while noting client provenance skew | Architect |
| `js/harness/recorder.js` (`DEFAULT_PROVENANCE`) | `0.0.10` (read-only in `GQC-05`) | Logged as runtime provenance skew without rewriting historical `responsive_test_run:v1` MCards | Architect + PM + TEA in `GQC-07` |

## GQC-05.6 and GQC-05.8 Triad Petri-Net Persistence, Receipts, and Schema Coexistence

`scripts/net-to-netmcard.mjs` compiles both the Layer 1 site net and the Layer 4 target net into canonical `clm-kernel` `NetMCard` records while keeping UI and HTTP bindings in separate MCard documents. `clm/views/petri/v1` is validated as the view `typeUri` rather than a `NetMCard` schema field.

| Net Scope | Net ID | Places / Transitions | `netMCardHash` | `bindingsMCardHash` | Trace or Receipt Artifact |
| --- | --- | --- | --- | --- | --- |
| Layer 1 Workbench Net | `landingpage-workbench-net` (`src/net/workbench-net.yaml`) | `31` Places / `65` Transitions | `ad37468e01f934a9f9b4ea6dda1dcc7acf2e84e92e99e603ac4807b9acafd5e3` | `2613f1ddf25da06b465492048a76ffab11f65bd7663927ea4fbf391412d0e817` | `urn:gqc:workbench-firing-trace:v1` (`FiringRecord` sequence) |
| Layer 4 SPA Target Net | `spa-test-target-net` (`tests/fixtures/spa-test-target.graph.json`) | `3` Places / `4` Transitions | `02fa9716c7880820a00e97c77eb3d292a11a015db5c654768188b70aa1ea6c4f` | `f1f8fb4a33d98193f45db0f97e5b89eb3889d0c8856bcdb66d1502a220fbe84c` | `FiringReceiptMCard` (`COMMITTED` / `ROUTED_TO_EXCEPTION`) |

`server/test-run-api.mjs` and `js/harness/test-run-schema.js` enforce six runtime invariants verified across `tests/unit/net-mcard-persistence.test.mjs` and `tests/features/spa-test-workbench.spec.js`.

- `POST /api/test-runs/navigation/session` (modeled by `p_pending_post_nav_session`, `t_req_post_nav_session`, `t_ok_post_nav_session`, and `t_fail_post_nav_session`) persists the target `NetMCard` and separate bindings MCard, returning deterministic hashes and initial marking state.
- `POST /api/test-runs/navigation/fire` (modeled by `p_pending_post_nav_fire`, `t_req_post_nav_fire`, `t_ok_post_nav_fire`, and `t_fail_post_nav_fire`) serializes concurrent firings per `sessionId` through an in-process promise queue and deduplicates retries by `(sessionId, requestId)` without double-advancing the marking.
- Unmapped or disabled target steps such as `t_spa_invalid_unmapped` emit a `FiringReceiptMCard` with outcome `ROUTED_TO_EXCEPTION`, enter `p_error_modal`, block normal transitions such as `t_spa_open_details` and `t_spa_back_overview` with HTTP `409`, and require explicit recovery via `t_spa_recover_overview` back to `p_spa_overview`.
- `POST /api/test-runs/navigation/link` (modeled by `p_pending_post_nav_link`, `t_req_post_nav_link`, `t_ok_post_nav_link`, and `t_fail_post_nav_link`) stores `urn:gqc:navigation-run-link:v1` under handle `nav_run_link_<runHash>` so `responsive_test_run:v1` remains closed under `additionalProperties` `false`.
- Interrupted captures persist under `urn:gqc:interrupted-capture:v1` with `incomplete` `true`, `passing` `false`, `certified` `false`, and `verdict` `incomplete`.
- Unknown schemas fail visibly with HTTP `400` or `422` and `downgradedToV1` `false`. Browser bundles import zero symbols from `clm-kernel`.

## GQC-05.7 Optional PenPot MPA Gate Disposition

The optional PenPot MPA gate is recorded as `Optional / Deferred`. `design/landing-navigation.penpot` remains a parser regression input for `scripts/penpot-nav.mjs`, and `sample-mpa.penpot` was not created because no live MPA target fixture is scheduled in `GQC-05`. Lane 9 confirms that Guided Lab surfaces `MPA Assessment` `Optional / Deferred` and classifies `/index.html?noredirect=1` as `mpa-candidate` (`Not Classified as SPA`).

## Automated Verification Summary

| Suite | Command | Result |
| --- | --- | --- |
| Production Astro build | `npm run build` | `PASS` |
| Workbench Petri-net verifier | `npm run check:net` | `PASS` (`31` Places, `65` Transitions) |
| Package parity and UI call gate | `node scripts/check-package-source-parity.mjs` | `PASS` (`pairs=4`, `uiCalls=13`) |
| Playwright discovery check | `npm run check:playwright-discovery` | `PASS` (`30` smoke, `18` components, `591` features, `0` cross-browser repeats) |
| Node unit suite | `npm run test:unit` | `173/173 PASS` (`0` failures) |
| Protected single-page MCard suite | `node --test tests/single-page-mcard.test.mjs` | `24/24 PASS` (`0` failures) |
| GQC/ERB/SMO/CDO feature specs | `npx playwright test` (`9` feature spec files) | `62/62 PASS` (`30.1s`) |
| Smoke Playwright suite | `npm run test:smoke` | `30/30 PASS` (`23.2s`) |
| Component Playwright suite | `npm run test:components` | `18/18 PASS` (`9.3s`) |

## Live 10-Lane Browser Matrix

All 10 required live browser lanes executed against `ws-server.js` in real Chromium `156.0.8078.4` with `0` console errors and `0` uncaught page errors.

| Lane | Scenario | Verified Hash or Handle | Console / Page Errors | Result |
| --- | --- | --- | --- | --- |
| `1` | Trunk `7734a24` vs head landing MCard parity | `c807485fd10ccd5d758754d922e86f6b11503bb0d6a9b923ec3ae45385fce12c` (`urn:mcard:content:landing_page`) | `0 / 0` | `PASS` |
| `2` | Binary `image/png` media rendering | `a7ac7cc601f5ad1099cba15fdae9f6437bc38833a089c589bdac0c74aad7c933` (`96x96` PNG) | `0 / 0` | `PASS` |
| `3` | Markdown + math rendering and browser `markdown-renderer` re-export import | `5d3ae2c8ad07c52a29e2882a3c701a839cd5c7640816d9542027cec6f766fdd9` | `0 / 0` | `PASS` |
| `4` | Inert JavaScript source rendering (`data-execution="inert"`) | `c15b59e7f972b54a9e920d94eafcd6c89ece8d58591a1784060403b90c0e4f84` | `0 / 0` | `PASS` |
| `5` | Sandboxed external webapp (`https://grafana.pkc.pub/portal`) | `8ab6a51a80bd0d77dda9d29f66d62d3808173b22d6c4c753a23d0355dd6ec12f` | `0 / 0` | `PASS` |
| `6` | Unsupported binary MIME fallback (`application/octet-stream`) | `e0ab608dffe1cebe56b8390f8c071d498c6ed3d75c5dafe99d767371050ff44d` | `0 / 0` | `PASS` |
| `7` | Guided Lab Layer 4 valid fire, `p_error_modal` lock, and `t_spa_recover_overview` | `02fa9716c7880820a00e97c77eb3d292a11a015db5c654768188b70aa1ea6c4f` | `0 / 0` | `PASS` |
| `8` | `responsive_test_run:v1` + `urn:gqc:navigation-run-link:v1` + `urn:gqc:interrupted-capture:v1` reload | `37be962cdfea6eddfb727140ffe8873ab8192255e698ec9f17f50a5e99309762` / `8b6015367008...` | `0 / 0` | `PASS` |
| `9` | Optional PenPot MPA assessment and `mpa-candidate` classification | `/responsive-lab.html?target=/index.html%3Fnoredirect%3D1` | `0 / 0` | `PASS` |
| `10` | Single-page MCard transclusion click (`#mcard:urn:mcard:content:landing_sample:1`) | `e96ef946cb565d4daeb0f8629cd8244bbfc749c94470f6103c5bbda33797b9a2` | `0 / 0` | `PASS` |

## Paired Performance Comparison (Trunk `7734a24` vs Head `PR-GQC-05`)

Measurements ran on `Apple M4 Max` (`16` cores, `darwin 25.6.0 arm64`, Node `v24.21.0`, Chromium `156.0.8078.4`, `1440x900` viewport) using `2` discarded warmup pairs followed by `10` interleaved cold-context A/B pairs per modality.

| Modality | Trunk p50 / p75 (`min..max`) | Head p50 / p75 (`min..max`) | Delta p75 | Trunk JS Bytes | Head JS Bytes | Delta JS | CDP p50 (`resp / script / layout`) | Errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `media` (`image/png`) | `78.95 ms` / `79.63 ms` (`77.9..81.7`) | `79.65 ms` / `80.30 ms` (`78.4..81.2`) | `+0.67 ms` (`+0.84%`) | `689,653 B` | `689,653 B` | `0 B` (`0%`) | `1.60 / 10.64 / 12.98 ms` | `0` |
| `document` (`text/markdown`) | `59.40 ms` / `59.65 ms` (`58.7..60.3`) | `59.65 ms` / `59.97 ms` (`59.0..62.0`) | `+0.32 ms` (`+0.54%`) | `484,065 B` | `484,065 B` | `0 B` (`0%`) | `1.50 / 9.31 / 13.04 ms` | `0` |
| `code` (`application/javascript`) | `59.30 ms` / `59.75 ms` (`58.2..61.1`) | `59.55 ms` / `60.28 ms` (`57.5..60.6`) | `+0.53 ms` (`+0.89%`) | `484,065 B` | `484,065 B` | `0 B` (`0%`) | `1.40 / 9.32 / 12.98 ms` | `0` |
| `webapp` (`text/uri-list`) | `60.25 ms` / `60.38 ms` (`59.6..60.7`) | `60.85 ms` / `61.53 ms` (`59.8..61.7`) | `+1.15 ms` (`+1.90%`) | `484,065 B` | `484,065 B` | `0 B` (`0%`) | `1.50 / 9.41 / 13.00 ms` | `0` |
| `fallback` (`application/octet-stream`) | `58.30 ms` / `58.98 ms` (`57.9..59.7`) | `59.25 ms` / `59.58 ms` (`45.2..59.9`) | `+0.60 ms` (`+1.02%`) | `484,065 B` | `484,065 B` | `0 B` (`0%`) | `1.50 / 9.30 / 12.87 ms` | `0` |
| `guided-spa-layer4` (`/responsive-lab.html`) | `122.10 ms` / `122.80 ms` (`105.7..123.3`) | `121.90 ms` / `122.90 ms` (`104.7..123.3`) | `+0.10 ms` (`+0.08%`) | `139,732 B` | `151,791 B` | `+12,059 B` (`+8.63%`) | `1.50 / 5.52 / 37.03 ms` | `0` |

Limiter analysis from CDP `Performance.getMetrics` shows that loopback HTTP plus SQLite Triad reads complete in `1.40..1.60 ms` and JavaScript execution (`ScriptDuration`) stays at `9.30..10.64 ms` on single-page MCard modalities and `5.52 ms` on `/responsive-lab.html`. End-to-end wall time is bounded by Chromium document commit and frame layout (`12.87..13.04 ms` on `/index.html` and `37.03 ms` plus sub-document `#mission-control-iframe` commit on `/responsive-lab.html`). The `+12,059 B` JavaScript delta on `/responsive-lab.html` comes solely from the Preact Layer 4 receipt, `p_error_modal` recovery, and `urn:gqc:navigation-run-link:v1` UI controls in `src/islands/SpaTestWorkflow.jsx` and `js/harness/spa-test-workflow.js`, with `0 B` of `clm-kernel` shipped to the browser.

## Review Media Packet Manifest

Before-and-after screenshots and the full walkthrough video were captured at `1440x900` in real Chromium `156.0.8078.4` with `0` console or page errors.

- `before-mcard-landing.png` and `after-mcard-landing.png`
- `before-modality-image.png` and `after-modality-image.png`
- `before-modality-markdown-math.png` and `after-modality-markdown-math.png`
- `before-modality-inert-code.png` and `after-modality-inert-code.png`
- `before-modality-webapp-sandbox.png` and `after-modality-webapp-sandbox.png`
- `before-modality-unknown-fallback.png` and `after-modality-unknown-fallback.png`
- `before-guided-spa-transitions.png`, `after-guided-spa-receipt-committed.png`, `after-guided-spa-error-modal.png`, and `after-guided-spa-nav-run-link.png`
- `gqc-05-walkthrough.webm` (`42.4s`, VP9, `1440x900`, `5,820,894 B`, verified via `ffprobe`)
