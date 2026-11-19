# SPRINT-SSG-06 Host responsive tiers and compact layouts

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SSG-06` |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SSG-06` |
| Status | `PLANNED` |
| Depends on | `SPRINT-SSG-05` |
| Unblocks | `SPRINT-SSG-07` |
| Execution unit | `PR-SSG-06` |
| Poteto playbook | `feature` with `principle-experience-first` and `principle-fix-root-causes` |
| BMAD roles | Product Manager, UX Designer, Architect, Developer, TEA |
| Effort | 2 days (guess) |

## Outcome

Every host page adapts across unified breakpoints (`desktop >= 1280px`, `tablet 600px..1279px`, and `compact < 600px` tested at `390px` and `358px`) with `0` clipped navbar buttons, `0` horizontal document overflows, and no squashed sidebars. Modeling StageShow's `compact` redesign principle (`tools/stageshow/references/framing.md`), compact phones below `600px` decouple `dockMode` from `compactPane` and replace the dual dock/stage split with one unified single-axis tab bar (`Stage | Explore | Guided | Bombadil | Verify`) giving the live viewport stage `width >= 326px` inside a `358px` screen while keeping `.stage-transport` docked visibly across all `5` tabs and caching the last positive visible `.stage-well` `containerRect`. Both `tests/features/host-responsive-tiers.spec.js` and `npm run stageshow:sweep -- --strict` pass across all `6` routes x `4` widths.

## Work sequence

1. Implement unified `@media` breakpoints in `public/css/responsive-lab.css` and `arrangementPreference` / `effectiveArrangement` session clamping in `js/harness/viewport-stage.js` (`SSG-D10`):
   - `desktop >= 1280px` keeps `.arrangement-horizontal` (`320px` StageShow-proportioned dock left of stage) when `arrangementPreference` is `'auto'`, preserving `presentation-lattice.spec.js:290-292` at `1280x720`.
   - `tablet 600px..1279px` (`820px` sweep) sets `effectiveArrangement = 'vertical'` automatically when `arrangementPreference === 'auto'` (allowing explicit manual session toggle back to horizontal if chosen), wraps header navigation without clipping, and truncates long footer strings with ellipsis on a single line.
   - `compact < 600px` (`390px` and `358px` sweeps) renders a dedicated mobile architecture instead of shrinking the `320px` dock beside the stage (`100dvh` height instead of brittle fixed subtractions):
     - Header navbar fits without overflow (`#btn-nav-mission-control` and `#mission-control-popout-btn` wrap or compact inside `0..358px`, and `.arrangement-toggle-group` hides below `600px`).
     - Decouple desktop `dockMode` from `compactPane` in `js/harness/lab-runtime.js` and unify Dock + Stage into one `5`-tab compact bar (`#btn-mode-stage` with `data-testid="btn-mode-stage"`, `Explore`, `Guided`, `Bombadil`, `Verify`). Switching to `Stage` gives `.stage-well` `width >= 326px` at `358px`; `.stage-transport` (`RecordingRibbonIsland` + `#bombadil-transport-pill`) stays docked visibly across all `5` tabs; and `viewport-stage.js` caches the last positive visible `.stage-well` `containerRect` so switching away from `Stage` and back never computes `0` scale.
     - `#device-manager-modal` switches `.dm-form` to a `1`-column layout inside `358px`, and `.preset-chips-scroll` unwraps so no nested vertical scroll trap exists.
2. Verify and harden responsive edge cases on non-Lab routes (`index.astro?noredirect=1`, `sprint-registry.astro`, `fiber-inspector.astro`, `app.astro`) at `358px`, `390px`, `820px`, and `1440px`:
   - Confirm Portal header controls (`#faro-status-badge`, `#responsive-ui-lab-btn`, `#responsive-ui-lab-fullpage-link`, theme/power toggles, `.penpot-nav-bar`) never overlap `<h1>GovTech OS</h1>` and stay inside `[0, vw]` at `358px` and `390px`.
   - Resolve the `.penpot-nav-bar` active Home link UX bug (`BPV-06`, `DECISIONS.tsv:111`) in `src/pages/index.astro` / `scripts/penpot-render.mjs` by adding `id="main-content" tabindex="-1"` on `<div class="container">` (`index.astro:350`, since `<main class="portal-main">` at `:318` uses `style="display: contents"` which suppresses browser focus boxes), keeping `<a href="index.html" data-penpot-handle="mcard:route:/index.html" aria-current="page">` as a valid same-origin link, and optionally intercepting same-page click events via `preventDefault()` to focus `#main-content`, preserving `tests/smoke/root-index.spec.js:33-34` (`tests/fixtures/test-config.js:28`), `tests/features/penpot-navigation.spec.js:12`, and `src/net/workbench-net.yaml:917`.
3. Create `tests/features/host-responsive-tiers.spec.js` and refine `tests/features/presentation-lattice.spec.js` (`lines 180-222`):
   - Update `presentation-lattice.spec.js` Test 5 to check bidirectional bounds (`r.left >= -1 && r.right <= vw + 1`) alongside `documentElement.scrollWidth <= vw + 1` across `358x800`, `390x844`, `768x1024`, `820x1180`, and `1440x900`.
   - Implement `tests/features/host-responsive-tiers.spec.js` iterating all `6` `SWEEP_ROUTES` (`/responsive-lab.html`, `/index.html?noredirect=1`, `/sprint-registry.html`, `/fiber-inspector.html`, `/fiber-conformance.html`, `/app.html`) x `4` viewports (`1440x900`, `820x1180`, `390x844`, `358x800`) plus `1280x720`, asserting `scrollWidth <= vw + 1`, `r.left >= -1 && r.right <= vw + 1` on visible controls, and union-over-modes reachability across `Stage | Explore | Guided | Bombadil | Verify` at `358px` (zero missing controls across tabs).
4. Execute `npm run stageshow:sweep -- --strict` verifying all `24` captures pass (`findings=0`, `errors=0`, `clipped=0`, `overflows=0`), inspect generated PNGs under `stageshow-output/`, selectively re-capture parent-repo `../docs/sprints/programs/sty/style/layout-baseline.json` (`STY_FREEZE_PAGES=responsive-lab,index` if compact/Home layout alters frozen selectors) with `rebaselines` attribution, and record `docs/sprints/_active/evidence/SSG-06-host-tiers.md` + [`./DECISIONS.tsv`](./DECISIONS.tsv).

## Files

- Edit `public/css/responsive-lab.css`, `js/harness/viewport-stage.js`, `js/harness/lab-runtime.js`, and `src/pages/responsive-lab.astro`
- Edit `src/pages/index.astro` and `scripts/penpot-render.mjs` (add `id="main-content" tabindex="-1"` on `<div class="container">` `index.astro:350`, keep `<a href="index.html" aria-current="page" data-penpot-handle="mcard:route:/index.html">` with optional click `preventDefault()` focus on `#main-content` so `root-index.spec.js`, `penpot-navigation.spec.js`, and `check:net` stay green)
- Create `tests/features/host-responsive-tiers.spec.js`
- Edit `tests/features/presentation-lattice.spec.js` and parent-repo `../docs/sprints/programs/sty/style/layout-baseline.json`
- Create `docs/sprints/_active/evidence/SSG-06-host-tiers.md` and append row to [`./DECISIONS.tsv`](./DECISIONS.tsv)

## BMAD responsibilities

### Product Manager

- Sign off on the unified compact `Stage | Explore | Guided | Bombadil | Verify` tab layout for `< 600px` mobile screens and `.penpot-nav-bar` Home link behavior.

### UX Designer

- Visually review all `24` `stageshow:sweep` PNGs (`1440px`, `820px`, `390px`, `358px` × `6` routes) plus Bombadil compact dashboard view to confirm balanced breathing room and zero overlaps.

### Architect

- Verify desktop `1280x720` default `.arrangement-horizontal`, `8`-island DOM count (or `7` if `Flag 2` is active), and `0`-island byte budgets remain intact across breakpoints.

### Developer

- Deliver `@media` responsive tiers, single-axis compact navigation, `1`-column device modal, and portal navigation alignment.

### TEA

- Create `tests/features/host-responsive-tiers.spec.js`, prove union-over-modes reachability at `358px`, pass `npm run stageshow:sweep -- --strict` with `0` findings/clipped/overflows, and re-baseline parent-repo `layout-baseline.json`.

## Acceptance criteria

- At `1280x720` and `1440x900`, `/responsive-lab.html` boots in `.arrangement-horizontal`; at `820x1180`, `effectiveArrangement` defaults to `.arrangement-vertical` (`arrangementPreference` remains `'auto'` unless overridden); below `600px` (`390x844` and `358x800`), the compact single-axis switcher activates with `#lab-stage-container` `width >= 326px` in `Stage`.
- Cycling `Stage`, `Explore`, `Guided`, `Bombadil`, and `Verify` at `358x800` exposes every desktop interactive `data-testid` control inside `[0, 358]`.
- `npm run stageshow:sweep -- --strict` passes all `24` snapshots (`6` routes × `4` widths) with `findings=0`, `errors=0`, `clipped=0`, and `overflows=0`.
- `tests/features/host-responsive-tiers.spec.js`, `tests/features/presentation-lattice.spec.js`, and `tests/features/layout-freeze.spec.js` pass.

## Test design

- `tests/features/host-responsive-tiers.spec.js` tests every `SWEEP_ROUTE` at `1440x900`, `820x1180`, `390x844`, and `358x800`, asserts bidirectional viewport bounds (`left >= -1`, `right <= vw + 1`) and `scrollWidth <= vw + 1`, and walks every compact tab on `responsive-lab.html` verifying complete control reachability without horizontal overflow.
- `npm run stageshow:sweep -- --strict` exercises the enhanced StageShow + Playwright sweep gate end-to-end.

## Non-goals

- Authoring animated StageShow marketing illustrations on `index.astro?noredirect=1` (`SPRINT-SSG-07`).
- Modifying Docker nightly compose files (`SPRINT-SSG-08`).

## Definition of done

- [ ] **DoD-SSG-06-01.** `npm run stageshow:sweep -- --strict` passes all `24` captures (`6` routes × `1440`, `820`, `390`, `358`) with `findings=0`, `errors=0`, `clipped=0`, and `overflows=0`. Verified by `npm run stageshow:sweep -- --strict`.
- [ ] **DoD-SSG-06-02.** Multi-route bidirectional bounds, `1280x720` default horizontal dock, compact `358px` union-over-modes reachability, and updated `layout-freeze` baselines pass. Verified by `npx playwright test tests/features/host-responsive-tiers.spec.js tests/features/presentation-lattice.spec.js tests/features/layout-freeze.spec.js tests/features/penpot-navigation.spec.js --project=features`.
- [ ] **DoD-SSG-06-03.** Evidence in `evidence/SSG-06-host-tiers.md` and `DECISIONS.tsv` row are recorded with all core gates green. Verified by `test -s docs/sprints/_active/evidence/SSG-06-host-tiers.md && grep -qE $'\tSSG-06\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run build && npm run test:unit && npm run test:smoke && npm run test:components`.
