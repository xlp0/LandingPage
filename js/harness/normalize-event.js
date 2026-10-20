/**
 * Scale-Free Event Normalization & Touch Ergonomics (INV-ERB-02, INV-DEV-02, INV-PRV-01)
 * Pure functions: calculates unscaled relative spatial coordinates, selector priority,
 * redaction, and touch-target sizing audits.
 */

const ALLOWED_CONTROL_KEYS = new Set([
  'Enter',
  'Escape',
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'Backspace'
]);

const SENSITIVE_AUTOCOMPLETE = new Set([
  'cc-number',
  'cc-exp',
  'cc-csc',
  'current-password',
  'new-password',
  'one-time-code'
]);

/**
 * Normalizes coordinates against unscaled child viewport dimensions.
 * Clamped to [0.0, 1.0] and rounded to 4 decimals.
 */
export function computeNormalizedCoords(clientX, clientY, viewportWidth, viewportHeight) {
  const w = viewportWidth || 1;
  const h = viewportHeight || 1;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const round4 = (v) => Math.round(v * 10000) / 10000;

  return {
    nx: round4(clamp(clientX / w)),
    ny: round4(clamp(clientY / h))
  };
}

/**
 * Derives robust selector according to strict priority:
 * 1. [data-testid]
 * 2. #id (if valid)
 * 3. [aria-label] + role/tag
 * 4. CSS path (up to 5 levels with :nth-of-type)
 */
export function deriveSelector(el) {
  if (!el || typeof el !== 'object') return '';

  // 1. data-testid
  const testId = el.dataset?.testid || (typeof el.getAttribute === 'function' ? el.getAttribute('data-testid') : null);
  if (testId) return `[data-testid="${testId}"]`;

  // 2. #id
  if (el.id && typeof el.id === 'string' && el.id.trim() && !el.id.includes(':')) {
    return `#${el.id.trim()}`;
  }

  const tag = (el.tagName || '').toLowerCase();

  // 3. aria-label + role/tag
  const ariaLabel = typeof el.getAttribute === 'function' ? el.getAttribute('aria-label') : null;
  if (ariaLabel) {
    return `${tag}[aria-label="${ariaLabel}"]`;
  }

  // 4. CSS path fallback (up to 5 levels)
  const segments = [];
  let curr = el;
  let depth = 0;

  while (curr && depth < 5 && curr.tagName && curr.tagName !== 'BODY' && curr.tagName !== 'HTML') {
    const curTag = curr.tagName.toLowerCase();
    if (curr.id) {
      segments.unshift(`#${curr.id}`);
      break;
    }

    let index = 1;
    if (curr.parentElement && curr.parentElement.children) {
      let sibling = curr.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === curr.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
    }
    segments.unshift(`${curTag}:nth-of-type(${index})`);
    curr = curr.parentElement;
    depth++;
  }

  return segments.join(' > ') || tag || '*';
}

/**
 * Enforces Privacy Rule INV-PRV-01: redacts passwords and sensitive input values.
 */
export function redactValue(val, attrs = {}) {
  const type = String(attrs.type || '').toLowerCase();
  const autocomplete = String(attrs.autocomplete || '').toLowerCase();

  if (type === 'password' || SENSITIVE_AUTOCOMPLETE.has(autocomplete)) {
    return '<redacted>';
  }
  return val;
}

/**
 * Audits touch ergonomics (INV-DEV-02):
 * Flags undersized tap targets (< 44px) when active profile has coarse pointer.
 */
export function auditTapErgonomics(rect = {}, deviceProfile = {}, minTapTarget = 44) {
  const w = Math.round(rect.width || rect.w || 0);
  const h = Math.round(rect.height || rect.h || 0);
  const isCoarse = deviceProfile?.pointer === 'coarse';
  const undersized = Boolean(isCoarse && (w < minTapTarget || h < minTapTarget));

  return {
    rect: { w, h },
    undersized
  };
}

/**
 * Normalizes keyboard event: captures control keys only; ignores character inputs (INV-PRV-01).
 */
export function normalizeKeyEvent(e) {
  if (!e || !ALLOWED_CONTROL_KEYS.has(e.key)) {
    return null;
  }
  return {
    type: 'key',
    key: e.key,
    code: e.code || e.key
  };
}

/**
 * Creates a complete NormalizedEvent object for pointer interaction.
 */
export function normalizePointerEvent(e, { viewport, deviceProfile, targetEl, targetRect }) {
  const coords = computeNormalizedCoords(
    e.clientX,
    e.clientY,
    viewport?.w || window.innerWidth,
    viewport?.h || window.innerHeight
  );

  const ergonomics = auditTapErgonomics(targetRect || (targetEl?.getBoundingClientRect?.() ?? {}), deviceProfile);

  return {
    type: 'pointer',
    target: {
      selector: deriveSelector(targetEl),
      tag: targetEl?.tagName?.toLowerCase() || '',
      role: targetEl?.getAttribute?.('role') || undefined
    },
    pointer: {
      pointerType: e.pointerType || (deviceProfile?.hasTouch ? 'touch' : 'mouse'),
      button: typeof e.button === 'number' ? e.button : 0
    },
    ergonomics,
    coords,
    viewport: {
      w: viewport?.w || 0,
      h: viewport?.h || 0,
      dpr: viewport?.dpr || 1,
      orientation: viewport?.orientation || 'portrait'
    }
  };
}
