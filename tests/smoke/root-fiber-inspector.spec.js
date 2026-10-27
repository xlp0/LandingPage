import { test, expect } from '@playwright/test';
import { collectOutgoingSameOriginLinks } from '../fixtures/clm-helpers.js';
import { ROOT_PAGE_CHARACTERIZATIONS } from '../fixtures/test-config.js';

const surface = ROOT_PAGE_CHARACTERIZATIONS.find((entry) => entry.pagePath === 'fiber-inspector.html');

test.describe('Root Page Characterization for fiber-inspector.html', () => {
  test('renders status, title, semantic landmarks, and outgoing same-origin links', async ({ page }) => {
    const response = await page.goto(surface.route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(surface.expectedTitle);

    const inspector = page.getByRole('main');
    await expect(inspector).toBeVisible();
    await expect(inspector).toHaveAttribute('id', 'inspector');
    await expect(page.getByRole('heading', { level: 1, name: 'Fiber Inspector' })).toBeVisible();

    const links = await collectOutgoingSameOriginLinks(page);
    expect(links).toEqual([...surface.expectedSameOriginLinks]);
  });
});
