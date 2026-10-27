# Sprint GQC-02A: Layer 1 site net and Transition census

## Metadata

- Sprint ID: `SPRINT-GQC-02A`
- Handle: `urn:pcard:sprint:SPRINT-GQC-02A`
- Status: `ACTIVE`
- Depends on: `SPRINT-GQC-02`
- Unblocks: `SPRINT-GQC-02B`
- Execution unit: `PR-GQC-02A`
- Poteto playbook: `architect`, `principle-foundational-thinking`, `principle-model-the-domain`, and `principle-encode-lessons-in-structure`
- BMAD roles: Analyst, Architect, TEA, Dev, Product Manager, Scrum Master

## Outcome

Model the LandingPage workbench as one Place-Transition Network on the CLM Layer 1 substrate. Every workbench page is a Place. Every hyperlink, redirect, page switch, `window.open`, and UI-reachable server call is a Transition. The net is checked-in data that the pinned `clm-kernel` parses, analyzes, and replays. GQC-02B then builds the Astro host against this net, so the net is the contract and Astro is its implementation.

This sprint adds the model, its validator, and a Transition trace check. It does not migrate any page to Astro, change a route, or change a server response.

Use the [MCard_TDD design contract](./INDEX.md#mcard_tdd-design-contract). The workbench net and each target-app net stay separate nets. The GQC-02 SPA fixture net uses the same file format and validator, so the program has one net format and one checker.

## Why Layer 1

The Layer 4 `ViewPlaceMCard` and `NavigationTransitionPCard` names are TypeScript aliases of `PlaceMCard` and `TransitionMCard` (`node_modules/clm-kernel/dist/layer4/petriNavigation.d.ts`). Layer 1 is the substrate both share. Layer 1 also ships the analysis tools the workbench needs: `PetriNetTopology`, `parsePetriNetYaml`, `IncidenceMatrix.fromTopology()`, `findPInvariants()`, `verifyPInvariant()`, `ColoredPetriVM`, `getEnabledTransitions()`, and `fireTransition()`, all exported from the `clm-kernel/layer1` subpath of the installed 0.0.12 package.

Using Layer 1 keeps the earlier Layer 4 contract valid. `Layer4TrellisNavigationNet` remains an optional session facade for target-app navigation (GQC-05). It is not a second net format.

## Planning probe evidence

A read-only Node probe ran against the installed `clm-kernel@0.0.12` on 2026-10-27. The planning record is in [gqc-plan.md Appendix A](./gqc-plan.md#appendix-a-prototype-evidence). GQC-02A reruns it from a clean `npm ci` and commits the output as `evidence/GQC-02A-layer1-probe.md`.

| Probe | Observed result | Design consequence |
| --- | --- | --- |
| Five Places, seven Transitions, page links plus one server call | `parsePetriNetYaml` accepted the JSON topology. Only `t_redirect_index_to_lab` was enabled at the entry marking. | Entry Place and automatic redirect are expressible. |
| Fire redirect, server-call request, server-call failure, recovery, link | Each `FiringRecord.postMarking` moved the single session token as declared. | Pages, pending calls, and error states are Places in one marking. |
| `IncidenceMatrix.fromTopology().findPInvariants()` | Returned the all-ones vector over the five Places. `verifyPInvariant(final, ones, 1)` returned `true`. | "One session is in exactly one Place" is a checkable invariant. |
| Fire a Transition from the wrong Place | `ColoredPetriVM` threw `Transition 't_link_lab_to_app' is not enabled in current marking`. | Replay can reject an undeclared or out-of-order browser action. |
| Same-page call modeled as a self-loop | The incidence column was `[0]`. | Self-loops vanish from `D`. Model every server call as a request and result pair through a pending Place. |
| Unknown fields such as `route`, `kind`, or `meta` | The parser dropped them. `binding` survived. | Keep route and kind metadata in a LandingPage envelope, not inside the topology. |
| Duplicate Place IDs | The parser accepted them. | The LandingPage checker rejects duplicates itself. |
| Dangling arc to a missing Place | The parser rejected it with a validation error. | Reuse the kernel check. Do not reimplement it. |
| `PlaceMCard`, `TransitionMCard`, `NetMCard` at the package root | All present as constructors. | GQC-05 can persist the net as MCard content. |

## Domain model

### Place kinds

| Kind | Meaning | Example ID | Counts in session invariant |
| --- | --- | --- | --- |
| `page` | One user-visible workbench page or Astro route. | `p_page_responsive_lab` | Yes |
| `view` | A distinct user-visible mode of one document, approved by the Product Manager, such as `index.html?noredirect`. | `p_view_index_mcard_viewer` | Yes |
| `pending` | A server call in flight from a page. The page shows its loading state. | `p_pending_post_test_runs` | Yes |
| `error` | A declared error page or error state the user can recover from. | `p_page_error` | Yes |
| `external` | A destination outside the workbench, such as a game opened by `window.open` or a third-party link. | `p_external_games` | No, weight 0 |

### Transition kinds

| Kind | Browser or server trigger | Arcs |
| --- | --- | --- |
| `link` | An internal `<a href>` activation that loads another document. | `page -> page` |
| `redirect` | An automatic `location.replace` or server redirect on arrival. | `page -> page` |
| `client-route` | A soft page switch through Astro's client router, once GQC-02B approves it. | `page -> page` |
| `server-call-request` | A UI-reachable `fetch`, form post, Astro endpoint, Astro Action, or WebSocket connect. | `page -> pending` |
| `server-call-ok` | A successful response that leaves the user on the calling page. | `pending -> page` |
| `server-call-fail` | A failed or rejected response. | `pending -> error` or `pending -> page` with a declared error state |
| `recover` | A declared recovery action from an error Place. | `error -> page` |
| `open-external` | `window.open` or an external link that keeps the source page open. | `page -> page + external` |

Static asset loads such as CSS, images, and fonts are not Transitions. A static JSON fetch is a Transition only when it gates a visible state; the census records each decision.

### File format

The canonical workbench net is `src/net/workbench-net.yaml`. It is a LandingPage envelope with two sections:

- `topology` is a pure Layer 1 `PetriNetTopology`. The checker passes it unchanged to `parsePetriNetYaml`.
- `bindings` maps each Place ID to its kind, surface, route path, owning page file, and optional CLM view type URI. It maps each Transition ID to its kind, trigger, HTTP method and path for server calls, and owning page or island.

The route handle, the CLM type URI, the Place ID, and the MCard hash stay separate fields. `mcard:route:/index.html` is never a CLM type URI. Do not put route metadata in `TransitionDef.binding`; the VM may treat a binding as executable work, and that behavior is not part of this contract.

`src/net/` is created before Astro exists because GQC-02B makes it the Astro source tree. Moving the file later would break the lane inputs of every later PR.

## Initial census inputs

The planning census found these candidate Places and Transitions. GQC-02A verifies each one and records it in `evidence/GQC-02A-place-transition-census.md`. The Product Manager classifies support before a candidate enters the P0 net.

| Source | Candidate | Observed evidence |
| --- | --- | --- |
| Root HTML pages | 7 candidate Places | `index.html`, `responsive-lab.html`, `app.html`, `fiber-inspector.html`, `fiber-conformance.html`, `sprint-registry.html`, `pkc-docs-index.html` |
| `public/` HTML pages | 17 candidates, support undecided | `pkc-viewer.html`, `welcome.html`, `hero.html`, `user-list.html`, and others |
| Redirects | `index.html` to `responsive-lab.html` | `location.replace` at `index.html:13`, `location.href` at `index.html:482` |
| Links | `index.html` to `app.html` and `responsive-lab.html`; `responsive-lab.html` to `/` and `app.html`; `pkc-docs-index.html` to 5 `pkc-viewer.html?doc=` documents | `href` attributes in each file |
| Script navigation | `app.html` to `/` | `location.href` at `app.html:76` |
| `window.open` | `app.html` to 3 games under `/public/examples/games/` | `app.html:284`, `app.html:316`, `app.html:348` |
| UI-reachable server calls | `/app-config.json`, `/api/env`, `/api/config`, `POST /api/test-runs`, `GET /api/test-runs/conformance/latest`, `/api/clm/registry`, `POST /api/auth/token`, `POST /api/auth/refresh`, plus dynamic `${baseUrl}${path}` callers | `fetch` calls in `*.html`, `js/`, and `js/harness/` |
| Server endpoints | About 30 Express routes under `/api/mcard`, `/api/test-runs`, `/api/clm`, `/api/auth`, plus `/health`, `/api/rooms`, `/api/env`, `/api/config`, `/app-config.json` | `ws-server.js`, `server/*.mjs`, `routes/*.js` |
| WebSocket | Room and signaling connections | `ws-server.js`, `index.html`, `js/harness/*-probe-agent.js` use `postMessage` or WebSocket |
| PenPot design graph | 3 frames and 4 interactions | `js/nav.js`, generated from `design/landing-navigation.penpot` |

`/health` and other endpoints with no UI caller are recorded as `not-ui-reachable`. They are not Transitions, and the checker does not report them as dead.

## Work sequence

1. Rerun the Layer 1 probe after `npm ci`. Commit the exact command, package version from the lockfile, and output.
2. Inventory every root and `public/` page, internal hyperlink, script navigation, redirect, `window.open`, UI-reachable `fetch`, and WebSocket connect. Resolve dynamic URL builders to their concrete endpoints or record them as unresolved.
3. Compare the observed links with the PenPot-generated `js/nav.js` graph. Record each link that exists in one source only as drift. Do not copy `NAVIGATION_ROUTES` into the net by hand.
4. Draft `src/net/workbench-net.yaml` with the Places and Transitions the Product Manager approves. Keep undecided pages out of the topology and list them in the census.
5. Write `scripts/check-net.mjs`. It loads an envelope, passes `topology` to `parsePetriNetYaml`, and then checks what the kernel does not check.
6. Make the checker validate the GQC-02 fixture net `tests/fixtures/spa-test-target.graph.json` with the same code path.
7. Write the Transition trace contract. A trace names its entry Place and then lists ordered `{transitionId, fromPlaceId, toPlaceId, at}` events. Replay starts with one session token in the entry Place, which must be the net's entry or a Place bound as a deep-link entry. The checker replays the events through `ColoredPetriVM` and fails on the first disabled Transition.
8. Add a Playwright fixture that records a trace from the browser actions the existing GQC-02 journeys perform on the legacy pages. It derives events from `page.on('framenavigated')`, `page.on('request')`, and `page.on('response')`. It adds no production instrumentation.
9. Report Transition coverage: the fraction of declared Transitions that at least one passing Playwright journey fired and asserted. Keep the number advisory until TEA and the Product Manager approve a floor.
10. Add `check:net` to `package.json` and run it in the pull-request quality workflow.

## Checker rules

`scripts/check-net.mjs` fails with the file, ID, and rule name when any rule breaks:

- The kernel parser rejects the topology.
- Two Places or two Transitions share an ID within one net.
- A binding names an ID that the topology does not declare, or a topology ID has no binding.
- A Place has no declared kind, or a Transition has no declared kind.
- A `server-call-request` has no matching `ok` or `fail` Transition from its pending Place.
- A same-page server call is modeled as a self-loop instead of a request and result pair.
- The session weight vector, 1 on every `page`, `view`, `pending`, and `error` Place and 0 on every `external` Place, does not satisfy `yᵀD = 0` against `IncidenceMatrix.fromTopology(topology).d`. `findPInvariants()` returns a basis, so check the vector itself rather than searching the basis for it.
- A `page` Place is unreachable from the net entry and from every declared deep-link entry.
- A Transition is never enabled in any reachable marking.
- The net entry marking does not hold exactly one session token.

Reachability uses the 1-safe session marking, so a breadth-first search over markings terminates. The search projects away `external` Places, because they only accumulate tokens from `open-external` forks and never enable a Transition. Do not claim liveness or deadlock-freedom for nets outside that bound.

## Files in the implementation PR

- `src/net/workbench-net.yaml`
- `scripts/check-net.mjs`
- `tests/unit/check-net.test.mjs`
- `tests/unit/net-trace-replay.test.mjs`
- `tests/fixtures/net-trace.js`, the Playwright trace recorder
- `tests/fixtures/spa-test-target.graph.json`, converted to the envelope format only if GQC-02 did not already use it
- `tests/gui-coverage.json`, adding workbench Place and Transition IDs to existing workbench rows only
- `package.json`, adding `check:net`
- `.github/workflows/playwright-quality.yml`, net check and Transition coverage summary only
- `docs/sprints/_active/evidence/GQC-02A-layer1-probe.md`
- `docs/sprints/_active/evidence/GQC-02A-place-transition-census.md`
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator

Do not edit any HTML page, `ws-server.js`, `server/`, `routes/`, `js/nav.js`, or `design/landing-navigation.penpot` in this PR.

## BMAD responsibilities

### Analyst

- Produce the Place and Transition census from source and live behavior. Label each row as observed or inferred.
- Record drift between PenPot `js/nav.js`, HTML links, and script navigation.

### Product Manager

- Approve which pages enter the P0 workbench net. Keep the rest listed as undecided.
- Approve which `view` Places represent distinct user-visible modes.

### Architect

- Own the envelope format, Place and Transition kinds, and the checker rules.
- Decide whether the site net or the PenPot graph is the source of workbench links. See the open decisions.
- Keep the topology a pure Layer 1 `PetriNetTopology` so a future kernel upgrade validates it unchanged.

### TEA

- Write checker tests before the checker. Include each failure rule.
- Prove that trace replay rejects an out-of-order action and accepts each approved journey.
- Keep Transition coverage advisory until a floor is approved.

### Dev

- Import only `clm-kernel/layer1` and the package root from Node scripts and tests.
- Add no browser code in this sprint.

### Scrum Master

- Hold GQC-02B until the net passes `check:net` and the Product Manager approves the P0 Places.

## Stories and acceptance criteria

### GQC-02A.1 Census every Place and Transition

- [ ] The census lists every root and `public/` page with a kind, surface, owner, and support status.
- [ ] The census lists every internal link, redirect, script navigation, `window.open`, UI-reachable `fetch`, and WebSocket connect with its source file and line.
- [ ] Dynamic URL builders resolve to concrete endpoints or appear as unresolved with an owner.
- [ ] Every Express endpoint is bound to a server-call Transition or marked `not-ui-reachable`.
- [ ] PenPot drift lists each link found in only one of `js/nav.js`, HTML, or script navigation.

### GQC-02A.2 Author the workbench net

- [ ] `src/net/workbench-net.yaml` passes `parsePetriNetYaml` from the pinned package.
- [ ] Every approved workbench page has exactly one `page` Place.
- [ ] Every server call is a request Transition to a pending Place and at least one result Transition out of it.
- [ ] `window.open` is an `open-external` fork to a weight-0 `external` Place.
- [ ] Place IDs, route paths, CLM type URIs, and MCard hashes are separate fields.
- [ ] The net contains no workbench device, capture, or replay control as a target-app Transition. Those stay workbench actions or an island-local subnet.

### GQC-02A.3 Check the net

- [ ] `npm run check:net` fails for each rule in the checker rules list, proven by one failing fixture per rule.
- [ ] The same command validates the GQC-02 SPA fixture net.
- [ ] The session-conservation P-invariant holds for both nets.
- [ ] No unreachable `page` Place and no never-enabled Transition remains unless it has a recorded exception, owner, and expiry.

### GQC-02A.4 Trace and replay journeys

- [ ] The Playwright trace fixture records the existing GQC-02 journeys on the legacy pages without production code changes.
- [ ] Replay through `ColoredPetriVM` accepts every approved journey trace.
- [ ] Replay rejects a trace with an undeclared or out-of-order Transition and names it.
- [ ] The CI summary reports Transition coverage as declared, fired, and asserted counts.

## Test design

| ID | Level | Scenario | Expected result |
| --- | --- | --- | --- |
| GQC-02A-UNIT-01 | Unit | Parse the workbench net with the pinned kernel | The topology parses and every binding resolves. |
| GQC-02A-UNIT-02 | Unit | Add a duplicate Place ID | The checker fails with the duplicate ID. |
| GQC-02A-UNIT-03 | Unit | Model a same-page call as a self-loop | The checker fails with the self-loop rule. |
| GQC-02A-UNIT-04 | Unit | Remove the result Transition of a server call | The checker fails with the unmatched pending Place. |
| GQC-02A-UNIT-05 | Unit | Add an unreachable page Place | The checker fails with the reachability rule. |
| GQC-02A-UNIT-06 | Unit | Replay an approved journey trace | Every Transition fires and the final Place matches. |
| GQC-02A-UNIT-07 | Unit | Replay a trace that skips a page | The VM rejects the first disabled Transition. |
| GQC-02A-E2E-01 | E2E | Run the GQC-02 landing and Lab journeys with the trace fixture | The recorded trace replays cleanly. |
| GQC-02A-E2E-02 | E2E | Follow an undeclared link in a test-only page | The trace check reports the undeclared Transition. |

## Non-goals

- Do not migrate any page to Astro or change any route. GQC-02B owns that.
- Do not add a second Petri executor, a custom incidence solver, or a reachability library. Use the kernel and a bounded search.
- Do not import `clm-kernel` into browser code.
- Do not add production instrumentation. The trace comes from Playwright events.
- Do not copy `js/nav.js` into the net by hand.
- Do not model static asset loads as Transitions.
- Do not claim liveness, boundedness, or deadlock-freedom beyond the 1-safe session bound the checker searches.
- Do not change `responsive_test_run:v1`.

## Open decisions

| Decision | Owner | Target sprint | State |
| --- | --- | --- | --- |
| Which pages enter the P0 workbench net, and which `public/` pages stay undecided? | Product Manager | GQC-02A | Open |
| Is `src/net/workbench-net.yaml` the source of workbench links, with PenPot checked for drift, or does PenPot stay the source and generate the link Transitions? | Architect and Product Manager | GQC-02A | Open. Recommendation: the net is the runtime source and PenPot is a drift-checked design input. |
| Which `index.html` modes are distinct `view` Places? | Product Manager and UX Designer | GQC-02A | Open |
| Are WebSocket messages modeled beyond connect and close in P0? | Architect | GQC-02A | Open. Default: connect and close only. |
| What Transition coverage floor, if any, blocks a PR? | TEA and Product Manager | GQC-06 | Open. Advisory until approved. |

## Definition of done

- [ ] The census and probe evidence are committed with exact commands and versions.
- [ ] `npm run check:net` passes on the workbench net and the SPA fixture net, and each rule has a failing fixture.
- [ ] Approved GQC-02 journeys replay cleanly through `ColoredPetriVM`.
- [ ] The CI summary reports Transition coverage.
- [ ] The Architect approves the envelope format and kinds. The Product Manager approves the P0 Places.
- [ ] No page, route, server response, or production script changed.
- [ ] The operator approves the handoff to GQC-02B.
