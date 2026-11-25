/**
 * Viewport Stage Controller (DOM & CSS Variables)
 * Manages stage scaling, orientation classes, layout containment, and emits `lab:viewport-change`.
 */

import {
  DIM_MIN,
  aspectRatio,
  formatDimension,
  createFullSelection,
  selectDevicePreset as selectPresetDomain,
  applyCustomViewport,
  rotateViewportSelection,
  setSelectionOrientation,
  resolveViewportMetrics
} from './viewport-geometry.js';
import { stageRefusals } from './refusal-reasons.js';

export function createViewportStage(options = {}) {
  const onPresetDeactivate = options.onPresetDeactivate || null;
  const externalRegistry = options.registry || null;
  const cachedDevices = new Map();

  function pickEl(key, id, fallback = null) {
    if (Object.prototype.hasOwnProperty.call(options, key)) {
      return options[key];
    }
    if (typeof document === 'undefined') return fallback;
    return document.getElementById(id) || fallback;
  }

  function currentElements() {
    return {
      frame: pickEl('frame', 'controlled-panel-frame'),
      wrapper: pickEl('wrapper', 'viewport-scale-wrapper'),
      targetPlaceLabel: pickEl('targetPlaceLabel', 'stage-target-place'),
      well: pickEl('well', 'stage-well'),
      windowBar: pickEl('windowBar', 'stage-window-bar'),
      windowTitle: pickEl('windowTitle', 'stage-window-title'),
      screenSlot: pickEl('screenSlot', 'stage-screen-slot'),
      safeAreaOverlay: pickEl('safeAreaOverlay', 'stage-safe-area-overlay'),
      safeAreaToggleBtn: pickEl('safeAreaToggleBtn', 'btn-safe-area-toggle'),
      container: pickEl('container', 'lab-stage-container', typeof document !== 'undefined' ? document.body : null),
      workspace: pickEl('workspace', 'lab-workspace-container'),
      dimLabel: pickEl('dimLabel', 'controlled-frame-dim'),
      statusLabel: Object.prototype.hasOwnProperty.call(options, 'statusLabel')
        ? options.statusLabel
        : (typeof document !== 'undefined' ? (document.getElementById('controlled-panel-status') || document.getElementById('controlled-status')) : null),
      scaleToggleBtn: pickEl('scaleToggleBtn', 'btn-scale-toggle'),
      customWidthInput: pickEl('customWidthInput', 'controlled-width-input'),
      customHeightInput: pickEl('customHeightInput', 'controlled-height-input'),
      applyCustomDimBtn: pickEl('applyCustomDimBtn', 'btn-apply-custom-dim'),
      rotateBtn: pickEl('rotateBtn', 'btn-rotate-viewport'),
      btnOrientVertical: pickEl('btnOrientVertical', 'btn-orient-vertical'),
      btnOrientHorizontal: pickEl('btnOrientHorizontal', 'btn-orient-horizontal'),
      btnArrangeVertical: pickEl('btnArrangeVertical', 'btn-arrange-vertical'),
      btnArrangeHorizontal: pickEl('btnArrangeHorizontal', 'btn-arrange-horizontal')
    };
  }

  const deviceLookup = {
    getById(id) {
      return externalRegistry?.getById?.(id) || cachedDevices.get(id) || null;
    }
  };

  let selection = createFullSelection();
  let scaleMode = 'auto';
  let safeAreaVisible = false;
  let currentScale = 1;
  let arrangementPreference = 'auto';
  let currentArrangement = 'horizontal';
  let lastPositiveContainerRect = null;
  let lastResponsiveTier = 'desktop';
  let cleanupFns = [];

  function resolveViewportWidth() {
    if (typeof window !== 'undefined' && Number.isFinite(window.innerWidth) && window.innerWidth > 0) {
      return window.innerWidth;
    }
    if (typeof document !== 'undefined' && document.documentElement?.clientWidth > 0) {
      return document.documentElement.clientWidth;
    }
    return 1280;
  }

  function resolveResponsiveTier(vw = resolveViewportWidth()) {
    if (vw < 600) return 'compact';
    if (vw < 1280) return 'tablet';
    return 'desktop';
  }

  function resolveEffectiveArrangement(vw = resolveViewportWidth()) {
    if (vw < 600) return 'vertical';
    if (arrangementPreference === 'horizontal' || arrangementPreference === 'vertical') {
      return arrangementPreference;
    }
    return vw >= 1280 ? 'horizontal' : 'vertical';
  }

  function measureContainerRect() {
    const { frame, well, container } = currentElements();
    const target = well || frame?.closest?.('.stage-well') || frame?.closest?.('.lab-stage-container') || container;
    if (!target) {
      return lastPositiveContainerRect ? { ...lastPositiveContainerRect } : { width: 0, height: 0 };
    }
    let padX = 0;
    let padY = 0;
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const cs = window.getComputedStyle(target);
      padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    }
    const width = Math.max(0, (target.clientWidth || 0) - padX);
    const height = Math.max(0, (target.clientHeight || 0) - padY);
    if (width > 0 && height > 0) {
      lastPositiveContainerRect = { width, height };
      return { width, height };
    }
    if (lastPositiveContainerRect) {
      return { ...lastPositiveContainerRect };
    }
    return { width, height };
  }

  function resolveCurrentMetrics() {
    return resolveViewportMetrics(selection, deviceLookup, measureContainerRect(), scaleMode);
  }

  function hasDeviceSafeArea(metrics) {
    const insets = metrics?.safeAreaInsets;
    if (!insets) return false;
    return (insets.top || 0) > 0 || (insets.right || 0) > 0 || (insets.bottom || 0) > 0 || (insets.left || 0) > 0;
  }

  function toPublicGeometry(metrics) {
    return {
      kind: metrics.kind,
      selectionKey: metrics.selectionKey,
      width: metrics.width,
      height: metrics.height,
      outerWidth: metrics.outerWidth,
      outerHeight: metrics.outerHeight,
      measuredWidth: metrics.measuredWidth,
      measuredHeight: metrics.measuredHeight,
      unit: metrics.unit,
      orientation: metrics.orientation,
      rotatable: metrics.rotatable,
      scale: metrics.scale,
      scaleMode,
      deviceId: metrics.deviceId,
      label: metrics.label,
      frameStyle: metrics.frameStyle,
      chromeInsets: metrics.chromeInsets,
      safeAreaInsets: metrics.safeAreaInsets,
      safeAreaVisible: hasDeviceSafeArea(metrics) && safeAreaVisible
    };
  }

  function getSelection() {
    return { ...selection };
  }

  function getGeometry() {
    const metrics = resolveCurrentMetrics();
    currentScale = metrics.scale;
    return toPublicGeometry(metrics);
  }

  function emitViewportChange(cause = 'custom', metrics = resolveCurrentMetrics()) {
    const detail = {
      ...toPublicGeometry(metrics),
      cause
    };
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('lab:viewport-change', { detail }));
    }
  }

  function syncStageCssVars(metrics, frame, wrapper) {
    const isPct = metrics.unit === '%';
    const innerW = isPct ? '100%' : `${metrics.width}px`;
    const innerH = isPct ? '100%' : `${metrics.height}px`;
    const outerW = isPct ? '100%' : `${metrics.outerWidth}px`;
    const outerH = isPct ? '100%' : `${metrics.outerHeight}px`;
    const targetW = formatDimension(metrics.width, metrics.unit);
    const targetH = formatDimension(metrics.height, metrics.unit);
    const scaleStr = String(metrics.scale);

    for (const el of [frame, wrapper]) {
      if (!el?.style) continue;
      el.style.setProperty('--frame-inner-width', innerW);
      el.style.setProperty('--frame-inner-height', innerH);
      el.style.setProperty('--frame-outer-width', outerW);
      el.style.setProperty('--frame-outer-height', outerH);
      el.style.setProperty('--frame-target-width', targetW);
      el.style.setProperty('--frame-target-height', targetH);
      el.style.setProperty('--frame-scale-factor', scaleStr);
    }
  }

  function syncOrientationControls(metrics) {
    const {
      frame,
      wrapper,
      windowTitle,
      safeAreaOverlay,
      safeAreaToggleBtn,
      scaleToggleBtn,
      rotateBtn,
      btnOrientVertical,
      btnOrientHorizontal
    } = currentElements();
    const rotatable = Boolean(metrics.rotatable);
    const isPortrait = metrics.orientation === 'portrait';
    const isLandscape = metrics.orientation === 'landscape';
    const hasSafeArea = hasDeviceSafeArea(metrics);
    const effectiveSafeArea = hasSafeArea && safeAreaVisible;
    const safeInsets = metrics.safeAreaInsets || { top: 0, right: 0, bottom: 0, left: 0 };

    if (frame) {
      frame.dataset.orientation = metrics.orientation;
      frame.dataset.frameStyle = metrics.frameStyle;
      frame.dataset.unit = metrics.unit;
      frame.dataset.deviceId = metrics.deviceId || '';
      frame.dataset.safeArea = effectiveSafeArea ? 'on' : 'off';
      frame.dataset.innerWidth = String(metrics.width);
      frame.dataset.innerHeight = String(metrics.height);
      frame.dataset.outerScale = String(metrics.scale);
      frame.style.setProperty('--safe-inset-top', `${safeInsets.top}px`);
      frame.style.setProperty('--safe-inset-right', `${safeInsets.right}px`);
      frame.style.setProperty('--safe-inset-bottom', `${safeInsets.bottom}px`);
      frame.style.setProperty('--safe-inset-left', `${safeInsets.left}px`);
      frame.classList.toggle('orientation-horizontal', isLandscape);
      frame.classList.toggle('orientation-vertical', isPortrait);
    }

    if (wrapper) {
      wrapper.dataset.unit = metrics.unit;
      wrapper.dataset.scaleMode = scaleMode;
      wrapper.dataset.frameStyle = metrics.frameStyle;
    }

    if (windowTitle) {
      if (metrics.kind === 'preset') {
        windowTitle.textContent = `${metrics.label} — ${metrics.width}×${metrics.height}`;
      } else if (metrics.kind === 'custom') {
        windowTitle.textContent = `${metrics.width} × ${metrics.height}px (${aspectRatio(metrics.width, metrics.height)})`;
      } else {
        windowTitle.textContent = 'Responsive Iframe Surface';
      }
    }

    if (safeAreaOverlay) {
      safeAreaOverlay.hidden = !effectiveSafeArea;
    }

    if (safeAreaToggleBtn) {
      safeAreaToggleBtn.disabled = !hasSafeArea;
      safeAreaToggleBtn.setAttribute('aria-disabled', String(!hasSafeArea));
      safeAreaToggleBtn.setAttribute('aria-pressed', String(effectiveSafeArea));
      safeAreaToggleBtn.classList.toggle('active', effectiveSafeArea);
      safeAreaToggleBtn.textContent = effectiveSafeArea ? 'Safe-area: On' : 'Safe-area: Off';
    }

    if (scaleToggleBtn) {
      const isActual = scaleMode === 'actual';
      scaleToggleBtn.textContent = isActual ? 'Scale: Actual (1:1)' : 'Scale: Fit';
      scaleToggleBtn.setAttribute('aria-pressed', String(isActual));
      scaleToggleBtn.classList.toggle('active', isActual);
    }

    for (const btn of [rotateBtn, btnOrientVertical, btnOrientHorizontal]) {
      if (!btn) continue;
      btn.disabled = !rotatable;
      btn.setAttribute('aria-disabled', String(!rotatable));
    }

    btnOrientHorizontal?.classList.toggle('active', rotatable && isLandscape);
    btnOrientVertical?.classList.toggle('active', rotatable && isPortrait);
    btnOrientHorizontal?.setAttribute('aria-pressed', String(rotatable && isLandscape));
    btnOrientVertical?.setAttribute('aria-pressed', String(rotatable && isPortrait));

    const refusals = stageRefusals({ kind: metrics.kind, rotatable, hasSafeArea });
    const refusedControlIds = new Set(refusals.flatMap((entry) => entry.controls));
    const stageButtonsById = [
      ['btn-rotate-viewport', rotateBtn],
      ['btn-orient-vertical', btnOrientVertical],
      ['btn-orient-horizontal', btnOrientHorizontal],
      ['btn-safe-area-toggle', safeAreaToggleBtn]
    ];
    for (const [id, btn] of stageButtonsById) {
      if (!btn) continue;
      if (refusedControlIds.has(id)) {
        btn.setAttribute('aria-describedby', 'stage-refusal-hint');
      } else {
        btn.removeAttribute('aria-describedby');
      }
    }
    const refusalHintEl = typeof document !== 'undefined' ? document.getElementById('stage-refusal-hint') : null;
    if (refusalHintEl) {
      const text = refusals.map((entry) => entry.sentence).join(' ');
      refusalHintEl.textContent = text;
      refusalHintEl.hidden = refusals.length === 0;
    }
  }

  function orientationDisplayText(orientation) {
    switch (orientation) {
      case 'portrait':
        return 'Portrait';
      case 'landscape':
        return 'Landscape';
      case 'square':
        return 'Square';
      case 'responsive':
      default:
        return 'Responsive';
    }
  }

  function updateLabels(metrics = resolveCurrentMetrics()) {
    const { dimLabel, statusLabel } = currentElements();
    const orientText = orientationDisplayText(metrics.orientation);
    const arrangeLabel = currentArrangement === 'horizontal' ? 'Side-by-Side Dock' : 'Stacked Topbar';
    const dims = `${formatDimension(metrics.width, metrics.unit)} × ${formatDimension(metrics.height, metrics.unit)}`;
    const ratio = metrics.unit === 'px'
      ? ` (${aspectRatio(metrics.width, metrics.height)})`
      : (metrics.measuredWidth > 0 && metrics.measuredHeight > 0
        ? ` (${metrics.measuredWidth}×${metrics.measuredHeight}px)`
        : '');
    const scaleNote = currentScale < 1 ? ` • ${Math.round(currentScale * 100)}% Scale` : ' • 100% Scale';

    if (dimLabel) {
      dimLabel.textContent = `${dims}${ratio} • ${orientText}${scaleNote}`;
    }
    if (statusLabel) {
      const name = metrics.label ? `${metrics.label} • ` : '';
      statusLabel.textContent = `Viewport: ${name}${dims}${ratio}${scaleNote} • ${orientText} • [${arrangeLabel}]`;
    }
  }

  function syncDimensionInputs(metrics, allowFocusedOverwrite = false) {
    const { customWidthInput, customHeightInput } = currentElements();
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;

    if (metrics.unit === 'px') {
      if (customWidthInput && (allowFocusedOverwrite || activeEl !== customWidthInput)) {
        customWidthInput.value = metrics.width;
      }
      if (customHeightInput && (allowFocusedOverwrite || activeEl !== customHeightInput)) {
        customHeightInput.value = metrics.height;
      }
    } else if (metrics.kind === 'full' && metrics.measuredWidth >= DIM_MIN && metrics.measuredHeight >= DIM_MIN) {
      if (customWidthInput && activeEl !== customWidthInput) {
        customWidthInput.value = metrics.measuredWidth;
      }
      if (customHeightInput && activeEl !== customHeightInput) {
        customHeightInput.value = metrics.measuredHeight;
      }
    }
  }

  function applyGeometry(cause = 'custom') {
    const { frame, wrapper } = currentElements();
    const metrics = resolveCurrentMetrics();
    currentScale = metrics.scale;

    if (!frame) {
      syncOrientationControls(metrics);
      updateLabels(metrics);
      emitViewportChange(cause, metrics);
      return metrics;
    }

    syncStageCssVars(metrics, frame, wrapper);
    syncOrientationControls(metrics);
    syncDimensionInputs(metrics, metrics.unit === 'px' && cause !== 'resize');
    recomputeScale(cause);
    return metrics;
  }

  function recomputeScale(cause = 'resize') {
    const { frame, wrapper } = currentElements();
    const metrics = resolveCurrentMetrics();
    currentScale = metrics.scale;

    if (!frame || !wrapper) return currentScale;

    syncStageCssVars(metrics, frame, wrapper);
    syncOrientationControls(metrics);
    if (metrics.kind === 'full' && cause === 'resize') {
      syncDimensionInputs(metrics, false);
    }
    updateLabels(metrics);
    emitViewportChange(cause, metrics);
    return currentScale;
  }

  function selectFullViewport(cause = 'preset') {
    selection = createFullSelection();
    applyGeometry(cause);
  }

  function selectDevicePreset(deviceOrId, cause = 'preset') {
    if (!deviceOrId) {
      selectFullViewport(cause);
      return;
    }
    const dev = typeof deviceOrId === 'object' ? deviceOrId : deviceLookup.getById(deviceOrId);
    if (!dev) {
      selectFullViewport(cause);
      return;
    }
    cachedDevices.set(dev.id, dev);
    selection = selectPresetDomain(dev);
    applyGeometry(cause);
  }

  function setViewportSize(width, height, unit = 'px', label = '', deviceId = null, cause = 'custom') {
    if (unit === '%') {
      selectFullViewport(cause);
      return;
    }
    if (deviceId) {
      const dev = deviceLookup.getById(deviceId);
      if (dev) {
        selection = {
          kind: 'preset',
          deviceId: dev.id,
          orientation: width > height ? 'landscape' : 'portrait'
        };
        applyGeometry(cause);
        return;
      }
    }
    selection = applyCustomViewport(width, height, label);
    applyGeometry(cause);
  }

  function setOrientation(orientation, cause = 'rotate') {
    const target = orientation === 'landscape' ? 'landscape' : orientation === 'portrait' ? 'portrait' : null;
    if (!target) return;
    const nextSelection = setSelectionOrientation(selection, target, deviceLookup);
    if (
      nextSelection.kind === selection.kind &&
      nextSelection.orientation === selection.orientation &&
      nextSelection.width === selection.width &&
      nextSelection.height === selection.height
    ) {
      return;
    }
    selection = nextSelection;
    applyGeometry(cause);
  }

  function rotateStageViewport(cause = 'rotate') {
    const nextSelection = rotateViewportSelection(selection, deviceLookup);
    if (
      nextSelection.kind === selection.kind &&
      nextSelection.orientation === selection.orientation &&
      nextSelection.width === selection.width &&
      nextSelection.height === selection.height
    ) {
      return;
    }
    selection = nextSelection;
    applyGeometry(cause);
  }

  function setScaleMode(mode) {
    scaleMode = mode === 'actual' ? 'actual' : 'auto';
    recomputeScale('scale-mode');
  }

  function toggleScaleMode() {
    setScaleMode(scaleMode === 'auto' ? 'actual' : 'auto');
  }

  function setSafeAreaVisible(visible) {
    safeAreaVisible = Boolean(visible);
    const metrics = resolveCurrentMetrics();
    syncOrientationControls(metrics);
    emitViewportChange('safe-area', metrics);
  }

  function toggleSafeArea() {
    const metrics = resolveCurrentMetrics();
    if (!hasDeviceSafeArea(metrics)) return;
    setSafeAreaVisible(!safeAreaVisible);
  }

  function applyEffectiveArrangement({ emit = true } = {}) {
    const { workspace, btnArrangeHorizontal, btnArrangeVertical } = currentElements();
    const vw = resolveViewportWidth();
    const tier = resolveResponsiveTier(vw);
    const nextArrangement = resolveEffectiveArrangement(vw);
    const changed = nextArrangement !== currentArrangement || tier !== lastResponsiveTier;
    currentArrangement = nextArrangement;
    lastResponsiveTier = tier;
    const horizontal = currentArrangement === 'horizontal';

    if (workspace) {
      workspace.classList.toggle('arrangement-horizontal', horizontal);
      workspace.classList.toggle('arrangement-vertical', !horizontal);
      workspace.dataset.arrangementPreference = arrangementPreference;
      workspace.dataset.effectiveArrangement = currentArrangement;
      workspace.dataset.responsiveTier = tier;
    }

    btnArrangeHorizontal?.classList.toggle('active', horizontal);
    btnArrangeVertical?.classList.toggle('active', !horizontal);
    btnArrangeHorizontal?.setAttribute('aria-pressed', String(horizontal));
    btnArrangeVertical?.setAttribute('aria-pressed', String(!horizontal));

    if (emit) {
      recomputeScale('arrangement');
    }
    return changed;
  }

  function setArrangement(arrangement) {
    if (arrangement === 'auto') {
      arrangementPreference = 'auto';
    } else if (arrangement === 'vertical') {
      arrangementPreference = 'vertical';
    } else {
      arrangementPreference = 'horizontal';
    }
    applyEffectiveArrangement({ emit: true });
  }

  function getArrangement() {
    const vw = resolveViewportWidth();
    return {
      preference: arrangementPreference,
      effective: resolveEffectiveArrangement(vw),
      tier: resolveResponsiveTier(vw)
    };
  }

  function applyCustomDimensions() {
    const { customWidthInput, customHeightInput } = currentElements();
    const currentMetrics = resolveCurrentMetrics();
    const fallbackW = currentMetrics.unit === 'px' ? currentMetrics.width : (currentMetrics.measuredWidth >= DIM_MIN ? currentMetrics.measuredWidth : 390);
    const fallbackH = currentMetrics.unit === 'px' ? currentMetrics.height : (currentMetrics.measuredHeight >= DIM_MIN ? currentMetrics.measuredHeight : 852);
    selection = applyCustomViewport(
      clampValue(customWidthInput?.value, fallbackW),
      clampValue(customHeightInput?.value, fallbackH)
    );
    applyGeometry('custom');
    if (typeof onPresetDeactivate === 'function') {
      onPresetDeactivate();
    }
  }

  function clampValue(raw, fallback) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return fallback;
    return Number(trimmed);
  }

  // Decision BPV-D08: the stage root mirrors the framed target's place, so users see the
  // target state and checks can read it from the top document. `null` clears the mirror.
  function setTargetPlace(observation) {
    const { wrapper, targetPlaceLabel } = currentElements();
    const placeId = observation?.placeId ? String(observation.placeId) : '';
    const bootNonce = observation?.bootNonce ? String(observation.bootNonce) : '';
    if (wrapper) {
      if (placeId) {
        wrapper.dataset.targetPlaceId = placeId;
        if (bootNonce) wrapper.dataset.targetBootNonce = bootNonce;
        else delete wrapper.dataset.targetBootNonce;
      } else {
        delete wrapper.dataset.targetPlaceId;
        delete wrapper.dataset.targetBootNonce;
      }
    }
    if (targetPlaceLabel) {
      targetPlaceLabel.textContent = placeId ? `Target place: ${placeId}` : '';
      targetPlaceLabel.hidden = !placeId;
    }
  }

  function listen(target, eventName, handler) {
    if (!target) return;
    target.addEventListener(eventName, handler);
    cleanupFns.push(() => target.removeEventListener(eventName, handler));
  }

  function destroy() {
    for (const cleanup of cleanupFns) {
      try {
        cleanup();
      } catch { }
    }
    cleanupFns = [];
  }

  function rebind() {
    destroy();
    const els = currentElements();

    listen(els.btnArrangeVertical, 'click', () => setArrangement('vertical'));
    listen(els.btnArrangeHorizontal, 'click', () => setArrangement('horizontal'));

    listen(els.btnOrientVertical, 'click', () => setOrientation('portrait', 'rotate'));
    listen(els.btnOrientHorizontal, 'click', () => setOrientation('landscape', 'rotate'));
    listen(els.rotateBtn, 'click', () => rotateStageViewport('rotate'));
    listen(els.scaleToggleBtn, 'click', () => toggleScaleMode());
    listen(els.safeAreaToggleBtn, 'click', () => toggleSafeArea());

    listen(els.applyCustomDimBtn, 'click', applyCustomDimensions);
    for (const el of [els.customWidthInput, els.customHeightInput]) {
      listen(el, 'keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyCustomDimensions();
        }
      });
    }

    if (typeof window !== 'undefined') {
      const observeTarget = els.well || els.frame?.closest?.('.stage-well') || els.container;
      if (window.ResizeObserver && observeTarget) {
        const ro = new ResizeObserver(() => {
          const changed = applyEffectiveArrangement({ emit: false });
          recomputeScale(changed ? 'arrangement' : 'resize');
        });
        ro.observe(observeTarget);
        cleanupFns.push(() => ro.disconnect());
      }
      listen(window, 'resize', () => {
        const changed = applyEffectiveArrangement({ emit: false });
        if (changed || !window.ResizeObserver || !observeTarget) {
          recomputeScale(changed ? 'arrangement' : 'resize');
        }
      });
    }

    applyEffectiveArrangement({ emit: false });

    const initialMetrics = resolveCurrentMetrics();
    syncStageCssVars(initialMetrics, els.frame, els.wrapper);
    syncOrientationControls(initialMetrics);
    updateLabels(initialMetrics);
  }

  rebind();

  return {
    getGeometry,
    getSelection,
    selectFullViewport,
    selectDevicePreset,
    setViewportSize,
    setOrientation,
    rotate: rotateStageViewport,
    rotateStageViewport,
    setScaleMode,
    toggleScaleMode,
    setSafeAreaVisible,
    toggleSafeArea,
    getArrangement,
    setArrangement,
    recomputeScale,
    applyGeometry,
    applyCustomDimensions,
    emitViewportChange,
    setTargetPlace,
    rebind,
    destroy
  };
}
