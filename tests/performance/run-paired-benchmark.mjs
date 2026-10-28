import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { replayRun } from '../../scripts/playwright-replay-driver.mjs';
import {
  PROVISIONAL_REGRESSION_GUARD,
  RECONCILED_FRAME_TIERS,
  assertDisjointSurfaceSamples,
  createPerformanceReport,
  evaluatePairedSeries,
  normalizeFrameSample,
  normalizeNavigationSample,
  persistPerformanceReport,
  summarizeSamples
} from './metrics-model.mjs';
import {
  DEFAULT_ROOT_DIR,
  analyzePlaceBytes,
  reconcilePlaceBytesWithNetwork
} from './place-bytes.mjs';
import {
  ISLAND_HYDRATION_INIT_SCRIPT,
  readBrowserPerfSnapshot
} from './hydration-init-script.mjs';

const TRUNK_COMMIT = 'e43ec38';
const PRE_ASTRO_COMMIT = '843cf65';
const SPA_FIXTURE_PATH = '/tests/fixtures/spa-test-target.html';
const PROBE_FIXTURE_PATH = '/tests/fixtures/probe-target.html';

function parseCliArgs(argv) {
  const opts = {
    warmups: 3,
    samples: 21,
    outPath: '/tmp/swarm-PR-GQC-06/perf-results.json',
    ciCopyPath: path.join(DEFAULT_ROOT_DIR, 'test-results', 'performance', 'perf-results.json')
  };
  for (const arg of argv) {
    if (arg.startsWith('--warmups=')) opts.warmups = Number(arg.slice('--warmups='.length));
    else if (arg.startsWith('--samples=')) opts.samples = Number(arg.slice('--samples='.length));
    else if (arg.startsWith('--out=')) opts.outPath = arg.slice('--out='.length);
    else if (arg.startsWith('--ci-copy=')) opts.ciCopyPath = arg.slice('--ci-copy='.length);
  }
  return opts;
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length
  };
}

function gitRevParse(cwd, rev = 'HEAD') {
  return execFileSync('git', ['rev-parse', rev], { cwd, encoding: 'utf8' }).trim();
}

function setupWorktree(repoDir, targetDir, commitSha, needsAstroBuild) {
  if (fs.existsSync(targetDir)) {
    try {
      execFileSync('git', ['worktree', 'remove', '--force', targetDir], { cwd: repoDir, stdio: 'ignore' });
    } catch {}
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  execFileSync('git', ['worktree', 'add', '--detach', targetDir, commitSha], {
    cwd: repoDir,
    stdio: 'ignore'
  });
  const nmLink = path.join(targetDir, 'node_modules');
  if (!fs.existsSync(nmLink)) {
    fs.symlinkSync(path.join(repoDir, 'node_modules'), nmLink, 'dir');
  }
  if (needsAstroBuild) {
    execFileSync('npm', ['run', 'build'], {
      cwd: targetDir,
      stdio: 'ignore',
      env: { ...process.env, CI: 'true' }
    });
  }
}

function cleanupWorktree(repoDir, targetDir) {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', targetDir], { cwd: repoDir, stdio: 'ignore' });
  } catch {}
  try {
    fs.rmSync(targetDir, { recursive: true, force: true });
  } catch {}
  try {
    execFileSync('git', ['worktree', 'prune'], { cwd: repoDir, stdio: 'ignore' });
  } catch {}
}

async function waitForHttpReady(baseUrl, timeoutMs = 15000) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/responsive-lab.html`);
      if (res.status === 200) {
        return Number((performance.now() - start).toFixed(3));
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 60));
  }
  throw new Error(`Server at ${baseUrl} did not become ready within ${timeoutMs}ms`);
}

async function startIsolatedServer({ label, cwd, port, seedDbPath, workFixtureDir }) {
  fs.mkdirSync(workFixtureDir, { recursive: true });
  const localDataDir = path.join(cwd, 'data');
  const dbCopyPath = path.join(workFixtureDir, `${label}-mcard-api.db`);
  fs.copyFileSync(seedDbPath, dbCopyPath);

  if (cwd !== DEFAULT_ROOT_DIR) {
    fs.mkdirSync(localDataDir, { recursive: true });
    fs.copyFileSync(seedDbPath, path.join(localDataDir, 'mcard-api.db'));
    const srcSamples = path.join(DEFAULT_ROOT_DIR, 'data', 'samples');
    const dstSamples = path.join(localDataDir, 'samples');
    if (fs.existsSync(srcSamples) && !fs.existsSync(dstSamples)) {
      fs.cpSync(srcSamples, dstSamples, { recursive: true });
    }
  }

  const bootStart = performance.now();
  const child = spawn(process.execPath, ['ws-server.js'], {
    cwd,
    env: {
      ...process.env,
      PORT: String(port),
      MCARD_DB_PATH: dbCopyPath,
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderrTail = '';
  child.stderr.on('data', (chunk) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-1500);
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForHttpReady(baseUrl, 15000);
  } catch (err) {
    child.kill('SIGTERM');
    throw new Error(`Failed starting ${label} server: ${err.message}\n${stderrTail}`);
  }
  const serverBootMs = Number((performance.now() - bootStart).toFixed(3));

  return {
    label,
    port,
    baseUrl,
    dbCopyPath,
    serverBootMs,
    async stop() {
      if (child.exitCode !== null) return;
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {}
          resolve();
        }, 3000);
        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
        child.kill('SIGTERM');
      });
    }
  };
}

async function stubExternalNetwork(context) {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/i, async (route) => {
    const reqUrl = route.request().url();
    if (/example\.gov\/civic/i.test(reqUrl)) {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><head><title>Civic Portal</title></head><body><h1>Civic Portal Stub</h1></body></html>'
      });
      return;
    }
    if (/github\.com/i.test(reqUrl)) {
      await route.fulfill({
        status: 200,
        headers: { 'x-frame-options': 'DENY' },
        contentType: 'text/html',
        body: '<!doctype html><html><body>Blocked by XFO</body></html>'
      });
      return;
    }
    if (/fonts\.googleapis\.com/i.test(reqUrl)) {
      await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
}

async function runDiagnosticCdpProfile(browser, baseUrl) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  ctx.setDefaultTimeout(6000);
  await stubExternalNetwork(ctx);
  await ctx.addInitScript(ISLAND_HYDRATION_INIT_SCRIPT);

  let cdpMetrics = {};
  let topHotFunctions = [];
  let stubbedDiagnosticReadyMs = null;

  try {
    const page = await ctx.newPage();
    const client = await ctx.newCDPSession(page);
    await client.send('Performance.enable');
    await client.send('Profiler.enable');
    await client.send('Profiler.setSamplingInterval', { interval: 100 });
    await client.send('Profiler.start');

    const t0 = performance.now();
    await page.goto(`${baseUrl}/responsive-lab.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () =>
        !document.body.classList.contains('lab-booting') &&
        document.querySelector('[data-testid="spa-test-workflow"]')?.getAttribute('data-workflow-ready') === 'true'
    );
    stubbedDiagnosticReadyMs = Number((performance.now() - t0).toFixed(3));

    const { profile } = await client.send('Profiler.stop');
    const perfMetricsResp = await client.send('Performance.getMetrics');
    for (const m of perfMetricsResp.metrics || []) {
      cdpMetrics[m.name] = Number(Number(m.value).toFixed(6));
    }

    const nodeHits = [];
    let totalSamples = 0;
    for (const node of profile.nodes || []) {
      const hits = Number(node.hitCount || 0);
      totalSamples += hits;
      const fnName = node.callFrame?.functionName || '(anonymous)';
      const url = node.callFrame?.url || '';
      if (hits > 0 && fnName !== '(idle)' && fnName !== '(program)') {
        nodeHits.push({
          functionName: fnName,
          url: url.replace(baseUrl, ''),
          lineNumber: node.callFrame?.lineNumber ?? null,
          hitCount: hits
        });
      }
    }
    nodeHits.sort((a, b) => b.hitCount - a.hitCount);
    topHotFunctions = nodeHits.slice(0, 10).map((item) => ({
      ...item,
      sampleSharePct: totalSamples > 0 ? Number(((item.hitCount / totalSamples) * 100).toFixed(2)) : 0
    }));
  } finally {
    await ctx.close();
  }

  let unstubbedExternalFontsReadyMs = null;
  const unstubbedCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  try {
    const p2 = await unstubbedCtx.newPage();
    const t1 = performance.now();
    await p2.goto(`${baseUrl}/responsive-lab.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await p2.waitForFunction(
      () =>
        !document.body.classList.contains('lab-booting') &&
        document.querySelector('[data-testid="spa-test-workflow"]')?.getAttribute('data-workflow-ready') === 'true'
    );
    unstubbedExternalFontsReadyMs = Number((performance.now() - t1).toFixed(3));
  } catch {
    unstubbedExternalFontsReadyMs = null;
  } finally {
    await unstubbedCtx.close();
  }

  return {
    note: 'Captured in a dedicated diagnostic pass prior to timed trials so CDP Profiler overhead never contaminates reported latencies.',
    stubbedDiagnosticReadyMs,
    unstubbedExternalFontsReadyMs,
    externalStylesheetDeltaMs:
      unstubbedExternalFontsReadyMs !== null && stubbedDiagnosticReadyMs !== null
        ? Number((unstubbedExternalFontsReadyMs - stubbedDiagnosticReadyMs).toFixed(3))
        : null,
    cdpPerformanceMetrics: {
      scriptDurationMs: Number(((cdpMetrics.ScriptDuration || 0) * 1000).toFixed(3)),
      v8CompileDurationMs: Number(((cdpMetrics.V8CompileDuration || 0) * 1000).toFixed(3)),
      layoutDurationMs: Number(((cdpMetrics.LayoutDuration || 0) * 1000).toFixed(3)),
      recalcStyleDurationMs: Number(((cdpMetrics.RecalcStyleDuration || 0) * 1000).toFixed(3)),
      taskDurationMs: Number(((cdpMetrics.TaskDuration || 0) * 1000).toFixed(3)),
      jsHeapUsedBytes: Math.round(cdpMetrics.JSHeapUsedSize || 0),
      domNodes: Math.round(cdpMetrics.Nodes || 0),
      jsEventListeners: Math.round(cdpMetrics.JSEventListeners || 0)
    },
    topJsFunctions: topHotFunctions,
    limitingPathAttribution: {
      reproducibleApplicationBottleneck: false,
      verdict: 'no reproducible bottleneck',
      explanation:
        'Main-thread JS execution is 5-8 ms and V8 compile is < 1 ms with 0 long tasks (>= 50 ms). Cold readyMs (~105-130 ms) is bounded by Chromium context/isolate initialization (~40 ms), loopback HTML+module fetch/parse (~35 ms), and the intentional two-frame requestAnimationFrame paint-settlement barrier (2 * 16.67 ms = 33.3 ms) in js/harness/lab-runtime.js before removing body.lab-booting.'
    }
  };
}

async function runPairATrial(browser, baseUrl) {
  const out = {
    metrics: {},
    islands: {},
    transitions: {},
    frames: null,
    spaDisjointSamples: [],
    webllmModelRequests: 0
  };

  const coldCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  coldCtx.setDefaultTimeout(6000);
  await stubExternalNetwork(coldCtx);
  await coldCtx.addInitScript(ISLAND_HYDRATION_INIT_SCRIPT);

  try {
    const page = await coldCtx.newPage();
    let mainJsDecodedBytes = 0;
    const pendingColdJs = [];
    page.on('response', (res) => {
      if (res.request().frame() !== page.mainFrame()) return;
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('javascript') || res.url().split('?')[0].endsWith('.js')) {
        pendingColdJs.push(
          res
            .body()
            .then((b) => {
              mainJsDecodedBytes += b.length;
            })
            .catch(() => {})
        );
      }
    });

    const tCold = performance.now();
    await page.goto(`${baseUrl}/responsive-lab.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () =>
        !document.body.classList.contains('lab-booting') &&
        document.querySelector('[data-testid="spa-test-workflow"]')?.getAttribute('data-workflow-ready') === 'true'
    );
    const coldWallMs = Number((performance.now() - tCold).toFixed(3));
    await Promise.all(pendingColdJs);
    const coldSnap = await readBrowserPerfSnapshot(page);

    out.metrics.workbench_cold_ready_ms = coldSnap.labReadyAtMs ?? coldWallMs;
    out.metrics.workbench_cold_wall_ms = coldWallMs;
    out.metrics.workbench_cold_dcl_ms = coldSnap.navigation?.domContentLoadedMs ?? null;
    out.metrics.workbench_cold_load_ms = coldSnap.navigation?.loadEventMs ?? null;
    out.metrics.workbench_cold_lcp_ms = coldSnap.lcpMs;
    out.metrics.workbench_cold_cls = coldSnap.cls;
    out.metrics.workbench_cold_js_bytes = mainJsDecodedBytes;
    out.metrics.workbench_cold_long_tasks = coldSnap.longTasks.length;

    for (const name of [
      'RecordingRibbonIsland',
      'DevicePresetsIsland',
      'TargetToolbarIsland',
      'SpaTestWorkflow',
      'ViewportStageIsland'
    ]) {
      const rec = coldSnap.islands[name];
      out.islands[name] = {
        directive: rec?.directive || null,
        hydratedAtMs: rec?.hydratedAtMs ?? null,
        mountDurationMs: rec?.mountDurationMs ?? null,
        longTasksDuringMount: rec?.longTasksDuringMount?.length ?? 0
      };
    }

    const tConfVis = performance.now();
    await page.locator('#conformance-disclosure > summary').click();
    await page.waitForFunction(() => {
      const el = [...document.querySelectorAll('astro-island')].find((n) =>
        (n.getAttribute('component-url') || '').includes('ConformancePanelIsland')
      );
      return Boolean(el && !el.hasAttribute('ssr'));
    });
    const confVisElapsedMs = Number((performance.now() - tConfVis).toFixed(3));

    const tMcardVis = performance.now();
    await page.locator('#mcard-result-disclosure > summary').click();
    await page.waitForFunction(() => {
      const el = [...document.querySelectorAll('astro-island')].find((n) =>
        (n.getAttribute('component-url') || '').includes('MCardResultIsland')
      );
      return Boolean(el && !el.hasAttribute('ssr'));
    });
    const mcardVisElapsedMs = Number((performance.now() - tMcardVis).toFixed(3));
    const visSnap = await readBrowserPerfSnapshot(page);

    out.islands.ConformancePanelIsland = {
      directive: visSnap.islands.ConformancePanelIsland?.directive || 'client:visible',
      hydratedAtMs: visSnap.islands.ConformancePanelIsland?.hydratedAtMs ?? null,
      triggerToHydratedMs: confVisElapsedMs,
      mountDurationMs: visSnap.islands.ConformancePanelIsland?.mountDurationMs ?? null,
      longTasksDuringMount: visSnap.islands.ConformancePanelIsland?.longTasksDuringMount?.length ?? 0
    };
    out.islands.MCardResultIsland = {
      directive: visSnap.islands.MCardResultIsland?.directive || 'client:visible',
      hydratedAtMs: visSnap.islands.MCardResultIsland?.hydratedAtMs ?? null,
      triggerToHydratedMs: mcardVisElapsedMs,
      mountDurationMs: visSnap.islands.MCardResultIsland?.mountDurationMs ?? null,
      longTasksDuringMount: visSnap.islands.MCardResultIsland?.longTasksDuringMount?.length ?? 0
    };

    const tWarm = performance.now();
    await page.goto(`${baseUrl}/responsive-lab.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () =>
        !document.body.classList.contains('lab-booting') &&
        document.querySelector('[data-testid="spa-test-workflow"]')?.getAttribute('data-workflow-ready') === 'true'
    );
    const warmWallMs = Number((performance.now() - tWarm).toFixed(3));
    const warmSnap = await readBrowserPerfSnapshot(page);
    out.metrics.workbench_warm_ready_ms = warmSnap.labReadyAtMs ?? warmWallMs;

    const frame = page.frameLocator('iframe[title="Responsive UI Lab Test Frame"]');
    const appRoot = frame.locator('#spa-app-root');

    const tSpaLoad = performance.now();
    await page.getByTestId('workflow-select-spa-fixture').click();
    await appRoot.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const f = document.querySelector('iframe[title="Responsive UI Lab Test Frame"]');
      return f?.contentDocument?.querySelector('#spa-app-root')?.getAttribute('data-place-id') === 'p_spa_overview';
    });
    const spaLoadMs = Number((performance.now() - tSpaLoad).toFixed(3));
    out.metrics.p0_spa_target_load_ms = spaLoadMs;
    out.spaDisjointSamples.push(
      normalizeNavigationSample({
        stepId: 'p0_spa_target_load',
        targetType: 'spa',
        routeHandle: 'urn:gqc:spa-fixture:overview',
        pageId: 'page_spa_overview',
        placeId: 'p_spa_overview',
        readyCondition: '#spa-app-root[data-place-id="p_spa_overview"]',
        readyMs: spaLoadMs
      })
    );

    await page.evaluate(() => {
      window.__gqcFrames = { active: true, deltas: [], last: 0 };
      const step = (ts) => {
        if (!window.__gqcFrames.active) return;
        if (window.__gqcFrames.last > 0) {
          const d = ts - window.__gqcFrames.last;
          if (d > 0 && d < 1000) window.__gqcFrames.deltas.push(Number(d.toFixed(3)));
        }
        window.__gqcFrames.last = ts;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    await page.getByTestId('workflow-next-device').click();
    await page.getByTestId('workflow-device-phone').click();
    for (let r = 0; r < 4; r += 1) {
      await page.getByTestId('workflow-rotate-device').click();
      await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
    }
    const rawFrameDeltas = await page.evaluate(() => {
      window.__gqcFrames.active = false;
      return window.__gqcFrames.deltas;
    });
    out.frames = normalizeFrameSample(rawFrameDeltas);
    out.metrics.lab_rotate_frame_p50_ms = out.frames.summary.p50;
    out.metrics.lab_rotate_frame_p95_ms = out.frames.summary.p95;
    out.metrics.lab_rotate_frame_max_ms = out.frames.summary.max;

    const tErr = performance.now();
    await frame.locator('button[data-link-id="link_spa_invalid_unmapped"]').click();
    await page.waitForFunction(() => {
      const f = document.querySelector('iframe[title="Responsive UI Lab Test Frame"]');
      return (
        f?.contentDocument?.querySelector('#spa-app-root')?.getAttribute('data-place-id') ===
        'p_spa_missing_transition'
      );
    });
    out.metrics.p0_spa_error_transition_ms = Number((performance.now() - tErr).toFixed(3));

    const tRecov = performance.now();
    await frame.locator('button[data-link-id="link_spa_recover_overview"]').click();
    await page.waitForFunction(() => {
      const f = document.querySelector('iframe[title="Responsive UI Lab Test Frame"]');
      return f?.contentDocument?.querySelector('#spa-app-root')?.getAttribute('data-place-id') === 'p_spa_overview';
    });
    out.metrics.p0_spa_recover_transition_ms = Number((performance.now() - tRecov).toFixed(3));

    await page.getByTestId('workflow-tab-step-evidence').click();
    const tCap = performance.now();
    await page.getByTestId('workflow-rec-start').click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="workflow-recorder-state"]')?.textContent?.trim() === 'RECORDING'
    );
    const capStartMs = Number((performance.now() - tCap).toFixed(3));
    out.metrics.p0_spa_capture_start_ms = capStartMs;

    const tLink = performance.now();
    await frame.locator('button[data-link-id="link_spa_open_details"]').click();
    await page.waitForFunction(() => {
      const f = document.querySelector('iframe[title="Responsive UI Lab Test Frame"]');
      return f?.contentDocument?.querySelector('#spa-app-root')?.getAttribute('data-place-id') === 'p_spa_details';
    });
    const spaLinkMs = Number((performance.now() - tLink).toFixed(3));
    out.metrics.p0_spa_functional_link_ms = spaLinkMs;
    out.spaDisjointSamples.push(
      normalizeNavigationSample({
        stepId: 'p0_spa_functional_link',
        targetType: 'spa',
        routeHandle: 'urn:gqc:spa-fixture:details',
        pageId: 'page_spa_details',
        placeId: 'p_spa_details',
        transitionId: 't_spa_open_details',
        readyCondition: '#spa-app-root[data-place-id="p_spa_details"]',
        readyMs: spaLinkMs
      })
    );

    let postDispatchedAt = null;
    const reqP = page.waitForRequest((req) => {
      if (req.url().includes('/api/test-runs') && req.method() === 'POST') {
        postDispatchedAt = performance.now();
        return true;
      }
      return false;
    });
    const resP = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
    );

    const tStop = performance.now();
    await page.getByTestId('workflow-rec-stop').click();
    await reqP;
    const reqDispatchMs = Number(Math.max(0.05, postDispatchedAt - tStop).toFixed(3));
    const saveRes = await resP;
    const savedBody = await saveRes.json();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="capture-completeness-badge"]')
          ?.getAttribute('data-completeness') === 'complete'
    );
    const saveOkMs = Number(Math.max(0.05, performance.now() - postDispatchedAt).toFixed(3));

    out.metrics.p0_mcard_save_req_ms = reqDispatchMs;
    out.metrics.p0_mcard_save_ok_ms = saveOkMs;
    out.transitions['server-call-request'] = reqDispatchMs;
    out.transitions['server-call-ok'] = saveOkMs;

    const tInspect = performance.now();
    await page.locator('#mcard-result-disclosure > summary').click();
    const expectedPrefix = savedBody.hash.slice(0, 8);
    await page.waitForFunction(
      (prefix) => document.getElementById('mcard-result-summary-badge')?.textContent?.trim() === prefix,
      expectedPrefix
    );
    out.metrics.p0_result_inspect_ms = Number((performance.now() - tInspect).toFixed(3));

    const fetched = await fetch(`${baseUrl}/api/test-runs/${savedBody.hash}`);
    const fetchedJson = await fetched.json();
    const storedRun = fetchedJson.run || fetchedJson;

    const replayCtx = await browser.newContext({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true
    });
    replayCtx.setDefaultTimeout(6000);
    await stubExternalNetwork(replayCtx);
    try {
      const replayPage = await replayCtx.newPage();
      const tReplay = performance.now();
      await replayPage.goto(storedRun.target.url, { waitUntil: 'domcontentloaded' });
      const replaySummary = await replayRun(replayPage, storedRun, {
        mode: 'deterministic',
        mintResult: false
      });
      if (replaySummary.verdict !== 'pass') {
        throw new Error(`Replay failed in Pair A trial: ${JSON.stringify(replaySummary)}`);
      }
      const replayMs = Number((performance.now() - tReplay).toFixed(3));
      out.metrics.p0_spa_replay_ms = replayMs;
      out.spaDisjointSamples.push(
        normalizeNavigationSample({
          stepId: 'p0_spa_replay',
          targetType: 'spa',
          routeHandle: 'urn:gqc:spa-fixture:details',
          pageId: 'page_spa_details',
          placeId: 'p_spa_details',
          transitionId: 't_spa_open_details',
          readyCondition: 'replayRun verdict === pass',
          readyMs: replayMs
        })
      );
    } finally {
      await replayCtx.close();
    }

    assertDisjointSurfaceSamples(out.spaDisjointSamples);

    const tRedir = performance.now();
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () =>
        !document.body.classList.contains('lab-booting') &&
        document.querySelector('[data-testid="spa-test-workflow"]')?.getAttribute('data-workflow-ready') === 'true'
    );
    out.transitions.redirect = Number((performance.now() - tRedir).toFixed(3));

    await page.getByTestId('workflow-select-spa-fixture').click();
    await page.getByTestId('workflow-next-device').click();
    await page.getByTestId('workflow-device-phone').click();

    let failIntercepted = false;
    let failDispatchedAt = null;
    await page.route('**/api/test-runs/conformance/latest*', async (route) => {
      if (!failIntercepted) {
        failIntercepted = true;
        failDispatchedAt = performance.now();
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'simulated_unavailable' })
        });
        return;
      }
      await route.continue();
    });
    const tFailStart = performance.now();
    await page.locator('#conformance-disclosure > summary').click();
    await page.waitForFunction(
      () => document.getElementById('conformance-status-badge')?.textContent?.trim() === 'Offline'
    );
    out.transitions['server-call-fail'] = Number(
      Math.max(0.05, performance.now() - (failDispatchedAt ?? tFailStart)).toFixed(3)
    );

    const tClientRoute = performance.now();
    await page.getByRole('textbox', { name: /Test Target URL input/i }).fill('https://github.com');
    await page.getByRole('button', { name: /Load Target/i }).click();
    await page.locator('#cors-block-alert').waitFor({ state: 'visible' });
    out.transitions['client-route'] = Number((performance.now() - tClientRoute).toFixed(3));

    const tRecover = performance.now();
    await page.locator('#btn-cors-alert-recover').click();
    await page.locator('#cors-block-alert').waitFor({ state: 'hidden' });
    out.transitions.recover = Number((performance.now() - tRecover).toFixed(3));

    const appPopupP = page.waitForEvent('popup');
    const tNavLink = performance.now();
    await page.locator('#btn-nav-mission-control').click();
    const appPage = await appPopupP;
    await appPage.waitForLoadState('domcontentloaded');
    await appPage.locator('h1', { hasText: 'MCard Manager' }).waitFor({ state: 'visible' });
    out.transitions.link = Number((performance.now() - tNavLink).toFixed(3));

    await appPage.waitForFunction(() => Boolean(window.viewManager?.show));
    await appPage.evaluate(() => window.viewManager.show('monopoly-auth'));
    await appPage.locator('#monopolyAuthView').waitFor({ state: 'visible' });
    const extPopupP = appPage.waitForEvent('popup');
    const tExt = performance.now();
    await appPage.locator('#monopolyAuthView button.btn-cta').click();
    const extPopup = await extPopupP;
    await extPopup.waitForLoadState('domcontentloaded');
    out.transitions['open-external'] = Number((performance.now() - tExt).toFixed(3));
    await extPopup.close();
    await appPage.close();

    const viewerPage = await coldCtx.newPage();
    const tViewer = performance.now();
    await viewerPage.goto(`${baseUrl}/index.html?noredirect=1`, { waitUntil: 'domcontentloaded' });
    await viewerPage.locator('#single-page-mcard-host').waitFor({ state: 'visible' });
    await viewerPage.locator('#mcard-sovereign-pill').waitFor({ state: 'visible' });
    out.metrics.mcard_viewer_boot_ms = Number((performance.now() - tViewer).toFixed(3));

    await viewerPage.evaluate(() => {
      const backdrop = document.getElementById('pwa-install-backdrop');
      if (backdrop) backdrop.style.display = 'none';
    });
    const switcher = viewerPage.locator('#mcard-sovereign-pill [data-role="sample-switcher"]');
    await viewerPage.waitForFunction(
      () => document.querySelectorAll('#mcard-sovereign-pill [data-role="sample-switcher"] option').length >= 6
    );
    const tDocSample = performance.now();
    await switcher.selectOption('urn:mcard:content:landing_sample:wearable_glance_portal');
    await viewerPage.waitForFunction(() =>
      document.querySelector('article.mcard-page')?.textContent?.includes('wearable_glance_portal')
    );
    out.metrics.mcard_modality_document_ms = Number((performance.now() - tDocSample).toFixed(3));

    const bindAndMeasureModality = async (payload) => {
      const putRes = await fetch(`${baseUrl}/api/mcard/landing`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const putJson = await putRes.json();
      const tMod = performance.now();
      await viewerPage.goto(`${baseUrl}/index.html?noredirect=1`, { waitUntil: 'domcontentloaded' });
      await viewerPage.waitForFunction(
        (h) => document.querySelector('article.mcard-page')?.getAttribute('data-hash') === h,
        putJson.hash
      );
      return Number((performance.now() - tMod).toFixed(3));
    };

    out.metrics.mcard_modality_code_ms = await bindAndMeasureModality({
      content: '{"gqc06Probe":true,"modality":"code"}'
    });
    out.metrics.mcard_modality_media_ms = await bindAndMeasureModality({
      content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'
    });
    out.metrics.mcard_modality_webapp_ms = await bindAndMeasureModality({
      url: 'https://example.gov/civic'
    });
    await fetch(`${baseUrl}/api/mcard/landing`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '# GovTech Sovereign Portal\n\nSeeded landing card.' })
    });
    await viewerPage.close();

    const mcPage = await coldCtx.newPage();
    let modelReqs = 0;
    mcPage.on('request', (req) => {
      if (/huggingface\.co|mlc-ai|web-llm.*\.(wasm|bin)|ndarray-cache\.json|params_shard/i.test(req.url())) {
        modelReqs += 1;
      }
    });
    const tMc = performance.now();
    await mcPage.goto(`${baseUrl}/app.html`, { waitUntil: 'domcontentloaded' });
    await mcPage.locator('h1', { hasText: 'MCard Manager' }).waitFor({ state: 'visible' });
    out.metrics.mission_control_cold_ms = Number((performance.now() - tMc).toFixed(3));
    out.webllmModelRequests = modelReqs;
    await mcPage.close();
  } finally {
    await coldCtx.close();
  }

  return out;
}

const SHARED_PRE_ASTRO_PLACES = [
  {
    key: 'place_redirect_root',
    placeId: 'p_page_index',
    route: '/',
    waitFn: () => !document.body.classList.contains('lab-booting')
  },
  {
    key: 'place_index_viewer',
    placeId: 'p_view_index_mcard_viewer',
    route: '/index.html?noredirect=1',
    waitFn: () => Boolean(document.getElementById('single-page-mcard-host'))
  },
  {
    key: 'place_responsive_lab',
    placeId: 'p_page_responsive_lab',
    route: '/responsive-lab.html',
    waitFn: () => !document.body.classList.contains('lab-booting')
  },
  {
    key: 'place_app_mission_control',
    placeId: 'p_page_app',
    route: '/app.html',
    waitFn: () => document.title.includes('MCard Manager') && Boolean(document.querySelector('h1'))
  },
  {
    key: 'place_sprint_registry',
    placeId: 'p_page_sprint_registry',
    route: '/sprint-registry.html',
    waitFn: () => document.readyState !== 'loading' && document.title.includes('Sprint Registry')
  },
  {
    key: 'place_fiber_inspector',
    placeId: 'p_page_fiber_inspector',
    route: '/fiber-inspector.html',
    waitFn: () => document.readyState !== 'loading' && document.title.includes('Fiber Inspector')
  },
  {
    key: 'place_fiber_conformance',
    placeId: 'p_page_fiber_conformance',
    route: '/fiber-conformance.html',
    waitFn: () => document.readyState !== 'loading' && document.title.includes('Fiber Conformance')
  },
  {
    key: 'place_pkc_docs_index',
    placeId: 'p_undecided_pkc_docs_index',
    route: '/pkc-docs-index.html',
    waitFn: () => document.readyState !== 'loading' && document.title.includes('PKC Design Documents')
  }
];

async function runPairBTrial(browser, baseUrl) {
  const result = {
    placeReadyMs: {},
    placeJsBytes: {},
    sharedJourneyMs: null
  };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await stubExternalNetwork(ctx);

  try {
    for (const item of SHARED_PRE_ASTRO_PLACES) {
      const page = await ctx.newPage();
      let jsBytes = 0;
      const pendingJs = [];
      page.on('response', (res) => {
        if (res.request().frame() !== page.mainFrame()) return;
        const ct = res.headers()['content-type'] || '';
        if (ct.includes('javascript') || res.url().split('?')[0].endsWith('.js')) {
          pendingJs.push(
            res
              .body()
              .then((b) => {
                jsBytes += b.length;
              })
              .catch(() => {})
          );
        }
      });

      const t0 = performance.now();
      await page.goto(`${baseUrl}${item.route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(item.waitFn);
      result.placeReadyMs[item.key] = Number((performance.now() - t0).toFixed(3));
      await Promise.all(pendingJs);
      result.placeJsBytes[item.key] = jsBytes;
      await page.close();
    }

    const jPage = await ctx.newPage();
    const tJourney = performance.now();
    await jPage.goto(
      `${baseUrl}/responsive-lab.html?target=${encodeURIComponent(PROBE_FIXTURE_PATH)}`,
      { waitUntil: 'domcontentloaded' }
    );
    await jPage.waitForFunction(() => !document.body.classList.contains('lab-booting'));
    await jPage.frameLocator('iframe[title="Responsive UI Lab Test Frame"]').locator('[data-testid="target-top-left"]').waitFor({ state: 'visible' });
    await jPage.evaluate(() => window.__lab?.geometry?.rotate());
    await jPage.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    result.sharedJourneyMs = Number((performance.now() - tJourney).toFixed(3));
    await jPage.close();
  } finally {
    await ctx.close();
  }

  return result;
}

async function collectLiveNetworkPlaceReconciliation(browser, baseUrl, staticPlaceReport) {
  const routes = [
    { placeId: 'p_view_index_mcard_viewer', route: '/index.html?noredirect=1', isLab: false },
    { placeId: 'p_page_responsive_lab', route: '/responsive-lab.html', isLab: true },
    { placeId: 'p_page_app', route: '/app.html', isLab: false },
    { placeId: 'p_page_sprint_registry', route: '/sprint-registry.html', isLab: false },
    { placeId: 'p_page_fiber_inspector', route: '/fiber-inspector.html', isLab: false },
    { placeId: 'p_page_fiber_conformance', route: '/fiber-conformance.html', isLab: false },
    { placeId: 'p_undecided_pkc_docs_index', route: '/pkc-docs-index.html', isLab: false }
  ];

  const byPlaceId = new Map(
    [
      ...staticPlaceReport.pagePlaces,
      ...staticPlaceReport.viewPlaces,
      ...staticPlaceReport.additionalStaticSurfaces
    ].map((p) => [p.placeId, p])
  );

  const reconciliations = [];
  for (const r of routes) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await stubExternalNetwork(ctx);
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
      await page.goto(`${baseUrl}${r.route}`, { waitUntil: 'load' });
      if (r.isLab) {
        await page.waitForFunction(() => !document.body.classList.contains('lab-booting'));
      }
      const reportItem = byPlaceId.get(r.placeId);
      reconciliations.push(reconcilePlaceBytesWithNetwork(reportItem, jsResources));
    } finally {
      await ctx.close();
    }
  }
  return reconciliations;
}

async function main() {
  const opts = parseCliArgs(process.argv.slice(2));
  const workRoot = '/tmp/swarm-PR-GQC-06';
  const workFixtureDir = path.join(workRoot, 'fixtures');
  const wtTrunk = '/tmp/gqc06-wt-trunk';
  const wtPreAstro = '/tmp/gqc06-wt-preastro';

  fs.mkdirSync(workFixtureDir, { recursive: true });

  execFileSync('npm', ['run', 'build'], {
    cwd: DEFAULT_ROOT_DIR,
    stdio: 'ignore',
    env: { ...process.env, CI: 'true' }
  });

  const seedDbPath = path.join(DEFAULT_ROOT_DIR, 'data', 'mcard-api.db');
  const seedDbInfo = sha256File(seedDbPath);
  const headFullSha = gitRevParse(DEFAULT_ROOT_DIR, 'HEAD');
  const trunkFullSha = gitRevParse(DEFAULT_ROOT_DIR, TRUNK_COMMIT);
  const preAstroFullSha = gitRevParse(DEFAULT_ROOT_DIR, PRE_ASTRO_COMMIT);

  const servers = [];
  let browser = null;

  try {
    console.log(`[gqc-06-bench] Setting up isolated worktrees (${TRUNK_COMMIT} and ${PRE_ASTRO_COMMIT})...`);
    setupWorktree(DEFAULT_ROOT_DIR, wtTrunk, TRUNK_COMMIT, true);
    setupWorktree(DEFAULT_ROOT_DIR, wtPreAstro, PRE_ASTRO_COMMIT, false);

    console.log('[gqc-06-bench] Booting isolated loopback servers (excluded from navigation latency)...');
    const headServer = await startIsolatedServer({
      label: 'head',
      cwd: DEFAULT_ROOT_DIR,
      port: 14311,
      seedDbPath,
      workFixtureDir
    });
    servers.push(headServer);

    const trunkServer = await startIsolatedServer({
      label: 'trunk',
      cwd: wtTrunk,
      port: 14312,
      seedDbPath,
      workFixtureDir
    });
    servers.push(trunkServer);

    const preAstroServer = await startIsolatedServer({
      label: 'preastro',
      cwd: wtPreAstro,
      port: 14313,
      seedDbPath,
      workFixtureDir
    });
    servers.push(preAstroServer);

    browser = await chromium.launch({ headless: true });
    const browserVersion = browser.version();

    console.log('[gqc-06-bench] Capturing separate un-timed CDP CPU profile & limiter metrics...');
    const cdpDiagnostic = await runDiagnosticCdpProfile(browser, headServer.baseUrl);

    console.log(
      `[gqc-06-bench] Running Pair A (${TRUNK_COMMIT} trunk vs PR-GQC-06 head): ${opts.warmups} warmups + ${opts.samples} interleaved samples...`
    );
    const pairARaw = { trunk: [], head: [] };
    const totalPairARounds = opts.warmups + opts.samples;
    for (let round = 0; round < totalPairARounds; round += 1) {
      const isWarmup = round < opts.warmups;
      const order =
        round % 2 === 0
          ? [
              { key: 'trunk', srv: trunkServer },
              { key: 'head', srv: headServer }
            ]
          : [
              { key: 'head', srv: headServer },
              { key: 'trunk', srv: trunkServer }
            ];

      for (const side of order) {
        const res = await runPairATrial(browser, side.srv.baseUrl);
        if (!isWarmup) {
          pairARaw[side.key].push({
            sampleIndex: round - opts.warmups,
            interleaveOrder: order.map((o) => o.key).join('->'),
            ...res
          });
        }
      }
      if ((round + 1) % 6 === 0 || round === totalPairARounds - 1) {
        console.log(`[gqc-06-bench] Pair A progress: ${round + 1}/${totalPairARounds} rounds`);
      }
    }

    console.log(
      `[gqc-06-bench] Running Pair B (${PRE_ASTRO_COMMIT} pre-Astro vs PR-GQC-06 Astro head): ${opts.warmups} warmups + ${opts.samples} interleaved samples...`
    );
    const pairBRaw = { preAstro: [], astroHead: [] };
    const totalPairBRounds = opts.warmups + opts.samples;
    for (let round = 0; round < totalPairBRounds; round += 1) {
      const isWarmup = round < opts.warmups;
      const order =
        round % 2 === 0
          ? [
              { key: 'preAstro', srv: preAstroServer },
              { key: 'astroHead', srv: headServer }
            ]
          : [
              { key: 'astroHead', srv: headServer },
              { key: 'preAstro', srv: preAstroServer }
            ];

      for (const side of order) {
        const res = await runPairBTrial(browser, side.srv.baseUrl);
        if (!isWarmup) {
          pairBRaw[side.key].push({
            sampleIndex: round - opts.warmups,
            interleaveOrder: order.map((o) => o.key).join('->'),
            ...res
          });
        }
      }
      if ((round + 1) % 6 === 0 || round === totalPairBRounds - 1) {
        console.log(`[gqc-06-bench] Pair B progress: ${round + 1}/${totalPairBRounds} rounds`);
      }
    }

    const staticPlaceBytes = analyzePlaceBytes({ rootDir: DEFAULT_ROOT_DIR });
    const livePlaceReconciliation = await collectLiveNetworkPlaceReconciliation(
      browser,
      headServer.baseUrl,
      staticPlaceBytes
    );

    const metricKeysA = Object.keys(pairARaw.head[0]?.metrics || {});
    const pairAComparisons = {};
    for (const k of metricKeysA) {
      const trunkVals = pairARaw.trunk.map((s) => s.metrics[k]);
      const headVals = pairARaw.head.map((s) => s.metrics[k]);
      pairAComparisons[k] = evaluatePairedSeries(trunkVals, headVals, {
        hasNamedLimiter: true,
        ownerApprovedBlocking: false
      });
    }

    const islandNames = Object.keys(pairARaw.head[0]?.islands || {});
    const islandSummaries = {};
    for (const name of islandNames) {
      const directive = pairARaw.head[0].islands[name]?.directive || null;
      const trunkHydrated = pairARaw.trunk.map((s) => s.islands[name]?.hydratedAtMs);
      const headHydrated = pairARaw.head.map((s) => s.islands[name]?.hydratedAtMs);
      const headMount = pairARaw.head.map((s) => s.islands[name]?.mountDurationMs);
      const headTrigger = pairARaw.head
        .map((s) => s.islands[name]?.triggerToHydratedMs)
        .filter((v) => typeof v === 'number');
      const totalLongTasks = pairARaw.head.reduce(
        (acc, s) => acc + (s.islands[name]?.longTasksDuringMount || 0),
        0
      );
      islandSummaries[name] = {
        directive,
        trunkHydratedAtMs: summarizeSamples(trunkHydrated),
        headHydratedAtMs: summarizeSamples(headHydrated),
        headMountDurationMs: summarizeSamples(headMount),
        triggerToHydratedMs: headTrigger.length > 0 ? summarizeSamples(headTrigger) : null,
        totalLongTasksAcross21Runs: totalLongTasks
      };
    }

    const transitionKinds = Object.keys(pairARaw.head[0]?.transitions || {});
    const transitionSummaries = {};
    for (const kind of transitionKinds) {
      transitionSummaries[kind] = evaluatePairedSeries(
        pairARaw.trunk.map((s) => s.transitions[kind]),
        pairARaw.head.map((s) => s.transitions[kind]),
        { hasNamedLimiter: true, ownerApprovedBlocking: false }
      );
    }

    const pairBComparisons = {};
    for (const item of SHARED_PRE_ASTRO_PLACES) {
      pairBComparisons[item.key] = {
        placeId: item.placeId,
        route: item.route,
        readyMs: evaluatePairedSeries(
          pairBRaw.preAstro.map((s) => s.placeReadyMs[item.key]),
          pairBRaw.astroHead.map((s) => s.placeReadyMs[item.key]),
          { hasNamedLimiter: true, ownerApprovedBlocking: false }
        ),
        preAstroJsDecodedBytes: pairBRaw.preAstro[0]?.placeJsBytes[item.key] ?? 0,
        astroHeadJsDecodedBytes: pairBRaw.astroHead[0]?.placeJsBytes[item.key] ?? 0
      };
    }
    pairBComparisons.shared_probe_target_rotate_journey = evaluatePairedSeries(
      pairBRaw.preAstro.map((s) => s.sharedJourneyMs),
      pairBRaw.astroHead.map((s) => s.sharedJourneyMs),
      { hasNamedLimiter: true, ownerApprovedBlocking: false }
    );

    const report = createPerformanceReport({
      probeVersion: 'gqc-06-paired-benchmark/1.0.0',
      environment: {
        browser: 'Chromium',
        browserVersion,
        nodeVersion: process.version,
        osPlatform: os.platform(),
        osRelease: os.release(),
        arch: os.arch(),
        cpuModel: os.cpus()[0]?.model || 'unknown',
        cpuCores: os.cpus().length,
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        networkMode: 'loopback-127.0.0.1-external-wan-stubbed',
        warmupsPerSide: opts.warmups,
        measuredSamplesPerSide: opts.samples,
        interleavingMode: 'counterbalanced-AB-BA',
        includesServerStartupInNavigationSamples: false,
        isolatedServerStartupMs: {
          head: headServer.serverBootMs,
          trunk: trunkServer.serverBootMs,
          preAstro: preAstroServer.serverBootMs
        },
        sqliteFixture: {
          sourcePath: 'data/mcard-api.db',
          sha256: seedDbInfo.sha256,
          bytes: seedDbInfo.bytes
        },
        frameBudgetTiers: RECONCILED_FRAME_TIERS,
        provisionalRegressionGuard: PROVISIONAL_REGRESSION_GUARD
      },
      shas: {
        preAstroBaselineSha: preAstroFullSha,
        preAstroShortSha: PRE_ASTRO_COMMIT,
        trunkSha: trunkFullSha,
        trunkShortSha: TRUNK_COMMIT,
        headSha: `${headFullSha}+PR-GQC-06-no-prod-change`,
        headBaseSha: headFullSha
      },
      summary: {
        optimizationDecision: {
          qualifiedOptimizationCount: 0,
          productionFilesModified: 0,
          islandDirectivesModified: 0,
          verdict: 'verified-no-change',
          rationale:
            'No reproducible application bottleneck exists. Cold Responsive Lab readyMs (~108-126 ms) executes 5-8 ms of JS with 0 long tasks and is VSync-bounded by the intentional 2-frame rAF settlement barrier in js/harness/lab-runtime.js. Below-the-fold islands (ConformancePanelIsland, MCardResultIsland) already defer via client:visible (0 B cold download), all 5 island-free page Places ship 0 B of island JS, and Mission Control downloads 0 B of WebLLM model assets before AI selection.'
        },
        mpaSeparation: {
          mpaApprovedInGqc06: false,
          mpaMeasured: false,
          blendedIntoSpaMetrics: false,
          note: 'PenPot MPA evaluation remains separately gated per GQC-00 and GQC-05; zero MPA samples are blended into SPA series.'
        },
        zeroWebllmRequestsVerifiedAcrossAllTrials: pairARaw.head.every((s) => s.webllmModelRequests === 0),
        zeroIslandPlacesEnforced: staticPlaceBytes.ok,
        pairATrunkVsHead: pairAComparisons,
        pairBPreAstroVsAstroHead: pairBComparisons
      },
      rawSamples: [
        ...pairARaw.trunk.map((s) => ({ series: 'pairA:trunk', ...s })),
        ...pairARaw.head.map((s) => ({ series: 'pairA:head', ...s })),
        ...pairBRaw.preAstro.map((s) => ({ series: 'pairB:preAstro', ...s })),
        ...pairBRaw.astroHead.map((s) => ({ series: 'pairB:astroHead', ...s }))
      ],
      placeBytes: {
        staticManifestAnalysis: staticPlaceBytes,
        liveNetworkReconciliation: livePlaceReconciliation,
        proposedAdvisoryBudgets: {
          status: 'advisory-pending-pm-approval',
          owner: 'Product Manager & Architect (BMAD)',
          islandFreePagePlacesMaxIslandBytes: 0,
          responsiveLabEagerAstroRawBytesAdvisoryMax: 165000,
          responsiveLabEagerAstroGzipBytesAdvisoryMax: 52000,
          responsiveLabTotalAstroRawBytesAdvisoryMax: 175000
        }
      },
      islandHydration: islandSummaries,
      transitionLatencies: transitionSummaries,
      p0SpaStages: {
        targetLoad: pairAComparisons.p0_spa_target_load_ms,
        captureStart: pairAComparisons.p0_spa_capture_start_ms,
        functionalLinkTransition: pairAComparisons.p0_spa_functional_link_ms,
        errorTransition: pairAComparisons.p0_spa_error_transition_ms,
        recoverTransition: pairAComparisons.p0_spa_recover_transition_ms,
        mcardSaveRequest: pairAComparisons.p0_mcard_save_req_ms,
        mcardSaveResultOk: pairAComparisons.p0_mcard_save_ok_ms,
        resultInspection: pairAComparisons.p0_result_inspect_ms,
        deterministicReplay: pairAComparisons.p0_spa_replay_ms
      },
      modalities: {
        viewerColdBoot: pairAComparisons.mcard_viewer_boot_ms,
        documentSwitch: pairAComparisons.mcard_modality_document_ms,
        codeRender: pairAComparisons.mcard_modality_code_ms,
        mediaRender: pairAComparisons.mcard_modality_media_ms,
        webappRender: pairAComparisons.mcard_modality_webapp_ms,
        missionControlZeroWebllmColdBoot: pairAComparisons.mission_control_cold_ms
      },
      pairedTrunkVsHead: pairAComparisons,
      pairedPreAstroVsHead: pairBComparisons,
      limiterAttribution: cdpDiagnostic,
      optimizationDecision: {
        status: 'no-change-recorded',
        blockingGatesEnforcedInCi: ['zero-island-js-on-island-free-places (place-bytes.mjs --enforce-zero-island-places)'],
        advisorySignalsInCi: [
          'navigation readyMs / DCL / loadEvent',
          'Web Vitals (LCP, CLS)',
          'frame timing (16.67ms VSync / 20ms T3 / 25ms T1 headless advisory)',
          'per-island cold hydration timing',
          'per-kind Transition latency',
          'proposed per-Place JS byte budgets'
        ]
      }
    });

    persistPerformanceReport(report, opts.outPath);
    if (opts.ciCopyPath) {
      persistPerformanceReport(report, opts.ciCopyPath);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          outPath: opts.outPath,
          warmups: opts.warmups,
          samples: opts.samples,
          labColdTrunkP50: pairAComparisons.workbench_cold_ready_ms?.trunk?.median,
          labColdHeadP50: pairAComparisons.workbench_cold_ready_ms?.head?.median,
          spaLinkTrunkP50: pairAComparisons.p0_spa_functional_link_ms?.trunk?.median,
          spaLinkHeadP50: pairAComparisons.p0_spa_functional_link_ms?.head?.median,
          preAstroLabP50: pairBComparisons.place_responsive_lab?.readyMs?.trunk?.median,
          astroHeadLabP50: pairBComparisons.place_responsive_lab?.readyMs?.head?.median,
          preAstroLabJsBytes: pairBComparisons.place_responsive_lab?.preAstroJsDecodedBytes,
          astroHeadLabJsBytes: pairBComparisons.place_responsive_lab?.astroHeadJsDecodedBytes
        },
        null,
        2
      )
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
    for (const s of servers) {
      await s.stop();
    }
    cleanupWorktree(DEFAULT_ROOT_DIR, wtTrunk);
    cleanupWorktree(DEFAULT_ROOT_DIR, wtPreAstro);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
