import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIM_MIN,
  DIM_MAX,
  clampDimension,
  aspectRatio,
  rotateViewport,
  computeScale,
  formatDimension,
  deriveOrientation
} from '../../js/harness/viewport-geometry.js';

describe('Viewport Geometry Unit Tests (INV-RVP-01, INV-RVP-02)', () => {
  test('clampDimension clamps to [DIM_MIN, DIM_MAX]', () => {
    assert.equal(clampDimension(50), DIM_MIN);
    assert.equal(clampDimension(10000), DIM_MAX);
    assert.equal(clampDimension(500), 500);
    assert.equal(clampDimension('invalid', 390), 390);
  });

  test('aspectRatio returns accurate GCD ratio string', () => {
    assert.equal(aspectRatio(1920, 1080), '16:9');
    assert.equal(aspectRatio(800, 600), '4:3');
    assert.equal(aspectRatio(393, 852), '2.17:1');
  });

  test('deriveOrientation determines portrait vs landscape', () => {
    assert.equal(deriveOrientation(393, 852), 'portrait');
    assert.equal(deriveOrientation(852, 393), 'landscape');
    assert.equal(deriveOrientation(1920, 1080), 'landscape');
  });

  test('rotateViewport physically swaps width and height (INV-RVP-01)', () => {
    const portrait = { width: 393, height: 852, orientation: 'vertical' };
    const landscape = rotateViewport(portrait);

    assert.equal(landscape.width, 852);
    assert.equal(landscape.height, 393);
    assert.equal(landscape.orientation, 'horizontal');

    // Rotating twice is identity
    const reverted = rotateViewport(landscape);
    assert.equal(reverted.width, portrait.width);
    assert.equal(reverted.height, portrait.height);
    assert.equal(reverted.orientation, portrait.orientation);
  });

  test('computeScale enforces containment scaling and never upscales (INV-RVP-02)', () => {
    // Device fits within available stage: scale must be 1.0 (never upscaled)
    const fitScale = computeScale(1600, 1200, 393, 852);
    assert.equal(fitScale, 1.0);

    // Device exceeds stage: scale factor s = min(1, W/w, H/h) * 0.95
    const availW = 800;
    const availH = 600;
    const targetW = 1920;
    const targetH = 1080;
    const scaled = computeScale(availW, availH, targetW, targetH);
    const expected = Math.min(1, availW / targetW, availH / targetH) * 0.95;
    assert.ok(Math.abs(scaled - expected) < 0.001);
    assert.ok(scaled < 1.0);

    // Percentage unit always returns 1.0
    assert.equal(computeScale(800, 600, 100, 100, '%'), 1.0);

    // scaleMode === 'actual' returns 1.0
    assert.equal(computeScale(800, 600, 1920, 1080, 'px', 'actual'), 1.0);
  });

  test('formatDimension formats px and % properly', () => {
    assert.equal(formatDimension(100, '%'), '100%');
    assert.equal(formatDimension(500, 'px'), '500px');
  });
});
