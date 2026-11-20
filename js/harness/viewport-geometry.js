/**
 * Viewport Geometry & Selection Domain Model (Pure ESM, zero DOM dependencies)
 * Implements INV-RVP-01 (Dynamic 2D Geometry & Rotation) and INV-RVP-02 (Containment Scaling)
 */

export const DIM_MIN = 100;
export const DIM_MAX = 7680;

export const FRAME_STYLES = Object.freeze([
  'phone-ios',
  'phone-android',
  'tablet',
  'browser-window',
  'hairline-ruler',
  'unframed'
]);

export const FRAME_CHROME_INSETS = Object.freeze({
  'phone-ios': Object.freeze({ x: 20, y: 20 }),
  'phone-android': Object.freeze({ x: 16, y: 16 }),
  tablet: Object.freeze({ x: 28, y: 28 }),
  'browser-window': Object.freeze({ x: 2, y: 40 }),
  'hairline-ruler': Object.freeze({ x: 2, y: 22 }),
  unframed: Object.freeze({ x: 0, y: 0 })
});

export function getFrameChromeInsets(frameStyle) {
  const insets = FRAME_CHROME_INSETS[frameStyle] || FRAME_CHROME_INSETS.unframed;
  return { x: insets.x, y: insets.y };
}

/**
 * Clamp a dimension value within valid bounds [DIM_MIN, DIM_MAX].
 */
export function clampDimension(raw, fallback = 390) {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(DIM_MAX, Math.max(DIM_MIN, n));
}

/**
 * Compute Greatest Common Divisor (Euclidean algorithm).
 */
export function gcd(a, b) {
  let x = Math.round(Math.abs(a));
  let y = Math.round(Math.abs(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Format aspect ratio string using GCD when small or decimal when large (INV-RVP-02 standard).
 */
export function aspectRatio(w, h) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '—';
  const g = gcd(Math.round(w), Math.round(h));
  const a = Math.round(w) / g;
  const b = Math.round(h) / g;
  if (a <= 40 && b <= 40) return `${a}:${b}`;
  return `${(Math.max(w, h) / Math.min(w, h)).toFixed(2)}:1`;
}

/**
 * Format dimension with unit.
 */
export function formatDimension(v, unit = 'px') {
  return unit === '%' ? `${v}%` : (Number.isFinite(v) ? `${v}px` : String(v));
}

/**
 * Derive user-facing orientation from dimensions.
 */
export function deriveOrientation(w, h) {
  if (w === h) return 'square';
  return w > h ? 'landscape' : 'portrait';
}

export function createFullSelection() {
  return { kind: 'full' };
}

export function selectDevicePreset(device) {
  if (!device || typeof device !== 'object' || !device.id) {
    return createFullSelection();
  }
  const orientation =
    device.defaultOrientation === 'landscape'
      ? 'landscape'
      : device.defaultOrientation === 'portrait'
        ? 'portrait'
        : device.width > device.height
          ? 'landscape'
          : 'portrait';
  return {
    kind: 'preset',
    deviceId: String(device.id),
    orientation
  };
}

export function applyCustomViewport(width, height, label = '') {
  const w = clampDimension(width, 390);
  const h = clampDimension(height, 852);
  return {
    kind: 'custom',
    width: w,
    height: h,
    label: label || `Custom (${w}×${h})`
  };
}

function lookupDevice(deviceId, registry = null) {
  if (!deviceId || !registry) return null;
  if (typeof registry.getById === 'function') {
    return registry.getById(deviceId) || null;
  }
  if (registry instanceof Map) {
    return registry.get(deviceId) || null;
  }
  if (Array.isArray(registry)) {
    return registry.find((d) => d && d.id === deviceId) || null;
  }
  if (typeof registry === 'object' && registry.id === deviceId) {
    return registry;
  }
  return null;
}

export function isSelectionRotatable(selection, registry = null) {
  if (!selection || selection.kind === 'full') return false;
  if (selection.kind === 'custom') {
    return selection.width !== selection.height;
  }
  if (selection.kind === 'preset') {
    const dev = lookupDevice(selection.deviceId, registry);
    if (dev && dev.width === dev.height) return false;
    return true;
  }
  return false;
}

/**
 * Invariant INV-RVP-01: Rotation swaps active dimensions on rotatable selections.
 * Full (100%) and square custom selections are non-rotatable no-ops.
 */
export function rotateViewportSelection(selection, registry = null) {
  if (!selection || selection.kind === 'full') {
    return createFullSelection();
  }
  if (!isSelectionRotatable(selection, registry)) {
    return { ...selection };
  }
  if (selection.kind === 'preset') {
    return {
      kind: 'preset',
      deviceId: selection.deviceId,
      orientation: selection.orientation === 'landscape' ? 'portrait' : 'landscape'
    };
  }
  if (selection.kind === 'custom') {
    const nextW = selection.height;
    const nextH = selection.width;
    return {
      kind: 'custom',
      width: nextW,
      height: nextH,
      label: `Custom (${nextW}×${nextH})`
    };
  }
  return { ...selection };
}

export function setSelectionOrientation(selection, targetOrientation, registry = null) {
  if (!selection || selection.kind === 'full') {
    return createFullSelection();
  }
  if (targetOrientation !== 'portrait' && targetOrientation !== 'landscape') {
    return { ...selection };
  }
  if (!isSelectionRotatable(selection, registry)) {
    return { ...selection };
  }
  if (selection.kind === 'preset') {
    return {
      kind: 'preset',
      deviceId: selection.deviceId,
      orientation: targetOrientation
    };
  }
  if (selection.kind === 'custom') {
    const minDim = Math.min(selection.width, selection.height);
    const maxDim = Math.max(selection.width, selection.height);
    const nextW = targetOrientation === 'landscape' ? maxDim : minDim;
    const nextH = targetOrientation === 'landscape' ? minDim : maxDim;
    return {
      kind: 'custom',
      width: nextW,
      height: nextH,
      label: `Custom (${nextW}×${nextH})`
    };
  }
  return { ...selection };
}

export function resolveSafeAreaInsets(device = null, orientation = 'portrait') {
  const raw = device?.safeAreaInsets;
  if (!raw || typeof raw !== 'object') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const top = Number.isFinite(raw.top) ? Math.max(0, raw.top) : 0;
  const right = Number.isFinite(raw.right) ? Math.max(0, raw.right) : 0;
  const bottom = Number.isFinite(raw.bottom) ? Math.max(0, raw.bottom) : 0;
  const left = Number.isFinite(raw.left) ? Math.max(0, raw.left) : 0;
  if (orientation === 'landscape') {
    return { top: right, right: bottom, bottom: left, left: top };
  }
  return { top, right, bottom, left };
}

export function resolveFrame(selection, device = null) {
  let frameStyle = 'hairline-ruler';
  if (!selection || selection.kind === 'full') {
    frameStyle = 'unframed';
  } else if (selection.kind === 'custom') {
    frameStyle = 'hairline-ruler';
  } else if (selection.kind === 'preset') {
    if (device?.frameStyle && FRAME_STYLES.includes(device.frameStyle)) {
      frameStyle = device.frameStyle;
    } else {
      switch (device?.category) {
        case 'phone':
          frameStyle = String(device.id || '').includes('iphone') ? 'phone-ios' : 'phone-android';
          break;
        case 'tablet':
          frameStyle = 'tablet';
          break;
        case 'desktop':
          frameStyle = 'browser-window';
          break;
        case 'wearable':
        default:
          frameStyle = 'hairline-ruler';
          break;
      }
    }
  }
  return { frameStyle, chromeInsets: getFrameChromeInsets(frameStyle) };
}

/**
 * Invariant INV-RVP-02: Containment scale factor calculation.
 * s = min(1, availW / effW, availH / effH).
 * Never upscales a device that fits.
 */
export function computeScale(
  availW,
  availH,
  targetW,
  targetH,
  unit = 'px',
  scaleMode = 'auto',
  chromeInsets = null
) {
  if (unit === '%') return 1;
  const insetX = Number.isFinite(chromeInsets?.x) ? Math.max(0, chromeInsets.x) : 0;
  const insetY = Number.isFinite(chromeInsets?.y) ? Math.max(0, chromeInsets.y) : 0;
  const effW = targetW + insetX;
  const effH = targetH + insetY;
  if (!availW || !availH || !effW || !effH) return 1;
  if (scaleMode === 'actual') return 1;

  const s = Math.min(1, availW / effW, availH / effH);
  if (s >= 1) return 1;
  return s * 0.95; // 5% containment margin when scaled
}

export function resolveViewportMetrics(selection, registry = null, containerRect = null, scaleMode = 'auto') {
  const availW = Number.isFinite(containerRect?.width) ? Math.max(0, Math.round(containerRect.width)) : 0;
  const availH = Number.isFinite(containerRect?.height) ? Math.max(0, Math.round(containerRect.height)) : 0;

  if (selection?.kind === 'preset') {
    const device = lookupDevice(selection.deviceId, registry);
    if (device) {
      const isSquare = device.width === device.height;
      const orientation = isSquare
        ? 'square'
        : selection.orientation === 'landscape'
          ? 'landscape'
          : 'portrait';
      const minDim = Math.min(device.width, device.height);
      const maxDim = Math.max(device.width, device.height);
      const innerW = isSquare ? device.width : orientation === 'landscape' ? maxDim : minDim;
      const innerH = isSquare ? device.height : orientation === 'landscape' ? minDim : maxDim;
      const { frameStyle, chromeInsets } = resolveFrame(selection, device);
      const outerW = innerW + chromeInsets.x;
      const outerH = innerH + chromeInsets.y;
      return {
        kind: 'preset',
        selectionKey: device.id,
        deviceId: device.id,
        device,
        label: device.name,
        width: innerW,
        height: innerH,
        measuredWidth: availW,
        measuredHeight: availH,
        outerWidth: outerW,
        outerHeight: outerH,
        unit: 'px',
        orientation,
        rotatable: !isSquare,
        scale: computeScale(availW, availH, outerW, outerH, 'px', scaleMode),
        frameStyle,
        chromeInsets,
        safeAreaInsets: resolveSafeAreaInsets(device, orientation)
      };
    }
  }

  if (selection?.kind === 'custom') {
    const innerW = clampDimension(selection.width, 390);
    const innerH = clampDimension(selection.height, 852);
    const orientation = deriveOrientation(innerW, innerH);
    const { frameStyle, chromeInsets } = resolveFrame(selection, null);
    const outerW = innerW + chromeInsets.x;
    const outerH = innerH + chromeInsets.y;
    return {
      kind: 'custom',
      selectionKey: `custom-${innerW}x${innerH}`,
      deviceId: null,
      device: null,
      label: selection.label || `Custom (${innerW}×${innerH})`,
      width: innerW,
      height: innerH,
      measuredWidth: availW,
      measuredHeight: availH,
      outerWidth: outerW,
      outerHeight: outerH,
      unit: 'px',
      orientation,
      rotatable: innerW !== innerH,
      scale: computeScale(availW, availH, outerW, outerH, 'px', scaleMode),
      frameStyle,
      chromeInsets,
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 }
    };
  }

  return {
    kind: 'full',
    selectionKey: 'viewport-full',
    deviceId: null,
    device: null,
    label: 'Full (100%)',
    width: 100,
    height: 100,
    measuredWidth: availW,
    measuredHeight: availH,
    outerWidth: availW,
    outerHeight: availH,
    unit: '%',
    orientation: 'responsive',
    rotatable: false,
    scale: 1,
    frameStyle: 'unframed',
    chromeInsets: { x: 0, y: 0 },
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 }
  };
}
