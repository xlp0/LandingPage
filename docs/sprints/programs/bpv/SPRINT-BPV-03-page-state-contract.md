# SPRINT-BPV-03 Page state contract

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-BPV-03` |
| Handle | `urn:pcard:sprint:SPRINT-BPV-03` |
| Status | `COMPLETED` |
| Depends on | `SPRINT-BPV-02` |
| Unblocks | `SPRINT-BPV-04`, `SPRINT-BPV-05` |
| Execution unit | `PR-BPV-03` |
| Poteto playbook | `feature` with `principle-redesign-from-first-principles`, `principle-migrate-callers-then-delete-legacy-apis` and `principle-model-the-domain` |
| BMAD roles | Architect, UX Designer, Developer, TEA |
| Effort | 3 days (guess) |

## Outcome

Every page tells a reader, human or Bombadil, what it is and whether it is ready, in one place and one vocabulary. The page state contract in the [program plan](./bpv-plan.md#page-state-contract) becomes real, and the six readiness dialects it replaces are deleted.

Today each page invents its own signal. The lab sets a `lab-booting` class on the body. Fiber conformance sets `data-harness-ready` on the body. Fiber inspector and the sprint registry each set `data-ready` on a status element. The Spa Test Workflow island sets `data-workflow-ready`, and the Target Toolbar island sets `data-toolbar-ready` on `#pane-url-bar`. The MCard viewer and Mission Control expose nothing. A Bombadil spec would need a branch per page. A user sees six different loading treatments.

One page file is two places. `src/pages/index.astro` is `p_page_index` when loaded at the top level without `noredirect`, where it immediately redirects to the lab. With `?noredirect=1`, or inside a frame, it is `p_view_index_mcard_viewer`. A static place per file cannot express that, so the place is chosen at runtime from a declared list.

If the program had been designed in from the start, the shared layout would own page identity and readiness, and each page would report into it. That is what this sprint builds (decision BPV-D01).

## Work sequence

1. Run GitNexus `impact` upstream on the layout's render, on `renderPlace` in the SPA fixture and on the `popstate_sync` mapping in `js/harness/spa-test-workflow.js`. Record the blast radius in the PR.
2. Give `src/layouts/WorkbenchLayout.astro` `netId` (default `'landingpage-workbench-net'`) and `placeIds` props, passed as a single-entry list for every migrated page except multi-view `src/pages/index.astro`. The layout renders `data-net-id`, renders `data-place-id` when `placeIds` has one entry, always renders `data-place-ids`, `data-nav-arcs`, and `data-page-state="loading"`, and adds the `#page-status` and `#page-alert` live regions as visually hidden elements.
3. Write `js/harness/page-state.js`. It owns `data-place-id` for multi-place pages, `data-page-state`, `data-page-error` and `data-boot-nonce`, and the bounded `window.__netReport` log of firing records. It exports `setPageState`, `setPlace` and `reportTransition`. It writes error text into `#page-alert` and status text into `#page-status`. `setPlace` rejects a place outside the page's declared list.
4. Report firings across documents. A link firing unloads the page that fired it, so its record would be lost with that document's log. Before unload, `page-state.js` stores the current place and boot nonce in `sessionStorage`. On load, if the stored record has a different nonce, the arriving page reports the firing from the stored place to its own place. It names the single declared transition between them, or records no transition ID when none or several match, which the specs then flag.
5. Pass `placeIds` from each of the six pages. In `src/pages/index.astro`, the existing redirect script calls `setPlace('p_page_index')` and `setPageState('redirecting')` before it redirects, and `setPlace('p_view_index_mcard_viewer')` otherwise. Extend `src/integrations/net-parity.mjs` so the build fails when a page's `placeIds` include a place that is not a declared page or view place, or when a route bound to one of those places resolves outside the list.
6. Migrate the six dialects and delete them in the same change (decision BPV-D02). Each page calls `setPageState('ready')` where it sets its old signal today, and `setPageState('error', code)` where it reports failure. The lab's `body.lab-booting` CSS rules become `body[data-page-state="loading"]` rules. Update the Playwright callers directly to read the new contract attributes.
7. Give every island root `data-island-state`, replacing `data-workflow-ready`, `data-toolbar-ready` and `data-mcard-result-state`. Give the Recording Ribbon root `data-recorder-state`, fed by the state machine's listeners, so the recorder state is visible on every workflow step and not only inside the hidden step 5 panel.
8. Align the SPA fixture with the same body contract: `document.body` now carries `data-place-id`, `data-place-ids`, `data-page-state`, and `data-boot-nonce` (mirrored alongside `#spa-app-root` so existing Playwright assertions keep passing), and the fixture reports each firing through `reportTransition`. Back and Forward report the declared transition ID instead of `popstate_sync`. Delete the `popstate_sync` mapping in `js/harness/spa-test-workflow.js` once nothing emits it. Update `tests/bombadil/spa-target.bombadil.ts` to read `data-place-id` and `data-boot-nonce` from `document.body`.
9. Check the per-place JavaScript gate from Program GQC. `js/harness/page-state.js` is not an island. If `tests/performance/place-bytes.mjs` counts it against the island-free places, record the measured bytes and the decision in `DECISIONS.tsv`.
10. Run GitNexus `detect_changes` before committing and confirm that only the expected symbols and flows changed.

## Files

- Create `js/harness/page-state.js`
- Create `tests/unit/page-state.test.mjs`
- Create `tests/features/page-state-contract.spec.js`
- Update Playwright callers directly (no separate `scripts/codemods/bpv-03-readiness.mjs` script retained in the repository)
- Edit `src/layouts/WorkbenchLayout.astro`
- Edit `src/pages/index.astro`
- Edit `src/pages/app.astro`
- Edit `src/pages/responsive-lab.astro`
- Edit `src/pages/sprint-registry.astro`
- Edit `src/pages/fiber-inspector.astro`
- Edit `src/pages/fiber-conformance.astro`
- Edit `src/islands/SpaTestWorkflow.jsx`
- Edit `src/islands/MCardResultIsland.jsx`
- Edit `src/islands/RecordingRibbonIsland.jsx`
- Edit `src/islands/TargetToolbarIsland.jsx`
- Edit `js/harness/lab-runtime.js`
- Edit `js/harness/spa-test-workflow.js`
- Edit `src/integrations/net-parity.mjs`
- Edit `tests/unit/net-parity.test.mjs`
- Edit `tests/fixtures/spa-test-target.html`
- Edit `tests/bombadil/fixtures/spa-test-target-canary.html`
- Edit `tests/bombadil/spa-target.bombadil.ts`
- Edit the Playwright specs directly to read `data-page-state` / `data-island-state` / `data-recorder-state` instead of the legacy signals

## BMAD responsibilities

### Architect

- Own the contract names. A rename after this sprint needs a decision row.
- Review the net-parity extension, because it makes the build the first place a wrong `placeId` is caught.

### UX Designer

- Check that every page shows one loading treatment and one error treatment, and that screen readers announce both through the live regions.

### Developer

- Land the layout props and the parity check first, then migrate one page per commit.
- Keep `js/harness/page-state.js` free of framework imports, so every page can load it.

### TEA

- Confirm the codemod changed only readiness waits, and that no spec lost an assertion.

## Acceptance criteria

- Every page renders `data-net-id`, `data-place-id` and `data-page-state` on `<body>`, and reaches `ready` or `error` after load. The redirecting index place reaches `redirecting` instead.
- A page whose declared places disagree with its routes fails the build.
- A link from one page to another appears in the arriving page's `__netReport` with the declared transition ID.
- None of the six old readiness signals remain in `src`, `js` or `tests`.
- The recorder state is readable from the ribbon root at every workflow step.
- The SPA fixture reports declared transition IDs for Back and Forward, and nothing emits `popstate_sync`.
- The existing Playwright projects and the per-place JavaScript gate pass.

## Test design

- `tests/unit/page-state.test.mjs` covers the state values, the error code, the bounded log and the live region text with a DOM stub.
- `tests/features/page-state-contract.spec.js` loads each in-scope page and asserts the body contract and the ready state.
- `tests/unit/net-parity.test.mjs` gains a case with a seeded wrong `placeId`.

## Non-goals

- Test ids and side-effect tags on controls, which are BPV-04.
- Mirroring the iframe target's place onto the host, which is BPV-06.
- Request-lifecycle places, which stay with the Playwright net tracer.

## Definition of done

- [x] **DoD-BPV-03-01** The page state module behaves as specified. Verified by `node --test tests/unit/page-state.test.mjs`.
- [x] **DoD-BPV-03-02** A wrong declared place fails the build check. Verified by `node --test tests/unit/net-parity.test.mjs && npm run build`.
- [x] **DoD-BPV-03-03** The old readiness signals and `popstate_sync` are gone. Verified by `! grep -rnE 'lab-booting|data-harness-ready|harnessReady|data-workflow-ready|data-toolbar-ready|data-mcard-result-state|data-ready|dataset\.ready|popstate_sync' src js tests`.
- [x] **DoD-BPV-03-04** Every page meets the body contract and the existing suites pass. Verified by `npx playwright test tests/features/page-state-contract.spec.js --project=features && npm run test:smoke && npm run test:features`.
- [x] **DoD-BPV-03-05** The per-place JavaScript gate passes and the SPA spec still runs clean. Verified by `node tests/performance/place-bytes.mjs --enforce-zero-island-places && npm run bombadil:spa -- --time-limit 2m`.
