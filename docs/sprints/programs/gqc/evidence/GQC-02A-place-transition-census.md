# Layer 1 Place and Transition census

## Metadata

- Sprint ID is `SPRINT-GQC-02A`.
- Execution unit is `PR-GQC-02A`.
- Trunk baseline commit is `843cf65`.
- Parent commit is `4eddb5d`.
- Canonical net envelope path is `src/net/workbench-net.yaml`.
- Probe method combined static AST and line inspection with a headless Chromium live wire walk against `ws-server.js` on an ephemeral port.

## Root HTML pages and view modes

| Path or route | Place ID | Kind | Surface | Owner | Support status | Evidence basis | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` and `/index.html` | `p_page_index` | `page` | `workbench` | Product Manager and UX Designer | `approved` | `observed` | Entry Place that redirects top-level visits to `responsive-lab.html` via `index.html:13`. |
| `/index.html?noredirect=1` and `/?noredirect=1` | `p_view_index_mcard_viewer` | `view` | `workbench` | Product Manager and UX Designer | `approved` | `observed` | Distinct user-visible 4-modality MCard viewer mode when `noredirect` query parameter is present or embedded in an iframe. |
| `/responsive-lab.html` | `p_page_responsive_lab` | `page` | `workbench` | Product Manager and TEA | `approved` | `observed` | Primary P0 Responsive UI Lab workbench host. |
| `/app.html` | `p_page_app` | `page` | `workbench` | Product Manager | `approved` | `observed` | Legacy Mission Control MCard Manager host page. |
| `/sprint-registry.html` | `p_page_sprint_registry` | `page` | `workbench` | Scrum Master | `approved` | `observed` | Internal CLM sprint registry diagnostic page entered via deep link. |
| `/fiber-inspector.html` | `p_page_fiber_inspector` | `page` | `workbench` | Architect | `approved` | `observed` | Internal fiber correctness and marking inspector diagnostic page entered via deep link. |
| `/fiber-conformance.html` | `p_page_fiber_conformance` | `page` | `workbench` | Architect | `approved` | `observed` | Internal fiber conformance harness diagnostic page entered via deep link. |
| `/pkc-docs-index.html` | `none` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Legacy PKC documentation catalog excluded from `src/net/workbench-net.yaml` until Product Manager disposition. |

## Public HTML pages and external game popups

| File path | Candidate kind | Surface | Owner | Support status | Evidence basis | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `public/examples/games/monopoly-auth.html` | `external` | `workbench` | Product Manager | `approved` | `observed` | Opened via `window.open` at `app.html:284` into weight-0 Place `p_external_games`. |
| `public/examples/games/chess-auth.html` | `external` | `workbench` | Product Manager | `approved` | `observed` | Opened via `window.open` at `app.html:316` into weight-0 Place `p_external_games`. |
| `public/examples/games/go-auth.html` | `external` | `workbench` | Product Manager | `approved` | `observed` | Opened via `window.open` at `app.html:348` into weight-0 Place `p_external_games`. |
| `public/examples/games/monopoly.html` | `external` | `legacy` | Product Manager | `undecided` | `observed` | Unauthenticated game demo variant under `public/examples/games`. |
| `public/examples/games/chess.html` | `external` | `legacy` | Product Manager | `undecided` | `observed` | Unauthenticated chess demo with WebSocket call at `public/examples/games/chess.html:463`. |
| `public/examples/games/go.html` | `external` | `legacy` | Product Manager | `undecided` | `observed` | Unauthenticated Go demo under `public/examples/games`. |
| `public/examples/games/play_ubud.html` | `external` | `legacy` | Product Manager | `undecided` | `observed` | Standalone Ubud game demo under `public/examples/games`. |
| `public/conformance/membrane-probe.html` | `page` | `diagnostic` | Architect | `undecided` | `observed` | Standalone membrane conformance probe fixture under `public/conformance`. |
| `public/create-card-template.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Legacy card creation utility page. |
| `public/create-latex-card.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Legacy LaTeX card utility page. |
| `public/latex-test.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Legacy KaTeX and LaTeX test page. |
| `public/icons/generate-icons.html` | `page` | `legacy` | UX Designer | `undecided` | `observed` | Developer icon generation utility page. |
| `public/examples/location-map.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Leaflet and WebSocket location demo page. |
| `public/examples/3DGames/3DObjectViewer/index.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone 3D object viewer example. |
| `public/examples/3DGames/MorphismCube/Morphism_FirstTry.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone MorphismCube prototype v1. |
| `public/examples/3DGames/MorphismCube/Morphism_SecondTry.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone MorphismCube prototype v2. |
| `public/examples/Music/ABCMusic.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone ABC music notation demo. |
| `public/examples/Music/OSMD.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone OpenSheetMusicDisplay demo. |
| `public/examples/Music/SyncedMusicVisualizer.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone music visualizer v1. |
| `public/examples/Music/SyncedMusicVisualizerV2.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone music visualizer v2. |
| `public/examples/Music/SyncedMusicVisualizerV3.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone music visualizer v3. |
| `public/examples/Music/SyncedMusicVisualizerV4.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone music visualizer v4. |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone modular music visualizer v4. |
| `public/examples/Music/SyncedMusicVisualizerV5.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone music visualizer v5. |
| `public/examples/Music/VexMusic.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone VexFlow music demo. |
| `public/examples/THREEJS_ANIMEJS/Theater_Example.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone Three.js and Anime.js demo. |
| `public/examples/WaveVisualizers/WaveFormVisualizer.html` | `page` | `legacy` | Product Manager | `undecided` | `observed` | Standalone waveform visualizer demo. |

## Component micro-frontend and archive HTML pages served via static root

`ws-server.js:138` mounts `express.static(__dirname)`, which exposes `components/*.html`, `archive/html/*.html`, `js/modules/**/*.html`, and `packages/p2p/src/*.html`. All 37 files remain `undecided` and outside the P0 workbench net.

| Directory or file group | File count | Candidate kind | Surface | Owner | Support status | Evidence basis | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `components/pkc-viewer.html`, `components/welcome.html`, `components/hero.html`, `components/user-list.html`, `components/user-detail.html`, `components/auth-status.html`, `components/crash-test.html`, `components/crash-test-external.html`, `components/google-calendar.html`, `components/grafana-dashboard.html`, `components/grafana-faro.html`, `components/p2p-status.html`, `components/redux-state-viewer.html`, `components/wikipedia-search.html`, `components/wikipedia-viewer.html`, `components/youtube-clip.html`, `components/youtube-viewer.html` | 17 | `view` | `legacy-clm-iframe` | Product Manager and Architect | `undecided` | `observed` | Legacy CLM iframe micro-frontend panels; `pkc-docs-index.html` links to `pkc-viewer.html?doc=...`, which resolves to `/pkc-viewer.html` only if mounted at root and returns 404 unless `/components/pkc-viewer.html` is addressed. |
| `archive/html/*.html` | 14 | `page` | `archive` | Product Manager | `undecided` | `observed` | Archived historical HTML snapshots not linked from any approved workbench page. |
| `js/modules/p2p-serverless/*.html`, `js/modules/video-meeting/index.html`, `js/modules/webrtc-dashboard/index.html`, `packages/p2p/src/*.html` | 6 | `page` | `developer-demo` | Architect | `undecided` | `observed` | Developer module sandboxes outside the workbench navigation surface. |

## Internal links, redirects, script navigations, and popup launches

| Source file and line | Mechanism | Target expression | Modeled Transition ID or status | Evidence basis | Notes |
| --- | --- | --- | --- | --- | --- |
| `index.html:13` | `window.location.replace('responsive-lab.html')` | `/responsive-lab.html` | `t_redirect_index_to_lab` | `observed` | Fires automatically on top-frame arrival at `/` or `/index.html` when `noredirect` is absent and `window.self === window.top`. |
| `index.html:279` | `<a class="penpot-nav-link" href="index.html">` | `/index.html` | `t_link_viewer_to_index` | `observed` | Reachable in `p_view_index_mcard_viewer` when `index.html?noredirect=1` renders the PenPot header bar; arriving at `/index.html` without `noredirect` then fires `t_redirect_index_to_lab`. |
| `index.html:280` | `<a class="penpot-nav-link" href="app.html">` | `/app.html` | `t_link_viewer_to_app` | `observed` | Navigates from `p_view_index_mcard_viewer` to `p_page_app`. |
| `index.html:281` | `<a class="penpot-nav-link" href="responsive-lab.html">` | `/responsive-lab.html` | `t_link_viewer_to_lab` | `observed` | Navigates from `p_view_index_mcard_viewer` to `p_page_responsive_lab`. |
| `index.html:293` | `<a id="responsive-ui-lab-btn" href="responsive-lab.html">` | `/responsive-lab.html` | `t_link_viewer_to_lab` | `observed` | Header action button to Responsive UI Lab on `index.html?noredirect=1`. |
| `index.html:323` | `<a id="responsive-ui-lab-fullpage-link" href="responsive-lab.html">` | `/responsive-lab.html` | `t_link_viewer_to_lab` | `observed` | Split-pane banner launch link to Responsive UI Lab on `index.html?noredirect=1`. |
| `index.html:404` | `window.open(targetUrl, 'GovTechMissionControl', 'noopener,noreferrer')` | `app.html` | `dead-handler-unwired` | `inferred` | Defined inside `openMCardVaultWindow` at `index.html:402`, which has zero DOM `onclick` or `addEventListener` callers anywhere in `index.html` or `js/`. |
| `index.html:482` | `window.location.href = 'responsive-lab.html'` | `/responsive-lab.html` | `t_link_viewer_to_lab` | `observed` | Defined in `openResponsiveUILab` fallback helper for `index.html?noredirect=1`. |
| `responsive-lab.html:875` | `<a href="/" id="btn-back-home">` | `/` | `t_link_lab_to_index` | `observed` | Navigates from `p_page_responsive_lab` to `p_page_index`, which immediately redirects back via `t_redirect_index_to_lab`. |
| `responsive-lab.html:898` | `<a href="app.html" target="_blank" id="btn-nav-mission-control">` | `/app.html` | `t_link_lab_to_app` | `observed` | Opens `/app.html` in a new tab via `target="_blank"`; Playwright trace recorder promotes the workbench tab when following a workbench `link` popup. |
| `responsive-lab.html:901` | `<a href="app.html" target="_blank" id="mission-control-btn">` | `/app.html` | `t_link_lab_to_app` | `observed` | Primary toolbar button targeting `/app.html` via `target="_blank"`. |
| `js/harness/lab-toolbar.js:290` | `window.open(current, '_blank')` | Active target URL in `#url-input` | `workbench-local-target-preview` | `observed` | Opens the user-selected target URL under test in a separate tab; per `GQC-02A.2`, workbench device and target-preview controls are not modeled as target-app or workbench page Transitions. |
| `app.html:76` | `button.header-btn` `onclick="window.location.href='/'"` | `/` | `t_link_app_to_index` | `observed` | Navigates from `p_page_app` to `p_page_index`, followed by `t_redirect_index_to_lab`. |
| `app.html:284` | `window.open('/public/examples/games/monopoly-auth.html', '_blank', ...)` | `/public/examples/games/monopoly-auth.html` | `t_open_external_monopoly` | `observed` | Forks a token into weight-0 `p_external_games` while keeping the session token in `p_page_app`. |
| `app.html:316` | `window.open('/public/examples/games/chess-auth.html', '_blank', ...)` | `/public/examples/games/chess-auth.html` | `t_open_external_chess` | `observed` | Forks a token into weight-0 `p_external_games` while keeping the session token in `p_page_app`. |
| `app.html:348` | `window.open('/public/examples/games/go-auth.html', '_blank', ...)` | `/public/examples/games/go-auth.html` | `t_open_external_go` | `observed` | Forks a token into weight-0 `p_external_games` while keeping the session token in `p_page_app`. |
| `pkc-docs-index.html:122` | `<a href="pkc-viewer.html?doc=MVP%20Cards...">` | `/pkc-viewer.html?doc=...` | `undecided-unmapped` | `observed` | Undecided legacy catalog link reported as unmapped by `tests/fixtures/net-trace.js`. |
| `pkc-docs-index.html:132` | `<a href="pkc-viewer.html?doc=PKC%20as%20the%20Network.md">` | `/pkc-viewer.html?doc=...` | `undecided-unmapped` | `observed` | Undecided legacy catalog link. |
| `pkc-docs-index.html:142` | `<a href="pkc-viewer.html?doc=Personal%20Knowledge%20Container.md">` | `/pkc-viewer.html?doc=...` | `undecided-unmapped` | `observed` | Undecided legacy catalog link. |
| `pkc-docs-index.html:152` | `<a href="pkc-viewer.html?doc=Yoneda%20Arithmetic.md">` | `/pkc-viewer.html?doc=...` | `undecided-unmapped` | `observed` | Undecided legacy catalog link. |
| `pkc-docs-index.html:162` | `<a href="pkc-viewer.html?doc=TikZ-CD-Examples.md">` | `/pkc-viewer.html?doc=...` | `undecided-unmapped` | `observed` | Undecided legacy catalog link. |
| `js/oauth-handler.js:118` and `public/js/auth/zitadel-auth.js:106,108,273` | `window.location.href = authUrl` | External Zitadel IdP URL | `undecided-auth` | `inferred` | Zitadel PKCE redirect belongs to undecided authentication capability in `DECISIONS.tsv`. |

## UI-reachable server calls and static JSON classification

| Source file and line | HTTP method and path | Calling Place | Classification | Modeled Transition IDs or bucket | Evidence basis | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `js/harness/lab-toolbar.js:175` | `GET /app-config.json` | `p_page_responsive_lab` | Server call | `t_req_get_app_config`, `t_ok_get_app_config`, `t_fail_get_app_config` | `observed` | Dynamic Express JSON route at `ws-server.js:367` executed on every `responsive-lab.html` boot. |
| `js/harness/recorder.js:219` | `POST /api/test-runs` | `p_page_responsive_lab` | Server call | `t_req_post_test_runs`, `t_ok_post_test_runs`, `t_fail_post_test_runs`, `t_recover_post_test_runs` | `observed` | Persists `responsive_test_run:v1` MCard on `#btn-rec-stop`; HTTP failure surfaces `#rec-saved-pill` Offline state. |
| `js/harness/conformance-panel.js:25` | `GET /api/test-runs/conformance/latest` | `p_page_responsive_lab` | Server call | `t_req_get_conformance_latest`, `t_ok_get_conformance_latest`, `t_fail_get_conformance_latest` | `observed` | Fetches latest conformance summary for the selected target handle. |
| `index.html:351` | `GET /api/env` | `p_view_index_mcard_viewer` | Server call | `t_req_get_env`, `t_ok_get_env`, `t_fail_get_env` | `observed` | Loads runtime environment flags when `index.html?noredirect=1` boots. |
| `js/landing-page-mcard.js:176,199` | `GET /api/mcard/landing` | `p_view_index_mcard_viewer` | Server call | `t_req_get_mcard_landing`, `t_ok_get_mcard_landing`, `t_fail_get_mcard_landing` | `observed` | Loads the active landing MCard payload on `index.html?noredirect=1`. |
| `js/landing-page-mcard.js:177,216` | `PUT /api/mcard/landing` | `p_view_index_mcard_viewer` | Server call | `t_req_put_mcard_landing`, `t_ok_put_mcard_landing`, `t_fail_put_mcard_landing`, `t_recover_put_mcard_landing` | `inferred` | Triggered when operator saves a new landing card selection in Sovereign HUD pill on `index.html?noredirect=1`. |
| `js/observability/fibration-dashboard.js:156` | `GET /api/clm/program-artifact` | `p_view_index_mcard_viewer` | Server call | `t_req_get_clm_program_artifact`, `t_ok_get_clm_program_artifact`, `t_fail_get_clm_program_artifact` | `observed` | Fired on `index.html?noredirect=1` boot to hydrate `DeploymentUnitInspector`. |
| `sprint-registry.html:140` | `GET /api/clm/registry` | `p_page_sprint_registry` | Server call | `t_req_get_clm_registry`, `t_ok_get_clm_registry`, `t_fail_get_clm_registry`, `t_recover_get_clm_registry` | `observed` | Hydrates the CLM sprint registry table on `sprint-registry.html`. |
| `fiber-inspector.html:72` | `GET /public/conformance/harness-data.json` | `p_page_fiber_inspector` | Gating static JSON Transition | `t_req_get_fiber_inspector_harness`, `t_ok_get_fiber_inspector_harness`, `t_fail_get_fiber_inspector_harness`, `t_recover_get_fiber_inspector_harness` | `observed` | Gates visible fiber inspector table rendering; failure switches the page to its load error state. |
| `fiber-conformance.html:144` | `GET /public/conformance/harness-data.json` | `p_page_fiber_conformance` | Gating static JSON Transition | `t_req_get_fiber_conformance_harness`, `t_ok_get_fiber_conformance_harness`, `t_fail_get_fiber_conformance_harness`, `t_recover_get_fiber_conformance_harness` | `observed` | Gates visible conformance matrix rendering on `fiber-conformance.html`. |
| `index.html:530` | `GET /data/samples/portal_samples_manifest.json` | `p_view_index_mcard_viewer` | Passive static JSON asset | `bindings.staticJsonAssets` | `observed` | Static fallback sample catalog bundled on disk; `GET /api/mcard/landing` already models the server-state Transition. |
| `public/js/ViewManager.js:27` | `GET /public/config/app-views.json` | `p_page_app` | Passive static JSON asset | `bindings.staticJsonAssets` | `observed` | Static tab layout configuration file served from `public/config`. |
| `public/js/PWAManager.js:52` | `GET /public/config/pwa-config.json` | `p_page_app` | Passive static JSON asset | `bindings.staticJsonAssets` | `inferred` | Static PWA manifest helper file under `public/config`. |
| `fiber-inspector.html:73` | `GET /public/conformance/unit-lint.json` | `p_page_fiber_inspector` | Auxiliary static JSON asset | `bindings.staticJsonAssets` | `observed` | Fetched inside the same `Promise.all` batch as gating `harness-data.json`. |
| `fiber-inspector.html:74` | `GET /public/conformance/witness.json` | `p_page_fiber_inspector` | Auxiliary static JSON asset | `bindings.staticJsonAssets` | `observed` | Fetched inside the same `Promise.all` batch as gating `harness-data.json`. |
| `js/telemetry/faro-collector.js:152` | `POST http://localhost:12347/collect` | `p_view_index_mcard_viewer` | External telemetry sink | Ignored external origin | `observed` | Fire-and-forget cross-origin Grafana Faro collector call observed on `index.html?noredirect=1`; not a workbench server Transition. |

## Dynamic URL builders

| Source file and line | Builder expression | Resolution status | Concrete endpoints or reason | Owner | Evidence basis |
| --- | --- | --- | --- | --- | --- |
| `js/landing-page-mcard.js:166` | `` fetch(`${baseUrl}${path}`) `` inside `createApiClient` | `resolved` | UI-called methods resolve to `GET /api/mcard/landing` at line 176 and `PUT /api/mcard/landing` at line 177; `probeUrl` `GET /api/mcard/probe-url`, `stats` `GET /api/mcard/stats`, and `upload` `POST /api/mcard` have zero workbench UI callers. | Product Manager | `observed` |
| `js/harness/lab-toolbar.js:175` | `fetch(configUrl)` | `resolved` | Default parameter in `initLabToolbar` at line 172 is `'/app-config.json'`. | Product Manager and TEA | `observed` |
| `js/harness/conformance-panel.js:25` | `` fetch(`/api/test-runs/conformance/latest?target=${encodeURIComponent(targetHandle)}`) `` | `resolved` | Concrete pathname is always `/api/test-runs/conformance/latest`. | Product Manager and TEA | `observed` |
| `js/observability/fibration-dashboard.js:156` | `` fetch(`${endpoint}?_t=${Date.now()}`) `` | `resolved` | Default `endpoint` at line 142 is `'/api/clm/program-artifact'`. | Architect | `observed` |
| `public/js/ViewManager.js:27` | `fetch(configUrl)` | `resolved` | Instantiated at `app.html:415` with `'/public/config/app-views.json'`. | Product Manager | `observed` |
| `public/js/PWAManager.js:52` | `fetch(this.configUrl)` | `resolved` | Defaults to `'/public/config/pwa-config.json'` at line 14. | Product Manager | `inferred` |
| `js/clm-iframe-loader.js:20,285` | `fetch(this.registryUrl)` and `fetch(this.telemetryEndpoint)` | `resolved-unmounted` | Defaults to `GET /api/clm/registry` and `POST /api/clm/telemetry`, but `js/clm-iframe-loader.js` has zero root workbench HTML importers. | Architect | `inferred` |
| `js/pkc-core.js:35,50` | `` fetch(`/app-config.json?t=...${manifestUrl}`) `` | `unresolved` | Legacy PKC core loader accepts caller-supplied `manifestUrl` and has zero approved P0 workbench HTML importers. | Product Manager | `inferred` |
| `js/redux/slices/cubic-models-slice.js:25,48,77` and `js/store/authSlice.js:98` | `/api/cubic-models/*` and `/api/auth/verify` | `unresolved` | Unmounted legacy Redux thunks referencing endpoints that `ws-server.js` does not mount. | Architect | `inferred` |
| `js/oauth-handler.js:179,206` and `public/js/auth/zitadel-auth.js:162` | `https://${this.domain}/oauth/v2/token` and `userinfo` | `unresolved` | Runtime Zitadel domain comes from `/api/env` and belongs to undecided OAuth capability. | Product Manager and Security Owner | `inferred` |

## WebSocket connection sites

| Source file and line | Expression | Surface | Support status | Owner | Evidence basis | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ws-server.js:141,176` | `new WebSocketServer({ noServer: true })` handling `/ws/` upgrades | `server` | `not-ui-reachable` | Product Manager and Architect | `observed` | Server signaling hub with zero approved P0 workbench page callers. |
| `js/modules/net-gateway/index.js:124` | `socket = new WebSocket(url)` | `developer-demo` | `undecided` | Architect | `inferred` | Optional gateway module not imported by any approved root HTML page. |
| `js/modules/webrtc-dashboard/websocket-broadcast-service.js:54` | `this.ws = new WebSocket(this.wsUrl)` | `developer-demo` | `undecided` | Architect | `inferred` | Standalone WebRTC dashboard module under `js/modules/webrtc-dashboard`. |
| `js/renderers/ServerCLMRunner.js:36` | `this.ws = new WebSocket(this.wsUrl)` | `legacy` | `undecided` | Architect | `inferred` | Legacy remote CLM runner with zero root workbench importers. |
| `public/examples/games/chess.html:463` | `ws = new WebSocket(wsUrl)` | `legacy` | `undecided` | Product Manager | `inferred` | Standalone unauthenticated chess demo room sync. |
| `public/examples/location-map.html:327` | `ws = new WebSocket(WS_URL)` | `legacy` | `undecided` | Product Manager | `inferred` | Standalone Leaflet location-sharing demo. |

## Express endpoint binding census

Every mounted Express route in `ws-server.js`, `server/test-run-api.mjs`, `server/mcard-api.mjs`, `routes/auth.js`, and `routes/clm.js` is accounted for below, followed by the two unmounted routes in `routes/clm-api.js`.

| Method and path | Source file and line | Mount status | Net status | Bound Transition IDs or reason | Owner | Evidence basis |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /health` | `ws-server.js:321` | `mounted` | `not-ui-reachable` | Infrastructure readiness check for Playwright `webServer` and CLI probes. | Architect | `observed` |
| `GET /api/rooms` | `ws-server.js:335` | `mounted` | `not-ui-reachable` | Room inspection endpoint with zero approved workbench callers. | Architect | `observed` |
| `GET /api/env` | `ws-server.js:341` | `mounted` | `bound` | `t_req_get_env`, `t_ok_get_env`, `t_fail_get_env` | Product Manager and UX Designer | `observed` |
| `GET /api/config` | `ws-server.js:351` | `mounted` | `not-ui-reachable` | Called only by standalone `js/modules/webrtc-dashboard/config.js:7`. | Architect | `inferred` |
| `GET /app-config.json` | `ws-server.js:367` | `mounted` | `bound` | `t_req_get_app_config`, `t_ok_get_app_config`, `t_fail_get_app_config` | Product Manager and TEA | `observed` |
| `WS /ws/` | `ws-server.js:141,176` | `mounted` | `not-ui-reachable` | WebSocket upgrade path used only by undecided demos and unmounted modules. | Product Manager and Architect | `observed` |
| `POST /api/test-runs` | `server/test-run-api.mjs:35` | `mounted` | `bound` | `t_req_post_test_runs`, `t_ok_post_test_runs`, `t_fail_post_test_runs`, `t_recover_post_test_runs` | Product Manager and TEA | `observed` |
| `GET /api/test-runs/conformance/diff` | `server/test-run-api.mjs:157` | `mounted` | `not-ui-reachable` | Programmatic conformance diff endpoint with zero browser callers. | TEA | `inferred` |
| `GET /api/test-runs/conformance/latest` | `server/test-run-api.mjs:228` | `mounted` | `bound` | `t_req_get_conformance_latest`, `t_ok_get_conformance_latest`, `t_fail_get_conformance_latest` | Product Manager and TEA | `observed` |
| `GET /api/test-runs/latest/history` | `server/test-run-api.mjs:268` | `mounted` | `not-ui-reachable` | Programmatic history endpoint with zero browser callers. | TEA | `inferred` |
| `GET /api/test-runs` | `server/test-run-api.mjs:298` | `mounted` | `not-ui-reachable` | Programmatic list endpoint for CLI and unit tests. | TEA | `inferred` |
| `GET /api/test-runs/:hash` | `server/test-run-api.mjs:341` | `mounted` | `not-ui-reachable` | Programmatic replay lookup endpoint for `scripts/playwright-replay-driver.mjs`. | TEA | `inferred` |
| `POST /api/auth/token` | `routes/auth.js:38` | `mounted` | `not-ui-reachable` | Belongs to undecided OAuth capability in `DECISIONS.tsv`. | Product Manager and Security Owner | `inferred` |
| `POST /api/auth/refresh` | `routes/auth.js:126` | `mounted` | `not-ui-reachable` | Belongs to undecided OAuth capability in `DECISIONS.tsv`. | Product Manager and Security Owner | `inferred` |
| `POST /api/auth/logout` | `routes/auth.js:175` | `mounted` | `not-ui-reachable` | Belongs to undecided OAuth capability in `DECISIONS.tsv`. | Product Manager and Security Owner | `inferred` |
| `GET /api/clm/registry` | `routes/clm.js:25` | `mounted` | `bound` | `t_req_get_clm_registry`, `t_ok_get_clm_registry`, `t_fail_get_clm_registry`, `t_recover_get_clm_registry` | Scrum Master | `observed` |
| `GET /api/clm/component/:id` | `routes/clm.js:63` | `mounted` | `not-ui-reachable` | Zero approved workbench UI callers. | Architect | `inferred` |
| `GET /api/clm/health/:componentId` | `routes/clm.js:99` | `mounted` | `not-ui-reachable` | Zero approved workbench UI callers. | Architect | `inferred` |
| `POST /api/clm/telemetry` | `routes/clm.js:116` | `mounted` | `not-ui-reachable` | Referenced only by unmounted `js/clm-iframe-loader.js:285`. | Architect | `inferred` |
| `GET /api/clm/program-artifact` | `routes/clm.js:146` | `mounted` | `bound` | `t_req_get_clm_program_artifact`, `t_ok_get_clm_program_artifact`, `t_fail_get_clm_program_artifact` | Architect | `observed` |
| `POST /api/mcard` | `server/mcard-api.mjs:314` | `mounted` | `not-ui-reachable` | Programmatic write endpoint; `app.html` stores cards locally in IndexedDB. | Architect | `observed` |
| `GET /api/mcard/landing` | `server/mcard-api.mjs:338` | `mounted` | `bound` | `t_req_get_mcard_landing`, `t_ok_get_mcard_landing`, `t_fail_get_mcard_landing` | Product Manager | `observed` |
| `PUT /api/mcard/landing` | `server/mcard-api.mjs:346` | `mounted` | `bound` | `t_req_put_mcard_landing`, `t_ok_put_mcard_landing`, `t_fail_put_mcard_landing`, `t_recover_put_mcard_landing` | Product Manager | `inferred` |
| `GET /api/mcard/probe-url` | `server/mcard-api.mjs:372` | `mounted` | `not-ui-reachable` | Defined on `createApiClient` at `js/landing-page-mcard.js:178` with zero UI callers. | Product Manager | `inferred` |
| `GET /api/mcard` | `server/mcard-api.mjs:377` | `mounted` | `not-ui-reachable` | Programmatic list endpoint with zero browser callers. | Architect | `inferred` |
| `GET /api/mcard/stats` | `server/mcard-api.mjs:391` | `mounted` | `not-ui-reachable` | Defined on `createApiClient` at `js/landing-page-mcard.js:179` with zero UI callers. | Product Manager | `inferred` |
| `GET /api/mcard/search` | `server/mcard-api.mjs:402` | `mounted` | `not-ui-reachable` | Programmatic search endpoint with zero browser callers. | Architect | `inferred` |
| `GET /api/mcard/:hash/raw` | `server/mcard-api.mjs:409` | `mounted` | `not-ui-reachable` | Passive raw media URL in `js/landing-page-mcard.js:70`, not an interactive Transition. | Product Manager | `inferred` |
| `GET /api/mcard/:hash` | `server/mcard-api.mjs:429` | `mounted` | `not-ui-reachable` | Programmatic lookup endpoint with zero browser callers. | Architect | `inferred` |
| `DELETE /api/mcard/:hash` | `server/mcard-api.mjs:439` | `mounted` | `not-ui-reachable` | Programmatic delete endpoint with zero browser callers. | Architect | `inferred` |
| `POST /execute` in `routes/clm-api.js` | `routes/clm-api.js:57` | `unmounted` | `not-ui-reachable` | Router file is never imported by `ws-server.js`. | Architect | `observed` |
| `POST /test` in `routes/clm-api.js` | `routes/clm-api.js:115` | `unmounted` | `not-ui-reachable` | Router file is never imported by `ws-server.js`. | Architect | `observed` |

## PenPot navigation drift table

`js/nav.js` is generated from `design/landing-navigation.penpot` with graph hash `7fc5562f37de5880c28963dfbfeb7b976cafb6feb6e8698078528a9d63a41fb4` and declares 3 frames for `index.html`, `app.html`, and `responsive-lab.html` plus 4 click interactions. Comparing `js/nav.js`, HTML `<a href>` markup, and script navigation reveals the following drift items. `src/net/workbench-net.yaml` models live runtime behavior directly rather than copying `NAVIGATION_ROUTES` by hand.

| Edge | In `js/nav.js` | In HTML `<a href>` | In script navigation | Drift classification and live behavior |
| --- | --- | --- | --- | --- |
| `index.html -> responsive-lab.html` automatic arrival redirect | No | No | Yes, `window.location.replace('responsive-lab.html')` at `index.html:13` | Script-only automatic redirect `t_redirect_index_to_lab`; PenPot models `index.html` as a static click frame and omits the boot redirect. |
| `index.html?noredirect=1 -> index.html` | No | Yes, `href="index.html"` at `index.html:279` | No | HTML-only self-route link `t_link_viewer_to_index` from `p_view_index_mcard_viewer` to `p_page_index`, which then triggers `t_redirect_index_to_lab`. |
| `index.html?noredirect=1 -> app.html` | Yes, `Home -> Mission Control` at `js/nav.js:18-23` | Yes, `href="app.html"` at `index.html:280` | Unwired `window.open` helper at `index.html:404` | Aligned between `js/nav.js` and HTML only when `?noredirect=1` suppresses the boot redirect; unreachable from bare `/index.html` because `index.html:13` redirects before user click. |
| `index.html?noredirect=1 -> responsive-lab.html` | Yes, `Home -> Responsive UI Lab` at `js/nav.js:25-30` | Yes, `href="responsive-lab.html"` at `index.html:281,293,323` | Fallback `window.location.href` at `index.html:482` | Aligned in `p_view_index_mcard_viewer` mode as `t_link_viewer_to_lab`. |
| `app.html -> /` | Yes, `Mission Control -> Home` with `destinationPath` set to `"index.html"` at `js/nav.js:40-46` | No `<a href>` element in `app.html` | Yes, `onclick="window.location.href='/'"` on `<button>` at `app.html:76` | Mechanism and path drift where PenPot expects a click to `index.html`, `app.html` has zero `<a>` tags and uses a button `onclick` to `/`, which then redirects to `responsive-lab.html`. |
| `responsive-lab.html -> /` | Yes, `Responsive UI Lab -> Home` with `destinationPath` set to `"index.html"` at `js/nav.js:56-62` | Yes, `<a href="/">` at `responsive-lab.html:875` | No | Path and destination drift where PenPot targets `index.html`, HTML targets `/`, and live navigation lands back on `responsive-lab.html` because `index.html:13` redirects `/` to `responsive-lab.html`. |
| `responsive-lab.html -> app.html` | No | Yes, `<a href="app.html" target="_blank">` at `responsive-lab.html:898,901` | No | HTML-only link `t_link_lab_to_app` missing from PenPot `js/nav.js` `Responsive UI Lab` outgoing links, and uses `target="_blank"` popup tab semantics. |
| `app.html -> /public/examples/games/*-auth.html` | No | No | Yes, `window.open` at `app.html:284,316,348` | Script-only `open-external` Transitions `t_open_external_monopoly`, `t_open_external_chess`, and `t_open_external_go` absent from PenPot. |
| Deep-link diagnostic pages `sprint-registry.html`, `fiber-inspector.html`, `fiber-conformance.html` | No | No | No | Approved internal diagnostic `page` Places entered via direct URL with zero PenPot frames. |
