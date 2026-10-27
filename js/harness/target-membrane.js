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

  return assertSafeUrl(resolved);
}

/**
 * Creates the target membrane managing the iframe and target-change events.
 */
export function createTargetMembrane(options = {}) {
  const explicitIframe = Object.prototype.hasOwnProperty.call(options, 'iframe');
  let activeIframe = explicitIframe
    ? options.iframe
    : (typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null);
  const baseHref = options.baseHref || (typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  const onTargetChange = options.onTargetChange || null;

  let currentTargetDetail = null;

  function resolveIframeElement() {
    if (explicitIframe) return activeIframe;
    if (activeIframe && activeIframe.isConnected !== false) return activeIframe;
    return typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null;
  }

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

    const iframe = resolveIframeElement();
    if (iframe) {
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

  function setIframe(nextIframe) {
    activeIframe = nextIframe || null;
    if (activeIframe && currentTargetDetail?.raw) {
      if (activeIframe.getAttribute('src') !== currentTargetDetail.raw) {
        activeIframe.setAttribute('src', currentTargetDetail.raw);
        activeIframe.src = currentTargetDetail.raw;
      }
      if (typeof onTargetChange === 'function') {
        onTargetChange(currentTargetDetail);
      }
    }
  }

  function destroy() {
    if (!explicitIframe) {
      activeIframe = null;
    }
  }

  return {
    resolveTarget: (raw) => resolveTarget(raw, baseHref),
    bindTarget,
    getTarget,
    setIframe,
    destroy
  };
}
