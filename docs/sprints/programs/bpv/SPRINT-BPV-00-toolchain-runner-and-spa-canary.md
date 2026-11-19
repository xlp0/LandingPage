# SPRINT-BPV-00 Toolchain, runner and SPA canary

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-BPV-00` |
| Handle | `urn:pcard:sprint:SPRINT-BPV-00` |
| Status | `COMPLETED` |
| Depends on | None |
| Unblocks | `SPRINT-BPV-01` |
| Execution unit | `PR-BPV-00` |
| Poteto playbook | `prototype` for the probe items, then `feature` with `principle-prove-it-works` and `principle-build-the-lever` |
| BMAD roles | Developer, Architect, TEA, Product Manager |
| Effort | 2 days (guess) |

## Outcome

Bombadil runs inside the repository against a hermetic server with one command. A canary proves the run can find and shrink a real bug. The sprint ends with a go or no-go decision for the whole program.

The pre-program spike answered most API questions outside the repository. This sprint repeats the answers that later sprints depend on as committed, rerunnable checks. It also triages the violation the spike found on the real SPA fixture.

## Work sequence

1. Record the Playwright baseline before any change. Run the smoke, components and features projects and list every failing test in `evidence/BPV-00-feasibility.md`. For example, `tests/features/presentation-lattice.spec.js` targets six ids that exist nowhere in `src`, `js` or `public`, measured on 2026-11-17. Give each pre-existing failure a decision row. It is fixed here, marked `test.fixme` with the row's reason, or scheduled for deletion in BPV-01. Every later "suites pass" check then means no new failures.
2. Pin `@antithesishq/bombadil` at exactly `0.7.10` as a devDependency and add `bombadil-output/` to `.gitignore`.
3. Write `scripts/bombadil/run.mjs`. It calls `resolvePlaywrightServerContract()` from `tests/fixtures/server-contract.js`, starts `node ws-server.js` with the contract's environment, waits for `/health`, runs one named spec against its start URL, and stops the server on every exit path. It refuses to start when the resolved database is the repository database, which the contract already enforces. It gives every run a fresh output directory inside the ignored output folder, because Bombadil refuses to write where a `trace.jsonl` already exists. An explicit `--output-path` is accepted only when that directory holds no trace yet. It passes Bombadil's exit code through unchanged, so a violation (exit 2) can be told apart from a setup failure (exit 1).
4. Write `tests/bombadil/spa-target.bombadil.ts`. It imports `tests/fixtures/spa-test-target.graph.json` directly (decision BPV-D04) and `./net-report.ts` (added in BPV-07 for trace firing capture). It derives the hash-to-place table from the route bindings, which carry `#overview`, `#details` and `#missing-transition`. Its properties are the four from the guide plus `hashMatchesPlace`. One extractor reads `location.hash`, `document.body` attributes (`data-place-id` and `data-boot-nonce`, updated in BPV-03 from `#spa-app-root`), `[data-testid="spa-app-root"]`'s `data-transition-count`, and `[data-testid="spa-error-alert"]` presence, so the values always come from the same state. Any hash absent from `HASH_TO_PLACE` (including an empty hash `""`) is skipped, because the fixture shows the overview before any navigation.
5. Create the canary fixture `tests/bombadil/fixtures/spa-test-target-canary.html`. It is a copy of the SPA fixture with the `popstate` listener removed. Write `scripts/bombadil/canary.mjs`, which runs the SPA spec against the canary five times. It passes when at least four runs exit 2 and their traces record a violation of `hashMatchesPlace`.
6. Triage the spike violation, where Back moved the view from `p_spa_missing_transition` to `p_spa_details`. Run the spec, inspect the shrunk trace, and decide whether the fixture or the net is wrong. Record the decision in `DECISIONS.tsv`. Fix the side that is wrong and promote the shrunk sequence to `tests/features/spa-history-flood.spec.js`. On 2026-11-17 the triage found the fixture wrong. It rendered a view even when Chrome's navigation flooding protection dropped the history update. See the [feasibility evidence](./evidence/BPV-00-feasibility.md).
7. Finish the probe items the spike left open, and record each answer with its command in `evidence/BPV-00-feasibility.md`.
   - Can `extract` read `window.__netReport`?
   - Can `registerCustomAction` click a control inside the ViewportStage iframe?
   - Does `--allow-url` keep a run off `/app.html` when a same-tab link points there?
   - What exact log line marks a stalled run? The spike logged `quiescence timer (action applied) failed` after a popup. Confirm the line on a page with a popup, so that later greps for it are known to work.
8. Write the continuation decision in `DECISIONS.tsv` with the phrase "program continuation". A stop decision ends the program and leaves the guide as a proposal.

## Files

- Edit `package.json` to add the pinned devDependency and the script `bombadil:spa`
- Edit `package-lock.json`
- Edit `.gitignore` to add `bombadil-output/`
- Create `scripts/bombadil/run.mjs`
- Create `scripts/bombadil/canary.mjs`
- Create `scripts/bombadil/make-canary.mjs`
- Create `tests/unit/bombadil-canary.test.mjs`
- Create `tests/bombadil/spa-target.bombadil.ts`
- Create `tests/bombadil/fixtures/spa-test-target-canary.html`
- Create `tests/unit/bombadil-runner.test.mjs`
- Create `tests/features/spa-history-flood.spec.js`
- Create `docs/sprints/_active/evidence/BPV-00-feasibility.md`
- Edit `tests/fixtures/spa-test-target.html`, which the triage found wrong
- Edit `docs/sprints/_active/DECISIONS.tsv`

## BMAD responsibilities

### Developer

- Own the runner, the spec and the canary fixture.
- Keep the runner free of Bombadil logic beyond argument passing, so a Bombadil upgrade touches one place.

### Architect

- Decide the triage outcome with the Product Manager. A missing arc is a net change. A view that disagrees with its URL is a fixture bug.
- Review the probe answers before later sprints rely on them.

### TEA

- Run the canary five times and record how many runs find and shrink the bug.
- Confirm that the promoted Playwright spec fails on the unfixed code and passes on the fix.

### Product Manager

- Make the go or no-go call from the evidence file.

## Acceptance criteria

- One command runs the SPA spec against a fresh temporary database and leaves no server process behind.
- The canary finds its seeded bug and shrinks it to 10 steps or fewer in at least 4 of 5 runs of 2 minutes each.
- The real fixture runs clean for 5 minutes after the triage fix.
- The triage decision names the wrong side and links the promoted Playwright spec.
- Every open probe item has a recorded answer and the command that produced it.

## Test design

- `tests/unit/bombadil-runner.test.mjs` checks that the runner refuses the repository database, passes the contract environment through, and exits non-zero when Bombadil reports a violation. It stubs the Bombadil process, so it runs in `npm run test:unit` without a browser.
- `tests/features/spa-history-flood.spec.js` launches Chromium with its flooding protection kept, clicks past the throttle limit, and asserts the place and the URL hash after each step.
- `tests/unit/bombadil-canary.test.mjs` fails when the committed canary is not the fixture minus its `popstate` listener.

## Non-goals

- Workbench, recorder and page-load specs, which come in BPV-05 and BPV-06.
- Generating the workbench net projections, which is BPV-02.
- CI wiring, which is BPV-07.

## Definition of done

- [x] **DoD-BPV-00-01** The pinned Bombadil binary reports the expected version. Verified by `npx bombadil --version | grep -qx 'bombadil 0.7.10'`.
- [x] **DoD-BPV-00-02** The runner refuses the repository database and propagates a violation as a non-zero exit. Verified by `node --test tests/unit/bombadil-runner.test.mjs`.
- [x] **DoD-BPV-00-03** The canary bug is found as a `hashMatchesPlace` violation in at least 4 of 5 runs. Verified by `node scripts/bombadil/canary.mjs --runs 5 --min-violations 4 --time-limit 2m`.
- [x] **DoD-BPV-00-04** The real SPA fixture runs clean after the triage fix, and the promoted regression passes. Verified by `npm run bombadil:spa -- --time-limit 5m && npx playwright test tests/features/spa-history-flood.spec.js --project=features`.
- [x] **DoD-BPV-00-05** The feasibility evidence, the Playwright baseline and the program continuation decision are recorded. Verified by `grep -q 'BPV-00.*program continuation' docs/sprints/_active/DECISIONS.tsv && grep -q 'Playwright baseline' docs/sprints/programs/bpv/evidence/BPV-00-feasibility.md`.
