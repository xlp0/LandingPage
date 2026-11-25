# SPRINT-DCI-00 Pinned baseline and stored-state table

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-00` |
| Source of Truth | [`./dci-plan.md`](./dci-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-DCI-00` |
| Status | `DONE` |
| Depends on | Flag 2. `DoD-PKC-06-03` is ticked in the parent file `docs/sprints/_active/pkc/sprint-pkc-06-dragology-algebra-mpa-spa-unification-and-tfz-llm.md`, and its change set and the `clm-kernel` pin are committed here |
| Unblocks | `PR-DCI-01B` and every later sprint, when all `14` baseline exit codes are `0` |
| Execution unit | `PR-DCI-00` |
| Decision Ref | `DCI-D01`, `DCI-D03`, Flag 2 |
| Poteto playbook | `investigation` with `principle-prove-it-works` and `principle-foundational-thinking` |
| BMAD roles | Architect, TEA, Tech Writer, Scrum Master |
| Effort | `0.5 day (guess)` |

## Outcome

The program starts from a commit that everyone can name, with every gate green on it. A reviewer of any later sprint can then read a failure as caused by that sprint.

This matters here for a measured reason. The plan was drafted against the working tree of `2026-11-24`. During that day another session added `6` files and changed `7` more. It left the tree in a mixed state. `src/islands` holds `9` files, and four test lines still expect `8`. The numbers in [`./evidence/DCI-pre-program-study.md`](./evidence/DCI-pre-program-study.md) are therefore a snapshot, and this sprint replaces them with numbers from one commit.

The sprint also writes down where the UI keeps state. Today that knowledge is spread over several modules.

## Work sequence

1. **Prove the entry condition.** Run the command below. It passes only when nothing outside `docs/sprints/` is modified or untracked. If it fails, stop and tell the operator. Do not stash, commit, or discard another session's changes.

   ```sh
   test -z "$(git status --porcelain | grep -v ' docs/sprints/')"
   ```

   Record the output of `git rev-parse HEAD` as the start commit. Confirm that `src/islands/PkcCardIsland.jsx` exists on it.
2. **Run every gate on the start commit.** Run each of the `14` gate commands in the Graduation section of [`./dci-plan.md`](./dci-plan.md), one at a time, and record the exit code of each. If any command exits non-zero, stop after recording it. `PR-DCI-01B` does not start. The owner of the failing change set fixes it on a new commit, and this sprint runs again from step 1 on that commit.

   On the tree of `2026-11-24` the features project is expected to fail. These four lines still pin `8` islands: `tests/features/responsive-lab-islands.spec.js:218` and `:670`, `tests/features/responsive-capture.spec.js:529`, and `tests/features/performance-baselines.spec.js:876`. They belong to the `PKC-06` change set.
3. **Measure the baseline again.** Record each value with its command.

   | Measure | Value on `2026-11-24` |
   | --- | --- |
   | Native dialog calls on the two unscanned paths | `2` |
   | Page Places with no arc in, or none out | `3` |
   | Same-origin links pinned for the registry, the inspector, and the conformance page | `0`, `0`, `0` |
   | `innerHTML` writes in the registry page | `2` |
   | Query parameters that the Lab toolbar reads | `1` |
   | Island files | `9` |

   The commands, in the same order:

   ```sh
   grep -rnE "(alert|prompt)(\?\.)?\(" js/runtime js/landing-page-mcard.js | grep -vc "^\s*//"
   node -e "import('./src/net/net-core.mjs').then(async (m) => { const y = (await import('js-yaml')).default; const fs = await import('node:fs'); const e = y.load(fs.readFileSync('src/net/workbench-net.yaml', 'utf8')); const arcs = m.navArcs(e).filter((a) => a.kind === 'link' || a.kind === 'redirect'); const pages = Object.entries(e.bindings.places).filter(([, b]) => b.kind === 'page').map(([id]) => id); console.log(pages.filter((p) => !arcs.some((a) => a.to === p) || !arcs.some((a) => a.from === p)).length); })"
   grep -n "expectedSameOriginLinks" tests/fixtures/test-config.js
   grep -c "innerHTML" src/pages/sprint-registry.astro
   grep -cE "urlParams\.get\('" js/harness/lab-toolbar.js
   ls src/islands | wc -l
   ```

4. **Write the stored-state table.** Add a section `## Stored interface state` to `docs/01-architecture/astro-host-and-islands.md` with this table.

   | Value | Lives in | Written by | After a reload | In a new tab | In another browser |
   | --- | --- | --- | --- | --- | --- |
   | Theme, key `govtech_display_theme` | `localStorage` | `js/runtime/presentation-controller.js` | Kept | Kept | Lost |
   | Power mode, key `govtech_power_mode` | `localStorage` | `js/runtime/presentation-controller.js` | Kept | Kept | Lost |
   | Custom devices, key `pkc_responsive_lab_devices_v2`, with a legacy copy under `pkc_responsive_lab_devices_v1` | `localStorage` | `js/device-registry.js` | Kept | Kept | Lost |
   | Last Place, key `gqc:page-state:last` | `sessionStorage` | `js/harness/page-state.js` | Kept | Lost | Lost |
   | Lab target, parameter `target` | URL | `js/harness/lab-toolbar.js` | Kept | Kept when the URL is copied | Kept when the URL is copied |
   | Theme override, parameter `display_mode` | URL | Read only, by `js/runtime/presentation-controller.js` and by `src/pages/fiber-inspector.astro` | Kept | Kept when the URL is copied | Kept when the URL is copied |
   | Redirect switch, parameter `noredirect` | URL | Read only, by `src/pages/index.astro` | Kept | Kept when the URL is copied | Kept when the URL is copied |
   | Harness parameters of the conformance page | URL | Read only, by `src/pages/fiber-conformance.astro` | Kept | Kept when the URL is copied | Kept when the URL is copied |
   | Lab device, size, orientation, mode, arrangement, scale mode, and safe-area flag | Memory | `js/harness/viewport-stage.js` and `js/harness/lab-runtime.js` | Lost | Lost | Lost |
   | Selection in the `PKC-06` island | Memory | `src/islands/PkcCardIsland.jsx` | Lost | Lost | Lost |

   Under the table, state in one sentence that no script enforces it, and that `SPRINT-DCI-03` changes the row for the Lab device, size, orientation, and mode.
5. **Mark the workspace active.** Make these six edits.
   - `docs/sprints/_active/INDEX.md` and `docs/sprints/_active/README.md`: in the Status row, replace `IDLE` and the text in its parentheses with `ACTIVE` and `Program DCI`, `SPRINT-DCI-00` in progress.
   - `docs/sprints/INDEX.md` and `docs/sprints/README.md`: in the Status row, replace `IDLE` and `0` active sprints with `ACTIVE` and `Program DCI`.
   - `docs/INDEX.md`: in the bullet for the Active Sprint Workspace, replace `Standby with 0 active sprints` with `Active with Program DCI`.
   - `docs/README.md`: in the table cell for the Active Sprint Workspace, replace `Standby` and its parentheses with `Active` and `Program DCI`.
6. **Record the result.** Write the evidence file. Append two rows to `DECISIONS.tsv`. The first has the `phase` value `DCI-scope-approval` and records the operator's approval of scope and of the three flags. The earlier `DCI-scope-confirmation` row covers the scope only and does not replace it. The second has the `phase` value `DCI-00-complete`.

## Files

- Create `docs/sprints/_active/evidence/DCI-00-pinned-baseline.md`.
- Edit `docs/01-architecture/astro-host-and-islands.md`.
- Edit `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/README.md`, `docs/sprints/INDEX.md`, `docs/sprints/README.md`, `docs/INDEX.md`, and `docs/README.md`.
- Edit `docs/sprints/_active/DECISIONS.tsv`, `docs/sprints/_active/dci-plan.md`, and this sprint file, for the status and the DoD ticks.

## BMAD responsibilities

### Architect

- Sign off that each row of the stored-state table matches the module it names.

### TEA

- Verify that every gate ran on the start commit, and that the sprint stopped if one was red.

### Tech Writer

- Verify that the new section passes `npm run docs:check` and names only files that exist.

### Scrum Master

- Record the start commit and the operator's approval of scope in `DECISIONS.tsv`.

## Acceptance criteria

- The evidence file names one start commit and lists `14` gate commands, each with the exit code `0`.
- Every measure in step 3 has a value from the start commit. A value that differs from the `2026-11-24` column is marked as changed.
- `docs/01-architecture/astro-host-and-islands.md` has the stored-state section with `10` rows.
- No file outside `docs/` changes.

## Test design

- No new test. The sprint runs the existing suites and records them.
- `npm run docs:check` covers the edited living docs.

## Non-goals

- Fixing a gate that fails on the start commit. The sprint stops, and the owner of the failing change set fixes it.
- A script that enforces the stored-state table. The review of the first draft found that such a scanner would count call sites and miss keys, URL parameters, and JSX handlers (`DCI-D03`).
- Any change to code.

## Definition of done

- [x] **DoD-DCI-00-01.** The start commit is recorded, it holds the ninth island, and nothing outside `docs/` has changed since. Verified by `START=$(sed -nE 's/^\| Start commit \| .([0-9a-f]{7,40}). \|.*/\1/p' docs/sprints/_active/evidence/DCI-00-pinned-baseline.md) && git cat-file -e "$START:src/islands/PkcCardIsland.jsx" && test -z "$(git diff --name-only "$START" HEAD -- . ':!docs')"`.
- [x] **DoD-DCI-00-02.** All `14` graduation gates exited `0` on the start commit. Verified by `test "$(grep -cE '^\| .(npm run|node scripts)[^|]*. \| 0 \|' docs/sprints/_active/evidence/DCI-00-pinned-baseline.md)" -eq 14`.
- [x] **DoD-DCI-00-03.** The stored-state table is in the living architecture doc. Verified by `grep -q '^## Stored interface state' docs/01-architecture/astro-host-and-islands.md && grep -q 'govtech_display_theme' docs/01-architecture/astro-host-and-islands.md && npm run docs:check`.
- [x] **DoD-DCI-00-04.** The scope approval and the completion row are recorded. Verified by `grep -qE $'\tDCI-scope-approval\t' docs/sprints/_active/DECISIONS.tsv && grep -qE $'\tDCI-00-complete\t' docs/sprints/_active/DECISIONS.tsv`.
