import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  bombadilVersion,
  findTraceFiles,
  findTraceFilesDeep,
  main,
  readFirings,
  toNetTraces
} from '../../scripts/bombadil/trace-to-net.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Ten consecutive lines of a real `bombadil:workbench` trace (2026-11-18), kept verbatim
// except that the absolute screenshot directory is replaced by `<output>/`. The format
// is undocumented, so this sample pins what the script reads.
const SAMPLE = path.join(HERE, '..', 'fixtures', 'bombadil', 'sample-trace.jsonl');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bpv-trace-'));
}

function quietMain(argv) {
  const out = [];
  const err = [];
  const code = main(argv, { stdout: (line) => out.push(line), stderr: (line) => err.push(line) });
  return { code, out, err };
}

test('the sample trace yields each firing once, keyed by document and sequence', () => {
  const firings = readFirings(fs.readFileSync(SAMPLE, 'utf8'));
  assert.deepEqual(
    firings.map(({ transitionId, fromPlaceId, toPlaceId, path: page }) => ({ transitionId, fromPlaceId, toPlaceId, page })),
    [
      { transitionId: 't_link_lab_to_index', fromPlaceId: 'p_page_responsive_lab', toPlaceId: 'p_view_index_mcard_viewer', page: '/index.html' },
      { transitionId: 't_link_viewer_to_lab', fromPlaceId: 'p_view_index_mcard_viewer', toPlaceId: 'p_page_responsive_lab', page: '/responsive-lab.html' }
    ]
  );
  for (const firing of firings) {
    assert.match(firing.nonce, /^[0-9a-f-]{36}$/);
    assert.equal(firing.seq, 1);
    assert.equal(typeof firing.timestamp, 'number');
  }
});

test('a line separator inside typed text does not split a trace line', () => {
  const line = JSON.stringify({
    timestamp: 1,
    action: { TypeText: { text: 'a b c' } },
    snapshots: [{ name: 'netReport', value: { nonce: 'n', path: '/x', records: [{ seq: 1, transitionId: 't', fromPlaceId: 'a', toPlaceId: 'b' }] } }]
  });
  assert.equal(readFirings(`${line}\n`).length, 1);
});

test('an unnamed snapshot with the net report shape is read too', () => {
  // Bombadil 0.7.10 names a snapshot after the spec's own variable, so the shared
  // extractor in tests/bombadil/net-report.ts arrives with no name.
  const value = { netId: 'spa-test-target-net', nonce: 'n', path: '/x', records: [{ seq: 1, transitionId: 't', fromPlaceId: 'a', toPlaceId: 'b' }] };
  const line = JSON.stringify({
    timestamp: 1,
    snapshots: [{ name: null, value: { Click: {} } }, { name: null, value }]
  });
  const firings = readFirings(`${line}\n`);
  assert.equal(firings.length, 1);
  assert.equal(firings[0].netId, 'spa-test-target-net');
});

test('a run without net report snapshots has no firings and fails the bound', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'trace.jsonl'), `${JSON.stringify({ timestamp: 1, action: 'Wait', snapshots: [] })}\n`);
  const { code, out, err } = quietMain([dir, '--min-firings', '1']);
  assert.equal(code, 1);
  assert.equal(out.length, 0);
  assert.match(err.join('\n'), /0 firings.*fewer than 1/);
});

test('the bound passes at and fails below the number of firings', () => {
  const dir = tempDir();
  fs.copyFileSync(SAMPLE, path.join(dir, 'trace.jsonl'));
  const pass = quietMain([dir, '--min-firings', '2']);
  assert.equal(pass.code, 0);
  assert.equal(pass.out.length, 2);
  assert.deepEqual(JSON.parse(pass.out[0]).transitionId, 't_link_lab_to_index');
  assert.equal(quietMain([dir, '--min-firings', '3']).code, 1);
});

test('a page-load output directory is read through its entry directories', () => {
  const dir = tempDir();
  for (const entry of ['entry-0', 'entry-1']) {
    fs.mkdirSync(path.join(dir, entry));
    fs.copyFileSync(SAMPLE, path.join(dir, entry, 'trace.jsonl'));
  }
  assert.deepEqual(findTraceFiles(dir).map((file) => path.relative(dir, file)), [
    path.join('entry-0', 'trace.jsonl'),
    path.join('entry-1', 'trace.jsonl')
  ]);
  // The same documents in two runs are still two runs' firings.
  assert.equal(quietMain([dir]).out.length, 4);
});

test('the pinned sample converts to one replayable net trace marked as not asserted', () => {
  // The BPV-06 sample predates the netId field, so the resolver supplies it.
  const traces = toNetTraces(readFirings(fs.readFileSync(SAMPLE, 'utf8')), {
    resolveNetId: (firing) => firing.netId ?? 'landingpage-workbench-net'
  });
  assert.equal(traces.length, 1);
  const [trace] = traces;
  assert.equal(trace.asserted, false);
  assert.equal(trace.netId, 'landingpage-workbench-net');
  assert.equal(trace.entryPlaceId, 'p_page_responsive_lab');
  assert.equal(trace.events.length, 2);
  assert.deepEqual(trace.events.map((event) => event.transitionId), ['t_link_lab_to_index', 't_link_viewer_to_lab']);
  for (const event of trace.events) assert.deepEqual(Object.keys(event).sort(), ['fromPlaceId', 'toPlaceId', 'transitionId']);
});

test('a break in the place chain or a change of net starts a new trace', () => {
  const firing = (timestamp, netId, transitionId, fromPlaceId, toPlaceId) => ({
    timestamp, netId, transitionId, fromPlaceId, toPlaceId, nonce: `n${timestamp}`, seq: 1, path: '/'
  });
  const traces = toNetTraces([
    firing(3, 'a', 't_2', 'p_b', 'p_c'),
    firing(1, 'a', 't_1', 'p_a', 'p_b'),
    firing(5, 'a', 't_4', 'p_x', 'p_y'),
    firing(4, 'b', 't_3', 'q_a', 'q_b')
  ]);
  assert.deepEqual(
    traces.map((trace) => [trace.netId, trace.entryPlaceId, trace.events.map((event) => event.transitionId)]),
    [['a', 'p_a', ['t_1', 't_2']], ['b', 'q_a', ['t_3']], ['a', 'p_x', ['t_4']]]
  );
  assert.ok(traces.every((trace) => trace.asserted === false && trace.traceId));
});

test('a line of an unknown shape names the Bombadil version the reader expects', () => {
  const version = bombadilVersion();
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.throws(
    () => readFirings(`${JSON.stringify({ time: 1, frames: [] })}\n`, { source: 'odd.jsonl' }),
    new RegExp(`odd\\.jsonl:1 .*bombadil ${version.replace(/\./g, '\\.')}`)
  );
});

test('a directory of runs is searched for every trace below it', () => {
  const dir = tempDir();
  fs.mkdirSync(path.join(dir, 'run-a'));
  fs.copyFileSync(SAMPLE, path.join(dir, 'run-a', 'trace.jsonl'));
  fs.mkdirSync(path.join(dir, 'run-b', 'entry-0'), { recursive: true });
  fs.copyFileSync(SAMPLE, path.join(dir, 'run-b', 'entry-0', 'trace.jsonl'));
  fs.mkdirSync(path.join(dir, 'run-c', 'screenshots'), { recursive: true });
  assert.deepEqual(findTraceFilesDeep(dir).map((file) => path.relative(dir, file)), [
    path.join('run-a', 'trace.jsonl'),
    path.join('run-b', 'entry-0', 'trace.jsonl')
  ]);
  fs.mkdirSync(path.join(dir, 'spa-canary-123-run1'), { recursive: true });
  fs.copyFileSync(SAMPLE, path.join(dir, 'spa-canary-123-run1', 'trace.jsonl'));
  assert.deepEqual(findTraceFilesDeep(dir, { excludeCanary: true }).map((file) => path.relative(dir, file)), [
    path.join('run-a', 'trace.jsonl'),
    path.join('run-b', 'entry-0', 'trace.jsonl')
  ]);
});

test('a corrupt line, a missing trace and a bad bound are setup errors', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'trace.jsonl'), '{"timestamp": 1, "snap\n');
  assert.equal(quietMain([dir]).code, 2);
  assert.equal(quietMain([path.join(dir, 'missing')]).code, 2);
  assert.equal(quietMain([SAMPLE, '--min-firings', 'many']).code, 2);
  assert.equal(quietMain([]).code, 2);
});
