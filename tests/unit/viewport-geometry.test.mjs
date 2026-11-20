import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIM_MIN,
  DIM_MAX,
  FRAME_STYLES,
  FRAME_CHROME_INSETS,
  clampDimension,
  aspectRatio,
  createFullSelection,
  selectDevicePreset,
  applyCustomViewport,
  isSelectionRotatable,
  rotateViewportSelection,
  setSelectionOrientation,
  resolveFrame,
  resolveSafeAreaInsets,
  resolveViewportMetrics,
  computeScale,
  formatDimension,
  deriveOrientation
} from '../../js/harness/viewport-geometry.js';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';

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

  test('deriveOrientation determines portrait, landscape, and square', () => {
    assert.equal(deriveOrientation(393, 852), 'portrait');
    assert.equal(deriveOrientation(852, 393), 'landscape');
    assert.equal(deriveOrientation(1920, 1080), 'landscape');
    assert.equal(deriveOrientation(500, 500), 'square');
  });

  test('selectDevicePreset honors device.defaultOrientation across phone and desktop presets', () => {
    const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
    const macbook = BUILTIN_DEVICES.find((d) => d.id === 'macbook-air-13');
    const desktop = BUILTIN_DEVICES.find((d) => d.id === 'desktop-fhd');

    const selPhone = selectDevicePreset(iphone);
    assert.deepEqual(selPhone, { kind: 'preset', deviceId: 'iphone-16-pro', orientation: 'portrait' });
    const mPhone = resolveViewportMetrics(selPhone, BUILTIN_DEVICES, { width: 1200, height: 900 });
    assert.equal(mPhone.width, 393);
    assert.equal(mPhone.height, 852);
    assert.equal(mPhone.orientation, 'portrait');
    assert.equal(mPhone.rotatable, true);
    assert.equal(mPhone.frameStyle, 'phone-ios');

    const selMac = selectDevicePreset(macbook);
    assert.deepEqual(selMac, { kind: 'preset', deviceId: 'macbook-air-13', orientation: 'landscape' });
    const mMac = resolveViewportMetrics(selMac, BUILTIN_DEVICES, { width: 1600, height: 1000 });
    assert.equal(mMac.width, 1280);
    assert.equal(mMac.height, 832);
    assert.equal(mMac.orientation, 'landscape');
    assert.equal(mMac.frameStyle, 'browser-window');

    const selDesktop = selectDevicePreset(desktop);
    const mDesktop = resolveViewportMetrics(selDesktop, BUILTIN_DEVICES, { width: 1000, height: 700 });
    assert.equal(mDesktop.width, 1920);
    assert.equal(mDesktop.height, 1080);
    assert.equal(mDesktop.orientation, 'landscape');
  });

  test('rotateViewportSelection swaps preset and custom dimensions, and is identity twice (INV-RVP-01)', () => {
    const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
    const portraitSel = selectDevicePreset(iphone);
    const landscapeSel = rotateViewportSelection(portraitSel, BUILTIN_DEVICES);
    assert.equal(landscapeSel.orientation, 'landscape');

    const mLandscape = resolveViewportMetrics(landscapeSel, BUILTIN_DEVICES, { width: 1200, height: 900 });
    assert.equal(mLandscape.width, 852);
    assert.equal(mLandscape.height, 393);
    assert.equal(mLandscape.orientation, 'landscape');

    const revertedSel = rotateViewportSelection(landscapeSel, BUILTIN_DEVICES);
    assert.equal(revertedSel.orientation, 'portrait');

    const customPortrait = applyCustomViewport(400, 700);
    const customLandscape = rotateViewportSelection(customPortrait);
    assert.equal(customLandscape.width, 700);
    assert.equal(customLandscape.height, 400);
    const forcedPortrait = setSelectionOrientation(customLandscape, 'portrait');
    assert.equal(forcedPortrait.width, 400);
    assert.equal(forcedPortrait.height, 700);
  });

  test('Full (100%) and square custom selections report non-rotatable responsive/square semantics', () => {
    const fullSel = createFullSelection();
    assert.equal(isSelectionRotatable(fullSel), false);
    const fullMetrics = resolveViewportMetrics(fullSel, BUILTIN_DEVICES, { width: 980, height: 740 });
    assert.equal(fullMetrics.kind, 'full');
    assert.equal(fullMetrics.selectionKey, 'viewport-full');
    assert.equal(fullMetrics.rotatable, false);
    assert.equal(fullMetrics.orientation, 'responsive');
    assert.equal(fullMetrics.frameStyle, 'unframed');
    assert.equal(fullMetrics.measuredWidth, 980);
    assert.equal(fullMetrics.measuredHeight, 740);
    assert.deepEqual(rotateViewportSelection(fullSel), fullSel);

    const squareSel = applyCustomViewport(500, 500);
    assert.equal(isSelectionRotatable(squareSel), false);
    const sqMetrics = resolveViewportMetrics(squareSel, BUILTIN_DEVICES, { width: 1200, height: 900 });
    assert.equal(sqMetrics.rotatable, false);
    assert.equal(sqMetrics.orientation, 'square');
    assert.equal(sqMetrics.frameStyle, 'hairline-ruler');
    assert.equal(sqMetrics.selectionKey, 'custom-500x500');
    assert.deepEqual(rotateViewportSelection(squareSel), squareSel);
    assert.deepEqual(setSelectionOrientation(squareSel, 'landscape'), squareSel);
  });

  test('resolveFrame validates canonical FRAME_STYLES and non-zero chromeInsets structure', () => {
    const expectedInsets = {
      'phone-ios': { x: 20, y: 20 },
      'phone-android': { x: 16, y: 16 },
      tablet: { x: 28, y: 28 },
      'browser-window': { x: 2, y: 40 },
      'hairline-ruler': { x: 2, y: 22 },
      unframed: { x: 0, y: 0 }
    };
    for (const style of Object.keys(expectedInsets)) {
      assert.ok(FRAME_STYLES.includes(style));
      assert.deepEqual(FRAME_CHROME_INSETS[style], expectedInsets[style]);
    }
    const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
    const pixel = BUILTIN_DEVICES.find((d) => d.id === 'pixel-8');
    const ipad = BUILTIN_DEVICES.find((d) => d.id === 'ipad-air-11');
    const mac = BUILTIN_DEVICES.find((d) => d.id === 'macbook-air-13');

    assert.deepEqual(resolveFrame(selectDevicePreset(iphone), iphone), {
      frameStyle: 'phone-ios',
      chromeInsets: { x: 20, y: 20 }
    });
    assert.deepEqual(resolveFrame(selectDevicePreset(pixel), pixel), {
      frameStyle: 'phone-android',
      chromeInsets: { x: 16, y: 16 }
    });
    assert.deepEqual(resolveFrame(selectDevicePreset(ipad), ipad), {
      frameStyle: 'tablet',
      chromeInsets: { x: 28, y: 28 }
    });
    assert.deepEqual(resolveFrame(selectDevicePreset(mac), mac), {
      frameStyle: 'browser-window',
      chromeInsets: { x: 2, y: 40 }
    });
    assert.deepEqual(resolveFrame(applyCustomViewport(600, 800), null), {
      frameStyle: 'hairline-ruler',
      chromeInsets: { x: 2, y: 22 }
    });
    assert.deepEqual(resolveFrame(createFullSelection(), null), {
      frameStyle: 'unframed',
      chromeInsets: { x: 0, y: 0 }
    });
  });

  test('computeScale enforces containment scaling with chromeInsets and never upscales (INV-RVP-02)', () => {
    const fitScale = computeScale(1600, 1200, 393, 852);
    assert.equal(fitScale, 1.0);

    const availW = 800;
    const availH = 600;
    const targetW = 1920;
    const targetH = 1080;
    const scaled = computeScale(availW, availH, targetW, targetH);
    const expected = Math.min(1, availW / targetW, availH / targetH) * 0.95;
    assert.ok(Math.abs(scaled - expected) < 0.001);
    assert.ok(scaled < 1.0);

    // Fits inner box (413 < 420, 872 > 860 only with chromeInsets)
    assert.equal(computeScale(420, 860, 393, 852, 'px', 'auto'), 1.0);
    const withChrome = computeScale(420, 860, 393, 852, 'px', 'auto', { x: 20, y: 20 });
    assert.ok(withChrome < 1.0);
    assert.ok(Math.abs(withChrome - (860 / 872) * 0.95) < 0.0001);

    // resolveViewportMetrics does not double-count chromeInsets when computing scale
    const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
    const iphoneMetrics = resolveViewportMetrics(selectDevicePreset(iphone), BUILTIN_DEVICES, { width: 420, height: 860 });
    assert.equal(iphoneMetrics.outerWidth, 413);
    assert.equal(iphoneMetrics.outerHeight, 872);
    assert.ok(Math.abs(iphoneMetrics.scale - withChrome) < 0.0001);

    assert.equal(computeScale(800, 600, 100, 100, '%'), 1.0);
    assert.equal(computeScale(800, 600, 1920, 1080, 'px', 'actual', { x: 20, y: 20 }), 1.0);
  });

  test('resolveSafeAreaInsets rotates portrait notch/home indicator insets into landscape', () => {
    const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
    assert.deepEqual(resolveSafeAreaInsets(iphone, 'portrait'), { top: 59, right: 0, bottom: 34, left: 0 });
    assert.deepEqual(resolveSafeAreaInsets(iphone, 'landscape'), { top: 0, right: 34, bottom: 0, left: 59 });
    assert.deepEqual(resolveSafeAreaInsets(null, 'portrait'), { top: 0, right: 0, bottom: 0, left: 0 });
  });

  test('formatDimension formats px and % properly', () => {
    assert.equal(formatDimension(100, '%'), '100%');
    assert.equal(formatDimension(500, 'px'), '500px');
  });
});
