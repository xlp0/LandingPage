import { test, expect } from '@playwright/test';

const LAB_URL = '/responsive-lab.html';
const SAME_ORIGIN_TARGET = '/tests/fixtures/probe-target.html';
const CROSS_ORIGIN_TARGET = 'http://127.0.0.1:3001/tests/fixtures/probe-target.html';
const NO_AGENT_TARGET = 'http://127.0.0.1:3001/tests/fixtures/probe-target-noagent.html';

test.describe('SPRINT-ERB-02: Target Membrane Interceptor & Spatial Normalization', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1000 });
  });

  test('C1: Same-origin spatial normalization scale-free at corners and center', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(SAME_ORIGIN_TARGET)}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Start recording
    await page.locator('#btn-rec-start').click();

    const iframe = page.frameLocator('#mission-control-iframe');
    await iframe.locator('[data-testid="target-top-left"]').click();
    await iframe.locator('[data-testid="target-top-right"]').click();
    await iframe.locator('[data-testid="target-bottom-left"]').click();
    await iframe.locator('[data-testid="target-bottom-right"]').click();
    await iframe.locator('[data-testid="target-center"]').click();
    await page.waitForTimeout(300);

    await page.locator('#btn-rec-stop').click();

    const snapshot = await page.evaluate(() => window.__lab.recorder.snapshot());
    const pointerEvents = snapshot.filter((e) => e.type === 'pointer');
    expect(pointerEvents.length).toBe(5);

    // Corner / Center coordinates within tolerance
    expect(pointerEvents[0].coords.nx).toBeLessThan(0.08);
    expect(pointerEvents[0].coords.ny).toBeLessThan(0.08);

    expect(pointerEvents[1].coords.nx).toBeGreaterThan(0.92);
    expect(pointerEvents[1].coords.ny).toBeLessThan(0.08);

    expect(pointerEvents[2].coords.nx).toBeLessThan(0.08);
    expect(pointerEvents[2].coords.ny).toBeGreaterThan(0.92);

    expect(pointerEvents[3].coords.nx).toBeGreaterThan(0.92);
    expect(pointerEvents[3].coords.ny).toBeGreaterThan(0.92);

    expect(pointerEvents[4].coords.nx).toBeCloseTo(0.5, 1);
    expect(pointerEvents[4].coords.ny).toBeCloseTo(0.5, 1);
  });

  test('C2: Rotation pushes orientation_change marker with swapped dimensions', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(SAME_ORIGIN_TARGET)}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    await page.locator('#btn-orient-vertical').click();
    await page.locator('#btn-size-mobile').click();
    await page.waitForTimeout(300);

    await page.locator('#btn-rec-start').click();
    await page.locator('#btn-rotate-viewport').click();
    await page.waitForTimeout(300);
    await page.locator('#btn-rec-stop').click();

    const snapshot = await page.evaluate(() => window.__lab.recorder.snapshot());
    const orientEvents = snapshot.filter((e) => e.type === 'orientation_change');
    expect(orientEvents.length).toBeGreaterThanOrEqual(1);
    expect(orientEvents[0].viewport.orientation).toBe('landscape');
  });

  test('C3: Privacy rule INV-PRV-01 redacts password input values', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(SAME_ORIGIN_TARGET)}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    await page.locator('#btn-rec-start').click();

    const iframe = page.frameLocator('#mission-control-iframe');
    await iframe.locator('[data-testid="pwd-input"]').fill('super-secret-password');
    await iframe.locator('[data-testid="text-input"]').fill('public-text');
    await page.waitForTimeout(300);

    await page.locator('#btn-rec-stop').click();

    const snapshot = await page.evaluate(() => window.__lab.recorder.snapshot());
    const inputEvents = snapshot.filter((e) => e.type === 'input');
    expect(inputEvents.length).toBeGreaterThanOrEqual(2);

    const pwdEvent = inputEvents.find((e) => e.target.selector.includes('pwd'));
    expect(pwdEvent).toBeDefined();
    expect(pwdEvent.value).toBe('<redacted>');

    const txtEvent = inputEvents.find((e) => e.target.selector.includes('txt'));
    expect(txtEvent).toBeDefined();
    expect(txtEvent.value).toBe('public-text');
  });

  test('C4: Cross-origin target connects via probe-agent source and records normalized events', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(CROSS_ORIGIN_TARGET)}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    const sourceKind = await page.evaluate(() => window.__lab.recorder.source()?.kind);
    expect(sourceKind).toBe('probe-agent');

    await page.locator('#btn-rec-start').click();
    const iframe = page.frameLocator('#mission-control-iframe');
    await iframe.locator('[data-testid="target-center"]').click();
    await page.waitForTimeout(400);
    await page.locator('#btn-rec-stop').click();

    const snapshot = await page.evaluate(() => window.__lab.recorder.snapshot());
    const pointerEvents = snapshot.filter((e) => e.type === 'pointer');
    expect(pointerEvents.length).toBe(1);
    expect(pointerEvents[0].coords.nx).toBeCloseTo(0.5, 1);
    expect(pointerEvents[0].coords.ny).toBeCloseTo(0.5, 1);
  });

  test('C5: Forged or stale cross-origin messages are dropped and counted in rejectReasons', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(CROSS_ORIGIN_TARGET)}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Inject unauthorized postMessage with wrong nonce or origin
    await page.evaluate(() => {
      window.postMessage(
        {
          schema: 'lab-capture/v1',
          type: 'lab:event',
          nonce: 'invalid_forged_nonce',
          payload: { type: 'pointer' }
        },
        '*'
      );
    });
    await page.waitForTimeout(200);

    const stats = await page.evaluate(() => window.__lab.recorder.stats());
    expect(stats.rejected).toBeGreaterThanOrEqual(1);
  });

  test('C6: Cross-origin target without probe agent sets source to unavailable and disables Start', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(NO_AGENT_TARGET)}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    const sourceKind = await page.evaluate(() => window.__lab.recorder.source()?.kind);
    expect(sourceKind).toBe('unavailable');

    const isStartDisabled = await page.locator('#btn-rec-start').isDisabled();
    expect(isStartDisabled).toBe(true);
  });

  test('C7: Lifecycle transitions pause/resume correctly excludes paused intervals', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(SAME_ORIGIN_TARGET)}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    const iframe = page.frameLocator('#mission-control-iframe');

    // 1. Start -> 2 clicks
    await page.locator('#btn-rec-start').click();
    await iframe.locator('[data-testid="target-center"]').click();
    await iframe.locator('[data-testid="target-center"]').click();
    await page.waitForTimeout(200);

    // 2. Pause -> 1 click (ignored by recorder)
    await page.locator('#btn-rec-pause').click();
    await page.waitForTimeout(500); // 500ms paused interval
    await iframe.locator('[data-testid="target-center"]').click();
    await page.waitForTimeout(200);

    // 3. Resume -> 1 click
    await page.locator('#btn-rec-resume').click();
    await iframe.locator('[data-testid="target-center"]').click();
    await page.waitForTimeout(200);

    // 4. Stop
    await page.locator('#btn-rec-stop').click();

    const snapshot = await page.evaluate(() => window.__lab.recorder.snapshot());
    const pointerEvents = snapshot.filter((e) => e.type === 'pointer');
    // Only 3 clicks recorded (2 before pause + 1 after resume)
    expect(pointerEvents.length).toBe(3);

    const state = await page.evaluate(() => window.__lab.recorder.state());
    expect(state).toBe('FINALIZED');
  });

  test('C8: Touch ergonomics audits undersized tap targets (< 44px) on coarse pointers only', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(SAME_ORIGIN_TARGET)}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    const iframe = page.frameLocator('#mission-control-iframe');

    // Test with iPhone 16 Pro (coarse pointer)
    await page.locator('#btn-size-mobile').click();
    await page.waitForTimeout(300);

    await page.locator('#btn-rec-start').click();
    await iframe.locator('[data-testid="btn-small"]').click(); // 20x20
    await iframe.locator('[data-testid="btn-large"]').click(); // 48x48
    await page.waitForTimeout(300);
    await page.locator('#btn-rec-stop').click();

    let stats = await page.evaluate(() => window.__lab.recorder.stats());
    expect(stats.undersizedTaps).toBe(1);

    // Test with Desktop FHD (fine pointer)
    await page.locator('#btn-size-desktop').click();
    await page.waitForTimeout(300);

    await page.locator('#btn-rec-start').click();
    await iframe.locator('[data-testid="btn-small"]').click(); // 20x20
    await iframe.locator('[data-testid="btn-large"]').click(); // 48x48
    await page.waitForTimeout(300);
    await page.locator('#btn-rec-stop').click();

    stats = await page.evaluate(() => window.__lab.recorder.stats());
    // Undersized taps on desktop pointer:fine are NOT flagged
    expect(stats.undersizedTaps).toBe(0);
  });
});
