import { test, expect } from '@playwright/test';
import {
  collectOutgoingSameOriginLinks,
  stubExternalComponentRequests,
} from '../fixtures/clm-helpers.js';
import { ROOT_PAGE_CHARACTERIZATIONS } from '../fixtures/test-config.js';

const surface = ROOT_PAGE_CHARACTERIZATIONS.find((entry) => entry.pagePath === 'app.html');

test.describe('Root Page Characterization for app.html', () => {
  test('renders status, title, semantic landmarks, and outgoing same-origin links', async ({ page }) => {
    await stubExternalComponentRequests(page);
    const response = await page.goto(surface.route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(surface.expectedTitle);

    await expect(page.getByRole('heading', { level: 1, name: 'MCard Manager' })).toBeVisible();
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.main-content')).toBeVisible();

    const links = await collectOutgoingSameOriginLinks(page);
    expect(links).toEqual([...surface.expectedSameOriginLinks]);
  });
});
