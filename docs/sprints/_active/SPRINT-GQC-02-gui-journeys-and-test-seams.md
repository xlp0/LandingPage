# Sprint GQC-02: GUI journeys and reusable test seams

## Metadata

- Sprint ID: `SPRINT-GQC-02`
- Handle: `urn:pcard:sprint:SPRINT-GQC-02`
- Status: `COMPLETED`
- Depends on: `SPRINT-GQC-01`
- Unblocks: `SPRINT-GQC-02A`
- Execution unit: `PR-GQC-02`
- Poteto playbook: `tdd`, `swarm`, and `principle-test-behavior-not-implementation`
- BMAD roles: Analyst, UX Designer, Architect, TEA, Dev, Tech Writer

## Outcome

Define and characterize the P0 SPA test journey before GQC-04 builds its guided UI. Give each approved journey a named owner, target type, Playwright assertion, test level, command, and MCard evidence path. Reuse existing ERB fixtures and conformance checks.

The test suite must distinguish product support from file presence. A file under `components/`, `examples/`, or `public/` is not automatically a supported GUI surface.

Use the [MCard_TDD design contract](./INDEX.md#mcard_tdd-design-contract). The coverage registry is a test index, not a second route graph. It references Page and Place identities and Functional Link and Transition identities from an approved MCard or generated navigation source.

This sprint also fixes the shape that the rest of the program uses for nets. The fixture graph uses the LandingPage envelope defined in [GQC-02A](./SPRINT-GQC-02A-layer1-site-net-and-transition-census.md#file-format) with a `topology` section that `clm-kernel/layer1` `parsePetriNetYaml` accepts, and a `bindings` section for kinds, routes, and owners. Each journey is written as a firing sequence of Transition IDs, so GQC-02A can replay it through `ColoredPetriVM`.

Journeys are written against URLs, roles, labels, and network contracts only. They must pass unchanged when GQC-02B moves pages to Astro. A journey that needs a rewrite after the Astro switch is a defect in the journey or in the migration.

## Existing test seams to reuse

- `tests/fixtures/device-matrix.js` derives Playwright device options from `js/device-registry.js`.
- `tests/fixtures/target-preflight.js` checks external target reachability.
- `tests/conformance/catalog.js` and `tests/conformance/runner.js` own reusable device checks and fidelity handling.
- `js/harness/lab-api.js` exposes the Responsive Lab test interface.
- `tests/fixtures/clm-helpers.js` contains dashboard setup behavior that must be validated before reuse or replacement.
- `js/nav.js` is generated from LandingPage's PenPot navigation. It is not the route graph for an arbitrary SPA target.
- `server/test-run-api.mjs` stores test runs in the canonical MCard Triad. The current `responsive_test_run:v1` schema has no navigation-net reference.

The new test interface should hide repeated setup decisions. It should not wrap Playwright methods one-for-one or make test failures harder to trace.

## Work sequence

1. Approve the target classifications and P0 journey from GQC-00.
2. Add a coverage registry with journey ID, target type, target handle, Page ID, Place ID, Functional Link ID, Transition ID, source kind and source reference, priority, test level, owner, command, and visible outcome.
3. Keep the registry as a projection over its declared source. Do not hand-copy `NAVIGATION_ROUTES` or create a parallel canonical graph.
4. Use `tests/fixtures/spa-test-target.graph.json` as the test-only source for fixture Places and Transitions until GQC-05 persists the approved net as a `NetMCard`. Write it in the GQC-02A envelope shape. Parse its `topology` with `parsePetriNetYaml` in the registry unit test to prove the shape before GQC-02A adds the full checker.
5. Add a registry check that catches missing source Places, Transitions, page files, and test files. Scope Place and Transition uniqueness by target handle and source graph.
6. Create `tests/fixtures/spa-test-target.html` with at least two user-visible views and one functional link. Keep its route changes inside one browser document.
7. Keep the SPA fixture same-origin for P0 capture. Use the existing `tests/fixtures/probe-target.html` when testing the cross-origin probe agent.
8. Design fixtures for application setup, seeded MCard data, server state, and cleanup. Use temporary storage for persistence tests.
9. Add shared Page Objects only for repeated user behavior such as target selection, device changes, navigation, or MCard result inspection.
10. Cover the P0 SPA journey with unit tests for pure logic, integration tests for API and persistence contracts, and Playwright for visible outcomes.
11. Keep workbench controls such as device selection, capture, and replay distinct from the target application's navigation net. GQC-02A declares the workbench net as a separate source; this sprint leaves workbench Place and Transition columns empty for GQC-02A to fill.
12. Stub OAuth, WebLLM, WebSocket peers, and third-party calls at their boundaries. Keep tests independent of production credentials and public network availability.
13. Replace arbitrary waits only in journeys changed by this sprint. Use observable state, response, or event conditions.
14. Record each approved journey as an ordered list of Transition IDs in the registry `firing_sequence` field. A server call appears as a request and result pair, not as one step.

## Initial journey candidates

The P0 SPA test journey follows the user's stated product direction. The Product Manager classifies the target types and any additional journeys. Unapproved candidates remain undecided.

| Journey | Priority | Existing evidence | Candidate test |
| --- | --- | --- | --- |
| Guided SPA test | P0 | Responsive Lab target, device, capture, and replay controls. Add a deterministic local SPA fixture. | Select the target, load it, choose a device, follow a functional link, record or replay the path, and inspect its MCard result. |
| SPA failure recovery | P0 | Target membrane, preflight, blocked-target state, and capture-source lifecycle. | Reject an unsafe or unavailable target, explain why, and allow recovery without recording an unapproved origin. |
| LandingPage navigation | Regression | `js/nav.js` generated from PenPot and `tests/features/penpot-navigation.spec.js` | Verify the approved LandingPage routes. Do not count them as target-SPA coverage. |
| Single-page MCard viewer | Regression | `tests/smoke/single-page-mcard.spec.js` | Load, bind, switch, and reject unsafe URL inputs under the SMO contract. |
| MCard rendering | Regression | `js/landing-page-mcard.js` and `js/renderers/` | Render media, documents, inert code, and sandboxed web content. |
| PenPot MPA assessment | Optional | Current PenPot route graph covers LandingPage only. | Add an MPA mapping test only after the Product Manager approves a separate target design and GQC-05 proves the adapter contract. |
| Authentication, collaboration, AI, and offline | Undecided | `routes/auth.js`, P2P/WebRTC, WebLLM, and service worker files | Keep outside P0 until the Product Manager approves each journey and deterministic provider. |
| Accessible operation | Cross-cutting | Existing keyboard, reduced-motion, and tap-target checks | Verify keyboard use of target selection, device controls, capture/replay, blocked-state recovery, and result inspection. |

## Files in the implementation PR

- `tests/gui-coverage.json`
- `tests/fixtures/app-fixtures.js`
- `tests/fixtures/spa-test-target.html`
- `tests/fixtures/spa-test-target.graph.json`, a test-only fixture net in the GQC-02A envelope shape that GQC-05 may convert to a `NetMCard`
- `tests/unit/gui-coverage-registry.test.mjs`
- New approved specs under `tests/features/`, as named in the coverage registry. GQC-01 owns project membership.
- Existing specs under `tests/features/`, edited only for an approved gap or fixture migration recorded per file
- `.github/workflows/playwright-quality.yml`, coverage-report step only
- `tests/README.md`
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator for approved journey scope

## BMAD responsibilities

### Analyst and Product Manager

- Confirm which journey candidates are supported and which remain experiments.
- Separate a user promise from a test implementation detail.

### UX Designer

- Review keyboard, loading, error, blocked-target, and empty states.
- Confirm that tests use visible labels and outcomes that match the actual interface.

### Architect

- Define shared fixture contracts and where test data enters the system.
- Keep test-only state out of production modules.
- Approve the fixture net envelope shape jointly with the GQC-02A owner, so the workbench net and fixture net share one checker.

### TEA

- Assign risk and priority to approved journeys.
- Choose the smallest test level that proves each acceptance criterion.
- Reuse conformance checks instead of copying assertions into new specs.
- Use roles and labels first, then stable `data-*` hooks only where needed.

### Dev and Tech Writer

- Add each test before changing behavior in later sprints.
- Update the test guide and coverage registry with every new journey.

## Stories and acceptance criteria

### GQC-02.1 Create the GUI coverage registry

- [x] Each supported journey has a unique ID and one accountable owner.
- [x] Each registry row names the target type, target handle, test file, test level, priority, command, and observable outcome.
- [x] SPA coverage rows identify the target Page, its Place, the Functional Link, its Transition, and the source reference.
- [x] A source reference identifies a fixture graph manifest, a generated LandingPage graph, or an existing MCard. It does not require a persisted `NetMCard` before GQC-05.
- [x] GQC-02 may reference a fixture graph manifest or generated graph. GQC-05 owns persisted `NetMCard` references.
- [x] The registry is a test index over its declared source. It does not define a second canonical application graph.
- [x] Place and Transition IDs are unique within their target and graph scope. The registry rejects duplicate IDs within that scope.
- [x] MPA and PenPot rows remain optional and do not count as P0 SPA coverage.
- [x] Rows describe the current `responsive_test_run:v1` receipt path without adding a graph field to that closed schema.
- [x] Undecided journeys stay marked undecided rather than counting as covered.
- [x] A unit check fails when a supported row points to a missing target, Place, Transition, source reference, page, or spec.
- [x] `.github/workflows/playwright-quality.yml` publishes the registry result in its job summary.
- [x] Each approved journey row has a `firing_sequence` of Transition IDs that exist in its declared source net.
- [x] Workbench rows carry empty workbench Place and Transition columns that GQC-02A fills. The registry check treats them as pending, not missing.

### GQC-02.2 Add reusable fixtures

- [x] A fixture creates isolated browser state and cleans it after each test.
- [x] `spa-test-target.html` changes between at least two user-visible views without replacing its browser document.
- [x] The fixture exposes at least one declared functional link and one invalid or unavailable action.
- [x] The graph manifest names an error Place and defines how an invalid action reaches it.
- [x] Persistence tests use temporary data and never touch `data/mcard-api.db`.
- [x] A second test can use the fixture without copying setup or cleanup code.
- [x] Fixtures expose a narrow interface and do not hide the action under test.
- [x] `spa-test-target.graph.json` has `topology` and `bindings` sections. `parsePetriNetYaml` accepts its `topology` section in a unit test.
- [x] The fixture net declares its invalid action as a Transition into the error Place and one `recover` Transition back to a view Place.

### GQC-02.3 Add risk-based Playwright journeys

- [x] P0 covers target selection, device setup, a real SPA link action, capture or replay, and visible MCard result inspection.
- [x] Tests distinguish workbench controls from target-app Places and Transitions.
- [x] LandingPage's PenPot navigation tests remain a separate regression journey.
- [x] Authentication, collaboration, WebLLM, and offline journeys stay undecided until the Product Manager approves them.
- [x] External targets use the existing preflight or an intercepted local fixture.
- [x] Tests assert visible user results, server responses, or persisted MCard outcomes.
- [x] New tests use bounded, state-based waits rather than arbitrary fixed delays.
- [x] Journeys select by URL, role, label, or stable ID only. They make no assumption about how a page is served, so they can run unchanged against the GQC-02B Astro host.

### GQC-02.4 Record gaps instead of hiding them

- [x] Every uncovered approved journey has an owner and a planned sprint.
- [x] Every unsupported page has an explicit status and is excluded from the coverage denominator.
- [x] The P0 denominator includes only approved SPA target journeys and the workbench steps that support them.
- [x] A PenPot design edge does not count as a passing runtime Transition without a Playwright assertion against the target.
- [x] CI reports the coverage registry result with the suite artifacts.

## Non-goals

- Do not introduce a generic UI testing DSL.
- Do not make a Page Object for every HTML file.
- Do not mirror all `NAVIGATION_ROUTES` into a second routing source.
- Do not add tests that require real Zitadel credentials, a live WebLLM model download, or public WebRTC peers.
- Do not claim WCAG conformance from the existing tap-target and keyboard checks alone.
- Do not author the workbench site net. GQC-02A owns it. This sprint fixes only the envelope shape through the fixture net.
- Do not add Astro or Preact. GQC-02B owns them.

## Definition of done

- [x] The Product Manager approves target classes and any product surfaces beyond the user-approved P0 SPA journey. Other rows may stay undecided.
- [x] Every P0 journey has a passing Playwright spec or an explicit blocker and owner.
- [x] Every registry row points to an existing test or a documented gap.
- [x] Page and Place traceability and Functional Link and Transition traceability pass the registry test without mutating `responsive_test_run:v1`.
- [x] Fixtures isolate browser state, server state, and temporary data.
- [x] Existing device and conformance helpers are reused where their contracts fit.
- [x] CI publishes the registry result with Playwright artifacts.
- [x] The fixture net uses the GQC-02A envelope shape, and every P0 journey has a firing sequence.
- [x] TEA signs off on test-level selection and remaining risks.
- [x] The operator approves the handoff to GQC-02A.
