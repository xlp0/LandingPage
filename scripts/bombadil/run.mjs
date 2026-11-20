#!/usr/bin/env node
import { spawn as nodeSpawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolvePlaywrightServerContract } from '../../tests/fixtures/server-contract.js';
import { ALLOW_URLS, ENTRY_URLS } from '../../tests/bombadil/generated/workbench-net.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DEFAULT_PORT = '3021';
export const DEFAULT_TIME_LIMIT = '2m';
const HEALTH_TIMEOUT_MS = 30_000;
const HEALTH_POLL_MS = 250;
const SERVER_STOP_GRACE_MS = 5_000;
const RESERVED_BOMBADIL_FLAGS = Object.freeze(['--headless', '--exit-on-violation', '--time-limit', '--output-path', '--output-path-overwrite']);
const SIGNAL_EXIT_CODES = Object.freeze({ SIGINT: 130, SIGTERM: 143 });

export const TARGETS = Object.freeze({
  spa: { spec: 'tests/bombadil/spa-target.bombadil.ts', path: '/tests/fixtures/spa-test-target.html' },
  'spa-canary': { spec: 'tests/bombadil/spa-target.bombadil.ts', path: '/tests/bombadil/fixtures/spa-test-target-canary.html' },
  'lab-smoke': { spec: 'tests/bombadil/lab-smoke.bombadil.ts', path: '/responsive-lab.html' },
  'page-load': { spec: 'tests/bombadil/page-load.bombadil.ts', path: null },
  // The workbench run may follow links, so it is bounded by the lab's generated allow list.
  workbench: {
    spec: 'tests/bombadil/workbench.bombadil.ts',
    path: '/responsive-lab.html',
    allowUrls: ALLOW_URLS['/responsive-lab.html']
  }
});

function assertNotReserved(args) {
  const reserved = args.find((arg) => RESERVED_BOMBADIL_FLAGS.includes(arg.split('=')[0]));
  if (reserved) {
    throw new Error(`"${reserved}" is set by the runner and cannot be passed after "--".`);
  }
}

// BOMBADIL_EXTRA_ARGS adds Bombadil options to every run, including the canary's, which
// calls this runner itself. The Docker image sets it to --no-sandbox.
export function envExtraArgs(env) {
  const extra = String(env.BOMBADIL_EXTRA_ARGS ?? '').split(/\s+/).filter(Boolean);
  assertNotReserved(extra);
  return extra;
}

export function parseRunnerArgs(argv) {
  const [target, ...rest] = argv;
  const options = { target, timeLimit: DEFAULT_TIME_LIMIT, outputPath: null, extra: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--') {
      options.extra = rest.slice(i + 1);
      break;
    }
    if (arg === '--time-limit') options.timeLimit = rest[++i];
    else if (arg.startsWith('--time-limit=')) options.timeLimit = arg.slice('--time-limit='.length);
    else if (arg === '--output-path') options.outputPath = rest[++i];
    else if (arg.startsWith('--output-path=')) options.outputPath = arg.slice('--output-path='.length);
    else throw new Error(`Unknown runner option "${arg}". Pass Bombadil options after "--".`);
  }
  assertNotReserved(options.extra);
  if (!TARGETS[options.target]) {
    throw new Error(`Unknown target "${options.target}". Known targets are ${Object.keys(TARGETS).join(', ')}.`);
  }
  return options;
}

export function prepareOutputDir(outputPath, { repoRoot = REPO_ROOT, target, now = new Date() } = {}) {
  const dir = outputPath
    ? path.resolve(outputPath)
    : path.join(repoRoot, 'bombadil-output', `${target}-${now.toISOString().replace(/[:.]/g, '-')}`);
  if (fs.existsSync(path.join(dir, 'trace.jsonl'))) {
    throw new Error(`Output path ${dir} already holds a trace.jsonl. Bombadil refuses to overwrite it.`);
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// npm hoists the binary to the workspace root in the monorepo, and keeps it local in a standalone install.
export function resolveBombadilBin(repoRoot, env = process.env) {
  if (env.BOMBADIL_BIN) return env.BOMBADIL_BIN;
  for (let dir = path.resolve(repoRoot); ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', '.bin', 'bombadil');
    if (fs.existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) return path.join(repoRoot, 'node_modules', '.bin', 'bombadil');
  }
}

export function stripServerContractImport(nodeOptions) {
  if (typeof nodeOptions !== 'string' || !nodeOptions.trim()) return '';
  const tokens = nodeOptions.trim().split(/\s+/);
  const kept = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok === '--import' && i + 1 < tokens.length && tokens[i + 1].includes('server-contract.js')) {
      i += 1;
      continue;
    }
    if (tok.startsWith('--import=') && tok.includes('server-contract.js')) {
      continue;
    }
    kept.push(tok);
  }
  return kept.join(' ');
}

export function resolveRunPlan(options, { env = process.env, repoRoot = REPO_ROOT, now } = {}) {
  const cleanEnv = { ...env };
  delete cleanEnv.PORT;
  delete cleanEnv.PW_REUSE_SERVER;
  delete cleanEnv.PW_EPHEMERAL_MCARD_DB;
  delete cleanEnv.PW_SERVER_BOOT_GUARD;
  const cleanedNodeOpts = stripServerContractImport(cleanEnv.NODE_OPTIONS);
  if (cleanedNodeOpts) cleanEnv.NODE_OPTIONS = cleanedNodeOpts;
  else delete cleanEnv.NODE_OPTIONS;

  // BASE_URL is cleared so the start URL always points at the server this runner starts.
  const contract = resolvePlaywrightServerContract({
    ...cleanEnv,
    BASE_URL: '',
    TEST_PORT: cleanEnv.BOMBADIL_PORT ?? DEFAULT_PORT
  });
  const target = TARGETS[options.target];
  const outputDir = prepareOutputDir(options.outputPath, { repoRoot, target: options.target, now });
  const entries = target.path === null
    ? ENTRY_URLS.map((entryUrl, index) => ({
      startUrl: `${contract.baseURL}${entryUrl}`,
      allowUrls: ALLOW_URLS[entryUrl] ?? [],
      outputDir: path.join(outputDir, `entry-${index}`)
    }))
    : [{ startUrl: `${contract.baseURL}${target.path}`, allowUrls: target.allowUrls ?? [], outputDir }];
  const runs = entries.map((entry) => {
    if (entry.outputDir !== outputDir) fs.mkdirSync(entry.outputDir, { recursive: true });
    return {
      startUrl: entry.startUrl,
      outputDir: entry.outputDir,
      args: [
        'browser', 'test', '--headless', '--exit-on-violation',
        '--time-limit', options.timeLimit,
        '--output-path', entry.outputDir,
        ...entry.allowUrls.flatMap((pattern) => ['--allow-url', pattern]),
        ...envExtraArgs(cleanEnv),
        ...options.extra,
        entry.startUrl,
        path.join(repoRoot, target.spec)
      ]
    };
  });
  return {
    bombadilBin: resolveBombadilBin(repoRoot, cleanEnv),
    runs,
    bombadilArgs: runs[0].args,
    serverArgv: contract.command.split(/\s+/),
    serverEnv: { ...cleanEnv, ...contract.env, BOMBADIL_CHILD_RUN: '1' },
    bombadilEnv: { ...cleanEnv },
    healthUrl: contract.url,
    outputDir,
    repoRoot
  };
}

async function waitForHealth(url, { fetchImpl = fetch, timeoutMs = HEALTH_TIMEOUT_MS, shouldStop = () => false } = {}) {
  timeoutMs ??= HEALTH_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !shouldStop()) {
    try {
      if ((await fetchImpl(url)).ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
  }
  if (shouldStop()) return;
  throw new Error(`Server did not answer ${url} within ${timeoutMs} ms.`);
}

async function assertNothingServing(url, fetchImpl) {
  const answered = await fetchImpl(url).then((response) => response.ok, () => false);
  if (answered) {
    throw new Error(`Something already answers ${url}. Stop it, or set BOMBADIL_PORT, so the run cannot test a foreign server.`);
  }
}

// Attach exit and error listeners the moment a child exists, so a failed spawn can never go unhandled.
function watchExit(child) {
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal, error: null }));
    child.once('error', (error) => resolve({ code: null, signal: null, error }));
  });
}

async function stopChild(child, exited) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), SERVER_STOP_GRACE_MS);
  await exited;
  clearTimeout(timer);
}

function serverFailure({ code, signal, error }) {
  if (error) return new Error(`Server failed to start: ${error.message}`);
  return new Error(`Server exited (${signal ?? `code ${code}`}) before it was healthy. Is the port already in use?`);
}

export async function runPlan(plan, options = {}) {
  const { spawn = nodeSpawn, fetchImpl = fetch, log = console.error, healthTimeoutMs, handleSignals = false } = options;
  try {
    await assertNothingServing(plan.healthUrl, fetchImpl);
  } catch (error) {
    log(`[bombadil] ${error.message}`);
    return 1;
  }
  const [command, ...args] = plan.serverArgv;
  const server = spawn(command, args, { cwd: plan.repoRoot, env: plan.serverEnv, stdio: ['ignore', 'inherit', 'inherit'] });
  const serverExit = watchExit(server);
  let bombadil = null;
  let bombadilExit = null;
  let interrupted = null;
  let starting = true;
  const onSignal = (signal) => {
    interrupted = signal;
    bombadil?.kill(signal);
    server.kill(signal);
  };
  if (handleSignals) for (const signal of Object.keys(SIGNAL_EXIT_CODES)) process.once(signal, onSignal);
  try {
    const serverDied = serverExit.then((result) => {
      if (starting) throw serverFailure(result);
    });
    const healthy = waitForHealth(plan.healthUrl, { fetchImpl, timeoutMs: healthTimeoutMs, shouldStop: () => !starting });
    await Promise.race([healthy, serverDied]);
    starting = false;
    const failures = [];
    for (const run of plan.runs) {
      log(`[bombadil] output ${run.outputDir}`);
      bombadil = spawn(plan.bombadilBin, run.args, { cwd: plan.repoRoot, env: plan.bombadilEnv, stdio: 'inherit' });
      bombadilExit = watchExit(bombadil);
      const result = await bombadilExit;
      if (result.error) throw new Error(`Could not start ${plan.bombadilBin}: ${result.error.message}`);
      if (interrupted) return SIGNAL_EXIT_CODES[interrupted];
      if ((result.code ?? 1) !== 0) failures.push({ startUrl: run.startUrl, code: result.code ?? 1 });
      bombadil = null;
      bombadilExit = null;
    }
    if (failures.length === 0) return 0;
    log(`[bombadil] failing runs\n${failures.map((run) => `${run.startUrl}: exit ${run.code}`).join('\n')}`);
    return plan.runs.length === 1 ? failures[0].code : 1;
  } catch (error) {
    log(`[bombadil] ${error.message}`);
    return interrupted ? SIGNAL_EXIT_CODES[interrupted] : 1;
  } finally {
    starting = false;
    if (handleSignals) for (const signal of Object.keys(SIGNAL_EXIT_CODES)) process.off(signal, onSignal);
    await stopChild(bombadil, bombadilExit);
    await stopChild(server, serverExit);
  }
}

async function main(argv) {
  try {
    const plan = resolveRunPlan(parseRunnerArgs(argv));
    process.exitCode = await runPlan(plan, { handleSignals: true });
  } catch (error) {
    console.error(`[bombadil] ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(process.argv.slice(2));
}
