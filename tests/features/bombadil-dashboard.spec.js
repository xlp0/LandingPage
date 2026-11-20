import { test, expect, SPA_FIXTURE_PATH } from '../fixtures/app-fixtures.js';

const MOCK_HANDLES = [
  { handle: 'urn:mcard:bombadil:trigger:spa', target: 'spa', spec: 'tests/bombadil/spa-target.bombadil.ts', path: SPA_FIXTURE_PATH, singlePageFramed: true },
  { handle: 'urn:mcard:bombadil:trigger:spa-canary', target: 'spa-canary', spec: 'tests/bombadil/spa-target.bombadil.ts', path: '/tests/bombadil/fixtures/spa-test-target-canary.html', singlePageFramed: true },
  { handle: 'urn:mcard:bombadil:trigger:lab-smoke', target: 'lab-smoke', spec: 'tests/bombadil/lab-smoke.bombadil.ts', path: '/responsive-lab.html', singlePageFramed: false },
  { handle: 'urn:mcard:bombadil:trigger:page-load', target: 'page-load', spec: 'tests/bombadil/page-load.bombadil.ts', path: null, singlePageFramed: false },
  { handle: 'urn:mcard:bombadil:trigger:workbench', target: 'workbench', spec: 'tests/bombadil/workbench.bombadil.ts', path: '/responsive-lab.html', singlePageFramed: false }
];

function makeMockCoverage() {
  return {
    empty: false,
    hash: 'covhash0123456789abcdef',
    handle: 'urn:mcard:bombadil:coverage:latest',
    nets: {
      'landingpage-workbench-net': {
        declared: 90,
        fired: 24,
        asserted: 19,
        exploredOnly: 5,
        neverFired: 66
      }
    },
    rejectedTraces: []
  };
}

test.describe('SPRINT-SSG-05: Bombadil Dashboard Island and Handle Flows', () => {
  test('cold load opens zero Bombadil SSE streams at idle, defers island hydration, and hydrates via transport pill', async ({
    isolatedLabPage
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    const bombadilRequests = [];
    await page.route('**/api/test-runs/bombadil/**', async (route) => {
      const url = route.request().url();
      bombadilRequests.push(url);
      if (url.includes('/handles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            handles: MOCK_HANDLES,
            targets: MOCK_HANDLES.map((h) => h.target),
            activeJob: null,
            childRun: false,
            triggerEnabled: true
          })
        });
        return;
      }
      if (url.includes('/runs')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ runs: [] })
        });
        return;
      }
      if (url.includes('/coverage')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ empty: true, nets: {}, rejectedTraces: [] })
        });
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto(`/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading');
    await expect(page.getByTestId('bombadil-dashboard-panel')).toHaveAttribute('data-island-state', 'ready');

    const ssrLocked = await page.locator('#bombadil-panel-shell astro-island').evaluate((el) => el.hasAttribute('ssr'));
    expect(ssrLocked).toBe(true);
    expect(bombadilRequests).toEqual([]);

    const transportPill = page.getByTestId('bombadil-transport-pill');
    await expect(transportPill).toBeVisible();
    await expect(transportPill).toHaveText('Bombadil: Idle');
    await transportPill.click();

    await expect(page.locator('#workbench-controls-dock')).toHaveAttribute('data-workbench-mode', 'bombadil');
    await expect.poll(() =>
      page.locator('#bombadil-panel-shell astro-island').evaluate((el) => el.hasAttribute('ssr'))
    ).toBe(false);
    await expect(page.getByTestId('bombadil-handles-grid')).toBeVisible();
    for (const item of MOCK_HANDLES) {
      await expect(page.getByTestId(`bombadil-trigger-${item.target}`)).toBeEnabled();
    }
    expect(bombadilRequests.some((u) => u.includes('/stream'))).toBe(false);
  });

  test('triggers run, streams SSE violation/complete, loads canary in stage, shrinks trace, and accepts __lab / CustomEvent commands', async ({
    isolatedLabPage
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    let streamCount = 0;
    const triggerBodies = [];
    const shrinkBodies = [];
    const storedRuns = [];
    let currentCoverage = { empty: true, nets: {}, rejectedTraces: [] };

    await page.route('**/api/test-runs/bombadil/**', async (route) => {
      const req = route.request();
      const url = req.url();

      if (url.includes('/handles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            handles: MOCK_HANDLES,
            targets: MOCK_HANDLES.map((h) => h.target),
            activeJob: null,
            childRun: false,
            triggerEnabled: true
          })
        });
        return;
      }

      if (url.includes('/trigger')) {
        const body = req.postDataJSON();
        triggerBodies.push(body);
        const runId = `run_${body.target}_${triggerBodies.length}`;
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            runId,
            target: body.target,
            status: 'running',
            triggerHandle: `urn:mcard:bombadil:trigger:${body.target}`
          })
        });
        return;
      }

      if (url.includes('/stream')) {
        streamCount += 1;
        const lastTrigger = triggerBodies[triggerBodies.length - 1];
        if (!lastTrigger) {
          await route.fulfill({ status: 204, body: '' });
          return;
        }
        const runId = `run_${lastTrigger.target}_${triggerBodies.length}`;
        const isCanary = lastTrigger.target === 'spa-canary';
        const violations = isCanary
          ? [{ name: 'canaryNoDeadRoute', url: '/tests/bombadil/fixtures/spa-test-target-canary.html' }]
          : [];
        const runRecord = {
          runId,
          target: lastTrigger.target,
          status: isCanary ? 'violated' : 'clean',
          actionsCount: isCanary ? 42 : 88,
          firingsCount: 16,
          distinctTransitions: 9,
          quiescenceWarnings: 0,
          currentPlaceId: 'p_spa_details',
          violations,
          hash: isCanary ? 'aaaa1111bbbb2222cccc3333' : 'dddd4444eeee5555ffff6666',
          runHandle: `urn:mcard:bombadil:run:${runId}`,
          reproduceCommand: `npm run bombadil:${lastTrigger.target} -- --trace /tmp/${runId}/trace.jsonl`
        };
        storedRuns.unshift(runRecord);
        if (!isCanary) {
          currentCoverage = makeMockCoverage();
        }
        const sseFrames = [
          `event: progress\ndata: ${JSON.stringify({
            runId,
            target: lastTrigger.target,
            status: 'running',
            actionsCount: 25,
            firingsCount: 10,
            distinctTransitions: 6,
            currentPlaceId: 'p_spa_overview'
          })}\n\n`,
          ...(isCanary
            ? [`event: violation\ndata: ${JSON.stringify({ runId, target: lastTrigger.target, violations })}\n\n`]
            : []),
          `event: complete\ndata: ${JSON.stringify({
            runId,
            target: lastTrigger.target,
            status: runRecord.status,
            actionsCount: runRecord.actionsCount,
            firingsCount: runRecord.firingsCount,
            distinctTransitions: runRecord.distinctTransitions,
            quiescenceWarnings: 0,
            currentPlaceId: runRecord.currentPlaceId,
            violations,
            hash: runRecord.hash,
            runHandle: runRecord.runHandle,
            durationMs: 1200,
            run: runRecord
          })}\n\n`
        ].join('');

        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: sseFrames
        });
        return;
      }

      if (url.includes('/shrink')) {
        const body = req.postDataJSON();
        shrinkBodies.push(body);
        const existing = storedRuns.find((r) => r.runId === body.runId) || storedRuns[0];
        const updated = { ...existing, shrunkTracePath: '/tmp/shrunk-canary', stepsCount: 3 };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            runId: body.runId,
            shrunkTracePath: '/tmp/shrunk-canary',
            stepsCount: 3,
            hash: '99990000aaaa1111',
            runHandle: `urn:mcard:bombadil:run:${body.runId}`,
            run: updated
          })
        });
        return;
      }

      if (url.includes('/runs')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ runs: storedRuns })
        });
        return;
      }

      if (url.includes('/coverage')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(currentCoverage)
        });
        return;
      }

      await route.fulfill({ status: 404, body: '{}' });
    });

    await page.goto(`/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading');

    await page.locator('#btn-mode-bombadil').click();
    await expect(page.getByTestId('bombadil-handles-grid')).toBeVisible();

    // Load Target in Stage only exists for single-page framed handles (spa, spa-canary)
    await expect(page.getByTestId('bombadil-open-target-spa')).toBeVisible();
    await expect(page.getByTestId('bombadil-open-target-spa-canary')).toBeVisible();
    await expect(page.getByTestId('bombadil-open-target-workbench')).toHaveCount(0);

    await page.getByTestId('bombadil-open-target-spa-canary').click();
    await expect.poll(() => page.locator('#mission-control-iframe').getAttribute('src')).toContain('spa-test-target-canary.html');

    await page.getByTestId('bombadil-duration-spa-canary').selectOption('10s');
    await page.getByTestId('bombadil-trigger-spa-canary').click();

    await expect.poll(() => triggerBodies.length).toBe(1);
    expect(triggerBodies[0]).toEqual({
      handle: 'urn:mcard:bombadil:trigger:spa-canary',
      target: 'spa-canary',
      timeLimit: '10s'
    });

    await expect(page.getByTestId('bombadil-status-badge')).toHaveText('violated');
    await expect(page.getByTestId('bombadil-hero-metric')).toHaveText('1');
    await expect(page.getByTestId('bombadil-transport-pill')).toHaveText('Bombadil: Violated 1');
    await expect(page.getByTestId('bombadil-violation-card')).toContainText('canaryNoDeadRoute');

    await page.getByTestId('bombadil-shrink').click();
    await expect.poll(() => shrinkBodies.length).toBe(1);
    await expect(page.getByTestId('bombadil-shrunk-path')).toContainText('3 steps');
    await page.getByTestId('bombadil-copy-repro').click();
    await expect(page.getByTestId('bombadil-copy-repro')).toContainText('Copied');

    // Also drive handles via window.__lab.bombadil and CustomEvent lab:bombadil-command
    await page.evaluate(async () => {
      await window.__lab.bombadil.trigger({ target: 'spa', timeLimit: '10s' });
    });
    await expect(page.getByTestId('bombadil-status-badge')).toHaveText('clean');
    await expect(page.getByTestId('bombadil-hero-metric')).toHaveText('Pass');
    await expect(page.getByTestId('bombadil-transport-pill')).toHaveText('Bombadil: Clean (88)');
    await expect(page.getByTestId('bombadil-cov-asserted')).toHaveText('19/90');
    await expect(page.getByTestId('bombadil-run-row-run_spa_2')).toBeVisible();

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('lab:bombadil-command', {
        detail: { action: 'trigger', handle: 'urn:mcard:bombadil:trigger:spa', timeLimit: '10s' }
      }));
    });
    await expect.poll(() => triggerBodies.length).toBe(3);
    await expect.poll(() => streamCount).toBe(3);
  });

  test('supports Stop control and locks Trigger/Stop/Shrink buttons inside nested childRun', async ({
    isolatedLabPage
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    let scenario = 'active-stop';
    let stopRequests = 0;

    await page.route('**/api/test-runs/bombadil/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/handles')) {
        if (scenario === 'child-locked') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              handles: MOCK_HANDLES,
              targets: MOCK_HANDLES.map((h) => h.target),
              activeJob: null,
              childRun: true,
              triggerEnabled: false
            })
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            handles: MOCK_HANDLES,
            targets: MOCK_HANDLES.map((h) => h.target),
            activeJob: {
              runId: 'run_live_1',
              target: 'spa',
              status: 'running',
              actionsCount: 12,
              firingsCount: 4,
              distinctTransitions: 3,
              currentPlaceId: 'p_spa_overview',
              violations: []
            },
            childRun: false,
            triggerEnabled: true
          })
        });
        return;
      }

      if (url.includes('/stream')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `event: progress\ndata: ${JSON.stringify({ runId: 'run_live_1', target: 'spa', status: 'running', actionsCount: 15 })}\n\n`
        });
        return;
      }

      if (url.includes('/stop')) {
        stopRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            runId: 'run_live_1',
            target: 'spa',
            status: 'stopped',
            actionsCount: 15
          })
        });
        return;
      }

      if (url.includes('/runs')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ runs: [] }) });
        return;
      }
      if (url.includes('/coverage')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ empty: true, nets: {}, rejectedTraces: [] }) });
        return;
      }
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto(`/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading');

    await page.locator('#btn-mode-bombadil').click();
    await expect(page.getByTestId('bombadil-status-badge')).toHaveText('running');
    await expect(page.getByTestId('bombadil-stop')).toBeEnabled();
    await page.getByTestId('bombadil-stop').click();
    await expect.poll(() => stopRequests).toBe(1);
    await expect(page.getByTestId('bombadil-status-badge')).toHaveText('stopped');

    scenario = 'child-locked';
    await page.getByTestId('bombadil-refresh').click();
    await expect(page.getByTestId('bombadil-child-run-notice')).toBeVisible();
    await expect(page.getByTestId('bombadil-trigger-spa')).toBeDisabled();
    await expect(page.getByTestId('bombadil-stop')).toBeDisabled();
  });

  test('optional live subprocess smoke against spa-canary detects violation when BOMBADIL_LIVE_E2E=1', async ({
    isolatedLabPage
  }) => {
    test.skip(!process.env.BOMBADIL_LIVE_E2E, 'Set BOMBADIL_LIVE_E2E=1 to run live Bombadil subprocess probe');
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(`/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading');

    await page.locator('#btn-mode-bombadil').click();
    await page.getByTestId('bombadil-duration-spa-canary').selectOption('10s');
    await page.getByTestId('bombadil-trigger-spa-canary').click();
    await expect(page.getByTestId('bombadil-status-badge')).toHaveText('violated', { timeout: 60000 });
  });
});
