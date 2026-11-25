import { test, expect } from '../fixtures/app-fixtures.js';

const NAV_CASES = [
  { from: '/index.html?noredirect=1', testId: 'nav-viewer-to-registry', expectedUrl: /\/sprint-registry\.html$/, transitionId: 't_link_viewer_to_registry' },
  { from: '/index.html?noredirect=1', testId: 'nav-viewer-to-inspector', expectedUrl: /\/fiber-inspector\.html$/, transitionId: 't_link_viewer_to_inspector' },
  { from: '/responsive-lab.html', testId: 'nav-lab-to-registry', expectedUrl: /\/sprint-registry\.html$/, transitionId: 't_link_lab_to_registry', openMenu: true },
  { from: '/responsive-lab.html', testId: 'nav-lab-to-inspector', expectedUrl: /\/fiber-inspector\.html$/, transitionId: 't_link_lab_to_inspector', openMenu: true },
  { from: '/sprint-registry.html', testId: 'nav-registry-to-index', expectedUrl: /\/index\.html\?noredirect=1$/, transitionId: 't_link_registry_to_index' },
  { from: '/sprint-registry.html', testId: 'nav-registry-to-lab', expectedUrl: /\/responsive-lab\.html$/, transitionId: 't_link_registry_to_lab' },
  { from: '/sprint-registry.html', testId: 'nav-registry-to-inspector', expectedUrl: /\/fiber-inspector\.html$/, transitionId: 't_link_registry_to_inspector' },
  { from: '/fiber-inspector.html', testId: 'nav-inspector-to-index', expectedUrl: /\/index\.html\?noredirect=1$/, transitionId: 't_link_inspector_to_index' },
  { from: '/fiber-inspector.html', testId: 'nav-inspector-to-lab', expectedUrl: /\/responsive-lab\.html$/, transitionId: 't_link_inspector_to_lab' },
  { from: '/fiber-inspector.html', testId: 'nav-inspector-to-registry', expectedUrl: /\/sprint-registry\.html$/, transitionId: 't_link_inspector_to_registry' },
  { from: '/fiber-inspector.html', testId: 'link-conformance-harness', expectedUrl: /\/fiber-conformance\.html$/, transitionId: 't_link_inspector_to_conformance' }
];

test.describe('DCI-02: Workbench Navigation Closure', () => {
  for (const item of NAV_CASES) {
    test(`${item.transitionId}: ${item.from} -> ${item.testId}`, async ({ page }) => {
      await page.goto(item.from);
      await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

      if (item.openMenu) {
        await page.getByTestId('workbench-nav-summary').click();
      }
      const link = page.getByTestId(item.testId);
      await expect(link).toBeVisible();
      await link.click();

      await page.waitForURL(item.expectedUrl, { timeout: 10000 });
      await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

      const report = await page.evaluate(() => window.__netReport);
      const records = Array.isArray(report) ? report : report?.records || [];
      expect(
        records.some((r) => r.transitionId === item.transitionId),
        `Expected netReport on ${item.expectedUrl} to contain ${item.transitionId}, got ${JSON.stringify(records)}`
      ).toBe(true);
    });
  }

  test('Keyboard user reaches target page with focus and Enter', async ({ page }) => {
    await page.goto('/sprint-registry.html');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    const link = page.getByTestId('nav-registry-to-inspector');
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/fiber-inspector\.html$/, { timeout: 10000 });
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
  });

  test('Lab Pages menu works cleanly at 358px compact width without horizontal overflow', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 358, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto('/responsive-lab.html');
      await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      await page.getByTestId('workbench-nav-summary').click();
      await expect(page.getByTestId('nav-lab-to-registry')).toBeVisible();
      await page.getByTestId('nav-lab-to-registry').click();
      await page.waitForURL(/\/sprint-registry\.html$/, { timeout: 10000 });
    } finally {
      await context.close();
    }
  });
});
