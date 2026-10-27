/**
 * Target Membrane Controller (INV-STU-01)
 * Single authoritative writer of iframe.src and resolver of test target URLs.
 */

import { assertSafeUrl } from '../external-portal-membrane.js';

export const LAB_CONFIG_SCHEMA = 'urn:gqc:lab-config:v1';
export const RUNTIME_CONFIG_SCHEMA = 'urn:gqc:runtime-config:v1';
export const ALLOWED_TARGET_TYPES = Object.freeze([
  'webapp',
  'spa',
  'mpa-candidate',
  'probe-fixture',
  'undecided',
  'blocked'
]);
export const CAPTURED_TARGET_TYPES = Object.freeze([
  'webapp',
  'spa',
  'mpa-candidate',
  'probe-fixture'
]);
export const DEFAULT_FRAME_ALLOWED_ORIGINS = Object.freeze([
  'https://calendar.google.com',
  'https://grafana.pkc.pub',
  'https://www.youtube.com'
]);

const TARGET_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{1,63}$/;

export function buildContentSecurityPolicy() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://esm.run https://tikzjax.com https://apis.google.com https://accounts.google.com https://www.youtube.com",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://tikzjax.com",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://tikzjax.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:* https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://unpkg.com https://esm.run https://en.wikipedia.org https://www.googleapis.com https://www.youtube.com https://faro-collector-prod-us-central-0.grafana.net https://faro-collector-prod-ap-southeast-2.grafana.net",
    "frame-src 'self' blob: data: http://localhost:* http://127.0.0.1:* https://calendar.google.com https://grafana.pkc.pub https://www.youtube.com"
  ].join('; ');
}

export function resolveTarget(raw, baseHref = (typeof window !== 'undefined' ? window.location.href : 'http://localhost/')) {
  if (!raw || typeof raw !== 'string') {
    throw Object.assign(new Error('url is malformed'), { status: 400 });
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw Object.assign(new Error('url is malformed'), { status: 400 });
  }

  let resolved;
  try {
    resolved = new URL(trimmed, baseHref).toString();
  } catch {
    throw Object.assign(new Error('url is malformed'), { status: 400 });
  }

  return assertSafeUrl(resolved);
}

export function validateLabConfig(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['lab config must be a JSON object'] };
  }
  if (payload.schema !== LAB_CONFIG_SCHEMA) {
    errors.push(`schema must equal "${LAB_CONFIG_SCHEMA}"`);
  }
  if (typeof payload.owner !== 'string' || !payload.owner.trim()) {
    errors.push('owner must be a non-empty string');
  }
  if (typeof payload.defaultTargetId !== 'string' || !payload.defaultTargetId.trim()) {
    errors.push('defaultTargetId must be a non-empty string');
  }
  if (!Array.isArray(payload.labTargets) || payload.labTargets.length === 0) {
    errors.push('labTargets must be a non-empty array');
    return { ok: false, errors };
  }

  const seenIds = new Set();
  let defaultEntry = null;

  payload.labTargets.forEach((entry, index) => {
    const prefix = `labTargets[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${prefix} must be an object`);
      return;
    }
    if (typeof entry.id !== 'string' || !TARGET_ID_PATTERN.test(entry.id)) {
      errors.push(`${prefix}.id must match ${TARGET_ID_PATTERN}`);
    } else if (seenIds.has(entry.id)) {
      errors.push(`${prefix}.id "${entry.id}" is duplicated`);
    } else {
      seenIds.add(entry.id);
    }

    if (typeof entry.url !== 'string' || !entry.url.trim()) {
      errors.push(`${prefix}.url must be a non-empty string`);
    } else {
      try {
        resolveTarget(entry.url, 'http://localhost:3000/');
      } catch (err) {
        errors.push(`${prefix}.url is invalid (${err.message})`);
      }
    }

    if (typeof entry.label !== 'string' || !entry.label.trim()) {
      errors.push(`${prefix}.label must be a non-empty string`);
    }

    if (!ALLOWED_TARGET_TYPES.includes(entry.targetType)) {
      errors.push(`${prefix}.targetType "${entry.targetType}" is not supported`);
    }

    if (entry.status !== 'allowed' && entry.status !== 'blocked') {
      errors.push(`${prefix}.status must be "allowed" or "blocked"`);
    }

    if (typeof entry.quickLaunch !== 'boolean') {
      errors.push(`${prefix}.quickLaunch must be a boolean`);
    }

    if (entry.targetType === 'blocked' && entry.status !== 'blocked') {
      errors.push(`${prefix} blocked targetType requires status="blocked"`);
    }
    if (entry.status === 'blocked' && entry.targetType !== 'blocked') {
      errors.push(`${prefix} status="blocked" requires targetType="blocked"`);
    }
    if (entry.status === 'blocked' && entry.quickLaunch === true) {
      errors.push(`${prefix} blocked target cannot enable quickLaunch`);
    }

    if (entry.id === payload.defaultTargetId) {
      defaultEntry = entry;
    }
  });

  if (!defaultEntry) {
    errors.push(`defaultTargetId "${payload.defaultTargetId}" was not found in labTargets`);
  } else if (defaultEntry.status !== 'allowed') {
    errors.push(`defaultTargetId "${payload.defaultTargetId}" cannot reference a blocked target`);
  }

  if (payload.p2p !== undefined) {
    if (!payload.p2p || typeof payload.p2p !== 'object' || !Array.isArray(payload.p2p.iceServers)) {
      errors.push('p2p.iceServers must be an array when p2p is present');
    }
  }

  return errors.length === 0 ? { ok: true, value: payload } : { ok: false, errors };
}

export function validateRuntimeConfig(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['runtime config must be a JSON object'] };
  }
  if (payload.schema !== RUNTIME_CONFIG_SCHEMA) {
    errors.push(`schema must equal "${RUNTIME_CONFIG_SCHEMA}"`);
  }
  if (typeof payload.owner !== 'string' || !payload.owner.trim()) {
    errors.push('owner must be a non-empty string');
  }
  if (typeof payload.NODE_ENV !== 'string' || !payload.NODE_ENV.trim()) {
    errors.push('NODE_ENV must be a non-empty string');
  }
  const portNum = Number(payload.PORT);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    errors.push('PORT must be a valid TCP port (1-65535)');
  }
  if (payload.WEBSOCKET_URL !== null && typeof payload.WEBSOCKET_URL !== 'string') {
    errors.push('WEBSOCKET_URL must be string or null');
  }
  if (typeof payload.MCARD_STUDIO_URL !== 'string' || !/^https?:\/\//.test(payload.MCARD_STUDIO_URL)) {
    errors.push('MCARD_STUDIO_URL must be an http(s) URL');
  }
  if (payload.STUN_SERVERS !== null && !Array.isArray(payload.STUN_SERVERS)) {
    errors.push('STUN_SERVERS must be an array or null');
  }
  if (typeof payload.wsHost !== 'string' || !payload.wsHost.trim()) {
    errors.push('wsHost must be a non-empty string');
  }
  if (!Number.isInteger(payload.wsPort) || payload.wsPort < 1 || payload.wsPort > 65535) {
    errors.push('wsPort must be an integer between 1 and 65535');
  }
  if (typeof payload.wsPath !== 'string' || !payload.wsPath.startsWith('/')) {
    errors.push('wsPath must start with "/"');
  }

  return errors.length === 0 ? { ok: true, value: payload } : { ok: false, errors };
}

export function buildCorsAllowlist(baseOrigins = [], labConfig = null, runtimePorts = []) {
  const allowlist = [];
  const addOrigin = (candidate) => {
    if (typeof candidate === 'string' && candidate && !allowlist.includes(candidate)) {
      allowlist.push(candidate);
    }
  };

  for (const origin of baseOrigins) {
    addOrigin(origin);
  }

  for (const port of runtimePorts) {
    const p = Number(port);
    if (Number.isInteger(p) && p > 0 && p <= 65535) {
      addOrigin(`http://localhost:${p}`);
      addOrigin(`http://127.0.0.1:${p}`);
    }
  }

  const entries = Array.isArray(labConfig?.labTargets) ? labConfig.labTargets : [];
  for (const entry of entries) {
    if (!entry || entry.status !== 'allowed' || entry.targetType === 'blocked') {
      continue;
    }
    if (typeof entry.url === 'string' && /^https?:\/\//i.test(entry.url)) {
      try {
        addOrigin(new URL(entry.url).origin);
      } catch {}
    }
  }

  return allowlist;
}

export function extractApprovedCaptureOrigins(labTargets = [], hostOrigin = '') {
  const origins = [];
  const addOrigin = (origin) => {
    if (typeof origin === 'string' && origin && !origins.includes(origin)) {
      origins.push(origin);
    }
  };

  let hasLoopbackProbeFixture = false;
  for (const entry of Array.isArray(labTargets) ? labTargets : []) {
    if (!entry || entry.status !== 'allowed' || !CAPTURED_TARGET_TYPES.includes(entry.targetType)) {
      continue;
    }
    if (typeof entry.url === 'string' && /^https?:\/\//i.test(entry.url)) {
      try {
        const parsed = new URL(entry.url);
        addOrigin(parsed.origin);
        if (parsed.hostname === '127.0.0.1' && parsed.pathname.startsWith('/tests/fixtures/probe-target')) {
          hasLoopbackProbeFixture = true;
        }
      } catch {}
    }
  }

  if (hasLoopbackProbeFixture && typeof hostOrigin === 'string' && hostOrigin.startsWith('http://')) {
    try {
      const hostParsed = new URL(hostOrigin);
      if (hostParsed.hostname === 'localhost' && hostParsed.port) {
        addOrigin(`http://127.0.0.1:${hostParsed.port}`);
      }
    } catch {}
  }

  return origins;
}

function normalizeUrlComparisonKey(urlString) {
  try {
    const parsed = new URL(urlString);
    return parsed.toString();
  } catch {
    return urlString;
  }
}

export function isFramePermittedOrigin(origin, hostOrigin = '') {
  if (!origin || typeof origin !== 'string') return false;
  if (hostOrigin && origin === hostOrigin) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return DEFAULT_FRAME_ALLOWED_ORIGINS.includes(origin);
}

export function classifyTargetSelection(resolvedUrl, raw, registry = [], baseHref = 'http://localhost/') {
  const baseUrlObj = new URL(baseHref);
  const hostOrigin = baseUrlObj.origin;
  const targetUrlObj = new URL(resolvedUrl);
  const origin = targetUrlObj.origin;
  const sameOrigin = origin === hostOrigin;
  const resolvedKey = normalizeUrlComparisonKey(resolvedUrl);

  let matchedEntry = null;
  for (const entry of Array.isArray(registry) ? registry : []) {
    if (!entry || typeof entry.url !== 'string') continue;
    try {
      const candidateResolved = new URL(entry.url, baseHref);
      if (normalizeUrlComparisonKey(candidateResolved.toString()) === resolvedKey) {
        matchedEntry = entry;
        break;
      }
      if (
        candidateResolved.hostname === '127.0.0.1' &&
        targetUrlObj.hostname === '127.0.0.1' &&
        baseUrlObj.port &&
        targetUrlObj.port === baseUrlObj.port &&
        candidateResolved.pathname === targetUrlObj.pathname &&
        targetUrlObj.pathname.startsWith('/tests/fixtures/probe-target')
      ) {
        matchedEntry = entry;
        break;
      }
    } catch {}
  }

  if (matchedEntry) {
    const targetType = matchedEntry.targetType || (matchedEntry.status === 'blocked' ? 'blocked' : 'webapp');
    if (matchedEntry.status === 'blocked' || targetType === 'blocked') {
      return {
        targetId: matchedEntry.id || null,
        targetType: 'blocked',
        status: 'blocked',
        captureAllowed: false,
        frameAllowed: false,
        policyState: 'blocked',
        errorPlaceId: 'p_error_target_blocked',
        enterTransitionId: 't_enter_target_blocked',
        recoverTransitionId: 't_recover_target_blocked',
        reason: matchedEntry.reason || 'Blocked by iframe framing policy'
      };
    }

    if (targetType === 'undecided') {
      return {
        targetId: matchedEntry.id || null,
        targetType: 'undecided',
        status: 'allowed',
        captureAllowed: false,
        frameAllowed: isFramePermittedOrigin(origin, hostOrigin),
        policyState: 'undecided-preview',
        errorPlaceId: 'p_error_capture_unavailable',
        enterTransitionId: 't_enter_capture_unavailable',
        recoverTransitionId: 't_recover_capture_unavailable',
        reason: matchedEntry.reason || 'Target architecture undecided; capture disabled pending product classification'
      };
    }

    if (CAPTURED_TARGET_TYPES.includes(targetType)) {
      return {
        targetId: matchedEntry.id || null,
        targetType,
        status: 'allowed',
        captureAllowed: true,
        frameAllowed: isFramePermittedOrigin(origin, hostOrigin),
        policyState: sameOrigin ? 'approved-same-origin' : 'pending-handshake',
        errorPlaceId: null,
        enterTransitionId: sameOrigin ? null : 't_req_probe_handshake',
        recoverTransitionId: null,
        reason: null
      };
    }
  }

  return {
    targetId: null,
    targetType: 'custom',
    status: 'unapproved',
    captureAllowed: false,
    frameAllowed: isFramePermittedOrigin(origin, hostOrigin),
    policyState: 'custom-unapproved',
    errorPlaceId: 'p_error_target_unapproved',
    enterTransitionId: 't_enter_target_unapproved',
    recoverTransitionId: 't_recover_target_unapproved',
    reason: `Target "${raw || resolvedUrl}" is not approved for capture in app-config.json`
  };
}

export function createTargetMembrane(options = {}) {
  const explicitIframe = Object.prototype.hasOwnProperty.call(options, 'iframe');
  let activeIframe = explicitIframe
    ? options.iframe
    : (typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null);
  const baseHref = options.baseHref || (typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
  const onTargetChange = options.onTargetChange || null;

  let registry = Array.isArray(options.registry) ? [...options.registry] : [];
  let currentTargetDetail = null;
  let lastPolicyRejection = null;
  let activeBoundaryBeacon = null;
  let policyPlaceId = 'p_page_responsive_lab';
  const policyTrace = [];

  function resolveIframeElement() {
    if (explicitIframe) return activeIframe;
    if (activeIframe && activeIframe.isConnected !== false) return activeIframe;
    return typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null;
  }

  function recordPolicyTransition(transitionId, fromPlaceId, toPlaceId, meta = {}) {
    if (!transitionId || !fromPlaceId || !toPlaceId) return null;
    if (policyPlaceId !== fromPlaceId) return null;
    const entry = {
      transitionId,
      fromPlaceId,
      toPlaceId,
      at: new Date().toISOString(),
      ...meta
    };
    policyPlaceId = toPlaceId;
    policyTrace.push(entry);
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('lab:policy-transition', { detail: { ...entry } }));
    }
    return entry;
  }

  function settlePolicyPlaceToBase() {
    if (policyPlaceId === 'p_pending_probe_handshake') {
      recordPolicyTransition('t_ok_probe_handshake', 'p_pending_probe_handshake', 'p_page_responsive_lab');
    } else if (policyPlaceId === 'p_error_target_blocked') {
      recordPolicyTransition('t_recover_target_blocked', 'p_error_target_blocked', 'p_page_responsive_lab');
    } else if (policyPlaceId === 'p_error_capture_unavailable') {
      recordPolicyTransition('t_recover_capture_unavailable', 'p_error_capture_unavailable', 'p_page_responsive_lab');
    } else if (policyPlaceId === 'p_error_handshake_timeout') {
      recordPolicyTransition('t_recover_handshake_timeout', 'p_error_handshake_timeout', 'p_page_responsive_lab');
    } else if (policyPlaceId === 'p_error_target_unapproved') {
      recordPolicyTransition('t_recover_target_unapproved', 'p_error_target_unapproved', 'p_page_responsive_lab');
    }
  }

  function getTarget() {
    return currentTargetDetail ? { ...currentTargetDetail } : null;
  }

  function getLastPolicyRejection() {
    return lastPolicyRejection ? { ...lastPolicyRejection } : null;
  }

  function getRegistry() {
    return [...registry];
  }

  function getApprovedOrigins() {
    const hostOrigin = new URL(baseHref).origin;
    return extractApprovedCaptureOrigins(registry, hostOrigin);
  }

  function setRegistry(nextTargets = []) {
    registry = Array.isArray(nextTargets) ? [...nextTargets] : [];
    if (currentTargetDetail && currentTargetDetail.url) {
      const classification = classifyTargetSelection(
        currentTargetDetail.url,
        currentTargetDetail.raw,
        registry,
        baseHref
      );
      currentTargetDetail = {
        ...currentTargetDetail,
        ...classification
      };
      if (typeof onTargetChange === 'function') {
        onTargetChange(currentTargetDetail);
      }
    }
  }

  function probeBlockedBoundary(resolvedUrl) {
    if (typeof Image !== 'function') return;
    try {
      const beacon = new Image();
      beacon.referrerPolicy = 'no-referrer';
      activeBoundaryBeacon = beacon;
      beacon.onload = () => { activeBoundaryBeacon = null; };
      beacon.onerror = () => { activeBoundaryBeacon = null; };
      beacon.src = resolvedUrl;
    } catch {}
  }

  function bindTarget(target, cause = 'boot-default') {
    let resolvedUrl;
    try {
      resolvedUrl = resolveTarget(target, baseHref);
    } catch (err) {
      settlePolicyPlaceToBase();
      recordPolicyTransition('t_enter_target_unapproved', 'p_page_responsive_lab', 'p_error_target_unapproved', {
        raw: String(target || ''),
        reason: err.message
      });

      const rejectionDetail = {
        url: null,
        raw: String(target || ''),
        origin: '',
        sameOrigin: false,
        cause,
        targetId: null,
        targetType: 'custom',
        status: 'rejected',
        captureAllowed: false,
        frameAllowed: false,
        policyState: 'invalid-target',
        errorPlaceId: 'p_error_target_unapproved',
        recoverTransitionId: 't_recover_target_unapproved',
        reason: `Invalid or unsafe target URL (${err.message})`
      };
      lastPolicyRejection = rejectionDetail;

      if (!currentTargetDetail) {
        currentTargetDetail = rejectionDetail;
        const iframe = resolveIframeElement();
        if (iframe) {
          iframe.removeAttribute('src');
        }
        if (typeof onTargetChange === 'function') {
          onTargetChange(currentTargetDetail);
        }
      }

      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('lab:target-policy-error', { detail: { ...rejectionDetail } }));
      }
      throw err;
    }

    lastPolicyRejection = null;
    settlePolicyPlaceToBase();

    const origin = new URL(resolvedUrl).origin;
    const hostOrigin = new URL(baseHref).origin;
    const sameOrigin = typeof location !== 'undefined' ? (origin === location.origin) : false;
    const classification = registry.length > 0
      ? classifyTargetSelection(resolvedUrl, target, registry, baseHref)
      : {
          targetId: null,
          targetType: sameOrigin ? 'webapp' : 'custom',
          status: sameOrigin ? 'allowed' : 'unapproved',
          captureAllowed: sameOrigin,
          frameAllowed: isFramePermittedOrigin(origin, hostOrigin),
          policyState: sameOrigin ? 'approved-same-origin' : 'custom-unapproved',
          errorPlaceId: sameOrigin ? null : 'p_error_target_unapproved',
          enterTransitionId: sameOrigin ? null : 't_enter_target_unapproved',
          recoverTransitionId: sameOrigin ? null : 't_recover_target_unapproved',
          reason: sameOrigin ? null : `Target "${target}" is not approved for capture`
        };

    if (classification.enterTransitionId && classification.errorPlaceId) {
      recordPolicyTransition(
        classification.enterTransitionId,
        'p_page_responsive_lab',
        classification.errorPlaceId,
        { url: resolvedUrl }
      );
    } else if (classification.enterTransitionId === 't_req_probe_handshake') {
      recordPolicyTransition('t_req_probe_handshake', 'p_page_responsive_lab', 'p_pending_probe_handshake', {
        url: resolvedUrl
      });
    }

    currentTargetDetail = {
      url: resolvedUrl,
      raw: target,
      origin,
      sameOrigin,
      cause,
      ...classification
    };

    const iframe = resolveIframeElement();
    if (iframe) {
      if (classification.status === 'blocked') {
        iframe.setAttribute('src', 'about:blank');
        iframe.src = 'about:blank';
        probeBlockedBoundary(resolvedUrl);
      } else if (!classification.frameAllowed) {
        iframe.setAttribute('src', 'about:blank');
        iframe.src = 'about:blank';
      } else {
        iframe.setAttribute('src', target);
        iframe.src = target;
      }
    }

    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('lab:target-change', { detail: { ...currentTargetDetail } }));
    }

    if (typeof onTargetChange === 'function') {
      onTargetChange(currentTargetDetail);
    }

    return currentTargetDetail;
  }

  function notifyProbeHandshakeOutcome(outcome, reason = null) {
    if (outcome === 'ok') {
      if (policyPlaceId === 'p_pending_probe_handshake') {
        recordPolicyTransition('t_ok_probe_handshake', 'p_pending_probe_handshake', 'p_page_responsive_lab');
      }
      if (currentTargetDetail) {
        currentTargetDetail = {
          ...currentTargetDetail,
          policyState: 'approved-probe',
          errorPlaceId: null,
          recoverTransitionId: null,
          reason: null
        };
      }
      if (typeof document !== 'undefined' && currentTargetDetail) {
        document.dispatchEvent(new CustomEvent('lab:target-policy-update', { detail: { ...currentTargetDetail } }));
      }
      return;
    }

    if (outcome === 'timeout') {
      if (policyPlaceId === 'p_pending_probe_handshake') {
        recordPolicyTransition(
          't_fail_probe_handshake_timeout',
          'p_pending_probe_handshake',
          'p_error_handshake_timeout',
          { reason }
        );
      } else if (policyPlaceId === 'p_page_responsive_lab') {
        recordPolicyTransition('t_req_probe_handshake', 'p_page_responsive_lab', 'p_pending_probe_handshake');
        recordPolicyTransition(
          't_fail_probe_handshake_timeout',
          'p_pending_probe_handshake',
          'p_error_handshake_timeout',
          { reason }
        );
      }
      if (currentTargetDetail) {
        currentTargetDetail = {
          ...currentTargetDetail,
          policyState: 'handshake-timeout',
          errorPlaceId: 'p_error_handshake_timeout',
          recoverTransitionId: 't_recover_handshake_timeout',
          reason: reason || 'Probe agent handshake timed out after 5000ms (capture unavailable)'
        };
      }
    } else {
      if (policyPlaceId === 'p_pending_probe_handshake') {
        recordPolicyTransition(
          't_fail_probe_handshake_unavailable',
          'p_pending_probe_handshake',
          'p_error_capture_unavailable',
          { reason }
        );
      } else if (policyPlaceId === 'p_page_responsive_lab') {
        recordPolicyTransition('t_enter_capture_unavailable', 'p_page_responsive_lab', 'p_error_capture_unavailable', {
          reason
        });
      }
      if (currentTargetDetail) {
        currentTargetDetail = {
          ...currentTargetDetail,
          policyState: 'capture-unavailable',
          errorPlaceId: 'p_error_capture_unavailable',
          recoverTransitionId: 't_recover_capture_unavailable',
          reason: reason || 'Capture unavailable on target'
        };
      }
    }

    if (typeof document !== 'undefined' && currentTargetDetail) {
      document.dispatchEvent(new CustomEvent('lab:target-policy-update', { detail: { ...currentTargetDetail } }));
    }
  }

  function recoverToDefault(defaultTarget = 'app.html') {
    settlePolicyPlaceToBase();
    lastPolicyRejection = null;
    return bindTarget(defaultTarget, 'policy-recover');
  }

  function setIframe(nextIframe) {
    activeIframe = nextIframe || null;
    if (activeIframe && currentTargetDetail) {
      if (currentTargetDetail.status === 'blocked' || !currentTargetDetail.frameAllowed || !currentTargetDetail.raw) {
        if (activeIframe.getAttribute('src') !== 'about:blank') {
          activeIframe.setAttribute('src', 'about:blank');
          activeIframe.src = 'about:blank';
        }
      } else if (activeIframe.getAttribute('src') !== currentTargetDetail.raw) {
        activeIframe.setAttribute('src', currentTargetDetail.raw);
        activeIframe.src = currentTargetDetail.raw;
      }
      if (typeof onTargetChange === 'function') {
        onTargetChange(currentTargetDetail);
      }
    }
  }

  function destroy() {
    activeBoundaryBeacon = null;
    if (!explicitIframe) {
      activeIframe = null;
    }
  }

  return {
    resolveTarget: (raw) => resolveTarget(raw, baseHref),
    bindTarget,
    getTarget,
    getLastPolicyRejection,
    getRegistry,
    setRegistry,
    getApprovedOrigins,
    notifyProbeHandshakeOutcome,
    recoverToDefault,
    getPolicyPlaceId: () => policyPlaceId,
    getPolicyTrace: () => policyTrace.map((e) => ({ ...e })),
    clearPolicyTrace: () => {
      policyTrace.length = 0;
      policyPlaceId = 'p_page_responsive_lab';
    },
    setIframe,
    destroy
  };
}
