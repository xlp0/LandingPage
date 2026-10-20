/**
 * Membrane Interceptor (SPRINT-ERB-02 §4.1)
 * Factory selecting the appropriate CaptureSource (same-origin, probe-agent, or unavailable)
 * based on target membrane diagnostics and origins.
 */

import { CaptureSameOriginSource } from './capture-same-origin.js';
import { CaptureProbeAgentSource, UnavailableCaptureSource } from './capture-probe-agent.js';

export function createCaptureSource(targetDetail = {}, options = {}) {
  const {
    iframe = (typeof document !== 'undefined' ? document.getElementById('mission-control-iframe') : null),
    allowedOrigins = [],
    getDeviceProfile = () => null,
    getViewport = () => ({ w: 800, h: 600, dpr: 1, orientation: 'portrait' })
  } = options;

  if (!targetDetail || !targetDetail.url) {
    return new UnavailableCaptureSource({ reason: 'No active target URL' });
  }

  // Same-origin target: direct capture listeners on iframe document
  if (targetDetail.sameOrigin) {
    return new CaptureSameOriginSource({
      iframe,
      getDeviceProfile,
      getViewport
    });
  }

  // Cross-origin target
  const targetOrigin = targetDetail.origin || '';
  const isAllowedOrigin = !allowedOrigins.length || allowedOrigins.includes(targetOrigin);

  if (!isAllowedOrigin) {
    return new UnavailableCaptureSource({
      reason: `Target origin '${targetOrigin}' is not permitted in labTargets`
    });
  }

  return new CaptureProbeAgentSource({
    iframe,
    allowedOrigins,
    targetOrigin
  });
}
