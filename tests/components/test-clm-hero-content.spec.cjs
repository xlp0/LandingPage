const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM Hero Content Component Test', () => {
  test('should load and display hero content component correctly', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting Hero Content Component test...');

    await page.goto('http://localhost:3000/archive/html/index-clm-dashboard.html');
    await page.waitForLoadState('networkidle');
    console.log('[CLM Test] Main page loaded');

    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });

    const heroButton = page.locator('div.component-item:has-text("Hero Content")');
    await expect(heroButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Hero Content button found');

    await heroButton.click();
    await page.waitForSelector(".loading-overlay", { state: "hidden", timeout: 15000 });
    await page.waitForSelector(".component-item", { timeout: 15000 });
    console.log('[CLM Test] Hero Content button clicked');

    const componentIframe = page.frameLocator('iframe[id="iframe-hero-content"]');
    
    // Check if component loaded
    const iframe = page.locator('iframe[id="iframe-hero-content"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] Hero Content iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-hero-content.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ Hero Content test completed!');
  });
});
