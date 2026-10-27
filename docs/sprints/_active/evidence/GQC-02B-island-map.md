# GQC-02B Responsive Lab Island Map (PR-GQC-02B.2)

## 1. Migration Summary

`src/pages/responsive-lab.astro` advances Place `p_page_responsive_lab` in `src/net/workbench-net.yaml` from `astro-wrapped` to `astro-islands`. Six Preact islands under `src/islands/*.jsx` mount the existing vanilla harness modules in `js/harness/*.js` and `js/device-registry.js`. Static document regions remain plain Astro HTML outside any island, including `<header class="lab-header">` (`#btn-back-home` and `#btn-nav-mission-control`), `#device-manager-modal`, and `<footer class="lab-footer">`. The legacy inline `<script is:inline type="module">` bootstrap was removed once all six regions hydrated through Preact.

Zero files under `src/islands/`, `js/harness/`, or `dist/client/_astro/` import `clm-kernel` or Node `crypto`. Net parity checks and trace replay continue to execute strictly in Node.

## 2. Island Boundaries, Directives, Owners, Costs, and Cleanup Paths

Hydration latencies come from 10 interleaved cold-context Chromium runs on the production build (`node ws-server.js`, `/tmp/swarm-PR-GQC-02B.2/perf-results.json`). Bundle byte counts reflect exact built client assets in `dist/client/_astro/`.

| Island | Source File | DOM Container | Wrapped Module(s) | Directive | BMAD Owner | Built Bundle (Bytes) | Cold Load Bytes | Hydration Cost (ms) | Cleanup Path on Unmount |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TargetToolbarIsland` | `src/islands/TargetToolbarIsland.jsx` | `#lab-toolbar` | `js/harness/lab-toolbar.js`, `js/harness/target-membrane.js` | `client:load` | Architect and Dev | `TargetToolbarIsland.J7PPQ68t.js` (`8,206 B`) | `8,206 B` | p50 `15.20`, p75 `15.57` (`13.30..15.80`) | `toolbar.destroy()` + `runtime.unregisterIsland('TargetToolbarIsland')` |
| `DevicePresetsIsland` | `src/islands/DevicePresetsIsland.jsx` | `#device-presets-region` | `js/harness/device-presets-ui.js`, `js/device-registry.js` | `client:load` | UX Designer and Dev | `DevicePresetsIsland.C_q0KrMR.js` (`8,199 B`) | `8,199 B` | p50 `14.95`, p75 `15.25` (`13.30..16.20`) | `presetsUi.destroy()` + `runtime.unregisterIsland('DevicePresetsIsland')` |
| `ViewportStageIsland` | `src/islands/ViewportStageIsland.jsx` | `#viewport-stage-island-root` | `js/harness/viewport-stage.js`, `#mission-control-iframe` | `client:only="preact"` | Architect and TEA | `ViewportStageIsland.CW1faCYl.js` (`1,864 B`) | `1,864 B` | p50 `13.70`, p75 `14.35` (`11.80..14.80`) | `runtime.detachStageSurface()` + `runtime.unregisterIsland('ViewportStageIsland')` |
| `RecordingRibbonIsland` | `src/islands/RecordingRibbonIsland.jsx` | `#recording-ribbon` | `js/harness/recording-ribbon.js`, `js/harness/recorder.js` | `client:load` | TEA and Dev | `RecordingRibbonIsland.Cqq_NhuF.js` (`8,474 B`) | `8,474 B` | p50 `14.85`, p75 `15.73` (`13.30..16.40`) | `ribbon.destroy()` + `runtime.unregisterIsland('RecordingRibbonIsland')` |
| `ConformancePanelIsland` | `src/islands/ConformancePanelIsland.jsx` | `#conformance-panel-root` | `js/harness/conformance-panel.js` | `client:visible` | TEA and UX Designer | `ConformancePanelIsland.BXlxuG8W.js` (`3,892 B`) | `0 B` | `82.90` (download + hydrate on reveal) | `panel.destroy()`, disclosure `toggle` listener removal, `runtime.unregisterIsland('ConformancePanelIsland')` |
| `MCardResultIsland` | `src/islands/MCardResultIsland.jsx` | `#mcard-result-panel` | `runtime.recorder.lastSavedRun`, `runtime.subscribeSavedRun` | `client:visible` | Product Manager and Dev | `MCardResultIsland.CzhdXojg.js` (`2,969 B`) | `0 B` | `84.90` (download + hydrate on reveal) | Saved-run unsubscribe, disclosure `toggle` listener removal, `runtime.unregisterIsland('MCardResultIsland')` |

### Directive Rationales and Cleanup Details

1. **`TargetToolbarIsland` (`client:load`)**
   - **Directive reason.** Owns the primary P0 target URL omnibar (`#target-url-input`), quick-pick target chips, and `?target=` URL query-parameter synchronization needed before removing `body.lab-booting`.
   - **Cleanup path.** `LabToolbar.destroy()` removes `#target-url-form` `submit`, `#btn-reload-target` `click`, every `[data-target-preset]` chip `click`, and the `TargetMembrane.onTargetChange` subscription.

2. **`DevicePresetsIsland` (`client:load`)**
   - **Directive reason.** Owns the above-the-fold device preset chips, viewport orientation toggle (`#btn-rotate-viewport`), custom dimension inputs, and `#device-manager-modal` triggers used immediately on page load.
   - **Cleanup path.** `DevicePresetsUI.destroy()` removes all preset chip handlers, `#btn-rotate-viewport` and `#btn-apply-custom` click listeners, custom input `keydown` listeners, `#device-manager-modal` event handlers, and the `DeviceRegistry` listener.

3. **`ViewportStageIsland` (`client:only="preact"`)**
   - **Directive reason.** Requires browser `window`, `ResizeObserver`, live container dimensions (`clientWidth` and `clientHeight`), and a real `<iframe id="mission-control-iframe">` DOM element at mount time. Skipping SSR avoids server-side layout measurement mismatches.
   - **Cleanup path.** `runtime.detachStageSurface()` calls `ViewportStage.destroy()` (disconnecting `ResizeObserver`), detaches `TargetMembrane`'s iframe `load` listener, and calls `destroy()` on the active capture source (`CaptureSameOriginSource` or `CaptureProbeAgentSource`).

4. **`RecordingRibbonIsland` (`client:load`)**
   - **Directive reason.** Renders the top recording control bar (`#rec-btn-start`, `#rec-btn-stop`, `#rec-btn-export`, `#rec-btn-sweep`) and displays live capture-channel status (`same-origin`, `probe-agent`, or `unavailable`) and fidelity tier (`T0`) as soon as the initial target binds.
   - **Cleanup path.** `RecordingRibbon.destroy()` clears the elapsed-time `setInterval`, unsubscribes `Recorder` and `TargetMembrane` listeners, and removes all ribbon button and `#rec-saved-label` click handlers.

5. **`ConformancePanelIsland` (`client:visible`)**
   - **Directive reason.** Houses the read-only device conformance matrix inside closed `<details id="conformance-disclosure">` below the primary controls. Users do not need its bundle at first paint.
   - **Cleanup path.** `ConformancePanel.destroy()` unsubscribes `ViewportStage`, `TargetMembrane`, and `Recorder` listeners, while the island effect removes the `#conformance-disclosure` `toggle` scroll listener.

6. **`MCardResultIsland` (`client:visible`)**
   - **Directive reason.** Displays the persisted MCard hash, handle, card count, and HTTP status inside closed `<details id="mcard-result-disclosure">` after a recording session saves. Deferring download until `<details>` opens or `#rec-saved-label` opens the disclosure keeps cold-load JS minimal.
   - **Cleanup path.** Unsubscribes from `runtime.subscribeSavedRun`, removes the `#mcard-result-disclosure` `toggle` listener, and unregisters the island from `lab-runtime`.

## 3. Shared Runtime Coordinator and Cold-Load Bundle Budget

`js/harness/lab-runtime.js` coordinates the browser singleton backing `window.__lab` (`stage`, `membrane`, `recorder`, `registry`, `getConformanceReport`, `runPresetSweep`, `mountIsland`, `unmountIsland`, and `getMountedIslands`). `body.lab-booting` clears after two `requestAnimationFrame` ticks only once the four boot-critical islands (`TargetToolbarIsland`, `DevicePresetsIsland`, `ViewportStageIsland`, and `RecordingRibbonIsland`) register and apply the initial preset and `?target=` URL.

| Asset | Purpose | Cold Load Bytes | Deferred Bytes |
| --- | --- | --- | --- |
| `client.DCqeKAjC.js` | `@astrojs/preact` hydration entrypoint | `3,019 B` | `0 B` |
| `preact.DXiQkeWQ.js` | Preact `11.1.0` core runtime | `10,894 B` | `0 B` |
| `hooks.CTRUpJPk.js` | Preact hooks runtime | `2,602 B` | `0 B` |
| `jsxRuntime.VZGg-nlu.js` | JSX runtime + shared `lab-runtime`, `device-registry`, and `recorder` chunk | `37,919 B` | `0 B` |
| Four eager islands (`TargetToolbar`, `DevicePresets`, `ViewportStage`, `RecordingRibbon`) | Above-the-fold interactive workbench regions | `26,743 B` | `0 B` |
| Two `client:visible` islands (`ConformancePanel`, `MCardResult`) | Closed `<details>` disclosures | `0 B` | `6,861 B` |
| **Total** | **Responsive Lab top-frame JS** | **`81,177 B`** | **`6,861 B`** |

Verified by `GQC-02B-E2E-05` in `tests/features/responsive-lab-islands.spec.js` and live Chromium Lane 6 (`/tmp/swarm-PR-GQC-02B.2/lanes-all.json`). Zero requests for `ConformancePanelIsland` or `MCardResultIsland` fire before opening their `<details>` disclosures.

## 4. 50-Cycle Mount and Unmount Lifecycle Audit

Verified by `GQC-02B-E2E-04` in `tests/features/responsive-lab-islands.spec.js` and live Chromium Lane 8 across 50 full unmount/remount cycles alternating same-origin (`/spa-test-target.html`) and cross-origin (`http://127.0.0.1:5320/`) targets, followed by a full document navigation round-trip (`/index.html?noredirect=1` to `/responsive-lab.html`).

| Counter | Settled Baseline (6 Islands Mounted) | All 6 Islands Unmounted | After 50 Unmount/Remount Cycles | After Page Round-Trip | Net Delta |
| --- | --- | --- | --- | --- | --- |
| `window` active listeners | `15` | `13` | `15` | `15` | `0` |
| `document` active listeners | `6` | `6` | `6` | `6` | `0` |
| Persistent `window`/`document`/`body` listeners | `12` | `12` | `12` | `12` | `0` |
| Active `ResizeObserver` targets | `1` | `0` | `1` | `1` | `0` |
| Active `setInterval` handles | `0` | `0` | `0` | `0` | `0` |
| Active `setTimeout` handles | `0` | `0` | `0` | `0` | `0` |

Note on Preact 11 unmount timing. Preact `11.1.0` schedules `useEffect` cleanup callbacks asynchronously via `requestAnimationFrame` plus `setTimeout(0)` after `render(null, root)`. Flushing one animation frame and macrotask returns `ResizeObserver` targets and interval handles to `0` before remounting.

## 5. Paired Cold-Load Performance Comparison

Measured via 2 warmup pairs plus 10 interleaved cold-context Chromium runs against `PR-GQC-02B.1` (`c7b78c6`) and `PR-GQC-02B.2` (`head`) on identical production servers (`/tmp/swarm-PR-GQC-02B.2/perf-results.json`), alongside the `GQC-00` pre-Astro baseline (`843cf65`).

| Build | `responseEnd` p75 (ms) | `readyMs` p50 (ms) | `readyMs` p75 (ms) | `readyMs` Min..Max (ms) | Top-Frame JS (Bytes) | Console/Page Errors |
| --- | --- | --- | --- | --- | --- | --- |
| `GQC-00` pre-Astro (`843cf65`) | n/a | `180.48` | `227.82` | `158.56..283.84` | `126,373 B` | `0` |
| `PR-GQC-02B.1` wrapped (`c7b78c6`) | `1.38` | `787.00` | `799.58` | `770.30..805.00` | `112,756 B` | `0` |
| `PR-GQC-02B.2` islands (`head`) | `1.30` | `836.70` | `837.45` | `819.50..838.30` | `81,177 B` | `0` |

**Delta and Limiter Analysis.** Compared with `PR-GQC-02B.1`, `PR-GQC-02B.2` reduces cold-load top-frame JavaScript by `31,579 B` (`-28.0%`, and `-35.8%` below `GQC-00` `843cf65`) by bundling shared harness modules and deferring `ConformancePanelIsland` and `MCardResultIsland`. Cold-context `readyMs` increases by `+37.87 ms` at p75 (`+4.74%`, well within the `+10%` and `+100 ms` gate). In both `PR-GQC-02B.1` and `PR-GQC-02B.2`, ~`750..788 ms` of cold-context wall time is spent waiting on the external Google Fonts stylesheet `<link>` before `DOMContentLoaded`; the remaining `~38 ms` delta between wrapped and hydrated builds comes from Preact module evaluation (`~15 ms` per island) plus two 60Hz headless VSync frames (`~33 ms`) between Preact's post-paint `useEffect` flush and the two-`requestAnimationFrame` `lab-booting` barrier.

## 6. Recorded Handoff Notes for GQC-03, GQC-04, and GQC-05

1. **Cross-origin probe handshake origin scoping (`GQC-03`, Architect and Dev).** `CaptureProbeAgentSource` (`js/harness/capture-probe-agent.js`) starts a `500 ms` `setInterval` (`_pingTimer`, capped at 30 attempts) and registers `window` `message` plus `iframe` `load` listeners while probing cross-origin targets, and keeps an unarmed fail-closed `ProbeMessageReceiver` active so forged `lab-capture/v1` frames increment `stats.rejected`. `PR-GQC-02B.2` wired `Recorder.setSource()` and `lab-runtime.detachStageSurface()` to call `source.destroy()` so zero timers or listeners leak across target switches or island unmounts. `CaptureProbeAgentSource` still posts `probe:ping`, `probe:arm`, and `probe:disarm` with wildcard targetOrigin `'*'` and receives `allowedOrigins: []` by default from `membrane-interceptor.js`. `SPRINT-GQC-03` owns wiring `app-config.json` `labTargets` into `allowedOrigins` and scoping outbound `postMessage` calls to the validated target origin.
2. **Client router lifecycle policy (`GQC-04`, Architect, Product Manager, and UX Designer).** Astro's client router remains disabled. Workbench page switches stay full document `link` Transitions, and `app.html` remains `astro-wrapped` until `SPRINT-GQC-04` decomposes Mission Control views and guided SPA workflow regions.
3. **Persisted run kernel version stamp (`GQC-05`, Architect and Dev).** `js/harness/recorder.js` continues to stamp `lab.clmKernel: '0.0.10'` inside `buildTestRun()` to preserve `PR-GQC-02B` behavioral parity. `SPRINT-GQC-05` owns aligning the client run envelope version with `server/mcard-api.mjs`.
