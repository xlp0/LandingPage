/**
 * Interaction Recorder Controller (SPRINT-ERB-02 §4)
 * Orchestrates EventRingBuffer, RecordingStateMachine, and active CaptureSource.
 * Records viewport changes, orientation changes, and user interactions with relative timestamps.
 */

import { EventRingBuffer } from './event-ring-buffer.js';
import { RecordingStateMachine } from './recording-state-machine.js';
import { UnavailableCaptureSource } from './capture-probe-agent.js';
import { DIM_MIN, DIM_MAX, clampDimension } from './viewport-geometry.js';
import {
  TEST_RUN_SCHEMA,
  INTERRUPTED_CAPTURE_SCHEMA,
  targetSlug
} from './test-run-schema.js';

export const DEFAULT_CLM_KERNEL_VERSION = '0.0.24';
const RECORDED_VIEWPORT_CAUSES = new Set(['preset', 'custom', 'rotate']);

function stripDeviceUiFields(dev, width, height) {
  const safeW = Math.min(DIM_MAX, Math.max(DIM_MIN, Math.round(Number(width))));
  const safeH = Math.min(DIM_MAX, Math.max(DIM_MIN, Math.round(Number(height))));
  const out = {
    id: String(dev.id),
    name: String(dev.name || dev.id).trim().slice(0, 40) || String(dev.id).slice(0, 40),
    category: dev.category || 'custom',
    width: safeW,
    height: safeH,
    pixelRatio: Number.isFinite(dev.pixelRatio) && dev.pixelRatio > 0 ? dev.pixelRatio : 1,
    hasTouch: typeof dev.hasTouch === 'boolean' ? dev.hasTouch : false,
    isMobile: typeof dev.isMobile === 'boolean' ? dev.isMobile : false,
    pointer: dev.pointer === 'coarse' ? 'coarse' : 'fine',
    hover: typeof dev.hover === 'boolean' ? dev.hover : true,
    schemaVersion: 2
  };
  if (dev.safeAreaInsets) {
    out.safeAreaInsets = { ...dev.safeAreaInsets };
  }
  if (typeof dev.userAgent === 'string') {
    out.userAgent = dev.userAgent;
  }
  return out;
}

/**
 * Pure closed-schema Persistence Projection Table (SPRINT-SSG-02 §3).
 * Maps active selection / device / measured full stage to responsive_test_run:v1
 * without leaking UI-only fields (frameStyle, defaultOrientation).
 */
export function projectViewportToRunDescriptor({
  selection = null,
  device = null,
  orientation = null,
  measuredFullStage = null
} = {}) {
  if (selection?.kind === 'custom') {
    const w = clampDimension(Math.round(Number(selection.width)), 390);
    const h = clampDimension(Math.round(Number(selection.height)), 852);
    const runOrient = w > h ? 'landscape' : 'portrait';
    return {
      ok: true,
      device: {
        id: `custom-${w}x${h}`,
        name: `Custom (${w}x${h})`.slice(0, 40),
        category: 'custom',
        width: w,
        height: h,
        pixelRatio: 1,
        hasTouch: false,
        isMobile: false,
        pointer: 'fine',
        hover: true,
        schemaVersion: 2
      },
      orientation: runOrient
    };
  }

  if ((selection?.kind === 'preset' || (!selection && device)) && device) {
    const isSquare = device.width === device.height;
    const rawOrient = selection?.orientation || orientation;
    const runOrient = isSquare
      ? 'portrait'
      : rawOrient === 'landscape'
        ? 'landscape'
        : rawOrient === 'portrait'
          ? 'portrait'
          : device.width > device.height
            ? 'landscape'
            : 'portrait';
    const minDim = Math.min(device.width, device.height);
    const maxDim = Math.max(device.width, device.height);
    const activeW = isSquare ? device.width : runOrient === 'landscape' ? maxDim : minDim;
    const activeH = isSquare ? device.height : runOrient === 'landscape' ? minDim : maxDim;
    return {
      ok: true,
      device: stripDeviceUiFields(device, activeW, activeH),
      orientation: runOrient
    };
  }

  if (measuredFullStage != null) {
    const rawW = Math.round(Number(measuredFullStage.width));
    const rawH = Math.round(Number(measuredFullStage.height));
    if (!Number.isFinite(rawW) || !Number.isFinite(rawH) || rawW < DIM_MIN || rawH < DIM_MIN) {
      return {
        ok: false,
        error: 'Full (100%) stage container is smaller than 100px; resize the window or select a device preset before saving.'
      };
    }
    const w = Math.min(DIM_MAX, rawW);
    const h = Math.min(DIM_MAX, rawH);
    const runOrient = w >= h ? 'landscape' : 'portrait';
    return {
      ok: true,
      device: {
        id: 'viewport-full',
        name: `Full (${w}x${h})`.slice(0, 40),
        category: 'custom',
        width: w,
        height: h,
        pixelRatio: 1,
        hasTouch: false,
        isMobile: false,
        pointer: 'fine',
        hover: true,
        schemaVersion: 2
      },
      orientation: runOrient
    };
  }

  if (selection?.kind === 'full') {
    return {
      ok: false,
      error: 'Full (100%) stage dimensions unavailable (< 100px); resize the window or select a device preset before saving.'
    };
  }

  // Bare Node caller fallback (e.g. GQC-07-UNIT-03): never forge desktop-fhd.
  return {
    ok: true,
    device: {
      id: 'viewport-full',
      name: 'Full (1280x720)',
      category: 'custom',
      width: 1280,
      height: 720,
      pixelRatio: 1,
      hasTouch: false,
      isMobile: false,
      pointer: 'fine',
      hover: true,
      schemaVersion: 2
    },
    orientation: 'landscape'
  };
}

export function resolveClmKernelVersion(explicitVersion = null) {
  if (typeof explicitVersion === 'string' && explicitVersion.trim()) {
    return explicitVersion.trim();
  }
  if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
    const meta = document.querySelector('meta[name="lab-kernel-version"]');
    const content = meta && typeof meta.getAttribute === 'function' ? meta.getAttribute('content') : null;
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }
  }
  return DEFAULT_CLM_KERNEL_VERSION;
}

export class InteractionRecorder {
  constructor(options = {}) {
    this.buffer = new EventRingBuffer({ capacity: options.capacity || 2048 });
    this.fsm = new RecordingStateMachine({ now: options.now });
    this.source = options.source || null;
    this._measureFullStage = typeof options.measureFullStage === 'function' ? options.measureFullStage : null;
    this._lockedFullStage = null;
    this._clmKernelVersion = typeof options.clmKernelVersion === 'string' && options.clmKernelVersion.trim() ? options.clmKernelVersion.trim() : null;
    this._sourceEpoch = 0;
    this._boundTargetUrl = null;
    this._recordedTargetUrl = null;
    this._recordedCaptureSourceKind = null;
    this.undersizedTaps = 0;
    this.startedAt = null;
    this.lastSavedRun = null;
    this._listeners = new Set();

    this.fsm.onTransition((from, to, action) => {
      if (action === 'pause') {
        this._recordInternalEvent({ type: 'pause' });
      } else if (action === 'resume') {
        this._recordInternalEvent({ type: 'resume' });
      }
      this._emitChange('state', to);
    });

    this._onViewportChange = (e) => {
      if (!this.fsm.canAccept()) return;
      const d = e.detail;
      if (!d || !RECORDED_VIEWPORT_CAUSES.has(d.cause)) return;
      const type = d.cause === 'rotate' ? 'orientation_change' : 'viewport_change';
      this._recordInternalEvent({
        type,
        viewport: {
          w: d.width,
          h: d.height,
          scale: d.scale,
          orientation: d.orientation
        }
      });
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('lab:viewport-change', this._onViewportChange);
    }

    if (this.source) {
      this._bindSource(this.source);
    }
  }

  setSource(source, options = {}) {
    const nextTargetUrl = options.targetUrl || null;
    const activeTargetUrl = this._recordedTargetUrl || this._boundTargetUrl;
    if (
      (this.fsm.state === 'RECORDING' || this.fsm.state === 'PAUSED') &&
      activeTargetUrl &&
      nextTargetUrl &&
      nextTargetUrl !== activeTargetUrl
    ) {
      this._recordedTargetUrl = activeTargetUrl;
      this.fsm.stop();
    }
    this._boundTargetUrl = nextTargetUrl;

    const previous = this.source;
    this._sourceEpoch += 1;

    if (previous && previous !== source) {
      try {
        if (typeof previous.destroy === 'function') {
          previous.destroy();
        } else if (typeof previous.detach === 'function') {
          previous.detach();
        }
      } catch {}
    }

    this.source = source;
    const activeEpoch = this._sourceEpoch;

    if (this.source) {
      this.source._onStatusChange = (status, meta) => {
        if (activeEpoch !== this._sourceEpoch) return;
        this._emitChange('source', status, meta);
      };
    }

    if (this.source && this.fsm.canAccept()) {
      this._bindSource(this.source, activeEpoch);
    }

    this._emitChange('source', this.source?.kind);
  }

  invalidateActiveCapture(reason = 'Target policy invalidated active capture') {
    if (this.fsm.state === 'RECORDING' || this.fsm.state === 'PAUSED') {
      this.fsm.stop();
    }
    this.setSource(new UnavailableCaptureSource({
      reason,
      policyState: 'capture-unavailable'
    }));
    this._emitChange('invalidated', { reason });
  }

  _bindSource(source, boundEpoch = this._sourceEpoch) {
    if (source.kind === 'probe-agent' || source.kind === 'same-origin') {
      this._recordedCaptureSourceKind = source.kind;
    }
    source.attach((event) => {
      if (boundEpoch !== this._sourceEpoch || this.source !== source) return;
      if (!this.fsm.canAccept()) return;

      if (source.kind === 'probe-agent' || source.kind === 'same-origin') {
        this._recordedCaptureSourceKind = source.kind;
      }

      if (event.ergonomics?.undersized) {
        this.undersizedTaps++;
      }

      const stamped = {
        ...event,
        t_rel_ms: Math.round(this.fsm.activeElapsedMs())
      };

      this.buffer.push(stamped);
      this._emitChange('event', stamped);
    });
  }

  _recordInternalEvent(event) {
    const stamped = {
      ...event,
      t_rel_ms: Math.round(this.fsm.activeElapsedMs())
    };
    this.buffer.push(stamped);
    this._emitChange('event', stamped);
  }

  start(options = {}) {
    if (this.fsm.state === 'FINALIZED') {
      this.reset();
    }
    this.startedAt = new Date().toISOString();
    this._recordedTargetUrl = options.targetUrl || this._boundTargetUrl || this._recordedTargetUrl || null;
    this._recordedCaptureSourceKind = this.source?.kind === 'probe-agent' ? 'probe-agent' : 'same-origin';
    this._lockedFullStage = this._measureFullStage ? this._measureFullStage() : (options.measuredFullStage || null);
    this.fsm.start();
    if (this.source) {
      this._bindSource(this.source, this._sourceEpoch);
    }
  }

  pause() {
    this.fsm.pause();
  }

  resume() {
    this.fsm.resume();
  }

  stop() {
    this.fsm.stop();
    this.source?.detach();
  }

  reset() {
    this.fsm.reset();
    this.buffer.clear();
    this.undersizedTaps = 0;
    this.startedAt = null;
    this._lockedFullStage = null;
    this._recordedTargetUrl = null;
    this._recordedCaptureSourceKind = null;
    this.lastSavedRun = null;
    this._emitChange('reset', null);
  }

  buildTestRun(options = {}) {
    const {
      target = { url: 'http://localhost:3001/tests/fixtures/spa-test-target.html' },
      device = null,
      selection = null,
      orientation = null,
      measuredFullStage = undefined,
      fidelity = { tier: 0, runner: 'lab-iframe', emulated: ['viewport'], notEmulated: [] },
      finalState = null,
      telemetry = null,
      clmKernelVersion = null
    } = options;

    const snapshot = this.buffer.snapshot();
    const events = snapshot.map((ev, index) => ({
      seq: index + 1,
      t_rel_ms: ev.t_rel_ms ?? 0,
      type: ev.type,
      ...(ev.pointer ? { pointer: ev.pointer } : {}),
      ...(ev.target ? { target: ev.target } : {}),
      ...(ev.viewport ? { viewport: ev.viewport } : {}),
      ...(ev.coords ? { coords: ev.coords } : {}),
      ...(ev.value ? { value: ev.value } : {}),
      ...(ev.key ? { key: ev.key } : {}),
      ...(ev.ergonomics ? { ergonomics: ev.ergonomics } : {})
    }));

    const rawUrl = this._recordedTargetUrl || target?.url || target?.raw || 'http://localhost:3001/tests/fixtures/spa-test-target.html';
    const slug = target?.slug || targetSlug(rawUrl);

    const resolvedFullStage = measuredFullStage !== undefined
      ? measuredFullStage
      : (this._lockedFullStage ?? (this._measureFullStage ? this._measureFullStage() : null));

    const projected = projectViewportToRunDescriptor({
      selection,
      device,
      orientation,
      measuredFullStage: resolvedFullStage
    });

    if (!projected.ok) {
      const err = new Error(projected.error);
      err.code = 'FULL_STAGE_TOO_SMALL';
      throw err;
    }

    const safeDevice = projected.device;
    const resolvedOrientation = projected.orientation;

    const stats = this.stats();
    const resolvedCaptureKind =
      this._recordedCaptureSourceKind ||
      (this.source?.kind === 'probe-agent' ? 'probe-agent' : 'same-origin');

    return {
      schema: TEST_RUN_SCHEMA,
      sessionId: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      target: {
        url: rawUrl,
        slug
      },
      captureSource: resolvedCaptureKind,
      device: safeDevice,
      orientation: resolvedOrientation,
      fidelity: {
        tier: fidelity.tier ?? 0,
        runner: fidelity.runner || 'lab-iframe',
        emulated: Array.isArray(fidelity.emulated) ? fidelity.emulated : ['viewport'],
        notEmulated: Array.isArray(fidelity.notEmulated) ? fidelity.notEmulated : []
      },
      lab: {
        commit: '424022c',
        clmKernel: resolveClmKernelVersion(clmKernelVersion || this._clmKernelVersion)
      },
      metrics: {
        startedAt: this.startedAt || new Date().toISOString(),
        activeDurationMs: Math.round(this.fsm.activeElapsedMs()),
        eventCount: events.length,
        droppedCount: stats.dropped || 0,
        rejectedMessages: stats.rejected || 0
      },
      telemetry: telemetry || {
        overflow: { hasHorizontalOverflow: false, elements: [] },
        frames: { avgFps: 60.0, maxFrameMs: 16.6, droppedFrames: 0 },
        cls: 0,
        tapTargetViolations: this.undersizedTaps
      },
      finalState: finalState || {
        url: rawUrl,
        domDigest: 'blake3:pending'
      },
      events
    };
  }

  buildInterruptedCapture(options = {}) {
    const {
      sessionId = `ic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      target = { url: 'http://localhost:3001/tests/fixtures/spa-test-target.html' },
      reason = 'Target policy invalidated active capture',
      lifecycleState = this.fsm.state
    } = options;
    const rawUrl = this._recordedTargetUrl || target?.url || target?.raw || 'http://localhost:3001/tests/fixtures/spa-test-target.html';
    const slug = target?.slug || targetSlug(rawUrl);
    const safeState = lifecycleState && lifecycleState !== 'FINALIZED' ? lifecycleState : 'RECORDING';
    return {
      schema: INTERRUPTED_CAPTURE_SCHEMA,
      sessionId,
      target: {
        url: rawUrl,
        slug
      },
      reason: String(reason || 'Target policy invalidated active capture'),
      lifecycleState: safeState,
      capturedAt: new Date().toISOString(),
      incomplete: true,
      passing: false,
      certified: false
    };
  }

  async saveInterruptedCapture(options = {}) {
    const record = this.buildInterruptedCapture(options);
    try {
      const res = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      this.lastSavedRun = { ok: true, incomplete: true, data, run: record };
      this._emitChange('saved', this.lastSavedRun);
      return this.lastSavedRun;
    } catch (err) {
      this.lastSavedRun = { ok: false, incomplete: true, error: err.message, run: record };
      this._emitChange('save-failed', this.lastSavedRun);
      return this.lastSavedRun;
    }
  }

  async saveTestRun(options = {}) {
    let run = null;
    try {
      run = this.buildTestRun(options);
      const res = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(run)
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      const data = await res.json();
      this.lastSavedRun = { ok: true, data, run };
      this._emitChange('saved', this.lastSavedRun);
      return this.lastSavedRun;
    } catch (err) {
      this.lastSavedRun = {
        ok: false,
        blocked: err.code === 'FULL_STAGE_TOO_SMALL',
        error: err.message,
        run
      };
      this._emitChange('save-failed', this.lastSavedRun);
      return this.lastSavedRun;
    }
  }

  get state() {
    return this.fsm.state;
  }

  stats() {
    return {
      ...this.buffer.stats(),
      ...(this.source?.stats() ?? {}),
      state: this.fsm.state,
      undersizedTaps: this.undersizedTaps,
      activeElapsedMs: this.fsm.activeElapsedMs()
    };
  }

  snapshot() {
    return this.buffer.snapshot();
  }

  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emitChange(type, data, meta) {
    for (const l of this._listeners) {
      try {
        l(type, data, meta);
      } catch {}
    }
  }

  destroy() {
    if (typeof document !== 'undefined' && this._onViewportChange) {
      document.removeEventListener('lab:viewport-change', this._onViewportChange);
    }
    this._sourceEpoch += 1;
    if (this.source) {
      try {
        if (typeof this.source.destroy === 'function') {
          this.source.destroy();
        } else {
          this.source.detach();
        }
      } catch {}
      this.source = null;
    }
    this._listeners.clear();
  }
}
