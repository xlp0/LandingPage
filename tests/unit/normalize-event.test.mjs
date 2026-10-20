import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNormalizedCoords,
  deriveSelector,
  redactValue,
  auditTapErgonomics,
  normalizePointerEvent,
  normalizeKeyEvent
} from '../../js/harness/normalize-event.js';

describe('Spatial Normalization & Event Processing (INV-ERB-02, INV-PRV-01)', () => {
  test('corner points map to exactly 0.0 and 1.0 with 4-decimal precision', () => {
    const vp = { w: 1000, h: 500 };

    const topLeading = computeNormalizedCoords(0, 0, vp.w, vp.h);
    assert.deepEqual(topLeading, { nx: 0, ny: 0 });

    const bottomTrailing = computeNormalizedCoords(1000, 500, vp.w, vp.h);
    assert.deepEqual(bottomTrailing, { nx: 1, ny: 1 });

    const center = computeNormalizedCoords(500, 250, vp.w, vp.h);
    assert.deepEqual(center, { nx: 0.5, ny: 0.5 });

    // 4-decimal precision
    const fraction = computeNormalizedCoords(333, 111, 1000, 1000);
    assert.deepEqual(fraction, { nx: 0.333, ny: 0.111 });
  });

  test('coordinates clamp into [0.0, 1.0] for overflow or negative drag/pointer', () => {
    const vp = { w: 800, h: 600 };
    const negative = computeNormalizedCoords(-50, -100, vp.w, vp.h);
    assert.deepEqual(negative, { nx: 0, ny: 0 });

    const overflow = computeNormalizedCoords(1200, 900, vp.w, vp.h);
    assert.deepEqual(overflow, { nx: 1, ny: 1 });
  });

  test('selector priority: data-testid -> #id -> [aria-label] -> CSS path', () => {
    // 1. data-testid
    const el1 = {
      dataset: { testid: 'hero-cta' },
      id: 'cta-btn',
      getAttribute: (a) => (a === 'aria-label' ? 'Start' : null),
      tagName: 'BUTTON'
    };
    assert.equal(deriveSelector(el1), '[data-testid="hero-cta"]');

    // 2. #id
    const el2 = {
      dataset: {},
      id: 'nav-home',
      getAttribute: (a) => (a === 'aria-label' ? 'Home' : null),
      tagName: 'A'
    };
    assert.equal(deriveSelector(el2), '#nav-home');

    // 3. aria-label + role/tag
    const el3 = {
      dataset: {},
      id: '',
      getAttribute: (a) => {
        if (a === 'aria-label') return 'Close Dialog';
        if (a === 'role') return 'button';
        return null;
      },
      tagName: 'BUTTON'
    };
    assert.equal(deriveSelector(el3), 'button[aria-label="Close Dialog"]');

    // 4. CSS path fallback
    const el4 = {
      dataset: {},
      id: '',
      getAttribute: () => null,
      tagName: 'SPAN',
      parentElement: {
        tagName: 'DIV',
        id: 'container',
        children: []
      }
    };
    assert.ok(deriveSelector(el4).includes('span'));
  });

  test('redaction rules (INV-PRV-01): passwords and sensitive inputs redacted', () => {
    assert.equal(redactValue('secret123', { type: 'password' }), '<redacted>');
    assert.equal(redactValue('1234567812345678', { autocomplete: 'cc-number' }), '<redacted>');
    assert.equal(redactValue('normal input', { type: 'text' }), 'normal input');
  });

  test('keyboard events: control keys recorded, character keys omitted or redacted', () => {
    assert.equal(normalizeKeyEvent({ key: 'Enter' }).key, 'Enter');
    assert.equal(normalizeKeyEvent({ key: 'Escape' }).key, 'Escape');
    assert.equal(normalizeKeyEvent({ key: 'Tab' }).key, 'Tab');
    assert.equal(normalizeKeyEvent({ key: 'ArrowDown' }).key, 'ArrowDown');
    assert.equal(normalizeKeyEvent({ key: 'a' }), null); // character omitted!
    assert.equal(normalizeKeyEvent({ key: '1' }), null);
  });

  test('touch ergonomics (INV-DEV-02): marks undersized < 44px only on coarse pointers', () => {
    const coarseProfile = { pointer: 'coarse' };
    const fineProfile = { pointer: 'fine' };

    // 20x20 button
    const smallErgCoarse = auditTapErgonomics({ width: 20, height: 20 }, coarseProfile);
    assert.equal(smallErgCoarse.undersized, true);
    assert.deepEqual(smallErgCoarse.rect, { w: 20, h: 20 });

    const smallErgFine = auditTapErgonomics({ width: 20, height: 20 }, fineProfile);
    assert.equal(smallErgFine.undersized, false); // Desktop/fine pointer is not flagged!

    // 48x48 button
    const okErgCoarse = auditTapErgonomics({ width: 48, height: 48 }, coarseProfile);
    assert.equal(okErgCoarse.undersized, false);
  });
});
