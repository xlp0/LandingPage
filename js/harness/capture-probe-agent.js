/**
 * Probe-Agent Capture Source (SPRINT-ERB-02 §4.1, §4.3)
 * Manages postMessage handshake, nonce rotation, and telemetry reception for cross-origin targets.
 */

import { createTelemetryReceiver } from '../external-portal-membrane.js';

export class CaptureProbeAgentSource {
  constructor(options = {}) {
    this.iframe = options.iframe || (typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null);
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
    this._pingTimer = null;
    this._onMessageBound = this._handleMessage.bind(this);
    this._onIframeLoadBound = this.pingProbe.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this._onMessageBound);
    }

    if (this.iframe) {
      this.iframe.addEventListener('load', this._onIframeLoadBound);
    }

    // Proactively ping probe until connection is acknowledged
    this.pingProbe();
    this._startPingInterval();
  }

  get kind() {
    return this.connected ? 'probe-agent' : 'unavailable';
  }

  pingProbe() {
    if (this.connected) return;
    const targetWin = this.iframe?.contentWindow;
    if (targetWin) {
      try {
        targetWin.postMessage({ schema: 'lab-capture/v1', type: 'lab:ping' }, '*');
      } catch {}
    }
  }

  _startPingInterval() {
    if (this._pingTimer) clearInterval(this._pingTimer);
    let attempts = 0;
    this._pingTimer = setInterval(() => {
      if (this.connected || attempts++ >= 30) {
        clearInterval(this._pingTimer);
        this._pingTimer = null;
        return;
      }
      this.pingProbe();
    }, 500);
  }

  attach(onEvent) {
    this._onEvent = onEvent;
    if (this.connected) {
      this._armProbe();
    }
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

    if (expectedWin) {
      try {
        expectedWin.postMessage({ type: 'lab:arm', nonce: this._currentNonce }, '*');
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
      const sourceMatch = !this.iframe?.contentWindow || event.source === this.iframe?.contentWindow;
      const originMatch = !this.allowedOrigins.length ||
        this.allowedOrigins.includes(event.origin) ||
        (this.targetOrigin && event.origin === this.targetOrigin);

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

      if (this._pingTimer) {
        clearInterval(this._pingTimer);
        this._pingTimer = null;
      }

      // Send ack back to probe
      try {
        event.source?.postMessage?.({ schema: 'lab-capture/v1', type: 'lab:ack' }, '*');
      } catch {}

      if (this._onEvent) {
        this._armProbe();
      }

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
    if (this.iframe?.contentWindow) {
      try {
        this.iframe.contentWindow.postMessage({ type: 'lab:disarm' }, '*');
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
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
    if (this.iframe) {
      this.iframe.removeEventListener('load', this._onIframeLoadBound);
    }
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
