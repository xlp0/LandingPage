/**
 * Probe-Agent Capture Source (SPRINT-ERB-02 §4.1, §4.3)
 * Manages postMessage handshake, nonce rotation, and telemetry reception for cross-origin targets.
 */

import { createTelemetryReceiver } from '../external-portal-membrane.js';

export class CaptureProbeAgentSource {
  constructor(options = {}) {
    this.iframe = options.iframe || document.getElementById('mission-control-iframe');
    this.allowedOrigins = options.allowedOrigins || [];
    this.targetOrigin = options.targetOrigin || '';
    this.connected = false;
    this.reason = 'Waiting for cross-origin probe agent handshake';
    this._onStatusChange = null;
    this._onEvent = null;
    this._received = 0;
    this._rejected = 0;
    this._rejectReasons = {};
    this._currentNonce = null;
    this._receiver = null;
    this._onMessageBound = this._handleMessage.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this._onMessageBound);
    }
  }

  get kind() {
    return this.connected ? 'probe-agent' : 'unavailable';
  }

  attach(onEvent) {
    this._onEvent = onEvent;
    this._armProbe();
  }

  _armProbe() {
    this._currentNonce = `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const expectedWin = this.iframe?.contentWindow;

    this._receiver = createTelemetryReceiver({
      expectedSource: expectedWin,
      expectedNonce: this._currentNonce,
      expectedOrigin: this.targetOrigin || null,
      schema: 'lab-capture/v1',
      allowedTypes: ['lab:ready', 'lab:event', 'lab:final-state'],
      onTelemetry: (msg) => {
        if (msg.type === 'lab:event' && this._onEvent) {
          this._received++;
          this._onEvent(msg.payload);
        }
      },
      onReject: (verdict) => {
        this._rejected++;
        const r = verdict.reason || 'unknown';
        this._rejectReasons[r] = (this._rejectReasons[r] || 0) + 1;
      }
    });

    if (expectedWin && this.targetOrigin) {
      try {
        expectedWin.postMessage({ type: 'lab:arm', nonce: this._currentNonce }, this.targetOrigin);
      } catch (err) {
        console.warn('[CaptureProbeAgentSource] arm postMessage failed:', err);
      }
    }
  }

  _handleMessage(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // Handshake hello from probe
    if (data.schema === 'lab-capture/v1' && data.type === 'lab:hello') {
      const sourceMatch = event.source === this.iframe?.contentWindow;
      const originMatch = !this.allowedOrigins.length || this.allowedOrigins.includes(event.origin);

      if (!sourceMatch) {
        this._rejected++;
        this._rejectReasons['source_mismatch'] = (this._rejectReasons['source_mismatch'] || 0) + 1;
        return;
      }

      if (!originMatch) {
        this._rejected++;
        this._rejectReasons['origin_mismatch'] = (this._rejectReasons['origin_mismatch'] || 0) + 1;
        return;
      }

      this.targetOrigin = event.origin;
      this.connected = true;
      this.reason = null;
      this._armProbe();
      if (typeof this._onStatusChange === 'function') {
        this._onStatusChange(this.kind);
      }
      return;
    }

    // Process through telemetry receiver
    if (this._receiver) {
      this._receiver.handleMessage(event);
    }
  }

  detach() {
    this._onEvent = null;
    if (this.iframe?.contentWindow && this.targetOrigin) {
      try {
        this.iframe.contentWindow.postMessage({ type: 'lab:disarm' }, this.targetOrigin);
      } catch {}
    }
    this._receiver?.revokeNonce();
  }

  stats() {
    return {
      received: this._received,
      rejected: this._rejected,
      rejectReasons: { ...this._rejectReasons }
    };
  }

  destroy() {
    this.detach();
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this._onMessageBound);
    }
  }
}

export class UnavailableCaptureSource {
  constructor({ reason = 'Cross-origin target without probe agent' } = {}) {
    this.kind = 'unavailable';
    this.reason = reason;
  }
  attach() {}
  detach() {}
  stats() {
    return { received: 0, rejected: 0, rejectReasons: {} };
  }
}
