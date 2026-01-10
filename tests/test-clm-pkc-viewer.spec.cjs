const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM PKC Viewer Component Test', () => {
  test('should load and display PKC viewer component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting PKC Viewer Component test...');

    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    const pkcButton = page.locator('div.component-item:has-text("PKC Document Viewer")');
    await expect(pkcButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] PKC Viewer button found');

    await pkcButton.click();
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    const iframe = page.locator('iframe[id="iframe-pkc-viewer"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] PKC Viewer iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-pkc-viewer.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ PKC Viewer test completed!');
  });
});
