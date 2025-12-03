const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM Wikipedia Search Component Test', () => {
  test('should load and display wikipedia search component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting Wikipedia Search Component test...');

    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const wikiSearchButton = page.locator('button:has-text("Wikipedia Search")');
    await expect(wikiSearchButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Wikipedia Search button found');

    await wikiSearchButton.click();
    await page.waitForTimeout(2000);

    const iframe = page.locator('iframe[data-component-id="wikipedia-search"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Wikipedia Search iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-wikipedia-search.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ Wikipedia Search test completed!');
  });
});
