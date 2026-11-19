import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildProjection, generate, renderProjection } from '../../scripts/gen-bombadil-nets.mjs';
import { loadNetEnvelope } from '../../scripts/check-net.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NET_PATH = path.join(ROOT_DIR, 'src/net/workbench-net.yaml');
const SCOPE_PATH = path.join(ROOT_DIR, 'tests/bombadil/scope.json');
const OUT_PATH = path.join(ROOT_DIR, 'tests/bombadil/generated/workbench-net.ts');

test('the committed projection is current and triggers resolve', async () => {
  const result = await generate({ check: true });
  assert.equal(result.reason, undefined);
  assert.equal(result.ok, true, JSON.stringify(result.drift));
});

test('history arcs are the unique reverse of every navigation arc', () => {
  const projection = buildProjection({});
  const forward = new Set(projection.arcs.map((arc) => `${arc.from}->${arc.to}`));
  assert.ok(projection.arcs.length > 0);
  for (const arc of projection.historyArcs) {
    assert.ok(forward.has(`${arc.to}->${arc.from}`), `${arc.transitionId} has no forward arc`);
    assert.equal(arc.kind, 'history');
  }
  const keys = projection.historyArcs.map((arc) => `${arc.from}->${arc.to}`);
  assert.equal(new Set(keys).size, keys.length, 'history arcs contain a duplicate');
});

test('entry URLs come from the scope rows and exclude boundaries', () => {
  const scope = JSON.parse(fs.readFileSync(SCOPE_PATH, 'utf8'));
  const projection = buildProjection({});
  const expected = scope.rows
    .filter((row) => row.scope === 'explore' || row.scope === 'load-only')
    .map((row) => row.startUrl);
  assert.deepEqual(projection.entryUrls, expected);
  for (const row of scope.rows.filter((r) => r.scope === 'boundary')) {
    assert.equal(projection.entryUrls.includes(row.startUrl), false, row.startUrl);
  }
});

test('allow URLs cover in-scope routes and leave boundary routes out', () => {
  const scope = JSON.parse(fs.readFileSync(SCOPE_PATH, 'utf8'));
  const projection = buildProjection({});
  const boundaryPaths = new Set(
    scope.rows.filter((row) => row.scope === 'boundary').map((row) => String(row.startUrl).split('?')[0])
  );
  const allowedPaths = new Set();
  for (const entryUrl of projection.entryUrls) {
    const patterns = projection.allowUrls[entryUrl];
    assert.ok(Array.isArray(patterns) && patterns.length > 0, `${entryUrl} has no allow list`);
    for (const pattern of patterns) {
      assert.match(pattern, /^\*:\/\/\*\/.+\*$/, pattern);
      allowedPaths.add(pattern.slice('*://*'.length, -1));
    }
    assert.ok(patterns.includes(`*://*${String(entryUrl).split('?')[0]}*`), `${entryUrl} allows itself`);
  }
  for (const boundaryPath of boundaryPaths) {
    assert.equal(allowedPaths.has(boundaryPath), false, `${boundaryPath} is allowed`);
  }
  for (const place of projection.places) {
    if (place.kind !== 'page' && place.kind !== 'view') continue;
    if (!place.route) continue;
    const routePath = place.route.split('?')[0];
    if (boundaryPaths.has(routePath) || routePath === '/') continue;
    assert.equal(allowedPaths.has(routePath), true, `${place.id} is not allowed by any entry`);
  }
});

// Measured with bombadil 0.7.10 on 2026-11-18: `*://*/` let a run reach /pkc-docs-index.html,
// so a bare `/` path matches every path, and `*://*/index.html` refused /index.html?noredirect=1.
test('allow URLs never include the match-all root and accept a query string', () => {
  const projection = buildProjection({});
  for (const [entryUrl, patterns] of Object.entries(projection.allowUrls)) {
    assert.equal(patterns.includes('*://*/'), false, `${entryUrl} allows every path`);
    for (const pattern of patterns) assert.ok(pattern.endsWith('*'), `${pattern} refuses a query string`);
  }
});

test('the projection carries every declared place except pending states', () => {
  const envelope = loadNetEnvelope(NET_PATH);
  const projection = buildProjection({});
  const expected = Object.entries(envelope.bindings.places)
    .filter(([, binding]) => binding.kind !== 'pending')
    .map(([id]) => id)
    .sort();
  assert.deepEqual(projection.places.map((place) => place.id).sort(), expected);
});

test('a broken trigger selector or call fails the drift check', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bombadil-nets-'));
  const netCopy = path.join(tmp, 'net.yaml');
  const outCopy = path.join(tmp, 'out.ts');
  fs.writeFileSync(netCopy, fs.readFileSync(NET_PATH, 'utf8'));

  await generate({ netPath: netCopy, scopePath: SCOPE_PATH, outPath: outCopy });
  assert.equal((await generate({ netPath: netCopy, scopePath: SCOPE_PATH, outPath: outCopy, check: true })).ok, true);

  const broken = fs
    .readFileSync(netCopy, 'utf8')
    .replace('selector: "btn-back-home"', 'selector: "btn-that-does-not-exist"');
  fs.writeFileSync(netCopy, broken);

  const result = await generate({ netPath: netCopy, scopePath: SCOPE_PATH, outPath: outCopy, check: true });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'trigger drift');
  assert.ok(result.drift.some((problem) => problem.includes('t_link_lab_to_index')));

  const callBroken = fs
    .readFileSync(NET_PATH, 'utf8')
    .replace('selector: "btn-back-home"', 'call: "callThatDoesNotExist()"');
  fs.writeFileSync(netCopy, callBroken);
  await generate({ netPath: netCopy, scopePath: SCOPE_PATH, outPath: outCopy });
  const callResult = await generate({ netPath: netCopy, scopePath: SCOPE_PATH, outPath: outCopy, check: true });
  assert.equal(callResult.ok, false);
  assert.equal(callResult.reason, 'trigger drift');
  assert.ok(callResult.drift.some((problem) => problem.includes('call "callThatDoesNotExist()"')));
});

test('a mutated scope file fails the check when the projection is not regenerated', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bombadil-nets-scope-'));
  const scopeCopy = path.join(tmp, 'scope.json');
  const outCopy = path.join(tmp, 'out.ts');
  fs.writeFileSync(scopeCopy, fs.readFileSync(SCOPE_PATH, 'utf8'));

  await generate({ netPath: NET_PATH, scopePath: scopeCopy, outPath: outCopy });
  assert.equal((await generate({ netPath: NET_PATH, scopePath: scopeCopy, outPath: outCopy, check: true })).ok, true);

  const parsedScope = JSON.parse(fs.readFileSync(scopeCopy, 'utf8'));
  parsedScope.rows = parsedScope.rows.filter((row) => row.surfaceId !== 'workbench-sprint-registry');
  fs.writeFileSync(scopeCopy, JSON.stringify(parsedScope, null, 2));

  const result = await generate({ netPath: NET_PATH, scopePath: scopeCopy, outPath: outCopy, check: true });
  assert.equal(result.ok, false);
  assert.match(result.reason, /stale/);
});

test('a stale generated file fails the check', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bombadil-nets-'));
  const outCopy = path.join(tmp, 'out.ts');
  fs.writeFileSync(outCopy, '// stale\n');
  const result = await generate({ scopePath: SCOPE_PATH, outPath: outCopy, check: true });
  assert.equal(result.ok, false);
  assert.match(result.reason, /stale/);
});

test('the renderer emits every export a spec imports', async () => {
  const projection = buildProjection({});
  const { RECORDER_TRANSITIONS } = await import(
    new URL('../../js/harness/recording-state-machine.js', import.meta.url).href
  );
  const text = renderProjection(projection, RECORDER_TRANSITIONS);
  for (const name of ['NET_ID', 'PLACES', 'ARCS', 'HISTORY_ARCS', 'ENTRY_URLS', 'ALLOW_URLS', 'RECORDER_TRANSITIONS']) {
    assert.match(text, new RegExp(`export const ${name} = `));
  }
  assert.match(fs.readFileSync(OUT_PATH, 'utf8'), /GENERATED by scripts\/gen-bombadil-nets\.mjs/);
});
