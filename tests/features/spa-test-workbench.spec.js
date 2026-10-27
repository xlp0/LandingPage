import {
  SPA_FIXTURE_PATH,
  installExternalBoundaryStubs,
  loadSpaFixtureGraph
} from '../fixtures/app-fixtures.js';
import { test, expect } from '../fixtures/net-trace.js';
import { toPlaywrightContext } from '../fixtures/device-matrix.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { TEST_RUN_SCHEMA } from '../../js/harness/test-run-schema.js';
import { replayNetTrace } from '../../scripts/check-net.mjs';
import { replayRun } from '../../scripts/playwright-replay-driver.mjs';

const spaEnvelope = loadSpaFixtureGraph();

test.describe('SPRINT-GQC-04: Guided SPA Test Workflow Island and Dual-Net Replay', () => {
  test('GQC-04-E2E-01: guides target selection, device rotation, Place/Transition inspection, ERB capture, MCard evidence, and replays both workbench and target nets', async ({
    browser,
    isolatedLabPage,
    workbench,
    workbenchNetTracer,
    request
  }) => {
    const { page, dialogs } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });
    expect(await ensureTargetReachable(request, SPA_FIXTURE_PATH)).toBe(true);

    await workbench.open();
    const guide = page.getByTestId('spa-test-workflow');
    await expect(guide).toBeVisible();
    await expect(guide).toHaveAttribute('data-workflow-ready', 'true');
    await expect(page.getByTestId('mpa-status-badge')).toContainText('Optional / Deferred');

    await expect(page.getByTestId('workflow-target-type')).toHaveText('webapp');
    await expect(page.getByTestId('workflow-spa-eligibility')).toHaveText('Not Classified as SPA');

    await workbench.selectPresetTarget('index.html');
    await expect(page.getByTestId('workflow-target-type')).toHaveText('mpa-candidate');
    await expect(page.getByTestId('workflow-spa-eligibility')).toHaveText('Not Classified as SPA');
    await page.getByTestId('workflow-tab-step-transitions').click();
    await expect(page.getByTestId('workflow-no-transitions-net')).toContainText('PenPot MPA links');

    await page.getByTestId('workflow-tab-step-target').click();
    await page.getByTestId('workflow-select-spa-fixture').click();
    await expect(page.getByTestId('workflow-target-type')).toHaveText('spa');
    await expect(page.getByTestId('workflow-spa-eligibility')).toHaveText('Approved P0 SPA Target');

    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    const initialNonce = await appRoot.getAttribute('data-boot-nonce');
    expect(initialNonce).toBeTruthy();

    await page.getByTestId('workflow-next-device').click();
    await expect(page.getByTestId('workflow-panel-step-device')).toBeVisible();
    await page.getByTestId('workflow-device-phone').click();
    const phoneDims = await workbench.readStageDimensions();
    expect([393, 852]).toContain(phoneDims.width);

    await page.getByTestId('workflow-rotate-device').click();
    const rotatedDims = await workbench.readStageDimensions();
    expect(rotatedDims.width).toBe(phoneDims.height);
    await expect(page.getByTestId('workflow-device-place')).toHaveText('p_spa_overview');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', initialNonce);

    if (rotatedDims.width > rotatedDims.height) {
      await page.getByTestId('workflow-rotate-device').click();
    }

    await page.getByTestId('workflow-next-places').click();
    await expect(page.getByTestId('workflow-places-table')).toBeVisible();
    for (const [placeId, binding] of Object.entries(spaEnvelope.bindings.places)) {
      await expect(page.getByTestId(`place-id-${placeId}`)).toHaveText(placeId);
      await expect(page.getByTestId(`place-page-${placeId}`)).toHaveText(binding.pageId);
      await expect(page.getByTestId(`place-route-handle-${placeId}`)).toHaveText(binding.routeHandle);
      await expect(page.getByTestId(`place-clm-uri-${placeId}`)).toHaveText(binding.clmTypeUri);
      expect(binding.routeHandle).not.toBe(binding.clmTypeUri);
    }
    await expect(page.getByTestId('place-status-p_spa_overview')).toHaveText('Active');

    await page.getByTestId('workflow-next-transitions').click();
    await expect(page.getByTestId('workflow-transitions-table')).toBeVisible();
    await expect(page.getByTestId('transition-dest-t_spa_open_details')).toHaveText('p_spa_details');
    await expect(page.getByTestId('transition-dest-t_spa_invalid_unmapped')).toHaveText('Error: p_spa_missing_transition');

    await page.getByTestId('workflow-next-evidence').click();
    await expect(page.getByTestId('incomplete-capture-badge')).toBeHidden();

    await page.getByTestId('workflow-rec-start').click();
    await expect(page.getByTestId('workflow-recorder-state')).toHaveText('RECORDING');
    await expect(page.getByTestId('incomplete-capture-badge')).toBeVisible();
    await expect(page.getByTestId('incomplete-capture-badge')).toContainText('Incomplete Capture');

    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');
    await frame.getByRole('button', { name: 'Back to Overview' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');
    await expect(appRoot).toHaveAttribute('data-boot-nonce', initialNonce);

    await page.locator('#btn-rec-pause').click();
    await expect(page.getByTestId('workflow-recorder-state')).toHaveText('PAUSED');
    await expect(page.getByTestId('incomplete-capture-badge')).toBeVisible();
    await page.locator('#btn-rec-resume').click();

    const saveRespPromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
    );
    await page.getByTestId('workflow-rec-stop').click();
    const saveResp = await saveRespPromise;
    expect([200, 201]).toContain(saveResp.status());
    const savedBody = await saveResp.json();

    await expect(page.getByTestId('incomplete-capture-badge')).toBeHidden();
    await expect(page.getByTestId('capture-completeness-badge')).toHaveAttribute('data-completeness', 'complete');
    await expect(page.getByTestId('workflow-mcard-handle')).toHaveText(savedBody.handle);
    await expect(page.getByTestId('workflow-mcard-hash')).toHaveText(savedBody.hash);
    await expect(page.getByTestId('workflow-gqc05-note')).toContainText('SPRINT-GQC-05');

    const persisted = await workbench.fetchPersistedRun(savedBody.hash);
    expect(persisted.ok).toBe(true);
    const storedRun = persisted.body.run || persisted.body;
    expect(storedRun.schema).toBe(TEST_RUN_SCHEMA);
    expect(storedRun.netMCard).toBeUndefined();

    const phoneProfile = await page.evaluate(() => window.__lab.registry.getById('iphone-16-pro'));
    const replayContext = await browser.newContext(toPlaywrightContext(phoneProfile, 'portrait'));
    try {
      await installExternalBoundaryStubs(replayContext);
      const replayPage = await replayContext.newPage();
      await replayPage.goto(storedRun.target.url);
      const replayRoot = replayPage.locator('#spa-app-root');
      const replayNonce = await replayRoot.getAttribute('data-boot-nonce');
      const replaySummary = await replayRun(replayPage, storedRun, {
        mode: 'deterministic',
        mintResult: false
      });
      expect(replaySummary.verdict).toBe('pass');
      await expect(replayRoot).toHaveAttribute('data-place-id', 'p_spa_details');
      await expect(replayRoot).toHaveAttribute('data-boot-nonce', replayNonce);
    } finally {
      await replayContext.close();
    }

    const workbenchReplay = await workbenchNetTracer.replay();
    expect(workbenchReplay.ok).toBe(true);
    expect(workbenchReplay.sessionInvariantHolds).toBe(true);
    expect(workbenchNetTracer.getTrace().unmappedNavigations).toEqual([]);
    expect(workbenchReplay.firedTransitionIds).toContain('t_req_post_test_runs');
    expect(workbenchReplay.firedTransitionIds).toContain('t_ok_post_test_runs');

    const targetTrace = await page.evaluate(() => window.__lab.workflow.targetTrace());
    const targetReplay = await replayNetTrace(spaEnvelope, targetTrace);
    expect(targetReplay.ok).toBe(true);
    expect(targetReplay.finalPlaceId).toBe('p_spa_details');
    expect(targetReplay.sessionInvariantHolds).toBe(true);
    expect(targetReplay.firedTransitionIds).toEqual([
      't_spa_open_details',
      't_spa_back_overview',
      't_spa_open_details'
    ]);

    expect(dialogs).toEqual([]);
  });

  test('GQC-04-E2E-02: traps unmapped target action into p_spa_missing_transition without counting valid navigation and marks interrupted capture incomplete', async ({
    isolatedLabPage,
    workbench,
    externalStubs
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');

    await page.getByTestId('workflow-tab-step-transitions').click();
    await expect(page.getByTestId('workflow-valid-nav-count')).toHaveText('0');

    await frame.getByRole('button', { name: 'Open Unmapped Audit Route' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_missing_transition');
    await expect(page.getByTestId('workflow-error-place-indicator')).toHaveText('p_spa_missing_transition');
    await expect(page.getByTestId('transition-status-t_spa_invalid_unmapped')).toHaveText('error-trapped');
    await expect(page.getByTestId('workflow-valid-nav-count')).toHaveText('0');
    await expect(page.getByTestId('spa-workflow-error')).toBeVisible();
    await expect(page.getByTestId('spa-workflow-error')).toContainText('p_spa_missing_transition');

    await frame.getByRole('button', { name: 'Recover to Overview' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');
    await expect(page.getByTestId('workflow-error-place-indicator')).toHaveText('none');
    await expect(page.getByTestId('transition-status-t_spa_recover_overview')).toHaveText('recovered');
    await expect(page.getByTestId('spa-workflow-error')).toBeHidden();

    const targetTrace = await page.evaluate(() => window.__lab.workflow.targetTrace());
    const targetReplay = await replayNetTrace(spaEnvelope, targetTrace);
    expect(targetReplay.ok).toBe(true);
    expect(targetReplay.firedTransitionIds).toEqual([
      't_spa_invalid_unmapped',
      't_spa_recover_overview'
    ]);

    await page.getByTestId('workflow-tab-step-evidence').click();
    await page.getByTestId('workflow-rec-start').click();
    await expect(page.getByTestId('incomplete-capture-badge')).toBeVisible();

    await workbench.selectPresetTarget('https://github.com');
    expect(externalStubs.stubbedRequests.some((r) => r.boundary === 'blocked-external-origin')).toBe(true);
    await expect(page.getByTestId('incomplete-capture-badge')).toBeVisible();
    await expect(page.getByTestId('incomplete-capture-badge')).toContainText('Not Pass / Not Certified');
    await expect(page.getByTestId('spa-workflow-error')).toBeVisible();

    await page.getByTestId('workflow-tab-step-target').click();
    await page.getByTestId('workflow-recover-target').click();
    await expect(page.getByTestId('workflow-policy-state')).toHaveText('approved-same-origin');
  });

  test('GQC-04-E2E-03: supports keyboard roving tabs, live status announcements, optional module failure isolation, and clean reload', async ({
    isolatedLabPage,
    workbench
  }) => {
    const { page, dialogs } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const tabTarget = page.getByTestId('workflow-tab-step-target');
    const tabDevice = page.getByTestId('workflow-tab-step-device');
    const tabEvidence = page.getByTestId('workflow-tab-step-evidence');

    await tabTarget.focus();
    await expect(tabTarget).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tabDevice).toBeFocused();
    await expect(tabDevice).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('spa-workflow-status')).toContainText('Step 2 of 5');

    await page.keyboard.press('End');
    await expect(tabEvidence).toBeFocused();
    await expect(tabEvidence).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('spa-workflow-status')).toContainText('Step 5 of 5');

    await page.keyboard.press('Home');
    await expect(tabTarget).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(tabEvidence).toBeFocused();

    await page.evaluate(async () => {
      await window.__lab.workflow.loadOptionalModules([
        {
          id: 'optional-analytics-probe',
          owner: 'Operations',
          required: false,
          entry: '/nonexistent-optional-extension.js'
        }
      ]);
    });

    const warningsBox = page.getByTestId('spa-workflow-module-warnings');
    await expect(warningsBox).toBeVisible();
    await expect(warningsBox).toContainText('optional-analytics-probe');
    await expect(warningsBox).toContainText('Operations');

    await page.keyboard.press('Home');
    await expect(tabTarget).toBeFocused();
    await expect(page.getByTestId('workflow-panel-step-target')).toBeVisible();

    await page.reload();
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
    await expect(page.getByTestId('spa-test-workflow')).toHaveAttribute('data-workflow-ready', 'true');
    await expect(page.getByTestId('spa-workflow-module-warnings')).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });
});
