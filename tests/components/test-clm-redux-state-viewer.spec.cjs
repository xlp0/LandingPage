const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM Redux State Viewer Component Test', () => {
  test('should load and display redux state viewer component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting Redux State Viewer Component test...');

    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    const reduxButton = page.locator('div.component-item:has-text("Redux Store Monitor")');
    await expect(reduxButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Redux State Viewer button found');

    await reduxButton.click();
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    const iframe = page.locator('iframe[id="iframe-redux-state-viewer"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Redux State Viewer iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-redux-state-viewer.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ Redux State Viewer test completed!');
  });
});
