/**
 * Probe-Agent Capture Source (SPRINT-ERB-02 §4.1, §4.3)
 * Manages postMessage handshake, nonce rotation, and telemetry reception for cross-origin targets.
 */

import { createTelemetryReceiver } from '../external-portal-membrane.js';

export const DEFAULT_HANDSHAKE_TIMEOUT_MS = 5000;
export const DEFAULT_PING_INTERVAL_MS = 500;

export class CaptureProbeAgentSource {
  constructor(options = {}) {
    this.iframe = options.iframe || (typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null);
    this.allowedOrigins = Array.isArray(options.allowedOrigins) ? [...options.allowedOrigins] : [];
    this.targetOrigin = options.targetOrigin || '';
    this.handshakeTimeoutMs = Number.isFinite(options.handshakeTimeoutMs) && options.handshakeTimeoutMs > 0
      ? Number(options.handshakeTimeoutMs)
      : DEFAULT_HANDSHAKE_TIMEOUT_MS;
    this.pingIntervalMs = Number.isFinite(options.pingIntervalMs) && options.pingIntervalMs > 0
      ? Number(options.pingIntervalMs)
      : DEFAULT_PING_INTERVAL_MS;
    this.connected = false;
    this.timedOut = false;
    this.policyState = 'pending-handshake';
    this.reason = 'Waiting for cross-origin probe agent handshake';
    this._destroyed = false;
    this._onStatusChange = null;
    this._onHandshakeStatus = options.onHandshakeStatus || null;
    this._onRedirectInvalidate = options.onRedirectInvalidate || null;
    this._onEvent = null;
    this._received = 0;
    this._rejected = 0;
    this._rejectReasons = {};
    this._currentNonce = null;
    this._receiver = null;
    this._pingTimer = null;
    this._handshakeTimer = null;
    this._onMessageBound = this._handleMessage.bind(this);
    this._onIframeLoadBound = this._handleIframeLoad.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this._onMessageBound);
    }

    if (this.iframe && typeof this.iframe.addEventListener === 'function') {
      this.iframe.addEventListener('load', this._onIframeLoadBound);
    }

    this._ensureReceiver(null);
    this.pingProbe();
    this._startHandshakeWindow();
  }

  get kind() {
    return this.connected && !this._destroyed ? 'probe-agent' : 'unavailable';
  }

  _clearTimers() {
    if (this._pingTimer !== null) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
    if (this._handshakeTimer !== null) {
      clearTimeout(this._handshakeTimer);
      this._handshakeTimer = null;
    }
  }

  pingProbe() {
    if (this.connected || this.timedOut || this._destroyed) return;
    const targetWin = this.iframe?.contentWindow;
    if (targetWin && typeof targetWin.postMessage === 'function') {
      try {
        targetWin.postMessage({ schema: 'lab-capture/v1', type: 'lab:ping' }, '*');
      } catch {}
    }
  }

  _startHandshakeWindow() {
    this._clearTimers();
    if (this._destroyed || this.connected) return;

    this._pingTimer = setInterval(() => {
      if (this.connected || this.timedOut || this._destroyed) {
        this._clearTimers();
        return;
      }
      this.pingProbe();
    }, this.pingIntervalMs);

    this._handshakeTimer = setTimeout(() => {
      if (this.connected || this._destroyed) {
        this._clearTimers();
        return;
      }
      this._clearTimers();
      this.timedOut = true;
      this.policyState = 'handshake-timeout';
      this.reason = `Probe agent handshake timed out after ${this.handshakeTimeoutMs}ms (capture unavailable)`;
      if (typeof this._onHandshakeStatus === 'function') {
        this._onHandshakeStatus('timeout', this.reason);
      }
      if (typeof this._onStatusChange === 'function') {
        this._onStatusChange('unavailable', {
          timedOut: true,
          policyState: this.policyState,
          reason: this.reason
        });
      }
    }, this.handshakeTimeoutMs);
  }

  _handleIframeLoad() {
    if (this._destroyed) return;
    if (this.connected || this._currentNonce !== null) {
      const wasRecording = Boolean(this._onEvent);
      this.connected = false;
      this.timedOut = false;
      this.policyState = 'capture-unavailable';
      this.reason = 'Target navigated during session; prior probe handshake invalidated';
      this._currentNonce = null;
      this._receiver?.revokeNonce();
      this._ensureReceiver(null);

      if (wasRecording && typeof this._onRedirectInvalidate === 'function') {
        this._onRedirectInvalidate(this.reason);
        return;
      }
      if (typeof this._onHandshakeStatus === 'function') {
        this._onHandshakeStatus('unavailable', this.reason);
      }
      if (typeof this._onStatusChange === 'function') {
        this._onStatusChange('unavailable', {
          policyState: this.policyState,
          reason: this.reason
        });
      }
      this.pingProbe();
      this._startHandshakeWindow();
      return;
    }

    this.pingProbe();
  }

  attach(onEvent) {
    if (this._destroyed) return;
    this._onEvent = onEvent;
    if (this.connected) {
      this._armProbe();
    }
  }

  _ensureReceiver(nonce = null) {
    const expectedWin = this.iframe?.contentWindow;
    this._receiver = createTelemetryReceiver({
      expectedSource: expectedWin,
      expectedNonce: nonce,
      expectedOrigin: this.targetOrigin || '__unapproved__',
      schema: 'lab-capture/v1',
      allowedTypes: ['lab:ready', 'lab:event', 'lab:final-state'],
      onTelemetry: (msg) => {
        if (this._destroyed || !this.connected) return;
        if (msg.type === 'lab:event' && this._onEvent) {
          this._received++;
          this._onEvent(msg.payload);
        }
      },
      onReject: (verdict) => {
        if (this._destroyed) return;
        this._rejected++;
        const r = verdict.reason || 'unknown';
        this._rejectReasons[r] = (this._rejectReasons[r] || 0) + 1;
      }
    });
    return expectedWin;
  }

  _armProbe() {
    if (this._destroyed || !this.connected) return;
    this._currentNonce = `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const expectedWin = this._ensureReceiver(this._currentNonce);

    if (expectedWin && typeof expectedWin.postMessage === 'function') {
      try {
        expectedWin.postMessage({ type: 'lab:arm', nonce: this._currentNonce }, this.targetOrigin || '*');
      } catch (err) {
        console.warn('[CaptureProbeAgentSource] arm postMessage failed:', err);
      }
    }
  }

  _isApprovedExactOrigin(candidateOrigin) {
    if (typeof candidateOrigin !== 'string' || !candidateOrigin) return false;
    if (!Array.isArray(this.allowedOrigins) || this.allowedOrigins.length === 0) return false;
    if (!this.allowedOrigins.includes(candidateOrigin)) return false;
    if (this.targetOrigin && candidateOrigin !== this.targetOrigin) return false;
    return true;
  }

  _handleMessage(event) {
    if (this._destroyed) return;
    const data = event?.data;
    if (!data || typeof data !== 'object') return;

    if (data.schema === 'lab-capture/v1' && data.type === 'lab:hello') {
      const expectedWin = this.iframe?.contentWindow;
      const sourceMatch = Boolean(expectedWin && event.source === expectedWin);
      const originMatch = this._isApprovedExactOrigin(event.origin);

      if (!sourceMatch) {
        this._rejected++;
        this._rejectReasons.source_mismatch = (this._rejectReasons.source_mismatch || 0) + 1;
        return;
      }

      if (!originMatch) {
        this._rejected++;
        this._rejectReasons.origin_mismatch = (this._rejectReasons.origin_mismatch || 0) + 1;
        return;
      }

      this.targetOrigin = event.origin;
      this.connected = true;
      this.timedOut = false;
      this.policyState = 'approved-probe';
      this.reason = null;
      this._clearTimers();

      try {
        event.source?.postMessage?.({ schema: 'lab-capture/v1', type: 'lab:ack' }, event.origin);
      } catch {}

      if (this._onEvent) {
        this._armProbe();
      } else {
        this._ensureReceiver(null);
      }

      if (typeof this._onHandshakeStatus === 'function') {
        this._onHandshakeStatus('ok', null);
      }
      if (typeof this._onStatusChange === 'function') {
        this._onStatusChange(this.kind, { policyState: this.policyState, reason: null });
      }
      return;
    }

    if (this._receiver) {
      this._receiver.handleMessage(event);
    }
  }

  detach() {
    this._onEvent = null;
    this._currentNonce = null;
    if (this.iframe?.contentWindow && typeof this.iframe.contentWindow.postMessage === 'function') {
      try {
        this.iframe.contentWindow.postMessage({ type: 'lab:disarm' }, this.targetOrigin || '*');
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
    if (this._destroyed) return;
    this._destroyed = true;
    this.connected = false;
    this._clearTimers();
    if (this.iframe && typeof this.iframe.removeEventListener === 'function') {
      this.iframe.removeEventListener('load', this._onIframeLoadBound);
    }
    this.detach();
    this._receiver = null;
    this._onStatusChange = null;
    this._onHandshakeStatus = null;
    this._onRedirectInvalidate = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this._onMessageBound);
    }
  }
}

export class UnavailableCaptureSource {
  constructor({ reason = 'Cross-origin target without probe agent', policyState = 'capture-unavailable' } = {}) {
    this.kind = 'unavailable';
    this.reason = reason;
    this.policyState = policyState;
    this._destroyed = false;
  }

  attach() {}

  detach() {}

  destroy() {
    this._destroyed = true;
  }

  stats() {
    return { received: 0, rejected: 0, rejectReasons: {} };
  }
}
