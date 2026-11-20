# SPRINT-SSG-01 CSS and chrome subtraction

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SSG-01` |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SSG-01` |
| Status | `DONE` |
| Depends on | `SPRINT-SSG-00` |
| Unblocks | `SPRINT-SSG-02` |
| Execution unit | `PR-SSG-01` |
| Poteto playbook | `refactoring` with `principle-subtract-before-you-add` and `principle-minimize-reader-load` |
| BMAD roles | Product Manager, UX Designer, Architect, Developer, TEA |
| Effort | 2 days (guess) |

## Outcome

Duplicate CSS declarations, unused legacy selector blocks, redundant conformance event registration, dead HTML templates, and non-Lab layout voids/overflows are removed before domain or dashboard construction begins. `public/css/tokens.css` removes duplicate `--color-border-hover` overrides while adding StageShow-aligned five-surface tokens (`--lab-canvas`, `--lab-well`, `--lab-surface`, `--lab-chrome`, `--lab-raised`, `--lab-icon-sm: 14px`, `--lab-icon-md: 16px`, spacing/radius tokens, `scrollbar-gutter: stable`, and `tabular-nums`), `public/css/semantic-tokens.css` drops unused legacy `.desktop-split-*`, `.controlled-*`, and unreferenced `.orientation-toggle-row`/`.orientation-btn` rules (`1298-1332`) after migrating active `.size-preset-btn` (`1273-1296`) properties into `public/css/responsive-lab.css` alongside `.orientation-btn-primary` (`responsive-lab.css:199`), `ConformancePanel` removes its duplicate listener (`1` fetch per event instead of `2`, with full `(targetUrl, selectionKey, orientation)` tuple memoization landing in `SPRINT-SSG-02` once `ViewportSelection` exists), and non-Lab host routes (`index.astro?noredirect=1`, `sprint-registry.astro`, `fiber-inspector.astro`, `app.astro`) resolve their baseline layout defects across `358px` to `1440px`.

## Work sequence

1. Clean token duplicates and introduce StageShow surface scale in `public/css/tokens.css`:
   - Delete shadowed `--color-border-hover` lines `14`, `157`, and `244` while preserving the `4` effective declarations at lines `57` (`:root`), `194` (`[data-theme="light"]`), `278` (`[data-theme="high-contrast"]`), and `369` (`@media (prefers-color-scheme: light)`).
   - Add five-step StageShow surface tokens (`--lab-canvas`, `--lab-well`, `--lab-surface`, `--lab-chrome`, `--lab-raised`, `--lab-icon-sm: 14px`, `--lab-icon-md: 16px`), radius scale (`6px`..`12px`, `999px`), and shadow tokens (`kit/stage.css` pattern) across dark, light, and high-contrast themes.
2. Audit and remove dead CSS in `public/css/semantic-tokens.css` lines `1222-1400` (`179` lines) using an explicit selector disposition map:
   - Delete unused `.desktop-split-*`, `.controlled-size-controller`, `.controlled-stage`, `.controlled-frame*`, `.size-presets-row`, `.size-custom-row`, `.dimension-input`, `.controller-header`, and (after confirming `0` callers across `src/`, `js/`, `tests/`, noting `DevicePresetsIsland.jsx:35,44` uses `.orientation-btn-primary` styled in `responsive-lab.css:199`) `.orientation-toggle-row` / `.orientation-btn` (`lines 1298-1332`).
   - Migrate active `.size-preset-btn` rules (`public/css/semantic-tokens.css:1273-1296`, consumed by `src/islands/DevicePresetsIsland.jsx:77,88` and `js/harness/device-presets-ui.js:67,93`) into `public/css/responsive-lab.css` before deleting lines `1222-1400` from `semantic-tokens.css`.
3. Deduplicate conformance event listeners and delete dead recorder template code:
   - Remove duplicate `lab:viewport-change` and `lab:target-change` listener registration between `src/islands/ConformancePanelIsland.jsx:30-31` and `js/harness/conformance-panel.js:91-94`, keeping one refresh owner (`1` `GET /api/test-runs/conformance/latest` fetch per preset/target event; selection-key memoization across host resizes follows in `SPRINT-SSG-02`).
   - Delete the dead fallback `innerHTML` block in `js/harness/recording-ribbon.js:18-48`, auditing test callers of `initRecordingRibbon` so unit and Playwright assertions stay green.
4. Fix self-contained layout and token bugs across non-Lab routes without touching frozen `src/pages/fiber-conformance.astro`:
   - **Portal (`src/pages/index.astro?noredirect=1`).** Preserve `<!-- BEGIN: PENPOT-GENERATED-NAV (INV-CDO-11) -->` / `<!-- END: PENPOT-GENERATED-NAV -->` markers (`lines 308-316`), remove `min-height: 1180px` (`lines 96-103`) and `position: absolute` footer trap (`lines 211-216`), fix `.top-controls` (`lines 45-53`), `.penpot-nav-bar` (`lines 262-276`), and `@media (max-width: 640px)` (`lines 247-259`) inside a wrapping normal-flow flex header so `#faro-status-badge` never clips at `left < 0` or covers `<h1>GovTech OS</h1>` at `358px`, style `.mcard-sovereign-pill` and `.visually-hidden` used by `js/landing-page-mcard.js`, and update `RVP-T06` in `tests/features/responsive-rotation-and-devices.spec.js:329-343` (lower custom height e.g. `480px` instead of `1133px` so `m.contentH > m.viewH` still holds without `min-height: 1180px`).
   - **Sprint Registry (`src/pages/sprint-registry.astro`).** Replace `minmax(360px, 1fr)` with `minmax(min(100%, 340px), 1fr)` (`12px` mobile padding `< 600px`), and fix missing tokens `--color-background-primary`, `--color-badge-valid-*`, and `--color-badge-draft-*` (`lines 10-18`) to use `tokens.css` variables.
   - **Fiber Inspector (`src/pages/fiber-inspector.astro`).** Cap content width at `1200px` and wrap wide `5`-column / `6`-column tables in horizontal scroll containers below `640px`.
   - **Legacy App (`public/css/mcard-manager.css` and `src/pages/app.astro`).** Raise both tablet `@media (max-width: 768px)` breakpoints (`lines 971 and 1161`) to `1024px`, fix invalid `var(--motion-ease)-out` (`line 1346`) and hardcoded `background: white` (`lines 567, 1331` -> `var(--color-surface)`), and wrap `.header-btn` text labels in `<span>` across all `.header-btn` controls in `app.astro` (`lines 77-335`) so mobile compact rules hide labels instead of clipping buttons.
5. Harden `tests/features/layout-freeze.spec.js` and selectively re-capture non-Lab frozen host routes:
   - Update `tests/features/layout-freeze.spec.js:42-50, 70-74, 151-176` (`VOLATILE`, `run()`, and `capture baseline`) to support `STY_FREEZE_PAGES=<comma-list>` partial merges (reading existing `OUT` so unmodified `pages`, `tagVocab`, and `clsVocab` entries stay intact instead of resetting `pages = {}`), add `'#mcardList'` to `VOLATILE.app` (`:43`) and mask `#controlled-panel-status`, `#stage-target-place`, and `#bombadil-transport-pill` inside `VOLATILE['responsive-lab']`, and wait for `body[data-page-state="ready"]` + `document.fonts.ready` plus per-page async mount settle (`#single-page-mcard-host .mcard-page, #single-page-mcard-host .mcard-error` and `#mcard-sovereign-pill-mount .mcard-sovereign-pill` on `index`; `networkidle`, `#mcardList` present (`app.astro:452`), and `window.mcardManager?.collection != null` on `app`) when `p.name !== 'pkc-docs-index'` while preserving `load` + `document.fonts.ready` waits on `pkc-docs-index`.
   - Run `STY_FREEZE_PAGES=index,fiber-inspector,app STY_FREEZE=capture npx playwright test tests/features/layout-freeze.spec.js --project=features` against `tests/baselines/layout-baseline.json` (`/sprint-registry.html` is covered by `sprint-registry.spec.js` and `stageshow:layout`) and append an attributed `rebaselines` JSON entry (`{ date, program: "Program SSG (LandingPage), SPRINT-SSG-01", pages, reason, effect, authority }`), add `/api/test-runs/conformance/latest` single-fetch counting assertions (`=== 1` per preset switch) in `tests/features/responsive-lab-islands.spec.js`, and extend `tests/features/presentation-lattice.spec.js` portal layout checks.
6. Record verification metrics in `docs/sprints/_active/evidence/SSG-01-subtraction.md` and append completion row to [`./DECISIONS.tsv`](../../_active/DECISIONS.tsv).

## Files

- Edit `public/css/tokens.css`, `public/css/semantic-tokens.css`, `public/css/responsive-lab.css`, and `public/css/mcard-manager.css`
- Edit `src/pages/index.astro`, `src/pages/sprint-registry.astro`, `src/pages/fiber-inspector.astro`, and `src/pages/app.astro` (zero edits to `src/pages/fiber-conformance.astro`)
- Edit `src/islands/ConformancePanelIsland.jsx`, `js/harness/conformance-panel.js`, and `js/harness/recording-ribbon.js`
- Edit `tests/features/layout-freeze.spec.js` (`STY_FREEZE_PAGES` partial merge + readiness sync), `tests/features/responsive-lab-islands.spec.js`, `tests/features/presentation-lattice.spec.js`, `tests/features/responsive-rotation-and-devices.spec.js`, and `tests/baselines/layout-baseline.json`
- Create `docs/sprints/_active/evidence/SSG-01-subtraction.md` and append row to [`./DECISIONS.tsv`](../../_active/DECISIONS.tsv)

## BMAD responsibilities

### Product Manager

- Approve removal of dead chrome and earlier `min-height: 1180px` portal gap across non-Lab pages.

### UX Designer

- Audit `tokens.css` five-surface step hierarchy against StageShow `looks.md` and verify zero header overlap on `index.html?noredirect=1`, `sprint-registry.html`, `fiber-inspector.html`, and `app.html` from `358px` to `1440px`.

### Architect

- Confirm `src/net/workbench-net.yaml` and `scripts/gen-bombadil-nets.mjs` `triggerDrift()` remain unaffected before removing dead markup, and verify `src/pages/fiber-conformance.astro` stays byte-identical.

### Developer

- Execute CSS/JS subtraction, keep `.size-preset-btn` and `.orientation-btn-primary` intact, deduplicate `ConformancePanel` listeners, implement `STY_FREEZE_PAGES` partial merge in `layout-freeze.spec.js`, and implement non-Lab responsive fixes without touching device math or Responsive UI Lab chrome structure (reserved for `SSG-02`/`SSG-03`/`SSG-05`).

### TEA

- Verify `GET /api/test-runs/conformance/latest` fires `=== 1` request per preset switch (reduced from `2`), selectively re-capture `tests/baselines/layout-baseline.json` with a valid `rebaselines` entry, and pass Playwright suites.

## Acceptance criteria

- `public/css/tokens.css` contains exactly `4` `--color-border-hover` declarations (`57, 194, 278, 369` semantics) and `public/css/semantic-tokens.css` contains `0` `.controlled-*`, `.desktop-split-*`, or unreferenced `.orientation-toggle-row`/`.orientation-btn` rules while `.size-preset-btn` and `.orientation-btn-primary` styling remains intact in `responsive-lab.css`.
- Switching preset or target in Responsive UI Lab issues `=== 1` `GET /api/test-runs/conformance/latest` request instead of `2`.
- `index.html?noredirect=1`, `sprint-registry.html`, `fiber-inspector.html`, and `app.html` render with `scrollWidth <= innerWidth + 1` and `r.left >= -1 && r.right <= innerWidth + 1` on header/primary controls across `1440px`, `820px`, `390px`, and `358px`.
- `tests/baselines/layout-baseline.json` non-Lab re-baseline is recorded and `tests/features/layout-freeze.spec.js` plus `tests/features/fiber-conformance.spec.js` pass.

## Test design

- `tests/features/responsive-lab-islands.spec.js` intercepts `/api/test-runs/conformance/latest` and verifies `1` request per preset/target switch (down from duplicate `2`).
- `tests/features/presentation-lattice.spec.js` checks computed height (`< 1180px` void eliminated), styled `.mcard-sovereign-pill`, non-overlapping `.top-controls`, and bidirectional header bounds on `index.html?noredirect=1` at `358x800` and `390x844`.
- Update `RVP-T06` in `tests/features/responsive-rotation-and-devices.spec.js`, run selective `STY_FREEZE=capture`, and verify `npm run test:features`.

## Non-goals

- Fixing device preset dimensions, `deviceId: null` descriptors, conformance resize memoization, or orientation math (`SPRINT-SSG-02`).
- Restructuring Responsive UI Lab stage chrome into StageShow playground bands and parametric hardware bezels (`SPRINT-SSG-03`).

## Definition of done

- [x] **DoD-SSG-01-01.** Duplicate `--color-border-hover` overrides in `tokens.css` (`7 -> 4`) and unused `.controlled-*` / `.desktop-split-*` / `.orientation-toggle-row` blocks in `semantic-tokens.css` are deleted while `.size-preset-btn` and `.orientation-btn-primary` styling is preserved. Verified by `! grep -rnE '^[[:space:]]*\.controlled-' public/css/semantic-tokens.css && test "$(grep -c -- '--color-border-hover' public/css/tokens.css)" -eq 4`.
- [x] **DoD-SSG-01-02.** Duplicate conformance listeners and dead recorder template HTML are deleted, keeping `/api/test-runs/conformance/latest` at `1` fetch per preset/target event. Verified by `npx playwright test tests/features/responsive-lab-islands.spec.js --project=features`.
- [x] **DoD-SSG-01-03.** Portal `1180px` dead space, `position: absolute` footer collision, and non-Lab mobile overflows (`index`, `sprint-registry`, `fiber-inspector`, `app`) pass across `358px`, `390px`, `820px`, and `1440px` while leaving `fiber-conformance.astro` untouched. Verified by running `(set -e; for w in 358 390 820 1440; do for r in '/index.html?noredirect=1' '/sprint-registry.html' '/fiber-inspector.html' '/app.html'; do npm run stageshow:layout -- "$r" --width "$w" --strict; done; done)`.
- [x] **DoD-SSG-01-04.** `tests/baselines/layout-baseline.json` selective re-baseline, `RVP-T06`, Darwin conformance visuals, Playwright suites, and build parity pass. Verified by `npm run build && npm run test:smoke && npm run test:components && npm run test:features`.
- [x] **DoD-SSG-01-05.** Evidence in `evidence/SSG-01-subtraction.md` and `DECISIONS.tsv` row are recorded with all core gates green. Verified by `test -s docs/sprints/_active/evidence/SSG-01-subtraction.md && grep -qE $'\tSSG-01\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run test:unit`.
