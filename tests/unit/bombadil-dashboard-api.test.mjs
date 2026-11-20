import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test, { describe } from 'node:test';
import express from 'express';
import { CanonicalTriadBackend } from '../../server/mcard-api.mjs';
import { createTestRunRouter } from '../../server/test-run-api.mjs';
import { createBombadilRunnerService } from '../../server/bombadil-runner-service.mjs';
import { createBombadilClient } from '../../js/harness/bombadil-client.js';
import {
  BOMBADIL_COVERAGE_SCHEMA,
  BOMBADIL_RUN_SCHEMA,
  BOMBADIL_TRIGGER_SCHEMA
} from '../../js/harness/test-run-schema.js';
import { parseRunnerArgs, resolveRunPlan, stripServerContractImport } from '../../scripts/bombadil/run.mjs';

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function createFakeChild({ autoExitCode = null, autoDelayMs = 20, onKill = null } = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.killedSignals = [];
  child.kill = (sig = 'SIGTERM') => {
    child.killedSignals.push(sig);
    if (onKill) onKill(child, sig);
    else if (child.exitCode === null) {
      setImmediate(() => {
        child.exitCode = null;
        child.signalCode = sig;
        child.emit('exit', null, sig);
      });
    }
  };
  if (autoExitCode !== null) {
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.exitCode = autoExitCode;
        child.emit('exit', autoExitCode, null);
      }
    }, autoDelayMs);
  }
  return child;
}

function makeFakeTraceLine({ transitionId = 't_req_get_env', from = 'p_page_index', to = 'p_pending_get_env', violation = null } = {}) {
  return JSON.stringify({
    timestamp: Date.now() * 1000,
    state: { url: 'http://localhost:3999/tests/fixtures/spa-test-target.html' },
    violations: violation ? [{ name: violation, time: 10 }] : [],
    snapshots: [
      {
        index: 0,
        name: null,
        value: {
          netId: 'spa-test-target-net',
          nonce: 'n1',
          path: '/tests/fixtures/spa-test-target.html',
          records: [
            { seq: 1, transitionId: 't_spa_open_details', fromPlaceId: 'p_spa_overview', toPlaceId: 'p_spa_details' }
          ]
        }
      }
    ]
  });
}

async function createHarness({ env = {}, spawnImpl } = {}) {
  const tmpDir = makeTempDir('ssg04-');
  const dbPath = path.join(tmpDir, 'triad.db');
  const storage = new CanonicalTriadBackend(dbPath);
  const runnerService = createBombadilRunnerService({
    storage,
    env,
    tmpRoot: path.join(tmpDir, 'runs'),
    spawnImpl,
    fetchImpl: async () => ({ ok: true }),
    getFreePortImpl: async () => 41234,
    registerSignals: false
  });
  const app = express();
  app.use(express.json());
  app.use('/api/test-runs', createTestRunRouter({ storage, runnerService }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  async function close() {
    await runnerService.destroy();
    await new Promise((resolve) => server.close(resolve));
    storage.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return { baseUrl, storage, runnerService, close, tmpDir };
}

describe('SPRINT-SSG-04: Bombadil runner env isolation, API handles, and client bridge', () => {
  test('run.mjs strips server-contract preload and PW_* / PORT vars from bombadilEnv while tagging child server BOMBADIL_CHILD_RUN=1', () => {
    const cleaned = stripServerContractImport(
      '--max-old-space-size=2048 --import file:///x/tests/fixtures/server-contract.js --import=/y/server-contract.js --enable-source-maps'
    );
    assert.equal(cleaned, '--max-old-space-size=2048 --enable-source-maps');

    const repoRoot = makeTempDir('ssg04-plan-');
    const plan = resolveRunPlan(parseRunnerArgs(['spa']), {
      env: {
        PORT: '3001',
        PW_REUSE_SERVER: '1',
        PW_EPHEMERAL_MCARD_DB: '1',
        PW_SERVER_BOOT_GUARD: '1',
        BOMBADIL_PORT: '41555',
        NODE_OPTIONS: '--import file:///tmp/server-contract.js --title=test'
      },
      repoRoot
    });

    assert.equal(plan.serverEnv.PORT, '41555');
    assert.equal(plan.serverEnv.BOMBADIL_CHILD_RUN, '1');
    assert.equal(plan.bombadilEnv.PORT, undefined);
    assert.equal(plan.bombadilEnv.PW_REUSE_SERVER, undefined);
    assert.equal(plan.bombadilEnv.PW_EPHEMERAL_MCARD_DB, undefined);
    assert.equal(plan.bombadilEnv.PW_SERVER_BOOT_GUARD, undefined);
    assert.equal(plan.bombadilEnv.BOMBADIL_CHILD_RUN, undefined);
    assert.equal(plan.bombadilEnv.NODE_OPTIONS, '--title=test');
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  test('idle GETs return 200 empty state, idle /stream returns 204, and invalid inputs return 400/404', async () => {
    const h = await createHarness({ spawnImpl: () => createFakeChild({ autoExitCode: 0 }) });
    try {
      const handlesRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/handles`);
      assert.equal(handlesRes.status, 200);
      const handlesJson = await handlesRes.json();
      assert.equal(handlesJson.handles.length, 5);
      assert.equal(handlesJson.childRun, false);
      assert.equal(handlesJson.triggerEnabled, true);
      assert.equal(handlesJson.activeJob, null);

      const runsRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/runs`);
      assert.equal(runsRes.status, 200);
      assert.deepEqual(await runsRes.json(), { runs: [] });

      const covRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/coverage`);
      assert.equal(covRes.status, 200);
      assert.equal((await covRes.json()).empty, true);

      const streamRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/stream`);
      assert.equal(streamRes.status, 204);

      assert.equal((await fetch(`${h.baseUrl}/api/test-runs/bombadil/run`)).status, 400);
      assert.equal((await fetch(`${h.baseUrl}/api/test-runs/bombadil/run?runId=missing`)).status, 404);

      const badTarget = await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'nope', timeLimit: '30s' })
      });
      assert.equal(badTarget.status, 400);

      const badDuration = await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'spa', timeLimit: '2;rm -rf' })
      });
      assert.equal(badDuration.status, 400);
    } finally {
      await h.close();
    }
  });

  test('child run exposes triggerEnabled=false on GET /handles and blocks POST /trigger and POST /shrink with 403', async () => {
    const h = await createHarness({
      env: { BOMBADIL_CHILD_RUN: '1' },
      spawnImpl: () => createFakeChild({ autoExitCode: 0 })
    });
    try {
      const handles = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/handles`)).json();
      assert.equal(handles.childRun, true);
      assert.equal(handles.triggerEnabled, false);

      const trig = await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'spa', timeLimit: '30s' })
      });
      assert.equal(trig.status, 403);

      const shrink = await fetch(`${h.baseUrl}/api/test-runs/bombadil/shrink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: 'run_any' })
      });
      assert.equal(shrink.status, 403);
    } finally {
      await h.close();
    }
  });

  test('trigger persists MCard handles, enforces 409 single-flight mutex, streams SSE to completion, and skips coverage on spa-canary', async () => {
    let heldChild = null;
    const spawnedCalls = [];
    const h = await createHarness({
      spawnImpl: (cmd, args, opts) => {
        spawnedCalls.push({ cmd, args, opts });
        const outIdx = args.indexOf('--output-path');
        const outDir = outIdx >= 0 ? args[outIdx + 1] : null;
        if (outDir) {
          fs.mkdirSync(outDir, { recursive: true });
          const target = args[1];
          const traceLine = makeFakeTraceLine({
            violation: target === 'spa-canary' ? 'hashMatchesPlace' : null
          });
          fs.writeFileSync(path.join(outDir, 'trace.jsonl'), `${traceLine}\n`);
        }
        heldChild = createFakeChild({ autoExitCode: null });
        return heldChild;
      }
    });

    try {
      const trigRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'spa', timeLimit: '30s', minFirings: 1, requestedBy: 'unit-test' })
      });
      assert.equal(trigRes.status, 202);
      const receipt = await trigRes.json();
      assert.equal(receipt.triggerHandle, 'urn:mcard:bombadil:trigger:spa');
      assert.equal(receipt.status, 'running');
      assert.equal(spawnedCalls[0].opts.shell, false);
      assert.equal(spawnedCalls[0].opts.env.MCARD_DB_PATH, undefined);
      assert.equal(spawnedCalls[0].opts.env.BOMBADIL_CHILD_RUN, undefined);
      assert.equal(spawnedCalls[0].opts.env.BOMBADIL_PORT, '41234');

      // 409 single-flight mutex while running
      const conflictRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'lab-smoke', timeLimit: '30s' })
      });
      assert.equal(conflictRes.status, 409);

      // Connect SSE stream, then finish child cleanly
      const streamRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/stream`);
      assert.equal(streamRes.status, 200);
      setTimeout(() => {
        heldChild.exitCode = 0;
        heldChild.emit('exit', 0, null);
      }, 30);
      const sseText = await streamRes.text();
      assert.match(sseText, /event: progress/);
      assert.match(sseText, /event: complete/);

      const runDetail = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/run?runId=${receipt.runId}`)).json();
      assert.equal(runDetail.run.schema, BOMBADIL_RUN_SCHEMA);
      assert.equal(runDetail.run.status, 'clean');
      assert.equal(runDetail.run.firingsCount, 1);

      const trigCard = JSON.parse(h.storage.get(receipt.triggerHash).content);
      assert.equal(trigCard.schema, BOMBADIL_TRIGGER_SCHEMA);

      const covBeforeCanary = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/coverage`)).json();
      assert.equal(covBeforeCanary.empty, false);
      assert.equal(covBeforeCanary.schema, BOMBADIL_COVERAGE_SCHEMA);
      const covHashBefore = covBeforeCanary.hash;

      // Canary violation run must NOT overwrite real coverage handle
      const canaryTrig = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'spa-canary', timeLimit: '30s' })
      })).json();
      setTimeout(() => {
        heldChild.exitCode = 2;
        heldChild.emit('exit', 2, null);
      }, 30);
      await new Promise((r) => setTimeout(r, 80));

      const canaryDetail = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/run?runId=${canaryTrig.runId}`)).json();
      assert.equal(canaryDetail.run.status, 'violated');
      assert.equal(canaryDetail.run.violations[0].name, 'hashMatchesPlace');

      const covAfterCanary = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/coverage`)).json();
      assert.equal(covAfterCanary.hash, covHashBefore);
    } finally {
      await h.close();
    }
  });

  test('SSE emits job-error on spawn failure and stop sends SIGTERM', async () => {
    let mode = 'error';
    const h = await createHarness({
      spawnImpl: () => {
        if (mode === 'error') {
          const broken = createFakeChild();
          setTimeout(() => broken.emit('error', new Error('boom spawn ENOENT')), 25);
          return broken;
        }
        return createFakeChild();
      }
    });
    try {
      const r1 = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'spa', timeLimit: '30s' })
      })).json();

      const sseRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/stream`);
      const text = await sseRes.text();
      assert.match(text, /event: job-error/);
      const failedRun = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/run?runId=${r1.runId}`)).json();
      assert.equal(failedRun.run.status, 'error');

      // Stop test
      mode = 'stop';
      const r2 = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'spa', timeLimit: '30s' })
      })).json();
      const stopRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: r2.runId })
      });
      assert.equal(stopRes.status, 200);
      const stoppedBody = await stopRes.json();
      assert.equal(stoppedBody.run.status, 'stopped');
    } finally {
      await h.close();
    }
  });

  test('shrink rejects multi-entry page-load (400) and shrinks single-entry violated run inside isolated hermetic child server', async () => {
    const shrinkSpawns = [];
    const h = await createHarness({
      spawnImpl: (cmd, args, opts) => {
        shrinkSpawns.push({ cmd, args, opts });
        if (args[1] === 'page-load' || args[1] === 'spa-canary') {
          const outDir = args[args.indexOf('--output-path') + 1];
          if (args[1] === 'page-load') {
            fs.mkdirSync(path.join(outDir, 'entry-0'), { recursive: true });
            fs.writeFileSync(path.join(outDir, 'entry-0', 'trace.jsonl'), `${makeFakeTraceLine()}\n`);
          } else {
            fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(path.join(outDir, 'trace.jsonl'), `${makeFakeTraceLine({ violation: 'hashMatchesPlace' })}\n`);
          }
          return createFakeChild({ autoExitCode: args[1] === 'spa-canary' ? 2 : 0, autoDelayMs: 15 });
        }
        if (args.includes('shrink')) {
          const outDir = args[args.indexOf('--output-path') + 1];
          fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'trace.jsonl'), `${makeFakeTraceLine({ violation: 'hashMatchesPlace' })}\n`);
          return createFakeChild({ autoExitCode: 0, autoDelayMs: 15 });
        }
        return createFakeChild();
      }
    });

    try {
      const plTrig = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'page-load', timeLimit: '30s' })
      })).json();
      await new Promise((r) => setTimeout(r, 80));

      const plShrink = await fetch(`${h.baseUrl}/api/test-runs/bombadil/shrink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: plTrig.runId })
      });
      assert.equal(plShrink.status, 400);

      const scTrig = await (await fetch(`${h.baseUrl}/api/test-runs/bombadil/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'spa-canary', timeLimit: '30s' })
      })).json();
      await new Promise((r) => setTimeout(r, 80));

      const shrinkRes = await fetch(`${h.baseUrl}/api/test-runs/bombadil/shrink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: scTrig.runId, timeLimit: '30s' })
      });
      assert.equal(shrinkRes.status, 200);
      const shrinkJson = await shrinkRes.json();
      assert.ok(fs.existsSync(path.join(shrinkJson.shrunkTracePath, 'trace.jsonl')));
      assert.equal(shrinkJson.stepsCount, 1);

      const serverSpawn = shrinkSpawns.find((s) => s.opts?.env?.BOMBADIL_CHILD_RUN === '1');
      assert.ok(serverSpawn, 'shrink must isolate server with BOMBADIL_CHILD_RUN=1');
      const bombadilShrink = shrinkSpawns.find((s) => s.args.includes('shrink'));
      assert.ok(bombadilShrink.args.some((a) => a.includes('spa-target.bombadil.ts')));
    } finally {
      await h.close();
    }
  });

  test('createBombadilClient bridges lab:bombadil-command -> fetch SSE -> lab:bombadil-state and enforces framed openTarget allowlist', async () => {
    let heldChild = null;
    const h = await createHarness({
      spawnImpl: (_cmd, args) => {
        const outDir = args[args.indexOf('--output-path') + 1];
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'trace.jsonl'), `${makeFakeTraceLine()}\n`);
        heldChild = createFakeChild({ autoExitCode: null });
        return heldChild;
      }
    });

    const prevCustomEvent = globalThis.CustomEvent;
    globalThis.CustomEvent = class extends Event {
      constructor(type, init = {}) {
        super(type);
        this.detail = init.detail;
      }
    };

    try {
      const targetSelections = [];
      const eventBus = new EventTarget();
      const observedStates = [];
      eventBus.addEventListener('lab:bombadil-state', (ev) => observedStates.push(ev.detail));

      const client = createBombadilClient({
        selectTarget: (url, cause) => targetSelections.push({ url, cause }),
        fetchImpl: (url, opts) => fetch(`${h.baseUrl}${url}`, opts),
        eventTarget: eventBus
      });

      assert.equal(client.openTarget('spa').ok, true);
      assert.equal(client.openTarget('urn:mcard:bombadil:trigger:spa-canary').ok, true);
      assert.equal(client.openTarget('workbench').ok, false);
      assert.equal(targetSelections.length, 2);

      eventBus.dispatchEvent(
        new globalThis.CustomEvent('lab:bombadil-command', {
          detail: { action: 'trigger', handle: 'urn:mcard:bombadil:trigger:spa', timeLimit: '30s' }
        })
      );

      await new Promise((r) => setTimeout(r, 80));
      heldChild.exitCode = 0;
      heldChild.emit('exit', 0, null);
      await new Promise((r) => setTimeout(r, 120));

      assert.ok(observedStates.some((s) => s.status === 'running' && s.triggerHandle === 'urn:mcard:bombadil:trigger:spa'));
      assert.ok(observedStates.some((s) => s.status === 'clean'));
      assert.equal(client.status().status, 'clean');

      client.destroy();
    } finally {
      globalThis.CustomEvent = prevCustomEvent;
      await h.close();
    }
  });

  if (process.env.BOMBADIL_LIVE_UNIT === '1') {
    test('LIVE: spawns real spa-canary subprocess and persists violation run', async () => {
      const tmpDir = makeTempDir('ssg04-live-');
      const storage = new CanonicalTriadBackend(path.join(tmpDir, 'live.db'));
      const runnerService = createBombadilRunnerService({ storage, registerSignals: false });
      try {
        const receipt = await runnerService.triggerRun({ target: 'spa-canary', timeLimit: '30s' });
        assert.ok(receipt.runId);
      } finally {
        await runnerService.destroy();
        storage.close();
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  }
});
