const { test, expect } = require('@playwright/test');

test.describe('PKC Website Navigation Test', () => {
  test('navigate through PKC website links', async ({ page }) => {
    // Set browser to fullscreen
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // 1. Open website
    await page.goto('https://test.pkc.pub');
    await page.waitForLoadState('networkidle');
    
    // Wait for the main content to be visible
    await page.waitForSelector('[data-anime="main-content"]', { timeout: 10000 });
    
    // 2. Click "Browse Documentation" button
    console.log('Clicking Browse Documentation button...');
    await page.locator('a[href="pkc-docs-index.html"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait 2 seconds
    
    // Verify we're on the documentation page
    await expect(page).toHaveURL(/.*pkc-docs-index\.html/);
    console.log('Successfully navigated to documentation page');
    
    // 3. Back to previous page
    console.log('Going back to previous page...');
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait 2 seconds
    await expect(page).toHaveURL('https://test.pkc.pub/');
    console.log('Successfully returned to main page');
    
    // 4. Click "Tic-Tac-Toe P2P" button
    console.log('Clicking Tic-Tac-Toe P2P button...');
    await page.locator('a[href="tic-tac-toe.html"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait 2 seconds
    
    // Verify we're on the tic-tac-toe page
    await expect(page).toHaveURL(/.*tic-tac-toe\.html/);
    console.log('Successfully navigated to Tic-Tac-Toe page');
    
    // 5. Back to previous page
    console.log('Going back to previous page...');
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait 2 seconds
    await expect(page).toHaveURL('https://test.pkc.pub/');
    console.log('Successfully returned to main page');
    
    // 6. Click "Video Meeting P2P" button
    console.log('Clicking Video Meeting P2P button...');
    await page.locator('a[href="/js/modules/video-meeting/index.html"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait 2 seconds
    
    // Verify we're on the video meeting page
    await expect(page).toHaveURL(/.*video-meeting\/index\.html/);
    console.log('Successfully navigated to Video Meeting page');
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'video-meeting-page.png', fullPage: true });
    
    console.log('All navigation tests completed successfully!');
  });
});
