const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

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
  let testStartTime;
  let screenshotCounter = 0;

  // Helper function to take screenshots
  async function takeScreenshot(page, action) {
    screenshotCounter++;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotsDir, `${screenshotCounter.toString().padStart(2, '0')}-${action.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.png`);
    
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
    
    await page.waitForTimeout(1000); // 1 second delay after each screenshot
  }

  testWithConfig('navigate through PKC website links', async ({ browser }) => {
    testStartTime = new Date();
    console.log(`Test started at: ${testStartTime.toISOString()}`);
    
    // Launch browser in headed mode
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      headless: false,
      slowMo: 100, // Slow down by 100ms for better visibility
    });
    
    // Create page
    const page = await context.newPage();
    
    try {
      // Initial page load
      console.log('Navigating to homepage...');
      await page.goto('http://localhost:8765');
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '01-initial-page-load');
      
      await page.waitForSelector('[data-anime="main-content"]', { timeout: 10000 });
      await takeScreenshot(page, '02-main-content-visible');

      // WebRTC Dashboard navigation
      console.log('Clicking WebRTC Dashboard button...');
      await takeScreenshot(page, '03-before-dashboard-click');
      await page.locator('a[href="js/modules/webrtc-dashboard/index.html"]').click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '04-after-dashboard-click');

      // User name entry
      console.log('Entering name...');
      await takeScreenshot(page, '05-before-name-entry');
      await page.locator('#user-name').fill('Testing');
      await takeScreenshot(page, '06-after-name-entry');

      // Save name
      console.log('Clicking Save Name button...');
      await page.locator('#save-name-btn').click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '07-after-save-name');

      // Room name entry
      console.log('Entering room name...');
      await takeScreenshot(page, '08-before-room-name');
      await page.locator('#room-name').fill('Testing');
      await takeScreenshot(page, '09-after-room-name');

      // Room description entry
      console.log('Entering room description...');
      await page.locator('#room-description').fill('Testing');
      await takeScreenshot(page, '10-after-room-description');

      // Create room
      console.log('Clicking Create Room button...');
      await takeScreenshot(page, '11-before-create-room');
      await page.locator('#create-room-btn').click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '12-after-create-room');
      
      // Wait for room to be fully loaded
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '13-room-loaded');

      // Send a chat message before leaving
      console.log('Sending chat message...');
      await takeScreenshot(page, '14-before-chat-message');
      await page.locator('#chat-input').fill('Testing');
      await takeScreenshot(page, '15-chat-message-filled');
      
      console.log('Clicking send button...');
      await page.locator('#send-message-btn').click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '16-message-sent');

      // Leave the room
      console.log('Leaving the room...');
      await takeScreenshot(page, '17-before-leave-room');
      await page.locator('#leave-room-btn').click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '18-after-leave-room');
      
      // Final verification
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '16-test-complete');
      
      const testEndTime = new Date();
      const testDuration = (testEndTime - testStartTime) / 1000;
      console.log(`Test completed in ${testDuration} seconds`);
      
    } catch (error) {
      console.error('Test failed:', error);
      await takeScreenshot(page, 'error-test-failed');
      throw error;
    } finally {
      // Close context
      if (page && !page.isClosed()) {
        await page.close();
      }
      if (context) {
        await context.close();
      }
    }
  });
});
