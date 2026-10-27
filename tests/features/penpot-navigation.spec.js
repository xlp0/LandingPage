import { test, expect } from '../fixtures/app-fixtures.js';

test.describe('Sprint CDO-15: Penpot Navigation Authoring', () => {
  test('DV-CDO-15-01..05: Penpot site navigation bar rendered into index.html?noredirect=1 from .penpot SSOT', async ({ isolatedLabPage }) => {
    const { page } = isolatedLabPage;
    await page.goto('/index.html?noredirect=1');

    const navBar = page.locator('#penpot-site-nav');
    await expect(navBar).toBeVisible();
    await expect(navBar).toHaveAttribute('data-graph-hash');

    const homeLink = page.locator('#penpot-site-nav a[data-penpot-handle="mcard:route:/index.html"]');
    const missionLink = page.locator('#penpot-site-nav a[data-penpot-handle="mcard:route:/app.html"]');
    const labLink = page.locator('#penpot-site-nav a[data-penpot-handle="mcard:route:/responsive-lab.html"]');

    await expect(homeLink).toBeVisible();
    await expect(missionLink).toBeVisible();
    await expect(labLink).toBeVisible();

    await expect(homeLink).toContainText('Home');
    await expect(missionLink).toContainText('Mission Control');
    await expect(labLink).toContainText('Responsive UI Lab');
    await expect(homeLink).toHaveClass(/penpot-nav-link-active/);

    await labLink.click();
    await expect(page).toHaveURL(/responsive-lab\.html/);
    await expect(page.getByRole('heading', { name: /Responsive UI Lab/i })).toBeVisible();
  });

  test('DV-CDO-15-04: js/nav.js exports matching graph hash and routes', async ({ isolatedLabPage }) => {
    const { page } = isolatedLabPage;
    await page.goto('/index.html?noredirect=1');

    const navData = await page.evaluate(async () => {
      const navModule = await import('./js/nav.js');
      return {
        graphHash: navModule.PENPOT_GRAPH_HASH,
        archiveHash: navModule.PENPOT_ARCHIVE_HASH,
        startingFrame: navModule.STARTING_FRAME_ID,
        routesCount: navModule.NAVIGATION_ROUTES.length
      };
    });

    expect(navData.graphHash).toBeDefined();
    expect(navData.graphHash).toHaveLength(64);
    expect(navData.archiveHash).toBeDefined();
    expect(navData.archiveHash).toHaveLength(64);
    expect(navData.routesCount).toBe(3);
    expect(navData.startingFrame).toMatch(/^d757/);
  });
});
