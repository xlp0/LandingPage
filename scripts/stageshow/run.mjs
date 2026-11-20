#!/usr/bin/env node
import { spawn as nodeSpawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolvePlaywrightServerContract } from '../../tests/fixtures/server-contract.js';
import { launch } from '../../tools/stageshow/scripts/browser.mjs';
import { auditLayout, layoutResult } from '../../tools/stageshow/scripts/layout-core.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STAGESHOW_DIR = path.join(REPO_ROOT, 'tools', 'stageshow');
const STAGESHOW_SCRIPTS_DIR = path.join(STAGESHOW_DIR, 'scripts');
const STAGESHOW_SCENES_DIR = path.join(STAGESHOW_DIR, 'scenes');
const HEALTH_TIMEOUT_MS = 30_000;
const HEALTH_POLL_MS = 250;
const SERVER_STOP_GRACE_MS = 5_000;

export const SWEEP_ROUTES = Object.freeze([
  '/responsive-lab.html',
  '/index.html?noredirect=1',
  '/sprint-registry.html',
  '/fiber-inspector.html',
  '/fiber-conformance.html'
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
  if (restArgs.length > 0) return [...restArgs];
  const args = [...DEFAULT_CHECK_CSS_ARGS];
  if (!fs.existsSync(STAGESHOW_SCENES_DIR)) return args;

  const sceneDirs = fs
    .readdirSync(STAGESHOW_SCENES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const scene of sceneDirs) {
    const relSceneDir = `tools/stageshow/scenes/${scene}`;
    args.push('--bundle', relSceneDir, relSceneDir);
  }
  return args;
}

export function resolveFilmArgs(args = []) {
  if (args.includes('--help')) return [...args];
  const hasOut = args.some((arg) => arg === '--out' || arg.startsWith('--out='));
  if (hasOut) return [...args];
  return [...args, '--out', 'stageshow-output/film.png'];
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
      else if (arg === '--output-dir') {
        const val = rest[++i];
        if (!val || val.startsWith('--')) throw new Error('--output-dir requires a value.');
        outputDir = val;
      } else if (arg.startsWith('--output-dir=')) {
        outputDir = arg.slice('--output-dir='.length);
      } else {
        throw new Error(`Unknown sweep option "${arg}".`);
      }
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

export function parseLayoutOptions(args = []) {
  const options = {
    select: 'body',
    width: 1280,
    delay: 300,
    report: null,
    screenshot: null,
    strict: false,
    target: null
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help') continue;
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      const key = eqIdx >= 0 ? arg.slice(2, eqIdx) : arg.slice(2);
      if (!/^(select|width|delay|report|screenshot)$/.test(key)) {
        throw new Error(`unexpected layout option: ${arg}`);
      }
      const val = eqIdx >= 0 ? arg.slice(eqIdx + 1) : args[++i];
      if (val === undefined || (eqIdx < 0 && val.startsWith('--'))) {
        throw new Error(`--${key} requires a value`);
      }
      options[key] = val;
      continue;
    }
    if (options.target) {
      throw new Error(`unexpected argument: ${arg}`);
    }
    options.target = arg;
  }

  options.width = Number(options.width);
  options.delay = Number(options.delay);
  if (!Number.isInteger(options.width) || options.width < 1) {
    throw new Error('--width must be a positive integer');
  }
  if (!Number.isInteger(options.delay) || options.delay < 0) {
    throw new Error('--delay must be a nonnegative integer');
  }
  return options;
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

export async function seedPortalLanding(baseURL) {
  const endpoint = `${String(baseURL).replace(/\/+$/, '')}/api/mcard/landing`;
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '# Sovereign MCard Portal\n\nStageShow verification fixture.'
    })
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Failed to seed ${endpoint}: HTTP ${response.status} ${body}`.trim());
  }
  return response;
}

async function runSpawn(command, args, env, stdio = 'inherit') {
  const child = nodeSpawn(command, args, {
    cwd: REPO_ROOT,
    env,
    stdio
  });
  const result = await watchExit(child);
  if (result.error) throw result.error;
  return result.code ?? 1;
}

async function runNodeScript(scriptPath, args, env, stdio = 'inherit') {
  return await runSpawn(process.execPath, [scriptPath, ...args], env, stdio);
}

async function ensureBuiltArtifacts(env) {
  if (env.SKIP_BUILD === '1') return;

  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const astroCode = await runSpawn(npmBin, ['run', 'build:astro'], env, 'inherit');
  if (astroCode !== 0) {
    throw new Error(`Pre-flight "npm run build:astro" exited with code ${astroCode}.`);
  }

  const buildScenesScript = path.join(STAGESHOW_DIR, 'build-scenes.mjs');
  if (fs.existsSync(buildScenesScript) && fs.existsSync(STAGESHOW_SCENES_DIR)) {
    const hasScenes = fs
      .readdirSync(STAGESHOW_SCENES_DIR, { withFileTypes: true })
      .some((entry) => entry.isDirectory() && fs.existsSync(path.join(STAGESHOW_SCENES_DIR, entry.name, 'index.tsx')));
    if (hasScenes) {
      const scenesCode = await runNodeScript(buildScenesScript, [], env, 'inherit');
      if (scenesCode !== 0) {
        throw new Error(`Pre-flight "node tools/stageshow/build-scenes.mjs" exited with code ${scenesCode}.`);
      }
    }
  }
}

export async function withHermeticServer(env, fn) {
  await ensureBuiltArtifacts(env);

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
    await seedPortalLanding(contract.baseURL);
    return await fn(contract);
  } finally {
    starting = false;
    await stopChild(server, serverExit);
    if (contract.env.PW_EPHEMERAL_MCARD_DB === '1') {
      fs.rmSync(path.dirname(contract.mcardDbPath), { recursive: true, force: true });
    }
  }
}

function slugifyRoute(route) {
  return route
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'root';
}

async function auditPageInBrowser(browser, targetUrl, options = {}) {
  const select = options.select ?? 'body';
  const width = options.width ?? 1280;
  const delay = options.delay ?? 300;
  const screenshot = options.screenshot ?? null;
  const reportPath = options.report ?? null;
  const strict = Boolean(options.strict);

  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const scopes = [];
  let geometry = {
    pageState: null,
    innerWidth: width,
    scrollWidth: width,
    hasOverflow: false,
    clippedControls: []
  };

  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400 && !/\/favicon\./.test(response.url())) {
      errors.push(`resource: ${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.locator(select).first().waitFor({ state: 'visible', timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready);
    await page
      .waitForFunction(() => document.body?.dataset?.pageState !== 'loading', null, { timeout: 10_000 })
      .catch(() => errors.push('readiness: document.body.dataset.pageState stayed "loading" after 10000ms'));

    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    for (const root of await page.locator(select).all()) {
      if (await root.isVisible()) {
        scopes.push({ selector: select, ...(await root.evaluate(auditLayout)) });
      }
    }

    geometry = await page.evaluate(() => {
      const vw = window.innerWidth;
      const docEl = document.documentElement;
      const scrollWidth = docEl ? docEl.scrollWidth : vw;
      const pageState = document.body?.dataset?.pageState ?? null;

      const selector = [
        'header button',
        'header a[href]',
        'header [role="button"]',
        'header [role="tab"]',
        'header select',
        'header input:not([type="hidden"])',
        'header [data-testid]',
        'header .badge',
        'header .pill',
        'nav button',
        'nav a[href]',
        'nav [role="button"]',
        'nav [role="tab"]',
        '[role="banner"] button',
        '[role="banner"] a[href]',
        '[role="navigation"] button',
        '[role="navigation"] a[href]',
        '.top-controls > *',
        'button',
        '[role="button"]',
        '[role="tab"]',
        'a[href]',
        'select',
        'input:not([type="hidden"])'
      ].join(', ');

      const descriptor = (el) => {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const cls =
          typeof el.className === 'string' && el.className.trim()
            ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
            : '';
        return `${tag}${id}${cls}`;
      };

      const isHiddenOrSrOnly = (el) => {
        for (let a = el; a; a = a.parentElement) {
          if (
            a.hasAttribute('hidden') ||
            a.getAttribute('aria-hidden') === 'true' ||
            a.hasAttribute('inert') ||
            a.matches('dialog:not([open])')
          ) {
            return true;
          }
          const cs = getComputedStyle(a);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) {
            return true;
          }
          if (
            a.classList?.contains('sr-only') ||
            cs.clipPath === 'inset(50%)' ||
            cs.clip === 'rect(0px, 0px, 0px, 0px)'
          ) {
            return true;
          }
        }
        return false;
      };

      const insideBoundedScroller = (el) => {
        for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') {
            const ar = a.getBoundingClientRect();
            if (ar.left >= -1 && ar.right <= vw + 1) {
              return true;
            }
          }
        }
        return false;
      };

      const candidates = new Set(document.querySelectorAll(selector));
      const clippedControls = [];

      for (const el of candidates) {
        if (isHiddenOrSrOnly(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || (r.width <= 1.5 && r.height <= 1.5) || r.bottom <= 0) {
          continue;
        }
        if (insideBoundedScroller(el)) continue;
        if (r.left < -1 || r.right > vw + 1) {
          clippedControls.push({
            element: descriptor(el),
            left: Math.round(r.left * 100) / 100,
            right: Math.round(r.right * 100) / 100,
            width: Math.round(r.width * 100) / 100,
            innerWidth: vw
          });
        }
      }

      return {
        pageState,
        innerWidth: vw,
        scrollWidth,
        hasOverflow: scrollWidth > vw + 1,
        clippedControls
      };
    });

    if (screenshot) {
      const absScreenshot = path.resolve(REPO_ROOT, screenshot);
      fs.mkdirSync(path.dirname(absScreenshot), { recursive: true });
      await page.screenshot({ path: absScreenshot });
    }
  } catch (error) {
    errors.push(error.message);
  } finally {
    await context.close().catch(() => {});
  }

  const result = layoutResult(scopes, errors, strict);
  result.viewport = { width, height: 1000 };
  result.url = targetUrl;
  result.pageState = geometry.pageState;
  result.innerWidth = geometry.innerWidth;
  result.scrollWidth = geometry.scrollWidth;
  result.hasOverflow = geometry.hasOverflow;
  result.overflowRoutes = geometry.hasOverflow ? [targetUrl] : [];
  result.clippedControls = geometry.clippedControls;
  result.clippedCount = geometry.clippedControls.length;

  const controlsChecked = scopes.reduce((sum, s) => sum + (s.checked?.controls || 0), 0);
  const paddedContainersChecked = scopes.reduce((sum, s) => sum + (s.checked?.paddedContainers || 0), 0);
  const findings = scopes.flatMap((s) => s.findings || []);

  if (reportPath) {
    const absReport = path.resolve(REPO_ROOT, reportPath);
    fs.mkdirSync(path.dirname(absReport), { recursive: true });
    fs.writeFileSync(absReport, JSON.stringify(result, null, 2) + '\n');
  }

  return {
    result,
    scopes,
    controlsChecked,
    paddedContainersChecked,
    findings,
    findingsCount: findings.length,
    errors: result.errors,
    errorsCount: result.errors.length,
    clippedControls: geometry.clippedControls,
    clippedCount: geometry.clippedControls.length,
    hasOverflow: geometry.hasOverflow,
    scrollWidth: geometry.scrollWidth,
    innerWidth: geometry.innerWidth,
    pageState: geometry.pageState
  };
}

function strictFailed(audit) {
  return (
    audit.findingsCount > 0 ||
    audit.errorsCount > 0 ||
    audit.clippedCount > 0 ||
    audit.hasOverflow ||
    audit.result.status !== 'no-issues-detected'
  );
}

export async function runLayout(parsedOrOptions, childEnv = process.env) {
  const options = Array.isArray(parsedOrOptions?.args)
    ? parseLayoutOptions(parsedOrOptions.args)
    : {
        select: parsedOrOptions?.select ?? 'body',
        width: Number(parsedOrOptions?.width ?? 1280),
        delay: Number(parsedOrOptions?.delay ?? 300),
        report: parsedOrOptions?.report ?? null,
        screenshot: parsedOrOptions?.screenshot ?? null,
        strict: Boolean(parsedOrOptions?.strict),
        target: parsedOrOptions?.target ?? parsedOrOptions?.url ?? null
      };

  if (!options.target) {
    throw new Error('a URL is required for layout; use --help');
  }

  const executeAudit = async (targetUrl) => {
    const chromePath = await resolveChromePath(childEnv);
    const browser = await launch({ chromePath });
    try {
      return await auditPageInBrowser(browser, targetUrl, options);
    } finally {
      await browser.close().catch(() => {});
    }
  };

  const audit = isRootRelativeTarget(options.target)
    ? await withHermeticServer(childEnv, async (contract) => await executeAudit(`${contract.baseURL}${options.target}`))
    : await executeAudit(options.target);

  for (const scope of audit.scopes) {
    console.log(`layout coverage: ${scope.checked.controls} controls, ${scope.checked.paddedContainers} padded containers`);
    for (const finding of scope.findings) console.log(finding.message);
    for (const deferred of scope.deferred) console.log(`incomplete: ${deferred}`);
    for (const manual of scope.manual) console.log(`manual: ${manual}`);
  }
  for (const clipped of audit.clippedControls) {
    console.log(`clipped: ${clipped.element} left=${clipped.left} right=${clipped.right} innerWidth=${clipped.innerWidth}`);
  }
  if (audit.hasOverflow) {
    console.log(`overflow: scrollWidth=${audit.scrollWidth} > innerWidth=${audit.innerWidth}`);
  }
  for (const error of audit.errors) {
    console.error(`incomplete: ${error}`);
  }
  if (options.screenshot) {
    console.log(`layout screenshot: ${path.resolve(REPO_ROOT, options.screenshot)}`);
  }
  console.log(`layout: ${audit.result.status}; clipped=${audit.clippedCount} overflow=${audit.hasOverflow}`);

  if (options.strict && strictFailed(audit)) {
    return { audit, exitCode: 1 };
  }
  return { audit, exitCode: audit.result.exitCode };
}

export async function runSweep(options = {}, childEnv = process.env) {
  const routes = options.routes ?? SWEEP_ROUTES;
  const widths = options.widths ?? SWEEP_WIDTHS;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = options.outputDir
    ? path.resolve(REPO_ROOT, options.outputDir)
    : path.join(REPO_ROOT, 'stageshow-output', `sweep-${stamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];

  const runVisits = async (baseURL) => {
    const chromePath = await resolveChromePath(childEnv);
    const browser = await launch({ chromePath });
    try {
      for (const route of routes) {
        for (const width of widths) {
          const slug = `${slugifyRoute(route)}-w${width}`;
          const reportPath = path.join(outDir, `${slug}.layout.json`);
          const screenshotPath = path.join(outDir, `${slug}.png`);
          const targetUrl = `${String(baseURL).replace(/\/+$/, '')}${route}`;

          const audit = await auditPageInBrowser(browser, targetUrl, {
            select: 'body',
            width,
            delay: options.delay ?? 400,
            report: reportPath,
            screenshot: screenshotPath,
            strict: Boolean(options.strict)
          });

          results.push({
            route,
            width,
            status: audit.result.status,
            exitCode: audit.result.exitCode,
            controlsChecked: audit.controlsChecked,
            paddedContainersChecked: audit.paddedContainersChecked,
            findingsCount: audit.findingsCount,
            findings: audit.findings,
            errorsCount: audit.errorsCount,
            errors: audit.errors,
            clippedCount: audit.clippedCount,
            clippedControls: audit.clippedControls,
            hasOverflow: audit.hasOverflow,
            scrollWidth: audit.scrollWidth,
            innerWidth: audit.innerWidth,
            pageState: audit.pageState,
            reportPath: path.relative(REPO_ROOT, reportPath),
            screenshotPath: path.relative(REPO_ROOT, screenshotPath)
          });
        }
      }
    } finally {
      await browser.close().catch(() => {});
    }
  };

  if (options.baseURL) {
    await runVisits(options.baseURL);
  } else {
    await withHermeticServer(childEnv, async (contract) => {
      await runVisits(contract.baseURL);
    });
  }

  const totalFindings = results.reduce((sum, r) => sum + r.findingsCount, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errorsCount, 0);
  const totalClipped = results.reduce((sum, r) => sum + r.clippedCount, 0);
  const overflowRoutes = results
    .filter((r) => r.hasOverflow)
    .map((r) => `${r.route}@${r.width}px`);
  const totalOverflows = overflowRoutes.length;
  const anyNonClean = results.some((r) => r.status !== 'no-issues-detected');

  const summary = {
    generatedAt: new Date().toISOString(),
    routes,
    widths,
    snapshotCount: results.length,
    totalFindings,
    totalErrors,
    totalClipped,
    totalOverflows,
    overflowRoutes,
    outputDir: path.relative(REPO_ROOT, outDir),
    results
  };
  const summaryPath = path.join(outDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  console.log(`StageShow sweep output: ${path.relative(REPO_ROOT, summaryPath)}`);
  for (const row of results) {
    console.log(
      `${row.route} @ ${row.width}px: status=${row.status} controls=${row.controlsChecked} containers=${row.paddedContainersChecked} findings=${row.findingsCount} errors=${row.errorsCount} clipped=${row.clippedCount} overflow=${row.hasOverflow}`
    );
  }
  console.log(
    `StageShow sweep totals: snapshots=${results.length} findings=${totalFindings} errors=${totalErrors} clipped=${totalClipped} overflows=${totalOverflows}`
  );

  if (
    options.strict &&
    (totalFindings > 0 || totalErrors > 0 || totalClipped > 0 || totalOverflows > 0 || anyNonClean)
  ) {
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

    if (parsed.command === 'layout') {
      if (parsed.help) {
        process.exitCode = await runNodeScript(path.join(STAGESHOW_SCRIPTS_DIR, 'layout.mjs'), ['--help'], childEnv);
        return;
      }
      const { exitCode } = await runLayout(parsed, childEnv);
      process.exitCode = exitCode;
      return;
    }

    const scriptFile = path.join(STAGESHOW_SCRIPTS_DIR, `${parsed.command}.mjs`);
    const effectiveArgs = parsed.command === 'film' ? resolveFilmArgs(parsed.args) : [...parsed.args];
    if (parsed.help || !isRootRelativeTarget(parsed.target)) {
      process.exitCode = await runNodeScript(scriptFile, effectiveArgs, childEnv);
      return;
    }

    process.exitCode = await withHermeticServer(childEnv, async (contract) => {
      const forwarded = [...effectiveArgs];
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
