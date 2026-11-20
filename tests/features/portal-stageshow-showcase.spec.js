import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '../fixtures/app-fixtures.js';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, '../..');

function attachErrorCollectors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const cspViolations = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err?.message || String(err));
  });
  page.on('securitypolicyviolation', (ev) => {
    cspViolations.push(`${ev.violatedDirective}: ${ev.blockedURI}`);
  });

  return { consoleErrors, pageErrors, cspViolations };
}

async function seedBalancedMode(page, theme = 'dark') {
  await page.addInitScript(({ initialTheme }) => {
    localStorage.setItem('govtech_power_mode', 'balanced');
    localStorage.setItem('govtech_display_theme', initialTheme);
  }, { initialTheme: theme });
}

async function installHermeticPortalRoutes(page) {
  await page.route('**://localhost:12347/**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**://127.0.0.1:12347/**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/api/mcard/landing', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hash: 'a'.repeat(64),
        contentType: 'text/markdown',
        content: '# Sovereign MCard Portal\n\nStageShow verification fixture.'
      })
    })
  );
}

test.describe('Portal StageShow showcase (@features)', () => {
  test.beforeEach(async ({ page }) => {
    await installHermeticPortalRoutes(page);
  });

  test('Desktop 1280x800 and compact 358x800 live showcase preserve zero islands and fixed height', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await seedBalancedMode(page, 'dark');
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/index.html?noredirect=1');
    await page.waitForFunction(() => document.body?.dataset?.pageState === 'ready', null, { timeout: 15000 });

    const showcase = page.locator('#portal-stageshow-showcase');
    await expect(showcase).toBeVisible();
    await expect(showcase).toHaveAttribute('data-showcase-mode', 'live', { timeout: 10000 });

    const desktopAudit = await page.evaluate(() => {
      const host = document.getElementById('portal-stageshow-showcase');
      const stage = host?.shadowRoot?.querySelector('.ss-stage');
      const rect = host?.getBoundingClientRect();
      return {
        islands: document.querySelectorAll('astro-island').length,
        hasShadowRoot: Boolean(host?.shadowRoot),
        hasStage: Boolean(stage),
        layout: stage?.getAttribute('data-layout'),
        height: rect ? Math.round(rect.height) : 0,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    });

    expect(desktopAudit.islands).toBe(0);
    expect(desktopAudit.hasShadowRoot).toBe(true);
    expect(desktopAudit.hasStage).toBe(true);
    expect(desktopAudit.layout).toBe('wide');
    expect(desktopAudit.height).toBe(340);
    expect(desktopAudit.scrollWidth).toBeLessThanOrEqual(desktopAudit.clientWidth + 1);

    const mcardLines = fs
      .readFileSync(path.join(REPO_ROOT, 'js/landing-page-mcard.js'), 'utf8')
      .trimEnd()
      .split('\n').length;
    expect(mcardLines).toBeLessThanOrEqual(250);

    await page.setViewportSize({ width: 358, height: 800 });
    await page.waitForFunction(() => {
      const host = document.getElementById('portal-stageshow-showcase');
      const stage = host?.shadowRoot?.querySelector('.ss-stage');
      return stage?.getAttribute('data-layout') === 'compact';
    }, null, { timeout: 10000 });

    const compactAudit = await page.evaluate(() => {
      const host = document.getElementById('portal-stageshow-showcase');
      const stage = host?.shadowRoot?.querySelector('.ss-stage');
      const rect = host?.getBoundingClientRect();
      return {
        layout: stage?.getAttribute('data-layout'),
        height: rect ? Math.round(rect.height) : 0,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    });

    expect(compactAudit.layout).toBe('compact');
    expect(compactAudit.height).toBe(320);
    expect(compactAudit.scrollWidth).toBeLessThanOrEqual(compactAudit.clientWidth + 1);

    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.cspViolations).toEqual([]);
  });

  test('Syncs Shadow DOM stage look tokens across dark, light, and high-contrast themes', async ({ page }) => {
    const errors = attachErrorCollectors(page);
    await seedBalancedMode(page, 'dark');
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/index.html?noredirect=1');
    await expect(page.locator('#portal-stageshow-showcase')).toHaveAttribute('data-showcase-mode', 'live', {
      timeout: 10000
    });

    const readStageLook = () => page.evaluate(() => {
      const stage = document.getElementById('portal-stageshow-showcase')?.shadowRoot?.querySelector('.ss-stage');
      if (!stage) return null;
      const computedCanvas = getComputedStyle(stage).getPropertyValue('--ss-canvas').trim().toLowerCase();
      return {
        dataTheme: stage.getAttribute('data-theme'),
        inlineCanvas: stage.style.getPropertyValue('--ss-canvas').trim().toLowerCase(),
        computedCanvas
      };
    });

    expect((await readStageLook())?.dataTheme).toBe('dark');

    await page.evaluate(() => window.__presentation_controller.setTheme('light', false));
    await expect.poll(async () => (await readStageLook())?.dataTheme).toBe('light');

    await page.evaluate(() => window.__presentation_controller.setTheme('high-contrast', false));
    await expect.poll(async () => {
      const look = await readStageLook();
      return look ? `${look.dataTheme}:${look.computedCanvas}` : '';
    }).toBe('dark:#000000');

    await page.evaluate(() => window.__presentation_controller.setTheme('dark', false));
    await expect.poll(async () => {
      const look = await readStageLook();
      return look ? `${look.dataTheme}:${look.inlineCanvas}` : '';
    }).toBe('dark:');

    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.cspViolations).toEqual([]);
  });

  test('Falls back to static poster for reduced motion, energy-saving power mode, and framed Lab mode', async ({ page }) => {
    const errors = attachErrorCollectors(page);

    // 1. Reduced motion poster fallback
    await seedBalancedMode(page, 'dark');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html?noredirect=1');
    await page.waitForFunction(() => document.body?.dataset?.pageState === 'ready', null, { timeout: 15000 });

    const reducedAudit = await page.evaluate(() => {
      const host = document.getElementById('portal-stageshow-showcase');
      const poster = host?.querySelector('.portal-showcase-poster');
      const rect = host?.getBoundingClientRect();
      return {
        mode: host?.dataset?.showcaseMode,
        hasStage: Boolean(host?.shadowRoot?.querySelector('.ss-stage')),
        posterVisible: Boolean(poster && getComputedStyle(poster).display !== 'none'),
        height: rect ? Math.round(rect.height) : 0
      };
    });
    expect(reducedAudit.mode).toBe('poster');
    expect(reducedAudit.hasStage).toBe(false);
    expect(reducedAudit.posterVisible).toBe(true);
    expect(reducedAudit.height).toBe(340);

    // 2. Energy-saving live unmount fallback
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/index.html?noredirect=1');
    await expect(page.locator('#portal-stageshow-showcase')).toHaveAttribute('data-showcase-mode', 'live', {
      timeout: 10000
    });

    await page.evaluate(() => window.__presentation_controller.setPowerMode('energy-saving', false));
    await expect(page.locator('#portal-stageshow-showcase')).toHaveAttribute('data-showcase-mode', 'poster', {
      timeout: 10000
    });

    const ecoAudit = await page.evaluate(() => {
      const host = document.getElementById('portal-stageshow-showcase');
      const rect = host?.getBoundingClientRect();
      return {
        hasStage: Boolean(host?.shadowRoot?.querySelector('.ss-stage')),
        height: rect ? Math.round(rect.height) : 0
      };
    });
    expect(ecoAudit.hasStage).toBe(false);
    expect(ecoAudit.height).toBe(340);

    // 3. Framed inside Responsive UI Lab (window.self !== window.top)
    await page.goto('/responsive-lab.html');
    await page.waitForFunction(() => Boolean(window.__lab?.target?.set) && document.body?.dataset?.pageState === 'ready', null, {
      timeout: 15000
    });
    await page.evaluate(() => window.__lab.target.set('/index.html?noredirect=1'));

    const iframeEl = await page.locator('#mission-control-iframe').elementHandle();
    const frame = await iframeEl?.contentFrame();
    expect(frame).toBeTruthy();

    await frame.waitForFunction(() => {
      const host = document.getElementById('portal-stageshow-showcase');
      return document.body?.dataset?.pageState === 'ready' && Boolean(host?.shadowRoot);
    }, null, { timeout: 15000 });

    const framedAudit = await frame.evaluate(() => {
      const host = document.getElementById('portal-stageshow-showcase');
      return {
        framed: window.self !== window.top,
        mode: host?.dataset?.showcaseMode,
        hasStage: Boolean(host?.shadowRoot?.querySelector('.ss-stage'))
      };
    });
    expect(framedAudit.framed).toBe(true);
    expect(framedAudit.mode).toBe('poster');
    expect(framedAudit.hasStage).toBe(false);

    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
    expect(errors.cspViolations).toEqual([]);
  });
});
