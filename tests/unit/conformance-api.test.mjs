/**
 * Conformance Report & Diff API Unit Tests (SPRINT-ERB-06 §6.2)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { CanonicalTriadBackend } from '../../server/mcard-api.mjs';
import { createTestRunRouter } from '../../server/test-run-api.mjs';
import fs from 'node:fs';
import path from 'node:path';

describe('Conformance Report & Diff API (SPRINT-ERB-06 §6.2)', () => {
  const dbPath = path.resolve('data/test-conformance-api.db');
  let storage;
  let server;
  let baseUrl;

  before(async () => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    storage = new CanonicalTriadBackend(dbPath);

    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/test-runs', createTestRunRouter({ storage }));

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
    if (storage) storage.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  const sampleReport1 = {
    schema: 'urn:mcard:schema:device_conformance_report:v1',
    specHash: 'blake3:spec123',
    target: { url: 'http://localhost:3001/app.html', slug: 'localhost-3001-app-html' },
    device: { id: 'iphone-16-pro', orientation: 'portrait' },
    fidelity: {
      tier: 1,
      runner: 'playwright',
      emulated: ['viewport', 'pixelRatio', 'hasTouch'],
      notEmulated: ['safeAreaInsets']
    },
    summary: { pass: 1, fail: 1, skipped: 1, notApplicable: 0 },
    results: [
      { id: 'no-horizontal-overflow', status: 'pass' },
      { id: 'tap-target-size', status: 'fail' },
      { id: 'safe-area-insets', status: 'skipped', reason: 'fidelity', missing: ['safeAreaInsets'] }
    ]
  };

  const sampleReport2 = {
    ...sampleReport1,
    summary: { pass: 2, fail: 0, skipped: 1, notApplicable: 0 },
    results: [
      { id: 'no-horizontal-overflow', status: 'pass' },
      { id: 'tap-target-size', status: 'pass' }, // fixed!
      { id: 'safe-area-insets', status: 'skipped', reason: 'fidelity', missing: ['safeAreaInsets'] }
    ]
  };

  test('POST conformance report persists under per-run and latest handles', async () => {
    const res = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleReport1)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.hash);
    assert.ok(data.handle.startsWith('urn:mcard:conformance:localhost-3001-app-html:iphone-16-pro:portrait:'));
    assert.equal(data.latestHandle, 'urn:mcard:conformance_latest:localhost-3001-app-html:iphone-16-pro:portrait');
  });

  test('GET /conformance/latest lists the stored report', async () => {
    const res = await fetch(`${baseUrl}/api/test-runs/conformance/latest?target=http://localhost:3001/app.html`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.slug, 'localhost-3001-app-html');
    assert.equal(data.count, 1);
    assert.equal(data.reports[0].device.id, 'iphone-16-pro');
  });

  test('POST second report creates history and GET /conformance/diff reflects transition', async () => {
    // Post updated report
    const res2 = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleReport2)
    });
    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    assert.ok(data2.previousHash);

    // Call diff endpoint
    const diffRes = await fetch(
      `${baseUrl}/api/test-runs/conformance/diff?target=http://localhost:3001/app.html&device=iphone-16-pro&orientation=portrait`
    );
    assert.equal(diffRes.status, 200);
    const diffData = await diffRes.json();

    assert.ok(diffData.currentHash);
    assert.ok(diffData.previousHash);
    assert.equal(diffData.transitions.length, 3);

    const tapDiff = diffData.transitions.find((t) => t.id === 'tap-target-size');
    assert.ok(tapDiff);
    assert.equal(tapDiff.from, 'fail');
    assert.equal(tapDiff.to, 'pass');
    assert.equal(tapDiff.transition, 'fail → pass');
    assert.equal(tapDiff.changed, true);

    const overflowDiff = diffData.transitions.find((t) => t.id === 'no-horizontal-overflow');
    assert.equal(overflowDiff.transition, 'pass → pass');
    assert.equal(overflowDiff.changed, false);
  });

  test('POST certification persists under urn:mcard:certification_latest:<slug>', async () => {
    const cert = {
      schema: 'urn:mcard:certification:responsive:v1',
      target: { url: 'http://localhost:3001/app.html', slug: 'localhost-3001-app-html' },
      specHash: 'blake3:spec123',
      matrix: { devices: 8, orientations: 2 },
      certified: true,
      rule: ['INV-DEV-01', 'INV-DEV-03'],
      reports: ['hash1', 'hash2'],
      failures: [],
      maxFidelityTier: 1
    };

    const res = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cert)
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.handle, 'urn:mcard:certification_latest:localhost-3001-app-html');
  });
});
