# Sprint GQC-05: MCard process, renderer, package, and server ownership

## Metadata

- Sprint ID: `SPRINT-GQC-05`
- Handle: `urn:pcard:sprint:SPRINT-GQC-05`
- Status: `STAGED`
- Depends on: `SPRINT-GQC-04`
- Unblocks: `SPRINT-GQC-06`
- Execution unit: `PR-GQC-05`
- Poteto playbook: `architect`, `principle-subtract-before-you-add`, and `principle-migrate-callers-then-delete-legacy-apis`
- BMAD roles: Product Manager, Architect, Analyst, TEA, Dev, Tech Writer

## Outcome

Persist the guided SPA process that models each target Page as a Place and each Functional Link as a Transition through the existing MCard Triad. Persist the GQC-02A workbench site net the same way, so the Lab's own pages and server calls have a content-addressed topology. Then make package, renderer, and server ownership explicit. The Layer 1 `PetriNetTopology` is the substrate for both nets. Use the published CLM Layer 4 implementation only where its verified contract fits.

Use the [MCard_TDD design contract](./INDEX.md#mcard_tdd-design-contract). Do not change `responsive_test_run:v1` in place, create another SQL schema, or copy CLM process logic into LandingPage.

After GQC-02B, the root server product is Express plus the mounted Astro handler. Server ownership in this sprint covers both, and it sets the policy for where new server calls live.

## Current architecture facts

Planning checks found byte-identical pairs:

- `js/modules/markdown-renderer/index.js` and `packages/markdown-renderer/src/index.js`.
- `js/modules/p2p-serverless/index.js` and `packages/p2p/src/index.js`.
- `js/pkc-core.js` and `packages/core/src/pkc-core.js`.
- `room-registry.mjs` and `packages/server/src/room-registry.mjs`.

The root `ws-server.js` and `packages/server/src/ws-server.js` differ in size and implementation. The available architecture review also found differences in API mounting, CORS configuration, and security policy.

The two browser rendering paths have different visible contracts:

- `js/landing-page-mcard.js` classifies single-page MCards into media, document, code, and webapp.
- `js/renderers/RendererRegistry.js` registers MIME-specific renderers such as Markdown, LaTeX, PDF, audio, video, and embedded content.

The exact copies are candidates for shared source or generated output. They are not automatic deletion targets.

The installed `clm-kernel@0.0.12` exports `Layer4TrellisNavigationNet`, `PlaceMCard`, `TransitionMCard`, `NetMCard`, `MCardMarking`, and `FiringReceiptMCard`. Its `ViewPlaceMCard`, `NavigationTransitionPCard`, and `SessionTokenMCard` names are TypeScript aliases. A read-only Node probe succeeded when the Place type used a CLM view type URI, moved a session token, and returned a committed receipt. An invalid action reached `p_error_modal`. Passing a `mcard:route:/...` handle as the CLM type did not navigate.

`LandingPage/package.json` and its lockfile pin 0.0.12. The sibling CLM workspace source reports 0.0.13. Verify planned imports against the installed 0.0.12 package, not the newer sibling source.

No current LandingPage file imports `Layer4TrellisNavigationNet`. LandingPage does not currently persist a Layer 4 navigation net or connect a firing receipt to `responsive_test_run:v1`. The run schema rejects unknown top-level keys. The server already stores card content through `CanonicalTriadBackend` in the three-table Triad.

`Layer4TrellisNavigationNet` exposes its namespace maps and marking but no `toNetMCard()` method. A persisted `NetMCard` snapshot needs an explicit adapter that selects its Places, Transitions, and initial marking.

The package root also exports `PlaceMCard`, `TransitionMCard`, and `NetMCard.create(netId, places, transitions, marking)`. The `clm-kernel/layer1` subpath exports `parsePetriNetYaml`, `IncidenceMatrix`, `ColoredPetriVM`, and `FiringRecord`. GQC-02A uses these to check and replay the workbench net. A workbench `NetMCard` can therefore be built from the checked `topology` section without the Layer 4 class.

After GQC-02B, the root `ws-server.js` mounts the Astro static output and request handler. `packages/server/src/ws-server.js` does not. The root and packaged servers now also differ in whether they serve Astro pages.

## Work sequence

1. Build a consumer map for each duplicated file. Include browser imports, package exports, build scripts, tests, and published output.
2. Record whether each pair is shared source, generated copy, separate product variant, or unused implementation.
3. Verify the installed `clm-kernel@0.0.12` Layer 4 API from the server runtime. Keep target route handles separate from CLM view type URIs.
4. Test a valid SPA transition, an invalid transition to the error Place, the marking, and the firing receipt against the published package.
5. Define `NetMCard` as immutable topology with a declared initial marking. Keep per-run session tokens, markings, and firing receipts separate from the topology.
6. Choose how a navigation `NetMCard` and firing receipts reference a test run. Use a separate linked MCard or an approved versioned schema. Preserve reads of `responsive_test_run:v1`.
7. Persist approved process and receipt content through the existing Triad. Add no domain-specific SQL tables.
8. Make writes idempotent. Publish a completed run handle only after the net and required receipts verify. A partial write must never appear as a passing run.
9. Serialize transitions per session or prove that duplicate and concurrent submissions cannot produce divergent markings or receipts.
10. Define recovery from `p_error_modal`. A new session or explicit recovery Transition must be required before another normal action.
11. Verify the browser import path separately. Keep process execution server-side unless a browser build and its Playwright contract test prove that direct import works.
12. Compare package build output with its documented exports and the application import path.
13. For each shared behavior, choose one canonical implementation and one generation or import path. Migrate at most one exact source pair.
14. If no pair has a safe shared interface, keep the implementations separate and add a parity check.
15. Keep distinct rendering behavior separate when its MIME, security, storage, or lifecycle contract differs.
16. Compare root and packaged server routes, CORS, CSP, auth, and deployment use. Record the product decision without changing either server's behavior.
17. Assess PenPot MPA mapping only if the Product Manager approves it. Report unbound frames and unsupported interactions. Defer the assessment if no live target can verify the mapped transitions.
18. Record the `0.0.10` test-run value and `0.0.12` runtime value as a provenance mismatch. Leave the correction to GQC-07.
19. Build a workbench `NetMCard` from the checked `topology` section of `src/net/workbench-net.yaml` with `NetMCard.create`. Store the `bindings` section as a separate linked MCard so route metadata never enters the topology hash.
20. Store workbench firing evidence as the `FiringRecord` list that `ColoredPetriVM` produces when it replays a Playwright trace. Keep `FiringReceiptMCard` for target-net sessions. Do not create a third receipt type.
21. Add the Astro handler to the root and packaged server comparison. Record whether the packaged server must serve Astro pages.
22. Set the server-call policy. Existing Express routes stay. A new UI-reachable server call is an Astro endpoint or Astro Action unless it needs WebSockets, Express middleware state, or an existing router. Every new call is declared in the workbench net before merge.
23. Decide whether production pages emit a navigation trace. The default is no production instrumentation; traces come from Playwright.

## Files in the implementation PR

- `scripts/package-source-parity.json`
- `scripts/check-package-source-parity.mjs`
- `tests/unit/package-source-parity.test.mjs`
- Built-package consumer tests under `tests/unit/`
- `server/test-run-api.mjs` and `js/harness/test-run-schema.js` only for an approved versioned graph-to-run link
- Layer 4 navigation and Triad persistence tests under `tests/unit/`
- `scripts/net-to-netmcard.mjs`, which builds and stores the workbench and target `NetMCard` from checked envelopes
- Layer 1 workbench-net persistence and trace-replay tests under `tests/unit/`
- `src/pages/responsive-lab.astro`, `src/islands/SpaTestWorkflow.jsx`, `js/harness/spa-test-workflow.js`, and `tests/features/spa-test-workbench.spec.js` only to display and verify the persisted net and firing receipt from the GQC-04 guide
- Renderer and server contract tests under `tests/`
- Optional MPA track only after Product Manager approval: `js/harness/penpot-mpa-navigation-adapter.js`, `tests/fixtures/penpot/sample-mpa.penpot`, `tests/unit/penpot-mpa-navigation-adapter.test.mjs`, and `tests/features/penpot-mpa-assessment.spec.js`
- Read-only parser inputs: `scripts/penpot-nav.mjs` and `design/landing-navigation.penpot`. The existing design file tests LandingPage navigation only, not the target MPA.
- Read-only input from `docs/sprints/_active/evidence/GQC-00-consumer-map.md`, produced by PR-GQC-00
- At most one exact source pair named by that read-only map
- The owning package and architecture docs
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator for approved source and consumer decisions

Do not edit the consumer map or change `ws-server.js` or `packages/server/src/ws-server.js` behavior in this PR. The Astro mount order from GQC-02B and GQC-03 stays unchanged. The only allowed server behavior change is the approved, versioned graph-to-run link in `server/test-run-api.mjs`. Change the GQC-04 guide only to display its persisted MCard evidence. A server convergence change requires its own product decision and verification plan. Do not add MPA behavior if the GQC-00 approval gate remains closed.

## BMAD responsibilities

### Architect

- Own the consumer map and the package or runtime boundary decision.
- Keep separate adapters only when there are real variants behind a shared interface.
- Avoid a new compatibility layer when it only forwards the same call.
- Verify the Layer 4 types, process URI, MCard persistence format, and test-run link before approving runtime use.
- Own the server-call policy that decides when a new call is an Astro endpoint, an Astro Action, or an Express route.

### Analyst

- Confirm which package outputs external consumers rely on.
- Record whether the root server and package server have separate product owners.

### Product Manager

- Approve the external package and browser contracts.
- Confirm whether the root and package servers represent one product or separate products.
- Approve or defer the PenPot MPA extension. Keep it outside P0 SPA coverage unless approved.

### TEA

- Add contract tests for source imports, built package exports, render behavior, and server responses.
- Keep unit, package consumer, API integration, and Playwright checks at the right level.
- Assert a valid Transition between Places, an invalid action to the error Place, and a persisted receipt.

### Dev

- Migrate callers before deleting a copied implementation.
- Prove both standalone repository and workspace builds after a source ownership change.
- Keep the existing security behavior for inert code and sandboxed web content.

### Tech Writer

- Document the supported package import paths and server variants.
- Keep old sprint results as historical evidence.

## Stories and acceptance criteria

### GQC-05.1 Record ownership for every package copy

- [ ] The inventory records each pair's byte comparison, callers, exports, build command, and shipped consumer.
- [ ] Every pair receives one ownership classification and an owner.
- [ ] A duplicate with no callers is not deleted until the dead-code change has its own test and review.

### GQC-05.2 Choose and prove a shared-source strategy

- [ ] The selected pair has two verified consumers with the same behavior contract.
- [ ] The chosen strategy works in the workspace build and in the package's published layout.
- [ ] The browser runtime does not import source from a sibling repository path.
- [ ] A package consumer test imports the built artifact, not only the source file.
- [ ] A sync or generation check detects future drift if generated copies remain.
- [ ] No second source pair migrates in this PR.
- [ ] If no pair meets the shared-interface criteria, record that result and pass the parity check without moving source.

### GQC-05.3 Preserve rendering contracts

- [ ] Tests cover media, Markdown and math, inert code, sandboxed webapp, and unsupported MIME fallback.
- [ ] The single-page MCard classifier remains aligned with the four-modality contract.
- [ ] The MIME renderer registry retains only behavior with a real consumer.
- [ ] Transclusion, URL validation, and iframe sandbox attributes remain covered.

### GQC-05.4 Define server product ownership

- [ ] The root and package server have a route and policy comparison table.
- [ ] The owner records whether these are one product or separate deployment variants.
- [ ] Contract tests assert the current routes, WebSocket path, CORS, CSP, and configuration response for each variant.
- [ ] `ws-server.js` and `packages/server/src/ws-server.js` behavior does not change.
- [ ] Any `server/test-run-api.mjs` behavior change is limited to the approved, versioned graph-to-run link and keeps v1 reads intact.
- [ ] The comparison table includes the Astro static mount and handler, and records whether the packaged server serves Astro pages.
- [ ] The server-call policy is recorded in `DECISIONS.tsv`. A check fails when a UI-reachable server call in `src/` is missing from the workbench net.

### GQC-05.5 Record runtime provenance gap

- [ ] Record the mismatch between `js/harness/recorder.js` and `server/mcard-modality.mjs`.
- [ ] Assign source selection to the GQC-07 Architect. The Product Manager approves user-facing version claims, and TEA tests new writes and historical reads.
- [ ] Keep existing stored records readable. Do not migrate stored records in GQC-05.

### GQC-05.6 Persist the Page and Transition process

- [ ] A target Page or View is represented as a `PlaceMCard`. A Functional Link is represented as a `TransitionMCard` through `Layer4TrellisNavigationNet`.
- [ ] `registerViewPlace(placeId, routeUri)` stores `routeUri` as `PlaceMCard.typeExpr`. Pass a CLM view type URI from the approved `clm://type/view/...` family and reject malformed or non-CLM values.
- [ ] Keep the target route handle in its own field. Never pass `mcard:route:/...` as the Place type URI.
- [ ] A valid link moves the session marking to its destination Place and returns a `FiringReceiptMCard`.
- [ ] An invalid link reaches the declared error Place and returns an exception receipt.
- [ ] Assemble the `NetMCard` snapshot from the registered namespace Places, Transitions, and a defined initial marking. The Layer 4 class does not provide a `toNetMCard()` method.
- [ ] Persist immutable topology separately from each run's `MCardMarking`, `SessionTokenMCard`, and `FiringReceiptMCard`.
- [ ] The net, tokens, and receipt are stored as MCard content through the existing Triad. No domain-specific SQL table is added.
- [ ] The Architect selects a run-to-net reference that preserves `responsive_test_run:v1`. Use a separate linked MCard or an approved versioned schema.
- [ ] Existing v1 test runs remain readable and unchanged.
- [ ] An interrupted or unfinalized capture is never reported as a passing run or certification. Represent it with an approved partial result or reject it with a visible reason.
- [ ] A partial write never creates a completed-run handle. Retrying a graph or receipt write is idempotent.
- [ ] Duplicate or concurrent firing requests for one session cannot create divergent markings or receipts.
- [ ] A session at `p_error_modal` cannot fire a normal Transition. Recovery starts a new session or uses an explicitly declared recovery Transition.
- [ ] Unknown run-schema versions fail visibly. The reader does not silently downgrade them to v1.
- [ ] Process execution stays server-side unless an isolated browser build and Playwright contract test prove the browser import path.
- [ ] The implementation does not claim liveness or deadlock guarantees, or P-invariants beyond the session invariant GQC-02A verifies, without a separate proof and verification suite.

### GQC-05.8 Persist the workbench site net

- [ ] `scripts/net-to-netmcard.mjs` builds a `NetMCard` from the checked `topology` section of `workbench-net.yaml` with `NetMCard.create`.
- [ ] The `bindings` section is stored as a separate MCard linked to the net. Changing a route or owner does not change the topology hash; changing a Place or arc does.
- [ ] Rebuilding from an unchanged envelope produces the same hash. The write is idempotent.
- [ ] A Playwright trace replayed through `ColoredPetriVM` produces a `FiringRecord` list that is stored as MCard content and linked to the net hash.
- [ ] Target-net sessions keep `FiringReceiptMCard`. No third receipt type is added.
- [ ] The workbench net and each target net are stored as separate `NetMCard` records and never merged.
- [ ] Nothing in the browser imports `clm-kernel` to build or store these records.

### GQC-05.7 Gate optional PenPot MPA assessment

- [ ] If the Product Manager approves the extension and a target route set, create `tests/fixtures/penpot/sample-mpa.penpot` from that approved scope.
- [ ] Map approved PenPot frames to explicit Page and Place IDs and `navigate` interactions to Transition IDs.
- [ ] The adapter uses the existing PenPot graph and graph hash. It does not create a second LandingPage route registry.
- [ ] The committed LandingPage `design/landing-navigation.penpot` remains a parser regression input, not the MPA target source.
- [ ] Every unbound frame and unsupported interaction appears in an incomplete mapping report. The adapter does not silently drop it.
- [ ] A design edge counts as a proposed transition only. A live Playwright test verifies the actual target route and action.
- [ ] If no reachable target instance exists, the MPA assessment remains deferred rather than passing from design data alone.
- [ ] The optional track reads the approved PenPot file. It does not write PenPot documents or manage live MPA routes.
- [ ] If approval or target bindings are missing, record the extension as deferred and make no MPA behavior change.

## Verification

- Run `npm run build --workspaces`.
- Run `npm run test:unit`.
- Run package consumer tests for every changed workspace.
- Run the Layer 4 navigation probe and Triad persistence tests against the installed `clm-kernel@0.0.12`.
- Run Playwright modality journeys from GQC-02.
- Run server contract tests for each approved server variant.
- Run the existing SMO and ERB contract suites that cover MCard integrity, sandboxing, target safety, and conformance.
- Run `npm run check:net` and the workbench `NetMCard` round-trip test.

## Test design

| ID | Level | Scenario | Expected result |
| --- | --- | --- | --- |
| GQC-05-UNIT-01 | Unit | Register a Page Place with an approved `clm://type/view/...` URI and a separate route handle | The Place admits the session token and does not treat the route handle as its type URI. |
| GQC-05-UNIT-02 | Unit | Register a malformed or non-CLM view type | The adapter rejects it before net execution. |
| GQC-05-INT-01 | Integration | Persist and reload the net, initial marking, run, and receipts | Every record verifies through the canonical Triad and the approved graph-to-run reference resolves. |
| GQC-05-INT-02 | Integration | Fail between net and receipt writes, then retry | No completed-run handle points to partial evidence, and retry is idempotent. |
| GQC-05-E2E-01 | E2E | Fire a valid and invalid transition from the guided UI | The valid action reaches its Place. The invalid action reaches `p_error_modal` and displays recovery. |
| GQC-05-E2E-02 | E2E | Submit the same transition twice for one session | The marking and receipt sequence remain consistent and do not double-commit. |
| GQC-05-INT-03 | Integration | Build the workbench `NetMCard` twice, then change one binding and one arc | The first two hashes match. A binding change keeps the topology hash. An arc change alters it. |
| GQC-05-INT-04 | Integration | Replay a P0 Playwright trace and store its `FiringRecord` list | The record links to the workbench net hash and reloads with the same firing order. |
| GQC-05-UNIT-03 | Unit | Add a `fetch` to an island without declaring it in the net | The server-call coverage check fails and names the call site. |

## Non-goals

- Do not force both rendering paths into one registry when their callers require different behavior.
- Do not unify root and packaged server implementations in this sprint.
- Do not edit `clm-kernel` behavior from this repository.
- Do not add a second Petri-net executor or a second page-transition registry. `check-net.mjs` and trace replay call the kernel's `parsePetriNetYaml`, `IncidenceMatrix`, and `ColoredPetriVM`; they do not reimplement them.
- Do not move existing Express routes to Astro endpoints in this sprint. The policy applies to new calls.
- Do not change `responsive_test_run:v1` in place or add SQL tables for Places, Transitions, markings, or receipts.
- Do not claim the current LandingPage PenPot graph supports arbitrary MPAs.
- Do not write to PenPot files or change target MPA routes in the optional read-only assessment track.
- Do not change the package format or publish versions as part of this sprint.
- Do not preserve byte-identical copies indefinitely if one canonical source and a verified consumer build can replace them safely.

## Open decisions

| Decision | Owner | Target sprint | State |
| --- | --- | --- | --- |
| Which source or generation path owns each byte-identical package and browser pair? | Architect | GQC-05 | Open |
| Which package import paths are supported for external and browser consumers? | Product Manager and Architect | GQC-05 | Open |
| Which built-package and browser tests prove the selected source path? | TEA | GQC-05 | Open |
| Which CLM view type vocabulary is approved for target Page Places? | Architect and Product Manager | GQC-05 | Open |
| Should process execution remain server-side, or can the Layer 4 package run in a browser build? | Architect and TEA | GQC-05 | Open |
| Should test runs reference a separate `NetMCard` receipt or use a new versioned run schema? | Architect and Product Manager | GQC-05 | Open |
| How should interrupted or unfinalized runs be represented without implying a pass? | Architect and TEA | GQC-05 | Open |
| Is PenPot-assisted MPA assessment approved, and which target owns its frames and links? | Product Manager | GQC-00 and GQC-05 | Open |
| Does "manage MPA" mean read-only assessment or authoring changes to PenPot and live routes? | Product Manager | Future follow-up after GQC-05 | Open |
| Are the root and packaged servers one product or separate products? | Product Manager and Architect | GQC-05 | Open |
| Does `RendererRegistry` own the `app.html` flow or a separate page contract? | Architect and Product Manager | GQC-05 | Open |
| Which release version source should GQC-07 use for new test-run records? | Architect and Product Manager | GQC-07 | Open |
| When is a new server call an Astro endpoint, an Astro Action, or an Express route? | Architect | GQC-05 | Open |
| Must the packaged server serve Astro pages, or is Astro a root-server feature only? | Product Manager and Architect | GQC-05 | Open |
| Do production pages emit navigation traces, or do traces come only from Playwright? | Product Manager, Architect, and security owner | GQC-05 | Open; default is Playwright only |

## Definition of done

- [ ] Every duplicate has a documented owner or a separate deletion story.
- [ ] At most one exact package and browser source pair changes.
- [ ] If no safe pair qualifies, the contract map and parity check pass without a source move.
- [ ] All changed package exports pass from build output.
- [ ] Server variants and renderer contracts have tests at the appropriate level.
- [ ] No package imports from sibling repository source paths.
- [ ] Existing MCard, security, and responsive contracts pass.
- [ ] Page and Place records and Functional Link and Transition records use the approved CLM type and handle mapping.
- [ ] The graph-to-run link preserves all v1 test records and uses the canonical Triad.
- [ ] The workbench site net and each target net persist as separate `NetMCard` records, and workbench trace evidence persists as Layer 1 `FiringRecord` content.
- [ ] The server-call policy and the Astro row of the server comparison are recorded.
- [ ] PenPot MPA behavior is either covered by an approved live target test or explicitly deferred.
- [ ] The Architect and product owner approve all ownership decisions.
- [ ] The operator approves the handoff to GQC-06.
