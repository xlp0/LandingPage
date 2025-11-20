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

testWithConfig.describe('Tic-Tac-Toe Game Tests', () => {
  let page;
  let player2Page;
  let player2Context;
  
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

  testWithConfig('should load Tic-Tac-Toe game successfully', async () => {
    await step('Navigating to Tic-Tac-Toe page', async () => {
      await page.goto('http://localhost:8765/tic-tac-toe.html');
      await page.waitForLoadState('networkidle');
    });

    await step('Verifying page title and header', async () => {
      await expect(page).toHaveTitle('Tic-Tac-Toe P2P');
      await expect(page.locator('h1')).toContainText('Tic-Tac-Toe P2P');
    });
  });

  testWithConfig('should create and join a game', async ({ browser }) => {
    await step('Player 1: Navigating to Tic-Tac-Toe', async () => {
      await page.goto('http://localhost:8765/tic-tac-toe.html');
      await page.waitForLoadState('networkidle');
    });

    await step('Player 1: Creating a new game', async () => {
      await page.locator('#create-invitation-btn').click();
      await expect(page.locator('#game-status')).toContainText('Waiting for opponent');
    });

    await step('Setting up Player 2', async () => {
      player2Context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 100,
      });
      player2Page = await player2Context.newPage();
    });

    try {
      await step('Player 2: Joining the game', async () => {
        await player2Page.goto('http://localhost:8765/tic-tac-toe.html');
        await player2Page.waitForLoadState('networkidle');
        await player2Page.locator('.join-room-btn').first().click();
      });

      await step('Verifying game state for both players', async () => {
        await expect(page.locator('#game-status')).toContainText('Your turn (X)');
        await expect(player2Page.locator('#game-status')).toContainText('Opponent\'s turn');
      });

      await step('Player 1: Making first move', async () => {
        await page.locator('.cell').first().click();
        await expect(page.locator('.cell').first()).toHaveText('X');
      });

      await step('Verifying Player 2 sees the move', async () => {
        await expect(player2Page.locator('.cell').first()).toHaveText('X');
      });

    } finally {
      await step('Cleaning up Player 2', async () => {
        await player2Page.close();
        await player2Context.close();
      });
    }
  });

  testWithConfig('should detect a win condition', async ({ browser }) => {
    await step('Setting up Player 1', async () => {
      await page.goto('http://localhost:8765/tic-tac-toe.html');
      await page.waitForLoadState('networkidle');
      await page.locator('#create-invitation-btn').click();
    });

    await step('Setting up Player 2', async () => {
      player2Context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
        headless: false,
        slowMo: 100,
      });
      player2Page = await player2Context.newPage();
      await player2Page.goto('http://localhost:8765/tic-tac-toe.html');
      await player2Page.waitForLoadState('networkidle');
      await player2Page.locator('.join-room-btn').first().click();
    });

    try {
      const cells = await page.locator('.cell').all();
      
      await step('Playing winning sequence', async () => {
        // X moves (Player 1)
        await cells[0].click(); // X
        await player2Page.locator('.cell').nth(3).click(); // O
        
        await cells[1].click(); // X
        await player2Page.locator('.cell').nth(4).click(); // O
        
        await cells[2].click(); // X wins
      });

      await step('Verifying win condition', async () => {
        await expect(page.locator('#game-status')).toContainText('You won!');
        await expect(player2Page.locator('#game-status')).toContainText('You lost!');
      });

    } finally {
      await step('Cleaning up Player 2', async () => {
        await player2Page.close();
        await player2Context.close();
      });
    }
  });

  testWithConfig.afterEach(async () => {
    await step('Closing browser context', async () => {
      await page.close();
    });
  });
});
