import { test, expect } from '../fixtures/app-fixtures.js';

test.describe('DCI-03: Linkable Lab URL State', () => {
  test('restores built-in preset, orientation, and mode from URL and preserves them across reload', async ({ page }) => {
    await page.goto('/responsive-lab.html?device=iphone-16-pro&orientation=landscape&mode=verify');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    await expect(page.locator('#controlled-frame-dim')).toContainText('852px × 393px');
    await expect(page.locator('#btn-mode-verify')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#verify-summary-shell')).toBeVisible();

    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    await expect(page.locator('#controlled-frame-dim')).toContainText('852px × 393px');
    await expect(page.locator('#btn-mode-verify')).toHaveAttribute('aria-selected', 'true');
  });

  test('writes preset, custom size, and arrow-key mode switches while preserving target and display_mode', async ({ page }) => {
    await page.goto('/responsive-lab.html?target=%2Findex.html&display_mode=light');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    // Select built-in preset via preset button
    await page.locator('button[data-device-id="pixel-8"]').click();
    await expect(page).toHaveURL(/target=%2Findex\.html.*display_mode=light.*device=pixel-8/);

    // Custom geometry writes w and h without device
    await page.getByTestId('controlled-width-input').fill('500');
    await page.getByTestId('controlled-height-input').fill('700');
    await page.getByTestId('btn-apply-custom-dim').click();
    await expect(page).toHaveURL(/w=500&h=700/);
    expect(new URL(page.url()).searchParams.has('device')).toBe(false);
    expect(new URL(page.url()).searchParams.get('display_mode')).toBe('light');

    // Mode change via arrow key updates mode parameter
    const exploreTab = page.locator('#btn-mode-explore');
    await exploreTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/mode=guided-spa/);
  });

  test('window resizes write neither URL nor history entries, and Back leaves the Lab in one step', async ({ page }) => {
    await page.goto('/index.html?noredirect=1');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    await page.getByTestId('responsive-ui-lab-btn').click();
    await page.waitForURL(/\/responsive-lab\.html/, { timeout: 10000 });
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    const beforeLen = await page.evaluate(() => window.history.length);
    const beforeUrl = page.url();
    for (let i = 0; i < 20; i += 1) {
      await page.setViewportSize({ width: 900 + (i % 5) * 30, height: 700 + (i % 3) * 20 });
    }
    expect(await page.evaluate(() => window.history.length)).toBe(beforeLen);
    expect(page.url()).toBe(beforeUrl);

    await page.locator('button[data-device-id="iphone-se"]').click();
    await page.locator('button[data-device-id="pixel-8"]').click();
    await page.goBack();
    await page.waitForURL(/\/index\.html\?noredirect=1/, { timeout: 10000 });
  });

  test('surfaces invalid URL param notice and hides it after first user commit, and copies URL to clipboard', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/responsive-lab.html?device=iphone-16-pro&w=500&h=700');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    const notice = page.getByTestId('lab-url-state-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveText('Ignored w and h. The link also names a device.');

    // Selecting a mode hides the boot notice
    await page.locator('#btn-mode-bombadil').click();
    await expect(notice).toBeHidden();

    // Copy link writes window.location.href to clipboard
    await page.getByTestId('btn-copy-lab-link').click();
    await expect(page.getByTestId('btn-copy-lab-link')).toHaveText('Link copied');
    const clipText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipText).toBe(page.url());
  });
});
