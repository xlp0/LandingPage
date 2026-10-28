import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PERFORMANCE_REPORT_SCHEMA,
  PROVISIONAL_REGRESSION_GUARD,
  RECONCILED_FRAME_TIERS,
  assertDisjointSurfaceSamples,
  createPerformanceReport,
  evaluatePairedSeries,
  normalizeFrameSample,
  normalizeMetricValue,
  normalizeNavigationSample,
  persistPerformanceReport
} from '../performance/metrics-model.mjs';
import {
  DEFAULT_ROOT_DIR,
  analyzePlaceBytes,
  reconcilePlaceBytesWithNetwork
} from '../performance/place-bytes.mjs';

test('GQC-06-UNIT-01: normalizeNavigationSample and normalizeFrameSample keep missing, invalid, and zero values distinguishable and reconcile 16.67ms/20ms/25ms frame tiers', () => {
  assert.deepEqual(normalizeMetricValue(null), {
    status: 'missing',
    value: null,
    isZero: false,
    reason: 'unavailable'
  });
  assert.deepEqual(normalizeMetricValue(undefined), {
    status: 'missing',
    value: null,
    isZero: false,
    reason: 'unavailable'
  });
  assert.deepEqual(normalizeMetricValue('unavailable'), {
    status: 'missing',
    value: null,
    isZero: false,
    reason: 'unavailable'
  });
  assert.deepEqual(normalizeMetricValue(0), {
    status: 'valid',
    value: 0,
    isZero: true,
    reason: null
  });
  assert.deepEqual(normalizeMetricValue(0, { allowZero: false }), {
    status: 'invalid',
    value: null,
    isZero: true,
    reason: 'zero-disallowed'
  });
  assert.equal(normalizeMetricValue(Number.NaN).status, 'invalid');
  assert.equal(normalizeMetricValue(Number.POSITIVE_INFINITY).status, 'invalid');
  assert.equal(normalizeMetricValue(-4.2).status, 'invalid');
  assert.equal(normalizeMetricValue('42').status, 'invalid');

  const navMissingVitals = normalizeNavigationSample({
    stepId: 'workbench-redirect',
    targetType: 'workbench',
    routeHandle: 'mcard:workbench:/',
    pageId: 'page_index',
    placeId: 'p_page_index',
    transitionId: 't_redirect_index_to_lab',
    readyCondition: 'redirect-to-responsive-lab',
    cacheState: 'cold',
    readyMs: 112.4,
    lcpMs: null,
    cls: undefined,
    jsDecodedBytes: 0,
    longTaskCount: 0,
    httpErrors: 0,
    pageErrors: 0
  });

  assert.equal(navMissingVitals.status, 'valid');
  assert.equal(navMissingVitals.metrics.lcpMs.status, 'missing');
  assert.equal(navMissingVitals.metrics.lcpMs.value, null);
  assert.equal(navMissingVitals.metrics.cls.status, 'missing');
  assert.equal(navMissingVitals.metrics.cls.value, null);
  assert.equal(navMissingVitals.metrics.jsDecodedBytes.status, 'valid');
  assert.equal(navMissingVitals.metrics.jsDecodedBytes.value, 0);
  assert.equal(navMissingVitals.metrics.jsDecodedBytes.isZero, true);

  const navZeroCls = normalizeNavigationSample({
    stepId: 'spa-target-load',
    targetType: 'spa',
    routeHandle: 'mcard:target:/tests/fixtures/spa-test-target.html#overview',
    pageId: 'page_spa_overview',
    placeId: 'p_spa_overview',
    transitionId: null,
    readyCondition: '#spa-app-root[data-place-id="p_spa_overview"]',
    readyMs: 28.5,
    lcpMs: 24.1,
    cls: 0
  });
  assert.equal(navZeroCls.metrics.cls.status, 'valid');
  assert.equal(navZeroCls.metrics.cls.value, 0);
  assert.equal(navZeroCls.metrics.cls.isZero, true);
  assert.notEqual(navZeroCls.metrics.cls.status, navMissingVitals.metrics.cls.status);

  const emptyFrames = normalizeFrameSample([]);
  assert.equal(emptyFrames.status, 'missing');
  assert.equal(emptyFrames.summary, null);
  assert.equal(emptyFrames.avgFps, null);

  const zeroOnlyFrames = normalizeFrameSample([0, 0]);
  assert.equal(zeroOnlyFrames.status, 'zero');
  assert.equal(zeroOnlyFrames.zeroCount, 2);
  assert.equal(zeroOnlyFrames.validPositiveCount, 0);
  assert.equal(zeroOnlyFrames.summary, null);

  const mixedFrames = normalizeFrameSample([16.5, 16.8, 0, null, undefined, -3, Number.NaN, 22.4]);
  assert.equal(mixedFrames.status, 'valid');
  assert.equal(mixedFrames.validPositiveCount, 3);
  assert.equal(mixedFrames.zeroCount, 1);
  assert.equal(mixedFrames.missingCount, 2);
  assert.equal(mixedFrames.invalidCount, 2);
  assert.equal(mixedFrames.tiers.vsyncIdeal.thresholdMs, 16.67);
  assert.equal(mixedFrames.tiers.t3HardwareTarget.thresholdMs, 20.0);
  assert.equal(mixedFrames.tiers.t1HeadlessAdvisory.thresholdMs, 25.0);
  assert.equal(mixedFrames.tiers.t1HeadlessAdvisory.blocking, false);
  assert.equal(mixedFrames.tiers.t1HeadlessAdvisory.status, 'pass');

  const enforcedSlowFrames = normalizeFrameSample([31.2, 33.4, 29.8], { enforce: true });
  assert.equal(enforcedSlowFrames.tiers.t1HeadlessAdvisory.blocking, true);
  assert.equal(enforcedSlowFrames.tiers.t1HeadlessAdvisory.status, 'fail');

  assert.throws(
    () =>
      assertDisjointSurfaceSamples([
        { targetType: 'spa', placeId: 'p_spa_overview' },
        { targetType: 'mpa-candidate', placeId: 'p_page_index' }
      ]),
    /SPA and MPA\/PenPot samples must never be blended/
  );
  assert.throws(
    () => assertDisjointSurfaceSamples([{ targetType: 'spa', designOnlyEdge: true }]),
    /Design-only PenPot edge/
  );
});

test('GQC-06-INT-01: persistPerformanceReport stores environment, raw samples, summary, frame tiers, and SHAs atomically', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc06-report-test-'));
  try {
    const trunkSeries = Array.from({ length: 21 }, (_, idx) => 110 + (idx % 5));
    const headNoChangeSeries = Array.from({ length: 21 }, (_, idx) => 111 + (idx % 5));
    const headFasterSeries = Array.from({ length: 21 }, (_, idx) => 72 + (idx % 4));

    const noChangeEval = evaluatePairedSeries(trunkSeries, headNoChangeSeries, {
      hasNamedLimiter: true
    });
    assert.equal(noChangeEval.verdict, 'no-measurable-difference');
    assert.equal(noChangeEval.qualifiesAsOptimization, false);
    assert.equal(noChangeEval.provisionalGuard.blocking, false);

    const unprofiledFasterEval = evaluatePairedSeries(trunkSeries, headFasterSeries, {
      hasNamedLimiter: false
    });
    assert.equal(unprofiledFasterEval.qualifiesAsOptimization, false);

    const profiledFasterEval = evaluatePairedSeries(trunkSeries, headFasterSeries, {
      hasNamedLimiter: true
    });
    assert.equal(profiledFasterEval.verdict, 'faster');
    assert.equal(profiledFasterEval.qualifiesAsOptimization, true);

    const outFile = path.join(tmpDir, 'perf-results.json');
    const reportInput = createPerformanceReport({
      environment: {
        browser: 'Chromium',
        browserVersion: '153.0.8010.12',
        os: 'darwin',
        arch: 'arm64',
        viewport: '1440x900',
        deviceScaleFactor: 1,
        networkMode: 'loopback-external-stubbed'
      },
      shas: {
        preAstroBaselineSha: '843cf65',
        trunkSha: 'e43ec38',
        headSha: 'e43ec38-gqc06'
      },
      summary: {
        primaryReadyP75Ms: noChangeEval.head.p75,
        verdict: noChangeEval.verdict
      },
      rawSamples: [
        {
          pairIndex: 1,
          side: 'trunk',
          readyMs: 110
        },
        {
          pairIndex: 1,
          side: 'head',
          readyMs: 111
        }
      ],
      pairedTrunkVsHead: {
        responsiveLabColdBoot: noChangeEval
      }
    });

    const persisted = persistPerformanceReport(reportInput, outFile);
    assert.equal(persisted.schema, PERFORMANCE_REPORT_SCHEMA);
    assert.equal(persisted.shas.preAstroBaselineSha, '843cf65');
    assert.equal(persisted.shas.trunkSha, 'e43ec38');
    assert.equal(persisted.shas.headSha, 'e43ec38-gqc06');
    assert.equal(persisted.environment.browser, 'Chromium');
    assert.equal(persisted.rawSamples.length, 2);
    assert.equal(persisted.frameTierReconciliation.vsyncIdeal.thresholdMs, RECONCILED_FRAME_TIERS.vsyncIdeal.thresholdMs);
    assert.equal(persisted.provisionalRegressionGuard.blocking, PROVISIONAL_REGRESSION_GUARD.blocking);
    assert.equal(persisted.mpaBaselinePolicy.status, 'deferred-not-blended');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('GQC-06-UNIT-02: analyzePlaceBytes splits island bundles vs shared chunks, reconciles with network logs, and fails when an island-free Place leaks island JS', () => {
  const analysis = analyzePlaceBytes({ rootDir: DEFAULT_ROOT_DIR });
  assert.equal(analysis.ok, true, analysis.violations.join('; '));
  assert.equal(analysis.pagePlaces.length, 6);

  const byId = new Map(analysis.pagePlaces.map((p) => [p.placeId, p]));
  const lab = byId.get('p_page_responsive_lab');
  assert.ok(lab, 'Expected p_page_responsive_lab in pagePlaces');
  assert.equal(lab.expectedIslandFree, false);
  assert.equal(lab.islandCount, 7);
  assert.equal(lab.islandBundles.eager.fileCount, 5);
  assert.equal(lab.islandBundles.deferred.fileCount, 2);
  assert.ok(lab.islandBundles.eager.rawBytes > 0);
  assert.ok(lab.islandBundles.eager.gzipBytes > 0);
  assert.ok(lab.islandBundles.eager.brotliBytes > 0);
  assert.ok(lab.sharedChunks.eager.rawBytes > 0);
  assert.ok(lab.sharedChunks.deduplicationSavingsRawBytes > 0);

  const simulatedLabColdNetwork = [
    ...lab.islandBundles.files
      .filter((f) => f.eagerBeforeInteraction)
      .map((f) => ({ url: f.urlPath, decodedBytes: f.rawBytes })),
    ...lab.sharedChunks.files.map((f) => ({ url: f.urlPath, decodedBytes: f.rawBytes }))
  ];
  const labReconciliation = reconcilePlaceBytesWithNetwork(lab, simulatedLabColdNetwork);
  assert.equal(labReconciliation.astroEagerDeltaBytes, 0);
  assert.equal(labReconciliation.astroManifestVsNetworkDeltaBytes, lab.islandBundles.deferred.rawBytes);
  assert.equal(labReconciliation.matchesWithinDocumentedChunkDifference, true);

  const islandFreeIds = [
    'p_page_index',
    'p_page_app',
    'p_page_sprint_registry',
    'p_page_fiber_inspector',
    'p_page_fiber_conformance'
  ];
  for (const id of islandFreeIds) {
    const place = byId.get(id);
    assert.ok(place, `Missing Place ${id}`);
    assert.equal(place.expectedIslandFree, true);
    assert.equal(place.zeroIslandPass, true);
    assert.equal(place.islandCount, 0);
    assert.equal(place.islandBundles.total.rawBytes, 0);
    assert.equal(place.sharedChunks.total.rawBytes, 0);
    assert.equal(place.astroInlineBootstrapBytes, 0);

    const cleanNetRec = reconcilePlaceBytesWithNetwork(place, []);
    assert.equal(cleanNetRec.matchesWithinDocumentedChunkDifference, true);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc06-leak-dist-'));
  try {
    fs.cpSync(path.join(DEFAULT_ROOT_DIR, 'dist', 'client'), tmpDir, { recursive: true });
    const leakedIslandFile = lab.islandBundles.files[0].urlPath;
    const registryHtmlPath = path.join(tmpDir, 'sprint-registry.html');
    const originalHtml = fs.readFileSync(registryHtmlPath, 'utf8');
    fs.writeFileSync(
      registryHtmlPath,
      originalHtml.replace(
        '</body>',
        `<astro-island uid="leak" component-url="${leakedIslandFile}" client="load"></astro-island></body>`
      ),
      'utf8'
    );

    const leakedAnalysis = analyzePlaceBytes({
      rootDir: DEFAULT_ROOT_DIR,
      distClientDir: tmpDir
    });
    assert.equal(leakedAnalysis.ok, false);
    assert.ok(
      leakedAnalysis.violations.some((v) => v.includes('p_page_sprint_registry')),
      `Expected violation for p_page_sprint_registry, got: ${leakedAnalysis.violations.join('; ')}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
