import { test, expect } from '@playwright/test';
import { collectOutgoingSameOriginLinks } from '../fixtures/clm-helpers.js';
import { ROOT_PAGE_CHARACTERIZATIONS } from '../fixtures/test-config.js';

const surface = ROOT_PAGE_CHARACTERIZATIONS.find((entry) => entry.pagePath === 'sprint-registry.html');

test.describe('Root Page Characterization for sprint-registry.html', () => {
  test('renders status, title, semantic landmarks, and outgoing same-origin links', async ({ page }) => {
    const response = await page.goto(surface.route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(surface.expectedTitle);

    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'CLM Sprint Registry' })).toBeVisible();
    await expect(page.locator('#sprint-grid')).toBeVisible();

    const links = await collectOutgoingSameOriginLinks(page);
    expect(links).toEqual([...surface.expectedSameOriginLinks]);
  });
});
