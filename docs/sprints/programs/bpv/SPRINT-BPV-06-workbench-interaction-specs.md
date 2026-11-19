# SPRINT-BPV-06 Workbench interaction specs

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-BPV-06` |
| Handle | `urn:pcard:sprint:SPRINT-BPV-06` |
| Status | `COMPLETED` |
| Depends on | `SPRINT-BPV-05` |
| Unblocks | `SPRINT-BPV-07` |
| Execution unit | `PR-BPV-06` |
| Poteto playbook | `feature` with `principle-model-the-domain` and `principle-prove-it-works` |
| BMAD roles | Architect, Developer, TEA, UX Designer |
| Effort | 3 days (guess) |

## Outcome

Bombadil explores the Responsive UI Lab the way a user does. It selects targets, steps through the guided workflow, records and stops, rotates devices and navigates. It checks three things as it goes. Every firing follows the workbench net. The recorder obeys its lifecycle. The lab's display of the target's place agrees with the target itself.

The target runs inside the ViewportStage iframe, where the pre-program spike showed random clicks never land. The lab therefore mirrors the target's reported place onto the stage root (decision BPV-D08). That gives users a visible target state, and gives Bombadil something it can check from the top document.

## Work sequence

1. Run GitNexus `impact` upstream on the functions in `js/harness/viewport-stage.js` and `js/harness/spa-test-workflow.js` that this sprint edits. Then mirror the target onto the host. When the workbench receives a target observation, the ViewportStage root gets `data-target-place-id` and `data-target-boot-nonce`, and the stage shows the place to the user. Source the values from the observation path that `js/harness/spa-test-workflow.js` already consumes, not from a new channel.
2. Write `tests/bombadil/workbench.bombadil.ts` with these properties.
   - `firingsAreDeclared`. Every new record in `window.__netReport` names a declared transition whose input and output match the record's places, or a `HISTORY_ARCS` entry for a Back or Forward step. Link firings and reverse cross-document history arrivals appear in the arriving page's log through `restoreCrossDocumentFiring()` in `js/harness/page-state.js` (emitting `history:${reverseMatches[0].transitionId}` on reverse arrivals). A record with no transition ID is a violation.
   - `placeMatchesUrl`, reused from the page-load spec.
   - `recorderStateIsKnown` and `recorderMovesAreLegal`. They are read from `data-recorder-state` and checked against the generated `RECORDER_TRANSITIONS`. A fresh document load may reset the state to `IDLE`.
   - `targetMirrorIsDeclared`. While the SPA fixture is the target, the mirrored place is one of the SPA net's places.
   - `targetMirrorAgrees`. While the SPA fixture is the target, the mirrored place equals the fixture's own `data-place-id` within 2 seconds. The spec's `mirror` extractor reads the fixture through the frame's `contentDocument`, preferring `inner.body`'s `data-place-id` with `#spa-app-root` fallback.
   - The page-load properties and the default error properties.
3. Weight the actions toward the workflow. Workflow step tabs, target selection, recording and device rotation get more weight than scrolling. Clicks on `data-effect` controls are dropped.
4. Drive the framed target. BPV-00 showed that a custom action can click inside a same-origin frame through its `contentDocument`. Register one that fires a random visible button of the SPA fixture inside the ViewportStage frame, so target transitions happen during the run and the mirror properties are exercised.
5. Write `scripts/bombadil/trace-to-net.mjs`. It reads the `netReport` extractor snapshots from a run's `trace.jsonl` and emits the firing records. With `--min-firings` it exits 1 when a run fired fewer transitions than the bound, so a run that only scrolled cannot pass as clean. BPV-07 reuses it for coverage. Pin its input with a 10-line sample of a real trace in `tests/fixtures/bombadil/sample-trace.jsonl`, because the format is undocumented.
6. Run the spec for 10 minutes, triage each violation, fix it and promote it to a Playwright spec under `tests/features/`.
7. Run GitNexus `detect_changes` before committing and confirm that only the expected symbols and flows changed.

## Files

- Create `tests/bombadil/workbench.bombadil.ts`
- Create `tests/features/target-mirror.spec.js`
- Create `scripts/bombadil/trace-to-net.mjs`
- Create `tests/fixtures/bombadil/sample-trace.jsonl`
- Create `tests/unit/bombadil-trace.test.mjs`
- Edit `src/islands/ViewportStageIsland.jsx`
- Edit `js/harness/viewport-stage.js`
- Edit `js/harness/spa-test-workflow.js`
- Edit `scripts/bombadil/run.mjs` to add the `workbench` target
- Edit `package.json` to add `bombadil:workbench`
- Edit `docs/sprints/_active/DECISIONS.tsv`

## BMAD responsibilities

### Architect

- Confirm that the mirror reads an existing observation and adds no second source of truth for the target's place.
- Review each violation's triage. A net change needs a decision row.

### Developer

- Own the mirror and the spec. Keep the spec's helpers in one file, imported with the `.ts` extension.

### TEA

- Seed one fault per property in a scratch copy and confirm the spec reports each one. The faults are a wrong firing, an illegal recorder move and a stale mirror.

### UX Designer

- Design how the stage shows the target's place, so the mirror helps users and not only the spec.

## Acceptance criteria

- The stage shows the target's current place, and the mirror attributes match it.
- Each property reports its seeded fault.
- A 10 minute run of the lab ends with no violation, or every violation has a promoted Playwright spec or a decision row.
- The run log has no quiescence timeout.

## Test design

- `tests/features/target-mirror.spec.js` drives the SPA fixture through each of its transitions with Playwright and asserts the host mirror after each step.
- The seeded faults live in scratch copies and are not committed. The TEA records the commands and results in the PR.

## Non-goals

- Request-lifecycle places such as `p_pending_get_app_config`.
- Targets other than the SPA fixture inside the stage. Other targets are approved separately under the target policy.
- Cross-origin targets.

## Definition of done

- [x] **DoD-BPV-06-01** The host mirror tracks the SPA fixture through every transition. Verified by `npx playwright test tests/features/target-mirror.spec.js --project=features`.
- [x] **DoD-BPV-06-02** A 10 minute workbench run ends clean and fires at least 20 transitions, a starting bound the TEA adjusts after the first run. Verified by `d=$(mktemp -d bombadil-output/bpv06-XXXX) && npm run bombadil:workbench -- --time-limit 10m --output-path "$d" && node scripts/bombadil/trace-to-net.mjs "$d" --min-firings 20`.
- [x] **DoD-BPV-06-03** The workbench run never stalls on a popup. Verified by `mkdir -p bombadil-output && npm run bombadil:workbench -- --time-limit 2m > bombadil-output/workbench.log 2>&1 && ! grep -q 'quiescence timer' bombadil-output/workbench.log`.
- [x] **DoD-BPV-06-04** Every triage outcome of the workbench run is recorded. Verified by `grep -q 'BPV-06.*workbench triage' docs/sprints/_active/DECISIONS.tsv`.
- [x] **DoD-BPV-06-05** The earlier Bombadil targets and the existing Playwright projects still pass. Verified by `npm run bombadil:spa -- --time-limit 2m && npm run bombadil:page-load -- --time-limit 1m && npm run test:features`.

Evidence: [BPV-06 workbench evidence](./evidence/BPV-06-workbench.md), executed 2026-11-18.
