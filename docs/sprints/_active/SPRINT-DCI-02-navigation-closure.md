# SPRINT-DCI-02 Navigation closure

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-02` |
| Source of Truth | [`./dci-plan.md`](./dci-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-DCI-02` |
| Status | `PLANNED` |
| Depends on | `SPRINT-DCI-01` |
| Unblocks | `SPRINT-DCI-03` |
| Execution unit | `PR-DCI-02` |
| Decision Ref | `DCI-D03`, `DCI-D04`, `DCI-D09`, Flag 1 |
| Poteto playbook | `feature` with `principle-model-the-domain`, `principle-sequence-verifiable-units`, and `principle-experience-first` |
| BMAD roles | Product Manager, UX Designer, Architect, Developer, TEA, Tech Writer |
| Effort | `2 days (guess)` |

## Outcome

A person who lands on the portal, the Lab, the sprint registry, or the Fiber Inspector can reach the other three without typing a URL. The links are declared in the Petri net. A new net rule fails the build when a page Place has no declared arc in or none out, unless the page states why.

Today the registry, the inspector, and the conformance page each hold `0` same-origin links (measured, and pinned in `tests/fixtures/test-config.js`). The net agrees. Those three page Places have no arc of kind `link` in or out. They pass `npm run check:net` only because each is marked `deepLinkEntry`.

## Work sequence

1. **Add the net rule first.** In `scripts/check-net.mjs`, after the reachability loop that emits `unreachable-page-place`, add a loop that emits `page-place-without-link`. For each Place whose binding has kind `page`, collect the Transition bindings of kind `link` or `redirect`. Fail when none has the Place as `toPlaceId`, or none has it as `fromPlaceId`. Skip the Place when its binding has a `terminalReason` that is a string with text in it, or when `isExceptionActive(binding.exception, currentSprint)` is true, as the rule above it does.

   Add four cases to `tests/unit/check-net.test.mjs`: a page with no arc in, a page with no arc out, a page with a `terminalReason`, and a page with an active `exception` that is rejected once the exception expires. The existing case `GQC-02A-UNIT-05` stays unedited and stays green, because its orphan page carries an active exception.

   From this step until step 3, `npm run check:net`, `npm run build`, and `npm run test:unit` fail on the real net for three Places. That is the failing state the next two steps fix.
2. **Declare the links in the net.** Add `11` Transitions to `src/net/workbench-net.yaml`, each with a topology entry and a binding of kind `link`. Copy the binding shape of `t_link_lab_to_index`.
   - `route` equals `triggerHref`.
   - `ownerPage` and `owner` copy `pagePath` and `owner` from the binding of the From Place.
   - `triggerSource.selector` is the literal in the last column.
   - `trigger` is `click a[data-testid="<selector>"] at <ownerPage>`.
   - `triggerSource.file` is `src/components/WorkbenchNav.astro` for the first ten rows and `src/pages/fiber-inspector.astro` for the last.

   | Transition | `linkId` | From Place | To Place | `triggerHref` | Selector literal |
   | --- | --- | --- | --- | --- | --- |
   | `t_link_viewer_to_registry` | `link_viewer_to_registry` | `p_view_index_mcard_viewer` | `p_page_sprint_registry` | `/sprint-registry.html` | `nav-viewer-to-registry` |
   | `t_link_viewer_to_inspector` | `link_viewer_to_inspector` | `p_view_index_mcard_viewer` | `p_page_fiber_inspector` | `/fiber-inspector.html` | `nav-viewer-to-inspector` |
   | `t_link_lab_to_registry` | `link_lab_to_registry` | `p_page_responsive_lab` | `p_page_sprint_registry` | `/sprint-registry.html` | `nav-lab-to-registry` |
   | `t_link_lab_to_inspector` | `link_lab_to_inspector` | `p_page_responsive_lab` | `p_page_fiber_inspector` | `/fiber-inspector.html` | `nav-lab-to-inspector` |
   | `t_link_registry_to_index` | `link_registry_to_index` | `p_page_sprint_registry` | `p_view_index_mcard_viewer` | `/index.html?noredirect=1` | `nav-registry-to-index` |
   | `t_link_registry_to_lab` | `link_registry_to_lab` | `p_page_sprint_registry` | `p_page_responsive_lab` | `/responsive-lab.html` | `nav-registry-to-lab` |
   | `t_link_registry_to_inspector` | `link_registry_to_inspector` | `p_page_sprint_registry` | `p_page_fiber_inspector` | `/fiber-inspector.html` | `nav-registry-to-inspector` |
   | `t_link_inspector_to_index` | `link_inspector_to_index` | `p_page_fiber_inspector` | `p_view_index_mcard_viewer` | `/index.html?noredirect=1` | `nav-inspector-to-index` |
   | `t_link_inspector_to_lab` | `link_inspector_to_lab` | `p_page_fiber_inspector` | `p_page_responsive_lab` | `/responsive-lab.html` | `nav-inspector-to-lab` |
   | `t_link_inspector_to_registry` | `link_inspector_to_registry` | `p_page_fiber_inspector` | `p_page_sprint_registry` | `/sprint-registry.html` | `nav-inspector-to-registry` |
   | `t_link_inspector_to_conformance` | `link_inspector_to_conformance` | `p_page_fiber_inspector` | `p_page_fiber_conformance` | `/fiber-conformance.html` | `link-conformance-harness` |

3. **Declare the terminal page.** Add `terminalReason: Snapshot harness. Reached from the Fiber Inspector and left with the browser Back button.` to the binding of `p_page_fiber_conformance`. The validator keeps no list of known binding fields, so no other edit is needed. After this step `npm run check:net` passes again.
4. **Build the nav with literal links.** Create `src/components/WorkbenchNav.astro`. It takes two props, `placeId` and `variant`.
   - It holds a constant `NAV_LINKS` with ten entries. Each entry has `transitionId`, `testId`, `from`, `href`, and `label`, and each value is a literal copied from the table above. The labels are `Portal`, `Responsive UI Lab`, `Sprint Registry`, and `Fiber Inspector`, by target.
   - The frontmatter loads the net as `src/layouts/WorkbenchLayout.astro` does, with `yaml.load` on `src/net/workbench-net.yaml`. It does not import `scripts/check-net.mjs`, which would pull `clm-kernel` into three more page builds. For each entry it reads the binding of `transitionId`. It throws an error that names the Transition when the binding is missing, or when `fromPlaceId`, `triggerHref`, or `triggerSource.selector` differs from the entry.
   - It renders `<nav aria-label="Workbench pages" data-testid="workbench-nav">` with one `<a>` for each entry whose `from` equals `placeId`. Each `<a>` has `href`, `data-testid` set to `testId`, and `data-effect="navigate"`.
   - `variant="inline"` renders the links in a row. `variant="menu"` wraps the same list in `<details class="workbench-nav-menu">` with `<summary data-testid="workbench-nav-summary">Pages</summary>`.
   - Its styles sit in a scoped `<style>` block in the component. They use `color: inherit` and `currentColor`, because the Fiber Inspector links no shared stylesheet and defines its own palette inline.
   - The component ships no script.
5. **Mount the nav on four pages.**
   - `src/pages/sprint-registry.astro`: inside `<header>`, directly before `PresentationControls`, with `placeId="p_page_sprint_registry"` and `variant="inline"`.
   - `src/pages/fiber-inspector.astro`: inside `header.inspector-header`, directly after the `<h1>`, with `placeId="p_page_fiber_inspector"` and `variant="inline"`. Directly after the first `p.note`, add `<p class="note">The <a href="/fiber-conformance.html" data-testid="link-conformance-harness" data-effect="navigate">conformance harness</a> renders every fixture for snapshot tests.</p>`.
   - `src/pages/responsive-lab.astro`: inside `.lab-nav-left`, directly after `#btn-back-home`, with `placeId="p_page_responsive_lab"` and `variant="menu"`. The menu lists the registry and the inspector. The existing `#btn-back-home` remains the link to the portal.
   - `src/pages/index.astro`: directly after `#responsive-ui-lab-btn`, with `placeId="p_view_index_mcard_viewer"` and `variant="inline"`. The existing button remains the link to the Lab.
6. **Update the expected link sets.** In `tests/fixtures/test-config.js`, extend `expectedSameOriginLinks` for four pages. The collector in `tests/fixtures/clm-helpers.js` strips the query and sorts.
   - `index.html` gains `/fiber-inspector.html` and `/sprint-registry.html`.
   - `responsive-lab.html` gains `/fiber-inspector.html` and `/sprint-registry.html`.
   - `fiber-inspector.html` becomes `/fiber-conformance.html`, `/index.html`, `/responsive-lab.html`, and `/sprint-registry.html`.
   - `sprint-registry.html` becomes `/fiber-inspector.html`, `/index.html`, and `/responsive-lab.html`.
7. **Keep the explorer on its pages.** Add `[data-testid^="nav-"]`, `[data-testid="workbench-nav-summary"]`, and `[data-testid="link-conformance-harness"]` to `SKIPPED_SELECTOR` in `tests/bombadil/workbench.bombadil.ts`, `tests/bombadil/lab-smoke.bombadil.ts`, and `tests/bombadil/page-load.bombadil.ts`. In `tests/bombadil/scope.json`, keep the rows `workbench-sprint-registry` and `workbench-fiber-inspector` at `load-only`, and set the `reason` of each to `Read-only developer viewer. The explorer skips the nav links that lead here.`
8. **Regenerate the derived files.** Run `npm run bombadil:nets` and `npm run docs:gen-net`.
9. **Capture layout baselines again** for `index`, `responsive-lab`, and `fiber-inspector`, with `STY_FREEZE=capture` and `STY_FREEZE_PAGES=index,responsive-lab,fiber-inspector`. Add a `rebaselines` entry that names this sprint.

## Files

- Create `src/components/WorkbenchNav.astro`.
- Create `tests/features/workbench-nav.spec.js`.
- Create `docs/sprints/_active/evidence/DCI-02-navigation-closure.md`.
- Edit `scripts/check-net.mjs` and `tests/unit/check-net.test.mjs`.
- Edit `src/net/workbench-net.yaml`.
- Edit `src/pages/sprint-registry.astro`, `src/pages/fiber-inspector.astro`, `src/pages/responsive-lab.astro`, and `src/pages/index.astro`.
- Edit `tests/fixtures/test-config.js`.
- Edit `tests/bombadil/workbench.bombadil.ts`, `tests/bombadil/lab-smoke.bombadil.ts`, `tests/bombadil/page-load.bombadil.ts`, and `tests/bombadil/scope.json`.
- Edit `tests/baselines/layout-baseline.json`.
- Edit `docs/01-architecture/astro-host-and-islands.md`.
- Regenerate `tests/bombadil/generated/workbench-net.ts` and `docs/01-architecture/workbench-net.md`.
- Edit `docs/sprints/_active/DECISIONS.tsv`, `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/dci-plan.md`, and this sprint file, for the status and the DoD ticks.

## BMAD responsibilities

### Product Manager

- Sign off on Flag 1. It confirms the net as the model for links and closes the open decision `open-link-source`.

### UX Designer

- Sign off on the `Pages` menu in the Lab navbar at `1440px`, `820px`, `390px`, and `358px`.

### Architect

- Verify that the nav adds no client script, so the three zero-script pages still ship `0 B` of `_astro/` script.

### Developer

- Verify that a changed `triggerHref` in the net makes `npm run build` fail with the name of the Transition.

### TEA

- Verify that `js/harness/page-state.js` reports the declared Transition for each nav click through `reportTransition`, and no `history:` fallback id.

### Tech Writer

- Update the page table in `docs/01-architecture/astro-host-and-islands.md` to name the nav and the net rule.

## Acceptance criteria

- From each of the four pages, a keyboard user reaches each other page with Tab and Enter.
- After each nav click, `window.__netReport` on the landing page holds a report whose `transitionId` is the Transition in the table above.
- Removing the `terminalReason` from `p_page_fiber_conformance` makes `npm run check:net` fail with `page-place-without-link`.
- On `/fiber-conformance.html`, the PNG snapshots and the layout baseline do not change. The only markup change is the `data-nav-arcs` attribute on `body`, which lists every nav arc of the net.
- A Bombadil run that starts on the Lab stays on the Lab.

## Test design

- `tests/features/workbench-nav.spec.js` walks all `11` links, asserts the landing URL, and asserts the reported Transition. It runs the Lab menu case at `358px`.
- `tests/unit/check-net.test.mjs` gains the four cases of step 1.
- The four smoke specs under `tests/smoke/` pass against the new link sets.
- The whole features project runs. It includes `tests/features/explorable-gui.spec.js`, which audits every control on five routes for a `data-testid`, and `tests/features/host-responsive-tiers.spec.js`, which audits overflow at five widths.

## Non-goals

- A nav on `/fiber-conformance.html` or on `/pkc-docs-index.html`.
- A proof that every declared arc has a rendered anchor. The new rule reads net arcs. The trigger-drift check in `scripts/gen-bombadil-nets.mjs` proves the selector literal for the eleven new links only. The older arc `t_link_docs_to_index` describes a Penpot flow that the static docs page does not render. The docs index therefore passes the rule and still has no way back. This sprint leaves that as it is, and the backlog records it.
- One first-visit theme. The Fiber Inspector declares light, the Lab and the registry declare dark, and the portal follows the system preference. The backlog holds it.
- A client router or Astro view transitions. The open decision `open-client-router` stays open.
- A row in `tests/gui-coverage.json`. No existing `link` Transition has one.

## Definition of done

- [ ] **DoD-DCI-02-01.** All `11` links exist in the net and in the pages, and each reports its declared Transition. Verified by `npx playwright test tests/features/workbench-nav.spec.js --project=features`.
- [ ] **DoD-DCI-02-02.** The net rule exists, has its unit cases, accepts a stated terminal page, and passes on the real net. Verified by `grep -q "page-place-without-link" scripts/check-net.mjs && test "$(grep -c "page-place-without-link" tests/unit/check-net.test.mjs)" -ge 3 && grep -q "terminalReason" src/net/workbench-net.yaml && node --test tests/unit/check-net.test.mjs && npm run check:net`.
- [ ] **DoD-DCI-02-03.** Every selector literal is in its source file, the generated files are fresh, and zero-script pages ship no `_astro/` script. Verified by `npm run check:bombadil-nets && npm run docs:check && npm run build && node tests/performance/place-bytes.mjs --enforce-zero-island-places`.
- [ ] **DoD-DCI-02-04.** The smoke link sets, every feature spec, and the layout at four widths hold. Verified by `npm run test:smoke && npm run test:features && npm run stageshow:sweep -- --strict`.
- [ ] **DoD-DCI-02-05.** Evidence and the completion row are recorded with the remaining core gates green. Verified by `test -s docs/sprints/_active/evidence/DCI-02-navigation-closure.md && grep -qE $'\tDCI-02-complete\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:playwright-discovery && npm run test:unit`.
