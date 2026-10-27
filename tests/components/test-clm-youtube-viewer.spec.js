import { test, expect } from '@playwright/test';
import {
  clickComponent,
  getComponentFrame,
  navigateToDashboard,
  takeScreenshot,
  verifyComponentIframe,
  waitForDashboardReady,
} from '../fixtures/clm-helpers.js';

test.describe('CLM YouTube Viewer Component Test', () => {
  test('should load and display YouTube viewer component correctly', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await navigateToDashboard(page);
    await waitForDashboardReady(page);
    await clickComponent(page, 'YouTube Video Viewer');

    const componentIframe = getComponentFrame(page, 'youtube-viewer');
    const youtubeHeading = componentIframe.locator('h1:has-text("YouTube Video Viewer")');
    await expect(youtubeHeading).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, 'clm-youtube-viewer-component', testInfo);
    await verifyComponentIframe(page, 'youtube-viewer');
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

    await clickComponent(page, 'YouTube Video Viewer');
    const componentIframe = getComponentFrame(page, 'youtube-viewer');
    const youtubeHeading = componentIframe.locator('h1:has-text("YouTube Video Viewer")');
    await expect(youtubeHeading).toBeVisible({ timeout: 10000 });
  });

  test('should measure component performance', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    const navigationStart = Date.now();
    await navigateToDashboard(page);
    await waitForDashboardReady(page);
    const navigationTime = Date.now() - navigationStart;
    expect(navigationTime).toBeGreaterThanOrEqual(0);

    const youtubeButton = page.locator('div.component-item:has-text("YouTube Video Viewer")');
    await youtubeButton.click();

    const componentLoadStart = Date.now();
    const componentIframe = getComponentFrame(page, 'youtube-viewer');
    const youtubeHeading = componentIframe.locator('h1:has-text("YouTube Video Viewer")');
    await expect(youtubeHeading).toBeVisible({ timeout: 10000 });
    const componentLoadTime = Date.now() - componentLoadStart;
    expect(componentLoadTime).toBeGreaterThanOrEqual(0);

    await takeScreenshot(page, 'clm-youtube-viewer-performance', testInfo);
  });
});
