# DCI-04 Refusal Reasons and Accessible Dialogs Evidence

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-04` (`PR-DCI-04`) |
| Date | `2026-11-26` (`+08:00` local) |
| Source of Truth | [`../SPRINT-DCI-04-refusal-reasons-and-native-dialogs.md`](../SPRINT-DCI-04-refusal-reasons-and-native-dialogs.md) |

## Delivered Changes

1. **Widened Native-Dialog Lint (`scripts/check-explorable-gui.mjs`)**: Extracted and exported `lintNativeDialogs(text, { file })` covering optional calls (`globalThis.prompt?.(`) and bare calls (`alert(`), ignoring method calls such as `store.confirm(` and function declarations, and added `NATIVE_DIALOG_ONLY_PATHS = ['js/runtime', 'js/landing-page-mcard.js']` with four new cases in [`tests/unit/check-explorable-gui.test.mjs`](../../../../../tests/unit/check-explorable-gui.test.mjs).
2. **In-Page Portal Open-URL Dialog**: Created [`js/ui/open-url-dialog.js`](../../../../../js/ui/open-url-dialog.js) (`requestExternalUrl`), added `#open-url-dialog` in [`src/pages/index.astro`](../../../../../src/pages/index.astro) and [`index.html`](../../../../../index.html) styled in [`public/css/semantic-tokens.css`](../../../../../public/css/semantic-tokens.css), and updated [`js/landing-page-mcard.js`](../../../../../js/landing-page-mcard.js) (`244` lines, within `<= 250` ceiling) to accept `requestUrl` instead of `globalThis.prompt?.()`.
3. **In-Page Sprint Navigator Lock Status**: Added `#least-action-status` in [`js/runtime/least-action-navigator.js`](../../../../../js/runtime/least-action-navigator.js) and removed the `alert(` call in `lockCurrentDirection()`.
4. **Visible Stage and Recorder Refusal Reasons**: Created pure [`js/harness/refusal-reasons.js`](../../../../../js/harness/refusal-reasons.js) (`stageRefusals`, `recorderRefusal`) with [`tests/unit/refusal-reasons.test.mjs`](../../../../../tests/unit/refusal-reasons.test.mjs), wired `#stage-refusal-hint` + `aria-describedby` in [`js/harness/viewport-stage.js`](../../../../../js/harness/viewport-stage.js) and [`src/pages/responsive-lab.astro`](../../../../../src/pages/responsive-lab.astro), and wired `#rec-start-reason` + `aria-describedby` in [`js/harness/recording-ribbon.js`](../../../../../js/harness/recording-ribbon.js) and [`src/islands/RecordingRibbonIsland.jsx`](../../../../../src/islands/RecordingRibbonIsland.jsx).
5. **Baselines, Docs, and E2E Spec**: Documented refusal table in [`../../../functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md`](../../../../functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md), re-captured layout baselines for `index` (`836` elements) and `responsive-lab`, and added [`tests/features/refusal-reasons-and-dialogs.spec.js`](../../../../../tests/features/refusal-reasons-and-dialogs.spec.js).

## `INV-DCI-05` Diff Invariant

- Added no files under `src/islands/`.
- Added no `fetch(` calls.
- Added no entries to `package.json`.

## Verification Summary (`DoD-DCI-04-01..05`)

- `node --test tests/unit/check-explorable-gui.test.mjs tests/unit/refusal-reasons.test.mjs tests/single-page-mcard.test.mjs && npm run check:explorable-gui` -> PASS (`js/landing-page-mcard.js` `244` lines)
- `npx playwright test tests/features/refusal-reasons-and-dialogs.spec.js --project=features` -> `4` passed (`5.7s`, zero `dialog` events)
- Full `npm run test:smoke`, `npm run test:features`, `npm run stageshow:sweep -- --strict` (`snapshots=20 findings=0 errors=0 clipped=0 overflows=0`), and all core gates (`stageshow:check-css`, `check-package-source-parity.mjs`, `check:net`, `check:bombadil-nets`, `check:playwright-discovery`, `docs:check`, `build`, `test:unit`) verified green.
