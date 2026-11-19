import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadNetEnvelope } from '../../scripts/check-net.mjs';
import { resolvePlaceForUrl, stripQuery, navArcs } from '../../src/net/net-core.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NET_PATH = path.join(ROOT_DIR, 'src/net/workbench-net.yaml');
const envelope = loadNetEnvelope(NET_PATH);

test('net-core has no Playwright or clm-kernel import', () => {
  const source = fs.readFileSync(path.join(ROOT_DIR, 'src/net/net-core.mjs'), 'utf8');
  assert.equal(/from\s+['"](@playwright\/test|clm-kernel)/.test(source), false);
  assert.equal(/require\(['"](@playwright\/test|clm-kernel)/.test(source), false);
});

test('every page and view route resolves to its declared place', () => {
  const origin = 'http://127.0.0.1:3001';
  for (const [placeId, binding] of Object.entries(envelope.bindings.places)) {
    if (binding.kind !== 'page' && binding.kind !== 'view') continue;
    const route = binding.route;
    assert.ok(route, `${placeId} has no route`);
    const resolved = resolvePlaceForUrl(envelope, `${origin}${route}`);
    assert.ok(resolved, `${placeId} (${route}) did not resolve`);
    assert.equal(resolved.placeId, placeId, `${route} resolved to ${resolved.placeId}`);
  }
});

test('every route alias resolves to its owning place', () => {
  const origin = 'http://127.0.0.1:3001';
  let checked = 0;
  for (const [placeId, binding] of Object.entries(envelope.bindings.places)) {
    for (const alias of binding.routeAliases || []) {
      const url = alias.startsWith('http') ? alias : `${origin}${alias}`;
      const resolved = resolvePlaceForUrl(envelope, url);
      assert.ok(resolved, `${placeId} alias ${alias} did not resolve`);
      assert.equal(resolved.placeId, placeId);
      checked += 1;
    }
  }
  assert.ok(checked > 0, 'the net declares no route alias, so this check would be vacuous');
});

test('a query-flagged view wins over the page that shares its path', () => {
  const flagged = Object.entries(envelope.bindings.places).filter(([, b]) => b.queryFlag);
  assert.ok(flagged.length > 0, 'the net declares no query-flagged view');
  for (const [placeId, binding] of flagged) {
    const url = `http://127.0.0.1:3001${binding.route}`;
    assert.equal(resolvePlaceForUrl(envelope, url)?.placeId, placeId);
    const pagePath = stripQuery(binding.route);
    const marked = `${url}${url.includes('?') ? '&' : '?'}${binding.queryFlag}=1`;
    assert.equal(resolvePlaceForUrl(envelope, marked)?.placeId, placeId);
    assert.notEqual(pagePath, '');
  }
});

test('an undeclared path resolves to null rather than a nearest match', () => {
  assert.equal(resolvePlaceForUrl(envelope, 'http://127.0.0.1:3001/not-a-place'), null);
  assert.equal(resolvePlaceForUrl(envelope, 'file:///tmp/index.html'), null);
});

test('navArcs only carries navigation kinds and drops incomplete bindings', () => {
  const arcs = navArcs(envelope);
  const kinds = new Set(arcs.map((arc) => arc.kind));
  for (const kind of kinds) {
    assert.ok(['redirect', 'link', 'client-route', 'recover'].includes(kind), kind);
  }
  for (const arc of arcs) {
    assert.ok(envelope.bindings.places[arc.from], `${arc.transitionId} has an undeclared source`);
    assert.ok(envelope.bindings.places[arc.to], `${arc.transitionId} has an undeclared destination`);
  }
});

test('net-core matches the committed net-core-golden.json snapshot', () => {
  const golden = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'tests/fixtures/net-core-golden.json'), 'utf8')
  );
  assert.equal(golden.netId, envelope.netId);
  assert.ok(golden.cases.length >= 10);
  for (const entry of golden.cases) {
    const resolved = resolvePlaceForUrl(envelope, `${golden.origin}${entry.url}`);
    assert.equal(resolved?.placeId ?? null, entry.expectedPlaceId, entry.url);
    assert.equal(resolved?.kind ?? null, entry.expectedKind, entry.url);
  }
});
