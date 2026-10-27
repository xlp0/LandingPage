# Program GQC plan

Program GQC makes the Responsive UI Lab a guided, SPA-first test workbench. Users select a target SPA, choose a device and viewport, test functional links, record or replay a journey, and inspect its MCard result. GQC builds on the graduated SMO and ERB programs without rebuilding their MCard, device, capture, replay, or conformance work. PenPot-assisted MPA assessment is optional and gated by the Product Manager. This plan authorizes no implementation.

The product model uses a target Page or View as a Place and a Functional Link as a Transition. The same model covers the workbench itself: every LandingPage page is a Place, and every hyperlink, redirect, `window.open`, page switch, and UI-reachable server call is a Transition. Both nets are `clm-kernel/layer1` `PetriNetTopology` values; the Layer 4 navigation net is an optional facade over the same card types. The workbench and the target app remain separate. Playwright proves live browser behavior. MCard records hold process and run evidence. A design edge does not prove a live transition.

LandingPage moves to Astro in this program. Pages ship static HTML by default, and interactive regions hydrate as Preact islands that mount the existing vanilla modules. Astro runs in Node middleware mode inside the existing Express server. Express keeps WebSockets, the current APIs, and the CORS and CSP middleware. Public URLs do not change.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `../.agents/skills/poteto-mode/playbooks/autopilot-stack.md`. Each PR owner builds and verifies one slice. The coordinator appends verified slices in dependency order. The operator reviews and lands the stack.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

The sprint files carry implementation context, test scenarios, open decisions, and handoff details. The checkboxes in those files stay open until an owner records the named evidence.

The 10 percent and 100 ms values are provisional regression guards, not a required speedup. TEA and the Product Manager record whether they block or stay advisory in GQC-00. A code optimization still needs paired evidence that exceeds observed run spread and a profile that identifies the bottleneck.

## Program checklist

### Arm the program

- [ ] State this plan and the stack protocol to the operator. Start only after the operator gives an explicit go.
- [ ] Read these files from trunk at program start. Re-read them at each audit tick.
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `git show origin/main:pstack/skills/swarm/SKILL.md`
  - [ ] Read `../.agents/skills/control-ui/SKILL.md` for browser verification.
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `git show origin/main:pstack/skills/principle-sequence-verifiable-units/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/principle-prove-it-works/SKILL.md`
- [ ] If an `origin/main:pstack/skills/` path does not exist, read its installed counterpart under `../.agents/skills/` and record that the repository does not vendor the Poteto files.
- [ ] Read `~/.pstack/models.md` and record the exact `swarm workers` model in the run header. If the file or line is missing, use the active harness default. If the harness cannot select a model per worker, record that limit and use its default consistently.
- [ ] Use the `chromium` project for each lane unless the approved browser matrix names another project. Record browser and version in every report.
- [ ] On the operator's go, arm the hourly audit tick with `/loop 1h`. Never leave the cadence to memory.
- [ ] Use this tick prompt. "Re-read the execution playbook from trunk. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On hold or stand-down, stop new work at once. An owner already inside an atomic Git write finishes that command, reports its exact tip, and stops before another push or merge.

### Spawn owners

- [ ] Spawn one owner per PR. Each owner returns its code-ready head, test output, live-lane screenshots, performance measurements, and open risks.
- [ ] Follow this dependency graph. A child starts only after its parent is verified in the stack.
  - [x] `PR-GQC-00` branches from `main`.
  - [x] `PR-GQC-01` follows `PR-GQC-00`.
  - [x] `PR-GQC-02` follows `PR-GQC-01`.
  - [x] `PR-GQC-02A` follows `PR-GQC-02`.
  - [x] `PR-GQC-02B.1` follows `PR-GQC-02A`.
  - [ ] `PR-GQC-02B.2` follows `PR-GQC-02B.1`.
  - [ ] `PR-GQC-03` follows `PR-GQC-02B.2`.
  - [ ] `PR-GQC-04` follows `PR-GQC-03`.
  - [ ] `PR-GQC-05` follows `PR-GQC-04`.
  - [ ] `PR-GQC-06` follows `PR-GQC-05`.
  - [ ] `PR-GQC-07` follows `PR-GQC-06`.
- [ ] Keep each PR inside its file boundary. Each sprint document names the exact allowed paths.
- [ ] Hold the review gate. `PR-GQC-02B.1`, `PR-GQC-02B.2`, `PR-GQC-03`, `PR-GQC-04`, `PR-GQC-05`, and `PR-GQC-06` change or may change how a page is served or how a user interaction behaves. They stop for operator review with screenshots and a video.
- [ ] From `PR-GQC-02A` on, every PR runs `npm run check:net`. From `PR-GQC-02B.1` on, every PR runs `astro build` with the net-parity check.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Use `gh` unless the configured `origin` CLI can resolve this repository. Record any fallback. Never require `gt`.
- [ ] Open each PR ready, not draft. A stack child targets its parent branch.
- [ ] Before verification, record the base SHA, head SHA, and output of `git diff "$BASE_SHA...$HEAD_SHA" | git patch-id --stable`. Record the source, fixture, configuration, and baseline paths each lane reads.
- [ ] Run the selected lint, test, and build commands before the PR-facing push. Do not add a new runtime or test framework without a measured need.
- [ ] Run GitNexus impact and change checks if a current LandingPage index is available. The parent workspace index was stale during planning. If it remains stale, record the limitation and trace imports and callers from source instead.
- [ ] Treat `DECISIONS.tsv` as append-only. The coordinator is its single writer and appends an approved decision with owner, target sprint, evidence, and result.
- [ ] The Scrum Master coordinates decision-log writes and active-index status. A backup writer must be named before taking over; never sort or rewrite earlier rows.
- [ ] Keep writes to shared files sequential. A later PR edits only its named region and records all lane input files, including unchanged files from the parent base.
- [ ] Use the Poteto `deslop` and `no-comments` checks before commit and review.
- [ ] Triage every automated review comment. Keep the reason for a fix, dismissal, or open decision in the PR evidence.

### Verdict and merge, for every PR

- [ ] Run one full verification swarm at the code-ready head. Run the ten live lanes from that PR and its performance probe.
- [ ] Add two audit lanes. One checks the implementation against the acceptance criteria. The other checks test quality, failure cleanup, and documentation claims.
- [ ] If the trunk lane fails, record the trunk result and last known good SHA. If trunk lacks the feature, gate the head behavior and its user-visible end state. Do not fail head only because trunk already fails.
- [ ] Mark a PR clean only when every required lane returns `PASS`. A pure rebase has no conflict resolution and retains the stable patch ID. It does not automatically preserve live or perf evidence.
- [ ] If the patch-id changes, void the verdict and rerun every required lane at the new head. Record the new head SHA and the evidence that applies to it.
- [ ] Any rebase conflict resolution voids all live and perf evidence for affected inputs, even if the resulting patch-id is unchanged. Rerun every affected lane.
- [ ] After a same-patch rebase, rerun branch-protection CI. Compare lane inputs with `git diff --quiet "$OLD_BASE" "$NEW_BASE" -- "${LANE_INPUTS[@]}"`. Retain live or perf evidence only when the probe code, fixtures, configuration, and trunk baseline are unchanged. Rerun affected lanes otherwise.
- [ ] A pure rebase has no conflict resolution and keeps the stable patch ID. Recompute it after rebase. Re-run a lane if any source, fixture, configuration, or baseline input it reads changed.
- [ ] Append each clean PR to the stack in dependency order. Stop at merge-ready and let the operator land the stack bottom-up.
- [ ] After each operator landing, update the next child's base under the Autopilot Stack rules. Re-run CI on the new head. If the operator squash-merges a parent, apply the same patch-id and lane-input checks before reusing child evidence.

### Boot recipe, for every live lane

Each live lane uses an isolated checkout at the PR head. Drive the actual web UI with the repository Playwright harness and the `control-ui` workflow.

- [ ] Fetch and check out the exact PR head SHA.
- [ ] Run `npm ci` and install the browser required by the lane.
- [ ] Start the server through the selected Playwright project. Use the port from the active test configuration, not a literal copied into a spec.
- [ ] Run `chromium` unless the lane names another approved browser project.
- [ ] Select the page by URL and a stable role, label, or app marker. Capture a before screenshot, perform one action, wait for the expected state, and capture the result.
- [ ] Save evidence to the screenshot path in the PR's live-lane box. Report that path and the observed side effect.

## Map the SPA-first workbench and MCard contracts (PR-GQC-00)

**Depends on.** None.

**Files.**

- [x] Create `docs/sprints/_active/SPRINT-GQC-00-project-census-and-behavior-baseline.md`.
- [x] Create `docs/sprints/_active/evidence/GQC-00-consumer-map.md` with module, caller, package, page, test, and documentation paths.
- [x] Create `tests/gui-coverage.json` with distinct workbench and target-app records, target type, journey owner, and priority.
- [x] Create `tests/unit/gui-coverage-registry.test.mjs` for the coverage registry contract.
- [x] Edit `package.json` to add `check:playwright-discovery`.
- [x] Create `scripts/check-playwright-discovery.mjs`.
- [x] Create `.github/workflows/playwright-quality.yml` for the discovery preflight.
- [x] Record the deterministic SPA fixture contract for GQC-02. Do not treat `app.html` as an SPA without Product Manager approval.
- [x] Create `docs/sprints/_active/evidence/GQC-00-astro-readiness.md` with the public URL space, static mounts, service workers, and workbench Place and Transition candidates.
- [x] Append GQC-00 decisions to `docs/sprints/_active/DECISIONS.tsv`.
- [x] Do not edit graduated SMO or ERB sprint documents.

**Build.**

- [x] Record every root HTML entry, generated route, Responsive Lab target, target type, module entry, API surface, and current test owner in the GQC-00 inventory.
- [x] Classify each surface as workbench, SPA target, MPA candidate, MCard `webapp`, probe fixture, internal diagnostic, or undecided.
- [x] Write the exact module and package callers into `docs/sprints/_active/evidence/GQC-00-consumer-map.md`. Label observed facts separately from hypotheses.
- [x] Map each approved target Page or View to a Place ID and each Functional Link to a Transition ID. Record route handles separately from CLM type URIs.
- [x] Record the Layer 4 API probe, its successful CLM view type, its invalid-link error Place, and the unverified browser and persistence boundaries.
- [x] Map the P0 SPA journey to existing or proposed unit, integration, and Playwright tests. Keep the optional MPA path outside the P0 denominator.
- [x] Record that `responsive_test_run:v1` is closed and has no navigation-net reference. Do not add a new top-level field.
- [x] Record current test discovery, runtime, browser, and performance baselines without changing application behavior.
- [x] Add no new browser spec until the Product Manager approves that journey as supported.
- [x] Fail the discovery guard if smoke or feature projects lose all intended specs. Allow the component project's known zero-test result only as an explicit, expiring exception owned by GQC-01.
- [x] Have TEA and the Product Manager record whether provisional performance limits block later PRs or remain advisory. GQC-00 cannot approve a blocking limit on its own.
- [x] Record Astro readiness: no `astro` dependency or `src/` tree today, every public URL that pages and tests reference, the order of the Express static mounts, and the registered service workers.
- [x] Record workbench Place and Transition candidates for GQC-02A: each root page, each internal link, script navigation, `window.open`, and UI-reachable server call.
- [x] Record the pre-Astro performance baseline that GQC-02B and GQC-06 compare against.

**You see.**

- [x] The coverage inventory labels workbench pages and target applications separately. The product owner approves support decisions.
- [x] The baseline report records the exact command, exit status, discovered test count, browser version, server port, and missing coverage.
- [x] The P0 SPA journey is visible in the approved inventory. MPA assessment is labeled optional or deferred.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Test the coverage registry schema and assert that each declared test path exists. Run `node --test tests/unit/gui-coverage-registry.test.mjs`.
- [x] Run `npm run check:playwright-discovery`. It passes only when smoke and feature projects remain non-empty and the component exception is reported by name.
- [x] Record the component project's current non-zero discovery exit as a baseline finding. GQC-00 does not count that command as a passing test gate.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [x] Lane 1. Regression lane against trunk. Open the top-level entry on trunk and head. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-1.png`. Pass when both reach the approved workbench entry and the redirect result is recorded.
- [x] Lane 2. Open `responsive-lab.html`. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-2.png`. Pass when the user can identify the workbench and its target selector.
- [x] Lane 3. Load the current `app.html` default target. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-3.png`. Pass when the app loads and its target type remains unclassified unless approved.
- [x] Lane 4. Open `index.html?noredirect`. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-4.png`. Pass when the single-page MCard viewer is recorded separately from SPA-target support.
- [x] Lane 5. Open the PenPot navigation on LandingPage. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-5.png`. Pass when the generated graph hash and 3 LandingPage frames are visible.
- [x] Lane 6. Open the fiber inspector. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-6.png`. Pass when it is classified as an internal diagnostic or its approved role is recorded.
- [x] Lane 7. Open `pkc-docs-index.html`. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-7.png`. Pass when it is included in the inventory with an explicit support status.
- [x] Lane 8. Load each Product Manager-approved workbench route in a fresh context. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-8.png`. Pass when each route reaches its declared visible state.
- [x] Lane 9. Open the Lab in portrait and landscape contexts. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-9.png`. Pass when the viewport remains usable and the approved overflow check passes.
- [x] Lane 10. Reload the Lab with `?target=app.html`. Save `/tmp/swarm-PR-GQC-00/worker-1/lane-10.png`. Pass when the target remains unclassified rather than being presented as an approved SPA.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Metric. Cold navigation-to-ready time for the Responsive Lab and each approved workbench route. Do not substitute `app.html` for a missing SPA fixture.
- [x] Probe. Run ten interleaved trunk and head Playwright navigations with the same browser, viewport, data, and cache mode.
- [x] Baseline. Record trunk median, p75, browser version, viewport, cache mode, and test data in the GQC-00 evidence. Record that no target-SPA baseline exists until a deterministic fixture is available.
- [x] Rule. If TEA and the Product Manager ratify a blocking limit in GQC-00, fail when p75 regresses by more than 10 percent and 100 ms. Otherwise report the result only.

**Review gate.** None. PR-GQC-00 adds a coverage registry and baseline evidence without changing a user interaction.

**Merge.**

- [x] Record the clean verdict at the exact head SHA.
- [x] Record the test list, characterization results, and performance measurements.
- [x] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [x] Append `PR-GQC-00` as the stack root. Do not land it without the operator's approval.

## Restore Playwright discovery and CI signal for the SPA workbench (PR-GQC-01)

**Depends on.** `PR-GQC-00`.

**Files.**

- [x] Edit `playwright.config.js` and `package.json`.
- [x] Edit `.github/workflows/clm-test-all-components.yml` and expand `.github/workflows/playwright-quality.yml` from the GQC-00 discovery guard to the full quality gate.
- [x] Migrate or explicitly match `tests/components/*.spec.cjs` and their CommonJS helpers.
- [x] Edit `tests/fixtures/test-config.js`, `tests/fixtures/clm-helpers.js`, and the component specs to use the configured base URL and module format.
- [x] Limit GQC-01 fixture edits to existing helpers and configuration. GQC-02 owns the new SPA fixture and graph manifest.
- [x] Include `tests/smoke/clm-dashboard.spec.cjs` and the observed `tests/observability/*.test.js` files in the suite-ownership decision.
- [x] Resolve the Darwin-only snapshot baseline before an Ubuntu CI job depends on it.
- [x] Edit `tests/TEST_DOCUMENTATION.md` and `tests/README.md`.
- [x] Append approved browser, retry, or deployment-policy decisions to `docs/sprints/_active/DECISIONS.tsv`.
- [x] Add root-page characterization specs under `tests/smoke/`, one per root page in the GQC-00 inventory.

**Build.**

- [x] Make each Playwright project discover its intended tests. Add a zero-test guard to the CI command.
- [x] Align component and smoke specs, helpers, server port, Node version, snapshot OS policy, and CI path filters. Remove false-green `continue-on-error` handling from the test job.
- [x] Make the discovery guard enumerate every configured project. A new unassigned project fails the guard.
- [x] Set `reuseExistingServer` to false in CI. Local reuse requires an explicit developer choice.
- [x] Ensure each spec belongs to one category project. Keep cross-browser repeats only when the approved matrix names them.
- [x] Add failure screenshots, traces, and a report artifact. Keep deterministic specs at zero retries and document any isolated retry policy.
- [x] Characterize the stale `landing-page.spec.js` against the GQC-00-approved redirect or `?noredirect` journey. Do not change the product redirect in this PR.
- [x] Keep the existing deployment policy unchanged until the product and operations owners decide whether test failures block deployment.
- [x] Put the Playwright `webServer` command, URL, and readiness probe behind one named contract with a documented default, so `PR-GQC-02B.1` changes only the command.
- [x] Record the Express port and the planned `astro dev` port in the port decision.
- [x] Characterize each root page by status, title, one landmark, and outgoing same-origin links, selected by role, label, or stable ID. These specs are the Astro migration oracle.

**You see.**

- [x] `npx playwright test --list --project=components` lists the component suite instead of returning zero tests.
- [x] A failed component test fails its CI job and preserves a report, screenshot, and trace.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Test that every configured project discovers at least one intended spec and that `test:unit` includes all supported Node test files. Run `npm run test:unit` and `npx playwright test --list --project=components`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [x] Lane 1. Regression lane against trunk. Run the approved workbench entry journey on trunk and head. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-1.png`. Pass when the same approved workbench state is visible on both.
- [x] Lane 2. Run the component project. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-2.png`. Pass when all declared component specs are discovered and the report shows no zero-test project.
- [x] Lane 3. Run the feature project. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-3.png`. Pass when each declared file appears in its owning project and deliberate cross-browser repeats are reported separately.
- [x] Lane 4. Run the smoke project. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-4.png`. Pass when it discovers all approved smoke specs, including the resolved `clm-dashboard.spec.cjs` owner.
- [x] Lane 5. Submit a deliberately failing temporary test in a disposable CI run or worktree, never in the PR diff. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-5.png`. Pass when the job fails and uploads artifacts.
- [x] Lane 6. Run the suite with no pre-existing server on the configured port. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-6.png`. Pass when Playwright starts its own server and reaches the landing page.
- [x] Lane 7. Hold the configured test port with a foreign or stale LandingPage server. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-7.png`. Pass when CI fails before tests can pass against the wrong build.
- [x] Lane 8. Run one component test twice with separate test data. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-8.png`. Pass when the second run does not reuse state from the first.
- [x] Lane 9. Run the smoke subset in each approved browser project. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-9.png`. Pass when each browser reaches the same primary page state.
- [x] Lane 10. Run the documented local test commands from a clean checkout. Save `/tmp/swarm-PR-GQC-01/worker-1/lane-10.png`. Pass when every command starts the documented server and runs the named project.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Metric. Cold landing-page navigation-to-ready time while the configured Playwright project starts its server.
- [x] Probe. Run ten interleaved trunk and head browser navigations with the same Node and browser versions, viewport, and cache mode.
- [x] Baseline. Use the GQC-00 trunk measurements and record the test server startup time separately.
- [x] Rule. If TEA and the Product Manager ratify a blocking budget in GQC-00, fail if p75 navigation-to-ready regresses by more than 10 percent and 100 ms. Otherwise report the result only. Do not count test discovery time as user page load time.

**Review gate.** None. PR-GQC-01 changes test discovery and CI reporting without changing product interactions.

**Merge.**

- [x] Record the clean verdict at the exact head SHA.
- [x] Attach project discovery counts and the intentional failing-job artifact.
- [x] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [x] Append `PR-GQC-01` to the stack after `PR-GQC-00`. Wait for operator landing.

## Define the P0 SPA journeys and test seams (PR-GQC-02)

**Depends on.** `PR-GQC-01`.

**Files.**

- [x] Edit `tests/gui-coverage.json` with separate workbench and target-app records.
- [x] Edit `tests/unit/gui-coverage-registry.test.mjs` only to add new registry invariants.
- [x] Create `tests/fixtures/app-fixtures.js` for stable page setup, test data, and cleanup.
- [x] Create `tests/fixtures/spa-test-target.html` and its test-only source `tests/fixtures/spa-test-target.graph.json` in the GQC-02A envelope shape: a `topology` section that `parsePetriNetYaml` accepts and a `bindings` section.
- [x] Create approved journey specs under `tests/features/`. Do not add a new Playwright project in this PR.
- [x] Edit existing feature specs only for an approved coverage gap or shared fixture.
- [x] Edit `.github/workflows/playwright-quality.yml` only to publish the coverage registry result.
- [x] Edit `tests/README.md` with the verified test map.
- [x] Append approved journey-scope decisions to `docs/sprints/_active/DECISIONS.tsv`.

**Build.**

- [x] Use one coverage row per supported journey. Include the workbench or target surface, target type, target handle, Page ID, Place ID, Functional Link ID, Transition ID, source kind and source reference, priority, test owner, test layer, command, and evidence.
- [x] Let GQC-02 rows reference the fixture graph manifest or an existing generated graph. GQC-05 owns persisted `NetMCard` references.
- [x] Scope Page and Transition ID uniqueness to the target handle and source graph. Reject duplicate IDs within that scope.
- [x] Treat the registry as a test index over its declared source. Do not copy the generated LandingPage navigation graph into another canonical registry.
- [x] Keep PenPot MPA rows optional and outside the P0 SPA coverage denominator.
- [x] Add shared fixtures only for repeated setup or cleanup. Add a page object only when multiple journeys share meaningful behavior.
- [x] Add Playwright journeys for selecting an approved local SPA, applying a device profile, following a functional link, recording or replaying the path, and inspecting the MCard result.
- [x] Assert that the SPA fixture changes its visible view without replacing the browser document.
- [x] Keep LandingPage PenPot navigation and MCard rendering as separate regression journeys, not as proof of target-SPA coverage.
- [x] Keep unit tests for pure logic, API tests for route contracts, and Playwright for behavior users observe.
- [x] Stub external identity, model, and third-party services. Do not require production credentials or public network availability.
- [x] Record each approved journey as a `firing_sequence` of Transition IDs. A server call is a request and result pair.
- [x] Write journeys against URLs, roles, labels, and network contracts only, so they run unchanged on the Astro host in `PR-GQC-02B.1`.

**You see.**

- [x] The coverage registry distinguishes workbench, SPA target, optional MPA target, MCard `webapp`, internal, missing, and undecided rows.
- [x] A failing target journey names the Page, Place, Functional Link, Transition, and visible outcome, not a private helper implementation.
- [x] The local SPA fixture exercises a real browser action while keeping the document alive.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Test that every supported coverage row resolves to an existing spec, command, target, and fixture or graph source. Run `node --test tests/unit/gui-coverage-registry.test.mjs`.
- [x] Run the shared fixture tests and `npm run test:unit`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [x] Lane 1. Regression lane against trunk. Open the approved workbench entry on trunk and head. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-1.png`. Pass when the same workbench state appears.
- [x] Lane 2. Load the deterministic SPA fixture through the existing Responsive Lab controls. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-2.png`. Pass when the fixture appears in the iframe. Do not require the future guide or target-type label.
- [x] Lane 3. Observe the fixture's first and second views. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-3.png`. Pass when each visible view maps to a Page and Place ID in the test-only graph manifest.
- [x] Lane 4. Follow one Functional Link in the fixture. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-4.png`. Pass when the destination view appears without a document reload and matches its declared Transition.
- [x] Lane 5. Apply and rotate a built-in device profile. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-5.png`. Pass when the viewport matches the device registry and the current view remains visible.
- [x] Lane 6. Record the functional link action and save the test run. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-6.png`. Pass when the user sees the stored MCard handle or hash; do not require a persisted `NetMCard` before GQC-05.
- [x] Lane 7. Replay the same journey. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-7.png`. Pass when the visible destination and recorded Transition agree.
- [x] Lane 8. Follow a fixture link with no declared destination. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-8.png`. Pass when the workbench reports a missing Transition and shows its error Place without claiming capture authorization.
- [x] Lane 9. Complete target selection, device setup, and capture by keyboard. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-9.png`. Pass when focus order and result status are usable.
- [x] Lane 10. Run the SPA journey in a fresh context. Save `/tmp/swarm-PR-GQC-02/worker-1/lane-10.png`. Pass when storage, dialogs, and network requests do not leak from another test.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Metric. P75 workbench navigation-to-ready time on trunk and head. Record new fixture load and transition times as separate head-only diagnostics.
- [x] Probe. Run ten interleaved trunk and head journeys for the common Lab route with the same browser, viewport, and cache mode. Run ten fixture samples on head only.
- [x] Baseline. Use the GQC-00 trunk workbench baseline. The SPA fixture does not exist on trunk, so its measurements need an approved absolute budget or stay advisory.
- [x] Rule. If TEA and the Product Manager ratify a blocking budget in GQC-00, fail only on a paired, like-for-like workbench regression. Do not compare the head-only fixture to an unlike trunk scenario. Report fixture timing and journey wall time separately.

**Review gate.** None. PR-GQC-02 adds test fixtures and assertions without changing product interactions.

**Merge.**

- [x] Record the clean verdict at the exact head SHA.
- [x] Attach the coverage registry check and the ten live-lane results.
- [x] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [x] Append `PR-GQC-02` to the stack after `PR-GQC-01`. Wait for operator landing.

## Census Places and Transitions and author the Layer 1 site net (PR-GQC-02A)

**Depends on.** `PR-GQC-02`.

**Files.**

- [x] Create `src/net/workbench-net.yaml` with `topology` and `bindings` sections.
- [x] Create `scripts/check-net.mjs` and add `check:net` to `package.json`.
- [x] Create `tests/unit/check-net.test.mjs` and `tests/unit/net-trace-replay.test.mjs`.
- [x] Create `tests/fixtures/net-trace.js`, the Playwright trace recorder.
- [x] Edit `tests/fixtures/spa-test-target.graph.json` only if `PR-GQC-02` did not already use the envelope shape.
- [x] Edit `tests/gui-coverage.json` only to fill workbench Place and Transition IDs on existing workbench rows.
- [x] Edit `.github/workflows/playwright-quality.yml` only for the net check and the Transition coverage summary.
- [x] Create `docs/sprints/_active/evidence/GQC-02A-layer1-probe.md` and `evidence/GQC-02A-place-transition-census.md`.
- [x] Append approved Place, Transition, and envelope decisions to `docs/sprints/_active/DECISIONS.tsv`.
- [x] Do not edit any HTML page, `ws-server.js`, `server/`, `routes/`, `js/nav.js`, or `design/landing-navigation.penpot`.

**Build.**

- [x] Rerun the Layer 1 probe after `npm ci` and commit its command, lockfile version, and output.
- [x] Census every root and `public/` page, internal link, script navigation, redirect, `window.open`, UI-reachable `fetch`, and WebSocket connect. Resolve dynamic URL builders or mark them unresolved.
- [x] Compare observed links with the PenPot-generated `js/nav.js` graph. Record drift. Do not copy `NAVIGATION_ROUTES` by hand.
- [x] Put only Product Manager-approved Places in the topology. List undecided pages in the census.
- [x] Model each server call as `server-call-request` into a `pending` Place and `ok` or `fail` out of it. Never use a self-loop; its incidence column is zero.
- [x] Make `check-net.mjs` pass `topology` to `parsePetriNetYaml` unchanged, then enforce the rules the kernel does not: unique IDs, complete bindings, kinds, request and result pairs, the session P-invariant against `IncidenceMatrix.fromTopology(topology).d`, reachability from the entry and deep-link entries, and enabled Transitions.
- [x] Validate the GQC-02 fixture net through the same code path.
- [x] Record traces from Playwright `framenavigated`, `request`, and `response` events. Replay each trace through `ColoredPetriVM` from its entry Place and fail on the first disabled Transition. Add no production instrumentation.
- [x] Report Transition coverage as an advisory number.

**You see.**

- [x] Nothing changes in the product UI.
- [x] CI shows a net check result and a Transition coverage summary.
- [x] A failing replay names the trace, the event index, and the disabled Transition.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Run `npm run check:net` on the workbench net and the fixture net.
- [x] Run `node --test tests/unit/check-net.test.mjs tests/unit/net-trace-replay.test.mjs`. The tests cover a duplicate Place ID, a dangling binding, a self-loop server call, a broken session invariant, an unreachable page, and a disabled firing.
- [x] Run `npm run test:unit`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [x] Lane 1. Regression lane against trunk. Open `/` and the Responsive Lab on trunk and head. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-1.png`. Pass when both show the same workbench state.
- [x] Lane 2. Open `/` with the trace recorder. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-2.png`. Pass when the trace fires the declared `redirect` Transition into the Lab Place and replays cleanly.
- [x] Lane 3. Follow the Lab link to `app.html`. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-3.png`. Pass when the trace fires the declared `link` Transition and replays cleanly.
- [x] Lane 4. Trigger the `app.html` navigation back to `/`. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-4.png`. Pass when the trace fires the declared Transition and lands in the Lab Place after the redirect.
- [x] Lane 5. Open one game from `app.html`. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-5.png`. Pass when the trace fires `open-external`, the source page stays open, and replay keeps one session token on the source Place.
- [x] Lane 6. Save a test run from the Lab. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-6.png`. Pass when the trace fires the `POST /api/test-runs` request Transition and its `ok` result.
- [x] Lane 7. Intercept `POST /api/test-runs` to fail, then recover. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-7.png`. Pass when the trace fires `fail`, the visible error matches the declared error Place, and `recover` replays cleanly.
- [x] Lane 8. Open `/app.html` directly. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-8.png`. Pass when replay starts from the declared deep-link entry.
- [x] Lane 9. Follow a link to a page the census marks undecided. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-9.png`. Pass when the recorder reports an unmapped navigation by URL instead of dropping it.
- [x] Lane 10. Activate the Lab-to-`app.html` link by keyboard in a fresh context. Save `/tmp/swarm-PR-GQC-02A/worker-1/lane-10.png`. Pass when the trace matches the mouse trace from lane 3 and contains no events from another test.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Metric. P75 Lab navigation-to-ready time on trunk and head, and `check:net` wall time on head.
- [x] Probe. Run ten interleaved trunk and head Lab loads without the trace recorder. Run ten head journeys with and without the recorder.
- [x] Baseline. Use the GQC-00 trunk Lab baseline. Product code is unchanged, so trunk and head should match within spread.
- [x] Rule. Report recorder overhead separately. A trunk-to-head regression in this PR is a measurement defect to explain, not a product regression.

**Review gate.** None. PR-GQC-02A adds a net, a checker, and test fixtures without changing product pages.

**Merge.**

- [x] Record the clean verdict at the exact head SHA.
- [x] Attach the `check:net` output, the replay results, the census, and the ten live-lane results.
- [x] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [x] Append `PR-GQC-02A` to the stack after `PR-GQC-02`. Wait for operator landing.

## Run LandingPage on Astro inside Express (PR-GQC-02B.1)

**Depends on.** `PR-GQC-02A`.

**Files.**

- [x] Edit `package.json` and `package-lock.json` to pin Astro, `@astrojs/node`, `@astrojs/preact`, and `preact` to exact versions.
- [x] Create `astro.config.mjs` with the middleware adapter, `build.format: 'file'`, a dedicated `publicDir`, and the dev proxy.
- [x] Create `src/layouts/WorkbenchLayout.astro` and one `src/pages/*.astro` file per migrated Place.
- [x] Create `src/integrations/net-parity.mjs`.
- [x] Edit `src/net/workbench-net.yaml` for migration-state bindings only.
- [x] Edit `ws-server.js` only to mount `dist/client/` and the Astro handler, and to remove a legacy static path after its consumers move.
- [x] Edit `playwright.config.js` for the `webServer` command only.
- [x] Delete a legacy root `.html` file only after parity.
- [x] Create `tests/unit/net-parity.test.mjs`, `tests/features/astro-host-parity.spec.js`, and `evidence/GQC-02B-url-inventory.md`.
- [x] Append approved version, mount, and port decisions to `docs/sprints/_active/DECISIONS.tsv`.
- [x] Do not edit `server/`, `routes/`, `app-config.json`, CORS or CSP rules, capture message checks, or `responsive_test_run:v1`.

**Build.**

- [x] Mount the `dist/client/` static directory and then the Astro handler after the API routers and security middleware and before the legacy root static mount at `ws-server.js:138`.
- [x] Prove the handler calls `next()` for `/health`, `/api/rooms`, `/api/env`, `/api/config`, and `/app-config.json`, which register later. Add no Astro catch-all page until that test passes.
- [x] Keep the Express static mounts for `public/` and `js/` until every consumer moves. Record each referenced `/public/...` and `/js/...` URL.
- [x] Unregister service workers on `localhost` and `127.0.0.1` in development, and send `no-store` for development HTML.
- [x] Migrate approved `page` Places to `astro-wrapped`, starting with `index` and `responsive-lab`. Keep `app.html` `astro-wrapped`.
- [x] Run net parity in `astro build`: every route has a Place, every migrated Place has a route, and every internal `href` in built HTML is a declared Transition trigger.
- [x] Keep `npm run build` running the existing workspace builds.
- [x] Switch the Playwright `webServer` command to the production topology, then run every GQC-01 characterization spec, every GQC-02 journey, and the GQC-02A trace replay.

**You see.**

- [x] Every public URL loads the same page, title, and landmark as on trunk.
- [x] `npm run dev` serves pages from `astro dev` and APIs from Express through the proxy.
- [x] `npm start` serves pages and APIs on one port.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Run `npm run build`. Net parity passes.
- [x] Run `node --test tests/unit/net-parity.test.mjs`. It fails on an unbound route, an unrouted migrated Place, and an undeclared internal `href`.
- [x] Run `npm run check:net` and `npm run test:unit`.
- [x] Run `npx playwright test tests/features/astro-host-parity.spec.js --project=features`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [x] Lane 1. Regression lane against trunk. Open `/` on trunk and head. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-1.png`. Pass when both redirect to the same Lab state.
- [x] Lane 2. Open `/?noredirect`. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-2.png`. Pass when the MCard viewer view matches trunk.
- [x] Lane 3. Open `/responsive-lab.html`. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-3.png`. Pass when the URL, title, and landmark match the characterization record.
- [x] Lane 4. Request `/health`, `/api/config`, `/api/env`, and `/app-config.json` from the Astro-served origin. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-4.png` of the response log. Pass when each body and status matches trunk.
- [x] Lane 5. Open a WebSocket room from an Astro-served page. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-5.png`. Pass when the room connects as on trunk.
- [x] Lane 6. Load each migrated page and record the network log. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-6.png`. Pass when no `/public/...` or `/js/...` asset returns 404.
- [x] Lane 7. Open a game from `app.html` and follow its link back to `/`. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-7.png`. Pass when behavior matches trunk and the trace replays through the net.
- [x] Lane 8. Run `npm run dev` and open the Lab on `localhost`. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-8.png`. Pass when APIs answer through the proxy and no service worker is registered.
- [x] Lane 9. Run the GQC-02 P0 journey on the production topology. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-9.png`. Pass when the journey passes unchanged and its trace replays cleanly.
- [x] Lane 10. Request an unknown path. Save `/tmp/swarm-PR-GQC-02B.1/worker-1/lane-10.png`. Pass when the status and body matches trunk, proving the handler fell through.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Metric. P75 time to first byte and navigation-to-ready for `/responsive-lab.html` and `/`. Client JavaScript bytes per migrated Place.
- [x] Probe. Run ten interleaved trunk and head loads with the same browser, viewport, and cache mode. Read bytes from the Astro build output and the network log.
- [x] Baseline. Use the GQC-00 pre-Astro baseline for the same URLs.
- [x] Rule. If TEA and the Product Manager ratified a blocking budget in GQC-00, fail if p75 ready time regresses by more than 10 percent and 100 ms. Otherwise report the result only. Report bytes as a diagnostic.

**Review gate.** The operator reviews before merge.

- [x] Copy trunk and head screenshots of `/`, `/?noredirect`, `/responsive-lab.html`, and `/app.html` into the review packet side by side.
- [x] Record a 30 to 60 second video of the P0 journey on the Astro host. Save it with the PR evidence.
- [x] Post the screenshots and video in chat. Stop at merge-ready and wait for the operator's review.

**Merge.**

- [x] Record the clean verdict at the exact head SHA.
- [x] Attach the net-parity output, the URL inventory, the handler fall-through test, and the ten live-lane results.
- [x] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [x] Append `PR-GQC-02B.1` to the stack after `PR-GQC-02A`. Wait for operator landing.

## Hydrate the Responsive Lab as Preact islands (PR-GQC-02B.2)

**Depends on.** `PR-GQC-02B.1`.

**Files.**

- [x] Create `src/islands/*.jsx`, one island per interactive Lab region.
- [x] Edit `src/pages/responsive-lab.astro`.
- [x] Edit `js/harness/` files only to expose an existing cleanup path an island needs. Do not change behavior.
- [x] Create `tests/features/responsive-lab-islands.spec.js` and `evidence/GQC-02B-island-map.md`.
- [x] Do not edit `server/`, `routes/`, `app-config.json`, CORS or CSP rules, capture message checks, or `responsive_test_run:v1`.

**Build.**

- [x] Write a characterization test for each Lab region before converting it: target toolbar and URL omnibar, device presets, viewport stage, recording ribbon, conformance panel, and MCard result.
- [x] Convert each region to one Preact island that mounts the existing module in an effect and calls its cleanup on unmount.
- [x] Use `client:only="preact"` for regions that need `window` or the iframe at mount. Justify every other directive.
- [x] Keep `window.__lab`, each module's public interface, and the `data-*` hooks tests use.
- [x] Import no `clm-kernel` code into any island.
- [x] Leave Astro's client router off.
- [x] Record each island's directive, owner, mount cost, and cleanup path, or the cleanup gap and its owning sprint.

**You see.**

- [x] The Lab looks and behaves as it did after `PR-GQC-02B.1`.
- [x] Regions below the first viewport hydrate when reached if their directive is `client:visible` or `client:idle`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Run `npm run build` with net parity and `npm run check:net`.
- [x] Run an import check that fails if any file under `src/islands/` or the client bundle resolves `clm-kernel`.
- [x] Run `npx playwright test tests/features/responsive-lab-islands.spec.js --project=features`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [x] Lane 1. Regression lane against trunk. Open the Lab on trunk and head. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-1.png`. Pass when the default target and controls match.
- [x] Lane 2. Enter an approved target in the omnibar island. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-2.png`. Pass when the iframe loads it.
- [x] Lane 3. Apply and rotate a device preset. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-3.png`. Pass when the viewport matches the device registry.
- [x] Lane 4. Resize the viewport stage. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-4.png`. Pass when the frame scales as on trunk.
- [x] Lane 5. Record and save a journey from the recording ribbon. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-5.png`. Pass when the save succeeds and the trace fires the declared server-call Transitions.
- [x] Lane 6. Run the conformance panel. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-6.png`. Pass when results match trunk for the same target and device.
- [x] Lane 7. Inspect the MCard result island. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-7.png`. Pass when it shows the stored handle or hash.
- [x] Lane 8. Mount and unmount each island 50 times through target and page changes. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-8.png`. Pass when listener and timer counts return to the starting count, or the gap matches the island map.
- [x] Lane 9. Load the Lab cold. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-9.png` of the network log. Pass when only `client:load` and `client:only` bundles download before interaction and none contains `clm-kernel`.
- [x] Lane 10. Complete the P0 journey by keyboard. Save `/tmp/swarm-PR-GQC-02B.2/worker-1/lane-10.png`. Pass when focus order matches trunk.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Metric. P75 Lab navigation-to-ready time, hydration time per island, and client JavaScript bytes for the Lab Place.
- [x] Probe. Run ten interleaved trunk and head Lab loads. Mark hydration complete from a test-only init script.
- [x] Baseline. Use the `PR-GQC-02B.1` head and the GQC-00 pre-Astro baseline.
- [x] Rule. If TEA and the Product Manager ratified a blocking budget in GQC-00, fail if p75 ready time regresses by more than 10 percent and 100 ms. Otherwise report the result only. Report per-island hydration as a diagnostic.

**Review gate.** The operator reviews before merge.

- [x] Copy trunk and head Lab screenshots and the island map into the review packet.
- [x] Record a 30 to 60 second video of the P0 journey with the islands. Save it with the PR evidence.
- [x] Post the screenshots and video in chat. Stop at merge-ready and wait for the operator's review.

**Merge.**

- [x] Record the clean verdict at the exact head SHA.
- [x] Attach the island map, the import check, the cleanup counts, and the ten live-lane results.
- [x] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [x] Append `PR-GQC-02B.2` to the stack after `PR-GQC-02B.1`. Wait for operator landing.

## Enforce target configuration and capture policy (PR-GQC-03)

**Depends on.** `PR-GQC-02B.2`.

**Files.**

- [x] Edit `app-config.json`, `ws-server.js`, and `playwright.config.js`.
- [x] Edit `astro.config.mjs` only for `publicDir`, CSP, and dev proxy header settings.
- [x] Edit `js/harness/lab-toolbar.js`, `target-membrane.js`, `membrane-interceptor.js`, `capture-probe-agent.js`, and `recorder.js`.
- [x] Edit the Responsive Lab composition in `src/pages/responsive-lab.astro` and its islands only for registry-derived chips, target status, and capture-source ownership.
- [x] Edit `src/net/workbench-net.yaml` to declare configuration calls, the probe handshake, and policy error Places.
- [x] Add unit and Playwright cases under `tests/unit/` and `tests/features/`.
- [x] Keep `server/mcard-probe-policy.mjs`, `tests/single-page-mcard.test.mjs`, `js/harness/lab-probe-agent.js`, and `tests/fixtures/probe-target*.html` read-only inputs. If this PR needs to change one, stop for a separate review-gated file boundary.
- [x] Append approved target-policy and endpoint decisions to `docs/sprints/_active/DECISIONS.tsv`.
- [x] In `playwright.config.js`, edit only the test-server settings. Preserve the matcher and project membership owned by GQC-01.

**Build.**

- [x] Define and test the actual contract for `app-config.json`, `/app-config.json`, and runtime WebSocket configuration. Choose one schema owner for each endpoint.
- [x] Record product and architecture decisions for target types, custom capture, approved origins, endpoint shape, and blocked-target recovery before changing the affected runtime path.
- [x] Resolve the `/app-config.json` route shadow across both root static mounts and exclude targets marked blocked from the CORS allowlist.
- [x] Record the effective CORS and CSP headers for each server variant. Require security-owner approval before changing broad CSP directives.
- [x] Pass the approved target-origin policy into capture setup. Reject unregistered cross-origin capture by default.
- [x] Render built-in target chips and target types from the declared registry. Keep custom targets distinct from approved SPA, MPA, MCard `webapp`, and probe targets.
- [x] Preserve the MCard external-portal SSRF and frameability checks. Do not reuse portal compatibility as capture authorization.
- [x] Keep the target application URL separate from its Page and Place graph and CLM type URI.
- [x] Keep target navigation behind `target-membrane.js`. Preserve the existing iframe sandbox and MCard URL safety checks.
- [x] Treat a target without a probe agent as capture-unavailable. Reject origin mismatches between `localhost` and `127.0.0.1`.
- [x] Bound silent-agent retries. Clear capture state after iframe navigation and require a new approved-origin handshake before accepting events.
- [x] Fence in-flight events during target switch so they remain attached to the old run or are discarded.
- [x] Reject malformed or unapproved `?target=` values before capture starts.
- [x] Destroy replaced capture sources and prove that listeners, intervals, and nonces do not survive a target change.
- [x] Record which mount answers `/app-config.json` with the Astro static mount, Astro handler, and legacy root mounts in their `PR-GQC-02B.1` order.
- [x] Choose a CSP path for Astro island bootstrap scripts: emitted hashes or nonces applied by Express, or `unsafe-inline` kept with a recorded risk and owner. Apply the same CORS and CSP headers to Astro and legacy pages.
- [x] Release a capture source when the island that owns it unmounts.
- [x] Declare every configuration call and the probe handshake as request and result Transitions, and declare blocked, unavailable, and timeout states with a `recover` Transition.

**You see.**

- [x] An approved target loads and displays its capture state.
- [x] The selected target's type is visible and distinct from its Page and Place graph.
- [x] A blocked target displays an explicit reason and cannot start cross-origin capture.
- [x] An approved but uninstrumented target displays capture-unavailable, not a successful capture.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Test endpoint schemas, allowed-origin decisions, forged message rejection, stale nonce rejection, and capture-source cleanup. Run `npm run test:unit`.
- [x] Run `npx playwright test tests/features/responsive-capture.spec.js --project=features`.
- [x] Run `node --test tests/single-page-mcard.test.mjs` to confirm the separate MCard external-portal SSRF and framing policy remains unchanged.
- [x] Run `npm run check:net` and `npm run build` with net parity.
- [x] Run a Playwright check that fails on any CSP violation during Lab island hydration.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [x] Lane 1. Regression lane against trunk. Load the approved local SPA target on trunk and head. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-1.png`. Pass when the same target type and visible entry view load.
- [x] Lane 2. Select an approved same-origin SPA target. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-2.png`. Pass when its URL, target type, and capture status match the registry.
- [x] Lane 3. Select `tests/fixtures/probe-target.html`, which loads `js/harness/lab-probe-agent.js`. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-3.png`. Pass when the handshake completes for the expected frame and exact origin.
- [x] Lane 4. Select `tests/fixtures/probe-target-noagent.html`. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-4.png`. Pass when capture is unavailable and the reason differs from a frame-policy block.
- [x] Lane 5. Send a forged `lab:hello` message from a different frame. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-5.png`. Pass when the recorder rejects and counts it.
- [x] Lane 6. Change the iframe origin during recording, then send a stale nonce and a wrong-loopback-origin message. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-6.png`. Pass when capture stops and no event is attributed to the new target.
- [x] Lane 7. Switch targets 50 times. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-7.png`. Pass when old listeners and intervals return to the starting count.
- [x] Lane 8. Select a target blocked by frame policy. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-8.png`. Pass when the blocked state remains visible, capture does not start, its origin is absent from CORS, and the effective CSP is recorded.
- [x] Lane 9. Record a password field interaction in a fixture. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-9.png`. Pass when the value is redacted in the saved run.
- [x] Lane 10. Reload the Responsive Lab with a malformed or unapproved `?target=` value. Save `/tmp/swarm-PR-GQC-03/worker-1/lane-10.png`. Pass when the URL does not start capture and the user can recover.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Metric. P75 target-selection-to-ready time and p95 message-to-capture processing time.
- [x] Probe. Run ten interleaved trunk and head target changes with the same target fixture and browser.
- [x] Baseline. Record trunk values and the target origin, URL, browser, cache mode, and message count.
- [x] Rule. If TEA and the Product Manager ratify a blocking budget in GQC-00, fail if p75 target-ready time regresses by more than 10 percent and 100 ms. Otherwise report the result only. Record added validation work separately.

**Review gate.** The operator reviews before merge.

- [x] Copy the approved-target and blocked-target screenshots into the review packet.
- [x] Record a 30 to 60 second video of target selection and rejection. Save it with the PR evidence.
- [x] Post the screenshots and video in chat. Stop at merge-ready and wait for the operator's review.

**Merge.**

- [x] Record the clean verdict at the exact head SHA.
- [x] Attach the endpoint contract tests and the origin-policy test results.
- [x] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [x] Append `PR-GQC-03` to the stack after `PR-GQC-02B.2`. Wait for operator landing.

## Build the guided SPA test window and define module ownership (PR-GQC-04)

**Depends on.** `PR-GQC-03`.

**Files.**

- [x] Edit `src/pages/responsive-lab.astro`, the Lab islands named in the island map, and the assigned `js/harness/` composition for the guided SPA workflow.
- [x] Create `src/islands/SpaTestWorkflow.jsx`, the guide island that mounts `spa-test-workflow.js`.
- [x] Edit `src/pages/app.astro` and its islands only for regions the ownership map assigns.
- [x] Edit `src/net/workbench-net.yaml` to add guide Places and Transitions and any `app.html` Transitions moved into islands.
- [x] Create `js/harness/spa-test-workflow.js` for the guided step state, with unit tests in `tests/unit/spa-test-workflow.test.mjs`.
- [x] Edit `js/app-entry.js`, `js/cubical-core.js`, and `js/pkc-core.js` only if the consumer map assigns them to that workflow.
- [x] Edit `modules.json` only after the consumer map names its runtime role.
- [x] Edit at most one exact module entry, and only if `evidence/GQC-00-consumer-map.md` shows a repeatable seam worth extracting.
- [x] Create or update `tests/unit/pkc-lifecycle.test.mjs` and `tests/features/spa-test-workbench.spec.js`.
- [x] Update the owning architecture spec in the same PR.
- [x] Append approved module-ownership decisions to `docs/sprints/_active/DECISIONS.tsv`.

**Build.**

- [x] Map each page composition root to its UI modules, module descriptors, stores, global accessors, and lifecycle events.
- [x] Resolve the difference between `PKC.init()` module lists and `modules.json` by documenting which entry point owns each page.
- [x] Define module startup failure and cleanup behavior from observed consumers. Add no generic plugin bus or wrapper without a second real consumer.
- [x] Guide the user through target selection, device setup, target Pages and Places, Functional Links and Transitions, capture or replay, and MCard result inspection.
- [x] Keep workflow step state in `spa-test-workflow.js`; inject the Lab target, device, and recorder interfaces instead of importing kernel or target-app code.
- [x] Display target type, route handle, Page ID, Place ID, and CLM type URI as distinct values.
- [x] Use the existing ERB target membrane, recorder, replay, and device modules. Add no second recorder or browser driver.
- [x] Keep process persistence behind the GQC-05 MCard contract. Do not add a new store or modify `responsive_test_run:v1`.
- [x] Show a clear error Place or unavailable state for missing views, invalid links, blocked origins, and targets without a capture agent.
- [x] Refactor one selected composition seam only when two real callers share behavior. If no seam qualifies, keep the current shape and add a contract test.
- [x] Do not merge `js/redux/` and `js/store/` until call sites and data ownership prove the stores overlap.
- [x] Migrate callers before removing any global or legacy module contract.
- [x] Commit the island ownership map: each island's Place, directive, owner, mounted module, and cleanup path. Close the cleanup gaps `PR-GQC-02B.2` assigned to this PR.
- [x] Load and check the target net in Astro page frontmatter or a Node endpoint, and pass it to the guide island as serialized props. Import no `clm-kernel` code into an island.
- [x] Keep the workbench net and the target net separate. They share no IDs and pass the same checker.

**You see.**

- [x] The Responsive Lab shows the P0 SPA guide and makes each workflow step visible.
- [x] An optional module failure leaves unrelated page controls usable and reports a visible or logged error with a stable owner.
- [x] A target SPA link changes the declared Place without a document reload. Playwright drives and verifies the actual link.
- [x] The result view shows the saved MCard run handle or hash without claiming that an unpersisted net was stored.
- [x] An interrupted capture is visible as incomplete, never as a passing run or certification.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Test module registration, initialization order, error handling, and cleanup with injected test modules. Run `npm run test:unit`.
- [x] Run `npm run test:smoke` and the approved module lifecycle specs.
- [x] Run `npm run check:net`, `npm run build` with net parity, and the island import check. Replay the P0 journey trace through both nets.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [x] Lane 1. Regression lane against trunk. Open the Responsive Lab on trunk and head. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-1.png`. Pass when existing device and recording controls remain available.
- [x] Lane 2. Start the guide with the deterministic SPA fixture. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-2.png`. Pass when the target type, first Page and Place, and optional MPA status are visible.
- [x] Lane 3. Choose a device and orientation. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-3.png`. Pass when the viewport changes without losing the selected Place.
- [x] Lane 4. Follow a declared Functional Link and its Transition. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-4.png`. Pass when the destination Place appears without replacing the SPA document.
- [x] Lane 5. Follow an invalid or missing link. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-5.png`. Pass when the error Place and recovery action are visible.
- [x] Lane 6. Capture and save the SPA journey. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-6.png`. Pass when the workbench shows the saved MCard handle or hash.
- [x] Lane 7. Replay the saved journey. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-7.png`. Pass when the final Place and recorded result agree.
- [x] Lane 8. Reload the Lab after a module starts a listener. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-8.png`. Pass when the page does not duplicate the listener's visible effect.
- [x] Lane 9. Complete the guided flow by keyboard. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-9.png`. Pass when focus order, status announcements, and recovery controls work.
- [x] Lane 10. Fail an optional module in an isolated fixture. Save `/tmp/swarm-PR-GQC-04/worker-1/lane-10.png`. Pass when unrelated guide controls remain usable and the failure has an owner.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [x] Metric. P75 common Lab page-ready time and head-only guide-step initialization time.
- [x] Probe. Run ten interleaved trunk and head boots for the common Lab shell. Measure the new guide steps on head only because trunk lacks the guided workflow.
- [x] Baseline. Use the GQC-00 workbench values. Set an approved absolute budget for new guide work or keep its timing advisory.
- [x] Rule. If TEA and the Product Manager ratify a blocking regression budget in GQC-00, fail only on the paired common-page regression. Do not compare new guide work to an unlike trunk path.

**Review gate.** The operator reviews before merge.

- [x] Copy before and after screenshots for the affected page into the review packet.
- [x] Record a 30 to 60 second video of the changed startup or failure state.
- [x] Post the screenshots and video in chat. Stop at merge-ready and wait for the operator's review.

**Merge.**

- [x] Record the clean verdict at the exact head SHA.
- [x] Attach module ownership, startup, and cleanup test results.
- [x] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [x] Append `PR-GQC-04` to the stack after `PR-GQC-03`. Wait for operator landing.

## Integrate MCard process data and verify package ownership (PR-GQC-05)

**Depends on.** `PR-GQC-04`.

**Files.**

- [ ] Create `scripts/package-source-parity.json` and `scripts/check-package-source-parity.mjs`.
- [ ] Create `tests/unit/package-source-parity.test.mjs` and built-package consumer tests.
- [ ] Add Layer 4 navigation and Triad persistence tests under `tests/unit/`.
- [ ] Create `scripts/net-to-netmcard.mjs` and Layer 1 workbench-net persistence and trace-replay tests under `tests/unit/`.
- [ ] Edit `server/test-run-api.mjs` and `js/harness/test-run-schema.js` only for the approved graph-to-run link. Keep `responsive_test_run:v1` readable and unchanged.
- [ ] Extend `src/pages/responsive-lab.astro`, `src/islands/SpaTestWorkflow.jsx`, `js/harness/spa-test-workflow.js`, and `tests/features/spa-test-workbench.spec.js` only to show and verify the stored net and firing receipt from GQC-04.
- [ ] If GQC-00 approves the optional MPA track and target route set, add `js/harness/penpot-mpa-navigation-adapter.js`, `tests/fixtures/penpot/sample-mpa.penpot`, `tests/unit/penpot-mpa-navigation-adapter.test.mjs`, and `tests/features/penpot-mpa-assessment.spec.js`. Treat `design/landing-navigation.penpot` as a LandingPage parser fixture, not as the target MPA.
- [ ] Edit at most one exact source pair, and only after `evidence/GQC-00-consumer-map.md` records both paths and consumers.
- [ ] Do not change `ws-server.js` or `packages/server/src/ws-server.js` behavior. Limit any `server/test-run-api.mjs` change to the approved versioned graph-to-run link.
- [ ] Add renderer and server contract tests without merging distinct implementations.
- [ ] Update the owning package and architecture documents.
- [ ] Add PenPot MPA mapping only if the GQC-00 Product Manager gate approves it.
- [ ] Append package-source and ownership decisions to `docs/sprints/_active/DECISIONS.tsv`.

**Build.**

- [ ] Classify each exact source copy as shared source, generated copy, separate product variant, or unused code. Keep the classification with its consumer evidence.
- [ ] Test package exports from built artifacts and the intended runtime. Do not validate only the source tree.
- [ ] Verify `Layer4TrellisNavigationNet`, `PlaceMCard`, `TransitionMCard`, `NetMCard`, `MCardMarking`, and `FiringReceiptMCard` from the installed package.
- [ ] Verify that `registerViewPlace(placeId, routeUri)` stores the second parameter as `PlaceMCard.typeExpr`. Test the approved `clm://type/view/...` family and reject malformed or non-CLM values.
- [ ] Keep route handles separate from CLM view type URIs. Test a valid link and an invalid link to the declared error Place.
- [ ] Assemble the `NetMCard` snapshot from registered namespace Places, Transitions, and the declared initial marking. Keep per-run session tokens, markings, and receipts separate from immutable topology.
- [ ] Persist the approved net and receipts through the existing MCard Triad. Add no domain-specific SQL tables.
- [ ] Ensure repeated or concurrent requests for the same session cannot create divergent markings or receipts.
- [ ] Ensure a write interrupted between net and receipt persistence cannot publish a completed run handle.
- [ ] Require a new session or declared recovery Transition after `p_error_modal`. Reject unknown run-schema versions visibly.
- [ ] Link a run to its net through a separate MCard or an approved versioned schema. Do not add an unversioned top-level field to `responsive_test_run:v1`.
- [ ] Keep process execution server-side unless a browser bundle and Playwright contract test prove that direct browser import works.
- [ ] Select one renderer ownership contract for each surface. Preserve the four-modality landing page behavior and MIME-specific renderer behavior where consumers differ.
- [ ] Record whether root and packaged server entry points are one product or separate products. Compare API routes, CORS, CSP, and deployment use. Keep both entry points unchanged; the only allowed server change is the approved graph-to-run link in `server/test-run-api.mjs`.
- [ ] Migrate at most one exact source pair. If no pair has a safe shared interface, keep separate implementations and pass the parity check instead.
- [ ] If PenPot MPA mapping is approved, map only bound frames and `navigate` interactions. A live Playwright test must verify each supported transition.
- [ ] If PenPot MPA mapping is not approved, record it as deferred and keep it outside the P0 SPA journey.
- [ ] Record the `0.0.10` test-run value and `0.0.12` runtime value as a provenance mismatch. GQC-07 owns the source-backed correction and any record migration.
- [ ] Build the workbench `NetMCard` from the checked `topology` section with `NetMCard.create`. Store `bindings` as a separate linked MCard so route changes do not alter the topology hash.
- [ ] Store workbench trace evidence as the Layer 1 `FiringRecord` list from `ColoredPetriVM` replay. Keep `FiringReceiptMCard` for target sessions. Add no third receipt type.
- [ ] Add the Astro static mount and handler to the root and packaged server comparison.
- [ ] Record the server-call policy: existing Express routes stay; a new UI-reachable call is an Astro endpoint or Action unless it needs WebSockets, Express middleware state, or an existing router; every new call is declared in the workbench net. Add a check that fails on an undeclared call in `src/`.

**You see.**

- [ ] A package consumer imports the documented built export without importing a sibling workspace source path.
- [ ] The landing page continues to render media, documents, inert code, and sandboxed web content through the approved route.
- [ ] The guided SPA result points to a persisted MCard run and an approved Page and Place net reference.
- [ ] PenPot MPA state is marked optional or deferred. If approved, it has a tested target graph.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test every changed package export and its browser consumer. Run `npm run build --workspaces` and `npm run test:unit`.
- [ ] Test the Layer 4 valid, invalid, and receipt persistence paths without changing the three-table schema.
- [ ] Test that interrupted or unfinalized captures cannot become passing run receipts.
- [ ] Test that server variants satisfy their declared API contract. Run the named server contract spec.
- [ ] Test that the workbench `NetMCard` hash is stable across rebuilds, unchanged by a binding edit, and changed by an arc edit. Run `npm run check:net`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Load the same MCard sample on trunk and head. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-1.png`. Pass when the rendered content and active handle match.
- [ ] Lane 2. Render a binary image card. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-2.png`. Pass when the image loads with its declared alternative text.
- [ ] Lane 3. Render Markdown with a math block. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-3.png`. Pass when text and math appear without a console error.
- [ ] Lane 4. Render inert source code. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-4.png`. Pass when the code is visible and does not execute.
- [ ] Lane 5. Render an external web card. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-5.png`. Pass when its iframe keeps the approved sandbox attributes.
- [ ] Lane 6. Render an unsupported MIME type. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-6.png`. Pass when the declared fallback appears.
- [ ] Lane 7. From the guided Lab, follow a valid SPA Functional Link and then an invalid link through the server-owned Layer 4 adapter. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-7.png`. Pass when the UI shows the destination Place or error Place and its MCard receipt, then requires an approved recovery path.
- [ ] Lane 8. Reload a completed run and an interrupted capture from the MCard Triad. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-8.png`. Pass when hashes verify, the completed run resolves, and the interrupted capture is not reported as a pass.
- [ ] Lane 9. Open the optional MPA path. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-9.png`. Pass when approved PenPot frames and `navigate` edges are bound and every live transition is tested, or unbound frames and missing live targets are reported as incomplete or deferred.
- [ ] Lane 10. Open a transclusion link from the single-page MCard. Save `/tmp/swarm-PR-GQC-05/worker-1/lane-10.png`. Pass when the active handle changes without escaping the declared MCard route.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. P75 render-ready time for one representative content item per supported modality and the transferred JavaScript bytes for its route.
- [ ] Probe. Run ten interleaved trunk and head renders with identical content, browser, viewport, and cache state.
- [ ] Baseline. Record trunk render time, transferred bytes, MIME type, and browser version for each chosen modality.
- [ ] Rule. If TEA and the Product Manager ratify a blocking budget in GQC-00, fail if p75 render-ready time regresses by more than 10 percent and 100 ms, or route JavaScript grows by more than 10 percent without an approved reason. Otherwise report the result only.

**Review gate.** The operator reviews before merge.

- [ ] Copy before and after screenshots for all affected modalities into the review packet.
- [ ] Record a 30 to 60 second video of the changed content flow and package entry.
- [ ] Post the screenshots and video in chat. Stop at merge-ready and wait for the operator's review.

**Merge.**

- [ ] Record the clean verdict at the exact head SHA.
- [ ] Attach package consumer, server contract, and modality regression results.
- [ ] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [ ] Append `PR-GQC-05` to the stack after `PR-GQC-04`. Wait for operator landing.

## Measure and improve verified performance (PR-GQC-06)

**Depends on.** `PR-GQC-05`.

**Files.**

- [ ] Add reproducible probes under `tests/performance/` and Playwright coverage under `tests/features/`.
- [ ] Use existing collectors and browser Performance APIs. Do not change production instrumentation in this PR.
- [ ] Edit one exact production file named by the accepted profile only when paired measurements prove that file is the limiting path. Record the file before the edit.
- [ ] If a probe needs production instrumentation or more than one optimization file, pause GQC-06 and obtain an approved plan update with an explicit PR boundary before proceeding.
- [ ] Edit `.github/workflows/playwright-quality.yml` only to attach the performance report or enforce an approved stable metric.
- [ ] Edit `docs/09-performance/` with the measurement method and current limits.
- [ ] Append approved performance gate or no-change decisions to `docs/sprints/_active/DECISIONS.tsv`.
- [ ] Do not add a metrics package until the native browser APIs and existing collectors prove insufficient.

**Build.**

- [ ] Record cold and warm navigation, LCP, CLS, interaction latency, frame time, and route JavaScript bytes for the P0 guided SPA journey.
- [ ] Measure SPA target load, Place transition, capture or replay, MCard receipt persistence, resize, orientation, and repeated target cleanup as separate stages.
- [ ] Record target type, Page ID, Place ID, and Transition ID with each navigation measurement. Do not combine SPA and MPA baselines.
- [ ] Measure representative Markdown, math, media, and web content through the approved renderer.
- [ ] Measure an MPA or PenPot flow only if the Product Manager approved it and a live target exists.
- [ ] Profile the largest measured bottleneck. Change one cause at a time and run the paired probe before code-ready.
- [ ] Include any accepted optimization in the code-ready diff before the verification swarm starts. Do not edit source while live lanes run.
- [ ] If no user-visible bottleneck is reproducible, ship the baseline and keep performance checks advisory. Do not add a speculative optimization.
- [ ] Reconcile the existing 16.6 ms, 20 ms, and 25 ms frame limits before making a frame budget blocking.
- [ ] Report client JavaScript bytes per `page` Place, hydration time per island, and latency per Transition kind. Server calls report request and result separately.
- [ ] Compare the Astro head with the GQC-00 pre-Astro baseline for the same Places and journeys.
- [ ] Mark island hydration from a test-only init script. Add no production hydration instrumentation.
- [ ] Allow one island directive change only when a paired measurement proves it helps.

**You see.**

- [ ] The performance report includes the browser, machine, data, cache mode, sample count, spread, and source path for each metric.
- [ ] Each accepted optimization improves its target metric without breaking a user flow or moving cost to another route.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test metric collection, serialization, and failed-observation handling. Run `npm run test:unit`.
- [ ] Run the named performance scenario and keep its report as a CI artifact.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run the same approved SPA workbench journey on trunk and head. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-1.png`. Pass when the same user-visible end state is reached.
- [ ] Lane 2. Open the deterministic SPA target in a cold context. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-2.png`. Pass when its first Page and Place are ready without a long task blocking the first interaction.
- [ ] Lane 3. Open `responsive-lab.html` in a cold context. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-3.png`. Pass when the guide, target selector, and toolbar reach their ready state.
- [ ] Lane 4. Resize and rotate the lab for 60 seconds. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-4.png`. Pass when timing is recorded and layout state remains correct. If a frame limit is ratified, also check it. Otherwise keep the result advisory.
- [ ] Lane 5. Switch targets 50 times. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-5.png`. Pass when the listener count returns to baseline and the ready state remains responsive.
- [ ] Lane 6. Follow a declared SPA Functional Link and its Transition. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-6.png`. Pass when the browser reaches the destination Place and the transition duration is recorded.
- [ ] Lane 7. Open Mission Control without requesting an in-browser model. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-7.png`. Pass when model assets are not downloaded before the user selects the model feature.
- [ ] Lane 8. Repeat the selected render with cold and warm cache. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-8.png`. Pass when both runs record cache state and produce the same content.
- [ ] Lane 9. Run the approved small-screen viewport. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-9.png`. Pass when layout and tap targets pass their existing conformance checks.
- [ ] Lane 10. Verify the optimization already present at the code-ready head. If none qualified, rerun the P0 SPA journey unchanged and record a no-change decision. Save `/tmp/swarm-PR-GQC-06/worker-1/lane-10.png`. Pass when the journey reaches the same end state and no MPA metric is blended into the SPA result.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. P75 navigation-to-ready time, p95 interaction-frame interval, and the selected bottleneck metric.
- [ ] Probe. Run 21 paired trunk and head trials after three warm-ups per side, interleaved with the same browser, page, data, viewport, and cache mode.
- [ ] Baseline. Record the trunk distribution before the change and publish the environment and probe version.
- [ ] Rule. Apply a blocking regression limit only if TEA and the Product Manager ratify it in GQC-00. Keep an optimization only when its paired result improves beyond observed spread and its profile identifies the limiting path. If no candidate meets that test, pass with an advisory baseline and a no-change decision.

**Review gate.** The operator reviews before merge.

- [ ] If an interaction changes, copy before and after screenshots into the review packet. If no optimization qualifies, attach the baseline screenshot and no-change decision.
- [ ] If an interaction changes, record a 30 to 60 second video of it. If no optimization qualifies, record a 30 to 60 second video of the measured journey without changes.
- [ ] Post the screenshots and video in chat. Stop at merge-ready and wait for the operator's review.

**Merge.**

- [ ] Record the clean verdict at the exact head SHA.
- [ ] Attach raw measurements, the profile or trace, and the performance decision.
- [ ] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [ ] Append `PR-GQC-06` to the stack after `PR-GQC-05`. Wait for operator landing.

## Align living documentation with verified contracts (PR-GQC-07)

**Depends on.** `PR-GQC-06`.

**Files.**

- [ ] Edit maintained documentation under `README.md`, `docs/`, and `tests/`.
- [ ] Edit `js/harness/recorder.js` and `tests/unit/test-run-schema.test.mjs` only after the provenance source is approved.
- [ ] Edit `server/mcard-modality.mjs` only if the approved provenance source requires that value to change.
- [ ] Add the smallest required checker under `scripts/` and expose it as a package script.
- [ ] Create `scripts/docs-link-allowlist.json` with per-path owner, reason, and expiry for historical exceptions.
- [ ] Edit `.github/workflows/playwright-quality.yml` only to run the documentation check, `check:net`, and the net-parity build.
- [ ] Create `scripts/gen-net-docs.mjs`, the generated `docs/01-architecture/workbench-net.md`, and `docs/01-architecture/astro-host-and-islands.md`.
- [ ] Keep historical sprint reports unchanged. Mark historical facts as historical instead of rewriting their results.
- [ ] Append provenance and documentation-owner decisions to `docs/sprints/_active/DECISIONS.tsv`.

**Build.**

- [ ] Name one maintained source for every runtime version, port, test command, target type, Page, Place, Transition, route, and package contract.
- [ ] Reconcile the living docs that claim kernel versions `0.0.3`, `0.0.9`, `0.0.10`, or `0.0.12`. Derive current facts from package and runtime sources.
- [ ] Reconcile the default server port, Playwright test port, Docker mapping, and example URLs. Keep distinct ports only when their roles are explicit.
- [ ] Reconcile the README, architecture docs, functionality specs, and test guides. Give each document one owner and one task.
- [ ] Document the P0 SPA test workflow and the distinction between the Lab, the target application, and the single-page MCard viewer.
- [ ] Document the CLM mapping from target Pages to Places and Functional Links to Transitions, the separate route-handle and type-URI fields, and the error Place.
- [ ] Document PenPot as LandingPage navigation source today and MPA target assessment as optional unless approved.
- [ ] Document the approved MCard graph-to-run link without rewriting historical `responsive_test_run:v1` records.
- [ ] Replace absolute `file:///Users/...` links with repository-relative links. Add a CI check for broken local links and stale package-script names.
- [ ] Keep historical-link exceptions in a checked-in allowlist with a named owner and path. Do not exempt an entire documentation directory.
- [ ] Update documentation with each code change in its owning sprint. Use this PR for final drift review, not as a substitute for concurrent updates.
- [ ] Document the Astro run commands, dev ports, source layout, island rules, and the middleware mount order.
- [ ] Generate the workbench Place and Transition tables and diagram from `workbench-net.yaml`. Fail CI when the generated file is stale.
- [ ] Extend `docs:check` so every Place or Transition ID in a maintained doc exists in a declared net.
- [ ] Mark the earlier "not its Astro or Vitest stack" statements as superseded for Astro in maintained docs. Keep graduated records unchanged.

**You see.**

- [ ] A clean checkout can follow the documented install and test commands without guessing a port or project.
- [ ] The architecture map, functionality map, Page and Place map, and Playwright coverage registry agree on the P0 SPA workflow and approved target classes.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test local Markdown links, package script references, and current version or port claims. Run `npm run docs:check`.
- [ ] Run the complete unit and Playwright project list. Run `npm run test:unit` and `npx playwright test --list`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `the model recorded in the run header` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open the approved SPA-first workbench route on trunk and head. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-1.png`. Pass when the user-visible workbench state is unchanged.
- [ ] Lane 2. Follow the documented local setup. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-2.png`. Pass when the documented command opens the documented page.
- [ ] Lane 3. Run the documented unit command. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-3.png`. Pass when it runs the stated suite and returns its actual result.
- [ ] Lane 4. Run the documented smoke command. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-4.png`. Pass when the named Playwright project runs.
- [ ] Lane 5. Open the test documentation index. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-5.png`. Pass when every linked local guide resolves.
- [ ] Lane 6. Open the SPA test guide and trace a Page to its Place and a Functional Link to its Transition. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-6.png`. Pass when the documented IDs match the approved MCard process map and live browser journey.
- [ ] Lane 7. Open the target configuration guide and request each documented configuration endpoint. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-7.png`. Pass when target type, response shape, and capture policy match the live contract.
- [ ] Lane 8. Read the documented port table and start the server with its default. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-8.png`. Pass when the browser reaches the documented URL.
- [ ] Lane 9. Open the sprint registry. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-9.png`. Pass when staged and graduated programs use the correct paths and status.
- [ ] Lane 10. Run the docs checker over maintained guides and inspect the optional PenPot MPA note. Save `/tmp/swarm-PR-GQC-07/worker-1/lane-10.png`. Pass when links resolve, MPA status is approved or deferred, and historical exceptions name a path and owner.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. P75 landing navigation-to-ready time. Record `npm run docs:check` duration as a separate head-only diagnostic.
- [ ] Probe. Run ten interleaved trunk and head navigations with the same browser and checkout conditions. Run `npm run docs:check` on head only.
- [ ] Baseline. Use GQC-00 landing measurements. Record the first `docs:check` run, version, and duration without comparing it to a missing trunk command.
- [ ] Rule. If TEA and the Product Manager ratify a blocking budget in GQC-00, fail if p75 SPA-workbench time regresses by more than 10 percent and 100 ms. Otherwise report the result only. Keep the new documentation-check duration advisory until a trunk equivalent exists.

**Review gate.** None. PR-GQC-07 changes documentation and static checks without changing a user interaction.

**Merge.**

- [ ] Record the clean verdict at the exact head SHA.
- [ ] Attach the documentation-check output and the route-to-spec traceability report.
- [ ] Rebase onto current trunk after the verdict. Confirm the patch-id is unchanged.
- [ ] Append `PR-GQC-07` after `PR-GQC-06`. Stop at merge-ready and wait for operator landing.

## Close the program

- [ ] Every required box in this plan has evidence at the exact merged SHA.
- [ ] The operator approves the final stack and the program's graduation path.
- [ ] Reply with the PR order, dependencies, review-gated set, unresolved decisions, test totals, performance results, and the plan-checker output.

## Appendix A. Prototype evidence

The product direction is explicit. GQC makes SPA testing the primary workbench journey. PenPot-based MPA assessment remains optional. No UI prototype was required because the request names the desired product outcome.

A read-only runtime probe checked the installed `clm-kernel@0.0.12` Layer 4 API on branch `main`, HEAD `843cf652650746501d7ea270ecdd1a0f493ec559`. With `clm://type/view/home` and `clm://type/view/dashboard`, `Layer4TrellisNavigationNet` moved a session to the destination Place and returned a committed `FiringReceiptMCard`. An invalid link reached `p_error_modal`. Using `mcard://route/home` as the CLM type did not navigate. The route handle and CLM type URI must stay separate.

The LandingPage lockfile pins `clm-kernel@0.0.12`, while the sibling CLM workspace source is `0.0.13`. The installed package artifact is the runtime contract. GQC-05 reruns the probe after `npm ci` and must not infer 0.0.12 behavior from 0.0.13 source.

That probe did not test browser imports, external SPA instrumentation, Triad persistence, or a versioned graph-to-run link. GQC-04 and GQC-05 own those checks. The PenPot extractor currently reports 3 LandingPage frames, 1 flow, and 4 navigation interactions. It does not prove support for an external MPA.

The Playwright discovery probe remains the planning baseline. The component project listed zero tests and exited 1. Smoke listed 16 tests in 3 files. Features listed 557 tests in 17 files. The unfiltered configuration listed 1,158 test executions across overlapping projects.

A second read-only probe, `layer1-site-net-probe.mjs`, checked the `clm-kernel/layer1` subpath of the same installed package with a small workbench site net. `parsePetriNetYaml` accepted the topology. Only the entry redirect was enabled at the start. A trace moved one session token from a page through a pending Place, an error Place, a recover Transition, and a link. The all-ones session vector satisfied the P-invariant against `IncidenceMatrix.fromTopology().d`. Firing a disabled Transition threw "not enabled in current marking". A self-loop produced an all-zero incidence column, so a same-page server call is invisible to D unless it is split into request and result. The parser dropped unknown fields such as `route`, `kind`, and `meta`, kept `binding`, accepted duplicate Place IDs, and rejected dangling arcs. GQC-02A therefore keeps route metadata in a separate `bindings` section and adds its own duplicate-ID check.

The Layer 4 `ViewPlaceMCard` and `NavigationTransitionPCard` names are type aliases of the Layer 1 card types. The package root `dist/index.js` imports Node `crypto` at top level, so the root entry cannot load in a browser island. No Astro dependency, configuration, or `src/` tree exists at planning time.

## Appendix B. Alternatives kept open

- Keep the `.spec.cjs` tests and widen project matching, or move the specs and helpers to ESM. GQC-01 chooses after it tests the current helper imports under the CI Node version.
- Use the published `Layer4TrellisNavigationNet` after its target type and persistence contracts pass, or retain the existing generated graph as read-only input and defer runtime firing.
- Link a navigation net to a run with a separate MCard receipt, or add an approved versioned run schema. Do not modify `responsive_test_run:v1` in place.
- Add read-only PenPot MPA assessment as an optional extension, or defer it. Editing PenPot documents or managing live MPA routes needs a separate decision. Neither choice changes the SPA P0 scope.
- Merge the `labTargets` registry and runtime WebSocket settings, or split them into distinct endpoints. GQC-03 chooses after it verifies every consumer and route order.
- Route all MCard content through `RendererRegistry`, retain the four-modality single-page renderer, or connect the two only where contracts overlap. GQC-05 decides after it maps consumers and security behavior.
- Share root and packaged server implementation, or document two supported products. GQC-05 decides after comparing routes, CORS, CSP, and deployment entry points.
- Run full cross-browser suites on every pull request, or run a smaller browser matrix on each pull request and the full matrix on a schedule. GQC-01 decides from suite runtime and platform risk.
- Keep performance checks advisory, or promote stable metrics to blocking checks. GQC-00 records variance and obtains owner approval before GQC-06 enables a block.
- Keep full document loads for every page switch, or enable Astro's client router and model soft switches as `client-route` Transitions. GQC-02B keeps the router off. Enabling it needs a decision and lifecycle tests for every island that survives a swap.
- Treat the hand-authored `workbench-net.yaml` as the link source and compare PenPot's `js/nav.js` against it, or generate the workbench net from PenPot. GQC-02A records drift first. Generation stays out of scope until PenPot covers every Place.
- Serve Astro only from the root server, or also from the packaged server. GQC-05 decides with the server product decision.
- Add new server calls as Astro endpoints or Actions, or keep them in Express. GQC-05 sets the policy; existing routes do not move in this program.

## Appendix C. Risks

- **Test signal.** A zero-test project and overlapping Playwright projects can create false confidence or waste CI time. GQC-01 owns discovery and project partitioning.
- **Security.** An empty target-origin allowlist currently permits cross-origin capture. The static config file also shadows the later endpoint, blocked target origins enter the CORS list, and the root CSP permits broad sources. GQC-03 owns policy evidence and approved corrections.
- **Domain mapping.** A PenPot route handle is not a CLM view type URI. GQC-05 must test the mapping before storing or firing a net.
- **Run compatibility.** `responsive_test_run:v1` rejects unknown top-level fields. GQC-05 must preserve historical reads when it links a graph or receipt.
- **Scope.** The current PenPot graph covers LandingPage routes, not a target MPA. MPA support remains optional until a target and product owner are approved.
- **Compatibility.** Exact browser and package copies and different server implementations may serve different consumers. GQC-05 must not delete a copy until every consumer is migrated and tested.
- **Performance.** Current frame guidance conflicts at 16.6 ms, 20 ms, and 25 ms. GQC-00 owns the definition and GQC-06 owns measured limits.
- **Documentation.** Living docs disagree on ports and kernel versions. Historical sprint results must stay intact while current guides change.
- **Delivery policy.** The component workflow says tests need not pass for deployment. Product and operations owners decide whether that policy changes.
- **URL collisions.** Express serves `public/` at `/public` and `/`, and the repository root at `/`. An Astro `publicDir` or page can shadow a legacy file or the dynamic `/app-config.json` route. GQC-02B records every URL and mount; GQC-03 proves which mount answers each configuration path.
- **Middleware fall-through.** If the Astro handler answers unmatched paths, it hides `/health`, `/api/rooms`, `/api/env`, `/api/config`, and `/app-config.json`, which register after it. GQC-02B must prove `next()` before adding any catch-all page.
- **Inline-script CSP.** Astro island bootstrap uses inline scripts. Tightening `script-src` without emitted hashes or nonces breaks hydration. GQC-03 owns the CSP path.
- **Stale caches.** Three service workers can serve old pages or chunks after the switch. GQC-02B unregisters them in development and sends `no-store`; GQC-03 covers configuration responses.
- **Kernel in the browser.** The `clm-kernel` root entry imports Node `crypto`. An island that imports it breaks the client build. INV-GQC-17 and the import check guard this.
- **Astro version churn.** Middleware, CSP, and integration hook APIs change between Astro releases. GQC-02B pins exact versions and records them; an upgrade is its own decision.
- **Second executor drift.** A LandingPage-written reachability or replay routine could diverge from the kernel. `check-net.mjs` and replay call `parsePetriNetYaml`, `IncidenceMatrix`, and `ColoredPetriVM`; LandingPage adds only the checks the kernel lacks.

## Appendix D. Links and reading list

- Read the [active sprint index](./INDEX.md) and [GQC sprint specifications](./SPRINT-GQC-00-project-census-and-behavior-baseline.md).
- Read the graduated [SMO architecture program](../01-architecture/INDEX.md) and [ERB test infrastructure program](../08-testing/INDEX.md) before proposing overlap.
- Read `playwright.config.js`, `package.json`, `ws-server.js`, `app-config.json`, `js/harness/`, `js/renderers/`, `js/landing-page-mcard.js`, and `packages/*/`.
- Read `../../../../docs/theory/System_of_Record.md`, `../../../../clm/docs/spec/00-product-overview/product-overview.md`, `../../../../clm/kernel/clm_js_core/src/layer4/petriNavigation.ts`, and `../../../../mcard-studio/docs/architecture/03_PTR_Execution_Engine.md` before changing the MCard process contract.
- Compare MCard Studio's `playwright.config.ts`, test scripts, and `check:topology` and `check:ratchets` commands. Reuse its layered-gate lesson. GQC adopts Astro as of 2026-10-27, with Preact islands and a Node middleware host; it does not adopt Vitest.
- Read the Astro documentation for Node middleware mode, Preact islands and `client:*` directives, integration build hooks, and CSP support for the pinned version before PR-GQC-02B.1.
- Read `../../../../clm/kernel/clm_js_core/src/layer1/` for `PetriNetTopology`, `parsePetriNetYaml`, `IncidenceMatrix`, and `ColoredPetriVM` before PR-GQC-02A.
- Use the BMAD Analyst, Architect, Scrum Master, TEA, Dev, and Tech Writer roles in the local `bmad/bmm/agents/` and `bmad/bmm/workflows/`.
- Read the Poteto `how`, `swarm`, `control-ui`, `technical-writing`, `unslop`, and `show-me-your-work` skills before execution.
- Keep a decision record at `DECISIONS.tsv`. Do not copy raw agent reports into the sprint files.
