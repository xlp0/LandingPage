# Program DCI pre-program study

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, UX designers, architects, developers, and TEA engineers |
| BMAD Owner | Product Manager with Architect, UX Designer, and TEA |
| Source of Truth | [`../dci-plan.md`](../dci-plan.md) and [`../DECISIONS.tsv`](../DECISIONS.tsv) |
| Consensus Kernel | `clm-kernel@0.0.26` in the working tree |
| Study date | `2026-11-24` |

## What this file records

This file holds the evidence that Program DCI rests on. Every claim is labeled measured, stated, or inferred. A measured claim names the command or the page that produced it. A stated claim names the note or the parent file that says it. An inferred claim is the planner's reading and can be wrong.

Three isolated study agents and one live browser session produced the material on `2026-11-24`. The agents read the operator's study notes, the parent repository, and this repository. They shared no conversation. The planner then checked the load-bearing claims against the code and the running app.

## Measured baseline of the live UI

The app ran from `npm run dev` on a local machine. The planner drove a Chromium tab at `1440` by `900`.

| Observation | Value | How it was measured |
| --- | --- | --- |
| Pointer, mouse, touch, and drag listeners in six code roots | `0` | `grep` for `addEventListener` with pointer, mouse, touch, drag, and drop event names over `src`, `js/harness`, `js/runtime`, `js/ui`, `js/device-registry.js`, and `js/landing-page-mcard.js`. The count holds for these roots only. The portal also loads `public/stageshow/workbench-bombadil-pair/scene.js`, which has `pointerenter` and `pointerleave` listeners |
| Native dialogs in the same roots | `2` | `globalThis.prompt` at `js/landing-page-mcard.js:226` and `alert` at `js/runtime/least-action-navigator.js:539` |
| Storage write sites in the same roots | `7` in `3` files | `js/device-registry.js` has `4`, `js/runtime/presentation-controller.js` has `2`, `js/harness/page-state.js` has `1` |
| Stored keys | `5` | `govtech_display_theme`, `govtech_power_mode`, `gqc:page-state:last`, `pkc_responsive_lab_devices_v2`, `pkc_responsive_lab_devices_v1` |
| Assignments to the `disabled` property in the same roots | `4` in `2` files | `js/harness/viewport-stage.js:258` and `:274`, `js/harness/recording-ribbon.js:67` and `:70` |
| Control groups that refuse with no reachable reason | `3` | Read from the same lines. Safe-area and the rotate group give no reason. Start recording gives one in a `title` only, and a button with the `disabled` attribute cannot take focus |
| `disabled` attributes in markup under `src` | `15` | `6` in `BombadilDashboardIsland.jsx`, `4` in `SpaTestWorkflow.jsx`, `2` in `DevicePresetsIsland.jsx`, `2` in `responsive-lab.astro`, and `1` in `PkcCardIsland.jsx`, counted on the tree of `22:59` |
| Links on `/sprint-registry.html` | `0` | `document.querySelectorAll('a[href]')` in the live page |
| Links on `/fiber-inspector.html` | `0` | Same query |
| Links on `/fiber-conformance.html` | `0` | Same query |
| Page Places with no `link` Transition in or out | `3` | `src/net/workbench-net.yaml` bindings, kind `link`. The three are `p_page_sprint_registry`, `p_page_fiber_inspector`, and `p_page_fiber_conformance` |
| Sprint cards on the registry page | `335` in one flat grid | Page status line and the registry projection. The page has no filter, no search, and no grouping |
| Registry titles that contain `<` | `0` | A script over the `sprints` list of `clm-registry.yaml`. `170` titles contain `&`, each followed by a space, which renders as plain text. The page writes titles through `innerHTML`, so the path is latent |
| Registry response size | `306,986` bytes | `curl` of `/api/clm/registry`. The `sprints` array is `88%` of it |
| First-visit theme | Dark on the Lab and the registry, light on the Fiber Inspector. The portal declares none and follows the system preference | `data-theme` on `html` with an empty `govtech_display_theme`. `src/pages/fiber-inspector.astro` passes `dataTheme="light"` to the layout at line `5`. The `defaultTheme` prop at line `42` sets only the toggle label |
| Lab state carried in the URL | `target` only | `js/harness/lab-toolbar.js:388-394`. Device, size, orientation, and mode are lost on reload |
| Lab verbs already exposed in one place | `window.__lab` version `1` | `js/harness/lab-api.js`. The groups are `geometry`, `target`, `mode`, `arrangement`, `recorder`, `bombadil`, `workflow`, and `policy` |
| Built-in device presets | `12` in `3` categories | `window.__lab.registry.devices` |
| Docs gate before any DCI file existed | PASS, `281` files, `13` allowlisted | `npm run docs:check` |

## Feasibility spikes

Two spikes ran against the live Lab. Neither changed a file.

1. **A drag over a same-origin target reaches capture listeners.** The planner attached passive capture listeners for `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` to the target iframe document, then dragged across the SPA fixture. The listeners received `1` down, `2` moves, and `1` up, all of pointer type `mouse`. The automation tool emits few intermediate moves, so the move count is a floor. The recorder stayed `IDLE` with `0` events received, which confirms that `js/harness/capture-same-origin.js:108-111` listens for `click`, `keydown`, `input`, and `scroll` only.
2. **The recorder buffer cannot hold raw drags.** `window.__lab.recorder.stats()` reports a capacity of `2048` events. A hand drag at `120 Hz` for `3` seconds produces about `360` move events. Six such drags would evict the rest of a session. This is arithmetic from the measured capacity, not a measured eviction.

One arithmetic check also ran. Computing a fit scale for all `12` presets `200` times took `0.6 ms`. That loop is a stand-in for the real geometry function and proves only that a candidate set of this size is far below any frame budget.

## What the study notes say

The notes live in the operator's vault, outside this repository. Paths below are relative to that vault.

1. **The notes give LandingPage a narrow role in the Dragology work.** Stated in `Hub/Theory/CLM/PTR/Design Proposal - Concurrent DragDSL, ZX-Calculus Interaction Studio, and clm-kernel Evolution.md` section 2.4. LandingPage supplies "Responsive UI Lab targets, demo/sample packaging and viewport verification". The same section says not to copy the lifter, the claims engine, the hash provider, or the diagram renderer into LandingPage.
2. **Nothing in the Dragology design is built.** Stated in `Hub/Theory/CLM/PTR/PTR.md` section 7.6, checked on `2026-11-24`. `CommitIntent`, `PreviewSession`, `DragSpecIR`, and the execution ports appear in no core.
3. **Seven interface rules exist, and three need no drag engine.** Stated in `Hub/Theory/Integration/Dragging Along the Fiber - Declarative Dragging, Fibrations, and the Interface Design of MCard Studio.md` section 7.2. Rule 1 says to name what each piece of interface state lies over. Rule 2 says to give stored state a transport rule when its base can move. Rule 6 says every new drag has a twin that is not a drag.
4. **One invariant recurs in every note.** Stated in the same note as Rule 4, and in `PTR.md` section 7.6. A preview changes nothing. Only a release asks for a change. The release sends one request along the path that the equivalent button already takes. The proposed test is that `200` hover updates cause `0` commit calls.
5. **Upstream `dragology` does not fit this repository.** Stated in `Permanent/Declarative Dragging and Dragology - Speculative Rendering, Composable Lenses, and Graspable Abstractions.md` section 2.1. The library needs React `18` or `19` and SVG `transform` positioning. This repository ships Astro with Preact and must keep React out of its lockfile.
6. **A precedent exists for a React-free Astro app.** Stated for the SacredOctagon app in `Fleeting/Diary/2026/11/2026-11-20report.md` section 3. Tier 1 applies the pattern in about `150` lines of plain TypeScript, for discrete or one-dimensional gestures only. Carrying Tier 1 to LandingPage is inferred.
7. **Card interfaces have rules that need no Dragology.** Stated in `Hub/Theory/MVP/Integration/MVP Cards as Polynomial Declarative Interface for Efficient Representation.md`. Keep a small stable verb set. Show only the actions valid at the current position. Explain a refusal in domain terms.
8. **Navigation never dead-ends.** Stated in `Hub/Theory/Sciences/Computer Science/Programming Model/Conversational Programming Compendium/00 - The App Shell - Progressive Navigation.md`. Every navigation returns a card or an indicated failure that says why.
9. **A conversational turn has an operational definition.** Stated in `PTR.md` sections 7.4 to 7.6 and in the Speculative REPL note listed under Sources. A turn is a declared intent, an execution, and a verification. The proposal adds a pure preview step before the commit.
10. **Demand for drags is unproven.** Stated in the Dragging Along the Fiber note section 10, question 7: "No user has asked to drag a token."
11. **A wider LandingPage role is proposed, and the parent owns it.** Stated as `ARP-07` in `Hub/Theory/Integration/MCard_TDD Architectural Reorganization - Portable Knowledge Container, SQLite Tape Foundation, and Token-Grounded Composable OS.md`. LandingPage would consume headless `@mcard/studio` subpaths with no `react`. The parent sprint `PKC-06` carries that work.

## What the parent project requires

Paths below are relative to the parent repository root and are not links.

1. **LandingPage is Estate 3, the responsive verification lab and portal.** Stated in `registry/estate-ownership.yaml` under decision `DEC-29`. It owns the single responsive lab, `tools/ui-verify`, the net runner, and the explicit pull of the registry projection.
2. **`ws-server.js` must stay byte-identical.** Stated as `FRO-D09` and `PKC-D10`. The SHA-256 digest starts with `ac2012f4`. The digest matched on `2026-11-24` (measured with `shasum -a 256`).
3. **One parent program is active, and three of its sprints target this repository.** Stated in `docs/sprints/_active/pkc/`. The sprints are `PKC-03`, `PKC-06`, and `PKC-09`.
4. **`PKC-06` owns the Dragology island.** Stated in `docs/sprints/_active/pkc/sprint-pkc-06-dragology-algebra-mpa-spa-unification-and-tfz-llm.md`. It hosts a `<pkc-card>` island on `src/pages/responsive-lab.astro`, consumes a published `@mcard/studio`, and forbids `react` in the lockfile and in `dist/`. Its `DoD-PKC-06-03` names three files: `scripts/check-pkc-client-contract.mjs`, `tests/unit/dragology_island_parity.test.mjs`, and `tests/unit/tfz_llm_boundary.test.mjs`. They did not exist when the study agents read the tree. They existed by `22:32` local time. See the next section.
5. **`PKC-06` was reported as blocked upstream, and that report went stale the same day.** The parent study agent found no `dragSpec.ts`, `DragExecutionPort.ts`, or `tfzLlmProposer.ts` in `mcard-studio`. By `22:59` the parent working tree showed `DoD-PKC-06-01`, `DoD-PKC-06-02`, and `DoD-PKC-06-05` ticked, with `DoD-PKC-06-03` and `DoD-PKC-06-04` open.
6. **The kernel already exports conversational engines.** Measured by the parent study agent. `clm-kernel@0.0.26` exports `ConversationalLoopEngine` and `executeTriviumTurn`. This repository references neither name.
7. **This repository may not ship crypto or resolve a sibling from source.** Stated in `scripts/ci/check_landingpage_retirement.py` and `scripts/ci/check_submodule_realignment.py`.

## What changed during planning

The working tree moved while the plan was written. This section records it, because the first draft rested on the earlier state.

| Time on `2026-11-24`, local | Event | Evidence |
| --- | --- | --- |
| Before `22:28` | Three study agents read the tree. `src/islands` held `8` files, and `38` tracked files were modified | `ls src/islands` and `git status --short` at that time |
| `22:28` to `22:32` | Another session added `6` files and changed `7` more for the LandingPage side of parent sprint `PKC-06` | File times of `src/islands/PkcCardIsland.jsx`, `js/harness/pkc-dragology-preview.js`, `scripts/check-pkc-client-contract.mjs`, `tests/unit/dragology_island_parity.test.mjs`, `tests/unit/tfz_llm_boundary.test.mjs`, and `js/modules/web-llm/tfz-gate.js` |
| During EGM round 1 | All five reviewers found the new files. Two saw `src/islands/PkcCardIsland.jsx` change while they read it | [`./DCI-egm-review.md`](./DCI-egm-review.md), finding B1 |
| `22:59` | `src/islands` held `9` files. `48` tracked files were modified, `3` of them by the planner, and `6` files outside `docs/sprints/` were untracked | `git status --short` |

What the new files are, read on the tree of `22:59`:

- `js/harness/pkc-dragology-preview.js` is a pure drag-spec evaluator with `258` lines. Its schema is `pkc.drag-spec-ir.v1`. It has eight operators, among them `closest`, `between`, `vary`, and `whenFar`. It works on one axis. `previewDragSpec` returns `candidate`, `ambiguous`, `blocked`, or `cancelled`, and a tie returns `ambiguous`.
- `src/islands/PkcCardIsland.jsx` is a ninth island, mounted in `src/pages/responsive-lab.astro` with no props. It offers three width slots by click and by arrow key. It has no pointer drag handler. It calls `onCommitIntent` only when a function was passed, so a commit changes nothing outside the island.
- `package.json` does not list `@mcard/studio`. The evaluator is local code.

## What the study and the review change about the program

- The program builds no drag code. The evaluator that the first draft planned would have repeated `previewDragSpec` with different tie and state rules.
- The program applies the engine-free rules of the notes to the UI that exists today. It names where each stored value lives, it closes navigation, and it gives each refusal a reason.
- The registry page comes first among the feature sprints. Its first pull request closes a latent markup path, touches a file that no other change set touches, and can merge on its own.
- The command line, the gesture recorder, the preset rail, and the wiring of the island's intent to the stage wait in [`../dci-local-backlog.md`](../dci-local-backlog.md). Each has no named user yet, or belongs to the owner of `PKC-06`.
- The program starts only on a commit that contains both other change sets, and its first sprint measures this baseline again.

## Quoted passages from the notes

The notes are outside this repository, so the passages that the plan leans on are quoted here.

- On the role of LandingPage, from the Design Proposal note, section 2.4: "Do not copy the lifter, claims engine, hash provider or ZX renderer into LandingPage."
- On previews, from the Dragging Along the Fiber note, Rule 4: "Previews change nothing, and only a release asks for a change."
- On twins, from the same note, Rule 6: "Every new drag has a twin that is not a drag."
- On state, from the same note, Rule 1: "Say what each piece of interface state lies over."
- On demand, from the same note, section 10: "No user has asked to drag a token."
- On refusals, from the Polynomial Declarative Interface note: "When an action is disallowed, the system can **explain why** in terms of card types / expectations (not in terms of low-level errors)."
- On scope, from the Vau to Fibers note, section 5.3: "Do not use all three systems to build a standalone interactive diagram or standard web app."

## Sources

Study notes, relative to the vault root:

- `Literature/Reading notes/@Horowitz_Blinn_Heer_Declarative_Dragging_Dragology.md`
- `Permanent/Declarative Dragging and Dragology - Speculative Rendering, Composable Lenses, and Graspable Abstractions.md`
- `Hub/Theory/Integration/Dragging Along the Fiber - Declarative Dragging, Fibrations, and the Interface Design of MCard Studio.md`
- `Hub/Theory/Integration/Generalized Dragology DSL and Petri Net Token-Trace Fibers - Concurrent Push-Pull Execution and PTR Architecture.md`
- `Hub/Theory/Integration/The Drag-and-Drop Landscape, Dragology, and Subsumption Under Generalized DragDSL.md`
- `Hub/Theory/Integration/Dragology, Finite Element Analysis, and the Speculative REPL - Upgrading the PTR Updating Cycle in the Cubical Logic Model.md`
- `Hub/Theory/Integration/Dragology, Graspable Abstractions, and the Flux Pattern - Purely Functional Event Processing from Unidirectional Data Flow to Speculative Lenses.md`
- `Hub/Theory/MVP/Integration/MVP Cards as Polynomial Declarative Interface for Efficient Representation.md`
- `Hub/Theory/Integration/The Conversational CLI - Deterministic Syntax for Agentic Dialogue.md`
- `Hub/Theory/Integration/From Vau to Fibers and Speculative Lenses - Ultimate Abstraction, Cordis, and Dragology in Functional Programming.md`
- `Hub/Theory/Integration/MCard_TDD Architectural Reorganization - Portable Knowledge Container, SQLite Tape Foundation, and Token-Grounded Composable OS.md`
- `Hub/Theory/CLM/PTR/PTR.md`
- `Hub/Theory/CLM/PTR/Design Proposal - Concurrent DragDSL, ZX-Calculus Interaction Studio, and clm-kernel Evolution.md`
- `Hub/Theory/Sciences/Computer Science/Programming Model/Functional Programming/declarative programming.md`
- `Hub/Theory/Sciences/Computer Science/Programming Model/Conversational programming.md`
- `Hub/Theory/Sciences/Computer Science/Programming Model/Conversational Programming Compendium/00 - The App Shell - Progressive Navigation.md`
- `Fleeting/Diary/2026/11/2026-11-20report.md` and `Fleeting/Diary/2026/11/2026-11-22report.md`

Parent repository, relative to its root:

- `registry/estate-ownership.yaml`
- `docs/sprints/_active/pkc/sprint-pkc-06-dragology-algebra-mpa-spa-unification-and-tfz-llm.md`
- `docs/sprints/_active/pkc/evidence/decisions.tsv`
- `config/kernel-version-consensus.json`
- `mcard-studio/docs/guides/pcard-vcard-cordis-dragology-viewlet.md`
