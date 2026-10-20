/**
 * Viewport Geometry Utilities (Pure ESM, zero DOM dependencies)
 * Implements INV-RVP-01 (Dynamic 2D Geometry & Rotation) and INV-RVP-02 (Containment Scaling)
 */

export const DIM_MIN = 100;
export const DIM_MAX = 7680;

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
  return w > h ? 'landscape' : 'portrait';
}

/**
 * Invariant INV-RVP-01: Rotation is a symmetric dimension swap.
 * Rotating twice is identity.
 */
export function rotateViewport(viewport) {
  const nextOrient = viewport.orientation === 'horizontal' ? 'vertical' : 'horizontal';
  return {
    ...viewport,
    width: viewport.height,
    height: viewport.width,
    orientation: nextOrient
  };
}

/**
 * Invariant INV-RVP-02: Containment scale factor calculation.
 * s = min(1, availW / targetW, availH / targetH).
 * Never upscales a device that fits.
 */
export function computeScale(availW, availH, targetW, targetH, unit = 'px', scaleMode = 'auto') {
  if (unit === '%') return 1;
  if (!availW || !availH || !targetW || !targetH) return 1;
  if (scaleMode === 'actual') return 1;

  const s = Math.min(1, availW / targetW, availH / targetH);
  if (s >= 1) return 1;
  return s * 0.95; // 5% containment margin when scaled
}
