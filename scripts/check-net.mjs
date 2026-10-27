import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  parsePetriNetYaml,
  IncidenceMatrix,
  ColoredPetriVM
} from 'clm-kernel/layer1';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SCRIPT_DIR, '..');

export const NET_ENVELOPE_SCHEMA = 'urn:gqc:net-envelope:v1';
export const DEFAULT_NET_FILES = [
  'src/net/workbench-net.yaml',
  'tests/fixtures/spa-test-target.graph.json'
];

export const ALLOWED_PLACE_KINDS = new Set([
  'page',
  'view',
  'pending',
  'error',
  'external'
]);

export const SESSION_PLACE_KINDS = new Set([
  'page',
  'view',
  'pending',
  'error'
]);

export const ALLOWED_TRANSITION_KINDS = new Set([
  'link',
  'redirect',
  'client-route',
  'server-call-request',
  'server-call-ok',
  'server-call-fail',
  'recover',
  'open-external'
]);

export const ALLOWED_MIGRATION_STATES = new Set([
  'legacy-static',
  'astro-wrapped',
  'astro-islands'
]);

function parseSprintRank(sprintId) {
  const match = /^SPRINT-GQC-(\d+)([A-Z]?)$/.exec(String(sprintId || '').trim());
  if (!match) return null;
  const major = Number(match[1]);
  const suffix = match[2] ? match[2].charCodeAt(0) : 0;
  return major * 100 + suffix;
}

export function isExceptionActive(exception, currentSprint = 'SPRINT-GQC-02A') {
  if (!exception || typeof exception !== 'object') return false;
  if (typeof exception.owner !== 'string' || !exception.owner.trim()) return false;
  if (typeof exception.reason !== 'string' || !exception.reason.trim()) return false;
  if (typeof exception.expiresSprint !== 'string' || !exception.expiresSprint.trim()) return false;
  const nowRank = parseSprintRank(currentSprint);
  const expRank = parseSprintRank(exception.expiresSprint);
  if (nowRank === null || expRank === null) return false;
  return nowRank < expRank;
}

export function loadNetEnvelope(filePath) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT_DIR, filePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  if (fullPath.endsWith('.yaml') || fullPath.endsWith('.yml')) {
    return yaml.load(raw);
  }
  return JSON.parse(raw);
}

function sortedJoin(arr) {
  return [...arr].sort().join('\u0000');
}

function buildSessionWeightMap(places, placeBindings) {
  const weights = {};
  for (const place of places) {
    const kind = placeBindings[place.id]?.kind;
    weights[place.id] = kind === 'external' ? 0 : 1;
  }
  return weights;
}

function computeReachability(parsedTopology, entryPlaceId, placeBindings) {
  const sessionPlaceIds = parsedTopology.places
    .map((p) => p.id)
    .filter((id) => placeBindings[id]?.kind !== 'external');
  const sessionPlaceSet = new Set(sessionPlaceIds);

  const serializeMarking = (marking) =>
    sessionPlaceIds.map((id) => `${id}:${marking[id] || 0}`).join('|');

  const makeSeedMarking = (seedPlaceId) => {
    const m = {};
    for (const id of sessionPlaceIds) {
      m[id] = id === seedPlaceId ? 1 : 0;
    }
    return m;
  };

  const seedPlaceIds = new Set([entryPlaceId]);
  for (const [placeId, binding] of Object.entries(placeBindings)) {
    if (binding?.deepLinkEntry === true && sessionPlaceSet.has(placeId)) {
      seedPlaceIds.add(placeId);
    }
  }

  const visitedMarkings = new Map();
  const queue = [];
  const reachedPlaces = new Set();
  const enabledTransitions = new Set();

  for (const seedId of seedPlaceIds) {
    if (!sessionPlaceSet.has(seedId)) continue;
    const seedMarking = makeSeedMarking(seedId);
    const key = serializeMarking(seedMarking);
    if (!visitedMarkings.has(key)) {
      visitedMarkings.set(key, seedMarking);
      queue.push(seedMarking);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    for (const id of sessionPlaceIds) {
      if ((current[id] || 0) > 0) reachedPlaces.add(id);
    }

    for (const transition of parsedTopology.transitions) {
      const inputCounts = {};
      for (const inId of transition.inputs) {
        if (!sessionPlaceSet.has(inId)) continue;
        inputCounts[inId] = (inputCounts[inId] || 0) + 1;
      }
      const isEnabled = Object.entries(inputCounts).every(
        ([inId, needed]) => (current[inId] || 0) >= needed
      );
      if (!isEnabled) continue;

      enabledTransitions.add(transition.id);
      const next = { ...current };
      for (const [inId, needed] of Object.entries(inputCounts)) {
        next[inId] -= needed;
      }
      for (const outId of transition.outputs) {
        if (sessionPlaceSet.has(outId)) {
          next[outId] = (next[outId] || 0) + 1;
        } else {
          reachedPlaces.add(outId);
        }
      }

      const totalSessionTokens = sessionPlaceIds.reduce((acc, id) => acc + (next[id] || 0), 0);
      if (totalSessionTokens <= 1) {
        const key = serializeMarking(next);
        if (!visitedMarkings.has(key)) {
          visitedMarkings.set(key, next);
          queue.push(next);
        }
      }
    }
  }

  return {
    reachedPlaces,
    enabledTransitions,
    reachableMarkingCount: visitedMarkings.size
  };
}

export function validateNetEnvelope(
  envelope,
  { filePath = '<memory>', currentSprint = 'SPRINT-GQC-02A' } = {}
) {
  const violations = [];
  const fail = (id, rule, message) => {
    violations.push({ file: filePath, id, rule, message });
  };

  if (!envelope || typeof envelope !== 'object') {
    fail('envelope', 'envelope-schema-mismatch', 'Envelope must be a non-null object');
    return { valid: false, violations, parsedTopology: null, sessionInvariantHolds: false };
  }

  if (envelope.schema !== NET_ENVELOPE_SCHEMA) {
    fail(
      envelope.netId || 'envelope',
      'envelope-schema-mismatch',
      `Expected schema "${NET_ENVELOPE_SCHEMA}", got "${envelope.schema}"`
    );
  }

  const rawPlaces = Array.isArray(envelope.topology?.places) ? envelope.topology.places : [];
  const rawTransitions = Array.isArray(envelope.topology?.transitions)
    ? envelope.topology.transitions
    : [];
  const placeBindings = envelope.bindings?.places || {};
  const transitionBindings = envelope.bindings?.transitions || {};

  const seenPlaceIds = new Set();
  for (const place of rawPlaces) {
    if (seenPlaceIds.has(place.id)) {
      fail(place.id, 'duplicate-place-id', `Duplicate Place ID "${place.id}" in topology`);
    }
    seenPlaceIds.add(place.id);
  }

  const seenTransitionIds = new Set();
  for (const transition of rawTransitions) {
    if (seenTransitionIds.has(transition.id)) {
      fail(
        transition.id,
        'duplicate-transition-id',
        `Duplicate Transition ID "${transition.id}" in topology`
      );
    }
    seenTransitionIds.add(transition.id);

    if (transition.binding !== undefined) {
      fail(
        transition.id,
        'forbidden-transition-binding',
        `Transition "${transition.id}" must not set TransitionDef.binding inside topology`
      );
    }
  }

  let parsedTopology = null;
  try {
    parsedTopology = parsePetriNetYaml(yaml.dump(envelope.topology));
  } catch (err) {
    fail(
      envelope.netId || 'topology',
      'kernel-parse-error',
      err instanceof Error ? err.message : String(err)
    );
    return { valid: false, violations, parsedTopology: null, sessionInvariantHolds: false };
  }

  if (!seenPlaceIds.has(envelope.entryPlaceId)) {
    fail(
      String(envelope.entryPlaceId || 'entryPlaceId'),
      'dangling-binding',
      `entryPlaceId "${envelope.entryPlaceId}" is not declared in topology.places`
    );
  }

  for (const place of rawPlaces) {
    if (!Object.prototype.hasOwnProperty.call(placeBindings, place.id)) {
      fail(place.id, 'missing-binding', `Place "${place.id}" has no entry in bindings.places`);
    }
  }

  for (const boundPlaceId of Object.keys(placeBindings)) {
    if (!seenPlaceIds.has(boundPlaceId)) {
      fail(
        boundPlaceId,
        'dangling-binding',
        `bindings.places entry "${boundPlaceId}" is not declared in topology.places`
      );
    }
  }

  for (const transition of rawTransitions) {
    if (!Object.prototype.hasOwnProperty.call(transitionBindings, transition.id)) {
      fail(
        transition.id,
        'missing-binding',
        `Transition "${transition.id}" has no entry in bindings.transitions`
      );
    }
  }

  for (const boundTransitionId of Object.keys(transitionBindings)) {
    if (!seenTransitionIds.has(boundTransitionId)) {
      fail(
        boundTransitionId,
        'dangling-binding',
        `bindings.transitions entry "${boundTransitionId}" is not declared in topology.transitions`
      );
    }
  }

  const pageRoutes = new Map();
  for (const [placeId, binding] of Object.entries(placeBindings)) {
    if (!seenPlaceIds.has(placeId)) continue;
    if (!binding || !ALLOWED_PLACE_KINDS.has(binding.kind)) {
      fail(
        placeId,
        'missing-place-kind',
        `Place "${placeId}" must declare a valid kind in bindings.places`
      );
      continue;
    }

    if (typeof binding.route !== 'string' || !binding.route.trim()) {
      fail(placeId, 'conflated-place-identifiers', `Place "${placeId}" is missing route`);
    }
    if (typeof binding.routeHandle !== 'string' || !binding.routeHandle.trim()) {
      fail(placeId, 'conflated-place-identifiers', `Place "${placeId}" is missing routeHandle`);
    }
    if (binding.clmTypeUri !== undefined && binding.clmTypeUri !== null) {
      if (
        typeof binding.clmTypeUri !== 'string' ||
        !binding.clmTypeUri.startsWith('clm://type/') ||
        binding.clmTypeUri === placeId ||
        binding.clmTypeUri === binding.route ||
        binding.clmTypeUri === binding.routeHandle
      ) {
        fail(
          placeId,
          'conflated-place-identifiers',
          `Place "${placeId}" clmTypeUri "${binding.clmTypeUri}" must start with clm://type/ and stay separate from routeHandle and Place ID`
        );
      }
    }
    if (binding.mcardHash !== undefined && binding.mcardHash !== null) {
      if (
        binding.mcardHash === placeId ||
        binding.mcardHash === binding.route ||
        binding.mcardHash === binding.routeHandle ||
        binding.mcardHash === binding.clmTypeUri
      ) {
        fail(
          placeId,
          'conflated-place-identifiers',
          `Place "${placeId}" mcardHash must stay separate from Place ID, route, routeHandle, and clmTypeUri`
        );
      }
    }

    if (binding.kind === 'page') {
      if (!ALLOWED_MIGRATION_STATES.has(binding.migrationState)) {
        fail(
          placeId,
          'conflated-place-identifiers',
          `Page Place "${placeId}" must declare migrationState as legacy-static, astro-wrapped, or astro-islands`
        );
      }
      if (binding.route) {
        const prev = pageRoutes.get(binding.route);
        if (prev) {
          fail(
            placeId,
            'duplicate-page-route',
            `Page Place "${placeId}" duplicates route "${binding.route}" already owned by "${prev}"`
          );
        } else {
          pageRoutes.set(binding.route, placeId);
        }
      }
    }
  }

  for (const transition of parsedTopology.transitions) {
    const binding = transitionBindings[transition.id];
    if (!binding || !ALLOWED_TRANSITION_KINDS.has(binding.kind)) {
      fail(
        transition.id,
        'missing-transition-kind',
        `Transition "${transition.id}" must declare a valid kind in bindings.transitions`
      );
      continue;
    }

    if (
      transition.inputs.length > 0 &&
      transition.inputs.length === transition.outputs.length &&
      sortedJoin(transition.inputs) === sortedJoin(transition.outputs)
    ) {
      fail(
        transition.id,
        'self-loop-transition',
        `Transition "${transition.id}" is a self-loop whose incidence column vanishes`
      );
    }

    if (binding.kind === 'server-call-request') {
      const pendingId = transition.outputs[0];
      const pendingBinding = placeBindings[pendingId];
      if (!pendingId || pendingBinding?.kind !== 'pending' || transition.outputs.length !== 1) {
        fail(
          transition.id,
          'unmatched-server-call-pending',
          `server-call-request "${transition.id}" must target a single pending Place`
        );
      } else {
        const resultTransitions = parsedTopology.transitions.filter((candidate) => {
          const cKind = transitionBindings[candidate.id]?.kind;
          return (
            candidate.inputs.includes(pendingId) &&
            (cKind === 'server-call-ok' || cKind === 'server-call-fail')
          );
        });
        if (resultTransitions.length === 0) {
          fail(
            pendingId,
            'unmatched-server-call-pending',
            `Pending Place "${pendingId}" from "${transition.id}" has no server-call-ok or server-call-fail Transition`
          );
        }
      }
    }
  }

  const sessionWeights = buildSessionWeightMap(parsedTopology.places, placeBindings);
  const initialMarking = {};
  let initialSessionTokens = 0;
  for (const place of parsedTopology.places) {
    const count = Number(place.initialTokens || 0);
    initialMarking[place.id] = count;
    if (sessionWeights[place.id] === 1) {
      initialSessionTokens += count;
    }
  }

  if (
    initialSessionTokens !== 1 ||
    initialMarking[envelope.entryPlaceId] !== 1 ||
    placeBindings[envelope.entryPlaceId]?.entry !== true
  ) {
    fail(
      envelope.entryPlaceId || 'entryPlaceId',
      'invalid-entry-marking',
      `Entry marking must hold 1 session token in entryPlaceId "${envelope.entryPlaceId}" (found total=${initialSessionTokens})`
    );
  }

  const matrix = IncidenceMatrix.fromTopology(parsedTopology);
  let allColumnsConserveSession = true;
  for (let col = 0; col < matrix.transitions.length; col += 1) {
    let dot = 0;
    for (let row = 0; row < matrix.places.length; row += 1) {
      const placeId = matrix.places[row];
      dot += (sessionWeights[placeId] || 0) * matrix.d[row][col];
    }
    if (dot !== 0) {
      allColumnsConserveSession = false;
      fail(
        matrix.transitions[col],
        'broken-session-p-invariant',
        `Transition "${matrix.transitions[col]}" violates y^T * D = 0 with delta=${dot}`
      );
    }
  }

  const initialInvariantOk = matrix.verifyPInvariant(initialMarking, sessionWeights, 1);
  const sessionInvariantHolds = allColumnsConserveSession && initialInvariantOk;
  if (!initialInvariantOk && initialSessionTokens === 1) {
    fail(
      envelope.entryPlaceId || 'entryPlaceId',
      'broken-session-p-invariant',
      'Initial marking failed IncidenceMatrix.verifyPInvariant(..., 1)'
    );
  }

  const reachability = computeReachability(parsedTopology, envelope.entryPlaceId, placeBindings);

  for (const place of parsedTopology.places) {
    const binding = placeBindings[place.id];
    if (!binding) continue;
    if (binding.kind === 'page' && !reachability.reachedPlaces.has(place.id)) {
      if (!isExceptionActive(binding.exception, currentSprint)) {
        fail(
          place.id,
          'unreachable-page-place',
          `Page Place "${place.id}" is unreachable from entryPlaceId and all deepLinkEntry Places`
        );
      }
    }
  }

  for (const transition of parsedTopology.transitions) {
    const binding = transitionBindings[transition.id];
    if (!reachability.enabledTransitions.has(transition.id)) {
      if (!isExceptionActive(binding?.exception, currentSprint)) {
        fail(
          transition.id,
          'never-enabled-transition',
          `Transition "${transition.id}" is never enabled in any reachable 1-safe session marking`
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    parsedTopology,
    matrix,
    sessionWeights,
    sessionInvariantHolds,
    reachableMarkingCount: reachability.reachableMarkingCount,
    reachedPlaces: [...reachability.reachedPlaces],
    enabledTransitions: [...reachability.enabledTransitions]
  };
}

export function extractMountedExpressEndpoints(rootDir = ROOT_DIR) {
  const endpoints = [];
  const wsServerText = fs.readFileSync(path.join(rootDir, 'ws-server.js'), 'utf8');
  for (const match of wsServerText.matchAll(/app\.(get|post|put|delete)\(\s*['"]([^'"]+)['"]/g)) {
    endpoints.push({
      httpMethod: match[1].toUpperCase(),
      httpPath: match[2],
      source: 'ws-server.js'
    });
  }
  if (/new WebSocketServer/.test(wsServerText) && /\/ws\//.test(wsServerText)) {
    endpoints.push({
      httpMethod: 'WS',
      httpPath: '/ws/',
      source: 'ws-server.js'
    });
  }

  const routerMounts = [
    { prefix: '/api/test-runs', relFile: 'server/test-run-api.mjs' },
    { prefix: '/api/auth', relFile: 'routes/auth.js' },
    { prefix: '/api/clm', relFile: 'routes/clm.js' },
    { prefix: '/api/mcard', relFile: 'server/mcard-api.mjs' }
  ];

  for (const mount of routerMounts) {
    const src = fs.readFileSync(path.join(rootDir, mount.relFile), 'utf8');
    for (const match of src.matchAll(/router\.(get|post|put|delete)\(\s*['"]([^'"]+)['"]/g)) {
      const sub = match[2];
      const fullPath = sub === '/' ? mount.prefix : `${mount.prefix}${sub}`;
      endpoints.push({
        httpMethod: match[1].toUpperCase(),
        httpPath: fullPath,
        source: mount.relFile
      });
    }
  }

  return endpoints;
}

export function validateExpressEndpointCoverage(envelope, rootDir = ROOT_DIR) {
  const violations = [];
  const mounted = extractMountedExpressEndpoints(rootDir);
  const boundKeys = new Set();
  for (const binding of Object.values(envelope.bindings?.transitions || {})) {
    if (binding?.kind === 'server-call-request' && binding.httpMethod && binding.httpPath) {
      boundKeys.add(`${binding.httpMethod.toUpperCase()} ${binding.httpPath}`);
    }
  }

  const nonUiKeys = new Set();
  for (const item of envelope.bindings?.nonUiEndpoints || []) {
    const key = `${String(item.httpMethod || '').toUpperCase()} ${item.httpPath}`;
    if (item.status !== 'not-ui-reachable' || !item.owner || !item.reason) {
      violations.push({
        file: 'src/net/workbench-net.yaml',
        id: key,
        rule: 'invalid-non-ui-endpoint',
        message: `nonUiEndpoints entry "${key}" must set status=not-ui-reachable, owner, and reason`
      });
    }
    if (boundKeys.has(key)) {
      violations.push({
        file: 'src/net/workbench-net.yaml',
        id: key,
        rule: 'conflicting-endpoint-classification',
        message: `Endpoint "${key}" is both bound to a Transition and marked not-ui-reachable`
      });
    }
    nonUiKeys.add(key);
  }

  for (const ep of mounted) {
    const key = `${ep.httpMethod} ${ep.httpPath}`;
    if (!boundKeys.has(key) && !nonUiKeys.has(key)) {
      violations.push({
        file: ep.source,
        id: key,
        rule: 'unaccounted-express-endpoint',
        message: `Mounted Express endpoint "${key}" is neither bound to a Transition nor marked not-ui-reachable`
      });
    }
  }

  return {
    valid: violations.length === 0,
    mountedCount: mounted.length,
    boundCount: boundKeys.size,
    nonUiCount: nonUiKeys.size,
    violations
  };
}

export async function replayNetTrace(envelope, trace) {
  const traceId = trace?.traceId || 'unnamed-trace';
  const entryPlaceId = trace?.entryPlaceId;
  const events = Array.isArray(trace?.events) ? trace.events : [];
  const placeBindings = envelope?.bindings?.places || {};
  const transitionBindings = envelope?.bindings?.transitions || {};

  if (!entryPlaceId && events.length > 0 && events[0]?.unmapped === true) {
    return {
      ok: false,
      traceId,
      failedEventIndex: 0,
      transitionId: null,
      unmappedUrl: events[0].url || null,
      reason: 'undeclared-transition',
      message: `Trace "${traceId}" event 0 references undeclared unmapped URL "${events[0].url}"`
    };
  }

  const entryBinding = placeBindings[entryPlaceId];
  const isValidEntry =
    Boolean(entryBinding) &&
    (entryPlaceId === envelope.entryPlaceId || entryBinding.deepLinkEntry === true);

  if (!isValidEntry) {
    return {
      ok: false,
      traceId,
      failedEventIndex: -1,
      transitionId: null,
      reason: 'invalid-trace-entry-place',
      message: `Trace "${traceId}" entryPlaceId "${entryPlaceId}" is neither net entryPlaceId nor a declared deepLinkEntry Place`
    };
  }

  const seededRawTopology = structuredClone(envelope.topology);
  for (const place of seededRawTopology.places) {
    place.initialTokens = place.id === entryPlaceId ? 1 : 0;
  }

  const seededTopology = parsePetriNetYaml(yaml.dump(seededRawTopology));
  const sessionWeights = buildSessionWeightMap(seededTopology.places, placeBindings);
  const vm = new ColoredPetriVM(seededTopology);

  const resolveActiveSessionPlace = (marking) => {
    const holders = Object.entries(marking)
      .filter(([placeId, count]) => sessionWeights[placeId] === 1 && count > 0)
      .map(([placeId]) => placeId);
    return holders.length === 1 ? holders[0] : null;
  };

  const firedTransitionIds = [];
  for (let idx = 0; idx < events.length; idx += 1) {
    const event = events[idx];
    const transitionId = event?.transitionId || null;

    if (event?.unmapped === true || !transitionId || !transitionBindings[transitionId]) {
      const detail = event?.url ? `unmapped URL "${event.url}"` : `Transition "${transitionId}"`;
      return {
        ok: false,
        traceId,
        failedEventIndex: idx,
        transitionId,
        unmappedUrl: event?.url || null,
        reason: 'undeclared-transition',
        message: `Trace "${traceId}" event ${idx} references undeclared ${detail}`
      };
    }

    const currentSessionPlace = resolveActiveSessionPlace(vm.getMarking());
    if (event.fromPlaceId && currentSessionPlace && event.fromPlaceId !== currentSessionPlace) {
      return {
        ok: false,
        traceId,
        failedEventIndex: idx,
        transitionId,
        reason: 'disabled-transition',
        message: `Trace "${traceId}" event ${idx} expected fromPlaceId "${event.fromPlaceId}" while session token is in "${currentSessionPlace}" for "${transitionId}"`
      };
    }

    let firingRecord;
    try {
      firingRecord = await vm.fireTransition(transitionId);
    } catch (err) {
      return {
        ok: false,
        traceId,
        failedEventIndex: idx,
        transitionId,
        reason: 'disabled-transition',
        message: err instanceof Error ? err.message : String(err)
      };
    }

    firedTransitionIds.push(transitionId);
    const invariantOk = vm.matrix.verifyPInvariant(firingRecord.postMarking, sessionWeights, 1);
    if (!invariantOk) {
      return {
        ok: false,
        traceId,
        failedEventIndex: idx,
        transitionId,
        reason: 'broken-session-p-invariant',
        message: `Trace "${traceId}" event ${idx} broke session P-invariant after firing "${transitionId}"`
      };
    }

    const nextSessionPlace = resolveActiveSessionPlace(firingRecord.postMarking);
    if (event.toPlaceId && nextSessionPlace && event.toPlaceId !== nextSessionPlace) {
      return {
        ok: false,
        traceId,
        failedEventIndex: idx,
        transitionId,
        reason: 'post-place-mismatch',
        message: `Trace "${traceId}" event ${idx} landed in "${nextSessionPlace}", expected "${event.toPlaceId}"`
      };
    }
  }

  const finalMarking = vm.getMarking();
  const finalPlaceId = resolveActiveSessionPlace(finalMarking);
  const sessionInvariantHolds = vm.matrix.verifyPInvariant(finalMarking, sessionWeights, 1);

  return {
    ok: true,
    traceId,
    entryPlaceId,
    finalPlaceId,
    finalMarking,
    firedTransitionIds,
    stepCount: firedTransitionIds.length,
    sessionInvariantHolds
  };
}

export function computeTransitionCoverage(
  envelope,
  { guiCoverage = null, replayedTraces = [] } = {}
) {
  const declaredIds = (envelope?.topology?.transitions || []).map((t) => t.id);
  const declaredSet = new Set(declaredIds);
  const firedSet = new Set();
  const assertedSet = new Set();

  if (guiCoverage && Array.isArray(guiCoverage.journeys)) {
    for (const journey of guiCoverage.journeys) {
      if (journey.status !== 'covered') continue;
      for (const tid of journey.firing_sequence || []) {
        if (declaredSet.has(tid)) {
          firedSet.add(tid);
          assertedSet.add(tid);
        }
      }
      for (const tid of journey.workbenchTransitionIds || []) {
        if (declaredSet.has(tid)) {
          firedSet.add(tid);
          assertedSet.add(tid);
        }
      }
    }
  }

  for (const trace of replayedTraces) {
    const ids = Array.isArray(trace?.firedTransitionIds)
      ? trace.firedTransitionIds
      : (trace?.events || []).map((e) => e.transitionId);
    for (const tid of ids) {
      if (declaredSet.has(tid)) {
        firedSet.add(tid);
        if (trace?.asserted !== false) {
          assertedSet.add(tid);
        }
      }
    }
  }

  const declared = declaredIds.length;
  const fired = firedSet.size;
  const asserted = assertedSet.size;
  const ratio = declared === 0 ? 1 : Number((asserted / declared).toFixed(4));

  return {
    netId: envelope.netId,
    declared,
    fired,
    asserted,
    coverageRatio: ratio,
    policy: 'ADVISORY',
    blocking: false,
    firedTransitionIds: [...firedSet].sort(),
    assertedTransitionIds: [...assertedSet].sort(),
    uncoveredTransitionIds: declaredIds.filter((id) => !assertedSet.has(id))
  };
}

export function formatNetCoverageMarkdown(entries) {
  const lines = [
    '### Layer 1 site net and Transition coverage summary',
    '',
    '- Policy status is ADVISORY until TEA and Product Manager approve a blocking floor in SPRINT-GQC-06.',
    '',
    '| Net ID | File | Places | Declared | Fired | Asserted | Coverage | Policy |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const entry of entries) {
    const pct = `${(entry.coverage.coverageRatio * 100).toFixed(1)}%`;
    lines.push(
      `| ${entry.coverage.netId} | ${entry.filePath} | ${entry.placeCount} | ${entry.coverage.declared} | ${entry.coverage.fired} | ${entry.coverage.asserted} | ${pct} | ${entry.coverage.policy} |`
    );
  }

  return lines.join('\n');
}

export function runCli(argv = process.argv.slice(2)) {
  const writeStepSummary = argv.includes('--write-step-summary');
  const markdownOnly = argv.includes('--markdown');
  const explicitFiles = argv.filter((arg) => !arg.startsWith('--'));
  const targetFiles = explicitFiles.length > 0 ? explicitFiles : DEFAULT_NET_FILES;

  const guiCoveragePath = path.join(ROOT_DIR, 'tests/gui-coverage.json');
  const guiCoverage = fs.existsSync(guiCoveragePath)
    ? JSON.parse(fs.readFileSync(guiCoveragePath, 'utf8'))
    : null;

  const allViolations = [];
  const summaryEntries = [];

  for (const relPath of targetFiles) {
    const envelope = loadNetEnvelope(relPath);
    const result = validateNetEnvelope(envelope, {
      filePath: relPath,
      currentSprint: 'SPRINT-GQC-02A'
    });
    allViolations.push(...result.violations);

    if (Array.isArray(envelope.bindings?.nonUiEndpoints)) {
      const endpointAudit = validateExpressEndpointCoverage(envelope, ROOT_DIR);
      allViolations.push(...endpointAudit.violations);
    }

    const coverage = computeTransitionCoverage(envelope, { guiCoverage });
    summaryEntries.push({
      filePath: relPath,
      placeCount: result.parsedTopology ? result.parsedTopology.places.length : 0,
      reachableMarkingCount: result.reachableMarkingCount || 0,
      coverage
    });
  }

  if (allViolations.length > 0) {
    for (const v of allViolations) {
      process.stderr.write(`[${v.file}] id=${v.id} rule=${v.rule} ${v.message}\n`);
    }
    return 1;
  }

  const markdown = formatNetCoverageMarkdown(summaryEntries);
  if (writeStepSummary && process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, 'utf8');
  }

  if (markdownOnly) {
    process.stdout.write(`${markdown}\n`);
  } else {
    for (const entry of summaryEntries) {
      const c = entry.coverage;
      process.stdout.write(
        `PASS ${entry.filePath} net=${c.netId} places=${entry.placeCount} transitions=${c.declared} reachableMarkings=${entry.reachableMarkingCount} sessionPInvariant=true coverage=${c.asserted}/${c.declared} fired=${c.fired} policy=${c.policy}\n`
      );
    }
  }

  return 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli();
}
