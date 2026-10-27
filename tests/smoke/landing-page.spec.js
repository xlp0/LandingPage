import { test, expect } from '@playwright/test';
import { LANDING_PAGE_PATH, RESPONSIVE_LAB_PATH } from '../fixtures/test-config.js';

test.describe('Landing Page Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addLocatorHandler(page.locator('#modal-dismiss-btn'), async (button) => {
      await button.click();
    });
  });

  test('Default landing entry redirects to Responsive UI Lab', async ({ page }) => {
    await page.goto(LANDING_PAGE_PATH);
    await expect(page).toHaveURL(new RegExp(`${RESPONSIVE_LAB_PATH}$`));
    await expect(page).toHaveTitle('GovTech OS - Responsive UI Lab (Full-Window Viewport Workbench)');
    await expect(page.getByRole('main')).toHaveAttribute('id', 'lab-stage-container');
  });

  test('Portal mode loads with Mission Control title when noredirect is set', async ({ page }) => {
    await page.goto(`${LANDING_PAGE_PATH}?noredirect=1`);
    await expect(page).toHaveTitle('GovTech Platform | Mission Control');
  });

  test('Portal mode displays Penpot navigation landmarks and links', async ({ page }) => {
    await page.goto(`${LANDING_PAGE_PATH}?noredirect=1`);
    const nav = page.getByRole('navigation', { name: 'Penpot Navigation Flow' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Mission Control' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Responsive UI Lab' })).toBeVisible();
  });

  test('Portal mode displays single-page MCard host and Sovereign HUD pill', async ({ page }) => {
    await page.goto(`${LANDING_PAGE_PATH}?noredirect=1`);
    const host = page.getByRole('region', { name: 'Active LandingPage MCard' });
    await expect(host).toBeVisible();
    await expect(host).toHaveAttribute('id', 'single-page-mcard-host');
    await expect(page.locator('#mcard-sovereign-pill')).toBeVisible();
  });

  test('Portal navigation link transitions to Responsive UI Lab', async ({ page }) => {
    await page.goto(`${LANDING_PAGE_PATH}?noredirect=1`);
    const nav = page.getByRole('navigation', { name: 'Penpot Navigation Flow' });
    await nav.getByRole('link', { name: 'Responsive UI Lab' }).click();
    await expect(page).toHaveURL(new RegExp(`${RESPONSIVE_LAB_PATH}$`));
    await expect(page.locator('#lab-stage-container')).toBeVisible();
  });
});
