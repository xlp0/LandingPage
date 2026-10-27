# GQC-00 Astro Migration Readiness and Workbench Baseline

## 1. Current Host and Script Baseline

LandingPage currently ships without Astro. No `astro.config.*` file, no `astro` or `@astrojs/*` dependency in `package.json` or `package-lock.json`, and no root `src/` directory exist on commit `c658f40`.

Current root `package.json` commands establish the pre-Astro operational baseline:

| Script | Command | Observed behavior in GQC-00 |
| --- | --- | --- |
| `dev` | `node ws-server.js` | Starts root Express + WebSocket gateway on default port `3000` (or `PORT` env). |
| `start` | `undefined` | Identical to `npm run dev`. |
| `build` | `npm run build --workspaces` | Runs workspace `build.js` scripts only. `@pkc/core` and `@pkc/markdown-renderer` pass; `@pkc/p2p` and `pkc-server` fail with missing exports/files. |
| `test:unit` | `node --test 'tests/unit/**/*.test.*' tests/single-page-mcard.test.mjs` | Runs Node test runner suites (103/103 passing in GQC-00). Excludes `tests/observability/*.test.js`. |
| `check:playwright-discovery` | `node scripts/check-playwright-discovery.mjs` | Enforces non-zero Playwright discovery on `smoke` and `features` and tracks the expiring `SPRINT-GQC-01` `components` exception. |
| `test` | `playwright test` | Runs `npx playwright test` across all 5 projects in `playwright.config.js` against `PORT=3001`. |

`GQC-02B` owns the Astro host configuration. This document records the source facts and runtime measurements that `GQC-02A`, `GQC-02B`, and `GQC-06` consume.

## 2. Candidate Workbench Places (Root and `public/` HTML Census)

Sprint planning estimated 7 root HTML pages and 17 `public/` HTML pages (`components/` holds 17 HTML fragments, while `public/` holds 27 HTML pages on disk). All 34 root and `public/` HTML files are inventoried below as candidate `page` Places so `GQC-02A` has a complete denominator.

### Root HTML Candidate Places (7)

| Candidate Place ID | File | Served URLs | Product role | Support status |
| --- | --- | --- | --- | --- |
| `p_wb_mission_control` | `app.html` | `/app.html` | Legacy MCard Manager / Mission Control host page | undecided (tombstoned in retired-islands.yaml; PM classifies target role) |
| `p_wb_fiber_conformance` | `fiber-conformance.html` | `/fiber-conformance.html` | Internal fiber conformance harness | internal-diagnostic (undecided for P0 net) |
| `p_wb_fiber_inspector` | `fiber-inspector.html` | `/fiber-inspector.html` | Internal fiber correctness and marking inspector | internal-diagnostic (undecided for P0 net) |
| `p_wb_landing_portal` | `index.html` | `/`, `/index.html`, `/index.html?noredirect=1` | P0 workbench redirect entry and ?noredirect=1 single-page MCard viewer | approved-p0-entry |
| `p_wb_pkc_docs_index` | `pkc-docs-index.html` | `/pkc-docs-index.html` | Legacy PKC documentation catalog with 5 broken pkc-viewer.html links | legacy-catalog (undecided for P0 net) |
| `p_wb_responsive_lab` | `responsive-lab.html` | `/responsive-lab.html` | P0 Responsive UI Lab workbench shell | approved-p0-workbench |
| `p_wb_sprint_registry` | `sprint-registry.html` | `/sprint-registry.html` | Internal CLM sprint registry table view | internal-planning (undecided for P0 net) |

### `public/` HTML Candidate Places (27)

Because `ws-server.js:134` mounts `public/` at `/public` and `ws-server.js:136` mounts `public/` at `/`, every `public/<subpath>` file below is currently reachable at both `/public/<subpath>` and `/<subpath>`.

| Candidate Place ID | File | Dual-mounted URL paths | Product role | Support status |
| --- | --- | --- | --- | --- |
| `p_pub_conformance_membrane_probe` | `public/conformance/membrane-probe.html` | `/public/conformance/membrane-probe.html`, `/conformance/membrane-probe.html` | Same-origin conformance probe fixture | probe-fixture (excluded from P0 workbench net) |
| `p_pub_create_card_template` | `public/create-card-template.html` | `/public/create-card-template.html`, `/create-card-template.html` | Card creation modal/template helper page | undecided (PM reviews in GQC-02A) |
| `p_pub_create_latex_card` | `public/create-latex-card.html` | `/public/create-latex-card.html`, `/create-latex-card.html` | Card creation modal/template helper page | undecided (PM reviews in GQC-02A) |
| `p_pub_examples_3dgames_3dobjectviewer_index` | `public/examples/3DGames/3DObjectViewer/index.html` | `/public/examples/3DGames/3DObjectViewer/index.html`, `/examples/3DGames/3DObjectViewer/index.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_3dgames_morphismcube_morphism_firsttry` | `public/examples/3DGames/MorphismCube/Morphism_FirstTry.html` | `/public/examples/3DGames/MorphismCube/Morphism_FirstTry.html`, `/examples/3DGames/MorphismCube/Morphism_FirstTry.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_3dgames_morphismcube_morphism_secondtry` | `public/examples/3DGames/MorphismCube/Morphism_SecondTry.html` | `/public/examples/3DGames/MorphismCube/Morphism_SecondTry.html`, `/examples/3DGames/MorphismCube/Morphism_SecondTry.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_abcmusic` | `public/examples/Music/ABCMusic.html` | `/public/examples/Music/ABCMusic.html`, `/examples/Music/ABCMusic.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_osmd` | `public/examples/Music/OSMD.html` | `/public/examples/Music/OSMD.html`, `/examples/Music/OSMD.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_syncedmusicvisualizer` | `public/examples/Music/SyncedMusicVisualizer.html` | `/public/examples/Music/SyncedMusicVisualizer.html`, `/examples/Music/SyncedMusicVisualizer.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_syncedmusicvisualizerv2` | `public/examples/Music/SyncedMusicVisualizerV2.html` | `/public/examples/Music/SyncedMusicVisualizerV2.html`, `/examples/Music/SyncedMusicVisualizerV2.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_syncedmusicvisualizerv3` | `public/examples/Music/SyncedMusicVisualizerV3.html` | `/public/examples/Music/SyncedMusicVisualizerV3.html`, `/examples/Music/SyncedMusicVisualizerV3.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_syncedmusicvisualizerv4_modular` | `public/examples/Music/SyncedMusicVisualizerV4-Modular.html` | `/public/examples/Music/SyncedMusicVisualizerV4-Modular.html`, `/examples/Music/SyncedMusicVisualizerV4-Modular.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_syncedmusicvisualizerv4` | `public/examples/Music/SyncedMusicVisualizerV4.html` | `/public/examples/Music/SyncedMusicVisualizerV4.html`, `/examples/Music/SyncedMusicVisualizerV4.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_syncedmusicvisualizerv5` | `public/examples/Music/SyncedMusicVisualizerV5.html` | `/public/examples/Music/SyncedMusicVisualizerV5.html`, `/examples/Music/SyncedMusicVisualizerV5.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_music_vexmusic` | `public/examples/Music/VexMusic.html` | `/public/examples/Music/VexMusic.html`, `/examples/Music/VexMusic.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_threejs_animejs_theater_example` | `public/examples/THREEJS_ANIMEJS/Theater_Example.html` | `/public/examples/THREEJS_ANIMEJS/Theater_Example.html`, `/examples/THREEJS_ANIMEJS/Theater_Example.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_wavevisualizers_waveformvisualizer` | `public/examples/WaveVisualizers/WaveFormVisualizer.html` | `/public/examples/WaveVisualizers/WaveFormVisualizer.html`, `/examples/WaveVisualizers/WaveFormVisualizer.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_games_chess_auth` | `public/examples/games/chess-auth.html` | `/public/examples/games/chess-auth.html`, `/examples/games/chess-auth.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_games_chess` | `public/examples/games/chess.html` | `/public/examples/games/chess.html`, `/examples/games/chess.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_games_go_auth` | `public/examples/games/go-auth.html` | `/public/examples/games/go-auth.html`, `/examples/games/go-auth.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_games_go` | `public/examples/games/go.html` | `/public/examples/games/go.html`, `/examples/games/go.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_games_monopoly_auth` | `public/examples/games/monopoly-auth.html` | `/public/examples/games/monopoly-auth.html`, `/examples/games/monopoly-auth.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_games_monopoly` | `public/examples/games/monopoly.html` | `/public/examples/games/monopoly.html`, `/examples/games/monopoly.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_games_play_ubud` | `public/examples/games/play_ubud.html` | `/public/examples/games/play_ubud.html`, `/examples/games/play_ubud.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_examples_location_map` | `public/examples/location-map.html` | `/public/examples/location-map.html`, `/examples/location-map.html` | Embedded example or game demo page under public/examples/ | demo-asset (undecided; referenced by app.html iframes) |
| `p_pub_icons_generate_icons` | `public/icons/generate-icons.html` | `/public/icons/generate-icons.html`, `/icons/generate-icons.html` | Developer utility page under public/ | internal-utility (undecided for P0 net) |
| `p_pub_latex_test` | `public/latex-test.html` | `/public/latex-test.html`, `/latex-test.html` | Developer utility page under public/ | internal-utility (undecided for P0 net) |

## 3. Candidate Workbench Transitions

Every observed internal anchor, script navigation, redirect, `window.open` call, and browser `fetch` call outside `archive/`, `packages/`, `tests/`, and `scripts/` is recorded below with its source file and line.

### Internal HTML Anchor Transitions (14)

| Candidate Transition ID | Source (`file:line`) | Target `href` | Notes |
| --- | --- | --- | --- |
| `t_html_link_01` | `index.html:279` | `index.html` | Static HTML anchor transition |
| `t_html_link_02` | `index.html:280` | `app.html` | Static HTML anchor transition |
| `t_html_link_03` | `index.html:281` | `responsive-lab.html` | Static HTML anchor transition |
| `t_html_link_04` | `index.html:293` | `responsive-lab.html` | Static HTML anchor transition |
| `t_html_link_05` | `index.html:323` | `responsive-lab.html` | Static HTML anchor transition |
| `t_html_link_06` | `pkc-docs-index.html:122` | `pkc-viewer.html?doc=MVP%20Cards%20%E2%80%94%20Design%20Thesis%20for%20Sovereign%20Knowledge%20Networks.md` | Broken legacy link (`pkc-viewer.html` lives only in `archive/html/pkc-viewer.html`) |
| `t_html_link_07` | `pkc-docs-index.html:132` | `pkc-viewer.html?doc=PKC%20as%20the%20Network.md` | Broken legacy link (`pkc-viewer.html` lives only in `archive/html/pkc-viewer.html`) |
| `t_html_link_08` | `pkc-docs-index.html:142` | `pkc-viewer.html?doc=Personal%20Knowledge%20Container.md` | Broken legacy link (`pkc-viewer.html` lives only in `archive/html/pkc-viewer.html`) |
| `t_html_link_09` | `pkc-docs-index.html:152` | `pkc-viewer.html?doc=Yoneda%20Arithmetic.md` | Broken legacy link (`pkc-viewer.html` lives only in `archive/html/pkc-viewer.html`) |
| `t_html_link_10` | `pkc-docs-index.html:162` | `pkc-viewer.html?doc=TikZ-CD-Examples.md` | Broken legacy link (`pkc-viewer.html` lives only in `archive/html/pkc-viewer.html`) |
| `t_html_link_11` | `responsive-lab.html:875` | `/` | Static HTML anchor transition |
| `t_html_link_12` | `responsive-lab.html:898` | `app.html` | Static HTML anchor transition |
| `t_html_link_13` | `responsive-lab.html:901` | `app.html` | Static HTML anchor transition |
| `t_html_link_14` | `public/create-latex-card.html:173` | `mcard-manager.html` | Static HTML anchor transition |

### Script Redirects, `location.*` Writes, and `window.open` Transitions (31)

In addition to static literals below, `index.html` mounts PenPot navigation from `js/nav.js` (`NAVIGATION_ROUTES` with 3 frames and 4 click interactions targeting `index.html`, `app.html`, and `responsive-lab.html`), and `responsive-lab.html` switches `#mission-control-iframe` via `js/harness/target-membrane.js:59` (`iframe.src = target`).

| Candidate Transition ID | Kind | Source (`file:line`) | Observed statement |
| --- | --- | --- | --- |
| `t_js_nav_01` | `location-nav` | `app.html:76` | `<button class="header-btn" onclick="window.location.href='/'" style="margin-right: 12px;"` |
| `t_js_nav_02` | `location-nav` | `index.html:13` | `window.location.replace('responsive-lab.html');` |
| `t_js_nav_03` | `location-nav` | `index.html:482` | `window.location.href = 'responsive-lab.html';` |
| `t_js_nav_04` | `location-nav` | `js/harness/lab-toolbar.js:161` | `const curUrl = new URL(window.location.href);` |
| `t_js_nav_05` | `location-nav` | `js/harness/target-membrane.js:12` | `export function resolveTarget(raw, baseHref = (typeof window !== 'undefined' ? window.location.href : 'http://` |
| `t_js_nav_06` | `location-nav` | `js/harness/target-membrane.js:34` | `baseHref = (typeof window !== 'undefined' ? window.location.href : 'http://localhost/'),` |
| `t_js_nav_07` | `location-nav` | `js/libs/mermaid/mermaid.min.js:370` | `';break;default:s+=d}u=!1}else d==="\\"?u=!0:s+=d;return s}function wme(i,s,u){var d=s.label,p=i.append("g");s` |
| `t_js_nav_08` | `location-nav` | `js/modules/auth-manager.js:132` | `window.location.href = logoutUrl;` |
| `t_js_nav_09` | `location-nav` | `js/modules/auth-module.js:137` | `window.location.href = authUrl;` |
| `t_js_nav_10` | `location-nav` | `js/modules/auth-module.js:166` | `window.location.href = logoutUrl;` |
| `t_js_nav_11` | `location-nav` | `js/modules/p2p-serverless/discovery.js:284` | `const invitation = this.parseInvitation(window.location.href);` |
| `t_js_nav_12` | `location-nav` | `js/modules/p2p-serverless/index.js:147` | `const invitation = discoveryManager.parseInvitation(window.location.href);` |
| `t_js_nav_13` | `location-nav` | `js/modules/webrtc-dashboard/utils.js:240` | `static parseUrlParams(url = window.location.href) {` |
| `t_js_nav_14` | `location-nav` | `js/modules/webrtc-dashboard/websocket-broadcast-service.js:42` | `console.log('[WSBroadcast] (Same domain as:', window.location.href, ')');` |
| `t_js_nav_15` | `location-nav` | `js/oauth-handler.js:118` | `window.location.href = authUrl;` |
| `t_js_nav_16` | `location-nav` | `js/vendor/Tone.js:1` | `!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&` |
| `t_js_nav_17` | `location-nav` | `js/vendor/mermaid/mermaid.min.js:370` | `';break;default:s+=d}u=!1}else d==="\\"?u=!0:s+=d;return s}function wme(i,s,u){var d=s.label,p=i.append("g");s` |
| `t_js_nav_18` | `location-nav` | `public/create-latex-card.html:49` | `<button onclick="window.location.href='mcard-manager.html'">Go to MCard Manager</button>` |
| `t_js_nav_19` | `location-nav` | `public/examples/Music/js/lib/Tone.min.js:8` | `!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&` |
| `t_js_nav_20` | `location-nav` | `public/examples/Music/js/lib/opensheetmusicdisplay.min.js:2` | `!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&` |
| `t_js_nav_21` | `location-nav` | `public/js/auth/zitadel-auth.js:106` | `window.top.location.href = authUrl.toString();` |
| `t_js_nav_22` | `location-nav` | `public/js/auth/zitadel-auth.js:108` | `window.location.href = authUrl.toString();` |
| `t_js_nav_23` | `location-nav` | `public/js/auth/zitadel-auth.js:273` | `window.location.href = logoutUrl.toString();` |
| `t_js_nav_24` | `window.open` | `app.html:284` | `<button onclick="window.open('/public/examples/games/monopoly-auth.html', '_blank', 'width=1400,height=900')"` |
| `t_js_nav_25` | `window.open` | `app.html:316` | `<button onclick="window.open('/public/examples/games/chess-auth.html', '_blank', 'width=1400,height=900')"` |
| `t_js_nav_26` | `window.open` | `app.html:348` | `<button onclick="window.open('/public/examples/games/go-auth.html', '_blank', 'width=1400,height=900')"` |
| `t_js_nav_27` | `window.open` | `components/wikipedia-search.html:308` | `<div class="result-card" onclick="window.open('${url}', '_blank')">` |
| `t_js_nav_28` | `window.open` | `index.html:404` | `const win = window.open(targetUrl, 'GovTechMissionControl', 'noopener,noreferrer');` |
| `t_js_nav_29` | `window.open` | `js/harness/lab-toolbar.js:290` | `window.open(current, '_blank');` |
| `t_js_nav_30` | `window.open` | `js/libs/mermaid/mermaid.min.js:619` | `'+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var U=this.next();return U\|\|thi` |
| `t_js_nav_31` | `window.open` | `js/vendor/mermaid/mermaid.min.js:619` | `'+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var U=this.next();return U\|\|thi` |

### Browser and Workbench `fetch()` Transitions (95 call sites)

Primary workbench API endpoints hit by the root surfaces include `/app-config.json` (`js/harness/lab-toolbar.js:48`), `/api/mcard/landing` and `/api/mcard/*` (`js/landing-page-mcard.js`, `public/js/mcard-kernel/*`), `/api/test-runs` (`js/harness/recording-ribbon.js`), `/api/clm/registry` and `/api/clm/program-artifact` (`index.html`, `sprint-registry.html`, `js/clm-iframe-loader.js`), `/api/env` and `/api/config` (`public/js/env-shim.js`, `public/js/auth/*`), and `/api/auth/*`. Full call-site inventory follows:

| Candidate Transition ID | Source (`file:line`) | Observed `fetch` call site |
| --- | --- | --- |
| `t_fetch_001` | `components/crash-test-external.html:46` | `fetch('https://api.broken-endpoint-that-does-not-exist.com/data')` |
| `t_fetch_002` | `components/pkc-viewer.html:918` | `const response = await fetch(url);` |
| `t_fetch_003` | `components/wikipedia-search.html:267` | `const response = await fetch(searchUrl);` |
| `t_fetch_004` | `components/wikipedia-viewer.html:235` | `const response = await fetch(url);` |
| `t_fetch_005` | `components/youtube-viewer.html:523` | `const response = await fetch(oembedUrl);` |
| `t_fetch_006` | `fiber-conformance.html:144` | `const data = await fetch('./public/conformance/harness-data.json').then((r) => r.json());` |
| `t_fetch_007` | `fiber-inspector.html:72` | `fetch('./public/conformance/harness-data.json').then((r) => r.json()),` |
| `t_fetch_008` | `fiber-inspector.html:73` | `fetch('./public/conformance/unit-lint.json').then((r) => r.json()),` |
| `t_fetch_009` | `fiber-inspector.html:74` | `fetch('./public/conformance/witness.json').then((r) => r.json()),` |
| `t_fetch_010` | `index.html:351` | `const response = await fetch('/api/env');` |
| `t_fetch_011` | `index.html:530` | `const samples = await fetch('./data/samples/portal_samples_manifest.json')` |
| `t_fetch_012` | `js/clm-iframe-loader.js:20` | `const response = await fetch(this.registryUrl);` |
| `t_fetch_013` | `js/clm-iframe-loader.js:285` | `await fetch(this.telemetryEndpoint, {` |
| `t_fetch_014` | `js/components/HeroContentComponent.js:89` | `const response = await fetch('/api/env', { cache: 'no-cache' });` |
| `t_fetch_015` | `js/harness/conformance-panel.js:25` | `const res = await fetch('/api/test-runs/conformance/latest?target=${encodeURIComponent(targetUrl)}');` |
| `t_fetch_016` | `js/harness/lab-toolbar.js:175` | `const res = await fetch(configUrl);` |
| `t_fetch_017` | `js/harness/recorder.js:219` | `const res = await fetch('/api/test-runs', {` |
| `t_fetch_018` | `js/landing-page-mcard.js:166` | `const response = await fetch('${baseUrl}${path}', {` |
| `t_fetch_019` | `js/libs/katex.min.js:1` | `!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&` |
| `t_fetch_020` | `js/libs/katex/katex.min.js:1` | `!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&` |
| `t_fetch_021` | `js/libs/mermaid/mermaid.min.js:6` | `')),b+=P+d[T+1]}),b}var _g=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:` |
| `t_fetch_022` | `js/libs/mermaid/mermaid.min.js:345` | `'+se+" children.");for(var G=0;G<se;G++){var xe=new T9(be[G]),U=new M7([xe],{width:"400em",height:ji(ne),viewB` |
| `t_fetch_023` | `js/libs/mermaid/mermaid.min.js:349` | `',this.tokenRegex.lastIndex);return v===-1?(this.tokenRegex.lastIndex=s.length,this.settings.reportNonstrict("` |
| `t_fetch_024` | `js/libs/polyfill.js:14` | `global:!0,bind:!0,forced:o.setTimeout!==i},{setTimeout:i})},function(t,r,e){e(769)},function(r,e,n){var o,i,a,` |
| `t_fetch_025` | `js/modules/auth-manager.js:76` | `const response = await fetch('/api/env', { cache: 'no-cache' });` |
| `t_fetch_026` | `js/modules/auth-manager.js:173` | `const response = await fetch('/api/auth/token', {` |
| `t_fetch_027` | `js/modules/auth-module.js:204` | `const response = await fetch('/api/auth/refresh', {` |
| `t_fetch_028` | `js/modules/p2p-serverless/config.js:23` | `const resp = await fetch('/app-config.json', { cache: 'no-cache' });` |
| `t_fetch_029` | `js/modules/professional-tikz-renderer.js:15` | `const response = await fetch('assets/tikz-diagrams/diagram-manifest.json');` |
| `t_fetch_030` | `js/modules/professional-tikz-renderer.js:55` | `const response = await fetch('assets/tikz-diagrams/${filename}');` |
| `t_fetch_031` | `js/modules/webrtc-dashboard/config.js:7` | `const response = await fetch('/api/config');` |
| `t_fetch_032` | `js/modules/webrtc-dashboard/managers/room-connection-manager.js:67` | `const response = await fetch('/app-config.json');` |
| `t_fetch_033` | `js/oauth-handler.js:179` | `const response = await fetch('https://${this.domain}/oauth/v2/token', {` |
| `t_fetch_034` | `js/oauth-handler.js:206` | `const response = await fetch('https://${this.domain}/oauth/v2/userinfo', {` |
| `t_fetch_035` | `js/observability/fibration-dashboard.js:156` | `const res = await fetch(` |
| `t_fetch_036` | `js/pkc-core.js:35` | `const appRes = await fetch('/app-config.json?t=${Date.now()}', { cache: 'no-cache' });` |
| `t_fetch_037` | `js/pkc-core.js:50` | `const res = await fetch('${manifestUrl}?t=${Date.now()}', { cache: 'no-cache' });` |
| `t_fetch_038` | `js/redux/slices/auth-slice.js:16` | `const response = await fetch('/api/auth/token', {` |
| `t_fetch_039` | `js/redux/slices/auth-slice.js:65` | `const response = await fetch('/api/auth/refresh', {` |
| `t_fetch_040` | `js/redux/slices/clm-slice.js:34` | `const envResponse = await fetch('/api/env');` |
| `t_fetch_041` | `js/redux/slices/clm-slice.js:42` | `const response = await fetch('/api/clm/registry');` |
| `t_fetch_042` | `js/redux/slices/cubic-models-slice.js:25` | `const response = await fetch('/api/cubic-models/${hash}');` |
| `t_fetch_043` | `js/redux/slices/cubic-models-slice.js:48` | `const response = await fetch('/api/cubic-models', {` |
| `t_fetch_044` | `js/redux/slices/cubic-models-slice.js:77` | `const response = await fetch('/api/cubic-models/${hash}/evaluate', {` |
| `t_fetch_045` | `js/store/authSlice.js:18` | `const response = await fetch('/api/auth/token', {` |
| `t_fetch_046` | `js/store/authSlice.js:47` | `const response = await fetch('/api/auth/refresh', {` |
| `t_fetch_047` | `js/store/authSlice.js:75` | `await fetch('/api/auth/logout', { method: 'POST' });` |
| `t_fetch_048` | `js/store/authSlice.js:98` | `const response = await fetch('/api/auth/verify', {` |
| `t_fetch_049` | `js/telemetry/faro-collector.js:152` | `fetch(this.collectorUrl, {` |
| `t_fetch_050` | `js/vendor/Tone.js:1` | `!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&` |
| `t_fetch_051` | `js/vendor/katex/katex.min.js:1` | `!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&` |
| `t_fetch_052` | `js/vendor/mermaid/mermaid.min.js:6` | `')),b+=P+d[T+1]}),b}var _g=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:` |
| `t_fetch_053` | `js/vendor/mermaid/mermaid.min.js:345` | `'+se+" children.");for(var G=0;G<se;G++){var xe=new T9(be[G]),U=new M7([xe],{width:"400em",height:ji(ne),viewB` |
| `t_fetch_054` | `js/vendor/mermaid/mermaid.min.js:349` | `',this.tokenRegex.lastIndex);return v===-1?(this.tokenRegex.lastIndex=s.length,this.settings.reportNonstrict("` |
| `t_fetch_055` | `js/vendor/three.min.js:6` | `!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&defi` |
| `t_fetch_056` | `js/vendor/tikzjax/tikzjax.js:8` | `var g=t(34),r=t(35),n=t(17);function B(){return i.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function o(A,e){if` |
| `t_fetch_057` | `public/examples/3DGames/3DObjectViewer/js/core/Viewer.js:99` | `const response = await fetch(basePath);` |
| `t_fetch_058` | `public/examples/3DGames/3DObjectViewer/js/formats/OBJFormat.js:140` | `const response = await fetch('${DATA_DIRECTORY}${basePath}/');` |
| `t_fetch_059` | `public/examples/3DGames/3DObjectViewer/js/formats/PLYFormat.js:26` | `const response = await fetch('${DATA_DIRECTORY}${filename}');` |
| `t_fetch_060` | `public/examples/3DGames/3DObjectViewer/js/formats/PLYFormat.js:46` | `const res = await fetch('${DATA_DIRECTORY}${filename}');` |
| `t_fetch_061` | `public/examples/3DGames/3DObjectViewer/js/three.module.js:43500` | `fetch( req )` |
| `t_fetch_062` | `public/examples/3DGames/3DObjectViewer/js/three.module.js:46811` | `console.warn( 'THREE.ImageBitmapLoader: fetch() not supported.' );` |
| `t_fetch_063` | `public/examples/3DGames/3DObjectViewer/js/three.module.js:46878` | `const promise = fetch( url, fetchOptions ).then( function ( res ) {` |
| `t_fetch_064` | `public/examples/Music/js/FileLoaderV5.js:256` | `const response = await fetch(url, {` |
| `t_fetch_065` | `public/examples/Music/js/lib/Tone.min.js:8` | `!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&` |
| `t_fetch_066` | `public/examples/Music/js/lib/three.min.js:7` | `function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&defin` |
| `t_fetch_067` | `public/examples/THREEJS_ANIMEJS/js/object-loader.js:52` | `const response = await fetch(url);` |
| `t_fetch_068` | `public/examples/THREEJS_ANIMEJS/js/object-loader.js:348` | `const response = await fetch(def.dataFile);` |
| `t_fetch_069` | `public/examples/WaveVisualizers/WaveFormVisualizer.html:307` | `const response = await fetch(item.data);` |
| `t_fetch_070` | `public/js/PWAManager.js:52` | `const response = await fetch(this.configUrl, { cache: 'no-cache' });` |
| `t_fetch_071` | `public/js/ViewManager.js:27` | `const response = await fetch(configUrl, { cache: 'no-cache' });` |
| `t_fetch_072` | `public/js/auth/zitadel-auth.js:162` | `const response = await fetch(tokenUrl, {` |
| `t_fetch_073` | `public/js/vendor/d3.bundle.js:5` | `')}function u(h){return h.map(c).join(t)}function c(h){return h==null?"":h instanceof Date?W_(h):e.test(h+="")` |
| `t_fetch_074` | `public/sw-clm.js:97` | `fetch(request).then((networkResponse) => {` |
| `t_fetch_075` | `public/sw-clm.js:111` | `return fetch(request).then((networkResponse) => {` |
| `t_fetch_076` | `public/sw-clm.js:141` | `fetch(request).then((networkResponse) => {` |
| `t_fetch_077` | `public/sw-clm.js:170` | `return fetch(request).then((networkResponse) => {` |
| `t_fetch_078` | `public/sw.js:60` | `fetch(url)` |
| `t_fetch_079` | `public/sw.js:134` | `fetch(request).then(response => {` |
| `t_fetch_080` | `public/sw.js:142` | `return fetch(request).then((response) => {` |
| `t_fetch_081` | `public/sw.js:159` | `const fetchPromise = fetch(request).then((networkResponse) => {` |
| `t_fetch_082` | `public/sw.js:195` | `return fetch(request).then((response) => {` |
| `t_fetch_083` | `public/sw.js:216` | `return fetch(request).then((response) => {` |
| `t_fetch_084` | `public/sw.js:231` | `fetch(request)` |
| `t_fetch_085` | `public/sw.js:260` | `return fetch(request).then((response) => {` |
| `t_fetch_086` | `server/mcard-probe-policy.mjs:257` | `const response = await fetch(currentUrl, {` |
| `t_fetch_087` | `sprint-registry.html:140` | `const res = await fetch('/api/clm/registry');` |
| `t_fetch_088` | `sw.js:65` | `fetch(url)` |
| `t_fetch_089` | `sw.js:139` | `fetch(request).then(response => {` |
| `t_fetch_090` | `sw.js:147` | `return fetch(request).then((response) => {` |
| `t_fetch_091` | `sw.js:164` | `const fetchPromise = fetch(request).then((networkResponse) => {` |
| `t_fetch_092` | `sw.js:200` | `return fetch(request).then((response) => {` |
| `t_fetch_093` | `sw.js:221` | `return fetch(request).then((response) => {` |
| `t_fetch_094` | `sw.js:236` | `fetch(request)` |
| `t_fetch_095` | `sw.js:265` | `return fetch(request).then((response) => {` |

## 4. Inline Scripts and Inline DOM Event Handlers

Astro components process `<script>` tags as bundled ES modules unless marked `is:inline`, and Content Security Policy tightening breaks inline scripts and `on*=` attributes.

### Inline `<script>` Tags Across Root and `public/` HTML (30)

| File and line | Opening tag |
| --- | --- |
| `fiber-conformance.html:31` | `<script type="module">` |
| `fiber-inspector.html:41` | `<script type="module">` |
| `index.html:10` | `<script>` |
| `index.html:347` | `<script>` |
| `index.html:369` | `<script type="module">` |
| `index.html:522` | `<script type="module">` |
| `responsive-lab.html:1132` | `<script type="module">` |
| `sprint-registry.html:135` | `<script type="module">` |
| `public/conformance/membrane-probe.html:5` | `<script>` |
| `public/create-latex-card.html:51` | `<script type="module">` |
| `public/examples/3DGames/3DObjectViewer/index.html:26` | `<script type="importmap">` |
| `public/examples/3DGames/MorphismCube/Morphism_FirstTry.html:359` | `<script>` |
| `public/examples/3DGames/MorphismCube/Morphism_SecondTry.html:472` | `<script>` |
| `public/examples/Music/ABCMusic.html:316` | `<script>` |
| `public/examples/Music/OSMD.html:341` | `<script>` |
| `public/examples/Music/SyncedMusicVisualizer.html:308` | `<script>` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:110` | `<script>` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:133` | `<script>` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:176` | `<script>` |
| `public/examples/Music/VexMusic.html:133` | `<script>` |
| `public/examples/WaveVisualizers/WaveFormVisualizer.html:224` | `<script>` |
| `public/examples/games/chess.html:418` | `<script>` |
| `public/examples/games/go-auth.html:247` | `<script>` |
| `public/examples/games/go.html:214` | `<script>` |
| `public/examples/games/monopoly-auth.html:276` | `<script>` |
| `public/examples/games/monopoly.html:643` | `<script>` |
| `public/examples/games/play_ubud.html:29` | `<script type="text/babel">` |
| `public/examples/location-map.html:207` | `<script>` |
| `public/icons/generate-icons.html:70` | `<script>` |
| `public/latex-test.html:69` | `<script>` |

### Inline HTML Event Handler Attributes (98 lines across 18 files)

`responsive-lab.html` and `index.html` contain zero inline `on*=` attributes. `app.html` contains 40 lines with inline `onclick=`/`onchange=` attributes bound to globals installed by `/public/js/ui-inline-handlers.js`.

| File | Line count | Lines and event attributes |
| --- | --- | --- |
| `app.html` | 40 | `76 (onclick)`, `85 (onclick)`, `89 (onclick)`, `93 (onclick)`, `104 (onclick)`, `125 (onclick)`, `145 (onclick)`, `165 (onclick)`, `185 (onclick)`, `207 (onclick)`, `227 (onclick)`, `247 (onclick)`, `267 (onclick)`, `284 (onclick)`, `299 (onclick)`, `316 (onclick)`, `331 (onclick)`, `348 (onclick)`, `366 (onclick)`, `378 (onclick)`, `387 (onclick)`, `397 (onclick)`, `408 (onchange)`, `412 (onchange)`, `416 (onchange)`, `420 (onchange)`, `424 (onchange)`, `433 (onchange)`, `437 (onchange)`, `441 (onchange)`, `447 (onclick)`, `463 (onclick)`, `472 (onclick)`, `478 (onclick)`, `500 (onclick)`, `515 (onclick)`, `530 (onclick)`, `562 (onclick)`, `566 (onclick)`, `581 (onclick)` |
| `public/create-card-template.html` | 2 | `52 (onclick)`, `62 (onclick)` |
| `public/create-latex-card.html` | 2 | `48 (onclick)`, `49 (onclick)` |
| `public/examples/Music/ABCMusic.html` | 7 | `230 (onclick)`, `231 (onclick)`, `232 (onclick)`, `233 (onclick)`, `234 (onclick)`, `243 (onclick)`, `244 (onclick)` |
| `public/examples/Music/OSMD.html` | 8 | `279 (onclick)`, `280 (onclick)`, `281 (onclick)`, `282 (onclick)`, `286 (onclick)`, `287 (onclick)`, `301 (onchange)`, `603 (onload)` |
| `public/examples/Music/SyncedMusicVisualizer.html` | 3 | `670 (onclick)`, `683 (onclick)`, `684 (onclick)` |
| `public/examples/Music/SyncedMusicVisualizerV3.html` | 3 | `271 (onclick)`, `286 (onclick)`, `287 (onclick)` |
| `public/examples/Music/SyncedMusicVisualizerV4.html` | 3 | `302 (onclick)`, `317 (onclick)`, `318 (onclick)` |
| `public/examples/Music/VexMusic.html` | 4 | `111 (onclick)`, `112 (onclick)`, `113 (onclick)`, `114 (onclick)` |
| `public/examples/WaveVisualizers/WaveFormVisualizer.html` | 1 | `193 (onclick)` |
| `public/examples/games/chess.html` | 2 | `368 (onclick)`, `611 (onclick)` |
| `public/examples/games/go-auth.html` | 2 | `215 (onclick)`, `238 (onclick)` |
| `public/examples/games/go.html` | 2 | `190 (onclick)`, `191 (onclick)` |
| `public/examples/games/monopoly-auth.html` | 2 | `233 (onclick)`, `259 (onclick)` |
| `public/examples/games/monopoly.html` | 8 | `547 (onclick)`, `556 (onclick)`, `557 (onclick)`, `558 (onclick)`, `589 (onclick)`, `590 (onclick)`, `607 (onclick)`, `625 (onclick)` |
| `public/examples/games/play_ubud.html` | 5 | `422 (onclick)`, `486 (onclick)`, `528 (onclick)`, `562 (onclick)`, `577 (onclick)` |
| `public/examples/location-map.html` | 1 | `360 (onerror)` |
| `public/icons/generate-icons.html` | 3 | `63 (onclick)`, `64 (onclick)`, `145 (onclick)` |

## 5. `window.*` Global Couplings

Key architectural globals discovered in source:

- `window.__lab` is installed at `js/harness/lab-api.js:81` (invoked from `responsive-lab.html:1207`) and exposes `{ version, geometry, target, registry, fidelity, recorder }` for Playwright specs.
- `window.mcardManager` is installed by `public/js/app-bootstrap.js` and `public/js/mcard-kernel/MCardManager.js` on `app.html`.
- `window.app` is assigned at `js/app-entry.js:90`, but `js/app-entry.js` has zero live HTML importers outside `archive/html/`. `app.html:32` and `app.html:605` load `/public/js/app-bootstrap.js` instead (with duplicate script tags on lines 32 and 605).
- Event-bus mismatch in the Responsive Lab conformance panel (`js/harness/conformance-panel.js:96-97`) attaches `window.addEventListener("lab:viewport-change", ...)` and `window.addEventListener("lab:target-changed", ...)`, whereas `js/harness/viewport-stage.js:68` dispatches non-bubbling `lab:viewport-change` on `document` and `js/harness/target-membrane.js:64` dispatches non-bubbling `lab:target-change` on `document`.

All 97 `window.<prop> =` assignment sites in non-archived workbench and `public/` files:

| Global property | Source (`file:line`) | Assignment snippet |
| --- | --- | --- |
| `window.onYouTubeIframeAPIReady` | `components/youtube-clip.html:380` | `window.onYouTubeIframeAPIReady = function() {` |
| `window.__FIBER_HARNESS__` | `fiber-conformance.html:65` | `window.__FIBER_HARNESS__ = payload;` |
| `window.__FIBER_PANEL__` | `fiber-inspector.html:165` | `window.__FIBER_PANEL__ = {` |
| `window.self` | `index.html:12` | `if (window.self === window.top && !window.location.search.includes('noredirect')) {` |
| `window.__faro_collector` | `index.html:396` | `window.__faro_collector = faro;` |
| `window.__presentation_controller` | `index.html:397` | `window.__presentation_controller = presentation;` |
| `window.__deployment_inspector` | `index.html:398` | `window.__deployment_inspector = inspector;` |
| `window.__least_action_navigator` | `index.html:399` | `window.__least_action_navigator = leastActionNavigator;` |
| `window.__open_mission_control_split` | `index.html:420` | `window.__open_mission_control_split = openMissionControlSplit;` |
| `window.__open_responsive_ui_lab` | `index.html:485` | `window.__open_responsive_ui_lab = openResponsiveUILab;` |
| `window.__open_mission_side_pane` | `index.html:486` | `window.__open_mission_side_pane = openResponsiveUILab;` |
| `window.app` | `js/app-entry.js:90` | `window.app = {` |
| `window.CLMIframeLoader` | `js/clm-iframe-loader.js:359` | `window.CLMIframeLoader = CLMIframeLoader;` |
| `window.PKCAnimationPlayground` | `js/components/animation-playground.js:96` | `window.PKCAnimationPlayground = { mount };` |
| `window.__lab` | `js/harness/lab-api.js:82` | `window.__lab = api;` |
| `window.self` | `js/harness/lab-probe-agent.js:10` | `if (typeof window === 'undefined' \|\| window.self === window.top) {` |
| `window.parent` | `js/harness/lab-probe-agent.js:161` | `if (!window.parent \|\| window.parent === window) return;` |
| `window.label` | `js/libs/mermaid/mermaid.min.js:1253` | `';let sKe=0;const Win=function(i,s,u,d,p){const v=function(oe){switch(oe){case p.db.relationType.AGG` |
| `window.$gwt` | `js/libs/mermaid/mermaid.min.js:1600` | `',ul(ao(e,t[0])))>=0;)++t[0]}function iwn(e,t){Gu(e,t==null\|\|Gq((nr(t),t))\|\|isNaN((nr(t),t))?0:(nr(t` |
| `window.log` | `js/modules/p2p-serverless/debug-test.html:109` | `window.log = function(msg) {` |
| `window.clearLog` | `js/modules/p2p-serverless/debug-test.html:117` | `window.clearLog = function() {` |
| `window.createOffer` | `js/modules/p2p-serverless/debug-test.html:159` | `window.createOffer = async function() {` |
| `window.acceptOffer` | `js/modules/p2p-serverless/debug-test.html:244` | `window.acceptOffer = async function() {` |
| `window.applyAnswer` | `js/modules/p2p-serverless/debug-test.html:344` | `window.applyAnswer = async function() {` |
| `window.sendTestMessage` | `js/modules/p2p-serverless/debug-test.html:372` | `window.sendTestMessage = function() {` |
| `window.p2p` | `js/modules/p2p-serverless/example.html:174` | `window.p2p = p2pModule;` |
| `window.p2p` | `js/modules/p2p-serverless/index.js:108` | `window.p2p = this;` |
| `window.TikZRenderer` | `js/modules/tikz-renderer.js:340` | `window.TikZRenderer = TikZRenderer;` |
| `window.videoMeeting` | `js/modules/video-meeting/index.html:376` | `window.videoMeeting = meeting;` |
| `window.copyRoomCode` | `js/modules/video-meeting/index.html:398` | `window.copyRoomCode = function() {` |
| `window.closeModal` | `js/modules/video-meeting/index.html:405` | `window.closeModal = function() {` |
| `window.updateStatus` | `js/modules/video-meeting/index.html:410` | `window.updateStatus = updateStatus;` |
| `window.__WEBSOCKET_URL__` | `js/modules/webrtc-dashboard/config.js:14` | `window.__WEBSOCKET_URL__ = config.WEBSOCKET_URL;` |
| `window.__STUN_SERVERS__` | `js/modules/webrtc-dashboard/config.js:20` | `window.__STUN_SERVERS__ = config.STUN_SERVERS;` |
| `window.reduxStore` | `js/modules/webrtc-dashboard/index.html:351` | `window.reduxStore = store;` |
| `window.dashboard` | `js/modules/webrtc-dashboard/index.html:373` | `window.dashboard = new DashboardManager(store);` |
| `window.pendingRoomJoin` | `js/modules/webrtc-dashboard/index.html:400` | `window.pendingRoomJoin = { roomId, token, instant };` |
| `window.validateDashboard` | `js/modules/webrtc-dashboard/validate-flow.js:222` | `window.validateDashboard = async function() {` |
| `window.__REDUX_STORE__` | `js/redux/store.js:60` | `window.__REDUX_STORE__ = store;` |
| `window.downloadAudioBlob` | `js/renderers/AudioRenderer.js:300` | `window.downloadAudioBlob = (url, filename) => {` |
| `window.clmRenderer` | `js/renderers/CLMRenderer.js:843` | `window.clmRenderer = new CLMRenderer();` |
| `window.LatexRenderer` | `js/renderers/LatexRenderer.js:187` | `window.LatexRenderer = LatexRenderer;` |
| `window.__MARKED_LOADING__` | `js/renderers/MarkdownRenderer.js:38` | `window.__MARKED_LOADING__ = (async () => {` |
| `window.__MARKED_LOADING__` | `js/renderers/MarkdownRenderer.js:70` | `window.__MARKED_LOADING__ = null;` |
| `window.__MERMAID_LOADING__` | `js/renderers/MarkdownRenderer.js:92` | `window.__MERMAID_LOADING__ = (async () => {` |
| `window.__MERMAID_LOADING__` | `js/renderers/MarkdownRenderer.js:138` | `window.__MERMAID_LOADING__ = null;` |
| `window.__KATEX_LOADING__` | `js/renderers/MarkdownRenderer.js:160` | `window.__KATEX_LOADING__ = (async () => {` |
| `window.__KATEX_LOADING__` | `js/renderers/MarkdownRenderer.js:199` | `window.__KATEX_LOADING__ = null;` |
| `window.__TIKZ_LOADING__` | `js/renderers/MarkdownRenderer.js:220` | `window.__TIKZ_LOADING__ = (async () => {` |
| `window.__TIKZ_LOADING__` | `js/renderers/MarkdownRenderer.js:254` | `window.__TIKZ_LOADING__ = null;` |
| `window.__HLJS_LOADING__` | `js/renderers/MarkdownRenderer.js:278` | `window.__HLJS_LOADING__ = (async () => {` |
| `window.hljs` | `js/renderers/MarkdownRenderer.js:306` | `window.hljs = hljs;` |
| `window.__HLJS_LOADING__` | `js/renderers/MarkdownRenderer.js:335` | `window.__HLJS_LOADING__ = null; // Clear the flag` |
| `window.__PDF_CONTENT__` | `js/renderers/PDFRenderer.js:85` | `window.__PDF_CONTENT__ = {};` |
| `window.loadPDF` | `js/renderers/PDFRenderer.js:90` | `window.loadPDF = async (id) => {` |
| `window.downloadVideo` | `js/renderers/VideoRenderer.js:266` | `window.downloadVideo = function(url, format) {` |
| `window.label` | `js/vendor/mermaid/mermaid.min.js:1253` | `';let sKe=0;const Win=function(i,s,u,d,p){const v=function(oe){switch(oe){case p.db.relationType.AGG` |
| `window.$gwt` | `js/vendor/mermaid/mermaid.min.js:1600` | `',ul(ao(e,t[0])))>=0;)++t[0]}function iwn(e,t){Gu(e,t==null\|\|Gq((nr(t),t))\|\|isNaN((nr(t),t))?0:(nr(t` |
| `window.didYouMean` | `js/vendor/tailwind.js:34` | `'))});c.push([p,d,h])}}for(let[l,[c,f]]of o){let d=[];for(let[h,b,v]of c){let y=[h,...Fg([h],e.tailw` |
| `window.__THREE__` | `js/vendor/three.min.js:6` | `!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof de` |
| `window.onload` | `js/vendor/tikzjax/tikzjax.js:8` | `var g=t(34),r=t(35),n=t(17);function B(){return i.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function` |
| `window.createLatexCard` | `public/create-latex-card.html:54` | `window.createLatexCard = async function() {` |
| `window.viewer` | `public/examples/3DGames/3DObjectViewer/js/app.js:5` | `window.viewer = viewer; // Make accessible globally for debugging` |
| `window.__THREE__` | `public/examples/3DGames/3DObjectViewer/js/three.module.js:53038` | `window.__THREE__ = REVISION;` |
| `window.onload` | `public/examples/Music/OSMD.html:603` | `window.onload = initOSMD;` |
| `window.app` | `public/examples/Music/SyncedMusicVisualizer.html:779` | `window.app = { store, audioEngine, uiManager };` |
| `window.app` | `public/examples/Music/SyncedMusicVisualizerV3.html:358` | `window.app = {` |
| `window.app` | `public/examples/Music/SyncedMusicVisualizerV4.html:406` | `window.app = {` |
| `window.app` | `public/examples/Music/SyncedMusicVisualizerV5.html:253` | `window.app = {` |
| `window.app` | `public/examples/Music/SyncedMusicVisualizerV5.html:333` | `window.app = {` |
| `window.didYouMean` | `public/examples/Music/css/tailwind.js:34` | `'))});c.push([p,d,h])}}for(let[l,[c,f]]of o){let d=[];for(let[h,b,v]of c){let y=[h,...Fg([h],e.tailw` |
| `window.app` | `public/examples/Music/js/bootstrap-v4.js:68` | `window.app = this.app;` |
| `window.app` | `public/examples/Music/js/bootstrap-v4.js:107` | `window.app = null;` |
| `window.log` | `public/examples/Music/js/lib/opensheetmusicdisplay.min.js:2` | `!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==type` |
| `window.log` | `public/examples/Music/js/lib/opensheetmusicdisplay.min.js:2` | `!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==type` |
| `window.__THREE__` | `public/examples/Music/js/lib/three.min.js:7` | `function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof def` |
| `window.app` | `public/examples/Music/js/main.js:12` | `window.app = {` |
| `window.pwaManager` | `public/js/PWAManager.js:380` | `window.pwaManager = pwaManager;` |
| `window.viewManager` | `public/js/ViewManager.js:322` | `window.viewManager = viewManager;` |
| `window.mcardManager` | `public/js/app-bootstrap.js:17` | `window.mcardManager = manager;` |
| `window.navigateToCards` | `public/js/app-bootstrap.js:23` | `window.navigateToCards = () => {` |
| `window.navigateToViewer` | `public/js/app-bootstrap.js:33` | `window.navigateToViewer = () => {` |
| `window.navigateBack` | `public/js/app-bootstrap.js:43` | `window.navigateBack = () => {` |
| `window.selectType` | `public/js/app-bootstrap.js:73` | `window.selectType = (typeId) => {` |
| `window.viewCard` | `public/js/app-bootstrap.js:81` | `window.viewCard = (hash) => {` |
| `window.downloadCurrentCard` | `public/js/app-bootstrap.js:89` | `window.downloadCurrentCard = () => manager.downloadCurrentCard();` |
| `window.deleteCurrentCard` | `public/js/app-bootstrap.js:90` | `window.deleteCurrentCard = (event) => {` |
| `window.batchRemoveDuplications` | `public/js/app-bootstrap.js:98` | `window.batchRemoveDuplications = (event) => {` |
| `window.createTextCard` | `public/js/app-bootstrap.js:106` | `window.createTextCard = () => manager.createTextCard();` |
| `window.toggleChat` | `public/js/app-bootstrap.js:107` | `window.toggleChat = () => {` |
| `window.closeEditPanel` | `public/js/app-bootstrap.js:122` | `window.closeEditPanel = () => {` |
| `window.saveEditedCard` | `public/js/app-bootstrap.js:129` | `window.saveEditedCard = async () => {` |
| `window.ENV_CONFIG` | `public/js/config/auto-import-map.js:45` | `window.ENV_CONFIG = {` |
| `window.process` | `public/js/env-shim.js:2` | `window.process = {` |
| `window.performanceMonitor` | `public/js/performance-monitor.js:237` | `window.performanceMonitor = performanceMonitor;` |
| `window.searchFilters` | `public/js/ui-inline-handlers.js:68` | `window.searchFilters = {` |
| `window.searchFilters` | `public/js/ui-inline-handlers.js:95` | `window.searchFilters = null;` |

## 6. `/public/...` and `/js/...` URL Reference Census (174 references)

Astro copies its `publicDir` (`public/` by default) to the root `/` of the build output rather than `/public/...`, whereas `app.html` and `public/js/*` reference `/public/...` paths explicitly and root workbench pages import `/js/...` or `./js/...` directly from the repository root.

| Source (`file:line`) | Referenced URL path |
| --- | --- |
| `app.html:6` | `/public/css/semantic-tokens.css` |
| `app.html:19` | `/public/manifest.json` |
| `app.html:20` | `/public/icon.svg` |
| `app.html:21` | `/public/icon.svg` |
| `app.html:29` | `/public/css/mcard-manager.css` |
| `app.html:32` | `/public/js/app-bootstrap.js` |
| `app.html:35` | `/public/js/env-shim.js` |
| `app.html:38` | `/public/js/importmap-init.js` |
| `app.html:41` | `/public/vendor/lucide/lucide.min.js` |
| `app.html:43` | `/public/vendor/js-yaml.min.js` |
| `app.html:45` | `/public/css/mcard-manager.css` |
| `app.html:47` | `/public/css/content-renderers.css` |
| `app.html:136` | `/public/examples/location-map.html` |
| `app.html:156` | `/public/examples/THREEJS_ANIMEJS/Theater_Example.html` |
| `app.html:176` | `/public/examples/Music/SyncedMusicVisualizerV5.html` |
| `app.html:218` | `/public/examples/3DGames/MorphismCube/Morphism_FirstTry.html` |
| `app.html:238` | `/public/examples/3DGames/MorphismCube/Morphism_SecondTry.html` |
| `app.html:258` | `/public/examples/games/monopoly.html` |
| `app.html:284` | `/public/examples/games/monopoly-auth.html` |
| `app.html:316` | `/public/examples/games/chess-auth.html` |
| `app.html:348` | `/public/examples/games/go-auth.html` |
| `app.html:596` | `/public/js/ui-inline-handlers.js` |
| `app.html:599` | `/public/js/performance-monitor.js` |
| `app.html:602` | `/public/js/lazy-iframe-loader.js` |
| `app.html:605` | `/public/js/app-bootstrap.js?v=18` |
| `app.html:608` | `/public/js/ViewManager.js` |
| `app.html:611` | `/public/js/PWAInstallModal.js` |
| `app.html:614` | `/public/js/PWAManager.js` |
| `fiber-conformance.html:32` | `./public/js/fibers/registry.js` |
| `fiber-conformance.html:33` | `./public/js/mcard-kernel/compat.js` |
| `fiber-conformance.html:141` | `./public/conformance/membrane-probe.html` |
| `fiber-conformance.html:144` | `./public/conformance/harness-data.json` |
| `fiber-inspector.html:42` | `./public/js/fibers/registry.js` |
| `fiber-inspector.html:43` | `./public/js/mcard-kernel/compat.js` |
| `fiber-inspector.html:72` | `./public/conformance/harness-data.json` |
| `fiber-inspector.html:73` | `./public/conformance/unit-lint.json` |
| `fiber-inspector.html:74` | `./public/conformance/witness.json` |
| `index.html:16` | `./public/css/semantic-tokens.css` |
| `index.html:370` | `./js/runtime/presentation-controller.js` |
| `index.html:371` | `./js/telemetry/faro-collector.js` |
| `index.html:372` | `./js/runtime/deployment-inspector.js` |
| `index.html:373` | `./js/runtime/least-action-navigator.js` |
| `index.html:515` | `js/nav.js` |
| `index.html:523` | `./js/landing-page-mcard.js` |
| `index.html:524` | `./js/external-portal-membrane.js` |
| `index.html:525` | `./js/landing-page-mcard.js` |
| `js/components/HeroContentComponent.js:18` | `js/modules/p2p-serverless/example.html` |
| `js/components/HeroContentComponent.js:19` | `js/modules/webrtc-dashboard/index.html` |
| `js/components/HeroContentComponent.js:22` | `/js/modules/video-meeting/index.html` |
| `js/components/animation-playground.js:26` | `js/vendor/anime.min.js` |
| `js/components/animation-playground.js:27` | `js/vendor/tailwind.js` |
| `js/libs/mathjax-v3-tex-mml-chtml.js:1` | `js/output/chtml/fonts/tex-woff-v2` |
| `js/modules/professional-math-renderer.js:17` | `js/libs/katex.min.css` |
| `js/modules/professional-math-renderer.js:22` | `js/libs/katex.min.js` |
| `js/modules/webrtc-dashboard/index.html:294` | `/js/libs/redux.min.js` |
| `js/modules/webrtc-dashboard/index.html:295` | `/js/libs/redux-toolkit.min.js` |
| `js/observability/charts/chartjs-charts.js:23` | `/public/js/vendor/chartjs.bundle.js` |
| `js/observability/charts/d3-charts.js:22` | `/public/js/vendor/d3.bundle.js` |
| `js/renderers/CLMRenderer.js:9` | `/public/js/mcard/BrowserCLMRunner.js?v=2` |
| `js/renderers/CLMRenderer.js:10` | `/js/execution/ExecutionModeManager.js` |
| `js/renderers/MarkdownRenderer.js:225` | `/js/modules/tikz-renderer.js` |
| `js/renderers/MarkdownRenderer.js:237` | `/js/modules/professional-tikz-renderer.js` |
| `mcard-browser-entry.js:10` | `./public/js/mcard-kernel/bundle-entry.js` |
| `pkc-docs-index.html:8` | `/public/css/tokens.css` |
| `public/create-latex-card.html:52` | `./js/mcard-kernel/bundle-entry.js` |
| `public/examples/3DGames/3DObjectViewer/index.html:29` | `./js/three.module.js` |
| `public/examples/3DGames/3DObjectViewer/index.html:30` | `./js/addons/` |
| `public/examples/3DGames/3DObjectViewer/index.html:31` | `./js/anime.es.js` |
| `public/examples/3DGames/3DObjectViewer/index.html:36` | `./js/app.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:10` | `./js/lib/opensheetmusicdisplay.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:11` | `./js/lib/Tone.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:12` | `./js/lib/redux.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:81` | `./js/config.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:82` | `./js/store.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:83` | `./js/NoteExtractor.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:84` | `./js/AudioEngine.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:85` | `./js/UIManager.js` |
| `public/examples/Music/SyncedMusicVisualizerV2.html:86` | `./js/main.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:10` | `./js/lib/opensheetmusicdisplay.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:11` | `./js/lib/Tone.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:12` | `./js/lib/redux.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:13` | `./js/lib/three.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:14` | `./js/lib/OrbitControls.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:15` | `./js/lib/anime.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:105` | `./js/config.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:106` | `./js/store.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:107` | `./js/NoteExtractor.js` |
| `public/examples/Music/SyncedMusicVisualizerV3.html:108` | `./js/AudioEngine.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:10` | `./js/lib/opensheetmusicdisplay.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:11` | `./js/lib/Tone.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:12` | `./js/lib/redux.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:13` | `./js/lib/three.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:14` | `./js/lib/OrbitControls.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:15` | `./js/lib/anime.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:138` | `./js/config.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:139` | `./js/store.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:140` | `./js/AudioEngineV4.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:141` | `./js/ThreeVisualizerV4.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:142` | `./js/UIManagerV4.js` |
| `public/examples/Music/SyncedMusicVisualizerV4-Modular.html:143` | `./js/bootstrap-v4.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:10` | `./js/lib/opensheetmusicdisplay.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:11` | `./js/lib/Tone.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:12` | `./js/lib/redux.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:13` | `./js/lib/three.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:14` | `./js/lib/OrbitControls.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:15` | `./js/lib/anime.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:129` | `./js/config.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:130` | `./js/store.js` |
| `public/examples/Music/SyncedMusicVisualizerV4.html:131` | `./js/AudioEngineV4.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:10` | `./js/lib/opensheetmusicdisplay.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:11` | `./js/lib/Tone.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:12` | `./js/lib/redux.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:13` | `./js/lib/three.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:14` | `./js/lib/OrbitControls.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:15` | `./js/lib/anime.min.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:169` | `./js/config.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:170` | `./js/store.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:171` | `./js/FileLoaderV5.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:172` | `./js/AudioEngineV5.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:173` | `./js/ThreeVisualizerV4.js` |
| `public/examples/Music/SyncedMusicVisualizerV5.html:174` | `./js/UIManagerV4.js` |
| `public/examples/Music/js/AudioEngineV4.js:17` | `./js/workers/noteExtractor.worker.js` |
| `public/examples/Music/js/AudioEngineV5.js:47` | `./js/workers/noteExtractor.worker.js?v=` |
| `public/examples/THREEJS_ANIMEJS/Theater_Example.html:84` | `/js/vendor/three.min.js` |
| `public/examples/THREEJS_ANIMEJS/Theater_Example.html:85` | `/js/vendor/OrbitControls.js` |
| `public/examples/THREEJS_ANIMEJS/Theater_Example.html:86` | `/js/vendor/anime.min.js` |
| `public/examples/THREEJS_ANIMEJS/Theater_Example.html:87` | `/js/vendor/Tone.js` |
| `public/examples/THREEJS_ANIMEJS/Theater_Example.html:90` | `js/main.js?v=10` |
| `public/examples/games/chess-auth.html:14` | `/public/examples/games/chess.html` |
| `public/examples/games/go-auth.html:242` | `/public/examples/games/go.html` |
| `public/examples/games/go-auth.html:245` | `/public/config/zitadel-config.js` |
| `public/examples/games/go-auth.html:246` | `/public/js/auth/zitadel-auth.js` |
| `public/js/PWAManager.js:8` | `/public/config/pwa-config.json` |
| `public/js/ViewManager.js:20` | `/public/config/app-views.json` |
| `public/sw-clm.js:201` | `/public/icons/icon-192x192.png` |
| `public/sw-clm.js:202` | `/public/icons/badge-72x72.png` |
| `public/sw.js:12` | `/public/manifest.json` |
| `public/sw.js:19` | `/public/css/mcard-manager.css` |
| `public/sw.js:20` | `/public/css/content-renderers.css` |
| `public/sw.js:21` | `/public/js/app-bootstrap.js` |
| `public/sw.js:22` | `/public/js/mcard/MCardManager.js` |
| `public/sw.js:23` | `/public/js/mcard/UIComponents.js` |
| `public/sw.js:24` | `/public/js/renderers/MarkdownRenderer.js` |
| `public/sw.js:25` | `/public/vendor/lucide/lucide.min.js` |
| `public/sw.js:26` | `/public/vendor/js-yaml.min.js` |
| `public/sw.js:27` | `/public/js/performance-monitor.js` |
| `responsive-lab.html:12` | `/public/css/semantic-tokens.css` |
| `responsive-lab.html:1133` | `./js/device-registry.js` |
| `responsive-lab.html:1134` | `./js/harness/viewport-stage.js` |
| `responsive-lab.html:1135` | `./js/harness/target-membrane.js` |
| `responsive-lab.html:1136` | `./js/harness/lab-toolbar.js` |
| `responsive-lab.html:1137` | `./js/harness/device-presets-ui.js` |
| `responsive-lab.html:1138` | `./js/harness/lab-api.js` |
| `responsive-lab.html:1139` | `./js/harness/membrane-interceptor.js` |
| `responsive-lab.html:1140` | `./js/harness/recorder.js` |
| `responsive-lab.html:1141` | `./js/harness/recording-ribbon.js` |
| `responsive-lab.html:1142` | `./js/harness/fidelity.js` |
| `responsive-lab.html:1143` | `./js/harness/conformance-panel.js` |
| `sprint-registry.html:7` | `/public/css/tokens.css` |
| `sprint-registry.html:8` | `/public/css/semantic-tokens.css` |
| `sw.js:12` | `/public/manifest.json` |
| `sw.js:18` | `/public/css/mcard-manager.css` |
| `sw.js:19` | `/public/css/content-renderers.css` |
| `sw.js:20` | `/public/js/app-bootstrap.js` |
| `sw.js:21` | `/public/js/mcard/MCardManager.js` |
| `sw.js:22` | `/public/js/mcard/CardViewer.js` |
| `sw.js:23` | `/public/js/mcard/UIComponents.js` |
| `sw.js:24` | `/public/js/renderers/MarkdownRenderer.js` |
| `sw.js:25` | `/public/js/renderers/ImageRenderer.js` |
| `sw.js:26` | `/public/js/performance-monitor.js` |
| `sw.js:27` | `/js/vendor/mcard-js.bundle.js` |
| `sw.js:28` | `/public/js/vendor/mcard-js.bundle.js` |
| `sw.js:30` | `/public/vendor/lucide/lucide.min.js` |
| `sw.js:31` | `/public/vendor/js-yaml.min.js` |

## 7. Service Worker Scopes and Cache Hazards

| File | Lines | Registration caller | Scope | Astro migration hazard |
| --- | --- | --- | --- | --- |
| `public/sw.js` | 341 | `public/js/PWAManager.js:77` (`register("/sw.js")`) | `/` | Served at `/sw.js` ahead of root `sw.js` due to `ws-server.js:136`. Calls `clients.claim()` (`public/sw.js:102`) and precaches `/public/js/mcard/MCardManager.js` and `/public/js/renderers/MarkdownRenderer.js` (`APP_SHELL_ASSETS`), both missing on disk. |
| `sw.js` | 357 | Shadowed at `/sw.js` by `public/sw.js` | `/` (unreachable under current mount order) | Duplicate service worker at repo root with stale `APP_SHELL_ASSETS` paths (`/public/js/mcard/MCardManager.js`, `/public/js/renderers/MarkdownRenderer.js`). |
| `public/sw-clm.js` | 139 | None (zero runtime `register()` callers) | Unregistered (`/public/sw-clm.js` or `/sw-clm.js`) | Uses `pkc-clm-*` cache namespace and `clients.claim()` (`public/sw-clm.js:59`) if ever registered. |

`GQC-02B` must guard local dev and Playwright runs against stale `/sw.js` registrations hijacking Astro module requests.

## 8. `ws-server.js` Mount Order and Middleware Hazards

| Location | Current behavior | Migration hazard for `GQC-02B` |
| --- | --- | --- |
| `ws-server.js:76` | Mounts `/api/test-runs` with `express.json({ limit: "2mb" })`. | Keep before any catch-all Astro handler so MCard test-run persistence preserves its 2 MB body limit. |
| `ws-server.js:80-81` | Mounts global `app.use(express.json())` and `app.use(express.urlencoded({ extended: true }))` on all paths. | Consumes `req` body streams globally before downstream middleware; mounting `@astrojs/node` SSR handler after line 81 breaks Astro `POST` body reads unless body parsers are route-scoped. |
| `ws-server.js:86-90` | Forces `Cache-Control: no-cache, no-store, must-revalidate` on `.html`, `.js`, and `.css`. | Prevents browser HTTP caching on warm loads (confirmed in Section 9 where warm JS wire bytes equal cold JS wire bytes) and would override Astro hashed-asset caching under `/_astro/*` if left unscoped. |
| `ws-server.js:116-120` | Mounts `/api/mcard`, `/api/auth`, and `/api/clm`. | API routes must remain ahead of static and Astro page middleware. |
| `ws-server.js:134` | `app.use("/public", express.static(path.join(__dirname, "public")))`. | Required by all `/public/...` callers inventoried in Section 6 unless rewritten. |
| `ws-server.js:136` | `app.use(express.static(path.join(__dirname, "public")))`. | Shadows root files of the same name (notably `/sw.js` -> `public/sw.js`). |
| `ws-server.js:138` | `app.use(express.static(__dirname))`. | Exposes the entire repo root over HTTP and serves static `app-config.json` before the dynamic `app.get("/app-config.json")` route at `ws-server.js:367`. |
| `ws-server.js:367` | `app.get("/app-config.json", ...)` dynamic WebSocket config endpoint. | Dead route under normal operation because `ws-server.js:138` serves root `app-config.json` (`labTargets` schema) first. |
| `ws-server.js:383` | Second `app.use(express.static(__dirname))` mount after API routes. | Redundant duplicate of line 138. |
| `ws-server.js:393-395` | `isDirectRun` compares `fileURLToPath(import.meta.url)` to `path.resolve(process.argv[1])` without `fs.realpathSync`. | Fails silently when launched through symlinked paths such as `/tmp` -> `/private/tmp` on macOS while keeping a 5-second `setInterval` (`ws-server.js:389`) alive. |
| `routes/clm.js:142` | `PROGRAMS_ROOT = path.join(__dirname, "..", "..", "docs", "sprints", "programs")`. | Escapes the `LandingPage` git root into the parent monorepo folder (`MCard_TDD/docs/sprints/programs`), returning HTTP 404 in standalone `LandingPage` checkouts or if `__dirname` depth changes under `dist/server/`. |

## 9. Pre-Astro Performance and JavaScript Byte Baseline

Raw sample arrays, CDP script counters, and live lane verdicts are archived at `/tmp/swarm-PR-GQC-00/perf-baseline.json`.

### Measurement Environment and Protocol

- **Machine and OS.** `Apple M4 Max` (16 logical cores), `darwin 25.6.0 (arm64)`, 1m/5m/15m load average `9.93 / 6.78 / 4.79`.
- **Runtime and browser.** Node `v24.21.0`, `Chromium (Playwright headless) 153.0.8010.12`, viewport `1280x800`.
- **Dataset and server parity.** Checkpointed SQLite `mcard-api.db` with `50` cards and `47` handles (identical SHA-256 `6c1684967f64ca6a8854839de21fddd33c0ef0223fdbd80ff8ac5c8d55efbed2` on both trunk `843cf65` and head `c658f40`).
- **Cache modes.** Cold runs use a fresh `browser.newContext()` per navigation. Warm runs perform a second navigation in the same primed `BrowserContext` immediately after cold load.
- **Target-SPA baseline note.** No deterministic target-SPA baseline exists in `GQC-00` because `tests/fixtures/spa-test-target.html` is created in `SPRINT-GQC-02`. `app.html` remains unclassified (`undecided`) and is not used as a target-SPA substitute.
- **Budget enforcement status.** Route navigation and frame-budget thresholds remain advisory (`non-blocking`) until TEA and the Product Manager approve blocking thresholds in `SPRINT-GQC-06`.

### Paired Interleaved Cold Baseline (`trunk 843cf65` vs `head`, 10 runs per side)

**Verdict.** No measurable difference between `trunk` (`843cf65`) and `head` (`PR-GQC-00` modifies zero production runtime files). Run-to-run ranges overlap completely and error counts are zero on both sides.

| Route | Side | Runs | `readyMs` p50 | `readyMs` p75 | `readyMs` min..max (spread) | `loadMs` p50 | Top-frame JS wire bytes | Total page JS wire bytes | HTTP + page errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/responsive-lab.html` | `trunk` | 10 | 180.48 ms | 227.82 ms | 158.56..283.84 ms (125.28 ms) | 397.15 ms | 126373 B | 656355 B | 0 |
| `/responsive-lab.html` | `head` | 10 | 219.98 ms | 246.16 ms | 160.17..329.02 ms (168.85 ms) | 407.59 ms | 126373 B | 656355 B | 0 |
| `/index.html?noredirect=1` | `trunk` | 10 | 55.68 ms | 57.02 ms | 49.11..59.55 ms (10.44 ms) | 55.77 ms | 695920 B | 695920 B | 0 |
| `/index.html?noredirect=1` | `head` | 10 | 56.5 ms | 58.26 ms | 54.82..60.25 ms (5.43 ms) | 56.6 ms | 695920 B | 695920 B | 0 |

### Limiter Attribution (`benchmark-checklist` Verification)

- Direct loopback server timing on `GET /api/mcard/landing` measured `0.66 ms` median (5.43, 1.12, 0.66, 0.54, 0.53 ms across 5 probes), ruling out SQLite or Express CPU saturation.
- On `/responsive-lab.html`, cold `readyMs` (`180.48 ms` trunk p50, `219.98 ms` head p50, overlapping `158.56..329.02 ms` range) is bounded by fresh Chromium renderer initialization, 19 top-frame unbundled ES module requests (`126,373 B`) plus 17 child-iframe ES module requests from default `app.html` (`529,982 B`, `656,355 B` total JS), and 3 external Google Fonts stylesheet/font requests (`41,452 B` over WAN). Warm context reuse drops `/responsive-lab.html` `readyMs` p50 to `83.58 ms` by eliminating cold TLS/DNS setup to `fonts.googleapis.com` and reusing compiled V8 script isolates.
- On `/index.html?noredirect=1`, cold `readyMs` (`55.68 ms` trunk p50, `56.50 ms` head p50) is bounded by parsing and executing `695,920 B` across 15 local JS files (`vendor/lucide`, `landing-page-mcard.js`, renderer bundles) plus two non-blocking background Faro telemetry `POST http://localhost:12347/collect` connection refusals when no local collector runs.
- Across all Places, warm JS wire bytes equal cold JS wire bytes because `ws-server.js:86-90` sends `Cache-Control: no-cache, no-store, must-revalidate` on every `.js` response.

### Cold and Warm Baselines Across Root Candidate Places (5 runs per Place per cache mode)

| Candidate Place ID | Route | Cold `readyMs` p50 (min..max) | Warm `readyMs` p50 (min..max) | Cold `loadMs` p50 | Top-frame JS wire bytes (reqs) | Top-frame decoded JS bytes | Total page JS wire bytes (reqs) | Warm total JS wire bytes | HTTP + page errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `p_wb_responsive_lab` | `/responsive-lab.html` | 187.4 ms (154.82..240.42) | 83.58 ms (81.77..96.56) | 410.64 ms | 126373 B (19) | 112756 B | 656355 B (36) | 640884 B | 0 |
| `p_wb_index_redirect` | `/index.html` | 168.25 ms (153.17..237.94) | 86.08 ms (85.44..99.77) | 329.42 ms | 126373 B (19) | 112756 B | 656355 B (36) | 644302 B | 0 |
| `p_wb_index_portal` | `/index.html?noredirect=1` | 56.61 ms (55.26..59.88) | 54.49 ms (51.53..56.96) | 56.71 ms | 695920 B (15) | 685153 B | 695920 B (15) | 695920 B | 0 |
| `p_wb_mission_control` | `/app.html` | 57.15 ms (56.36..58.95) | 55.72 ms (54.67..56.02) | 57.22 ms | 529982 B (17) | 517889 B | 529982 B (17) | 514511 B | 0 |
| `p_wb_fiber_conformance` | `/fiber-conformance.html` | 19.63 ms (17.63..21.69) | 17.74 ms (17.2..18.45) | 19.71 ms | 48572 B (7) | 43554 B | 48572 B (7) | 48572 B | 0 |
| `p_wb_fiber_inspector` | `/fiber-inspector.html` | 24.06 ms (23.52..25.91) | 23.34 ms (22.8..24.9) | 24.14 ms | 78924 B (21) | 63882 B | 78924 B (21) | 78924 B | 0 |
| `p_wb_sprint_registry` | `/sprint-registry.html` | 35.7 ms (35.37..37.46) | 34.4 ms (34.18..37.32) | 35.8 ms | 0 B (0) | 0 B | 0 B (0) | 0 B | 0 |
| `p_wb_pkc_docs_index` | `/pkc-docs-index.html` | 22.64 ms (22.57..23.12) | 21.74 ms (21.34..22.38) | 22.72 ms | 0 B (0) | 0 B | 0 B (0) | 0 B | 0 |
