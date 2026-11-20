# SPRINT-SSG-05 Evidence - StageShow Workbench and Bombadil Dashboard

| Field | Value |
| --- | --- |
| Sprint | `SPRINT-SSG-05` |
| Status | `DONE` |
| Feature Flag Defaults | Flag 1 enabled, Flag 2 enabled |
| Island Topology | `8` islands (`7` baseline plus `BombadilDashboardIsland` deferred `client:visible`) |

## Summary of Implemented Artifacts

1. **Bundled Self-Hosted Fonts and SVG Icon Registry**
   - Extracted `public/fonts/inter-latin-wght-normal.woff2` (`48256 B`) and `public/fonts/jetbrains-mono-latin-wght-normal.woff2` (`40404 B`) without altering `package.json`.
   - Added `@font-face` rules, `.lab-icon` (`14px`) and `.lab-icon--md` (`16px`) sizing, and fixed widths for `#power-label` (`min-width: 54px`) and `#theme-label` (`min-width: 58px`) in `public/css/tokens.css`, keeping zero shift during low-battery transitions.
   - Created `js/ui/icons.js` (`ICON_PATHS`, `iconMarkup`, `createIconElement`, `setIcon`) and shared Preact `src/components/LabIcon.jsx` with single-path `battery` icon matching `zap` DOM node count, `0` raw `dangerouslySetInnerHTML`, and `0` `clm-kernel` client bytes.
   - Stripped emojis and dingbats across active host controls and `scripts/penpot-render.mjs`, updated group headings to sentence case without colons, added `#target-omnibar-header`, `#target-url-input-wrap`, and `#rec-undersized-text`, wired `onOpenSavedRun` on `#rec-saved-pill` and `#rec-saved-label`, and updated `Browse All Presets` to switch to `explore` mode.

2. **Bombadil Dashboard Island and Four-Mode StageShow Workbench**
   - Extended `js/harness/bombadil-client.js` with `getState()`, `startedAt`/`durationMs`, `mcardHandle`/`mcardHash`, `stepsCount`, and `emitState()` on `runs()` and `coverage()`.
   - Built `src/islands/BombadilDashboardIsland.jsx` (`client:visible`, SSR `data-island="bombadil-dashboard"`, `data-island-state="ready"`) with separate hero metric and badge, 5 handle rows (`<select>`, `Trigger[data-effect="external"]`, framed `Load Target in Stage`), `Shrink Trace[data-effect="external"]`, `Copy --reproduce`, coverage bars, recent runs, `Stop`, `Refresh`, `childRun` lock, zero `document.addEventListener`, and `data-testid` attributes.
   - Implemented the `4`-mode dock tab switcher (`explore`, `guided-spa`, `bombadil`, `verify`) with roving arrow/Home/End keyboard navigation, `#verify-summary-shell`, clickable `#bombadil-transport-pill`, `window.__lab.mode`, and `openSavedRunResult()`.
   - Restyled `public/css/responsive-lab.css` using StageShow tokens with `0` raw hex or rgba literals, solid raised active thumbs on transparent borderless tracks, and removed `fonts.googleapis.com` links.

3. **Shared PresentationController and Protected-File Preservation**
   - Updated `js/runtime/presentation-controller.js` precedence (`?display_mode=` then `localStorage` then `document.documentElement.dataset.theme` then `prefers-color-scheme`) and `lab:presentation-change` event.
   - Added external `js/runtime/presentation-bootstrap.js` and `src/components/PresentationControls.astro` with `enablePresentationController` on `src/layouts/WorkbenchLayout.astro`, updated `src/pages/index.astro`, `src/pages/sprint-registry.astro`, and `src/pages/fiber-inspector.astro`, and left `src/pages/fiber-conformance.astro`, `ws-server.js`, and `scripts/package-source-parity.json` untouched.

4. **Test Coverage and Selective Rebaseline**
   - Added `tests/features/bombadil-dashboard.spec.js`, updated existing feature, unit, performance, and Bombadil property specs, and selectively updated `tests/baselines/layout-baseline.json` (`rebaselines[9]` for `responsive-lab`, `index`, `fiber-inspector`, with `#power-icon` in `VOLATILE`).

## Verification Record

| Gate | Command | Result |
| --- | --- | --- |
| DoD-SSG-05-01 | `npx playwright test tests/features/responsive-lab-islands.spec.js tests/features/page-state-contract.spec.js tests/features/bombadil-dashboard.spec.js --project=features` | `24 passed, 1 skipped` |
| DoD-SSG-05-02 | `npm run check:explorable-gui && npm run check:bombadil-nets && npx playwright test tests/features/explorable-gui.spec.js tests/features/presentation-lattice.spec.js tests/features/responsive-rotation-and-devices.spec.js tests/features/responsive-capture.spec.js tests/features/performance-baselines.spec.js tests/features/spa-workbench-journey.spec.js tests/features/spa-test-workbench.spec.js tests/features/spa-failure-recovery.spec.js --project=features` | `68 passed` |
| DoD-SSG-05-03 | `npx playwright test tests/features/fiber-conformance.spec.js tests/features/fiber-inspector.spec.js tests/features/sprint-registry.spec.js tests/features/layout-freeze.spec.js tests/smoke/landing-page.spec.js --project=features --project=smoke` | `445 passed, 16 skipped` |
| Smoke Suite | `npm run test:smoke` | `30 passed` |
| Stage Frame Geometry | `npx playwright test tests/features/stage-frame-geometry.spec.js --project=features` | `3 passed` |
| StageShow Strict Layout | `npm run stageshow:layout -- /responsive-lab.html --strict` | `no-issues-detected`, `clipped=0`, `overflow=false` (`39` controls, `4` padded containers) |
| Place Byte Budget | `node tests/performance/place-bytes.mjs --enforce-zero-island-places` | `PASS` (`pagePlaces=7`, `islandFreePagePlaces=6`, `violations=0`) |
| Unit Tests | `npm run test:unit` | `299 passed` |
| Static Gates | `check:explorable-gui`, `check:bombadil-nets`, `docs:check`, `check-package-source-parity`, `check:net` | `PASS` (`files=271`, `pairs=4`, `uiCalls=22`, `40` places, `90` transitions) |
