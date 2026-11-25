import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stageRefusals, recorderRefusal } from '../../js/harness/refusal-reasons.js';

describe('DCI-04 refusal-reasons pure helpers', () => {
  it('returns full-size-has-no-device for full stage', () => {
    assert.deepEqual(stageRefusals({ kind: 'full', rotatable: false, hasSafeArea: false }), [
      {
        code: 'full-size-has-no-device',
        controls: ['btn-rotate-viewport', 'btn-orient-vertical', 'btn-orient-horizontal', 'btn-safe-area-toggle'],
        sentence: 'Rotate, orientation, and Safe-area need a device. Pick a preset or enter a width and a height.'
      }
    ]);
  });

  it('returns square-size-has-one-orientation for non-rotatable non-full stage', () => {
    const res = stageRefusals({ kind: 'custom', rotatable: false, hasSafeArea: true });
    assert.deepEqual(res, [
      {
        code: 'square-size-has-one-orientation',
        controls: ['btn-rotate-viewport', 'btn-orient-vertical', 'btn-orient-horizontal'],
        sentence: 'A square size has one orientation, so Rotate has nothing to change.'
      }
    ]);
  });

  it('returns device-has-no-safe-area when rotatable preset lacks safe area insets', () => {
    const res = stageRefusals({ kind: 'preset', rotatable: true, hasSafeArea: false });
    assert.deepEqual(res, [
      {
        code: 'device-has-no-safe-area',
        controls: ['btn-safe-area-toggle'],
        sentence: 'Safe-area guides need a device that declares insets. Pick a phone preset.'
      }
    ]);
  });

  it('returns empty list when rotatable and safe-area presets are active', () => {
    assert.deepEqual(stageRefusals({ kind: 'preset', rotatable: true, hasSafeArea: true }), []);
  });

  it('recorderRefusal returns null when source is available and sentence with fallback when unavailable', () => {
    assert.equal(recorderRefusal({ sourceKind: 'same-origin' }), null);
    assert.deepEqual(recorderRefusal({ sourceKind: 'unavailable', sourceReason: 'Cross-origin target blocked' }), {
      code: 'capture-unavailable',
      controls: ['btn-rec-start'],
      sentence: 'Cross-origin target blocked'
    });
    assert.deepEqual(recorderRefusal({ sourceKind: 'unavailable', sourceReason: '' }), {
      code: 'capture-unavailable',
      controls: ['btn-rec-start'],
      sentence: 'Recording unavailable'
    });
  });
});
