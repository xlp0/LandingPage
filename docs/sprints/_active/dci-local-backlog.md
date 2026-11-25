# Program DCI local backlog

| Field | Value |
| --- | --- |
| Audience | Operator, Product Manager, UX Designer, Architect, and TEA |
| BMAD Owner | Product Manager |
| Source of Truth | [`./dci-plan.md`](./dci-plan.md), [`./evidence/DCI-pre-program-study.md`](./evidence/DCI-pre-program-study.md), and [`./evidence/DCI-egm-review.md`](./evidence/DCI-egm-review.md) |
| Status | `HELD` (five candidates and one to-do list, none scheduled) |

## What this file is

The study notes on Dragology and on declarative programming suggest more UI work than Program DCI schedules. This file holds that work. Each candidate states what it is, the evidence for it, why it waits, and the condition that would bring it into a sprint.

The first draft of the plan scheduled candidates 2, 3, and 4 as sprints. The EGM review found no named user for any of them, and found that a drag-spec evaluator already exists in the working tree. The record is in [`./evidence/DCI-egm-review.md`](./evidence/DCI-egm-review.md).

Every candidate that previews a drag calls the evaluator that `PKC-06` ships. Today that is `previewDragSpec` in `js/harness/pkc-dragology-preview.js`. The open `DoD-PKC-06-03` may replace it with a published package. None builds a second evaluator (`DCI-D02`).

## Candidate 1. The island's committed intent changes the stage

**What.** The `PKC-06` island lets a person pick one of three width slots (`slot-compact` at `320`, `slot-tablet` at `768`, `slot-desktop` at `1280`) by click or by arrow key, and commit the pick. The commit would set the stage to that width.

**Evidence.** `src/pages/responsive-lab.astro` mounts `<PkcCardIsland client:visible />` with no props. `commitPreviewSelection` in `src/islands/PkcCardIsland.jsx` calls `onCommitIntent` only when a function was passed. So a commit today changes the island's own status text and nothing else (read from the code on `2026-11-24`).

**Why it waits.** The island belongs to parent sprint `PKC-06`, whose LandingPage part was still changing on `2026-11-24`. Only its owner can say what a slot commit should mean for the stage.

**Entry condition.** `DoD-PKC-06-03` is ticked in the parent, and its owner states the intended effect of a slot commit.

**Sketch.** The island emits its `candidateIntent` as a DOM event. `js/harness/lab-runtime.js` handles the event with the stage function that the size inputs already call. That gives one release and one request along an existing path, which is Rule 4 of the notes.

## Candidate 2. A command line as a third input path

**What.** One text field in the Lab. A person types a target id, reads the preview state, and presses Enter to commit.

**Evidence.** `previewDragSpec` already accepts `selectedTargetId` and `modality` in its input, and returns the same `candidateIntent` for pointer and keyboard. The notes say an input adapter for keyboard, voice, or an agent can walk the same declared target set as a pointer. The portal already binds Cmd or Ctrl with K to a text entry.

**Why it waits.** No tester has asked for it. `window.__lab` already gives scripts the same control. The first draft's version had ten verbs, a parser, completions, and a log, and the review judged it a product surface with no named user.

**Entry condition.** A named user need, such as a tester who drives the Lab by keyboard only, or an agent that drives it by text. Candidate 1 is in place, so a commit has an effect.

**Sketch.** No grammar beyond the target id. The field calls `previewDragSpec` on each change and shows `candidate`, `ambiguous`, or `blocked`. Enter commits the intent that the island would commit. It calls no model.

## Candidate 3. Gesture capture and replay for framed targets

**What.** The recorder keeps a pointer drag inside a framed target as one gesture event, and the replay driver plays it back.

**Evidence.** A spike on `2026-11-24` showed that capture listeners on a same-origin target document receive `pointerdown`, `pointermove`, and `pointerup`. The recorder listens for `click`, `keydown`, `input`, and `scroll` only, in `js/harness/capture-same-origin.js`. Its buffer holds `2048` events.

**Why it waits.** No framed target with a real pointer drag exists today. The `PKC-06` island sits in the Lab's own document and takes clicks and keys, so frame capture would not see it. The parent sprint asks the Lab for no gesture record.

**Entry condition.** A framed target that drags exists, for example a Studio route loaded as the `mcard-studio-5320` Lab target, and the parent names a viewport test that needs a recorded drag.

**Known work, from the review.** `buildTestRun` in `js/harness/recorder.js` copies a fixed list of event fields and would drop a gesture's path. The replay driver needs rules for the click that follows a drag, for a cancelled drag, and for timing. A new fixture needs a row in `tests/gui-coverage.json` and a row in `tests/bombadil/scope.json`. One gesture should be one event with a bounded number of points.

## Candidate 4. A preset rail that previews before it commits

**What.** A row of device presets above the stage. A person scrubs along it and sees each device outline over the stage. Release commits one preset. The first draft scheduled this as `SPRINT-DCI-07`, the stage resize drag pilot.

**Evidence.** Each click on a preset commits today. It resizes the target and adds a `viewport_change` event to a running recording. A person who compares five sizes commits five times.

**Why it waits.** The preset list is already a radiogroup whose arrow keys move and apply the selection. The rail would be a second control for the same choices. The notes record that no user has asked for a drag.

**Entry condition.** A tester asks for a way to compare sizes without a commit for each one. Then a standalone spike outside the repository records three observations. The operator and two others finish a sizing task faster with the rail than with the list, and none commits a size by mistake. The first outline appears within `50 ms` of the press. No two presets sit closer than the handle width at the `tablet` and `desktop` tiers.

**Sketch.** The rail's spec is `closest` over the presets on one axis, evaluated by `previewDragSpec`. `DEFAULT_LAB_DRAG_SPEC` already declares three width slots in that shape. A tie returns `ambiguous` and commits nothing.

## Small cleanups

This section is a to-do list. Its items have no entry condition. Each is small, and none changes what a person can do.

- **One write path for the device list.** `js/device-registry.js` writes `pkc_responsive_lab_devices_v1` beside the current key. `tests/features/responsive-rotation-and-devices.spec.js` still reads the old key, so the spec moves to the current key in the same change.
- **Reasons inside islands.** `disabled` attributes in `src/islands/BombadilDashboardIsland.jsx`, `src/islands/SpaTestWorkflow.jsx`, and `src/islands/PkcCardIsland.jsx` give no reason. `SPRINT-DCI-04` covers the stage toolbar and the recording ribbon only.
- **A way back from the docs index.** `/pkc-docs-index.html` has no link to the portal. The file is a static legacy page in the parent retirement ledger. The net declares an arc back, `t_link_docs_to_index`, for a Penpot flow that the page does not render.
- **One first-visit theme.** The Fiber Inspector passes `dataTheme="light"` to its layout. The Lab and the registry pass `dark`. The portal passes none and follows the system preference.
- **Penpot as the source of the nav.** The generated `js/nav.js` mounts on the portal only. Making it the source for all four pages needs two more frames and a mount on three pages.

## Candidate 5. A graph of adjacent objects

**What.** The newest study note, dated `2026-11-24`, asks for a network-style view in which every object is both a node and a link, built with Dragology.

**Why it waits.** The note gives a visual style and a goal. It gives no state model, no candidate set, and no relation to an existing page.

**Entry condition.** A written state model that says what a node is, what an edge is, and which moves a person can make from one node.
