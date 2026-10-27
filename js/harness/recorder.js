/**
 * Interaction Recorder Controller (SPRINT-ERB-02 §4)
 * Orchestrates EventRingBuffer, RecordingStateMachine, and active CaptureSource.
 * Records viewport changes, orientation changes, and user interactions with relative timestamps.
 */

import { EventRingBuffer } from './event-ring-buffer.js';
import { RecordingStateMachine } from './recording-state-machine.js';
import { TEST_RUN_SCHEMA, targetSlug } from './test-run-schema.js';

export class InteractionRecorder {
  constructor(options = {}) {
    this.buffer = new EventRingBuffer({ capacity: options.capacity || 2048 });
    this.fsm = new RecordingStateMachine({ now: options.now });
    this.source = options.source || null;
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

  setSource(source) {
    if (this.source) {
      try {
        if (this.source !== source && typeof this.source.destroy === 'function') {
          this.source.destroy();
        } else {
          this.source.detach();
        }
      } catch {}
    }
    this.source = source;
    if (this.source) {
      this.source._onStatusChange = (status) => {
        this._emitChange('source', status);
      };
    }
    if (this.source && this.fsm.canAccept()) {
      this._bindSource(this.source);
    }
    this._emitChange('source', this.source?.kind);
  }

  _bindSource(source) {
    source.attach((event) => {
      if (!this.fsm.canAccept()) return;

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

  start() {
    if (this.fsm.state === 'FINALIZED') {
      this.reset();
    }
    this.startedAt = new Date().toISOString();
    this.fsm.start();
    if (this.source) {
      this._bindSource(this.source);
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
    this.lastSavedRun = null;
    this._emitChange('reset', null);
  }

  buildTestRun(options = {}) {
    const {
      target = { url: 'http://localhost:3001/app.html' },
      device = null,
      orientation = 'portrait',
      fidelity = { tier: 0, runner: 'lab-iframe', emulated: ['viewport'], notEmulated: [] },
      finalState = null,
      telemetry = null
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

    const rawUrl = target.url || target.raw || 'http://localhost:3001/app.html';
    const slug = target.slug || targetSlug(rawUrl);

    const safeDevice = device || {
      id: 'desktop-fhd',
      name: 'Desktop 1080p',
      category: 'desktop',
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      hasTouch: false,
      isMobile: false,
      pointer: 'fine',
      hover: true,
      schemaVersion: 2
    };

    const stats = this.stats();

    return {
      schema: TEST_RUN_SCHEMA,
      sessionId: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      target: {
        url: rawUrl,
        slug
      },
      captureSource: this.source?.kind === 'probe-agent' ? 'probe-agent' : 'same-origin',
      device: safeDevice,
      orientation: orientation === 'horizontal' ? 'landscape' : (orientation === 'landscape' ? 'landscape' : 'portrait'),
      fidelity: {
        tier: fidelity.tier ?? 0,
        runner: fidelity.runner || 'lab-iframe',
        emulated: Array.isArray(fidelity.emulated) ? fidelity.emulated : ['viewport'],
        notEmulated: Array.isArray(fidelity.notEmulated) ? fidelity.notEmulated : []
      },
      lab: {
        commit: '6f9a53a',
        clmKernel: '0.0.10'
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

  async saveTestRun(options = {}) {
    const run = this.buildTestRun(options);
    try {
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
      this.lastSavedRun = { ok: false, error: err.message, run };
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

  _emitChange(type, data) {
    for (const l of this._listeners) {
      try {
        l(type, data);
      } catch {}
    }
  }

  destroy() {
    if (typeof document !== 'undefined' && this._onViewportChange) {
      document.removeEventListener('lab:viewport-change', this._onViewportChange);
    }
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
