const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

test.describe('CLM User List Component Test', () => {
  test('should load and display user list component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    console.log('[CLM Test] Starting User List Component test...');

    await page.goto('http://localhost:8765');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const userListButton = page.locator('button:has-text("User Account List")');
    await expect(userListButton).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] User List button found');

    await userListButton.click();
    await page.waitForTimeout(2000);

    const iframe = page.locator('iframe[data-component-id="user-list"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
    console.log('[CLM Test] User List iframe visible');

    await page.screenshot({ 
      path: path.join(testResultsDir, 'clm-user-list.png'), 
      fullPage: true 
    });

    console.log('[CLM Test] ✅ User List test completed!');
  });
});
