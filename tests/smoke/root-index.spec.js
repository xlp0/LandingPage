import { test, expect } from '@playwright/test';
import { collectOutgoingSameOriginLinks } from '../fixtures/clm-helpers.js';
import { ROOT_PAGE_CHARACTERIZATIONS } from '../fixtures/test-config.js';

const surface = ROOT_PAGE_CHARACTERIZATIONS.find((entry) => entry.pagePath === 'index.html');

test.describe('Root Page Characterization for index.html', () => {
  test('GET / and GET /index.html redirect to responsive-lab.html', async ({ page }) => {
    for (const entryPath of ['/', '/index.html']) {
      const response = await page.goto(entryPath);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(/\/responsive-lab\.html$/);
      await expect(page).toHaveTitle(surface.redirectTitle);
      await expect(page.getByRole('main')).toHaveAttribute('id', 'lab-stage-container');
    }
  });

  test('GET /?noredirect=1 and GET /index.html?noredirect=1 render the portal landmarks and outgoing links', async ({ page }) => {
    for (const portalPath of ['/?noredirect=1', '/index.html?noredirect=1']) {
      const response = await page.goto(portalPath);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(surface.expectedTitle);

      const nav = page.getByRole('navigation', { name: 'Penpot Navigation Flow' });
      await expect(nav).toBeVisible();
      await expect(nav).toHaveAttribute('id', 'penpot-site-nav');

      const host = page.getByRole('region', { name: 'Active LandingPage MCard' });
      await expect(host).toBeVisible();
      await expect(host).toHaveAttribute('id', 'single-page-mcard-host');
      await expect(page.locator('#mcard-sovereign-pill')).toBeVisible();

      const links = await collectOutgoingSameOriginLinks(page);
      expect(links).toEqual([...surface.expectedSameOriginLinks]);
    }
  });
});
