import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNetEnvelope, replayNetTrace } from '../../scripts/check-net.mjs';
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

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKBENCH_NET_ABS_PATH = path.resolve(SPEC_DIR, '../../src/net/workbench-net.yaml');

test.describe('SPRINT-GQC-03: Target Policy Enforcement & Capture Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
  });

  test('GQC-03-E2E-01: approved same-origin target aligns registry chips, selector, iframe, policy badge, and capture source', async ({ page, request }) => {
    const cfgRes = await request.get('/app-config.json');
    expect(cfgRes.status()).toBe(200);
    const cfg = await cfgRes.json();
    const expectedQuickUrls = cfg.labTargets.filter((t) => t.quickLaunch && t.status === 'allowed').map((t) => t.url);

    await page.goto(LAB_URL);
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);

    const renderedChipUrls = await page.locator('#target-quick-chips .target-chip').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-url'))
    );
    expect(renderedChipUrls).toEqual(expectedQuickUrls);

    await page.locator('#target-quick-chips .target-chip[data-url="/tests/fixtures/spa-test-target.html"]').click();

    await expect(page.locator('#public-site-selector')).toHaveValue('/tests/fixtures/spa-test-target.html');
    await expect(page.locator('#mission-control-iframe')).toHaveAttribute('src', '/tests/fixtures/spa-test-target.html');
    await expect(page.locator('#target-type-badge')).toHaveText('Type: spa');
    await expect(page.locator('#target-policy-status')).toHaveAttribute('data-policy-state', 'approved-same-origin');
    await expect(page.locator('#rec-source-pill')).toHaveText('Source: same-origin');
    await expect(page.locator('#btn-rec-start')).toBeEnabled();
  });

  test('GQC-03-E2E-02: forged origin and stale nonce probe messages are rejected and counted without entering snapshot', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(CROSS_ORIGIN_TARGET)}`);
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.source()?.kind)).toBe('probe-agent');

    await page.locator('#btn-rec-start').click();
    const firstNonce = await page.evaluate(() => window.__lab.recorder.source()?._currentNonce);
    expect(typeof firstNonce).toBe('string');

    await page.locator('#btn-rec-stop').click();
    await page.locator('#btn-rec-start').click();
    const secondNonce = await page.evaluate(() => window.__lab.recorder.source()?._currentNonce);
    expect(secondNonce).not.toBe(firstNonce);

    await page.evaluate((staleNonce) => {
      window.postMessage(
        {
          schema: 'lab-capture/v1',
          type: 'lab:hello'
        },
        '*'
      );
      window.postMessage(
        {
          schema: 'lab-capture/v1',
          type: 'lab:event',
          nonce: staleNonce,
          payload: { type: 'pointer', coords: { nx: 0.25, ny: 0.25 } }
        },
        '*'
      );
    }, firstNonce);

    await page.waitForTimeout(150);

    const report = await page.evaluate(() => ({
      stats: window.__lab.recorder.stats(),
      snapshot: window.__lab.recorder.snapshot()
    }));

    expect(report.stats.rejected).toBeGreaterThanOrEqual(2);
    expect(report.snapshot.filter((e) => e.type === 'pointer').length).toBe(0);
    await page.locator('#btn-rec-stop').click();
  });

  test('GQC-03-E2E-03: sensitive password input is redacted in persisted MCard test run', async ({ page, request }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(SAME_ORIGIN_TARGET)}`);
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);

    await page.locator('#btn-rec-start').click();

    const iframe = page.frameLocator('#mission-control-iframe');
    await iframe.locator('[data-testid="pwd-input"]').fill('top-secret-credential-42');
    await iframe.locator('[data-testid="text-input"]').fill('safe-public-note');

    const savePromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
    );
    await page.locator('#btn-rec-stop').click();
    const saveRes = await savePromise;
    expect([200, 201]).toContain(saveRes.status());
    const savedMeta = await saveRes.json();

    const storedRes = await request.get(`/api/test-runs/${savedMeta.hash}`);
    expect(storedRes.status()).toBe(200);
    const storedEnvelope = await storedRes.json();
    expect(storedEnvelope.verified).toBe(true);
    const storedRun = storedEnvelope.run;

    const rawSerialized = JSON.stringify(storedRun);
    expect(rawSerialized.includes('top-secret-credential-42')).toBe(false);

    const pwdEvent = storedRun.events.find((e) => e.type === 'input' && e.target?.selector?.includes('pwd'));
    const txtEvent = storedRun.events.find((e) => e.type === 'input' && e.target?.selector?.includes('txt'));
    expect(pwdEvent?.value).toBe('<redacted>');
    expect(txtEvent?.value).toBe('safe-public-note');
  });

  test('GQC-03-E2E-04: approved cross-origin target without probe agent hits bounded 5s timeout with recovery UI and valid Petri net recover trace', async ({ page }) => {
    const workbenchNet = loadNetEnvelope(WORKBENCH_NET_ABS_PATH);

    await page.goto(`${LAB_URL}?target=${encodeURIComponent(NO_AGENT_TARGET)}`);
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);

    await expect(page.locator('#cors-block-alert')).toBeHidden();
    await expect(page.locator('#btn-rec-start')).toBeDisabled();
    await expect(page.locator('#target-type-badge')).toHaveText('Type: probe-fixture');

    await expect(page.locator('#target-policy-status')).toHaveAttribute('data-policy-state', 'handshake-timeout', {
      timeout: 7500
    });
    await expect(page.locator('#cors-block-alert')).toBeHidden();
    await expect(page.locator('#btn-target-recover')).toBeVisible();

    const timerCleared = await page.evaluate(() => {
      const src = window.__lab.recorder.source();
      return src?._pingTimer === null && src?._handshakeTimer === null && src?.timedOut === true;
    });
    expect(timerCleared).toBe(true);

    await page.locator('#btn-target-recover').click();

    await expect(page.locator('#public-site-selector')).toHaveValue('app.html');
    await expect(page.locator('#target-policy-status')).toHaveAttribute('data-policy-state', 'approved-same-origin');
    await expect(page.locator('#rec-source-pill')).toHaveText('Source: same-origin');
    await expect(page.locator('#btn-rec-start')).toBeEnabled();

    const traceEvents = await page.evaluate(() => window.__lab.policy.trace());
    expect(traceEvents.some((e) => e.transitionId === 't_fail_probe_handshake_timeout')).toBe(true);
    expect(traceEvents.some((e) => e.transitionId === 't_recover_handshake_timeout')).toBe(true);

    const replay = await replayNetTrace(workbenchNet, {
      traceId: 'e2e-04-handshake-timeout-recover',
      entryPlaceId: 'p_page_responsive_lab',
      events: traceEvents
    });
    expect(replay.ok).toBe(true);
    expect(replay.finalPlaceId).toBe('p_page_responsive_lab');
  });

  test('GQC-03-E2E-05: redirecting an instrumented target to an unapproved origin during recording stops capture and excludes redirected events', async ({ page, request }) => {
    await page.context().route('http://127.0.0.1:39999/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><html><body>
          <button id="unapproved-btn">Unapproved</button>
          <script>
            window.parent.postMessage({ schema: 'lab-capture/v1', type: 'lab:hello' }, '*');
            window.parent.postMessage({
              schema: 'lab-capture/v1',
              type: 'lab:event',
              nonce: 'redirect_forged',
              payload: { type: 'pointer', target: { selector: '#unapproved-btn', tag: 'button' }, coords: { nx: 0.9, ny: 0.9 } }
            }, '*');
          </script>
        </body></html>`
      });
    });

    await page.goto(`${LAB_URL}?target=${encodeURIComponent(CROSS_ORIGIN_TARGET)}`);
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.source()?.kind)).toBe('probe-agent');

    await page.locator('#btn-rec-start').click();
    const iframe = page.frameLocator('#mission-control-iframe');
    await iframe.locator('[data-testid="target-center"]').click();
    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.snapshot().filter((e) => e.type === 'pointer').length)).toBe(1);

    const savePromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
    );

    await page.evaluate(() => {
      const f = document.getElementById('mission-control-iframe');
      f.src = 'http://127.0.0.1:39999/unapproved.html';
    });

    const saveRes = await savePromise;
    expect([200, 201]).toContain(saveRes.status());
    const savedMeta = await saveRes.json();

    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.state())).toBe('FINALIZED');
    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.source()?.kind)).toBe('unavailable');

    const storedRes = await request.get(`/api/test-runs/${savedMeta.hash}`);
    expect(storedRes.status()).toBe(200);
    const storedEnvelope = await storedRes.json();
    expect(storedEnvelope.verified).toBe(true);
    const storedRun = storedEnvelope.run;

    expect(storedRun.target.url).toBe(CROSS_ORIGIN_TARGET);
    expect(storedRun.events.filter((ev) => ev.type === 'pointer').length).toBe(1);
    expect(storedRun.events.some((ev) => ev.target?.selector === '#unapproved-btn')).toBe(false);
  });

  test('GQC-03-E2E-06: switching targets while a probe message is in flight fences out late events from the new target run', async ({ page }) => {
    await page.goto(`${LAB_URL}?target=${encodeURIComponent(CROSS_ORIGIN_TARGET)}`);
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.source()?.kind)).toBe('probe-agent');

    await page.locator('#btn-rec-start').click();
    const iframe = page.frameLocator('#mission-control-iframe');
    await iframe.locator('[data-testid="target-top-left"]').click();
    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.snapshot().length)).toBe(1);

    await page.evaluate(() => {
      const oldSource = window.__lab.recorder.source();
      const oldNonce = oldSource?._currentNonce;
      const oldWin = document.getElementById('mission-control-iframe')?.contentWindow;
      window.__lab.target.set('/tests/fixtures/spa-test-target.html');
      window.postMessage(
        {
          schema: 'lab-capture/v1',
          type: 'lab:event',
          nonce: oldNonce,
          payload: { type: 'pointer', target: { selector: '#late-stale-event', tag: 'button' }, coords: { nx: 0.8, ny: 0.8 } }
        },
        '*'
      );
      if (oldSource && typeof oldSource._handleMessage === 'function') {
        oldSource._handleMessage({
          origin: 'http://127.0.0.1:3001',
          source: oldWin,
          data: {
            schema: 'lab-capture/v1',
            type: 'lab:event',
            nonce: oldNonce,
            payload: { type: 'pointer', target: { selector: '#late-direct-stale', tag: 'button' }, coords: { nx: 0.8, ny: 0.8 } }
          }
        });
      }
    });

    await expect(page.locator('#rec-source-pill')).toHaveText('Source: same-origin');
    const oldStateAfterSwitch = await page.evaluate(() => ({
      state: window.__lab.recorder.state(),
      events: window.__lab.recorder.snapshot()
    }));
    expect(oldStateAfterSwitch.state).toBe('FINALIZED');
    expect(oldStateAfterSwitch.events.some((e) => e.target?.selector?.includes('late'))).toBe(false);

    await page.locator('#btn-rec-start').click();
    const newRunSnapshot = await page.evaluate(() => window.__lab.recorder.snapshot());
    expect(newRunSnapshot.length).toBe(0);
    await page.locator('#btn-rec-stop').click();
  });

  test('GQC-03-E2E-07: loads Responsive Lab under tightened CSP, hydrates all 6 islands, and records zero CSP violations', async ({ page }) => {
    const consoleCspErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /Content Security Policy|CSP/i.test(msg.text())) {
        consoleCspErrors.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        window.__cspViolations.push({
          blockedURI: e.blockedURI,
          violatedDirective: e.violatedDirective,
          effectiveDirective: e.effectiveDirective
        });
      });
    });

    const mainRes = await page.goto(LAB_URL);
    expect(mainRes.status()).toBe(200);
    const cspHeader = mainRes.headers()['content-security-policy'] || '';
    expect(cspHeader).toContain("default-src 'self'");
    expect(cspHeader.includes('frame-src *;')).toBe(false);

    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);

    await page.locator('#conformance-disclosure > summary').click();
    await page.locator('#mcard-result-disclosure > summary').click();

    await expect(page.locator('astro-island')).toHaveCount(7);
    await expect.poll(async () =>
      page.locator('astro-island').evaluateAll((els) => els.every((el) => !el.hasAttribute('ssr')))
    ).toBe(true);

    await page.locator('#public-site-selector').selectOption('https://github.com');
    await expect(page.locator('#cors-block-alert')).toBeVisible();
    await page.locator('#btn-target-recover').click();
    await expect(page.locator('#cors-block-alert')).toBeHidden();

    const domViolations = await page.evaluate(() => window.__cspViolations);
    expect(domViolations).toEqual([]);
    expect(consoleCspErrors).toEqual([]);
  });

  test('GQC-03-E2E-08: mounting and unmounting RecordingRibbonIsland 50 times returns capture sources, listeners, and timers to baseline', async ({ page }) => {
    await page.addInitScript(() => {
      const activeIntervals = new Set();
      const activeTimeouts = new Set();
      let winListeners = 0;
      let docListeners = 0;

      const origSetInterval = window.setInterval.bind(window);
      const origClearInterval = window.clearInterval.bind(window);
      window.setInterval = (...args) => {
        const id = origSetInterval(...args);
        activeIntervals.add(id);
        return id;
      };
      window.clearInterval = (id) => {
        activeIntervals.delete(id);
        return origClearInterval(id);
      };

      const origSetTimeout = window.setTimeout.bind(window);
      const origClearTimeout = window.clearTimeout.bind(window);
      window.setTimeout = (fn, delay, ...rest) => {
        let id = null;
        const wrapped = (...cbArgs) => {
          activeTimeouts.delete(id);
          return typeof fn === 'function' ? fn(...cbArgs) : undefined;
        };
        id = origSetTimeout(wrapped, delay, ...rest);
        activeTimeouts.add(id);
        return id;
      };
      window.clearTimeout = (id) => {
        activeTimeouts.delete(id);
        return origClearTimeout(id);
      };

      const origWinAdd = window.addEventListener.bind(window);
      const origWinRem = window.removeEventListener.bind(window);
      window.addEventListener = (t, fn, opts) => {
        winListeners += 1;
        return origWinAdd(t, fn, opts);
      };
      window.removeEventListener = (t, fn, opts) => {
        winListeners -= 1;
        return origWinRem(t, fn, opts);
      };

      const origDocAdd = document.addEventListener.bind(document);
      const origDocRem = document.removeEventListener.bind(document);
      document.addEventListener = (t, fn, opts) => {
        docListeners += 1;
        return origDocAdd(t, fn, opts);
      };
      document.removeEventListener = (t, fn, opts) => {
        docListeners -= 1;
        return origDocRem(t, fn, opts);
      };

      window.__gqc03CycleAudit = () => ({
        winListeners,
        docListeners,
        activeIntervals: activeIntervals.size,
        activeTimeouts: activeTimeouts.size,
        sourceKind: window.__lab?.recorder?.source()?.kind ?? null
      });
    });

    await page.goto(`${LAB_URL}?target=${encodeURIComponent(CROSS_ORIGIN_TARGET)}`);
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.source()?.kind)).toBe('probe-agent');

    const audit = await page.evaluate(async () => {
      const ribbonIsland = document.querySelector('astro-island:has(#lab-recording-ribbon)') ||
        [...document.querySelectorAll('astro-island')].find((el) => el.getAttribute('component-url')?.includes('RecordingRibbonIsland'));

      const baseline = window.__gqc03CycleAudit();
      let midUnmountSnapshot = null;

      for (let i = 0; i < 50; i += 1) {
        ribbonIsland.dispatchEvent(new CustomEvent('astro:unmount'));
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
        if (i === 24) {
          midUnmountSnapshot = window.__gqc03CycleAudit();
        }
        ribbonIsland.setAttribute('ssr', '');
        ribbonIsland.setAttribute('client', 'only');
        await ribbonIsland.hydrate();
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      }

      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      return {
        baseline,
        midUnmountSnapshot,
        after50: window.__gqc03CycleAudit()
      };
    });

    expect(audit.midUnmountSnapshot.sourceKind).toBe(null);
    expect(audit.midUnmountSnapshot.activeIntervals).toBe(0);
    expect(audit.midUnmountSnapshot.activeTimeouts).toBe(0);

    await expect.poll(async () => page.evaluate(() => window.__lab.recorder.source()?.kind)).toBe('probe-agent');

    const settled = await page.evaluate(() => window.__gqc03CycleAudit());
    expect(settled.winListeners).toBe(audit.baseline.winListeners);
    expect(settled.docListeners).toBe(audit.baseline.docListeners);
    expect(settled.activeIntervals).toBe(0);
    expect(settled.activeTimeouts).toBe(0);
  });
});
