/**
 * RVP-02 & ERB-05 — Declarative Device Preset Registry (Schema v2)
 *
 * Stores device capability profiles (touch, pointer, hover, safe-area insets, mobile flag, user agent)
 * alongside 2D dimensions. Serves as single source of truth for device-sensitive sweeps (INV-DSF-02).
 */

export const STORAGE_KEY_V1 = 'pkc_responsive_lab_devices_v1';
export const STORAGE_KEY = 'pkc_responsive_lab_devices_v2';

/** INV-RVP-03: the closed dimension contract. */
export const DIM_MIN = 100;
export const DIM_MAX = 7680;

export const CATEGORIES = ['phone', 'tablet', 'desktop', 'wearable', 'custom'];

export const CATEGORY_DEFAULTS = Object.freeze({
  phone: { hasTouch: true, isMobile: true, pointer: 'coarse', hover: false, defaultOrientation: 'portrait' },
  tablet: { hasTouch: true, isMobile: true, pointer: 'coarse', hover: false, defaultOrientation: 'portrait' },
  wearable: { hasTouch: true, isMobile: true, pointer: 'coarse', hover: false, defaultOrientation: 'portrait' },
  desktop: { hasTouch: false, isMobile: false, pointer: 'fine', hover: true, defaultOrientation: 'landscape' },
  custom: { hasTouch: false, isMobile: false, pointer: 'fine', hover: true, defaultOrientation: 'portrait' }
});

/**
 * Fills capability fields from category defaults if not specified.
 */
export function withCapabilityDefaults(device) {
  if (!device || typeof device !== 'object') return device;
  const category = CATEGORIES.includes(device.category) ? device.category : 'custom';
  const defaults = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.custom;

  const defaultOrientation = typeof device.defaultOrientation === 'string'
    ? device.defaultOrientation
    : (category === 'custom' && Number.isFinite(device.width) && Number.isFinite(device.height)
      ? (device.width > device.height ? 'landscape' : 'portrait')
      : defaults.defaultOrientation);

  return {
    ...device,
    category,
    hasTouch: typeof device.hasTouch === 'boolean' ? device.hasTouch : defaults.hasTouch,
    isMobile: typeof device.isMobile === 'boolean' ? device.isMobile : defaults.isMobile,
    pointer: (device.pointer === 'coarse' || device.pointer === 'fine') ? device.pointer : defaults.pointer,
    hover: typeof device.hover === 'boolean' ? device.hover : defaults.hover,
    defaultOrientation,
    schemaVersion: 2
  };
}

/**
 * Factory devices (Schema v2).
 */
export const BUILTIN_DEVICES = Object.freeze([
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    category: 'phone',
    width: 393,
    height: 852,
    pixelRatio: 3,
    hasTouch: true,
    isMobile: true,
    pointer: 'coarse',
    hover: false,
    defaultOrientation: 'portrait',
    safeAreaInsets: { top: 59, right: 0, bottom: 34, left: 0 },
    isBuiltin: true,
    schemaVersion: 2
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    category: 'phone',
    width: 375,
    height: 667,
    pixelRatio: 2,
    hasTouch: true,
    isMobile: true,
    pointer: 'coarse',
    hover: false,
    defaultOrientation: 'portrait',
    isBuiltin: true,
    schemaVersion: 2
  },
  {
    id: 'pixel-8',
    name: 'Google Pixel 8',
    category: 'phone',
    width: 412,
    height: 915,
    pixelRatio: 2.625,
    hasTouch: true,
    isMobile: true,
    pointer: 'coarse',
    hover: false,
    defaultOrientation: 'portrait',
    safeAreaInsets: { top: 24, right: 0, bottom: 0, left: 0 },
    isBuiltin: true,
    schemaVersion: 2
  },
  {
    id: 'galaxy-s24',
    name: 'Samsung Galaxy S24',
    category: 'phone',
    width: 360,
    height: 780,
    pixelRatio: 3,
    hasTouch: true,
    isMobile: true,
    pointer: 'coarse',
    hover: false,
    defaultOrientation: 'portrait',
    safeAreaInsets: { top: 24, right: 0, bottom: 0, left: 0 },
    isBuiltin: true,
    schemaVersion: 2
  },
  {
    id: 'ipad-air-11',
    name: 'iPad Air 11"',
    category: 'tablet',
    width: 820,
    height: 1180,
    pixelRatio: 2,
    hasTouch: true,
    isMobile: true,
    pointer: 'coarse',
    hover: false,
    defaultOrientation: 'portrait',
    isBuiltin: true,
    schemaVersion: 2
  },
  {
    id: 'ipad-mini',
    name: 'iPad Mini',
    category: 'tablet',
    width: 744,
    height: 1133,
    pixelRatio: 2,
    hasTouch: true,
    isMobile: true,
    pointer: 'coarse',
    hover: false,
    defaultOrientation: 'portrait',
    isBuiltin: true,
    schemaVersion: 2
  },
  {
    id: 'macbook-air-13',
    name: 'MacBook Air 13"',
    category: 'desktop',
    width: 1280,
    height: 832,
    pixelRatio: 2,
    hasTouch: false,
    isMobile: false,
    pointer: 'fine',
    hover: true,
    defaultOrientation: 'landscape',
    isBuiltin: true,
    schemaVersion: 2
  },
  {
    id: 'desktop-fhd',
    name: 'Desktop 1080p',
    category: 'desktop',
    width: 1920,
    height: 1080,
    pixelRatio: 1,
    hasTouch: false,
    isMobile: false,
    pointer: 'fine',
    hover: true,
    defaultOrientation: 'landscape',
    isBuiltin: true,
    schemaVersion: 2
  }
]);

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/**
 * The aspect ratio of (w, h), derived — never hand-written.
 */
export function aspectRatio(w, h) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '—';
  const g = gcd(Math.round(w), Math.round(h));
  const a = Math.round(w) / g;
  const b = Math.round(h) / g;
  if (a <= 40 && b <= 40) return `${a}:${b}`;
  return `${(Math.max(w, h) / Math.min(w, h)).toFixed(2)}:1`;
}

/** Slugify a device name for use as an id. */
export function slugify(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * INV-RVP-03 & ERB-05 — Validate before injection.
 * Accepts v1 and v2 shapes; checks capability types when present.
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateDevice(data) {
  const errors = [];
  if (!data || typeof data !== 'object') return { valid: false, errors: ['not an object'] };

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) errors.push('name is required');
  else if (name.length > 40) errors.push('name exceeds 40 characters');

  if (data.category !== undefined && !CATEGORIES.includes(data.category)) {
    errors.push(`category must be one of ${CATEGORIES.join(', ')}`);
  }

  for (const axis of ['width', 'height']) {
    const v = data[axis];
    if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
      errors.push(`${axis} must be an integer`);
    } else if (v < DIM_MIN) {
      errors.push(`${axis} must be at least ${DIM_MIN}`);
    } else if (v > DIM_MAX) {
      errors.push(`${axis} must be at most ${DIM_MAX}`);
    }
  }

  if (data.pixelRatio !== undefined) {
    const p = data.pixelRatio;
    if (typeof p !== 'number' || !Number.isFinite(p) || p <= 0 || p > 8) {
      errors.push('pixelRatio must be a positive number up to 8');
    }
  }

  // Capability field validations (Schema v2)
  if (data.hasTouch !== undefined && typeof data.hasTouch !== 'boolean') {
    errors.push('hasTouch must be a boolean');
  }

  if (data.isMobile !== undefined && typeof data.isMobile !== 'boolean') {
    errors.push('isMobile must be a boolean');
  }

  if (data.hover !== undefined && typeof data.hover !== 'boolean') {
    errors.push('hover must be a boolean');
  }

  if (data.pointer !== undefined && data.pointer !== 'coarse' && data.pointer !== 'fine') {
    errors.push("pointer must be 'coarse' or 'fine'");
  }

  if (
    data.defaultOrientation !== undefined &&
    data.defaultOrientation !== 'portrait' &&
    data.defaultOrientation !== 'landscape'
  ) {
    errors.push("defaultOrientation must be 'portrait' or 'landscape'");
  }

  if (data.userAgent !== undefined && typeof data.userAgent !== 'string') {
    errors.push('userAgent must be a string');
  }

  if (data.safeAreaInsets !== undefined) {
    const insets = data.safeAreaInsets;
    if (
      !insets ||
      typeof insets !== 'object' ||
      typeof insets.top !== 'number' ||
      typeof insets.right !== 'number' ||
      typeof insets.bottom !== 'number' ||
      typeof insets.left !== 'number' ||
      insets.top < 0 ||
      insets.right < 0 ||
      insets.bottom < 0 ||
      insets.left < 0
    ) {
      errors.push('safeAreaInsets must contain non-negative numbers { top, right, bottom, left }');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * The registry. INV-RVP-04: every mutation persists, and unusable storage
 * degrades to the factory set without a user-facing error.
 */
export class DeviceRegistry {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.listeners = new Set();
    this.devices = this.#load();
  }

  // ── querying ──────────────────────────────────────────────────────────────

  getAll() {
    return this.devices.map((d) => ({ ...d }));
  }

  getByCategory(category) {
    return this.getAll().filter((d) => d.category === category);
  }

  getById(id) {
    const found = this.devices.find((d) => d.id === id);
    return found ? { ...found } : null;
  }

  // ── mutations ─────────────────────────────────────────────────────────────

  /** @returns {Object} the created device (throws on an invalid payload) */
  add(data) {
    const payload = withCapabilityDefaults({
      name: typeof data?.name === 'string' ? data.name.trim() : data?.name,
      category: data?.category ?? 'custom',
      width: data?.width,
      height: data?.height,
      pixelRatio: data?.pixelRatio ?? 1,
      hasTouch: data?.hasTouch,
      isMobile: data?.isMobile,
      pointer: data?.pointer,
      hover: data?.hover,
      defaultOrientation: data?.defaultOrientation,
      userAgent: data?.userAgent,
      safeAreaInsets: data?.safeAreaInsets
    });

    const { valid, errors } = validateDevice(payload);
    if (!valid) {
      const err = new Error(`invalid device: ${errors.join('; ')}`);
      err.validationErrors = errors;
      throw err;
    }

    const device = {
      ...payload,
      id: this.#uniqueId(data?.id ? slugify(data.id) : slugify(payload.name)),
      isBuiltin: false,
      createdAt: new Date().toISOString()
    };
    this.devices.push(device);
    this.#commit('add', device);
    return { ...device };
  }

  update(id, updates = {}) {
    const i = this.devices.findIndex((d) => d.id === id);
    if (i === -1) throw new Error(`no device with id ${id}`);

    const next = withCapabilityDefaults({ ...this.devices[i], ...updates, id: this.devices[i].id });
    const { valid, errors } = validateDevice(next);
    if (!valid) {
      const err = new Error(`invalid device: ${errors.join('; ')}`);
      err.validationErrors = errors;
      throw err;
    }
    this.devices[i] = next;
    this.#commit('update', { ...next });
    return { ...next };
  }

  /** @returns {boolean} false when the id is unknown or the device is built-in */
  remove(id) {
    const device = this.devices.find((d) => d.id === id);
    if (!device) return false;
    if (device.isBuiltin) return false;
    this.devices = this.devices.filter((d) => d.id !== id);
    this.#commit('remove', device);
    return true;
  }

  resetToDefaults() {
    this.devices = BUILTIN_DEVICES.map((d) => ({ ...d }));
    this.#commit('reset', null);
  }

  // ── reactivity ────────────────────────────────────────────────────────────

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('listener must be a function');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── internals ─────────────────────────────────────────────────────────────

  #uniqueId(base) {
    const seed = base || 'device';
    if (!this.devices.some((d) => d.id === seed)) return seed;
    let n = 2;
    while (this.devices.some((d) => d.id === `${seed}-${n}`)) n += 1;
    return `${seed}-${n}`;
  }

  #commit(event, device) {
    this.#persist();
    for (const listener of [...this.listeners]) {
      try {
        listener(event, device);
      } catch (e) {
        console.warn('[DeviceRegistry] subscriber threw', e);
      }
    }
  }

  #persist() {
    try {
      const json = JSON.stringify(this.devices);
      localStorage.setItem(this.storageKey, json);
      // Dual-write to v1 key for backward compatibility
      localStorage.setItem(STORAGE_KEY_V1, json);
    } catch (e) {
      console.warn('[DeviceRegistry] could not persist registry', e);
    }
  }

  #seed() {
    return BUILTIN_DEVICES.map((d) => ({ ...d }));
  }

  /**
   * INV-RVP-04 & ERB-05 §5.2: read storage with idempotent migration from v1 to v2.
   */
  #load() {
    let raw = null;
    let fromV1 = false;

    try {
      raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        // Attempt idempotent v1 migration
        const v1Raw = localStorage.getItem(STORAGE_KEY_V1);
        if (v1Raw) {
          raw = v1Raw;
          fromV1 = true;
        }
      }
    } catch {
      return this.#seed();
    }

    if (!raw) {
      const seed = this.#seed();
      this.#write(seed);
      return seed;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('stored registry is not an array');

      const kept = parsed
        .map((d) => (fromV1 ? withCapabilityDefaults(d) : d))
        .filter((d) => {
          const { valid } = validateDevice(d);
          if (!valid) console.warn('[DeviceRegistry] dropped an invalid stored record', d);
          return valid;
        });

      const byId = new Map(kept.map((d) => [d.id, { ...d }]));
      for (const b of BUILTIN_DEVICES) byId.set(b.id, { ...b, ...(byId.get(b.id) ?? {}), isBuiltin: true });
      const merged = [...byId.values()];
      this.#write(merged);
      return merged;
    } catch (e) {
      console.warn('[DeviceRegistry] storage unusable; seeding factory defaults', e);
      const seed = this.#seed();
      this.#write(seed);
      return seed;
    }
  }

  #write(devices) {
    try {
      const json = JSON.stringify(devices);
      localStorage.setItem(this.storageKey, json);
      // Dual write to v1 for backwards compatibility with legacy tests
      localStorage.setItem(STORAGE_KEY_V1, json);
    } catch (e) {
      console.warn('[DeviceRegistry] could not repair stored registry', e);
    }
  }
}

export default DeviceRegistry;
