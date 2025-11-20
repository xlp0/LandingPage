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
  await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second delay after each step
  return result;
};

testWithConfig.describe.configure({ mode: 'serial', retries: 0 });

testWithConfig.describe('Video Meeting Tests', () => {
  let page;
  let participantPage;
  let participantContext;
  
  testWithConfig.beforeEach(async ({ browser }) => {
    await step('Initializing browser context', async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 100,
        permissions: ['camera', 'microphone'],
      });
      page = await context.newPage();
    });
  });

  testWithConfig('should load Video Meeting page successfully', async () => {
    await step('Navigating to Video Meeting page', async () => {
      await page.goto('http://localhost:8765/js/modules/video-meeting/index.html');
      await page.waitForLoadState('networkidle');
    });

    await step('Verifying page title and header', async () => {
      await expect(page).toHaveTitle('Video Meeting P2P');
      await expect(page.locator('h1')).toContainText('Video Meeting P2P');
    });
  });

  testWithConfig('should handle user profile setup', async () => {
    await step('Navigating to Video Meeting page', async () => {
      await page.goto('http://localhost:8765/js/modules/video-meeting/index.html');
      await page.waitForLoadState('networkidle');
    });

    await step('Setting display name', async () => {
      await page.locator('#display-name').fill('Test User');
      await page.locator('#set-name-btn').click();
      await expect(page.locator('#current-user')).toContainText('Test User');
    });
  });

  testWithConfig('should manage meeting rooms', async () => {
    await step('Navigating to Video Meeting page', async () => {
      await page.goto('http://localhost:8765/js/modules/video-meeting/index.html');
      await page.waitForLoadState('networkidle');
    });

    await step('Setting up host profile', async () => {
      await page.locator('#display-name').fill('Host');
      await page.locator('#set-name-btn').click();
    });

    await step('Creating a new meeting room', async () => {
      await page.locator('#create-room-btn').click();
      await expect(page.locator('#room-id')).toBeVisible();
      await expect(page.locator('#local-video')).toBeVisible();
    });
  });

  testWithConfig('should handle multiple participants', async ({ browser }) => {
    await step('Host: Setting up meeting room', async () => {
      await page.goto('http://localhost:8765/js/modules/video-meeting/index.html');
      await page.waitForLoadState('networkidle');
      await page.locator('#display-name').fill('Host');
      await page.locator('#set-name-btn').click();
      await page.locator('#create-room-btn').click();
    });

    await step('Setting up participant context', async () => {
      participantContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 100,
        permissions: ['camera', 'microphone'],
      });
      participantPage = await participantContext.newPage();
    });

    try {
      await step('Participant: Joining the meeting', async () => {
        await participantPage.goto('http://localhost:8765/js/modules/video-meeting/index.html');
        await participantPage.waitForLoadState('networkidle');
        
        const roomId = await page.locator('#room-id').innerText();
        
        await participantPage.locator('#display-name').fill('Participant');
        await participantPage.locator('#set-name-btn').click();
        await participantPage.locator('#room-id-input').fill(roomId);
        await participantPage.locator('#join-room-btn').click();
      });

      await step('Verifying participant count', async () => {
        await expect(page.locator('#participants-count')).toContainText('2');
        await expect(participantPage.locator('#participants-count')).toContainText('2');
      });

    } finally {
      await step('Cleaning up participant context', async () => {
        await participantPage.close();
        await participantContext.close();
      });
    }
  });

  testWithConfig('should test media controls', async () => {
    await step('Setting up meeting room', async () => {
      await page.goto('http://localhost:8765/js/modules/video-meeting/index.html');
      await page.waitForLoadState('networkidle');
      await page.locator('#display-name').fill('Test User');
      await page.locator('#set-name-btn').click();
      await page.locator('#create-room-btn').click();
    });

    await step('Testing audio controls', async () => {
      await page.locator('#mute-audio').click();
      await expect(page.locator('#mute-audio')).toHaveClass(/active/);
      await page.locator('#mute-audio').click();
    });

    await step('Testing video controls', async () => {
      await page.locator('#mute-video').click();
      await expect(page.locator('#mute-video')).toHaveClass(/active/);
      await page.locator('#mute-video').click();
    });

    await step('Testing screen sharing', async () => {
      await page.locator('#share-screen').click();
      await expect(page.locator('#share-screen')).toHaveClass(/active/);
      await page.locator('#share-screen').click();
    });
  });

  testWithConfig.afterEach(async () => {
    await step('Leaving meeting and cleaning up', async () => {
      if (await page.locator('#leave-room-btn').isVisible()) {
        await page.locator('#leave-room-btn').click();
      }
      await page.close();
    });
  });
});
