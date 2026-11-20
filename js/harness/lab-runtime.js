import { DeviceRegistry } from '../device-registry.js';
import { createViewportStage } from './viewport-stage.js';
import { createTargetMembrane, classifyTargetSelection } from './target-membrane.js';
import { installLabApi } from './lab-api.js';
import { createCaptureSource } from './membrane-interceptor.js';
import { InteractionRecorder } from './recorder.js';
import { resolveFidelity } from './fidelity.js';
import { createBombadilClient } from './bombadil-client.js';

const REQUIRED_BOOT_PARTICIPANTS = ['stage', 'toolbar', 'presets', 'ribbon', 'workflow'];
const WORKBENCH_MODES = ['explore', 'guided-spa', 'bombadil', 'verify'];
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
        reg.unregister().catch(() => { });
      }
    })
    .catch(() => { });
}

function createLabRuntimeInstance() {
  unregisterLocalServiceWorkers();

  const registry = new DeviceRegistry();
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
    registry,
    onPresetDeactivate: () => activePresetsUI?.markActiveChip(null)
  });

  const recorder = new InteractionRecorder({
    measureFullStage: () => {
      const geom = stage.getGeometry();
      return { width: geom.measuredWidth, height: geom.measuredHeight };
    }
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
      } catch { }
      sameOriginLoadCleanup = null;
    }
  }

  async function handleMidSessionRedirectInvalidation(preRedirectTarget, reason) {
    const priorState = recorder.state;
    const wasActive = priorState === 'RECORDING' || priorState === 'PAUSED';
    recorder.invalidateActiveCapture(reason);
    membrane.notifyProbeHandshakeOutcome('unavailable', reason);
    if (wasActive && preRedirectTarget?.url) {
      await recorder.saveInterruptedCapture({
        target: preRedirectTarget,
        reason,
        lifecycleState: priorState
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
      stage.selectFullViewport('preset');
      activePresetsUI?.markActiveChip('full');
      return null;
    }
    const device = registry.getById(deviceId);
    if (!device) return null;
    if (activePresetsUI) {
      activePresetsUI.applyDevicePreset(device);
      return device;
    }
    stage.selectDevicePreset(device, 'preset');
    return device;
  }

  const bombadil = createBombadilClient({ selectTarget });

  let workbenchMode = 'explore';
  let compactPane = 'stage';

  function isCompactViewport() {
    if (typeof window === 'undefined') return false;
    return Number(window.innerWidth) > 0 && Number(window.innerWidth) < 600;
  }

  function formatBombadilPillText(bState) {
    const status = bState?.status || 'idle';
    if (status === 'queued' || status === 'running') {
      return `Bombadil: Running ${bState.target || 'spa'} ${bState.actionsCount ?? 0}`;
    }
    if (status === 'violated') {
      const count = Array.isArray(bState.violations) ? bState.violations.length : 1;
      return `Bombadil: Violated ${count}`;
    }
    if (status === 'clean') {
      return `Bombadil: Clean (${bState.actionsCount ?? 0})`;
    }
    if (status === 'stopped') {
      return 'Bombadil: Stopped';
    }
    if (status === 'error') {
      return 'Bombadil: Error';
    }
    return 'Bombadil: Idle';
  }

  function syncBombadilChrome(bState = bombadil.status()) {
    if (typeof document === 'undefined') return;
    const status = bState?.status || 'idle';
    const pill = document.getElementById('bombadil-transport-pill');
    if (pill) {
      pill.textContent = formatBombadilPillText(bState);
      pill.dataset.status = status;
    }
    const verifyBombadil = document.getElementById('verify-summary-bombadil');
    if (verifyBombadil) {
      const place = bState?.currentPlaceId ? ` • ${bState.currentPlaceId}` : '';
      verifyBombadil.textContent = `${formatBombadilPillText(bState)}${place}`;
      verifyBombadil.dataset.status = status;
    }
  }

  function syncVerifySummary() {
    if (typeof document === 'undefined') return;
    const targetEl = document.getElementById('verify-summary-target');
    const deviceEl = document.getElementById('verify-summary-device');
    const target = membrane.getTarget();
    const geom = stage.getGeometry();
    if (targetEl) {
      targetEl.textContent = target?.raw || 'None';
    }
    if (deviceEl) {
      const dims = geom.unit === '%' ? '100% × 100%' : `${geom.width}×${geom.height}${geom.unit}`;
      const scalePct = `${Math.round((geom.scale ?? 1) * 100)}%`;
      deviceEl.textContent = `${geom.label || 'Full (100%)'} (${dims}, ${geom.orientation}, ${scalePct})`;
    }
    syncBombadilChrome();
  }

  function applyDockSlotVisibility(mode = workbenchMode) {
    if (typeof document === 'undefined') return;
    const dock = document.getElementById('workbench-controls-dock');
    if (dock) {
      dock.dataset.workbenchMode = mode;
    }

    const showTargetToolbar = mode === 'explore' || mode === 'guided-spa';
    const showPresets = mode === 'explore';
    const showWorkflow = mode === 'guided-spa';
    const showBombadil = mode === 'bombadil';
    const showVerify = mode === 'verify';
    const showDisclosures = mode === 'guided-spa' || mode === 'verify';
    const compactTarget = mode === 'guided-spa';

    const toggleHidden = (id, shouldHide) => {
      const el = document.getElementById(id);
      if (el) el.hidden = Boolean(shouldHide);
    };

    toggleHidden('target-toolbar-dock-slot', !showTargetToolbar);
    toggleHidden('device-presets-dock-slot', !showPresets);
    toggleHidden('spa-workflow-dock-slot', !showWorkflow);
    toggleHidden('bombadil-panel-shell', !showBombadil);
    toggleHidden('verify-summary-shell', !showVerify);
    toggleHidden('conformance-panel-group', !showDisclosures);
    toggleHidden('mcard-result-panel-group', !showDisclosures);

    toggleHidden('target-omnibar-header', compactTarget);
    toggleHidden('target-url-input-wrap', compactTarget);
    toggleHidden('target-quick-chips', compactTarget);

    if (showVerify) {
      syncVerifySummary();
    }
  }

  function syncModeTabsDom() {
    if (typeof document === 'undefined') return;
    const workspace = document.getElementById('lab-workspace-container');
    if (workspace) {
      workspace.dataset.compactPane = compactPane;
    }
    const activeTabMode = isCompactViewport() ? compactPane : workbenchMode;
    const tabs = document.querySelectorAll('#workbench-mode-tabs .workbench-mode-tab');
    tabs.forEach((btn) => {
      const active = btn.dataset.mode === activeTabMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.setAttribute('tabindex', active ? '0' : '-1');
    });
  }

  function setCompactPane(nextPane = 'stage') {
    const valid = nextPane === 'stage' || WORKBENCH_MODES.includes(nextPane);
    compactPane = valid ? nextPane : 'stage';
    if (WORKBENCH_MODES.includes(compactPane)) {
      return setWorkbenchMode(compactPane);
    }
    syncModeTabsDom();
    if (compactPane === 'stage') {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => stage.recomputeScale('compact-pane'));
      } else {
        stage.recomputeScale('compact-pane');
      }
    }
    if (typeof CustomEvent === 'function' && typeof document !== 'undefined') {
      document.dispatchEvent(
        new CustomEvent('lab:compact-pane-change', { detail: { pane: compactPane, mode: workbenchMode } })
      );
    }
    return compactPane;
  }

  function setWorkbenchMode(nextMode = 'explore', options = {}) {
    if (nextMode === 'stage') {
      return setCompactPane('stage');
    }
    const mode = WORKBENCH_MODES.includes(nextMode) ? nextMode : 'explore';
    workbenchMode = mode;
    if (!options.preserveCompactPane) {
      compactPane = mode;
    }

    if (typeof document !== 'undefined') {
      applyDockSlotVisibility(mode);
      syncModeTabsDom();

      if (typeof CustomEvent === 'function') {
        document.dispatchEvent(new CustomEvent('lab:workbench-mode-change', { detail: { mode, compactPane } }));
      }
    }
    return workbenchMode;
  }

  function getWorkbenchMode() {
    return workbenchMode;
  }

  function getCompactPane() {
    return compactPane;
  }

  function openSavedRunResult() {
    setWorkbenchMode('verify');
    if (typeof document === 'undefined') return;
    const disclosure = document.getElementById('mcard-result-disclosure');
    if (disclosure) {
      disclosure.open = true;
      if (typeof disclosure.scrollIntoView === 'function') {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            if (disclosure.open) disclosure.scrollIntoView({ block: 'nearest' });
          });
        } else {
          disclosure.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }

  function syncLabApi() {
    const api = installLabApi({
      stage,
      membrane,
      registry,
      recorder,
      workflow: activeWorkflow,
      bombadil,
      modeController: { get: getWorkbenchMode, set: setWorkbenchMode }
    });
    api.policy = {
      placeId: () => membrane.getPolicyPlaceId(),
      trace: () => membrane.getPolicyTrace(),
      clearTrace: () => membrane.clearPolicyTrace(),
      recover: () => recoverTarget()
    };
    return api;
  }

  syncLabApi();

  const runtimeCleanups = [];
  if (typeof document !== 'undefined') {
    for (const id of ['conformance-disclosure', 'mcard-result-disclosure']) {
      const el = document.getElementById(id);
      if (el) {
        const onDisclosureToggle = () => {
          if (el.open && typeof el.scrollIntoView === 'function') {
            if (typeof requestAnimationFrame === 'function') {
              requestAnimationFrame(() => {
                if (el.open) el.scrollIntoView({ block: 'nearest' });
              });
            } else {
              el.scrollIntoView({ block: 'nearest' });
            }
          }
        };
        el.addEventListener('toggle', onDisclosureToggle);
        runtimeCleanups.push(() => el.removeEventListener('toggle', onDisclosureToggle));
      }
    }

    const modeTabsContainer = document.getElementById('workbench-mode-tabs');
    if (modeTabsContainer) {
      const tabButtons = [...modeTabsContainer.querySelectorAll('.workbench-mode-tab')];
      for (const btn of tabButtons) {
        const onModeClick = () => {
          const targetMode = btn.dataset.mode;
          if (targetMode === 'stage') setCompactPane('stage');
          else if (targetMode) setWorkbenchMode(targetMode);
        };
        const onModeKeyDown = (ev) => {
          const visibleTabs = tabButtons.filter((candidate) => {
            if (typeof window === 'undefined') return true;
            return window.getComputedStyle(candidate).display !== 'none';
          });
          const currentIdx = visibleTabs.indexOf(btn);
          if (currentIdx === -1) return;
          let nextIdx = -1;
          if (ev.key === 'ArrowRight') nextIdx = (currentIdx + 1) % visibleTabs.length;
          else if (ev.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + visibleTabs.length) % visibleTabs.length;
          else if (ev.key === 'Home') nextIdx = 0;
          else if (ev.key === 'End') nextIdx = visibleTabs.length - 1;
          if (nextIdx >= 0) {
            ev.preventDefault();
            const targetBtn = visibleTabs[nextIdx];
            if (targetBtn.dataset.mode === 'stage') setCompactPane('stage');
            else setWorkbenchMode(targetBtn.dataset.mode);
            targetBtn.focus();
          }
        };
        btn.addEventListener('click', onModeClick);
        btn.addEventListener('keydown', onModeKeyDown);
        runtimeCleanups.push(() => {
          btn.removeEventListener('click', onModeClick);
          btn.removeEventListener('keydown', onModeKeyDown);
        });
      }
    }

    if (typeof window !== 'undefined') {
      const onWindowResize = () => syncModeTabsDom();
      window.addEventListener('resize', onWindowResize);
      runtimeCleanups.push(() => window.removeEventListener('resize', onWindowResize));
    }

    const bombadilPill = document.getElementById('bombadil-transport-pill');
    if (bombadilPill) {
      const onPillClick = () => setWorkbenchMode('bombadil');
      bombadilPill.addEventListener('click', onPillClick);
      runtimeCleanups.push(() => bombadilPill.removeEventListener('click', onPillClick));
    }

    const unsubBombadil = bombadil.subscribe((ev) => syncBombadilChrome(ev));
    runtimeCleanups.push(unsubBombadil);

    const onVerifySync = () => {
      if (workbenchMode === 'verify') syncVerifySummary();
    };
    document.addEventListener('lab:viewport-change', onVerifySync);
    document.addEventListener('lab:target-change', onVerifySync);
    runtimeCleanups.push(() => {
      document.removeEventListener('lab:viewport-change', onVerifySync);
      document.removeEventListener('lab:target-change', onVerifySync);
    });

    setWorkbenchMode('explore', { preserveCompactPane: true });
    syncBombadilChrome();
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
          document.body.dataset.pageState = 'ready';
        });
      });
    } else if (typeof document !== 'undefined') {
      if (document.body) document.body.dataset.pageState = 'ready';
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
    while (runtimeCleanups.length > 0) {
      const cleanup = runtimeCleanups.pop();
      try {
        cleanup();
      } catch { }
    }
    stageAttached = false;
    activeWorkflow?.destroy?.();
    bombadil.destroy();
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
    bombadil,
    getActiveDevice,
    getFidelity,
    selectTarget,
    recoverTarget,
    selectDevicePreset,
    getWorkbenchMode,
    setWorkbenchMode,
    getCompactPane,
    setCompactPane,
    openSavedRunResult,
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
