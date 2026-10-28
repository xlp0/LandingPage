import {
  SPA_FIXTURE_PATH,
  installExternalBoundaryStubs,
  loadSpaFixtureGraph
} from '../fixtures/app-fixtures.js';
import { test, expect } from '../fixtures/net-trace.js';
import { toPlaywrightContext } from '../fixtures/device-matrix.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { TEST_RUN_SCHEMA } from '../../js/harness/test-run-schema.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { loadNetEnvelope, replayNetTrace } from '../../scripts/check-net.mjs';
import { persistWorkbenchTraceToTriad } from '../../scripts/net-to-netmcard.mjs';
import { CanonicalTriadBackend } from '../../server/mcard-api.mjs';
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

test.describe('SPRINT-GQC-05: Layer 4 Trellis Navigation Receipts, Error Recovery, Idempotency, and Workbench FiringRecord Persistence', () => {
  test('GQC-05-E2E-01: fires valid and invalid SPA transitions from the guided UI, enforces p_error_modal recovery, links completed run MCard to receipts, and persists workbench FiringRecord trace', async ({
    isolatedLabPage,
    workbench,
    workbenchNetTracer,
    request
  }) => {
    const { page, dialogs } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const frame = workbench.targetFrame();
    const appRoot = frame.locator('#spa-app-root');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');

    await page.getByTestId('workflow-tab-step-places').click();
    const netHashText = await page.getByTestId('workflow-net-mcard-hash').textContent();
    const bindingsHashText = await page.getByTestId('workflow-bindings-mcard-hash').textContent();
    expect(netHashText).toMatch(/^[0-9a-f]{64}$/);
    expect(bindingsHashText).toMatch(/^[0-9a-f]{64}$/);
    expect(netHashText).not.toBe(bindingsHashText);

    await page.getByTestId('workflow-tab-step-transitions').click();
    await page.getByTestId('workflow-fire-t_spa_open_details').click();
    await expect(page.getByTestId('workflow-layer4-session-status')).toHaveText('ACTIVE');
    await expect(page.getByTestId('workflow-layer4-place')).toHaveText('p_spa_details');
    await expect(page.getByTestId('workflow-latest-receipt-verdict')).toHaveText('COMMITTED');
    await expect(page.getByTestId('workflow-layer4-step-count')).toHaveText('1');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');
    const firstReceiptHash = await page.getByTestId('workflow-latest-receipt-hash').textContent();
    expect(firstReceiptHash).toMatch(/^[0-9a-f]{64}$/);

    await page.getByTestId('workflow-fire-t_spa_back_overview').click();
    await expect(page.getByTestId('workflow-layer4-place')).toHaveText('p_spa_overview');
    await expect(page.getByTestId('workflow-layer4-step-count')).toHaveText('2');
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');

    await page.getByTestId('workflow-fire-t_spa_invalid_unmapped').click();
    await expect(page.getByTestId('workflow-layer4-session-status')).toHaveText('ERROR_MODAL');
    await expect(page.getByTestId('workflow-layer4-place')).toHaveText('p_error_modal');
    await expect(page.getByTestId('workflow-latest-receipt-verdict')).toHaveText(/EXCEPTION|TrappedToErrorModal/);
    await expect(page.getByTestId('spa-workflow-error')).toBeVisible();
    await expect(page.getByTestId('spa-workflow-error')).toContainText('p_error_modal');
    await expect(page.getByTestId('spa-workflow-error')).toContainText('Recover to Overview');
    await expect(page.getByTestId('workflow-fire-t_spa_open_details')).toBeDisabled();
    await expect(page.getByTestId('workflow-fire-t_spa_recover_overview')).toBeEnabled();

    const activeSessionId = await page.evaluate(() => window.__lab.workflow.state().layer4Session.sessionId);
    const blockedNormalFire = await request.post('/api/test-runs/navigation/fire', {
      data: {
        netId: 'spa-test-target-net',
        sessionId: activeSessionId,
        transitionId: 't_spa_open_details',
        requestId: 'e2e_blocked_normal_while_trapped'
      }
    });
    expect(blockedNormalFire.status()).toBe(409);
    const blockedBody = await blockedNormalFire.json();
    expect(blockedBody.requiresRecovery).toBe(true);

    await page.getByTestId('workflow-fire-t_spa_recover_overview').click();
    await expect(page.getByTestId('workflow-layer4-session-status')).toHaveText('ACTIVE');
    await expect(page.getByTestId('workflow-layer4-place')).toHaveText('p_spa_overview');
    await expect(page.getByTestId('spa-workflow-error')).toBeHidden();
    await expect(page.getByTestId('workflow-fire-t_spa_open_details')).toBeEnabled();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_overview');

    await page.getByTestId('workflow-tab-step-evidence').click();
    await page.getByTestId('workflow-rec-start').click();
    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    await expect(appRoot).toHaveAttribute('data-place-id', 'p_spa_details');

    const saveRespPromise = page.waitForResponse(
      (res) => res.url().endsWith('/api/test-runs') && res.request().method() === 'POST'
    );
    await page.getByTestId('workflow-rec-stop').click();
    const saveResp = await saveRespPromise;
    expect([200, 201]).toContain(saveResp.status());
    const savedBody = await saveResp.json();

    const linkRespPromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs/navigation/link') && res.request().method() === 'POST'
    );
    await page.getByTestId('workflow-link-layer4-run').click();
    const linkResp = await linkRespPromise;
    expect([200, 201]).toContain(linkResp.status());

    await expect(page.getByTestId('workflow-nav-link-handle')).toHaveText(`nav_run_link_${savedBody.hash}`);
    const linkHashText = await page.getByTestId('workflow-nav-link-hash').textContent();
    expect(linkHashText).toMatch(/^[0-9a-f]{64}$/);

    const resolvedLinkRes = await request.get(`/api/test-runs/navigation/link?runHash=${savedBody.hash}`);
    expect(resolvedLinkRes.status()).toBe(200);
    const resolvedLinkBody = await resolvedLinkRes.json();
    expect(resolvedLinkBody.verified).toBe(true);
    expect(resolvedLinkBody.link.targetNetMCardHash).toBe(netHashText);
    expect(resolvedLinkBody.receipts.length).toBe(4);

    const workbenchReplay = await workbenchNetTracer.replay();
    expect(workbenchReplay.ok).toBe(true);
    expect(workbenchReplay.firedTransitionIds).toContain('t_req_post_nav_session');
    expect(workbenchReplay.firedTransitionIds).toContain('t_ok_post_nav_session');
    expect(workbenchReplay.firedTransitionIds).toContain('t_req_post_nav_fire');
    expect(workbenchReplay.firedTransitionIds).toContain('t_ok_post_nav_fire');
    expect(workbenchReplay.firedTransitionIds).toContain('t_req_post_nav_link');
    expect(workbenchReplay.firedTransitionIds).toContain('t_ok_post_nav_link');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc05-wb-trace-'));
    const traceStorage = new CanonicalTriadBackend(path.join(tmpDir, 'trace.db'));
    try {
      const wbEnvelope = loadNetEnvelope(path.resolve(process.cwd(), 'src/net/workbench-net.yaml'));
      const persistedTrace = await persistWorkbenchTraceToTriad(
        traceStorage,
        wbEnvelope,
        workbenchNetTracer.getTrace()
      );
      expect(persistedTrace.firingRecordCount).toBe(workbenchReplay.firedTransitionIds.length);
      const reloadedTrace = traceStorage.get(persistedTrace.traceMCardHash);
      expect(reloadedTrace.verified).toBe(true);
      const parsedTrace = JSON.parse(reloadedTrace.content);
      expect(parsedTrace.workbenchNetMCardHash).toBe(persistedTrace.workbenchNetMCardHash);
      expect(parsedTrace.firingRecords.map((r) => r.transitionId)).toEqual(workbenchReplay.firedTransitionIds);
    } finally {
      traceStorage.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    expect(dialogs).toEqual([]);
  });

  test('GQC-05-E2E-02: submitting the same transition twice for one session keeps marking and receipt sequence consistent without double-commit', async ({
    isolatedLabPage,
    workbench,
    workbenchNetTracer
  }) => {
    const { page, dialogs } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    await page.getByTestId('workflow-tab-step-transitions').click();

    const firstFirePromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs/navigation/fire') && res.request().method() === 'POST'
    );
    await page.getByTestId('workflow-fire-t_spa_open_details').click();
    const firstFireRes = await firstFirePromise;
    expect(firstFireRes.status()).toBe(200);
    const firstFireBody = await firstFireRes.json();
    expect(firstFireBody.deduplicated).toBe(false);

    await expect(page.getByTestId('workflow-layer4-place')).toHaveText('p_spa_details');
    await expect(page.getByTestId('workflow-layer4-step-count')).toHaveText('1');
    await expect(page.getByTestId('workflow-layer4-receipt-count')).toHaveText('1');
    const markingHash1 = await page.getByTestId('workflow-layer4-marking-hash').textContent();
    const receiptHash1 = await page.getByTestId('workflow-latest-receipt-hash').textContent();

    const duplicateFirePromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs/navigation/fire') && res.request().method() === 'POST'
    );
    await page.getByTestId('workflow-replay-last-request').click();
    const duplicateFireRes = await duplicateFirePromise;
    expect(duplicateFireRes.status()).toBe(200);
    const duplicateFireBody = await duplicateFireRes.json();
    expect(duplicateFireBody.deduplicated).toBe(true);
    expect(duplicateFireBody.receipt.receiptHash).toBe(receiptHash1);
    expect(duplicateFireBody.latestMarkingHash).toBe(markingHash1);
    expect(duplicateFireBody.stepCount).toBe(1);

    await expect(page.getByTestId('workflow-layer4-place')).toHaveText('p_spa_details');
    await expect(page.getByTestId('workflow-layer4-step-count')).toHaveText('1');
    await expect(page.getByTestId('workflow-layer4-receipt-count')).toHaveText('1');
    await expect(page.getByTestId('workflow-layer4-marking-hash')).toHaveText(markingHash1);
    await expect(page.getByTestId('workflow-latest-receipt-hash')).toHaveText(receiptHash1);

    const workbenchReplay = await workbenchNetTracer.replay();
    expect(workbenchReplay.ok).toBe(true);
    expect(dialogs).toEqual([]);
  });
});
