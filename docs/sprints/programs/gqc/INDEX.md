# Program GQC: Guided SPA Workbench, Astro Islands, Petri Net, and Docs Gates (Graduated)

> **Program GQC Graduated — 2026-11-18.** All ten execution units (`SPRINT-GQC-00` through `SPRINT-GQC-07`) are completed, verified on `clm-kernel@0.0.23`, and sealed into `docs/sprints/programs/gqc/` with explicit operator graduation approval.

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, developers, and operators reviewing Program GQC |
| BMAD Owner | Scrum Master |
| Source of Truth | [`../../_active/DECISIONS.tsv`](../../_active/DECISIONS.tsv), [`./gqc-plan.md`](./gqc-plan.md), and [`./evidence/GQC-07-docs-and-graduation.md`](./evidence/GQC-07-docs-and-graduation.md) |
| Status | **Graduated (`2026-11-18`)** |
| Drift Gate | `npm run docs:check` |

## Program summary

Program GQC made the Responsive UI Lab a guided, SPA-first test workbench. Its P0 journey selects and loads a single-page application, chooses a device and viewport, tests functional links, records or replays a journey, and inspects the MCard result. Playwright trust, target policy, module ownership, measured performance, and documentation checks support that journey.

GQC moved LandingPage onto Astro (`astro@7.4.2`, `@astrojs/node@11.1.9` middleware inside `ws-server.js`) with 7 Preact islands (`preact@11.1.0`) that mount the existing vanilla modules while keeping WebSockets, existing Express APIs, and CORS/CSP middleware intact. Every page is a Place and every hyperlink, redirect, `window.open`, page switch, and UI-reachable server call is a Transition in `src/net/workbench-net.yaml` (`32` Places, `66` Transitions, originally `31`/`65` before [Program BPV](../bpv/INDEX.md) added `p_page_docs_index`), checked and replayed on `clm-kernel@0.0.23` (`clm-kernel/petri` with `MCardCollection` / `MemoryBackend` from `clm-kernel/store`, superseding historical `clm-kernel/layer1` planning naming).

GQC reused graduated [Program SMO](../../01-architecture/INDEX.md) and [Program ERB](../../08-testing/INDEX.md) without rebuilding their MCard browser, device registry, capture, replay, conformance, or certification contracts. PenPot-assisted MPA assessment remains optional and outside the P0 SPA coverage denominator.

## Sprint specifications (`GQC-00` .. `GQC-07`)

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
| Layer 1 substrate, Layer 4 facade | `PetriNetTopology`, `IncidenceMatrix`, and `ColoredPetriVM` from `clm-kernel/petri` with `MCardCollection` / `MemoryBackend` from `clm-kernel/store` (historically `clm-kernel/layer1` prior to `clm-kernel@0.0.23`) are canonical. The Layer 4 `ViewPlaceMCard` and `NavigationTransitionPCard` are type aliases of the Layer 1 cards, so `Layer4TrellisNavigationNet` stays an optional facade for target sessions. |
| Island | A Preact component under `src/islands/` that mounts one existing vanilla module, with a declared owner, `client:*` directive, and cleanup path. Islands never import `clm-kernel`. |
| Net trace | The ordered Transition IDs that a Playwright run fires, derived from navigation, request, and response events. Replayed through `ColoredPetriVM`; stored as `FiringRecord` content in GQC-05. |
| Net parity | A build check that every Astro route maps to one `page` Place and every internal link in built HTML maps to one declared Transition. |

Read the [GQC execution plan](./gqc-plan.md), the [GQC-07 graduation report](./evidence/GQC-07-docs-and-graduation.md), the [program execution audit](./evidence/PROGRAM-EXECUTION-AUDIT.md), and the [decision log](../../_active/DECISIONS.tsv) for the complete record.

## Planning baseline

These were the planning-time observations from 2026-10-27 (`DECISIONS.tsv` uses UTC timestamps):

| Command or source | Observed result | Sprint |
| --- | --- | --- |
| `npx playwright test --list --project=smoke` | 16 tests in 3 files | GQC-00 |
| `npx playwright test --list --project=features` | 557 tests in 17 files | GQC-00 |
| `npx playwright test --list --project=components` | 0 tests in 0 files, exit status 1 | GQC-00, GQC-01 |
| `npx playwright test --list` | 1,158 tests in 20 files across overlapping projects | GQC-00, GQC-01 |
| Historically pinned `clm-kernel@0.0.12` (superseded by `clm-kernel@0.0.23`) | Historical planning baseline pinned `0.0.12` while the sibling CLM workspace was `0.0.13`. The repo now pins `clm-kernel@0.0.23`. | GQC-00, GQC-04, GQC-05 |

## Post-completion verification (2026-11-18)

Re-run of all durable gates in this checkout on `clm-kernel@0.0.23` at graduation on 2026-11-18 (with [Program BPV](../bpv/INDEX.md) graduated alongside GQC):

| Gate | Result |
| --- | --- |
| `npm run check:net` | PASS. Workbench net `32` Places, `66` Transitions, `31` reachable markings, session P-invariant holds, coverage `19/66` advisory (`explored=2`, `neverFired=45` with Bombadil traces). SPA fixture net `3` Places, `4` Transitions, coverage `4/4`. |
| `npm run docs:check` | PASS. `252` Markdown files, `14` allowlisted historical links, `106` declared net IDs. |
| `npm run check:playwright-discovery` | PASS. Smoke `30` tests in `11` files, components `18` tests in `14` files, features `618` tests in `28` files, `53` unique category files, `0` cross-browser repeats (`666` total discovered). |
| `npm run check:bombadil-nets` & `npm run check:explorable-gui` | PASS. Generated workbench projection and explorable GUI rules hold with `0` violations. |
| `npm run test:unit` | PASS. `274` tests, `0` failures. |
| `npm run test:smoke`, `npm run test:components`, `npm run test:features` | PASS. Smoke `30` passed, components `18` passed, features `602` passed, `16` skipped, `0` failed. |
| `npm run test:smoke:cross-browser` | PASS. `60` passed (`30` `smoke-firefox`, `30` `smoke-webkit`), `0` failed, `0` skipped in `37.4 s` (log: [`cross-browser-2026-11-18.txt`](./evidence/cross-browser-2026-11-18.txt)). |
| Operator graduation approval | Approved on `2026-11-18` (`DECISIONS.tsv` phase `GQC-graduation`); GQC artifacts archived in `docs/sprints/programs/gqc/`. |

## GQC invariants

| ID | Invariant | Required evidence |
| --- | --- | --- |
| `INV-GQC-01` | No Playwright project may silently discover zero intended specs. | Project discovery check and CI result. |
| `INV-GQC-02` | E2E tests assert behavior a user can observe. | Journey-to-test traceability. |
| `INV-GQC-03` | A shared module has one owner and an interface that hides repeated decisions. | Consumer map and contract tests. |
| `INV-GQC-04` | Cross-origin capture requires an explicit approved origin policy. | Allow, reject, forged-message, CORS, CSP, and cleanup tests. |
| `INV-GQC-05` | Module-owned listeners, timers, and sockets have a tested cleanup path. | Repeated start, stop, and target-switch tests. |
| `INV-GQC-06` | A performance claim uses a paired trunk measurement and includes sample spread. | Raw samples, environment, profile, and exact SHAs. |
| `INV-GQC-07` | Maintained docs derive current facts from named sources. | Link, command, port, and version checks. |
| `INV-GQC-08` | Coverage counts only approved product surfaces. | Product owner-approved coverage registry. |
| `INV-GQC-09` | The workbench and target application are separate test surfaces. | Separate registry rows for workbench behavior and target-app journeys. |
| `INV-GQC-10` | Each covered target Page or View has a Place identity, and each covered Functional Link has a Transition identity. | CLM Layer 1/Layer 4 mapping and Playwright assertion. |
| `INV-GQC-11` | A target run references a navigation net only through an approved MCard relationship or versioned test-run schema. | Backward-compatible schema and persistence tests. |
| `INV-GQC-12` | PenPot MPA mapping stays optional and outside the P0 SPA coverage denominator until approved. | Product decision and explicit coverage status. |
| `INV-GQC-13` | Every Astro route maps to one `page` Place, and every approved `page` Place has one route. | Net-parity build check. |
| `INV-GQC-14` | Every internal link, redirect, `window.open`, page switch, and UI-reachable server call is a declared Transition. | `check:net`, net parity, and server-call coverage check. |
| `INV-GQC-15` | The workbench net is a Layer 1 `PetriNetTopology` passing duplicate-ID and session P-invariant checks. | `check-net.mjs` output and trace replay through `ColoredPetriVM`. |
| `INV-GQC-16` | A page ships no client JavaScript unless it declares an island. | Island map, per-Place byte report, and repeated mount/unmount tests. |
| `INV-GQC-17` | Islands never import `clm-kernel`. | Import check over `src/islands/` and client bundles. |
| `INV-GQC-18` | Public URLs and API/WS contracts stay unchanged through the Astro migration. | Characterization specs and API contract tests. |

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
| Scrum Master | Dependency order, evidence-based status, append-only decision log, and sprint indexes. |

## Related archives

- **Program SMO**: [docs/sprints/01-architecture/INDEX.md](../../01-architecture/INDEX.md) (Graduated 2026-10-21)
- **Program ERB**: [docs/sprints/08-testing/INDEX.md](../../08-testing/INDEX.md) (Graduated 2026-10-21)
- **Program BPV**: [docs/sprints/programs/bpv/INDEX.md](../bpv/INDEX.md) (Graduated 2026-11-18)
