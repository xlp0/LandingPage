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
  const {
    frame = document.getElementById('controlled-panel-frame'),
    wrapper = document.getElementById('viewport-scale-wrapper'),
    container = document.getElementById('lab-stage-container') || document.body,
    workspace = document.getElementById('lab-workspace-container'),
    dimLabel = document.getElementById('controlled-frame-dim'),
    statusLabel = document.getElementById('controlled-panel-status') || document.getElementById('controlled-status'),
    scaleToggleBtn = document.getElementById('btn-scale-toggle'),
    customWidthInput = document.getElementById('controlled-width-input'),
    customHeightInput = document.getElementById('controlled-height-input'),
    applyCustomDimBtn = document.getElementById('btn-apply-custom-dim'),
    rotateBtn = document.getElementById('btn-rotate-viewport'),
    btnOrientVertical = document.getElementById('btn-orient-vertical'),
    btnOrientHorizontal = document.getElementById('btn-orient-horizontal'),
    btnArrangeVertical = document.getElementById('btn-arrange-vertical'),
    btnArrangeHorizontal = document.getElementById('btn-arrange-horizontal'),
    btnArrangeVerticalDock = document.getElementById('btn-arrange-vertical-dock'),
    btnArrangeHorizontalDock = document.getElementById('btn-arrange-horizontal-dock'),
    onPresetDeactivate = null
  } = options;

  let viewport = {
    width: 100,
    height: 100,
    unit: '%',
    orientation: 'horizontal',
    label: 'Full (100%)',
    deviceId: null
  };
  let scaleMode = 'auto'; // 'auto' | 'actual'
  let currentScale = 1;
  let currentArrangement = 'horizontal';

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
    if (!frame) return;
    const next = orientation === 'horizontal' ? 'horizontal' : 'vertical';
    if (next === viewport.orientation) return; // delta_orient(S, theta) = S

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
    const w = clampDimension(customWidthInput?.value, viewport.width);
    const h = clampDimension(customHeightInput?.value, viewport.height);
    setViewportSize(w, h, 'px', `Custom (${w}×${h})`, null, 'custom');
    if (typeof onPresetDeactivate === 'function') {
      onPresetDeactivate();
    }
  }

  // Wire toolbar UI buttons
  btnArrangeVertical?.addEventListener('click', () => setArrangement('vertical'));
  btnArrangeHorizontal?.addEventListener('click', () => setArrangement('horizontal'));
  btnArrangeVerticalDock?.addEventListener('click', () => setArrangement('vertical'));
  btnArrangeHorizontalDock?.addEventListener('click', () => setArrangement('horizontal'));

  btnOrientVertical?.addEventListener('click', () => setOrientation('vertical'));
  btnOrientHorizontal?.addEventListener('click', () => setOrientation('horizontal'));
  rotateBtn?.addEventListener('click', () => rotate('rotate'));
  scaleToggleBtn?.addEventListener('click', () => toggleScaleMode());

  applyCustomDimBtn?.addEventListener('click', applyCustomDimensions);
  for (const el of [customWidthInput, customHeightInput]) {
    el?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCustomDimensions();
      }
    });
  }

  // Setup ResizeObserver
  if (typeof window !== 'undefined') {
    if (window.ResizeObserver) {
      new ResizeObserver(() => recomputeScale('resize')).observe(
        frame?.closest('.lab-stage-container') || container
      );
    } else {
      window.addEventListener('resize', () => recomputeScale('resize'));
    }
  }

  // Set initial orientation class and active state
  frame?.classList.add('orientation-horizontal');
  btnOrientHorizontal?.classList.add('active');

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
    emitViewportChange
  };
}
