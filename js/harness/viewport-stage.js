/**
 * Viewport Stage Controller (DOM & CSS Variables)
 * Manages stage scaling, orientation classes, layout containment, and emits `lab:viewport-change`.
 */

import {
  DIM_MIN,
  DIM_MAX,
  clampDimension,
  aspectRatio,
  formatDimension,
  deriveOrientation,
  computeScale
} from './viewport-geometry.js';

export function createViewportStage(options = {}) {
  const onPresetDeactivate = options.onPresetDeactivate || null;

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
      btnArrangeHorizontal: pickEl('btnArrangeHorizontal', 'btn-arrange-horizontal'),
      btnArrangeVerticalDock: pickEl('btnArrangeVerticalDock', 'btn-arrange-vertical-dock'),
      btnArrangeHorizontalDock: pickEl('btnArrangeHorizontalDock', 'btn-arrange-horizontal-dock')
    };
  }

  let viewport = {
    width: 100,
    height: 100,
    unit: '%',
    orientation: 'horizontal',
    label: 'Full (100%)',
    deviceId: null
  };
  let scaleMode = 'auto';
  let currentScale = 1;
  let currentArrangement = 'horizontal';
  let cleanupFns = [];

  function getGeometry() {
    return {
      width: viewport.width,
      height: viewport.height,
      unit: viewport.unit,
      orientation: deriveOrientation(viewport.width, viewport.height),
      internalOrientation: viewport.orientation,
      scale: currentScale,
      deviceId: viewport.deviceId
    };
  }

  function emitViewportChange(cause = 'custom') {
    const detail = {
      ...getGeometry(),
      cause
    };
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('lab:viewport-change', { detail }));
    }
  }

  function applyGeometry(cause = 'custom') {
    const { frame, wrapper, customWidthInput, customHeightInput } = currentElements();
    if (!frame) return;
    const w = formatDimension(viewport.width, viewport.unit);
    const h = formatDimension(viewport.height, viewport.unit);

    frame.style.setProperty('--frame-target-width', w);
    frame.style.setProperty('--frame-target-height', h);
    if (wrapper) {
      wrapper.style.setProperty('--frame-target-width', w);
      wrapper.style.setProperty('--frame-target-height', h);
    }

    if (customWidthInput && viewport.unit === 'px') customWidthInput.value = viewport.width;
    if (customHeightInput && viewport.unit === 'px') customHeightInput.value = viewport.height;

    recomputeScale(cause);
    updateLabels();
  }

  function recomputeScale(cause = 'resize') {
    const { frame, wrapper, container, scaleToggleBtn } = currentElements();
    if (!frame || !wrapper) return 1;
    const stage = frame.closest('.lab-stage-container') || container;
    const availW = stage?.clientWidth || 0;
    const availH = stage?.clientHeight || 0;

    const s = computeScale(availW, availH, viewport.width, viewport.height, viewport.unit, scaleMode);
    currentScale = s;

    frame.style.setProperty('--frame-scale-factor', String(s));
    wrapper.style.setProperty('--frame-scale-factor', String(s));

    if (scaleToggleBtn) {
      scaleToggleBtn.textContent = scaleMode === 'actual' ? '🔍 Fit: 100%' : '🔍 Fit: Auto';
    }

    updateLabels();
    emitViewportChange(cause);
    return s;
  }

  function updateLabels() {
    const { dimLabel, statusLabel } = currentElements();
    const orientIcon = viewport.orientation === 'vertical' ? '↕ Vertical (Portrait)' : '↔ Horizontal (Landscape)';
    const arrangeIcon = currentArrangement === 'horizontal' ? '☲ Side-by-Side Dock' : '☰ Stacked Topbar';
    const dims = `${formatDimension(viewport.width, viewport.unit)} × ${formatDimension(viewport.height, viewport.unit)}`;
    const ratio = viewport.unit === 'px' ? ` (${aspectRatio(viewport.width, viewport.height)})` : '';
    const scaleNote = currentScale < 1 ? ` • ${Math.round(currentScale * 100)}% Scale` : ' • 100% Scale';

    if (dimLabel) {
      dimLabel.textContent = `${dims}${ratio} • ${orientIcon}${scaleNote}`;
    }
    if (statusLabel) {
      const name = viewport.label ? `${viewport.label} • ` : '';
      statusLabel.textContent = `● Viewport: ${name}${dims}${ratio}${scaleNote} • ${orientIcon} • [${arrangeIcon}]`;
    }
  }

  function setViewportSize(width, height, unit = 'px', label = '', deviceId = null, cause = 'custom') {
    viewport = {
      width,
      height,
      unit,
      label: label || `${formatDimension(width, unit)} x ${formatDimension(height, unit)}`,
      orientation: viewport.orientation,
      deviceId
    };
    applyGeometry(cause);
  }

  function setOrientation(orientation, cause = 'rotate') {
    const { frame, btnOrientHorizontal, btnOrientVertical } = currentElements();
    if (!frame) return;
    const next = orientation === 'horizontal' ? 'horizontal' : 'vertical';
    if (next === viewport.orientation) return;

    viewport = {
      ...viewport,
      width: viewport.height,
      height: viewport.width,
      orientation: next
    };

    frame.classList.toggle('orientation-horizontal', next === 'horizontal');
    frame.classList.toggle('orientation-vertical', next === 'vertical');
    btnOrientHorizontal?.classList.toggle('active', next === 'horizontal');
    btnOrientVertical?.classList.toggle('active', next === 'vertical');

    applyGeometry(cause);
  }

  function rotate(cause = 'rotate') {
    setOrientation(viewport.orientation === 'vertical' ? 'horizontal' : 'vertical', cause);
  }

  function setScaleMode(mode) {
    scaleMode = mode === 'actual' ? 'actual' : 'auto';
    recomputeScale('scale-mode');
  }

  function toggleScaleMode() {
    setScaleMode(scaleMode === 'auto' ? 'actual' : 'auto');
  }

  function setArrangement(arrangement) {
    const { workspace, btnArrangeHorizontal, btnArrangeVertical, btnArrangeHorizontalDock, btnArrangeVerticalDock } = currentElements();
    if (!workspace) return;
    currentArrangement = arrangement === 'vertical' ? 'vertical' : 'horizontal';
    const horizontal = currentArrangement === 'horizontal';

    workspace.classList.toggle('arrangement-horizontal', horizontal);
    workspace.classList.toggle('arrangement-vertical', !horizontal);
    btnArrangeHorizontal?.classList.toggle('active', horizontal);
    btnArrangeVertical?.classList.toggle('active', !horizontal);
    btnArrangeHorizontalDock?.classList.toggle('active', horizontal);
    btnArrangeVerticalDock?.classList.toggle('active', !horizontal);

    recomputeScale('arrangement');
  }

  function applyCustomDimensions() {
    const { customWidthInput, customHeightInput } = currentElements();
    const w = clampDimension(customWidthInput?.value, viewport.width);
    const h = clampDimension(customHeightInput?.value, viewport.height);
    setViewportSize(w, h, 'px', `Custom (${w}×${h})`, null, 'custom');
    if (typeof onPresetDeactivate === 'function') {
      onPresetDeactivate();
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
      } catch {}
    }
    cleanupFns = [];
  }

  function rebind() {
    destroy();
    const els = currentElements();

    listen(els.btnArrangeVertical, 'click', () => setArrangement('vertical'));
    listen(els.btnArrangeHorizontal, 'click', () => setArrangement('horizontal'));
    listen(els.btnArrangeVerticalDock, 'click', () => setArrangement('vertical'));
    listen(els.btnArrangeHorizontalDock, 'click', () => setArrangement('horizontal'));

    listen(els.btnOrientVertical, 'click', () => setOrientation('vertical'));
    listen(els.btnOrientHorizontal, 'click', () => setOrientation('horizontal'));
    listen(els.rotateBtn, 'click', () => rotate('rotate'));
    listen(els.scaleToggleBtn, 'click', () => toggleScaleMode());

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
      const observeTarget = els.frame?.closest('.lab-stage-container') || els.container;
      if (window.ResizeObserver && observeTarget) {
        const ro = new ResizeObserver(() => recomputeScale('resize'));
        ro.observe(observeTarget);
        cleanupFns.push(() => ro.disconnect());
      } else {
        listen(window, 'resize', () => recomputeScale('resize'));
      }
    }

    const isHoriz = viewport.orientation === 'horizontal';
    els.frame?.classList.toggle('orientation-horizontal', isHoriz);
    els.frame?.classList.toggle('orientation-vertical', !isHoriz);
    els.btnOrientHorizontal?.classList.toggle('active', isHoriz);
    els.btnOrientVertical?.classList.toggle('active', !isHoriz);
  }

  rebind();

  return {
    getGeometry,
    setViewportSize,
    setOrientation,
    rotate,
    setScaleMode,
    toggleScaleMode,
    setArrangement,
    recomputeScale,
    applyGeometry,
    applyCustomDimensions,
    emitViewportChange,
    rebind,
    destroy
  };
}
