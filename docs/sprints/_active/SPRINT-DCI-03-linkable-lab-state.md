# SPRINT-DCI-03 Linkable Lab state

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-03` |
| Source of Truth | [`./dci-plan.md`](./dci-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-DCI-03` |
| Status | `PLANNED` |
| Depends on | `SPRINT-DCI-02` |
| Unblocks | `SPRINT-DCI-04` |
| Execution unit | `PR-DCI-03` |
| Decision Ref | `DCI-D05`, `DCI-D06` |
| Poteto playbook | `feature` with `principle-model-the-domain`, `principle-boundary-discipline`, and `principle-test-behavior-not-implementation` |
| BMAD roles | UX Designer, Architect, Developer, TEA, Tech Writer |
| Effort | `2 days (guess)` |

## Outcome

A Lab configuration becomes a URL. A tester picks a device, an orientation, and a mode, copies the address, and a colleague opens the same Lab. Evidence files can link to the exact view they describe.

Today the Lab keeps one value in the URL. `js/harness/lab-toolbar.js` reads the `target` parameter at boot and writes it when a target is applied. A reload resets the device, the size, the orientation, and the mode (measured).

This sprint adds five parameters beside `target`. It does not change how `target` is read, written, or approved.

## Work sequence

1. **Name the data shape.** Create `js/harness/lab-url-state.js` with no DOM access. It defines one shape, `LabUrlState`, with five optional fields: `device`, `w`, `h`, `orientation`, and `mode`. An issue has the shape `{ param, value, reason }`. The module exports five pure functions.
   - `parseLabUrlState(search, { deviceIds, modes })` returns `{ state, issues }`. `state` holds only the fields that parsed. It does not check whether a selection can rotate.
   - `orientationIssue(geometry)` returns the issue `{ param: 'orientation', value, reason: 'orientation-fixed' }` when `geometry.rotatable` is `false`, and `null` otherwise.
   - `labUrlStateFromGeometry(geometry, mode, isBuiltin)` builds a `LabUrlState` from the object that `stage.getGeometry()` returns. A geometry of kind `full` and the mode `explore` are the defaults and produce no field. A built-in preset produces `device`. A custom size and a custom device both produce `w` and `h`, because a custom device id exists in one browser only. `orientation` is present only when `geometry.rotatable` is `true`.
   - `mergeLabUrlState(search, state)` builds a `URLSearchParams` from `search`, deletes the five parameters this module owns, sets each field of `state` in the order `device`, `w`, `h`, `orientation`, `mode`, and returns `'?' + params.toString()`, or an empty string when no parameter remains. Every other parameter, such as `target` and `display_mode`, stays.
   - `issueSentence(issue)` returns the sentence for an issue.
2. **Fix the parameters and the reasons.**

   | Parameter | Accepted values | Reason when rejected |
   | --- | --- | --- |
   | `device` | A built-in device id, or `full` | `unknown-value` |
   | `w` and `h` | Whole numbers from `DIM_MIN` to `DIM_MAX` of `js/harness/viewport-geometry.js` | `size-invalid` when one is missing, not a whole number, or out of range. `size-ignored` when `device` is also present |
   | `orientation` | `portrait` or `landscape` | `unknown-value`. `orientation-fixed` comes from `orientationIssue` |
   | `mode` | `explore`, `guided-spa`, `bombadil`, or `verify` | `unknown-value` |

   A size issue uses `param: 'w'` and the value `<w>x<h>`. The four sentences are fixed.

   | Reason | Sentence |
   | --- | --- |
   | `unknown-value` | `Ignored <param> "<value>". It is not an accepted value.` |
   | `size-invalid` | `Ignored the size "<value>". A link needs whole numbers for both w and h, each from 100 to 7680.` |
   | `size-ignored` | `Ignored w and h. The link also names a device.` |
   | `orientation-fixed` | `Ignored the orientation. The selected size has one orientation.` |

3. **Apply the state once, when boot ends.** In `markBootParticipant` of `js/harness/lab-runtime.js`, directly after `bootFinished = true` and the call to `syncLabApi()`, parse `window.location.search` and apply each field in this order.
   - `device`: `stage.selectDevicePreset(id, 'boot-param')`, or `stage.selectFullViewport('boot-param')` for `full`.
   - `w` and `h`: `stage.setViewportSize(w, h, 'px', '', null, 'boot-param')`.
   - `orientation`: call `orientationIssue(stage.getGeometry())`. When it returns `null`, call `stage.setOrientation(value, 'boot-param')`. Otherwise add the issue to the list.
   - `mode`: `setWorkbenchMode(value)`.
4. **Report what was ignored.** Add this element to `.stage-toolbar-readout` in `src/pages/responsive-lab.astro`: `<p id="stage-message" data-testid="stage-message" role="status"><span id="lab-url-state-notice" data-testid="lab-url-state-notice" hidden></span></p>`. When the list of issues is not empty, write the sentences into the span, joined by one space, and remove `hidden`. Hide the span again on the first write of step 5. The paragraph has no padding and no minimum height, so it takes no space while its span is hidden. `SPRINT-DCI-04` adds a second span to the same paragraph.
5. **Write the state back after a user commit.** Export the existing set `RECORDED_VIEWPORT_CAUSES` from `js/harness/recorder.js`. It holds `preset`, `custom`, and `rotate`. After step 3 has run, add two listeners in `js/harness/lab-runtime.js` and register their removal in `runtimeCleanups`.
   - A listener for `lab:viewport-change` that acts only when `detail.cause` is in `RECORDED_VIEWPORT_CAUSES`. Resize observations, scale changes, and boot do nothing.
   - A listener for `lab:workbench-mode-change`. Every path that changes the mode dispatches it. The paths are a tab click, an arrow key on the tab list, the Bombadil pill, and the saved-run link.

   Both call one writer. The writer computes `merged` with `mergeLabUrlState(location.search, state)`. It skips the call when `merged` equals `'?' + new URLSearchParams(location.search).toString()`. Otherwise it calls `history.replaceState(history.state, '', location.pathname + merged + location.hash)` inside `try` and `catch`, as the two `target` writers in `js/harness/lab-toolbar.js` do.
6. **Add the copy control.** Add `<button type="button" id="btn-copy-lab-link" data-testid="btn-copy-lab-link">Copy link</button>` to `.stage-toolbar-actions`. It follows the copy button in `js/harness/recording-ribbon.js`. It calls `navigator.clipboard?.writeText(window.location.href)`, sets its label to `Link copied`, and sets it back after `1500 ms`. The address bar is the link, because step 5 writes on every user commit.
7. **Keep the explorer away from the clipboard.** Add `[data-testid="btn-copy-lab-link"]` to `SKIPPED_SELECTOR` in `tests/bombadil/workbench.bombadil.ts` and `tests/bombadil/lab-smoke.bombadil.ts`.
8. **Update the stored-state table.** In `docs/01-architecture/astro-host-and-islands.md`, move the Lab device, size, orientation, and mode from the Memory row to a URL row. The arrangement, the scale mode, and the safe-area flag stay in the Memory row. They describe one person's screen.
9. **Capture the Lab layout baseline again** with `STY_FREEZE=capture` and `STY_FREEZE_PAGES=responsive-lab`, and add a `rebaselines` entry.

## Files

- Create `js/harness/lab-url-state.js`.
- Create `tests/unit/lab-url-state.test.mjs`.
- Create `tests/features/lab-url-state.spec.js`.
- Create `docs/sprints/_active/evidence/DCI-03-linkable-lab-state.md`.
- Edit `js/harness/lab-runtime.js`, `js/harness/recorder.js`, and `src/pages/responsive-lab.astro`.
- Edit `public/css/responsive-lab.css` for the message line and the button.
- Edit `tests/bombadil/workbench.bombadil.ts` and `tests/bombadil/lab-smoke.bombadil.ts`.
- Edit `tests/baselines/layout-baseline.json`.
- Edit `docs/01-architecture/astro-host-and-islands.md` and `docs/functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md`.
- Edit `docs/sprints/_active/DECISIONS.tsv`, `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/dci-plan.md`, and this sprint file, for the status and the DoD ticks.

## BMAD responsibilities

### UX Designer

- Sign off on the four sentences and on the place of the copy button at `358px`.

### Architect

- Verify that the write-back uses `history.replaceState` only, adds no navigation, and adds no net Transition.

### Developer

- Verify that every field is applied through an existing stage or mode function, and that `js/harness/lab-url-state.js` imports nothing from the DOM.

### TEA

- Verify the round trip at each of the `12` built-in presets, in both orientations.

### Tech Writer

- Document the parameter table and one example link.

## Acceptance criteria

- Opening `/responsive-lab.html?device=iphone-16-pro&orientation=landscape&mode=verify` shows the iPhone 16 Pro preset in landscape with the Verify tab selected.
- Selecting another built-in preset changes the `device` parameter in the address bar without a navigation.
- Selecting a custom device writes `w` and `h` and no `device`.
- Moving to another mode tab with the arrow keys changes the `mode` parameter.
- A link that carries `target` and `display_mode` keeps both after any number of preset changes.
- Resizing the browser window `20` times changes neither the address bar nor `history.length`.
- Reloading the page keeps the device, the orientation, and the mode.
- A bad value shows its sentence in `lab-url-state-notice`, and the Lab still loads with the default for that field.
- One press of Back leaves the Lab, however many presets were selected.
- The copy button puts the address on the clipboard.

## Test design

- `tests/unit/lab-url-state.test.mjs` covers each parameter, each of the four reasons, `orientationIssue` for both results, the rule that `device` wins over a size, the custom device case, a merge that keeps `target` and `display_mode`, and a parse of every state that `labUrlStateFromGeometry` can produce.
- `tests/features/lab-url-state.spec.js` covers the acceptance criteria, with clipboard permission granted in the browser context.
- The whole features project runs. `tests/features/responsive-lab-islands.spec.js` depends on the `display_mode` parameter. `tests/features/explorable-gui.spec.js` requires every `hidden` element on the Lab to compute `display: none`, so the new CSS must not set `display` on the hidden span.

## Non-goals

- Any change to `target`. Its two writers in `js/harness/lab-toolbar.js` and its membrane policy stay as they are. A target id is not accepted in place of a URL, because the membrane resolves the value as a URL.
- Carrying the arrangement, the scale mode, or the safe-area toggle.
- Carrying recorder state, Bombadil run state, or the selection in the `PKC-06` island.
- A fallback for a browser that refuses clipboard access. The address bar holds the same link.
- Short links or a server-side store.

## Definition of done

- [ ] **DoD-DCI-03-01.** Every state the Lab can produce parses back to itself, every invalid value yields its reason, and foreign parameters survive a merge. Verified by `node --test tests/unit/lab-url-state.test.mjs`.
- [ ] **DoD-DCI-03-02.** A Lab link restores the device, the orientation, and the mode, a reload keeps them, and window resizes write nothing. Verified by `npx playwright test tests/features/lab-url-state.spec.js --project=features`.
- [ ] **DoD-DCI-03-03.** Every feature spec passes. Verified by `npm run test:features`.
- [ ] **DoD-DCI-03-04.** The layout holds at four widths against the new baseline. Verified by `npm run stageshow:sweep -- --strict`.
- [ ] **DoD-DCI-03-05.** Evidence and the completion row are recorded with the remaining core gates green. Verified by `test -s docs/sprints/_active/evidence/DCI-03-linkable-lab-state.md && grep -qE $'\tDCI-03-complete\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run build && npm run test:unit && npm run test:smoke`.
