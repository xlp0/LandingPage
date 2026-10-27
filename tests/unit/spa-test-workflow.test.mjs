import test from 'node:test';
import assert from 'node:assert/strict';
import { Layer4TrellisNavigationNet } from 'clm-kernel';
import { loadNetEnvelope, replayNetTrace, validateNetEnvelope } from '../../scripts/check-net.mjs';
import {
  WORKFLOW_STEPS,
  assertDisjointNetIds,
  serializeTargetNetEnvelope,
  resolveStepIdForKey,
  createSpaTestWorkflow
} from '../../js/harness/spa-test-workflow.js';

function createFakeDoc() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(evt) {
      for (const fn of [...(listeners.get(evt.type) || [])]) {
        fn(evt);
      }
    },
    getElementById() {
      return null;
    },
    totalListeners() {
      let total = 0;
      for (const set of listeners.values()) total += set.size;
      return total;
    }
  };
}

test('assertDisjointNetIds validates disjoint workbench and target nets and rejects colliding IDs', () => {
  const workbench = loadNetEnvelope('src/net/workbench-net.yaml');
  const spaTarget = loadNetEnvelope('tests/fixtures/spa-test-target.graph.json');

  assert.equal(validateNetEnvelope(workbench, { currentSprint: 'SPRINT-GQC-04' }).valid, true);
  assert.equal(validateNetEnvelope(spaTarget, { currentSprint: 'SPRINT-GQC-04' }).valid, true);

  const ok = assertDisjointNetIds(workbench, spaTarget);
  assert.equal(ok.ok, true);
  assert.equal(ok.placeCount, 3);
  assert.equal(ok.transitionCount, 4);

  const collidingPlace = structuredClone(spaTarget);
  collidingPlace.topology.places[0].id = 'p_page_responsive_lab';
  assert.throws(
    () => assertDisjointNetIds(workbench, collidingPlace),
    /share IDs: p_page_responsive_lab/
  );

  const collidingTransition = structuredClone(spaTarget);
  collidingTransition.topology.transitions[0].id = 't_req_post_test_runs';
  assert.throws(
    () => assertDisjointNetIds(workbench, collidingTransition),
    /share IDs: t_req_post_test_runs/
  );

  const declaredWbTransitions = new Set(workbench.topology.transitions.map((t) => t.id));
  for (const step of WORKFLOW_STEPS) {
    assert.equal(step.workbenchPlaceId, 'p_page_responsive_lab');
    for (const tid of step.workbenchTransitions) {
      assert.equal(declaredWbTransitions.has(tid), true, `Missing workbench Transition ${tid}`);
    }
  }
});

test('serializeTargetNetEnvelope preserves separate routeHandle and clmTypeUri and aligns with Layer4TrellisNavigationNet', () => {
  const spaTarget = loadNetEnvelope('tests/fixtures/spa-test-target.graph.json');
  const serialized = serializeTargetNetEnvelope(spaTarget);

  assert.equal(serialized.netId, 'spa-test-target-net');
  assert.equal(serialized.places.length, 3);
  for (const place of serialized.places) {
    assert.ok(place.routeHandle.startsWith('mcard:target:'));
    assert.ok(place.clmTypeUri.startsWith('clm://type/'));
    assert.notEqual(place.routeHandle, place.clmTypeUri);
    assert.notEqual(place.placeId, place.clmTypeUri);
  }

  const invalidLink = serialized.transitions.find((t) => t.transitionId === 't_spa_invalid_unmapped');
  assert.equal(invalidLink.destinationPlaceId, null);
  assert.equal(invalidLink.errorPlaceId, 'p_spa_missing_transition');
  assert.equal(invalidLink.actionName, 'Open Unmapped Audit Route');

  const validLink = serialized.transitions.find((t) => t.transitionId === 't_spa_open_details');
  assert.equal(validLink.destinationPlaceId, 'p_spa_details');
  assert.equal(validLink.errorPlaceId, null);
  assert.equal(validLink.actionName, 'Open Service Details');

  const conflated = structuredClone(spaTarget);
  conflated.bindings.places.p_spa_overview.clmTypeUri =
    conflated.bindings.places.p_spa_overview.routeHandle;
  assert.throws(
    () => serializeTargetNetEnvelope(conflated),
    /conflates clmTypeUri/
  );

  const net = new Layer4TrellisNavigationNet();
  for (const place of serialized.places) {
    net.registerViewPlace(place.placeId, place.clmTypeUri, {
      role: place.entry ? 'Entry' : 'Intermediate'
    });
  }
  for (const t of serialized.transitions) {
    if (t.destinationPlaceId && t.kind === 'client-route') {
      net.registerHyperlink(t.fromPlaceId, t.linkId, t.destinationPlaceId);
    }
  }
  const s1 = net.startSession('p_spa_overview', 'unit-valid');
  const stepOk = net.clickHyperlink(s1.marking, 'p_spa_overview', 'link_spa_open_details', s1.sessionToken);
  assert.equal(stepOk.navigated, true);
  assert.equal(stepOk.trappedToErrorModal, false);
  assert.equal(stepOk.currentViewPlaceId, 'p_spa_details');

  const s2 = net.startSession('p_spa_overview', 'unit-trap');
  const stepTrap = net.clickHyperlink(s2.marking, 'p_spa_overview', 'link_spa_invalid_unmapped', s2.sessionToken);
  assert.equal(stepTrap.navigated, false);
  assert.equal(stepTrap.trappedToErrorModal, true);
  assert.equal(stepTrap.currentViewPlaceId, 'p_error_modal');
});

test('createSpaTestWorkflow classifies app.html as webapp, defers MPA, navigates steps by keyboard, and surfaces policy recovery', () => {
  const spaTarget = loadNetEnvelope('tests/fixtures/spa-test-target.graph.json');
  const targetNets = {
    '/tests/fixtures/spa-test-target.html': serializeTargetNetEnvelope(spaTarget)
  };
  const fakeDoc = createFakeDoc();

  let activeTarget = {
    url: 'http://localhost:3001/app.html',
    raw: 'app.html',
    targetId: 'local-ui-app',
    targetType: 'spa',
    status: 'allowed',
    sameOrigin: true,
    captureAllowed: true,
    policyState: 'approved-same-origin'
  };

  const workflow = createSpaTestWorkflow({
    targetNets,
    doc: fakeDoc,
    membrane: {
      getTarget: () => activeTarget,
      getLastPolicyRejection: () => null,
      getPolicyPlaceId: () => 'p_page_responsive_lab'
    },
    selectTarget: (url) => {
      if (url === '/tests/fixtures/spa-test-target.html') {
        activeTarget = {
          url: 'http://localhost:3001/tests/fixtures/spa-test-target.html',
          raw: url,
          targetId: 'spa-test-target',
          targetType: 'spa',
          status: 'allowed',
          sameOrigin: true,
          captureAllowed: true,
          policyState: 'approved-same-origin'
        };
      } else if (url === 'https://github.com') {
        activeTarget = {
          url,
          raw: url,
          targetId: 'blocked-github',
          targetType: 'blocked',
          status: 'blocked',
          sameOrigin: false,
          captureAllowed: false,
          policyState: 'blocked',
          errorPlaceId: 'p_error_target_blocked',
          reason: 'X-Frame-Options: DENY'
        };
      }
    },
    recoverTarget: () => {
      activeTarget = {
        url: 'http://localhost:3001/app.html',
        raw: 'app.html',
        targetId: 'local-ui-app',
        targetType: 'webapp',
        status: 'allowed',
        sameOrigin: true,
        captureAllowed: true,
        policyState: 'approved-same-origin'
      };
    }
  });

  const initial = workflow.getState();
  assert.equal(initial.target.targetType, 'webapp');
  assert.equal(initial.target.isSpa, false);
  assert.equal(initial.mpaAssessment.status, 'optional-deferred');
  assert.equal(initial.mpaAssessment.approvedForP0, false);
  assert.equal(initial.targetNet, null);

  assert.equal(resolveStepIdForKey('ArrowRight', 'step-target'), 'step-device');
  assert.equal(resolveStepIdForKey('ArrowLeft', 'step-target'), 'step-evidence');
  assert.equal(resolveStepIdForKey('End', 'step-target'), 'step-evidence');
  assert.equal(resolveStepIdForKey('Home', 'step-evidence'), 'step-target');
  assert.equal(WORKFLOW_STEPS.length, 5);

  workflow.selectTarget('https://github.com');
  const blocked = workflow.getState();
  assert.equal(blocked.target.recoverable, true);
  assert.match(blocked.errorAnnouncement, /X-Frame-Options: DENY/);

  workflow.recoverTarget();
  assert.equal(workflow.getState().target.recoverable, false);

  workflow.selectTarget('/tests/fixtures/spa-test-target.html');
  const spaState = workflow.getState();
  assert.equal(spaState.target.isSpa, true);
  assert.equal(spaState.targetNet.netId, 'spa-test-target-net');

  workflow.destroy();
  assert.equal(fakeDoc.totalListeners(), 0);
});

test('createSpaTestWorkflow distinguishes valid SPA transitions from error Place p_spa_missing_transition and replays through ColoredPetriVM', async () => {
  const spaTarget = loadNetEnvelope('tests/fixtures/spa-test-target.graph.json');
  const targetNets = {
    '/tests/fixtures/spa-test-target.html': serializeTargetNetEnvelope(spaTarget)
  };
  const fakeDoc = createFakeDoc();

  const workflow = createSpaTestWorkflow({
    targetNets,
    doc: fakeDoc,
    membrane: {
      getTarget: () => ({
        url: 'http://localhost:3001/tests/fixtures/spa-test-target.html',
        raw: '/tests/fixtures/spa-test-target.html',
        targetType: 'spa',
        status: 'allowed',
        sameOrigin: true,
        captureAllowed: true,
        policyState: 'approved-same-origin'
      }),
      getLastPolicyRejection: () => null
    }
  });

  workflow.recordTargetObservation({
    pageId: 'page_spa_overview',
    placeId: 'p_spa_overview',
    lastTransitionId: 'none',
    transitionCount: 0,
    bootNonce: 'nonce-1'
  });

  workflow.recordTargetObservation({
    pageId: 'page_spa_details',
    placeId: 'p_spa_details',
    lastTransitionId: 't_spa_open_details',
    transitionCount: 1,
    bootNonce: 'nonce-1'
  });

  assert.equal(workflow.getState().liveSpa.successfulNavigationCount, 1);
  assert.equal(workflow.getState().liveSpa.transitionStatuses.t_spa_open_details, 'committed');

  workflow.recordTargetObservation({
    pageId: 'page_spa_overview',
    placeId: 'p_spa_overview',
    lastTransitionId: 't_spa_back_overview',
    transitionCount: 2,
    bootNonce: 'nonce-1'
  });
  assert.equal(workflow.getState().liveSpa.successfulNavigationCount, 2);

  workflow.recordTargetObservation({
    pageId: 'page_spa_missing_transition',
    placeId: 'p_spa_missing_transition',
    lastTransitionId: 't_spa_invalid_unmapped',
    transitionCount: 3,
    bootNonce: 'nonce-1',
    errorAlertText: 'Missing Transition destination: p_spa_missing_transition'
  });

  const errState = workflow.getState();
  assert.equal(errState.liveSpa.inErrorPlace, true);
  assert.equal(errState.liveSpa.successfulNavigationCount, 2);
  assert.equal(errState.liveSpa.transitionStatuses.t_spa_invalid_unmapped, 'error-trapped');
  assert.match(errState.errorAnnouncement, /p_spa_missing_transition/);

  workflow.recordTargetObservation({
    pageId: 'page_spa_overview',
    placeId: 'p_spa_overview',
    lastTransitionId: 't_spa_recover_overview',
    transitionCount: 4,
    bootNonce: 'nonce-1'
  });

  const recoveredState = workflow.getState();
  assert.equal(recoveredState.liveSpa.inErrorPlace, false);
  assert.equal(recoveredState.liveSpa.reloadedDuringSession, false);
  assert.equal(recoveredState.liveSpa.transitionStatuses.t_spa_recover_overview, 'recovered');

  const replayResult = await replayNetTrace(spaTarget, workflow.getTargetTrace());
  assert.equal(replayResult.ok, true);
  assert.equal(replayResult.finalPlaceId, 'p_spa_overview');
  assert.equal(replayResult.sessionInvariantHolds, true);
  assert.deepEqual(replayResult.firedTransitionIds, [
    't_spa_open_details',
    't_spa_back_overview',
    't_spa_invalid_unmapped',
    't_spa_recover_overview'
  ]);

  workflow.destroy();
});

test('createSpaTestWorkflow marks active, paused, invalidated, and unsaved captures incomplete and isolates optional module failures', async () => {
  const fakeDoc = createFakeDoc();
  let recState = 'IDLE';
  let recSaved = null;
  let recListener = null;

  const fakeRecorder = {
    get state() {
      return recState;
    },
    get lastSavedRun() {
      return recSaved;
    },
    stats: () => ({ size: 3, undersizedTaps: 0 }),
    onChange(fn) {
      recListener = fn;
      return () => {
        recListener = null;
      };
    }
  };

  const workflow = createSpaTestWorkflow({
    doc: fakeDoc,
    recorder: fakeRecorder
  });

  assert.equal(workflow.getState().capture.completeness, 'idle');
  assert.equal(workflow.getState().capture.isIncomplete, false);

  recState = 'RECORDING';
  recListener?.('state', 'RECORDING');
  assert.equal(workflow.getState().capture.isIncomplete, true);
  assert.equal(workflow.getState().capture.canClaimComplete, false);

  recState = 'PAUSED';
  recListener?.('state', 'PAUSED');
  assert.equal(workflow.getState().capture.isIncomplete, true);

  recState = 'FINALIZED';
  recListener?.('state', 'FINALIZED');
  assert.equal(workflow.getState().capture.isIncomplete, true);
  assert.match(workflow.getState().capture.completenessLabel, /Incomplete Capture/);

  recListener?.('invalidated', { reason: 'Cross-origin redirect mid-session' });
  assert.equal(workflow.getState().capture.isIncomplete, true);
  assert.match(workflow.getState().errorAnnouncement, /Cross-origin redirect/);

  recListener?.('reset', null);
  recState = 'FINALIZED';
  recSaved = {
    ok: true,
    data: { handle: 'responsive_test_run_spa_001', hash: 'a'.repeat(64) },
    run: { schema: 'urn:mcard:schema:responsive_test_run:v1', metrics: { eventCount: 3 } }
  };
  recListener?.('saved', recSaved);

  const savedCapture = workflow.getState().capture;
  assert.equal(savedCapture.completeness, 'complete');
  assert.equal(savedCapture.isIncomplete, false);
  assert.equal(savedCapture.canClaimComplete, true);
  assert.equal(savedCapture.savedRun.handle, 'responsive_test_run_spa_001');
  assert.match(savedCapture.graphLinkageNote, /SPRINT-GQC-05/);

  await workflow.loadOptionalModules(
    [
      { id: 'broken-telemetry-ext', owner: 'Operations', required: false, entry: 'mod:broken' },
      { id: 'healthy-helper', owner: 'TEA', required: false, entry: 'mod:ok' }
    ],
    {
      loader: async (entry) => {
        if (entry === 'mod:broken') throw new Error('extension bundle offline');
        return { async init() {}, async start() {} };
      }
    }
  );

  const warnings = workflow.getState().moduleWarnings;
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].id, 'broken-telemetry-ext');
  assert.equal(warnings[0].owner, 'Operations');
  assert.equal(workflow.setStep('step-evidence'), true);
  assert.equal(workflow.getState().activeStepId, 'step-evidence');

  workflow.destroy();
  assert.equal(recListener, null);
  assert.equal(fakeDoc.totalListeners(), 0);
});
