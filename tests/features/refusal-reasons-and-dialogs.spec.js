import { test, expect } from '../fixtures/app-fixtures.js';

test.describe('DCI-04: Refusal Reasons and Accessible Dialogs', () => {
  test('stage controls expose refusal reasons for Full, Tablet/Desktop, and Phone presets with zero dialog events', async ({ page }) => {
    const dialogs = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      d.dismiss().catch(() => {});
    });

    await page.goto('/responsive-lab.html');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    const stageHint = page.getByTestId('stage-refusal-hint');
    await expect(stageHint).toBeVisible();
    await expect(stageHint).toHaveText(
      'Rotate, orientation, and Safe-area need a device. Pick a preset or enter a width and a height.'
    );
    await expect(page.getByTestId('btn-rotate-viewport')).toBeDisabled();
    await expect(page.getByTestId('btn-rotate-viewport')).toHaveAttribute('aria-describedby', 'stage-refusal-hint');
    await expect(page.getByTestId('btn-safe-area-toggle')).toBeDisabled();
    await expect(page.getByTestId('btn-safe-area-toggle')).toHaveAttribute('aria-describedby', 'stage-refusal-hint');

    // Selecting iPhone 16 Pro enables both Rotate and Safe-area and hides the refusal hint
    await page.locator('button[data-device-id="iphone-16-pro"]').click();
    await expect(stageHint).toBeHidden();
    await expect(page.getByTestId('btn-rotate-viewport')).toBeEnabled();
    await expect(page.getByTestId('btn-rotate-viewport')).not.toHaveAttribute('aria-describedby', 'stage-refusal-hint');
    await expect(page.getByTestId('btn-safe-area-toggle')).toBeEnabled();
    await expect(page.getByTestId('btn-safe-area-toggle')).not.toHaveAttribute('aria-describedby', 'stage-refusal-hint');

    // Selecting Desktop FHD enables Rotate but disables Safe-area with its safe-area sentence
    await page.locator('button[data-device-id="desktop-fhd"]').click();
    await expect(stageHint).toBeVisible();
    await expect(stageHint).toHaveText('Safe-area guides need a device that declares insets. Pick a phone preset.');
    await expect(page.getByTestId('btn-rotate-viewport')).not.toHaveAttribute('aria-describedby', 'stage-refusal-hint');
    await expect(page.getByTestId('btn-safe-area-toggle')).toBeDisabled();
    await expect(page.getByTestId('btn-safe-area-toggle')).toHaveAttribute('aria-describedby', 'stage-refusal-hint');

    expect(dialogs).toEqual([]);
  });

  test('blocked target surfaces rec-start-reason matching Start title', async ({ page }) => {
    await page.goto('/responsive-lab.html?target=https%3A%2F%2Fgithub.com%2F');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    const btnStart = page.getByTestId('btn-rec-start');
    const reasonEl = page.getByTestId('rec-start-reason');
    await expect(btnStart).toBeDisabled();
    await expect(reasonEl).toBeVisible();
    const titleText = await btnStart.getAttribute('title');
    await expect(reasonEl).toHaveText(titleText || 'Recording unavailable');
    await expect(btnStart).toHaveAttribute('aria-describedby', 'rec-start-reason');
  });

  test('Portal Cmd+K opens in-page URL dialog, validates bad input, returns focus on Cancel, and probes accepted URL without native dialog', async ({ page }) => {
    const dialogs = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      d.dismiss().catch(() => {});
    });

    await page.route('**/api/mcard/probe-url*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          verdict: 'blocked',
          status: 403,
          reason: 'Stubbed X-Frame-Options'
        })
      });
    });

    await page.goto('/index.html?noredirect=1');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });
    await page.waitForSelector('[data-role="open-url"]');

    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByTestId('open-url-dialog');
    await expect(dialog).toBeVisible();

    await page.getByTestId('open-url-input').fill('hello');
    await page.getByTestId('open-url-submit').click();
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('open-url-error')).toHaveText('Enter an http or https URL.');

    await page.getByTestId('open-url-cancel').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-role="open-url"]')).toBeFocused();

    // Valid URL submission closes dialog cleanly without triggering native dialog
    await page.locator('[data-role="open-url"]').click();
    await expect(dialog).toBeVisible();
    await page.getByTestId('open-url-input').fill('https://example.org/test');
    await page.getByTestId('open-url-submit').click();
    await expect(dialog).toBeHidden();
    expect(dialogs).toEqual([]);
  });

  test('LeastActionNavigator refused lock writes into least-action-status without alert()', async ({ page }) => {
    const dialogs = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      d.dismiss().catch(() => {});
    });

    await page.goto('/index.html?noredirect=1');
    await expect(page.locator('body')).toHaveAttribute('data-page-state', 'ready', { timeout: 10000 });

    await page.evaluate(async () => {
      document.getElementById('least-action-modal')?.remove();
      const mod = await import('/js/runtime/least-action-navigator.js');
      const { LeastActionNavigator, CANDIDATE_SPRINT_DIRECTIONS } = mod;
      const nav = new LeastActionNavigator();
      nav.mount(document.body);
      const prunedEntry = Object.values(CANDIDATE_SPRINT_DIRECTIONS).find((d) => !d.isRealAction);
      nav.setDirection(prunedEntry.id);
      nav.open();
    });

    await page.locator('#lock-direction-btn').click();
    await expect(page.getByTestId('least-action-status')).toContainText('Imaginary action metric');
    expect(dialogs).toEqual([]);
  });
});
