import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILTIN_DEVICES,
  validateDevice,
  withCapabilityDefaults,
  DeviceRegistry,
  STORAGE_KEY,
  STORAGE_KEY_V1
} from '../../js/device-registry.js';

describe('Device Registry Schema v2 (INV-DSF-02)', () => {
  test('all 8 built-in devices carry valid v2 capability fields', () => {
    assert.equal(BUILTIN_DEVICES.length, 8);
    for (const d of BUILTIN_DEVICES) {
      assert.equal(d.schemaVersion, 2);
      assert.equal(typeof d.hasTouch, 'boolean');
      assert.equal(typeof d.isMobile, 'boolean');
      assert.ok(d.pointer === 'coarse' || d.pointer === 'fine');
      assert.equal(typeof d.hover, 'boolean');
      assert.ok(d.defaultOrientation === 'portrait' || d.defaultOrientation === 'landscape');

      const { valid, errors } = validateDevice(d);
      assert.equal(valid, true, `device ${d.id} failed validation: ${errors.join(', ')}`);
    }

    // Check specific safe-area insets
    const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
    assert.deepEqual(iphone.safeAreaInsets, { top: 59, right: 0, bottom: 34, left: 0 });

    const pixel = BUILTIN_DEVICES.find((d) => d.id === 'pixel-8');
    assert.deepEqual(pixel.safeAreaInsets, { top: 24, right: 0, bottom: 0, left: 0 });

    const desktop = BUILTIN_DEVICES.find((d) => d.id === 'macbook-air-13');
    assert.equal(desktop.hasTouch, false);
    assert.equal(desktop.hover, true);
    assert.equal(desktop.pointer, 'fine');
  });

  test('validateDevice rejects invalid capability field types', () => {
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, hasTouch: 'yes' }).valid, false);
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, pointer: 'invalid' }).valid, false);
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, defaultOrientation: 'diagonal' }).valid, false);
    assert.equal(validateDevice({ name: 'Test', width: 400, height: 800, safeAreaInsets: { top: -5 } }).valid, false);
  });

  test('withCapabilityDefaults populates expected defaults per category', () => {
    const phone = withCapabilityDefaults({ name: 'Phone', category: 'phone', width: 400, height: 800 });
    assert.equal(phone.hasTouch, true);
    assert.equal(phone.isMobile, true);
    assert.equal(phone.pointer, 'coarse');
    assert.equal(phone.hover, false);
    assert.equal(phone.defaultOrientation, 'portrait');

    const desktop = withCapabilityDefaults({ name: 'Desk', category: 'desktop', width: 1200, height: 800 });
    assert.equal(desktop.hasTouch, false);
    assert.equal(desktop.isMobile, false);
    assert.equal(desktop.pointer, 'fine');
    assert.equal(desktop.hover, true);
    assert.equal(desktop.defaultOrientation, 'landscape');

    const custom = withCapabilityDefaults({ name: 'Custom', category: 'custom', width: 1000, height: 500 });
    assert.equal(custom.defaultOrientation, 'landscape'); // derived from w > h
  });

  test('idempotent migration from v1 to v2 preserving v1', () => {
    // Setup mock localStorage in Node
    const mockStorage = new Map();
    globalThis.localStorage = {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k)
    };

    // Pre-populate v1 with a custom device
    const v1Data = [
      { id: 'custom-v1', name: 'Legacy Phone', category: 'phone', width: 380, height: 800, isBuiltin: false }
    ];
    mockStorage.set(STORAGE_KEY_V1, JSON.stringify(v1Data));

    // Initialize registry
    const registry = new DeviceRegistry(STORAGE_KEY);
    const custom = registry.getById('custom-v1');
    assert.ok(custom);
    assert.equal(custom.schemaVersion, 2);
    assert.equal(custom.hasTouch, true);
    assert.equal(custom.pointer, 'coarse');

    // Verify v1 data is still present and intact
    assert.ok(mockStorage.has(STORAGE_KEY_V1));
    assert.ok(mockStorage.has(STORAGE_KEY));

    // Second initialization is idempotent
    const registry2 = new DeviceRegistry(STORAGE_KEY);
    assert.equal(registry2.getById('custom-v1').name, 'Legacy Phone');
  });
});
