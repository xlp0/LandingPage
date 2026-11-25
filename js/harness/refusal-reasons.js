/**
 * Pure refusal reason helpers for disabled stage and recorder controls (SPRINT-DCI-04).
 *
 * Zero DOM access.
 */

export function stageRefusals({ kind, rotatable, hasSafeArea } = {}) {
  if (kind === 'full') {
    return [
      {
        code: 'full-size-has-no-device',
        controls: ['btn-rotate-viewport', 'btn-orient-vertical', 'btn-orient-horizontal', 'btn-safe-area-toggle'],
        sentence: 'Rotate, orientation, and Safe-area need a device. Pick a preset or enter a width and a height.'
      }
    ];
  }
  const list = [];
  if (!rotatable) {
    list.push({
      code: 'square-size-has-one-orientation',
      controls: ['btn-rotate-viewport', 'btn-orient-vertical', 'btn-orient-horizontal'],
      sentence: 'A square size has one orientation, so Rotate has nothing to change.'
    });
  }
  if (!hasSafeArea) {
    list.push({
      code: 'device-has-no-safe-area',
      controls: ['btn-safe-area-toggle'],
      sentence: 'Safe-area guides need a device that declares insets. Pick a phone preset.'
    });
  }
  return list;
}

export function recorderRefusal({ sourceKind, sourceReason } = {}) {
  if (sourceKind !== 'unavailable') return null;
  const trimmed = typeof sourceReason === 'string' ? sourceReason.trim() : '';
  return {
    code: 'capture-unavailable',
    controls: ['btn-rec-start'],
    sentence: trimmed || 'Recording unavailable'
  };
}
