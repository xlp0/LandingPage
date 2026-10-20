/**
 * Recording State Machine (INV-ERB-03)
 * Strict 4-state lifecycle manager and active-time accounting clock.
 */

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
    if (this._state !== 'IDLE') {
      throw new InvalidTransitionError({ from: this._state, action: 'start' });
    }
    const from = this._state;
    this._state = 'RECORDING';
    this._activeElapsedMs = 0;
    this._lastResumeTimestamp = this._now();
    this._notify(from, 'RECORDING', 'start');
  }

  /**
   * Transitions from RECORDING -> PAUSED.
   */
  pause() {
    if (this._state !== 'RECORDING') {
      throw new InvalidTransitionError({ from: this._state, action: 'pause' });
    }
    const from = this._state;
    this._state = 'PAUSED';
    this._activeElapsedMs += Math.max(0, this._now() - this._lastResumeTimestamp);
    this._notify(from, 'PAUSED', 'pause');
  }

  /**
   * Transitions from PAUSED -> RECORDING.
   */
  resume() {
    if (this._state !== 'PAUSED') {
      throw new InvalidTransitionError({ from: this._state, action: 'resume' });
    }
    const from = this._state;
    this._state = 'RECORDING';
    this._lastResumeTimestamp = this._now();
    this._notify(from, 'RECORDING', 'resume');
  }

  /**
   * Transitions from RECORDING | PAUSED -> FINALIZED.
   */
  stop() {
    if (this._state !== 'RECORDING' && this._state !== 'PAUSED') {
      throw new InvalidTransitionError({ from: this._state, action: 'stop' });
    }
    const from = this._state;
    if (from === 'RECORDING') {
      this._activeElapsedMs += Math.max(0, this._now() - this._lastResumeTimestamp);
    }
    this._state = 'FINALIZED';
    this._notify(from, 'FINALIZED', 'stop');
  }

  /**
   * Transitions from FINALIZED -> IDLE.
   */
  reset() {
    if (this._state !== 'FINALIZED') {
      throw new InvalidTransitionError({ from: this._state, action: 'reset' });
    }
    const from = this._state;
    this._state = 'IDLE';
    this._activeElapsedMs = 0;
    this._lastResumeTimestamp = 0;
    this._notify(from, 'IDLE', 'reset');
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
