# Program SSG pre-program spike findings

| Field | Value |
| --- | --- |
| Audience | Scrum masters, UX designers, architects, developers, and TEA engineers |
| BMAD Owner | Product Manager, Architect, UX Designer, and Developer |
| Source of Truth | [`../ssg-plan.md`](../ssg-plan.md), [`../DECISIONS.tsv`](../DECISIONS.tsv), [`../../../../tools/stageshow/UPSTREAM.json`](../../../../tools/stageshow/UPSTREAM.json), and [`../../../../scripts/stageshow/run.mjs`](../../../../scripts/stageshow/run.mjs) |
| Consensus Kernel | `clm-kernel@0.0.23` |
| Spike Date | `2026-11-19` |

## Upstream StageShow installation

StageShow `1.1.1` from `benjitaylor/skills` (commit `299140fafd08df55a9c234e610c3f64af3f45531`, MIT license) was installed into `LandingPage` under two non-workspace locations outside `npm` publish sweeps and `docs:check` scans.

| Location | Contents | Verification role |
| --- | --- | --- |
| [`.agents/skills/stageshow/`](../../../../.agents/skills/stageshow/SKILL.md) | `SKILL.md`, `LICENSE`, `NOTICE.md`, `README.md`, and `15` reference files (`craft.md`, `framing.md`, `kit.md`, `looks.md`, `motion.md`, `rehearse.md`, `verify.md`, etc.) | Supplies agent craft, framing, choreography, and rehearsal rubrics during UI sprints |
| [`tools/stageshow/`](../../../../tools/stageshow/UPSTREAM.json) | Upstream `kit/` (`Stage`, `Window`, fixed-screen portrait `Phone`), `examples/`, `teaching/`, `playground/`, `references/`, `scripts/`, and `UPSTREAM.json` | Supplies visual chrome tokens, `playground/viewer.tsx` reference layout, and `layout.mjs`, `film.mjs`, `jumps.mjs`, and `class-clash.mjs` scripts |
| [`scripts/stageshow/run.mjs`](../../../../scripts/stageshow/run.mjs) | Hermetic server lifecycle runner for `layout`, `sweep`, `film`, `jumps`, and `check-css` | Refuses `data/mcard-api.db`, binds ephemeral ports, and resolves Playwright Chromium when Chrome is absent |
| [`tests/unit/stageshow-install.test.mjs`](../../../../tests/unit/stageshow-install.test.mjs) | `node:test` verification suite (`5` tests) | Locks pinned SHA, skill mirror parity, kit/script presence, and `check-css` execution |

Verified commands recorded during spike and baseline verification follow.

- `[Observed-CLI]` `node --test tests/unit/stageshow-install.test.mjs` passed (`5` of `5` tests).
- `[Observed-CLI]` `npm run test:unit` passed on `2026-11-19` (`281` tests across `19` top-level Node test suites and `40` test files under `tests/unit/**/*.test.*`, `tests/observability/**/*.test.*`, and `tests/single-page-mcard.test.mjs`, `281` pass, `0` fail).
- `[Observed-CLI]` `npm run stageshow:check-css` exited `0` (`class clash: no overlapping class namespaces detected (83 CSS files, 2 explicit bundles); composed scopes need host-page review`).
- `[Observed-CLI]` `npm run stageshow:sweep` captured `24` Chromium snapshots (`6` routes across `1440px`, `820px`, `390px`, and `358px`) in `stageshow-output/sweep-2026-11-18T17-11-39-678Z/summary.json`.

## StageShow sweep baseline (`2026-11-18T17-11-39-678Z`)

The table below records exact counts measured by `npm run stageshow:sweep` (`[Observed-CLI]`) paired with visual inspection of generated PNG captures (`[Observed-PNG]`).

| Route | Width (px) | Status | Controls checked | Containers checked | Findings | Errors | Measured observation |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| `/responsive-lab.html` | `1440` | `no-issues-detected` | `32` | `3` | `0` | `0` | Side-by-side desktop baseline renders all `32` controls inside viewport |
| `/responsive-lab.html` | `820` | `no-issues-detected` | `32` | `3` | `0` | `0` | `.viewport-frame-bar` wraps `"Responsive Iframe Surface"` into 3 stacked lines and clips dim pill top |
| `/responsive-lab.html` | `390` | `no-issues-detected` | `30` | `2` | `0` | `0` | `2` header controls clip off right edge while stage shrinks to `12px` inner width |
| `/responsive-lab.html` | `358` | `no-issues-detected` | `30` | `2` | `0` | `0` | `2` header controls (`#btn-nav-mission-control`, `#mission-control-popout-btn`) leave viewport and footer wraps into 3 colliding lines |
| `/index.html?noredirect=1` | `1440` | `inconclusive` | `4` | `2` | `0` | `1` | `GET /api/mcard/landing` returns `404` on unseeded ephemeral DB |
| `/index.html?noredirect=1` | `820` | `inconclusive` | `4` | `2` | `0` | `1` | Same `404` on unseeded `/api/mcard/landing` plus `min-height: 1180px` dead space |
| `/index.html?noredirect=1` | `390` | `inconclusive` | `4` | `2` | `0` | `1` | `.top-controls` pushes `#faro-status-badge` left of `0px` and overlaps `<h1>` |
| `/index.html?noredirect=1` | `358` | `inconclusive` | `4` | `2` | `0` | `1` | Direct PNG check shows `.top-controls` covering `<h1>GovTech OS</h1>` and empty band above footer |
| `/sprint-registry.html` | `1440` | `no-issues-detected` | `0` | `16` | `0` | `0` | `3`-column card grid fits inside `1200px` container |
| `/sprint-registry.html` | `820` | `no-issues-detected` | `0` | `11` | `0` | `0` | `2`-column grid fits inside tablet width |
| `/sprint-registry.html` | `390` | `no-issues-detected` | `0` | `6` | `0` | `0` | `minmax(360px, 1fr)` plus `48px` horizontal body padding totals `408px`, overflowing viewport |
| `/sprint-registry.html` | `358` | `no-issues-detected` | `0` | `6` | `0` | `0` | Direct PNG check shows right card edge (`SEALED`, `Type`) sliced past viewport edge |
| `/fiber-inspector.html` | `1440` | `no-issues-detected` | `0` | `1` | `0` | `0` | Tables span full `1408px` width with no container cap |
| `/fiber-inspector.html` | `820` | `no-issues-detected` | `0` | `1` | `0` | `0` | Tables fit within tablet viewport |
| `/fiber-inspector.html` | `390` | `no-issues-detected` | `0` | `1` | `0` | `0` | `5`-column and `6`-column tables exceed `390px` viewport without horizontal wrapper |
| `/fiber-inspector.html` | `358` | `no-issues-detected` | `0` | `1` | `0` | `0` | Wide tables force horizontal overflow |
| `/fiber-conformance.html` | `1440` | `no-issues-detected` | `0` | `1` | `0` | `0` | Static `#harness` box; frozen under Darwin visual snapshot contract |
| `/fiber-conformance.html` | `820` | `no-issues-detected` | `0` | `1` | `0` | `0` | Static `#harness` box |
| `/fiber-conformance.html` | `390` | `no-issues-detected` | `0` | `1` | `0` | `0` | Static `#harness` box |
| `/fiber-conformance.html` | `358` | `no-issues-detected` | `0` | `1` | `0` | `0` | Static `#harness` box |
| `/app.html` | `1440` | `no-issues-detected` | `4` | `5` | `0` | `0` | Legacy 3-column MCard Manager layout fits |
| `/app.html` | `820` | `no-issues-detected` | `4` | `5` | `0` | `0` | Fixed `250px + 350px` columns leave `220px` for `300px`-min viewer header |
| `/app.html` | `390` | `no-issues-detected` | `4` | `2` | `0` | `0` | Mobile single-pane rule activates, though `.header-btn span` rule matches no bare text nodes |
| `/app.html` | `358` | `no-issues-detected` | `4` | `2` | `0` | `0` | Same header button label mismatch |

The baseline sweep exposed two measurement gaps (`[Observed-Source]`). First, `layout.mjs` skips elements clipped outside `innerWidth` (explaining `32` controls dropping to `30` on `/responsive-lab.html`) and does not check root `scrollWidth > innerWidth`, so Program SSG adds bidirectional Playwright bounds and `scrollWidth` verification inside both `run.mjs` and `tests/features/host-responsive-tiers.spec.js`. Second, `GET /api/mcard/landing` in `server/mcard-api.mjs:338` resolves `urn:mcard:content:landing_page`, returning `404` on a fresh database until seeded via `PUT /api/mcard/landing`.

## Audit findings on device catalogs, orientations, and modes (`[Observed-Source]`)

1. **Four drifting device catalogs.** `BUILTIN_DEVICES` in `js/device-registry.js:54-178` defines `8` presets with `'wearable'` empty despite UI filter option presence in `src/pages/responsive-lab.astro:187-193`. `mcard.yaml:72-80` and `public/conformance/harness-data.json:2007-2055` define `5` different `type_lattice.form_factors` (`375x667`, `430x932`, `768x1024`, `1440x900`, `2560x1080`) where only `375x667` matches `BUILTIN_DEVICES`. `src/islands/SpaTestWorkflow.jsx:361-378` hardcodes only `2` preset buttons (`iphone-16-pro`, `ipad-air-11`). Custom geometry (`js/harness/viewport-stage.js:209-217`) and `Full (100%)` set `deviceId: null`, causing `InteractionRecorder.buildTestRun` (`js/harness/recorder.js:231-243`) to record `desktop-fhd` (`1920x1080`), `js/harness/spa-test-workflow.js:646` to label Custom geometry as `Full (100%)`, and `js/harness/conformance-panel.js:13-17` to stay in `Standby`.
2. **Split-brain orientation state and axis inversion.** `js/harness/viewport-stage.js:50-73` stores mutable `internalOrientation` (`'horizontal' | 'vertical'`, booting `'horizontal'`) while `js/harness/viewport-geometry.js:54-56` computes `deriveOrientation(w, h)` (`'landscape' | 'portrait'`). Because `100 > 100` is `false`, `Full (100%)` boots with the stage bar and footer showing `Horizontal (Landscape)` while `SpaTestWorkflow` and `InteractionRecorder` compute `portrait`, and clicking rotate swaps `100` with `100` without changing geometry. Furthermore, `js/harness/device-presets-ui.js:77-80`, `js/harness/lab-runtime.js:190-194`, and `js/harness/spa-test-workflow.js:834-839` apply presets by checking `internalOrientation === 'horizontal'` and unconditionally swapping `(device.width, device.height)` instead of reading `device.defaultOrientation`, opening `MacBook Air 13"` (`1280x832`) and `Desktop 1080p` (`1920x1080`) sideways at `832x1280` and `1080x1920` on boot.
3. **Stage frame steals `38px` of iframe height and flattens device affordances.** `public/css/responsive-lab.css:521-582` sizes `.viewport-frame` with `border-box` at exact target dimensions and places a `36px` `.viewport-frame-bar` plus `2px` border inside the box above `#mission-control-iframe`, shrinking `iPhone 16 Pro` (`393x852`) to `391x814`. Phones, tablets, desktops, and `Full (100%)` all render the same macOS traffic-light title bar without safe-area overlays or phone silhouettes, and `Scale: actual` (`Fit: 100%`) clips inside `.lab-stage-container { overflow: hidden }` (`public/css/responsive-lab.css:516`).
4. **Heavy chrome duplication, emoji icon clutter, and missing Bombadil dashboard controls.** Viewport dimensions, orientation, and scale appear in `5` simultaneous locations (`DevicePresetsIsland`, `#spa-workflow-status`, `SpaTestWorkflow` Step 2, `#controlled-frame-dim`, `#controlled-panel-status`). Target URL and policy state appear in `4` places, active `Place` ID in `4` places, and recorder state in `3` places. Controls in `js/harness/viewport-stage.js`, `js/harness/spa-test-workflow.js`, `src/islands/*.jsx`, `src/pages/responsive-lab.astro`, `tests/fixtures/app-fixtures.js`, `tests/features/presentation-lattice.spec.js`, and `scripts/penpot-render.mjs` mix platform emojis and dingbats instead of uniform `14px` and `16px` SVGs, `ConformancePanelIsland` fires duplicate `/api/test-runs/conformance/latest` requests (`src/islands/ConformancePanelIsland.jsx:30-31` and `js/harness/conformance-panel.js:91-94`), and Bombadil property suites (`spa`, `lab-smoke`, `page-load`, `workbench`, `canary`) exist only as CLI scripts without dashboard UI or Triad event-triggering handles.
5. **CSS duplication and broken tokens.** `public/css/tokens.css` defines `--color-border-hover` `7` times across `:root` (`14, 57`), `[data-theme="light"]` (`157, 194`), `[data-theme="high-contrast"]` (`244, 278`), and `@media (prefers-color-scheme: light)` (`369`). `public/css/semantic-tokens.css:1222-1400` (`179` lines) duplicates unused `.desktop-split-*` / `.controlled-*` rules alongside live `.size-preset-btn` rules (`DevicePresetsIsland.jsx:77,88`). `src/pages/sprint-registry.astro:10-18` reads nonexistent `--color-background-primary`, `--color-badge-valid-*`, and `--color-badge-draft-*` variables.

## StageShow craft lessons mapped from external StudyNotes

Based on external operator study notes (`StudyNotes/Hub/Tech/Stageshow - Design Judgment Encoded as a Skill.md` outside this repository), [`../../../../tools/stageshow/SKILL.md`](../../../../tools/stageshow/SKILL.md), [`../../../../tools/stageshow/playground/viewer.tsx`](../../../../tools/stageshow/playground/viewer.tsx), [`../../../../tools/stageshow/references/kit.md`](../../../../tools/stageshow/references/kit.md), [`../../../../tools/stageshow/references/motion.md`](../../../../tools/stageshow/references/motion.md), and [`../../../../tools/stageshow/references/craft.md`](../../../../tools/stageshow/references/craft.md), Program SSG separates **transferable craft** from StageShow's **house style**.

| Category | Principles and rules | Application in Program SSG |
| --- | --- | --- |
| **Transferable craft** | Playground-style `(toolbar + well + transport)` geometry, one hero stage, `1:1` inner device pixels, parametric bezels outside content, `5`-surface depth tokens, single-stroke SVG icon set, "Say it once" restraint, `compact` as a `358px` redesign, and `layout.mjs` / `film.mjs --gate` checks | Governs `responsive-lab.astro`, `BombadilDashboardIsland`, `index.astro?noredirect=1`, `sprint-registry.astro`, `fiber-inspector.astro`, `app.astro`, and `public/css/` across `1440px`, `820px`, `390px`, and `358px` |
| **StageShow house style** | Warm gray filler `Bar` placeholders, `3` to `7` word budgets, scripted `Act` cursor loops, cropped edges, and satellite cards | Confined strictly to compiled `public/stageshow/` product showcase mounted with a static HTML poster on `index.astro?noredirect=1`, leaving operational text and controls intact across the workbench |

## Hard repository gates governing the sprints (`[Observed-Source]`)

- **`npm run docs:check`** scans all `*.md` files under root, `docs/`, and `tests/`, forbidding workstation home-directory paths, file URIs, broken or repo-escaping links, unregistered `npm run` scripts in living docs, undeclared Playwright projects, and unknown `p_*` / `t_*` net IDs.
- **`npm run check:explorable-gui`** requires `data-testid` on all interactive controls in `src/islands/` and `src/pages/*.astro` (except `app.astro`), forbids native `alert`/`confirm`/`prompt`, and validates `data-effect` attributes.
- **`npm run check:net`, `npm run build` (`gqc-net-parity`), and `npm run check:bombadil-nets`** require all pages, links, endpoints, and trigger substrings in `src/net/workbench-net.yaml` and `tests/bombadil/scope.json` to stay synchronized.
- **`node scripts/check-package-source-parity.mjs`** enforces SHA-256 locks on `ws-server.js`, `room-registry.mjs`, `js/pkc-core.js`, and package sources plus declared UI `fetch()` endpoints (`src/` and `js/harness/`).
- **`tests/features/layout-freeze.spec.js`** asserts `<= 0.5px` DOM bounding-box parity across `6` pages and `5` viewports against parent-repository `../docs/sprints/programs/sty/style/layout-baseline.json` unless re-captured with `STY_FREEZE=capture` and a `rebaselines` entry.
- **`tests/features/responsive-lab-islands.spec.js` and `tests/performance/place-bytes.mjs`** enforce named Astro island file and DOM counts on `responsive-lab.html` (`0` `clm-kernel` bytes in `_astro/`) and `0` `<astro-island>` tags on `astro-wrapped` pages.
- **`tests/features/fiber-conformance.spec.js` and `tests/single-page-mcard.test.mjs`** freeze `fiber-conformance.html#harness` PNG baselines and cap `js/landing-page-mcard.js` at `250` lines (`243` today).
