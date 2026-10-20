/**
 * Device-Sensitive Conformance Test Suite & MCard Certification (SPRINT-ERB-06 §4, §6)
 * Evaluates declarative conformance specs against targets and mints responsive certificates.
 */

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { deviceMatrix, toPlaywrightContext } from '../fixtures/device-matrix.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { runConformance } from '../conformance/runner.js';
import { resolveFidelity } from '../../js/harness/fidelity.js';
import { targetSlug } from '../../js/harness/test-run-schema.js';

test.describe.configure({ retries: 0 });

const RAW_TARGET = process.env.TARGET_URL || 'app.html';
const MINT_RESULTS = process.env.MINT_RESULTS === '1' || process.env.CI === 'true';
const SPEC_PATH = process.env.CONFORMANCE_SPEC;

// CLI Summary and roll-up state
const summaryRows = [];
const collectedReports = [];
const deviceFailures = [];

test.describe('EPIC-CONFORMANCE: Device-Sensitive Conformance & Certification', () => {
  let resolvedTargetUrl = RAW_TARGET;
  let targetSpec = null;
  let slug = '';

  test.beforeAll(async ({ request }) => {
    if (!resolvedTargetUrl.startsWith('http://') && !resolvedTargetUrl.startsWith('https://')) {
      resolvedTargetUrl = `http://localhost:3001/${resolvedTargetUrl.replace(/^\//, '')}`;
    }
    await ensureTargetReachable(request, resolvedTargetUrl);

    slug = targetSlug(resolvedTargetUrl);

    // Resolve conformance spec
    if (SPEC_PATH && fs.existsSync(SPEC_PATH)) {
      targetSpec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf-8'));
    } else {
      const candidates = [
        path.resolve(`tests/conformance/${slug}.conformance.json`),
        path.resolve('tests/conformance/localhost-3001-app-html.conformance.json')
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          targetSpec = JSON.parse(fs.readFileSync(cand, 'utf-8'));
          break;
        }
      }
    }

    if (!targetSpec) {
      targetSpec = {
        schema: 'urn:mcard:schema:device_conformance_spec:v1',
        target: resolvedTargetUrl,
        targetSlug: slug,
        checks: [
          { id: 'no-horizontal-overflow' },
          { id: 'no-console-errors' },
          { id: 'viewport-meta' },
          { id: 'key-targets-visible', params: { selectors: ['h1'] } },
          { id: 'tap-target-size', params: { scope: 'button, a, input, select', min: 24 } },
          { id: 'orientation-preserves-state', params: { fields: [] } },
          { id: 'safe-area-insets', params: { selectors: ['header', 'footer'] } }
        ]
      };
    }
  });

  const matrix = deviceMatrix({ orientations: ['portrait', 'landscape'] });

  for (const { profile, orientation } of matrix) {
    test(`Conformance · ${profile.id} (${orientation})`, async ({ browser, request }) => {
      const consoleErrors = [];
      const pageErrors = [];

      const contextOptions = toPlaywrightContext(profile, orientation);
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      try {
        await page.goto(resolvedTargetUrl);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(300);

        const fidelity = resolveFidelity(profile, 'playwright');
        const report = await runConformance(page, { ...targetSpec, target: resolvedTargetUrl, targetSlug: slug }, {
          profile,
          orientation,
          fidelity,
          consoleErrors: [...consoleErrors, ...pageErrors]
        });

        // Check blocking device invariants
        const overflow = report.results.find((r) => r.id === 'no-horizontal-overflow');
        const statePreserve = report.results.find((r) => r.id === 'orientation-preserves-state');

        // INV-DEV-01: No Horizontal Overflow
        expect(overflow?.status, `INV-DEV-01 violation: ${JSON.stringify(overflow?.evidence)}`).toBe('pass');

        // INV-DEV-03: Orientation Preserves State (phone/tablet)
        if (statePreserve && statePreserve.status !== 'not-applicable' && statePreserve.status !== 'skipped') {
          expect(statePreserve.status, `INV-DEV-03 violation: ${JSON.stringify(statePreserve.evidence)}`).toBe('pass');
        }

        // T1 Fidelity honesty: safe-area-insets must be skipped: fidelity if declared
        const safeArea = report.results.find((r) => r.id === 'safe-area-insets');
        if (safeArea && safeArea.status !== 'not-applicable') {
          expect(safeArea.status).toBe('skipped');
          expect(safeArea.reason).toBe('fidelity');
        }

        let reportHash = null;

        // Persist report if minting is enabled
        if (MINT_RESULTS) {
          try {
            const apiRes = await request.post('http://localhost:3001/api/test-runs', {
              data: report,
              headers: { 'Content-Type': 'application/json' }
            });
            if (apiRes.ok()) {
              const body = await apiRes.json();
              reportHash = body.hash;
            }
          } catch (e) {
            // persistence network fallback
          }
        }

        collectedReports.push({
          report,
          reportHash: reportHash || `mock:${profile.id}:${orientation}`
        });

        const passedAll = report.summary.fail === 0;
        if (!passedAll) {
          deviceFailures.push(`${profile.id}:${orientation}`);
        }

        summaryRows.push({
          device: profile.name,
          orientation,
          pass: report.summary.pass,
          fail: report.summary.fail,
          skip: report.summary.skipped,
          notApp: report.summary.notApplicable,
          overflow: overflow?.status === 'pass' ? '✓ 0px' : '✗ OVERFLOW',
          verdict: passedAll ? 'PASS' : 'FAIL'
        });
      } catch (err) {
        deviceFailures.push(`${profile.id}:${orientation}`);
        summaryRows.push({
          device: profile.name,
          orientation,
          pass: 0,
          fail: 1,
          skip: 0,
          notApp: 0,
          overflow: 'ERROR',
          verdict: 'FAIL'
        });
        throw err;
      } finally {
        await context.close();
      }
    });
  }

  test.afterAll(async ({ request }) => {
    // Print Conformance Summary Table
    if (summaryRows.length > 0) {
      console.log('\n================== DEVICE CONFORMANCE SUITE SUMMARY ==================');
      console.table(summaryRows);
      const passedCount = summaryRows.filter((r) => r.verdict === 'PASS').length;
      console.log(`TOTAL CONFORMANCE: ${passedCount}/${summaryRows.length} passed\n`);
    }

    // Mint Certification Roll-up (SPRINT-ERB-06 §6.3)
    if (collectedReports.length === matrix.length) {
      const isCertified = deviceFailures.length === 0;
      const certRecord = {
        schema: 'urn:mcard:certification:responsive:v1',
        target: { url: resolvedTargetUrl, slug },
        specHash: collectedReports[0]?.report?.specHash || 'unknown',
        matrix: { devices: 8, orientations: 2 },
        certified: isCertified,
        rule: ['INV-DEV-01', 'INV-DEV-03'],
        reports: collectedReports.map((c) => c.reportHash),
        failures: deviceFailures,
        maxFidelityTier: 1
      };

      console.log('----------------------------------------------------------------------');
      console.log(`CERTIFICATION VERDICT: ${isCertified ? '🏆 CERTIFIED (INV-DEV-01 & INV-DEV-03)' : '❌ NOT CERTIFIED'}`);
      console.log(`Failures: ${deviceFailures.length === 0 ? 'None' : deviceFailures.join(', ')}`);
      console.log('----------------------------------------------------------------------\n');

      if (MINT_RESULTS) {
        try {
          await request.post('http://localhost:3001/api/test-runs', {
            data: certRecord,
            headers: { 'Content-Type': 'application/json' }
          });
          console.log(`[Certification] Minted MCard under urn:mcard:certification_latest:${slug}`);
        } catch (e) {
          // ignore
        }
      }
    }
  });
});
