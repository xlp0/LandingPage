import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { InteractionRecorder } from '../../js/harness/recorder.js';

describe('InteractionRecorder (SPRINT-ERB-02 §4)', () => {
  test('recording lifecycle: start, pause, resume, stop records events with relative timestamps', () => {
    let mockTime = 1000;
    const now = () => mockTime;

    let eventCallback = null;
    const fakeSource = {
      kind: 'same-origin',
      attach(cb) { eventCallback = cb; },
      detach() { eventCallback = null; },
      stats() { return { received: 2, rejected: 0, rejectReasons: {} }; }
    };

    const recorder = new InteractionRecorder({ now, source: fakeSource });
    assert.equal(recorder.state, 'IDLE');

    // Start recording at t=1000
    recorder.start();
    assert.equal(recorder.state, 'RECORDING');

    // Emit event at t=1200 (elapsed: 200ms)
    mockTime += 200;
    eventCallback({ type: 'pointer', coords: { nx: 0.5, ny: 0.5 } });

    // Pause at t=1500 (elapsed: 500ms)
    mockTime += 300;
    recorder.pause();
    assert.equal(recorder.state, 'PAUSED');

    // Emit event while paused (should NOT be recorded!)
    mockTime += 2000;
    eventCallback({ type: 'pointer', coords: { nx: 0.1, ny: 0.1 } });

    // Resume at t=3500 (active elapsed stays 500ms)
    recorder.resume();
    assert.equal(recorder.state, 'RECORDING');

    // Emit event at t=3700 (elapsed: 500 + 200 = 700ms)
    mockTime += 200;
    eventCallback({ type: 'pointer', coords: { nx: 0.8, ny: 0.8 }, ergonomics: { undersized: true } });

    // Stop at t=3800
    mockTime += 100;
    recorder.stop();
    assert.equal(recorder.state, 'FINALIZED');

    const snap = recorder.snapshot();
    // Expected events in order:
    // 1. pointer (t_rel_ms: 200)
    // 2. pause marker (t_rel_ms: 500)
    // 3. resume marker (t_rel_ms: 500)
    // 4. pointer (t_rel_ms: 700)
    assert.equal(snap.length, 4);
    assert.equal(snap[0].type, 'pointer');
    assert.equal(snap[0].t_rel_ms, 200);
    assert.equal(snap[1].type, 'pause');
    assert.equal(snap[1].t_rel_ms, 500);
    assert.equal(snap[2].type, 'resume');
    assert.equal(snap[2].t_rel_ms, 500);
    assert.equal(snap[3].type, 'pointer');
    assert.equal(snap[3].t_rel_ms, 700);

    const stats = recorder.stats();
    assert.equal(stats.undersizedTaps, 1);
    assert.equal(stats.state, 'FINALIZED');
  });
});
