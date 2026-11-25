# Program DCI plan

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, UX designers, architects, developers, and TEA engineers |
| BMAD Owner | Product Manager with UX Designer, Architect, Developer, Tech Writer, and TEA |
| Source of Truth | This plan, [`./INDEX.md`](./INDEX.md), [`./DECISIONS.tsv`](./DECISIONS.tsv), [`./dci-local-backlog.md`](./dci-local-backlog.md), [`./evidence/DCI-pre-program-study.md`](./evidence/DCI-pre-program-study.md), and [`./evidence/DCI-egm-review.md`](./evidence/DCI-egm-review.md) |
| Status | `ACTIVE` (`SPRINT-DCI-00` through `SPRINT-DCI-04` complete; `SPRINT-DCI-05` verification and graduation next) |
| Program | DCI, Declared reach, Closed navigation, and Interface state |
| Consensus Kernel | `clm-kernel@0.0.26` |
| Drift Gate | `npm run docs:check` |

## Outcome

Program DCI makes four parts of the LandingPage UI say what a person can do and where they are. It adds no drag engine, no island, no dependency, and no server call.

When the program graduates, five things are true.

1. The sprint registry groups its `335` sprints by program, filters them, links to one sprint, and writes no registry text as markup.
2. Each of the four workbench pages links to the other three. The links are declared in the Petri net, and a net rule fails the build when a page Place has no declared arc in or none out.
3. A Lab configuration is a URL. A reload keeps the device, the size, the orientation, and the mode.
4. A disabled stage control says why it is disabled, in visible text. No native browser dialog remains on the four workbench pages.
5. One table lists every value the UI stores, where it lives, and what a reload or a new browser does to it.

Each number behind these claims is measured in [`./evidence/DCI-pre-program-study.md`](./evidence/DCI-pre-program-study.md).

No item in the sequence answers a recorded request. Each answers a measured gap, which its sprint file states. The operator's approval of scope is the test of need for these five. The operator gave it on `2026-11-25` local time, and the `DCI-scope-confirmation` row of `DECISIONS.tsv` records the question and the answer. Work with neither a measured gap nor a named user waits in the backlog.

## Who this is for

A coordinator who reads the sprint registry gets groups, filters, a search box, and a link to one sprint. A developer or TEA engineer who tests an app in the Lab gets a shareable Lab link and a stated reason beside each disabled control. A person who lands on any of the four workbench pages can reach the other three without typing a URL.

The engineer who maintains LandingPage next inherits two extended gates and no new gate. `scripts/check-net.mjs` gains one rule for pages without links. `scripts/check-explorable-gui.mjs` scans two more paths for native dialogs.

## How this plan was made

The plan follows the `poteto-mode` `figure-it-out` route with the `technical-writing` and `unslop` skills, then an Elephant-Goldfish Model (`EGM`) review. The planner held the full context and drafted. Five reviewers with no shared context then read the drafts against the code. The record is [`./evidence/DCI-egm-review.md`](./evidence/DCI-egm-review.md).

Three sources ground the plan. They are the operator's study notes on Dragology and declarative programming, the parent repository, and this repository with its running app.

The scope changed twice, and both changes are part of the record.

1. **The study narrowed it.** The first idea was to add drag interactions. The notes assign the drag engine to `mcard-studio` and record that no user has asked to drag anything. The first draft therefore applied the rules that need no engine, and added a small interpreter and a command bar.
2. **The review narrowed it again.** While the first draft was written, another session added the LandingPage side of parent sprint `PKC-06` to the working tree. It includes a ninth island and a drag-spec evaluator, `js/harness/pkc-dragology-preview.js`. The reviewers found it. The interpreter in the first draft would have duplicated it. The reviewers also judged the command bar, the gesture recorder, and the drag pilot as work with no named user. Those four items moved to [`./dci-local-backlog.md`](./dci-local-backlog.md), each with the condition that would bring it back.

## Glossary

- **Workbench page.** One of the four Astro pages that has a header: the portal, the Responsive UI Lab, the sprint registry, and the Fiber Inspector.
- **Portal.** The page at `/index.html?noredirect=1`. A visit to `/` redirects to the Lab unless `noredirect` is present. The net models the redirecting root as the page Place `p_page_index` and the visible portal as the view Place `p_view_index_mcard_viewer`.
- **Lab, stage, and target.** The Lab is the page `/responsive-lab.html`. The stage is the sized frame in its center. The target is the page loaded into that frame.
- **Tier.** The Lab layout for a host width: `compact` under `600px`, `tablet` under `1280px`, and `desktop` otherwise.
- **Place and Transition.** Petri net nodes and arcs declared in `src/net/workbench-net.yaml`. Every page is a Place. Every link between pages and every UI server call is a Transition.
- **Island.** A Preact component that Astro hydrates in the browser. The Lab has `9` in the working tree of `2026-11-24`.
- **Dragology.** The method of the paper Declarative Dragging. An author declares which states a dragged element can reach, and an engine works out the geometry and the preview. The preview changes nothing, and the release sends one request.
- **Drag-spec evaluator.** `previewDragSpec` in `js/harness/pkc-dragology-preview.js`. It is a pure function from a declared spec and an input to one of four results: `candidate`, `ambiguous`, `blocked`, or `cancelled`. Parent sprint `PKC-06` added it.
- **`PKC-06` and `EPIC-PKC`.** `EPIC-PKC` is the active program of the parent repository. `PKC-06` is its sprint for the Dragology island and the model-call gate.
- **Estate 3.** The parent's name for this repository's role, the responsive verification lab and portal.
- **Registry projection.** The `sprints` list in `clm-registry.yaml`, pulled from the parent. The sprint registry page shows it.
- **Bombadil.** The property-testing explorer that clicks through the Lab at random and checks the Petri net as an oracle.
- **StageShow sweep.** The layout audit that snapshots five routes at four widths and fails on overflow or clipping.
- **Operator.** The person who owns the repository and approves scope and graduation.
- **BMAD, CLM, EGM, and TEA.** `BMAD` assigns sprint ownership across the Product Manager, UX Designer, Architect, Developer, Tech Writer, and `TEA` (Test Engineering and Architecture). `CLM` is the Cubical Logic Model. `EGM` is the Elephant-Goldfish Model review protocol.

## What the notes ask for, and where each rule lands

| Rule in the notes | Where it lands |
| --- | --- |
| Name what each piece of interface state lies over, and what happens when that base moves | `SPRINT-DCI-00` writes the stored-state table. `SPRINT-DCI-03` moves Lab state into the URL |
| Navigation returns a page or an explained failure | `SPRINT-DCI-02` |
| Explain a refusal in domain terms | `SPRINT-DCI-04` |
| An interface is the observability layer of the governed system | `SPRINT-DCI-01` |
| Previews change nothing, and one release sends one request | Already true of the `PKC-06` island and its evaluator. Not rebuilt here |
| Every drag has a twin that is not a drag | Already tested for the evaluator in `tests/unit/dragology_island_parity.test.mjs`. Not rebuilt here |
| A draggable declares where it can go | Held in the backlog as candidates 1 and 4 |
| A turn is intent, execution, and verification, with a preview first | Held in the backlog as candidate 2 |

## Program invariants

| ID | Invariant | Check |
| --- | --- | --- |
| `INV-DCI-01` | No registry string reaches the DOM as markup. | `! grep -n 'innerHTML' src/pages/sprint-registry.astro` and the registry spec |
| `INV-DCI-02` | Every Place of kind `page` has a declared arc in and a declared arc out, of kind `link` or `redirect`, or it carries a `terminalReason` or an active `exception`. The rule reads the net. It does not prove that a page renders the link. | `npm run check:net`, through the new rule `page-place-without-link` |
| `INV-DCI-03` | Every nav link is a literal in the nav component, and the build fails when a literal disagrees with the net. | `npm run check:bombadil-nets` and `npm run build` |
| `INV-DCI-04` | No native dialog exists in islands, layouts, components, pages, `js/harness`, `js/runtime`, or `js/landing-page-mcard.js`. | `npm run check:explorable-gui` |
| `INV-DCI-05` | No DCI pull request adds a `fetch`, an island, or a dependency, and `ws-server.js` keeps its digest. | `node scripts/check-package-source-parity.mjs`, which pins the digest, and the diff of each `PR-DCI-0N` |

## Design decisions

| ID | Decision | Rationale | Alternatives rejected |
| --- | --- | --- | --- |
| `DCI-D01` | The program improves LandingPage as Estate 3, the responsive verification lab and portal. | The parent ownership manifest gives it that role under `DEC-29`. The notes carry three different descriptions, and a plan has to pick one. | The universal card browser of the older hub note. The 3D theatre. |
| `DCI-D02` | The program builds no drag code. Any later candidate that needs a drag preview calls the evaluator that `PKC-06` ships, which is `previewDragSpec` today. | The evaluator exists, is pure, and is tested. A second one would differ in ties, in result states, and in node keys. | The interpreter `js/harness/declared-drag.js` of the first draft. Upstream `dragology`, which needs React. |
| `DCI-D03` | Extend two existing gates. Add no census script and no ledger file. | `scripts/check-net.mjs` already computes reachability and honours a time-boxed `exception` field. A snapshot harness is terminal for good, so the new rule also accepts a permanent `terminalReason`. `scripts/check-explorable-gui.mjs` already has a native-dialog rule that misses two paths. | The census script and the YAML ledger of the first draft, which repeated both checks and counted call sites that nothing read. |
| `DCI-D04` | The Petri net is the model for links between workbench pages. The nav component lists its links as literals and fails the build when one disagrees with the net. | This settles the open decision `open-link-source` of `2026-10-27`. The trigger-drift check in `scripts/gen-bombadil-nets.mjs` needs each selector as a literal in the source file. | Links computed from the net at build time, which fail that check. Penpot as the source, which needs a running design server. |
| `DCI-D05` | No sprint adds a `fetch`, an endpoint, or a line to `ws-server.js`. | The parent locks the digest of `ws-server.js`. Every feature here reads state the page already holds. | A slim registry endpoint, which would save `12%` of one response. |
| `DCI-D06` | Lab state that a person would share lives in the URL. The write merges into the existing query with `URLSearchParams`, runs only after a user commit, and never on a resize observation. | `lab:viewport-change` fires on every resize observation. Chrome drops history updates that arrive too fast. Two writers already set `target` by merging. The recorder already names the three causes that are user commits. | A write on every `lab:viewport-change`. `localStorage`, which cannot be shared. |
| `DCI-D07` | Disabled stage controls keep the native `disabled` attribute. The reason appears as visible text that `aria-describedby` ties to the control. | Sixteen assertions and the explorer's clickable rule depend on the native attribute. Visible text needs no focus and no hover, so it reaches keyboard and touch. | `aria-disabled` with an action table, as in the first draft. A `title`, which a disabled button does not expose. |
| `DCI-D08` | Each native dialog is replaced by the smallest inline element that does its job: one `<dialog>` with a URL field, and one status line. | `prompt` collects one URL. `alert` shows one sentence. | A command bar with ten verbs, which is now backlog candidate 2. |
| `DCI-D09` | The Bombadil explorer does not follow nav links. | The registry and the inspector are `load-only` surfaces. Following the nav would move a Lab run onto pages with no properties to check. | Widening the two surfaces to `explore`. |
| `DCI-D10` | Work with neither a measured gap nor a named user waits in the backlog file with an entry condition. | Scheduled work answers a gap that the study measured. Held work answers neither a gap nor a request. | Optional sprints behind flags, which would still need full specifications now. |

### Operator scope flags

- **Flag 1, the link source (`DCI-D04`).** The operator confirms that the net is the model for links between workbench pages. A no stops `SPRINT-DCI-02`. The Penpot path waits in the backlog, because the generated nav mounts on the portal only.
- **Flag 2, the start commit.** On `2026-11-24` at `22:59` local time the working tree held `45` modified files and `6` untracked files from two other change sets: the `clm-kernel@0.0.25` pin and the LandingPage side of `PKC-06`. The `PKC-06` work was still changing files here, and it left four test lines that pin `8` islands beside `9` island files. Program DCI starts after `DoD-PKC-06-03` is ticked in the parent file `docs/sprints/_active/pkc/sprint-pkc-06-dragology-algebra-mpa-spa-unification-and-tfz-llm.md`, on a commit that contains both change sets and on which every gate is green. On `2026-11-24` that box was open, and all `14` gates had not been seen green together. `SPRINT-DCI-00` proves it. The one exception is `PR-DCI-01A`, which touches a file that neither change set touches and can merge on its own approval.
- **Flag 3, the backlog.** The operator can promote any candidate in [`./dci-local-backlog.md`](./dci-local-backlog.md) once its entry condition holds. A promoted candidate gets its own sprint file and its own review. On `2026-11-25` local time the operator kept every candidate in the backlog.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| The tree moves under the plan again, as it did on `2026-11-24`. Parent sprints `PKC-06` and `PKC-09` also edit `src/net/workbench-net.yaml`, `src/pages/responsive-lab.astro`, and `docs/01-architecture/astro-host-and-islands.md`. | The program starts after `DoD-PKC-06-03` is ticked. `SPRINT-DCI-00` runs every gate on a pinned commit. Each sprint rebases before it starts, cites symbols and test ids in place of line numbers, and proves `INV-DCI-05` on its own diff. |
| A crafted Lab link sets Lab state. | The five new parameters pass through a pure parser that accepts only known devices, sizes in range, two orientations, and four modes. `target` keeps its existing membrane policy and is not changed here. |
| Chrome drops history updates that arrive too fast, so the address bar goes stale. | The write runs only after a user commit and only when the text changes. The registry search waits `300 ms`. |
| The registry page writes titles through `innerHTML`. No title holds a tag today, so the path is latent. | `PR-DCI-01A` removes the sink. It can merge before the rest of the program. |
| Nav links change what the smoke specs and the explorer see. | `SPRINT-DCI-02` updates the four expected link sets in `tests/fixtures/test-config.js` and adds the nav to the explorer skip lists. |
| The URL dialog opens an outside page inside the portal, as `prompt` does today. | The same `parseSwitchIntent` validates the input, and the same external-portal membrane resolves the URL. The dialog adds no new path. |

## Sequence

| Order | Sprint | Goal | Depends on | Effort | Status |
| ---: | --- | --- | --- | :---: | :---: |
| 1 | [DCI-00](./SPRINT-DCI-00-pinned-baseline-and-stored-state.md) | Pin the start commit, run every gate, measure the baseline again, and write the stored-state table. | Flag 2 | 0.5d | `DONE` |
| 2 | [DCI-01](./SPRINT-DCI-01-sprint-registry-estate-map.md) | Safe rendering in `PR-DCI-01A`. Groups, filters, search, and deep links in `PR-DCI-01B`. | None for `PR-DCI-01A`. DCI-00 for `PR-DCI-01B` | 2d | `DONE` |
| 3 | [DCI-02](./SPRINT-DCI-02-navigation-closure.md) | A nav on four pages and a net rule for pages without links. | DCI-01 | 2d | `DONE` |
| 4 | [DCI-03](./SPRINT-DCI-03-linkable-lab-state.md) | Device, size, orientation, and mode in the Lab URL, with a copy-link control. | DCI-02 | 2d | `DONE` |
| 5 | [DCI-04](./SPRINT-DCI-04-refusal-reasons-and-native-dialogs.md) | A visible reason for each disabled stage control, and no native dialog on the workbench pages. | DCI-03 | 1.5d | `DONE` |
| 6 | [DCI-05](./SPRINT-DCI-05-verification-and-graduation.md) | Full gate matrix, living docs, and the archive to `docs/sprints/programs/dci/`. | DCI-01, DCI-02, DCI-03, DCI-04 | 1d | `IN_PROGRESS` |

Every effort figure is a guess. The total is `9` days. The sprints run in order, because `SPRINT-DCI-02`, `SPRINT-DCI-03`, and `SPRINT-DCI-04` each edit `src/pages/responsive-lab.astro` or a page header that an earlier sprint also edits.

## Rules for every sprint

- Keep `INV-DCI-05` true in every PR. The PR diff adds no file under `src/islands`, no `fetch(` call, and no entry in `package.json`.
- Rebase on the current main branch before a sprint starts, and run the core gates before the first edit.
- Update `src/net/workbench-net.yaml`, `tests/bombadil/generated/workbench-net.ts`, `tests/bombadil/scope.json`, the three explorer skip lists, and `docs/01-architecture/astro-host-and-islands.md` in the same PR that changes a route or a link.
- Give every new control a `data-testid`, inside the lint scope of `scripts/check-explorable-gui.mjs`.
- Prove layout with `npm run stageshow:sweep -- --strict`. Capture `tests/baselines/layout-baseline.json` again only for the pages a sprint changes among the five that `tests/features/layout-freeze.spec.js` knows, with `STY_FREEZE=capture` and `STY_FREEZE_PAGES`. The sprint registry is not one of the five.
- List the evidence file, `DECISIONS.tsv`, the sprint file, `INDEX.md`, and this plan in each sprint's Files section, and set the sprint's status in all three when it completes.
- Save evidence in `docs/sprints/_active/evidence/DCI-0N-<slug>.md`. Append one row to [`./DECISIONS.tsv`](./DECISIONS.tsv) whose `phase` column is `DCI-0N-complete`.
- Pass the core gates: `npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run build && npm run test:unit && npm run test:smoke && npm run test:features`.

## Scope

| Page or target | Route | Scope | Constraint |
| --- | --- | --- | --- |
| Portal | `/index.html?noredirect=1`, and the root `index.html` that the server uses when no build exists | Nav, URL dialog in place of `prompt`, status line in place of `alert` | The Penpot nav stays. `0 B` of `_astro/` script |
| Responsive UI Lab | `/responsive-lab.html` | Pages menu, URL state, copy link, refusal reasons | No new island. No new server call |
| Sprint registry | `/sprint-registry.html` | Groups, filters, search, deep links, nav | Same `GET /api/clm/registry`. `0 B` of `_astro/` script |
| Fiber Inspector | `/fiber-inspector.html` | Nav, and one link to the conformance harness | `0 B` of `_astro/` script |
| Fiber conformance harness | `/fiber-conformance.html` | Declared as a terminal page. No visible change | Its PNG snapshots stay unchanged |
| Docs index | `/pkc-docs-index.html` | No change. It passes the net rule through an older declared arc that the static page does not render | Static legacy page with no link back |

## Non-goals

- **Any drag, any gesture recording, and any command line.** They are candidates in [`./dci-local-backlog.md`](./dci-local-backlog.md).
- **The files of `PKC-06`.** Program DCI edits none of `src/islands/PkcCardIsland.jsx`, `js/harness/pkc-dragology-preview.js`, `scripts/check-pkc-client-contract.mjs`, `tests/unit/dragology_island_parity.test.mjs`, `tests/unit/tfz_llm_boundary.test.mjs`, and `js/modules/web-llm/tfz-gate.js`.
- **Model calls.**
- **The legacy device key.** `js/device-registry.js` still writes `pkc_responsive_lab_devices_v1` beside the current key, and one feature spec reads it. Removing it is a cleanup with no visible effect, so it waits.
- **A change to the registry projection or its endpoint.**
- **A way back from `/pkc-docs-index.html`.** The page is a static legacy file that the parent retirement ledger tracks.
- **One first-visit theme.** The Fiber Inspector declares light, the Lab and the registry declare dark, and the portal follows the system preference. The backlog holds it.

## Graduation

Program DCI graduates from `docs/sprints/_active/` to `docs/sprints/programs/dci/` only when the operator signs off on a ledger that meets every requirement below.

1. Every sprint from `SPRINT-DCI-00` through `SPRINT-DCI-05` has all DoD boxes ticked, a matching evidence file, and a `DCI-0N-complete` row in `DECISIONS.tsv`.
2. Both extended gates exist and pass. The commands are those of `DoD-DCI-02-02` and `DoD-DCI-04-01`.
3. These `14` gate commands all exit `0` on one commit: `npm run stageshow:check-css`, `npm run stageshow:sweep -- --strict`, `node scripts/check-package-source-parity.mjs`, `npm run check:net`, `npm run check:explorable-gui`, `npm run check:bombadil-nets`, `npm run check:playwright-discovery`, `npm run docs:check`, `npm run build`, `npm run test:unit`, `npm run test:smoke`, `npm run test:components`, `npm run test:features`, and `npm run test:smoke:cross-browser`. The sweep covers five routes at `1440px`, `820px`, `390px`, and `358px`.
