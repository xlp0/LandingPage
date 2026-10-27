import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsePetriNetYaml,
  IncidenceMatrix,
  ColoredPetriVM
} from 'clm-kernel/layer1';
import {
  PENPOT_ARCHIVE_HASH,
  PENPOT_GRAPH_HASH,
  NAVIGATION_ROUTES
} from '../../js/nav.js';
import {
  TEST_RUN_SCHEMA,
  validateTestRun
} from '../../js/harness/test-run-schema.js';
import {
  createIsolatedPersistenceHarness,
  parseSavedRunBadge
} from '../fixtures/app-fixtures.js';
import {
  KNOWN_ZERO_TEST_EXCEPTIONS,
  countPlaywrightTests,
  evaluateDiscoveryResults
} from '../../scripts/check-playwright-discovery.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(ROOT_DIR, 'tests/gui-coverage.json');

const ALLOWED_TARGET_TYPES = new Set([
  'workbench',
  'spa',
  'mpa-candidate',
  'webapp',
  'probe-fixture',
  'internal-diagnostic',
  'legacy-catalog',
  'undecided'
]);

const WORKBENCH_ALLOWED_TYPES = new Set([
  'workbench',
  'internal-diagnostic',
  'legacy-catalog',
  'undecided'
]);

const TARGET_ALLOWED_TYPES = new Set([
  'spa',
  'mpa-candidate',
  'webapp',
  'probe-fixture',
  'undecided'
]);

const ALLOWED_PLACE_KINDS = new Set([
  'page',
  'view',
  'pending',
  'error',
  'external'
]);

const ALLOWED_TRANSITION_KINDS = new Set([
  'link',
  'redirect',
  'client-route',
  'server-call-request',
  'server-call-ok',
  'server-call-fail',
  'recover',
  'open-external'
]);

const ALLOWED_JOURNEY_STATUSES = new Set([
  'covered',
  'planned',
  'optional-deferred',
  'undecided'
]);

const ALLOWED_SOURCE_KINDS = new Set([
  'fixture-graph-manifest',
  'generated-penpot-module',
  'existing-mcard-contract',
  'pending-workbench-net',
  'undecided'
]);

const ALLOWED_TEST_LAYERS = new Set([
  'unit',
  'api',
  'smoke',
  'component',
  'e2e',
  'none'
]);

const REQUIRED_P0_SPA_STEPS = [
  'select-spa-target',
  'choose-device-and-viewport',
  'exercise-functional-link',
  'capture-and-replay-journey',
  'inspect-mcard-result'
];

const REQUIRED_UNDECIDED_JOURNEY_IDS = [
  'undecided-auth-zitadel',
  'undecided-p2p-collaboration',
  'undecided-webllm-inference',
  'undecided-offline-pwa'
];

export function buildSessionWeights(placesBindings) {
  const weights = {};
  for (const [placeId, binding] of Object.entries(placesBindings || {})) {
    weights[placeId] = binding?.kind === 'external' ? 0 : 1;
  }
  return weights;
}

export function validateNetEnvelope(envelope, { requireErrorRecovery = false } = {}) {
  const errors = [];
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return { valid: false, errors: ['Net envelope must be a non-null object'], parsedTopology: null, matrix: null, weights: null };
  }

  if (envelope.schema !== 'urn:gqc:net-envelope:v1') {
    errors.push(`Net envelope must declare schema "urn:gqc:net-envelope:v1", got "${envelope.schema}"`);
  }
  if (typeof envelope.netId !== 'string' || !envelope.netId.trim()) {
    errors.push('Net envelope is missing netId');
  }
  if (typeof envelope.targetHandle !== 'string' || !envelope.targetHandle.trim()) {
    errors.push('Net envelope is missing targetHandle');
  }
  if (typeof envelope.entryPlaceId !== 'string' || !envelope.entryPlaceId.trim()) {
    errors.push('Net envelope is missing entryPlaceId');
  }

  const rawTopo = envelope.topology;
  if (!rawTopo || typeof rawTopo !== 'object' || !Array.isArray(rawTopo.places) || !Array.isArray(rawTopo.transitions)) {
    errors.push('Net envelope topology must declare places and transitions arrays');
    return { valid: false, errors, parsedTopology: null, matrix: null, weights: null };
  }

  const seenPlaces = new Set();
  for (const p of rawTopo.places) {
    if (seenPlaces.has(p?.id)) {
      errors.push(`Duplicate Place ID "${p.id}" in net "${envelope.netId}"`);
    }
    seenPlaces.add(p?.id);
  }

  const seenTransitions = new Set();
  for (const t of rawTopo.transitions) {
    if (seenTransitions.has(t?.id)) {
      errors.push(`Duplicate Transition ID "${t.id}" in net "${envelope.netId}"`);
    }
    seenTransitions.add(t?.id);
    if (t && Object.prototype.hasOwnProperty.call(t, 'binding') && t.binding !== undefined) {
      errors.push(`Transition "${t.id}" must not put route metadata in TransitionDef.binding`);
    }
  }

  let parsedTopology = null;
  try {
    parsedTopology = parsePetriNetYaml(JSON.stringify(rawTopo));
  } catch (err) {
    errors.push(`parsePetriNetYaml rejected topology for "${envelope.netId}" (${err.message})`);
    return { valid: false, errors, parsedTopology: null, matrix: null, weights: null };
  }

  const bindings = envelope.bindings;
  if (!bindings || typeof bindings !== 'object' || !bindings.places || !bindings.transitions) {
    errors.push('Net envelope bindings must declare places and transitions maps');
    return { valid: false, errors, parsedTopology, matrix: null, weights: null };
  }

  const topoPlaceIds = new Set(parsedTopology.places.map((p) => p.id));
  const boundPlaceIds = new Set(Object.keys(bindings.places));
  for (const pid of topoPlaceIds) {
    if (!boundPlaceIds.has(pid)) {
      errors.push(`Topology Place "${pid}" has no binding in "${envelope.netId}"`);
    }
  }
  for (const pid of boundPlaceIds) {
    if (!topoPlaceIds.has(pid)) {
      errors.push(`Binding Place "${pid}" is not declared in topology of "${envelope.netId}"`);
    }
  }

  const topoTransitionIds = new Set(parsedTopology.transitions.map((t) => t.id));
  const boundTransitionIds = new Set(Object.keys(bindings.transitions));
  for (const tid of topoTransitionIds) {
    if (!boundTransitionIds.has(tid)) {
      errors.push(`Topology Transition "${tid}" has no binding in "${envelope.netId}"`);
    }
  }
  for (const tid of boundTransitionIds) {
    if (!topoTransitionIds.has(tid)) {
      errors.push(`Binding Transition "${tid}" is not declared in topology of "${envelope.netId}"`);
    }
  }

  for (const [pid, pBind] of Object.entries(bindings.places)) {
    if (!ALLOWED_PLACE_KINDS.has(pBind?.kind)) {
      errors.push(`Place "${pid}" has invalid or missing kind "${pBind?.kind}"`);
    }
    if (typeof pBind?.surface !== 'string' || !pBind.surface.trim()) {
      errors.push(`Place "${pid}" is missing surface`);
    }
    if (typeof pBind?.pageId !== 'string' || !pBind.pageId.trim()) {
      errors.push(`Place "${pid}" is missing pageId`);
    }
    if (typeof pBind?.route !== 'string' || !pBind.route.trim()) {
      errors.push(`Place "${pid}" is missing route`);
    }
    if (typeof pBind?.routeHandle !== 'string' || !pBind.routeHandle.trim()) {
      errors.push(`Place "${pid}" is missing routeHandle`);
    }
    if (typeof pBind?.clmTypeUri !== 'string' || !pBind.clmTypeUri.startsWith('clm://type/') || pBind.clmTypeUri.startsWith('mcard:')) {
      errors.push(`Place "${pid}" must declare a separate clm://type/ clmTypeUri, got "${pBind?.clmTypeUri}"`);
    }
    if (typeof pBind?.owner !== 'string' || !pBind.owner.trim()) {
      errors.push(`Place "${pid}" is missing owner`);
    }
  }

  for (const t of parsedTopology.transitions) {
    const tBind = bindings.transitions[t.id];
    if (!tBind) continue;
    if (!ALLOWED_TRANSITION_KINDS.has(tBind.kind)) {
      errors.push(`Transition "${t.id}" has invalid or missing kind "${tBind.kind}"`);
    }
    if (typeof tBind.linkId !== 'string' || !tBind.linkId.trim()) {
      errors.push(`Transition "${t.id}" is missing linkId`);
    }
    if (typeof tBind.trigger !== 'string' || !tBind.trigger.trim()) {
      errors.push(`Transition "${t.id}" is missing trigger`);
    }
    if (typeof tBind.owner !== 'string' || !tBind.owner.trim()) {
      errors.push(`Transition "${t.id}" is missing owner`);
    }

    const inSorted = [...t.inputs].sort().join(',');
    const outSorted = [...t.outputs].sort().join(',');
    if (inSorted && inSorted === outSorted) {
      errors.push(`Transition "${t.id}" models a self-loop instead of a distinct Place transition`);
    }

    if (tBind.kind === 'server-call-request') {
      const pendingTargets = t.outputs.filter((pid) => bindings.places[pid]?.kind === 'pending');
      if (pendingTargets.length === 0) {
        errors.push(`server-call-request Transition "${t.id}" must output to a pending Place`);
      }
      for (const pendingId of pendingTargets) {
        const hasResult = parsedTopology.transitions.some((cand) => {
          const candKind = bindings.transitions[cand.id]?.kind;
          return (candKind === 'server-call-ok' || candKind === 'server-call-fail') && cand.inputs.includes(pendingId);
        });
        if (!hasResult) {
          errors.push(`server-call-request Transition "${t.id}" pending Place "${pendingId}" has no matching server-call-ok or server-call-fail Transition`);
        }
      }
    }
  }

  const weights = buildSessionWeights(bindings.places);
  let sessionEntryTokens = 0;
  for (const p of parsedTopology.places) {
    const init = p.initialTokens || 0;
    sessionEntryTokens += init * (weights[p.id] ?? 0);
  }
  if (sessionEntryTokens !== 1) {
    errors.push(`Entry marking for "${envelope.netId}" must hold 1 session token, got ${sessionEntryTokens}`);
  }
  const entryDef = parsedTopology.places.find((p) => p.id === envelope.entryPlaceId);
  if (!entryDef || (entryDef.initialTokens || 0) !== 1) {
    errors.push(`entryPlaceId "${envelope.entryPlaceId}" must hold initialTokens = 1`);
  }

  const matrix = IncidenceMatrix.fromTopology(parsedTopology);
  const yVec = matrix.places.map((pid) => weights[pid] ?? 0);
  for (let col = 0; col < matrix.transitions.length; col += 1) {
    let dot = 0;
    for (let row = 0; row < matrix.places.length; row += 1) {
      dot += yVec[row] * matrix.d[row][col];
    }
    if (dot !== 0) {
      errors.push(`Session weight vector violates y^T * D = 0 at Transition "${matrix.transitions[col]}" (dot=${dot})`);
    }
  }

  const vm = new ColoredPetriVM(parsedTopology);
  if (!matrix.verifyPInvariant(vm.getMarking(), weights, 1)) {
    errors.push(`IncidenceMatrix.verifyPInvariant failed at entry marking for "${envelope.netId}"`);
  }

  const nonExternalPlaces = parsedTopology.places
    .map((p) => p.id)
    .filter((pid) => bindings.places[pid]?.kind !== 'external');

  const seedPlaces = new Set([envelope.entryPlaceId]);
  for (const [pid, pBind] of Object.entries(bindings.places)) {
    if (pBind?.deepLinkEntry === true && pBind?.kind !== 'external') {
      seedPlaces.add(pid);
    }
  }

  const visitedMarkings = new Set();
  const reachablePlaces = new Set();
  const enabledTransitions = new Set();
  const queue = [];

  for (const seedPid of seedPlaces) {
    if (!topoPlaceIds.has(seedPid)) continue;
    const m = {};
    for (const pid of nonExternalPlaces) {
      m[pid] = pid === seedPid ? 1 : 0;
    }
    const key = nonExternalPlaces.map((pid) => `${pid}:${m[pid]}`).join('|');
    if (!visitedMarkings.has(key)) {
      visitedMarkings.add(key);
      queue.push(m);
    }
  }

  while (queue.length > 0) {
    const marking = queue.shift();
    for (const pid of nonExternalPlaces) {
      if (marking[pid] > 0) reachablePlaces.add(pid);
    }
    for (const t of parsedTopology.transitions) {
      const canFire = t.inputs.every((inPid) => (marking[inPid] || 0) >= 1);
      if (!canFire) continue;
      enabledTransitions.add(t.id);
      const next = { ...marking };
      for (const inPid of t.inputs) {
        if (inPid in next) next[inPid] -= 1;
      }
      for (const outPid of t.outputs) {
        if (outPid in next) next[outPid] = Math.min(1, (next[outPid] || 0) + 1);
      }
      const key = nonExternalPlaces.map((pid) => `${pid}:${next[pid]}`).join('|');
      if (!visitedMarkings.has(key)) {
        visitedMarkings.add(key);
        queue.push(next);
      }
    }
  }

  for (const pid of nonExternalPlaces) {
    if (!reachablePlaces.has(pid)) {
      errors.push(`Place "${pid}" in "${envelope.netId}" is unreachable from entry or deep-link Places`);
    }
  }
  for (const t of parsedTopology.transitions) {
    if (!enabledTransitions.has(t.id)) {
      errors.push(`Transition "${t.id}" in "${envelope.netId}" is never enabled in any reachable marking`);
    }
  }

  if (requireErrorRecovery) {
    const viewPlaces = Object.entries(bindings.places).filter(([, b]) => b?.kind === 'view');
    const errorPlaces = Object.entries(bindings.places).filter(([, b]) => b?.kind === 'error');
    if (viewPlaces.length < 2) {
      errors.push(`Fixture net "${envelope.netId}" must declare at least 2 view Places`);
    }
    if (errorPlaces.length < 1) {
      errors.push(`Fixture net "${envelope.netId}" must declare at least 1 error Place`);
    }
    const errorIds = new Set(errorPlaces.map(([pid]) => pid));
    const viewIds = new Set(viewPlaces.map(([pid]) => pid));
    const hasIntoError = parsedTopology.transitions.some(
      (t) => t.inputs.some((id) => viewIds.has(id)) && t.outputs.some((id) => errorIds.has(id))
    );
    const hasRecover = parsedTopology.transitions.some(
      (t) => bindings.transitions[t.id]?.kind === 'recover' &&
        t.inputs.some((id) => errorIds.has(id)) &&
        t.outputs.some((id) => viewIds.has(id))
    );
    if (!hasIntoError) {
      errors.push(`Fixture net "${envelope.netId}" must declare an invalid-action Transition into an error Place`);
    }
    if (!hasRecover) {
      errors.push(`Fixture net "${envelope.netId}" must declare a recover Transition from an error Place back to a view Place`);
    }
  }

  return { valid: errors.length === 0, errors, parsedTopology, matrix, weights };
}

export async function replayFiringSequence(envelope, firingSequence) {
  const check = validateNetEnvelope(envelope);
  if (!check.valid) {
    throw new Error(`Invalid net envelope: ${check.errors.join('; ')}`);
  }
  const vm = new ColoredPetriVM(check.parsedTopology);
  const records = [];
  for (const tid of firingSequence) {
    const rec = await vm.fireTransition(tid);
    const holds = check.matrix.verifyPInvariant(vm.getMarking(), check.weights, 1);
    if (!holds) {
      throw new Error(`Session P-invariant broken after firing "${tid}"`);
    }
    records.push(rec);
  }
  return { finalMarking: vm.getMarking(), records };
}

export function validateGuiCoverageRegistry(registry, { rootDir = ROOT_DIR, checkDiskFiles = true } = {}) {
  const errors = [];

  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    return { valid: false, errors: ['Registry must be a non-null JSON object'] };
  }

  if (registry.NAVIGATION_ROUTES || registry.penpotNavigation?.routes) {
    errors.push('Registry must remain a projection and must not copy NAVIGATION_ROUTES into a second canonical graph');
  }

  if (registry.receiptContract?.schema !== TEST_RUN_SCHEMA || registry.receiptContract?.mutatesClosedSchema !== false) {
    errors.push(`Registry must declare receiptContract for closed schema "${TEST_RUN_SCHEMA}" with mutatesClosedSchema=false`);
  }

  if (registry.penpotNavigation) {
    if (registry.penpotNavigation.graphHash !== PENPOT_GRAPH_HASH) {
      errors.push('penpotNavigation.graphHash drifted from js/nav.js PENPOT_GRAPH_HASH');
    }
    if (registry.penpotNavigation.archiveHash !== PENPOT_ARCHIVE_HASH) {
      errors.push('penpotNavigation.archiveHash drifted from js/nav.js PENPOT_ARCHIVE_HASH');
    }
  } else {
    errors.push('Registry is missing penpotNavigation metadata');
  }

  if (!Array.isArray(registry.workbenchSurfaces) || registry.workbenchSurfaces.length === 0) {
    errors.push('workbenchSurfaces must be a non-empty array');
  }
  if (!Array.isArray(registry.targetSurfaces) || registry.targetSurfaces.length === 0) {
    errors.push('targetSurfaces must be a non-empty array');
  }
  if (!Array.isArray(registry.journeys) || registry.journeys.length === 0) {
    errors.push('journeys must be a non-empty array');
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const surfaceIds = new Set();
  const surfaceById = new Map();
  const loadedEnvelopes = new Map();
  const scopePlaceClaims = new Map();
  const scopeTransitionClaims = new Map();

  const registerScopeId = (claimMap, scopeKey, id, ownerLabel, kindLabel) => {
    if (!id) return;
    if (!claimMap.has(scopeKey)) {
      claimMap.set(scopeKey, new Map());
    }
    const entries = claimMap.get(scopeKey);
    if (entries.has(id) && entries.get(id) !== ownerLabel) {
      errors.push(`Duplicate ${kindLabel} ID "${id}" within scope "${scopeKey}" ("${entries.get(id)}" vs "${ownerLabel}")`);
    } else {
      entries.set(id, ownerLabel);
    }
  };

  const checkClmUri = (label, routeHandle, clmTypeUri) => {
    if (typeof routeHandle !== 'string' || !routeHandle.trim()) {
      errors.push(`${label} is missing routeHandle`);
    }
    if (typeof clmTypeUri !== 'string' || !clmTypeUri.trim()) {
      errors.push(`${label} is missing clmTypeUri`);
    } else if (!clmTypeUri.startsWith('clm://type/') || clmTypeUri.startsWith('mcard:')) {
      errors.push(`${label} must use a clm://type/ URI for clmTypeUri, got "${clmTypeUri}"`);
    }
  };

  const validateSurface = (surface, expectedKind) => {
    const id = surface?.surfaceId;
    if (typeof id !== 'string' || !id.trim()) {
      errors.push(`Surface in ${expectedKind}Surfaces is missing surfaceId`);
      return;
    }
    if (surfaceIds.has(id)) {
      errors.push(`Duplicate surfaceId "${id}"`);
    }
    surfaceIds.add(id);
    surfaceById.set(id, surface);

    if (surface.surfaceKind !== expectedKind) {
      errors.push(`Surface "${id}" has surfaceKind "${surface.surfaceKind}", expected "${expectedKind}"`);
    }
    if (!ALLOWED_TARGET_TYPES.has(surface.targetType)) {
      errors.push(`Surface "${id}" has invalid targetType "${surface.targetType}"`);
    }
    if (expectedKind === 'workbench' && !WORKBENCH_ALLOWED_TYPES.has(surface.targetType)) {
      errors.push(`Workbench surface "${id}" conflates workbench with targetType "${surface.targetType}"`);
    }
    if (expectedKind === 'target' && !TARGET_ALLOWED_TYPES.has(surface.targetType)) {
      errors.push(`Target surface "${id}" conflates target with targetType "${surface.targetType}"`);
    }
    if (typeof surface.owner !== 'string' || !surface.owner.trim()) {
      errors.push(`Surface "${id}" is missing owner`);
    }
    if (typeof surface.docPath !== 'string' || !surface.docPath.trim()) {
      errors.push(`Surface "${id}" is missing docPath`);
    } else if (checkDiskFiles && !fs.existsSync(path.join(rootDir, surface.docPath))) {
      errors.push(`Surface "${id}" docPath does not exist on disk ("${surface.docPath}")`);
    }

    checkClmUri(`Surface "${id}"`, surface.routeHandle, surface.clmTypeUri);

    const isExternal = surface.locationKind === 'external-origin' || surface.locationKind === 'external-blocked';
    if (isExternal) {
      if (typeof surface.externalUrl !== 'string' || !/^https?:\/\//.test(surface.externalUrl)) {
        errors.push(`External surface "${id}" must declare an http(s) externalUrl`);
      }
    } else {
      if (typeof surface.pagePath !== 'string' || !surface.pagePath.trim()) {
        errors.push(`Surface "${id}" is missing pagePath`);
      } else if (checkDiskFiles && !fs.existsSync(path.join(rootDir, surface.pagePath))) {
        errors.push(`Surface "${id}" pagePath does not exist on disk ("${surface.pagePath}")`);
      }
    }

    if (surface.pagePath === 'app.html') {
      if (surface.p0 === true || surface.targetType === 'spa') {
        errors.push('app.html must remain non-P0 and unclassified (not spa) until Product Manager approval');
      }
    }
    if (surface.pagePath === 'index.html' && surface.targetType === 'spa') {
      errors.push('index.html single-page MCard viewer must not be classified as an spa target');
    }
    if (surface.targetType === 'mpa-candidate') {
      if (surface.optional !== true || surface.excludedFromP0Denominator !== true || surface.p0 === true) {
        errors.push(`MPA candidate surface "${id}" must be optional and excluded from P0 SPA denominator`);
      }
    }
    if (surface.p0 !== true && (!surface.status || typeof surface.status !== 'string')) {
      errors.push(`Non-P0 surface "${id}" must carry an explicit status`);
    }
    if (Array.isArray(surface.places) || Array.isArray(surface.transitions)) {
      errors.push(`Surface "${id}" must reference a source manifest rather than embedding places/transitions inline`);
    }
  };

  for (const s of registry.workbenchSurfaces) validateSurface(s, 'workbench');
  for (const s of registry.targetSurfaces) validateSurface(s, 'target');

  const journeyIds = new Set();
  let p0SpaCount = 0;

  for (const journey of registry.journeys) {
    const jid = journey?.journeyId;
    if (typeof jid !== 'string' || !jid.trim()) {
      errors.push('Journey entry is missing journeyId');
      continue;
    }
    if (journeyIds.has(jid)) {
      errors.push(`Duplicate journeyId "${jid}"`);
    }
    journeyIds.add(jid);

    if (!ALLOWED_JOURNEY_STATUSES.has(journey.status)) {
      errors.push(`Journey "${jid}" has invalid status "${journey.status}"`);
    }
    if (!ALLOWED_SOURCE_KINDS.has(journey.sourceKind)) {
      errors.push(`Journey "${jid}" has invalid sourceKind "${journey.sourceKind}"`);
    }
    if (!ALLOWED_TEST_LAYERS.has(journey.testLayer)) {
      errors.push(`Journey "${jid}" has invalid testLayer "${journey.testLayer}"`);
    }
    if (typeof journey.owner !== 'string' || !journey.owner.trim()) {
      errors.push(`Journey "${jid}" is missing owner`);
    }
    if (typeof journey.targetHandle !== 'string' || !journey.targetHandle.trim()) {
      errors.push(`Journey "${jid}" is missing targetHandle`);
    }
    if (typeof journey.pagePath !== 'string' || !journey.pagePath.trim()) {
      errors.push(`Journey "${jid}" is missing pagePath`);
    }
    if (typeof journey.observableOutcome !== 'string' || !journey.observableOutcome.trim()) {
      errors.push(`Journey "${jid}" is missing observableOutcome`);
    }
    if (typeof journey.evidence !== 'string' || !journey.evidence.trim()) {
      errors.push(`Journey "${jid}" is missing evidence`);
    }
    if (!Array.isArray(journey.firing_sequence)) {
      errors.push(`Journey "${jid}" must declare a firing_sequence array`);
    }
    if (!Object.prototype.hasOwnProperty.call(journey, 'workbenchPlaceId')) {
      errors.push(`Journey "${jid}" must include workbenchPlaceId (null when pending GQC-02A)`);
    }
    if (!Array.isArray(journey.workbenchTransitionIds)) {
      errors.push(`Journey "${jid}" must include workbenchTransitionIds array ([] when pending GQC-02A)`);
    }

    const linkedSurface = surfaceById.get(journey.surfaceId);
    if (!linkedSurface) {
      errors.push(`Journey "${jid}" references unknown surfaceId "${journey.surfaceId}"`);
    } else if (linkedSurface.surfaceKind !== journey.surfaceKind || linkedSurface.targetType !== journey.targetType) {
      errors.push(`Journey "${jid}" conflates surfaceKind or targetType with surface "${journey.surfaceId}"`);
    }

    const isSupportedCovered = journey.status === 'covered';

    if (isSupportedCovered) {
      if (typeof journey.specPath !== 'string' || !journey.specPath.trim()) {
        errors.push(`Covered journey "${jid}" is missing specPath`);
      }
      if (typeof journey.command !== 'string' || !journey.command.trim()) {
        errors.push(`Covered journey "${jid}" is missing command`);
      }
      if (checkDiskFiles) {
        if (journey.pagePath && !fs.existsSync(path.join(rootDir, journey.pagePath))) {
          errors.push(`Journey "${jid}" pagePath does not exist on disk ("${journey.pagePath}")`);
        }
        if (journey.specPath && !fs.existsSync(path.join(rootDir, journey.specPath))) {
          errors.push(`Journey "${jid}" specPath does not exist on disk ("${journey.specPath}")`);
        }
        for (const extraSpec of journey.additionalSpecPaths || []) {
          if (!fs.existsSync(path.join(rootDir, extraSpec))) {
            errors.push(`Journey "${jid}" additionalSpecPath does not exist on disk ("${extraSpec}")`);
          }
        }
      }
    } else {
      if (journey.status === 'planned') {
        if (typeof journey.targetSprint !== 'string' || !journey.targetSprint.trim()) {
          errors.push(`Uncovered planned journey "${jid}" must declare targetSprint`);
        }
      }
      if (journey.status === 'undecided' && journey.inP0SpaDenominator === true) {
        errors.push(`Undecided journey "${jid}" must not count in P0 SPA denominator`);
      }
      if (journey.status === 'optional-deferred' && (journey.optional !== true || !journey.targetSprint)) {
        errors.push(`Optional-deferred journey "${jid}" must set optional=true and declare targetSprint`);
      }
    }

    const scopeKey = `${journey.targetHandle}::${journey.sourceRef || 'none'}`;
    if (journey.claimUniqueIds === true) {
      registerScopeId(scopePlaceClaims, scopeKey, journey.placeId, jid, 'Place');
      registerScopeId(scopeTransitionClaims, scopeKey, journey.transitionId, jid, 'Transition');
    }

    if (journey.sourceKind === 'fixture-graph-manifest') {
      if (typeof journey.sourceRef !== 'string' || !journey.sourceRef.trim()) {
        errors.push(`Journey "${jid}" is missing sourceRef for fixture-graph-manifest`);
      } else if (checkDiskFiles) {
        const fullGraphPath = path.join(rootDir, journey.sourceRef);
        if (!fs.existsSync(fullGraphPath)) {
          errors.push(`Journey "${jid}" sourceRef does not exist on disk ("${journey.sourceRef}")`);
        } else {
          let envCheck = loadedEnvelopes.get(journey.sourceRef);
          if (!envCheck) {
            const rawEnv = JSON.parse(fs.readFileSync(fullGraphPath, 'utf8'));
            envCheck = {
              envelope: rawEnv,
              result: validateNetEnvelope(rawEnv, { requireErrorRecovery: true })
            };
            loadedEnvelopes.set(journey.sourceRef, envCheck);
            for (const err of envCheck.result.errors) {
              errors.push(`[${journey.sourceRef}] ${err}`);
            }
          }
          const env = envCheck.envelope;
          if (env.targetHandle !== journey.targetHandle) {
            errors.push(`Journey "${jid}" targetHandle "${journey.targetHandle}" does not match manifest targetHandle "${env.targetHandle}"`);
          }
          const placeBinding = env.bindings?.places?.[journey.placeId];
          if (!placeBinding) {
            errors.push(`Journey "${jid}" placeId "${journey.placeId}" is missing from "${journey.sourceRef}"`);
          } else if (placeBinding.pageId !== journey.pageId) {
            errors.push(`Journey "${jid}" pageId "${journey.pageId}" does not match binding pageId "${placeBinding.pageId}"`);
          }
          const transBinding = env.bindings?.transitions?.[journey.transitionId];
          if (!transBinding) {
            errors.push(`Journey "${jid}" transitionId "${journey.transitionId}" is missing from "${journey.sourceRef}"`);
          } else if (transBinding.linkId !== journey.functionalLinkId) {
            errors.push(`Journey "${jid}" functionalLinkId "${journey.functionalLinkId}" does not match binding linkId "${transBinding.linkId}"`);
          }
          if (!Array.isArray(journey.firing_sequence) || journey.firing_sequence.length === 0) {
            errors.push(`Fixture-backed journey "${jid}" must declare a non-empty firing_sequence`);
          } else {
            for (const stepTid of journey.firing_sequence) {
              if (!env.bindings?.transitions?.[stepTid]) {
                errors.push(`Journey "${jid}" firing_sequence references missing Transition "${stepTid}" in "${journey.sourceRef}"`);
              }
            }
          }
        }
      }
    } else if (journey.sourceKind === 'generated-penpot-module') {
      if (journey.sourceRef !== 'js/nav.js') {
        errors.push(`PenPot module journey "${jid}" must reference "js/nav.js"`);
      }
      if (checkDiskFiles && !fs.existsSync(path.join(rootDir, journey.sourceRef))) {
        errors.push(`Journey "${jid}" sourceRef does not exist on disk ("${journey.sourceRef}")`);
      }
      const routeEntry = NAVIGATION_ROUTES.find((r) => r.frameId === journey.pageId && r.handle === journey.targetHandle);
      if (!routeEntry) {
        errors.push(`PenPot journey "${jid}" pageId/targetHandle ("${journey.pageId}" / "${journey.targetHandle}") not found in js/nav.js NAVIGATION_ROUTES`);
      }
      if (journey.status === 'covered') {
        if (!journey.specPath || (checkDiskFiles && !fs.existsSync(path.join(rootDir, journey.specPath)))) {
          errors.push(`PenPot journey "${jid}" cannot count a PenPot edge as covered without an existing Playwright spec`);
        }
        if (!Array.isArray(journey.firing_sequence) || journey.firing_sequence.length === 0) {
          errors.push(`Covered PenPot journey "${jid}" must declare a non-empty firing_sequence`);
        } else {
          for (const edge of journey.firing_sequence) {
            const match = /^penpot:(.+?)->(.+)$/.exec(edge);
            if (!match) {
              errors.push(`Invalid PenPot firing_sequence edge "${edge}" on "${jid}"`);
            } else {
              const [, fromFrameId, toFrameId] = match;
              const fromRoute = NAVIGATION_ROUTES.find((r) => r.frameId === fromFrameId);
              const hasLink = fromRoute?.links?.some((l) => l.destinationFrameId === toFrameId);
              if (!hasLink) {
                errors.push(`PenPot firing_sequence edge "${edge}" on "${jid}" does not exist in js/nav.js`);
              }
            }
          }
        }
      }
    } else if (journey.sourceKind === 'existing-mcard-contract') {
      if (checkDiskFiles && (!journey.sourceRef || !fs.existsSync(path.join(rootDir, journey.sourceRef)))) {
        errors.push(`Journey "${jid}" existing-mcard-contract sourceRef does not exist ("${journey.sourceRef}")`);
      }
      if (!Array.isArray(journey.firing_sequence) || journey.firing_sequence.length === 0) {
        errors.push(`existing-mcard-contract journey "${jid}" must declare a non-empty firing_sequence`);
      } else {
        for (let i = 0; i < journey.firing_sequence.length; i += 1) {
          const step = journey.firing_sequence[i];
          if (step.endsWith('_req')) {
            const nextStep = journey.firing_sequence[i + 1] || '';
            const prefix = step.slice(0, -4);
            if (nextStep !== `${prefix}_ok` && nextStep !== `${prefix}_fail`) {
              errors.push(`Server call "${step}" in journey "${jid}" must be paired with "${prefix}_ok" or "${prefix}_fail"`);
            }
          }
        }
      }
    } else if (journey.sourceKind === 'pending-workbench-net') {
      if (journey.sourcePendingSprint !== 'SPRINT-GQC-02A') {
        errors.push(`Pending workbench journey "${jid}" must declare sourcePendingSprint "SPRINT-GQC-02A"`);
      }
      if (journey.workbenchPlaceId !== null || journey.workbenchTransitionIds.length !== 0) {
        errors.push(`Pending workbench journey "${jid}" must leave workbenchPlaceId=null and workbenchTransitionIds=[] for GQC-02A`);
      }
    }

    if (journey.inP0SpaDenominator === true) {
      p0SpaCount += 1;
      if (journey.surfaceKind !== 'target' || journey.targetType !== 'spa') {
        errors.push(`P0 SPA denominator journey "${jid}" must target a target surface with targetType "spa"`);
      }
      if (journey.status !== 'covered' && !(journey.status === 'planned' && journey.owner && journey.targetSprint)) {
        errors.push(`P0 SPA journey "${jid}" must be covered or have an explicit owner and targetSprint`);
      }
      if (journey.sourceKind !== 'fixture-graph-manifest') {
        errors.push(`P0 SPA journey "${jid}" must reference fixture-graph-manifest in GQC-02`);
      }
      if (!Array.isArray(journey.journeySteps)) {
        errors.push(`P0 SPA journey "${jid}" must declare journeySteps`);
      } else {
        for (const step of REQUIRED_P0_SPA_STEPS) {
          if (!journey.journeySteps.includes(step)) {
            errors.push(`P0 SPA journey "${jid}" is missing required step "${step}"`);
          }
        }
      }
    }

    if (journey.targetType === 'mpa-candidate' && (journey.inP0SpaDenominator === true || journey.optional !== true)) {
      errors.push(`MPA journey "${jid}" must remain optional and excluded from P0 SPA denominator`);
    }
  }

  for (const undecidedId of REQUIRED_UNDECIDED_JOURNEY_IDS) {
    const row = registry.journeys.find((j) => j.journeyId === undecidedId);
    if (!row || row.status !== 'undecided' || row.inP0SpaDenominator !== false) {
      errors.push(`Capability journey "${undecidedId}" must exist with status="undecided" and inP0SpaDenominator=false`);
    }
  }

  if (registry.p0SpaDenominatorCount !== p0SpaCount) {
    errors.push(
      `p0SpaDenominatorCount (${registry.p0SpaDenominatorCount}) does not match P0 SPA journey count (${p0SpaCount})`
    );
  }

  if (checkDiskFiles) {
    const rootHtmlOnDisk = fs
      .readdirSync(rootDir)
      .filter((f) => f.endsWith('.html'))
      .sort();
    const registeredWorkbenchPages = new Set(registry.workbenchSurfaces.map((s) => s.pagePath));
    for (const htmlFile of rootHtmlOnDisk) {
      if (!registeredWorkbenchPages.has(htmlFile)) {
        errors.push(`Root HTML file "${htmlFile}" is missing from workbenchSurfaces`);
      }
    }

    const fixtureHtmlOnDisk = fs
      .readdirSync(path.join(rootDir, 'tests/fixtures'))
      .filter((f) => f.endsWith('.html'))
      .map((f) => `tests/fixtures/${f}`)
      .sort();
    const registeredTargetPages = new Set(registry.targetSurfaces.map((s) => s.pagePath).filter(Boolean));
    for (const fixtureFile of fixtureHtmlOnDisk) {
      if (!registeredTargetPages.has(fixtureFile)) {
        errors.push(`Fixture HTML file "${fixtureFile}" is missing from targetSurfaces`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function replayRegistryFiringSequences(registry, { rootDir = ROOT_DIR } = {}) {
  const results = [];
  for (const journey of registry.journeys || []) {
    if (journey.sourceKind !== 'fixture-graph-manifest') continue;
    const envelope = JSON.parse(fs.readFileSync(path.join(rootDir, journey.sourceRef), 'utf8'));
    const replay = await replayFiringSequence(envelope, journey.firing_sequence);
    results.push({
      journeyId: journey.journeyId,
      stepsFired: replay.records.length,
      finalMarking: replay.finalMarking
    });
  }
  return results;
}

export function formatCoverageSummaryMarkdown(registry, validationResult = validateGuiCoverageRegistry(registry)) {
  const totalJourneys = registry.journeys?.length || 0;
  const coveredJourneys = (registry.journeys || []).filter((j) => j.status === 'covered').length;
  const p0SpaCovered = (registry.journeys || []).filter((j) => j.inP0SpaDenominator && j.status === 'covered').length;
  const optionalCount = (registry.journeys || []).filter((j) => j.optional === true).length;
  const undecidedCount = (registry.journeys || []).filter((j) => j.status === 'undecided').length;
  const pendingWorkbenchCount = (registry.journeys || []).filter((j) => j.sourceKind === 'pending-workbench-net').length;

  const lines = [
    '### GUI Coverage Registry Summary',
    '',
    `- Verdict: ${validationResult.valid ? 'PASS' : 'FAIL'}`,
    `- P0 SPA Denominator Coverage: ${p0SpaCovered} / ${registry.p0SpaDenominatorCount}`,
    `- Covered Journeys: ${coveredJourneys} / ${totalJourneys} (${optionalCount} optional, ${undecidedCount} undecided, ${pendingWorkbenchCount} workbench-net pending GQC-02A)`,
    '',
    '| Journey ID | Kind | Priority | Status | Layer | Spec |',
    '| --- | --- | --- | --- | --- | --- |'
  ];

  for (const j of registry.journeys || []) {
    lines.push(`| ${j.journeyId} | ${j.targetType} | ${j.priority} | ${j.status} | ${j.testLayer} | ${j.specPath || 'n/a'} |`);
  }

  return lines.join('\n');
}

function loadCommittedRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

if (process.env.GQC_SKIP_TEST_REGISTRATION !== '1') {
  test('committed tests/gui-coverage.json satisfies GQC-02 workbench/target separation, source traceability, and file existence contracts', async () => {
    const registry = loadCommittedRegistry();
    const result = validateGuiCoverageRegistry(registry);
    assert.deepEqual(result.errors, []);
    assert.equal(result.valid, true);
    assert.equal(registry.p0SpaDenominatorCount, 2);

    const replays = await replayRegistryFiringSequences(registry);
    assert.equal(replays.length, 2);
    for (const r of replays) {
      assert.ok(r.stepsFired >= 2);
      assert.equal(r.finalMarking.p_spa_overview, 1);
    }

    const summaryMd = formatCoverageSummaryMarkdown(registry, result);
    assert.match(summaryMd, /Verdict: PASS/);
    assert.match(summaryMd, /P0 SPA Denominator Coverage: 2 \/ 2/);
  });

  test('spa-test-target.graph.json passes parsePetriNetYaml, IncidenceMatrix session P-invariant, error recovery, and rejects disabled Transitions', async () => {
    const graphPath = path.join(ROOT_DIR, 'tests/fixtures/spa-test-target.graph.json');
    const envelope = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    const check = validateNetEnvelope(envelope, { requireErrorRecovery: true });
    assert.deepEqual(check.errors, []);
    assert.equal(check.valid, true);

    const vm = new ColoredPetriVM(check.parsedTopology);
    await assert.rejects(
      () => vm.fireTransition('t_spa_back_overview'),
      /not enabled/i
    );

    const dupPlaceEnv = structuredClone(envelope);
    dupPlaceEnv.topology.places.push({ id: 'p_spa_overview', initialTokens: 0 });
    const dupRes = validateNetEnvelope(dupPlaceEnv);
    assert.equal(dupRes.valid, false);
    assert.ok(dupRes.errors.some((e) => e.includes('Duplicate Place ID')));

    const selfLoopEnv = structuredClone(envelope);
    selfLoopEnv.topology.transitions.push({ id: 't_self', inputs: ['p_spa_overview'], outputs: ['p_spa_overview'] });
    selfLoopEnv.bindings.transitions.t_self = {
      kind: 'client-route',
      surface: 'target',
      linkId: 'link_self',
      route: '#self',
      trigger: 'click',
      owner: 'TEA'
    };
    const selfRes = validateNetEnvelope(selfLoopEnv);
    assert.equal(selfRes.valid, false);
    assert.ok(selfRes.errors.some((e) => e.includes('self-loop')));

    const inlineBindingEnv = structuredClone(envelope);
    inlineBindingEnv.topology.transitions[0].binding = { type: 'eval', ref: '/bad' };
    const inlineRes = validateNetEnvelope(inlineBindingEnv);
    assert.equal(inlineRes.valid, false);
    assert.ok(inlineRes.errors.some((e) => e.includes('TransitionDef.binding')));
  });

  test('validator rejects missing pagePath, missing specPath, missing Place/Transition, duplicate scoped IDs, and closed schema mutation', () => {
    const missingPage = structuredClone(loadCommittedRegistry());
    missingPage.workbenchSurfaces[0].pagePath = '';
    const res1 = validateGuiCoverageRegistry(missingPage);
    assert.equal(res1.valid, false);
    assert.ok(res1.errors.some((e) => e.includes('missing pagePath')));

    const ghostSpec = structuredClone(loadCommittedRegistry());
    const coveredIdx = ghostSpec.journeys.findIndex((j) => j.status === 'covered');
    ghostSpec.journeys[coveredIdx].specPath = 'tests/features/missing-file.spec.js';
    const res2 = validateGuiCoverageRegistry(ghostSpec);
    assert.equal(res2.valid, false);
    assert.ok(res2.errors.some((e) => e.includes('specPath does not exist on disk')));

    const missingTransition = structuredClone(loadCommittedRegistry());
    const spaJourney = missingTransition.journeys.find((j) => j.journeyId === 'guided-spa-test');
    spaJourney.firing_sequence = ['t_spa_open_details', 't_nonexistent'];
    const res3 = validateGuiCoverageRegistry(missingTransition);
    assert.equal(res3.valid, false);
    assert.ok(res3.errors.some((e) => e.includes('missing Transition "t_nonexistent"')));

    const dupScopedIds = structuredClone(loadCommittedRegistry());
    const [j1, j2] = dupScopedIds.journeys.filter((j) => j.sourceKind === 'fixture-graph-manifest');
    j1.claimUniqueIds = true;
    j2.claimUniqueIds = true;
    j2.placeId = j1.placeId;
    j2.pageId = j1.pageId;
    const res4 = validateGuiCoverageRegistry(dupScopedIds);
    assert.equal(res4.valid, false);
    assert.ok(res4.errors.some((e) => e.includes('Duplicate Place ID')));

    const unpairedServerCall = structuredClone(loadCommittedRegistry());
    const probeRow = unpairedServerCall.journeys.find((j) => j.sourceKind === 'existing-mcard-contract');
    probeRow.firing_sequence = ['t_probe_capture_save_req'];
    const res5 = validateGuiCoverageRegistry(unpairedServerCall, { checkDiskFiles: false });
    assert.equal(res5.valid, false);
    assert.ok(res5.errors.some((e) => e.includes('must be paired with')));

    const mutatedRunCheck = validateTestRun({
      schema: TEST_RUN_SCHEMA,
      netMCard: 'urn:mcard:injected'
    });
    assert.equal(mutatedRunCheck.valid, false);
  });

  test('validator rejects workbench/target conflation, app.html SPA promotion, mcard route handle as clmTypeUri, MPA in P0 denominator, and undecided promotion', () => {
    const conflatedWorkbench = structuredClone(loadCommittedRegistry());
    conflatedWorkbench.workbenchSurfaces[0].targetType = 'spa';
    const res1 = validateGuiCoverageRegistry(conflatedWorkbench, { checkDiskFiles: false });
    assert.equal(res1.valid, false);
    assert.ok(res1.errors.some((e) => e.includes('conflates workbench')));

    const promotedApp = structuredClone(loadCommittedRegistry());
    const appTarget = promotedApp.targetSurfaces.find((s) => s.pagePath === 'app.html');
    appTarget.targetType = 'spa';
    const res2 = validateGuiCoverageRegistry(promotedApp, { checkDiskFiles: false });
    assert.equal(res2.valid, false);
    assert.ok(res2.errors.some((e) => e.includes('app.html must remain non-P0 and unclassified')));

    const badTypeUri = structuredClone(loadCommittedRegistry());
    badTypeUri.workbenchSurfaces[1].clmTypeUri = 'mcard:route:/index.html';
    const res3 = validateGuiCoverageRegistry(badTypeUri, { checkDiskFiles: false });
    assert.equal(res3.valid, false);
    assert.ok(res3.errors.some((e) => e.includes('clm://type/')));

    const mpaInP0 = structuredClone(loadCommittedRegistry());
    const mpaJourney = mpaInP0.journeys.find((j) => j.targetType === 'mpa-candidate');
    mpaJourney.inP0SpaDenominator = true;
    const res4 = validateGuiCoverageRegistry(mpaInP0, { checkDiskFiles: false });
    assert.equal(res4.valid, false);
    assert.ok(res4.errors.some((e) => e.includes('excluded from P0 SPA denominator')));

    const promotedAuth = structuredClone(loadCommittedRegistry());
    const authRow = promotedAuth.journeys.find((j) => j.journeyId === 'undecided-auth-zitadel');
    authRow.status = 'covered';
    const res5 = validateGuiCoverageRegistry(promotedAuth, { checkDiskFiles: false });
    assert.equal(res5.valid, false);
    assert.ok(res5.errors.some((e) => e.includes('undecided-auth-zitadel')));
  });

  test('Playwright discovery evaluator enforces non-empty category projects, zero exceptions, and zero category overlap', () => {
    assert.deepEqual(KNOWN_ZERO_TEST_EXCEPTIONS, {});

    const healthy = [
      { project: 'smoke', testCount: 30, fileCount: 11, files: ['smoke/a.spec.js'], exitCode: 0, fatalErrors: [] },
      { project: 'components', testCount: 18, fileCount: 14, files: ['components/b.spec.js'], exitCode: 0, fatalErrors: [] },
      { project: 'features', testCount: 557, fileCount: 17, files: ['features/c.spec.js'], exitCode: 0, fatalErrors: [] }
    ];

    const okVerdict = evaluateDiscoveryResults(healthy);
    assert.equal(okVerdict.ok, true);
    assert.equal(okVerdict.warnings.length, 0);
    assert.equal(okVerdict.uniqueCategoryFiles, 42);

    const emptyComponents = [
      healthy[0],
      { project: 'components', testCount: 0, fileCount: 0, files: [], exitCode: 1, fatalErrors: [] },
      healthy[2]
    ];
    const failedComponents = evaluateDiscoveryResults(emptyComponents);
    assert.equal(failedComponents.ok, false);
    assert.ok(failedComponents.failures.some((f) => f.includes('components')));

    const overlappingCategories = [
      healthy[0],
      { project: 'components', testCount: 18, fileCount: 1, files: ['smoke/a.spec.js'], exitCode: 0, fatalErrors: [] },
      healthy[2]
    ];
    const overlapVerdict = evaluateDiscoveryResults(overlappingCategories);
    assert.equal(overlapVerdict.ok, false);
    assert.ok(overlapVerdict.failures.some((f) => f.includes('claimed by multiple category projects')));

    const withCrossBrowserRepeat = [
      ...healthy,
      {
        project: 'smoke-firefox',
        repeatsCategory: 'smoke',
        testCount: 30,
        fileCount: 11,
        files: ['smoke/a.spec.js'],
        exitCode: 0,
        fatalErrors: []
      }
    ];
    const repeatVerdict = evaluateDiscoveryResults(withCrossBrowserRepeat);
    assert.equal(repeatVerdict.ok, true);
    assert.equal(repeatVerdict.crossBrowserRepeatFiles, 11);

    const parsedCounts = countPlaywrightTests({
      suites: [
        {
          file: 'smoke/a.spec.js',
          specs: [{ file: 'smoke/a.spec.js', tests: [{}, {}] }]
        }
      ],
      errors: [{ message: 'Error: No tests found' }]
    });
    assert.deepEqual(parsedCounts, {
      testCount: 2,
      fileCount: 1,
      files: ['smoke/a.spec.js'],
      fatalErrors: []
    });
  });

  test('app-fixtures isolated persistence harness stores and retrieves responsive_test_run:v1 without touching data/mcard-api.db', async () => {
    assert.deepEqual(
      parseSavedRunBadge('💾 mcard:test-run:spa (a1b2c3d4)'),
      { handleSummary: 'mcard:test-run:spa', hashPrefix: 'a1b2c3d4' }
    );
    assert.equal(parseSavedRunBadge('Saving run...'), null);

    const harnessA = await createIsolatedPersistenceHarness();
    const tempDirA = harnessA.tempDir;
    let savedHash = '';
    const targetUrl = 'http://localhost:3001/tests/fixtures/spa-test-target.html';
    try {
      const sampleRun = {
        schema: TEST_RUN_SCHEMA,
        sessionId: 'tr_gqc02_unit_isolated_a',
        target: { url: 'http://localhost:3001/tests/fixtures/spa-test-target.html', slug: 'localhost-3001-tests-fixtures-spa-test-target-html' },
        captureSource: 'same-origin',
        device: {
          id: 'iphone-16-pro',
          name: 'iPhone 16 Pro',
          category: 'phone',
          width: 393,
          height: 852,
          pixelRatio: 3,
          hasTouch: true,
          isMobile: true,
          pointer: 'coarse',
          hover: false,
          schemaVersion: 2
        },
        orientation: 'portrait',
        fidelity: { tier: 0, runner: 'lab-iframe', emulated: ['viewport'], notEmulated: ['hasTouch'] },
        lab: { commit: '99a21cc', clmKernel: '0.0.12' },
        metrics: {
          startedAt: '2026-10-27T17:00:00.000Z',
          activeDurationMs: 320,
          eventCount: 1,
          droppedCount: 0,
          rejectedMessages: 0
        },
        telemetry: {
          overflow: { hasHorizontalOverflow: false, elements: [] },
          frames: { avgFps: 60, maxFrameMs: 16.5, droppedFrames: 0 },
          cls: 0,
          tapTargetViolations: 0
        },
        finalState: {
          url: 'http://localhost:3001/tests/fixtures/spa-test-target.html#details',
          domDigest: 'blake3:unitcheck'
        },
        events: [
          {
            seq: 1,
            t_rel_ms: 85,
            type: 'pointer',
            pointer: { pointerType: 'mouse', button: 0 },
            target: { selector: '[data-testid="btn-open-details"]', tag: 'button' },
            viewport: { w: 393, h: 852, dpr: 1, orientation: 'portrait' },
            coords: { nx: 0.3, ny: 0.4 }
          }
        ]
      };

      const postRes = await fetch(`${harnessA.baseUrl}/api/test-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleRun)
      });
      assert.equal(postRes.status, 201);
      const saved = await postRes.json();
      assert.match(saved.hash, /^[0-9a-f]{64}$/i);
      savedHash = saved.hash;

      const getRes = await fetch(`${harnessA.baseUrl}/api/test-runs/${saved.hash}`);
      assert.equal(getRes.status, 200);
      const body = await getRes.json();
      const roundTripped = body.run || body;
      assert.equal(roundTripped.sessionId, 'tr_gqc02_unit_isolated_a');
    } finally {
      await harnessA.cleanup();
    }
    assert.equal(fs.existsSync(tempDirA), false);

    const harnessB = await createIsolatedPersistenceHarness();
    try {
      const listRes = await fetch(`${harnessB.baseUrl}/api/test-runs?target=${encodeURIComponent(targetUrl)}`);
      assert.equal(listRes.status, 200);
      const listBody = await listRes.json();
      const items = listBody.items || listBody.runs || [];
      assert.equal(items.length, 0);
      const missingRes = await fetch(`${harnessB.baseUrl}/api/test-runs/${savedHash}`);
      assert.equal(missingRes.status, 404);
    } finally {
      await harnessB.cleanup();
    }
  });
}
