import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  checkPackageSourceParity,
  checkServerOwnershipParity,
  checkUiServerCallCoverage,
  runAllParityChecks
} from '../../scripts/check-package-source-parity.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('package ownership, tarball consumer layout, and UI server-call coverage', () => {
  it('passes package parity, server ownership parity, and UI server-call coverage on repository', () => {
    const result = runAllParityChecks({ rootDir: ROOT_DIR });
    assert.equal(result.ok, true, `Parity check failed: ${result.errors.join('; ')}`);
    assert.equal(result.packageParity.pairCount, 4);
    assert.ok(result.uiServerCalls.checkedCalls.length >= 10);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'package-source-parity.json'), 'utf8')
    );
    assert.deepEqual(manifest.migratedPairIds, ['markdown-renderer']);
    assert.equal(manifest.serverOwnership.packagedServerServesAstro, false);
    assert.equal(manifest.serverOwnership.variants.rootServer.servesAstroPages, true);
  });

  it('detects exact-copy drift and rejects sibling-repository browser imports', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc05-parity-drift-'));
    try {
      fs.mkdirSync(path.join(tmpRoot, 'scripts'), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, 'packages/markdown-renderer/src'), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, 'js/modules/markdown-renderer'), { recursive: true });
      fs.mkdirSync(path.join(tmpRoot, 'packages/server/src'), { recursive: true });

      fs.copyFileSync(
        path.join(ROOT_DIR, 'packages/markdown-renderer/package.json'),
        path.join(tmpRoot, 'packages/markdown-renderer/package.json')
      );
      fs.copyFileSync(
        path.join(ROOT_DIR, 'packages/markdown-renderer/src/index.js'),
        path.join(tmpRoot, 'packages/markdown-renderer/src/index.js')
      );
      fs.writeFileSync(
        path.join(tmpRoot, 'js/modules/markdown-renderer/index.js'),
        "export { default } from '../../../../SiblingRepo/src/index.js';\n",
        'utf8'
      );
      fs.writeFileSync(path.join(tmpRoot, 'room-registry.mjs'), 'export const a = 1;\n', 'utf8');
      fs.writeFileSync(path.join(tmpRoot, 'packages/server/src/room-registry.mjs'), 'export const a = 2;\n', 'utf8');

      const baseManifest = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'scripts/package-source-parity.json'), 'utf8')
      );
      const testManifest = {
        ...baseManifest,
        sourcePairs: baseManifest.sourcePairs.filter((p) => p.id === 'markdown-renderer' || p.id === 'room-registry')
      };
      testManifest.sourcePairs[0].browserEntry.expectedReExportTarget = '../../../../SiblingRepo/src/index.js';
      const manifestPath = path.join(tmpRoot, 'scripts/package-source-parity.json');
      fs.writeFileSync(manifestPath, JSON.stringify(testManifest, null, 2), 'utf8');

      const res = checkPackageSourceParity({ rootDir: tmpRoot, manifestPath });
      assert.equal(res.ok, false);
      assert.ok(res.errors.some((e) => e.includes('escapes repository root')));
      assert.ok(res.errors.some((e) => e.includes('Exact copy drift detected')));
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('GQC-05-UNIT-03: fails and names call site when an island invokes an undeclared server endpoint', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc05-unit03-'));
    try {
      const islandsDir = path.join(tmpRoot, 'src', 'islands');
      fs.mkdirSync(islandsDir, { recursive: true });
      const badIsland = path.join(islandsDir, 'RogueIsland.jsx');
      fs.writeFileSync(
        badIsland,
        [
          'export default function RogueIsland() {',
          '  async function loadSecret() {',
          "    const res = await fetch('/api/undeclared-island-call');",
          "    navigator.sendBeacon('/api/undeclared-beacon');",
          '    const xhr = new XMLHttpRequest();',
          "    xhr.open('POST', '/api/mcard');",
          '    return res.json();',
          '  }',
          '  return <button onClick={loadSecret}>Run</button>;',
          '}'
        ].join('\n'),
        'utf8'
      );

      const check = checkUiServerCallCoverage({
        rootDir: tmpRoot,
        scanDirs: ['src'],
        envelopePath: path.join(ROOT_DIR, 'src', 'net', 'workbench-net.yaml')
      });

      assert.equal(check.ok, false);
      assert.equal(check.errors.length, 3);
      assert.match(check.errors[0].message, /src\/islands\/RogueIsland\.jsx:3 undeclared UI server call GET \/api\/undeclared-island-call/);
      assert.match(check.errors[1].message, /src\/islands\/RogueIsland\.jsx:4 undeclared UI server call POST \/api\/undeclared-beacon/);
      assert.match(check.errors[2].message, /src\/islands\/RogueIsland\.jsx:6 undeclared UI server call POST \/api\/mcard/);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('packs @pkc/core and @pkc/markdown-renderer tarballs into os.tmpdir() and imports built dist/index.js without repo paths', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc05-tarball-'));
    try {
      for (const pkgRel of ['packages/core', 'packages/markdown-renderer']) {
        const pkgDir = path.join(ROOT_DIR, pkgRel);
        execFileSync(process.execPath, ['build.js'], { cwd: pkgDir, stdio: 'pipe' });
        execFileSync('npm', ['pack', '--pack-destination', tmpDir], { cwd: pkgDir, stdio: 'pipe' });
      }

      const tgzFiles = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.tgz'));
      assert.equal(tgzFiles.length, 2);

      const coreTgz = tgzFiles.find((f) => f.includes('pkc-core'));
      const mdTgz = tgzFiles.find((f) => f.includes('pkc-markdown-renderer'));
      assert.ok(coreTgz, 'Expected packed @pkc/core tarball');
      assert.ok(mdTgz, 'Expected packed @pkc/markdown-renderer tarball');

      const coreUnpack = path.join(tmpDir, 'core-consumer');
      const mdUnpack = path.join(tmpDir, 'md-consumer');
      fs.mkdirSync(coreUnpack, { recursive: true });
      fs.mkdirSync(mdUnpack, { recursive: true });

      execFileSync('tar', ['-xzf', path.join(tmpDir, coreTgz), '-C', coreUnpack], { stdio: 'pipe' });
      execFileSync('tar', ['-xzf', path.join(tmpDir, mdTgz), '-C', mdUnpack], { stdio: 'pipe' });

      const coreDist = path.join(coreUnpack, 'package', 'dist', 'index.js');
      const mdDist = path.join(mdUnpack, 'package', 'dist', 'index.js');
      assert.equal(fs.existsSync(coreDist), true);
      assert.equal(fs.existsSync(mdDist), true);

      const coreDistSrc = fs.readFileSync(coreDist, 'utf8');
      const mdDistSrc = fs.readFileSync(mdDist, 'utf8');
      assert.equal(/from\s+['"]\.\.\//.test(coreDistSrc), false);
      assert.equal(/from\s+['"]\.\.\//.test(mdDistSrc), false);

      const prevDoc = globalThis.document;
      globalThis.document = { baseURI: 'http://localhost:3000/', readyState: 'complete', addEventListener() {} };
      let coreMod;
      try {
        coreMod = await import(pathToFileURL(coreDist).href);
      } finally {
        if (prevDoc === undefined) delete globalThis.document;
        else globalThis.document = prevDoc;
      }
      assert.equal(typeof coreMod.PKC?.init, 'function');
      assert.equal(typeof coreMod.PKC?.register, 'function');

      const mdPackedMod = await import(pathToFileURL(mdDist).href);
      const mdBrowserMod = await import(
        pathToFileURL(path.join(ROOT_DIR, 'js/modules/markdown-renderer/index.js')).href
      );

      assert.equal(mdPackedMod.default.id, 'markdown-renderer');
      assert.equal(mdBrowserMod.default.id, 'markdown-renderer');

      const packedLogs = [];
      const browserLogs = [];
      const caps = { indexeddb: true, websocket: true };
      await mdPackedMod.default.init({
        pkc: { ctx: { log: (...args) => packedLogs.push(args) } },
        capabilities: caps
      });
      await mdBrowserMod.default.init({
        pkc: { ctx: { log: (...args) => browserLogs.push(args) } },
        capabilities: caps
      });
      await mdPackedMod.default.start();
      await mdBrowserMod.default.start();
      await mdPackedMod.default.stop();
      await mdBrowserMod.default.stop();

      assert.deepEqual(packedLogs, browserLogs);
      assert.deepEqual(packedLogs, [['markdown-renderer:init', { capabilities: caps }]]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
