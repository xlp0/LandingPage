import { test, expect } from '@playwright/test';
import { stubExternalComponentRequests } from '../fixtures/clm-helpers.js';
import { APP_PAGE_PATH } from '../fixtures/test-config.js';

test.describe('Apps Menu Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await stubExternalComponentRequests(page);
    await page.goto(APP_PAGE_PATH);
    await expect(page.locator('.container')).toBeVisible();
    await page.waitForFunction(() => Boolean(window.viewManager?.initialized));
  });

  test('ViewManager registers expected app views and collapsible sidebar', async ({ page }) => {
    const registeredViews = await page.evaluate(() => [...window.viewManager.views.keys()]);
    expect(registeredViews).toEqual(
      expect.arrayContaining(['music', 'map', 'threeD', 'monopoly-auth'])
    );

    const sidebar = page.locator('#sidebar');
    const collapseBtn = page.locator('#collapseBtn');
    await expect(sidebar).toBeVisible();
    await collapseBtn.click();
    await expect(sidebar).toHaveClass(/collapsed/);
    await collapseBtn.click();
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test('Music Visualizer view can be opened and closed', async ({ page }) => {
    await page.evaluate(() => window.viewManager.show('music'));

    const musicView = page.locator('#musicView');
    await expect(musicView).toBeVisible();

    await musicView.locator('button.header-btn', { hasText: 'Close' }).click();
    await expect(musicView).toBeHidden();
    await expect(page.locator('.main-content')).toBeVisible();
  });

  test('Map view can be opened and closed', async ({ page }) => {
    await page.evaluate(() => window.viewManager.show('map'));

    const mapView = page.locator('#mapView');
    await expect(mapView).toBeVisible();

    await mapView.locator('button.header-btn', { hasText: 'Close' }).click();
    await expect(mapView).toBeHidden();
    await expect(page.locator('.main-content')).toBeVisible();
  });

  test('3D Viewer can be opened and closed', async ({ page }) => {
    await page.evaluate(() => window.viewManager.show('threeD'));

    const viewerView = page.locator('#threeDView');
    await expect(viewerView).toBeVisible();

    await viewerView.locator('button.header-btn', { hasText: 'Close' }).click();
    await expect(viewerView).toBeHidden();
    await expect(page.locator('.main-content')).toBeVisible();
  });

  test('Monopoly view can be opened and closed', async ({ page }) => {
    await page.evaluate(() => window.viewManager.show('monopoly-auth'));

    const monopolyView = page.locator('#monopolyAuthView');
    await expect(monopolyView).toBeVisible();

    await monopolyView.locator('button.header-btn', { hasText: 'Close' }).click();
    await expect(monopolyView).toBeHidden();
    await expect(page.locator('.main-content')).toBeVisible();
  });
});
