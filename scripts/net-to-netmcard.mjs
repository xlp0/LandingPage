import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  PlaceMCard,
  TransitionMCard,
  TokenMCard,
  NetMCard,
  MCardMarking,
  FiringReceiptMCard,
  Layer4TrellisNavigationNet
} from 'clm-kernel';
import {
  parsePetriNetYaml,
  ColoredPetriVM
} from 'clm-kernel/layer1';
import {
  CanonicalTriadBackend,
  DEFAULT_ALGORITHM,
  formatGTime,
  hashContent
} from '../server/mcard-api.mjs';
import { canonicalJson } from '../js/harness/test-run-schema.js';
import {
  ROOT_DIR,
  SESSION_PLACE_KINDS,
  loadNetEnvelope,
  validateNetEnvelope
} from './check-net.mjs';

export const CLM_VIEW_TYPE_URI_PATTERN = /^clm:\/\/type\/view\/[a-z0-9._/-]+$/;
export const NET_BINDINGS_SCHEMA = 'urn:gqc:net-bindings:v1';
export const WORKBENCH_TRACE_SCHEMA = 'urn:gqc:workbench-firing-trace:v1';
export const INITIAL_MARKING_SCHEMA = 'urn:gqc:session-marking:v1';

const FIXED_METADATA_DATE = new Date('2026-04-16T00:00:00.000Z');

export function checkClmViewTypeUri(uri, context = {}) {
  if (typeof uri !== 'string' || !uri.trim()) {
    return {
      valid: false,
      error: `Place "${context.placeId || 'unknown'}" requires a non-empty clmTypeUri`
    };
  }
  const trimmed = uri.trim();
  if (trimmed.startsWith('mcard:')) {
    return {
      valid: false,
      error: `Place "${context.placeId || 'unknown'}" must not pass route handle "${trimmed}" as clmTypeUri`
    };
  }
  if (!CLM_VIEW_TYPE_URI_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: `Place "${context.placeId || 'unknown'}" clmTypeUri "${trimmed}" must match clm://type/view/<segment>`
    };
  }
  if (
    trimmed === context.placeId ||
    (context.route && trimmed === context.route) ||
    (context.routeHandle && trimmed === context.routeHandle)
  ) {
    return {
      valid: false,
      error: `Place "${context.placeId || 'unknown'}" clmTypeUri "${trimmed}" conflates Place ID or routeHandle`
    };
  }
  return { valid: true, uri: trimmed };
}

export function validateClmViewTypeUri(uri, context = {}) {
  const res = checkClmViewTypeUri(uri, context);
  if (!res.valid) {
    const err = new TypeError(res.error);
    err.code = 'INVALID_CLM_VIEW_TYPE_URI';
    throw err;
  }
  return res.uri;
}

export function storeKernelMCard(storage, kernelItem, handle = null) {
  const card = kernelItem?.card;
  if (!card || !card.hash || card.content === undefined) {
    throw new Error('Invalid kernel MCard object missing card envelope');
  }
  const rawBytes = Buffer.isBuffer(card.content)
    ? card.content
    : Buffer.from(card.content, 'utf8');
  const putRes = storage.put(rawBytes, {
    algorithm: DEFAULT_ALGORITHM,
    gTime: card.gTime
  });
  if (putRes.hash !== card.hash) {
    throw new Error(`Triad hash mismatch: kernel=${card.hash} storage=${putRes.hash}`);
  }
  if (handle) {
    storage.bindHandle(handle, putRes.hash);
  }
  return putRes;
}

export function storeJsonMCard(storage, payload, { handle = null, typeTag = 'gqc_meta', date = FIXED_METADATA_DATE } = {}) {
  const serialized = canonicalJson(payload);
  const gTime = `${formatGTime(DEFAULT_ALGORITHM, date, 'en-US')}|type=${typeTag}`;
  const putRes = storage.put(serialized, {
    algorithm: DEFAULT_ALGORITHM,
    gTime
  });
  if (handle) {
    storage.bindHandle(handle, putRes.hash);
  }
  return { ...putRes, serialized };
}

export function buildNetBindingsPayload(envelope, netMCardHash) {
  return {
    schema: NET_BINDINGS_SCHEMA,
    netId: String(envelope.netId || envelope.topology?.name || 'net'),
    netMCardHash,
    entryPlaceId: String(envelope.entryPlaceId || ''),
    targetHandle: envelope.targetHandle ? String(envelope.targetHandle) : null,
    bindings: envelope.bindings || {}
  };
}

export function buildWorkbenchNetMCard(workbenchEnvelope) {
  if (!workbenchEnvelope?.topology) {
    throw new Error('Workbench net envelope requires a topology section');
  }
  const parsedTopology = parsePetriNetYaml(yaml.dump(workbenchEnvelope.topology));
  const netId = String(parsedTopology.name || workbenchEnvelope.netId || 'workbench-net');

  const placeCards = parsedTopology.places.map((place) =>
    PlaceMCard.create(place.id, {
      typeExpr: 'clm://type/place/workbench',
      role: Number(place.initialTokens || 0) > 0 ? 'Entry' : 'Intermediate',
      capacity: place.capacity ?? null
    })
  );

  const transitionCards = parsedTopology.transitions.map((transition) =>
    TransitionMCard.create(transition.id, transition.inputs, transition.outputs, {
      domainType: 'clm://type/token/workbench-session',
      codomainType: 'clm://type/token/workbench-session',
      operationExpr: `${transition.id}(${transition.inputs.join(',')})->(${transition.outputs.join(',')})`
    })
  );

  const initialMarking = {};
  const initialTokens = [];
  for (const place of parsedTopology.places) {
    const count = Number(place.initialTokens || 0);
    const toks = [];
    for (let idx = 0; idx < count; idx += 1) {
      const tok = TokenMCard.fromJson(
        {
          net_id: netId,
          place_id: place.id,
          token_index: idx
        },
        'clm://type/token/workbench-session'
      );
      toks.push(tok);
      initialTokens.push(tok);
    }
    initialMarking[place.id] = toks;
  }

  const netMCard = NetMCard.create(netId, placeCards, transitionCards, initialMarking);
  const bindingsPayload = buildNetBindingsPayload(workbenchEnvelope, netMCard.card.hash);

  return {
    netId,
    netMCard,
    placeCards,
    transitionCards,
    initialTokens,
    bindingsPayload
  };
}

export function persistWorkbenchNetToTriad(storage, workbenchEnvelope) {
  const built = buildWorkbenchNetMCard(workbenchEnvelope);
  for (const placeCard of built.placeCards) {
    storeKernelMCard(storage, placeCard);
  }
  for (const transCard of built.transitionCards) {
    storeKernelMCard(storage, transCard);
  }
  for (const tokCard of built.initialTokens) {
    storeKernelMCard(storage, tokCard);
  }
  const netHandle = `urn:gqc:net-mcard:${built.netId}`;
  const netPut = storeKernelMCard(storage, built.netMCard, netHandle);

  const bindingsHandle = `urn:gqc:net-bindings:${built.netId}`;
  const bindingsPut = storeJsonMCard(storage, built.bindingsPayload, {
    handle: bindingsHandle,
    typeTag: 'net_bindings'
  });

  return {
    netId: built.netId,
    netHandle,
    netMCardHash: netPut.hash,
    bindingsHandle,
    bindingsMCardHash: bindingsPut.hash,
    placeCount: built.placeCards.length,
    transitionCount: built.transitionCards.length,
    inserted: netPut.inserted
  };
}

function buildSessionWeights(places, placeBindings) {
  const weights = {};
  for (const place of places) {
    const kind = placeBindings[place.id]?.kind;
    weights[place.id] = SESSION_PLACE_KINDS.has(kind) ? 1 : 0;
  }
  return weights;
}

export async function persistWorkbenchTraceToTriad(storage, workbenchEnvelope, trace) {
  const persistedNet = persistWorkbenchNetToTriad(storage, workbenchEnvelope);
  const traceId = String(trace?.traceId || 'workbench-trace');
  const entryPlaceId = String(trace?.entryPlaceId || workbenchEnvelope.entryPlaceId || '');
  const events = Array.isArray(trace?.events) ? trace.events : [];
  const placeBindings = workbenchEnvelope?.bindings?.places || {};
  const transitionBindings = workbenchEnvelope?.bindings?.transitions || {};

  const entryBinding = placeBindings[entryPlaceId];
  if (!entryBinding || (entryPlaceId !== workbenchEnvelope.entryPlaceId && entryBinding.deepLinkEntry !== true)) {
    throw new Error(`Invalid trace entryPlaceId "${entryPlaceId}" for workbench net "${persistedNet.netId}"`);
  }

  const seededRawTopology = structuredClone(workbenchEnvelope.topology);
  for (const place of seededRawTopology.places) {
    place.initialTokens = place.id === entryPlaceId ? 1 : 0;
  }

  const seededTopology = parsePetriNetYaml(yaml.dump(seededRawTopology));
  const sessionWeights = buildSessionWeights(seededTopology.places, placeBindings);
  const vm = new ColoredPetriVM(seededTopology);
  const firingRecords = [];

  for (let idx = 0; idx < events.length; idx += 1) {
    const ev = events[idx];
    const transitionId = ev?.transitionId;
    if (ev?.unmapped === true || !transitionId || !transitionBindings[transitionId]) {
      throw new Error(`Trace "${traceId}" event ${idx} references undeclared transition "${transitionId || ev?.url}"`);
    }
    const rec = await vm.fireTransition(transitionId);
    const invariantOk = vm.matrix.verifyPInvariant(rec.postMarking, sessionWeights, 1);
    if (!invariantOk) {
      throw new Error(`Session P-invariant broken at trace "${traceId}" step ${rec.step} ("${transitionId}")`);
    }
    firingRecords.push({
      step: rec.step,
      transitionId: rec.transitionId,
      consumed: rec.consumed,
      produced: rec.produced,
      preMarking: rec.preMarking,
      postMarking: rec.postMarking
    });
  }

  const endMarking = vm.getMarking();
  const activeHolders = Object.entries(endMarking)
    .filter(([pid, count]) => sessionWeights[pid] === 1 && count > 0)
    .map(([pid]) => pid);
  const finalPlaceId = activeHolders.length === 1 ? activeHolders[0] : null;

  const tracePayload = {
    schema: WORKBENCH_TRACE_SCHEMA,
    traceId,
    netId: persistedNet.netId,
    workbenchNetMCardHash: persistedNet.netMCardHash,
    workbenchBindingsMCardHash: persistedNet.bindingsMCardHash,
    entryPlaceId,
    finalPlaceId,
    sessionInvariantHolds: true,
    firingRecords
  };

  const traceHandle = `urn:gqc:workbench-trace:${traceId}`;
  const tracePut = storeJsonMCard(storage, tracePayload, {
    handle: traceHandle,
    typeTag: 'workbench_firing_trace'
  });

  return {
    traceId,
    traceHandle,
    traceMCardHash: tracePut.hash,
    workbenchNetMCardHash: persistedNet.netMCardHash,
    workbenchBindingsMCardHash: persistedNet.bindingsMCardHash,
    entryPlaceId,
    finalPlaceId,
    firingRecordCount: firingRecords.length,
    firingRecords
  };
}

function computeMarkingHash(markingObj) {
  const plain = {};
  for (const pid of Array.from(markingObj.byPlace.keys()).sort()) {
    plain[pid] = [...(markingObj.byPlace.get(pid) || [])];
  }
  return hashContent(canonicalJson(plain), 'blake3');
}

export function buildTargetLayer4Snapshot(targetEnvelope) {
  if (!targetEnvelope?.topology || !targetEnvelope?.bindings) {
    throw new Error('Target net envelope requires topology and bindings sections');
  }
  const netId = String(targetEnvelope.netId || targetEnvelope.topology.name || 'target-net');
  const placeBindings = targetEnvelope.bindings.places || {};
  const transitionBindings = targetEnvelope.bindings.transitions || {};

  const layer4Net = new Layer4TrellisNavigationNet();
  const registeredPlaces = new Map();

  for (const place of targetEnvelope.topology.places || []) {
    const binding = placeBindings[place.id];
    if (!binding) {
      throw new TypeError(`Place "${place.id}" missing bindings entry in target net "${netId}"`);
    }
    if (typeof binding.routeHandle !== 'string' || !binding.routeHandle.trim()) {
      throw new TypeError(`Place "${place.id}" requires a separate non-empty routeHandle`);
    }
    const validUri = validateClmViewTypeUri(binding.clmTypeUri, {
      placeId: place.id,
      route: binding.route,
      routeHandle: binding.routeHandle
    });
    const role = binding.entry ? 'Entry' : (binding.kind === 'error' ? 'Exception' : 'Intermediate');
    const placeCard = layer4Net.registerViewPlace(place.id, validUri, { role });
    registeredPlaces.set(place.id, { placeCard, binding });
  }

  for (const transition of targetEnvelope.topology.transitions || []) {
    const binding = transitionBindings[transition.id];
    if (!binding) continue;
    const destBinding = placeBindings[binding.toPlaceId];
    if (destBinding?.kind !== 'error' && (binding.kind === 'client-route' || binding.kind === 'link')) {
      layer4Net.registerHyperlink(binding.fromPlaceId, binding.linkId || transition.id, binding.toPlaceId);
    }
  }

  const placeCards = Array.from(layer4Net.namespace.places.values());
  const transitionCards = Array.from(layer4Net.namespace.transitions.values());
  const entryPlaceId = String(targetEnvelope.entryPlaceId || targetEnvelope.topology.places?.[0]?.id || '');

  const initialMarking = {};
  const initialTokens = [];
  for (const placeCard of placeCards) {
    if (placeCard.placeId === entryPlaceId) {
      const tok = TokenMCard.fromJson(
        {
          current_place: entryPlaceId,
          history: [entryPlaceId],
          session_id: `topology:${netId}`,
          sponsor_did: 'did:key:z6MkTopologySnapshot'
        },
        'clm://type/session/active'
      );
      initialMarking[placeCard.placeId] = [tok];
      initialTokens.push(tok);
    } else {
      initialMarking[placeCard.placeId] = [];
    }
  }

  const netMCard = NetMCard.create(netId, placeCards, transitionCards, initialMarking);
  const bindingsPayload = buildNetBindingsPayload(targetEnvelope, netMCard.card.hash);

  return {
    netId,
    entryPlaceId,
    layer4Net,
    registeredPlaces,
    placeCards,
    transitionCards,
    initialTokens,
    netMCard,
    bindingsPayload
  };
}

export function createLayer4TargetAdapter(targetEnvelope, { storage = null } = {}) {
  const snapshot = buildTargetLayer4Snapshot(targetEnvelope);
  const placeBindings = targetEnvelope.bindings?.places || {};
  const transitionBindings = targetEnvelope.bindings?.transitions || {};

  let bindingsMCardHash = null;
  if (storage) {
    for (const p of snapshot.placeCards) storeKernelMCard(storage, p);
    for (const t of snapshot.transitionCards) storeKernelMCard(storage, t);
    for (const tok of snapshot.initialTokens) storeKernelMCard(storage, tok);
    storeKernelMCard(storage, snapshot.netMCard, `urn:gqc:net-mcard:${snapshot.netId}`);
    const bindingsPut = storeJsonMCard(storage, snapshot.bindingsPayload, {
      handle: `urn:gqc:net-bindings:${snapshot.netId}`,
      typeTag: 'net_bindings'
    });
    bindingsMCardHash = bindingsPut.hash;
  } else {
    bindingsMCardHash = hashContent(canonicalJson(snapshot.bindingsPayload), 'blake3');
  }

  const sessions = new Map();

  function lookupTransitionMeta(transitionOrAction) {
    const key = String(transitionOrAction || '').trim();
    if (!key) return null;
    if (transitionBindings[key]) {
      return { transitionId: key, binding: transitionBindings[key] };
    }
    for (const [tid, binding] of Object.entries(transitionBindings)) {
      if (binding.linkId === key || binding.actionName === key) {
        return { transitionId: tid, binding };
      }
    }
    return null;
  }

  function persistMarkingSnapshot(sessionId, stepIndex, markingObj, status, activePlaceId) {
    if (!storage) return computeMarkingHash(markingObj);
    const byPlace = {};
    for (const pid of Array.from(markingObj.byPlace.keys()).sort()) {
      byPlace[pid] = [...(markingObj.byPlace.get(pid) || [])];
    }
    const payload = {
      schema: INITIAL_MARKING_SCHEMA,
      netId: snapshot.netId,
      netMCardHash: snapshot.netMCard.card.hash,
      sessionId,
      stepIndex,
      status,
      activePlaceId,
      byPlace
    };
    const put = storeJsonMCard(storage, payload, {
      handle: stepIndex === 0 ? `urn:gqc:session-initial-marking:${snapshot.netId}:${sessionId}` : null,
      typeTag: 'session_marking'
    });
    return put.hash;
  }

  function startSession({ sessionId, entryPlaceId = snapshot.entryPlaceId, sponsorDid = 'did:key:z6MkLabSession' } = {}) {
    const resolvedSessionId = String(sessionId || '').trim();
    if (!resolvedSessionId) {
      throw new TypeError('sessionId must be a non-empty string');
    }
    if (!placeBindings[entryPlaceId] || placeBindings[entryPlaceId].kind === 'error') {
      throw new TypeError(`Entry Place "${entryPlaceId}" is not an approved view Place in "${snapshot.netId}"`);
    }

    const started = snapshot.layer4Net.startSession(entryPlaceId, resolvedSessionId, sponsorDid);
    if (storage) {
      storeKernelMCard(storage, started.sessionToken, `urn:gqc:session-token:${snapshot.netId}:${resolvedSessionId}:0`);
    }
    const initialMarkingHash = persistMarkingSnapshot(
      resolvedSessionId,
      0,
      started.marking,
      'ACTIVE',
      entryPlaceId
    );

    const prevQueue = sessions.get(resolvedSessionId)?.queue || Promise.resolve();
    const state = {
      sessionId: resolvedSessionId,
      sponsorDid,
      status: 'ACTIVE',
      currentViewPlaceId: entryPlaceId,
      mappedPlaceId: entryPlaceId,
      marking: started.marking,
      sessionToken: started.sessionToken,
      initialTokenHash: started.sessionToken.card.hash,
      initialMarkingHash,
      latestMarkingHash: initialMarkingHash,
      stepCount: 0,
      receipts: [],
      idempotencyCache: new Map(),
      queue: prevQueue
    };
    sessions.set(resolvedSessionId, state);

    return getSessionSummary(resolvedSessionId);
  }

  function getSessionSummary(sessionId) {
    const s = sessions.get(sessionId);
    if (!s) return null;
    const latestReceipt = s.receipts.length > 0 ? s.receipts[s.receipts.length - 1] : null;
    return {
      sessionId: s.sessionId,
      netId: snapshot.netId,
      netMCardHash: snapshot.netMCard.card.hash,
      bindingsMCardHash,
      sessionStatus: s.status,
      requiresRecovery: s.status === 'ERROR_MODAL',
      currentViewPlaceId: s.currentViewPlaceId,
      mappedPlaceId: s.mappedPlaceId,
      initialTokenHash: s.initialTokenHash,
      activeTokenHash: s.sessionToken.card.hash,
      initialMarkingHash: s.initialMarkingHash,
      latestMarkingHash: s.latestMarkingHash,
      stepCount: s.stepCount,
      latestReceipt,
      receiptHashes: s.receipts.map((r) => r.receiptHash),
      receipts: s.receipts.map((r) => ({ ...r }))
    };
  }

  function fireTransition({
    sessionId,
    transitionId = null,
    actionName = null,
    mode = 'auto',
    requestId = null
  } = {}) {
    const resolvedSessionId = String(sessionId || '').trim();
    const session = sessions.get(resolvedSessionId);
    if (!session) {
      const err = new Error(`Unknown Layer 4 session "${resolvedSessionId}"`);
      err.statusCode = 404;
      err.code = 'SESSION_NOT_FOUND';
      return Promise.reject(err);
    }

    const runStep = async () => {
      const dedupeKey = requestId ? String(requestId).trim() : null;
      if (dedupeKey && session.idempotencyCache.has(dedupeKey)) {
        return {
          ...session.idempotencyCache.get(dedupeKey),
          deduplicated: true
        };
      }

      const requestedKey = transitionId || actionName;
      if (!requestedKey || typeof requestedKey !== 'string') {
        const err = new TypeError('transitionId or actionName is required');
        err.statusCode = 400;
        err.code = 'MISSING_TRANSITION';
        throw err;
      }

      const matched = lookupTransitionMeta(requestedKey);
      const isRecover = mode === 'recover' || matched?.binding?.kind === 'recover';

      if (session.status === 'ERROR_MODAL' && !isRecover) {
        const err = new Error(
          `Session "${resolvedSessionId}" is trapped at p_error_modal; start a new session or fire a declared recovery Transition before normal actions`
        );
        err.statusCode = 409;
        err.code = 'SESSION_AT_ERROR_MODAL';
        err.requiresRecovery = true;
        throw err;
      }

      if (isRecover) {
        if (!matched || matched.binding.kind !== 'recover') {
          const err = new Error(`"${requestedKey}" is not a declared recovery Transition in "${snapshot.netId}"`);
          err.statusCode = 400;
          err.code = 'UNDECLARED_RECOVERY_TRANSITION';
          throw err;
        }
        if (session.status !== 'ERROR_MODAL') {
          const err = new Error(`Recovery Transition "${matched.transitionId}" requires session at p_error_modal`);
          err.statusCode = 409;
          err.code = 'SESSION_NOT_IN_ERROR_MODAL';
          throw err;
        }

        const recoverTarget = matched.binding.toPlaceId;
        const preMarkingHash = computeMarkingHash(session.marking);
        const prevErrToken = session.sessionToken;
        const prevHistory = Array.isArray(prevErrToken.payload?.history)
          ? prevErrToken.payload.history
          : [snapshot.entryPlaceId, 'p_error_modal'];

        const recoveredToken = TokenMCard.fromJson(
          {
            current_place: recoverTarget,
            history: [...prevHistory, recoverTarget],
            session_id: resolvedSessionId,
            sponsor_did: session.sponsorDid
          },
          'clm://type/session/active'
        );
        const nextMarking = new MCardMarking();
        for (const p of snapshot.placeCards) {
          nextMarking.byPlace.set(p.placeId, []);
          nextMarking.tokensByPlace.set(p.placeId, []);
        }
        nextMarking.add(recoverTarget, recoveredToken);
        const postMarkingHash = computeMarkingHash(nextMarking);
        const nextSeq = session.stepCount + 1;

        const recoveryReceipt = FiringReceiptMCard.create({
          netId: snapshot.netId,
          transitionId: `t_recover:p_error_modal:${matched.binding.linkId || matched.transitionId}->${recoverTarget}`,
          stepSeq: nextSeq,
          fiberStateTrace: ['DISPOSED', 'RECOVERING', 'ACTIVE', 'SUSPENDED'],
          consumedRefs: { p_error_modal: [prevErrToken.qualifiedRef] },
          producedRefs: { [recoverTarget]: [recoveredToken.qualifiedRef] },
          preMarkingHash,
          postMarkingHash,
          verdict: 'COMMITTED'
        });

        if (storage) {
          storeKernelMCard(storage, recoveredToken, `urn:gqc:session-token:${snapshot.netId}:${resolvedSessionId}:${nextSeq}`);
          storeKernelMCard(storage, recoveryReceipt, `urn:gqc:firing-receipt:${snapshot.netId}:${resolvedSessionId}:${nextSeq}`);
        }
        const persistedMarkingHash = persistMarkingSnapshot(
          resolvedSessionId,
          nextSeq,
          nextMarking,
          'ACTIVE',
          recoverTarget
        );

        session.status = 'ACTIVE';
        session.currentViewPlaceId = recoverTarget;
        session.mappedPlaceId = recoverTarget;
        session.marking = nextMarking;
        session.sessionToken = recoveredToken;
        session.latestMarkingHash = persistedMarkingHash;
        session.stepCount = nextSeq;

        const receiptSummary = {
          stepIndex: nextSeq,
          declaredTransitionId: matched.transitionId,
          kernelTransitionId: recoveryReceipt.transitionId,
          verdict: recoveryReceipt.verdict,
          receiptHash: recoveryReceipt.card.hash,
          tokenHash: recoveredToken.card.hash,
          fromPlaceId: 'p_error_modal',
          toPlaceId: recoverTarget,
          trappedToErrorModal: false,
          recovered: true
        };
        session.receipts.push(receiptSummary);

        const response = {
          ok: true,
          deduplicated: false,
          navigated: true,
          recovered: true,
          trappedToErrorModal: false,
          requiresRecovery: false,
          ...getSessionSummary(resolvedSessionId),
          receipt: receiptSummary
        };
        if (dedupeKey) {
          session.idempotencyCache.set(dedupeKey, response);
        }
        return response;
      }

      const fromPlaceId = session.currentViewPlaceId;
      const linkAction = matched?.binding?.linkId || String(actionName || transitionId);
      const step = snapshot.layer4Net.clickHyperlink(
        session.marking,
        fromPlaceId,
        linkAction,
        session.sessionToken
      );

      const nextSeq = session.stepCount + 1;
      if (storage) {
        storeKernelMCard(storage, step.sessionToken, `urn:gqc:session-token:${snapshot.netId}:${resolvedSessionId}:${nextSeq}`);
        storeKernelMCard(storage, step.receipt, `urn:gqc:firing-receipt:${snapshot.netId}:${resolvedSessionId}:${nextSeq}`);
      }

      const nextStatus = step.trappedToErrorModal ? 'ERROR_MODAL' : 'ACTIVE';
      const mappedDest = step.trappedToErrorModal
        ? (matched?.binding?.toPlaceId && placeBindings[matched.binding.toPlaceId]?.kind === 'error'
            ? matched.binding.toPlaceId
            : 'p_error_modal')
        : step.currentViewPlaceId;

      const persistedMarkingHash = persistMarkingSnapshot(
        resolvedSessionId,
        nextSeq,
        step.marking,
        nextStatus,
        step.currentViewPlaceId
      );

      session.status = nextStatus;
      session.currentViewPlaceId = step.currentViewPlaceId;
      session.mappedPlaceId = mappedDest;
      session.marking = step.marking;
      session.sessionToken = step.sessionToken;
      session.latestMarkingHash = persistedMarkingHash;
      session.stepCount = nextSeq;

      const receiptSummary = {
        stepIndex: nextSeq,
        declaredTransitionId: matched?.transitionId || null,
        kernelTransitionId: step.receipt.transitionId,
        verdict: step.receipt.verdict,
        receiptHash: step.receipt.card.hash,
        tokenHash: step.sessionToken.card.hash,
        fromPlaceId,
        toPlaceId: step.currentViewPlaceId,
        mappedPlaceId: mappedDest,
        trappedToErrorModal: step.trappedToErrorModal,
        recovered: false
      };
      session.receipts.push(receiptSummary);

      const response = {
        ok: true,
        deduplicated: false,
        navigated: step.navigated,
        recovered: false,
        trappedToErrorModal: step.trappedToErrorModal,
        requiresRecovery: step.trappedToErrorModal,
        ...getSessionSummary(resolvedSessionId),
        receipt: receiptSummary
      };
      if (dedupeKey) {
        session.idempotencyCache.set(dedupeKey, response);
      }
      return response;
    };

    const nextPromise = session.queue.then(runStep, runStep);
    session.queue = nextPromise.catch(() => {});
    return nextPromise;
  }

  return {
    netId: snapshot.netId,
    entryPlaceId: snapshot.entryPlaceId,
    netMCard: snapshot.netMCard,
    netMCardHash: snapshot.netMCard.card.hash,
    bindingsMCardHash,
    placeCards: snapshot.placeCards,
    transitionCards: snapshot.transitionCards,
    startSession,
    fireTransition,
    getSessionSummary
  };
}

export async function runNetToNetMCardCli({ dbPath = null } = {}) {
  const wbPath = path.join(ROOT_DIR, 'src/net/workbench-net.yaml');
  const spaPath = path.join(ROOT_DIR, 'tests/fixtures/spa-test-target.graph.json');
  const wbEnvelope = loadNetEnvelope(wbPath);
  const spaEnvelope = loadNetEnvelope(spaPath);

  const wbValid = validateNetEnvelope(wbEnvelope, { filePath: 'src/net/workbench-net.yaml', currentSprint: 'SPRINT-GQC-05' });
  if (!wbValid.valid) {
    throw new Error(`Workbench net invalid: ${wbValid.violations.map((v) => v.message).join('; ')}`);
  }
  const spaValid = validateNetEnvelope(spaEnvelope, { filePath: 'tests/fixtures/spa-test-target.graph.json', currentSprint: 'SPRINT-GQC-05' });
  if (!spaValid.valid) {
    throw new Error(`SPA target net invalid: ${spaValid.violations.map((v) => v.message).join('; ')}`);
  }

  let tmpDir = null;
  const resolvedDbPath = dbPath || (() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc05-netmcard-'));
    return path.join(tmpDir, 'triad.db');
  })();

  const storage = new CanonicalTriadBackend(resolvedDbPath);
  try {
    const wbPersisted = persistWorkbenchNetToTriad(storage, wbEnvelope);
    const spaAdapter = createLayer4TargetAdapter(spaEnvelope, { storage });
    const session = spaAdapter.startSession({ sessionId: 'cli-verify-session' });
    const validFire = await spaAdapter.fireTransition({
      sessionId: session.sessionId,
      transitionId: 't_spa_open_details',
      requestId: 'cli-req-1'
    });
    const wbCard = storage.get(wbPersisted.netMCardHash);
    const spaCard = storage.get(spaAdapter.netMCardHash);
    const recCard = storage.get(validFire.receipt.receiptHash);

    if (!wbCard?.verified || !spaCard?.verified || !recCard?.verified) {
      throw new Error('Triad verification failed for persisted NetMCard or FiringReceiptMCard');
    }
    if (wbPersisted.netMCardHash === spaAdapter.netMCardHash) {
      throw new Error('Workbench NetMCard and target NetMCard must never share a hash');
    }

    return {
      ok: true,
      workbenchNetId: wbPersisted.netId,
      workbenchNetMCardHash: wbPersisted.netMCardHash,
      workbenchBindingsMCardHash: wbPersisted.bindingsMCardHash,
      targetNetId: spaAdapter.netId,
      targetNetMCardHash: spaAdapter.netMCardHash,
      targetBindingsMCardHash: spaAdapter.bindingsMCardHash,
      sampleReceiptHash: validFire.receipt.receiptHash
    };
  } finally {
    storage.close();
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = await runNetToNetMCardCli();
  console.log(JSON.stringify(summary, null, 2));
}
