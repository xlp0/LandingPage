import {
  test,
  expect,
  SPA_FIXTURE_PATH,
  createResponsiveLabWorkbench,
  installExternalBoundaryStubs,
  loadSpaFixtureGraph
} from '../fixtures/app-fixtures.js';
import { toPlaywrightContext } from '../fixtures/device-matrix.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';
import { resolveFidelity } from '../../js/harness/fidelity.js';
import { TEST_RUN_SCHEMA } from '../../js/harness/test-run-schema.js';
import { replayRun } from '../../scripts/playwright-replay-driver.mjs';
import { runConformance } from '../conformance/runner.js';

const spaGraph = loadSpaFixtureGraph();

test.describe('SPRINT-GQC-02: Guided SPA Workbench Journey', () => {
  test('GQC-02-E2E-01: selects SPA target, applies and rotates builtin device, navigates in-document without reload, persists MCard run, and replays to matching Place', async ({
    browser,
    isolatedLabPage,
    workbench,
    request
  }) => {
    const { page, dialogs } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    const reachable = await ensureTargetReachable(request, SPA_FIXTURE_PATH);
    expect(reachable).toBe(true);

    await workbench.open();
    await workbench.loadTargetByUrl(SPA_FIXTURE_PATH);

    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');
    await expect(frame.getByRole('heading', { name: 'Citizen Service Overview' })).toBeVisible();
    await expect(appRoot).toHaveAttribute('data-page-id', spaGraph.bindings.places.p_spa_overview.pageId);
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');

    const initialBootNonce = await appRoot.getAttribute('data-boot-nonce');
    expect(initialBootNonce).toBeTruthy();

    const phoneProfile = await workbench.selectBuiltinDevice('iphone-16-pro');
    const initialDims = await workbench.readStageDimensions();
    expect(
      (initialDims.width === phoneProfile.width && initialDims.height === phoneProfile.height) ||
      (initialDims.width === phoneProfile.height && initialDims.height === phoneProfile.width)
    ).toBe(true);

    const rotatedDims = await workbench.rotateViewport();
    expect(rotatedDims.width).toBe(initialDims.height);
    expect(rotatedDims.height).toBe(initialDims.width);
    await expect(appRoot).toHaveAttribute('data-boot-nonce', initialBootNonce);

    if (rotatedDims.width > rotatedDims.height) {
      await workbench.rotateViewport();
    }

    await workbench.startRecording();

    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    await expect(frame.getByRole('heading', { name: 'Service Details Specification' })).toBeVisible();
    await expect(appRoot).toHaveAttribute('data-page-id', spaGraph.bindings.places.p_spa_details.pageId);
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');
    await expect(appRoot).toHaveAttribute('data-last-transition-id', 't_spa_open_details');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', initialBootNonce);

    await frame.getByRole('button', { name: 'Back to Overview' }).click();
    await expect(frame.getByRole('heading', { name: 'Citizen Service Overview' })).toBeVisible();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    await expect(appRoot).toHaveAttribute('data-last-transition-id', 't_spa_back_overview');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', initialBootNonce);

    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', initialBootNonce);

    const saved = await workbench.stopAndSaveRecording();
    expect([200, 201]).toContain(saved.status);
    expect(saved.data.hash).toMatch(/^[0-9a-f]{64}$/i);
    expect(saved.data.handle).toBeTruthy();
    expect(saved.badge).not.toBeNull();
    expect(saved.badge.hashPrefix).toBe(saved.data.hash.slice(0, 8).toLowerCase());

    const persisted = await workbench.fetchPersistedRun(saved.data.hash);
    expect(persisted.ok).toBe(true);
    const storedRun = persisted.body.run || persisted.body;
    expect(storedRun.schema).toBe(TEST_RUN_SCHEMA);
    expect(storedRun.captureSource).toBe('same-origin');
    expect(storedRun.device.id).toBe('iphone-16-pro');
    expect(storedRun.netMCard).toBeUndefined();
    expect(storedRun.events.filter((e) => e.type === 'pointer').length).toBeGreaterThanOrEqual(3);

    const replayContext = await browser.newContext(toPlaywrightContext(phoneProfile, 'portrait'));
    try {
      await installExternalBoundaryStubs(replayContext);
      const replayPage = await replayContext.newPage();
      await replayPage.goto(storedRun.target.url);
      const replayAppRoot = replayPage.locator('#spa-app-root');
      await expect(replayAppRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
      const replayBootNonce = await replayAppRoot.getAttribute('data-boot-nonce');

      const replaySummary = await replayRun(replayPage, storedRun, {
        mode: 'deterministic',
        mintResult: false
      });

      expect(replaySummary.verdict).toBe('pass');
      expect(replaySummary.counts.replayed).toBeGreaterThanOrEqual(3);
      await expect(replayAppRoot).toHaveAttribute('data-place-id', 'p_spa_details');
      await expect(replayAppRoot).toHaveAttribute('data-last-transition-id', 't_spa_open_details');
      await expect(replayPage.getByRole('heading', { name: 'Service Details Specification' })).toBeVisible();
      await expect(replayAppRoot).toHaveAttribute('data-boot-nonce', replayBootNonce);
    } finally {
      await replayContext.close();
    }

    expect(dialogs).toEqual([]);
  });

  test('GQC-02-E2E-02: SPA target passes reusable device conformance catalog across phone and tablet profiles', async ({
    browser,
    baseURL
  }) => {
    const spaConformanceSpec = {
      target: SPA_FIXTURE_PATH,
      checks: [
        { id: 'no-horizontal-overflow' },
        { id: 'no-console-errors' },
        { id: 'viewport-meta' },
        { id: 'tap-target-size' },
        {
          id: 'key-targets-visible',
          params: {
            selectors: ['#spa-app-root', '[data-testid="spa-view-heading"]'],
            requirePresent: true
          }
        }
      ]
    };

    for (const deviceId of ['iphone-16-pro', 'ipad-air-11']) {
      const profile = BUILTIN_DEVICES.find((d) => d.id === deviceId);
      const context = await browser.newContext(toPlaywrightContext(profile, 'portrait'));
      try {
        await installExternalBoundaryStubs(context);
        const page = await context.newPage();
        const consoleErrors = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        await page.goto(`${baseURL}${SPA_FIXTURE_PATH}`);
        await expect(page.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_overview');

        const fidelity = resolveFidelity(profile, 'playwright');
        const overviewReport = await runConformance(page, spaConformanceSpec, {
          profile,
          orientation: 'portrait',
          fidelity,
          consoleErrors
        });
        expect(overviewReport.summary.fail).toBe(0);
        expect(overviewReport.summary.pass).toBe(5);

        await page.getByRole('button', { name: 'Open Service Details' }).click();
        await expect(page.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_details');

        const detailsReport = await runConformance(page, spaConformanceSpec, {
          profile,
          orientation: 'portrait',
          fidelity,
          consoleErrors
        });
        expect(detailsReport.summary.fail).toBe(0);
        expect(detailsReport.summary.pass).toBe(5);
      } finally {
        await context.close();
      }
    }
  });

  test('GQC-02-E2E-03: fresh browser context isolates storage, cookies, and network state from prior sessions', async ({
    browser,
    baseURL,
    request
  }) => {
    const dirtyContext = await browser.newContext();
    try {
      const dirtyPage = await dirtyContext.newPage();
      await dirtyPage.goto(`${baseURL}/responsive-lab.html`);
      await dirtyPage.evaluate(() => {
        window.localStorage.setItem('gqc02_leaked_sentinel', 'dirty');
        window.sessionStorage.setItem('gqc02_session_sentinel', 'dirty');
      });
    } finally {
      await dirtyContext.close();
    }

    const cleanContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    try {
      const stubs = await installExternalBoundaryStubs(cleanContext);
      const cleanPage = await cleanContext.newPage();
      const lab = createResponsiveLabWorkbench(cleanPage, request);

      await lab.open({ targetPath: SPA_FIXTURE_PATH });
      const leakedState = await cleanPage.evaluate(() => ({
        localSentinel: window.localStorage.getItem('gqc02_leaked_sentinel'),
        sessionSentinel: window.sessionStorage.getItem('gqc02_session_sentinel'),
        cookieLen: document.cookie.length
      }));
      expect(leakedState).toEqual({
        localSentinel: null,
        sessionSentinel: null,
        cookieLen: 0
      });

      const frame = lab.targetFrame();
      await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_overview');
      await frame.getByRole('button', { name: 'Open Service Details' }).click();
      await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_details');
      expect(stubs.stubbedRequests.filter((r) => r.boundary === 'oauth')).toEqual([]);
    } finally {
      await cleanContext.close();
    }
  });
});
