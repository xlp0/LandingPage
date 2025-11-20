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

testWithConfig.describe('LandingPage Website Navigation Test', () => {
  let testStartTime;
  let screenshotCounter = 0;

  // Helper function to take screenshots
  async function takeScreenshot(page, action) {
    if (!page || page.isClosed()) {
      console.warn(`Cannot take screenshot '${action}': Page is not available or already closed`);
      return;
    }
    
    screenshotCounter++;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(screenshotsDir, `${screenshotCounter.toString().padStart(2, '0')}-${action.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.png`);
    
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Screenshot saved: ${screenshotPath}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay for better test performance
    } catch (error) {
      // Don't fail the test if screenshot fails, just log it
      console.warn(`Failed to take screenshot '${action}':`, error.message);
    }
  }

  testWithConfig('navigate through LandingPage website links', async ({ browser }) => {
    testStartTime = new Date();
    console.log(`Test started at: ${testStartTime.toISOString()}`);
    
    // Launch browser in headed mode
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      headless: false,
      slowMo: 100, // Slow down by 100ms for better visibility
    });
    
    // Create pages for both users
    const firstUserPage = await context.newPage();
    let roomId = '';
    let secondUserPage = null;
    let secondUserContext = null;
    
    try {
      // Initial page load for first user
      console.log('First user: Navigating to homepage...');
      await firstUserPage.goto('http://localhost:8765');
      await firstUserPage.waitForLoadState('networkidle');
      await takeScreenshot(firstUserPage, '01-first-user-initial-page-load');
      
      await firstUserPage.waitForSelector('[data-anime="main-content"]', { timeout: 10000 });
      await takeScreenshot(firstUserPage, '02-first-user-main-content-visible');

      // WebRTC Dashboard navigation - First User
      console.log('First user: Clicking WebRTC Dashboard button...');
      await takeScreenshot(firstUserPage, '03-first-user-before-dashboard-click');
      await firstUserPage.locator('a[href="js/modules/webrtc-dashboard/index.html"]').click();
      await firstUserPage.waitForLoadState('networkidle');
      await takeScreenshot(firstUserPage, '04-first-user-after-dashboard-click');

      // First User - Enter name
      console.log('First user: Entering name...');
      await takeScreenshot(firstUserPage, '05-first-user-before-name-entry');
      await firstUserPage.locator('#user-name').fill('FirstUser');
      await takeScreenshot(firstUserPage, '06-first-user-after-name-entry');

      // First User - Save name
      console.log('First user: Clicking Save Name button...');
      await firstUserPage.locator('#save-name-btn').click();
      await firstUserPage.waitForLoadState('networkidle');
      await takeScreenshot(firstUserPage, '07-first-user-after-save-name');

      // First User - Room name entry
      console.log('First user: Entering room name...');
      await takeScreenshot(firstUserPage, '08-first-user-before-room-name');
      await firstUserPage.locator('#room-name').fill('Testing');
      await takeScreenshot(firstUserPage, '09-first-user-after-room-name');

      // First User - Room description entry
      console.log('First user: Entering room description...');
      await firstUserPage.locator('#room-description').fill('Testing');
      await takeScreenshot(firstUserPage, '10-first-user-after-room-description');

      // First User - Create room
      console.log('First user: Clicking Create Room button...');
      await takeScreenshot(firstUserPage, '11-first-user-before-create-room');
      await firstUserPage.locator('#create-room-btn').click();
      await firstUserPage.waitForLoadState('networkidle');
      await takeScreenshot(firstUserPage, '12-first-user-after-create-room');
      
      // Wait for room to be fully loaded
      await firstUserPage.waitForTimeout(2000);
      await takeScreenshot(firstUserPage, '13-first-user-room-loaded');

      // Get room ID from URL for second user
      const url = firstUserPage.url();
      roomId = new URL(url).searchParams.get('room');
      console.log('Room created with ID:', roomId);

      // Create second user context
      console.log('Setting up second user...');
      secondUserContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 100,
      });
      
      secondUserPage = await secondUserContext.newPage();
      
      try {
        // Second user joins the room
        console.log('Second user joining the room...');
        await secondUserPage.goto(`http://localhost:8765/js/modules/webrtc-dashboard/index.html?room=${roomId}`);
        await secondUserPage.waitForLoadState('networkidle');
        await takeScreenshot(secondUserPage, '14-second-user-join-page');
        
        // Second user enters name and joins room
        console.log('Second user entering name...');
        await secondUserPage.locator('#user-name').fill('SecondUser');
        await secondUserPage.locator('#save-name-btn').click();
        await secondUserPage.waitForLoadState('networkidle');
        await takeScreenshot(secondUserPage, '15-second-user-name-entered');
        
        console.log('Second user clicking Join Room button...');
        await secondUserPage.locator('.join-btn').click();
        await secondUserPage.waitForLoadState('networkidle');
        await takeScreenshot(secondUserPage, '16-second-user-join-requested');
        
        // First user approves the join request
        console.log('First user approving join request...');
        await takeScreenshot(firstUserPage, '17-first-user-before-approval');
        await firstUserPage.locator('.approve-btn').first().click();
        await firstUserPage.waitForLoadState('networkidle');
        await takeScreenshot(firstUserPage, '18-first-user-approved-request');
        
        // Wait for second user to be fully joined
        await secondUserPage.waitForLoadState('networkidle');
        await takeScreenshot(secondUserPage, '19-second-user-joined-room');
        
        // First user sends a message
        console.log('First user sending message...');
        await firstUserPage.locator('#chat-input').fill('Hello from FirstUser');
        await takeScreenshot(firstUserPage, '20-first-user-message-typed');
        await firstUserPage.locator('#send-message-btn').click();
        await firstUserPage.waitForLoadState('networkidle');
        await takeScreenshot(firstUserPage, '21-first-user-message-sent');
        
        // Second user sends a reply
        console.log('Second user replying...');
        await secondUserPage.locator('#chat-input').fill('Hello from SecondUser');
        await takeScreenshot(secondUserPage, '22-second-user-reply-typed');
        await secondUserPage.locator('#send-message-btn').click();
        await secondUserPage.waitForLoadState('networkidle');
        await takeScreenshot(secondUserPage, '23-second-user-reply-sent');
        
        // Verify messages are visible to both users
        await expect(firstUserPage.locator('.chat-message:has-text("Hello from SecondUser")')).toBeVisible();
        await expect(secondUserPage.locator('.chat-message:has-text("Hello from FirstUser")')).toBeVisible();
        
        // Second user leaves
        console.log('Second user leaving...');
        if (secondUserPage && !secondUserPage.isClosed()) {
          await takeScreenshot(secondUserPage, '24-second-user-before-leave');
          await secondUserPage.locator('#leave-room-btn').click();
          await secondUserPage.waitForLoadState('networkidle');
          await takeScreenshot(secondUserPage, '25-second-user-left');
        }
        
        // First user leaves
        console.log('First user leaving...');
        if (firstUserPage && !firstUserPage.isClosed()) {
          await takeScreenshot(firstUserPage, '26-first-user-before-leave');
          await firstUserPage.locator('#leave-room-btn').click();
          await firstUserPage.waitForLoadState('networkidle');
          await takeScreenshot(firstUserPage, '27-first-user-left');
        }
        
      } finally {
        // Clean up second user context
        if (secondUserPage && !secondUserPage.isClosed()) {
          await secondUserPage.close();
        }
        if (secondUserContext) {
          await secondUserContext.close();
        }
      }
      
      // Final verification
      if (!firstUserPage.isClosed()) {
        await firstUserPage.waitForTimeout(1000);
        await takeScreenshot(firstUserPage, '28-test-complete');
      }
      
      const testEndTime = new Date();
      const testDuration = (testEndTime - testStartTime) / 1000;
      console.log(`Test completed in ${testDuration} seconds`);
      
    } catch (error) {
      console.error('Test failed:', error);
      if (firstUserPage && !firstUserPage.isClosed()) {
        await takeScreenshot(firstUserPage, 'error-test-failed');
      }
      throw error;
    } finally {
      try {
        // Close pages first
        const closePromises = [];
        
        // Close second user page if it exists
        if (secondUserPage && !secondUserPage.isClosed()) {
          closePromises.push(secondUserPage.close().catch(e => 
            console.warn('Error closing second user page:', e.message)));
        }
        
        // Close first user page if it exists
        if (firstUserPage && !firstUserPage.isClosed()) {
          closePromises.push(firstUserPage.close().catch(e => 
            console.warn('Error closing first user page:', e.message)));
        }
        
        // Close contexts
        if (secondUserContext) {
          closePromises.push(secondUserContext.close().catch(e => 
            console.warn('Error closing second user context:', e.message)));
        }
        
        if (context && !context.pages().length) {
          closePromises.push(context.close().catch(e => 
            console.warn('Error closing main context:', e.message)));
        }
        
        // Wait for all close operations to complete
        await Promise.allSettled(closePromises);
      } catch (error) {
        console.warn('Error during cleanup:', error.message);
      }
    }
  });
});
