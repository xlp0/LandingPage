const { test, expect } = require('@playwright/test');

// Configure test to run in headed mode
const testWithConfig = test.extend({
  context: async ({ context }, use) => {
    await use(context);
  },
  page: async ({ page }, use) => {
    await use(page);
  },
});

testWithConfig.describe.configure({ mode: 'serial', retries: 0 });
testWithConfig.describe('PKC Website Navigation Test', () => {
  testWithConfig('navigate through PKC website links', async ({ browser }) => {
    // Launch browser in headed mode
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      headless: false,
      slowMo: 100, // Slow down by 100ms for better visibility
    });
    // Create page
    const page = await context.newPage();
    
    await page.goto('http://localhost:8765');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-anime="main-content"]', { timeout: 10000 });

    console.log('Admin: Clicking WebRTC Dashboard button...');
    await page.locator('a[href="js/modules/webrtc-dashboard/index.html"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('Admin: Entering name...');
    await page.locator('#user-name').fill('Testing');
    await page.waitForTimeout(1000);

    console.log('Admin: Clicking Save Name button...');
    await page.locator('#save-name-btn').click();
    await page.waitForTimeout(1000);

    console.log('Admin: Entering room name...');
    await page.locator('#room-name').fill('Testing');
    await page.waitForTimeout(1000);

    console.log('Admin: Entering room description...');
    await page.locator('#room-description').fill('Testing');
    await page.waitForTimeout(2000);

    console.log('Admin: Clicking Create Room button...');
    await page.locator('#create-room-btn').click();
    await page.waitForTimeout(10000);

    console.log('Admin: Going back to main page...');
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Close context
    await context.close();
  });
});
