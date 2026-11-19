#!/usr/bin/env node
// Reads the `netReport` extractor snapshots from a Bombadil run's trace.jsonl and prints
// one JSON firing record per line. With --min-firings N it exits 1 when the run fired
// fewer than N transitions, so a run that only scrolled cannot pass as clean (BPV-06).
//
//   node scripts/bombadil/trace-to-net.mjs <run directory | trace.jsonl> [--min-firings N] [--net-traces]
//
// --net-traces prints replayable net traces instead of firings: one per unbroken chain of
// places in one net, in the shape `replayNetTrace` takes, with `asserted: false` (BPV-D11).
//
// Exit codes: 0 ok, 1 below the bound, 2 setup error (missing or corrupt trace, bad arguments).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SNAPSHOT_NAME = 'netReport';
const TRACE_FILE = 'trace.jsonl';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// The trace format is undocumented, so errors name the pinned version it was read against.
// Read on demand: scripts/check-net.mjs imports this module, and the Astro build bundles
// check-net into dist/server, where no package.json sits two levels up.
export function bombadilVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
    return pkg.devDependencies?.['@antithesishq/bombadil'] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

class SetupError extends Error {}

// Bombadil 0.7.10 names a snapshot after the spec's own variable, so the shared
// extractor in tests/bombadil/net-report.ts arrives unnamed. It is recognised by shape.
const isNetReport = (snapshot) => {
  const value = snapshot?.value;
  if (!value || typeof value !== 'object' || !Array.isArray(value.records)) return false;
  if (snapshot.name === SNAPSHOT_NAME) return true;
  return snapshot.name === null && 'nonce' in value && 'path' in value;
};

const isTraceLine = (row) =>
  row !== null && typeof row === 'object' && typeof row.timestamp === 'number' && Array.isArray(row.snapshots);

// Split on "\n" only: typed text in a trace can hold U+2028 and other separators
// that a generic line splitter would treat as line ends.
export function readFirings(traceText, { source = 'trace' } = {}) {
  const firings = new Map();
  const lines = traceText.split('\n');
  for (const [index, line] of lines.entries()) {
    if (line.trim() === '') continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch (error) {
      throw new SetupError(`${source}:${index + 1} is not JSON: ${error.message}`);
    }
    if (!isTraceLine(row)) {
      throw new SetupError(
        `${source}:${index + 1} does not look like a bombadil ${bombadilVersion()} trace line (expected "timestamp" and "snapshots")`
      );
    }
    for (const snapshot of row.snapshots) {
      if (!isNetReport(snapshot)) continue;
      const { netId, nonce, path: page, records } = snapshot.value;
      for (const record of Array.isArray(records) ? records : []) {
        const key = `${nonce}:${record.seq}`;
        if (firings.has(key)) continue;
        firings.set(key, {
          transitionId: record.transitionId ?? null,
          fromPlaceId: record.fromPlaceId ?? null,
          toPlaceId: record.toPlaceId ?? null,
          netId: netId ?? null,
          nonce: nonce ?? null,
          seq: record.seq,
          path: page ?? null,
          timestamp: row.timestamp
        });
      }
    }
  }
  return [...firings.values()];
}

// Each firing is one cross-document arrival or one in-document step. Taken in time order,
// a run's firings in one net form chains: each starts where the previous one ended. A gap
// (a page restored from the back-forward cache logs no arrival) or a change of net starts a
// new trace, whose entry is the first firing's source place.
export function toNetTraces(firings, { resolveNetId = (firing) => firing.netId, source = 'bombadil' } = {}) {
  const ordered = [...firings].sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
  const traces = [];
  let current = null;
  for (const firing of ordered) {
    const netId = resolveNetId(firing);
    const last = current?.events.at(-1);
    if (!current || current.netId !== netId || last.toPlaceId !== firing.fromPlaceId) {
      current = {
        traceId: `${source}#${traces.length + 1}`,
        netId,
        entryPlaceId: firing.fromPlaceId,
        events: [],
        asserted: false
      };
      traces.push(current);
    }
    current.events.push({
      transitionId: firing.transitionId,
      fromPlaceId: firing.fromPlaceId,
      toPlaceId: firing.toPlaceId
    });
  }
  return traces;
}

// Every trace.jsonl below a directory such as bombadil-output/, in path order.
export function findTraceFilesDeep(root, { excludeCanary = false } = {}) {
  if (!fs.existsSync(root)) throw new SetupError(`${root} does not exist`);
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && excludeCanary && entry.name.startsWith('spa-canary')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === TRACE_FILE) found.push(full);
    }
  };
  walk(root);
  return found;
}

// A run directory holds trace.jsonl. A page-load run holds one entry-N directory per URL.
export function findTraceFiles(target) {
  if (!fs.existsSync(target)) throw new SetupError(`${target} does not exist`);
  if (fs.statSync(target).isFile()) return [target];
  const own = path.join(target, TRACE_FILE);
  if (fs.existsSync(own)) return [own];
  const nested = fs
    .readdirSync(target, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(target, entry.name, TRACE_FILE))
    .filter((file) => fs.existsSync(file))
    .sort();
  if (nested.length === 0) throw new SetupError(`no ${TRACE_FILE} under ${target}`);
  return nested;
}

function parseArgs(argv) {
  const [target, ...rest] = argv;
  if (!target || target.startsWith('--')) {
    throw new SetupError('usage: trace-to-net.mjs <run directory | trace.jsonl> [--min-firings N] [--net-traces]');
  }
  let minFirings = null;
  let netTraces = false;
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--net-traces') {
      netTraces = true;
      continue;
    }
    const value = arg === '--min-firings' ? rest[++i] : arg.startsWith('--min-firings=') ? arg.split('=')[1] : undefined;
    if (value === undefined) throw new SetupError(`unknown option ${arg}`);
    if (!/^\d+$/.test(value ?? '')) throw new SetupError(`--min-firings needs a whole number, got ${value}`);
    minFirings = Number(value);
  }
  return { target, minFirings, netTraces };
}

// Chains never cross runs, so each trace file converts on its own.
export function readNetTraces(files) {
  return files.flatMap((file) =>
    toNetTraces(readFirings(fs.readFileSync(file, 'utf8'), { source: file }), { source: file })
  );
}

export function main(argv, { stdout = console.log, stderr = console.error } = {}) {
  try {
    const { target, minFirings, netTraces } = parseArgs(argv);
    const files = findTraceFiles(target);
    const firings = files.flatMap((file) => readFirings(fs.readFileSync(file, 'utf8'), { source: file }));
    const lines = netTraces ? readNetTraces(files) : firings;
    for (const line of lines) stdout(JSON.stringify(line));
    const distinct = new Set(firings.map((firing) => firing.transitionId)).size;
    stderr(`[trace-to-net] ${firings.length} firings, ${distinct} distinct transitions`);
    if (minFirings !== null && firings.length < minFirings) {
      stderr(`[trace-to-net] ${firings.length} firings is fewer than ${minFirings}`);
      return 1;
    }
    return 0;
  } catch (error) {
    if (!(error instanceof SetupError)) throw error;
    stderr(`[trace-to-net] ${error.message}`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.argv.slice(2));
}
