import { test, expect } from '@playwright/test';

test.describe('Sprint CDO-15: Penpot Navigation Authoring', () => {

  test('DV-CDO-15-01..05: Penpot site navigation bar rendered into index.html from .penpot SSOT', async ({ page }) => {
    // Navigate to Landing Page
    await page.goto('/');

    // 1. Verify Penpot site nav bar is rendered in DOM (INV-CDO-11)
    const navBar = page.locator('#penpot-site-nav');
    await expect(navBar).toBeVisible();
    await expect(navBar).toHaveAttribute('data-graph-hash');

    // 2. Verify all 3 routes from the Penpot flow are present with CLM handles (INV-CDO-12)
    const homeLink = page.locator('#penpot-site-nav a[data-penpot-handle="mcard:route:/index.html"]');
    const missionLink = page.locator('#penpot-site-nav a[data-penpot-handle="mcard:route:/app.html"]');
    const labLink = page.locator('#penpot-site-nav a[data-penpot-handle="mcard:route:/responsive-lab.html"]');

    await expect(homeLink).toBeVisible();
    await expect(missionLink).toBeVisible();
    await expect(labLink).toBeVisible();

    await expect(homeLink).toContainText('Home');
    await expect(missionLink).toContainText('Mission Control');
    await expect(labLink).toContainText('Responsive UI Lab');

    // Home is active on index.html
    await expect(homeLink).toHaveClass(/penpot-nav-link-active/);

    // 3. Verify interaction edge navigation: Click Responsive UI Lab link
    await labLink.click();
    await expect(page).toHaveURL(/responsive-lab\.html/);

    // Verify Responsive Lab loaded
    await expect(page.locator('#lab-main-heading')).toBeVisible();
  });

  test('DV-CDO-15-04: js/nav.js exports matching graph hash and routes', async ({ page }) => {
    await page.goto('/');

    const navData = await page.evaluate(async () => {
      const navModule = await import('./js/nav.js');
      return {
        graphHash: navModule.PENPOT_GRAPH_HASH,
        archiveHash: navModule.PENPOT_ARCHIVE_HASH,
        startingFrame: navModule.STARTING_FRAME_ID,
        routesCount: navModule.NAVIGATION_ROUTES.length,
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
