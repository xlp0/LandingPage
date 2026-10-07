/**
 * RVP-02 — Declarative Device Preset Registry
 *
 * The lab's screen sizes were five static HTML buttons carrying `data-width`
 * only. This replaces them with a schema-validated, persisted registry so
 * presets can be added, edited and removed at runtime.
 *
 * Zero dependencies (INV-RVP-05): vanilla ESM plus Web Storage. Nothing here
 * touches the DOM or `clm/` (INV-REF-01) — the registry is a pure store, and
 * `responsive-lab.html` is the only consumer that renders it.
 */

export const STORAGE_KEY = 'pkc_responsive_lab_devices_v1';

/** INV-RVP-03: the closed dimension contract. */
export const DIM_MIN = 100;
export const DIM_MAX = 7680;

export const CATEGORIES = ['phone', 'tablet', 'desktop', 'wearable', 'custom'];

/**
 * Factory devices. Dimensions are portrait, in CSS pixels.
 *
 * No ratio is stored: the aspect ratio is *computed* from the dimensions, so a
 * label can never drift from the geometry it describes. (An earlier draft of
 * the catalog hand-wrote these, and two of them were wrong — 820x1180 was
 * labelled 4:3 and 1280x832 as 16:10, when they are 1.44:1 and 20:13.)
 */
export const BUILTIN_DEVICES = Object.freeze([
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', category: 'phone', width: 393, height: 852, pixelRatio: 3, isBuiltin: true },
  { id: 'iphone-se', name: 'iPhone SE', category: 'phone', width: 375, height: 667, pixelRatio: 2, isBuiltin: true },
  { id: 'pixel-8', name: 'Google Pixel 8', category: 'phone', width: 412, height: 915, pixelRatio: 2.625, isBuiltin: true },
  { id: 'galaxy-s24', name: 'Samsung Galaxy S24', category: 'phone', width: 360, height: 780, pixelRatio: 3, isBuiltin: true },
  { id: 'ipad-air-11', name: 'iPad Air 11"', category: 'tablet', width: 820, height: 1180, pixelRatio: 2, isBuiltin: true },
  { id: 'ipad-mini', name: 'iPad Mini', category: 'tablet', width: 744, height: 1133, pixelRatio: 2, isBuiltin: true },
  { id: 'macbook-air-13', name: 'MacBook Air 13"', category: 'desktop', width: 1280, height: 832, pixelRatio: 2, isBuiltin: true },
  { id: 'desktop-fhd', name: 'Desktop 1080p', category: 'desktop', width: 1920, height: 1080, pixelRatio: 1, isBuiltin: true },
]);

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/**
 * The aspect ratio of (w, h), derived — never hand-written.
 *
 * The reduced fraction is used when it stays readable (`1920x1080 -> 16:9`);
 * otherwise the ratio is normalised to the larger side (`820x1180 -> 1.44:1`),
 * because `131:284` is exact but unreadable.
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
 * INV-RVP-03 — validate before injection.
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
    if (typeof p !== 'number' || !Number.isFinite(p) || p <= 0) {
      errors.push('pixelRatio must be a positive number');
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

  /** @returns {DevicePreset} the created device (throws on an invalid payload) */
  add(data) {
    const payload = {
      name: typeof data?.name === 'string' ? data.name.trim() : data?.name,
      category: data?.category ?? 'custom',
      width: data?.width,
      height: data?.height,
      pixelRatio: data?.pixelRatio,
    };
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
      createdAt: new Date().toISOString(),
    };
    this.devices.push(device);
    this.#commit('add', device);
    return { ...device };
  }

  update(id, updates = {}) {
    const i = this.devices.findIndex((d) => d.id === id);
    if (i === -1) throw new Error(`no device with id ${id}`);

    const next = { ...this.devices[i], ...updates, id: this.devices[i].id };
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
    // INV-RVP-03: a factory device is immutable; only resetToDefaults clears it
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

  /** @returns {() => void} unsubscribe */
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
      localStorage.setItem(this.storageKey, JSON.stringify(this.devices));
    } catch (e) {
      // a full or unavailable store must not break the workbench
      console.warn('[DeviceRegistry] could not persist registry', e);
    }
  }

  #seed() {
    return BUILTIN_DEVICES.map((d) => ({ ...d }));
  }

  /**
   * INV-RVP-04: read storage, keep only what validates, and guarantee the
   * factory set is present. Any failure — absent, malformed, wrong shape —
   * falls back to the factory devices silently, and the store is repaired so
   * the warning does not repeat on every load.
   */
  #load() {
    let raw = null;
    try {
      raw = localStorage.getItem(this.storageKey);
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

      const kept = parsed.filter((d) => {
        const { valid } = validateDevice(d);
        if (!valid) console.warn('[DeviceRegistry] dropped an invalid stored record', d);
        return valid;
      });

      const byId = new Map(kept.map((d) => [d.id, { ...d }]));
      // factory devices are authoritative: re-seed any that storage lost
      for (const b of BUILTIN_DEVICES) byId.set(b.id, { ...b, ...(byId.get(b.id) ?? {}), isBuiltin: true });
      const merged = [...byId.values()];
      if (merged.length !== parsed.length) this.#write(merged);
      return merged;
    } catch (e) {
      console.warn('[DeviceRegistry] storage unusable; seeding factory defaults', e);
      const seed = this.#seed();
      this.#write(seed);   // self-heal: the next load is clean
      return seed;
    }
  }

  /** Write without notifying subscribers (used during construction). */
  #write(devices) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(devices));
    } catch (e) {
      console.warn('[DeviceRegistry] could not repair stored registry', e);
    }
  }
}

export default DeviceRegistry;
