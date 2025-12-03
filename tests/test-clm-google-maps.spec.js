const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM Google Maps Component Test', () => {
  test('should load and display google maps component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting Google Maps Component test...');

    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const mapsButton = page.locator('button:has-text("Google Maps")');
    await expect(mapsButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Google Maps button found');

    await mapsButton.click();
    await page.waitForTimeout(3000);

    const iframe = page.locator('iframe[data-component-id="google-maps"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Google Maps iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-google-maps.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ Google Maps test completed!');
  });
});
