/**
 * Membrane Interceptor (SPRINT-ERB-02 §4.1)
 * Factory selecting the appropriate CaptureSource (same-origin, probe-agent, or unavailable)
 * based on target membrane diagnostics and origins.
 */

import { CaptureSameOriginSource } from './capture-same-origin.js';
import { CaptureProbeAgentSource, UnavailableCaptureSource } from './capture-probe-agent.js';
import { CAPTURED_TARGET_TYPES } from './target-membrane.js';

export function createCaptureSource(targetDetail = {}, options = {}) {
  const {
    iframe = (typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null),
    allowedOrigins = [],
    handshakeTimeoutMs = 5000,
    pingIntervalMs = 500,
    onHandshakeStatus = null,
    onRedirectInvalidate = null,
    getDeviceProfile = () => null,
    getViewport = () => ({ w: 800, h: 600, dpr: 1, orientation: 'portrait' })
  } = options;

  if (!targetDetail || !targetDetail.url) {
    return new UnavailableCaptureSource({
      reason: targetDetail?.reason || 'No active target URL',
      policyState: targetDetail?.policyState || 'invalid-target'
    });
  }

  if (targetDetail.status === 'blocked' || targetDetail.targetType === 'blocked') {
    return new UnavailableCaptureSource({
      reason: targetDetail.reason || 'Target blocked by iframe framing policy',
      policyState: 'blocked'
    });
  }

  if (
    targetDetail.captureAllowed === false ||
    (targetDetail.targetType && !CAPTURED_TARGET_TYPES.includes(targetDetail.targetType))
  ) {
    return new UnavailableCaptureSource({
      reason: targetDetail.reason || `Target type "${targetDetail.targetType || 'custom'}" is not approved for capture`,
      policyState: targetDetail.policyState || 'custom-unapproved'
    });
  }

  if (targetDetail.sameOrigin === true) {
    return new CaptureSameOriginSource({
      iframe,
      getDeviceProfile,
      getViewport
    });
  }

  const targetOrigin = typeof targetDetail.origin === 'string' ? targetDetail.origin : '';
  const approvedList = Array.isArray(allowedOrigins) ? allowedOrigins : [];
  const isAllowedOrigin =
    Boolean(targetOrigin) &&
    approvedList.length > 0 &&
    approvedList.includes(targetOrigin);

  if (!isAllowedOrigin) {
    return new UnavailableCaptureSource({
      reason: `Target origin '${targetOrigin || 'unknown'}' is not permitted in labTargets`,
      policyState: 'custom-unapproved'
    });
  }

  return new CaptureProbeAgentSource({
    iframe,
    allowedOrigins: approvedList,
    targetOrigin,
    handshakeTimeoutMs,
    pingIntervalMs,
    onHandshakeStatus,
    onRedirectInvalidate
  });
}
