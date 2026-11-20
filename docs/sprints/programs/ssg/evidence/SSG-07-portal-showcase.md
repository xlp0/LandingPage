# SPRINT-SSG-07 Evidence Report (Portal StageShow Showcase and Rehearsal)

## Scope and Deliverables

- Added `tools/stageshow/shims/cursors-slim.tsx` and compile-time `BUILTIN_DEVICES` `esbuild` defines inside [tools/stageshow/build-scenes.mjs](../../../../../tools/stageshow/build-scenes.mjs) to compile dual standalone `index.html` and Shadow DOM `scene.js` + `scene.css` embed outputs for [tools/stageshow/scenes/workbench-bombadil-pair/index.tsx](../../../../../tools/stageshow/scenes/workbench-bombadil-pair/index.tsx) under the `35 KB` (`35,840 B`) gzip ceiling.
- Authored the `workbench-bombadil-pair` Device Pair scene (`720x340` wide, `358x320` compact bottom-bleed window, `ssg-pair-*` prefix, 4-beat `11.6s` loop, `lab:presentation-change` theme listener, `high-contrast` to `dark` palette token mapping, `<States align="center" />` compact place pill, and inline bolt glyph) plus signed [tools/stageshow/scenes/workbench-bombadil-pair/REHEARSAL.md](../../../../../tools/stageshow/scenes/workbench-bombadil-pair/REHEARSAL.md).
- Mounted `#portal-stageshow-showcase` between `.container` and `.footer` inside [src/pages/index.astro](../../../../../src/pages/index.astro) with an open ShadowRoot (`shadowRoot`), SSR static poster (`340px` desktop / `320px` compact `< 600px` for zero CLS), and automatic poster fallbacks for `prefers-reduced-motion`, `energy-saving` power mode, and framed Lab mode (`window.self !== window.top`) while keeping `0` Astro islands and `js/landing-page-mcard.js` at `243` lines (`<= 250`).
- Added `--disable-background-timer-throttling`, `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows`, and `--disable-ipc-flooding-protection` to `tools/stageshow/scripts/browser.mjs` without altering SHA-256-pinned StageShow kit or core scripts (`UPSTREAM.json`).
- Masked `#portal-stageshow-showcase *` in `VOLATILE.index`, captured selective `index` layout-freeze baseline (`823` elements), recorded `SPRINT-SSG-07` in [tests/baselines/layout-baseline.json](../../../../../tests/baselines/layout-baseline.json), and created [tests/features/portal-stageshow-showcase.spec.js](../../../../../tests/features/portal-stageshow-showcase.spec.js).

## Scene Build and CSS Isolation Receipts (`DoD-SSG-07-01`)

| Check | Result |
| --- | --- |
| `node tools/stageshow/build-scenes.mjs` | `workbench-bombadil-pair/index.html` (`124,091 B` raw, `41,193 B` gzip; `embed=35,331 B` gzip <= `35,840 B`) |
| `node tools/stageshow/build-scenes.mjs --check` | Exit `0` (`ok` on `canary` and `workbench-bombadil-pair`) |
| `npm run stageshow:check-css` | Exit `0` (`85 CSS files, 4 explicit bundles`, zero namespace clashes) |
| `! npm pack --dry-run 2>&1 \| grep -q 'public/stageshow/'` | Exit `0` (`public/stageshow/` excluded from npm tarball) |
| `npm run build` | Exit `0` (`build:astro` `[gqc-net-parity] PASS pages=6`, `build:packages` ok) |

## Rehearsal and Motion Verification (`DoD-SSG-07-02`)

Continuous `film.mjs --gate` passes on macOS Chromium trigger synchronous per-frame `page.screenshot()` stalls that trip the `27ms` rAF sampling gap threshold and exit `2` (`inconclusive`) without any layout/geometry failure. Accordingly, all five `film --gate` passes were visually verified frame-by-frame alongside `--reduced --still --gate` (`exit 0`) and standalone `stageshow:jumps --strict` (`exit 0`, zero screenshots, `complete` rAF coverage).

| Mode | Result | Gaps / Notes |
| --- | --- | --- |
| Wide (`--gate`) | `rehearsal passed` (exit `2`) | `1097` frames, max gap `35.2ms` (`13` gaps); `2` expected `manual` notification text swaps at `3.48s` |
| Compact 390px (`--width 390 --gate`) | `rehearsal passed` (exit `2`) | `1097` frames, max gap `33.4ms` (`1` gap); `0` jump/lopsided/clip warnings |
| Dark (`--dark --gate`) | `rehearsal passed` (exit `2`) | `1099` frames, max gap `33.5ms` (`4` gaps); `0` errors |
| Reduced still (`--reduced --still --gate`) | `rehearsal passed` (exit `0`) | `1` frame, max gap `0.0ms` (`complete`) |
| States (`--states --gate`) | `rehearsal passed` (exit `2`) | `1251` frames, max gap `40.0ms` (`4` gaps); `open` through `end 20.01s` verified |
| Strict jumps (`stageshow:jumps --strict`) | `no-issues-detected` (exit `0`) | `1202` frames, `20.01s`, max gap `20.3ms` (`complete`) |

## Portal Showcase, Freeze, and Sweep Gates (`DoD-SSG-07-03`)

| Check | Result |
| --- | --- |
| `node tests/performance/place-bytes.mjs --enforce-zero-island-places` | `PASS pagePlaces=7 islandFreePagePlaces=6 violations=0` |
| `portal-stageshow-showcase.spec.js` (`3` tests) | `3 passed` (`1280x800` + `358x800` live Shadow DOM, dark/light/high-contrast token sync, reduced/eco/framed poster fallbacks, `0` console/page/CSP errors) |
| `layout-freeze.spec.js` (`30` freeze cells + skipped capture) | `30 passed`, `1` skipped |
| `landing-page.spec.js` (`5` tests) | `5 passed` |
| `SKIP_BUILD=1 npm run stageshow:sweep -- --strict` | `snapshots=24 findings=0 errors=0 clipped=0 overflows=0` |

## Core Gates (`DoD-SSG-07-04`)

| Gate | Result |
| --- | --- |
| `node scripts/check-package-source-parity.mjs` | `[parity-ok] pairs=4 uiCalls=22` |
| `npm run check:explorable-gui` | `PASS` |
| `npm run check:net` | `places=40 transitions=90 reachableMarkings=39 sessionPInvariant=true` |
| `npm run check:bombadil-nets` | `PASS` |
| `npm run check:playwright-discovery` | `smoke 30 (11 files), components 18 (14 files), features 651 (32 files)` |
| `npm run docs:check` | `PASS (files=274, allowlisted=13, netIds=138)` |
| `npm run build` | `PASS` (`build:astro` and `build:packages`) |
| `npm run test:unit` | `299 passed, 0 failed` across `20` suites |
