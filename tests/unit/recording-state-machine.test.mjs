import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RecordingStateMachine,
  InvalidTransitionError
} from '../../js/harness/recording-state-machine.js';

describe('RecordingStateMachine (INV-ERB-03)', () => {
  const ALL_STATES = ['IDLE', 'RECORDING', 'PAUSED', 'FINALIZED'];
  const ALL_ACTIONS = ['start', 'pause', 'resume', 'stop', 'reset'];

  const VALID_TRANSITIONS = {
    IDLE: { start: 'RECORDING' },
    RECORDING: { pause: 'PAUSED', stop: 'FINALIZED' },
    PAUSED: { resume: 'RECORDING', stop: 'FINALIZED' },
    FINALIZED: { reset: 'IDLE' }
  };

  test('exhaustive 20 (state, action) transition verification', () => {
    for (const fromState of ALL_STATES) {
      for (const action of ALL_ACTIONS) {
        const expectedNext = VALID_TRANSITIONS[fromState]?.[action];
        const fsm = new RecordingStateMachine();

        // Bring FSM to fromState
        if (fromState === 'RECORDING') {
          fsm.start();
        } else if (fromState === 'PAUSED') {
          fsm.start();
          fsm.pause();
        } else if (fromState === 'FINALIZED') {
          fsm.start();
          fsm.stop();
        }

        assert.equal(fsm.state, fromState);

        if (expectedNext) {
          fsm[action]();
          assert.equal(fsm.state, expectedNext, `${fromState} -> ${action} should transition to ${expectedNext}`);
        } else {
          assert.throws(
            () => fsm[action](),
            (err) => err instanceof InvalidTransitionError && err.from === fromState && err.action === action,
            `${fromState} -> ${action} should throw InvalidTransitionError`
          );
        }
      }
    }
  });

  test('canAccept() is true ONLY in RECORDING state', () => {
    const fsm = new RecordingStateMachine();
    assert.equal(fsm.canAccept(), false); // IDLE

    fsm.start();
    assert.equal(fsm.canAccept(), true); // RECORDING

    fsm.pause();
    assert.equal(fsm.canAccept(), false); // PAUSED

    fsm.resume();
    assert.equal(fsm.canAccept(), true); // RECORDING

    fsm.stop();
    assert.equal(fsm.canAccept(), false); // FINALIZED

    fsm.reset();
    assert.equal(fsm.canAccept(), false); // IDLE
  });

  test('onTransition notifies listener on state change and respects unsubscribe', () => {
    const fsm = new RecordingStateMachine();
    const transitions = [];
    const unsub = fsm.onTransition((from, to, action) => {
      transitions.push({ from, to, action });
    });

    fsm.start();
    fsm.pause();
    fsm.resume();
    fsm.stop();
    fsm.reset();

    assert.deepEqual(transitions, [
      { from: 'IDLE', to: 'RECORDING', action: 'start' },
      { from: 'RECORDING', to: 'PAUSED', action: 'pause' },
      { from: 'PAUSED', to: 'RECORDING', action: 'resume' },
      { from: 'RECORDING', to: 'FINALIZED', action: 'stop' },
      { from: 'FINALIZED', to: 'IDLE', action: 'reset' }
    ]);

    unsub();
    fsm.start();
    assert.equal(transitions.length, 5); // no new events recorded after unsubscribe
  });

  test('activeElapsedMs() excludes paused intervals with injected clock', () => {
    let mockTime = 1000;
    const now = () => mockTime;
    const fsm = new RecordingStateMachine({ now });

    assert.equal(fsm.activeElapsedMs(), 0);

    // Start at t=1000
    fsm.start();

    // Advance 500ms in RECORDING
    mockTime += 500;
    assert.equal(fsm.activeElapsedMs(), 500);

    // Pause at t=1500
    fsm.pause();

    // Advance 2000ms while PAUSED
    mockTime += 2000;
    assert.equal(fsm.activeElapsedMs(), 500); // must still be 500!

    // Resume at t=3500
    fsm.resume();

    // Advance 300ms in RECORDING
    mockTime += 300;
    assert.equal(fsm.activeElapsedMs(), 800); // 500 + 300 = 800

    // Stop at t=3800
    fsm.stop();

    // Advance more time after FINALIZED
    mockTime += 1000;
    assert.equal(fsm.activeElapsedMs(), 800); // frozen at finalized elapsed time
  });
});
