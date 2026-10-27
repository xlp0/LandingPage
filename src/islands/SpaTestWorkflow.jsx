import { useEffect, useRef, useState } from 'preact/hooks';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';
import {
  WORKFLOW_STEPS,
  createSpaTestWorkflow,
  resolveStepIdForKey
} from '../../js/harness/spa-test-workflow.js';

function buildInitialSnapshot(targetNets = {}) {
  const defaultNet = targetNets['/tests/fixtures/spa-test-target.html'] || null;
  const firstStep = WORKFLOW_STEPS[0];
  return {
    steps: WORKFLOW_STEPS,
    activeStepId: firstStep.id,
    activeStepIndex: 0,
    workbenchPlaceId: 'p_page_responsive_lab',
    mpaAssessment: {
      status: 'optional-deferred',
      label: 'MPA Assessment: Optional / Deferred',
      approvedForP0: false
    },
    target: {
      url: 'app.html',
      raw: 'app.html',
      targetId: 'local-ui-app',
      targetType: 'webapp',
      isSpa: false,
      policyState: 'approved-same-origin',
      captureAllowed: true,
      recoverable: false,
      errorPlaceId: null,
      reason: null,
      hasCheckedTargetNet: false,
      classificationNote:
        'app.html and general webapps remain classified as webapp (astro-wrapped) and are not presented as SPA targets pending Product Manager approval.'
    },
    device: {
      deviceId: null,
      deviceName: 'Full (100%)',
      width: 100,
      height: 100,
      unit: '%',
      orientation: 'landscape',
      scale: 1
    },
    targetNet: null,
    defaultSpaNet: defaultNet,
    liveSpa: {
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
      targetTrace: {
        traceId: 'spa-workflow-target-trace',
        netId: defaultNet?.netId || 'spa-test-target-net',
        entryPlaceId: defaultNet?.entryPlaceId || 'p_spa_overview',
        currentPlaceId: defaultNet?.entryPlaceId || 'p_spa_overview',
        events: []
      }
    },
    capture: {
      recorderState: 'IDLE',
      completeness: 'idle',
      completenessLabel: 'Idle (Ready to Record)',
      isIncomplete: false,
      canClaimComplete: false,
      invalidatedReason: null,
      eventCount: 0,
      undersizedTaps: 0,
      savedRun: null,
      graphLinkageNote:
        'Graph-to-run MCard linkage (navigation_run_link:v1) is deferred to SPRINT-GQC-05; responsive_test_run:v1 remains closed.'
    },
    moduleWarnings: [],
    statusAnnouncement:
      'Step 1 of 5: Select Target & Policy. Target app.html (webapp). Device Full (100%) (landscape).',
    errorAnnouncement: '',
    guideInitMs: 0
  };
}

export default function SpaTestWorkflow({ targetNets = {} }) {
  const [state, setState] = useState(() => buildInitialSnapshot(targetNets));
  const [ready, setReady] = useState(false);
  const workflowRef = useRef(null);

  useEffect(() => {
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const runtime = getLabRuntime();
    const workflow = createSpaTestWorkflow({
      targetNets,
      membrane: runtime.membrane,
      stage: runtime.stage,
      registry: runtime.registry,
      recorder: runtime.recorder,
      selectTarget: (url, cause) => runtime.selectTarget(url, cause),
      recoverTarget: () => runtime.recoverTarget(),
      selectDevicePreset: (deviceId) => runtime.selectDevicePreset(deviceId)
    });
    workflowRef.current = workflow;

    const unsub = workflow.subscribe((next) => {
      setState(next);
    });

    const initMs = typeof performance !== 'undefined' ? Number((performance.now() - t0).toFixed(3)) : 0;
    workflow.setGuideInitMs(initMs);
    runtime.attachWorkflow(workflow);
    setState(workflow.getState());
    setReady(true);
    runtime.markBootParticipant('workflow');

    return () => {
      unsub();
      runtime.detachWorkflow(workflow);
      workflow.destroy();
      workflowRef.current = null;
    };
  }, []);

  const selectStep = (stepId) => {
    if (workflowRef.current) {
      workflowRef.current.setStep(stepId);
    }
  };

  const handleTabKeyDown = (e, currentStepId) => {
    const nextStepId = workflowRef.current
      ? workflowRef.current.resolveStepForKey(e.key, currentStepId)
      : resolveStepIdForKey(e.key, currentStepId);
    if (!nextStepId) return;
    e.preventDefault();
    selectStep(nextStepId);
    if (typeof document !== 'undefined') {
      document.getElementById(`workflow-tab-${nextStepId}`)?.focus();
    }
  };

  const triggerRibbonButton = (buttonId, fallbackFn) => {
    if (typeof document !== 'undefined') {
      const btn = document.getElementById(buttonId);
      if (btn) {
        btn.click();
        return;
      }
    }
    if (typeof fallbackFn === 'function') {
      fallbackFn();
    }
  };

  const activeNet = state.targetNet;

  return (
    <section
      id="spa-test-workflow"
      className="spa-workflow-card"
      data-island="spa-test-workflow"
      data-testid="spa-test-workflow"
      data-active-step={state.activeStepId}
      data-workflow-ready={ready ? 'true' : 'false'}
      aria-labelledby="spa-workflow-heading"
    >
      <div className="spa-workflow-header">
        <h2 id="spa-workflow-heading" className="spa-workflow-title">
          Guided SPA Test Workflow
        </h2>
        <span
          id="spa-workflow-mpa-badge"
          data-testid="mpa-status-badge"
          className="lab-badge spa-workflow-deferred-badge"
        >
          {state.mpaAssessment.label}
        </span>
      </div>

      <div
        id="spa-workflow-status"
        data-testid="spa-workflow-status"
        role="status"
        aria-live="polite"
        className="spa-workflow-live-status"
      >
        {state.statusAnnouncement}
      </div>

      <div
        id="spa-workflow-error"
        data-testid="spa-workflow-error"
        role="alert"
        aria-live="assertive"
        className="spa-workflow-live-error"
        style={{ display: state.errorAnnouncement ? 'block' : 'none' }}
      >
        {state.errorAnnouncement}
      </div>

      {state.moduleWarnings.length > 0 && (
        <div
          id="spa-workflow-module-warnings"
          data-testid="spa-workflow-module-warnings"
          role="status"
          aria-live="polite"
          className="spa-workflow-warnings"
        >
          <div className="spa-workflow-warnings-title">Optional Extension Degraded (Core Guide Active)</div>
          {state.moduleWarnings.map((warning) => (
            <div key={warning.id} className="spa-workflow-warning-row">
              <code>{warning.id}</code> ({warning.owner}): {warning.message}
            </div>
          ))}
        </div>
      )}

      <div className="spa-workflow-tablist" role="tablist" aria-label="SPA test workflow steps">
        {state.steps.map((step) => {
          const isSelected = step.id === state.activeStepId;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              id={`workflow-tab-${step.id}`}
              data-testid={`workflow-tab-${step.id}`}
              aria-selected={isSelected ? 'true' : 'false'}
              aria-controls={`workflow-panel-${step.id}`}
              tabIndex={isSelected ? 0 : -1}
              className={`spa-workflow-tab${isSelected ? ' active' : ''}`}
              onClick={() => selectStep(step.id)}
              onKeyDown={(e) => handleTabKeyDown(e, step.id)}
            >
              {step.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="workflow-panel-step-target"
        data-testid="workflow-panel-step-target"
        aria-labelledby="workflow-tab-step-target"
        hidden={state.activeStepId !== 'step-target'}
        className="spa-workflow-panel"
      >
        <div className="spa-workflow-meta-grid">
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Target:</span>
            <code data-testid="workflow-target-url">{state.target.raw}</code>
          </div>
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Type:</span>
            <span
              data-testid="workflow-target-type"
              data-target-type={state.target.targetType}
              className="lab-badge"
            >
              {state.target.targetType}
            </span>
          </div>
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">SPA Eligibility:</span>
            <span data-testid="workflow-spa-eligibility" className="spa-workflow-v">
              {state.target.isSpa ? 'Approved P0 SPA Target' : 'Not Classified as SPA'}
            </span>
          </div>
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Policy:</span>
            <code data-testid="workflow-policy-state">{state.target.policyState}</code>
          </div>
        </div>
        <p data-testid="workflow-classification-note" className="spa-workflow-note">
          {state.target.classificationNote}
        </p>
        <div className="spa-workflow-actions">
          <button
            type="button"
            data-testid="workflow-select-spa-fixture"
            className="toolbar-btn"
            onClick={() => workflowRef.current?.selectTarget('/tests/fixtures/spa-test-target.html', 'workflow-spa-btn')}
          >
            Select P0 SPA Fixture
          </button>
          <button
            type="button"
            data-testid="workflow-select-app-html"
            className="toolbar-btn"
            onClick={() => workflowRef.current?.selectTarget('app.html', 'workflow-webapp-btn')}
          >
            Inspect app.html (Webapp)
          </button>
          {state.target.recoverable && (
            <button
              type="button"
              data-testid="workflow-recover-target"
              className="toolbar-btn"
              onClick={() => workflowRef.current?.recoverTarget()}
            >
              Recover Default Target
            </button>
          )}
          <button
            type="button"
            data-testid="workflow-next-device"
            className="toolbar-btn"
            onClick={() => selectStep('step-device')}
          >
            Next: 2. Device
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id="workflow-panel-step-device"
        data-testid="workflow-panel-step-device"
        aria-labelledby="workflow-tab-step-device"
        hidden={state.activeStepId !== 'step-device'}
        className="spa-workflow-panel"
      >
        <div className="spa-workflow-meta-grid">
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Device:</span>
            <span data-testid="workflow-active-device" className="spa-workflow-v">
              {state.device.deviceName}
            </span>
          </div>
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Viewport:</span>
            <code data-testid="workflow-active-dimensions">
              {`${state.device.width}x${state.device.height}${state.device.unit}`}
            </code>
          </div>
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Orientation:</span>
            <code data-testid="workflow-active-orientation">{state.device.orientation}</code>
          </div>
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Active Place:</span>
            <code data-testid="workflow-device-place">
              {state.liveSpa.activePlaceId || 'none'}
            </code>
          </div>
        </div>
        <div className="spa-workflow-actions">
          <button
            type="button"
            data-testid="workflow-device-phone"
            className="toolbar-btn"
            onClick={() => workflowRef.current?.selectDevicePreset('iphone-16-pro')}
          >
            iPhone 16 Pro
          </button>
          <button
            type="button"
            data-testid="workflow-device-tablet"
            className="toolbar-btn"
            onClick={() => workflowRef.current?.selectDevicePreset('ipad-air-11')}
          >
            iPad Air 11
          </button>
          <button
            type="button"
            data-testid="workflow-rotate-device"
            className="toolbar-btn"
            onClick={() => workflowRef.current?.rotateDevice()}
          >
            Rotate Orientation
          </button>
          <button
            type="button"
            data-testid="workflow-next-places"
            className="toolbar-btn"
            onClick={() => selectStep('step-places')}
          >
            Next: 3. Pages &amp; Places
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id="workflow-panel-step-places"
        data-testid="workflow-panel-step-places"
        aria-labelledby="workflow-tab-step-places"
        hidden={state.activeStepId !== 'step-places'}
        className="spa-workflow-panel"
      >
        {!activeNet ? (
          <p data-testid="workflow-no-target-net" className="spa-workflow-note">
            No checked P0 SPA target net is bound to {state.target.raw}. Select the approved SPA fixture (/tests/fixtures/spa-test-target.html) to inspect Pages and Places.
          </p>
        ) : (
          <div>
            <div className="spa-workflow-meta-grid">
              <div className="spa-workflow-kv">
                <span className="spa-workflow-k">Target Net:</span>
                <code data-testid="workflow-target-net-id">{activeNet.netId}</code>
              </div>
              <div className="spa-workflow-kv">
                <span className="spa-workflow-k">Live Place:</span>
                <code data-testid="workflow-live-place">
                  {state.liveSpa.activePlaceId || activeNet.entryPlaceId}
                </code>
              </div>
              <div className="spa-workflow-kv">
                <span className="spa-workflow-k">Session Reloaded:</span>
                <code data-testid="workflow-session-reloaded">
                  {state.liveSpa.reloadedDuringSession ? 'yes' : 'no'}
                </code>
              </div>
            </div>
            <div className="spa-workflow-table-wrap">
              <table className="spa-workflow-table" data-testid="workflow-places-table">
                <thead>
                  <tr>
                    <th scope="col">Page ID</th>
                    <th scope="col">Place ID</th>
                    <th scope="col">Kind</th>
                    <th scope="col">Route Handle</th>
                    <th scope="col">CLM Type URI</th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {activeNet.places.map((place) => {
                    const isActive = state.liveSpa.activePlaceId === place.placeId;
                    const stateText = isActive
                      ? (place.kind === 'error' ? 'Error Active' : 'Active')
                      : 'Standby';
                    return (
                      <tr key={place.placeId} data-testid={`place-row-${place.placeId}`}>
                        <td><code data-testid={`place-page-${place.placeId}`}>{place.pageId}</code></td>
                        <td><code data-testid={`place-id-${place.placeId}`}>{place.placeId}</code></td>
                        <td><span>{place.kind}</span></td>
                        <td><code data-testid={`place-route-handle-${place.placeId}`}>{place.routeHandle}</code></td>
                        <td><code data-testid={`place-clm-uri-${place.placeId}`}>{place.clmTypeUri}</code></td>
                        <td><span data-testid={`place-status-${place.placeId}`}>{stateText}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="spa-workflow-actions">
          <button
            type="button"
            data-testid="workflow-next-transitions"
            className="toolbar-btn"
            onClick={() => selectStep('step-transitions')}
          >
            Next: 4. Links &amp; Transitions
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id="workflow-panel-step-transitions"
        data-testid="workflow-panel-step-transitions"
        aria-labelledby="workflow-tab-step-transitions"
        hidden={state.activeStepId !== 'step-transitions'}
        className="spa-workflow-panel"
      >
        {!activeNet ? (
          <p data-testid="workflow-no-transitions-net" className="spa-workflow-note">
            PenPot MPA links and non-SPA targets are not counted as supported P0 target transitions.
          </p>
        ) : (
          <div>
            <div className="spa-workflow-meta-grid">
              <div className="spa-workflow-kv">
                <span className="spa-workflow-k">Valid Navigations:</span>
                <code data-testid="workflow-valid-nav-count">
                  {String(state.liveSpa.successfulNavigationCount)}
                </code>
              </div>
              <div className="spa-workflow-kv">
                <span className="spa-workflow-k">Last Transition:</span>
                <code data-testid="workflow-last-transition">
                  {state.liveSpa.lastTransitionId || 'none'}
                </code>
              </div>
              <div className="spa-workflow-kv">
                <span className="spa-workflow-k">Error State:</span>
                <code data-testid="workflow-error-place-indicator">
                  {state.liveSpa.inErrorPlace ? state.liveSpa.activePlaceId : 'none'}
                </code>
              </div>
            </div>
            <div className="spa-workflow-table-wrap">
              <table className="spa-workflow-table" data-testid="workflow-transitions-table">
                <thead>
                  <tr>
                    <th scope="col">Transition</th>
                    <th scope="col">Action Name</th>
                    <th scope="col">From</th>
                    <th scope="col">Destination / Error Place</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeNet.transitions.map((t) => {
                    const liveStatus = state.liveSpa.transitionStatuses[t.transitionId] || 'idle';
                    const destText = t.errorPlaceId
                      ? `Error: ${t.errorPlaceId}`
                      : t.destinationPlaceId;
                    return (
                      <tr key={t.transitionId} data-testid={`transition-row-${t.transitionId}`}>
                        <td><code data-testid={`transition-id-${t.transitionId}`}>{t.transitionId}</code></td>
                        <td><span data-testid={`transition-action-${t.transitionId}`}>{t.actionName}</span></td>
                        <td><code>{t.fromPlaceId}</code></td>
                        <td><code data-testid={`transition-dest-${t.transitionId}`}>{destText}</code></td>
                        <td><code data-testid={`transition-status-${t.transitionId}`}>{liveStatus}</code></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="spa-workflow-actions">
          <button
            type="button"
            data-testid="workflow-next-evidence"
            className="toolbar-btn"
            onClick={() => selectStep('step-evidence')}
          >
            Next: 5. Capture &amp; Evidence
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id="workflow-panel-step-evidence"
        data-testid="workflow-panel-step-evidence"
        aria-labelledby="workflow-tab-step-evidence"
        hidden={state.activeStepId !== 'step-evidence'}
        className="spa-workflow-panel"
      >
        <div className="spa-workflow-meta-grid">
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Recorder:</span>
            <code data-testid="workflow-recorder-state">{state.capture.recorderState}</code>
          </div>
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Events:</span>
            <code data-testid="workflow-event-count">{String(state.capture.eventCount)}</code>
          </div>
          <div className="spa-workflow-kv">
            <span className="spa-workflow-k">Status:</span>
            <span
              data-testid="capture-completeness-badge"
              data-completeness={state.capture.completeness}
              className="spa-workflow-v"
            >
              {state.capture.completenessLabel}
            </span>
          </div>
        </div>

        <div
          data-testid="incomplete-capture-badge"
          className="spa-workflow-incomplete-banner"
          style={{ display: state.capture.isIncomplete ? 'block' : 'none' }}
        >
          {state.capture.completenessLabel} (Not Pass / Not Certified)
        </div>

        <div className="spa-workflow-actions">
          <button
            type="button"
            data-testid="workflow-rec-start"
            className="toolbar-btn"
            onClick={() => triggerRibbonButton('btn-rec-start', () => getLabRuntime().recorder.start())}
          >
            Start Capture
          </button>
          <button
            type="button"
            data-testid="workflow-rec-stop"
            className="toolbar-btn"
            onClick={() => triggerRibbonButton('btn-rec-stop', () => getLabRuntime().recorder.stop())}
          >
            Stop &amp; Save MCard
          </button>
        </div>

        <div data-testid="workflow-mcard-evidence" className="spa-workflow-evidence-box">
          {state.capture.savedRun?.ok ? (
            <div>
              <div className="mcard-result-row">
                <span className="mcard-result-key">Handle:</span>
                <code id="workflow-mcard-handle" data-testid="workflow-mcard-handle" className="mcard-result-val">
                  {state.capture.savedRun.handle}
                </code>
              </div>
              <div className="mcard-result-row">
                <span className="mcard-result-key">Hash:</span>
                <code id="workflow-mcard-hash" data-testid="workflow-mcard-hash" className="mcard-result-val">
                  {state.capture.savedRun.hash}
                </code>
              </div>
            </div>
          ) : state.capture.savedRun && !state.capture.savedRun.ok ? (
            <div data-testid="workflow-mcard-save-error" className="spa-workflow-live-error">
              Save failed: {state.capture.savedRun.error || 'offline'}
            </div>
          ) : (
            <div data-testid="workflow-mcard-empty" className="spa-workflow-note">
              No persisted MCard run in this session yet.
            </div>
          )}
          <p data-testid="workflow-gqc05-note" className="spa-workflow-note">
            {state.capture.graphLinkageNote}
          </p>
        </div>
      </div>
    </section>
  );
}
