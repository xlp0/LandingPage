# Layer 1 site net probe evidence

## Metadata

- Sprint ID is `SPRINT-GQC-02A`.
- Execution unit is `PR-GQC-02A`.
- Trunk baseline commit is `843cf65`.
- Parent commit at probe execution is `4eddb5d`.
- Node runtime version is `v24.21.0`.
- Pinned package in `package.json` and `package-lock.json` is `clm-kernel@0.0.12`.
- Tarball URL in `package-lock.json` is `https://registry.npmjs.org/clm-kernel/-/clm-kernel-0.0.12.tgz`.
- Tarball integrity in `package-lock.json` is `sha512-XhAe2H2p+zx92PHQ8D3mZknlOMtzLs/cZUI5Upk7DoLPV0DiNRlPnkt4gmDBy+pXckbaWZYSiO61DJkkkXatow==`.
- YAML loader in `package.json` and `package-lock.json` is `js-yaml@4.3.2`, declared in `package.json` as `^4.1.0`.

## Clean install verification

`npm ci` ran from `/Users/bkoo/Documents/Development/GovTech/MCard_TDD/LandingPage` before the probe and left `git status --short` empty.

## Reproduction command

Run the following command from `LandingPage` after `npm ci`:

```bash
node --input-type=module <<'EOF'
import { PlaceMCard, TransitionMCard, NetMCard } from 'clm-kernel';
import {
  parsePetriNetYaml,
  IncidenceMatrix,
  ColoredPetriVM
} from 'clm-kernel/layer1';

const yamlSample = `
name: workbench-probe
places:
  - id: p_page_index
    initialTokens: 1
  - id: p_page_responsive_lab
    initialTokens: 0
  - id: p_page_app
    initialTokens: 0
  - id: p_pending_post_test_runs
    initialTokens: 0
  - id: p_error_post_test_runs
    initialTokens: 0
  - id: p_external_games
    initialTokens: 0
transitions:
  - id: t_redirect_index_to_lab
    inputs: [p_page_index]
    outputs: [p_page_responsive_lab]
  - id: t_req_post_test_runs
    inputs: [p_page_responsive_lab]
    outputs: [p_pending_post_test_runs]
  - id: t_ok_post_test_runs
    inputs: [p_pending_post_test_runs]
    outputs: [p_page_responsive_lab]
  - id: t_fail_post_test_runs
    inputs: [p_pending_post_test_runs]
    outputs: [p_error_post_test_runs]
  - id: t_recover_post_test_runs
    inputs: [p_error_post_test_runs]
    outputs: [p_page_responsive_lab]
  - id: t_link_lab_to_app
    inputs: [p_page_responsive_lab]
    outputs: [p_page_app]
  - id: t_open_external_game
    inputs: [p_page_app]
    outputs: [p_page_app, p_external_games]
`;

const topo = parsePetriNetYaml(yamlSample);
const vm = new ColoredPetriVM(topo);
const enabledAtEntry = vm.getEnabledTransitions().map((t) => t.id);

let wrongPlaceErr = null;
try {
  await vm.fireTransition('t_link_lab_to_app');
} catch (err) {
  wrongPlaceErr = err.message;
}

const steps = [
  't_redirect_index_to_lab',
  't_req_post_test_runs',
  't_fail_post_test_runs',
  't_recover_post_test_runs',
  't_link_lab_to_app',
  't_open_external_game'
];
for (const step of steps) {
  await vm.fireTransition(step);
}

const matrix = IncidenceMatrix.fromTopology(topo);
const pBasis = matrix.findPInvariants();
const sessionWeights = {
  p_page_index: 1,
  p_page_responsive_lab: 1,
  p_page_app: 1,
  p_pending_post_test_runs: 1,
  p_error_post_test_runs: 1,
  p_external_games: 0
};
const sessionInvariantHolds = matrix.verifyPInvariant(vm.getMarking(), sessionWeights, 1);

const selfLoopTopo = parsePetriNetYaml(JSON.stringify({
  name: 'self-loop',
  places: [{ id: 'p_a', initialTokens: 1 }],
  transitions: [{ id: 't_self', inputs: ['p_a'], outputs: ['p_a'] }]
}));
const selfLoopColumn = IncidenceMatrix.fromTopology(selfLoopTopo).d;

const unknownFieldTopo = parsePetriNetYaml(JSON.stringify({
  name: 'unknown-fields',
  places: [{ id: 'p_a', initialTokens: 1, route: '/a', kind: 'page', meta: { x: 1 } }],
  transitions: [{ id: 't_a', inputs: ['p_a'], outputs: ['p_a'], route: '/a', binding: { type: 'noop', ref: 'x' } }]
}));

const dupTopo = parsePetriNetYaml(JSON.stringify({
  name: 'dup-places',
  places: [{ id: 'p_dup', initialTokens: 1 }, { id: 'p_dup', initialTokens: 0 }],
  transitions: [{ id: 't_x', inputs: ['p_dup'], outputs: ['p_dup'] }]
}));

let danglingErr = null;
try {
  parsePetriNetYaml(JSON.stringify({
    name: 'dangling',
    places: [{ id: 'p_a', initialTokens: 1 }],
    transitions: [{ id: 't_bad', inputs: ['p_a'], outputs: ['p_missing'] }]
  }));
} catch (err) {
  danglingErr = err.message;
}

console.log(JSON.stringify({
  enabledAtEntry,
  wrongPlaceErr,
  finalMarking: vm.getMarking(),
  pBasisCount: pBasis.length,
  sessionInvariantHolds,
  selfLoopColumn,
  keptPlaceKeys: Object.keys(unknownFieldTopo.places[0]),
  keptTransitionKeys: Object.keys(unknownFieldTopo.transitions[0]),
  dupPlaceCount: dupTopo.places.length,
  danglingErr,
  rootConstructors: [typeof PlaceMCard, typeof TransitionMCard, typeof NetMCard]
}, null, 2));
EOF
```

## Observed output

```json
{
  "enabledAtEntry": [
    "t_redirect_index_to_lab"
  ],
  "wrongPlaceErr": "[ColoredPetriVM] Transition 't_link_lab_to_app' is not enabled in current marking",
  "finalMarking": {
    "p_page_index": 0,
    "p_page_responsive_lab": 0,
    "p_page_app": 1,
    "p_pending_post_test_runs": 0,
    "p_error_post_test_runs": 0,
    "p_external_games": 1
  },
  "pBasisCount": 1,
  "sessionInvariantHolds": true,
  "selfLoopColumn": [
    [
      0
    ]
  ],
  "keptPlaceKeys": [
    "id",
    "initialTokens",
    "initialColor",
    "capacity",
    "description"
  ],
  "keptTransitionKeys": [
    "id",
    "inputs",
    "outputs",
    "exitCode",
    "content",
    "requiredAgentClass",
    "agentDid",
    "vcardPre",
    "vcardPost",
    "binding"
  ],
  "dupPlaceCount": 2,
  "danglingErr": "[PetriNetTopology] Validation error in transition 't_bad': output place 'p_missing' does not exist.",
  "rootConstructors": [
    "function",
    "function",
    "function"
  ]
}
```

## Design consequences verified from runtime output

| Check | Observed behavior on `clm-kernel@0.0.12` | Enforcement in `GQC-02A` |
| --- | --- | --- |
| YAML topology parsing | `parsePetriNetYaml` parsed the YAML topology directly and enabled only `t_redirect_index_to_lab` at the initial marking. | `src/net/workbench-net.yaml` passes its `topology` block unchanged to `parsePetriNetYaml`. |
| Out-of-order firing rejection | Firing `t_link_lab_to_app` from `p_page_index` threw `Transition 't_link_lab_to_app' is not enabled in current marking`. | `replayNetTrace` replays browser traces through `ColoredPetriVM` and rejects disabled Transitions. |
| Session P-invariant with `open-external` fork | `t_open_external_game` kept `1` token in `p_page_app` and added `1` weight-0 token in `p_external_games`, and `verifyPInvariant(..., sessionWeights, 1)` returned `true`. | `scripts/check-net.mjs` verifies `y^T * D = 0` with weight `1` on `page`, `view`, `pending`, and `error` Places and weight `0` on `external` Places. |
| Self-loop server call invisibility | Modeling `p_a -> p_a` produced incidence column `[[0]]`. | `scripts/check-net.mjs` rejects self-loops and requires `server-call-request` to target a `pending` Place with matching `ok` or `fail` Transitions. |
| Unknown topology keys and `TransitionDef.binding` | `parsePetriNetYaml` stripped `route`, `kind`, and `meta` while preserving `TransitionDef.binding`. | Route, kind, and HTTP metadata live in `envelope.bindings`, and `scripts/check-net.mjs` forbids `TransitionDef.binding` inside `topology`. |
| Duplicate Place IDs vs dangling arcs | `parsePetriNetYaml` accepted duplicate `p_dup` Place IDs with `dupPlaceCount` equal to `2` and rejected dangling output `p_missing`. | `scripts/check-net.mjs` checks duplicate Place and Transition IDs before calling `parsePetriNetYaml` and delegates dangling-arc rejection to the kernel parser. |
| Root MCard constructors | `PlaceMCard`, `TransitionMCard`, and `NetMCard` all resolved as functions at the package root, which imports Node `crypto` at load time. | Kernel imports stay in Node scripts and unit tests only, never in browser modules. |
