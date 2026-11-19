import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { CANARY_PATH, FIXTURE_PATH, renderCanary } from '../../scripts/bombadil/make-canary.mjs';
import { isDetection, parseCanaryArgs, violatedProperties } from '../../scripts/bombadil/canary.mjs';

test('counts a run only when it exits 2 with a hashMatchesPlace violation', () => {
  assert.equal(isDetection(2, ['hashMatchesPlace']), true);
  assert.equal(isDetection(2, ['noUncaughtExceptions']), false, 'another property does not count');
  assert.equal(isDetection(1, ['hashMatchesPlace']), false, 'a setup failure does not count');
});

test('reads violated properties and tolerates a missing trace or a truncated last line', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bombadil-canary-'));
  const trace = path.join(dir, 'trace.jsonl');
  assert.deepEqual(violatedProperties(trace), [], 'missing trace');
  fs.writeFileSync(trace, '{"violations":[]}\n{"violations":[{"name":"hashMatchesPlace"}]}\n{"violations":[{"na');
  assert.deepEqual(violatedProperties(trace), ['hashMatchesPlace']);
});

test('rejects a canary threshold that could pass with no detections', () => {
  assert.deepEqual(parseCanaryArgs(['--runs', '5', '--min-violations=4']), { runs: 5, minViolations: 4, timeLimit: '2m' });
  assert.throws(() => parseCanaryArgs(['--min-violations', '0']), /from 1 to --runs/);
  assert.throws(() => parseCanaryArgs(['--runs', '2', '--min-violations', '3']), /from 1 to --runs/);
});

test('the committed canary is the SPA fixture minus its popstate listener', () => {
  const fixture = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const canary = fs.readFileSync(CANARY_PATH, 'utf8');
  assert.equal(canary, renderCanary(fixture), 'canary is current; run node scripts/bombadil/make-canary.mjs');
  assert.match(fixture, /addEventListener\('popstate'/, 'fixture keeps its listener');
  assert.doesNotMatch(canary, /addEventListener\('popstate'/, 'canary has no listener');
});

// The canary must fail on its seeded bug, not on broken JavaScript. A nested `});` in the
// listener once cut the removal short, and the page never finished loading under Bombadil.
test('the canary keeps the rest of the fixture script intact and compilable', async () => {
  const { Script } = await import('node:vm');
  const canary = renderCanary(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  const scripts = [...canary.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0);
  for (const [, attrs, body] of scripts) {
    if (/type="application\/(ld\+)?json"/.test(attrs)) continue;
    // Module scripts may use import syntax; wrap them as an async function body instead.
    const source = /type="module"/.test(attrs)
      ? `(async () => {\n${body.replace(/^\s*import\s.*$/gm, '')}\n})`
      : body;
    assert.doesNotThrow(() => new Script(source), 'an inline script no longer parses');
  }
  assert.match(canary, /const initialPlace = HASH_TO_PLACE/, 'the code after the listener survives');
});

test('rendering refuses a fixture without exactly one popstate listener', () => {
  assert.throws(() => renderCanary('<script></script>'), /found 0/);
});
