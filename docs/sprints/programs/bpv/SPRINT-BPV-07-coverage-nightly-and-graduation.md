# SPRINT-BPV-07 Coverage, nightly runs and graduation

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-BPV-07` |
| Handle | `urn:pcard:sprint:SPRINT-BPV-07` |
| Status | `COMPLETED` (graduation pending five nightly runs) |
| Depends on | `SPRINT-BPV-06` |
| Unblocks | The separate graduation gate |
| Execution unit | `PR-BPV-07` |
| Poteto playbook | `feature` with `principle-explain-the-number`, then `opening-a-pr` |
| BMAD roles | TEA, Developer, Architect, Product Manager, Tech Writer |
| Effort | 2 days (guess) |

## Outcome

Bombadil's exploration becomes a number the team can read and a routine that runs without anyone remembering it. Traces feed the existing transition coverage report as explored but not asserted coverage. The local Docker nightly runner (`docker/bombadil/compose.yml`, `scripts/bombadil/nightly.sh`, and `scripts/bombadil/nightly-scheduler.sh`) explores every target and keeps its artifacts under `bombadil-output/`, while `bombadil-gate` in `docker/bombadil/compose.yml` runs the deterministic checks (`check:bombadil-nets`, `check:explorable-gui`, `check:net`, `docs:check`, `test:unit`). The adoption guide (`docs/08-testing/BOMBADIL_PROPERTY_TESTING.md`) changes from a proposal to a description of how LandingPage works.

## Work sequence

1. Run GitNexus `impact` upstream on `computeTransitionCoverage` and `replayNetTrace` in `scripts/check-net.mjs` before changing them.
2. Extend `scripts/bombadil/trace-to-net.mjs` from BPV-06. It emits the event shape that `replayNetTrace` needs, with `asserted: false` (decision BPV-D11). Its tests keep using the pinned sample trace from BPV-06, because the format is undocumented (finding 11 in the [spike evidence](./evidence/BPV-pre-program-spike.md)).
3. Give `scripts/check-net.mjs` a `--bombadil-traces` option. It replays every trace under the given directory and passes the replays to `computeTransitionCoverage`. The report separates asserted, explored-only and never-fired transitions.
4. Write `evidence/BPV-07-coverage.md` from a full nightly run. Label every never-fired in-scope transition as unreachable (a net bug), needs weight (add a weighted action) or out of scope (a scope file change). The Product Manager sets the explored coverage target from this first measurement and does not pick a target in advance.
5. Configure local Docker nightly execution (`docker/bombadil/compose.yml`, `scripts/bombadil/nightly.sh`, and `scripts/bombadil/nightly-scheduler.sh`, replacing the originally proposed `.github/workflows/bombadil-nightly.yml` per operator direction). On its daily schedule and via manual `docker compose --profile manual run --rm bombadil-nightly`, it builds the app, runs deterministic checks, explores every Bombadil target under `bombadil-output/`, and runs `check-net.mjs --bombadil-traces` to write `coverage.md` and `coverage-rejected.log`.
6. Wire `check:bombadil-nets`, `check:explorable-gui`, `check:net`, `docs:check`, and `test:unit` into `bombadil-gate` in `docker/bombadil/compose.yml` (keeping `.github/workflows/playwright-quality.yml` unchanged while preserving BPV-D09's fast deterministic gate locally).
7. Write the promotion procedure into the adoption guide. A nightly violation is shrunk, read with `bombadil browser inspect`, promoted to a Playwright spec under `tests/features/` and recorded in `DECISIONS.tsv`.
8. Update the docs. Rewrite `docs/08-testing/BOMBADIL_PROPERTY_TESTING.md` to match what was built. That means the body page state contract, the `data-effect` filter, imports with the `.ts` extension, the generated net module, the runner and the nightly workflow. Update `tests/README.md` and `docs/08-testing/README.md`.
9. Write `evidence/BPV-07-graduation.md` with the status of every item on the program's graduation list. Graduation is a separate operator gate after this sprint, because it needs five nightly runs from the workflow this sprint creates.
10. Run GitNexus `detect_changes` before committing and confirm that only the expected symbols and flows changed.

## Files

- Edit `scripts/bombadil/trace-to-net.mjs`
- Edit `tests/unit/bombadil-trace.test.mjs`
- Create `docker/bombadil/compose.yml`, `scripts/bombadil/nightly.sh`, and `scripts/bombadil/nightly-scheduler.sh` (local Docker nightly automation replacing `.github/workflows/bombadil-nightly.yml`)
- Create `docs/sprints/_active/evidence/BPV-07-coverage.md`
- Create `docs/sprints/_active/evidence/BPV-07-graduation.md`
- Edit `scripts/check-net.mjs`
- Edit `tests/unit/check-net.test.mjs`
- (`.github/workflows/playwright-quality.yml` left unchanged; deterministic gate wired via `bombadil-gate` in `docker/bombadil/compose.yml`)
- Edit `docs/08-testing/BOMBADIL_PROPERTY_TESTING.md`
- Edit `docs/08-testing/README.md`
- Edit `tests/README.md`
- Edit `docs/sprints/_active/INDEX.md`
- Edit `docs/sprints/_active/DECISIONS.tsv`

## BMAD responsibilities

### TEA

- Own the coverage report and the label on every never-fired transition.
- Watch the first five nightly runs and promote or record every violation.

### Developer

- Own the adapter, the `scripts/check-net.mjs` option, and the local Docker nightly runner (`docker/bombadil/compose.yml`, `scripts/bombadil/nightly.sh`, `scripts/bombadil/nightly-scheduler.sh`).

### Architect

- Confirm that explored coverage never counts as asserted coverage anywhere in the report.

### Product Manager

- Set the explored coverage target from the first measurement.
- Bring the graduation request to the operator once five nightly runs exist.

### Tech Writer

- Rewrite the adoption guide so that a new engineer can run every target from it alone.

## Acceptance criteria

- The coverage report shows asserted, explored-only and never-fired transitions as separate counts, and every never-fired in-scope transition has a label.
- The local Docker nightly runner explores every target and keeps its artifacts under `bombadil-output/`.
- The local Docker `bombadil-gate` runs the net drift check, GUI lint, `check:net`, `docs:check`, and `test:unit`.
- The adoption guide describes the built system and no longer calls itself a proposal.
- The graduation evidence states the status of every item on the program's graduation list.

## Test design

- `tests/unit/bombadil-trace.test.mjs` converts the pinned sample and checks the event count, the transition IDs and `asserted: false`. A second case feeds a line with an unknown shape and expects a clear error naming the Bombadil version.
- `tests/unit/check-net.test.mjs` gains a case where an explored-only trace raises the fired count and leaves the asserted count unchanged.

## Non-goals

- Gating pull requests on Bombadil runs.
- Running `bombadil browser fuzz`, which is experimental in 0.7.10.
- Antithesis simulation.

## Definition of done

- [x] **DoD-BPV-07-01** Traces convert to net events marked as not asserted. Verified by `node --test tests/unit/bombadil-trace.test.mjs tests/unit/check-net.test.mjs`.
- [x] **DoD-BPV-07-02** The coverage report runs on real traces and labels every never-fired in-scope transition. Verified by `node scripts/check-net.mjs --bombadil-traces bombadil-output && test -s docs/sprints/programs/bpv/evidence/BPV-07-coverage.md`.
- [x] **DoD-BPV-07-03** The deterministic checks and every target run nightly on local Docker (operator change of 2026-11-18, see below). Verified by `docker compose -f docker/bombadil/compose.yml --profile manual config --services | grep -q bombadil-gate && grep -q 'bombadil/run.mjs' scripts/bombadil/nightly.sh && grep -q 'check:explorable-gui' scripts/bombadil/nightly.sh`.
- [x] **DoD-BPV-07-04** The adoption guide describes the built system and the maintained docs pass their gate. Verified by `! grep -q 'Proposal' docs/08-testing/BOMBADIL_PROPERTY_TESTING.md && npm run docs:check`.
- [x] **DoD-BPV-07-05** The graduation evidence states the status of every graduation item, and the graduation request is recorded. Verified by `test -s docs/sprints/programs/bpv/evidence/BPV-07-graduation.md && grep -q 'BPV-07.*graduation request' docs/sprints/_active/DECISIONS.tsv`.

Evidence: [BPV-07 coverage](./evidence/BPV-07-coverage.md) and [BPV-07 graduation](./evidence/BPV-07-graduation.md), executed 2026-11-18. Operator graduation approved on 2026-11-18 (waiving the remaining four calendar night waits based on clean Run 1 `bombadil-output/nightly-2026-11-18T09-50-26Z` and the shortened Docker nightly `bombadil-output/nightly-2026-11-18T05-36-00Z`; archived at `docs/sprints/programs/bpv/` while `bombadil-scheduler` continues daily at `02:30` UTC).

## Operator change on 2026-11-18

The operator ruled that Program BPV runs no CI on GitHub and uses local Docker services instead. Work items 5 and 6 are therefore replaced:

- Item 5: `scripts/bombadil/nightly.sh` runs every target, and `docker/bombadil/compose.yml` runs it in a Linux container. The `bombadil-scheduler` service runs it every night, and `npm run bombadil:docker` runs it once. No `.github/workflows/bombadil-nightly.yml` exists.
- Item 6: `check:bombadil-nets` and `check:explorable-gui` run in the local `bombadil-gate` service and at the start of every nightly. `.github/workflows/playwright-quality.yml` is unchanged.

DoD-BPV-07-03 is verified against these files. The `DECISIONS.tsv` row "BPV-07 local Docker instead of GitHub CI" records the change.
