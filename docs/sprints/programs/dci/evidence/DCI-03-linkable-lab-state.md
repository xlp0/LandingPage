# DCI-03 Linkable Lab State Evidence

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-03` (`PR-DCI-03`) |
| Date | `2026-11-26` (`+08:00` local) |
| Source of Truth | [`../SPRINT-DCI-03-linkable-lab-state.md`](../SPRINT-DCI-03-linkable-lab-state.md) |

## Delivered Changes

1. **Pure Lab URL Codec (`js/harness/lab-url-state.js`)**: Created DOM-free codec exporting `parseLabUrlState`, `orientationIssue`, `labUrlStateFromGeometry`, `mergeLabUrlState`, and `issueSentence` for `device`, `w`, `h`, `orientation`, and `mode`, with unit coverage across all `12` built-in devices, custom devices, default Full/Explore omission, rejection reasons (`unknown-value`, `size-invalid`, `size-ignored`, `orientation-fixed`), and foreign query parameter preservation in [`tests/unit/lab-url-state.test.mjs`](../../../../../tests/unit/lab-url-state.test.mjs).
2. **Boot Restore and User-Commit Write-Back (`js/harness/lab-runtime.js`, `js/harness/recorder.js`)**: Exported `RECORDED_VIEWPORT_CAUSES` from [`js/harness/recorder.js`](../../../../../js/harness/recorder.js), restored URL state once inside `markBootParticipant` (`boot-param` cause), wrote ignored-parameter notices into `#lab-url-state-notice`, synchronized committed preset/custom/rotate/mode transitions back to the URL via `history.replaceState` while preserving `target` and `display_mode`, and left window resizes untouched.
3. **Toolbar Notice, Copy Link, Explorer, Docs, and Layout Baseline**: Added `#stage-message` / `#lab-url-state-notice` and `#btn-copy-lab-link` in [`src/pages/responsive-lab.astro`](../../../../../src/pages/responsive-lab.astro) and [`public/css/responsive-lab.css`](../../../../../public/css/responsive-lab.css), added `[data-testid="btn-copy-lab-link"]` to `SKIPPED_SELECTOR` in [`tests/bombadil/workbench.bombadil.ts`](../../../../../tests/bombadil/workbench.bombadil.ts) and [`tests/bombadil/lab-smoke.bombadil.ts`](../../../../../tests/bombadil/lab-smoke.bombadil.ts), updated stored-state table in [`../../../01-architecture/astro-host-and-islands.md`](../../../../01-architecture/astro-host-and-islands.md) and [`../../../functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md`](../../../../functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md), re-captured `responsive-lab` baseline (`802` elements across `5` viewports), and added [`tests/features/lab-url-state.spec.js`](../../../../../tests/features/lab-url-state.spec.js).

## `INV-DCI-05` Diff Invariant

- Added no files under `src/islands/`.
- Added no `fetch(` calls.
- Added no entries to `package.json`.

## Verification Summary (`DoD-DCI-03-01..05`)

- `node --test tests/unit/lab-url-state.test.mjs` -> `5` passed, `0` failed
- `npx playwright test tests/features/lab-url-state.spec.js --project=features` -> `4` passed (`5.5s`)
- Full `npm run test:features`, `npm run stageshow:sweep -- --strict` (`snapshots=20 findings=0 errors=0 clipped=0 overflows=0`), and all core gates (`stageshow:check-css`, `check-package-source-parity.mjs`, `check:explorable-gui`, `check:net`, `check:bombadil-nets`, `check:playwright-discovery`, `docs:check`, `build`, `test:unit`, `test:smoke`) verified green.
