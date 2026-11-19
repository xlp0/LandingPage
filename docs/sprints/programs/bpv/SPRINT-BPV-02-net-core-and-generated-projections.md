# SPRINT-BPV-02 Net core and generated projections

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-BPV-02` |
| Handle | `urn:pcard:sprint:SPRINT-BPV-02` |
| Status | `COMPLETED` |
| Depends on | `SPRINT-BPV-01`, which creates the scope file the generator reads |
| Unblocks | `SPRINT-BPV-03` |
| Execution unit | `PR-BPV-02` |
| Poteto playbook | `refactoring` for the extraction, then `feature` with `principle-build-the-lever` and `principle-model-the-domain` |
| BMAD roles | Architect, Developer, TEA |
| Effort | 2 days (guess) |

## Outcome

Every list of places, arcs, routes and recorder edges that a Bombadil spec reads is generated from its source and checked for drift. Nothing is copied by hand. The URL resolver that the Playwright tracer uses becomes the one the specs use.

The pre-program spike found that the adoption guide's route generator already disagrees with `resolvePlaceForUrl`. The guide keeps every binding with a route, which puts 13 places on `/responsive-lab.html`. It also ignores route aliases and query flags. Generating from the resolver's own logic removes that class of drift.

## Work sequence

1. Run GitNexus `impact` upstream on `resolvePlaceForUrl` and `RecordingStateMachine` and record the blast radius in the PR description.
2. Capture the golden snapshot before moving anything. Resolve every place binding, every route alias and every query flag in `src/net/workbench-net.yaml` with the current `resolvePlaceForUrl`, and commit the results as `tests/fixtures/net-core-golden.json`.
3. Move `resolvePlaceForUrl` and its helpers from `tests/fixtures/net-trace.js` into `src/net/net-core.mjs`. The new module imports nothing from Playwright or `clm-kernel`. Update `tests/fixtures/net-trace.js` to import it and delete the old copy in the same change. The golden test resolves the same inputs with the moved code and compares them with the committed snapshot.
4. Model the recorder lifecycle as data. Export a `RECORDER_TRANSITIONS` table from `js/harness/recording-state-machine.js`, with one row per action listing `from` states and the `to` state. Rewrite the class guards to read the table. `tests/unit/recording-state-machine.test.mjs` must pass unchanged.
5. Decide the history policy and record it in `DECISIONS.tsv`. The workbench net has an arc from the lab to Mission Control but none back, so a browser Back step leaves the net. The proposed policy is that a Back or Forward step may move along the reverse of any declared navigation arc. The generator emits these reverse arcs as `HISTORY_ARCS`, and the net itself stays unchanged. This is looser than the browser, which can only go back along arcs the run actually fired. Record that limit in the decision row. BPV-03's cross-document firing records make a stricter check possible later.
6. Write `scripts/gen-bombadil-nets.mjs`. It writes `tests/bombadil/generated/workbench-net.ts` with these values. With `--check` it regenerates in memory and exits 1 when the committed file differs.
   - `PLACES`, `ARCS` (`{ transitionId, from, to, kind }`), `HISTORY_ARCS` (`{ transitionId: "history:...", from, to, kind: "history" }`), `ENTRY_URLS`, `ALLOW_URLS`, and `RECORDER_TRANSITIONS`.
   - `HISTORY_ARCS`.
   - `ENTRY_URLS` from `tests/bombadil/scope.json`.
   - `ALLOW_URLS`, one list of Chrome match patterns per entry URL for Bombadil's `--allow-url`. Each list covers the in-scope routes and leaves out `boundary` routes such as `/app.html`, so a same-tab link cannot carry a run out of scope.
   - `RECORDER_TRANSITIONS`.
7. Fix the transition triggers in `src/net/workbench-net.yaml` (where 20 originally cited `file:line` positions on built pages). Give each authored UI/navigation trigger a `triggerSource` with `file` under `src/` or `js/` and either a `selector` or a `call` (`21` transitions in `src/net/workbench-net.yaml` carry `triggerSource` with `file` and `selector`, and `triggerDrift()` in `scripts/gen-bombadil-nets.mjs` validates both `selector` and `call`). The drift check fails when a `selector` or `call` string does not occur in its source file. Regenerate `docs/01-architecture/workbench-net.md` with `npm run docs:gen-net` in the same change.
8. Use the spike's answer on imports. If a spec can import `src/net/net-core.mjs`, the specs call the resolver directly. If it cannot, the generator also emits the resolver's route table, and the golden test covers the generated table.
9. Run GitNexus `detect_changes` before committing and confirm that only the expected symbols and flows changed.

## Files

- Create `tests/fixtures/net-core-golden.json`
- Create `src/net/net-core.mjs`
- Create `scripts/gen-bombadil-nets.mjs`
- Create `tests/bombadil/generated/workbench-net.ts`
- Create `tests/unit/net-core.test.mjs`
- Create `tests/unit/bombadil-nets.test.mjs`
- Edit `tests/fixtures/net-trace.js`
- Edit `js/harness/recording-state-machine.js`
- Edit `src/net/workbench-net.yaml`
- Edit `docs/01-architecture/workbench-net.md` through `npm run docs:gen-net`
- Edit `package.json` to add `bombadil:nets` and `check:bombadil-nets`
- Edit `docs/sprints/_active/DECISIONS.tsv`

## BMAD responsibilities

### Architect

- Own the history policy decision and the shape of the generated module.
- Reject any generated value that a spec could compute from another generated value.

### Developer

- Do the move as a pure refactor first, with the golden test green, before the generator lands.
- Keep `src/net/net-core.mjs` free of side effects so that it is safe to import anywhere.

### TEA

- Prove the drift check by mutating a scratch copy of the YAML and watching the check fail.

## Acceptance criteria

- One resolver exists, and both the Playwright tracer and the Bombadil specs use it.
- The golden test covers every route, alias and query flag in the workbench net.
- The recorder class reads its legal moves from the exported table, and its existing tests pass unchanged.
- The drift check fails on a mutated net, a mutated scope file and a trigger selector that no longer exists.
- The history policy is recorded with its reason.

## Test design

- `tests/unit/net-core.test.mjs` holds the golden test and checks that `src/net/net-core.mjs` has no import of `@playwright/test` and no import of `clm-kernel`.
- `tests/unit/bombadil-nets.test.mjs` runs the generator against fixture nets and checks the emitted arcs, history arcs and entry URLs. It also runs `--check` against a mutated copy.

## Non-goals

- Changing the workbench net's places or transitions, other than the trigger format.
- Generating anything for the SPA net, which specs import as JSON (decision BPV-D04).
- Coverage reporting, which is BPV-07.

## Definition of done

- [x] **DoD-BPV-02-01** The resolver lives in the pure net core, and the golden test proves identical resolution. Verified by `node --test tests/unit/net-core.test.mjs tests/unit/net-trace-replay.test.mjs`.
- [x] **DoD-BPV-02-02** The recorder lifecycle is a table and its existing tests pass. Verified by `node --test tests/unit/recording-state-machine.test.mjs`.
- [x] **DoD-BPV-02-03** The generated module is current. Verified by `npm run check:bombadil-nets`.
- [x] **DoD-BPV-02-04** The drift check fails on a mutated net, scope file and trigger selector. Verified by `node --test tests/unit/bombadil-nets.test.mjs`.
- [x] **DoD-BPV-02-05** The net still validates, its generated doc is current and the history policy is recorded. Verified by `npm run check:net && npm run docs:check && grep -q 'BPV-02.*history policy' docs/sprints/_active/DECISIONS.tsv`.
