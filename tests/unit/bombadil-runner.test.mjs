import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PORT,
  parseRunnerArgs,
  prepareOutputDir,
  resolveBombadilBin,
  resolveRunPlan,
  runPlan
} from '../../scripts/bombadil/run.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bombadil-runner-'));

function fakeChild(exitCode) {
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.killed = [];
  child.kill = (signal) => {
    child.killed.push(signal);
    child.exitCode = 0;
    child.emit('exit', 0, null);
  };
  if (exitCode !== undefined) {
    setImmediate(() => {
      child.exitCode = exitCode;
      child.emit('exit', exitCode, null);
    });
  }
  return child;
}

test('parses the target, the runner options and pass-through Bombadil options', () => {
  const options = parseRunnerArgs(['spa', '--time-limit', '5m', '--', '--swarm']);
  assert.deepEqual(options, { target: 'spa', timeLimit: '5m', outputPath: null, extra: ['--swarm'] });
});

test('rejects an unknown target and an unknown runner option', () => {
  assert.throws(() => parseRunnerArgs(['nope']), /Unknown target "nope"/);
  assert.throws(() => parseRunnerArgs(['spa', '--headful']), /Unknown runner option "--headful"/);
});

test('refuses the repository database', () => {
  const options = parseRunnerArgs(['spa']);
  const env = { MCARD_DB_PATH: path.join(REPO_ROOT, 'data', 'mcard-api.db') };
  assert.throws(
    () => resolveRunPlan(options, { env, repoRoot: tempDir() }),
    /must not target the repository data\/mcard-api\.db/
  );
});

test('refuses an output path that already holds a trace', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'trace.jsonl'), '{}\n');
  assert.throws(() => prepareOutputDir(dir, { target: 'spa' }), /already holds a trace\.jsonl/);
});

test('gives each run a fresh output directory and a private port', () => {
  const repoRoot = tempDir();
  const plan = resolveRunPlan(parseRunnerArgs(['spa-canary']), {
    env: {},
    repoRoot,
    now: new Date('2026-11-17T00:00:00Z')
  });
  assert.equal(plan.outputDir, path.join(repoRoot, 'bombadil-output', 'spa-canary-2026-11-17T00-00-00-000Z'));
  assert.ok(fs.existsSync(plan.outputDir), 'output directory created');
  assert.ok(plan.bombadilArgs.includes(`http://localhost:${DEFAULT_PORT}/tests/bombadil/fixtures/spa-test-target-canary.html`));
  assert.equal(plan.serverEnv.TEST_PORT, DEFAULT_PORT);
  assert.ok(!plan.bombadilEnv.NODE_OPTIONS?.includes('server-contract'), 'Bombadil gets no server preload');
});

function healthAfterSpawn(spawnedRef) {
  return async () => {
    if (spawnedRef.length === 0) throw new Error('connection refused');
    return { ok: true };
  };
}

function planFor(target = 'spa') {
  return resolveRunPlan(parseRunnerArgs([target]), { env: { BOMBADIL_BIN: '/bin/bombadil' }, repoRoot: tempDir() });
}

test('passes a violation exit code through and stops the server', async () => {
  const server = fakeChild();
  const spawned = [];
  const spawn = (command) => {
    spawned.push(command);
    return command === '/bin/bombadil' ? fakeChild(2) : server;
  };
  const code = await runPlan(planFor(), { spawn, fetchImpl: healthAfterSpawn(spawned), log: () => {} });
  assert.equal(code, 2, 'violation exit code propagated');
  assert.deepEqual(spawned, ['node', '/bin/bombadil']);
  assert.deepEqual(server.killed, ['SIGTERM'], 'server stopped once');
});

test('refuses to start when something already answers the health URL', async () => {
  const spawned = [];
  const logs = [];
  const code = await runPlan(planFor(), {
    spawn: (command) => spawned.push(command),
    fetchImpl: async () => ({ ok: true }),
    log: (line) => logs.push(line)
  });
  assert.equal(code, 1);
  assert.deepEqual(spawned, [], 'no server and no Bombadil spawned');
  assert.match(logs.join('\n'), /already answers/);
});

test('fails fast when the server exits before it is healthy', async () => {
  const spawned = [];
  const logs = [];
  const started = Date.now();
  const code = await runPlan(planFor(), {
    spawn: (command) => {
      spawned.push(command);
      return fakeChild(1);
    },
    fetchImpl: async () => {
      throw new Error('connection refused');
    },
    healthTimeoutMs: 20_000,
    log: (line) => logs.push(line)
  });
  assert.equal(code, 1);
  assert.deepEqual(spawned, ['node'], 'Bombadil never starts');
  assert.ok(Date.now() - started < 2_000, 'did not wait for the health timeout');
  assert.match(logs.join('\n'), /exited \(code 1\) before it was healthy/);
});

test('reports a Bombadil binary that cannot start as a setup failure', async () => {
  const server = fakeChild();
  const spawned = [];
  const spawn = (command) => {
    spawned.push(command);
    if (command !== '/bin/bombadil') return server;
    const missing = fakeChild();
    setImmediate(() => missing.emit('error', new Error('spawn ENOENT')));
    return missing;
  };
  const logs = [];
  const code = await runPlan(planFor(), { spawn, fetchImpl: healthAfterSpawn(spawned), log: (line) => logs.push(line) });
  assert.equal(code, 1);
  assert.match(logs.join('\n'), /Could not start \/bin\/bombadil: spawn ENOENT/);
  assert.deepEqual(server.killed, ['SIGTERM'], 'server still stopped');
});

test('finds a hoisted Bombadil binary above the repository and prefers BOMBADIL_BIN', () => {
  const workspace = tempDir();
  const repoRoot = path.join(workspace, 'LandingPage');
  fs.mkdirSync(repoRoot);
  const hoisted = path.join(workspace, 'node_modules', '.bin', 'bombadil');
  fs.mkdirSync(path.dirname(hoisted), { recursive: true });
  fs.writeFileSync(hoisted, '');
  assert.equal(resolveBombadilBin(repoRoot, {}), hoisted, 'monorepo layout');

  const local = path.join(repoRoot, 'node_modules', '.bin', 'bombadil');
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, '');
  assert.equal(resolveBombadilBin(repoRoot, {}), local, 'standalone layout wins when present');
  assert.equal(resolveBombadilBin(repoRoot, { BOMBADIL_BIN: '/opt/bombadil' }), '/opt/bombadil');
});

test('ignores an ambient BASE_URL and rejects flags the runner owns', () => {
  const plan = resolveRunPlan(parseRunnerArgs(['spa']), { env: { BASE_URL: 'http://elsewhere:9999' }, repoRoot: tempDir() });
  assert.ok(plan.bombadilArgs.some((arg) => arg.startsWith(`http://localhost:${DEFAULT_PORT}/`)));
  assert.ok(!plan.bombadilArgs.some((arg) => arg.includes('elsewhere')));
  assert.throws(() => parseRunnerArgs(['spa', '--', '--output-path=/tmp/x']), /set by the runner/);
});

test('page-load plans one bounded run per entry URL', async () => {
  const { ENTRY_URLS, ALLOW_URLS } = await import('../../tests/bombadil/generated/workbench-net.ts');
  const repoRoot = tempDir();
  const plan = resolveRunPlan(parseRunnerArgs(['page-load']), { env: {}, repoRoot });
  assert.equal(plan.runs.length, ENTRY_URLS.length);
  const outputDirs = new Set();
  for (const [index, run] of plan.runs.entries()) {
    const entryUrl = ENTRY_URLS[index];
    assert.ok(run.args.includes(`http://localhost:${DEFAULT_PORT}${entryUrl}`), entryUrl);
    for (const pattern of ALLOW_URLS[entryUrl]) {
      const at = run.args.indexOf('--allow-url');
      assert.ok(at >= 0 && run.args.includes(pattern), `${entryUrl} allows ${pattern}`);
    }
    assert.equal(run.args.filter((arg) => arg === '--output-path').length, 1);
    assert.ok(fs.existsSync(run.outputDir), run.outputDir);
    outputDirs.add(run.outputDir);
  }
  assert.equal(outputDirs.size, plan.runs.length, 'each entry has its own output directory');
  assert.equal(plan.outputDir, path.dirname(plan.runs[0].outputDir));
});

test('workbench plans one run on the lab bounded by the lab allow list', async () => {
  const { ALLOW_URLS } = await import('../../tests/bombadil/generated/workbench-net.ts');
  const plan = resolveRunPlan(parseRunnerArgs(['workbench', '--time-limit', '10m']), { env: {}, repoRoot: tempDir() });
  assert.equal(plan.runs.length, 1);
  const { args } = plan.runs[0];
  assert.ok(args.includes(`http://localhost:${DEFAULT_PORT}/responsive-lab.html`));
  assert.ok(args.at(-1).endsWith('tests/bombadil/workbench.bombadil.ts'));
  const allowed = args.flatMap((arg, i) => (arg === '--allow-url' ? [args[i + 1]] : []));
  assert.deepEqual(allowed, [...ALLOW_URLS['/responsive-lab.html']]);
  assert.equal(args[args.indexOf('--time-limit') + 1], '10m');
});

test('BOMBADIL_EXTRA_ARGS reaches every run, so a container can pass --no-sandbox to the canary too', () => {
  const plan = resolveRunPlan(parseRunnerArgs(['page-load', '--', '--width', '1280']), {
    env: { BOMBADIL_EXTRA_ARGS: ' --no-sandbox ' },
    repoRoot: tempDir()
  });
  for (const run of plan.runs) {
    const at = run.args.indexOf('--no-sandbox');
    assert.ok(at >= 0, run.startUrl);
    assert.ok(run.args.includes('--width'));
    assert.ok(at < run.args.indexOf(run.startUrl), 'options come before the start URL');
  }
  assert.throws(
    () => resolveRunPlan(parseRunnerArgs(['spa']), { env: { BOMBADIL_EXTRA_ARGS: '--time-limit 5s' }, repoRoot: tempDir() }),
    /set by the runner/
  );
});

test('single-page targets other than workbench pass no allow list', () => {
  const plan = resolveRunPlan(parseRunnerArgs(['lab-smoke']), { env: {}, repoRoot: tempDir() });
  assert.ok(!plan.runs[0].args.includes('--allow-url'));
});

test('page-load runs every entry and stops the server once', async () => {
  const server = fakeChild();
  const spawned = [];
  const spawn = (command) => {
    spawned.push(command);
    return command === '/bin/bombadil' ? fakeChild(spawned.filter((c) => c === '/bin/bombadil').length === 2 ? 2 : 0) : server;
  };
  const code = await runPlan(planFor('page-load'), { spawn, fetchImpl: healthAfterSpawn(spawned), log: () => {} });
  assert.equal(code, 1, 'a failing entry fails the target');
  assert.equal(spawned.filter((command) => command === '/bin/bombadil').length, 6, 'every entry ran');
  assert.deepEqual(server.killed, ['SIGTERM'], 'server stopped once');
});
