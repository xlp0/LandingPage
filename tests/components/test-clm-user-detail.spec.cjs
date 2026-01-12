const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM User Detail Component Test', () => {
  test('should load and display user detail component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting User Detail Component test...');

    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    const userDetailButton = page.locator('div.component-item:has-text("User Account Detail")');
    await expect(userDetailButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] User Detail button found');

    await userDetailButton.click();
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    const iframe = page.locator('iframe[id="iframe-user-detail"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] User Detail iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-user-detail.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ User Detail test completed!');
  });
});
