import { test, expect } from '@playwright/test';
import { collectOutgoingSameOriginLinks } from '../fixtures/clm-helpers.js';
import { ROOT_PAGE_CHARACTERIZATIONS } from '../fixtures/test-config.js';

const surface = ROOT_PAGE_CHARACTERIZATIONS.find((entry) => entry.pagePath === 'responsive-lab.html');

test.describe('Root Page Characterization for responsive-lab.html', () => {
  test('renders status, title, semantic landmarks, and outgoing same-origin links', async ({ page }) => {
    const response = await page.goto(surface.route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(surface.expectedTitle);

    const stage = page.getByRole('main');
    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute('id', 'lab-stage-container');
    await expect(page.locator('#lab-main-heading')).toBeAttached();

    const links = await collectOutgoingSameOriginLinks(page);
    expect(links).toEqual([...surface.expectedSameOriginLinks]);
  });
});
