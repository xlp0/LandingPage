# Program BPV plan

| Field | Value |
| --- | --- |
| Audience | Scrum master, BMAD role owners, developers and QA engineers planning Bombadil adoption in LandingPage |
| BMAD Owner | Product Manager (John) with Architect (Winston), UX Designer (Sally) and Developer (Amelia) |
| Source of Truth | This plan, the [BPV sprint files](./INDEX.md), [`DECISIONS.tsv`](../../_active/DECISIONS.tsv) and the [pre-program spike findings](./evidence/BPV-pre-program-spike.md) |
| Status | `GRADUATED` (`2026-11-18`; archived in `docs/sprints/programs/bpv/`) |
| Program | BPV, Bombadil Property Verification and Explorable GUI |
| Guide | [Property-Based Exploration of LandingPage with Bombadil](../../../08-testing/BOMBADIL_PROPERTY_TESTING.md) |

## Outcome

Every in-scope page has a nightly Bombadil run. Each run proves the page loads to a declared ready or error state and that user actions keep it inside its Petri net. Every violation becomes a short Playwright regression spec. The GUI reports its own state in one shared contract, tags every control with a side effect, and drops the duplicate, dead and misleading controls that make random exploration wasteful.

## Who this is for

QA engineers get failures on paths nobody scripted, already shrunk to a few steps. Developers changing an island learn whether any sequence of user actions breaks the net or the recorder lifecycle, without writing more scripted paths. Users of the Responsive UI Lab get one loading and error treatment on every page, controls that work from the keyboard, confirmation before destructive actions and no fake status badges.

The engineer who maintains LandingPage next inherits one page state module instead of six readiness dialects (`BPV-D02`). Net projections are generated, not hand-copied. One lint keeps new controls explorable.

## How this plan was made

The plan follows the poteto-mode figure-it-out route. Four BMAD personas worked independently from the same facts. Sally (UX) audited the pages and islands. Winston (Architect) audited the net seams. Amelia (Developer) installed Bombadil and probed its behaviour against the real server. John (PM) set scope and order. The plan author checked their load-bearing claims against the code and the spike logs before adopting them. The spike results are in [the evidence file](./evidence/BPV-pre-program-spike.md).

## Design decisions

Each decision has a row in [`DECISIONS.tsv`](../../_active/DECISIONS.tsv) under the phase `BPV-plan`.

| ID | Decision | Why |
| --- | --- | --- |
| BPV-D01 | Pages report their own place, and the URL projection is an independent cross-check. | URL matching cannot tell apart the 13 places on `/responsive-lab.html`, cannot see client-route error places, and cannot pick among the 10 ambiguous transition pairs. A page reporting on itself can lie, so a property compares the report with the URL projection. |
| BPV-D02 | One page state contract replaces the six readiness dialects in one wave. | Aliases kept for a transition period double the surface the specs must read. Playwright callers are migrated in the same sprint that adds the contract, then the old names are deleted. |
| BPV-D03 | Controls with side effects carry `data-effect` and a `data-testid`. Specs skip clicks on `destructive`, `external`, `download` and `file-picker` controls by reading live bounding rectangles (superseding `BPV-D06` `fingerprint.testId` because Bombadil `0.7.10` reports frame-relative coordinates; see `DECISIONS.tsv` row 99). | A hand-kept exclusion list drifts. The spike showed one popup stalls a run, so the exclusion list must be complete by construction. Reading it from the page covers controls that scripts create at runtime. |
| BPV-D04 | The SPA net is imported as JSON. Only the workbench YAML net is generated. | The spike proved JSON imports work. A generator for a file that can be imported directly is dead weight. |
| BPV-D05 | Generated modules are imported with the `.ts` extension. | The spike proved extensionless imports fail. |
| BPV-D06 | Superseded by BPV-04 / `DECISIONS.tsv` row 99: exclusions filter on live bounding rectangles (`getBoundingClientRect()` with `2 px` margin) instead of Bombadil action fingerprint `testId`. | Bombadil `0.7.10` reports framed controls using frame-relative coordinates and omits `fingerprint.testId` on framed elements; bounding-rectangle overlap catches every skipped control and redirecting `/` link reliably. |
| BPV-D07 | `/app.html` is a boundary, not a start URL. It gets tagging only where a link to it starts in an in-scope page. | It is legacy Mission Control with auth flows, popups, a hidden file input and no test ids. Retiring it is a separate decision that GQC rules require to follow characterization. |
| BPV-D08 | The target inside the ViewportStage iframe is observed through attributes mirrored onto the host and driven by a custom action that clicks through the frame's `contentDocument`. | The spike proved default clicks never land inside the frame. BPV-00 then proved a `registerCustomAction` handler can click inside it, and that `extract` can read it. The mirror still gives users a visible target state. |
| BPV-D09 | Bombadil runs nightly and stays out of the PR gate. `fuzz` is not used. | Exploration is stochastic and time-boxed. `fuzz` is experimental in 0.7.10. Each found bug enters the PR gate as a promoted Playwright spec. |
| BPV-D10 | Bombadil scope lives in `tests/bombadil/scope.json`, keyed by the `surfaceId` values of `tests/gui-coverage.json`. | The coverage registry has a closed v2 schema certified by GQC. A small keyed side file avoids a schema migration and is validated against the registry by a unit test. |
| BPV-D11 | Bombadil traces replay with `asserted: false`. | Exploration fires transitions but asserts nothing about them. Only promoted Playwright specs count as asserted coverage. |

## Page state contract

BPV-03 introduces this contract and BPV-04 extends it to controls. The names are final for the program. A later change needs a decision row.

| Where | Attribute or element | Values |
| --- | --- | --- |
| `<body>` | `data-net-id` | The net that declares the page, for example `landingpage-workbench-net` |
| `<body>` | `data-place-ids` | Comma-separated Place IDs declared for the document |
| `<body>` | `data-place-id` | The current page or view place, for example `p_page_responsive_lab`, chosen from `data-place-ids` |
| `<body>` | `data-nav-arcs` | Semicolon-separated `from>to>transitionId` navigation arcs used for cross-document `sessionStorage` hand-off and `history:<transitionId>` emission |
| `<body>` | `data-page-state` | `loading`, `ready`, `busy`, `error` or `redirecting`. Only the transient `p_page_index` place uses `redirecting`. |
| `<body>` | `data-page-error` | A short error code, present only when the state is `error` |
| `<body>` | `data-boot-nonce` | A new random value on every document load |
| `window` | `__netReport` | A bounded array of `{ seq, transitionId, fromPlaceId, toPlaceId }` firing records |
| Island root | `data-island-state` | `mounting`, `ready`, `busy`, `empty` or `error` |
| Recording ribbon root | `data-recorder-state` | `IDLE`, `RECORDING`, `PAUSED` or `FINALIZED` |
| ViewportStage root | `data-target-place-id`, `data-target-boot-nonce` | The target's reported place and boot nonce, mirrored from the membrane channel |
| One per page | `#page-status` with `role="status"`, `#page-alert` with `role="alert"` | Live regions for status and errors |
| Every control with a side effect | `data-effect` | `navigate`, `persist`, `destructive`, `external`, `download` or `file-picker`. Specs drop clicks on `destructive`, `external`, `download` and `file-picker`, as well as redirecting `/` and `/index.html` links (and `lab-smoke` drops all off-page navigation links). They explore `persist` against the temporary database, and `navigate` within the generated `--allow-url` boundary. |
| Toggles and tabs | `aria-pressed`, `aria-selected` | Selection state, instead of a CSS class alone |

State lives in these attributes. Test ids name elements and never carry state.

## Sequence

The riskiest unknown comes first. Subtraction comes before addition. The verification layer comes before the specs that depend on it.

| Order | Sprint | Goal | Depends on | Effort |
| ---: | --- | --- | --- | --- |
| 1 | [BPV-00](./SPRINT-BPV-00-toolchain-runner-and-spa-canary.md) | Pin Bombadil, add a hermetic runner and prove a canary bug is found and shrunk on the SPA fixture. | None | 2 days |
| 2 | [BPV-01](./SPRINT-BPV-01-scope-and-gui-subtraction.md) | Fix the exploration scope and remove dead, duplicate and misleading GUI. | BPV-00 | 2 days |
| 3 | [BPV-02](./SPRINT-BPV-02-net-core-and-generated-projections.md) | Extract a pure net core and generate every projection the specs need. | BPV-01 | 2 days |
| 4 | [BPV-03](./SPRINT-BPV-03-page-state-contract.md) | Give every page and island one self-reported state contract. | BPV-02 | 3 days |
| 5 | [BPV-04](./SPRINT-BPV-04-explorable-controls.md) | Make every control explorable, tag side effects and replace native dialogs. | BPV-03 | 3 days |
| 6 | [BPV-05](./SPRINT-BPV-05-page-load-verification.md) | Verify that every in-scope page loads to a declared state with no errors. | BPV-04 | 2 days |
| 7 | [BPV-06](./SPRINT-BPV-06-workbench-interaction-specs.md) | Explore the workbench routes, the recorder lifecycle and the mirrored target place. | BPV-05 | 3 days |
| 8 | [BPV-07](./SPRINT-BPV-07-coverage-nightly-and-graduation.md) | Feed traces into coverage, run nightly, promote violations and request graduation. | BPV-06 | 2 days |

The effort figures are the Developer's original planning estimates prior to `SPRINT-BPV-00` execution.

## Rules for every sprint

- Before editing a function, run GitNexus `impact` upstream on it and record the blast radius in the PR. Before committing, run GitNexus `detect_changes` and confirm that only the expected symbols and flows changed.
- "The existing suites pass" means no failure beyond the Playwright baseline recorded in BPV-00. Each pre-existing failure there has a decision row.
- Every Bombadil run writes to a fresh output directory, because Bombadil refuses to overwrite an existing trace.
- A property is trusted only after it has reported a seeded fault.

## Scope

| Surface | Start URL | In scope | Reason |
| --- | --- | --- | --- |
| SPA fixture | `/tests/fixtures/spa-test-target.html` | Yes | Smallest net and the clearest oracle. It is the canary. |
| Responsive UI Lab | `/responsive-lab.html` | Yes | Primary workbench and most islands. |
| MCard viewer | `/index.html?noredirect=1` | Yes | Loads cards across many renderers. |
| Sprint registry | `/sprint-registry.html` | Load only | Read-only developer viewer with no inbound links. |
| Fiber inspector | `/fiber-inspector.html` | Load only | Read-only developer viewer with no inbound links. |
| Fiber conformance | `/fiber-conformance.html` | Load only | Read-only developer viewer. Its screenshot baselines make layout changes costly. |
| Mission Control | `/app.html` | No, boundary only | See BPV-D07. |
| Game pages | `/public/examples/games/*` | No | External place opened through popups. |

The scope file has one row for each of the 21 surfaces in `tests/gui-coverage.json`. This table lists the surfaces that have a start URL. The rest, such as probe fixtures and blocked external targets, get the scope `none` with a reason.

## Non-goals

- Replacing Playwright, which stays the PR gate.
- A visual redesign. GUI changes are limited to state reporting, semantics, labels and removal.
- Test-only buttons, debug panels or query flags that change the product UI while Bombadil runs.
- Request-lifecycle places such as `p_pending_get_app_config`. They stay with the Playwright net tracer, which sees network traffic.
- Antithesis simulation, PenPot MPA assessment and performance budgets.

## Graduation

Program BPV graduated on `2026-11-18` with explicit operator sign-off (`DECISIONS.tsv` phase `BPV-graduation`) and moved from `docs/sprints/_active/` to `docs/sprints/programs/bpv/`. Per the 2026-11-18 operator ruling (`DECISIONS.tsv` row 117), BPV-07 replaced GitHub CI with the local Docker Bombadil runner and scheduler (`docker/bombadil/compose.yml`, `scripts/bombadil/nightly.sh`). Based on the clean full-budget Docker nightly (`nightly-2026-11-18T09-50-26Z`) and the clean shortened Docker nightly (`nightly-2026-11-18T05-36-00Z`), the operator waived the remaining four calendar night waits for archival while keeping `bombadil-scheduler` running daily at `02:30` UTC:

1. Every in-scope row of `tests/bombadil/scope.json` has a spec that runs nightly.
2. Clean local Docker runs established baseline (`nightly-2026-11-18T09-50-26Z` + `nightly-2026-11-18T05-36-00Z`); remaining 4 nightly waits waived by operator approval on `2026-11-18`, with ongoing nightly runs continuing at `02:30` UTC.
3. The canary still detects and shrinks its seeded bug.
4. The GUI lint (`check:explorable-gui`) and the net drift check (`check:bombadil-nets`) run in the local Docker gate (`bombadil-gate` service and `nightly.sh`) and are green.
5. The adoption guide's status changes from proposal to current.
6. `npm run docs:check` passes, and the existing smoke, components and features projects pass.

## Coordination with Program GQC

Both Program GQC and Program BPV graduated on `2026-11-18` with explicit operator sign-off and moved out of `docs/sprints/_active/` into [`../gqc/INDEX.md`](../gqc/INDEX.md) and [`./INDEX.md`](./INDEX.md).
