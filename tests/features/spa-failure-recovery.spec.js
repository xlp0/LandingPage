import {
  test,
  expect,
  SPA_FIXTURE_PATH,
  loadSpaFixtureGraph
} from '../fixtures/app-fixtures.js';

const spaGraph = loadSpaFixtureGraph();

test.describe('SPRINT-GQC-02: SPA Failure Recovery and Keyboard Operation', () => {
  test('GQC-02-E2E-04: unmapped functional link enters declared error Place p_spa_missing_transition without claiming capture authorization and recovers in-document', async ({
    isolatedLabPage,
    workbench
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');

    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    const bootNonce = await appRoot.getAttribute('data-boot-nonce');

    await frame.getByRole('button', { name: 'Open Unmapped Audit Route' }).click();

    await expect(appRoot).toHaveAttribute('data-page-id', spaGraph.bindings.places.p_spa_missing_transition.pageId);
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_missing_transition');
    await expect(appRoot).toHaveAttribute('data-last-transition-id', 't_spa_invalid_unmapped');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', bootNonce);

    const alertBox = frame.getByRole('alert');
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText('t_spa_invalid_unmapped');
    await expect(alertBox).toContainText('p_spa_missing_transition');
    await expect(alertBox).toContainText('Capture authorization is not claimed');

    await frame.getByRole('button', { name: 'Recover to Overview' }).click();

    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    await expect(appRoot).toHaveAttribute('data-last-transition-id', 't_spa_recover_overview');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', bootNonce);
    await expect(frame.getByRole('heading', { name: 'Citizen Service Overview' })).toBeVisible();
  });

  test('GQC-02-E2E-05: rejects unsafe javascript: URLs and surfaces blocked-origin warning without recording unapproved origins before recovering to SPA fixture', async ({
    isolatedLabPage,
    workbench,
    externalStubs
  }) => {
    const { page, dialogs } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const frame = workbench.targetFrame();
    await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_overview');

    await workbench.loadTargetByUrl('javascript:alert(1)');
    expect(dialogs).toEqual([]);
    await expect(page.locator('#mission-control-iframe')).toHaveAttribute('src', SPA_FIXTURE_PATH);
    await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_overview');

    await workbench.selectPresetTarget('https://github.com');
    await expect(page.locator('#cors-block-alert')).toBeVisible();
    await expect(page.locator('#cors-block-reason')).toContainText('X-Frame-Options: DENY');
    await expect(page.locator('#cors-status-pill')).toContainText('Iframe Blocked');
    await expect(page.locator('#rec-source-pill')).not.toContainText('same-origin');
    expect(externalStubs.stubbedRequests.some((r) => r.boundary === 'blocked-external-origin')).toBe(true);

    await workbench.loadTargetByUrl(SPA_FIXTURE_PATH);
    await expect(page.locator('#cors-block-alert')).toBeHidden();
    await expect(page.locator('#rec-source-pill')).toContainText('Source: same-origin');
    await expect(frame.locator('#spa-app-root')).toHaveAttribute('data-place-id', 'p_spa_overview');
  });

  test('GQC-02-E2E-06: completes target selection, device setup, error recovery, and MCard capture by keyboard alone', async ({
    isolatedLabPage,
    workbench
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open();

    const urlInput = page.getByRole('textbox', { name: /Test Target URL input/i });
    const clearBtn = page.getByRole('button', { name: /Clear URL/i });
    const loadBtn = page.getByRole('button', { name: /Load Target/i });

    await urlInput.focus();
    await expect(urlInput).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(clearBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(urlInput).toHaveValue('');

    await urlInput.focus();
    await expect(urlInput).toBeFocused();
    await page.keyboard.type(SPA_FIXTURE_PATH);
    await page.keyboard.press('Tab');
    await expect(clearBtn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loadBtn).toBeFocused();
    await page.keyboard.press('Enter');

    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    const bootNonce = await appRoot.getAttribute('data-boot-nonce');

    const phoneBtn = page.getByRole('button', { name: /iPhone 16 Pro/i });
    await phoneBtn.focus();
    await expect(phoneBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#controlled-width-input')).toHaveValue(/^(393|852)$/);

    const startBtn = page.getByRole('button', { name: /Start/i });
    await startBtn.focus();
    await expect(startBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Stop/i })).toBeVisible();

    const invalidBtn = frame.getByRole('button', { name: 'Open Unmapped Audit Route' });
    await invalidBtn.focus();
    await invalidBtn.press('Enter');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_missing_transition');

    const recoverBtn = frame.getByRole('button', { name: 'Recover to Overview' });
    await recoverBtn.focus();
    await recoverBtn.press('Enter');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');

    const openDetailsBtn = frame.getByRole('button', { name: 'Open Service Details' });
    await openDetailsBtn.focus();
    await openDetailsBtn.press('Enter');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', bootNonce);

    const savePromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
    );
    const stopBtn = page.getByRole('button', { name: /Stop/i });
    await stopBtn.focus();
    await expect(stopBtn).toBeFocused();
    await page.keyboard.press('Enter');

    const saveRes = await savePromise;
    expect([200, 201]).toContain(saveRes.status());
    await expect(page.locator('#rec-saved-label')).toContainText(/\([0-9a-f]{8}\)/i);
  });
});
