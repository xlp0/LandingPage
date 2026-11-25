# Program DCI EGM review ledger

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, UX designers, architects, developers, and TEA engineers |
| BMAD Owner | Product Manager with Architect, UX Designer, Developer, and TEA |
| Source of Truth | [`../dci-plan.md`](../dci-plan.md), [`../INDEX.md`](../INDEX.md), [`../DECISIONS.tsv`](../../../_active/DECISIONS.tsv), and [`./DCI-pre-program-study.md`](./DCI-pre-program-study.md) |
| Consensus Kernel | `clm-kernel@0.0.26` in the working tree |
| Review date | `2026-11-24` |

## Protocol overview

The review follows the Elephant-Goldfish Model. The planner, as the Elephant, drafted the plan and the nine sprint files with the full study in context. Each Goldfish reviewer then started with no conversation history. It received the document paths, the pre-program study, and read access to the code. It did not receive the planner's reasoning.

The planner checked every Blocker and every Major finding against the repository before accepting or contesting it. A finding counts as settled when it is fixed in the documents or contested with a stated reason.

This review ran without an operator at the keyboard. The protocol asks for an operator decision after each round. The planner applied the fixes that fall inside the planner's remit and listed the choices that only the operator can make under Open findings, at the end of this file.

## Round 1 reviewer counts

Round 1 read the first draft, which was a plan and nine sprint files, `SPRINT-DCI-00` through `SPRINT-DCI-08`. The `egm-synthesizer` spawned five reviewers in parallel and merged their findings.

| Reviewer | Focus | Blocker | Major | Nit | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| `egm-zoom-out` | Approach and scope | `1` | `8` | `5` | `14` |
| `egm-comprehension` | Clarity for a new reader | `1` | `14` | `6` | `21` |
| `egm-design` | Design and risk | `1` | `19` | `8` | `28` |
| `egm-codebase-details` | Accuracy against the code | `3` | `18` | `8` | `29` |
| `egm-implementation-readiness` | Readiness to build | `7` | `14` | `8` | `29` |
| Total as raised | | `13` | `73` | `35` | `121` |
| Total after merging | | `8` | `29` | `17` | `54` |

All five reviewers completed. None needed a retry. None could run a command, so every finding came from reading files.

## Round 1 blockers and dispositions

The planner checked each blocker against the tree of `22:59` before acting on it.

| ID | Finding | Check by the planner | Disposition |
| --- | --- | --- | --- |
| `B1` | The LandingPage side of `PKC-06` is in the tree. The planned interpreter would duplicate `js/harness/pkc-dragology-preview.js` | Confirmed. The files were created between `22:28` and `22:32`, after the study | Accepted. The interpreter is dropped. `DCI-D02` now forbids a second evaluator. Every drag item moved to the backlog |
| `B2` | Nav selectors built from net data fail the trigger-drift check, which needs each selector as a literal in the source file | Confirmed in `scripts/gen-bombadil-nets.mjs` | Accepted. The nav component lists ten literal links and fails the build when one disagrees with the net (`DCI-D04`) |
| `B3` | New links break four smoke specs through `tests/fixtures/test-config.js` | Confirmed. The file pins the same-origin links of each page | Accepted. The nav sprint edits the four link sets and runs the smoke project |
| `B4` | Removing the legacy device key breaks a feature spec | Confirmed in `tests/features/responsive-rotation-and-devices.spec.js` | Accepted. The removal left the program and sits in the backlog |
| `B5` | The recorder drops gesture fields when it builds a run | Not checked again. The gesture sprint is no longer scheduled | Recorded in backlog candidate 3 as known work |
| `B6` | A new fixture needs rows in two registries that the sprint excluded | Not checked again, for the same reason | Recorded in backlog candidate 3 as known work |
| `B7` | Removing the `disabled` assignments leaves four controls disabled for good, and the count of `disabled` attributes was wrong | Confirmed. Four static attributes exist, and the true count is `15` | Accepted. Controls keep the native attribute and gain visible reason text (`DCI-D07`). The count is corrected in the study |
| `B8` | The theme step changed a prop that does not set the page theme | Confirmed. `dataTheme` on the layout sets it | Accepted. The nav sprint changes both attributes |

## Round 1 scope findings

Five Major findings argued that the first draft built more than it could justify. The planner accepted all five.

| ID | Finding | Disposition |
| --- | --- | --- |
| `M1` | Gesture capture listens inside the target frame and cannot see the island it was justified by | The sprint moved to backlog candidate 3, with a framed target that drags as its entry condition |
| `M2` | The command bar is a product surface with no named user. The two native dialogs can go without it | The dialogs are removed with one `<dialog>` and one status line. The command line is backlog candidate 2 |
| `M3` | The census script and the ledger repeat checks that two existing gates own | The census and the ledger are dropped. One rule joins `scripts/check-net.mjs`. Two paths join `scripts/check-explorable-gui.mjs` (`DCI-D03`) |
| `M6` | The action table adds a second guard layer for the sake of the command bar and the pilot | The table is dropped. One pure function returns the reasons |
| `M23` | The drag pilot should default to dropped | The pilot is backlog candidate 4, behind a spike |

## Other Round 1 findings

- **Accepted and applied.** `M4` and `M5` (the baseline moves to a pinned commit in `SPRINT-DCI-00`). `M10`, `M11`, and `M13` (the Lab URL state has its own shape, merges into the query, writes only after a user commit, and leaves `target` alone). `M16` (scoped styles in the nav component). `M17` (no layout-freeze claim for the registry). `M18` (the conformance page criterion names the one attribute that changes). `M19` (no instruction to edit `tests/gui-coverage.json`). `M20` (explorer skip lists and scope reasons). `M22` (completion rows use a `phase` token that no plan-time row has). `M24`, `M25`, and `M27` (the glossary defines the page terms, and the transport vocabulary is gone with the ledger). `M26` (the last sprint depends on every earlier one). `M28` (the plan has a risk table). `M29` (the study quotes the passages the plan leans on).
- **Moot after the scope change.** `M7`, `M8`, `M9`, `M12`, `M14`, and `M15` concern the action table, the command bar, and gesture replay.
- **Contested.** `M21` reported that `/pkc-docs-index.html` links to a `pkc-viewer.html` that is absent from the repository. The running app serves that page with the title `PKC Document Viewer` (measured with `curl`), so the links are not dead. The other half of the finding holds. The docs index has no link back, and the plan now says so.
- **Nits.** Line-number drift (`N1`) is handled by citing symbols and test ids in place of most line numbers. The remaining nits concerned sprints that are no longer scheduled, or are fixed in the rewritten files.

## What Round 1 changed

| Item | First draft | Revised |
| --- | --- | --- |
| Sprints | `9` | `6` |
| Effort, a guess | `18` days | `9` days |
| New gates | `1` census script and `1` ledger file | `0`. Two existing gates are extended |
| New drag code | `1` interpreter and `1` fixture | `0` |
| Backlog items | `0` | `5` candidates and one to-do list, after round 2 |

## Round 2 reviewer counts

Round 2 read the revised set, which was the plan, six sprint files, and the backlog. Three reviewers ran in parallel, each with no shared context. Each returned its report in its final message, because the reviewer personas cannot write files.

| Reviewer | Blocker | Major | Nit | Total |
| --- | ---: | ---: | ---: | ---: |
| `egm-zoom-out` | `0` | `4` | `5` | `9` |
| `egm-codebase-details` | `2` | `9` | `8` | `19` |
| `egm-implementation-readiness` | `2` | `14` | `8` | `24` |
| Total as raised | `4` | `27` | `21` | `52` |
| Total after merging | `3` | `19` | | |

The code reviewer also listed about forty claims that it checked and found correct, among them every Create and Edit target, every cited npm script, the eleven arcs, the four smoke link sets, and the registry counts.

## Round 2 blockers and dispositions

| Finding | Check by the planner | Disposition |
| --- | --- | --- |
| The new net rule would break the existing unit case `GQC-02A-UNIT-05`, whose orphan page carries an active `exception` | Confirmed in `tests/unit/check-net.test.mjs` | Fixed. The rule also skips a Place with an active exception, as the rule beside it does, and gains a fourth unit case |
| `SPRINT-DCI-04` told the implementer to change an open-URL flow in a smoke spec that has no such flow | Confirmed. The planner had inferred the flow from a file-name match | Fixed. The step is gone. The new feature spec is the only test of the flow |
| `SPRINT-DCI-00` recorded a red gate and still unblocked the next sprint, and four test lines pin `8` islands beside `9` island files | Confirmed at `tests/features/responsive-lab-islands.spec.js:218` and `:670`, `tests/features/responsive-capture.spec.js:529`, and `tests/features/performance-baselines.spec.js:876` | Fixed. A red gate stops the sprint. The program starts after `DoD-PKC-06-03` is ticked, on a commit where all `14` gates are green |

## Round 2 majors and dispositions

- **Decision rows described the first draft.** Fixed. Rows appended on `2026-11-24` supersede the earlier ones and state the current ids.
- **The docs index passed the new rule on an arc that the page does not render.** Accepted in part. The plan, `INV-DCI-02`, and the Scope table now say that the rule reads declared arcs and that the docs index still has no way back. The arc stays, because removing it would touch the Penpot parity checks.
- **The program could start while the parent sprint still wrote to shared files.** Fixed. Flag 2 waits for `DoD-PKC-06-03`, and `INV-DCI-05` is proved on each DCI pull request and not on a commit range.
- **The markup fix waited behind the program.** Fixed. `PR-DCI-01A` holds only the safe rendering and can merge on its own approval.
- **No registry title holds a tag today.** Confirmed, `0` of `335`. The plan now calls the path latent, and the spec stubs one title with a tag.
- **The Mentions LandingPage filter repeated search.** Fixed. The filter is gone, and search also matches DoD references.
- **The URL dialog was described as a `PUT`.** Confirmed as wrong. Both portal documents pass `onExternalUrl`, so the flow goes to the membrane. The button is tagged `external`.
- **The root `index.html` also mounts the portal.** Fixed. It gets the same dialog.
- **The safe-area sentence named tablets.** Confirmed. Only the five phone presets declare insets. The sentence now says so.
- **The baseline command for Lab parameters matched nothing.** Fixed, and the planner ran the corrected commands.
- **One first-visit theme was not delivered, because the portal follows the system.** Accepted. The theme change left the program and sits in the backlog to-do list.
- **The mode was written to the URL from one of four paths.** Fixed. The writer listens for `lab:workbench-mode-change`.
- **Open contract points in the URL module, the registry filters, and the dialog markup.** Fixed with the reviewer's stated rules: `URLSearchParams` for merges, `hidden` for filtered cards, `novalidate` and an explicit focus target for the dialog.
- **The archive move would break four links to the ledger.** Fixed with an explicit rewrite step.
- **Files lists omitted the evidence file, the ledger, and the status edits.** Fixed in all six sprints.
- **Two DoD commands passed today, before either gate was extended.** Fixed. Each now greps for the new rule name first.
- **The features project first ran in the fifth sprint.** Fixed. It is a core gate, and each feature sprint runs it.

## Convergence

The protocol calls a review converged after two rounds in a row with no unsettled Blocker or Major. Round 1 and round 2 each raised blockers, so this review has not converged. The planner applied the round 2 fixes and did not run a third round. The next round belongs after the start commit exists, because both rounds found that the tree changed under the documents.

## Open findings

These need the operator.

1. **Scope.** Closed on `2026-11-25` local time. The operator confirmed the six-sprint scope. The `DCI-scope-confirmation` row of `DECISIONS.tsv` records the question and the answer.
2. **Flag 1.** Confirm the net as the model for links between workbench pages.
3. **Flag 2.** Confirm that the program waits for `DoD-PKC-06-03`, and that `PR-DCI-01A` may merge before it.
4. **Flag 3.** Promote any backlog candidate whose entry condition holds. On `2026-11-25` local time the operator kept every candidate in the backlog, so none is promoted today.
5. **The legend wording.** The two legend lines on the registry page describe `sealed` and `specification` from the data. The coordinator who owns the projection should confirm them.
6. **A third review round** on the start commit, before `SPRINT-DCI-00` ends.
