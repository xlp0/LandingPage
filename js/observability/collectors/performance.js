/**
 * Performance Metric Collector (CDO-13 DV-CDO-13-01)
 *
 * Collects Web Vitals, residual entropy (proven leak signal), render FPS,
 * and framework adapter overhead.
 */

export function collectPerformanceMetrics(options = {}) {
  const {
    faroReport = null,
    residualEntropy = 0,
    fps = 60,
    adapterOverheadKb = 0
  } = options;

  const lcp = faroReport?.lcp_ms ?? 1200;
  const fid = faroReport?.fid_ms ?? 16;
  const cls = faroReport?.cls ?? 0.02;

  // LCP <= 2500ms, INP <= 200ms, CLS <= 0.1
  const vitalsPass = lcp <= 2500 && fid <= 200 && cls <= 0.1;

  return {
    lcp_ms: lcp,
    fid_ms: fid,
    cls: cls,
    vitals_pass: vitalsPass,
    fps: fps,
    residual_entropy: residualEntropy,
    is_idle_clean: residualEntropy === 0,
    adapter_overhead_kb: adapterOverheadKb
  };
}
