# SPRINT-SSG-06 Evidence - Host Responsive Tiers and Compact Layouts

| Field | Value |
| --- | --- |
| Sprint | `SPRINT-SSG-06` |
| Status | `DONE` |
| Feature Flag Defaults | Flag 1 enabled, Flag 2 enabled |
| Rebased Routes | `responsive-lab` (`738` elements), `index` (`814` elements) |

## Summary of Implemented Artifacts

1. **Arrangement Clamping and Cached Stage Container Bounds**
   - Added session-only `arrangementPreference` (`auto`, `horizontal`, `vertical`), `resolveResponsiveTier()`, `resolveEffectiveArrangement()`, `applyEffectiveArrangement()`, `getArrangement()`, and `lastPositiveContainerRect` caching in `js/harness/viewport-stage.js`, and exposed `window.__lab.arrangement` in `js/harness/lab-api.js`.
   - Desktop (`>= 1280px`) defaults to `.arrangement-horizontal` with a `320px` StageShow-proportioned dock; tablet (`600px..1279px`) defaults `effectiveArrangement` to `vertical` while allowing manual horizontal override; compact (`< 600px`) clamps `effectiveArrangement` to `vertical` and preserves positive stage scale across hidden-stage tab switches.

2. **Unified Compact Architecture and Unified Breakpoints**
   - Added compact-only tab button `#btn-mode-stage` (`data-testid="btn-mode-stage"`) and `data-compact-pane="stage"` on `#lab-workspace-container` in `src/pages/responsive-lab.astro`, decoupling `dockMode` from `compactPane` inside `js/harness/lab-runtime.js` with visible-tab roving arrow/Home/End navigation and resize resync.
   - Added `100dvh` body height, `arrangement-vertical` dock styling, tablet `@media (max-width: 1279px)` navbar wrapping and single-line status truncation, and compact `@media (max-width: 599px)` single-axis `Stage | Explore | Guided | Bombadil | Verify` layout, permanently docked `.stage-transport`, unwrapped `.preset-chips-scroll`, and `1`-column `#device-manager-modal` form in `public/css/responsive-lab.css` using StageShow tokens only.

3. **Portal Navigation Focus Hardening**
   - Added `aria-current="page"` on the active Penpot Home link in `src/pages/index.astro` and `scripts/penpot-render.mjs`, added `id="main-content" tabindex="-1"` on `<div class="container">`, and intercepted same-page Home clicks via `preventDefault()` to focus `#main-content` while keeping `href="index.html"` intact.

4. **Test Coverage and Selective Rebaseline**
   - Extended `tests/features/presentation-lattice.spec.js` Test 5 to audit `820x1180` and bidirectional bounds at `1440x900`.
   - Added `tests/features/host-responsive-tiers.spec.js` covering all `6` `SWEEP_ROUTES` across `5` viewports (`1440`, `1280`, `820`, `390`, `358`), compact `358px` union-over-modes reachability (`5` tabs), positive scale retention, `1`-column device modal, and Portal Home focus behavior.
   - Selectively re-captured `responsive-lab` and `index` in `tests/baselines/layout-baseline.json` (`rebaselines[10]`, preserving `app`, `fiber-inspector`, `fiber-conformance`, and `pkc-docs-index`).

## Verification Record

| Gate | Command | Result |
| --- | --- | --- |
| DoD-SSG-06-01 | `npm run stageshow:sweep -- --strict` | `PASS` (`snapshots=24`, `findings=0`, `errors=0`, `clipped=0`, `overflows=0`) |
| DoD-SSG-06-02 | `npx playwright test tests/features/host-responsive-tiers.spec.js tests/features/presentation-lattice.spec.js tests/features/layout-freeze.spec.js tests/features/penpot-navigation.spec.js --project=features` | `43 passed, 1 skipped` (`capture baseline` setup skipped outside capture mode) |
| DoD-SSG-06-03 | `stageshow:check-css`, `check-package-source-parity`, `check:explorable-gui`, `check:net`, `check:bombadil-nets`, `check:playwright-discovery`, `docs:check`, `build`, `test:unit`, `test:smoke`, `test:components` | `PASS` (`unit 299/299`, `smoke 30/30`, `components 18/18`, `docs files=273`, `features discovered=648`) |
