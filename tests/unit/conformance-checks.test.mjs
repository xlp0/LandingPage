import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CHECK_CATALOG, getCheck } from '../conformance/catalog.js';
import { runConformance } from '../conformance/runner.js';
import { resolveFidelity } from '../../js/harness/fidelity.js';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';

describe('Conformance Checks & Runner Unit Tests (SPRINT-ERB-06)', () => {
  const phoneProfile = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
  const desktopProfile = BUILTIN_DEVICES.find((d) => d.id === 'desktop-fhd');

  test('CHECK_CATALOG contains all 15 required checks', () => {
    const requiredChecks = [
      'no-horizontal-overflow',
      'no-console-errors',
      'key-targets-visible',
      'breakpoint-layout',
      'viewport-meta',
      'tap-target-size',
      'hover-has-touch-path',
      'orientation-preserves-state',
      'frame-budget',
      'layout-stability',
      'dpr-assets',
      'reduced-motion',
      'color-scheme',
      'geolocation-denied',
      'safe-area-insets'
    ];

    for (const id of requiredChecks) {
      assert.ok(getCheck(id), `Check '${id}' must exist in CHECK_CATALOG`);
      assert.equal(typeof getCheck(id).run, 'function');
      assert.equal(typeof getCheck(id).appliesTo, 'function');
      assert.ok(Array.isArray(getCheck(id).requires));
    }
  });

  test('capability predicates: tap-target-size applies to coarse pointer and is not-applicable on desktop', () => {
    const tapCheck = getCheck('tap-target-size');
    assert.equal(tapCheck.appliesTo(phoneProfile), true, 'Must apply to phone (coarse pointer)');
    assert.equal(tapCheck.appliesTo(desktopProfile), false, 'Must NOT apply to desktop (fine pointer)');
  });

  test('central fidelity gating: check requiring safeAreaInsets yields skipped: fidelity at Tier 1 (INV-DSF-01)', async () => {
    const fidelityT1 = resolveFidelity(phoneProfile, 'playwright');
    assert.equal(fidelityT1.tier, 1);
    assert.ok(fidelityT1.notEmulated.includes('safeAreaInsets'));

    // Mock page with minimal evaluate
    const mockPage = {
      url: () => 'http://localhost:3001/app.html'
    };

    const spec = {
      target: 'http://localhost:3001/app.html',
      checks: [{ id: 'safe-area-insets' }]
    };

    const report = await runConformance(mockPage, spec, {
      profile: phoneProfile,
      orientation: 'portrait',
      fidelity: fidelityT1
    });

    assert.equal(report.summary.skipped, 1);
    assert.equal(report.results[0].status, 'skipped');
    assert.equal(report.results[0].reason, 'fidelity');
    assert.ok(report.results[0].missing.includes('safeAreaInsets'));
  });

  test('check: no-console-errors passes on empty and fails on page errors', async () => {
    const check = getCheck('no-console-errors');
    const passRes = await check.run({}, { errors: [] });
    assert.equal(passRes.status, 'pass');
    assert.equal(passRes.evidence.errorCount, 0);

    const failRes = await check.run({}, { errors: ['SyntaxError: Unexpected token'] });
    assert.equal(failRes.status, 'fail');
    assert.equal(failRes.evidence.errorCount, 1);
  });

  test('check: no-horizontal-overflow detects overflow via page evaluate', async () => {
    const check = getCheck('no-horizontal-overflow');
    const goodPage = {
      evaluate: async () => ({ scrollW: 393, innerW: 393, overflowing: [] })
    };
    const passRes = await check.run(goodPage);
    assert.equal(passRes.status, 'pass');

    const badPage = {
      evaluate: async () => ({ scrollW: 1200, innerW: 393, overflowing: ['div#leak'] })
    };
    const failRes = await check.run(badPage);
    assert.equal(failRes.status, 'fail');
    assert.deepEqual(failRes.evidence.overflowingElements, ['div#leak']);
  });

  test('check: viewport-meta verifies width=device-width', async () => {
    const check = getCheck('viewport-meta');
    const goodPage = {
      evaluate: async () => 'width=device-width, initial-scale=1.0'
    };
    const passRes = await check.run(goodPage);
    assert.equal(passRes.status, 'pass');

    const badPage = {
      evaluate: async () => null
    };
    const failRes = await check.run(badPage);
    assert.equal(failRes.status, 'fail');
  });

  test('check: tap-target-size audits interactive elements below min size', async () => {
    const check = getCheck('tap-target-size');
    const goodPage = {
      evaluate: async () => ({ checked: 5, below24: [], belowMin: [] })
    };
    const passRes = await check.run(goodPage, { min: 44 });
    assert.equal(passRes.status, 'pass');

    const badPage = {
      evaluate: async () => ({ checked: 5, below24: [{ id: 'button.tiny' }], belowMin: [] })
    };
    const failRes = await check.run(badPage, { min: 44 });
    assert.equal(failRes.status, 'fail');
    assert.equal(failRes.evidence.below24.length, 1);
  });

  test('check: frame-budget reports pass or advisory based on params.enforce', async () => {
    const check = getCheck('frame-budget');
    const goodPage = {
      evaluate: async () => ({ avgMs: 16.6, maxMs: 18.2 })
    };
    const passRes = await check.run(goodPage, { avgMs: 20 });
    assert.equal(passRes.status, 'pass');

    const badPage = {
      evaluate: async () => ({ avgMs: 33.3, maxMs: 50.0 })
    };
    const advisoryRes = await check.run(badPage, { avgMs: 20, enforce: false });
    assert.equal(advisoryRes.status, 'pass');
    assert.equal(advisoryRes.evidence.advisory, true);

    const failRes = await check.run(badPage, { avgMs: 20, enforce: true });
    assert.equal(failRes.status, 'fail');
  });

  test('check: layout-stability verifies CLS bounds', async () => {
    const check = getCheck('layout-stability');
    const goodPage = {
      evaluate: async () => 0.02
    };
    const passRes = await check.run(goodPage, { maxCls: 0.1 });
    assert.equal(passRes.status, 'pass');

    const badPage = {
      evaluate: async () => 0.25
    };
    const failRes = await check.run(badPage, { maxCls: 0.1 });
    assert.equal(failRes.status, 'fail');
  });
});
