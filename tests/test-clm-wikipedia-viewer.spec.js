const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM Wikipedia Viewer Component Test', () => {
  test('should load and display wikipedia viewer component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting Wikipedia Viewer Component test...');

    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const wikiButton = page.locator('button:has-text("Wikipedia Knowledge Base")');
    await expect(wikiButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Wikipedia Viewer button found');

    await wikiButton.click();
    await page.waitForTimeout(3000);

    const iframe = page.locator('iframe[data-component-id="wikipedia-viewer"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Wikipedia Viewer iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-wikipedia-viewer.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ Wikipedia Viewer test completed!');
  });
});
