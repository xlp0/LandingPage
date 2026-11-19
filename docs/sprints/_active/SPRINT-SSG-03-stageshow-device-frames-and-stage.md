# SPRINT-SSG-03 StageShow device frames and stage geometry

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SSG-03` |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SSG-03` |
| Status | `PLANNED` |
| Depends on | `SPRINT-SSG-02` |
| Unblocks | `SPRINT-SSG-05` |
| Execution unit | `PR-SSG-03` |
| Poteto playbook | `visual-parity` with `principle-experience-first` and `principle-prove-it-works` |
| BMAD roles | UX Designer, Architect, Developer, TEA |
| Effort | 3 days (guess) |

## Outcome

The Responsive UI Lab stage adopts StageShow's playground preview structure (`tools/stageshow/playground/viewer.tsx`) inside `<main id="lab-stage-container">` using direct sibling slots (`div.stage-toolbar`, `div.stage-well` wrapping `<ViewportStageIsland client:only="preact" />`, and `div.stage-transport` wrapping `<RecordingRibbonIsland client:load />` + `#bombadil-transport-pill`, with `.stage-well > astro-island, .stage-transport > astro-island { display: contents }`). Inside `.stage-well`, `LandingPage` renders `3` parameterized CSS frame archetypes spanning `6` `data-frame-style` values (`phone-ios`, `phone-android`, `tablet`, `browser-window` `38px` bar, `hairline-ruler`, `unframed`) strictly outside `box-sizing: content-box` `.stage-screen-slot` (`[data-testid="viewport-screen"]`) so `#mission-control-iframe` always measures exact `1:1` CSS layout pixels (`393x852` is `393x852`, never `391x814`), while outer preview scaling wraps `(inner + chromeInsets)` and `Scale: Actual (1:1)` enables `4`-corner scrolling via `margin: auto`.

## Work sequence

1. Restructure `<main id="lab-stage-container">`, `src/islands/ViewportStageIsland.jsx`, `src/pages/responsive-lab.astro`, and `public/css/responsive-lab.css` around StageShow `playground/viewer.tsx` anatomy (`tests/features/responsive-lab-islands.spec.js` verified green):
   - **Sibling DOM geometry (`.stage-well > astro-island, .stage-transport > astro-island { display: contents }`).** Keep `div.stage-toolbar`, `div.stage-well`, and `div.stage-transport` stacked inside `<main id="lab-stage-container">` via `.lab-workspace-container` (`flex: 1; min-height: 0`), preserving `data-target-place-id` and `nonce` on `#viewport-scale-wrapper`.
   - **`.stage-toolbar` (above `.stage-well`).** Hosts surviving `#stage-target-place`, `#controlled-frame-dim` (`tabular-nums`), `#btn-rotate-viewport` (`aria-label="Rotate (90°)"`, updating `tests/fixtures/app-fixtures.js:170`), quick `Scale: Fit | Actual (1:1)` (`#btn-scale-toggle`), and `Safe-area guides` toggle (`#btn-safe-area-toggle`, default `'off'`) so every `frameStyle` keeps metrics and `BPV-D08` mirror status visible outside the target iframe without stealing `1px` of viewport height.
   - **`.stage-well` (recessed `--lab-well` canvas, `8px` radius).** Hosts `#viewport-scale-wrapper` -> `.stage-scale-rig` -> `[data-testid="viewport-frame"]` (`#controlled-panel-frame` with `data-frame-style` and `data-inner-width`/`height`/`outer-scale`) -> `.stage-screen-slot` (`[data-testid="viewport-screen"]`, `box-sizing: content-box`) -> `.viewport-iframe-wrapper` -> `#mission-control-iframe`.
   - **`.stage-transport` (below `.stage-well`, bordered top hairline matching `.pg-transport`).** Hosts `<RecordingRibbonIsland client:load />` (`#lab-recording-ribbon`) permanently visible across all modes, freeing the top navbar of recording controls and preparing `#bombadil-transport-pill` integration in `SPRINT-SSG-05`.
2. Implement LandingPage parametric hardware bezels (`INV-SSG-GEOM`) parameterized in CSS across `3` geometric archetypes (`phone`, `tablet`, `window/unframed`), borrowing StageShow surface/chrome tokens (`window.tsx:54` `38px` bar and `hairline` variant; `phone.tsx` band/bezel proportions) without importing upstream fixed-size scaled `Phone`:

   | `data-frame-style` | Trigger condition | Chrome geometry outside `.stage-screen-slot` | Outer `chromeInsets` (`x, y` px) | Corner clip rule |
   | --- | --- | --- | --- | --- |
   | `phone-ios` | iOS phone presets (`iphone-16-pro`, `iphone-se`, `mobile-large` `430x932`) | `phone` archetype (`10px` bezel ring, `26px` outer radius) | `(20, 20)` | Iframe stays unclipped rectangle (`0px` inner clip) |
   | `phone-android` | Android phone presets (`pixel-8`, `galaxy-s24`) | `phone` archetype (`8px` bezel ring, `20px` outer radius) | `(16, 16)` | Iframe stays unclipped rectangle |
   | `tablet` | `tablet` presets (`ipad-air-11`, `ipad-mini`, `tablet-standard`) | `tablet` archetype (`14px` aluminum bezel, `22px` outer radius) | `(28, 28)` | Unclipped inner rectangle |
   | `browser-window` | `desktop` presets (`macbook-air-13`, `desktop-fhd`, `desktop-standard`, `desktop-ultrawide`) | `window` archetype (centered `38px` top StageShow bar, `12px` radius, `1px` ring) | `(2, 40)` | Unclipped inner rectangle |
   | `hairline-ruler` | `custom` dimensions (`w x h`, plus custom `wearable`) | `window` archetype (`20px` `hairline` top micro-ruler bar, `window.tsx:44` inspired) | `(2, 22)` | Unclipped inner rectangle |
   | `unframed` | `Full (100%)` | `window/unframed` (`0px` frame chrome, edge-to-edge `.stage-well` ground) | `(0, 0)` | Unclipped full container |

3. Render optional safe-area guide overlays (Dynamic Island / status bar / home indicator on `phone-ios`, rotating to left/right edge in `landscape`; `24dp` punch-hole on `phone-android`):
   - Default `data-safe-area="off"`, toggled by `#btn-safe-area-toggle` (`data-testid="btn-safe-area-toggle"`).
   - Always set `pointer-events: none` so clicks pass directly into `#mission-control-iframe`, and keep `safeAreaInsets` listed under `fidelity.notEmulated` (`js/harness/fidelity.js:31`).
4. Fix `computeScale` in `js/harness/viewport-geometry.js` and `Scale: Actual (1:1)` pan in `public/css/responsive-lab.css`:
   - Pass `(innerWidth + chromeInsets.x, innerHeight + chromeInsets.y)` into `computeScale` so outer bezel chrome never overflows `.stage-well` when scaled to fit.
   - Relabel `#btn-scale-toggle` to `Scale: Fit` (`'auto'`) versus `Scale: Actual (1:1)` (`'actual'`). When `'actual'`, remove `max-width: 100%; max-height: 100%` from `.viewport-scale-wrapper` and center `.stage-scale-rig` with `margin: auto` inside `.stage-well { display: flex; overflow: auto }` so **all `4` corners** (`(0,0)`, `(w,0)`, `(0,h)`, `(w,h)`) remain scroll-reachable on oversized targets.
5. Migrate `tests/features/presentation-lattice.spec.js` Test 11 (`#controlled-panel-frame` -> `#mission-control-iframe` `clientWidth`/`clientHeight`), `tests/features/responsive-rotation-and-devices.spec.js` (`RVP-T01` through `RVP-T11`), `tests/features/responsive-lab-islands.spec.js:350` (`toContainText('100%')`), `tests/features/explorable-gui.spec.js`, and `tests/fixtures/app-fixtures.js:170`, create `tests/features/stage-frame-geometry.spec.js`, selectively update `tests/baselines/layout-baseline.json` (`STY_FREEZE_PAGES=responsive-lab` with `rebaselines` attribution), and record `docs/sprints/_active/evidence/SSG-03-stage-frames.md` + [`./DECISIONS.tsv`](./DECISIONS.tsv).

## Files

- Edit `src/islands/ViewportStageIsland.jsx`, `src/islands/DevicePresetsIsland.jsx`, and `src/pages/responsive-lab.astro`
- Edit `js/harness/viewport-geometry.js`, `js/harness/viewport-stage.js`, `js/device-registry.js`, and `public/css/responsive-lab.css`
- Create `tests/features/stage-frame-geometry.spec.js`
- Edit `tests/fixtures/app-fixtures.js`, `tests/unit/viewport-geometry.test.mjs`, `tests/features/presentation-lattice.spec.js`, `tests/features/responsive-rotation-and-devices.spec.js`, `tests/features/responsive-lab-islands.spec.js`, `tests/features/explorable-gui.spec.js`, `tests/features/responsive-capture.spec.js`, and `tests/baselines/layout-baseline.json`
- Create `docs/sprints/_active/evidence/SSG-03-stage-frames.md` and append row to [`./DECISIONS.tsv`](./DECISIONS.tsv)

## BMAD responsibilities

### UX Designer

- Inspect rendered frames across `iPhone 16 Pro` (portrait/landscape + safe-area toggle), `mobile-large` (`430x932`), `Google Pixel 8`, `iPad Air 11"`, `MacBook Air 13"`, `Custom 500x500` (`hairline-ruler`), and `Full (100%)` against `tools/stageshow/references/craft.md`.

### Architect

- Confirm `INV-SSG-GEOM` invariant (`content-box` inner CSS px vs outer chrome scale), `#stage-target-place` `BPV-D08` mirror continuity (`data-target-place-id`, `nonce`), `.stage-well > astro-island, .stage-transport > astro-island { display: contents }`, and `pointer-events: none` click transparency.

### Developer

- Refactor stage markup into StageShow `.stage-toolbar` (with `#btn-rotate-viewport`), `.stage-well`, and `.stage-transport`, implement `3` CSS archetypes across `6` `data-frame-style` modes with inset-aware `computeScale`, and enable `4`-corner `margin: auto` scrolling.

### TEA

- Verify `#mission-control-iframe` `contentWindow.innerWidth`/`innerHeight` exact equality (`393x852`, `430x932`, `1280x832`, `360x780`, `500x500`), all `6` `data-frame-style` modes, safe-area click-through, `explorable-gui.spec.js`, and `4`-corner scroll reachability.

## Acceptance criteria

- Under `iPhone 16 Pro`, `mobile-large`, `Samsung Galaxy S24`, and `MacBook Air 13"`, `#mission-control-iframe` `clientWidth` and `clientHeight` (and inner `window.innerWidth`/`innerHeight`) equal exact selected pixels (`393x852`, `430x932`, `360x780`, `1280x832`), never reduced by top bar or borders.
- All `6` `data-frame-style` values (`phone-ios`, `phone-android`, `tablet`, `browser-window`, `hairline-ruler`, `unframed`) render with distinct outer geometry and keep `#stage-target-place`, `#btn-rotate-viewport`, and `#controlled-frame-dim` visible inside `.stage-toolbar`.
- Under `Scale: Actual (1:1)` with `Desktop 1080p` inside `1280x720`, scrollbars reach all `4` iframe corners `(0,0)`, `(1920,0)`, `(0,1080)`, and `(1920,1080)`.
- Enabling `#btn-safe-area-toggle` (`data-safe-area="on"`) leaves clicks directly under the iOS island/Android punch-hole reaching `#mission-control-iframe`.

## Test design

- `tests/features/stage-frame-geometry.spec.js` steps through `iPhone 16 Pro` (portrait & landscape), `mobile-large`, `Google Pixel 8`, `Samsung Galaxy S24`, `iPad Air 11"`, `MacBook Air 13"`, `Custom 500x500` (`hairline-ruler`), and `Full (100%)` (`unframed`), verifying `1:1` inner iframe dimensions, inset-aware outer scale fit, `pointer-events: none` safe-area click-through, and `4`-corner `1:1` pan.
- Unit checks in `tests/unit/viewport-geometry.test.mjs` verify `computeScale` with non-zero `chromeInsets` across all `6` `frameStyle` values.

## Non-goals

- Adding Bombadil dashboard runner endpoints (`SPRINT-SSG-04`) or 4-mode dock tabs/SVG icon migration (`SPRINT-SSG-05`).
- Narrow compact phone host layout below `600px` (`SPRINT-SSG-06`).

## Definition of done

- [ ] **DoD-SSG-03-01.** Inner iframe layout dimensions match selected viewport px (`393x852`, `430x932`, `360x780`, `1280x832`, `500x500`) across all `6` `data-frame-style` bezels with `4`-corner `Actual (1:1)` scroll reachability and click-through safe-area guides. Verified by `npx playwright test tests/features/stage-frame-geometry.spec.js --project=features`.
- [ ] **DoD-SSG-03-02.** StageShow layout check on Responsive UI Lab and updated island/rotation/capture/GUI/Test-11 Playwright checks pass. Verified by `npm run stageshow:layout -- /responsive-lab.html --strict && npx playwright test tests/features/presentation-lattice.spec.js tests/features/responsive-rotation-and-devices.spec.js tests/features/responsive-lab-islands.spec.js tests/features/responsive-capture.spec.js tests/features/explorable-gui.spec.js tests/features/layout-freeze.spec.js --project=features`.
- [ ] **DoD-SSG-03-03.** Evidence in `evidence/SSG-03-stage-frames.md` and `DECISIONS.tsv` row are recorded with all core gates green. Verified by `test -s docs/sprints/_active/evidence/SSG-03-stage-frames.md && grep -qE $'\tSSG-03\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run test:unit`.
