/**
 * Responsive Deterministic Replay Test Suite (SPRINT-ERB-04 §4.2, §4.3, §4.4)
 * Replays recorded test runs in Playwright contexts, enforcing parity checks
 * and minting replay result records.
 */

import { test, expect } from '@playwright/test';
import { replayRun } from '../../scripts/playwright-replay-driver.mjs';
import { toPlaywrightContext } from '../fixtures/device-matrix.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';
import { TEST_RUN_SCHEMA } from '../../js/harness/test-run-schema.js';

test.describe.configure({ retries: 0 });

const BASE_URL = 'http://localhost:3001';
const TARGET_URL = process.env.TARGET_URL || `${BASE_URL}/app.html`;

test.describe('SPRINT-ERB-04: Deterministic Playwright Replay Driver', () => {
  const phoneDevice = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');

  test('R1: Record -> Save -> Replay round-trip on app.html with verdict: pass at Tier 1', async ({ browser, request }) => {
    await ensureTargetReachable(request, TARGET_URL);

    // 1. Create a synthetic valid test run on app.html with interactions
    const syntheticRun = {
      schema: TEST_RUN_SCHEMA,
      sessionId: `tr_replay_roundtrip_${Date.now()}`,
      target: { url: TARGET_URL, slug: 'app-html' },
      captureSource: 'same-origin',
      device: phoneDevice,
      orientation: 'portrait',
      fidelity: {
        tier: 0,
        runner: 'lab-iframe',
        emulated: ['viewport'],
        notEmulated: ['pixelRatio', 'hasTouch', 'pointer', 'hover', 'isMobile', 'safeAreaInsets']
      },
      lab: { commit: '6f9a53a', clmKernel: '0.0.9' },
      metrics: {
        startedAt: new Date().toISOString(),
        activeDurationMs: 2500,
        eventCount: 3,
        droppedCount: 0,
        rejectedMessages: 0
      },
      telemetry: {
        overflow: { hasHorizontalOverflow: false, elements: [] },
        frames: { avgFps: 60.0, maxFrameMs: 16.6, droppedFrames: 0 },
        cls: 0,
        tapTargetViolations: 0
      },
      finalState: { url: TARGET_URL, domDigest: 'blake3:placeholder' },
      events: [
        {
          seq: 1,
          t_rel_ms: 100,
          type: 'viewport_change',
          viewport: { w: 393, h: 852, dpr: 3, orientation: 'portrait' }
        },
        {
          seq: 2,
          t_rel_ms: 350,
          type: 'pointer',
          pointer: { pointerType: 'touch' },
          target: { selector: 'body' },
          viewport: { w: 393, h: 852, dpr: 3, orientation: 'portrait' },
          coords: { nx: 0.5, ny: 0.5 }
        },
        {
          seq: 3,
          t_rel_ms: 600,
          type: 'scroll',
          scroll: { x: 0, y: 100, docW: 393, docH: 1200 },
          viewport: { w: 393, h: 852, dpr: 3, orientation: 'portrait' }
        }
      ]
    };

    // 2. Save via REST API
    const saveRes = await request.post(`${BASE_URL}/api/test-runs`, {
      data: syntheticRun
    });
    expect(saveRes.ok()).toBe(true);
    const savedBody = await saveRes.json();
    syntheticRun.hash = savedBody.hash;

    // 3. Replay in fresh emulated Playwright context (Tier 1)
    const contextOptions = toPlaywrightContext(phoneDevice, 'portrait');
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
      await page.goto(TARGET_URL);
      await page.waitForLoadState('domcontentloaded');

      const replayResult = await replayRun(page, syntheticRun, {
        mode: 'deterministic',
        serverOrigin: BASE_URL,
        mintResult: true
      });

      expect(replayResult.verdict).toBe('pass');
      expect(replayResult.fidelity.tier).toBe(1);
      expect(replayResult.fidelity.runner).toBe('playwright');
      expect(replayResult.counts.replayed).toBeGreaterThanOrEqual(2);
      expect(replayResult.checks.finalUrl).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('R2: Paced replay mode respects speed multipliers (1x, 2x, 5x) and records speed', async ({ browser, request }) => {
    await ensureTargetReachable(request, TARGET_URL);

    const timedRun = {
      schema: TEST_RUN_SCHEMA,
      sessionId: `tr_paced_${Date.now()}`,
      target: { url: TARGET_URL, slug: 'app-html' },
      captureSource: 'same-origin',
      device: phoneDevice,
      orientation: 'portrait',
      fidelity: { tier: 0, runner: 'lab-iframe', emulated: ['viewport'], notEmulated: [] },
      lab: { commit: '6f9a53a', clmKernel: '0.0.9' },
      metrics: {
        startedAt: new Date().toISOString(),
        activeDurationMs: 1500,
        eventCount: 2,
        droppedCount: 0,
        rejectedMessages: 0
      },
      telemetry: {
        overflow: { hasHorizontalOverflow: false, elements: [] },
        frames: { avgFps: 60.0, maxFrameMs: 16.6, droppedFrames: 0 },
        cls: 0,
        tapTargetViolations: 0
      },
      finalState: { url: TARGET_URL, domDigest: 'blake3:placeholder' },
      events: [
        {
          seq: 1,
          t_rel_ms: 100,
          type: 'pointer',
          pointer: { pointerType: 'touch' },
          target: { selector: 'body' },
          coords: { nx: 0.5, ny: 0.5 }
        },
        {
          seq: 2,
          t_rel_ms: 300,
          type: 'pointer',
          pointer: { pointerType: 'touch' },
          target: { selector: 'body' },
          coords: { nx: 0.5, ny: 0.5 }
        }
      ]
    };

    const context = await browser.newContext(toPlaywrightContext(phoneDevice, 'portrait'));
    const page = await context.newPage();

    try {
      await page.goto(TARGET_URL);
      await page.waitForLoadState('domcontentloaded');

      for (const speed of [1, 2, 5]) {
        const start = Date.now();
        const res = await replayRun(page, timedRun, {
          mode: 'paced',
          speed
        });
        const elapsed = Date.now() - start;

        expect(res.mode).toBe('paced');
        expect(res.speed).toBe(speed);
        expect(res.verdict).toBe('pass');
        // Higher speed finishes quicker or within reasonable bounds
        expect(elapsed).toBeLessThan(2000);
      }
    } finally {
      await context.close();
    }
  });

  test('R3: Fallbacks are counted when element selector is absent and spatial coords used', async ({ browser, request }) => {
    await ensureTargetReachable(request, TARGET_URL);

    const fallbackRun = {
      schema: TEST_RUN_SCHEMA,
      sessionId: `tr_fallback_${Date.now()}`,
      target: { url: TARGET_URL, slug: 'app-html' },
      captureSource: 'same-origin',
      device: phoneDevice,
      orientation: 'portrait',
      fidelity: { tier: 0, runner: 'lab-iframe', emulated: ['viewport'], notEmulated: [] },
      lab: { commit: '6f9a53a', clmKernel: '0.0.9' },
      metrics: {
        startedAt: new Date().toISOString(),
        activeDurationMs: 1000,
        eventCount: 1,
        droppedCount: 0,
        rejectedMessages: 0
      },
      telemetry: {
        overflow: { hasHorizontalOverflow: false, elements: [] },
        frames: { avgFps: 60.0, maxFrameMs: 16.6, droppedFrames: 0 },
        cls: 0,
        tapTargetViolations: 0
      },
      finalState: { url: TARGET_URL, domDigest: 'blake3:placeholder' },
      events: [
        {
          seq: 1,
          t_rel_ms: 100,
          type: 'pointer',
          pointer: { pointerType: 'mouse' },
          target: { selector: '#completely-non-existent-button-xyz' },
          coords: { nx: 0.5, ny: 0.5 }
        }
      ]
    };

    const context = await browser.newContext(toPlaywrightContext(phoneDevice, 'portrait'));
    const page = await context.newPage();

    try {
      await page.goto(TARGET_URL);
      await page.waitForLoadState('domcontentloaded');

      const res = await replayRun(page, fallbackRun, { mode: 'deterministic' });
      expect(res.counts.fallbacks).toBe(1);
      expect(res.checks.fallbackRatio).toBe(1.0);
      // Because fallbackRatio > 0.2, verdict is 'fragile'
      expect(res.verdict).toBe('fragile');
    } finally {
      await context.close();
    }
  });

  test('R4: Result records minted with MINT_RESULTS=1 appear in storage under urn:mcard:replay_result:*', async ({ browser, request }) => {
    await ensureTargetReachable(request, TARGET_URL);

    const runToMint = {
      schema: TEST_RUN_SCHEMA,
      sessionId: `tr_mint_${Date.now()}`,
      target: { url: TARGET_URL, slug: 'app-html' },
      captureSource: 'same-origin',
      device: phoneDevice,
      orientation: 'portrait',
      fidelity: { tier: 0, runner: 'lab-iframe', emulated: ['viewport'], notEmulated: [] },
      lab: { commit: '6f9a53a', clmKernel: '0.0.9' },
      metrics: {
        startedAt: new Date().toISOString(),
        activeDurationMs: 1000,
        eventCount: 1,
        droppedCount: 0,
        rejectedMessages: 0
      },
      telemetry: {
        overflow: { hasHorizontalOverflow: false, elements: [] },
        frames: { avgFps: 60.0, maxFrameMs: 16.6, droppedFrames: 0 },
        cls: 0,
        tapTargetViolations: 0
      },
      finalState: { url: TARGET_URL, domDigest: 'blake3:placeholder' },
      events: [
        {
          seq: 1,
          t_rel_ms: 100,
          type: 'viewport_change',
          viewport: { w: 393, h: 852, dpr: 3, orientation: 'portrait' }
        }
      ]
    };

    const context = await browser.newContext(toPlaywrightContext(phoneDevice, 'portrait'));
    const page = await context.newPage();

    try {
      await page.goto(TARGET_URL);
      await page.waitForLoadState('domcontentloaded');

      const res = await replayRun(page, runToMint, {
        mode: 'deterministic',
        serverOrigin: BASE_URL,
        mintResult: true
      });

      expect(res.mintedHash).toBeDefined();
      expect(res.mintedHandle).toMatch(/^urn:mcard:replay_result:/);

      // Verify the minted card is queryable by hash from /api/test-runs
      const cardRes = await request.get(`${BASE_URL}/api/test-runs/${res.mintedHash}`);
      expect(cardRes.ok()).toBe(true);
      const cardData = await cardRes.json();
      expect(cardData.hash).toBe(res.mintedHash);
      expect(cardData.verified).toBe(true);
    } finally {
      await context.close();
    }
  });
});
