import { expect, test } from '@playwright/test';

const EFFECTS = ['navigate', 'persist', 'destructive', 'external', 'download', 'file-picker'];
const ROUTES = ['/responsive-lab.html', '/?noredirect=1', '/app.html', '/sprint-registry.html', '/fiber-inspector.html', '/fiber-conformance.html'];

for (const route of ROUTES) {
  test(`${route} exposes explorable controls`, async ({ page }) => {
    const nativeDialogs = [];
    await page.addInitScript(() => {
      for (const name of ['confirm', 'alert', 'prompt']) {
        window[name] = (...args) => {
          window.__nativeDialog = { name, args };
          throw new Error(`native ${name} called`);
        };
      }
    });

    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    nativeDialogs.push(await page.evaluate(() => window.__nativeDialog || null));
    expect(nativeDialogs.filter(Boolean)).toEqual([]);

    const problems = await page.evaluate(({ allowed, routePath }) => {
      const issues = [];
      const inScope = routePath !== '/app.html';
      const controlSelector = 'button, a, input, select, textarea';

      for (const island of document.querySelectorAll('[data-island]')) {
        for (const control of island.querySelectorAll(controlSelector)) {
          if (!control.getAttribute('data-testid')) {
            issues.push(`island ${island.getAttribute('data-island')}: ${control.tagName.toLowerCase()} without data-testid`);
          }
        }
      }

      if (inScope) {
        const shellRoots = 'header, nav, .top-controls, .container, .stage-toolbar, .stage-transport, #device-manager-modal, [data-island], #mcard-sovereign-pill-mount';
        for (const root of document.querySelectorAll(shellRoots)) {
          for (const control of root.querySelectorAll(controlSelector)) {
            if (!control.getAttribute('data-testid')) {
              issues.push(`shell ${root.tagName.toLowerCase()}#${root.id || root.className}: ${control.tagName.toLowerCase()} without data-testid`);
            }
          }
        }
        const presetIds = Array.from(document.querySelectorAll('#device-presets-container [data-testid]'))
          .map((el) => el.getAttribute('data-testid'));
        const seenPresetIds = new Set();
        for (const id of presetIds) {
          if (seenPresetIds.has(id)) issues.push(`duplicate device preset data-testid=${id}`);
          seenPresetIds.add(id);
        }
      }

      for (const el of document.querySelectorAll('[data-effect]')) {
        const effect = el.getAttribute('data-effect');
        if (!allowed.includes(effect)) issues.push(`unknown data-effect=${effect}`);
        if (!el.getAttribute('data-testid')) issues.push(`data-effect=${effect} without data-testid`);
      }
      return issues;
    }, { allowed: EFFECTS, routePath: route });
    expect(problems).toEqual([]);
  });
}

test('toggle buttons on the workbench expose accurate aria-pressed state', async ({ page }) => {
  await page.goto('/responsive-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading', { timeout: 15000 });

  for (const selector of ['.arrangement-btn', '.orientation-btn-primary', '.size-preset-btn']) {
    const states = await page.locator(selector).evaluateAll((els) =>
      els.map((el) => ({ id: el.id, pressed: el.getAttribute('aria-pressed') }))
    );
    expect(states.length).toBeGreaterThan(0);
    for (const entry of states) {
      expect(['true', 'false']).toContain(entry.pressed);
    }
  }

  await expect(page.getByTestId('btn-size-full')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('btn-orient-vertical')).toBeDisabled();
  await expect(page.getByTestId('btn-orient-horizontal')).toBeDisabled();
  await expect(page.getByTestId('btn-orient-vertical')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('btn-orient-horizontal')).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('btn-arrange-vertical').click();
  await expect(page.getByTestId('btn-arrange-vertical')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('btn-arrange-horizontal')).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('btn-size-mobile').click();
  await expect(page.getByTestId('btn-size-mobile')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('btn-size-full')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('btn-orient-vertical')).toBeEnabled();
  await expect(page.getByTestId('btn-orient-vertical')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('btn-orient-horizontal').click();
  await expect(page.getByTestId('btn-orient-horizontal')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('btn-orient-vertical')).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('btn-orient-vertical').click();
  await expect(page.getByTestId('btn-orient-vertical')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('btn-orient-horizontal')).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('btn-size-full').click();
  await expect(page.getByTestId('btn-size-full')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('btn-size-mobile')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('btn-orient-vertical')).toBeDisabled();
  await expect(page.getByTestId('btn-orient-vertical')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('btn-orient-horizontal')).toHaveAttribute('aria-pressed', 'false');
});

test('the preset delete flow uses an in-page dialog and cancels without deleting', async ({ page }) => {
  await page.goto('/responsive-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).not.toHaveAttribute('data-page-state', 'loading', { timeout: 15000 });

  const dialog = page.locator('#preset-delete-dialog');
  await expect(dialog).toHaveCount(0);

  await page.getByTestId('btn-open-device-manager').click();
  await page.locator('#input-device-name').fill('BPV Dialog Probe');
  await page.locator('#input-device-width').fill('411');
  await page.locator('#input-device-height').fill('915');
  await page.locator('#btn-save-device').click();
  const deleteButtons = page.locator('.dm-delete');
  await expect(deleteButtons.first()).toBeVisible({ timeout: 5000 });
  await deleteButtons.first().click();
  await expect(dialog).toHaveCount(1);
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('preset-delete-cancel').click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => Boolean(window.__nativeDialog))).toBe(false);
});

test('controls marked hidden are not rendered, so an explorer cannot click them', async ({ page }) => {
  await page.goto('/responsive-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#btn-rec-start')).toBeVisible();

  const rendered = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[hidden]'))
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => el.id || el.getAttribute('data-testid') || el.tagName)
  );

  expect(rendered).toEqual([]);
});
