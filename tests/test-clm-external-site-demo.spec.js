const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM External Site Demo Component Test', () => {
  test('should load and display external site demo component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting External Site Demo Component test...');

    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const externalButton = page.locator('button:has-text("External Website Demo")');
    await expect(externalButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] External Site Demo button found');

    await externalButton.click();
    await page.waitForTimeout(3000);

    const iframe = page.locator('iframe[data-component-id="external-site-demo"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] External Site Demo iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-external-site-demo.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ External Site Demo test completed!');
  });
});
