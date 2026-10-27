import { DeviceRegistry } from '../device-registry.js';
import { createViewportStage } from './viewport-stage.js';
import { createTargetMembrane, classifyTargetSelection } from './target-membrane.js';
import { installLabApi } from './lab-api.js';
import { createCaptureSource } from './membrane-interceptor.js';
import { InteractionRecorder } from './recorder.js';
import { resolveFidelity } from './fidelity.js';

const REQUIRED_BOOT_PARTICIPANTS = ['stage', 'toolbar', 'presets', 'ribbon', 'workflow'];
let singletonRuntime = null;

function unregisterLocalServiceWorkers() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  const host = window.location?.hostname || '';
  if (host !== 'localhost' && host !== '127.0.0.1') return;
  if (!('serviceWorker' in navigator) || typeof navigator.serviceWorker?.getRegistrations !== 'function') return;
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    })
    .catch(() => {});
}

function createLabRuntimeInstance() {
  unregisterLocalServiceWorkers();

  const registry = new DeviceRegistry();
  const recorder = new InteractionRecorder();
  const bootReadySet = new Set();
  let bootFinished = false;
  let outerRafId = null;
  let innerRafId = null;
  let activePresetsUI = null;
  let activeToolbar = null;
  let activeRibbon = null;
  let activeWorkflow = null;
  let stageAttached = false;
  let sameOriginLoadCleanup = null;

  const stage = createViewportStage({
    onPresetDeactivate: () => activePresetsUI?.markActiveChip(null)
  });

  function getActiveDevice() {
    const id = stage.getGeometry().deviceId;
    return id ? registry.getById(id) : null;
  }

  function getFidelity() {
    return resolveFidelity(getActiveDevice(), 'lab-iframe');
  }

  function clearSameOriginLoadGuard() {
    if (sameOriginLoadCleanup) {
      try {
        sameOriginLoadCleanup();
      } catch {}
      sameOriginLoadCleanup = null;
    }
  }

  async function handleMidSessionRedirectInvalidation(preRedirectTarget, reason) {
    const wasActive = recorder.state === 'RECORDING' || recorder.state === 'PAUSED';
    recorder.invalidateActiveCapture(reason);
    membrane.notifyProbeHandshakeOutcome('unavailable', reason);
    if (wasActive && preRedirectTarget?.url) {
      await recorder.saveTestRun({
        target: preRedirectTarget,
        device: getActiveDevice(),
        orientation: stage.getGeometry().orientation,
        fidelity: getFidelity()
      });
    }
  }

  function updateCaptureSource(targetDetail) {
    clearSameOriginLoadGuard();

    if (!stageAttached) {
      recorder.setSource(null);
      return;
    }

    const iframe = typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null;
    const allowedOrigins = membrane.getApprovedOrigins();
    const snapshotTarget = targetDetail ? { ...targetDetail } : null;

    const source = createCaptureSource(targetDetail, {
      iframe,
      allowedOrigins,
      getDeviceProfile: getActiveDevice,
      getViewport: () => stage.getGeometry(),
      onHandshakeStatus: (outcome, reason) => {
        membrane.notifyProbeHandshakeOutcome(outcome, reason);
      },
      onRedirectInvalidate: (reason) => {
        void handleMidSessionRedirectInvalidation(snapshotTarget, reason);
      }
    });

    recorder.setSource(source, { targetUrl: targetDetail?.url || null });

    if (targetDetail?.sameOrigin && targetDetail?.captureAllowed !== false && iframe) {
      let initialLoadHandled = false;
      const onSameOriginIframeLoad = () => {
        let currentHref = '';
        try {
          currentHref = iframe.contentWindow?.location?.href || '';
        } catch {
          void handleMidSessionRedirectInvalidation(
            snapshotTarget,
            'Target redirected to a cross-origin URL during active session'
          );
          return;
        }

        if (!currentHref || currentHref === 'about:blank') return;

        if (!initialLoadHandled) {
          initialLoadHandled = true;
          if (recorder.state === 'RECORDING' || recorder.state === 'PAUSED') {
            const recheck = classifyTargetSelection(
              currentHref,
              currentHref,
              membrane.getRegistry(),
              typeof window !== 'undefined' ? window.location.href : 'http://localhost/'
            );
            if (!recheck.captureAllowed) {
              void handleMidSessionRedirectInvalidation(snapshotTarget, recheck.reason);
              return;
            }
          }
          return;
        }

        const recheck = classifyTargetSelection(
          currentHref,
          currentHref,
          membrane.getRegistry(),
          typeof window !== 'undefined' ? window.location.href : 'http://localhost/'
        );
        if (!recheck.captureAllowed) {
          void handleMidSessionRedirectInvalidation(
            snapshotTarget,
            recheck.reason || 'Target navigated to an unapproved URL during session'
          );
          return;
        }
        if (recorder.state === 'RECORDING' && recorder.source?.kind === 'same-origin') {
          recorder._bindSource(recorder.source, recorder._sourceEpoch);
        }
      };

      iframe.addEventListener('load', onSameOriginIframeLoad);
      sameOriginLoadCleanup = () => iframe.removeEventListener('load', onSameOriginIframeLoad);
    }
  }

  const membrane = createTargetMembrane({
    onTargetChange: (detail) => updateCaptureSource(detail)
  });

  function recoverTarget() {
    return activeToolbar ? activeToolbar.recoverToDefaultTarget() : membrane.recoverToDefault();
  }

  function selectTarget(url, cause = 'workflow-select') {
    if (activeToolbar) {
      activeToolbar.setTarget(url, cause);
      return membrane.getTarget();
    }
    return membrane.bindTarget(url, cause);
  }

  function selectDevicePreset(deviceId) {
    if (!deviceId) {
      stage.setViewportSize(100, 100, '%', 'Full (100%)', null, 'preset');
      activePresetsUI?.markActiveChip(null);
      return null;
    }
    const device = registry.getById(deviceId);
    if (!device) return null;
    if (activePresetsUI) {
      activePresetsUI.applyDevicePreset(device);
      return device;
    }
    const geom = stage.getGeometry();
    const isLandscape = geom.internalOrientation === 'horizontal';
    const w = isLandscape ? device.height : device.width;
    const h = isLandscape ? device.width : device.height;
    stage.setViewportSize(w, h, 'px', device.name, device.id, 'preset');
    return device;
  }

  function syncLabApi() {
    const api = installLabApi({ stage, membrane, registry, recorder, workflow: activeWorkflow });
    api.policy = {
      placeId: () => membrane.getPolicyPlaceId(),
      trace: () => membrane.getPolicyTrace(),
      clearTrace: () => membrane.clearPolicyTrace(),
      recover: () => recoverTarget()
    };
    return api;
  }

  syncLabApi();

  const disclosureCleanups = [];
  if (typeof document !== 'undefined') {
    for (const id of ['conformance-disclosure', 'mcard-result-disclosure']) {
      const el = document.getElementById(id);
      if (el) {
        const onDisclosureToggle = () => {
          if (el.open && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'nearest' });
          }
        };
        el.addEventListener('toggle', onDisclosureToggle);
        disclosureCleanups.push(() => el.removeEventListener('toggle', onDisclosureToggle));
      }
    }
  }

  function cancelBootRafs() {
    if (typeof cancelAnimationFrame !== 'function') return;
    if (outerRafId !== null) {
      cancelAnimationFrame(outerRafId);
      outerRafId = null;
    }
    if (innerRafId !== null) {
      cancelAnimationFrame(innerRafId);
      innerRafId = null;
    }
  }

  function markBootParticipant(name) {
    bootReadySet.add(name);
    if (bootFinished) return;
    if (!REQUIRED_BOOT_PARTICIPANTS.every((key) => bootReadySet.has(key))) return;
    bootFinished = true;
    syncLabApi();
    if (typeof requestAnimationFrame === 'function' && typeof document !== 'undefined') {
      outerRafId = requestAnimationFrame(() => {
        outerRafId = null;
        innerRafId = requestAnimationFrame(() => {
          innerRafId = null;
          document.body.classList.remove('lab-booting');
        });
      });
    } else if (typeof document !== 'undefined') {
      document.body?.classList.remove('lab-booting');
    }
  }

  function attachPresetsUI(ui) {
    activePresetsUI = ui;
    stage.rebind();
  }

  function detachPresetsUI(ui) {
    if (activePresetsUI === ui) {
      activePresetsUI = null;
    }
  }

  function attachToolbar(toolbar) {
    activeToolbar = toolbar;
  }

  function detachToolbar(toolbar) {
    if (activeToolbar === toolbar) {
      activeToolbar = null;
    }
  }

  function attachCaptureRibbon(ribbon) {
    activeRibbon = ribbon;
    if (stageAttached && !recorder.source) {
      const current = membrane.getTarget();
      if (current) {
        updateCaptureSource(current);
      }
    }
  }

  function detachCaptureRibbon(ribbon) {
    if (activeRibbon === ribbon) {
      activeRibbon = null;
      clearSameOriginLoadGuard();
      recorder.setSource(null);
    }
  }

  function attachWorkflow(workflow) {
    activeWorkflow = workflow;
    syncLabApi();
  }

  function detachWorkflow(workflow) {
    if (activeWorkflow === workflow) {
      activeWorkflow = null;
      syncLabApi();
    }
  }

  function attachStageSurface(iframeEl) {
    stageAttached = true;
    stage.rebind();
    membrane.setIframe(iframeEl);
    activeToolbar?.updateSiteSelection();
    activeWorkflow?.syncTargetDom?.();
    stage.applyGeometry('boot');
    syncLabApi();
  }

  function detachStageSurface() {
    stageAttached = false;
    clearSameOriginLoadGuard();
    recorder.setSource(null);
    stage.destroy();
    membrane.destroy();
  }

  function destroy() {
    cancelBootRafs();
    clearSameOriginLoadGuard();
    while (disclosureCleanups.length > 0) {
      const cleanup = disclosureCleanups.pop();
      try {
        cleanup();
      } catch {}
    }
    stageAttached = false;
    activeWorkflow?.destroy?.();
    stage.destroy();
    membrane.destroy();
    recorder.destroy();
    activePresetsUI = null;
    activeToolbar = null;
    activeRibbon = null;
    activeWorkflow = null;
  }

  return {
    registry,
    stage,
    membrane,
    recorder,
    getActiveDevice,
    getFidelity,
    selectTarget,
    recoverTarget,
    selectDevicePreset,
    updateCaptureSource,
    markBootParticipant,
    attachPresetsUI,
    detachPresetsUI,
    attachToolbar,
    detachToolbar,
    attachCaptureRibbon,
    detachCaptureRibbon,
    attachWorkflow,
    detachWorkflow,
    attachStageSurface,
    detachStageSurface,
    destroy
  };
}

export function getLabRuntime() {
  if (!singletonRuntime) {
    singletonRuntime = createLabRuntimeInstance();
  }
  return singletonRuntime;
}

export function destroyLabRuntime() {
  if (singletonRuntime) {
    singletonRuntime.destroy();
    singletonRuntime = null;
  }
}
