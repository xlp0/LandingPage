import { test, expect } from '@playwright/test';
import { collectOutgoingSameOriginLinks } from '../fixtures/clm-helpers.js';
import { ROOT_PAGE_CHARACTERIZATIONS } from '../fixtures/test-config.js';

const surface = ROOT_PAGE_CHARACTERIZATIONS.find((entry) => entry.pagePath === 'fiber-conformance.html');

test.describe('Root Page Characterization for fiber-conformance.html', () => {
  test('renders status, title, semantic landmarks, and outgoing same-origin links', async ({ page }) => {
    const response = await page.goto(surface.route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(surface.expectedTitle);

    const harness = page.getByRole('main');
    await expect(harness).toBeVisible();
    await expect(harness).toHaveAttribute('id', 'harness');

    const links = await collectOutgoingSameOriginLinks(page);
    expect(links).toEqual([...surface.expectedSameOriginLinks]);
  });
});
