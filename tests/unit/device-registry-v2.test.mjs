import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_DEVICES,
  FRAME_STYLES,
  validateDevice,
  withCapabilityDefaults,
  DeviceRegistry,
  STORAGE_KEY,
  STORAGE_KEY_V1
} from '../../js/device-registry.js';

describe('Device Registry Schema v2 (INV-DSF-02)', () => {
  test('all 12 built-in devices carry valid v2 capability fields and frameStyle', () => {
    assert.equal(BUILTIN_DEVICES.length, 12);
    for (const d of BUILTIN_DEVICES) {
      assert.equal(d.schemaVersion, 2);
      assert.equal(typeof d.hasTouch, 'boolean');
      assert.equal(typeof d.isMobile, 'boolean');
      assert.ok(d.pointer === 'coarse' || d.pointer === 'fine');
      assert.equal(typeof d.hover, 'boolean');
      assert.ok(d.defaultOrientation === 'portrait' || d.defaultOrientation === 'landscape');
      assert.ok(FRAME_STYLES.includes(d.frameStyle), `missing/invalid frameStyle on ${d.id}`);

      const { valid, errors } = validateDevice(d);
      assert.equal(valid, true, `device ${d.id} failed validation: ${errors.join(', ')}`);
    }

    // Check specific safe-area insets and reconciled mcard.yaml form factor presets
    const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
    assert.deepEqual(iphone.safeAreaInsets, { top: 59, right: 0, bottom: 34, left: 0 });

    const iphoneSe = BUILTIN_DEVICES.find((d) => d.id === 'iphone-se');
    assert.deepEqual(iphoneSe.safeAreaInsets, { top: 20, right: 0, bottom: 0, left: 0 });
    assert.equal(iphoneSe.frameStyle, 'phone-ios');

    const pixel = BUILTIN_DEVICES.find((d) => d.id === 'pixel-8');
    assert.deepEqual(pixel.safeAreaInsets, { top: 24, right: 0, bottom: 0, left: 0 });

    const desktop = BUILTIN_DEVICES.find((d) => d.id === 'macbook-air-13');
    assert.equal(desktop.hasTouch, false);
    assert.equal(desktop.hover, true);
    assert.equal(desktop.pointer, 'fine');
    assert.equal(desktop.frameStyle, 'browser-window');

    for (const [id, w, h] of [
      ['mobile-large', 430, 932],
      ['tablet-standard', 768, 1024],
      ['desktop-standard', 1440, 900],
      ['desktop-ultrawide', 2560, 1080]
    ]) {
      const found = BUILTIN_DEVICES.find((d) => d.id === id);
      assert.ok(found, `missing built-in preset ${id}`);
      assert.equal(found.width, w);
      assert.equal(found.height, h);
    }
  });

  test('validateDevice rejects invalid capability and frameStyle fields', () => {
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, hasTouch: 'yes' }).valid, false);
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, pointer: 'invalid' }).valid, false);
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, defaultOrientation: 'diagonal' }).valid, false);
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, frameStyle: 'crt-tv' }).valid, false);
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, safeAreaInsets: { top: -5 } }).valid, false);
  });

  test('withCapabilityDefaults populates expected defaults and wearable maps to hairline-ruler', () => {
    const phone = withCapabilityDefaults({ name: 'Phone', category: 'phone', width: 400, height: 800 });
    assert.equal(phone.hasTouch, true);
    assert.equal(phone.isMobile, true);
    assert.equal(phone.pointer, 'coarse');
    assert.equal(phone.hover, false);
    assert.equal(phone.defaultOrientation, 'portrait');
    assert.equal(phone.frameStyle, 'phone-android');

    const wearable = withCapabilityDefaults({ name: 'Watch', category: 'wearable', width: 220, height: 260 });
    assert.equal(wearable.frameStyle, 'hairline-ruler');

    const desktop = withCapabilityDefaults({ name: 'Desk', category: 'desktop', width: 1200, height: 800 });
    assert.equal(desktop.hasTouch, false);
    assert.equal(desktop.isMobile, false);
    assert.equal(desktop.pointer, 'fine');
    assert.equal(desktop.hover, true);
    assert.equal(desktop.defaultOrientation, 'landscape');
    assert.equal(desktop.frameStyle, 'browser-window');

    const custom = withCapabilityDefaults({ name: 'Custom', category: 'custom', width: 1000, height: 500 });
    assert.equal(custom.defaultOrientation, 'landscape');
    assert.equal(custom.frameStyle, 'hairline-ruler');
  });

  test('idempotent migration from v1, builtin code-wins #load() merge, and DeviceRegistry.add frameStyle forwarding', () => {
    const prevStorage = globalThis.localStorage;
    const mockStorage = new Map();
    globalThis.localStorage = {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k)
    };

    try {
      const v1Data = [
        { id: 'custom-v1', name: 'Legacy Phone', category: 'phone', width: 380, height: 800, isBuiltin: false }
      ];
      mockStorage.set(STORAGE_KEY_V1, JSON.stringify(v1Data));

      const registry = new DeviceRegistry(STORAGE_KEY);
      const custom = registry.getById('custom-v1');
      assert.ok(custom);
      assert.equal(custom.schemaVersion, 2);
      assert.equal(custom.hasTouch, true);
      assert.equal(custom.pointer, 'coarse');
      assert.equal(custom.frameStyle, 'phone-android');

      // Forward explicit frameStyle on add()
      const added = registry.add({
        name: 'Kiosk Display',
        category: 'custom',
        width: 1080,
        height: 1920,
        frameStyle: 'browser-window'
      });
      assert.equal(added.frameStyle, 'browser-window');

      // Simulate stale cached builtin missing frameStyle and safeAreaInsets in v2 storage
      const staleV2 = [
        { id: 'iphone-se', name: 'Old SE', category: 'phone', width: 375, height: 667, isBuiltin: true, schemaVersion: 2 },
        added
      ];
      mockStorage.set(STORAGE_KEY, JSON.stringify(staleV2));

      const registryReloaded = new DeviceRegistry(STORAGE_KEY);
      const upgradedSe = registryReloaded.getById('iphone-se');
      assert.equal(upgradedSe.frameStyle, 'phone-ios');
      assert.deepEqual(upgradedSe.safeAreaInsets, { top: 20, right: 0, bottom: 0, left: 0 });
      assert.equal(registryReloaded.getById(added.id).frameStyle, 'browser-window');
      assert.equal(registryReloaded.getAll().filter((d) => d.isBuiltin).length, 12);

      assert.ok(mockStorage.has(STORAGE_KEY_V1));
      assert.ok(mockStorage.has(STORAGE_KEY));
    } finally {
      if (prevStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prevStorage;
    }
  });
});
