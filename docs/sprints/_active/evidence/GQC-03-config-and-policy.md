# GQC-03 Evidence: Target Configuration Contracts, Policy Enforcement, and Capture Lifecycle

## Metadata

- Sprint: `SPRINT-GQC-03` (`PR-GQC-03`)
- Trunk baseline SHA: `424022c` (`PR-GQC-02B.2`)
- Governing decisions: `DECISIONS.tsv` rows `bmad-ports-and-publicdir` (`2026-10-27T15:01:33Z`) and `bmad-security-and-config` (`2026-10-27T15:01:35Z`)
- Verification date: `2026-10-28`

## 1. Configuration Endpoint Contracts and Consumers

Every configuration and runtime discovery endpoint in `ws-server.js` is hoisted ahead of the Astro prerendered static mount, Astro SSR handler, and legacy static mounts. Each endpoint sets `Cache-Control: no-store` and `X-GQC-Mount: ws-server-config`, eliminating the prior root static mount shadow over `/app-config.json`.

| Endpoint | Schema / Contract | Owner | Answering Mount | Validated Shape | Active Consumers |
| --- | --- | --- | --- | --- | --- |
| `GET /app-config.json` | `urn:gqc:lab-config:v1` | Architect and Product Manager | `ws-server-config` (`ws-server.js:258-268`), backed by `app-config.json` | `{ schema, owner, defaultTargetId, p2p?: { iceServers }, labTargets: [{ id, url, label, chipLabel?, targetType, status, quickLaunch, reason?, desc? }] }` via `validateLabConfig()` | `js/harness/lab-toolbar.js`, `js/harness/lab-runtime.js`, `ws-server.js` (`loadLabConfigEnvelope()`), read-only P2P ICE fallback readers (`js/modules/p2p-serverless/*`) |
| `GET /api/config` | `urn:gqc:runtime-config:v1` | Architect | `ws-server-config` (`ws-server.js:246-256`) | `{ schema, owner, WEBSOCKET_URL, MCARD_STUDIO_URL, NODE_ENV, PORT, STUN_SERVERS, wsHost, wsPort, wsPath }` via `validateRuntimeConfig()` | `js/modules/webrtc-dashboard/config.js:7` (standalone developer harness; recorded under `nonUiEndpoints` in `src/net/workbench-net.yaml:1380-1385`) |
| `GET /api/env` | Legacy env compatibility map | Architect | `ws-server-config` (`ws-server.js:235-244`) | `{ WEBSOCKET_URL, STUN_SERVERS, MCARD_STUDIO_URL, NODE_ENV }` | `app.html` (`t_req_get_env` -> `t_ok_get_env` / `t_fail_get_env` in `src/net/workbench-net.yaml`) |
| `GET /api/rooms` | Room registry summary | Architect | `ws-server-config` (`ws-server.js:228-233`) | `{ total, rooms }` | Standalone WebSocket room diagnostics (`nonUiEndpoints` at `src/net/workbench-net.yaml:1374-1379`) |
| `GET /health` | Server readiness probe | Architect | `ws-server-config` (`ws-server.js:216-226`) | `{ status: "ok", version, uptime, rooms, mcard }` | Playwright `webServer`, readiness probes (`nonUiEndpoints` at `src/net/workbench-net.yaml:1368-1373`) |

### Express Page-Source and Route Precedence (`ws-server.js`)

1. `app.use(cors(...))` (`ws-server.js:137-158`): origin allowlist derived via `buildCorsAllowlist()` plus active server loopback origin.
2. Security and cache header middleware (`ws-server.js:160-174`): sets `Content-Security-Policy` on all responses and `Cache-Control: no-cache, no-store, must-revalidate` on `.html`, `.js`, `.mjs`, `.css`, and `/`.
3. API routers (`ws-server.js:176-184`): `/api/test-runs`, `/api/auth`, `/api/clm`, `/api/mcard`.
4. Hoisted dynamic configuration routes (`ws-server.js:216-268`): `/health`, `/api/rooms`, `/api/env`, `/api/config`, and `/app-config.json` (`X-GQC-Mount: ws-server-config`).
5. Astro prerendered static mount (`ws-server.js:273-278`): `dist/client/` (`X-GQC-Page-Mount: astro-prerendered`), with `astro.config.mjs` `publicDir: './astro-public'` so `app-config.json` and `sw.js` are never copied into `dist/client/`.
6. Astro SSR handler (`ws-server.js:280-291`): `dist/server/entry.mjs` (`X-GQC-Page-Mount: astro-ssr-handler`).
7. Legacy static fallbacks (`ws-server.js:295-331`): `/public` and repository root static mounts (`X-GQC-Page-Mount: legacy-static`).

Integration tests `GQC-03-INT-01`, `GQC-03-INT-02`, and `GQC-03-INT-03` in `tests/unit/target-policy-and-config.test.mjs` verify live responses and mount headers across all three page mounts.

## 2. Effective CORS and CSP Policy

### CORS Allowlist

- `buildCorsAllowlist()` (`js/harness/target-membrane.js`) combines `baseCorsOrigins`, active server loopback origins (`localhost` and `127.0.0.1`), and origins from `labTargets` entries where `status === "allowed"` and `targetType !== "blocked"`.
- Targets marked `status: "blocked"` or `targetType: "blocked"` (`https://github.com`, `https://www.google.com`, `https://developer.mozilla.org`) are excluded from `dynamicOrigins`.
- Legacy hardcoded `res.header('Access-Control-Allow-Origin', '*')` overrides on `/api/rooms` and `/api/config` were removed so blocked origins receive no `Access-Control-Allow-Origin` header on any HTML or JSON route.
- Effective allowed origins on port `3000`/`3001`:
  `http://localhost:3000`, `http://localhost:3001`, `http://127.0.0.1:3000`, `http://127.0.0.1:3001`, `http://localhost:4321`, `http://localhost:4322`, `http://localhost:8765`, `https://pkc.pub`, `https://test.pkc.pub`, `https://dev.pkc.pub`, `https://henry.pkc.pub`, `http://127.0.0.1:5320`.

### Content Security Policy

- Owner and compatibility approval: Product Manager, Architect, and UX Designer (`DECISIONS.tsv` row `bmad-security-and-config`, `2026-10-27T15:01:35Z`).
- Applied identically across `astro-prerendered`, `astro-ssr-handler`, `legacy-static` in `ws-server.js`, and `server.headers` in `astro.config.mjs` for `astro dev` on port `4322`.
- Wildcard `*` sources on `default-src`, `connect-src`, and `frame-src` and `'unsafe-eval'` on `script-src` are removed.
- Astro inline bootstrap choice: `'unsafe-inline'` is retained in `script-src` and `style-src` with recorded owner (Architect and Product Manager) because Astro 6 island hydration emits inline `<script type="module">` bootstrap blocks and `app.html` contains 28 legacy inline handlers; adding CSP hashes or nonces in CSP3 disables `'unsafe-inline'` and breaks `app.html` until `GQC-04`/`GQC-05` complete module extraction.
- Verbatim `Content-Security-Policy` header:
  `default-src 'self'; base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://esm.run https://tikzjax.com https://apis.google.com https://accounts.google.com https://www.youtube.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://tikzjax.com; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://tikzjax.com; img-src 'self' data: blob: https:; media-src 'self' data: blob:; connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://unpkg.com https://esm.run https://en.wikipedia.org https://www.googleapis.com https://www.youtube.com https://faro-collector-prod-us-central-0.grafana.net https://faro-collector-prod-ap-southeast-2.grafana.net; frame-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https://calendar.google.com https://grafana.pkc.pub https://www.youtube.com`

## 3. Target Classification, Fail-Closed Capture, and Source Lifecycle

- **Target classes** (`VALID_TARGET_TYPES` in `js/harness/target-membrane.js`): `spa`, `mpa-candidate`, `webapp`, `probe-fixture`, `blocked`, `custom`, `undecided`.
- **Identity separation**: `app-config.json` carries application target identity (`id`, `url`, `targetType`, `status`), keeping Page/Place and Transition graphs separate (`src/net/workbench-net.yaml`, `tests/fixtures/spa-test-target.graph.json`, and PenPot conformance specs cannot authorize capture origins).
- **Single-source toolbar controls**: `js/harness/lab-toolbar.js` derives both `#public-site-selector` options and `#target-quick-chips` buttons (`quickLaunch: true`) from `/app-config.json`, eliminating hardcoded quick-launch HTML.
- **Fail-closed `createCaptureSource()`** (`js/harness/membrane-interceptor.js`):
  - Rejects empty or non-matching `allowedOrigins` for cross-origin URLs and returns an `unavailable` source with explicit `reason`.
  - Enforces exact `scheme + host + port` origin equality (`http://localhost:3001 !== http://127.0.0.1:3001`).
  - Rejects `blocked`, `custom` (unlisted), `undecided`, and malformed/non-http(s) `?target=` values before capture can start.
- **Bounded handshake and navigation invalidation** (`js/harness/capture-probe-agent.js` & `js/harness/lab-runtime.js`):
  - Bounds cross-origin `lab:ping` -> `lab:hello` negotiation to `5000ms` (`DEFAULT_HANDSHAKE_TIMEOUT_MS = 5000`), clearing the retry interval on expiry and transitioning UI to `handshake-timeout` (`Policy: Handshake Timeout (Capture Unavailable)`), distinct from `blocked` (`#cors-block-alert` remains hidden).
  - Revalidates iframe navigations and redirects; navigating an active target to an unapproved origin immediately finalizes/stops active recording, replaces the source with `unavailable`, and rejects subsequent messages so zero redirected-origin events enter the saved MCard run.
  - Monotonic target-switch epoch fencing discards in-flight probe messages from a superseded target so late messages never attach to the newly selected target.
- **Deterministic cleanup and service worker hygiene**:
  - `InteractionRecorder.setSource()` (`js/harness/recorder.js`) invokes `destroy()` on replaced sources, clearing window `message` listeners, iframe `load` listeners, retry/timeout timers, callbacks, telemetry receivers, and session nonces.
  - `RecordingRibbonIsland.jsx` unmounts release the active capture source via `runtime.detachRibbon()` even when the target URL has not changed (`GQC-03-E2E-08`: 50 mount/unmount cycles return sources, listeners, and timers to exact baseline).
  - `lab-runtime.js` unregisters stale workbench service workers (`sw.js`, `public/sw.js`, `sw-clm.js`) on `localhost` and `127.0.0.1` once per boot.
- **Preserved boundaries**: `server/mcard-probe-policy.mjs` and `tests/single-page-mcard.test.mjs` remain untouched, preserving SSRF/framing checks on `/api/mcard/probe-url`; password and `data-redact` input redaction remain enforced prior to recording buffer insertion.

## 4. Workbench Petri Net Updates (`src/net/workbench-net.yaml`)

- Configuration call Transitions: `t_req_get_app_config` -> `p_pending_get_app_config` -> `t_ok_get_app_config` / `t_fail_get_app_config` (alongside `t_req_get_env` -> `t_ok_get_env` / `t_fail_get_env`).
- Probe handshake Transitions: `t_req_probe_handshake` -> `p_pending_probe_handshake` -> `t_ok_probe_handshake`, `t_fail_probe_handshake_unavailable`, or `t_fail_probe_handshake_timeout`.
- Policy error Places and recovery Transitions back to `p_page_responsive_lab`:
  - `p_error_target_blocked` (`t_enter_target_blocked` -> `t_recover_target_blocked`)
  - `p_error_capture_unavailable` (`t_fail_probe_handshake_unavailable` -> `t_recover_capture_unavailable`)
  - `p_error_handshake_timeout` (`t_fail_probe_handshake_timeout` -> `t_recover_handshake_timeout`)
  - `p_error_target_unapproved` (`t_enter_target_unapproved` -> `t_recover_target_unapproved`)
- `npm run check:net`: `PASS` (`places=28 transitions=56 reachableMarkings=27 sessionPInvariant=true coverage=20/56` on `workbench-net.yaml`; `4/4` on `spa-test-target.graph.json`).

## 5. Automated Test Verification Summary

| Suite / Command | Result | Coverage Highlights |
| --- | --- | --- |
| `npm run build` | `PASS` (`exit=0`) | `@pkc/core`, `@pkc/markdown-renderer`, Astro build, and `[gqc-net-parity] PASS`. |
| `npm run check:net` | `PASS` (`exit=0`) | Reachability, deadlock-freedom, session P-invariant, and recovery paths verified. |
| `npm run test:unit` | `147/147 PASS` | Includes `tests/unit/target-policy-and-config.test.mjs` (`GQC-03-UNIT-01..06`, `GQC-03-INT-01..03`), `tests/single-page-mcard.test.mjs`, `check-net.test.mjs`, and `net-trace-replay.test.mjs`. |
| `npm run check:playwright-discovery` | `PASS` (`exit=0`) | `smoke`: 30 tests (11 files), `components`: 18 tests (14 files), `features`: 584 tests (21 files), 0 cross-browser duplicates. |
| `npm run test:smoke` | `30/30 PASS` | Smoke suite green under tightened CSP and hoisted config routes. |
| `npm run test:components` | `18/18 PASS` | Component suite green. |
| `npx playwright test tests/features/responsive-capture.spec.js --project=features` | `16/16 PASS` | Preserves `C1..C8` and verifies `GQC-03-E2E-01..08` with zero flaky retries. |
| Regression feature suites (`astro-host-parity`, `spa-workbench-journey`, `spa-failure-recovery`, `responsive-lab-islands`, `responsive-rotation-and-devices`, `responsive-replay`, `device-conformance`, `systematic-landing-test`) | `72/72 PASS` | Includes 50-cycle island mount/unmount (`GQC-02B-E2E-04`), 56/56 device conformance, and 16/16 systematic landing checks. Note: read-only `presentation-lattice.spec.js` navigates to `/` without `?noredirect=1` and hits the pre-existing trunk `9e08c3c` redirect to `responsive-lab.html` identically on trunk `424022c` and head. |

## 6. Live Chromium Lanes (10/10 PASS)

Machine-readable manifest: `/tmp/swarm-PR-GQC-03/lanes-all.json`. Screenshots: `/tmp/swarm-PR-GQC-03/worker-1/lane-1.png` through `lane-10.png`.

| Lane | Scenario | Verdict | Key Recorded Evidence |
| --- | --- | --- | --- |
| Lane 1 | Trunk vs head SPA regression & config contracts | `PASS` | `X-GQC-Mount: ws-server-config`, `Type: spa`, `cspViolations: 0`. |
| Lane 2 | Approved same-origin SPA target matches registry | `PASS` | Selector, `#mission-control-iframe`, `Type: spa`, and `same-origin` capture source agree. |
| Lane 3 | Approved cross-origin probe handshake & exact origin | `PASS` | `probe-agent` handshake completes on `http://127.0.0.1:<port>` (`approved-probe`). |
| Lane 4 | No-agent target bounded timeout distinct from frame-policy block | `PASS` | `5000ms` timeout -> `handshake-timeout`, retry timers cleared, `#cors-block-alert` hidden, `#btn-target-recover` visible. |
| Lane 5 | Forged `lab:hello` and event from rogue frame | `PASS` | Both messages rejected and counted (`rejected: 2`, `source_mismatch: 2`), 0 recorded events. |
| Lane 6 | Mid-recording origin change and `127.0.0.1` vs `localhost` spoofing | `PASS` | Capture stops (`FINALIZED`), source switches to `unavailable`, zero redirected/forged events in saved run. |
| Lane 7 | Switch targets 50 times listener/timer leak check | `PASS` | Window listeners (`13 -> 13`), document listeners (`7 -> 7`), active intervals (`0`), active timeouts (`0`). |
| Lane 8 | Blocked target UI, disabled capture, CORS exclusion, CSP | `PASS` | `https://github.com` shows `#cors-block-alert`, `#btn-rec-start` disabled, `Access-Control-Allow-Origin: null` for `Origin: https://github.com`. |
| Lane 9 | Password input redaction in persisted MCard run | `PASS` | Saved run `753e0e60...` stores `<redacted>` for `#pwd` and preserves non-sensitive text. |
| Lane 10 | Malformed and unapproved `?target=` query values | `PASS` | `http://[::1` -> `invalid-target`, `https://unapproved.example/app` -> `custom-unapproved`; capture disabled and `#btn-target-recover` restores default target. |

## 7. Paired Interleaved Trunk vs Head Performance Probe

Raw artifact: `/tmp/swarm-PR-GQC-03/perf-results.json`.
Environment: `darwin 25.6.0 (arm64)`, Apple M4 Max (16 cores), Node `v24.21.0`, Chromium `156.0.8078.4`, `Cache-Control: no-store`, workbench origin `http://localhost:<port>`, cross-origin probe target `http://127.0.0.1:<port>/tests/fixtures/probe-target.html`, 1 discarded warmup + 10 paired interleaved trials (`A/B` then `B/A`), 50 cross-origin clicks per trial (`500` messages per variant, `errors: 0`).

| Metric | Variant | n | min (ms) | p50 (ms) | p75 (ms) | p95 (ms) | max (ms) | mean (ms) | stddev (ms) | Delta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `target-selection-to-ready` | Trunk (`424022c`) | 10 | 4.7 | 5.1 | 5.1 | 6.9 | 6.9 | 5.19 | 0.597 | baseline |
| `target-selection-to-ready` | Head (`PR-GQC-03`) | 10 | 7.0 | 12.4 | 13.4 | 14.3 | 14.3 | 11.80 | 2.257 | `p75 +8.3ms` |
| `message-to-capture` | Trunk (`424022c`) | 500 | 0.005 | 0.1 | 0.2 | 0.4 | 0.8 | 0.123 | 0.150 | baseline |
| `message-to-capture` | Head (`PR-GQC-03`) | 500 | 0.005 | 0.2 | 0.4 | 0.6 | 1.2 | 0.235 | 0.213 | `p95 +0.2ms` |

### Limiter and Added Validation Analysis

- **Budget evaluation**: `gqc-plan.md:594` fails only if a ratified blocking budget regresses `p75 target-selection-to-ready` by **both** `>10%` and `>100ms`. Head `p75` is `13.4ms` (`+8.3ms` over trunk `5.1ms`), more than `86ms` below the `+100ms` blocking floor (`budgetRuleRegressionFailed: false`).
- **Added validation cost**: Standalone microbenchmark of `classifyTargetSelection()` over 10,000 iterations measures `10.75 us/call` (`0.011ms`). Sub-phase browser instrumentation confirms synchronous policy classification + source creation takes `0.30ms` mean on head vs `0.13ms` on trunk (`+0.17ms`), while exact `scheme + host + port` origin comparison in `CaptureProbeAgentSource._handleMessage()` adds `<1 us` per message.
- **Physical limiter**: `97.5%` of head `target-selection-to-ready` (`11.50ms` of `11.80ms` mean) is Chromium OOPIF navigation + `lab-probe-agent.js` ES module fetch/parse + cross-frame `postMessage` `lab:ping`/`lab:hello`/`lab:ack` round-trip. Head sends `Cache-Control: no-cache, no-store, must-revalidate` on `.js`/`.mjs` modules (`ws-server.js:163-168`) to prevent stale script/worker state on `localhost`, adding ~`6.4ms` of uncached loopback ES module fetch compared to trunk's cached `.js` assets.

## 8. Review Gate Media Packet

Saved to `/Users/bkoo/.gemini/antigravity/brain/14f19ca3-de52-4d39-aa1d-a8fb39970525/review-PR-GQC-03/`:

1. `01-approved-target-capture.png`: Cross-origin `probe-target.html` connected (`Source: probe-agent`, `Type: probe-fixture`) actively recording pointer and redacted password interactions.
2. `02-blocked-target-recovery.png`: Blocked target `https://github.com` displaying Browser Sandbox Boundary alert (`X-Frame-Options: DENY`), `Type: blocked`, `Policy: Blocked Frame Policy`, disabled `Start`, and `Reset to Default Target` recovery button.
3. `03-capture-unavailable-timeout.png`: Approved cross-origin `probe-target-noagent.html` after bounded `5000ms` timeout displaying `Policy: Handshake Timeout (Capture Unavailable)`, hidden sandbox alert, registry-derived quick-launch chips, and `Reset to Default Target`.
4. `gqc-03-policy-and-lifecycle-walkthrough.webm`: `41.16s` (`5,837,332` bytes, verified via `ffprobe`) end-to-end walkthrough of approved SPA selection, cross-origin probe capture with password redaction, blocked-target rejection and recovery, 5s handshake timeout, and unapproved `?target=` rejection and recovery.
