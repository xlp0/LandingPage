# GQC-06 Performance Baselines, Limiter Attribution, and Optimization Decision Report

## Executive Verdict

`SPRINT-GQC-06` (`PR-GQC-06`) measured the guided P0 SPA workbench journey, all seven Astro Preact islands, all eight Layer 1 Transition kinds, all four universal Single-Page MCard modalities, and the pre-Astro `843cf65` baseline using 3 discarded warm-ups plus 21 counterbalanced `AB / BA` interleaved trials per side on quiet loopback infrastructure.

No reproducible application bottleneck reproduced. Cold Responsive Lab ready time (`105.7 ms` median, `IQR = 1.9 ms`, `0` long tasks) executes `10.52 ms` of total JavaScript (`0.56 ms` V8 compile) and is bounded by Chromium context startup (`~40 ms`), loopback fetch and HTML/ESM parsing (`~32 ms`), and the intentional two-frame `requestAnimationFrame` settlement barrier (`33.3 ms`) in `js/harness/lab-runtime.js`. All five island-free `page` Places ship `0 B` of island JavaScript, below-the-fold disclosures already defer via `client:visible` (`0 B` cold download), Mission Control downloads `0 B` of WebLLM model weights before user selection, and 50 consecutive target switches leak `0` listeners and `0` intervals.

Per `SPRINT-GQC-06` acceptance criteria, **zero production files and zero island directives were modified**. The sprint records a **verified no-change decision**, enforces the deterministic zero-island JavaScript gate in CI, and keeps timing and byte budgets advisory pending Product Manager ratification.

---

## Measurement Environment and Provenance

| Attribute | Value |
| --- | --- |
| Sprint and PR | `SPRINT-GQC-06` / `PR-GQC-06` |
| Trunk SHA (`PR-GQC-05`) | `e43ec38d146980cd4d7c27798da81d5c0b6c299d` |
| Pre-Astro baseline SHA (`GQC-00`) | `843cf652650746501d7ea270ecdd1a0f493ec559` |
| Head SHA | `e43ec38d146980cd4d7c27798da81d5c0b6c299d+PR-GQC-06-no-prod-change` |
| Browser | Headless Chromium `156.0.8078.4` (`@playwright/test`) |
| OS and CPU | macOS `darwin 25.6.0` (`arm64`), Apple M4 Max (16 cores), Node.js `v24.21.0` |
| Viewport | `1440 x 900` (`deviceScaleFactor = 1`), `393 x 852` (`dpr = 3`, coarse touch) for small-screen conformance and touch replay |
| Network isolation | Isolated `127.0.0.1` ports (`14311`, `14312`, `14313`) with external WAN requests stubbed at the Playwright boundary |
| Server startup separation | Excluded from navigation samples (`head = 197.56 ms`, `trunk = 190.55 ms`, `preAstro = 128.12 ms` recorded separately) |
| Seeded SQLite fixture | `data/mcard-api.db` (`94,208 B`, SHA-256 `896d1894f7be8238ac9c1dce4895b64b91ccf5c7adc7dc730b3c4a601e3ff7ff`) |
| Raw sample artifact | `/tmp/swarm-PR-GQC-06/perf-results.json` (`84` measured trials across Pair A and Pair B) |
| Live 10-lane artifact | `/tmp/swarm-PR-GQC-06/lanes-all.json` and `/tmp/swarm-PR-GQC-06/worker-1/lane-1.png` .. `lane-10.png` |
| Review Gate media packet | `/Users/bkoo/.gemini/antigravity/brain/14f19ca3-de52-4d39-aa1d-a8fb39970525/review-PR-GQC-06/` (`43.48 s` VP9 `.webm` video + 5 screenshots) |

---

## CDP Limiter Attribution and External WAN Separation

A dedicated diagnostic pass (`Profiler.start` at `100 us` interval plus `Performance.getMetrics`) ran outside timed trials so profiler overhead never entered the 21-sample distributions.

| Metric | Measured Value | Interpretation |
| --- | --- | --- |
| Cold `readyMs` (external WAN stubbed) | `126.02 ms` | Pure local loopback application boot |
| Cold `readyMs` (external WAN unstubbed) | `921.32 ms` | Adds `+795.30 ms` waiting on external `fonts.googleapis.com` stylesheet TLS/HTTP fetch |
| `ScriptDuration` | `10.52 ms` | Total main-thread JavaScript execution across Astro client and 5 eager Preact islands |
| `V8CompileDuration` | `0.56 ms` | Sub-millisecond script parse and bytecode compilation |
| `RecalcStyleDuration` | `3.94 ms` | CSS cascade calculation |
| `LayoutDuration` | `44.28 ms` | Initial workbench shell and iframe stage layout |
| `JSHeapUsedSize` | `8,390,876 B` (`8.00 MiB`) | Post-boot live heap |
| `Nodes` / `JSEventListeners` | `1,172` / `221` | Bounded initial DOM and listener footprint |
| Long tasks (`>= 50 ms`) | `0` | Zero main-thread blocking tasks during cold boot or island hydration |

Top JavaScript self-time samples in `Profiler.stop` came from `/public/vendor/lucide/lucide.min.js` (`2.12%` of samples, `~2 ms`) and V8 minor GC (`1.49%`). No application module or island bundle represents a reproducible user-visible bottleneck.

---

## Pair A Distribution (`e43ec38` Trunk vs `PR-GQC-06` Head, `n = 21` Interleaved)

Provisional regression guard rules (`> max(20% over trunk p50, +100 ms)` for navigation and `> max(25%, +50 ms)` for interactive transitions) stay non-blocking until Product Manager ratification, and zero optimization speedup is claimed.

| Metric | Surface | Page / Place / Transition | Trunk p50 (`p75` / `p95` / `IQR`) | Head p50 (`p75` / `p95` / `IQR`) | Head Min .. Max | Delta p50 |
| --- | --- | --- | --- | --- | --- | --- |
| `workbench_cold_ready_ms` | `workbench` | `page_responsive_lab` / `p_page_responsive_lab` | `105.3 ms` (`113.5` / `114.1` / `9.0`) | `105.7 ms` (`106.5` / `114.4` / `1.9`) | `89.2 .. 115.1 ms` | `+0.40 ms` (`+0.38%`) |
| `workbench_warm_ready_ms` | `workbench` | `page_responsive_lab` / `p_page_responsive_lab` | `63.6 ms` (`64.1` / `64.4` / `1.1`) | `63.3 ms` (`63.7` / `64.2` / `0.7`) | `54.7 .. 64.4 ms` | `-0.30 ms` (`-0.47%`) |
| `workbench_cold_dcl_ms` | `workbench` | `p_page_responsive_lab` | `47.2 ms` (`47.5` / `47.6` / `0.5`) | `47.4 ms` (`47.7` / `47.8` / `0.5`) | `46.2 .. 48.0 ms` | `+0.20 ms` (`+0.42%`) |
| `workbench_cold_lcp_ms` | `workbench` | `p_page_responsive_lab` | `40.0 ms` (`40.0` / `44.0` / `0.0`) | `40.0 ms` (`44.0` / `44.0` / `4.0`) | `40.0 .. 44.0 ms` | `0.00 ms` (`0.00%`) |
| `workbench_cold_cls` | `workbench` | `p_page_responsive_lab` | `0.0004` (`0.0004` / `0.0004` / `0.0`) | `0.0004` (`0.0004` / `0.0004` / `0.0`) | `0.0004 .. 0.0004` | `0.0000` |
| `p0_spa_target_load_ms` | `spa` | `page_spa_overview` / `p_spa_overview` | `70.83 ms` (`71.97` / `72.35` / `1.53`) | `71.23 ms` (`71.57` / `72.89` / `1.43`) | `68.16 .. 73.41 ms` | `+0.40 ms` (`+0.57%`) |
| `p0_spa_capture_start_ms` | `spa` | `p_spa_overview` | `34.96 ms` (`35.46` / `36.09` / `1.01`) | `35.36 ms` (`35.70` / `36.70` / `0.80`) | `33.68 .. 37.40 ms` | `+0.40 ms` (`+1.13%`) |
| `p0_spa_functional_link_ms` | `spa` | `p_spa_overview -> p_spa_details` (`t_spa_open_details`) | `33.35 ms` (`33.75` / `34.55` / `0.83`) | `33.09 ms` (`33.49` / `34.37` / `0.75`) | `31.32 .. 35.39 ms` | `-0.26 ms` (`-0.77%`) |
| `p0_spa_error_transition_ms` | `spa` | `p_spa_overview -> p_spa_missing_transition` (`t_spa_invalid_unmapped`) | `386.50 ms` (`387.22` / `388.58` / `1.60`) | `385.95 ms` (`387.00` / `388.22` / `1.74`) | `235.59 .. 389.32 ms` | `-0.55 ms` (`-0.14%`) |
| `p0_spa_recover_transition_ms` | `spa` | `p_spa_missing_transition -> p_spa_overview` (`t_spa_recover_overview`) | `31.81 ms` (`32.39` / `32.68` / `1.18`) | `32.09 ms` (`32.55` / `33.68` / `0.94`) | `29.62 .. 33.68 ms` | `+0.28 ms` (`+0.88%`) |
| `p0_mcard_save_req_ms` | `workbench` | `p_page_responsive_lab -> p_pending_post_test_runs` (`t_req_post_test_runs`) | `32.59 ms` (`32.86` / `34.45` / `1.16`) | `32.29 ms` (`33.00` / `33.71` / `1.20`) | `30.93 .. 34.32 ms` | `-0.30 ms` (`-0.93%`) |
| `p0_mcard_save_ok_ms` | `workbench` | `p_pending_post_test_runs -> p_page_responsive_lab` (`t_ok_post_test_runs`) | `16.84 ms` (`17.30` / `17.68` / `0.96`) | `16.52 ms` (`16.96` / `17.27` / `0.81`) | `15.28 .. 18.34 ms` | `-0.32 ms` (`-1.91%`) |
| `p0_result_inspect_ms` | `workbench` | `p_page_responsive_lab` (`MCardResultIsland`) | `80.84 ms` (`81.26` / `81.86` / `1.01`) | `80.81 ms` (`80.93` / `82.22` / `0.89`) | `78.50 .. 82.32 ms` | `-0.03 ms` (`-0.04%`) |
| `p0_spa_replay_ms` | `spa` | `p_spa_details` (`t_spa_open_details`) | `370.14 ms` (`371.37` / `371.96` / `1.79`) | `370.14 ms` (`371.37` / `371.97` / `3.75`) | `362.04 .. 372.67 ms` | `0.00 ms` (`0.00%`) |
| `mcard_viewer_boot_ms` | `workbench` | `p_view_index_mcard_viewer` (`/?noredirect=1`) | `75.31 ms` (`75.78` / `76.30` / `0.83`) | `75.37 ms` (`75.57` / `75.97` / `0.71`) | `47.52 .. 76.21 ms` | `+0.06 ms` (`+0.08%`) |
| `mcard_modality_document_ms` | `workbench` | `p_view_index_mcard_viewer` (`document`) | `6.79 ms` (`7.72` / `20.60` / `1.38`) | `6.58 ms` (`7.09` / `7.55` / `0.68`) | `5.84 .. 24.20 ms` | `-0.21 ms` (`-3.06%`) |
| `mcard_modality_code_ms` | `workbench` | `p_view_index_mcard_viewer` (`code`) | `22.67 ms` (`23.21` / `24.25` / `0.68`) | `22.79 ms` (`23.44` / `24.37` / `0.90`) | `21.89 .. 24.58 ms` | `+0.12 ms` (`+0.52%`) |
| `mcard_modality_media_ms` | `workbench` | `p_view_index_mcard_viewer` (`media`) | `26.73 ms` (`27.77` / `28.22` / `1.98`) | `26.45 ms` (`27.13` / `27.86` / `0.88`) | `19.43 .. 28.39 ms` | `-0.28 ms` (`-1.04%`) |
| `mcard_modality_webapp_ms` | `workbench` | `p_view_index_mcard_viewer` (`webapp`) | `26.36 ms` (`27.35` / `28.64` / `1.54`) | `26.24 ms` (`26.90` / `27.50` / `1.09`) | `21.25 .. 27.59 ms` | `-0.12 ms` (`-0.46%`) |
| `mission_control_cold_ms` | `workbench` | `p_page_app` (`/app.html`, `0` WebLLM assets) | `49.89 ms` (`50.06` / `51.42` / `0.50`) | `49.78 ms` (`50.14` / `51.80` / `0.52`) | `49.24 .. 52.01 ms` | `-0.12 ms` (`-0.23%`) |

---

## Per-Place Client JavaScript Bytes (`analyzePlaceBytes` + Live Network Log)

| Place ID | Route | Islands | Eager Island Bundles (raw / gzip / br) | Shared Chunks (raw / gzip / br) | Static Page Scripts (raw / gzip / br) | Live Network Astro JS | Live Network Page JS | Zero-Island Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `p_page_index` | `/` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 B` | `0 B` | PASS |
| `p_page_responsive_lab` | `/responsive-lab.html` | 7 | `76,787 / 22,268 / 19,699 B` | `72,304 / 23,569 / 21,275 B` | `0 / 0 / 0 B` | `149,091 B` (`0 B` delta) | `0 B` | N/A (island host) |
| `p_page_app` | `/app.html` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `511,208 / 130,050 / 101,824 B` | `0 B` | `517,889 B` (`+6,681 B` ESM sub-imports) | PASS |
| `p_page_sprint_registry` | `/sprint-registry.html` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 B` | `0 B` | PASS |
| `p_page_fiber_inspector` | `/fiber-inspector.html` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `42,111 / 14,757 / 12,651 B` | `0 B` | `42,111 B` (`0 B` delta) | PASS |
| `p_page_fiber_conformance` | `/fiber-conformance.html` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `42,111 / 14,757 / 12,651 B` | `0 B` | `42,111 B` (`0 B` delta) | PASS |
| `p_view_index_mcard_viewer` | `/index.html?noredirect=1` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `85,224 / 26,240 / 22,318 B` | `0 B` | `147,342 B` (`+62,118 B` ESM sub-imports) | PASS |
| `p_undecided_pkc_docs_index` | `/pkc-docs-index.html` | 0 | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 / 0 / 0 B` | `0 B` | `0 B` | PASS |

Vite and Rollup chunk splitting also emits `signals.module.CiR1SF7H.js` (`7,824 B` raw) into `dist/client/_astro/`, and it is referenced by zero HTML pages or active islands (`0 B` downloaded on every Place).

---

## Per-Island Hydration Summary (`n = 21`)

| Island | Directive | Bundle Raw / Gzip / Brotli | Trunk Nav-to-Hydrated p50 | Head Nav-to-Hydrated p50 (`p95`) | Disclosure Click-to-Hydrated p50 | Long Tasks (`21` runs) |
| --- | --- | --- | --- | --- | --- | --- |
| `RecordingRibbonIsland` | `client:load` | `8,524 / 2,831 / 2,404 B` | `59.0 ms` | `59.2 ms` (`60.2 ms`) | Eager | `0` |
| `DevicePresetsIsland` | `client:load` | `8,216 / 2,782 / 2,413 B` | `58.8 ms` | `58.9 ms` (`59.9 ms`) | Eager | `0` |
| `TargetToolbarIsland` | `client:load` | `12,505 / 4,255 / 3,761 B` | `59.7 ms` | `59.8 ms` (`60.8 ms`) | Eager | `0` |
| `SpaTestWorkflow` | `client:load` | `45,582 / 11,471 / 10,344 B` | `59.7 ms` | `59.8 ms` (`60.8 ms`) | Eager | `0` |
| `ViewportStageIsland` | `client:only="preact"` | `1,960 / 929 / 777 B` | `58.3 ms` | `58.4 ms` (`59.4 ms`) | Eager | `0` |
| `ConformancePanelIsland` | `client:visible` | `3,994 / 1,547 / 1,262 B` | `187.5 ms` | `187.7 ms` (`189.3 ms`) | `80.0 ms` | `0` |
| `MCardResultIsland` | `client:visible` | `2,969 / 961 / 822 B` | `257.3 ms` | `257.2 ms` (`273.0 ms`) | `82.5 ms` | `0` |

---

## Per-Kind Workbench Transition Latency Summary (`n = 21`)

| Kind | Transition ID | Trunk p50 (`p95`) | Head p50 (`p75` / `p95`) | Min .. Max (Head) |
| --- | --- | --- | --- | --- |
| `redirect` | `t_redirect_index_to_lab` | `79.33 ms` (`80.55 ms`) | `79.42 ms` (`80.39` / `80.86 ms`) | `77.07 .. 80.88 ms` |
| `link` | `t_link_lab_to_app` | `110.09 ms` (`115.96 ms`) | `109.99 ms` (`111.97` / `113.66 ms`) | `107.72 .. 114.27 ms` |
| `server-call-request` | `t_req_post_test_runs` | `32.59 ms` (`34.45 ms`) | `32.29 ms` (`33.00` / `33.71 ms`) | `30.93 .. 34.32 ms` |
| `server-call-ok` | `t_ok_post_test_runs` | `16.84 ms` (`17.68 ms`) | `16.52 ms` (`16.96` / `17.27 ms`) | `15.28 .. 18.34 ms` |
| `server-call-fail` | `t_fail_get_conformance_latest` | `15.48 ms` (`17.46 ms`) | `15.27 ms` (`16.63` / `17.72 ms`) | `13.80 .. 17.78 ms` |
| `client-route` | `t_enter_target_blocked` | `41.99 ms` (`43.31 ms`) | `41.88 ms` (`42.48` / `43.17 ms`) | `39.63 .. 43.41 ms` |
| `recover` | `t_recover_target_blocked` | `366.83 ms` (`384.69 ms`) | `366.73 ms` (`368.25` / `384.73 ms`) | `362.24 .. 385.42 ms` |
| `open-external` | `t_open_external_monopoly` | `45.55 ms` (`46.94 ms`) | `45.33 ms` (`46.38` / `46.80 ms`) | `42.37 .. 48.08 ms` |

---

## Pair B Pre-Astro Baseline (`843cf65`) vs Astro Head (`n = 21` Interleaved)

| Surface | Place ID | `843cf65` p50 (`p95` / `IQR`) | Astro Head p50 (`p95` / `IQR`) | `843cf65` JS | Astro Head JS | Assessment |
| --- | --- | --- | --- | --- | --- | --- |
| `/` -> `/responsive-lab.html` | `p_page_index` | `75.85 ms` (`79.00` / `2.76`) | `125.85 ms` (`126.57` / `16.27`) | `112,756 B` | `149,091 B` | Expected `+50.00 ms` from Preact island mount plus new `SpaTestWorkflow` rail |
| `/index.html?noredirect=1` | `p_view_index_mcard_viewer` | `42.10 ms` (`43.57` / `3.63`) | `41.03 ms` (`45.81` / `3.80`) | `195,572 B` | `147,342 B` | `-1.07 ms` and `-48,230 B` (`-24.7%`) JS |
| `/responsive-lab.html` | `p_page_responsive_lab` | `75.15 ms` (`99.10` / `24.43`) | `121.11 ms` (`122.11` / `0.66`) | `112,756 B` | `149,091 B` | `+45.96 ms` p50, `37x` tighter `IQR`, `0` long tasks |
| `/app.html` | `p_page_app` | `48.89 ms` (`49.44` / `0.61`) | `49.39 ms` (`50.48` / `0.42`) | `517,889 B` | `517,889 B` | Parity (`+0.50 ms`), `0 B` island JS |
| `/sprint-registry.html` | `p_page_sprint_registry` | `19.81 ms` (`20.05` / `0.27`) | `20.24 ms` (`20.54` / `0.18`) | `0 B` | `0 B` | Parity (`+0.44 ms`), `0 B` JS |
| `/fiber-inspector.html` | `p_page_fiber_inspector` | `22.39 ms` (`22.75` / `0.36`) | `23.03 ms` (`23.57` / `0.40`) | `42,111 B` | `42,111 B` | Parity (`+0.65 ms`), `0 B` island JS |
| `/fiber-conformance.html` | `p_page_fiber_conformance` | `16.53 ms` (`16.96` / `0.16`) | `17.19 ms` (`18.14` / `0.37`) | `42,111 B` | `42,111 B` | Parity (`+0.67 ms`), `0 B` island JS |
| `/pkc-docs-index.html` | `p_undecided_pkc_docs_index` | `19.83 ms` (`20.47` / `0.26`) | `20.15 ms` (`20.51` / `0.33`) | `0 B` | `0 B` | Parity (`+0.32 ms`), `0 B` JS |
| Probe-target load + rotate | `p_page_responsive_lab` | `105.71 ms` (`122.58` / `15.96`) | `139.31 ms` (`170.56` / `16.96`) | `112,756 B` | `149,091 B` | Reflects the one-time `+36.3 KB` Preact island boot cost |

---

## Live 10-Lane Verification Summary (`/tmp/swarm-PR-GQC-06/lanes-all.json`)

| Lane | Scenario | Screenshot | Result | Key Measured Evidence |
| --- | --- | --- | --- | --- |
| 1 | Regression lane against trunk (`e43ec38` vs head P0 SPA journey) | `/tmp/swarm-PR-GQC-06/worker-1/lane-1.png` | PASS | Both reached `p_spa_details` with `completeness = "complete"` and HTTP `201` |
| 2 | Cold SPA target (`spa-test-target.html`) ready without blocking long task | `/tmp/swarm-PR-GQC-06/worker-1/lane-2.png` | PASS | `p_spa_overview` ready with `longTasks = 0` |
| 3 | Cold `responsive-lab.html` guide, selector, and toolbar ready | `/tmp/swarm-PR-GQC-06/worker-1/lane-3.png` | PASS | Selector and Load Target visible, `labReadyAtMs > 0` |
| 4 | Continuous 60s resize and rotate stress | `/tmp/swarm-PR-GQC-06/worker-1/lane-4.png` | PASS | `60,135.1 ms`, `328` ops, `3,610` frames, `p95 = 16.70 ms`, `max = 16.80 ms`, `noncePreserved = true` |
| 5 | Switch targets 50 times (`probe-target.html <-> spa-test-target.html`) | `/tmp/swarm-PR-GQC-06/worker-1/lane-5.png` | PASS | `p50 = 33.31 ms`, `IQR = 0.13 ms`, `winListeners = 13 -> 13`, `docListeners = 11 -> 11`, `activeIntervals = 0` |
| 6 | Declared SPA Functional Link (`t_spa_open_details`) | `/tmp/swarm-PR-GQC-06/worker-1/lane-6.png` | PASS | `p_spa_overview -> p_spa_details` recorded with positive duration |
| 7 | Mission Control (`app.html`) cold boot without AI selection | `/tmp/swarm-PR-GQC-06/worker-1/lane-7.png` | PASS | `modelRequestsCount = 0` (zero WebLLM/WASM/shard downloads) |
| 8 | Cold vs warm cache render parity (`/?noredirect=1`) | `/tmp/swarm-PR-GQC-06/worker-1/lane-8.png` | PASS | Identical MCard hash and rendered text across `cold` and `warm` cache states |
| 9 | Approved small-screen viewport (`393 x 852` iPhone 16 Pro) conformance | `/tmp/swarm-PR-GQC-06/worker-1/lane-9.png` | PASS | `appFailedCount = 0` across 8 checks plus SPA `no-horizontal-overflow = pass` and `tap-target-size (44px) = pass` |
| 10 | Verified no-change P0 SPA journey rerun and MPA separation check | `/tmp/swarm-PR-GQC-06/worker-1/lane-10.png` | PASS | Reached `p_spa_details` (`complete`), `mpaBlendedIntoSpa = false` |
