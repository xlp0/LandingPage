import fs from 'node:fs';
import path from 'node:path';

export const PERFORMANCE_REPORT_SCHEMA = 'urn:gqc:performance-report:v1';

export const RECONCILED_FRAME_TIERS = Object.freeze({
  vsyncIdeal: Object.freeze({
    id: 'vsync-ideal',
    thresholdMs: 16.67,
    targetFps: 60,
    sourcePath: 'js/harness/telemetry-collector.js',
    role: '60 Hz ideal VSync interval used to count missed display frames inside in-target telemetry',
    blocking: false,
    owner: 'Architect and TEA'
  }),
  t3HardwareTarget: Object.freeze({
    id: 't3-hardware-target',
    thresholdMs: 20.0,
    targetFps: 50,
    sourcePath: 'docs/sprints/_active/DECISIONS.tsv#row-49',
    role: 'T3 dedicated physical hardware interactive smoothness target',
    blocking: false,
    owner: 'Product Manager and TEA'
  }),
  t1HeadlessAdvisory: Object.freeze({
    id: 't1-headless-advisory',
    thresholdMs: 25.0,
    targetFps: 40,
    sourcePath: 'tests/conformance/checks/frame-budget.js',
    role: 'T1 headless Chromium conformance check accounting for CI OS scheduler jitter; advisory unless caller sets enforce: true',
    blocking: false,
    owner: 'TEA'
  })
});

export const PROVISIONAL_REGRESSION_GUARD = Object.freeze({
  relativeDeltaPct: 10,
  absoluteDeltaMs: 100,
  blocking: false,
  status: 'advisory-report-only',
  owner: 'Product Manager and TEA',
  rationale: 'CI runner scheduling jitter exceeds 50 ms on short runs; guard flags candidates for review without blocking CI until owner ratification'
});

const SPA_TARGET_TYPES = new Set(['spa']);
const MPA_OR_PENPOT_TARGET_TYPES = new Set(['mpa', 'mpa-candidate', 'penpot', 'penpot-mpa']);

export function normalizeMetricValue(raw, { allowZero = true, min = 0 } = {}) {
  if (raw === null || raw === undefined || raw === 'unavailable') {
    return { status: 'missing', value: null, isZero: false, reason: 'unavailable' };
  }
  if (typeof raw === 'object' && raw !== null && raw.available === false) {
    return { status: 'missing', value: null, isZero: false, reason: raw.reason || 'unavailable' };
  }
  if (typeof raw !== 'number' || Number.isNaN(raw) || !Number.isFinite(raw)) {
    return { status: 'invalid', value: null, isZero: false, reason: 'non-finite-number' };
  }
  if (raw === 0) {
    if (!allowZero) {
      return { status: 'invalid', value: null, isZero: true, reason: 'zero-disallowed' };
    }
    return { status: 'valid', value: 0, isZero: true, reason: null };
  }
  if (raw < min) {
    return { status: 'invalid', value: null, isZero: false, reason: 'below-minimum' };
  }
  return { status: 'valid', value: Number(raw.toFixed(4)), isZero: false, reason: null };
}

function quantileSorted(sorted, q) {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] !== undefined ? sorted[base + 1] : sorted[base];
  return Number((sorted[base] + rest * (next - sorted[base])).toFixed(4));
}

export function summarizeSamples(rawValues, { allowZero = true, min = 0 } = {}) {
  if (!Array.isArray(rawValues)) {
    return {
      status: 'invalid',
      n: 0,
      missingCount: 0,
      invalidCount: 1,
      zeroCount: 0,
      min: null,
      p25: null,
      median: null,
      p75: null,
      p95: null,
      max: null,
      mean: null,
      iqr: null,
      range: null,
      rawSamples: []
    };
  }

  const valid = [];
  let missingCount = 0;
  let invalidCount = 0;
  let zeroCount = 0;

  for (const item of rawValues) {
    const normalized = normalizeMetricValue(item, { allowZero, min });
    if (normalized.status === 'missing') {
      missingCount += 1;
    } else if (normalized.status === 'invalid') {
      invalidCount += 1;
    } else {
      if (normalized.isZero) zeroCount += 1;
      valid.push(normalized.value);
    }
  }

  if (valid.length === 0) {
    const status = invalidCount > 0 ? 'invalid' : 'missing';
    return {
      status,
      n: 0,
      missingCount,
      invalidCount,
      zeroCount,
      min: null,
      p25: null,
      median: null,
      p75: null,
      p95: null,
      max: null,
      mean: null,
      iqr: null,
      range: null,
      rawSamples: []
    };
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const p25 = quantileSorted(sorted, 0.25);
  const median = quantileSorted(sorted, 0.5);
  const p75 = quantileSorted(sorted, 0.75);
  const p95 = quantileSorted(sorted, 0.95);
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];

  return {
    status: 'valid',
    n: sorted.length,
    missingCount,
    invalidCount,
    zeroCount,
    min: minVal,
    p25,
    median,
    p75,
    p95,
    max: maxVal,
    mean: Number((sum / sorted.length).toFixed(4)),
    iqr: Number((p75 - p25).toFixed(4)),
    range: Number((maxVal - minVal).toFixed(4)),
    rawSamples: valid
  };
}

export function normalizeNavigationSample(raw = {}) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('Navigation sample must be an object');
  }

  const targetType = String(raw.targetType || 'workbench');
  const cacheState = raw.cacheState === 'warm' ? 'warm' : 'cold';

  const metrics = {
    readyMs: normalizeMetricValue(raw.readyMs, { allowZero: false, min: 0 }),
    loadEventMs: normalizeMetricValue(raw.loadEventMs, { allowZero: true, min: 0 }),
    domContentLoadedMs: normalizeMetricValue(raw.domContentLoadedMs, { allowZero: true, min: 0 }),
    responseEndMs: normalizeMetricValue(raw.responseEndMs, { allowZero: true, min: 0 }),
    lcpMs: normalizeMetricValue(raw.lcpMs, { allowZero: false, min: 0 }),
    cls: normalizeMetricValue(raw.cls, { allowZero: true, min: 0 }),
    jsEncodedBytes: normalizeMetricValue(raw.jsEncodedBytes, { allowZero: true, min: 0 }),
    jsDecodedBytes: normalizeMetricValue(raw.jsDecodedBytes, { allowZero: true, min: 0 }),
    longTaskCount: normalizeMetricValue(raw.longTaskCount, { allowZero: true, min: 0 }),
    longTaskTotalMs: normalizeMetricValue(raw.longTaskTotalMs, { allowZero: true, min: 0 }),
    httpErrors: normalizeMetricValue(raw.httpErrors ?? 0, { allowZero: true, min: 0 }),
    pageErrors: normalizeMetricValue(raw.pageErrors ?? 0, { allowZero: true, min: 0 })
  };

  const hasValidReady = metrics.readyMs.status === 'valid';
  const hasErrors =
    (metrics.httpErrors.status === 'valid' && metrics.httpErrors.value > 0) ||
    (metrics.pageErrors.status === 'valid' && metrics.pageErrors.value > 0);

  return {
    status: hasValidReady && !hasErrors ? 'valid' : (hasValidReady ? 'error' : metrics.readyMs.status),
    stepId: String(raw.stepId || 'unspecified-step'),
    targetType,
    routeHandle: raw.routeHandle ?? null,
    pageId: raw.pageId ?? null,
    placeId: raw.placeId ?? null,
    transitionId: raw.transitionId ?? null,
    hasApprovedGraph: raw.hasApprovedGraph !== false,
    fixtureId: raw.fixtureId ?? null,
    readyCondition: String(raw.readyCondition || 'unspecified-ready-condition'),
    cacheState,
    includesServerStartup: Boolean(raw.includesServerStartup),
    metrics
  };
}

export function normalizeFrameSample(rawDeltas, { enforce = false } = {}) {
  if (rawDeltas === null || rawDeltas === undefined) {
    return {
      status: 'missing',
      sampleCount: 0,
      validPositiveCount: 0,
      zeroCount: 0,
      missingCount: 1,
      invalidCount: 0,
      validDeltas: [],
      summary: null,
      avgFps: null,
      droppedFrames: null,
      tiers: null
    };
  }
  if (!Array.isArray(rawDeltas)) {
    return {
      status: 'invalid',
      sampleCount: 0,
      validPositiveCount: 0,
      zeroCount: 0,
      missingCount: 0,
      invalidCount: 1,
      validDeltas: [],
      summary: null,
      avgFps: null,
      droppedFrames: null,
      tiers: null
    };
  }

  const positiveDeltas = [];
  let zeroCount = 0;
  let missingCount = 0;
  let invalidCount = 0;

  for (const delta of rawDeltas) {
    const norm = normalizeMetricValue(delta, { allowZero: true, min: 0 });
    if (norm.status === 'missing') {
      missingCount += 1;
    } else if (norm.status === 'invalid') {
      invalidCount += 1;
    } else if (norm.isZero) {
      zeroCount += 1;
    } else {
      positiveDeltas.push(norm.value);
    }
  }

  if (positiveDeltas.length === 0) {
    let status = 'missing';
    if (invalidCount > 0) status = 'invalid';
    else if (zeroCount > 0) status = 'zero';

    return {
      status,
      sampleCount: rawDeltas.length,
      validPositiveCount: 0,
      zeroCount,
      missingCount,
      invalidCount,
      validDeltas: [],
      summary: null,
      avgFps: null,
      droppedFrames: null,
      tiers: null
    };
  }

  const summary = summarizeSamples(positiveDeltas, { allowZero: false, min: 0 });
  const vsyncMs = 1000 / 60;
  let droppedFrames = 0;
  for (const d of positiveDeltas) {
    if (d > vsyncMs * 1.5) {
      const missed = Math.floor(d / vsyncMs) - 1;
      if (missed > 0) droppedFrames += missed;
    }
  }

  const avgFps = summary.mean > 0 ? Number((1000 / summary.mean).toFixed(2)) : null;
  const tiers = {
    vsyncIdeal: {
      thresholdMs: RECONCILED_FRAME_TIERS.vsyncIdeal.thresholdMs,
      withinAvg: summary.mean <= RECONCILED_FRAME_TIERS.vsyncIdeal.thresholdMs,
      withinP95: summary.p95 <= RECONCILED_FRAME_TIERS.vsyncIdeal.thresholdMs,
      blocking: false
    },
    t3HardwareTarget: {
      thresholdMs: RECONCILED_FRAME_TIERS.t3HardwareTarget.thresholdMs,
      withinAvg: summary.mean <= RECONCILED_FRAME_TIERS.t3HardwareTarget.thresholdMs,
      withinP95: summary.p95 <= RECONCILED_FRAME_TIERS.t3HardwareTarget.thresholdMs,
      blocking: false
    },
    t1HeadlessAdvisory: {
      thresholdMs: RECONCILED_FRAME_TIERS.t1HeadlessAdvisory.thresholdMs,
      withinAvg: summary.mean <= RECONCILED_FRAME_TIERS.t1HeadlessAdvisory.thresholdMs,
      withinP95: summary.p95 <= RECONCILED_FRAME_TIERS.t1HeadlessAdvisory.thresholdMs,
      blocking: Boolean(enforce),
      status: (!enforce || summary.mean <= RECONCILED_FRAME_TIERS.t1HeadlessAdvisory.thresholdMs) ? 'pass' : 'fail'
    }
  };

  return {
    status: 'valid',
    sampleCount: rawDeltas.length,
    validPositiveCount: positiveDeltas.length,
    zeroCount,
    missingCount,
    invalidCount,
    validDeltas: positiveDeltas,
    summary,
    avgFps,
    droppedFrames,
    tiers
  };
}

export function assertDisjointSurfaceSamples(samples = []) {
  let sawSpa = false;
  let sawMpa = false;
  for (const sample of samples) {
    const t = String(sample?.targetType || '').toLowerCase();
    if (SPA_TARGET_TYPES.has(t)) sawSpa = true;
    if (MPA_OR_PENPOT_TARGET_TYPES.has(t)) sawMpa = true;
    if (t === 'penpot-design-only' || sample?.designOnlyEdge === true) {
      throw new Error('Design-only PenPot edge cannot be recorded as a browser transition sample');
    }
  }
  if (sawSpa && sawMpa) {
    throw new Error('SPA and MPA/PenPot samples must never be blended in one baseline series');
  }
  return true;
}

export function evaluatePairedSeries(
  trunkSamples,
  headSamples,
  {
    trunkErrors = 0,
    headErrors = 0,
    hasNamedLimiter = false,
    ownerApprovedBlocking = false
  } = {}
) {
  const trunk = summarizeSamples(trunkSamples, { allowZero: true, min: 0 });
  const head = summarizeSamples(headSamples, { allowZero: true, min: 0 });

  if (trunk.status !== 'valid' || head.status !== 'valid') {
    return {
      verdict: 'inconclusive',
      reason: 'missing-or-invalid-samples',
      trunk,
      head,
      trunkErrors,
      headErrors
    };
  }

  const p50DeltaMs = Number((head.median - trunk.median).toFixed(4));
  const p50DeltaPct = trunk.median > 0 ? Number(((p50DeltaMs / trunk.median) * 100).toFixed(2)) : 0;
  const p75DeltaMs = Number((head.p75 - trunk.p75).toFixed(4));
  const p75DeltaPct = trunk.p75 > 0 ? Number(((p75DeltaMs / trunk.p75) * 100).toFixed(2)) : 0;

  const combinedSpread = Math.max(trunk.iqr, head.iqr, trunk.range * 0.25, head.range * 0.25);
  const improvementExceedsSpread =
    head.p75 < trunk.median && Math.abs(p50DeltaMs) > combinedSpread;

  const advisoryRegressionFlag =
    p75DeltaPct > PROVISIONAL_REGRESSION_GUARD.relativeDeltaPct &&
    p75DeltaMs > PROVISIONAL_REGRESSION_GUARD.absoluteDeltaMs;

  let verdict = 'no-measurable-difference';
  if (trunkErrors > 0 || headErrors > 0) {
    verdict = 'inconclusive';
  } else if (improvementExceedsSpread && hasNamedLimiter) {
    verdict = 'faster';
  } else if (p50DeltaMs > combinedSpread && head.median > trunk.p75) {
    verdict = hasNamedLimiter ? 'slower' : 'inconclusive';
  }

  return {
    verdict,
    trunk,
    head,
    trunkErrors,
    headErrors,
    deltas: {
      p50DeltaMs,
      p50DeltaPct,
      p75DeltaMs,
      p75DeltaPct
    },
    provisionalGuard: {
      ...PROVISIONAL_REGRESSION_GUARD,
      blocking: Boolean(ownerApprovedBlocking),
      advisoryRegressionFlag,
      blockingFailure: Boolean(ownerApprovedBlocking && advisoryRegressionFlag)
    },
    qualifiesAsOptimization: Boolean(
      verdict === 'faster' && hasNamedLimiter && trunkErrors === 0 && headErrors === 0
    )
  };
}

export function createPerformanceReport(payload = {}) {
  const requiredTop = ['environment', 'shas', 'summary'];
  for (const key of requiredTop) {
    if (!payload[key] || typeof payload[key] !== 'object') {
      throw new Error(`Performance report requires object field "${key}"`);
    }
  }
  if (!payload.shas.trunkSha || !payload.shas.headSha) {
    throw new Error('Performance report requires shas.trunkSha and shas.headSha');
  }
  if (!Array.isArray(payload.rawSamples)) {
    throw new Error('Performance report requires rawSamples array');
  }

  return {
    schema: PERFORMANCE_REPORT_SCHEMA,
    sprintId: payload.sprintId || 'SPRINT-GQC-06',
    generatedAt: payload.generatedAt || new Date().toISOString(),
    environment: payload.environment,
    shas: {
      preAstroBaselineSha: payload.shas.preAstroBaselineSha || null,
      trunkSha: String(payload.shas.trunkSha),
      headSha: String(payload.shas.headSha)
    },
    frameTierReconciliation: RECONCILED_FRAME_TIERS,
    provisionalRegressionGuard: PROVISIONAL_REGRESSION_GUARD,
    mpaBaselinePolicy: payload.mpaBaselinePolicy || {
      measured: false,
      status: 'deferred-not-blended',
      reason: 'PenPot MPA promotion remains deferred per GQC-05 and DECISIONS.tsv row 46'
    },
    summary: payload.summary,
    rawSamples: payload.rawSamples,
    placeBytes: payload.placeBytes || null,
    islandHydration: payload.islandHydration || null,
    transitionLatencies: payload.transitionLatencies || null,
    p0SpaStages: payload.p0SpaStages || null,
    modalities: payload.modalities || null,
    pairedTrunkVsHead: payload.pairedTrunkVsHead || null,
    pairedPreAstroVsHead: payload.pairedPreAstroVsHead || null,
    limiterAttribution: payload.limiterAttribution || null,
    optimizationDecision: payload.optimizationDecision || null
  };
}

export function persistPerformanceReport(payload, outputPath) {
  const report = payload?.schema === PERFORMANCE_REPORT_SCHEMA
    ? payload
    : createPerformanceReport(payload);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
}
