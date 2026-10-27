# Sprint GQC-01: Playwright trust foundation

## Metadata

- Sprint ID: `SPRINT-GQC-01`
- Handle: `urn:pcard:sprint:SPRINT-GQC-01`
- Status: `COMPLETED`
- Depends on: `SPRINT-GQC-00`
- Unblocks: `SPRINT-GQC-02`
- Execution unit: `PR-GQC-01`
- Poteto playbook: `multi-phase-plan`, `tdd`, and `principle-test-behavior-not-implementation`
- BMAD roles: Product Manager, Architect, TEA, Dev, Tech Writer, Scrum Master

## Outcome

Make Playwright results trustworthy for the SPA-first workbench journey. Each configured project discovers its intended specs, starts against one declared test URL, emits useful failure evidence, and fails its quality job when an assertion fails.

This sprint does not choose a deployment policy. The current component workflow states that deployment can proceed when tests fail. Product and operations owners decide whether that policy changes.

Use the [MCard_TDD design contract](./INDEX.md#mcard_tdd-design-contract). Playwright must test the actual workbench and target behavior. It must not treat the stale `MCard Manager` assertions as product truth.

The suite is also the migration oracle for the Astro host. GQC-02B replaces how pages are served, not what they do. GQC-01 therefore defines one server command contract that GQC-02B can switch from `node ws-server.js` to the Astro production topology by changing the command only. Specs must not depend on how a page is served, only on its URL, visible behavior, and network contract.

## Current gaps

- `playwright.config.js` matches only `**/*.spec.js`.
- `tests/components/` has 14 `*.spec.cjs` specs, and `tests/smoke/` has a `clm-dashboard.spec.cjs` spec.
- `tests/smoke/landing-page.spec.js` expects the old `MCard Manager` view, while top-level `index.html` redirects to the Responsive Lab.
- The component project lists zero tests. The planning probe returned status 1.
- The component workflow filters `tests/test-clm-*.spec.js`, but the actual specs live under `tests/components/` and use `.spec.cjs`.
- The workflow runs one component path that does not match the checked-in layout and continues after test errors.
- The Playwright server defaults to port 3001. `ws-server.js` defaults to 3000. Component helpers use literal port 3000.
- The package uses `"type": "module"`. Some shared test helpers use CommonJS syntax in `.js` files.
- The unfiltered Playwright configuration runs overlapping category projects and a catch-all Chromium project.
- The global CI retry count is 2. The components project retries once and the features project retries twice. The effective policy needs one owner.
- `reuseExistingServer` is true even in CI, so Playwright can reuse a stale server on the configured port.
- The reporter is `list`. Failure screenshots, video, and HTML reports are not configured for the normal project runs.
- The `test:unit` command does not name `tests/observability/*.test.js`.
- Snapshot files use the Darwin platform suffix, while the component workflow uses Ubuntu.

## Work sequence

1. Record the Node and Playwright versions used by local and CI runs.
2. Choose a consistent module format for component specs and their helper files. Prove the choice with a single test before migrating the suite.
3. Assign each spec to one category project. Keep cross-browser repetitions only when the approved browser matrix names them.
4. Use Playwright `baseURL` and one explicit server configuration. Remove hardcoded host and port assumptions from test helpers.
5. Set `reuseExistingServer` to false in CI. Local reuse requires an explicit developer choice.
6. Characterize the stale landing smoke test against the GQC-00-approved entry journey. Do not change the product redirect in this sprint.
7. Add a project discovery guard that reads the configured projects. A newly added project with zero intended specs must fail.
8. Add HTML or JUnit output, traces, and failure screenshots. Upload them from CI.
9. Choose an OS and browser policy for snapshot tests. Do not rely on Darwin snapshots in an Ubuntu job without a deliberate update.
10. Separate deterministic tests from environment-dependent tests. Keep retries at zero by default. Any exception names the test, reason, and owner.
11. Record a minimum browser set for pull requests and a scheduled set, even if both remain Chromium-only.
12. Add the unit, smoke, component, and feature commands to the pull-request quality workflow.
13. Keep deployment gating unchanged until the policy owner decides otherwise.
14. Put the Playwright `webServer.command`, `url`, and readiness probe behind one named contract, such as `TEST_SERVER_COMMAND` with a documented default. GQC-02B changes only this value to start the Astro production build behind Express.
15. Record the dev port pair the Astro migration needs: the Express port and the `astro dev` port. Resolve the 3000 versus 3001 conflict with both ports in view.
16. Add URL-level characterization specs for each root Place that GQC-00 lists: `/`, `/?noredirect`, `/responsive-lab.html`, `/app.html`, and the remaining root HTML pages. Each spec asserts status, title, one landmark, and outgoing links. These specs must pass unchanged before and after GQC-02B.

## BMAD responsibilities

### Architect

- Define the test server contract and Playwright project ownership.
- Keep the suite categories disjoint unless a deliberate cross-browser project repeats a test.
- Reuse the existing `device-matrix.js`, `target-preflight.js`, and conformance runner.
- Keep the server contract host-agnostic so the Astro switch in GQC-02B is a one-value change.
- Name the root pages that become Places in GQC-02A, so the characterization specs and the site net share one page list.

### TEA

- Establish the initial project discovery counts and expected suite ownership.
- Choose CJS or ESM based on the actual helpers and CI Node version.
- Define the flake classification and artifact retention rules.
- Confirm each acceptance criterion maps to a failing test before the fix.

### Dev

- Change one project configuration or helper contract at a time.
- Preserve existing assertions while migrating file format or selectors.
- Do not make a failing test pass through `continue-on-error`.

### Tech Writer

- Replace stale test commands and directory maps in `tests/README.md` and `tests/TEST_DOCUMENTATION.md`.
- Document which CI job runs each test project and where its artifacts appear.

### Scrum Master

- Do not start GUI journey expansion until project discovery and CI failure semantics are green.
- Keep any deployment policy change in a separate approved decision.

## Stories and acceptance criteria

### GQC-01.1 Choose and prove one test module format

- [x] Run one component spec with its current helper under the CI Node version.
- [x] Choose either discoverable CJS specs with valid CJS helpers or ESM specs with ESM helpers.
- [x] Preserve the existing test assertions during the format change.
- [x] Record the failing parent run and passing head run.

### GQC-01.2 Repair project discovery and partition

- [x] `npx playwright test --list --project=components` lists the 14 intended component spec files.
- [x] `npx playwright test --list --project=smoke` lists the intended smoke files, including the resolved owner of `clm-dashboard.spec.cjs`.
- [x] `npx playwright test --list --project=features` lists the intended feature files.
- [x] Each discovered spec belongs to one category project unless the approved browser matrix explicitly repeats it.
- [x] The unfiltered command does not silently rerun category tests through the catch-all project.
- [x] The discovery guard reads all configured project names. A new project with no intended specs fails until it is assigned.
- [x] A zero-test project exits non-zero and names the project in its error.
- [x] The known GQC-00 component exception is removed once component discovery passes.

### GQC-01.3 Make server and test configuration explicit

- [x] Specs use `baseURL` or a shared URL helper instead of literal `localhost` ports.
- [x] `tests/fixtures/test-config.js` uses the configured base URL and does not hardcode port 3000.
- [x] Local and CI runs use the same documented Node version.
- [x] CI sets `reuseExistingServer` to false.
- [x] A process holding the configured test port causes a clear startup failure in CI.
- [x] Test data and temporary SQLite files do not write to a developer or production database.
- [x] The landing smoke assertion follows the approved redirect or `?noredirect` behavior and does not expect the removed `MCard Manager` UI.
- [x] The Playwright server command, URL, and readiness probe come from one named contract. Changing that contract is the only edit GQC-02B needs to run the suite against Astro.
- [x] The port decision names both the Express port and the planned `astro dev` port.

### GQC-01.6 Characterize root pages as the migration oracle

- [x] Each root HTML page from the GQC-00 census has one characterization spec.
- [x] Each spec asserts the HTTP status, document title, one stable landmark, and the set of outgoing same-origin links.
- [x] The `/` redirect and `/?noredirect` behavior have separate assertions.
- [x] Specs select by role, label, or stable ID. They do not select by markup that Astro may restructure, such as wrapper `div` depth.
- [x] The spec list matches the root Place list that GQC-02A imports.

### GQC-01.4 Add useful CI evidence

- [x] Unit, smoke, component, and feature jobs run the command their docs name.
- [x] An assertion failure fails its job.
- [x] Failure screenshots and traces are attached to the CI run.
- [x] HTML or JUnit output is retained as a build artifact.
- [x] Snapshot baselines use an approved OS and browser policy.
- [x] CI runs only snapshots with a matching baseline or records an explicit platform-specific skip and owner.
- [x] An intentional failing-test probe runs only in a disposable worktree or isolated CI check. It never enters the PR diff or trunk.
- [x] Triage failures exposed by newly discovered tests. Fix harness defects in this sprint. Assign product defects to an owner and preserve their failing evidence without weakening the gate.

### GQC-01.5 Classify retries and update test guides

- [x] Every retry-enabled spec has a reason and an owner.
- [x] Deterministic tests run with zero retries.
- [x] Global and per-project retry counts do not silently compound. Reports show the effective attempt count.
- [x] The approved browser matrix names a minimum pull-request set and any scheduled coverage, even if both use Chromium.
- [x] `npm run test:unit` includes every maintained Node test file or documents each intentionally excluded file.
- [x] Both test guides list commands that exist in `package.json`.

## Test design

| ID | Level | Scenario | Expected result |
| --- | --- | --- | --- |
| GQC-01-UNIT-01 | Unit | Validate project-to-spec configuration | Every project maps to at least one intended spec. |
| GQC-01-UNIT-02 | Unit | Validate shared test URL configuration | Every helper uses the configured base URL. |
| GQC-01-INT-01 | Integration | Start the Playwright server on an isolated test port | The test server responds and does not reuse an unrelated process in CI. |
| GQC-01-E2E-01 | E2E | Run the component project | All intended component specs execute. |
| GQC-01-E2E-02 | E2E | Force a browser assertion failure | CI fails and retains a screenshot and trace. |
| GQC-01-E2E-03 | E2E | Run smoke and feature projects | Specs appear only in their declared projects. |
| GQC-01-E2E-04 | E2E | Occupy the test port with a foreign server | The run fails before tests can pass against the wrong application. |
| GQC-01-E2E-05 | E2E | Open the approved top-level landing journey | The smoke spec observes the approved redirect or explicit non-redirect route. |
| GQC-01-UNIT-03 | Unit | Resolve the server contract with and without `TEST_SERVER_COMMAND` | The default starts `ws-server.js`; an override changes only the command. |
| GQC-01-E2E-06 | E2E | Open each root page | Status, title, landmark, and outgoing links match the characterization record. |

## Files in the implementation PR

- `playwright.config.js`
- `package.json`
- `.github/workflows/clm-test-all-components.yml`
- `.github/workflows/playwright-quality.yml`, expanded from the GQC-00 discovery preflight
- `tests/components/`
- `tests/smoke/`
- `tests/fixtures/`
- `tests/unit/`
- `tests/README.md`
- `tests/TEST_DOCUMENTATION.md`
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator for approved policy decisions

GQC-01 owns `testMatch`, project membership, zero-test checks, retries, reporter, and the shared test URL. Later PRs may change only their named server or project fields.

The `tests/fixtures/` scope in this sprint covers existing helpers and test configuration only. GQC-02 owns `spa-test-target.html` and its test-only graph manifest.

## Non-goals

- Do not rewrite feature specs to remove waits in this sprint. GQC-02 owns journey and flake cleanup.
- Do not change the continuous deployment policy without an owner decision.
- Do not add Firefox or WebKit to every expensive feature test. Decide the minimum browser matrix from GQC-00 risk.
- Do not add a new test framework. The repo already uses Playwright and `node:test`.
- Do not add Astro or change how pages are served. GQC-02B owns that switch.
- Do not delete tests to make counts or CI duration smaller.

## Definition of done

- [x] Every Playwright project has an explicit test set and a non-zero discovery guard.
- [x] All 14 component specs are discovered and run under the chosen module format.
- [x] `tests/smoke/clm-dashboard.spec.cjs` has an explicit owner and test-project assignment.
- [x] Category-project counts distinguish unique spec files from deliberate cross-browser repeats.
- [x] CI reports real failures and stores the agreed artifacts.
- [x] Local and CI commands use the same base URL contract.
- [x] The `tests/observability/*.test.js` files run under `npm run test:unit` or have an explicit exclusion owner.
- [x] The current deployment decision remains unchanged unless a separate approval exists.
- [x] Both test guides match the verified commands and project layout.
- [x] The server command contract and root-page characterization specs are ready for GQC-02B to reuse unchanged.
- [x] TEA records suite counts, retries, and remaining flake risks.
- [x] The operator approves the handoff to GQC-02.
