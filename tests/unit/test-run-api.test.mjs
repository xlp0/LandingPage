import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import {
  CanonicalTriadBackend,
  hashContent,
  verifyRecord,
  DEFAULT_ALGORITHM
} from '../../server/mcard-api.mjs';
import { createTestRunRouter } from '../../server/test-run-api.mjs';
import {
  canonicalJson,
  TEST_RUN_SCHEMA
} from '../../js/harness/test-run-schema.js';

function createValidRun(overrides = {}) {
  return {
    schema: TEST_RUN_SCHEMA,
    sessionId: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    target: { url: 'http://localhost:4321/', slug: 'localhost-4321' },
    captureSource: 'probe-agent',
    device: {
      id: 'iphone-16-pro',
      name: 'iPhone 16 Pro',
      category: 'phone',
      width: 393,
      height: 852,
      pixelRatio: 3,
      hasTouch: true,
      isMobile: true,
      pointer: 'coarse',
      hover: false,
      safeAreaInsets: { top: 59, right: 0, bottom: 34, left: 0 },
      schemaVersion: 2
    },
    orientation: 'portrait',
    fidelity: {
      tier: 0,
      runner: 'lab-iframe',
      emulated: ['viewport'],
      notEmulated: ['pixelRatio', 'hasTouch', 'pointer', 'hover', 'isMobile', 'safeAreaInsets']
    },
    lab: { commit: '6f9a53a', clmKernel: '0.0.9' },
    metrics: {
      startedAt: '2026-10-20T08:40:00.000Z',
      activeDurationMs: 4500,
      eventCount: 1,
      droppedCount: 0,
      rejectedMessages: 0
    },
    telemetry: {
      overflow: { hasHorizontalOverflow: false, elements: [] },
      frames: { avgFps: 59.8, maxFrameMs: 18.2, droppedFrames: 1 },
      cls: 0.01,
      tapTargetViolations: 0
    },
    finalState: { url: 'http://localhost:4321/explore', domDigest: 'blake3:abc123' },
    events: [
      {
        seq: 1,
        t_rel_ms: 120.4,
        type: 'pointer',
        pointer: { pointerType: 'mouse', button: 0 },
        target: { selector: '[data-testid="btn-explore"]', tag: 'button' },
        viewport: { w: 393, h: 852, dpr: 1, orientation: 'portrait' },
        coords: { nx: 0.52, ny: 0.81 }
      }
    ],
    ...overrides
  };
}

describe('Test Run API Integration (SPRINT-ERB-03 §5)', () => {
  let tempDbDir;
  let tempDbPath;
  let storage;
  let server;
  let baseUrl;
  let prodDbMtimeBefore = null;
  const prodDbPath = path.join(process.cwd(), 'data', 'mcard-api.db');

  before(async () => {
    // Record prod db mtime if exists
    if (fs.existsSync(prodDbPath)) {
      prodDbMtimeBefore = fs.statSync(prodDbPath).mtimeMs;
    }

    // Set up temp db
    tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runs-db-'));
    tempDbPath = path.join(tempDbDir, 'test-triad.db');
    storage = new CanonicalTriadBackend(tempDbPath);

    // Express app mirroring ws-server setup
    const app = express();
    // Mount test-runs with 2mb limit BEFORE global parser
    app.use('/api/test-runs', express.json({ limit: '2mb' }), createTestRunRouter({ storage }));
    // Global 100kb parser for other routes
    app.use(express.json());

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      if (server) server.close(resolve);
      else resolve();
    });

    if (tempDbDir && fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }

    // P7: Verify production DB untouched
    if (fs.existsSync(prodDbPath) && prodDbMtimeBefore !== null) {
      const prodDbMtimeAfter = fs.statSync(prodDbPath).mtimeMs;
      assert.equal(
        prodDbMtimeAfter,
        prodDbMtimeBefore,
        'P7: Production DB data/mcard-api.db must not be touched by unit tests'
      );
    }
  });

  test('P1: POST valid run -> 201, verifyRecord passes, hash equals blake3(canonicalJson)', async () => {
    const run = createValidRun();
    const res = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.inserted, true);

    const expectedHash = hashContent(canonicalJson(run), 'blake3');
    assert.equal(body.hash, expectedHash);

    const card = storage.get(body.hash);
    assert.ok(card);
    assert.equal(card.verified, true);
  });

  test('P2: POST identical run with permuted keys -> 200, same hash, inserted: false', async () => {
    const run1 = createValidRun({ sessionId: 'tr_fixed_permute_test' });

    const post1 = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run1)
    });
    assert.equal(post1.status, 201);
    const body1 = await post1.json();

    // Permute keys
    const run2 = {
      orientation: run1.orientation,
      events: run1.events,
      schema: run1.schema,
      target: run1.target,
      sessionId: run1.sessionId,
      device: run1.device,
      fidelity: run1.fidelity,
      metrics: run1.metrics,
      telemetry: run1.telemetry,
      finalState: run1.finalState,
      captureSource: run1.captureSource,
      lab: run1.lab
    };

    const post2 = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run2)
    });
    assert.equal(post2.status, 200);
    const body2 = await post2.json();

    assert.equal(body2.hash, body1.hash);
    assert.equal(body2.inserted, false);
  });

  test('P3: POST with nx = 1.2 or unknown top-level key -> 400', async () => {
    const runBadCoord = createValidRun();
    runBadCoord.events[0].coords.nx = 1.2;
    const res1 = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runBadCoord)
    });
    assert.equal(res1.status, 400);

    const runBadKey = createValidRun();
    runBadKey.illegalField = 'danger';
    const res2 = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runBadKey)
    });
    assert.equal(res2.status, 400);
  });

  test('P4: POST 1.5MB valid run -> 201; 2.5MB run -> 413', async () => {
    // Generate ~1.5 MB run
    const eventsLarge = [];
    for (let i = 1; i <= 1500; i++) {
      eventsLarge.push({
        seq: i,
        t_rel_ms: i * 10,
        type: 'pointer',
        pointer: { pointerType: 'mouse', button: 0 },
        target: { selector: `[data-testid="item-${i}"]`, tag: 'button' },
        viewport: { w: 393, h: 852, dpr: 1, orientation: 'portrait' },
        coords: { nx: 0.5, ny: 0.5 },
        note: 'x'.repeat(700) // ~1 KB per event -> ~1.2 MB
      });
    }

    const run1500k = createValidRun({ events: eventsLarge });
    const res1500k = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run1500k)
    });
    assert.equal(res1500k.status, 201, '1.5MB payload must be accepted by 2MB limit');

    // Generate ~2.5 MB run
    const bigString = 'x'.repeat(2.5 * 1024 * 1024);
    const res2500k = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tooBig: bigString })
    });
    assert.equal(res2500k.status, 413, '2.5MB payload must fail with 413 Payload Too Large');
  });

  test('P5: Two runs for same target/device/orientation creates revision chain in latest/history', async () => {
    const runA = createValidRun({ sessionId: 'tr_rev_a' });
    const resA = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runA)
    });
    assert.equal(resA.status, 201);
    const bodyA = await resA.json();

    const runB = createValidRun({ sessionId: 'tr_rev_b' });
    const resB = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runB)
    });
    assert.equal(resB.status, 201);
    const bodyB = await resB.json();

    // Query latest/history
    const histRes = await fetch(
      `${baseUrl}/api/test-runs/latest/history?target=${encodeURIComponent('http://localhost:4321/')}&device=iphone-16-pro&orientation=portrait`
    );
    assert.equal(histRes.status, 200);
    const histData = await histRes.json();

    assert.equal(histData.currentHash, bodyB.hash);
    assert.ok(histData.history.some((h) => h.previousHash === bodyA.hash));
  });

  test('P6: GET ?target= lists only that slug; target containing _ properly escaped', async () => {
    const runTargetA = createValidRun({
      target: { url: 'http://localhost:4321/alpha_test', slug: 'localhost-4321-alpha_test' }
    });
    await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runTargetA)
    });

    const runTargetB = createValidRun({
      target: { url: 'http://localhost:4321/alphaXtest', slug: 'localhost-4321-alphaxtest' }
    });
    await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runTargetB)
    });

    // Query alpha_test - must NOT match alphaxtest even though _ is SQL single-char wildcard
    const listRes = await fetch(
      `${baseUrl}/api/test-runs?target=${encodeURIComponent('http://localhost:4321/alpha_test')}`
    );
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();

    assert.ok(listData.runs.length >= 1);
    for (const r of listData.runs) {
      assert.ok(r.handle.includes('alpha_test'), `Handle ${r.handle} must contain alpha_test`);
      assert.ok(!r.handle.includes('alphaxtest'), `Handle ${r.handle} must not match alphaxtest`);
    }
  });
});
