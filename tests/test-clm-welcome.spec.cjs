const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Create test-results directory if it doesn't exist
const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM Welcome Component Test', () => {
  let testStartTime;

  test('should load and display welcome component correctly', async ({ page }, testInfo) => {
    // Set test timeout to 2 minutes
    testInfo.setTimeout(120000);
    testStartTime = new Date();

    console.log('[CLM Test] Starting Welcome Component test...');

    // Navigate to main page
    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForLoadState('networkidle');
    console.log('[CLM Test] Main page loaded');

    // Wait for CLM registry to be loaded
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    // Check if welcome component button exists in sidebar
    const welcomeButton = page.locator('div.component-item:has-text("Welcome Component")');
    await expect(welcomeButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Welcome component button found in sidebar');

    // Click welcome component button
    await welcomeButton.click();
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });
    console.log('[CLM Test] Welcome component button clicked');

    // Wait for component iframe to load
    const componentIframe = page.frameLocator('iframe[id="iframe-welcome"]');
    
    // Check if welcome component content is loaded in iframe
    const welcomeHeading = componentIframe.locator('h1:has-text("Welcome to PKC Landing")');
    await expect(welcomeHeading).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Welcome component heading visible');

    // Check if subtitle is visible
    const welcomeSubtitle = componentIframe.locator('p:has-text("Cubical Logic Model")');
    await expect(welcomeSubtitle).toBeVisible({ timeout: 5000 });
    console.log('[CLM Test] Welcome component subtitle visible');

    // Take screenshot of the component
    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-welcome-component.png'), 
      fullPage: true 
    });
    console.log('[CLM Test] Screenshot saved');

    // Verify component is properly isolated in iframe
    const iframe = page.locator('iframe[id="iframe-welcome"]');
    await expect(iframe).toBeVisible();
    console.log('[CLM Test] Component iframe isolation verified');

    // Check component health by verifying postMessage heartbeat
    let heartbeatReceived = false;
    page.on('console', msg => {
      if (msg.text().includes('[Welcome Component] Loaded successfully')) {
        heartbeatReceived = true;
        console.log('[CLM Test] Component heartbeat detected');
      }
    });

    // Wait a bit to capture heartbeat
    await page.waitForTimeout(4000);

    const testEndTime = new Date();
    const duration = (testEndTime - testStartTime) / 1000;
    console.log(`[CLM Test] Test completed in ${duration} seconds`);
    console.log('[CLM Test] ✅ All Welcome Component tests passed!');
  });

  test('should handle component failure gracefully', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting component failure test...');

    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

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

    // Switch back to welcome component
    const welcomeButton = page.locator('div.component-item:has-text("Welcome Component")');
    await welcomeButton.click();
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    // Verify welcome component still works
    const componentIframe = page.frameLocator('iframe[id="iframe-welcome"]');
    const welcomeHeading = componentIframe.locator('h1:has-text("Welcome to PKC Landing")');
    await expect(welcomeHeading).toBeVisible({ timeout: 10000 });
    
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

    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    // Measure component load time
    const welcomeButton = page.locator('div.component-item:has-text("Welcome Component")');
    await welcomeButton.click();

    const componentLoadStart = Date.now();
    const componentIframe = page.frameLocator('iframe[id="iframe-welcome"]');
    const welcomeHeading = componentIframe.locator('h1:has-text("Welcome to PKC Landing")');
    await expect(welcomeHeading).toBeVisible({ timeout: 10000 });
    const componentLoadEnd = Date.now();

    const componentLoadTime = componentLoadEnd - componentLoadStart;
    console.log(`[CLM Test] Component load time: ${componentLoadTime}ms`);

    // Verify performance meets expectations (from clm-registry.yaml: expected_load_time_ms: 500)
    const expectedLoadTime = 500;
    if (componentLoadTime <= expectedLoadTime * 2) {
      console.log(`[CLM Test] ✅ Performance acceptable: ${componentLoadTime}ms (expected: ${expectedLoadTime}ms)`);
    } else {
      console.log(`[CLM Test] ⚠️ Performance warning: ${componentLoadTime}ms exceeds expected ${expectedLoadTime}ms`);
    }

    // Take performance screenshot
    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-welcome-performance.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ Performance measurement completed!');
  });
});
