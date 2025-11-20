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

testWithConfig.describe('Landing Page Navigation', () => {
  let page;
  
  testWithConfig.beforeEach(async ({ browser }) => {
    await step('Initializing browser context', async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 100,
      });
      page = await context.newPage();
    });
  });

  testWithConfig('should load main page successfully', async () => {
    await step('Navigating to landing page', async () => {
      await page.goto('http://localhost:8765');
      await page.waitForLoadState('networkidle');
    });

    await step('Verifying page title and header', async () => {
      await expect(page).toHaveTitle('PKC Landing Page');
      await expect(page.locator('h1')).toContainText('PKC Landing Page');
    });
  });

  testWithConfig('should navigate through all main pages', async () => {
    await step('Navigating to landing page', async () => {
      await page.goto('http://localhost:8765');
      await page.waitForLoadState('networkidle');
    });

    // Test Documentation page
    await step('Testing Documentation page navigation', async () => {
      await page.locator('a[href="pkc-docs-index.html"]').click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*pkc-docs-index\.html/);
    });

    await step('Returning to main page', async () => {
      await page.goBack();
      await page.waitForLoadState('networkidle');
    });

    // Test Tic-Tac-Toe page
    await step('Testing Tic-Tac-Toe page navigation', async () => {
      await page.locator('a[href="tic-tac-toe.html"]').click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*tic-tac-toe\.html/);
    });

    await step('Returning to main page', async () => {
      await page.goBack();
      await page.waitForLoadState('networkidle');
    });

    // Test WebRTC Dashboard
    await step('Testing WebRTC Dashboard navigation', async () => {
      await page.locator('a[href="js/modules/webrtc-dashboard/index.html"]').click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*webrtc-dashboard\/index\.html/);
    });

    await step('Returning to main page', async () => {
      await page.goBack();
      await page.waitForLoadState('networkidle');
    });

    // Test Video Meeting
    await step('Testing Video Meeting navigation', async () => {
      await page.locator('a[href="/js/modules/video-meeting/index.html"]').click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*video-meeting\/index\.html/);
    });
  });

  testWithConfig('should open GitHub in new tab', async ({ context }) => {
    await step('Preparing to open GitHub link', async () => {
      await page.goto('http://localhost:8765');
      await page.waitForLoadState('networkidle');
    });

    await step('Opening GitHub in new tab', async () => {
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        page.locator('a[href*="github.com"]').click()
      ]);
      await newPage.waitForLoadState('networkidle');
      await expect(newPage).toHaveURL(/github\.com/);
      await newPage.close();
    });
  });

  testWithConfig.afterEach(async () => {
    await step('Closing browser context', async () => {
      await page.close();
    });
  });
});
