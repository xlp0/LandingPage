import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { findPackageJSON } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import * as rootKernel from 'clm-kernel';
import * as primitivesKernel from 'clm-kernel/primitives';
import * as petriKernel from 'clm-kernel/petri';
import { MCardFileSystem, runConsumerConformance } from 'clm-kernel/store';
import {
  NodeSqliteBackend,
  registerNodeCryptoProviders,
  registerRuntimeBackends
} from 'clm-kernel/node';
import {
  EMPTY_GUARD_CONTEXT,
  verifyEd25519Portable
} from 'clm-kernel/vcard';
import { evaluateCelGuard } from 'clm-kernel/cel';

import {
  classifyMCardContent,
  classifyMCardModality,
  resolveModality
} from '../../server/mcard-modality.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXPECTED_024_INTEGRITY =
  'sha512-Ew88ilXXpoTmQeDkwOJmq2RPyLlyGxvDHP15sLN4vmF3hCqIw+XEuleq4cvE/wXN69rWAoUYPMrPHpMIyVWrSQ==';

test('KC-01: clm-kernel@0.0.24 metadata subpaths and LandingPage lockfile integrity are authentic', () => {
  const pkgJsonPath = findPackageJSON('clm-kernel', import.meta.url);
  const pkgDir = path.dirname(pkgJsonPath);
  const installedPkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  assert.equal(installedPkg.version, '0.0.24');

  const surfacePath = fileURLToPath(import.meta.resolve('clm-kernel/api-surface.json'));
  const capabilitiesPath = fileURLToPath(import.meta.resolve('clm-kernel/published-capabilities.json'));
  assert.equal(path.dirname(surfacePath), pkgDir);
  assert.equal(path.dirname(capabilitiesPath), pkgDir);

  const surface = JSON.parse(fs.readFileSync(surfacePath, 'utf8'));
  assert.ok(surface && typeof surface === 'object');

  const capabilities = JSON.parse(fs.readFileSync(capabilitiesPath, 'utf8'));
  const byId = new Map(capabilities.capabilities.map((cap) => [cap.id, cap]));
  for (let i = 1; i <= 24; i += 1) {
    const id = `KC-${String(i).padStart(2, '0')}`;
    assert.equal(byId.get(id)?.status, 'ready', `${id} must be ready in clm-kernel@0.0.24`);
  }
  assert.equal(byId.get('KC-26')?.status, 'ready', 'KC-26 must be ready in clm-kernel@0.0.24');

  const lock = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package-lock.json'), 'utf8'));
  const lockEntry = lock.packages['node_modules/clm-kernel'];
  assert.equal(lockEntry.version, '0.0.24');
  assert.equal(lockEntry.resolved, 'https://registry.npmjs.org/clm-kernel/-/clm-kernel-0.0.24.tgz');
  assert.equal(lockEntry.integrity, EXPECTED_024_INTEGRITY);
});

test('KC-02: runConsumerConformance passes on Node SQLite MCardFileSystem with zero failed cases', async () => {
  registerRuntimeBackends();
  registerNodeCryptoProviders();

  const pkgDir = path.dirname(findPackageJSON('clm-kernel', import.meta.url));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-kc02-'));
  let seq = 0;
  let currentPath = null;
  const openBackends = [];

  const fixture = {
    async create() {
      currentPath = path.join(tmpDir, `kc-${seq++}.db`);
      const backend = new NodeSqliteBackend(currentPath);
      openBackends.push(backend);
      return MCardFileSystem.withBackend(backend);
    },
    async openPeer() {
      const backend = new NodeSqliteBackend(currentPath);
      openBackends.push(backend);
      return MCardFileSystem.withBackend(backend);
    },
    async flush() {},
    async reopen() {
      for (const b of openBackends.splice(0)) {
        if (typeof b.close === 'function') b.close();
      }
      const backend = new NodeSqliteBackend(currentPath);
      openBackends.push(backend);
      return MCardFileSystem.withBackend(backend);
    },
    async dispose() {
      for (const b of openBackends.splice(0)) {
        if (typeof b.close === 'function') b.close();
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
    metadata: {
      async resolveSurface() {
        return JSON.parse(fs.readFileSync(path.join(pkgDir, 'api-surface.json'), 'utf8'));
      },
      async resolveCapabilities() {
        return JSON.parse(fs.readFileSync(path.join(pkgDir, 'published-capabilities.json'), 'utf8'));
      },
      async readChangelog() {
        return fs.readFileSync(path.join(pkgDir, 'CHANGELOG.md'), 'utf8');
      },
      async resolvePackageVersion() {
        return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version;
      }
    }
  };

  const report = await runConsumerConformance(fixture, {
    runtime: 'node',
    author: primitivesKernel.AgentDid.create('did:key:z6MkLandingPageConformance'),
    runtimeFixtures: { registerRuntimeBackends }
  });

  const failed = report.cases.filter((c) => c.outcome === 'failed');
  const passed = report.cases.filter((c) => c.outcome === 'passed');
  assert.deepEqual(failed, []);
  assert.ok(passed.length >= 74, `expected >= 74 passed cases, got ${passed.length}`);
});

test('KC-18: root barrel and ADR-014 capability subpaths preserve single class/function identity', () => {
  for (const sym of ['MCard', 'TypeInterpreter', 'computeHash', 'structuredPayload', 'handleSpellings']) {
    assert.equal(primitivesKernel[sym], rootKernel[sym], `clm-kernel/primitives.${sym} must match root`);
  }
  for (const sym of [
    'PlaceMCard',
    'TransitionMCard',
    'TokenMCard',
    'NetMCard',
    'ColoredPetriVM',
    'IncidenceMatrix',
    'parsePetriNetYaml',
    'step'
  ]) {
    assert.equal(petriKernel[sym], rootKernel[sym], `clm-kernel/petri.${sym} must match root`);
  }
});

test('KC-04, KC-19, KC-20, KC-22, KC-26: handleSpellings, portable Ed25519, 3-valued guards, pure step, and peekPayload', async () => {
  // KC-26: MCard.peekPayload() returns O(1) cached deeply frozen payload while card.payload clones
  const card = primitivesKernel.MCard.create(
    'mcard:test/peek',
    primitivesKernel.structuredPayload({ nested: { count: 1 }, tags: ['a', 'b'] }),
    'did:key:z6MkLandingTest'
  );
  const peekA = card.peekPayload();
  const peekB = card.peekPayload();
  assert.equal(peekA, peekB);
  assert.equal(Object.isFrozen(peekA), true);
  assert.equal(Object.isFrozen(peekA.value.nested), true);
  assert.notEqual(card.payload, peekA);
  assert.notEqual(card.payload, card.payload);

  // KC-04: handleSpellings normalizes URI, path, and registry key
  assert.deepEqual(primitivesKernel.handleSpellings('mcard://docs/readme'), {
    uri: 'mcard:docs/readme',
    path: 'docs/readme',
    registryKey: 'docs:readme'
  });

  // KC-19: verifyEd25519Portable verifies valid and rejects tampered payloads asynchronously
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const rawPub = new Uint8Array(spki.subarray(spki.length - 32));
  const msg = new TextEncoder().encode('clm-kernel-0.0.24-portable');
  const sig = new Uint8Array(crypto.sign(null, msg, privateKey));
  const did = String(primitivesKernel.deriveDidKey(rawPub));
  assert.deepEqual(await verifyEd25519Portable(did, msg, sig), { status: 'verified' });
  const tamperedRes = await verifyEd25519Portable(rawPub, new TextEncoder().encode('tampered'), sig);
  assert.equal(tamperedRes.status, 'invalid');

  // KC-20: boolean precedence and three-valued GuardVerdict (pass | fail | unmatched)
  assert.equal(evaluateCelGuard('!false && (true || false)').outcome, 'pass');
  assert.equal(evaluateCelGuard('false && true || true').outcome, 'pass');
  assert.equal(evaluateCelGuard('!(true || false)').outcome, 'fail');
  assert.equal(evaluateCelGuard('42').outcome, 'pass');
  assert.equal(evaluateCelGuard('0').outcome, 'fail');
  assert.equal(evaluateCelGuard('totally_unknown_guard_identifier').outcome, 'unmatched');
  assert.equal(evaluateCelGuard('(true && false').outcome, 'unmatched');

  // KC-22: pure step() produces next TokenState without mutating input state
  const net = petriKernel.parsePetriNetYaml(`
name: kc22-pure-step
places:
  - id: p1
    initialTokens: 1
  - id: p2
    initialTokens: 0
transitions:
  - id: t1
    inputs: [p1]
    outputs: [p2]
`);
  const initialMarking = petriKernel.initializeMarking(net);
  const tokenState = petriKernel.captureTokenState(net, initialMarking);
  const stepResult = petriKernel.step(net, tokenState, 't1', {
    guard: EMPTY_GUARD_CONTEXT,
    author: primitivesKernel.AgentDid.create('did:key:z6MkStepAuthor'),
    clockMs: 1000,
    stepCounter: 1,
    transitionGuard: null,
    checks: []
  });
  assert.equal(stepResult.fired, true);
  assert.equal(stepResult.tokenState.p1.length, 0);
  assert.equal(stepResult.tokenState.p2.length, 1);
  assert.equal(tokenState.p1.length, 1);
  assert.equal(tokenState.p2.length, 0);
});

test('KC-15: mcard-modality supports clm-kernel@0.0.24 95-type dictionary and compound extensions', () => {
  const jsxRes = classifyMCardModality('export const App = () => <div />;', { filename: 'App.jsx' });
  assert.equal(jsxRes.mimeType, 'text/jsx');
  assert.equal(jsxRes.modality, 'code');

  const shRes = classifyMCardModality('#!/bin/sh\necho hi\n', { filename: 'run.sh' });
  assert.equal(shRes.mimeType, 'text/x-shellscript');
  assert.equal(shRes.modality, 'code');

  const excalidrawRes = classifyMCardContent('{"type":"excalidraw","elements":[]}', {
    filename: 'diagram.excalidraw.json'
  });
  assert.equal(excalidrawRes.mimeType, 'application/vnd.excalidraw+json');
  assert.equal(excalidrawRes.modality, 'document');

  const petriRes = classifyMCardContent('{"places":[],"transitions":[]}', {
    filename: 'net.mcard.petri.json'
  });
  assert.equal(petriRes.mimeType, 'application/vnd.mcard.petri+json');
  assert.equal(petriRes.modality, 'document');

  const urlRes = classifyMCardModality('https://example.org/portal', {
    filename: 'portal.url.txt'
  });
  assert.equal(urlRes.mimeType, 'text/uri-list');
  assert.equal(urlRes.modality, 'webapp');

  const binSample = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
  assert.equal(classifyMCardContent(binSample, { filename: 'image.bmp' }).mimeType, 'image/bmp');
  assert.equal(classifyMCardContent(binSample, { filename: 'image.bmp' }).modality, 'media');
  assert.equal(classifyMCardContent(binSample, { filename: 'track.flac' }).mimeType, 'audio/flac');
  assert.equal(classifyMCardContent(binSample, { filename: 'track.flac' }).modality, 'media');
  assert.equal(classifyMCardContent(binSample, { filename: 'scene.glb' }).mimeType, 'model/gltf-binary');
  assert.equal(classifyMCardContent(binSample, { filename: 'scene.glb' }).modality, 'media');
  assert.equal(classifyMCardContent(binSample, { filename: 'mesh.ply' }).mimeType, 'model/ply');
  assert.equal(classifyMCardContent(binSample, { filename: 'mesh.ply' }).modality, 'media');

  assert.equal(resolveModality('font/woff2'), 'media');
  assert.equal(resolveModality('application/3d-obj'), 'media');
});
