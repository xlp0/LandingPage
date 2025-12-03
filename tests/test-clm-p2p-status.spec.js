const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM P2P Status Component Test', () => {
  test('should load and display p2p status component correctly', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting P2P Status Component test...');

    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const p2pButton = page.locator('button:has-text("P2P Status Panel")');
    await expect(p2pButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] P2P Status button found');

    await p2pButton.click();
    await page.waitForTimeout(2000);

    const iframe = page.locator('iframe[data-component-id="p2p-status"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] P2P Status iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-p2p-status.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ P2P Status test completed!');
  });
});
