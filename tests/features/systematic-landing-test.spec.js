/**
 * Systematic Multi-Device Sweep Test Suite (SPRINT-ERB-04 §4.1, §4.2)
 * Matrix-driven conformance sweep derived from DeviceRegistry across 16 combinations.
 */

import { test, expect } from '@playwright/test';
import { deviceMatrix, toPlaywrightContext } from '../fixtures/device-matrix.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { runConformance } from '../conformance/runner.js';
import { resolveFidelity } from '../../js/harness/fidelity.js';

test.describe.configure({ retries: 0 });

const RAW_TARGET = process.env.TARGET_URL || 'app.html';
const FAST_MODE = process.env.FAST_MODE === '1';
const KEY_SELECTORS = (process.env.SWEEP_KEY_SELECTORS || 'main,h1')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Summary table tracking
const summaryRows = [];

test.describe('EPIC-SWEEP: Systematic Multi-Device Sweep', () => {
  let resolvedTargetUrl = RAW_TARGET;

  test.beforeAll(async ({ request }) => {
    // If relative, qualify with base URL
    if (!resolvedTargetUrl.startsWith('http://') && !resolvedTargetUrl.startsWith('https://')) {
      resolvedTargetUrl = `http://localhost:3001/${resolvedTargetUrl.replace(/^\//, '')}`;
    }
    await ensureTargetReachable(request, resolvedTargetUrl);
  });

  const orientations = FAST_MODE ? ['portrait'] : ['portrait', 'landscape'];
  const allMatrix = deviceMatrix({ orientations });

  // In FAST_MODE, select first device of each category
  const filteredMatrix = FAST_MODE
    ? (() => {
        const seenCats = new Set();
        return allMatrix.filter(({ profile }) => {
          if (seenCats.has(profile.category)) return false;
          seenCats.add(profile.category);
          return true;
        });
      })()
    : allMatrix;

  for (const { profile, orientation } of filteredMatrix) {
    test(`${profile.id} · ${orientation}`, async ({ browser }) => {
      const consoleErrors = [];
      const pageErrors = [];

      const contextOptions = toPlaywrightContext(profile, orientation);
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      try {
        await page.goto(resolvedTargetUrl);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(300);

        // Run sweep checks via Conformance Catalog (SPRINT-ERB-06 R1/R2)
        const defaultSpec = {
          schema: 'urn:mcard:schema:device_conformance_spec:v1',
          checks: [
            { id: 'no-horizontal-overflow' },
            { id: 'no-console-errors' },
            { id: 'key-targets-visible', params: { selectors: KEY_SELECTORS } }
          ]
        };

        const fidelity = resolveFidelity(profile, 'playwright');
        const report = await runConformance(page, { ...defaultSpec, target: resolvedTargetUrl }, {
          profile,
          orientation,
          fidelity,
          consoleErrors: [...consoleErrors, ...pageErrors]
        });

        const overflowResult = report.results.find((r) => r.id === 'no-horizontal-overflow');
        const consoleResult = report.results.find((r) => r.id === 'no-console-errors');
        const keyTargetsResult = report.results.find((r) => r.id === 'key-targets-visible');

        expect(overflowResult?.status, `Horizontal overflow detected: ${JSON.stringify(overflowResult?.evidence)}`).toBe('pass');
        expect(consoleResult?.status, `Console/Page errors detected: ${JSON.stringify(consoleResult?.evidence)}`).toBe('pass');
        expect(keyTargetsResult?.status, `Key targets visible failed: ${JSON.stringify(keyTargetsResult?.evidence)}`).toBe('pass');

        summaryRows.push({
          device: profile.name,
          orientation,
          overflow: overflowResult?.status === 'pass' ? '✓ 0px' : '✗ OVERFLOW',
          console: consoleResult?.status === 'pass' ? '✓ 0 err' : `✗ ${consoleResult?.evidence?.errorCount} err`,
          keyTargets: keyTargetsResult?.status === 'pass' ? '✓ VISIBLE' : '✗ HIDDEN',
          verdict: report.summary.fail === 0 ? 'PASS' : 'FAIL'
        });
      } catch (err) {
        summaryRows.push({
          device: profile.name,
          orientation,
          overflow: 'ERROR',
          console: `${consoleErrors.length + pageErrors.length} err`,
          keyTargets: 'FAIL',
          verdict: 'FAIL'
        });
        throw err;
      } finally {
        await context.close();
      }
    });
  }

  test.afterAll(() => {
    // Print CLI Summary Table (SPRINT-ERB-04 §4.2)
    if (summaryRows.length > 0) {
      console.log('\n================== SYSTEMATIC MULTI-DEVICE SWEEP SUMMARY ==================');
      console.table(summaryRows);
      const passed = summaryRows.filter((r) => r.verdict === 'PASS').length;
      console.log(`TOTAL: ${passed}/${summaryRows.length} passed (${((passed / summaryRows.length) * 100).toFixed(1)}%)\n`);
    }
  });
});
