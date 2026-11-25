# SPRINT-DCI-05 Verification and graduation

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-05` |
| Source of Truth | [`./dci-plan.md`](./dci-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-DCI-05` |
| Status | `DONE` |
| Depends on | `SPRINT-DCI-01`, `SPRINT-DCI-02`, `SPRINT-DCI-03`, `SPRINT-DCI-04` |
| Unblocks | Graduation of Program DCI |
| Execution unit | `PR-DCI-05` |
| Decision Ref | `DCI-D05`, `DCI-D10` |
| Poteto playbook | `shipping` with `principle-prove-it-works` and `principle-sequence-verifiable-units` |
| BMAD roles | Product Manager, Architect, TEA, Tech Writer, Scrum Master |
| Effort | `1 day (guess)` |

## Outcome

The program ends with one run of every gate on one commit, a comparison of that run with the baseline of `SPRINT-DCI-00`, living docs that match the code, a reviewed backlog, and an archive under `docs/sprints/programs/dci/`.

## Work sequence

1. **Compare the end state with the baseline.** Record both columns in the evidence file. The first column comes from `evidence/DCI-00-pinned-baseline.md`.

   | Measure | Start of program | End of program |
   | --- | --- | --- |
   | Native dialog calls | The value on the start commit | `0` |
   | Page Places with no arc in or none out, and no `terminalReason` | The value on the start commit | `0` |
   | Same-origin links on the registry and on the inspector | `0` and `0` | `3` and `4` |
   | `innerHTML` writes in the registry page | `2` | `0` |
   | Query parameters that the Lab reads | `1`, which is `target` | `6`. They are `target` and the five names in the step 2 table of `SPRINT-DCI-03`, each covered by a case in `tests/unit/lab-url-state.test.mjs` |
   | Island files that a `PR-DCI-0N` added | Not applicable | `0` |

2. **Run the full gate matrix on one commit.** Run each of the `14` gate commands in the Graduation section of [`./dci-plan.md`](./dci-plan.md) and record the exit code of each beside its exit code from `SPRINT-DCI-00`.
3. **Check `INV-DCI-05` on each DCI pull request.** For each of `PR-DCI-00` to `PR-DCI-04`, record the files it added under `src/islands`, the `fetch(` calls it added, and its diff of `package.json`. All three are empty for every pull request. A range from the start commit would also count commits of the parent sprints, so the check reads each pull request's own diff.
4. **Bring the living docs up to date.**
   - `docs/01-architecture/astro-host-and-islands.md`: the nav, the net rule, the registry parameters, the Lab parameters, and the stored-state table.
   - `docs/functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md`: the Lab link, the copy control, and the reason table.
   - `docs/00-getting-started/STATUS.md`: Program DCI in the list of programs.
   - `docs/01-architecture/workbench-net.md`: regenerate with `npm run docs:gen-net`.
5. **Review the backlog.** For each candidate in [`./dci-local-backlog.md`](./dci-local-backlog.md), record whether its entry condition holds on the graduation date. A candidate whose condition holds is named in the evidence file for the operator. This sprint starts none of them.
6. **Ask the operator to graduate.** Graduation needs explicit operator approval, as it did for Program SLC. Record the approval in a `DECISIONS.tsv` row whose `phase` is `DCI-graduation`.
7. **Archive.** Move `dci-plan.md`, `dci-local-backlog.md`, and the six sprint files to `docs/sprints/programs/dci/`. Move every `evidence/DCI-*.md` file to `docs/sprints/programs/dci/evidence/`. `DECISIONS.tsv` stays in `docs/sprints/_active/`, so rewrite the links to it in the moved files. Each `](../../../_active/DECISIONS.tsv)` becomes `](../../../_active/DECISIONS.tsv)`. Each `](../../DECISIONS.tsv)` under `evidence/` becomes `](../../../../_active/DECISIONS.tsv)`. Add `docs/sprints/programs/dci/INDEX.md` in the shape of `docs/sprints/programs/ssg/INDEX.md`. Update `docs/sprints/INDEX.md`, `docs/sprints/README.md`, `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/README.md`, `docs/INDEX.md`, `docs/README.md`, and the list of graduated programs in the root `README.md`. Set the Status row of the two active index files to `IDLE` with `Program DCI` graduated and the date.

## Files

- Create `docs/sprints/_active/evidence/DCI-05-graduation.md`.
- Create `docs/sprints/programs/dci/INDEX.md`.
- Edit `docs/01-architecture/astro-host-and-islands.md`, `docs/functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md`, and `docs/00-getting-started/STATUS.md`.
- Edit `docs/sprints/INDEX.md`, `docs/sprints/README.md`, `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/README.md`, `docs/INDEX.md`, `docs/README.md`, and `README.md`.
- Edit `docs/sprints/_active/DECISIONS.tsv`, and each moved file for its links to it.
- Regenerate `docs/01-architecture/workbench-net.md`.

## BMAD responsibilities

### Product Manager

- Sign off that the five outcomes of the plan hold on the graduation commit.

### Architect

- Verify `INV-DCI-05` on the diff of each DCI pull request.

### TEA

- Verify that every gate ran on the same commit, and that each exit code is recorded beside its baseline.

### Tech Writer

- Verify that each living doc names real files and real commands, and that `npm run docs:check` passes after the move.

### Scrum Master

- Record the operator approval in `DECISIONS.tsv` before the archive move.

## Acceptance criteria

- The evidence file lists `14` gate commands, each with its exit code on the start commit and on the graduation commit, and both commit hashes.
- The end-of-program column of step 1 holds.
- No link under `docs/` is broken after the archive move.
- Every backlog candidate has a recorded yes or no for its entry condition.

## Test design

- No new test. The sprint runs the suites that the earlier sprints added.
- `npm run docs:check` proves the links after the move.

## Non-goals

- New features, and fixes larger than a doc correction. A defect found here reopens the sprint that owns it.
- Starting a backlog candidate.
- A release tag. The parent decides when this repository's pointer moves.

## Definition of done

- [x] **DoD-DCI-05-01.** Thirteen of the fourteen graduation gates exit `0` on one commit. Verified by `npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:net && npm run check:explorable-gui && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run build && npm run test:unit && npm run test:smoke && npm run test:components && npm run test:features && npm run test:smoke:cross-browser`.
- [x] **DoD-DCI-05-02.** The fourteenth gate passes. The layout holds on every route at four widths. Verified by `npm run stageshow:sweep -- --strict`.
- [x] **DoD-DCI-05-03.** The four feature sprints each have a completion row, and the registry page writes no markup. Verified by `test "$(grep -cE $'\tDCI-0[1-4]-complete\t' docs/sprints/_active/DECISIONS.tsv)" -eq 4 && ! grep -n 'innerHTML' src/pages/sprint-registry.astro`.
- [x] **DoD-DCI-05-04.** The archive holds the program and its evidence, and every doc link resolves. Verified by `test -s docs/sprints/programs/dci/INDEX.md && test -s docs/sprints/programs/dci/dci-plan.md && test -s docs/sprints/programs/dci/evidence/DCI-05-graduation.md && npm run docs:check`.
- [x] **DoD-DCI-05-05.** The operator approval is recorded, and the workspace status line reads idle. Verified by `grep -qE $'\tDCI-graduation\t' docs/sprints/_active/DECISIONS.tsv && grep -qE '^\| Status \| .IDLE. \(.*Program DCI. graduated' docs/sprints/_active/INDEX.md`.
