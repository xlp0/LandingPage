# Layer 4 and Layer 1 kernel probe evidence

## Metadata

- Sprint ID is `SPRINT-GQC-00`.
- Execution unit is `PR-GQC-00`.
- Pinned package in `package.json` and `package-lock.json` is `clm-kernel@0.0.12`.
- Tarball URL in `package-lock.json` is `https://registry.npmjs.org/clm-kernel/-/clm-kernel-0.0.12.tgz`.
- Tarball integrity in `package-lock.json` is `sha512-XhAe2H2p+zx92PHQ8D3mZknlOMtzLs/cZUI5Upk7DoLPV0DiNRlPnkt4gmDBy+pXckbaWZYSiO61DJkkkXatow==`.
- Sibling workspace source at `../clm/kernel/clm_js_core/package.json` is `0.0.13`, which is not resolved by `LandingPage`.

## Reproduction command

Run the following command from `LandingPage` after `npm ci`:

```bash
node --input-type=module <<'EOF'
import { Layer4TrellisNavigationNet } from 'clm-kernel';
import {
  parsePetriNetYaml,
  IncidenceMatrix,
  ColoredPetriVM
} from 'clm-kernel/layer1';

const decoder = new TextDecoder();
const decodeReceipt = (receipt) =>
  JSON.parse(decoder.decode(Uint8Array.from(Object.values(receipt.card.content))));

const net = new Layer4TrellisNavigationNet();
net.registerViewPlace('p_home', 'clm://type/view/home', { role: 'Entry' });
net.registerViewPlace('p_dashboard', 'clm://type/view/dashboard', { role: 'Intermediate' });
net.registerHyperlink('p_home', 'open_dashboard', 'p_dashboard');

const transitionsBeforeInvalid = [...net.namespace.transitions.keys()];
const session = net.startSession('p_home', 'sess-gqc-00');
const validStep = net.clickHyperlink(session.marking, 'p_home', 'open_dashboard', session.sessionToken);
const invalidStep = net.clickHyperlink(validStep.marking, 'p_dashboard', 'nonexistent_link', validStep.sessionToken);
const transitionsAfterInvalid = [...net.namespace.transitions.keys()];

const badNet = new Layer4TrellisNavigationNet();
badNet.registerViewPlace('p_index', 'mcard:route:/index.html', { role: 'Entry' });
badNet.registerViewPlace('p_lab', 'mcard:route:/responsive-lab.html', { role: 'Intermediate' });
badNet.registerHyperlink('p_index', 'go_lab', 'p_lab');
const badSession = badNet.startSession('p_index', 'sess-bad-uri');
const badUriStep = badNet.clickHyperlink(badSession.marking, 'p_index', 'go_lab', badSession.sessionToken);

const siteYaml = [
  'name: gqc00-workbench-probe',
  'places:',
  '  - id: p_index',
  '    initial_tokens: 1',
  '    route: /index.html',
  '    kind: page',
  '    binding: "route:/index.html"',
  '  - id: p_lab',
  '    initial_tokens: 0',
  '  - id: p_cfg_pending',
  '    initial_tokens: 0',
  '  - id: p_cfg_error',
  '    initial_tokens: 0',
  'transitions:',
  '  - id: t_redirect_lab',
  '    inputs: [p_index]',
  '    outputs: [p_lab]',
  '    meta: "index redirect"',
  '    binding: "redirect:/responsive-lab.html"',
  '  - id: t_cfg_req',
  '    inputs: [p_lab]',
  '    outputs: [p_cfg_pending]',
  '  - id: t_cfg_ok',
  '    inputs: [p_cfg_pending]',
  '    outputs: [p_lab]',
  '  - id: t_cfg_err',
  '    inputs: [p_cfg_pending]',
  '    outputs: [p_cfg_error]',
  '  - id: t_cfg_recover',
  '    inputs: [p_cfg_error]',
  '    outputs: [p_lab]',
  '  - id: t_self_loop',
  '    inputs: [p_lab]',
  '    outputs: [p_lab]'
].join('\n');

const topology = parsePetriNetYaml(siteYaml);
const matrix = IncidenceMatrix.fromTopology(topology);
const vm = new ColoredPetriVM(topology);
const enabledAtStart = vm.getEnabledTransitions().map((t) => t.id);

let disabledError = null;
try {
  await vm.fireTransition('t_cfg_ok');
} catch (err) {
  disabledError = err.message;
}

await vm.fireTransition('t_redirect_lab');
await vm.fireTransition('t_cfg_req');
await vm.fireTransition('t_cfg_err');
await vm.fireTransition('t_cfg_recover');
await vm.fireTransition('t_cfg_req');
await vm.fireTransition('t_cfg_ok');

const dupTopology = parsePetriNetYaml([
  'name: dup-check',
  'places:',
  '  - id: p_dup',
  '    initial_tokens: 1',
  '  - id: p_dup',
  '    initial_tokens: 0',
  'transitions: []'
].join('\n'));

let danglingError = null;
try {
  parsePetriNetYaml([
    'name: dangling-check',
    'places:',
    '  - id: p_only',
    '    initial_tokens: 1',
    'transitions:',
    '  - id: t_bad',
    '    inputs: [p_only]',
    '    outputs: [p_missing]'
  ].join('\n'));
} catch (err) {
  danglingError = err.message;
}

console.log(JSON.stringify({
  layer4: {
    valid: {
      navigated: validStep.navigated,
      trappedToErrorModal: validStep.trappedToErrorModal,
      currentViewPlaceId: validStep.currentViewPlaceId,
      continuationTrace: validStep.continuationTrace,
      sessionPayload: validStep.sessionToken.payload,
      receipt: decodeReceipt(validStep.receipt)
    },
    invalidLink: {
      navigated: invalidStep.navigated,
      trappedToErrorModal: invalidStep.trappedToErrorModal,
      currentViewPlaceId: invalidStep.currentViewPlaceId,
      continuationTrace: invalidStep.continuationTrace,
      receipt: decodeReceipt(invalidStep.receipt)
    },
    transitionsBeforeInvalid,
    transitionsAfterInvalid,
    routeHandleAsTypeUri: {
      navigated: badUriStep.navigated,
      trappedToErrorModal: badUriStep.trappedToErrorModal,
      currentViewPlaceId: badUriStep.currentViewPlaceId,
      receipt: decodeReceipt(badUriStep.receipt)
    }
  },
  layer1: {
    firstPlace: topology.places[0],
    firstTransition: topology.transitions[0],
    enabledAtStart,
    disabledError,
    finalMarking: vm.getMarking(),
    pInvariantBasis: matrix.findPInvariants(),
    pInvariantHolds: matrix.verifyPInvariant(vm.getMarking(), {
      p_index: 1,
      p_lab: 1,
      p_cfg_pending: 1,
      p_cfg_error: 1
    }, 1),
    selfLoopColumn: matrix.d.map((row) => row[matrix.transitions.indexOf('t_self_loop')]),
    duplicatePlaceCount: dupTopology.places.length,
    danglingError
  }
}, null, 2));
EOF
```

## Observed probe output

Running the command above on Node `v24.21.0` produces deterministic structural fields (with run-specific Blake3 token hashes):

```json
{
  "layer4": {
    "valid": {
      "navigated": true,
      "trappedToErrorModal": false,
      "currentViewPlaceId": "p_dashboard",
      "continuationTrace": ["SUSPENDED", "LOADING", "ACTIVE", "SUSPENDED"],
      "sessionPayload": {
        "current_place": "p_dashboard",
        "history": ["p_home", "p_dashboard"],
        "session_id": "sess-gqc-00",
        "sponsor_did": "did:key:z6MkUserSession"
      },
      "receipt": {
        "kind": "firing_receipt_mcard",
        "net_id": "layer4_navigation",
        "transition_id": "t_nav:p_home:open_dashboard->p_dashboard",
        "fiber_state_trace": ["PENDING", "LOADING", "ACTIVE", "UNLOADING", "DISPOSED"],
        "step_seq": 0,
        "verdict": "COMMITTED"
      }
    },
    "invalidLink": {
      "navigated": false,
      "trappedToErrorModal": true,
      "currentViewPlaceId": "p_error_modal",
      "continuationTrace": ["SUSPENDED", "LOADING", "ACTIVE", "DISPOSED"],
      "receipt": {
        "kind": "firing_receipt_mcard",
        "net_id": "layer4_navigation",
        "transition_id": "t_nav_invalid:p_dashboard:nonexistent_link",
        "fiber_state_trace": ["PENDING", "LOADING", "ACTIVE", "UNLOADING", "DISPOSED"],
        "step_seq": 1,
        "verdict": "ROUTED_TO_EXCEPTION"
      }
    },
    "transitionsBeforeInvalid": [
      "t_nav:p_home:open_dashboard->p_dashboard"
    ],
    "transitionsAfterInvalid": [
      "t_nav:p_home:open_dashboard->p_dashboard",
      "t_nav_invalid:p_dashboard:nonexistent_link"
    ],
    "routeHandleAsTypeUri": {
      "navigated": false,
      "trappedToErrorModal": true,
      "currentViewPlaceId": "p_error_modal",
      "receipt": {
        "kind": "firing_receipt_mcard",
        "net_id": "layer4_navigation",
        "transition_id": "t_nav:p_index:go_lab->p_lab",
        "fiber_state_trace": ["PENDING", "LOADING", "UNLOADING", "DISPOSED"],
        "step_seq": 0,
        "verdict": "ROUTED_TO_EXCEPTION"
      }
    }
  },
  "layer1": {
    "firstPlace": {
      "id": "p_index",
      "initialTokens": 1
    },
    "firstTransition": {
      "id": "t_redirect_lab",
      "inputs": ["p_index"],
      "outputs": ["p_lab"],
      "exitCode": 0,
      "binding": "redirect:/responsive-lab.html"
    },
    "enabledAtStart": ["t_redirect_lab"],
    "disabledError": "[ColoredPetriVM] Transition 't_cfg_ok' is not enabled in current marking",
    "finalMarking": {
      "p_index": 0,
      "p_lab": 1,
      "p_cfg_pending": 0,
      "p_cfg_error": 0
    },
    "pInvariantBasis": [[1, 1, 1, 1]],
    "pInvariantHolds": true,
    "selfLoopColumn": [0, 0, 0, 0],
    "duplicatePlaceCount": 2,
    "danglingError": "[PetriNetTopology] Validation error in transition 't_bad': output place 'p_missing' does not exist."
  }
}
```

## Verified Layer 4 behavior and hazards

1. **Valid CLM view transition.** Registering `p_home` with `clm://type/view/home` and `p_dashboard` with `clm://type/view/dashboard` lets `clickHyperlink` move the session token from `p_home` to `p_dashboard` and emit a `FiringReceiptMCard` with `verdict` set to `"COMMITTED"`.
2. **Invalid hyperlink routing.** Calling `clickHyperlink` with `nonexistent_link` throws inside the Cordis fiber transform during `ACTIVE`, routes the token to `p_error_modal`, sets `trappedToErrorModal` to `true`, and emits a receipt with `verdict` set to `"ROUTED_TO_EXCEPTION"`.
3. **Route handle failure as CLM type URI.** Passing `mcard:route:/index.html` as `routeUri` to `registerViewPlace` stores that string in `PlaceMCard.typeExpr`. When `clickHyperlink` runs, the fiber bails during `LOADING` before reaching `ACTIVE` and routes the session to `p_error_modal` because `mcard:route:/index.html` is not a valid `clm://type/...` expression. Route handles and CLM type URIs must remain separate fields.
4. **In-place namespace mutation hazard.** On every undefined action name, `Layer4TrellisNavigationNet.clickHyperlink` constructs `TransitionMCard.create("t_nav_invalid:...")` and calls `this.namespace.registerTransition(fallbackT)`, mutating `this.namespace.transitions` in place across calls on a shared instance.
5. **Type aliases.** In `node_modules/clm-kernel/dist/layer4/petriNavigation.d.ts`, `ViewPlaceMCard` aliases `PlaceMCard`, `NavigationTransitionPCard` aliases `TransitionMCard`, and `SessionTokenMCard` aliases `TokenMCard`.

## Verified Layer 1 exports and parser limits

`clm-kernel/layer1` (`node_modules/clm-kernel/dist/layer1/index.js`) exports 46 symbols:

`ActionDispatcher`, `BipartiteInvariantError`, `CPNNet`, `CPNPlace`, `ColoredPetriVM`, `CpnFiberEngine`, `DistributedCpnNode`, `DocumentManipulator`, `GlobalNoetherianAuditor`, `HoareSandwichEngine`, `IncidenceMatrix`, `MAX_SAFE_INT`, `MIN_SAFE_INT`, `NoetherianDivergenceError`, `PINVARIANT_OVERFLOW_CODE`, `PInvariantRangeError`, `PlaceId`, `PocketFlowWorkflowOrchestrator`, `SafeRuleEvaluator`, `StructuredManipulator`, `TabularManipulator`, `TokenBindingError`, `TransitionId`, `canonicalJson`, `checkDeadlock`, `computeCanonicalHash`, `extractStepDependencies`, `fireTransition`, `getEnabledTransitions`, `getMarking`, `getPlaceTokens`, `initializeMarking`, `isTransitionEnabled`, `mathGcd`, `mathLcm`, `normalizePrimitiveBasis`, `parseActionManifest`, `parseActionManifestFile`, `parsePetriNetYaml`, `parseWorkflowManifest`, `parseWorkflowManifestFile`, `solveNullspace`, `solveNullspaceChecked`, `validateDagAndGetTopologicalOrder`, `verifyAssertions`, `verifyDeadlock`, `verifyFinalMarking`, `verifyFireCount`, and `verifyPInvariants`.

Observed Layer 1 behavior for `SPRINT-GQC-02A`:

- `parsePetriNetYaml` drops unknown Place fields (`route`, `kind`, and `binding` on a Place) and drops unknown Transition fields (`meta`), while preserving `binding` on a Transition. `SPRINT-GQC-02A` stores route and HTTP metadata in an outer `bindings` envelope rather than custom Place properties.
- `parsePetriNetYaml` rejects dangling Transition arc references (`p_missing`), throwing `[PetriNetTopology] Validation error in transition 't_bad': output place 'p_missing' does not exist.`.
- `parsePetriNetYaml` accepts duplicate Place IDs (`dupTopology.places.length === 2` for two `p_dup` entries). `SPRINT-GQC-02A` adds an explicit duplicate-ID check in `check:net`.
- A self-loop Transition (`inputs: [p_lab]`, `outputs: [p_lab]`) produces the all-zero incidence column `[0, 0, 0, 0]` in `IncidenceMatrix.d`. Same-page server calls must split into request and result Transitions around an in-flight Place so they remain visible in `D` and preserve the session P-invariant `[1, 1, 1, 1]`.

## Browser bundle hazard and unverified boundaries

- **Node built-in imports across root and subpaths.** `node_modules/clm-kernel/dist/index.js` directly imports Node `crypto` and shared chunks importing `fs`, `path`, `dgram`, `http`, and `ws`. `node_modules/clm-kernel/dist/layer1/index.js` imports `../chunk-636END4Y.js` (`crypto`, `module`, `fs`) and `../chunk-QBQQSUJN.js` (`fs`, `path`) plus `../chunk-73BDRXGW.js` (`path`, `url`). `node_modules/clm-kernel/dist/layer4/index.js` imports `crypto` and `../chunk-TQXZF6AD.js` (`crypto`, `net`, `fs`, `ws`). Browser islands in `SPRINT-GQC-02B` must not import `clm-kernel` or `clm-kernel/layer1`.
- **No browser automation inside CLM transitions.** Firing a Layer 1 or Layer 4 Transition updates in-memory Petri markings only. Playwright owns real browser navigation, click execution, and DOM assertions.
- **Unverified boundaries deferred to later sprints.** This probe does not verify external SPA DOM instrumentation (`SPRINT-GQC-02` and `SPRINT-GQC-04`), Triad SQLite persistence of `FiringReceiptMCard` records (`SPRINT-GQC-05`), or `navigation_run_link:v1` MCard linkage (`SPRINT-GQC-05`).
