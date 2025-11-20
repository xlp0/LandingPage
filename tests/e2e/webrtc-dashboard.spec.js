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

// Helper function for consistent delays
const step = async (message, action) => {
  console.log(`[STEP] ${message}`);
  const result = await action();
  await new Promise(resolve => setTimeout(resolve, 1000));
  return result;
};

// Helper function to generate random room name
const generateRoomName = () => `Test Room ${Math.floor(Math.random() * 1000)}`;

testWithConfig.describe.configure({ mode: 'serial', retries: 1 });

testWithConfig.describe('WebRTC Dashboard - Multi-User Test', () => {
  let ownerPage;
  let participantPage;
  let participantContext;
  const roomName = 'Playwright Test Room';
  let roomLink = '';
  
  testWithConfig.beforeEach(async ({ browser }) => {
    await step('Initializing owner browser context', async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 100,
        permissions: ['camera', 'microphone', 'clipboard-read', 'clipboard-write'],
      });
      ownerPage = await context.newPage();
      await ownerPage.goto('http://localhost:8765/js/modules/webrtc-dashboard/index.html');
      await ownerPage.waitForLoadState('networkidle');
    });
  });

  testWithConfig('Owner creates room and participant joins', async ({ browser }) => {
    // Owner creates a room
    await step('Owner: Creating a new room', async () => {
      await ownerPage.locator('#user-name').fill('RoomOwner');
      await ownerPage.locator('#save-name-btn').click();
      
      await ownerPage.locator('#room-name').fill(roomName);
      await ownerPage.locator('#room-description').fill('Test room created by Playwright');
      await ownerPage.locator('#create-room-btn').click();
      
      // Get the room link
      await ownerPage.locator('#share-room-btn').click();
      roomLink = await ownerPage.locator('#shareable-link').inputValue();
      await ownerPage.locator('.close-modal').click();
      
      // Verify room is created
      await expect(ownerPage.locator('#current-room-name')).toContainText(roomName);
      await expect(ownerPage.locator('.user-role')).toContainText('👑 Host');
      console.log('Owner created room with link:', roomLink);
    });

    // Create participant context
    await step('Setting up participant browser', async () => {
      participantContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 100,
        permissions: ['camera', 'microphone'],
      });
      
      participantPage = await participantContext.newPage();
      await participantPage.goto(roomLink);
      await participantPage.waitForLoadState('networkidle');
      
      // Set participant name
      await participantPage.locator('#user-name').fill('TestParticipant');
      await participantPage.locator('#save-name-btn').click();
      
      console.log('Participant browser initialized and navigated to room');
    });

    try {
      // Handle join request if needed
      await step('Handling join request', async () => {
        if (await participantPage.locator('#send-join-request-btn').isVisible()) {
          console.log('Participant needs to request to join');
          await participantPage.locator('#send-join-request-btn').click();
          
          // Owner approves the request
          await ownerPage.locator('.request-approve-btn').first().click();
          console.log('Owner approved join request');
        }
        
        // Verify participant joined successfully
        await expect(participantPage.locator('#current-room-name')).toContainText(roomName);
        await expect(participantPage.locator('.user-role')).toContainText('👤 Participant');
        
        // Verify owner sees the participant
        await expect(ownerPage.locator('.participant-name:has-text("TestParticipant")')).toBeVisible();
        
        // Verify participant count updates
        await expect(ownerPage.locator('#participant-count')).toContainText('2');
        await expect(participantPage.locator('#participant-count')).toContainText('2');
        
        console.log('Participant successfully joined the room');
      });
      
      // Test chat between owner and participant
      await step('Testing chat functionality', async () => {
        // Owner sends a message
        await ownerPage.locator('#chat-input').fill('Welcome to my room!');
        await ownerPage.locator('#send-message-btn').click();
        
        // Verify participant receives the message
        await expect(participantPage.locator('.chat-message:last-child .message-content'))
          .toContainText('Welcome to my room!');
        
        // Participant replies
        await participantPage.locator('#chat-input').fill('Thanks for having me!');
        await participantPage.locator('#send-message-btn').click();
        
        // Verify owner receives the reply
        await expect(ownerPage.locator('.chat-message:last-child .message-content'))
          .toContainText('Thanks for having me!');
        
        console.log('Chat test completed successfully');
      });
      
    } finally {
      // Clean up participant context
      await step('Cleaning up participant', async () => {
        if (participantPage) {
          await participantPage.close();
          await participantContext.close();
          console.log('Participant browser closed');
        }
      });
    }
  });

  testWithConfig.afterEach(async () => {
    await step('Cleaning up owner', async () => {
      // Leave room if still in one
      if (ownerPage && await ownerPage.locator('#leave-room-btn').isVisible()) {
        await ownerPage.locator('#leave-room-btn').click();
        console.log('Owner left the room');
      }
      
      // Close the page
      if (ownerPage) {
        await ownerPage.close();
        console.log('Owner browser closed');
      }
    });
  });
});
