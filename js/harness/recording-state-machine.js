/**
 * Recording State Machine (INV-ERB-03)
 * Strict 4-state lifecycle manager and active-time accounting clock.
 */

export const RECORDER_TRANSITIONS = Object.freeze([
  Object.freeze({ action: 'start', from: Object.freeze(['IDLE']), to: 'RECORDING' }),
  Object.freeze({ action: 'pause', from: Object.freeze(['RECORDING']), to: 'PAUSED' }),
  Object.freeze({ action: 'resume', from: Object.freeze(['PAUSED']), to: 'RECORDING' }),
  Object.freeze({ action: 'stop', from: Object.freeze(['RECORDING', 'PAUSED']), to: 'FINALIZED' }),
  Object.freeze({ action: 'reset', from: Object.freeze(['FINALIZED']), to: 'IDLE' })
]);

export class InvalidTransitionError extends Error {
  constructor({ from, action }) {
    super(`Invalid transition: cannot '${action}' from state '${from}'`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.action = action;
  }
}

export class RecordingStateMachine {
  /**
   * @param {Object} options
   * @param {() => number} [options.now] Injected high-resolution clock function
   */
  constructor({ now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) } = {}) {
    this._now = now;
    this._state = 'IDLE';
    this._listeners = new Set();
    this._activeElapsedMs = 0;
    this._lastResumeTimestamp = 0;
  }

  get state() {
    return this._state;
  }

  /**
   * Events can only be accepted when actively RECORDING.
   * @returns {boolean}
   */
  canAccept() {
    return this._state === 'RECORDING';
  }

  /**
   * Returns total active recording time in milliseconds, excluding paused durations.
   * @returns {number}
   */
  activeElapsedMs() {
    if (this._state === 'RECORDING') {
      return this._activeElapsedMs + Math.max(0, this._now() - this._lastResumeTimestamp);
    }
    return this._activeElapsedMs;
  }

  /**
   * Transitions from IDLE -> RECORDING.
   */
  start() {
    const row = this._require('start');
    const from = this._state;
    this._state = row.to;
    this._activeElapsedMs = 0;
    this._lastResumeTimestamp = this._now();
    this._notify(from, 'RECORDING', 'start');
  }

  /**
   * Transitions from RECORDING -> PAUSED.
   */
  pause() {
    const row = this._require('pause');
    const from = this._state;
    this._state = row.to;
    this._activeElapsedMs += Math.max(0, this._now() - this._lastResumeTimestamp);
    this._notify(from, 'PAUSED', 'pause');
  }

  /**
   * Transitions from PAUSED -> RECORDING.
   */
  resume() {
    const row = this._require('resume');
    const from = this._state;
    this._state = row.to;
    this._lastResumeTimestamp = this._now();
    this._notify(from, 'RECORDING', 'resume');
  }

  /**
   * Transitions from RECORDING | PAUSED -> FINALIZED.
   */
  stop() {
    const row = this._require('stop');
    const from = this._state;
    if (from === 'RECORDING') {
      this._activeElapsedMs += Math.max(0, this._now() - this._lastResumeTimestamp);
    }
    this._state = row.to;
    this._notify(from, row.to, 'stop');
  }

  /**
   * Transitions from FINALIZED -> IDLE.
   */
  reset() {
    const row = this._require('reset');
    const from = this._state;
    this._state = row.to;
    this._activeElapsedMs = 0;
    this._lastResumeTimestamp = 0;
    this._notify(from, row.to, 'reset');
  }

  _require(action) {
    const row = RECORDER_TRANSITIONS.find((candidate) => candidate.action === action);
    if (!row || !row.from.includes(this._state)) {
      throw new InvalidTransitionError({ from: this._state, action });
    }
    return row;
  }

  /**
   * Subscribes to transition events: listener(from, to, action).
   * @param {(from: string, to: string, action: string) => void} listener
   * @returns {() => void} unsubscribe
   */
  onTransition(listener) {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  _notify(from, to, action) {
    for (const listener of this._listeners) {
      try {
        listener(from, to, action);
      } catch (err) {
        console.error('[RecordingStateMachine] listener threw:', err);
      }
    }
  }
}
