import { test, expect } from '@playwright/test';

test.describe('SPRINT-BPV-01: Responsive Lab Pop Out control', () => {
  test('BPV-01-E2E-01: Pop Out opens exactly one tab showing the current target', async ({ page, context }) => {
    await page.goto('/responsive-lab.html');
    await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading');

    const popout = page.locator('#mission-control-popout-btn');
    const currentTarget = await page.locator('#target-url-input').inputValue();

    const opened = [];
    context.on('page', (newPage) => opened.push(newPage));
    await popout.click();
    await expect.poll(() => opened.length, { message: 'a tab opens' }).toBeGreaterThan(0);
    // Give a second, unwanted tab time to appear before counting.
    await page.waitForTimeout(1000);

    expect(opened, 'exactly one tab opens').toHaveLength(1);
    await opened[0].waitForLoadState('domcontentloaded');
    expect(new URL(opened[0].url()).pathname).toBe(new URL(currentTarget, page.url()).pathname);
  });
});
