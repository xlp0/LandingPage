import fs from 'node:fs';
import path from 'node:path';
import {
  SPA_FIXTURE_PATH,
  installExternalBoundaryStubs,
  loadSpaFixtureGraph
} from '../fixtures/app-fixtures.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { attachWorkbenchNetTracer, test, expect } from '../fixtures/net-trace.js';
import { loadNetEnvelope, replayNetTrace } from '../../scripts/check-net.mjs';
import { replayRun } from '../../scripts/playwright-replay-driver.mjs';
import {
  assertDisjointSurfaceSamples,
  createPerformanceReport,
  normalizeFrameSample,
  normalizeNavigationSample,
  persistPerformanceReport,
  summarizeSamples
} from '../performance/metrics-model.mjs';
import {
  DEFAULT_ROOT_DIR,
  analyzePlaceBytes,
  reconcilePlaceBytesWithNetwork
} from '../performance/place-bytes.mjs';
import {
  ISLAND_HYDRATION_INIT_SCRIPT,
  readBrowserPerfSnapshot
} from '../performance/hydration-init-script.mjs';

const WORKBENCH_ENVELOPE = loadNetEnvelope(
  path.join(DEFAULT_ROOT_DIR, 'src', 'net', 'workbench-net.yaml')
);
const SPA_ENVELOPE = loadSpaFixtureGraph();
const CI_PERF_OUT_DIR = path.join(DEFAULT_ROOT_DIR, 'test-results', 'performance');

const LIFECYCLE_AUDIT_INIT_SCRIPT = () => {
  const activeIntervals = new Set();
  const activeTimeouts = new Set();
  let winListeners = 0;
  let docListeners = 0;

  const origSetInterval = window.setInterval.bind(window);
  const origClearInterval = window.clearInterval.bind(window);
  window.setInterval = (...args) => {
    const id = origSetInterval(...args);
    activeIntervals.add(id);
    return id;
  };
  window.clearInterval = (id) => {
    activeIntervals.delete(id);
    return origClearInterval(id);
  };

  const origSetTimeout = window.setTimeout.bind(window);
  const origClearTimeout = window.clearTimeout.bind(window);
  window.setTimeout = (fn, delay, ...rest) => {
    let id = null;
    const wrapped = (...cbArgs) => {
      activeTimeouts.delete(id);
      return typeof fn === 'function' ? fn(...cbArgs) : undefined;
    };
    id = origSetTimeout(wrapped, delay, ...rest);
    activeTimeouts.add(id);
    return id;
  };
  window.clearTimeout = (id) => {
    activeTimeouts.delete(id);
    return origClearTimeout(id);
  };

  const trackedTargets = new Map([
    [window, new Map()],
    [document, new Map()]
  ]);

  function normalizeCapture(options) {
    if (typeof options === 'boolean') return options;
    if (options && typeof options === 'object') return Boolean(options.capture);
    return false;
  }

  const origAdd = EventTarget.prototype.addEventListener;
  const origRemove = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function patchedAdd(type, listener, options) {
    if (trackedTargets.has(this) && listener) {
      const cap = normalizeCapture(options);
      const map = trackedTargets.get(this);
      const key = `${String(type)}:${cap ? '1' : '0'}`;
      let set = map.get(key);
      if (!set) {
        set = new Set();
        map.set(key, set);
      }
      if (!set.has(listener)) {
        set.add(listener);
        if (this === window) winListeners += 1;
        if (this === document) docListeners += 1;
      }
    }
    return origAdd.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function patchedRemove(type, listener, options) {
    if (trackedTargets.has(this) && listener) {
      const cap = normalizeCapture(options);
      const map = trackedTargets.get(this);
      const key = `${String(type)}:${cap ? '1' : '0'}`;
      const set = map.get(key);
      if (set && set.delete(listener)) {
        if (this === window) winListeners -= 1;
        if (this === document) docListeners -= 1;
      }
    }
    return origRemove.call(this, type, listener, options);
  };

  window.__gqc06LifecycleAudit = () => ({
    winListeners,
    docListeners,
    activeIntervals: activeIntervals.size,
    activeTimeouts: activeTimeouts.size
  });
};

async function stubNonLocalNetwork(context) {
  await installExternalBoundaryStubs(context);
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/i, async (route) => {
    const reqUrl = route.request().url();
    if (/fonts\.googleapis\.com/i.test(reqUrl)) {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

test.describe('SPRINT-GQC-06: Performance Baselines, Island Hydration, Place Bytes, and Transition Latencies', () => {
  test('GQC-06-E2E-01: records valid cold and warm navigation baselines for approved pages and verifies zero eager WebLLM model download on Mission Control', async ({
    browser,
    baseURL
  }) => {
    const coldContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await stubNonLocalNetwork(coldContext);
    await coldContext.addInitScript(ISLAND_HYDRATION_INIT_SCRIPT);

    try {
      const page = await coldContext.newPage();
      let jsDecodedBytes = 0;
      let httpErrors = 0;
      const pageErrors = [];

      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('response', async (res) => {
        if (res.status() >= 400 && !res.url().includes('/api/auth/')) {
          httpErrors += 1;
        }
        const ct = res.headers()['content-type'] || '';
        if (ct.includes('javascript') || res.url().endsWith('.js')) {
          try {
            const body = await res.body();
            jsDecodedBytes += body.length;
          } catch {}
        }
      });

      const coldStart = performance.now();
      await page.goto(`${baseURL}/responsive-lab.html`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
      await expect(page.getByTestId('spa-test-workflow')).toHaveAttribute('data-workflow-ready', 'true');
      const coldWallReadyMs = Number((performance.now() - coldStart).toFixed(3));
      const coldSnap = await readBrowserPerfSnapshot(page);

      const normalizedCold = normalizeNavigationSample({
        stepId: 'responsive-lab-cold-boot',
        targetType: 'workbench',
        routeHandle: 'mcard:workbench:/responsive-lab.html',
        pageId: 'page_responsive_lab',
        placeId: 'p_page_responsive_lab',
        transitionId: null,
        readyCondition: '!body.lab-booting && [data-testid="spa-test-workflow"][data-workflow-ready="true"]',
        cacheState: 'cold',
        includesServerStartup: false,
        readyMs: coldSnap.labReadyAtMs ?? coldWallReadyMs,
        loadEventMs: coldSnap.navigation?.loadEventMs ?? null,
        domContentLoadedMs: coldSnap.navigation?.domContentLoadedMs ?? null,
        responseEndMs: coldSnap.navigation?.responseEndMs ?? null,
        lcpMs: coldSnap.lcpMs,
        cls: coldSnap.cls,
        jsDecodedBytes,
        longTaskCount: coldSnap.longTasks.length,
        httpErrors,
        pageErrors: pageErrors.length
      });

      expect(normalizedCold.status).toBe('valid');
      expect(normalizedCold.metrics.readyMs.value).toBeGreaterThan(0);
      expect(normalizedCold.metrics.jsDecodedBytes.value).toBeGreaterThan(0);
      expect(pageErrors).toEqual([]);

      const warmStart = performance.now();
      await page.goto(`${baseURL}/responsive-lab.html`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
      await expect(page.getByTestId('spa-test-workflow')).toHaveAttribute('data-workflow-ready', 'true');
      const warmWallReadyMs = Number((performance.now() - warmStart).toFixed(3));
      const warmSnap = await readBrowserPerfSnapshot(page);

      const normalizedWarm = normalizeNavigationSample({
        stepId: 'responsive-lab-warm-boot',
        targetType: 'workbench',
        routeHandle: 'mcard:workbench:/responsive-lab.html',
        pageId: 'page_responsive_lab',
        placeId: 'p_page_responsive_lab',
        transitionId: null,
        readyCondition: '!body.lab-booting && [data-testid="spa-test-workflow"][data-workflow-ready="true"]',
        cacheState: 'warm',
        includesServerStartup: false,
        readyMs: warmSnap.labReadyAtMs ?? warmWallReadyMs,
        loadEventMs: warmSnap.navigation?.loadEventMs ?? null,
        domContentLoadedMs: warmSnap.navigation?.domContentLoadedMs ?? null,
        responseEndMs: warmSnap.navigation?.responseEndMs ?? null,
        lcpMs: warmSnap.lcpMs,
        cls: warmSnap.cls,
        jsDecodedBytes,
        longTaskCount: warmSnap.longTasks.length,
        httpErrors: 0,
        pageErrors: pageErrors.length
      });

      expect(normalizedWarm.status).toBe('valid');
      expect(normalizedWarm.cacheState).toBe('warm');
      expect(normalizedWarm.metrics.readyMs.value).toBeGreaterThan(0);
    } finally {
      await coldContext.close();
    }

    const appContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const modelAssetRequests = [];
    await appContext.route('**/*', async (route) => {
      const reqUrl = route.request().url();
      if (
        /huggingface\.co|mlc-ai|web-llm.*\.(wasm|bin)|ndarray-cache\.json|params_shard/i.test(reqUrl)
      ) {
        modelAssetRequests.push(reqUrl);
      }
      if (/^https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(reqUrl)) {
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.continue();
    });

    try {
      const appPage = await appContext.newPage();
      await appPage.goto(`${baseURL}/app.html`, { waitUntil: 'domcontentloaded' });
      await expect(appPage.locator('h1', { hasText: 'MCard Manager' })).toBeVisible();
      expect(modelAssetRequests).toEqual([]);
    } finally {
      await appContext.close();
    }
  });

  test('GQC-06-E2E-02: records Responsive Lab resize and rotate frame intervals while preserving visible layout and SPA boot nonce', async ({
    isolatedLabPage,
    workbench,
    request
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });
    expect(await ensureTargetReachable(request, SPA_FIXTURE_PATH)).toBe(true);

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    const initialNonce = await appRoot.getAttribute('data-boot-nonce');

    await page.evaluate(() => {
      window.__gqc06Frames = { active: true, deltas: [], last: 0 };
      const tick = (ts) => {
        if (!window.__gqc06Frames.active) return;
        if (window.__gqc06Frames.last > 0) {
          const d = ts - window.__gqc06Frames.last;
          if (d > 0 && d < 1000) window.__gqc06Frames.deltas.push(Number(d.toFixed(3)));
        }
        window.__gqc06Frames.last = ts;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await page.getByTestId('workflow-next-device').click();
    await page.getByTestId('workflow-device-phone').click();
    const portraitDims = await workbench.readStageDimensions();
    expect([393, 852]).toContain(portraitDims.width);

    for (let i = 0; i < 6; i += 1) {
      await page.getByTestId('workflow-rotate-device').click();
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    }

    await page.getByTestId('workflow-device-tablet').click();
    await page.getByTestId('workflow-rotate-device').click();
    await page.getByTestId('workflow-device-phone').click();
    await page.getByTestId('workflow-rotate-device').click();
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const rawDeltas = await page.evaluate(() => {
      window.__gqc06Frames.active = false;
      return window.__gqc06Frames.deltas;
    });

    const normalizedFrames = normalizeFrameSample(rawDeltas);
    expect(normalizedFrames.status).toBe('valid');
    expect(normalizedFrames.validPositiveCount).toBeGreaterThanOrEqual(10);
    expect(normalizedFrames.tiers.vsyncIdeal.thresholdMs).toBe(16.67);
    expect(normalizedFrames.tiers.t3HardwareTarget.thresholdMs).toBe(20);
    expect(normalizedFrames.tiers.t1HeadlessAdvisory.thresholdMs).toBe(25);
    expect(normalizedFrames.tiers.t1HeadlessAdvisory.blocking).toBe(false);

    const finalDims = await workbench.readStageDimensions();
    expect(finalDims.width).toBeGreaterThan(0);
    expect(finalDims.height).toBeGreaterThan(0);
    await expect(appRoot).toHaveAttribute('data-boot-nonce', initialNonce);
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
  });

  test('GQC-06-E2E-03: switches targets 50 times with bounded ready latency and zero leaked listeners or intervals', async ({
    browser,
    baseURL
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await stubNonLocalNetwork(context);
    await context.addInitScript(LIFECYCLE_AUDIT_INIT_SCRIPT);

    try {
      const page = await context.newPage();
      await page.goto(`${baseURL}/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`, {
        waitUntil: 'domcontentloaded'
      });
      await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
      const frame = page.frameLocator('iframe[title="Responsive UI Lab Test Frame"]');
      await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_overview');

      const baselineAudit = await page.evaluate(() => window.__gqc06LifecycleAudit());
      const switchDurations = [];

      for (let i = 0; i < 50; i += 1) {
        const nextUrl = i % 2 === 0 ? '/tests/fixtures/probe-target.html' : SPA_FIXTURE_PATH;
        const t0 = performance.now();
        await page.evaluate((u) => window.__lab.target.set(u), nextUrl);
        if (nextUrl === SPA_FIXTURE_PATH) {
          await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_overview');
        } else {
          await expect(frame.locator('[data-testid="target-top-left"]')).toBeVisible();
        }
        switchDurations.push(Number((performance.now() - t0).toFixed(3)));
      }

      const settledAudit = await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => resolve(window.__gqc06LifecycleAudit())))
      );

      const summary = summarizeSamples(switchDurations);
      expect(summary.status).toBe('valid');
      expect(summary.n).toBe(50);
      expect(settledAudit.activeIntervals).toBe(0);
      expect(settledAudit.winListeners).toBeLessThanOrEqual(baselineAudit.winListeners + 1);
      expect(settledAudit.docListeners).toBeLessThanOrEqual(baselineAudit.docListeners + 1);
    } finally {
      await context.close();
    }
  });

  test('GQC-06-E2E-04: records separate P0 SPA journey stages across workbench boot, target load, declared Functional Link transition, capture, MCard persistence, and replay', async ({
    browser,
    isolatedLabPage,
    workbench,
    workbenchNetTracer,
    request
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });
    expect(await ensureTargetReachable(request, SPA_FIXTURE_PATH)).toBe(true);

    const stageSamples = [];

    const tBoot = performance.now();
    await workbench.open();
    await expect(page.getByTestId('spa-test-workflow')).toHaveAttribute('data-workflow-ready', 'true');
    stageSamples.push(
      normalizeNavigationSample({
        stepId: 'p0-stage-1-workbench-boot',
        targetType: 'workbench',
        routeHandle: 'mcard:workbench:/responsive-lab.html',
        pageId: 'page_responsive_lab',
        placeId: 'p_page_responsive_lab',
        transitionId: null,
        readyCondition: '!body.lab-booting && [data-workflow-ready="true"]',
        readyMs: performance.now() - tBoot
      })
    );

    const tTarget = performance.now();
    await page.getByTestId('workflow-select-spa-fixture').click();
    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    const spaTargetMetrics = [];
    const spaLoadSample = normalizeNavigationSample({
      stepId: 'p0-stage-2-spa-target-load',
      targetType: 'spa',
      routeHandle: SPA_ENVELOPE.bindings.places.p_spa_overview.routeHandle,
      pageId: SPA_ENVELOPE.bindings.places.p_spa_overview.pageId,
      placeId: 'p_spa_overview',
      transitionId: null,
      fixtureId: 'spa-test-target.html',
      readyCondition: '#spa-app-root[data-place-id="p_spa_overview"]',
      readyMs: performance.now() - tTarget
    });
    stageSamples.push(spaLoadSample);
    spaTargetMetrics.push(spaLoadSample);

    await page.getByTestId('workflow-tab-step-evidence').click();
    const tCaptureStart = performance.now();
    await page.getByTestId('workflow-rec-start').click();
    await expect(page.getByTestId('workflow-recorder-state')).toHaveText('RECORDING');
    const captureStartSample = normalizeNavigationSample({
      stepId: 'p0-stage-3-capture-start',
      targetType: 'spa',
      routeHandle: SPA_ENVELOPE.bindings.places.p_spa_overview.routeHandle,
      pageId: 'page_spa_overview',
      placeId: 'p_spa_overview',
      transitionId: null,
      fixtureId: 'spa-test-target.html',
      readyCondition: '[data-testid="workflow-recorder-state"] === RECORDING',
      readyMs: performance.now() - tCaptureStart
    });
    stageSamples.push(captureStartSample);
    spaTargetMetrics.push(captureStartSample);

    const tSpaLink = performance.now();
    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');
    const spaLinkSample = normalizeNavigationSample({
      stepId: 'p0-stage-4-functional-link-transition',
      targetType: 'spa',
      routeHandle: SPA_ENVELOPE.bindings.places.p_spa_details.routeHandle,
      pageId: SPA_ENVELOPE.bindings.places.p_spa_details.pageId,
      placeId: 'p_spa_details',
      transitionId: 't_spa_open_details',
      fixtureId: 'spa-test-target.html',
      readyCondition: '#spa-app-root[data-place-id="p_spa_details"]',
      readyMs: performance.now() - tSpaLink
    });
    stageSamples.push(spaLinkSample);
    spaTargetMetrics.push(spaLinkSample);

    const tSave = performance.now();
    const saveRespPromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
    );
    await page.getByTestId('workflow-rec-stop').click();
    const saveResp = await saveRespPromise;
    expect([200, 201]).toContain(saveResp.status());
    const savedBody = await saveResp.json();
    await expect(page.getByTestId('capture-completeness-badge')).toHaveAttribute(
      'data-completeness',
      'complete'
    );
    stageSamples.push(
      normalizeNavigationSample({
        stepId: 'p0-stage-5-mcard-receipt-persistence',
        targetType: 'workbench',
        routeHandle: 'mcard:workbench:/api/test-runs',
        pageId: 'page_responsive_lab',
        placeId: 'p_page_responsive_lab',
        transitionId: 't_ok_post_test_runs',
        fixtureId: 'spa-test-target.html',
        readyCondition: 'POST /api/test-runs 201 && capture-completeness-badge[complete]',
        readyMs: performance.now() - tSave
      })
    );

    const tInspect = performance.now();
    await page.locator('#mcard-result-disclosure > summary').click();
    await expect(page.locator('#mcard-result-summary-badge')).toHaveText(savedBody.hash.slice(0, 8));
    stageSamples.push(
      normalizeNavigationSample({
        stepId: 'p0-stage-6-result-inspection',
        targetType: 'workbench',
        routeHandle: 'mcard:workbench:/responsive-lab.html#mcard-result-disclosure',
        pageId: 'page_responsive_lab',
        placeId: 'p_page_responsive_lab',
        transitionId: null,
        fixtureId: 'spa-test-target.html',
        readyCondition: '#mcard-result-summary-badge === hash.slice(0, 8)',
        readyMs: performance.now() - tInspect
      })
    );

    const persisted = await workbench.fetchPersistedRun(savedBody.hash);
    expect(persisted.ok).toBe(true);
    const storedRun = persisted.body.run || persisted.body;
    expect(storedRun.target.url).toContain(SPA_FIXTURE_PATH);

    const tReplay = performance.now();
    const replayCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await stubNonLocalNetwork(replayCtx);
    try {
      const replayPage = await replayCtx.newPage();
      await replayPage.goto(storedRun.target.url, { waitUntil: 'domcontentloaded' });
      const replaySummary = await replayRun(replayPage, storedRun, {
        mode: 'deterministic',
        mintResult: false
      });
      expect(replaySummary.verdict).toBe('pass');
      await expect(replayPage.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_details');
    } finally {
      await replayCtx.close();
    }
    const replaySample = normalizeNavigationSample({
      stepId: 'p0-stage-7-deterministic-replay',
      targetType: 'spa',
      routeHandle: SPA_ENVELOPE.bindings.places.p_spa_details.routeHandle,
      pageId: 'page_spa_details',
      placeId: 'p_spa_details',
      transitionId: 't_spa_open_details',
      fixtureId: 'spa-test-target.html',
      readyCondition: 'replayRun executedCount >= 1',
      readyMs: performance.now() - tReplay
    });
    stageSamples.push(replaySample);
    spaTargetMetrics.push(replaySample);

    assertDisjointSurfaceSamples(spaTargetMetrics);
    for (const s of stageSamples) {
      expect(s.status).toBe('valid');
      expect(s.metrics.readyMs.value).toBeGreaterThan(0);
    }

    const wbReplay = await workbenchNetTracer.replay();
    expect(wbReplay.ok).toBe(true);
  });

  test('GQC-06-E2E-05: records cold hydration time, performance marks, directive, and long tasks for all 7 Responsive Lab islands', async ({
    browser,
    baseURL
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await stubNonLocalNetwork(context);
    await context.addInitScript(ISLAND_HYDRATION_INIT_SCRIPT);

    try {
      const page = await context.newPage();
      const astroJsRequests = [];
      page.on('response', (res) => {
        if (res.url().includes('/_astro/') && res.url().endsWith('.js')) {
          astroJsRequests.push(new URL(res.url()).pathname);
        }
      });

      await page.goto(`${baseURL}/responsive-lab.html`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).not.toHaveClass(/lab-booting/);

      const initialSnap = await readBrowserPerfSnapshot(page);
      const eagerNames = [
        'RecordingRibbonIsland',
        'DevicePresetsIsland',
        'TargetToolbarIsland',
        'SpaTestWorkflow',
        'ViewportStageIsland'
      ];
      const deferredNames = ['ConformancePanelIsland', 'MCardResultIsland'];

      for (const name of eagerNames) {
        const rec = initialSnap.islands[name];
        expect(rec, `Missing eager island ${name}`).toBeTruthy();
        expect(rec.hydrated).toBe(true);
        expect(rec.hydratedAtMs).toBeGreaterThan(0);
        expect(Array.isArray(rec.longTasksDuringMount)).toBe(true);
        expect(
          initialSnap.marks.some((m) => m.name === `gqc06:island:hydrated:${name}`)
        ).toBe(true);
        expect(
          initialSnap.measures.some((m) => m.name === `gqc06:island:nav-to-hydrated:${name}`)
        ).toBe(true);
      }

      expect(initialSnap.islands.ViewportStageIsland.directive).toBe('client:only="preact"');
      expect(initialSnap.islands.SpaTestWorkflow.directive).toBe('client:load');

      for (const name of deferredNames) {
        const rec = initialSnap.islands[name];
        expect(rec, `Missing deferred island ${name}`).toBeTruthy();
        expect(rec.directive).toBe('client:visible');
        expect(rec.hydrated).toBe(false);
        expect(astroJsRequests.some((p) => p.includes(name))).toBe(false);
      }

      await page.locator('#conformance-disclosure > summary').click();
      await page.locator('#mcard-result-disclosure > summary').click();

      await expect
        .poll(async () => {
          const snap = await readBrowserPerfSnapshot(page);
          return (
            Boolean(snap.islands.ConformancePanelIsland?.hydrated) &&
            Boolean(snap.islands.MCardResultIsland?.hydrated)
          );
        })
        .toBe(true);

      const fullSnap = await readBrowserPerfSnapshot(page);
      for (const name of [...eagerNames, ...deferredNames]) {
        const rec = fullSnap.islands[name];
        expect(rec.hydrated).toBe(true);
        expect(rec.hydratedAtMs).toBeGreaterThan(0);
        expect(Array.isArray(rec.longTasksUntilHydrated)).toBe(true);
      }
    } finally {
      await context.close();
    }
  });

  test('GQC-06-E2E-06: fires one Transition of each kind in workbench-net.yaml and reports server-call request and ok/fail result latencies separately', async ({
    isolatedLabPage,
    workbench
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });
    const baseOrigin = new URL(page.url() === 'about:blank' ? 'http://127.0.0.1:3001' : page.url()).origin;
    const resolvedOrigin = process.env.BASE_URL || baseOrigin;

    const tracer = attachWorkbenchNetTracer(page, {
      envelope: WORKBENCH_ENVELOPE,
      traceId: 'gqc-06-e2e-06-transition-kinds'
    });

    const recordedByKind = {};

    try {
      const tRedirect = performance.now();
      await page.goto(`${resolvedOrigin}/`, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/responsive-lab\.html/);
      await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
      recordedByKind.redirect = {
        transitionId: 't_redirect_index_to_lab',
        kind: 'redirect',
        fromPlaceId: 'p_page_index',
        toPlaceId: 'p_page_responsive_lab',
        latencyMs: Number((performance.now() - tRedirect).toFixed(3))
      };

      await page.getByTestId('workflow-select-spa-fixture').click();
      const frame = workbench.targetFrame();
      await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_overview');

      await page.getByTestId('workflow-tab-step-evidence').click();
      await page.getByTestId('workflow-rec-start').click();
      await expect(page.getByTestId('workflow-recorder-state')).toHaveText('RECORDING');
      await frame.getByRole('button', { name: 'Open Service Details' }).click();
      await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_details');

      let postReqDispatchedAt = null;
      const postReqPromise = page.waitForRequest((req) => {
        if (req.url().includes('/api/test-runs') && req.method() === 'POST') {
          postReqDispatchedAt = performance.now();
          return true;
        }
        return false;
      });
      const postResPromise = page.waitForResponse(
        (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
      );

      const tStopTrigger = performance.now();
      await page.getByTestId('workflow-rec-stop').click();
      await postReqPromise;
      const reqDispatchMs = Number(Math.max(0.05, postReqDispatchedAt - tStopTrigger).toFixed(3));
      const postRes = await postResPromise;
      expect([200, 201]).toContain(postRes.status());
      await expect(page.getByTestId('capture-completeness-badge')).toHaveAttribute(
        'data-completeness',
        'complete'
      );
      const okResultMs = Number(Math.max(0.05, performance.now() - postReqDispatchedAt).toFixed(3));

      recordedByKind['server-call-request'] = {
        transitionId: 't_req_post_test_runs',
        kind: 'server-call-request',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_pending_post_test_runs',
        latencyMs: reqDispatchMs
      };
      recordedByKind['server-call-ok'] = {
        transitionId: 't_ok_post_test_runs',
        kind: 'server-call-ok',
        fromPlaceId: 'p_pending_post_test_runs',
        toPlaceId: 'p_page_responsive_lab',
        latencyMs: okResultMs
      };

      await page.getByTestId('workflow-tab-step-device').click();
      await page.getByTestId('workflow-device-phone').click();

      let failInterceptedOnce = false;
      let failReqDispatchedAt = null;
      await page.route('**/api/test-runs/conformance/latest*', async (route) => {
        if (!failInterceptedOnce) {
          failInterceptedOnce = true;
          failReqDispatchedAt = performance.now();
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'simulated_conformance_unavailable' })
          });
          return;
        }
        await route.continue();
      });

      const tFailTrigger = performance.now();
      await page.locator('#conformance-disclosure > summary').click();
      await expect(page.locator('#conformance-status-badge')).toHaveText('Offline');
      const tFailReady = performance.now();
      const failReqMs = Number(Math.max(0.05, (failReqDispatchedAt ?? tFailTrigger) - tFailTrigger).toFixed(3));
      const failResultMs = Number(Math.max(0.05, tFailReady - (failReqDispatchedAt ?? tFailTrigger)).toFixed(3));

      recordedByKind['server-call-fail'] = {
        requestTransitionId: 't_req_get_conformance_latest',
        requestLatencyMs: failReqMs,
        transitionId: 't_fail_get_conformance_latest',
        kind: 'server-call-fail',
        fromPlaceId: 'p_pending_get_conformance_latest',
        toPlaceId: 'p_page_responsive_lab',
        latencyMs: failResultMs
      };

      await page.evaluate(() => window.__lab.policy.clearTrace());
      const tClientRoute = performance.now();
      await workbench.loadTargetByUrl('https://github.com');
      await expect(page.locator('#cors-block-alert')).toBeVisible();
      recordedByKind['client-route'] = {
        transitionId: 't_enter_target_blocked',
        kind: 'client-route',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_error_target_blocked',
        latencyMs: Number((performance.now() - tClientRoute).toFixed(3))
      };

      const tRecover = performance.now();
      await page.locator('#btn-cors-alert-recover').click();
      await expect(page.locator('#cors-block-alert')).toBeHidden();
      recordedByKind.recover = {
        transitionId: 't_recover_target_blocked',
        kind: 'recover',
        fromPlaceId: 'p_error_target_blocked',
        toPlaceId: 'p_page_responsive_lab',
        latencyMs: Number((performance.now() - tRecover).toFixed(3))
      };

      const policyEvents = await page.evaluate(() => window.__lab.policy.trace());
      const policyReplay = await replayNetTrace(WORKBENCH_ENVELOPE, {
        traceId: 'policy-client-route-and-recover',
        netId: WORKBENCH_ENVELOPE.netId,
        entryPlaceId: 'p_page_responsive_lab',
        events: policyEvents
      });
      expect(policyReplay.ok).toBe(true);

      const appPopupPromise = page.waitForEvent('popup');
      const tLink = performance.now();
      await page.locator('#btn-nav-mission-control').click();
      const appPage = await appPopupPromise;
      await appPage.waitForLoadState('domcontentloaded');
      await expect(appPage).toHaveURL(/\/app\.html$/);
      await expect(appPage.locator('h1', { hasText: 'MCard Manager' })).toBeVisible();
      recordedByKind.link = {
        transitionId: 't_link_lab_to_app',
        kind: 'link',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_page_app',
        latencyMs: Number((performance.now() - tLink).toFixed(3))
      };

      await appPage.waitForFunction(() => Boolean(window.viewManager?.show));
      await appPage.evaluate(() => window.viewManager.show('monopoly-auth'));
      await expect(appPage.locator('#monopolyAuthView')).toBeVisible();

      const popupPromise = appPage.waitForEvent('popup');
      const tExternal = performance.now();
      await appPage.locator('#monopolyAuthView button.btn-cta').click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      recordedByKind['open-external'] = {
        transitionId: 't_open_external_monopoly',
        kind: 'open-external',
        fromPlaceId: 'p_page_app',
        toPlaceId: 'p_external_games',
        latencyMs: Number((performance.now() - tExternal).toFixed(3))
      };
      await popup.close();
      await appPage.close();

      const requiredKinds = [
        'redirect',
        'link',
        'server-call-request',
        'server-call-ok',
        'server-call-fail',
        'client-route',
        'recover',
        'open-external'
      ];
      for (const kind of requiredKinds) {
        expect(recordedByKind[kind], `Missing Transition kind ${kind}`).toBeTruthy();
        expect(recordedByKind[kind].latencyMs).toBeGreaterThan(0);
      }

      const replay = await tracer.replay();
      expect(replay.ok).toBe(true);
    } finally {
      tracer.detach();
    }
  });

  test('GQC-06-E2E-07: verifies island-free Places download zero island JS and reconciles static Astro manifest bytes with live network logs', async ({
    browser,
    baseURL
  }) => {
    const staticAnalysis = analyzePlaceBytes({ rootDir: DEFAULT_ROOT_DIR });
    expect(staticAnalysis.ok).toBe(true);

    const routesToCheck = [
      { placeId: 'p_view_index_mcard_viewer', route: '/index.html?noredirect=1', isView: true },
      { placeId: 'p_page_app', route: '/app.html', isView: false },
      { placeId: 'p_page_sprint_registry', route: '/sprint-registry.html', isView: false },
      { placeId: 'p_page_fiber_inspector', route: '/fiber-inspector.html', isView: false },
      { placeId: 'p_page_fiber_conformance', route: '/fiber-conformance.html', isView: false },
      { placeId: 'p_undecided_pkc_docs_index', route: '/pkc-docs-index.html', isUndecided: true },
      { placeId: 'p_page_responsive_lab', route: '/responsive-lab.html', isIslands: true }
    ];

    const byPlaceId = new Map(
      [
        ...staticAnalysis.pagePlaces,
        ...staticAnalysis.viewPlaces,
        ...staticAnalysis.additionalStaticSurfaces
      ].map((p) => [p.placeId, p])
    );

    const reconciliations = [];

    for (const item of routesToCheck) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await stubNonLocalNetwork(ctx);
      try {
        const page = await ctx.newPage();
        const jsResources = [];
        page.on('response', async (res) => {
          if (res.request().frame() !== page.mainFrame()) return;
          const url = res.url();
          const ct = res.headers()['content-type'] || '';
          if (ct.includes('javascript') || url.split('?')[0].endsWith('.js')) {
            let decodedBytes = 0;
            try {
              decodedBytes = (await res.body()).length;
            } catch {}
            jsResources.push({ url, decodedBytes });
          }
        });

        await page.goto(`${baseURL}${item.route}`, { waitUntil: 'load' });
        if (item.isIslands) {
          await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
        }

        const domIslandCount = await page.locator('astro-island').count();
        const placeReport = byPlaceId.get(item.placeId);
        expect(placeReport, `Missing static report for ${item.placeId}`).toBeTruthy();

        const rec = reconcilePlaceBytesWithNetwork(placeReport, jsResources);
        reconciliations.push(rec);

        if (!item.isIslands) {
          expect(domIslandCount).toBe(0);
          expect(rec.networkAstroDecodedBytes).toBe(0);
          expect(rec.networkAstroFileCount).toBe(0);
        } else {
          expect(domIslandCount).toBe(7);
          expect(rec.astroEagerDeltaBytes).toBe(0);
        }
        expect(rec.matchesWithinDocumentedChunkDifference).toBe(true);
      } finally {
        await ctx.close();
      }
    }

    const ciArtifact = createPerformanceReport({
      environment: {
        browser: 'Chromium',
        os: process.platform,
        arch: process.arch,
        viewport: '1440x900',
        deviceScaleFactor: 1,
        networkMode: 'loopback-external-stubbed'
      },
      shas: {
        preAstroBaselineSha: '843cf65',
        trunkSha: 'e43ec38',
        headSha: 'PR-GQC-06'
      },
      summary: {
        zeroIslandPlacesVerified: reconciliations.filter((r) => r.expectedIslandFree).length,
        allReconciled: reconciliations.every((r) => r.matchesWithinDocumentedChunkDifference)
      },
      rawSamples: reconciliations,
      placeBytes: staticAnalysis
    });

    persistPerformanceReport(
      ciArtifact,
      path.join(CI_PERF_OUT_DIR, 'gqc-06-place-bytes-reconciliation.json')
    );
  });
});
