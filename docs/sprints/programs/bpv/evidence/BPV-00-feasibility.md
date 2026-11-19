# BPV-00 feasibility evidence

| Field | Value |
| --- | --- |
| Audience | BPV sprint owners and reviewers |
| BMAD Owner | Developer with TEA |
| Source of Truth | This file. Raw logs and traces live in the session scratch directory and are not committed. |
| Sprint | [SPRINT-BPV-00](../SPRINT-BPV-00-toolchain-runner-and-spa-canary.md) |
| Status | Complete. The pinned install, runner, canary, triage fix, regression spec, probe answers, baseline dispositions, and program continuation decision (`DECISIONS.tsv`) are complete. |

## Playwright baseline

Run on 2026-11-17 at LandingPage `3fb2cb8`, with 37 uncommitted paths in the working tree, using Playwright 1.64.1. The command was `npx playwright test --project=smoke --project=components --project=features --reporter=json`, and it took 127 seconds.

| Result | Count |
| --- | ---: |
| Passed | 593 |
| Skipped | 16 |
| Failed | 35 |
| Flaky | 0 |

All 35 failures are in the features project. Each needs a decision row before BPV-01, per step 1 of the sprint.

| Spec | Failures | Failing cases | First error |
| --- | ---: | --- | --- |
| `tests/features/layout-freeze.spec.js` | 25 | Every page (`app`, `index`, `responsive-lab`, `fiber-inspector`, `fiber-conformance`) at every device class (`wearable`, `mobile`, `web`, `desktop`, `arvr`) | "N elements moved" |
| `tests/features/presentation-lattice.spec.js` | 8 | Tests 5 to 12 | Missing elements and changed text. Tests 6 to 9 and 12 target controls that do not exist in `src`, `js` or `public`. |
| `tests/features/correctness-inspector.spec.js` | 1 | DV-CDO-14-01..11 | An expected panel is not visible |
| `tests/features/penpot-navigation.spec.js` | 1 | DV-CDO-15-01..05 | The Penpot navigation bar is not visible on `/index.html?noredirect=1` |

The layout-freeze failures are uniform across all 25 cases, which suggests a stale layout snapshot rather than 25 separate regressions. That is inferred, not checked.

## Probe answers

| Question | Answer | How it was measured |
| --- | --- | --- |
| Can a spec export an extractor? | No. Bombadil refuses to start with an error saying the export "is of unknown type (object)". Extractors must stay module-private. Only properties and action generators may be exported. | A triage spec that exported its extractor |
| Is `timeout` available to scripts? | Not on macOS. A command wrapped in `timeout` exits 127. The runner must rely on Bombadil's `--time-limit` and its own child-process handling. | Shell exit code |
| What is the history depth during a run? | `history.length` reaches Chrome's cap of 50 entries within about 60 states and stays there. | The `history.length` field of the triage extractor |
| What is the run rate? | About 26 states per second, or about 300 navigation-like actions per 10 seconds. The mix in one 45 second run was 1059 clicks, 102 Backs, 15 Reloads and 8 Waits. | Trace timestamps, in microseconds |
| Can `extract` read a page global such as `window.__netReport`? | Yes, live. A spec read the array length and saw a record that a click added. | A probe page with a global log and a property that must fail once a second record appears |
| Can a custom action click inside a same-origin iframe? | Yes. A `registerCustomAction` handler that reaches the button through the frame's `contentDocument` landed its clicks. BPV-06 can drive the framed target this way. | A probe property that failed once the frame's click counter rose |
| Does `--allow-url` keep a run off a same-tab link outside the boundary? | Yes. Without it the run followed the link and failed. With the start page and `/in/*` allowed, the same 30 second run stayed clean. | A control run and a bounded run of the same spec |
| What log line marks a stalled run? | `quiescence timer (action applied) failed`. A page that opens a popup produced 3 states and 3 such lines in 25 seconds. A plain page produced 740 states and none. | Two 25 second runs |

## SPA triage

The adoption guide's four properties plus `hashMatchesPlace` were run against the unmodified fixture. `hashMatchesPlace` reads the hash and the place in the same extractor.

`hashMatchesPlace` was violated at state 1184 of a 45 second run. A click on Open Service Details changed the view to `p_spa_details`, but `location.hash` stayed `#overview`. At that point `history.length` had been at its cap of 50 for over 1100 states. The previous 1183 states all had the hash and the place in agreement.

This explains the spike's earlier violation. Once the view and the URL disagree, a later Back restores the hash of a history entry whose view was different. That moves the view along an arc the net does not declare.

### Root cause

The fixture rendered its new view before knowing whether the URL changed. Chrome's IPC flooding protection silently drops history updates once a page makes about 200 of them in quick succession. It logs only a console warning, "Throttling navigation to prevent the browser from hanging". From then on the view moved while `location.hash` stayed put.

Three violating Bombadil runs all failed after 211, 215 and 225 transitions within one boot. Bombadil drives about 30 actions per second, so a page reaches that budget in under 10 seconds.

The first Playwright repros could not reproduce it. Playwright launches Chromium with `--disable-ipc-flooding-protection` by default, which turns this protection off. With that one default flag removed, the same repro drifted at exactly click 201 and logged the throttling warning. Paced at 11.5 clicks per second, it did not drift. Earlier hypotheses that were ruled out are a simple rate limit under Playwright's defaults and a mix of Back and Reload actions.

So the fixture was wrong, not the net. A user clicking quickly, or any automated driver without Playwright's flag, could leave the view and the URL out of step. Every later Back step then moved the view along arcs the net does not declare.

### Fix and regression

- **Fix.** `tests/fixtures/spa-test-target.html` now pushes the history entry first. It renders the new view only if `location.hash` really changed, so the URL stays the single source of truth. A dropped update leaves the page unchanged.
- **Regression.** `tests/features/spa-history-flood.spec.js` launches Chromium with the flooding protection kept and clicks 260 times. It asserts that the hash matches the shown place after each click and that Chrome really throttled. It failed at click 201 against the original fixture and passed against the fix in 11 seconds.
- **Bombadil after the fix.** A 2 minute run of `tests/bombadil/spa-target.bombadil.ts` against the fixed fixture ended with no violation. Before the fix, runs failed within 20 to 45 seconds.
- **Canary.** `node scripts/bombadil/canary.mjs --runs 5 --min-violations 4 --time-limit 1m` detected the seeded bug as a `hashMatchesPlace` violation in 5 of 5 runs.

These BPV-00 spike runs used the 0.7.10 binary from the spike's scratch install through the runner's `BOMBADIL_BIN` override prior to pinning `@antithesishq/bombadil` `0.7.10` in `package.json` and Dockerizing execution in `docker/bombadil/compose.yml`.

### Lessons for later sprints

- Bombadil found a bug that no Playwright test could find under Playwright's default launch flags. Any Playwright regression promoted from a Bombadil finding about history or navigation must keep Chrome's flooding protection on.
- `noConsoleErrors` cannot see the throttling warning, because the warning is not an error. A violation of `hashMatchesPlace` is the observable symptom.

## Code review of the runner and canary

An independent code review found two HIGH defects in the first version of `scripts/bombadil/run.mjs`. Both are fixed and each has a unit test.

- **Foreign server.** A server already listening on the runner's port could answer `/health`, and the run would test it instead of the server the runner started. The runner now refuses to start when anything already answers the health URL. It also fails at once, rather than after the 30 second health timeout, when its own server exits before it is healthy.
- **Orphaned processes.** A failed spawn emitted an `error` event with no listener, and signals skipped cleanup. Exit and error listeners are now attached as soon as each child exists. SIGINT and SIGTERM stop Bombadil and the server and exit with 130 and 143.

The review also led to these changes.

- An ambient `BASE_URL` is ignored.
- Flags the runner owns, such as `--output-path`, are rejected after `--`.
- The canary tolerates a truncated trace line, rejects `--min-violations 0`, and refuses a stale canary fixture.

Three findings are not addressed. Quoted arguments in a custom `TEST_SERVER_COMMAND` are split on spaces. A Bombadil process killed by a signal reports exit 1. Signal handling has no unit test.

The canary moved to `tests/bombadil/fixtures/spa-test-target-canary.html`. In `tests/fixtures/` it failed the GQC registry rule that every fixture page is a registered target surface, and a deliberately broken page does not belong in that registry.

After these changes, `npm run test:unit` passed 205 of 205 tests and `npm run docs:check` passed. A real run against an occupied port 3021 exited 1 with the refusal message. A 30 second run of the fixed fixture ended clean, and one canary run detected its seeded bug.

## Dispositions of the 35 baseline failures

Each failure was traced to a cause on 2026-11-17. None is caused by BPV work.

| Spec | Failures | Cause | Disposition |
| --- | ---: | --- | --- |
| `tests/features/layout-freeze.spec.js` | 25 | The layout baseline is the root repository's STY layout baseline, captured on 2026-10-07. Program GQC moved every page onto Astro on 2026-10-27 and 28. Each page moved by the same count at all five device classes (app 225, index 95, lab 140, fiber inspector 321, fiber conformance 10). That points to one structural change per page, not 25 regressions. This is inferred from the dates and the uniform counts. | Re-baseline once, after BPV-01's removals land, with a `rebaselines` entry naming GQC-02B and BPV-01. The root STY program owns the file. |
| `tests/features/presentation-lattice.spec.js` tests 6, 7, 8, 9 and 12 | 5 | They target `#deployment-inspector-btn`, `#mission-control-split-btn`, `#least-action-btn`, `#fibration-observability-btn` and related controls. Commit `9e08c3c` deliberately removed all of them on 2026-10-20. | Delete in BPV-01, together with the leftover listeners. |
| `tests/features/presentation-lattice.spec.js` test 10 | 1 | It expects the "Sprint CDO-12 • Full-Window Workbench" badge text. | Delete the assertion in BPV-01, which removes the badge. |
| `tests/features/presentation-lattice.spec.js` test 11 | 1 | It expects older copy in `#cors-block-alert`. The alert now explains the X-Frame-Options block and offers a reset. | Update the expectation to the current copy in BPV-01. |
| `tests/features/presentation-lattice.spec.js` test 5 | 1 | A responsive layout invariance check returned `true` where `false` was expected. The cause is not established. | Investigate in BPV-01. It may be a real layout defect. |
| `tests/features/correctness-inspector.spec.js` | 1 | It clicks `#deployment-inspector-btn`, removed in `9e08c3c`. | Delete or retarget in BPV-01. Also decide whether `js/runtime/deployment-inspector.js` is still reachable. |
| `tests/features/penpot-navigation.spec.js` | 1 | `js/nav.js` was regenerated for a two-page site (Home and Docs Index, graph hash `5c58f7d1`). `src/pages/index.astro` still embeds the older three-link navigation (Home, Mission Control and the lab, hash `7fc5562f`). | Regenerate the embedded navigation in BPV-01. That also removes the same-tab link to the boundary page `/app.html`. |

`tests/features/presentation-lattice.spec.js` had two uncommitted changed lines from outside this session when the baseline ran.

## Pinned install

On 2026-11-17 the operator approved installing Bombadil at its latest version. The npm `latest` tag and the newest GitHub release were both `0.7.10`, published 2026-10-21 and not a prerelease. That is the version this program already pinned. `@antithesishq/bombadil` is now an exact devDependency, `package.json` has a `bombadil:spa` script, and `npx bombadil --version` prints `bombadil 0.7.10`.

### Install incident and repair

The first `npm install` ran inside LandingPage. The parent repository's `package.json` declares LandingPage as an npm workspace, so npm treated the parent repository as the project root.

- The install hoisted Bombadil into the root `node_modules` and the root `package-lock.json`. That adds 11 lines.
- It left LandingPage's own `package-lock.json` without Bombadil. LandingPage's own CI runs `npm ci` against that file, so CI would have failed.
- It reconciled the whole root workspace and pruned LandingPage's standalone `node_modules` to 23 entries. The built server then crashed on start, because `clsx` resolved to the root's CommonJS `clsx@1.1.1` instead of LandingPage's `clsx@2.1.1`.

The repair had two steps.

- **Standalone lock.** LandingPage's `package-lock.json` was regenerated from a copy of LandingPage's manifests outside the parent workspace. Apart from the Bombadil entry it is identical to the previous lock, and `npm ci --dry-run` accepts it.
- **Standalone install.** `npm ci --workspaces=false` reinstalled LandingPage's packages from that lock. Compared with the pre-install inventory in `node_modules/.package-lock.json`, Bombadil was added and no version changed. The four links to LandingPage's own `packages/*` workspaces are not recreated with `--workspaces=false`, and nothing in `src`, `js`, `server`, `scripts` or `tests` imports them. The build, 210 of 210 unit tests and a server boot passed afterwards.

The root `package-lock.json` keeps its 11 added lines, which describe the root workspace correctly. The root `node_modules` was reconciled to the root lock by the first install. mcard-studio's `node_modules` was not touched.

Future installs in LandingPage must run with `--workspaces=false`, or in a standalone checkout.
