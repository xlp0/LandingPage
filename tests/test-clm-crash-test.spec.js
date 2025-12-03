const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM Crash Test Component Test', () => {
  test('should load crash test component and verify isolation', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting Crash Test Component test...');

    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const crashButton = page.locator('button:has-text("Intentional Failure Component")');
    await expect(crashButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Crash Test button found');

    await crashButton.click();
    await page.waitForTimeout(2000);

    // Verify main page is still functional
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toBeVisible();
    console.log('[CLM Test] Main page remains stable');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-crash-test.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ Crash Test completed!');
  });
});
