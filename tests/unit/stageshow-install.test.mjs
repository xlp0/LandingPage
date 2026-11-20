import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_CHECK_CSS_ARGS,
  isRootRelativeTarget,
  parseLayoutOptions,
  parseStageShowRunnerArgs,
  resolveDefaultCheckCssArgs,
  resolveFilmArgs,
  runLayout,
  runSweep,
  seedPortalLanding,
  withHermeticServer
} from '../../scripts/stageshow/run.mjs';
import { resolvePlaywrightServerContract } from '../fixtures/server-contract.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools', 'stageshow');
const SKILL_DIR = path.join(ROOT_DIR, '.agents', 'skills', 'stageshow');

function collectFiles(rootDir) {
  const results = [];
  function walk(currentDir) {
    const entries = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === '.DS_Store' || entry.name === 'node_modules' || entry.isSymbolicLink()) {
        continue;
      }
      const full = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        results.push(path.relative(rootDir, full).split(path.sep).join('/'));
      }
    }
  }
  walk(rootDir);
  return results.sort((a, b) => a.localeCompare(b));
}

function isExemptUpstreamPath(relPath, exemptList) {
  return exemptList.some((entry) => (entry.endsWith('/') ? relPath.startsWith(entry) : relPath === entry));
}

function snapshotDir(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return collectFiles(dirPath).map((relPath) => {
    const buf = fs.readFileSync(path.join(dirPath, relPath));
    return {
      path: relPath,
      size: buf.length,
      sha256: crypto.createHash('sha256').update(buf).digest('hex')
    };
  });
}

test('tools/stageshow UPSTREAM.json pins Stageshow 1.1.1 and verifies offline SHA-256 fileHashes', () => {
  const upstreamPath = path.join(TOOLS_DIR, 'UPSTREAM.json');
  const upstream = JSON.parse(fs.readFileSync(upstreamPath, 'utf8'));
  assert.equal(upstream.name, 'stageshow');
  assert.equal(upstream.version, '1.1.1');
  assert.equal(upstream.commit, '299140fafd08df55a9c234e610c3f64af3f45531');
  assert.equal(upstream.license, 'MIT');

  assert.equal(Array.isArray(upstream.exempt), true);
  for (const requiredExempt of [
    'UPSTREAM.json',
    'scripts/browser.mjs',
    'shims/',
    'build-scenes.mjs',
    'scenes/'
  ]) {
    assert.equal(
      upstream.exempt.includes(requiredExempt),
      true,
      `UPSTREAM.json exempt must list ${requiredExempt}`
    );
  }

  assert.ok(upstream.fileHashes && typeof upstream.fileHashes === 'object');
  const nonExemptFiles = collectFiles(TOOLS_DIR).filter(
    (rel) => !isExemptUpstreamPath(rel, upstream.exempt)
  );
  assert.deepEqual(
    Object.keys(upstream.fileHashes).sort((a, b) => a.localeCompare(b)),
    nonExemptFiles
  );

  for (const rel of nonExemptFiles) {
    const actualSha = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(TOOLS_DIR, rel)))
      .digest('hex');
    assert.equal(actualSha, upstream.fileHashes[rel], `SHA-256 mismatch for tools/stageshow/${rel}`);
  }
});

test('.agents/skills/stageshow mirrors SKILL.md and all 15 reference guides', () => {
  const toolSkill = fs.readFileSync(path.join(TOOLS_DIR, 'SKILL.md'), 'utf8');
  const agentSkill = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
  assert.equal(agentSkill, toolSkill);

  const expectedRefs = [
    'annotations.md',
    'backgrounds.md',
    'bento.md',
    'brands.md',
    'choreography.md',
    'craft.md',
    'framing.md',
    'kit.md',
    'looks.md',
    'motion.md',
    'products.md',
    'rehearse.md',
    'review.md',
    'teaching.md',
    'verify.md'
  ];
  for (const refFile of expectedRefs) {
    assert.equal(
      fs.existsSync(path.join(SKILL_DIR, 'references', refFile)),
      true,
      `Missing .agents/skills/stageshow/references/${refFile}`
    );
  }
});

test('tools/stageshow kit, shims, verification scripts, and postcss devDependency exist locally', () => {
  for (const rel of [
    'kit/index.ts',
    'kit/phone.tsx',
    'kit/window.tsx',
    'kit/stage.tsx',
    'shims/lucide-react.mjs',
    'build-scenes.mjs',
    'scenes/canary/index.tsx',
    'scenes/canary/scene.css',
    'scripts/browser.mjs',
    'scripts/layout.mjs',
    'scripts/layout-core.mjs',
    'scripts/film.mjs',
    'scripts/film-checks.mjs',
    'scripts/jumps.mjs',
    'scripts/jumps-core.mjs',
    'scripts/class-clash.mjs',
    'scripts/class-clash-core.mjs'
  ]) {
    assert.equal(fs.existsSync(path.join(TOOLS_DIR, rel)), true, `Missing tools/stageshow/${rel}`);
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  assert.equal(typeof pkg.devDependencies?.postcss, 'string');
  assert.equal(pkg.dependencies?.react, undefined);
  assert.equal(pkg.dependencies?.['react-dom'], undefined);
  assert.equal(pkg.devDependencies?.react, undefined);
  assert.equal(pkg.devDependencies?.['react-dom'], undefined);
  assert.equal(pkg.files.includes('!public/stageshow/**'), true);
});

test('tools/stageshow/shims/lucide-react.mjs exports all 31 Icons needed by kit/parts/Icon.tsx', async () => {
  const iconSource = fs.readFileSync(path.join(TOOLS_DIR, 'kit', 'parts', 'Icon.tsx'), 'utf8');
  const importMatch = iconSource.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/);
  assert.ok(importMatch, 'Expected named lucide-react imports in kit/parts/Icon.tsx');

  const expectedNames = importMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  assert.equal(expectedNames.length, 31);

  const shim = await import('../../tools/stageshow/shims/lucide-react.mjs');
  for (const name of expectedNames) {
    const Component = shim[name];
    assert.equal(typeof Component, 'function', `Missing shimmed icon component "${name}"`);
    const vnode = Component({
      size: 16,
      strokeWidth: 1.5,
      absoluteStrokeWidth: true,
      className: 'ss-icon'
    });
    assert.equal(vnode.type, 'svg');
    assert.equal('absoluteStrokeWidth' in vnode.props, false);
    assert.equal(vnode.props.width, 16);
    assert.equal(vnode.props.height, 16);
    assert.equal(vnode.props['stroke-width'] ?? vnode.props.strokeWidth, (1.5 * 24) / 16);
  }
});

test('scripts/stageshow/run.mjs parses runner args, film --out default, check-css scenes, and DB refusal', () => {
  assert.equal(isRootRelativeTarget('/responsive-lab.html'), true);
  assert.equal(isRootRelativeTarget('//evil.example/test'), false);
  assert.equal(isRootRelativeTarget('http://127.0.0.1:3001/responsive-lab.html'), false);

  const layoutParsed = parseStageShowRunnerArgs(['layout', '--width', '390', '/responsive-lab.html']);
  assert.equal(layoutParsed.command, 'layout');
  assert.equal(layoutParsed.target, '/responsive-lab.html');
  assert.equal(layoutParsed.targetIndex, 2);

  const layoutOpts = parseLayoutOptions(['--width=390', '--delay', '50', '--strict', '/responsive-lab.html']);
  assert.deepEqual(layoutOpts, {
    select: 'body',
    width: 390,
    delay: 50,
    report: null,
    screenshot: null,
    strict: true,
    target: '/responsive-lab.html'
  });

  const sweepParsed = parseStageShowRunnerArgs(['sweep', '--strict', '--output-dir=stageshow-output/custom']);
  assert.equal(sweepParsed.command, 'sweep');
  assert.equal(sweepParsed.strict, true);
  assert.equal(sweepParsed.outputDir, 'stageshow-output/custom');

  assert.deepEqual(
    resolveFilmArgs(['/public/stageshow/canary/index.html', '--still', '--gate']),
    ['/public/stageshow/canary/index.html', '--still', '--gate', '--out', 'stageshow-output/film.png']
  );
  assert.deepEqual(
    resolveFilmArgs(['/public/stageshow/canary/index.html', '--out', 'stageshow-output/other.png']),
    ['/public/stageshow/canary/index.html', '--out', 'stageshow-output/other.png']
  );
  assert.deepEqual(
    resolveFilmArgs(['/public/stageshow/canary/index.html', '--out=stageshow-output/other.png']),
    ['/public/stageshow/canary/index.html', '--out=stageshow-output/other.png']
  );

  const detectedScenes = fs
    .readdirSync(path.join(TOOLS_DIR, 'scenes'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  assert.equal(detectedScenes.includes('canary'), true);
  assert.deepEqual(resolveDefaultCheckCssArgs([]), [
    ...DEFAULT_CHECK_CSS_ARGS,
    ...detectedScenes.flatMap((scene) => ['--bundle', `tools/stageshow/scenes/${scene}`, `tools/stageshow/scenes/${scene}`])
  ]);

  assert.throws(
    () => resolvePlaywrightServerContract({ MCARD_DB_PATH: path.join(ROOT_DIR, 'data', 'mcard-api.db') }),
    /must not target the repository data\/mcard-api\.db/
  );
});

test('node tools/stageshow/build-scenes.mjs --check confirms deterministic preact/compat canary output', () => {
  const out = execFileSync(process.execPath, ['tools/stageshow/build-scenes.mjs', '--check'], {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  });
  assert.match(out, /ok public\/stageshow\/canary\/index\.html/);
  assert.equal(fs.existsSync(path.join(ROOT_DIR, 'public', 'stageshow', 'canary', 'index.html')), true);
});

test('npm run stageshow:check-css executes without class collisions', () => {
  const out = execFileSync(process.execPath, ['scripts/stageshow/run.mjs', 'check-css'], {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  });
  assert.match(out, /no overlapping class namespaces detected/);
});

test('seedPortalLanding sends JSON PUT without url and keeps tracked data/ clean under withHermeticServer', async () => {
  let received = null;
  const mockServer = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      received = {
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        body: JSON.parse(Buffer.concat(chunks).toString('utf8'))
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = mockServer.address();
    await seedPortalLanding(`http://127.0.0.1:${port}`);
    assert.equal(received.method, 'PUT');
    assert.equal(received.url, '/api/mcard/landing');
    assert.equal(received.contentType, 'application/json');
    assert.equal(typeof received.body.content, 'string');
    assert.equal(received.body.content.length > 0, true);
    assert.equal(Object.hasOwn(received.body, 'url'), false);
  } finally {
    await new Promise((resolve) => mockServer.close(resolve));
  }

  const dataDir = path.join(ROOT_DIR, 'data');
  const dataSnapshotBefore = snapshotDir(dataDir);
  await withHermeticServer({ ...process.env, SKIP_BUILD: '1' }, async (contract) => {
    const res = await fetch(`${contract.baseURL}/api/mcard/landing`);
    assert.equal(res.status, 200);
    const payload = await res.text();
    assert.match(payload, /StageShow verification fixture/);
  });
  const dataSnapshotAfter = snapshotDir(dataDir);
  assert.deepEqual(dataSnapshotAfter, dataSnapshotBefore);
});

test('runLayout and runSweep --strict fail on synthetic clipped controls and overflow and pass on clean pages', async () => {
  const fixtureServer = http.createServer((req, res) => {
    if (req.url === '/clipped.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      header { display: flex; gap: 8px; padding: 8px; }
      .offleft { position: relative; left: -60px; padding: 8px 16px; }
      .wide-box { width: 600px; height: 24px; background: #ddd; }
    </style>
  </head>
  <body data-page-state="ready">
    <header>
      <button type="button" class="offleft">Clipped Action</button>
    </header>
    <main>
      <div class="wide-box">Wide overflow content</div>
    </main>
  </body>
</html>`);
      return;
    }

    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; }
      button { padding: 8px 16px; max-width: 100%; }
    </style>
  </head>
  <body data-page-state="ready">
    <header>
      <button type="button">Clean Action</button>
    </header>
  </body>
</html>`);
  });

  await new Promise((resolve) => fixtureServer.listen(0, '127.0.0.1', resolve));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssg-run-strict-'));
  try {
    const { port } = fixtureServer.address();
    const baseURL = `http://127.0.0.1:${port}`;

    const clippedLayout = await runLayout({
      target: `${baseURL}/clipped.html`,
      width: 390,
      delay: 50,
      strict: true
    });
    assert.equal(clippedLayout.exitCode, 1);
    assert.equal(clippedLayout.audit.clippedCount >= 1, true);
    assert.equal(clippedLayout.audit.hasOverflow, true);

    const cleanLayout = await runLayout({
      target: `${baseURL}/clean.html`,
      width: 390,
      delay: 50,
      strict: true
    });
    assert.equal(cleanLayout.exitCode, 0);
    assert.equal(cleanLayout.audit.clippedCount, 0);
    assert.equal(cleanLayout.audit.hasOverflow, false);

    const clippedDir = path.join(tmpDir, 'clipped');
    const clippedSweepCode = await runSweep({
      baseURL,
      routes: ['/clipped.html'],
      widths: [390],
      delay: 50,
      strict: true,
      outputDir: clippedDir
    });
    assert.equal(clippedSweepCode, 1);
    const clippedSummary = JSON.parse(fs.readFileSync(path.join(clippedDir, 'summary.json'), 'utf8'));
    assert.equal(clippedSummary.totalClipped >= 1, true);
    assert.equal(clippedSummary.totalOverflows, 1);

    const cleanDir = path.join(tmpDir, 'clean');
    const cleanSweepCode = await runSweep({
      baseURL,
      routes: ['/clean.html'],
      widths: [390],
      delay: 50,
      strict: true,
      outputDir: cleanDir
    });
    assert.equal(cleanSweepCode, 0);
    const cleanSummary = JSON.parse(fs.readFileSync(path.join(cleanDir, 'summary.json'), 'utf8'));
    assert.equal(cleanSummary.totalClipped, 0);
    assert.equal(cleanSummary.totalOverflows, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    await new Promise((resolve) => fixtureServer.close(resolve));
  }
});
