# BPV-04 explorable controls progress evidence

| Field | Value |
| --- | --- |
| Audience | BPV sprint owners and reviewers |
| BMAD Owner | Developer with UX Designer and TEA |
| Source of Truth | [SPRINT-BPV-04](../SPRINT-BPV-04-explorable-controls.md), `scripts/check-explorable-gui.mjs` |
| Status | Complete on 2026-11-17. All five DoD items pass. |

## Done on 2026-11-17

| Work | Result |
| --- | --- |
| Lint | `scripts/check-explorable-gui.mjs` fails on an island control without `data-testid` (`island-control-without-testid`), an in-scope Astro page control (`!= app.astro`) without `data-testid` (`page-control-without-testid`), a native `confirm`/`alert`/`prompt`, an `onclick` on a non-control, an unknown `data-effect`, or an effect without a test id. `npm run check:explorable-gui` passes on the tree, and `tests/unit/check-explorable-gui.test.mjs` seeds each violation (7 tests post-remediation). |
| Test ids | Every control in the seven islands carries `data-testid`. The device presets and target chips that the modules create at runtime carry one too, which the runtime spec checks. |
| Side effects | `external` on Pop Out, `download` on the ribbon JSON and the video and audio renderers, `persist` on recorder Stop and the three Layer 4 save actions, `destructive` on the preset reset and the delete confirmation, `navigate` on the Mission Control link. |
| Dialogs | `window.confirm` is gone. Deleting a preset opens `#preset-delete-dialog`; only its confirm button is `destructive`. The cancel path is covered by `tests/features/explorable-gui.spec.js` and by the updated `RVP-T03`. |
| Semantics | Arrangement, orientation, and size preset toggles carry `aria-pressed`. The recording ribbon shows and hides its buttons with `hidden`. The redundant click handler on `#responsive-ui-lab-card` is gone (along with its `cursor: pointer;` style). |
| Deduplication | The dock arrangement buttons in `DevicePresetsIsland` are removed; the header toggle is the only arrangement control. The workflow's proxy Start and Stop buttons and `triggerRibbonButton` are removed, and step 5 points at the ribbon. The arrangement options read Sidebar and Stacked; the orientation options read Portrait and Landscape. |
| Tests migrated | Nine Playwright references moved from `workflow-rec-*` to the ribbon ids, and one rotation test now confirms the dialog instead of accepting a browser prompt. |
| Helpers | `scripts/bombadil/run.mjs` gains a `lab-smoke` target and `tests/bombadil/lab-smoke.bombadil.ts` re-exports the defaults plus page-state and recorder-state properties. |

## Verification

| Command | Result |
| --- | --- |
| `npm run check:explorable-gui` | PASS |
| `node --test tests/unit/check-explorable-gui.test.mjs` | PASS, 5 tests at BPV-04 close (7 tests post-remediation) |
| `npx playwright test tests/features/explorable-gui.spec.js --project=features` | PASS, 8 tests at BPV-04 close (9 tests post-remediation) |
| `npm run test:smoke` + `test:components` + `test:features` | 618 passed, 16 skipped, 25 failed at BPV-04 close (`layout-freeze`, subsequently re-baselined in BPV-05 with operator approval on 2026-11-18 so the full suite passes with 0 failures). |
| `! grep -rnE '\b(confirm|alert|prompt)\(' js/harness src` | PASS |

## DoD-04 closed

`npm run bombadil:lab-smoke -- --time-limit 2m` now exits 0 with zero `quiescence timer` warnings. Two consecutive runs reproduced the result with 3,055 and 3,146 actions and zero property violations. After the last spec change (items 4 and 5 below), four more consecutive runs of the DoD command passed with 3,400 to 3,449 actions each, no warning of any kind and no violation.

The earlier run logged 12 warnings because several problems stack. That run also used a `dist/` built before the test ids landed, so every fingerprint had a null `testId` and the first filter could not have matched anything.

1. `export * from "@antithesishq/bombadil/browser/defaults"` re-exported the unfiltered `defaultActions` next to the filtered `actions` export. Bombadil registers every exported `ActionGenerator`, so the unfiltered clicks ran alongside the filter. The spec now re-exports only `browser/defaults/properties`.
2. Fingerprint filtering cannot see a control inside the target iframe: Bombadil reports iframe-relative coordinates for those controls, so a click lands on whatever the lab page shows at that point. The filter now drops click points that fall inside the bounding rectangle of a skipped control, a skipped anchor, or an off-target chip. `Reload` is dropped as well because the driver's quiescence check races the navigation it starts.

3. The stall itself is a new tab. Bombadil's quiescence check awaits `requestAnimationFrame`. Pop Out and the Mission Control link (`target="_blank"`) open a tab, the lab tab stops receiving frames, and every later check times out after 10 seconds. A Playwright probe confirmed that the point Bombadil used for the framed "New Text" button, (836.9, 26), lies on the Mission Control link and opens `/app.html` in a new tab.
4. With the stall gone the run found a product defect. `.toolbar-btn { display: inline-flex }` outranked the browser's `[hidden]` rule, so the ribbon's Pause, Resume and Stop buttons were visible and clickable in `IDLE`. Pressing Pause threw an uncaught `InvalidTransitionError`. `public/css/responsive-lab.css` now carries `[hidden] { display: none !important; }`, and `tests/features/explorable-gui.spec.js` gains a test that failed before the rule and passes after it (8 tests in that file).
5. `/app.html` in the frame fails `noConsoleErrors`. When a target switch aborts its startup fetch, `public/js/ViewManager.js:35` logs "Initialization failed: TypeError: Failed to fetch". Two of two runs that booted on `/app.html` failed this way. The page is `boundary` in the scope file, so the defect is recorded here and not fixed in this sprint.

The run stays on the SPA fixture. `[data-testid^="target-chip-"]` is skipped except the SPA chip, and the app.html selector inside the workflow is skipped. Links that leave the lab page are skipped too, so the run does not wander into the portal or the Docs Index. That matches the scope file, which puts `/app.html` and external targets outside the exploration boundary.

## Default target made effective

Decision row BPV-01 "default target" says the lab defaults to the SPA fixture, but `app-config.json` still set `defaultTargetId` to `local-ui-app`, so the lab booted on `/app.html` at runtime. The operator approved the switch on 2026-11-17 and `defaultTargetId` is now `spa-test-target`.

| Change | Detail |
| --- | --- |
| `tests/features/presentation-lattice.spec.js:286` | Expects the frame `src` to be the SPA fixture. |
| `tests/features/responsive-capture.spec.js:364` | Recover returns the selector to the SPA fixture. |
| `tests/features/spa-test-workbench.spec.js:38` | The workflow starts as `spa`. The test then selects `app.html` so the `webapp` classification stays covered. |
| `tests/features/spa-failure-recovery.spec.js:83` | Load Target now reloads a frame that already shows the fixture, so the test waits for a new boot nonce before it reads one. It passed 4 times in a row. |
| `tests/bombadil/lab-smoke.bombadil.ts`, `scripts/bombadil/run.mjs` | The `?target=` start URL and the skip on the two recover buttons are removed. Both only existed to keep `/app.html` out of the frame. |

With the new default, three more consecutive runs of the DoD command passed with 3,669 to 3,722 actions each, no warning, no violation and no state on `/app.html`.

Not changed: `src/islands/SpaTestWorkflow.jsx:22` still seeds its placeholder state with `app.html` until the toolbar reports the real target.

Evidence: `bombadil-output/lab-smoke.log` and the `bombadil-output/lab-smoke-2026-11-17T13-2*` trace directories on the machine that ran them. `bombadil-output/` is ignored by git, so the logs are not committed. `/tmp/labfix1.log` and `/tmp/labfix2.log` hold the two earlier runs.
