#!/usr/bin/env node
import { spawn as nodeSpawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolvePlaywrightServerContract } from '../../tests/fixtures/server-contract.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STAGESHOW_SCRIPTS_DIR = path.join(REPO_ROOT, 'tools', 'stageshow', 'scripts');
const HEALTH_TIMEOUT_MS = 30_000;
const HEALTH_POLL_MS = 250;
const SERVER_STOP_GRACE_MS = 5_000;

export const SWEEP_ROUTES = Object.freeze([
  '/responsive-lab.html',
  '/index.html?noredirect=1',
  '/sprint-registry.html',
  '/fiber-inspector.html',
  '/fiber-conformance.html',
  '/app.html'
]);

export const SWEEP_WIDTHS = Object.freeze([1440, 820, 390, 358]);

export const DEFAULT_CHECK_CSS_ARGS = Object.freeze([
  '--bundle',
  'tools/stageshow/teaching',
  '--bundle',
  'tools/stageshow/examples/looks',
  'tools/stageshow/examples',
  'tools/stageshow/teaching'
]);

const FLAGS_WITH_VALUE = new Set([
  '--select',
  '--width',
  '--delay',
  '--report',
  '--screenshot',
  '--out',
  '--every',
  '--count',
  '--at',
  '--cols',
  '--zoom',
  '--scale',
  '--pad',
  '--hover-for',
  '--leave-for',
  '--states-for',
  '--slow',
  '--ms'
]);

export function isRootRelativeTarget(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

export function resolveDefaultCheckCssArgs(restArgs = []) {
  return restArgs.length > 0 ? [...restArgs] : [...DEFAULT_CHECK_CSS_ARGS];
}

function findPositionalTargetIndex(restArgs) {
  for (let i = 0; i < restArgs.length; i += 1) {
    const token = restArgs[i];
    if (token === '--help') continue;
    if (token.startsWith('--')) {
      const flagName = token.split('=')[0];
      if (!token.includes('=') && FLAGS_WITH_VALUE.has(flagName)) {
        i += 1;
      }
      continue;
    }
    return i;
  }
  return -1;
}

export function parseStageShowRunnerArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') {
    throw new Error('Usage: node scripts/stageshow/run.mjs <layout|sweep|film|jumps|check-css> [options]');
  }

  if (command === 'check-css') {
    return { command, args: resolveDefaultCheckCssArgs(rest), help: rest.includes('--help') };
  }

  if (command === 'sweep') {
    let strict = false;
    let outputDir = null;
    const help = rest.includes('--help');
    for (let i = 0; i < rest.length; i += 1) {
      const arg = rest[i];
      if (arg === '--help') continue;
      if (arg === '--strict') strict = true;
      else if (arg === '--output-dir') outputDir = rest[++i];
      else if (arg.startsWith('--output-dir=')) outputDir = arg.slice('--output-dir='.length);
      else throw new Error(`Unknown sweep option "${arg}".`);
    }
    return { command, strict, outputDir, help };
  }

  if (command === 'layout' || command === 'film' || command === 'jumps') {
    const help = rest.includes('--help');
    const targetIndex = findPositionalTargetIndex(rest);
    const target = targetIndex >= 0 ? rest[targetIndex] : null;
    return { command, args: [...rest], targetIndex, target, help };
  }

  throw new Error(`Unknown StageShow subcommand "${command}". Expected layout, sweep, film, jumps, or check-css.`);
}

async function getFreePort(host = '127.0.0.1') {
  return await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, host, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function resolveChromePath(env) {
  if (env.CHROME_PATH) return env.CHROME_PATH;
  try {
    const pw = await import('playwright');
    const candidate = pw.chromium?.executablePath?.();
    if (candidate && fs.existsSync(candidate)) return candidate;
  } catch {
    // Allow browser.mjs to handle fallback errors if playwright package is absent.
  }
  return undefined;
}

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

async function waitForHealth(url, shouldStop) {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline && !shouldStop()) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Wait for ws-server to bind its socket.
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
  }
  if (!shouldStop()) {
    throw new Error(`Server did not answer ${url} within ${HEALTH_TIMEOUT_MS} ms.`);
  }
}

async function withHermeticServer(env, fn) {
  const port = env.TEST_PORT || String(await getFreePort('127.0.0.1'));
  const contract = resolvePlaywrightServerContract({ ...env, BASE_URL: '', TEST_PORT: port });
  const [cmd, ...args] = contract.command.split(/\s+/);
  const server = nodeSpawn(cmd, args, {
    cwd: REPO_ROOT,
    env: { ...env, ...contract.env },
    stdio: ['ignore', 'ignore', 'inherit']
  });
  const serverExit = watchExit(server);
  let starting = true;

  try {
    const serverDied = serverExit.then((result) => {
      if (starting) {
        throw new Error(`Server exited (${result.signal ?? `code ${result.code}`}) before healthy.`);
      }
    });
    await Promise.race([waitForHealth(contract.url, () => !starting), serverDied]);
    starting = false;
    return await fn(contract);
  } finally {
    starting = false;
    await stopChild(server, serverExit);
    if (contract.env.PW_EPHEMERAL_MCARD_DB === '1') {
      fs.rmSync(path.dirname(contract.mcardDbPath), { recursive: true, force: true });
    }
  }
}

async function runNodeScript(scriptPath, args, env, stdio = 'inherit') {
  const child = nodeSpawn(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    env,
    stdio
  });
  const result = await watchExit(child);
  if (result.error) throw result.error;
  return result.code ?? 1;
}

function slugifyRoute(route) {
  return route
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'root';
}

async function runSweep(options, childEnv) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = options.outputDir
    ? path.resolve(REPO_ROOT, options.outputDir)
    : path.join(REPO_ROOT, 'stageshow-output', `sweep-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const layoutScript = path.join(STAGESHOW_SCRIPTS_DIR, 'layout.mjs');
  const results = [];

  await withHermeticServer(childEnv, async (contract) => {
    for (const route of SWEEP_ROUTES) {
      for (const width of SWEEP_WIDTHS) {
        const slug = `${slugifyRoute(route)}-w${width}`;
        const reportPath = path.join(outDir, `${slug}.layout.json`);
        const screenshotPath = path.join(outDir, `${slug}.png`);
        const targetUrl = `${contract.baseURL}${route}`;
        const exitCode = await runNodeScript(
          layoutScript,
          [targetUrl, '--width', String(width), '--delay', '400', '--report', reportPath, '--screenshot', screenshotPath],
          childEnv,
          'pipe'
        );
        const report = fs.existsSync(reportPath)
          ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
          : { status: 'missing-report', scopes: [], errors: ['Report file missing'] };
        const scope = report.scopes?.[0] || {};
        const checked = scope.checked || { controls: 0, paddedContainers: 0 };
        const findings = scope.findings || [];
        const errors = report.errors || [];
        results.push({
          route,
          width,
          status: report.status,
          exitCode,
          controlsChecked: checked.controls || 0,
          paddedContainersChecked: checked.paddedContainers || 0,
          findingsCount: findings.length,
          findings,
          errorsCount: errors.length,
          errors,
          reportPath: path.relative(REPO_ROOT, reportPath),
          screenshotPath: path.relative(REPO_ROOT, screenshotPath)
        });
      }
    }
  });

  const totalFindings = results.reduce((sum, r) => sum + r.findingsCount, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errorsCount, 0);
  const summary = {
    generatedAt: new Date().toISOString(),
    routes: SWEEP_ROUTES,
    widths: SWEEP_WIDTHS,
    snapshotCount: results.length,
    totalFindings,
    totalErrors,
    outputDir: path.relative(REPO_ROOT, outDir),
    results
  };
  const summaryPath = path.join(outDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log(`StageShow sweep output: ${path.relative(REPO_ROOT, summaryPath)}`);
  for (const row of results) {
    console.log(`${row.route} @ ${row.width}px: status=${row.status} controls=${row.controlsChecked} containers=${row.paddedContainersChecked} findings=${row.findingsCount} errors=${row.errorsCount}`);
  }
  console.log(`StageShow sweep totals: snapshots=${results.length} findings=${totalFindings} errors=${totalErrors}`);

  if (options.strict && (totalFindings > 0 || totalErrors > 0)) {
    return 1;
  }
  return results.some((r) => r.exitCode === 2 && !options.strict && r.errorsCount > 0 && r.controlsChecked === 0) ? 2 : 0;
}

async function main(argv) {
  try {
    const parsed = parseStageShowRunnerArgs(argv);
    const chromePath = await resolveChromePath(process.env);
    const childEnv = chromePath ? { ...process.env, CHROME_PATH: chromePath } : { ...process.env };

    if (parsed.command === 'check-css') {
      if (parsed.help) {
        process.exitCode = await runNodeScript(path.join(STAGESHOW_SCRIPTS_DIR, 'class-clash.mjs'), ['--help'], childEnv);
        return;
      }
      process.exitCode = await runNodeScript(path.join(STAGESHOW_SCRIPTS_DIR, 'class-clash.mjs'), parsed.args, childEnv);
      return;
    }

    if (parsed.command === 'sweep') {
      if (parsed.help) {
        console.log('Usage: node scripts/stageshow/run.mjs sweep [--strict] [--output-dir <dir>]');
        return;
      }
      process.exitCode = await runSweep(parsed, childEnv);
      return;
    }

    const scriptFile = path.join(STAGESHOW_SCRIPTS_DIR, `${parsed.command}.mjs`);
    if (parsed.help || !isRootRelativeTarget(parsed.target)) {
      process.exitCode = await runNodeScript(scriptFile, parsed.args, childEnv);
      return;
    }

    process.exitCode = await withHermeticServer(childEnv, async (contract) => {
      const forwarded = [...parsed.args];
      forwarded[parsed.targetIndex] = `${contract.baseURL}${parsed.target}`;
      return await runNodeScript(scriptFile, forwarded, childEnv);
    });
  } catch (err) {
    console.error(`[stageshow] ${err.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(process.argv.slice(2));
}
