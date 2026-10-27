# Active sprint index

## Staged program GQC

**Status: STAGED.** Program GQC is ready for operator review. This staging does not authorize source-code changes. Start implementation only after the operator approves `gqc-plan.md`.

Program GQC makes the Responsive UI Lab a guided, SPA-first test workbench. Its P0 journey is to select and load a single-page application, choose a device and viewport, test functional links, record or replay a journey, and inspect the MCard result. Playwright trust, target policy, module ownership, measured performance, and documentation checks support that journey.

GQC also moves LandingPage onto Astro. Pages ship static HTML by default, and interactive regions hydrate as declared Preact islands that mount the existing vanilla modules. Astro runs in Node middleware mode inside the existing Express server, which keeps WebSockets, the current APIs, and the CORS and CSP middleware. Every page is a Place and every hyperlink, redirect, `window.open`, page switch, and UI-reachable server call is a Transition in a workbench Place-Transition net. That net is a `clm-kernel/layer1` `PetriNetTopology`, checked and replayed with the kernel's own parser, incidence matrix, and VM.

GQC reuses the graduated SMO and ERB programs. It does not rebuild their MCard browser, device registry, capture, replay, conformance, or certification contracts. PenPot-assisted MPA assessment is an optional extension, not a prerequisite or part of the SPA coverage denominator.

P0 means required for that guided SPA journey. Authentication, collaboration, in-browser AI, offline behavior, diagnostics, and MPA management remain out of P0 until the Product Manager approves them.

| Order | Sprint | Goal | Depends on | Specification |
| ---: | --- | --- | --- | --- |
| 1 | GQC-00 | Classify the workbench, target apps, existing routes, Astro readiness, and Page-as-Place and Functional-Link-as-Transition evidence. | None | [Project census and behavior baseline](./SPRINT-GQC-00-project-census-and-behavior-baseline.md) |
| 2 | GQC-01 | Restore trustworthy Playwright discovery and CI evidence, and characterize root pages as the migration oracle. | GQC-00 | [Playwright trust foundation](./SPRINT-GQC-01-playwright-trust-foundation.md) |
| 3 | GQC-02 | Define the P0 SPA test journey, coverage registry, reusable fixtures, and the net envelope shape. | GQC-01 | [GUI journeys and reusable test seams](./SPRINT-GQC-02-gui-journeys-and-test-seams.md) |
| 4 | GQC-02A | Census every Place and Transition and author the checked Layer 1 workbench site net. | GQC-02 | [Layer 1 site net and Transition census](./SPRINT-GQC-02A-layer1-site-net-and-transition-census.md) |
| 5 | GQC-02B | Run LandingPage on Astro inside Express and hydrate the Responsive Lab as Preact islands. | GQC-02A | [Astro host and island shell](./SPRINT-GQC-02B-astro-host-and-island-shell.md) |
| 6 | GQC-03 | Separate target-app identity from its Place graph and enforce origin-safe capture on the Astro host. | GQC-02B | [Target policy and capture lifecycle](./SPRINT-GQC-03-target-policy-and-capture-lifecycle.md) |
| 7 | GQC-04 | Build the guided SPA test window as an island and define island, module, and process ownership. | GQC-03 | [Guided SPA test window and module ownership](./SPRINT-GQC-04-gui-module-ownership-and-lifecycle.md) |
| 8 | GQC-05 | Persist workbench and target nets as MCards and settle package, renderer, and Express plus Astro server ownership. | GQC-04 | [MCard process, renderer, package, and server ownership](./SPRINT-GQC-05-package-renderer-and-server-ownership.md) |
| 9 | GQC-06 | Measure the guided journey, per-Place JavaScript, island hydration, and Transition latency against the pre-Astro baseline. | GQC-05 | [Performance baselines and optimization](./SPRINT-GQC-06-performance-baselines-and-optimization.md) |
| 10 | GQC-07 | Align maintained docs with the SPA-first contract, Astro host, workbench net, and optional MPA extension. | GQC-06 | [Documentation alignment and gates](./SPRINT-GQC-07-documentation-alignment-and-gates.md) |

## MCard_TDD design contract

The Responsive UI Lab is the workbench. The selected application inside its iframe is the target. Do not count the workbench controls as target-app navigation.

| Term | GQC contract |
| --- | --- |
| SPA target | A target whose user-visible views can change inside one browser document. A target Page or View is a Place even when the URL does not change. |
| Page or View as Place | A declared user-visible target view, modeled with the CLM Layer 4 `ViewPlaceMCard` alias of `PlaceMCard`. Keep its stable Place ID and route handle separate from its CLM type URI. |
| Functional Link as Transition | A declared link or navigation command between Places, modeled with the `NavigationTransitionPCard` alias of `TransitionMCard`. The Transition has a source, an action name, and a destination or explicit error Place. |
| Session marking | The active view and session token. `Layer4TrellisNavigationNet` returns a marking and `FiringReceiptMCard`. Playwright must still perform and verify the real browser action. |
| MCard storage | Store immutable card content in the existing `card` table. Resolve semantic handles through `handle_registry` and preserve pointer changes in `handle_history`. Do not add domain-specific SQL tables. |
| Test run | `responsive_test_run:v1` has a closed top-level schema and stores target, device, fidelity, events, and results. Do not add an unversioned graph field. Use an approved linked MCard or a versioned schema if a run must reference a navigation net. |
| MPA extension | PenPot may seed a read-only MPA Page-as-Place and Functional-Link-as-Transition assessment from a separate, Product Manager-approved target design. The current LandingPage PenPot file is not that target. Editing PenPot documents or managing live MPA routes needs a separate decision. A design graph is not proof of live routes or interactions and does not count toward P0 SPA coverage. |
| Workbench Place | One LandingPage page or Astro route, or an approved view of one document. Kinds: `page`, `view`, `pending`, `error`, and `external`. `external` Places carry weight 0 in the session invariant. |
| Workbench Transition | One user- or page-triggered move between Places. Kinds: `link`, `redirect`, `client-route`, `server-call-request`, `server-call-ok`, `server-call-fail`, `recover`, and `open-external`. A server call is a request and result pair, never a self-loop. |
| Workbench site net | `src/net/workbench-net.yaml`: a LandingPage envelope with a `topology` section that `parsePetriNetYaml` accepts unchanged and a `bindings` section for kinds, routes, owners, and HTTP methods. Checked by `scripts/check-net.mjs`. |
| Target net | A selected application's Pages and Functional Links in the same envelope and checker. It shares no IDs with the workbench net. |
| Layer 1 substrate, Layer 4 facade | `PetriNetTopology`, `IncidenceMatrix`, and `ColoredPetriVM` from `clm-kernel/layer1` are canonical. The Layer 4 `ViewPlaceMCard` and `NavigationTransitionPCard` are type aliases of the Layer 1 cards, so `Layer4TrellisNavigationNet` stays an optional facade for target sessions. |
| Island | A Preact component under `src/islands/` that mounts one existing vanilla module, with a declared owner, `client:*` directive, and cleanup path. Islands never import `clm-kernel`. |
| Net trace | The ordered Transition IDs that a Playwright run fires, derived from navigation, request, and response events. Replayed through `ColoredPetriVM`; stored as `FiringRecord` content in GQC-05. |
| Net parity | A build check that every Astro route maps to one `page` Place and every internal link in built HTML maps to one declared Transition. |

LandingPage pins `clm-kernel@0.0.12`; the sibling CLM workspace source is 0.0.13. The installed 0.0.12 package exports `Layer4TrellisNavigationNet`, but current LandingPage source does not import it. Its `registerViewPlace(placeId, routeUri)` implementation stores `routeUri` as `PlaceMCard.typeExpr`. A read-only probe moved a session from one Place to another and routed an invalid action to `p_error_modal` with a CLM view type URI. A route handle such as `mcard:route:/index.html` is not itself a CLM type URI. GQC uses the installed package artifact as its runtime contract and verifies the mapping and persistence path before adoption.

The current `design/landing-navigation.penpot` and generated `js/nav.js` describe LandingPage's own navigation. They do not describe an arbitrary target SPA or MPA. A separate target PenPot file needs explicit Product Manager approval before the optional MPA adapter can use it. The browser compatibility layer, the server Triad hash, and the PenPot graph hash are separate contracts. Documentation must not imply that all three use one hash implementation.

Read the [GQC execution plan](./gqc-plan.md) for the dependency stack, BMAD responsibilities, verification lanes, performance probes, and operator review gates. The [decision log](./DECISIONS.tsv) records evidence and unresolved calls.

## Planning baseline

These are planning-time observations from the local system date 2026-10-27. `DECISIONS.tsv` uses UTC timestamps, which can show 2026-10-26 for the same session. `--list` enumerates tests without running browser assertions.

| Command or source | Observed result | Sprint |
| --- | --- | --- |
| `npx playwright test --list --project=smoke` | 16 tests in 3 files | GQC-00 |
| `npx playwright test --list --project=features` | 557 tests in 17 files | GQC-00 |
| `npx playwright test --list --project=components` | 0 tests in 0 files, exit status 1 | GQC-00, GQC-01 |
| `npx playwright test --list` | 1,158 tests in 20 files across overlapping projects | GQC-00, GQC-01 |
| `playwright.config.js`, `tests/components/`, and `tests/smoke/` | Matcher accepts `.spec.js`; 14 component specs and `tests/smoke/clm-dashboard.spec.cjs` use `.spec.cjs` | GQC-01 |
| `index.html` and `tests/smoke/landing-page.spec.js` | Top-level traffic redirects to `responsive-lab.html`; the smoke spec still expects the old `MCard Manager` page | GQC-00, GQC-01 |
| `responsive-lab.html` and `js/harness/lab-toolbar.js` | The workbench defaults to `app.html`; no target type distinguishes SPA, MPA, MCard `webapp`, or probe fixture | GQC-00, GQC-03 |
| `app-config.json` and `ws-server.js` | The static `app-config.json` is served before the dynamic route, blocked target origins enter CORS, and the root CSP allows wildcard sources | GQC-03 |
| `js/modules/`, `packages/`, and server entry points | Several package and browser files are identical; root and package servers differ | GQC-04, GQC-05 |
| `design/landing-navigation.penpot`, `scripts/penpot-nav.mjs`, and `js/nav.js` | The current PenPot graph has 3 frames and 4 navigation interactions for LandingPage routes | GQC-00, GQC-05 |
| `clm-kernel@0.0.12` | LandingPage pins 0.0.12 while the sibling CLM workspace is 0.0.13. The installed package exports `Layer4TrellisNavigationNet`; no current LandingPage module imports it | GQC-00, GQC-04, GQC-05 |
| `js/harness/test-run-schema.js` and `server/test-run-api.mjs` | `responsive_test_run:v1` is closed and does not carry a navigation-net reference | GQC-00, GQC-05 |
| Performance docs and conformance check | Frame guidance differs at 16.6 ms, 20 ms, and 25 ms | GQC-06 |
| README, functionality specs, and setup guides | Current ports, kernel versions, commands, and local links disagree | GQC-07 |
| `package.json` and the repository root | No `astro` dependency, no `astro.config.*`, and no `src/` tree. `dev` runs `node ws-server.js` | GQC-00, GQC-02B |
| Root HTML pages and `public/` | 7 root pages and 17 HTML pages under `public/`. Express serves `public/` at `/public` and `/`, and the repository root at `/` | GQC-00, GQC-02A, GQC-02B |
| Page links and script navigation | `index.html` links to `app.html` and the Lab; two `location` calls in `index.html`, one in `app.html`; three `window.open` calls in `app.html` | GQC-02A |
| Express routes | About 30 routes under `/api/mcard`, `/api/test-runs`, `/api/clm`, and `/api/auth`, plus `/health`, `/api/rooms`, `/api/env`, `/api/config`, and `/app-config.json` | GQC-02A, GQC-02B, GQC-05 |
| Layer 1 planning probe | `parsePetriNetYaml` accepted a sample site net, dropped unknown fields but kept `binding`, accepted duplicate Place IDs, and rejected dangling arcs. The all-ones P-invariant held. A disabled firing threw. A self-loop produced a zero incidence column | GQC-02A |
| `clm-kernel` package root | `dist/index.js` imports Node `crypto` at top level, so the root entry cannot load in a browser island | GQC-02A, GQC-02B, GQC-04 |

## GQC invariants

| ID | Invariant | Required evidence |
| --- | --- | --- |
| `INV-GQC-01` | No Playwright project may silently discover zero intended specs. GQC-00 reports the component project's known exception by name. GQC-01 removes it. | Project discovery check and CI result. |
| `INV-GQC-02` | E2E tests assert behavior a user can observe. | Journey-to-test traceability. |
| `INV-GQC-03` | A shared module has one owner and an interface that hides repeated decisions. | Consumer map and contract tests. |
| `INV-GQC-04` | Cross-origin capture requires an explicit approved origin policy. Blocked targets do not widen CORS, and CSP changes require an owner. | Allow, reject, forged-message, CORS, CSP, and cleanup tests. |
| `INV-GQC-05` | Module-owned listeners, timers, and sockets have a tested cleanup path. | Repeated start, stop, and target-switch tests. |
| `INV-GQC-06` | A performance claim uses a paired trunk measurement and includes sample spread. | Raw samples, environment, profile, and exact SHAs. |
| `INV-GQC-07` | Maintained docs derive current facts from named sources. | Link, command, port, and version checks. |
| `INV-GQC-08` | Coverage counts only approved product surfaces. | Product owner-approved coverage registry. |
| `INV-GQC-09` | The workbench and target application are separate test surfaces. | Separate registry rows for workbench behavior and target-app journeys. |
| `INV-GQC-10` | Each covered target Page or View has a Place identity, and each covered Functional Link has a Transition identity. The same rule applies to workbench pages and their links, redirects, and server calls. | A tested mapping to CLM Layer 1 types, presented through Layer 4 where used, and a Playwright assertion for the real browser action. |
| `INV-GQC-11` | A target run references a navigation net only through an approved MCard relationship or versioned test-run schema. | Backward-compatible schema and persistence tests. |
| `INV-GQC-12` | PenPot MPA mapping stays optional and outside the P0 SPA coverage denominator until approved. | Product decision and explicit coverage status. |
| `INV-GQC-13` | Every Astro route maps to exactly one `page` Place, and every approved `page` Place has one route. | Net-parity build check. |
| `INV-GQC-14` | Every internal link, redirect, `window.open`, page switch, and UI-reachable server call is a declared Transition. | `check:net`, net parity, and the server-call coverage check. |
| `INV-GQC-15` | The workbench net is a Layer 1 `PetriNetTopology`. It passes the duplicate-ID check and the session P-invariant against `IncidenceMatrix`. LandingPage adds no second Petri-net executor. | `check-net.mjs` output and trace replay through `ColoredPetriVM`. |
| `INV-GQC-16` | A page ships no client JavaScript unless it declares an island. Each island has an owner, a `client:*` directive with a reason, and a cleanup path. | Island map, per-Place byte report, and repeated mount and unmount tests. |
| `INV-GQC-17` | Islands never import `clm-kernel`. Net checks, replay, and persistence run in Node. | Import check over `src/islands/` and the client bundle. |
| `INV-GQC-18` | Public URLs and API and WebSocket contracts stay unchanged through the Astro migration. A legacy page is deleted only after its Astro Place passes the same characterization specs. | GQC-01 characterization specs on both hosts and API contract tests. |

## BMAD and Poteto execution roles

| Role | Owns |
| --- | --- |
| Analyst | Surface inventory, current behavior, and traceable requirements. |
| Product Manager | Supported journeys, deployment policy, browser matrix, and user-facing performance budgets. |
| Architect | Module ownership, configuration contracts, test seams, and migration order. |
| TEA | Risk-based Playwright strategy, test levels, artifacts, and quality gate evidence. |
| Dev | Test-first changes inside the approved file boundary. |
| UX Designer | Review of changed loading, target, error, keyboard, and accessibility states. |
| Tech Writer | Current setup, architecture, testing, and performance documentation. |
| Scrum Master | Dependency order, evidence-based status, append-only decision log, and active-index status. |

Poteto principles used by the plan include subtracting before adding, sequencing verifiable units, explaining each performance number, and encoding repeated rules as checks. Do not claim that the program has started.

## Graduated programs

> **Program SMO graduated on 2026-10-21.** The Submodule Modularity, Universal MCard Content Browser, and Organizational Alignment Program (`SMO-00` through `SMO-05`) moved to [the architecture sprint index](../01-architecture/INDEX.md). Its recorded evidence includes 97 unit tests, 24 single-page MCard tests, package-version consensus, a four-modality sample corpus, zero cross-submodule source imports, and documentation link checks.

> **Program ERB graduated on 2026-10-21.** The Device-Sensitive Testing Infrastructure Program (`ERB-00` through `ERB-06`) moved to [the testing sprint index](../08-testing/INDEX.md). Its recorded evidence includes unit, device lifecycle, responsive capture, replay, device sweep, and conformance tests.

| Program | Code | Archive | Graduation date | Status |
| --- | --- | --- | --- | --- |
| Submodule Modularity and Universal MCard Browser | `SMO` | [01-architecture](../01-architecture/INDEX.md) | 2026-10-21 | Graduated |
| Device-Sensitive Testing Infrastructure | `ERB` | [08-testing](../08-testing/INDEX.md) | 2026-10-21 | Graduated |

## Related project pointers

- **Parent workspace:** [MCard_TDD active index](../../../../docs/sprints/_active/README.md) and its [graduated program catalog](../../../../docs/sprints/programs/).
- **MCard Studio:** [active index](../../../../mcard-studio/docs/sprints/_active/README.md) and its [storage sprint plans](../../../../mcard-studio/docs/sprints/02-Storage-VFS/README.md). GQC adopts its separated test commands and executable architecture checks. As of 2026-10-27, GQC also adopts Astro, with Preact islands and a Node middleware host. It does not adopt Vitest.
- **CLM kernel:** [active index](../../../../clm/docs/sprints/_active/README.md) and [test infrastructure program](../../../../clm/docs/sprints/07_test-infrastructure/README.md). LandingPage tests the published dependency contract rather than duplicating kernel implementation.
