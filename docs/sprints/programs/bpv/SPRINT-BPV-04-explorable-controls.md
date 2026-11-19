# SPRINT-BPV-04 Explorable controls

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-BPV-04` |
| Handle | `urn:pcard:sprint:SPRINT-BPV-04` |
| Status | `COMPLETED` |
| Depends on | `SPRINT-BPV-03` |
| Unblocks | `SPRINT-BPV-05` |
| Execution unit | `PR-BPV-04` |
| Poteto playbook | `feature` with `principle-experience-first`, `principle-encode-lessons-in-structure` and `principle-migrate-callers-then-delete-legacy-apis` |
| BMAD roles | UX Designer, Developer, TEA, Product Manager |
| Effort | 3 days (guess) |

## Outcome

Every control on an in-scope page is a real semantic element with a test id. Its state is exposed through ARIA, and its side effect is declared. Bombadil can reach every control, knows which ones to leave alone and never stalls on a popup. Users get controls that work from the keyboard, one control per job, labels that do not collide, and a confirmation step that a page can show instead of a native dialog.

The pre-program spike measured what is at stake. One `window.open` popup stalls a run for the rest of its time budget. `window.confirm` is accepted automatically, so random clicks really delete device presets. Clicks never reach elements whose only signal is a CSS class.

## Work sequence

1. Run GitNexus `impact` upstream on `triggerRibbonButton` in `src/islands/SpaTestWorkflow.jsx` and on the preset delete handler in `js/harness/device-presets-ui.js`. Record the blast radius in the PR.
2. Write the lever first. `scripts/check-explorable-gui.mjs` scans `src/islands`, `src/pages` (`!= app.astro`) and `js/harness` and fails on any of these.
   - A `button`, `a`, `input`, `select` or `textarea` without `data-testid` in an island (`island-control-without-testid`) or in an in-scope `.astro` page (`page-control-without-testid`).
   - A call to `confirm(`, `alert(` or `prompt(`.
   - An `onclick` attribute on an element that is not a button, link or input.
   - A `data-effect` value outside the taxonomy in the [program plan](./bpv-plan.md#page-state-contract), or a `data-effect` element without `data-testid`.
   Run `npm run check:explorable-gui` against the tree and drive its failure count to zero (no separate lint baseline file is committed).
3. Add test ids to the interactive elements of `src/islands/DevicePresetsIsland.jsx`, `src/islands/RecordingRibbonIsland.jsx` and `src/islands/ViewportStageIsland.jsx`, and to the roots of `src/islands/ConformancePanelIsland.jsx` and `src/islands/MCardResultIsland.jsx`. Keep existing ids, because 18 test references use `#btn-rec-start` alone.
4. Tag every control with a side effect. The measured list follows. The plan's contract table says which effects specs skip and which they explore.
   - `external` for the lab's Pop Out button. BPV-01 removed the only other `window.open` on an in-scope page.
   - `download` for the Recording Ribbon's JSON download and the downloads in `js/renderers/VideoRenderer.js` and `js/renderers/AudioRenderer.js`.
   - `persist` for the Recording Ribbon's Stop button, which posts the run to `/api/test-runs`, and for "Stop and Save MCard", Layer 4 session start and request replay in `src/islands/SpaTestWorkflow.jsx`. These are explored against the temporary database, so the recorder can reach `FINALIZED` during a run.
   - `destructive` for the preset reset button in `src/pages/responsive-lab.astro`, and for the confirm button of the preset delete dialog from step 5.
   - `navigate` for `#btn-nav-mission-control`, which leads to the boundary page `/app.html`.
5. Replace the `window.confirm` in `js/harness/device-presets-ui.js` with an in-page `<dialog>`. The delete button that opens it carries no effect. Only the dialog's confirm button carries `data-effect="destructive"`, so Bombadil explores opening and cancelling the dialog but never deletes.
6. Make state visible to assistive technology and to Bombadil. Add `aria-pressed` to the arrangement, orientation and preset toggles in `js/harness/viewport-stage.js` and `js/harness/device-presets-ui.js`. Show and hide the ribbon's buttons with the `hidden` attribute instead of inline `display`. Remove the click handler on the `#responsive-ui-lab-card` element in `src/pages/index.astro`, because its anchor already links to the lab.
7. Merge duplicates, migrating their callers in the same change.
   - Keep one arrangement toggle. The header copy in `src/pages/responsive-lab.astro` and the dock copy in `src/islands/DevicePresetsIsland.jsx` do the same thing.
   - Keep the Recording Ribbon as the one recorder control. Remove the workflow's proxy buttons `workflow-rec-start` and `workflow-rec-stop` and `triggerRibbonButton`, and point step 5 at the ribbon. Four test files use the proxies.
   - Relabel the arrangement options "Sidebar" and "Stacked" and the orientation options "Portrait" and "Landscape". "Vertical" means both today. Two test files match the old label.
8. Write `tests/bombadil/lab-smoke.bombadil.ts`. It re-exports `@antithesishq/bombadil/browser/defaults/properties`, extracts `skippedRects` bounding boxes from skipped-effect controls (`[data-effect]`, `a[target="_blank"]`, off-page links, non-SPA target chips, and `workflow-select-app-html`), and drops `Reload` plus clicks overlapping those rectangles (bounding-rect filtering per BPV-D03/D06 because Bombadil 0.7.10 reports iframe-relative coordinates). A two-minute run of the lab must log no `quiescence timer` warning, the stall marker BPV-00 confirmed.
9. Run GitNexus `detect_changes` before committing and confirm that only the expected symbols and flows changed.

## Files

- Create `scripts/check-explorable-gui.mjs`
- Create `tests/unit/check-explorable-gui.test.mjs`
- Create `tests/features/explorable-gui.spec.js`
- Create `tests/bombadil/lab-smoke.bombadil.ts`
- Edit `src/islands/DevicePresetsIsland.jsx`
- Edit `src/islands/RecordingRibbonIsland.jsx`
- Edit `src/islands/ViewportStageIsland.jsx`
- Edit `src/islands/ConformancePanelIsland.jsx`
- Edit `src/islands/MCardResultIsland.jsx`
- Edit `src/islands/SpaTestWorkflow.jsx`
- Edit `src/pages/responsive-lab.astro`
- Edit `src/pages/index.astro`
- Edit `js/harness/device-presets-ui.js`
- Edit `js/harness/viewport-stage.js`
- Edit `js/harness/lab-toolbar.js`
- Edit `js/renderers/VideoRenderer.js`
- Edit `js/renderers/AudioRenderer.js`
- Edit `package.json` to add `check:explorable-gui` and `bombadil:lab-smoke`
- Edit the Playwright specs that use the merged controls or the old labels

## BMAD responsibilities

### UX Designer

- Own the merges and the relabel, and check the result at desktop and phone widths.
- Design the preset delete dialog so that it names the preset and offers cancel as the default.

### Developer

- Land `scripts/check-explorable-gui.mjs` before the GUI fixes so later changes drive the violation count down to zero (`npm run check:explorable-gui`).
- Migrate each caller in the same commit as the change it depends on.

### TEA

- Confirm that no Playwright spec lost an assertion during the migrations.
- Run the lab smoke spec and attach its log to the PR.

### Product Manager

- Approve removing the workflow's recorder proxies, because it changes the guided workflow's step 5.

## Acceptance criteria

- The lint passes on the whole tree and its unit test proves each rule catches a seeded violation.
- Every in-scope page passes the runtime check. Every visible interactive element has a test id, every toggle exposes `aria-pressed`, and no non-semantic element has a click handler.
- No native dialog remains in the in-scope pages and harness.
- One control exists per job for arrangement and for recording.
- A two-minute Bombadil run of the lab logs no quiescence timeout.
- The existing Playwright projects pass.

## Test design

- `tests/unit/check-explorable-gui.test.mjs` feeds the lint one seeded fixture per rule.
- `tests/features/explorable-gui.spec.js` loads each in-scope page and runs the runtime checks through the DOM, including controls that scripts create after load.

## Non-goals

- `/app.html`, which stays a boundary. Its hidden file input, game popups and card delete are out of scope.
- Visual restyling beyond what the merges and labels need.
- Excluding controls by hiding them while Bombadil runs.

## Definition of done

- [x] **DoD-BPV-04-01** The lint passes on the tree and catches each seeded violation. Verified by `npm run check:explorable-gui && node --test tests/unit/check-explorable-gui.test.mjs`.
- [x] **DoD-BPV-04-02** Every in-scope page passes the runtime explorability check. Verified by `npx playwright test tests/features/explorable-gui.spec.js --project=features`.
- [x] **DoD-BPV-04-03** No native dialog remains in the harness and pages. Verified by `! grep -rnE '\b(confirm|alert|prompt)\(' js/harness src`.
- [x] **DoD-BPV-04-04** A two-minute lab run logs no quiescence timeout. Verified by `mkdir -p bombadil-output && npm run bombadil:lab-smoke -- --time-limit 2m > bombadil-output/lab-smoke.log 2>&1 && ! grep -q 'quiescence timer' bombadil-output/lab-smoke.log`.
- [x] **DoD-BPV-04-05** The Playwright projects show no failure beyond the BPV-00 baseline after the merges and relabels. Verified by `npm run test:smoke && npm run test:components && npm run test:features`.
