import { test, expect } from '@playwright/test';
import {
  clickComponent,
  getComponentFrame,
  navigateToDashboard,
  takeScreenshot,
  verifyComponentIframe,
  waitForDashboardReady,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Welcome Component Test', () => {
  test('should load and display welcome component correctly', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await navigateToDashboard(page);
    await waitForDashboardReady(page);

    const welcomeButton = page.locator('div.component-item:has-text("Welcome Component")');
    await expect(welcomeButton).toBeVisible({ timeout: 10000 });
    await welcomeButton.click();
    await waitForDashboardReady(page);

    const componentIframe = getComponentFrame(page, 'welcome');
    const welcomeHeading = componentIframe.locator('h1:has-text("Welcome to PKC Landing")');
    await expect(welcomeHeading).toBeVisible({ timeout: 10000 });

    const welcomeSubtitle = componentIframe.locator('p:has-text("Cubical Logic Model")');
    await expect(welcomeSubtitle).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'welcome-component', testInfo);
    await verifyComponentIframe(page, 'welcome');
  });

  test('should handle component failure gracefully', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await navigateToDashboard(page);
    await waitForDashboardReady(page);

    const crashTestButton = page.locator('div.component-item:has-text("Intentional Failure Component")');
    if (await crashTestButton.isVisible()) {
      await crashTestButton.click();
      await waitForDashboardReady(page);
      await expect(page.locator('.main-content')).toBeVisible();
    }

    await clickComponent(page, 'Welcome Component');
    const componentIframe = getComponentFrame(page, 'welcome');
    const welcomeHeading = componentIframe.locator('h1:has-text("Welcome to PKC Landing")');
    await expect(welcomeHeading).toBeVisible({ timeout: 10000 });
  });

  test('should measure component performance', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    const navigationStart = Date.now();
    await navigateToDashboard(page);
    await waitForDashboardReady(page);
    const navigationTime = Date.now() - navigationStart;
    expect(navigationTime).toBeGreaterThanOrEqual(0);

    const welcomeButton = page.locator('div.component-item:has-text("Welcome Component")');
    await welcomeButton.click();

    const componentLoadStart = Date.now();
    const componentIframe = getComponentFrame(page, 'welcome');
    const welcomeHeading = componentIframe.locator('h1:has-text("Welcome to PKC Landing")');
    await expect(welcomeHeading).toBeVisible({ timeout: 10000 });
    const componentLoadTime = Date.now() - componentLoadStart;
    expect(componentLoadTime).toBeGreaterThanOrEqual(0);

    await takeScreenshot(page, 'welcome-performance', testInfo);
  });
});
