const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Create test-results directory if it doesn't exist
const testResultsDir = path.join(__dirname, 'test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
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

  testWithConfig('navigate through PKC website links', async ({ browser }) => {
    testStartTime = new Date();
    console.log(`Test started at: ${testStartTime.toISOString()}`);
    
    // Create first user context with video recording
    const firstUserVideoDir = path.join(testResultsDir, 'first-user-videos');
    fs.mkdirSync(firstUserVideoDir, { recursive: true });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true,
      headless: false,
      slowMo: 200, // Increased slowMo for more reliable video capture
      recordVideo: {
        dir: firstUserVideoDir,
        size: { width: 1280, height: 800 },
        duration: 300000 // 5 minutes max recording time
      }
    });
    
    // Create pages for both users
    const firstUserPage = await context.newPage();
    let roomId = '';
    
    try {
      // Initial page load for first user
      console.log('First user: Navigating to homepage...');
      await firstUserPage.goto('http://localhost:8765');
      await firstUserPage.waitForLoadState('networkidle');
      await firstUserPage.waitForTimeout(1000);
      
      await firstUserPage.waitForSelector('[data-anime="main-content"]', { timeout: 10000 });
      await firstUserPage.waitForTimeout(1000);

      // WebRTC Dashboard navigation - First User
      console.log('First user: Clicking WebRTC Dashboard button...');
      await firstUserPage.locator('a[href="js/modules/webrtc-dashboard/index.html"]').click();
      await firstUserPage.waitForLoadState('networkidle');
      await firstUserPage.waitForTimeout(1000);

      // First User - Enter name
      console.log('First user: Entering name...');
      await firstUserPage.locator('#user-name').fill('FirstUser');
      await firstUserPage.waitForTimeout(1000);

      // First User - Save name
      console.log('First user: Clicking Save Name button...');
      await firstUserPage.locator('#save-name-btn').click();
      await firstUserPage.waitForLoadState('networkidle');
      await firstUserPage.waitForTimeout(500);

      // First User - Room name entry
      console.log('First user: Entering room name...');
      await firstUserPage.locator('#room-name').fill('Testing');
      await firstUserPage.waitForTimeout(500);

      // First User - Room description entry
      console.log('First user: Entering room description...');
      await firstUserPage.locator('#room-description').fill('Testing');
      await firstUserPage.waitForTimeout(1000);

      // First User - Create room
      console.log('First user: Clicking Create Room button...');
      await firstUserPage.locator('#create-room-btn').click();
      await firstUserPage.waitForLoadState('networkidle');
      await firstUserPage.waitForTimeout(1000);

      // Get room ID from URL for second user
      const url = firstUserPage.url();
      roomId = new URL(url).searchParams.get('room');
      console.log('Room created with ID:', roomId);

      // Create second user context with video recording
      console.log('Setting up second user...');
      const secondUserVideoDir = path.join(testResultsDir, 'second-user-videos');
      fs.mkdirSync(secondUserVideoDir, { recursive: true });
      
      const secondUserContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 200, // Increased slowMo for more reliable video capture
        recordVideo: {
          dir: secondUserVideoDir,
          size: { width: 1280, height: 800 },
          duration: 300000 // 5 minutes max recording time
        }
      });
      
      const secondUserPage = await secondUserContext.newPage();
      
      try {
        // Second user joins the room
        console.log('Second user joining the room...');
        await secondUserPage.goto(`http://localhost:8765/js/modules/webrtc-dashboard/index.html?room=${roomId}`);
        await secondUserPage.waitForLoadState('networkidle');
        await secondUserPage.waitForTimeout(1000);
        
        // Second user enters name and joins room
        console.log('Second user entering name...');
        await secondUserPage.locator('#user-name').fill('SecondUser');
        await secondUserPage.waitForTimeout(1000);
        
        await secondUserPage.locator('#save-name-btn').click();
        await secondUserPage.waitForLoadState('networkidle');
        await secondUserPage.waitForTimeout(1000);
        
        console.log('Second user clicking Join Room button...');
        await secondUserPage.locator('.join-btn').click();
        await secondUserPage.waitForLoadState('networkidle');
        await secondUserPage.waitForTimeout(1000);
        
        // First user approves the join request
        console.log('First user approving join request...');
        await firstUserPage.locator('.approve-btn').first().click();
        await firstUserPage.waitForLoadState('networkidle');
        await firstUserPage.waitForTimeout(1000);
        
        // Wait for second user to be fully joined
        await secondUserPage.waitForLoadState('networkidle');
        await secondUserPage.waitForTimeout(1000);
        
        // First user sends a message
        console.log('First user sending message...');
        await firstUserPage.locator('#chat-input').fill('Hello from FirstUser');
        await firstUserPage.waitForTimeout(1000);
        
        await firstUserPage.locator('#send-message-btn').click();
        await firstUserPage.waitForLoadState('networkidle');
        await firstUserPage.waitForTimeout(1000);
        
        // Second user sends a reply
        console.log('Second user replying...');
        await secondUserPage.locator('#chat-input').fill('Hello from SecondUser');
        await secondUserPage.waitForTimeout(1000);
        
        await secondUserPage.locator('#send-message-btn').click();
        await secondUserPage.waitForLoadState('networkidle');
        await secondUserPage.waitForTimeout(1000);
        
        // Verify messages are visible to both users
        await expect(firstUserPage.locator('.chat-message:has-text("Hello from SecondUser")')).toBeVisible();
        await expect(secondUserPage.locator('.chat-message:has-text("Hello from FirstUser")')).toBeVisible();
        await firstUserPage.waitForTimeout(1000);
        
        // Second user leaves
        console.log('Second user leaving...');
        await secondUserPage.locator('#leave-room-btn').click();
        await secondUserPage.waitForLoadState('networkidle');
        await secondUserPage.waitForTimeout(1000);
        
        // First user leaves
        console.log('First user leaving...');
        await firstUserPage.locator('#leave-room-btn').click();
        await firstUserPage.waitForLoadState('networkidle');
        await firstUserPage.waitForTimeout(2000);
        
        // Close the browser after FirstUser leaves
        console.log('Closing browser after FirstUser left the room...');
        await browser.close();
        return; // Exit the test after closing the browser
        
      } finally {
        // Clean up second user context
        if (secondUserPage && !secondUserPage.isClosed()) {
          await secondUserPage.close();
        }
        if (secondUserContext) {
          await secondUserContext.close();
        }
      }
      
      // This code will only be reached if the test completes before the browser is closed
      const testEndTime = new Date();
      const testDuration = (testEndTime - testStartTime) / 1000;
      console.log(`Test completed in ${testDuration} seconds`);
      
    } catch (error) {
      console.error('Test failed:', error);
      // Videos will be saved automatically by Playwright
      throw error;
    } finally {
      try {
        // Add a delay before closing to ensure all video is captured
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Close pages first
        const pagesToClose = [];
        if (firstUserPage && !firstUserPage.isClosed()) {
          console.log('Closing first user page...');
          pagesToClose.push(firstUserPage.close());
        }
        if (secondUserPage && !secondUserPage.isClosed()) {
          console.log('Closing second user page...');
          pagesToClose.push(secondUserPage.close());
        }
        
        // Wait for all pages to close
        await Promise.allSettled(pagesToClose);
        
        // Add a small delay before closing contexts
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Then close contexts - this will also finalize the video recordings
        const contextsToClose = [];
        if (secondUserContext) {
          console.log('Closing second user context...');
          contextsToClose.push(secondUserContext.close());
        }
        if (context) {
          console.log('Closing first user context...');
          contextsToClose.push(context.close());
        }
        
        // Wait for all contexts to close
        await Promise.allSettled(contextsToClose);
        
        // Add a final delay to ensure video files are fully written
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('Test completed successfully. Videos are being saved to:');
        console.log(`- First user video: ${firstUserVideoDir}`);
        if (secondUserContext) {
          console.log(`- Second user video: ${secondUserVideoDir}`);
        }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
    }
  });
});
