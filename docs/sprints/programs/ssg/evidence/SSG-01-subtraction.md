# Program SSG Sprint `SPRINT-SSG-01` verification evidence

| Field | Value |
| --- | --- |
| Sprint | [`../SPRINT-SSG-01-css-and-chrome-subtraction.md`](../SPRINT-SSG-01-css-and-chrome-subtraction.md) |
| Decisions Ledger | [`../DECISIONS.tsv`](../../../_active/DECISIONS.tsv) |
| Design Contract | [`../../../06-components/STAGESHOW_DESIGN_CONTRACT.md`](../../../../06-components/STAGESHOW_DESIGN_CONTRACT.md) |
| Verified Date | `2026-11-20` |

## CSS token cleanup and StageShow surface adoption (`DoD-SSG-01-01`)

- Removed `3` shadowed `--color-border-hover` declarations in [`../../../../public/css/tokens.css`](../../../../../public/css/tokens.css), leaving `4` scoped declarations (`dark`, `light`, `high-contrast`, and `prefers-color-scheme: light`).
- Added five-surface `--lab-*` tokens (`--lab-canvas`, `--lab-well`, `--lab-chrome`, `--lab-surface`, `--lab-raised`), spacing/density/icon/radius/shadow tokens, `.lab-scroll-stable`, and `.lab-tabular` across themes in [`../../../../public/css/tokens.css`](../../../../../public/css/tokens.css).
- Deleted legacy `.controlled-*`, `.desktop-split-*`, `.orientation-toggle-row`, `.orientation-btn`, `.size-*`, `.dimension-input`, and `.controller-header` rules from [`../../../../public/css/semantic-tokens.css`](../../../../../public/css/semantic-tokens.css) and migrated `.size-preset-btn` rules into [`../../../../public/css/responsive-lab.css`](../../../../../public/css/responsive-lab.css) before `.toolbar-btn` to preserve cascade precedence.
- `[Observed-CLI]` `! grep -rnE '^[[:space:]]*\.controlled-' public/css/semantic-tokens.css && test "$(grep -c -- '--color-border-hover' public/css/tokens.css)" -eq 4` exited `0` (`DoD-SSG-01-01 PASS`).

## Conformance listener and recording ribbon deduplication (`DoD-SSG-01-02`)

- Removed duplicate `lab:viewport-change` and `lab:target-change` event registration in [`../../../../src/islands/ConformancePanelIsland.jsx`](../../../../../src/islands/ConformancePanelIsland.jsx) so [`../../../../js/harness/conformance-panel.js`](../../../../../js/harness/conformance-panel.js) remains the single owner of conformance refresh requests.
- Replaced the legacy fallback `innerHTML` builder in [`../../../../js/harness/recording-ribbon.js`](../../../../../js/harness/recording-ribbon.js) with an early `return null` guard when `#recording-ribbon` is absent.
- Updated `Region 5` in [`../../../../tests/features/responsive-lab-islands.spec.js`](../../../../../tests/features/responsive-lab-islands.spec.js) to open `#conformance-disclosure` (hydrating `<ConformancePanelIsland client:visible />`), wait for initial conformance settlement, switch to `ipad-air-11`, and assert exactly `1` `/api/test-runs/conformance/latest` request.
- `[Observed-CLI]` `npx playwright test tests/features/responsive-lab-islands.spec.js --project=features` exited `0` (`9 passed (13.2s)`).

## Non-Lab host page fixes and StageShow layout audits (`DoD-SSG-01-03`)

- [`../../../../src/pages/index.astro`](../../../../../src/pages/index.astro) moved `.penpot-nav-bar`, `.top-controls`, and `.footer` into normal flex flow, removed the `min-height: 1180px` vertical void, aligned `.container` entrance timing to `var(--motion-duration-fast)`, and styled `.mcard-page-host`, `#mcard-sovereign-pill-mount`, `.mcard-sovereign-pill`, `.visually-hidden`, and `@media (max-width: 640px)`.
- [`../../../../src/pages/sprint-registry.astro`](../../../../../src/pages/sprint-registry.astro) added `box-sizing: border-box`, replaced undefined token references with [`../../../../public/css/tokens.css`](../../../../../public/css/tokens.css) variables, switched `.grid` tracks to `minmax(min(100%, 340px), 1fr)`, and applied `12px` body padding under `600px`.
- [`../../../../src/pages/fiber-inspector.astro`](../../../../../src/pages/fiber-inspector.astro) capped `main` at `max-width: 1200px`, wrapped all `5` tables in `.table-scroll` (`overflow-x: auto`), and added `overflow-wrap: anywhere`.
- `public/css/mcard-manager.css` and `src/pages/app.astro` (both later retired in `SPRINT-SLC-02`) raised compact media queries from `768px` to `1024px`, fixed `var(--motion-ease)-out`, replaced literal `white` backgrounds with `var(--color-surface)`, added `visibility: hidden; pointer-events: none` to hidden chat and inactive mobile slide panes, and wrapped all `15` `.header-btn` labels in `<span>`.
- [`../../../../src/pages/fiber-conformance.astro`](../../../../../src/pages/fiber-conformance.astro) stayed unmodified (`git diff` empty).
- `[Observed-CLI]` All `16` `SKIP_BUILD=1 npm run stageshow:layout -- <route> --width <w> --strict` runs exited `0` after `npm run build` (`DoD-SSG-01-03 PASS`).

| Route | Width (px) | Controls | Padded Containers | Clipped | Overflow |
| --- | ---: | ---: | ---: | ---: | :---: |
| `/index.html?noredirect=1` | `358` | `4` | `4` | `0` | `false` |
| `/sprint-registry.html` | `358` | `0` | `6` | `0` | `false` |
| `/fiber-inspector.html` | `358` | `0` | `1` | `0` | `false` |
| `/app.html` | `358` | `0` | `2` | `0` | `false` |
| `/index.html?noredirect=1` | `390` | `5` | `4` | `0` | `false` |
| `/sprint-registry.html` | `390` | `0` | `6` | `0` | `false` |
| `/fiber-inspector.html` | `390` | `0` | `1` | `0` | `false` |
| `/app.html` | `390` | `0` | `2` | `0` | `false` |
| `/index.html?noredirect=1` | `820` | `5` | `4` | `0` | `false` |
| `/sprint-registry.html` | `820` | `0` | `11` | `0` | `false` |
| `/fiber-inspector.html` | `820` | `0` | `1` | `0` | `false` |
| `/app.html` | `820` | `0` | `5` | `0` | `false` |
| `/index.html?noredirect=1` | `1440` | `5` | `4` | `0` | `false` |
| `/sprint-registry.html` | `1440` | `0` | `16` | `0` | `false` |
| `/fiber-inspector.html` | `1440` | `0` | `1` | `0` | `false` |
| `/app.html` | `1440` | `4` | `5` | `0` | `false` |

## Selective baseline refresh and full Playwright suites (`DoD-SSG-01-04`)

- Updated [`../../../../tests/features/layout-freeze.spec.js`](../../../../../tests/features/layout-freeze.spec.js) with async readiness waits (`pageState === 'ready'`, `fonts.ready`, portal MCard host settlement, `app` collection load), expanded `VOLATILE` masks, and `STY_FREEZE_PAGES` partial capture merge, then re-captured `index`, `fiber-inspector`, and `app` into [`../../../../tests/baselines/layout-baseline.json`](../../../../../tests/baselines/layout-baseline.json) (`7th` `rebaselines` entry) while preserving existing `responsive-lab`, `fiber-conformance`, and `pkc-docs-index` snapshots (`15/15` pass).
- Updated [`../../../../tests/features/responsive-rotation-and-devices.spec.js`](../../../../../tests/features/responsive-rotation-and-devices.spec.js) (`RVP-T06` custom height `480`, `scrollTop = 200`) and [`../../../../tests/features/presentation-lattice.spec.js`](../../../../../tests/features/presentation-lattice.spec.js) Test `5` (`358x800` overflow, non-`1180px` container height, non-overlapping header, and `#mcard-sovereign-pill`).
- `[Observed-CLI]` `npm run build` built all `6` Astro pages, `[gqc-net-parity] PASS pages=6`, and workspace packages (`@pkc/core`, `@pkc/markdown-renderer`).
- `[Observed-CLI]` `npm run test:smoke` passed `30/30` (`23.6s`).
- `[Observed-CLI]` `npm run test:components` passed `18/18` (`10.0s`).
- `[Observed-CLI]` `npm run test:features` exited `0` (`602 passed`, `16 skipped` including guarded `STY_FREEZE=capture` baseline specs).
