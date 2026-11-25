import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const LANDING_ROOT = path.resolve(THIS_DIR, '..');
const EXPECTED_WS_SERVER_SHA256 = 'ac2012f4dc5547138f3127655c6ccb2171d2598cd13c7f507a51dcb885035864';
const FORBIDDEN_CLIENT_ROOTS = new Set(['react', 'react-dom', 'ws', 'clm-kernel']);
const FORBIDDEN_CLIENT_EXACT = new Set(['react/jsx-runtime', 'react/jsx-dev-runtime']);

export function extractSpecifiers(code) {
  const specs = [];
  for (const re of [
    /(?:^|[\s;])(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    let m;
    while ((m = re.exec(code)) !== null) specs.push(m[1]);
  }
  return specs;
}

export function findForbiddenClientImports(code) {
  const violations = [];
  for (const spec of extractSpecifiers(code)) {
    if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) continue;
    const pkgRoot = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (FORBIDDEN_CLIENT_ROOTS.has(pkgRoot) || FORBIDDEN_CLIENT_EXACT.has(spec)) {
      violations.push(spec);
    }
  }
  return violations;
}

export function checkDependencyManifests(pkg, lock) {
  const violations = [];
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(pkg?.[section] ?? {})) {
      if (FORBIDDEN_CLIENT_ROOTS.has(name) && (name === 'react' || name === 'react-dom')) {
        violations.push(`${section}.${name} forbidden`);
      }
      if (/^(?:file:|link:|workspace:)/.test(String(spec)) && (name === '@mcard/studio' || name === 'clm-kernel')) {
        violations.push(`${section}.${name} uses local workspace specifier: ${spec}`);
      }
    }
  }
  for (const lockKey of Object.keys(lock?.packages ?? {})) {
    const pkgName = lockKey.replace(/^.*node_modules\//, '');
    if (pkgName === 'react' || pkgName === 'react-dom') {
      violations.push(`package-lock contains ${lockKey}`);
    }
  }
  const kernelVersion = pkg?.dependencies?.['clm-kernel'];
  const kernelLock = lock?.packages?.['node_modules/clm-kernel'];
  if (!kernelVersion || kernelLock?.version !== kernelVersion) {
    violations.push(`clm-kernel lock version ${kernelLock?.version} !== ${kernelVersion}`);
  }
  if (!String(kernelLock?.resolved ?? '').includes('registry.npmjs.org') || !kernelLock?.integrity) {
    violations.push('clm-kernel lock entry must carry registry.npmjs.org resolved URL and integrity digest');
  }
  return violations;
}

export function runNegativeControls() {
  assert.equal(
    findForbiddenClientImports("import React from 'react';").includes('react'),
    true,
    'synthetic react import must be rejected',
  );
  assert.equal(
    findForbiddenClientImports("import { jsx } from 'react/jsx-runtime';").includes('react/jsx-runtime'),
    true,
    'synthetic react/jsx-runtime import must be rejected',
  );
  assert.equal(
    findForbiddenClientImports("import WebSocket from 'ws';").includes('ws'),
    true,
    'synthetic browser ws import must be rejected',
  );
  assert.deepEqual(
    findForbiddenClientImports("import x from '@mcard/reactive-demo';"),
    [],
    '/react substring false positive must be avoided',
  );
  const badLock = checkDependencyManifests(
    { dependencies: { 'clm-kernel': '0.0.26' } },
    { packages: { 'node_modules/react': { version: '19.0.0' }, 'node_modules/clm-kernel': { version: '0.0.26', resolved: 'https://registry.npmjs.org/clm-kernel/-/clm-kernel-0.0.26.tgz', integrity: 'sha512-x' } } },
  );
  assert.ok(badLock.some((v) => v.includes('node_modules/react')));
}

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkJsFiles(full, out);
    else if (/\.(js|mjs|jsx)$/.test(ent.name)) out.push(full);
  }
  return out;
}

export function verifyLandingPageClientContract(rootDir = LANDING_ROOT, { buildFirst = true } = {}) {
  runNegativeControls();

  const wsPath = path.join(rootDir, 'ws-server.js');
  const wsHash = crypto.createHash('sha256').update(fs.readFileSync(wsPath)).digest('hex');
  assert.equal(wsHash, EXPECTED_WS_SERVER_SHA256, `FRO-D09 ws-server.js SHA-256 drifted: ${wsHash}`);

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(rootDir, 'package-lock.json'), 'utf8'));
  const manifestViolations = checkDependencyManifests(pkg, lock);
  assert.deepEqual(manifestViolations, [], `Manifest/lockfile violations: ${manifestViolations.join('; ')}`);

  if (buildFirst) {
    execFileSync('npm', ['run', 'build'], { cwd: rootDir, stdio: 'pipe' });
  }

  const astroDir = path.join(rootDir, 'dist', 'client', '_astro');
  const builtFiles = walkJsFiles(astroDir);
  assert.ok(builtFiles.length > 0, 'Expected non-empty LandingPage dist/client/_astro bundle');

  const clientSources = [...builtFiles, ...walkJsFiles(path.join(rootDir, 'src', 'islands'))];
  const leaked = [];
  for (const file of clientSources) {
    const code = fs.readFileSync(file, 'utf8');
    const hits = findForbiddenClientImports(code);
    if (hits.length > 0) {
      leaked.push(`${path.relative(rootDir, file)}: ${hits.join(', ')}`);
    }
  }
  assert.deepEqual(leaked, [], `Forbidden client imports found: ${leaked.join('; ')}`);

  execFileSync('node', ['tests/performance/place-bytes.mjs', '--enforce-zero-island-places'], {
    cwd: rootDir,
    stdio: 'pipe',
  });

  return {
    wsServerSha256: wsHash,
    builtChunkCount: builtFiles.length,
    islandsScanned: walkJsFiles(path.join(rootDir, 'src', 'islands')).length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = verifyLandingPageClientContract(LANDING_ROOT, { buildFirst: true });
  console.log(`[check-pkc-client-contract] PASS (wsSha256=${report.wsServerSha256}, chunks=${report.builtChunkCount}, islands=${report.islandsScanned})`);
}
