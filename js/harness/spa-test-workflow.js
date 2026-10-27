import { PKC } from '../pkc-core.js';

export const WORKFLOW_STEPS = Object.freeze([
  Object.freeze({
    id: 'step-target',
    index: 0,
    label: '1. Target',
    title: 'Select Target & Policy',
    workbenchPlaceId: 'p_page_responsive_lab',
    workbenchTransitions: Object.freeze([
      't_req_get_app_config',
      't_ok_get_app_config',
      't_fail_get_app_config',
      't_enter_target_blocked',
      't_recover_target_blocked',
      't_enter_capture_unavailable',
      't_recover_capture_unavailable',
      't_req_probe_handshake',
      't_ok_probe_handshake',
      't_fail_probe_handshake_timeout',
      't_fail_probe_handshake_unavailable',
      't_recover_handshake_timeout',
      't_enter_target_unapproved',
      't_recover_target_unapproved'
    ])
  }),
  Object.freeze({
    id: 'step-device',
    index: 1,
    label: '2. Device',
    title: 'Configure Device & Orientation',
    workbenchPlaceId: 'p_page_responsive_lab',
    workbenchTransitions: Object.freeze([
      't_req_get_conformance_latest',
      't_ok_get_conformance_latest',
      't_fail_get_conformance_latest'
    ])
  }),
  Object.freeze({
    id: 'step-places',
    index: 2,
    label: '3. Pages & Places',
    title: 'Inspect Target Pages & Places',
    workbenchPlaceId: 'p_page_responsive_lab',
    workbenchTransitions: Object.freeze([])
  }),
  Object.freeze({
    id: 'step-transitions',
    index: 3,
    label: '4. Links & Transitions',
    title: 'Inspect Functional Links & Transitions',
    workbenchPlaceId: 'p_page_responsive_lab',
    workbenchTransitions: Object.freeze([])
  }),
  Object.freeze({
    id: 'step-evidence',
    index: 4,
    label: '5. Capture & Evidence',
    title: 'Run Capture & Inspect MCard Evidence',
    workbenchPlaceId: 'p_page_responsive_lab',
    workbenchTransitions: Object.freeze([
      't_req_post_test_runs',
      't_ok_post_test_runs',
      't_fail_post_test_runs',
      't_recover_post_test_runs'
    ])
  })
]);

const RECOVERABLE_POLICY_STATES = new Set([
  'blocked',
  'capture-unavailable',
  'handshake-timeout',
  'custom-unapproved',
  'undecided-preview',
  'invalid-target'
]);

const GRAPH_LINKAGE_NOTE =
  'Graph-to-run MCard linkage (navigation_run_link:v1) is deferred to SPRINT-GQC-05; responsive_test_run:v1 remains closed.';

export function assertDisjointNetIds(workbenchEnvelope, targetEnvelope) {
  const wbPlaces = new Set((workbenchEnvelope?.topology?.places || []).map((p) => p.id));
  const wbTransitions = new Set((workbenchEnvelope?.topology?.transitions || []).map((t) => t.id));
  const wbAll = new Set([...wbPlaces, ...wbTransitions]);

  const tgPlaces = (targetEnvelope?.topology?.places || []).map((p) => p.id);
  const tgTransitions = (targetEnvelope?.topology?.transitions || []).map((t) => t.id);

  const sharedPlaceIds = tgPlaces.filter((id) => wbAll.has(id));
  const sharedTransitionIds = tgTransitions.filter((id) => wbAll.has(id));
  const collisions = [...new Set([...sharedPlaceIds, ...sharedTransitionIds])];

  if (collisions.length > 0) {
    throw new Error(
      `Target net "${targetEnvelope?.netId || 'target'}" and workbench net "${workbenchEnvelope?.netId || 'workbench'}" share IDs: ${collisions.join(', ')}`
    );
  }

  return {
    ok: true,
    workbenchNetId: workbenchEnvelope?.netId || null,
    targetNetId: targetEnvelope?.netId || null,
    placeCount: tgPlaces.length,
    transitionCount: tgTransitions.length
  };
}

export function serializeTargetNetEnvelope(envelope, options = {}) {
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Target net envelope must be an object');
  }
  const rawPlaces = Array.isArray(envelope.topology?.places) ? envelope.topology.places : [];
  const rawTransitions = Array.isArray(envelope.topology?.transitions) ? envelope.topology.transitions : [];
  const placeBindings = envelope.bindings?.places || {};
  const transitionBindings = envelope.bindings?.transitions || {};

  const places = rawPlaces.map((place) => {
    const binding = placeBindings[place.id] || {};
    const route = String(binding.route || '');
    const routeHandle = String(binding.routeHandle || '');
    const clmTypeUri = binding.clmTypeUri ? String(binding.clmTypeUri) : null;

    if (!route || !routeHandle) {
      throw new Error(`Place "${place.id}" must declare separate route and routeHandle`);
    }
    if (
      clmTypeUri &&
      (!clmTypeUri.startsWith('clm://type/') ||
        clmTypeUri === place.id ||
        clmTypeUri === route ||
        clmTypeUri === routeHandle)
    ) {
      throw new Error(`Place "${place.id}" conflates clmTypeUri with Place ID or routeHandle`);
    }

    return {
      placeId: place.id,
      pageId: String(binding.pageId || place.id),
      kind: String(binding.kind || 'view'),
      route,
      routeHandle,
      clmTypeUri,
      description: String(place.description || ''),
      entry: Boolean(binding.entry),
      deepLinkEntry: Boolean(binding.deepLinkEntry),
      owner: String(binding.owner || '')
    };
  });

  const transitions = rawTransitions.map((transition) => {
    const binding = transitionBindings[transition.id] || {};
    const toPlaceId = String(binding.toPlaceId || transition.outputs?.[0] || '');
    const destBinding = placeBindings[toPlaceId] || {};
    const destKind = String(destBinding.kind || 'view');
    const isErrorDest = destKind === 'error';
    const trigger = String(binding.trigger || '');
    const labelMatch = /\(([^)]+)\)\s*$/.exec(trigger);
    const actionName = String(binding.actionName || (labelMatch ? labelMatch[1] : (binding.linkId || transition.id)));

    return {
      transitionId: transition.id,
      linkId: String(binding.linkId || transition.id),
      actionName,
      kind: String(binding.kind || 'client-route'),
      fromPlaceId: String(binding.fromPlaceId || transition.inputs?.[0] || ''),
      targetPlaceId: toPlaceId,
      destinationPlaceId: isErrorDest ? null : toPlaceId,
      errorPlaceId: isErrorDest ? toPlaceId : null,
      destinationKind: destKind,
      route: String(binding.route || ''),
      trigger,
      owner: String(binding.owner || '')
    };
  });

  return {
    schema: String(envelope.schema || 'urn:gqc:net-envelope:v1'),
    netId: String(envelope.netId || 'target-net'),
    targetHandle: String(envelope.targetHandle || ''),
    targetUrl: String(options.targetUrl || '/tests/fixtures/spa-test-target.html'),
    targetType: String(options.targetType || 'spa'),
    entryPlaceId: String(envelope.entryPlaceId || (places[0]?.placeId ?? '')),
    layer4Verification: options.layer4Verification ? { ...options.layer4Verification } : null,
    places,
    transitions
  };
}

function normalizePathname(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  const trimmed = urlOrPath.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed, 'http://localhost/');
    return parsed.pathname || '';
  } catch {
    return trimmed.split(/[?#]/)[0] || '';
  }
}

function isAppHtmlPath(pathname) {
  return pathname === '/app.html' || pathname === 'app.html' || pathname.endsWith('/app.html');
}

export function resolveStepIdForKey(key, currentStepId) {
  const currentIdx = WORKFLOW_STEPS.findIndex((s) => s.id === currentStepId);
  if (currentIdx < 0) return WORKFLOW_STEPS[0].id;
  if (key === 'ArrowRight') {
    return WORKFLOW_STEPS[(currentIdx + 1) % WORKFLOW_STEPS.length].id;
  }
  if (key === 'ArrowLeft') {
    return WORKFLOW_STEPS[(currentIdx - 1 + WORKFLOW_STEPS.length) % WORKFLOW_STEPS.length].id;
  }
  if (key === 'Home') {
    return WORKFLOW_STEPS[0].id;
  }
  if (key === 'End') {
    return WORKFLOW_STEPS[WORKFLOW_STEPS.length - 1].id;
  }
  return null;
}

export function createSpaTestWorkflow(options = {}) {
  const targetNets = options.targetNets && typeof options.targetNets === 'object' ? options.targetNets : {};
  const membrane = options.membrane || null;
  const stage = options.stage || null;
  const registry = options.registry || null;
  const recorder = options.recorder || null;
  const pkc = options.pkc || PKC;
  const doc = options.doc !== undefined ? options.doc : (typeof document !== 'undefined' ? document : null);
  const selectTargetFn = options.selectTarget || ((url, cause) => membrane?.bindTarget?.(url, cause));
  const recoverTargetFn = options.recoverTarget || (() => membrane?.recoverToDefault?.());
  const selectDeviceFn = options.selectDevicePreset || null;
  const resolveIframe = options.resolveIframe || (() => (doc ? doc.getElementById('mission-control-iframe') : null));

  const subscribers = new Set();
  const cleanupFns = [];
  let activeStepId = WORKFLOW_STEPS[0].id;
  let invalidatedReason = null;
  let moduleWarnings = [];
  let guideInitMs = typeof options.guideInitMs === 'number' ? options.guideInitMs : 0;

  let boundIframe = null;
  let iframeLoadCleanup = null;
  let spaObserver = null;
  let lastBoundTargetPathname = '';

  const liveSpa = {
    connected: false,
    activePageId: null,
    activePlaceId: null,
    activePlaceKind: null,
    lastTransitionId: null,
    transitionCount: 0,
    bootNonce: null,
    initialBootNonce: null,
    reloadedDuringSession: false,
    inErrorPlace: false,
    errorAlertText: null,
    successfulNavigationCount: 0,
    transitionStatuses: {},
    entryPlaceId: null,
    events: []
  };

  function emit() {
    const snapshot = getState();
    for (const fn of [...subscribers]) {
      try {
        fn(snapshot);
      } catch {}
    }
  }

  function disconnectSpaObserver() {
    if (spaObserver) {
      try {
        spaObserver.disconnect();
      } catch {}
      spaObserver = null;
    }
  }

  function detachIframeListener() {
    disconnectSpaObserver();
    if (iframeLoadCleanup) {
      try {
        iframeLoadCleanup();
      } catch {}
      iframeLoadCleanup = null;
    }
    boundIframe = null;
  }

  function resetLiveSpaState(targetNet = null) {
    liveSpa.connected = false;
    liveSpa.activePageId = null;
    liveSpa.activePlaceId = null;
    liveSpa.activePlaceKind = null;
    liveSpa.lastTransitionId = null;
    liveSpa.transitionCount = 0;
    liveSpa.bootNonce = null;
    liveSpa.initialBootNonce = null;
    liveSpa.reloadedDuringSession = false;
    liveSpa.inErrorPlace = false;
    liveSpa.errorAlertText = null;
    liveSpa.successfulNavigationCount = 0;
    liveSpa.transitionStatuses = {};
    liveSpa.entryPlaceId = targetNet?.entryPlaceId || null;
    liveSpa.events = [];
    if (targetNet?.transitions) {
      for (const t of targetNet.transitions) {
        liveSpa.transitionStatuses[t.transitionId] = 'idle';
      }
    }
  }

  function resolveMatchedTargetNet(targetDetail) {
    if (!targetDetail || targetDetail.status === 'blocked' || targetDetail.status === 'rejected') {
      return null;
    }
    const candidates = [
      normalizePathname(targetDetail.url || ''),
      normalizePathname(targetDetail.raw || '')
    ].filter(Boolean);
    for (const pathname of candidates) {
      if (targetNets[pathname]) {
        return targetNets[pathname];
      }
    }
    return null;
  }

  function applyObservation(obs, matchedNet) {
    if (!obs || !obs.placeId) return;
    const placeRow = matchedNet?.places?.find((p) => p.placeId === obs.placeId) || null;
    const placeKind = placeRow?.kind || (obs.errorAlertText ? 'error' : 'view');
    const nextCount = Number.isFinite(Number(obs.transitionCount)) ? Number(obs.transitionCount) : liveSpa.transitionCount;
    const nextNonce = obs.bootNonce ? String(obs.bootNonce) : liveSpa.bootNonce;

    if (!liveSpa.connected) {
      liveSpa.connected = true;
      liveSpa.entryPlaceId = obs.placeId;
      liveSpa.initialBootNonce = nextNonce || null;
    } else if (liveSpa.initialBootNonce && nextNonce && nextNonce !== liveSpa.initialBootNonce) {
      liveSpa.reloadedDuringSession = true;
    }

    if (nextCount > liveSpa.transitionCount && obs.lastTransitionId && obs.lastTransitionId !== 'none') {
      const fromPlaceId = liveSpa.activePlaceId || liveSpa.entryPlaceId || matchedNet?.entryPlaceId || obs.placeId;
      let resolvedTid = String(obs.lastTransitionId);
      if (resolvedTid === 'popstate_sync' && matchedNet?.transitions) {
        const match = matchedNet.transitions.find(
          (t) => t.fromPlaceId === fromPlaceId && t.targetPlaceId === obs.placeId
        );
        if (match) {
          resolvedTid = match.transitionId;
        }
      }
      const transRow = matchedNet?.transitions?.find((t) => t.transitionId === resolvedTid) || null;
      liveSpa.events.push({
        transitionId: resolvedTid,
        fromPlaceId,
        toPlaceId: obs.placeId,
        kind: transRow?.kind || 'client-route',
        destinationKind: placeKind,
        at: new Date().toISOString()
      });

      if (placeKind === 'error') {
        liveSpa.transitionStatuses[resolvedTid] = 'error-trapped';
      } else if (transRow?.kind === 'recover') {
        liveSpa.transitionStatuses[resolvedTid] = 'recovered';
      } else {
        liveSpa.transitionStatuses[resolvedTid] = 'committed';
        liveSpa.successfulNavigationCount += 1;
      }
    }

    liveSpa.activePageId = obs.pageId ? String(obs.pageId) : (placeRow?.pageId || obs.placeId);
    liveSpa.activePlaceId = obs.placeId;
    liveSpa.activePlaceKind = placeKind;
    liveSpa.lastTransitionId = obs.lastTransitionId ? String(obs.lastTransitionId) : 'none';
    liveSpa.transitionCount = nextCount;
    liveSpa.bootNonce = nextNonce || null;
    liveSpa.inErrorPlace = placeKind === 'error';
    liveSpa.errorAlertText = placeKind === 'error'
      ? String(
          obs.errorAlertText ||
          `Declared error Place ${obs.placeId} entered via ${liveSpa.lastTransitionId}; navigation is not counted as successful.`
        )
      : null;
  }

  function syncTargetDom() {
    const effectiveTarget = membrane?.getLastPolicyRejection?.() || membrane?.getTarget?.() || null;
    const matchedNet = resolveMatchedTargetNet(effectiveTarget);
    const iframe = resolveIframe();
    if (!matchedNet || !iframe || !effectiveTarget?.sameOrigin) {
      return false;
    }

    let innerDoc = null;
    try {
      innerDoc = iframe.contentDocument || iframe.contentWindow?.document || null;
    } catch {
      return false;
    }
    if (!innerDoc) return false;

    const appRoot = innerDoc.getElementById ? innerDoc.getElementById('spa-app-root') : null;
    if (!appRoot) return false;

    const errorAlert = innerDoc.getElementById ? innerDoc.getElementById('spa-error-alert') : null;
    applyObservation(
      {
        pageId: appRoot.getAttribute('data-page-id'),
        placeId: appRoot.getAttribute('data-place-id'),
        lastTransitionId: appRoot.getAttribute('data-last-transition-id'),
        transitionCount: Number(appRoot.getAttribute('data-transition-count') || 0),
        bootNonce: appRoot.getAttribute('data-boot-nonce'),
        errorAlertText: errorAlert?.textContent || null
      },
      matchedNet
    );

    const ObserverCtor =
      iframe.contentWindow?.MutationObserver ||
      (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
    if (ObserverCtor && !spaObserver) {
      spaObserver = new ObserverCtor(() => {
        if (syncTargetDom()) {
          emit();
        }
      });
      spaObserver.observe(appRoot, {
        attributes: true,
        attributeFilter: [
          'data-page-id',
          'data-place-id',
          'data-last-transition-id',
          'data-transition-count',
          'data-boot-nonce'
        ]
      });
    }
    return true;
  }

  function bindCurrentIframeIfNeeded() {
    const iframe = resolveIframe();
    if (iframe === boundIframe) return;
    detachIframeListener();
    if (!iframe || typeof iframe.addEventListener !== 'function') return;
    boundIframe = iframe;
    const onLoad = () => {
      disconnectSpaObserver();
      syncTargetDom();
      emit();
    };
    iframe.addEventListener('load', onLoad);
    iframeLoadCleanup = () => iframe.removeEventListener('load', onLoad);
  }

  function syncTargetLifecycle() {
    const effective = membrane?.getLastPolicyRejection?.() || membrane?.getTarget?.() || null;
    const nextPathname = normalizePathname(effective?.url || effective?.raw || '');
    const matchedNet = resolveMatchedTargetNet(effective);
    if (nextPathname !== lastBoundTargetPathname) {
      lastBoundTargetPathname = nextPathname;
      disconnectSpaObserver();
      resetLiveSpaState(matchedNet);
    } else if (matchedNet && Object.keys(liveSpa.transitionStatuses).length === 0) {
      resetLiveSpaState(matchedNet);
    }
    bindCurrentIframeIfNeeded();
    syncTargetDom();
  }

  function resolveTargetSummary() {
    const rejection = membrane?.getLastPolicyRejection?.() || null;
    const active = membrane?.getTarget?.() || null;
    const detail = rejection || active;
    const raw = detail?.raw || '';
    const url = detail?.url || raw || 'app.html';
    const pathname = normalizePathname(url || raw);
    const appHtml = isAppHtmlPath(pathname);
    let targetType = detail?.targetType || 'webapp';
    if (appHtml && targetType === 'spa') {
      targetType = 'webapp';
    }
    const isSpa = targetType === 'spa' && !appHtml;
    const policyState = detail?.policyState || 'approved-same-origin';
    const recoverable = RECOVERABLE_POLICY_STATES.has(policyState);
    const matchedNet = resolveMatchedTargetNet(detail);

    let classificationNote = 'Approved P0 SPA target with checked GQC-02A target net.';
    if (appHtml || targetType === 'webapp') {
      classificationNote =
        'app.html and general webapps remain classified as webapp (astro-wrapped) and are not presented as SPA targets pending Product Manager approval.';
    } else if (targetType === 'mpa-candidate') {
      classificationNote =
        'PenPot MPA routes are optional and deferred outside the P0 SPA guide until Product Manager approval and live Playwright assertions.';
    } else if (recoverable) {
      classificationNote = detail?.reason || `Target capture unavailable (${policyState}).`;
    } else if (!isSpa) {
      classificationNote = `Target classified as ${targetType}; P0 SPA target net inspection applies only to approved SPA targets.`;
    }

    return {
      url,
      raw: raw || url,
      targetId: detail?.targetId || null,
      targetType,
      isSpa,
      policyState,
      captureAllowed: Boolean(detail?.captureAllowed ?? true) && !recoverable,
      recoverable,
      errorPlaceId: detail?.errorPlaceId || null,
      reason: detail?.reason || null,
      hasCheckedTargetNet: Boolean(matchedNet),
      classificationNote
    };
  }

  function resolveDeviceSummary() {
    const geom = stage?.getGeometry?.() || {
      width: 100,
      height: 100,
      unit: '%',
      deviceId: null,
      orientation: 'landscape',
      scale: 1
    };
    const dev = geom.deviceId && registry?.getById ? registry.getById(geom.deviceId) : null;
    return {
      deviceId: geom.deviceId || null,
      deviceName: dev?.name || geom.presetName || 'Full (100%)',
      width: geom.width,
      height: geom.height,
      unit: geom.unit || 'px',
      orientation: geom.orientation || (geom.internalOrientation === 'vertical' ? 'portrait' : 'landscape'),
      scale: geom.scale ?? 1
    };
  }

  function resolveCaptureSummary() {
    const recorderState = recorder?.state || 'IDLE';
    const stats = recorder?.stats?.() || { size: 0, undersizedTaps: 0 };
    const saved = recorder?.lastSavedRun || null;
    const eventCount = stats.size ?? (recorder?.snapshot?.()?.length || 0);

    let completeness = 'idle';
    let completenessLabel = 'Idle (Ready to Record)';

    if (invalidatedReason) {
      completeness = 'incomplete';
      completenessLabel = `Incomplete Capture (Interrupted: ${invalidatedReason})`;
    } else if (recorderState === 'RECORDING') {
      completeness = 'incomplete';
      completenessLabel = 'Incomplete Capture (Recording In Progress)';
    } else if (recorderState === 'PAUSED') {
      completeness = 'incomplete';
      completenessLabel = 'Incomplete Capture (Paused Before Stop)';
    } else if (recorderState === 'FINALIZED') {
      if (saved?.ok === true && saved?.data?.hash) {
        completeness = 'complete';
        completenessLabel = 'Persisted MCard Run';
      } else if (saved?.ok === false) {
        completeness = 'incomplete';
        completenessLabel = `Incomplete Capture (Save Failed: ${saved.error || 'offline'})`;
      } else {
        completeness = 'incomplete';
        completenessLabel = 'Incomplete Capture (Stopped Without MCard Save)';
      }
    }

    return {
      recorderState,
      completeness,
      completenessLabel,
      isIncomplete: completeness === 'incomplete',
      canClaimComplete: completeness === 'complete',
      invalidatedReason,
      eventCount,
      undersizedTaps: stats.undersizedTaps || 0,
      savedRun: saved
        ? {
            ok: Boolean(saved.ok),
            handle: saved.data?.handle || null,
            hash: saved.data?.hash || null,
            error: saved.error || null,
            schema: saved.run?.schema || null,
            targetUrl: saved.run?.target?.url || null,
            deviceId: saved.run?.device?.id || null,
            orientation: saved.run?.orientation || null,
            eventCount: saved.run?.metrics?.eventCount ?? eventCount
          }
        : null,
      graphLinkageNote: GRAPH_LINKAGE_NOTE
    };
  }

  function getState() {
    const stepObj = WORKFLOW_STEPS.find((s) => s.id === activeStepId) || WORKFLOW_STEPS[0];
    const target = resolveTargetSummary();
    const device = resolveDeviceSummary();
    const effective = membrane?.getLastPolicyRejection?.() || membrane?.getTarget?.() || null;
    const targetNet = resolveMatchedTargetNet(effective);
    const capture = resolveCaptureSummary();

    let errorAnnouncement = '';
    if (target.recoverable) {
      errorAnnouncement = `Target policy ${target.policyState}: ${target.reason || 'Capture disabled'}`;
    } else if (liveSpa.inErrorPlace && liveSpa.errorAlertText) {
      errorAnnouncement = liveSpa.errorAlertText;
    } else if (invalidatedReason) {
      errorAnnouncement = `Incomplete capture: ${invalidatedReason}`;
    }

    const placeSegment = liveSpa.activePlaceId ? ` Active Place ${liveSpa.activePlaceId}.` : '';
    const savedSegment = capture.savedRun?.ok && capture.savedRun.hash
      ? ` Saved MCard ${capture.savedRun.hash.slice(0, 8)}.`
      : '';
    const statusAnnouncement =
      `Step ${stepObj.index + 1} of ${WORKFLOW_STEPS.length}: ${stepObj.title}. Target ${target.raw} (${target.targetType}). Device ${device.deviceName} (${device.orientation}).${placeSegment}${savedSegment}`;

    return {
      steps: WORKFLOW_STEPS,
      activeStepId: stepObj.id,
      activeStepIndex: stepObj.index,
      workbenchPlaceId: membrane?.getPolicyPlaceId?.() || 'p_page_responsive_lab',
      mpaAssessment: {
        status: 'optional-deferred',
        label: 'MPA Assessment: Optional / Deferred',
        approvedForP0: false
      },
      target,
      device,
      targetNet,
      liveSpa: {
        connected: liveSpa.connected,
        activePageId: liveSpa.activePageId,
        activePlaceId: liveSpa.activePlaceId,
        activePlaceKind: liveSpa.activePlaceKind,
        lastTransitionId: liveSpa.lastTransitionId,
        transitionCount: liveSpa.transitionCount,
        bootNonce: liveSpa.bootNonce,
        initialBootNonce: liveSpa.initialBootNonce,
        reloadedDuringSession: liveSpa.reloadedDuringSession,
        inErrorPlace: liveSpa.inErrorPlace,
        errorAlertText: liveSpa.errorAlertText,
        successfulNavigationCount: liveSpa.successfulNavigationCount,
        transitionStatuses: { ...liveSpa.transitionStatuses },
        targetTrace: getTargetTrace()
      },
      capture,
      moduleWarnings: moduleWarnings.map((w) => ({ ...w })),
      statusAnnouncement,
      errorAnnouncement,
      guideInitMs
    };
  }

  function getTargetTrace() {
    const effective = membrane?.getLastPolicyRejection?.() || membrane?.getTarget?.() || null;
    const matchedNet = resolveMatchedTargetNet(effective);
    return {
      traceId: 'spa-workflow-target-trace',
      netId: matchedNet?.netId || 'spa-test-target-net',
      entryPlaceId: liveSpa.entryPlaceId || matchedNet?.entryPlaceId || 'p_spa_overview',
      currentPlaceId: liveSpa.activePlaceId || liveSpa.entryPlaceId || matchedNet?.entryPlaceId || 'p_spa_overview',
      events: liveSpa.events.map((e) => ({ ...e }))
    };
  }

  function clearTargetTrace() {
    const effective = membrane?.getLastPolicyRejection?.() || membrane?.getTarget?.() || null;
    const matchedNet = resolveMatchedTargetNet(effective);
    liveSpa.events = [];
    liveSpa.entryPlaceId = liveSpa.activePlaceId || matchedNet?.entryPlaceId || 'p_spa_overview';
    emit();
  }

  function setStep(stepId) {
    const found = WORKFLOW_STEPS.find((s) => s.id === stepId);
    if (!found) return false;
    activeStepId = found.id;
    syncTargetDom();
    emit();
    return true;
  }

  function selectTarget(url, cause = 'workflow-step-target') {
    invalidatedReason = null;
    selectTargetFn(url, cause);
    syncTargetLifecycle();
    emit();
  }

  function recoverTarget() {
    invalidatedReason = null;
    recoverTargetFn();
    syncTargetLifecycle();
    emit();
  }

  function selectDevicePreset(deviceId) {
    if (selectDeviceFn) {
      selectDeviceFn(deviceId);
    } else if (stage && registry) {
      const dev = deviceId ? registry.getById(deviceId) : null;
      if (dev) {
        const geom = stage.getGeometry();
        const isLandscape = geom.internalOrientation === 'horizontal';
        const w = isLandscape ? dev.height : dev.width;
        const h = isLandscape ? dev.width : dev.height;
        stage.setViewportSize(w, h, 'px', dev.name, dev.id, 'preset');
      }
    }
    syncTargetDom();
    emit();
  }

  function rotateDevice() {
    stage?.rotate?.('rotate');
    syncTargetDom();
    emit();
  }

  function recordTargetObservation(observation) {
    const effective = membrane?.getLastPolicyRejection?.() || membrane?.getTarget?.() || null;
    const matchedNet = resolveMatchedTargetNet(effective);
    applyObservation(observation, matchedNet);
    emit();
  }

  function reportModuleFailure(failure) {
    if (!failure) return;
    const normalized = {
      id: String(failure.id || 'optional-module'),
      owner: String(failure.owner || 'unassigned'),
      phase: String(failure.phase || 'init'),
      required: Boolean(failure.required),
      message: String(failure.message || 'Optional module unavailable')
    };
    moduleWarnings = [...moduleWarnings.filter((item) => item.id !== normalized.id), normalized];
    emit();
  }

  async function loadOptionalModules(descriptors = [], loadOptions = {}) {
    const safeDescriptors = (Array.isArray(descriptors) ? descriptors : []).map((d) => ({
      ...d,
      required: d?.required === true
    }));
    return pkc.init(
      { modules: safeDescriptors },
      {
        skipAppConfig: true,
        ...loadOptions,
        onModuleError: (failure) => {
          reportModuleFailure(failure);
          if (typeof loadOptions.onModuleError === 'function') {
            loadOptions.onModuleError(failure);
          }
        }
      }
    );
  }

  function setGuideInitMs(ms) {
    guideInitMs = Number(ms) || 0;
  }

  function getMetrics() {
    return {
      guideInitMs,
      stepCount: WORKFLOW_STEPS.length,
      activeStepId,
      warningCount: moduleWarnings.length
    };
  }

  function subscribe(listener) {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  if (doc && typeof doc.addEventListener === 'function') {
    const onTargetEvent = () => {
      syncTargetLifecycle();
      emit();
    };
    const onViewportEvent = () => {
      bindCurrentIframeIfNeeded();
      syncTargetDom();
      emit();
    };
    for (const evtName of ['lab:target-change', 'lab:target-policy-update', 'lab:target-policy-error']) {
      doc.addEventListener(evtName, onTargetEvent);
      cleanupFns.push(() => doc.removeEventListener(evtName, onTargetEvent));
    }
    doc.addEventListener('lab:viewport-change', onViewportEvent);
    cleanupFns.push(() => doc.removeEventListener('lab:viewport-change', onViewportEvent));
  }

  if (recorder && typeof recorder.onChange === 'function') {
    const unsubRecorder = recorder.onChange((type, data) => {
      if (type === 'invalidated') {
        invalidatedReason = data?.reason || 'Target policy invalidated active capture';
      } else if (type === 'reset') {
        invalidatedReason = null;
      } else if (type === 'state' && data === 'RECORDING') {
        invalidatedReason = null;
      }
      emit();
    });
    cleanupFns.push(unsubRecorder);
  }

  syncTargetLifecycle();

  function destroy() {
    detachIframeListener();
    while (cleanupFns.length > 0) {
      const fn = cleanupFns.pop();
      try {
        fn();
      } catch {}
    }
    subscribers.clear();
  }

  return {
    steps: WORKFLOW_STEPS,
    getState,
    setStep,
    resolveStepForKey: resolveStepIdForKey,
    selectTarget,
    recoverTarget,
    selectDevicePreset,
    rotateDevice,
    syncTargetDom,
    recordTargetObservation,
    getTargetTrace,
    clearTargetTrace,
    reportModuleFailure,
    loadOptionalModules,
    setGuideInitMs,
    getMetrics,
    subscribe,
    destroy
  };
}
