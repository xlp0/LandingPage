# GQC-06 SPA Workbench, Astro Island, and Place-Transition Baselines

## Validation Metadata

| Field | Value |
| --- | --- |
| Sprint | `SPRINT-GQC-06` (`PR-GQC-06`) |
| Trunk commit (`PR-GQC-05`) | `e43ec38d146980cd4d7c27798da81d5c0b6c299d` |
| Pre-Astro baseline commit (`GQC-00`) | `843cf652650746501d7ea270ecdd1a0f493ec559` |
| Probe suite version | `gqc-06-paired-benchmark/1.0.0` |
| Browser and engine | Headless Chromium `156.0.8078.4` via Playwright |
| Runtime and OS | Node.js `v24.21.0`, macOS (`darwin 25.6.0`, `arm64`, Apple M4 Max, 16 cores) |
| Viewport and scale | `1440 x 900`, `deviceScaleFactor = 1` (`393 x 852`, `dpr = 3` for small-screen conformance) |
| Network mode | Dedicated `127.0.0.1` loopback per server with non-local WAN requests stubbed at the Playwright boundary |
| Seeded SQLite fixture | `data/mcard-api.db` (`94,208 B`, SHA-256 `896d1894f7be8238ac9c1dce4895b64b91ccf5c7adc7dc730b3c4a601e3ff7ff`) |
| Paired trial protocol | 3 discarded warm-ups per side followed by 21 counterbalanced `AB / BA` interleaved trials per side |
| Budget owners | Product Manager (absolute user-facing budgets), Architect (module and island boundaries), TEA (probe determinism and CI gates) |

---

## Probe Commands

Run these commands from the repository root after `npm run build` completes.

```bash
npm run build
node tests/performance/place-bytes.mjs --enforce-zero-island-places
node tests/performance/place-bytes.mjs --markdown
node --test tests/unit/performance-probes.test.mjs
npx playwright test tests/features/performance-baselines.spec.js --project=features
node tests/performance/run-paired-benchmark.mjs --warmups=3 --samples=21 --out=/tmp/swarm-PR-GQC-06/perf-results.json
node tests/performance/run-live-lanes.mjs
```

---

## Metric Definitions and Separation Rules

1. **Application ready time (`readyMs`)** measures navigation start until the route-specific interactive DOM marker settles. Isolated `ws-server.js` startup (`197.6 ms` on Astro head, `190.6 ms` on trunk, `128.1 ms` on pre-Astro `843cf65`) completes before browser contexts open and never enters `readyMs`.
2. **External WAN isolation** stubs third-party origins such as `fonts.googleapis.com` at the Playwright context boundary. Unstubbed WAN font fetches added `795.3 ms` (`921.3 ms` vs `126.0 ms`) during diagnostic profiling without changing application JavaScript work.
3. **Missing, invalid, and zero distinction** is enforced by `normalizeMetricValue` in `tests/performance/metrics-model.mjs`. Unsupported browser observers remain `missing` (`null`), negative or `NaN` readings become `invalid`, and genuine `0` readings stay numeric `0`.
4. **SPA and MPA separation** is enforced by `assertDisjointSurfaceSamples`. Every SPA sample carries `targetType = "spa"` along with `routeHandle`, `pageId`, `placeId`, and `transitionId`. PenPot MPA promotion remains deferred under `GQC-05` and `DECISIONS.tsv` row 46, so zero MPA samples enter SPA series.
5. **Test-only hydration marks** are injected through `ISLAND_HYDRATION_INIT_SCRIPT` in `tests/performance/hydration-init-script.mjs`. Production runtime files contain zero hydration mark code.

---

## Per-Place Client JavaScript Bytes and Proposed Advisory Budgets

Static manifest analysis (`analyzePlaceBytes`) inspects `dist/client/` against `src/net/workbench-net.yaml` and reconciles eager downloads with live Chromium network logs (`reconcilePlaceBytesWithNetwork`).

| Place ID | Kind | Route | Migration State | Islands | Eager Island Bundles (raw / gzip / br) | Eager Shared Chunks (raw / gzip / br) | Page Scripts Before Interaction (raw / gzip / br) | Total Cold JS Before Interaction (raw / gzip / br) | Proposed Advisory Raw Budget | Gate Mode |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `p_page_index` | `page` | `/` | `astro-wrapped` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 B` island JS | **Blocking** (`0 B` island JS) |
| `p_page_responsive_lab` | `page` | `/responsive-lab.html` | `astro-islands` | 7 (5 eager, 2 `client:visible`) | `76,787 / 22,268 / 19,699 B` | `72,304 / 23,569 / 21,275 B` | `0 / 0 / 0 B` | `149,091 / 45,837 / 40,974 B` | `165,000 B` eager (`175,000 B` all islands) | Advisory pending PM approval |
| `p_page_app` | `page` | `/app.html` | `astro-wrapped` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `511,208 / 130,050 / 101,824 B` | `511,208 / 130,050 / 101,824 B` | `0 B` island JS, `550,000 B` page JS | **Blocking** (`0 B` island JS), total advisory |
| `p_page_sprint_registry` | `page` | `/sprint-registry.html` | `astro-wrapped` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 B` island JS | **Blocking** (`0 B` island JS) |
| `p_page_fiber_inspector` | `page` | `/fiber-inspector.html` | `astro-wrapped` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `42,111 / 14,757 / 12,651 B` | `42,111 / 14,757 / 12,651 B` | `0 B` island JS, `50,000 B` page JS | **Blocking** (`0 B` island JS), total advisory |
| `p_page_fiber_conformance` | `page` | `/fiber-conformance.html` | `astro-wrapped` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `42,111 / 14,757 / 12,651 B` | `42,111 / 14,757 / 12,651 B` | `0 B` island JS, `50,000 B` page JS | **Blocking** (`0 B` island JS), total advisory |
| `p_view_index_mcard_viewer` | `view` | `/index.html?noredirect=1` | `astro-wrapped` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `85,224 / 26,240 / 22,318 B` | `85,224 / 26,240 / 22,318 B` | `0 B` island JS, `160,000 B` dynamic network JS | **Blocking** (`0 B` island JS), total advisory |
| `p_undecided_pkc_docs_index` | `static` | `/pkc-docs-index.html` | `astro-wrapped` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 B` island JS | **Blocking** (`0 B` island JS) |

### Shared Chunk and Deferred Island Reconciliation on `p_page_responsive_lab`

- Four shared `/_astro/` chunks load once per cold navigation (`client.DCqeKAjC.js` `3,019 B`, `hooks.CTRUpJPk.js` `2,602 B`, `preact.DXiQkeWQ.js` `10,894 B`, and `jsxRuntime.DbkQS_pz.js` `55,789 B` containing `preact/jsx-runtime` plus shared `js/harness/lab-runtime.js`), totaling `72,304 B` raw (`23,569 B` gzip, `21,275 B` brotli) and saving `412,691 B` of duplicate module downloads across the seven islands.
- Live Chromium cold network transfer on `/responsive-lab.html` decoded `149,091 B` across 9 `/_astro/*.js` responses, matching `astroEagerBeforeInteraction.rawBytes` (`76,787 B + 72,304 B = 149,091 B`) with `0 B` delta.
- Two below-the-fold islands (`ConformancePanelIsland.BRbv_r7Q.js` `3,994 B` and `MCardResultIsland.C3wgPOl0.js` `2,969 B`, totaling `6,963 B` raw) stay inside closed `<details>` elements under `client:visible` and download `0 B` during cold boot.
- On `/index.html?noredirect=1`, static `<script type="module" src>` tags total `85,224 B` raw while ESM dynamic sub-imports bring live network decoded JS to `147,342 B` (`0 B` from `/_astro/`). On `/app.html`, ESM sub-imports add `6,681 B` (`517,889 B` live network decoded vs `511,208 B` static `<script>` tags, `0 B` from `/_astro/`).

---

## Per-Island Cold and Deferred Hydration Baselines (`n = 21`)

| Island | Directive | Bundle Size (raw / gzip / br) | Cold Nav-to-Hydrated Median | p95 | Min to Max | Disclosure Trigger-to-Hydrated Median | Long Tasks (`>= 50 ms`) Across 21 Runs | Directive Review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RecordingRibbonIsland` | `client:load` | `8,524 / 2,831 / 2,404 B` | `59.2 ms` | `60.2 ms` | `51.8 .. 60.2 ms` | Eager on boot | `0` | Keep `client:load` (first-viewport top header) |
| `DevicePresetsIsland` | `client:load` | `8,216 / 2,782 / 2,413 B` | `58.9 ms` | `59.9 ms` | `51.6 .. 60.1 ms` | Eager on boot | `0` | Keep `client:load` (first-viewport preset bar) |
| `TargetToolbarIsland` | `client:load` | `12,505 / 4,255 / 3,761 B` | `59.8 ms` | `60.8 ms` | `54.2 .. 61.1 ms` | Eager on boot | `0` | Keep `client:load` (primary URL and target selector) |
| `SpaTestWorkflow` | `client:load` | `45,582 / 11,471 / 10,344 B` | `59.8 ms` | `60.8 ms` | `54.7 .. 61.0 ms` | Eager on boot | `0` | Keep `client:load` (primary P0 guided workflow rail) |
| `ViewportStageIsland` | `client:only="preact"` | `1,960 / 929 / 777 B` | `58.4 ms` | `59.4 ms` | `53.8 .. 59.6 ms` | Eager on boot | `0` | Keep `client:only="preact"` (live iframe membrane host) |
| `ConformancePanelIsland` | `client:visible` | `3,994 / 1,547 / 1,262 B` | `187.7 ms` (after disclosure click) | `189.3 ms` | `171.3 .. 189.3 ms` | `80.0 ms` | `0` | Keep `client:visible` (collapsed `<details>` drawer) |
| `MCardResultIsland` | `client:visible` | `2,969 / 961 / 822 B` | `257.2 ms` (after second disclosure click) | `273.0 ms` | `255.0 .. 273.4 ms` | `82.5 ms` | `0` | Keep `client:visible` (collapsed `<details>` drawer) |

---

## P0 SPA Journey and Workbench Baselines (`n = 21`, Trunk `e43ec38` vs Head `PR-GQC-06`)

| Stage / Metric | Surface | Page / Place / Transition | Ready Condition | Trunk Median (`IQR`) | Head Median (`IQR`) | Head p95 | Min to Max (Head) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cold workbench ready | `workbench` | `page_responsive_lab` / `p_page_responsive_lab` | `!body.lab-booting && [data-workflow-ready="true"]` | `105.3 ms` (`9.0 ms`) | `105.7 ms` (`1.9 ms`) | `114.4 ms` | `89.2 .. 115.1 ms` |
| Warm workbench ready | `workbench` | `page_responsive_lab` / `p_page_responsive_lab` | Same context reload ready marker | `63.6 ms` (`1.1 ms`) | `63.3 ms` (`0.7 ms`) | `64.2 ms` | `54.7 .. 64.4 ms` |
| Cold LCP / CLS / Long tasks | `workbench` | `p_page_responsive_lab` | Browser `PerformanceObserver` | `40.0 ms` / `0.0004` / `0` | `40.0 ms` / `0.0004` / `0` | `44.0 ms` | `40.0 .. 44.0 ms` |
| SPA target load | `spa` | `page_spa_overview` / `p_spa_overview` | `#spa-app-root[data-place-id="p_spa_overview"]` | `70.83 ms` (`1.53 ms`) | `71.23 ms` (`1.43 ms`) | `72.89 ms` | `68.16 .. 73.41 ms` |
| Capture start | `spa` | `p_spa_overview` | `workflow-recorder-state === RECORDING` | `34.96 ms` (`1.01 ms`) | `35.36 ms` (`0.80 ms`) | `36.70 ms` | `33.68 .. 37.40 ms` |
| Declared Functional Link | `spa` | `p_spa_overview -> p_spa_details` (`t_spa_open_details`) | `#spa-app-root[data-place-id="p_spa_details"]` | `33.35 ms` (`0.83 ms`) | `33.09 ms` (`0.75 ms`) | `34.37 ms` | `31.32 .. 35.39 ms` |
| SPA unmapped error probe | `spa` | `p_spa_overview -> p_spa_missing_transition` (`t_spa_invalid_unmapped`) | `#spa-app-root[data-place-id="p_spa_missing_transition"]` | `386.50 ms` (`1.60 ms`) | `385.95 ms` (`1.74 ms`) | `388.22 ms` | `235.59 .. 389.32 ms` |
| SPA recovery link | `spa` | `p_spa_missing_transition -> p_spa_overview` (`t_spa_recover_overview`) | `#spa-app-root[data-place-id="p_spa_overview"]` | `31.81 ms` (`1.18 ms`) | `32.09 ms` (`0.94 ms`) | `33.68 ms` | `29.62 .. 33.68 ms` |
| MCard save request | `workbench` | `p_page_responsive_lab -> p_pending_post_test_runs` (`t_req_post_test_runs`) | `POST /api/test-runs` dispatched | `32.59 ms` (`1.16 ms`) | `32.29 ms` (`1.20 ms`) | `33.71 ms` | `30.93 .. 34.32 ms` |
| MCard save `ok` receipt | `workbench` | `p_pending_post_test_runs -> p_page_responsive_lab` (`t_ok_post_test_runs`) | HTTP 201 and `capture-completeness-badge[complete]` | `16.84 ms` (`0.96 ms`) | `16.52 ms` (`0.81 ms`) | `17.27 ms` | `15.28 .. 18.34 ms` |
| Result inspection | `workbench` | `p_page_responsive_lab` (`MCardResultIsland`) | `#mcard-result-summary-badge` hash prefix | `80.84 ms` (`1.01 ms`) | `80.81 ms` (`0.89 ms`) | `82.22 ms` | `78.50 .. 82.32 ms` |
| Deterministic replay | `spa` | `p_spa_details` (`t_spa_open_details`) | `replayRun` `verdict === "pass"` | `370.14 ms` (`1.79 ms`) | `370.14 ms` (`3.75 ms`) | `371.97 ms` | `362.04 .. 372.67 ms` |
| 60s resize and rotate stress | `workbench` | `p_page_responsive_lab` (328 ops, 3,610 frames) | `normalizeFrameSample` (`noncePreserved = true`) | Advisory | `16.70 ms` p95 | `16.70 ms` | `max = 16.80 ms` |
| 50x target switch stability | `workbench` | `probe-target.html <-> spa-test-target.html` | Target ready, `0` active intervals, `0` listener growth | Advisory | `33.31 ms` (`0.13 ms`) | `33.48 ms` | `32.00 .. 33.64 ms` |

---

## Per-Kind Workbench Transition Latencies (`n = 21`)

Server-call Transitions report request dispatch and `ok` or `fail` completion separately as required by `src/net/workbench-net.yaml`.

| Transition Kind | Representative Transition ID | From -> To Place | Head Median | Head p75 | Head p95 | Head Min to Max |
| --- | --- | --- | --- | --- | --- | --- |
| `redirect` | `t_redirect_index_to_lab` | `p_page_index -> p_page_responsive_lab` | `79.42 ms` | `80.39 ms` | `80.86 ms` | `77.07 .. 80.88 ms` |
| `link` | `t_link_lab_to_app` | `p_page_responsive_lab -> p_page_app` | `109.99 ms` | `111.97 ms` | `113.66 ms` | `107.72 .. 114.27 ms` |
| `server-call-request` | `t_req_post_test_runs` | `p_page_responsive_lab -> p_pending_post_test_runs` | `32.29 ms` | `33.00 ms` | `33.71 ms` | `30.93 .. 34.32 ms` |
| `server-call-ok` | `t_ok_post_test_runs` | `p_pending_post_test_runs -> p_page_responsive_lab` | `16.52 ms` | `16.96 ms` | `17.27 ms` | `15.28 .. 18.34 ms` |
| `server-call-fail` | `t_fail_get_conformance_latest` | `p_pending_get_conformance_latest -> p_page_responsive_lab` | `15.27 ms` | `16.63 ms` | `17.72 ms` | `13.80 .. 17.78 ms` |
| `client-route` | `t_enter_target_blocked` | `p_page_responsive_lab -> p_error_target_blocked` | `41.88 ms` | `42.48 ms` | `43.17 ms` | `39.63 .. 43.41 ms` |
| `recover` | `t_recover_target_blocked` | `p_error_target_blocked -> p_page_responsive_lab` | `366.73 ms` | `368.25 ms` | `384.73 ms` | `362.24 .. 385.42 ms` |
| `open-external` | `t_open_external_monopoly` | `p_page_app -> p_external_games` | `45.33 ms` | `46.38 ms` | `46.80 ms` | `42.37 .. 48.08 ms` |

---

## Pre-Astro Baseline (`843cf65`) vs Astro Head Comparison (`n = 21`)

| Shared Surface | Place ID | Pre-Astro `843cf65` Median (`p95`) | Astro Head Median (`p95`) | Pre-Astro Cold JS | Astro Head Cold JS | Finding |
| --- | --- | --- | --- | --- | --- | --- |
| `/` redirect to Lab | `p_page_index -> p_page_responsive_lab` | `75.85 ms` (`79.00 ms`) | `125.85 ms` (`126.57 ms`) | `112,756 B` | `149,091 B` | `+50.00 ms` and `+36,335 B` from Astro island bootstrap plus `SpaTestWorkflow` added in `GQC-01..03` |
| `/index.html?noredirect=1` | `p_view_index_mcard_viewer` | `42.10 ms` (`43.57 ms`) | `41.03 ms` (`45.81 ms`) | `195,572 B` | `147,342 B` | `-1.07 ms` median and `-48,230 B` (`-24.7%`) decoded JS with `0 B` island overhead |
| `/responsive-lab.html` | `p_page_responsive_lab` | `75.15 ms` (`99.10 ms`) | `121.11 ms` (`122.11 ms`) | `112,756 B` | `149,091 B` | `+45.96 ms` median (`IQR` narrowed from `24.43 ms` to `0.66 ms`) with `0` long tasks |
| `/app.html` | `p_page_app` | `48.89 ms` (`49.44 ms`) | `49.39 ms` (`50.48 ms`) | `517,889 B` | `517,889 B` | Parity (`+0.50 ms`), `0 B` island JS, `0` WebLLM model requests before AI selection |
| `/sprint-registry.html` | `p_page_sprint_registry` | `19.81 ms` (`20.05 ms`) | `20.24 ms` (`20.54 ms`) | `0 B` | `0 B` | Parity (`+0.44 ms`), `0 B` client JS |
| `/fiber-inspector.html` | `p_page_fiber_inspector` | `22.39 ms` (`22.75 ms`) | `23.03 ms` (`23.57 ms`) | `42,111 B` | `42,111 B` | Parity (`+0.65 ms`), `0 B` island JS |
| `/fiber-conformance.html` | `p_page_fiber_conformance` | `16.53 ms` (`16.96 ms`) | `17.19 ms` (`18.14 ms`) | `42,111 B` | `42,111 B` | Parity (`+0.67 ms`), `0 B` island JS |
| `/pkc-docs-index.html` | `p_undecided_pkc_docs_index` | `19.83 ms` (`20.47 ms`) | `20.15 ms` (`20.51 ms`) | `0 B` | `0 B` | Parity (`+0.32 ms`), `0 B` client JS |
| Probe-target load + rotate | `p_page_responsive_lab` | `105.71 ms` (`122.58 ms`) | `139.31 ms` (`170.56 ms`) | `112,756 B` | `149,091 B` | Reflects the same one-time `+36.3 KB` Preact island boot cost on `responsive-lab.html` |

---

## Limiter Attribution and Verified No-Change Decision

Dedicated CDP profiling (`Performance.getMetrics` and `Profiler` at `100 us` sampling outside timed runs) on cold `/responsive-lab.html` recorded `ScriptDuration = 10.52 ms`, `V8CompileDuration = 0.56 ms`, `RecalcStyleDuration = 3.94 ms`, `LayoutDuration = 44.28 ms`, `JSHeapUsedSize = 8,390,876 B`, and `0` long tasks (`>= 50 ms`). Cold `readyMs` (`105.7 ms` median) is bounded by Chromium context initialization (`~40 ms`), loopback fetch and HTML/ESM parse (`~32 ms`), and the intentional two-frame `requestAnimationFrame` paint-settlement barrier (`2 * 16.67 ms = 33.3 ms`) in `js/harness/lab-runtime.js` before removing `body.lab-booting`.

Because all five eager islands occupy the initial viewport, both below-the-fold drawers already use `client:visible` (`0 B` cold download), all island-free Places ship `0 B` of island JavaScript, Mission Control downloads `0 B` of WebLLM model weights before user selection, and 50 consecutive target switches leak `0` listeners and `0` intervals, **no reproducible application bottleneck exists**. Per `SPRINT-GQC-06` rules, `PR-GQC-06` modifies zero production files and records a verified no-change decision.
