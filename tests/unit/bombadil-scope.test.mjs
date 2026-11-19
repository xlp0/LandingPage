import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadNetEnvelope } from '../../scripts/check-net.mjs';
import { resolvePlaceForUrl } from '../../src/net/net-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_ORIGIN = 'http://localhost:3021';
const SCOPES = new Set(['explore', 'load-only', 'boundary', 'none']);
const NET_FILES = Object.freeze({
  'landingpage-workbench-net': 'src/net/workbench-net.yaml',
  'spa-test-target-net': 'tests/fixtures/spa-test-target.graph.json'
});

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const scope = readJson('tests/bombadil/scope.json');
const registry = readJson('tests/gui-coverage.json');
const registryIds = [...registry.workbenchSurfaces, ...registry.targetSurfaces].map((s) => s.surfaceId);
const nets = Object.fromEntries(Object.entries(NET_FILES).map(([id, file]) => [id, loadNetEnvelope(file)]));

// The resolver matches page routes. A hash-routed net such as the SPA fixture's resolves to its entry place
// when the start URL is the entry route without its hash.
function resolveStartPlace(envelope, startUrl) {
  const resolved = resolvePlaceForUrl(envelope, new URL(startUrl, TEST_ORIGIN).href);
  if (resolved) return resolved.placeId;
  const entry = envelope.bindings?.places?.[envelope.entryPlaceId];
  return entry && entry.route.split('#')[0] === startUrl ? envelope.entryPlaceId : null;
}

test('the scope file has exactly one row per registry surface', () => {
  const rowIds = scope.rows.map((row) => row.surfaceId);
  assert.deepEqual([...rowIds].sort(), [...registryIds].sort());
  assert.equal(new Set(rowIds).size, rowIds.length, 'no duplicate rows');
});

test('every row has a known scope and a reason', () => {
  for (const row of scope.rows) {
    assert.ok(SCOPES.has(row.scope), `${row.surfaceId} has scope ${row.scope}`);
    assert.ok(typeof row.reason === 'string' && row.reason.trim().length > 10, `${row.surfaceId} has a reason`);
  }
});

test('every explored and load-only start URL resolves to a declared place of its own net', () => {
  for (const row of scope.rows.filter((r) => r.scope === 'explore' || r.scope === 'load-only')) {
    const envelope = nets[row.netId];
    assert.ok(envelope, `${row.surfaceId} names a known net`);
    const placeId = resolveStartPlace(envelope, row.startUrl);
    const declared = new Set(envelope.topology.places.map((p) => p.id));
    assert.ok(placeId && declared.has(placeId), `${row.surfaceId} start URL ${row.startUrl} resolves to a declared place`);
  }
});

test('rows without a start URL are out of scope', () => {
  for (const row of scope.rows.filter((r) => r.startUrl === null)) {
    assert.equal(row.scope, 'none', `${row.surfaceId} has no start URL`);
  }
});
