# Sprint GQC-04: GUI module ownership and lifecycle

## Metadata

- Sprint ID: `SPRINT-GQC-04`
- Handle: `urn:pcard:sprint:SPRINT-GQC-04`
- Status: `COMPLETED`
- Depends on: `SPRINT-GQC-03`
- Unblocks: `SPRINT-GQC-05`
- Execution unit: `PR-GQC-04`
- Poteto playbook: `architect`, `principle-model-the-domain`, and `principle-minimize-reader-load`
- BMAD roles: Product Manager, Architect, Analyst, TEA, Dev, UX Designer

## Outcome

Build a guided SPA test workflow in the Responsive UI Lab and give its page composition a clear owner. The user can select a target, choose a device, inspect its declared Pages and Places and Functional Links and Transitions, run the existing capture or replay flow, and inspect the resulting MCard evidence.

This is not a second recorder. Reuse the ERB capture, replay, device, and conformance modules. Keep each interface small and extract a module only when GQC-00 proves that it hides repeated behavior.

GQC-02B already runs the workbench on Astro with Preact islands. This sprint does not change the framework. It decides which island owns each interactive region, and it adds the guided workflow as one island. The guide's step model stays a plain module, `js/harness/spa-test-workflow.js`, that the island mounts. The guide's steps are Places in the workbench net, and moving between steps that change a URL or call the server is a declared Transition.

Use the [MCard_TDD design contract](./INDEX.md#mcard_tdd-design-contract). A CLM transition describes a target-app action. Playwright performs and verifies the real browser action.

Two nets stay separate. The workbench net in `src/net/workbench-net.yaml` describes the Lab's own pages and server calls. A target net describes the selected application's Pages and Functional Links. Both use the GQC-02A envelope and the same checker. Neither net references the other's Place IDs.

## Current architecture facts

- `js/app-entry.js` constructs the landing page components and passes a module list directly to `PKC.init()`.
- `modules.json` declares a different set of modules, including `tic-tac-toe-p2p`.
- `js/pkc-core.js` dynamically imports modules and calls `init()` and `start()`. It catches load errors, but the module contract does not define cleanup.
- `js/cubical-core.js` stores components in a map. `AppEntry` looks up the auth status component by a string key.
- `responsive-lab.html` already composes device, viewport, target, capture, recorder, and conformance modules from `js/harness/`. After GQC-02B, `src/pages/responsive-lab.astro` composes them as Preact islands recorded in `evidence/GQC-02B-island-map.md`.
- `app.html` remains `astro-wrapped` after GQC-02B. Its inline script, `window.open` calls, and `location.href` navigation are not yet islands.
- `js/nav.js` is generated from PenPot and describes LandingPage navigation. It is not the route map for the selected target application.
- `clm-kernel@0.0.12` exports `Layer4TrellisNavigationNet`. Its view type URI is distinct from the `mcard:route:/...` handle in `js/nav.js`. Its `ViewPlaceMCard` and `NavigationTransitionPCard` are type aliases of the Layer 1 card types, so a Layer 1 target net can be presented through the Layer 4 facade without conversion.
- The `clm-kernel` package root imports Node `crypto` at top level. Astro page frontmatter runs in Node at build or request time and may import the kernel. Islands run in the browser and may not.
- `js/redux/store.js` and `js/store/store.js` configure separate Redux stores and separate auth slices.
- Runtime pages expose globals such as `window.app`, `window.__REDUX_STORE__`, and the Responsive Lab's `window.__lab` interface.

These facts do not prove that the module lists or stores should be merged. GQC-04 maps consumers and chooses only contracts that callers actually share.

## Work sequence

1. Draw one page-to-entry-point map for the workbench and each approved LandingPage surface. For each Astro page, list its islands, their directives, and the vanilla module each island mounts.
2. Map every module descriptor to the page that loads it and the package or browser source it imports.
3. Write characterization tests for component registration, module startup order, failure reporting, and cleanup.
4. Design the P0 Lab guide from target selection through MCard result inspection. Include loading, unsupported, blocked, unavailable, and completed states. Record which guide steps are views of one Place and which cross a declared Transition.
5. Represent a target Page or View as a Place and a Functional Link as a Transition in a target net that uses the GQC-02A envelope. Present it through the Layer 4 `Layer4TrellisNavigationNet` facade only where that facade adds verified behavior. Keep route handles separate from CLM type URIs.
6. Load and check the target net in Astro page frontmatter or a Node endpoint. Pass the checked Places and Transitions to the guide island as serialized props. Do not import `clm-kernel` into an island or put its execution engine in the browser unless a browser build and Playwright contract test prove that path works.
7. Use the existing target membrane and ERB recorder, replay, and device modules. Do not create a second target writer, recorder, or replay engine.
8. Keep graph persistence and run-receipt versioning within the GQC-05 MCard contract. Do not add a field to the closed `responsive_test_run:v1` schema here.
9. Identify one high-value seam with repeated decisions or multiple real callers. Design two interface options and select the smaller one.
10. Accept dependencies at the seam. Keep environment construction in the composition root. On an Astro page, the composition root is the island that mounts the module, not the page frontmatter.
11. Migrate callers before removing an old global or module entry point. Add disposal only for resources current modules allocate.
12. Keep PenPot MPA assessment out of the P0 guide unless GQC-00 records Product Manager approval.
13. Decompose `app.html` into islands only for regions the ownership map assigns. Each `window.open` and `location.href` call becomes a declared `open-external` or `link` Transition before the region moves.
14. Close every island cleanup gap that GQC-02B recorded for this sprint.

## Files in the implementation PR

- `src/pages/responsive-lab.astro`
- `src/islands/SpaTestWorkflow.jsx`, the guide island that mounts `spa-test-workflow.js`
- `src/islands/` for the Lab, limited to ownership changes named in the island map
- `src/pages/app.astro` and its islands, only for regions the ownership map assigns
- `src/net/workbench-net.yaml`, adding guide Places and Transitions and any `app.html` Transitions moved into islands
- `js/harness/`, limited to the guided workflow and current target, capture, and recorder interfaces
- `js/harness/spa-test-workflow.js`, the guided workflow state and visible step model
- `js/app-entry.js`, `js/cubical-core.js`, and `js/pkc-core.js` only if the selected composition map assigns them to the guided flow
- `modules.json`, only if GQC-00 assigns it to the selected page composition
- Read-only input from `docs/sprints/_active/evidence/GQC-00-consumer-map.md`, produced by PR-GQC-00
- Read-only input from `docs/sprints/_active/evidence/GQC-02B-island-map.md`, produced by PR-GQC-02B.2
- One exact module entry named by that read-only map, if a shared seam qualifies
- `tests/unit/pkc-lifecycle.test.mjs`
- `tests/unit/spa-test-workflow.test.mjs`
- `tests/features/spa-test-workbench.spec.js`
- Existing lifecycle specs only for the selected page composition
- The owning architecture spec, including the island ownership map
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator for approved module ownership decisions

Do not edit the consumer map, either store, or multiple page module directories in this PR. Do not add a parallel graph store. If the selected seam crosses another owner, split a follow-up PR with its own tests and file boundary.

## BMAD responsibilities

### Product Manager

- Approve the P0 SPA target and the visible guide steps.
- Keep optional PenPot MPA assessment outside the P0 journey unless separately approved.

### Architect

- Own the page composition map and module interfaces.
- Own the island ownership map: one owner per island, one island per independently interactive region.
- Use depth, locality, and actual call sites to justify each extraction.
- Reject pass-through wrappers and an unneeded general plugin system.
- Reject an island whose only job is to forward props to another island.

### Analyst

- Confirm which pages share a user journey and which stores have different owners.
- Record runtime differences as observed, not as assumed duplication.

### TEA

- Write behavior tests before moving code.
- Verify module start order, optional failure, refresh, and cleanup.
- Assert user-visible outcomes rather than private method calls.

### Dev

- Move one seam at a time and keep the existing interface until callers migrate.
- Inject browser and storage dependencies where that makes a module testable.
- Avoid adding a new layer when an existing page composition can own the decision.

### UX Designer

- Review any changed loading, error, auth, or connection state shown in the GUI.
- Confirm the new composition does not alter focus or keyboard behavior.

## Stories and acceptance criteria

### GQC-04.1 Map page composition roots

- [x] Every supported page names its HTML entry, boot script, module list, state store, and user-visible ready marker.
- [x] Every Astro page names its islands, each island's directive, owner, mounted module, and cleanup path.
- [x] The map identifies the Responsive Lab workbench separately from the target application's Pages and Places.
- [x] `PKC.init()` configuration and `modules.json` have an explicit owner and runtime scope.
- [x] The map identifies globals that tests or callers still use.
- [x] Every page in the map is a Place in `workbench-net.yaml`, and every outgoing link or `window.open` on that page is a declared Transition.

### GQC-04.2 Define module lifecycle contracts

- [x] Required and optional modules have distinct behavior when loading fails.
- [x] A module that allocates a listener, timer, socket, or observer exposes a tested cleanup path.
- [x] Initialization order is explicit where one module depends on another.
- [x] A module with no cleanup resources does not gain a ceremonial `dispose()` method.
- [x] Every island that mounts a module with cleanup resources calls that cleanup on unmount. The GQC-02B cleanup gaps assigned to this sprint are closed.

### GQC-04.3 Extract one reusable module

- [x] The selected module hides a decision that at least two real callers would otherwise repeat.
- [x] The interface states inputs, outputs, ordering, errors, configuration, and cleanup.
- [x] Unit tests use injected dependencies instead of constructing real browser services.
- [x] At least two callers use the same interface before the old duplicated path is removed.
- [x] If no module has two real callers or a costly repeated decision, record a no-extraction decision and test the current contract instead.

### GQC-04.4 Resolve state ownership

- [x] Every store and slice maps to a page and data owner.
- [x] Duplicate auth state is merged only if the same user state crosses both store contracts.
- [x] A global is removed only after its callers move to an explicit interface.
- [x] The test API exposes one documented namespace per page, not a growing set of undocumented globals.

### GQC-04.5 Guide an SPA test journey

- [x] The Responsive Lab guides users through target selection, device setup, Page and Place inspection, Functional Link and Transition inspection, capture or replay, and result inspection.
- [x] The UI labels the target type and does not present `app.html` as an SPA until the Product Manager approves that classification.
- [x] Each Page row exposes its stable Place ID and target route handle. Its CLM type URI remains a separate value.
- [x] Each Functional Link row exposes its source Transition, action name, and destination or error Place.
- [x] A missing or invalid target action shows the declared error state and never reports a successful navigation.
- [x] The guide uses the existing ERB capture and replay modules. It does not implement a second recorder or Playwright runner.
- [x] `spa-test-workflow.js` owns the guide's step state and accepts the Lab target, device, and recorder interfaces as dependencies. It does not execute target-app code or import `clm-kernel`.
- [x] The result view shows the existing MCard test-run handle or hash. Graph-to-run persistence follows the GQC-05 schema decision.
- [x] An interrupted capture is labeled incomplete and never shown as a pass or certification.
- [x] The workbench labels MPA assessment as optional or deferred until the Product Manager approves a target and route set.
- [x] Keyboard focus and status announcements cover each workflow step, blocked state, and result.
- [x] The guide does not count PenPot MPA links as supported target transitions without Product Manager approval and a live Playwright assertion.
- [x] The guide is one Preact island that mounts `spa-test-workflow.js`. Its directive and owner appear in the island map.
- [x] The guide island receives the checked target net as serialized props from Astro frontmatter or a Node endpoint. It does not import `clm-kernel`.
- [x] Guide steps that change the URL or call the server fire declared workbench Transitions. A Playwright trace of the P0 journey replays through the workbench net without a disabled Transition.
- [x] The target net and workbench net share no Place or Transition IDs, and the checker validates both.

## Verification

- Run `npm run test:unit`.
- Run `npm run test:smoke`.
- Run `npm run check:net`.
- Run the module-specific characterization and lifecycle specs.
- Run `npx playwright test tests/features/spa-test-workbench.spec.js --project=features`.
- Run the approved module lifecycle specs. Keep auth, WebRTC, AI, and offline flows outside P0 until approved.
- Replay the P0 journey trace through the workbench net and the target net.
- Compare the user-visible state on trunk and head before deleting any old caller.

## Non-goals

- Do not add React or another UI framework. Astro with Preact islands is the approved stack (decision recorded 2026-10-27, superseding the earlier "no Astro" non-goal).
- Do not rewrite ERB modules as Preact components. Islands mount the existing modules.
- Do not enable Astro's client router without a recorded decision and lifecycle tests for every island that survives a swap.
- Do not combine `js/redux/` and `js/store/` based only on similar filenames.
- Do not centralize `modules.json` and inline module configuration until page ownership is known.
- Do not remove all browser globals in one pass.
- Do not add a generic event bus or lifecycle container without multiple concrete consumers.
- Do not add a module layer solely to satisfy the sprint title.
- Do not add PenPot MPA support to the P0 SPA guide.
- Do not import or execute target-app code through the CLM navigation model.

## Definition of done

- [x] The page-to-entry-point map matches the actual imports and browser behavior.
- [x] The guided P0 SPA flow presents target type, Page and Place, Functional Link and Transition, capture or replay, and MCard result states.
- [x] The Layer 4 mapping keeps route handles separate from CLM type URIs and reports invalid links through an explicit error Place.
- [x] The island ownership map is committed, every island has one owner, and no island imports `clm-kernel`.
- [x] The workbench net and target net pass `check:net`, and the P0 journey replays through both.
- [x] Each extracted module has a small interface, tested implementation, and named owner.
- [x] If no extraction passed the two-caller test, the no-extraction rationale and contract test are recorded.
- [x] Tests cover boot order, error behavior, refresh, and resource cleanup.
- [x] Callers migrate before any legacy interface is removed.
- [x] No user-visible interaction changes without a screenshot, Playwright assertion, and UX review.
- [x] The Architect and TEA approve the resulting module map.
- [ ] The operator approves the handoff to GQC-05.
