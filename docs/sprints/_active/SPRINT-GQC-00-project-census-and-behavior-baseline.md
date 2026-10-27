# Sprint GQC-00: Project census and behavior baseline

## Metadata

- Sprint ID: `SPRINT-GQC-00`
- Handle: `urn:pcard:sprint:SPRINT-GQC-00`
- Status: `ACTIVE`
- Depends on: None
- Unblocks: `SPRINT-GQC-01`
- Execution unit: `PR-GQC-00`
- Poteto playbook: `multi-phase-plan` and `autopilot-stack`
- BMAD roles: Analyst, Product Manager, Architect, TEA, UX Designer, Scrum Master

## Outcome

Create a verified map of the Responsive UI Lab, the applications it can test, the current Playwright signal, and the MCard and CLM navigation contracts. Record the user journey, target classifications, owners, and open decisions before implementation. This sprint changes no production or test behavior.

The program now runs LandingPage on Astro with Preact islands and models every workbench page as a Place and every hyperlink, redirect, page switch, and UI-reachable server call as a Transition on the CLM Layer 1 substrate. GQC-00 records the facts those later sprints need: the candidate workbench Places and Transitions, the Layer 1 API in the pinned kernel, and the Astro migration hazards. GQC-02A authors the net. GQC-02B migrates the host.

The primary product journey is to select a SPA target, load it in the Responsive UI Lab, choose a device and viewport, exercise a functional link, record or replay the journey, and inspect its MCard result. The Lab is the workbench. The application inside its iframe is the target.

The current repo already has two graduated programs that remain the foundation:

- SMO owns submodule independence, the single-page MCard browser, and its four-modality contract.
- ERB owns the Responsive Lab test harness, device matrix, capture and replay, conformance checks, and responsive certification.

GQC-00 must reuse those results. It must not recreate their modules or rewrite their historical evidence.

The single-page MCard viewer is not the same capability as testing an SPA. GQC must keep the viewer, the test workbench, and the target application as separate surfaces.

## Evidence from the current repo

The following observations were checked during planning on the local system date 2026-10-27. `DECISIONS.tsv` uses UTC timestamps, which can show 2026-10-26 for the same session.

| Area | Observed evidence | Planning consequence |
| --- | --- | --- |
| Smoke tests | `npx playwright test --list --project=smoke` lists 16 tests in 3 files. | Keep the current smoke behavior as a regression baseline. |
| Feature tests | `npx playwright test --list --project=features` lists 557 tests in 17 files. | Classify existing features before adding overlapping coverage. |
| Component tests | `npx playwright test --list --project=components` lists 0 tests in 0 files and exits with status 1. | Treat the component project as undiscovered, not green. |
| Unfiltered suite | `npx playwright test --list` lists 1,158 tests in 20 files across overlapping projects. | Map project overlap before interpreting total counts or CI duration. |
| Component test names | `tests/components/` contains 14 `*.spec.cjs` files. | Compare the file suffixes with project `testMatch`. |
| Smoke CJS test | `tests/smoke/clm-dashboard.spec.cjs` is also excluded by the current matcher. | GQC-01 names its owner and moves or removes it only with evidence. |
| Playwright matcher | `playwright.config.js` matches `**/*.spec.js`. | Fix discovery in GQC-01 and add a zero-test guard. |
| Project overlap | The catch-all `chromium` project and `presentation-lattice` project overlap category projects. | Count unique specs separately from project executions. |
| Cross-platform snapshots | `tests/features/fiber-conformance.spec.js-snapshots/` contains Darwin baselines while CI uses Ubuntu. | GQC-01 chooses an OS and browser snapshot policy before relying on these tests in CI. |
| Unit test command | `npm run test:unit` does not include `tests/observability/*.test.js`. | GQC-01 names included suites and any intentional exclusions. |
| Runtime ports | `ws-server.js` defaults to 3000. Playwright starts it on 3001. Some component test helpers hardcode 3000. | Define the server and test port contract before changing tests. |
| Configuration | `app-config.json` declares `labTargets`; static middleware serves the file before the dynamic `/app-config.json` route. The CORS origin list also includes targets marked blocked. | Verify both responses and consumers, and test that blocked targets do not widen CORS. |
| Capture policy | `createCaptureSource()` treats an empty origin list as unrestricted. The Responsive Lab composition does not pass `allowedOrigins`. The root server also uses wildcard CSP sources and `unsafe-inline` or `unsafe-eval`. | Add tests for the effective origin, CORS, and CSP policies in GQC-03. Record policy changes as product security decisions. |
| Capture lifecycle | `InteractionRecorder.setSource()` detaches the old source. `CaptureProbeAgentSource.destroy()` removes its listeners and timer. | Test repeated target changes before choosing lifecycle ownership. |
| Workbench target | The Responsive Lab defaults to `app.html`; `app-config.json` does not classify targets as SPA, MPA, MCard `webapp`, or fixture. | The Product Manager approves target types and the default SPA sample before target-list changes. |
| Landing smoke test | Top-level `index.html` redirects to `responsive-lab.html`, but `tests/smoke/landing-page.spec.js` expects the old `MCard Manager` view. | Record the mismatch as baseline drift. GQC-01 characterizes the intended smoke journey before changing assertions. |
| PenPot navigation | `design/landing-navigation.penpot` produces 3 LandingPage frames and 4 navigation interactions in `js/nav.js`. | Reuse this graph for LandingPage navigation only. Treat arbitrary target MPA mapping as optional. |
| CLM Layer 4 navigation | Installed `clm-kernel@0.0.12` exports `Layer4TrellisNavigationNet`, but no current LandingPage file imports it. A local probe succeeded with CLM view type URIs and sent an invalid action to `p_error_modal`. | Treat kernel use as a planned integration, not shipped behavior. Keep route handles separate from CLM type URIs. Verify target mapping, browser compatibility, and Triad persistence before adoption. |
| Test-run schema | `responsive_test_run:v1` has a closed set of top-level keys and no navigation-net reference. | Preserve v1. Use an approved linked MCard or a versioned schema for graph traceability. |
| Package copies | Browser and package files for core, P2P, Markdown entry, and room registry are byte-identical. Root and packaged server files differ. | Compare consumers and package goals before consolidating. |
| Rendering | `js/landing-page-mcard.js` uses a four-modality classifier. `RendererRegistry` registers MIME-specific renderers. | Preserve distinct contracts unless consumer evidence proves overlap. |
| Performance limits | Current docs and checks refer to 16.6 ms, 20 ms, and 25 ms frame limits. The conformance check is advisory by default. | Do not make a frame budget blocking until owners settle the definition. |
| Documentation | Living docs state kernel versions from 0.0.3 through 0.0.12 and ports 3000 and 3001. Some functionality links use local `file:///` paths. | Give each current fact one source and keep historical records unchanged. |
| Astro readiness | No `astro.config.*`, no `astro` dependency, and no `src/` tree exist. `npm run dev` runs `node ws-server.js`; `npm run build` runs only workspace builds. | GQC-02B adds the Astro host. GQC-00 records the current commands as the baseline. |
| Public URL space | Express serves `public/` at both `/public` and `/`, and serves the repository root at `/`. `app.html` loads `/public/js/app-bootstrap.js`. Astro copies its `publicDir` to the output root. | Inventory every `/public/...` and `/js/...` reference before GQC-02B chooses `publicDir`. |
| Workbench Place candidates | 7 root HTML pages and 17 `public/` HTML pages. | Each is a candidate `page` Place. The Product Manager approves which enter the P0 workbench net in GQC-02A. |
| Workbench Transition candidates | Links in `index.html`, `responsive-lab.html`, and `pkc-docs-index.html`; `location.replace` and `location.href` in `index.html` and `app.html`; 3 `window.open` calls in `app.html`; UI-reachable `fetch` calls to `/app-config.json`, `/api/env`, `/api/config`, `/api/test-runs`, `/api/clm/registry`, and `/api/auth/*`. | Each is a candidate Transition. GQC-02A resolves dynamic callers and records the census. |
| CLM Layer 1 | The installed package exports `clm-kernel/layer1` with `PetriNetTopology`, `parsePetriNetYaml`, `IncidenceMatrix`, and `ColoredPetriVM`. A planning probe fired page and server-call Transitions, held a session P-invariant, and rejected a disabled Transition. The parser drops unknown fields and accepts duplicate Place IDs. The package root imports Node `crypto`. | Layer 1 is the net substrate. Keep route metadata outside the topology. Keep the kernel out of browser islands. |
| Service workers | Root `sw.js`, `public/sw.js`, and `public/sw-clm.js` exist. | Record their scopes. GQC-02B guards dev against stale service-worker caches. |

## Current consumer map

This map separates the workbench from its target applications. GQC-00 confirms target type and ownership before it treats a row as a coverage promise.

| Surface or package | Product role | Entry and runtime owners | Existing tests | Status |
| --- | --- | --- | --- | --- |
| Landing portal | Workbench entry and single-page MCard viewer, not the target SPA | `index.html`, generated `js/nav.js`, `js/landing-page-mcard.js` | `tests/smoke/landing-page.spec.js`, `tests/smoke/single-page-mcard.spec.js`, `tests/features/penpot-navigation.spec.js` | P0 entry; characterize the stale smoke test |
| Responsive Lab | P0 test workbench | `responsive-lab.html`, `js/harness/`, `js/device-registry.js` | Rotation, capture, replay, sweep, conformance, and layout-freeze specs under `tests/features/` | P0 workbench |
| Mission Control | Candidate target application, mode not classified | `app.html`, `js/app-entry.js`, `js/cubical-core.js`, `js/pkc-core.js` | `tests/smoke/apps-menu.spec.js`, `tests/features/presentation-lattice.spec.js`, `tests/features/chat-panel.spec.js`, `tests/features/new-text-card.spec.js` | Product Manager confirms target type |
| Local SPA fixture | Deterministic P0 target for journey tests | Planned under `tests/fixtures/` in GQC-02 | Not present | Planned test fixture, not current product support |
| MCard samples and webapp cards | Content-browser and portal examples, not an SPA route graph | `server/mcard-api.mjs`, `js/landing-page-mcard.js`, seeded MCard database | `tests/single-page-mcard.test.mjs`, smoke and modality specs | Keep separate from target Page and Place coverage |
| PenPot navigation | Optional source for a future MPA mapping adapter | `design/landing-navigation.penpot`, `scripts/penpot-nav.mjs`, `scripts/penpot-drift.mjs`, `js/nav.js` | `tests/features/penpot-navigation.spec.js` | Current graph covers LandingPage routes only |
| Fiber tools | Internal diagnostics until approved | `fiber-inspector.html`, `fiber-conformance.html`, `js/runtime/`, `js/observability/correctness/` | `tests/features/fiber-inspector.spec.js`, `tests/features/fiber-conformance.spec.js` | Internal or undecided |
| Sprint registry | Internal planning UI | `sprint-registry.html`, sprint registry routes | `tests/features/sprint-registry.spec.js` | Internal or undecided |
| Documentation index | Internal documentation UI | `pkc-docs-index.html` | Coverage to inventory | Internal or undecided |
| CLM HTML fragments | Component test surface, not an application journey by file existence | `components/*.html`, `js/clm-iframe-loader.js`, `/api/clm/registry` | 14 `tests/components/*.spec.cjs` files; current Playwright matcher discovers none | GQC-01 repairs discovery |
| Browser and package core | Runtime and package implementation | `js/pkc-core.js`, `js/modules/`, `packages/*/src/` | Unit and package-consumer coverage to inventory | GQC-05 assigns source owners |
| Server variants | Runtime and API implementations | Root `ws-server.js`, `server/`, `packages/server/src/` | Unit, smoke, and feature API coverage to inventory | Product Manager confirms one or two products |

The map is an observed starting point, not an approved product catalog. The implementation owner records target type, Page and Place IDs, Functional Link and Transition IDs, callers, external imports, generated outputs, and file hashes in `evidence/GQC-00-consumer-map.md`. Do not copy LandingPage's `js/nav.js` graph into a second target registry.

## Work sequence

1. Inventory top-level HTML pages, generated LandingPage routes, Responsive Lab targets, test projects, server endpoints, and current MCard run records.
2. Classify each row as workbench, SPA target, MPA candidate, MCard `webapp`, probe fixture, internal diagnostic, or undecided. The Product Manager approves support claims.
3. Define the application-level mapping. A target Page or View is a Petri Place. A Functional Link is a Petri Transition. Keep the target's route handle separate from its CLM type URI. Apply the same mapping to the workbench: each workbench page is a candidate Place, and each link, redirect, `window.open`, and UI-reachable server call is a candidate Transition. Keep the workbench net and target nets separate.
4. Verify the installed `clm-kernel@0.0.12` Layer 4 API with one valid route and one invalid link. Record the type URI, error Place, receipt, and unverified browser and persistence boundaries. Record the Layer 1 subpath exports and the planning probe results that GQC-02A reruns.
5. Record Astro migration hazards: inline scripts, page globals such as `window.app` and `window.__lab`, `/public/...` and `/js/...` URL references, service-worker scopes, static mount order in `ws-server.js`, and the current `dev`, `build`, and `start` commands.
6. Map the P0 user journey to source files, test level, Playwright project, visible outcome, and risk. Keep PenPot MPA assessment optional.
7. Run the existing unit and browser suites. Record commands, exit statuses, discovered files, failures, and environment details.
8. Capture cold and warm baselines for the Responsive Lab and each candidate workbench Place, including transferred JavaScript bytes per page. These are the pre-Astro baselines GQC-02B and GQC-06 compare against. Record that no target-SPA baseline exists until GQC-02 creates the fixture. Do not use `app.html` as a substitute.
9. Record unresolved product and architecture decisions with an owner. Do not decide them by inferring support from a file name or a route.
10. Create `tests/gui-coverage.json` with the P0 workbench journey and explicit undecided statuses for unapproved target classes. Do not block this census on product decisions about non-P0 surfaces.
11. Create `tests/unit/gui-coverage-registry.test.mjs` and `scripts/check-playwright-discovery.mjs`. Run discovery preflight in the initial `playwright-quality.yml` workflow.
12. Write `docs/sprints/_active/evidence/GQC-00-consumer-map.md`. Include target type, Place and Transition IDs, module callers, package source, page owner, tests, docs, and unresolved claims.

## Files in the implementation PR

- `docs/sprints/_active/SPRINT-GQC-00-project-census-and-behavior-baseline.md`
- `docs/sprints/_active/evidence/GQC-00-consumer-map.md`
- `docs/sprints/_active/evidence/GQC-00-layer4-api-probe.md`
- `docs/sprints/_active/evidence/GQC-00-astro-readiness.md`
- `tests/gui-coverage.json`
- `tests/unit/gui-coverage-registry.test.mjs`
- `scripts/check-playwright-discovery.mjs`
- `package.json` with `check:playwright-discovery`
- `.github/workflows/playwright-quality.yml`
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator

Do not claim support for undecided target apps. GQC-00 may finish with non-P0 target classes marked undecided. GQC-02 owns the deterministic SPA fixture and its tests.

## BMAD responsibilities

### Analyst and Product Manager

- Inventory user-facing journeys and classify each page's support status.
- Confirm the P0 SPA test journey and whether PenPot MPA assessment stays optional or moves to a separately approved follow-up.
- Keep product decisions separate from facts observed in source.
- Escalate unsupported or ambiguous product claims instead of turning them into test requirements.

### Architect

- Map entry points, module imports, configuration consumers, data stores, and server variants.
- Verify the published Layer 4 route API and separate Place IDs, route handles, CLM type URIs, MCard hashes, and PenPot graph hashes.
- Identify real seams and current adapters. Do not propose a shared module until callers need the same behavior.
- Record the contracts that GQC-02B through GQC-05 must preserve. Keep `responsive_test_run:v1` backward compatible.
- Record the Layer 1 exports, the parser limits, and the browser-import hazard of the package root.
- Record the Astro migration hazards without proposing the Astro configuration. GQC-02B owns it.

### TEA

- Record the project discovery output and current test commands.
- Classify risks as technical, security, performance, data, business, or operations risks.
- Assign story priorities after probability and impact have evidence.

### Scrum Master

- Keep GQC-00 limited to the product and consumer map, baseline, coverage registry, and registry test.
- Do not mark a test layer healthy when its project lists zero specs.
- Coordinate the append-only `DECISIONS.tsv` and mark the active index only when evidence changes a sprint status.
- Hold later sprint planning until GQC-00 evidence and open decisions are reviewed.

## Acceptance criteria

- [ ] The inventory lists every root-level HTML page, PenPot-generated LandingPage route, Responsive Lab target, and test fixture.
- [ ] Every inventory row has a role, owner, target type, primary journey, and documentation pointer or an explicit undecided status.
- [ ] The map distinguishes the Responsive Lab workbench from the SPA, MPA, or MCard `webapp` loaded as its target.
- [ ] The P0 SPA journey names target selection, device and viewport choice, a functional link action, capture or replay, and an inspectable MCard result.
- [ ] The current default target `app.html` stays unclassified until the Product Manager approves its target type.
- [ ] PenPot MPA mapping is marked optional and excluded from the P0 SPA coverage denominator.
- [ ] A target Page or View maps to a CLM Layer 1 Place (exposed through the optional Layer 4 View facade), and a Functional Link maps to a Transition with a source, action, and destination or error Place.
- [ ] The route handle and CLM type URI are separate fields. `mcard:route:/index.html` is not used as a CLM type URI.
- [ ] The Layer 4 API probe records one successful transition, one invalid action to `p_error_modal`, and the limits of the probe.
- [ ] The evidence file records the exact command, package version from the lockfile, output, and tested CLM type URIs so another owner can reproduce the probe after `npm ci`.
- [ ] No acceptance criterion claims that a CLM transition executes a real browser action. Playwright drives and verifies the browser.
- [ ] `responsive_test_run:v1` remains unchanged. Any navigation-net reference uses an approved linked MCard or versioned schema.
- [ ] The PenPot inventory records the current 3 frames and 4 interactions as LandingPage navigation, not as proof of external MPA support.
- [ ] Every root and `public/` HTML page appears as a candidate workbench Place with a support status.
- [ ] Every observed internal link, script navigation, redirect, `window.open`, and UI-reachable `fetch` appears as a candidate Transition with its source file and line.
- [ ] The evidence records the Layer 1 subpath exports of the installed package and states that the package root imports Node `crypto`.
- [ ] The Astro readiness evidence lists inline scripts, page globals, `/public/...` and `/js/...` references, service-worker scopes, static mount order, and current run commands.
- [ ] The performance baseline records transferred JavaScript bytes per candidate Place.
- [ ] The unit test rejects a missing page path, missing spec path, or duplicate journey ID.
- [ ] The test inventory records the four Playwright discovery results above and the actual `npm run test:unit` result.
- [ ] The discovery guard fails when smoke or feature projects list zero intended specs.
- [ ] The discovery guard reports the component project's current zero-test state as a named, expiring GQC-01 exception.
- [ ] The inventory distinguishes test cases from test files and identifies overlapping Playwright projects.
- [ ] The runtime map includes `index.html`, `app.html`, `responsive-lab.html`, `pkc-docs-index.html`, `modules.json`, `js/app-entry.js`, `ws-server.js`, and `packages/*`.
- [ ] The consumer map names both sides of every byte-identical package and browser pair and the root and packaged server callers.
- [ ] The performance record states the browser, browser version, machine, viewport, data, cache mode, sample count, and spread.
- [ ] TEA and the Product Manager record whether the provisional route guard blocks or remains advisory. If they do not approve blocking limits, no PR fails on those limits before GQC-06.
- [ ] Every unresolved product or architecture choice has an owner and a decision sprint.
- [ ] No production runtime file changes in this sprint.

## Verification

Run these commands from a clean checkout and keep their output with the PR.

```bash
npm run test:unit
npm run check:playwright-discovery
npx playwright test --list --project=smoke
npx playwright test --list --project=components
npx playwright test --list --project=features
npx playwright test --list
```

The component listing is expected to expose the current defect. GQC-00 records that result and keeps it visible as a known exception. GQC-01 owns the repair and removes the exception.

The component discovery command is an expected non-zero baseline result in this sprint. Do not count it as a passing test. GQC-00 passes when the exit status and zero-test output are recorded accurately.

If an existing unit or browser suite fails on trunk, record its output as a baseline defect with an owner. Do not label it as a GQC-00 regression or hide it with a retry.

## Non-goals

- Do not change production HTML, JavaScript, CSS, API behavior, package exports, or deployment policy.
- Do not duplicate or reopen SMO or ERB deliverables.
- Do not add a test for every file. Cover approved user journeys and explicit risks.
- Do not publish performance thresholds as product promises before the owner approves them.
- Do not add Astro, an Astro configuration, or a net file. GQC-02A and GQC-02B own them.
- Do not generate `sprint-status.yaml`. The repo has no source epic file for this staged program, and this request limits current work to sprint documents.

## Open decisions

| Decision | Owner | Target sprint | State |
| --- | --- | --- | --- |
| Which targets are supported SPAs, MPA candidates, MCard `webapp` cards, or probe fixtures? | Product Manager | GQC-00 | Open |
| Should a seeded local SPA replace `app.html` as the default target? | Product Manager and UX Designer | GQC-00 | Open |
| Should top-level `index.html` continue to redirect directly to the Responsive Lab? | Product Manager and UX Designer | GQC-00 | Open |
| Is PenPot-assisted MPA assessment approved as an optional follow-up, and what does "manage" include? | Product Manager | GQC-00 and GQC-05 | Open |
| Should the Page and Place map be a runtime MCard net, a test-only projection, or both? | Architect and Product Manager | GQC-04 and GQC-05 | Open |
| How should a test run reference its navigation net without changing `responsive_test_run:v1`? | Architect and TEA | GQC-05 | Open |
| Which functional links are in the P0 SPA journey, and how are invalid actions shown? | Product Manager, Architect, and UX Designer | GQC-02 and GQC-04 | Open |
| Which browser and mobile-engine projects block each pull request? | Product Manager and TEA | GQC-01 | Open |
| Does continuous deployment remain independent of test failures? | Product Manager and operations owner | GQC-01 | Open |
| Which local and Playwright ports are public contracts? | Architect | GQC-01 and GQC-07 | Open |
| Which auth, collaboration, and offline flows use deterministic test providers? | Product Manager | GQC-02 | Open |
| Which performance budgets apply after the baseline and variance are known? | TEA and Product Manager | GQC-00 and GQC-06 | Open |
| Are the root and packaged servers one product or separate deployment variants? | Architect and Product Manager | GQC-05 | Open |
| Which rendering paths share a contract and which keep separate responsibilities? | Architect and Product Manager | GQC-05 | Open |
| Which package value owns new test-run kernel provenance? | Architect and Product Manager | GQC-07 | Open |
| Which workbench pages enter the P0 workbench net? | Product Manager | GQC-02A | Open |
| Which `/public/...` URLs are public contracts that the Astro migration must preserve? | Architect and Product Manager | GQC-02B | Open |

## Definition of done

- [ ] Analyst and Product Manager approve the P0 workbench journey. Other target types may remain undecided with an owner and target sprint.
- [ ] Architect approves the runtime and contract map.
- [ ] TEA records the baseline commands, test discovery, and risks.
- [ ] All open decisions have owners and target sprints.
- [ ] The inventory and baseline evidence are attached to `PR-GQC-00`.
- [ ] The operator approves the handoff to GQC-01.
