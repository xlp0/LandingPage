import {
  SPA_FIXTURE_PATH,
  loadSpaFixtureGraph
} from '../fixtures/app-fixtures.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { test, expect } from '../fixtures/net-trace.js';
import { ROOT_PAGE_CHARACTERIZATIONS } from '../fixtures/test-config.js';
import { TEST_RUN_SCHEMA } from '../../js/harness/test-run-schema.js';

const spaGraph = loadSpaFixtureGraph();

const MIGRATED_PATHS = [
  { url: '/index.html', characterizationPath: '/index.html' },
  { url: '/responsive-lab.html', characterizationPath: '/responsive-lab.html' },
  { url: '/app.html', characterizationPath: '/app.html' },
  { url: '/sprint-registry.html', characterizationPath: '/sprint-registry.html' },
  { url: '/fiber-inspector.html', characterizationPath: '/fiber-inspector.html' },
  { url: '/fiber-conformance.html', characterizationPath: '/fiber-conformance.html' }
];

test.describe('SPRINT-GQC-02B: Astro Host Parity and Middleware Contracts', () => {
  test('GQC-02B-INT-01: Astro middleware serves all 6 migrated Places with x-gqc-host meta while falling through cleanly for /health, /api/*, /app-config.json, legacy static pages, and 404s', async ({
    request
  }) => {
    const rootRes = await request.get('/');
    expect(rootRes.status()).toBe(200);
    expect(rootRes.headers()['content-type']).toContain('text/html');
    const rootHtml = await rootRes.text();
    expect(rootHtml).toContain('<meta name="x-gqc-host" content="astro"');

    for (const item of MIGRATED_PATHS) {
      const res = await request.get(item.url);
      expect(res.status(), `status for ${item.url}`).toBe(200);
      expect(res.headers()['content-type']).toContain('text/html');
      const html = await res.text();
      expect(html, `astro host marker on ${item.url}`).toContain('<meta name="x-gqc-host" content="astro"');
      const characterization = ROOT_PAGE_CHARACTERIZATIONS.find(
        (entry) => entry.pagePath === item.characterizationPath
      );
      if (characterization) {
        expect(html).toContain(`<title>${characterization.expectedTitle}</title>`);
      }
    }

    const undecidedRes = await request.get('/pkc-docs-index.html');
    expect(undecidedRes.status()).toBe(200);
    const undecidedHtml = await undecidedRes.text();
    expect(undecidedHtml).not.toContain('name="x-gqc-host"');

    const healthRes = await request.get('/health');
    expect(healthRes.status()).toBe(200);
    const healthBody = await healthRes.json();
    expect(healthBody.status).toBe('ok');
    expect(healthBody).toHaveProperty('status', 'ok');

    const roomsRes = await request.get('/api/rooms');
    expect(roomsRes.status()).toBe(200);
    const roomsBody = await roomsRes.json();
    expect(Array.isArray(roomsBody.rooms)).toBe(true);

    const envRes = await request.get('/api/env');
    expect(envRes.status()).toBe(200);
    const envBody = await envRes.json();
    expect(typeof envBody.MCARD_STUDIO_URL).toBe('string');

    const configRes = await request.get('/api/config');
    expect(configRes.status()).toBe(200);
    expect(configRes.headers()['access-control-allow-origin']).toBeUndefined();
    const configBody = await configRes.json();
    expect(configBody).toHaveProperty('PORT');

    const allowedCorsRes = await request.get('/api/config', {
      headers: { Origin: 'http://localhost:3001' }
    });
    expect(allowedCorsRes.status()).toBe(200);
    expect(allowedCorsRes.headers()['access-control-allow-origin']).toBe('http://localhost:3001');

    const blockedCorsRes = await request.get('/api/config', {
      headers: { Origin: 'https://github.com' }
    });
    expect(blockedCorsRes.status()).toBe(200);
    expect(blockedCorsRes.headers()['access-control-allow-origin']).toBeUndefined();

    const appConfigRes = await request.get('/app-config.json');
    expect(appConfigRes.status()).toBe(200);
    const appConfigBody = await appConfigRes.json();
    expect(Array.isArray(appConfigBody.labTargets)).toBe(true);

    const clmRes = await request.get('/api/clm/registry');
    expect(clmRes.status()).toBe(200);
    const clmBody = await clmRes.json();
    expect(clmBody).toHaveProperty('success', true);

    const mcardRes = await request.get('/api/mcard/landing');
    expect([200, 404]).toContain(mcardRes.status());

    const missingRes = await request.get('/__gqc_nonexistent_astro_probe__');
    expect(missingRes.status()).toBe(404);
    const missingText = await missingRes.text();
    expect(missingText).toContain('Cannot GET /__gqc_nonexistent_astro_probe__');

    const nonApiPost = await request.post('/__gqc_non_api_post_probe__', {
      data: { probe: true }
    });
    expect(nonApiPost.status()).toBe(404);
  });

  test('GQC-02B-E2E-03: Astro-hosted Responsive Lab opens /responsive-lab.html?target=<fixture>, drives SPA fixture without full reload, and persists MCard test run', async ({
    isolatedLabPage,
    workbench,
    request
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    const reachable = await ensureTargetReachable(request, SPA_FIXTURE_PATH);
    expect(reachable).toBe(true);

    await page.goto(`/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`);
    await expect(page.locator('meta[name="x-gqc-host"]')).toHaveAttribute('content', 'astro');
    await expect(page.getByRole('heading', { name: /Responsive UI Lab/i })).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);

    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');
    await expect(frame.getByRole('heading', { name: 'Citizen Service Overview' })).toBeVisible();
    await expect(appRoot).toHaveAttribute('data-page-id', spaGraph.bindings.places.p_spa_overview.pageId);
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');

    const bootNonce = await appRoot.getAttribute('data-boot-nonce');
    expect(bootNonce).toBeTruthy();

    await workbench.selectBuiltinDevice('iphone-16-pro');
    await workbench.rotateViewport();
    await expect(appRoot).toHaveAttribute('data-boot-nonce', bootNonce);

    await workbench.startRecording();
    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', bootNonce);

    const saved = await workbench.stopAndSaveRecording();
    expect([200, 201]).toContain(saved.status);
    expect(saved.data.hash).toMatch(/^[0-9a-f]{64}$/i);

    const persisted = await workbench.fetchPersistedRun(saved.data.hash);
    expect(persisted.ok).toBe(true);
    const storedRun = persisted.body.run || persisted.body;
    expect(storedRun.schema).toBe(TEST_RUN_SCHEMA);
  });

  test('GQC-02B-E2E-01: Astro-hosted / redirects to /responsive-lab.html while /?noredirect=1 and /index.html?noredirect=1 preserve MCard viewer Place', async ({
    isolatedLabPage
  }) => {
    const { page } = isolatedLabPage;

    await page.goto('/');
    await page.waitForURL(/\/responsive-lab\.html(?:\?|$)/);
    await expect(page.locator('meta[name="x-gqc-host"]')).toHaveAttribute('content', 'astro');
    await expect(page.getByRole('heading', { name: /Responsive UI Lab/i })).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);

    await page.goto('/?noredirect=1');
    await expect(page).toHaveURL(/\/\?noredirect=1$/);
    await expect(page.locator('meta[name="x-gqc-host"]')).toHaveAttribute('content', 'astro');
    await expect(page.locator('nav#penpot-site-nav')).toBeVisible();

    await page.goto('/index.html?noredirect=1');
    await expect(page).toHaveURL(/\/index\.html\?noredirect=1$/);
    await expect(page.locator('meta[name="x-gqc-host"]')).toHaveAttribute('content', 'astro');
    await expect(page.locator('nav#penpot-site-nav')).toBeVisible();
  });

  test('GQC-02B-E2E-02: workbench Petri net tracer replays multi-Place navigation traces recorded on the Astro build', async ({
    isolatedLabPage,
    workbenchNetTracer
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await page.goto('/');
    await page.waitForURL(/\/responsive-lab\.html(?:\?|$)/);
    await expect(page.locator('meta[name="x-gqc-host"]')).toHaveAttribute('content', 'astro');
    await expect(page.locator('#btn-nav-mission-control')).toBeVisible();

    const popupPromise = page.waitForEvent('popup');
    await page.locator('#btn-nav-mission-control').click();
    const appPage = await popupPromise;
    await appPage.waitForURL(/\/app\.html(?:\?|$)/);
    await expect(appPage.locator('meta[name="x-gqc-host"]')).toHaveAttribute('content', 'astro');

    await appPage.locator('button.header-btn[title="Back to Landing Page"]').click();
    await appPage.waitForURL(/\/responsive-lab\.html(?:\?|$)/);
    await expect(appPage.locator('meta[name="x-gqc-host"]')).toHaveAttribute('content', 'astro');

    const trace = workbenchNetTracer.getTrace();
    expect(trace.unmappedNavigations).toEqual([]);
    const replayResult = await workbenchNetTracer.replay();
    expect(replayResult.ok).toBe(true);
    expect(replayResult.sessionInvariantHolds).toBe(true);
    expect(replayResult.finalPlaceId).toBe('p_page_responsive_lab');
    expect(replayResult.firedTransitionIds).toContain('t_redirect_index_to_lab');
    expect(replayResult.firedTransitionIds).toContain('t_link_lab_to_app');
  });
});
