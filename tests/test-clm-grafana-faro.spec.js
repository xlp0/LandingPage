const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM Grafana Faro Component Test', () => {
  test('should load and display grafana faro component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting Grafana Faro Component test...');

    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const faroButton = page.locator('button:has-text("Grafana Faro")');
    await expect(faroButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Grafana Faro button found');

    await faroButton.click();
    await page.waitForTimeout(2000);

    const iframe = page.locator('iframe[data-component-id="grafana-faro"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Grafana Faro iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-grafana-faro.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ Grafana Faro test completed!');
  });
});
