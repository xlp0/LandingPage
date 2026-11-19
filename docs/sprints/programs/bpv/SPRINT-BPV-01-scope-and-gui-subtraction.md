# SPRINT-BPV-01 Scope and GUI subtraction

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-BPV-01` |
| Handle | `urn:pcard:sprint:SPRINT-BPV-01` |
| Status | `COMPLETED` |
| Depends on | `SPRINT-BPV-00` with a recorded decision to continue |
| Unblocks | `SPRINT-BPV-02` |
| Execution unit | `PR-BPV-01` |
| Poteto playbook | `refactoring` with `principle-subtract-before-you-add` and `principle-experience-first` |
| BMAD roles | Product Manager, UX Designer, Developer, TEA |
| Effort | 2 days (guess) |

## Outcome

The program knows exactly which pages it explores. The pages lose the controls, listeners and copy that do nothing, claim something false or duplicate another control. Removal comes first, so that BPV-03 and BPV-04 add their contract to a smaller GUI.

Random exploration spends its budget on what is on the page. A hidden button, a listener for an element that does not exist and a second link to the same place each cost actions and prove nothing. The same items also confuse human users.

## Work sequence

1. Write `tests/bombadil/scope.json`. It has one row for each of the 21 surfaces in `tests/gui-coverage.json`, keyed by `surfaceId`. Each row has `netId`, `startUrl`, `scope` (`explore`, `load-only`, `boundary` or `none`) and a reason. Surfaces with no URL, such as blocked external targets, get `none`. The explored rows follow the scope table in the [program plan](./bpv-plan.md#scope). Decision BPV-D10 explains why this is a side file.
2. Write `tests/unit/bombadil-scope.test.mjs`. It fails when a `surfaceId` is missing from the registry, when a row has no reason, or when an `explore` or `load-only` start URL does not resolve to a declared page or view place of the row's own net. It resolves each URL against a fixed test origin, because `resolvePlaceForUrl` needs an absolute URL. The SPA fixture row names `spa-test-target-net`, whose places the workbench net does not contain.
3. Remove what does nothing. Each removal below was measured on 2026-11-17. Run GitNexus `impact` upstream on each function you delete or change first.
   - The hidden alias buttons `#mission-control-sidepane-btn`, `#responsive-ui-lab-sidepane-trigger` and `#mission-control-sidepane-trigger` in `src/pages/index.astro`. No code and no test references them.
   - The listeners in the `src/pages/index.astro` script for `fibration-observability-btn`, `least-action-btn`, `least-action-card`, `deployment-inspector-btn` and `deployment-inspector-card`. No element with those ids exists in `src`, `js` or `public`.
   - `openMissionControlSplit` in `src/pages/index.astro` and its listeners on `mission-control-btn`, `mission-control-split-btn`, `mission-control-card` and `mission-control-link`. None of those elements exist, so this is also the page's only `window.open` call.
   - Bring the `#faro-status-badge` "Connected" badge and the static "Online" text in `src/pages/index.astro` to the UX Designer. A `FaroDeploymentUnitCollector` does post to a local receiver, but the badge is static and never reflects whether that receiver answered. Either bind both to the collector's real state or remove them.
   - The tests in `tests/features/presentation-lattice.spec.js` that target the elements above. Delete them in the same change and record a decision row. They test controls that no longer exist.
4. Remove sprint copy aimed at internal readers. That means the "Sprint CDO-12" badge, the `#cors-notice-banner` aside that describes a past sprint, and the "INV-CDO-20 and INV-CDO-21 Certified" footer in `src/pages/responsive-lab.astro`. Also remove the CSS rules that only those elements used, `.real-estate-banner`, `.real-estate-tag` and the `.cors-notice-*` rules in `public/css/semantic-tokens.css`. Keep the `.lab-badge` rule, which `js/harness/recording-ribbon.js` reuses, and the `sprintNumber` data in `js/runtime/least-action-navigator.js`, which the navigator reads. Migrate the banner assertions in `tests/features/presentation-lattice.spec.js`.
5. Fix the Pop Out control. `#mission-control-popout-btn` is an anchor with `href="app.html" target="_blank"`. Its click handler in `js/harness/lab-toolbar.js` also calls `window.open` on the current target without `preventDefault`. Make it a `<button>` that opens only the current target. Keep its id, because `tests/features/responsive-lab-islands.spec.js` uses it. Keep `#btn-nav-mission-control` as the one link to Mission Control.
6. Move the 1,080 lines of inline CSS in `src/pages/responsive-lab.astro` to `public/css/responsive-lab.css`, loaded with one link tag in the same position. Do not change any rule. The page file should end under 300 lines.
7. Bring three product decisions to the Product Manager and record all three in `DECISIONS.tsv`.
   - The default target is `/app.html` in three places in `js/harness/lab-toolbar.js`. The proposal is to make the SPA fixture the default, because the guided workflow starts from it and `/app.html` is out of scope.
   - The "GovTech OS" link `#btn-back-home` goes to `/`, which redirects top-level visits straight back to the lab. The proposal is to point it at the MCard viewer `/index.html?noredirect=1`, with a matching change to `t_link_lab_to_index` in `src/net/workbench-net.yaml`.
   - The Penpot design and the workbench net initially disagreed about the portal navigation, as described in step 8. The accepted resolution added `p_page_docs_index` along with `t_link_viewer_to_docs` (`src/pages/index.astro`) and `t_link_docs_to_index` (`js/nav.js`), and retired the stale `t_link_viewer_to_app` link trigger.
8. Resolve the Playwright baseline failures, following the dispositions in the [BPV-00 evidence](./evidence/BPV-00-feasibility.md).
   - Fix the navigation renderer and reconcile the navigation. `scripts/penpot-render.mjs` wrote only the root `index.html`, which the server no longer serves since GQC-02B. It now also renders `src/pages/index.astro` between the same markers. The Penpot design declared a two-page flow (Home and Docs Index), which was reconciled in `src/net/workbench-net.yaml` by adding `p_page_docs_index`, `t_link_viewer_to_docs`, and `t_link_docs_to_index` alongside `t_link_viewer_to_index` and `t_link_viewer_to_lab` so the build's net-parity gate passes.
   - Delete the tests in `tests/features/presentation-lattice.spec.js` and `tests/features/correctness-inspector.spec.js` that target controls removed on purpose in commit `9e08c3c`. Update test 11 to the current `#cors-block-alert` copy.
   - Investigate presentation-lattice test 5, the responsive layout invariance check, and fix the layout if it is a real defect.
   - Keep `js/runtime/deployment-inspector.js` and `js/runtime/least-action-navigator.js`. The page still mounts the navigator and exposes the inspector as `window.__deployment_inspector`, which `tests/features/style-audit.spec.js` uses. Retarget `tests/features/correctness-inspector.spec.js` to open the inspector that way.
   - Re-baseline the layout freeze once, after every removal above has landed. The baseline belongs to the root repository's STY program, so record the re-baseline there with a `rebaselines` entry naming GQC-02B and BPV-01.
9. Run GitNexus `detect_changes` before committing and confirm that only the expected symbols and flows changed.

## Files

- Create `tests/bombadil/scope.json`
- Create `tests/unit/bombadil-scope.test.mjs`
- Create `public/css/responsive-lab.css`
- Edit `src/pages/index.astro`
- Edit `src/pages/responsive-lab.astro`
- Edit `js/harness/lab-toolbar.js`
- Edit `scripts/penpot-render.mjs` so it also renders the navigation into `src/pages/index.astro`
- Edit `public/css/semantic-tokens.css`
- Edit `src/net/workbench-net.yaml` for the approved home-link and portal-navigation decisions (`p_page_docs_index`, `t_link_viewer_to_docs`, `t_link_docs_to_index`)
- Edit `tests/features/presentation-lattice.spec.js`
- Edit `tests/features/correctness-inspector.spec.js`
- Create `tests/features/lab-popout.spec.js`
- Edit `docs/sprints/_active/DECISIONS.tsv`

## BMAD responsibilities

### Product Manager

- Approve the scope file and all three product decisions (default target, home link, and portal navigation).
- Confirm that no removed control is a feature a user relies on.

### UX Designer

- Review each removal on the rendered pages at desktop and phone widths.
- Confirm the CSS move leaves the lab visually unchanged.

### Developer

- Make each removal a separate commit with the test migration it needs, so any one can be reverted alone.
- Keep ids that tests use.

### TEA

- Run the full features project after every removal commit, not once at the end.

## Acceptance criteria

- Every surface in the registry has exactly one scope row with a reason.
- No removed id appears anywhere in `src`, `js`, `public` or `tests`.
- Pop Out opens exactly one tab, and that tab shows the current target.
- `src/pages/responsive-lab.astro` is under 300 lines and contains no "Sprint" or "Certified" text.
- The lab renders the same before and after the CSS move.
- All three product decisions (default target, home link, and portal navigation) are recorded with an owner.

## Test design

- `tests/unit/bombadil-scope.test.mjs` is the scope gate described above.
- The Pop Out fix gets a features assertion that counts opened pages through the Playwright context.
- Screenshot the lab at 1440 and 390 pixels wide before and after the CSS move and compare them with the existing Playwright snapshot tooling.

## Non-goals

- Adding state attributes or test ids. That is BPV-03 and BPV-04.
- Retiring `/app.html`, which needs its own characterization first.
- Merging the duplicate arrangement and recorder controls. BPV-04 does that, because its lint checks the result.

## Definition of done

- [x] **DoD-BPV-01-01** The scope file covers every registry surface and every explored start URL resolves to a declared place. Verified by `node --test tests/unit/bombadil-scope.test.mjs`.
- [x] **DoD-BPV-01-02** The dead aliases, dead listeners and internal sprint copy are gone. Verified by `! grep -rnE 'sidepane-(btn|trigger)|least-action-(btn|card)|fibration-observability-btn|deployment-inspector-(btn|card)|mission-control-(btn|split-btn|card|link)\b|openMissionControlSplit|cors-notice-banner' src js public tests && ! grep -rnE 'Sprint CDO-12|INV-CDO-20' src public tests`.
- [x] **DoD-BPV-01-03** The lab page is under 300 lines. Verified by `test "$(wc -l < src/pages/responsive-lab.astro)" -lt 300`.
- [x] **DoD-BPV-01-04** Pop Out opens one tab with the current target, and the suites show no failure beyond the BPV-00 baseline. Verified by `npm run test:smoke && npm run test:features && npm run test:components`.
- [x] **DoD-BPV-01-05** The default target, home link and portal navigation decisions are recorded. Verified by `grep -cE '^[^[:space:]]+[[:space:]]+BPV-01[[:space:]]+BPV-01 (default target|home link|portal navigation):' docs/sprints/_active/DECISIONS.tsv | grep -qx 3`.
