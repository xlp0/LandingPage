# SPRINT-DCI-04 Refusal reasons and native dialogs

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-04` |
| Source of Truth | [`./dci-plan.md`](./dci-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-DCI-04` |
| Status | `PLANNED` |
| Depends on | `SPRINT-DCI-03` |
| Unblocks | `SPRINT-DCI-05` |
| Execution unit | `PR-DCI-04` |
| Decision Ref | `DCI-D03`, `DCI-D07`, `DCI-D08` |
| Poteto playbook | `feature` with `principle-experience-first`, `principle-subtract-before-you-add`, and `principle-sequence-verifiable-units` |
| BMAD roles | UX Designer, Developer, TEA, Tech Writer |
| Effort | `1.5 days (guess)` |

## Outcome

A disabled control on the Lab stage says why, in a sentence that a person can read without hovering or focusing. The two native browser dialogs on the workbench pages give way to elements inside the page.

Today four stage controls go disabled with no stated reason. `syncOrientationControls` in `js/harness/viewport-stage.js` disables Rotate and the two orientation buttons when the selection cannot rotate, and Safe-area when the device declares no insets. `updateUI` in `js/harness/recording-ribbon.js` disables Start when capture is unavailable and puts the reason in a `title`, which a disabled button shows to neither keyboard nor touch.

Two native dialogs remain on the workbench pages (measured). The portal calls `globalThis.prompt` in `js/landing-page-mcard.js` to ask for a URL. The sprint navigator calls `alert` in `js/runtime/least-action-navigator.js` when a lock is refused. The existing lint rule for native dialogs misses both. It does not scan those two paths, and its pattern does not match the `prompt?.(` form.

The controls keep the native `disabled` attribute. Sixteen assertions in the feature specs and the explorer's clickable rule depend on it.

## Work sequence

1. **Widen the lint first.** In `scripts/check-explorable-gui.mjs`:
   - Move the native-dialog loop out of `lintText` into an exported function `lintNativeDialogs(text, { file })`, and call it from `lintText`.
   - Change its pattern to `/\b(?:(?:window|globalThis)\s*\.\s*)?(confirm|alert|prompt)\s*(?:\?\.)?\s*\(/g`.
   - Skip a match when the text before it ends with `function ` followed by spaces, as today. Also skip it when the character before the name is `.` and the object is neither `window` nor `globalThis`, so that a method named `confirm` on another object does not count.
   - Add a constant `NATIVE_DIALOG_ONLY_PATHS` with `js/runtime` and `js/landing-page-mcard.js`. In `lintTree`, run `lintNativeDialogs` alone on each file under those paths. The other rules do not apply there.
   - Add four cases to `tests/unit/check-explorable-gui.test.mjs`: `globalThis.prompt?.(` is flagged, a bare `alert(` is flagged, `store.confirm(` is not, and `function confirm(` is not.

   From this step until step 3, `npm run check:explorable-gui` fails with two violations. Steps 2 and 3 remove them.
2. **Replace the prompt with a dialog in the page.**
   - Add the markup below to `src/pages/index.astro`, after `#main-content`. Add the same markup to the root `index.html`, which is the second document that mounts the portal. The markup is a `<dialog id="open-url-dialog" data-testid="open-url-dialog" aria-labelledby="open-url-title">` that holds a `<form method="dialog" novalidate>` with `<h2 id="open-url-title">Open an external LandingPage</h2>`, `<input type="url" id="open-url-input" data-testid="open-url-input">`, `<p id="open-url-error" data-testid="open-url-error" role="alert" hidden></p>`, `<button type="submit" data-testid="open-url-submit" data-effect="external">Open</button>`, and `<button type="button" data-testid="open-url-cancel">Cancel</button>`.
   - Create `js/ui/open-url-dialog.js`. It exports `requestExternalUrl(dialog, { validate, returnFocusTo })`, which returns a promise. It calls `showModal()`. The `submit` listener always calls `preventDefault()`. When `validate(text)` is `false`, it writes `Enter an http or https URL.` into `#open-url-error`, removes `hidden`, and keeps the dialog open. Otherwise it closes the dialog and resolves with the text. Cancel and Escape close the dialog and resolve with an empty string. After every close it calls `focus()` on `returnFocusTo`.
   - In `js/landing-page-mcard.js`, add an option `requestUrl` to `mountSinglePageMCard`, with a default that resolves to an empty string. In the click handler of `[data-role="open-url"]`, replace the `globalThis.prompt` line with `const input = await requestUrl();`. The file is `243` lines today and a test caps it at `250`, so the change adds at most two lines.
   - In the inline module of `src/pages/index.astro` that calls `mountSinglePageMCard`, and in the matching module of the root `index.html`, pass `requestUrl`. It calls `requestExternalUrl` with the dialog, with `validate` set to `(text) => parseSwitchIntent(text, []).kind === 'url'`, and with `returnFocusTo` set to the element `[data-role="open-url"]`.
   - The existing handler for Cmd or Ctrl with K stays. It clicks the same pill.
   - What happens after a URL is accepted does not change. Both documents pass `onExternalUrl`, so the URL goes to the external-portal membrane and no `PUT` is sent.
3. **Replace the alert with a status line.** In the modal template of `js/runtime/least-action-navigator.js`, add `<p id="least-action-status" data-testid="least-action-status" role="status"></p>` directly before `#lock-direction-btn`. In `lockCurrentDirection`, write the sentence that the `alert` shows today into that element and return. Clear the element in `render`.
4. **Name the reasons.** Create `js/harness/refusal-reasons.js` with no DOM access. It exports two pure functions.
   - `stageRefusals({ kind, rotatable, hasSafeArea })` returns a list of `{ code, controls, sentence }`.

     | Condition | `code` | `controls` | `sentence` |
     | --- | --- | --- | --- |
     | `kind` is `full` | `full-size-has-no-device` | `btn-rotate-viewport`, `btn-orient-vertical`, `btn-orient-horizontal`, `btn-safe-area-toggle` | `Rotate, orientation, and Safe-area need a device. Pick a preset or enter a width and a height.` |
     | `kind` is not `full` and `rotatable` is `false` | `square-size-has-one-orientation` | `btn-rotate-viewport`, `btn-orient-vertical`, `btn-orient-horizontal` | `A square size has one orientation, so Rotate has nothing to change.` |
     | `kind` is not `full` and `hasSafeArea` is `false` | `device-has-no-safe-area` | `btn-safe-area-toggle` | `Safe-area guides need a device that declares insets. Pick a phone preset.` |

     Only the five phone presets declare insets today (measured in `js/device-registry.js`).
   - `recorderRefusal({ sourceKind, sourceReason })` returns `null` unless `sourceKind` is `unavailable`. Then it returns `{ code: 'capture-unavailable', controls: ['btn-rec-start'], sentence }`, where `sentence` is `sourceReason`, or `Recording unavailable` when the reason is empty. That is the fallback the `title` uses today.
5. **Show the stage reasons.** Add `<span id="stage-refusal-hint" data-testid="stage-refusal-hint" hidden></span>` as a second child of the paragraph `#stage-message` that `SPRINT-DCI-03` added to `src/pages/responsive-lab.astro`. In `syncOrientationControls` of `js/harness/viewport-stage.js`, after the two blocks that set `disabled`, call `stageRefusals` with the values that function already holds. Write the sentences, joined by one space, into the span, and set `hidden` when the list is empty. Set `aria-describedby="stage-refusal-hint"` on each control the list names, and remove the attribute from the others.
6. **Show the recorder reason.** In `src/islands/RecordingRibbonIsland.jsx`, add `<span id="rec-start-reason" data-testid="rec-start-reason" hidden></span>` directly after `#btn-rec-start`. In `updateUI` of `js/harness/recording-ribbon.js`, call `recorderRefusal`. Write its sentence into the span, remove `hidden`, and set `aria-describedby="rec-start-reason"` on Start. When the result is `null`, hide the span and remove the attribute. Keep the existing `title`.
7. **Capture layout baselines again** for `index` and `responsive-lab`, with `STY_FREEZE=capture` and `STY_FREEZE_PAGES=index,responsive-lab`, and add a `rebaselines` entry.

## Files

- Create `js/ui/open-url-dialog.js` and `js/harness/refusal-reasons.js`.
- Create `tests/unit/refusal-reasons.test.mjs`.
- Create `tests/features/refusal-reasons-and-dialogs.spec.js`.
- Create `docs/sprints/_active/evidence/DCI-04-refusal-reasons.md`.
- Edit `scripts/check-explorable-gui.mjs` and `tests/unit/check-explorable-gui.test.mjs`.
- Edit `src/pages/index.astro`, `index.html`, `js/landing-page-mcard.js`, and `js/runtime/least-action-navigator.js`.
- Edit `src/pages/responsive-lab.astro`, `js/harness/viewport-stage.js`, `src/islands/RecordingRibbonIsland.jsx`, and `js/harness/recording-ribbon.js`.
- Edit `public/css/responsive-lab.css` for the two reason elements, and `public/css/semantic-tokens.css` for the portal dialog.
- Edit `tests/single-page-mcard.test.mjs`.
- Edit `tests/baselines/layout-baseline.json`.
- Edit `docs/functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md`.
- Edit `docs/sprints/_active/DECISIONS.tsv`, `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/dci-plan.md`, and this sprint file, for the status and the DoD ticks.

## BMAD responsibilities

### UX Designer

- Sign off on the four sentences and on the message line at `358px`.

### Developer

- Verify that no `disabled` assignment was removed, and that `js/landing-page-mcard.js` stays at or under `250` lines.

### TEA

- Verify that the feature spec fails on any `dialog` event from the page.

### Tech Writer

- Add the reason table to `docs/functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md`.

## Acceptance criteria

- With the Full stage selected, `stage-refusal-hint` shows the one sentence for `full-size-has-no-device`, and Rotate and Safe-area both have `aria-describedby="stage-refusal-hint"`.
- With iPhone 16 Pro selected, the hint is hidden and neither control has `aria-describedby`.
- With a tablet or a desktop preset selected, the hint shows the safe-area sentence only.
- With a blocked target loaded, `rec-start-reason` shows the text that the Start `title` holds.
- Every `toBeDisabled` and `toBeEnabled` assertion in `tests/features/` passes with no edit.
- On the portal, Cmd or Ctrl with K opens `open-url-dialog`. Submitting `hello` shows `Enter an http or https URL.` and keeps the dialog open. Cancel closes it and moves focus to the pill.
- A refused lock in the sprint navigator writes its sentence into `least-action-status`.
- No page fires a native `dialog` event in any of these flows.

## Test design

- `tests/unit/refusal-reasons.test.mjs` holds one case per row of the table in step 4, one case with no refusal, and two cases for `recorderRefusal`. Each expected sentence is copied from this file.
- `tests/unit/check-explorable-gui.test.mjs` gains the four cases of step 1.
- `tests/features/refusal-reasons-and-dialogs.spec.js` covers the acceptance criteria. It is the only test of the open-URL flow. It stubs `**/api/mcard/probe-url*` with `page.route`, so an accepted URL sends no request outside the test. For the navigator it imports `/js/runtime/least-action-navigator.js` in the page, opens the first entry of `CANDIDATE_SPRINT_DIRECTIONS` whose `isRealAction` is `false`, and clicks `#lock-direction-btn`.
- `tests/single-page-mcard.test.mjs` gains one case for the `requestUrl` option. Its `250` line check and its check that `index.html` loads the controller stay.

## Non-goals

- An action table, `aria-disabled`, and a command bar. The first draft planned all three. The review found that they changed sixteen assertions and the explorer's clickable rule to serve work that is now in the backlog.
- Reasons for `disabled` attributes inside `src/islands/BombadilDashboardIsland.jsx`, `src/islands/SpaTestWorkflow.jsx`, and `src/islands/PkcCardIsland.jsx`. The backlog holds them.
- Native dialog calls in modules that no workbench page loads, such as `js/renderers/CLMRenderer.js` and `js/modules/video-meeting/video-meeting.js`.
- The other rules of the lint on `js/runtime`. Only the native-dialog rule runs there.

## Definition of done

- [ ] **DoD-DCI-04-01.** The lint is widened, flags the optional-call form, and passes on the tree. Verified by `grep -q "NATIVE_DIALOG_ONLY_PATHS" scripts/check-explorable-gui.mjs && node -e "import('./scripts/check-explorable-gui.mjs').then((m) => process.exit(m.lintNativeDialogs('globalThis.prompt?.(1)', { file: 'x.js' }).length === 1 ? 0 : 1))" && node --test tests/unit/check-explorable-gui.test.mjs && npm run check:explorable-gui`.
- [ ] **DoD-DCI-04-02.** Each refusal condition yields its code, its controls, and its sentence. Verified by `node --test tests/unit/refusal-reasons.test.mjs`.
- [ ] **DoD-DCI-04-03.** The Lab shows the stated reasons, the portal and the navigator use page elements, and no native dialog fires. Verified by `npx playwright test tests/features/refusal-reasons-and-dialogs.spec.js --project=features`.
- [ ] **DoD-DCI-04-04.** The portal contract tests, the smoke specs, and every feature spec pass, and the layout holds at four widths. Verified by `node --test tests/single-page-mcard.test.mjs && npm run test:smoke && npm run test:features && npm run stageshow:sweep -- --strict`.
- [ ] **DoD-DCI-04-05.** Evidence and the completion row are recorded with the remaining core gates green. Verified by `test -s docs/sprints/_active/evidence/DCI-04-refusal-reasons.md && grep -qE $'\tDCI-04-complete\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run build && npm run test:unit`.
