import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFidelity } from '../../js/harness/fidelity.js';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';

describe('Fidelity Model (INV-DSF-01)', () => {
  const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
  const desktop = BUILTIN_DEVICES.find((d) => d.id === 'desktop-fhd');

  test('lab-iframe maps to Tier 0 and reports notEmulated capabilities', () => {
    const f = resolveFidelity(iphone, 'lab-iframe');
    assert.equal(f.tier, 0);
    assert.equal(f.runner, 'lab-iframe');
    assert.ok(f.emulated.includes('viewport'));
    assert.ok(f.notEmulated.includes('hasTouch'));
    assert.ok(f.notEmulated.includes('pixelRatio'));
    assert.ok(f.notEmulated.includes('safeAreaInsets'));
  });

  test('playwright maps to Tier 1 and emulates touch, DPR, mobile UA', () => {
    const f = resolveFidelity(iphone, 'playwright');
    assert.equal(f.tier, 1);
    assert.equal(f.runner, 'playwright');
    assert.ok(f.emulated.includes('viewport'));
    assert.ok(f.emulated.includes('hasTouch'));
    assert.ok(f.emulated.includes('pixelRatio'));
    assert.ok(f.emulated.includes('isMobile'));
    // safe area requires T3
    assert.ok(f.notEmulated.includes('safeAreaInsets'));
  });

  test('playwright-cdp maps to Tier 2 and emulates network/cpu throttle', () => {
    const f = resolveFidelity(iphone, 'playwright-cdp', { network: 'Slow 3G', cpuThrottle: 4 });
    assert.equal(f.tier, 2);
    assert.equal(f.runner, 'playwright-cdp');
    assert.ok(f.emulated.includes('network'));
    assert.ok(f.emulated.includes('cpuThrottle'));
    assert.ok(f.notEmulated.includes('safeAreaInsets'));
  });

  test('real-device maps to Tier 3 with all capabilities emulated', () => {
    const f = resolveFidelity(iphone, 'real-device');
    assert.equal(f.tier, 3);
    assert.equal(f.runner, 'real-device');
    assert.ok(f.emulated.includes('safeAreaInsets'));
    assert.equal(f.notEmulated.length, 0);
  });

  test('desktop profile does not list safeAreaInsets in notEmulated', () => {
    const f = resolveFidelity(desktop, 'lab-iframe');
    assert.equal(f.notEmulated.includes('safeAreaInsets'), false);
  });

  test('deviceMatrix generates 16 combinations from 8 built-ins and 2 orientations', async () => {
    const { deviceMatrix, toPlaywrightContext } = await import('../../tests/fixtures/device-matrix.js');
    const matrix = deviceMatrix();
    assert.equal(matrix.length, 16);

    const first = matrix[0];
    assert.ok(first.profile);
    assert.ok(first.orientation);
    assert.ok(first.context.viewport);
    assert.equal(typeof first.context.hasTouch, 'boolean');
  });
});
