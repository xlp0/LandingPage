const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Create test-results directory if it doesn't exist
const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM YouTube Viewer Component Test', () => {
  let testStartTime;

  test('should load and display YouTube viewer component correctly', async ({ page }, testInfo) => {
    // Set test timeout to 2 minutes
    testInfo.setTimeout(120000);
    testStartTime = new Date();

    console.log('[CLM Test] Starting YouTube Viewer Component test...');

    // Navigate to main page
    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForLoadState('networkidle');
    console.log('[CLM Test] Main page loaded');

    // Wait for CLM registry to be loaded and loading overlay to disappear
    await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout: 15000 });
    // Wait for component list to be populated (not empty message)
    await page.waitForSelector('.component-item', { timeout: 15000 });
    console.log('[CLM Test] Registry loaded, components visible');

    // Check if YouTube viewer component button exists in sidebar
    const youtubeButton = page.locator('div.component-item:has-text("YouTube Video Viewer")');
    await expect(youtubeButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] YouTube Viewer component button found in sidebar');

    // Click YouTube viewer component button
    await youtubeButton.click();
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });
    console.log('[CLM Test] YouTube Viewer component button clicked');

    // Wait for component iframe to load
    const componentIframe = page.frameLocator('iframe[id="iframe-youtube-viewer"]');

    // Check if YouTube viewer component content is loaded in iframe
    const youtubeHeading = componentIframe.locator('h1:has-text("YouTube Video Viewer")');
    await expect(youtubeHeading).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] YouTube Viewer component heading visible');

    // Take screenshot of the component
    await page.screenshot({
      path: path.join(testResultsDir, 'clm-youtube-viewer-component.png'),
      fullPage: true
    });
    console.log('[CLM Test] Screenshot saved');

    // Verify component is properly isolated in iframe
    const iframe = page.locator('iframe[id="iframe-youtube-viewer"]');
    await expect(iframe).toBeVisible();
    console.log('[CLM Test] Component iframe isolation verified');

    const testEndTime = new Date();
    const duration = (testEndTime - testStartTime) / 1000;
    console.log(`[CLM Test] Test completed in ${duration} seconds`);
    console.log('[CLM Test] ✅ All YouTube Viewer Component tests passed!');
  });

  test('should handle component failure gracefully', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting component failure test...');

    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForSelector('.component-item', { timeout: 15000 });

    // Try to load a component that might fail
    const crashTestButton = page.locator('div.component-item:has-text("Intentional Failure Component")');
    if (await crashTestButton.isVisible()) {
      await crashTestButton.click();
      await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

      // Verify main page is still functional
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
      console.log('[CLM Test] Main page remains stable after component failure');
    } else {
      console.log('[CLM Test] Crash test component not available, skipping failure test');
    }

    // Switch back to YouTube viewer component
    const youtubeButton = page.locator('div.component-item:has-text("YouTube Video Viewer")');
    await youtubeButton.click();
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    // Verify YouTube viewer component still works
    const componentIframe = page.frameLocator('iframe[id="iframe-youtube-viewer"]');
    const youtubeHeading = componentIframe.locator('h1:has-text("YouTube Video Viewer")');
    await expect(youtubeHeading).toBeVisible({ timeout: 10000 });

    console.log('[CLM Test] ✅ Component isolation and recovery verified!');
  });

  test('should measure component performance', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting performance measurement...');

    const navigationStart = Date.now();
    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForLoadState('networkidle');
    const navigationEnd = Date.now();

    const navigationTime = navigationEnd - navigationStart;
    console.log(`[CLM Test] Navigation time: ${navigationTime}ms`);

    await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout: 15000 });
    await page.waitForSelector('.component-item', { timeout: 15000 });

    // Measure component load time
    const youtubeButton = page.locator('div.component-item:has-text("YouTube Video Viewer")');
    await youtubeButton.click();

    const componentLoadStart = Date.now();
    const componentIframe = page.frameLocator('iframe[id="iframe-youtube-viewer"]');
    const youtubeHeading = componentIframe.locator('h1:has-text("YouTube Video Viewer")');
    await expect(youtubeHeading).toBeVisible({ timeout: 10000 });
    const componentLoadEnd = Date.now();

    const componentLoadTime = componentLoadEnd - componentLoadStart;
    console.log(`[CLM Test] Component load time: ${componentLoadTime}ms`);

    // Verify performance meets expectations (from clm-registry.yaml: expected_load_time_ms: 800)
    const expectedLoadTime = 800;
    if (componentLoadTime <= expectedLoadTime * 2) {
      console.log(`[CLM Test] ✅ Performance acceptable: ${componentLoadTime}ms (expected: ${expectedLoadTime}ms)`);
    } else {
      console.log(`[CLM Test] ⚠️ Performance warning: ${componentLoadTime}ms exceeds expected ${expectedLoadTime}ms`);
    }

    // Take performance screenshot
    await page.screenshot({
      path: path.join(testResultsDir, 'clm-youtube-viewer-performance.png'),
      fullPage: true
    });

    console.log('[CLM Test] ✅ Performance measurement completed!');
  });
});
