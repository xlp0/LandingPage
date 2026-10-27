import { DeviceRegistry } from '../device-registry.js';
import { createViewportStage } from './viewport-stage.js';
import { createTargetMembrane } from './target-membrane.js';
import { installLabApi } from './lab-api.js';
import { createCaptureSource } from './membrane-interceptor.js';
import { InteractionRecorder } from './recorder.js';
import { resolveFidelity } from './fidelity.js';

const REQUIRED_BOOT_PARTICIPANTS = ['stage', 'toolbar', 'presets', 'ribbon'];
let singletonRuntime = null;

function createLabRuntimeInstance() {
  const registry = new DeviceRegistry();
  const recorder = new InteractionRecorder();
  const bootReadySet = new Set();
  let bootFinished = false;
  let outerRafId = null;
  let innerRafId = null;
  let activePresetsUI = null;
  let activeToolbar = null;

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

  function updateCaptureSource(targetDetail) {
    const iframe = typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null;
    const source = createCaptureSource(targetDetail, {
      iframe,
      getDeviceProfile: getActiveDevice,
      getViewport: () => stage.getGeometry()
    });
    recorder.setSource(source);
  }

  const membrane = createTargetMembrane({
    onTargetChange: (detail) => updateCaptureSource(detail)
  });

  installLabApi({ stage, membrane, registry, recorder });

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
    installLabApi({ stage, membrane, registry, recorder });
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

  function attachStageSurface(iframeEl) {
    stage.rebind();
    membrane.setIframe(iframeEl);
    activeToolbar?.updateSiteSelection();
    stage.applyGeometry('boot');
    installLabApi({ stage, membrane, registry, recorder });
  }

  function detachStageSurface() {
    recorder.setSource(null);
    stage.destroy();
    membrane.destroy();
  }

  function destroy() {
    cancelBootRafs();
    while (disclosureCleanups.length > 0) {
      const cleanup = disclosureCleanups.pop();
      try {
        cleanup();
      } catch {}
    }
    stage.destroy();
    membrane.destroy();
    recorder.destroy();
    activePresetsUI = null;
    activeToolbar = null;
  }

  return {
    registry,
    stage,
    membrane,
    recorder,
    getActiveDevice,
    getFidelity,
    updateCaptureSource,
    markBootParticipant,
    attachPresetsUI,
    detachPresetsUI,
    attachToolbar,
    detachToolbar,
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
