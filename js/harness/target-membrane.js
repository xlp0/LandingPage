/**
 * Target Membrane Controller (INV-STU-01)
 * Single authoritative writer of iframe.src and resolver of test target URLs.
 */

import { assertSafeUrl } from '../external-portal-membrane.js';

/**
 * Resolves a raw target URL against baseHref and asserts safety.
 * Rejects javascript:, data:, and credentialed URLs.
 */
export function resolveTarget(raw, baseHref = (typeof window !== 'undefined' ? window.location.href : 'http://localhost/')) {
  if (!raw || typeof raw !== 'string') {
    throw Object.assign(new Error('url is malformed'), { status: 400 });
  }

  let resolved;
  try {
    resolved = new URL(raw.trim(), baseHref).toString();
  } catch {
    throw Object.assign(new Error('url is malformed'), { status: 400 });
  }

  // assertSafeUrl checks http/https scheme and absence of credentials
  return assertSafeUrl(resolved);
}

/**
 * Creates the target membrane managing the iframe and target-change events.
 */
export function createTargetMembrane(options = {}) {
  const {
    iframe = (typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null),
    baseHref = (typeof window !== 'undefined' ? window.location.href : 'http://localhost/'),
    onTargetChange = null
  } = options;

  let currentTargetDetail = null;

  function getTarget() {
    return currentTargetDetail ? { ...currentTargetDetail } : null;
  }

  function bindTarget(target, cause = 'boot-default') {
    const resolvedUrl = resolveTarget(target, baseHref);
    const origin = new URL(resolvedUrl).origin;
    const sameOrigin = typeof location !== 'undefined' ? (origin === location.origin) : false;

    currentTargetDetail = {
      url: resolvedUrl,
      raw: target,
      origin,
      sameOrigin,
      cause
    };

    if (iframe) {
      // Keep attribute in sync for selectors/assertions and navigate frame
      iframe.setAttribute('src', target);
      iframe.src = target;
    }

    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('lab:target-change', { detail: { ...currentTargetDetail } }));
    }

    if (typeof onTargetChange === 'function') {
      onTargetChange(currentTargetDetail);
    }

    return currentTargetDetail;
  }

  return {
    resolveTarget: (raw) => resolveTarget(raw, baseHref),
    bindTarget,
    getTarget
  };
}
