# Sprint GQC-07: Documentation alignment and architecture gates

## Metadata

- Sprint ID: `SPRINT-GQC-07`
- Handle: `urn:pcard:sprint:SPRINT-GQC-07`
- Status: `COMPLETED`
- Depends on: `SPRINT-GQC-06`
- Unblocks: Program GQC graduation
- Execution unit: `PR-GQC-07`
- Poteto playbook: `technical-writing`, `unslop`, and `principle-encode-lessons-in-structure`
- BMAD roles: Analyst, Architect, TEA, Dev, Tech Writer, Scrum Master

## Outcome

Make maintained documentation agree with the guided SPA test workflow, its target and MCard contracts, its Playwright suite, and its current package versions. Document the Astro host, its Preact islands, and the workbench Place-Transition net as current architecture. Document PenPot-assisted MPA assessment only as an optional approved extension. Add small automated checks for facts that can be derived from source.

This sprint does not rewrite every old guide. It chooses an owner for overlapping documents, preserves historical sprint records, and fixes the paths that a current user needs.

## Current documentation gaps

- `package.json` pins `clm-kernel` at `0.0.12`, while living docs state `0.0.3`, `0.0.9`, or `0.0.10`.
- `ws-server.js` defaults to port 3000. Playwright starts its server on port 3001. Some getting-started docs state that 3001 is the application default.
- `README.md`, `docs/README.md`, `docs/functionalities/`, `tests/README.md`, and `tests/TEST_DOCUMENTATION.md` overlap in scope.
- `docs/functionalities/README.md` contains local `file:///Users/...` links and links to paths that no longer exist.
- Test guides list commands and files that are stale, missing, or currently undiscovered.
- `js/harness/recorder.js` records kernel provenance `0.0.10`, while `server/mcard-modality.mjs` reports `0.0.12`.
- The documents do not distinguish the Responsive Lab workbench, a target SPA, a single-page MCard viewer, an MCard `webapp` target, and an MPA.
- The documents do not define the requested mapping from target Pages to Petri Places and Functional Links to Transitions.
- PenPot currently describes LandingPage navigation. Existing docs do not say that MPA target assessment remains optional.
- The closed `responsive_test_run:v1` schema has no graph reference. Documentation must name the approved linked MCard or versioned schema selected by GQC-05.
- Historical sprint reports contain their own versions, results, and commands. Those values describe past work and must remain historical.
- Living docs describe LandingPage as static HTML served by Express. After GQC-02B, pages are Astro routes with Preact islands, mounted inside Express. Setup guides do not name `astro dev`, `astro build`, or the dev port pair.
- No doc describes the workbench site net, its Place and Transition kinds, `check:net`, or the net-parity build check.
- Earlier planning text says LandingPage does not adopt MCard Studio's Astro stack. That statement is superseded for Astro. It still holds for Vitest.

## Source-of-truth ownership

| Fact | Source to verify | Documentation rule |
| --- | --- | --- |
| Package versions and scripts | `package.json` and `package-lock.json` | Link to the source or generate the command list. |
| New test-run kernel provenance | `package.json#dependencies.clm-kernel` plus the approved browser runtime value | New records use the current package version. Existing records retain their historical value. |
| Default server port | `ws-server.js`, `.env.example`, Docker, and Playwright config | Distinguish application, test, container, and published ports. |
| Navigation routes | Generated `js/nav.js` and its Penpot source | Do not type a second navigation registry into documentation. |
| Target application type | Approved GQC-03 target registry | Distinguish the SPA target, MPA candidate, MCard `webapp`, probe fixture, blocked target, and custom target from the workbench. |
| Page and Place mapping | GQC-05 CLM Layer 4 adapter and MCard process contract | Name the Page or View, its Place, source, destination, error Place, and tested CLM type URI. Do not treat PenPot design edges as runtime proof. |
| Functional Link and Transition mapping | GQC-05 CLM Layer 4 adapter and MCard process contract | Name the link, Transition ID, source Place, destination Place, action name, and test evidence. |
| Test-run graph reference | Approved GQC-05 MCard linkage or versioned schema | Preserve `responsive_test_run:v1`. Do not document an unversioned field. |
| Hash domains | `server/mcard-api.mjs`, the browser compatibility module, and `scripts/penpot-zip.mjs` | Distinguish Triad hashes, browser compatibility hashes, and PenPot graph hashes. |
| Lab target policy | Approved configuration contract from GQC-03 | Describe registered, custom, and blocked targets separately. |
| Runtime module map | Approved GQC-04 and GQC-05 ownership maps | Link to the current owner and preserve page-specific contracts. |
| Playwright projects and commands | `playwright.config.js` and `package.json` | Test every documented project name and command. |
| Historical sprint outcomes | Graduated sprint files | Keep the measured result and label it as historical. |
| Run and build commands | `package.json`, `astro.config.mjs`, and `ws-server.js` | Name the dev pair (`astro dev` plus Express), the build (`astro build` plus workspace builds), and `start`. Test each command. |
| Workbench Places and Transitions | `src/net/workbench-net.yaml` | Generate the Place and Transition tables from the envelope. Do not hand-type them. |
| Island map | `evidence/GQC-02B-island-map.md` and the GQC-04 ownership map | Name each island's Place, directive, owner, mounted module, and cleanup path. |
| Server-call placement | GQC-05 server-call policy | State when a new call is an Astro endpoint, an Astro Action, or an Express route. |

## Work sequence

1. Inventory maintained docs and name one owner and task for each.
2. Choose whether `docs/functionalities/` is a capability reference, generated map, or archive. Keep it distinct from operational how-to guides.
3. Reconcile the living version, port, SPA and MPA, Page and Place, and Transition claims with current source and approved Product Manager decisions.
4. Have the Architect select `package.json#dependencies.clm-kernel` as the release version source or record an alternative. Have the Product Manager approve user-facing version claims.
5. Define how the browser recorder receives that value without importing the Node package manifest. Have TEA test new writes and historical reads. Record the choice in `DECISIONS.tsv` before changing provenance code.
6. Document the `responsive_test_run:v1` compatibility rule and the approved MCard graph-to-run link.
7. Repair local Markdown paths. Replace absolute workstation URLs with repository-relative links.
8. Update README, architecture, functionality, test, and performance guides as the code changes settle. Explain that the current PenPot graph maps LandingPage routes only.
9. Add a `docs:check` command for local Markdown links, documented package scripts, target types, graph terminology, and explicitly owned version or port facts.
10. Add the documentation check to CI. Allow historical documents only through a named, reviewed exception.
11. Update the program and sprint indexes when GQC graduates. Do not move files until all completion evidence exists.
12. Generate `docs/01-architecture/workbench-net.md` from `src/net/workbench-net.yaml`: one Place table, one Transition table, and a Mermaid diagram. Add a check that fails when the generated file is stale.
13. Extend `docs:check` so every Place or Transition ID written in a maintained doc exists in the workbench net or a declared target net.
14. Document the Astro host: run commands, dev ports, source layout, island rules, and the middleware mount order in `ws-server.js`.
15. Run `check:net` and the Astro net-parity build check in CI next to `docs:check`.
16. Mark the "not its Astro or Vitest stack" statements as superseded for Astro in maintained docs. Do not edit graduated sprint records.

## BMAD responsibilities

### Analyst

- Compare user-facing promises with shipped pages and documented routes.
- Mark product claims that require owner confirmation.

### Product Manager

- Approve current user-facing version statements.
- Confirm whether the current runtime provenance is a product promise or an internal build detail.
- Approve the final SPA-first promise and keep the PenPot MPA extension marked optional unless separately authorized.

### Architect

- Review the current page, module, package, and server maps.
- Confirm the Page-to-Place and Functional-Link-to-Transition mapping matches the tested CLM Layer 4 contract.
- Confirm that architecture docs name owners and contracts rather than proposed code.
- Confirm that the documented island rules and mount order match `astro.config.mjs` and `ws-server.js`.

### TEA

- Test every documented command and link check.
- Verify that docs checks do not claim behavioral coverage.

### Dev

- Implement only the small fact checks that have a stable source.
- Avoid regex rules that turn historical reports into false failures.

### Tech Writer

- Give each maintained guide one audience and one task.
- Use relative links, sentence-case headings, current names, and source links.
- Keep current setup instructions separate from historical sprint evidence.

### Scrum Master

- Keep the staged GQC index accurate during execution.
- Graduate the program only after the checks and reports pass.

## Files in the implementation PR

- `README.md`
- `docs/README.md` and the maintained architecture, functionality, testing, setup, and performance guides
- `tests/README.md` and `tests/TEST_DOCUMENTATION.md`
- `scripts/check-docs.mjs`
- `scripts/docs-link-allowlist.json`
- `scripts/gen-net-docs.mjs`, which renders the workbench net tables and diagram
- `docs/01-architecture/workbench-net.md`, generated
- `docs/01-architecture/astro-host-and-islands.md`
- `js/harness/recorder.js`
- `server/mcard-modality.mjs`, only if the approved version source requires an edit
- `tests/unit/test-run-schema.test.mjs`
- `tests/unit/check-docs-net-ids.test.mjs`
- `package.json`
- `.github/workflows/playwright-quality.yml`
- `docs/sprints/INDEX.md` and `docs/sprints/_active/INDEX.md` at graduation
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator for approved provenance and documentation ownership

`js/harness/recorder.js` is first changed for capture lifecycle in GQC-03 and later for provenance only in GQC-07. GQC-07 starts from the GQC-06 stack head and preserves the earlier lifecycle changes. Record the full file and its test inputs in the lane input manifest.

## Acceptance criteria

- [x] Every maintained documentation set names an audience, owner, and source of current facts.
- [x] The README and getting-started guide state the verified server and test ports.
- [x] Current kernel provenance agrees with the selected runtime source.
- [x] New test-run records use the selected provenance source. Existing records keep their recorded version.
- [x] Maintained docs name the Responsive UI Lab as the workbench and distinguish it from target SPAs, MPA candidates, MCard `webapp` targets, and portal samples.
- [x] Maintained architecture docs use Page-as-Place and Functional-Link-as-Transition terms consistently and link each claim to the approved CLM and MCard source.
- [x] The current PenPot graph is described as LandingPage navigation only. Any MPA assessment is marked optional and requires approved target bindings.
- [x] Docs describe `responsive_test_run:v1` as closed and do not claim that it contains a navigation graph unless GQC-05 adds an approved versioned relationship.
- [x] Docs distinguish Triad, browser compatibility, and PenPot graph hash contracts.
- [x] Test docs list only commands and projects that exist and pass discovery.
- [x] Internal Markdown links resolve from a clean checkout.
- [x] Maintained docs contain no workstation-specific `file:///Users/` links.
- [x] Historical sprint claims remain unchanged and are labeled as historical where readers could mistake them for current behavior.
- [x] `npm run docs:check` fails on a broken internal link or a documented package script that does not exist.
- [x] Every historical-link exception names one exact path, owner, reason, and expiry or review date.
- [x] The checker rejects directory-wide exclusions and unlisted historical exceptions.
- [x] CI runs `npm run docs:check`.
- [x] Every architecture claim changed in this program links to a test or source owner.
- [x] Setup docs name the Astro dev pair, the build command, `start`, and both dev ports. Each documented command runs from a clean checkout.
- [x] `docs/01-architecture/workbench-net.md` is generated from `workbench-net.yaml`, and CI fails when it is stale.
- [x] `docs:check` fails when a maintained doc names a Place or Transition ID that no declared net contains.
- [x] The island map in docs matches the committed island map and the GQC-04 ownership map.
- [x] CI runs `check:net`, the net-parity build check, and `docs:check`.
- [x] Maintained docs state that Astro is adopted and Vitest is not. Graduated records keep their original wording.

## Test design

| ID | Level | Scenario | Expected result |
| --- | --- | --- | --- |
| GQC-07-UNIT-01 | Unit | Parse Markdown links and package script references | Valid local links and package commands pass. |
| GQC-07-UNIT-02 | Unit | Check current version and port ownership | Maintained docs match the selected source values. |
| GQC-07-UNIT-03 | Unit | Create a test-run record with current kernel provenance | New records use the selected source without rewriting historical records. |
| GQC-07-UNIT-04 | Unit | Check Page and Place and Functional Link and Transition terminology | Current docs follow the approved domain map and distinguish optional PenPot MPA scope. |
| GQC-07-INT-01 | Integration | Run the documentation checker in CI | A broken local link fails the job and identifies its file and line. |
| GQC-07-E2E-01 | E2E | Follow setup and test instructions from a clean checkout | The documented route loads and the documented command runs its intended project. |
| GQC-07-UNIT-05 | Unit | Name an unknown Place ID in a maintained doc | `docs:check` fails and names the file, line, and ID. |
| GQC-07-UNIT-06 | Unit | Change one Transition in `workbench-net.yaml` without regenerating docs | The staleness check fails. |

## Non-goals

- Do not rewrite all documentation in one PR.
- Do not edit graduated sprint reports to make their historical version numbers current.
- Do not archive documents until the owner confirms they have no current audience or unique information.
- Do not generate documentation from source where it would hide useful context or decision rationale.
- Do not claim accessibility, performance, or product support from a broken link checker.

## Definition of done

- [x] Every maintained guide has a named owner and no duplicate authority claim.
- [x] Current docs match the approved route, module, server, package, and test contracts.
- [x] Current docs describe the SPA-first guide, CLM Page-as-Place and Functional-Link-as-Transition mapping, MCard receipt path, and optional MPA scope without claiming unverified runtime behavior.
- [x] Current docs describe the Astro host, island map, workbench net, and server-call policy, and the generated net docs are fresh.
- [x] `npm run docs:check` passes on a clean checkout.
- [x] The complete unit, smoke, component, feature, conformance, and approved browser matrix passes.
- [x] Performance results include raw samples, spread, environment, and exact SHAs.
- [x] The Analyst, Architect, TEA, and Tech Writer approve the final documentation map.
- [x] The Product Manager approves the P0 SPA journey and the status of the optional PenPot MPA extension.
- [x] The Scrum Master records the graduation review and updates the active sprint index.
- [ ] The operator approves program graduation.
