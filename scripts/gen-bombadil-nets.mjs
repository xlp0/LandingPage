#!/usr/bin/env node
/**
 * Generates the Bombadil projections from the checked workbench net, the
 * scope file and the recorder state machine. Every list a spec reads comes
 * from here, so a spec never copies a place, arc or route by hand.
 *
 * Usage: node scripts/gen-bombadil-nets.mjs [--check] [--net path] [--scope path] [--model path] [--out path]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadNetEnvelope, ROOT_DIR } from './check-net.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_NET = path.join(ROOT_DIR, 'src', 'net', 'workbench-net.yaml');
const DEFAULT_SCOPE = path.join(ROOT_DIR, 'tests', 'bombadil', 'scope.json');
const DEFAULT_OUT = path.join(ROOT_DIR, 'tests', 'bombadil', 'generated', 'workbench-net.ts');
const RECORDER_MODULE = path.join(ROOT_DIR, 'js', 'harness', 'recording-state-machine.js');

const NAV_KINDS = new Set(['redirect', 'link', 'client-route', 'recover']);

export function buildProjection({ netPath = DEFAULT_NET, scopePath = DEFAULT_SCOPE } = {}) {
  const envelope = loadNetEnvelope(netPath);
  const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8'));

  const places = Object.entries(envelope.bindings.places)
    .filter(([, binding]) => binding && binding.kind !== 'pending')
    .map(([id, binding]) => ({
      id,
      kind: binding.kind,
      route: binding.route || null,
      routeAliases: binding.routeAliases || [],
      queryFlag: binding.queryFlag || null,
      migrationState: binding.migrationState || null
    }));

  const arcs = Object.entries(envelope.bindings.transitions)
    .filter(([, binding]) => binding && NAV_KINDS.has(binding.kind))
    .map(([transitionId, binding]) => ({
      transitionId,
      from: binding.fromPlaceId,
      to: binding.toPlaceId,
      kind: binding.kind
    }))
    .filter((arc) => arc.from && arc.to);

  const historyArcs = [];
  const seen = new Set();
  for (const arc of arcs) {
    const key = `${arc.to}->${arc.from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    historyArcs.push({ transitionId: `history:${arc.transitionId}`, from: arc.to, to: arc.from, kind: 'history' });
  }

  const entryUrls = (scope.rows || [])
    .filter((row) => row.scope === 'explore' || row.scope === 'load-only')
    .map((row) => row.startUrl)
    .filter(Boolean);

  const boundaryPaths = new Set(
    (scope.rows || [])
      .filter((row) => row.scope === 'boundary' && row.startUrl)
      .map((row) => stripPath(row.startUrl))
  );
  const inScopePatterns = [...new Set(
    places
      .filter((place) => (place.kind === 'page' || place.kind === 'view') && place.route)
      .map((place) => stripPath(place.route))
      .filter((routePath) => !boundaryPaths.has(routePath) && routePath !== '/')
      .map(toMatchPattern)
  )].sort();

  const allowUrls = Object.fromEntries(
    entryUrls.map((entryUrl) => {
      const entryPattern = toMatchPattern(stripPath(entryUrl));
      return [entryUrl, [...new Set([entryPattern, ...inScopePatterns])].sort()];
    })
  );

  return { places, arcs, historyArcs, entryUrls, allowUrls };
}

function stripPath(rawUrl) {
  return String(rawUrl || '').split('?')[0] || '/';
}

// Chrome match patterns ignore the port, so one host-wildcard pattern covers the runner's random port.
// Bombadil 0.7.10 matches the path together with the query, so the trailing `*` admits
// /index.html?noredirect=1. It also reads a bare `/` path as every path, so the root
// redirect page is never allowed by pattern (measured 2026-11-18, decision row BPV-06).
function toMatchPattern(routePath) {
  return `*://*${routePath}*`;
}

function triggerDrift(envelope) {
  const problems = [];
  for (const [transitionId, binding] of Object.entries(envelope.bindings.transitions)) {
    const source = binding?.triggerSource;
    if (!source) continue;
    const filePath = path.join(ROOT_DIR, source.file);
    if (!fs.existsSync(filePath)) {
      problems.push(`${transitionId}: triggerSource file is missing: ${source.file}`);
      continue;
    }
    const needle = source.selector ?? source.call;
    if (!needle) {
      problems.push(`${transitionId}: triggerSource has neither selector nor call in ${source.file}`);
      continue;
    }
    const text = fs.readFileSync(filePath, 'utf8');
    if (!text.includes(needle)) {
      const label = source.selector !== undefined ? 'selector' : 'call';
      problems.push(`${transitionId}: ${label} "${needle}" is not in ${source.file}`);
    }
  }
  return problems;
}

export function applyModelOverlay(projection, modelDoc) {
  if (!modelDoc || typeof modelDoc !== 'object') {
    return projection;
  }
  return {
    ...projection,
    modelOverlay: {
      modelId: modelDoc.model_id ?? null,
      netRef: modelDoc.net_ref ?? null,
      projection: modelDoc.projection ?? null,
      properties: modelDoc.properties ?? [],
      actions: modelDoc.actions ?? {},
    },
  };
}

export function renderProjection(projection, recorderTransitions, netId = projection.netId ?? '') {
  const header = [
    '// GENERATED by scripts/gen-bombadil-nets.mjs. Do not edit by hand.',
    '// Run: npm run bombadil:nets',
    ''
  ];
  return [
    ...header,
    `export const NET_ID = ${JSON.stringify(netId)} as const;`,
    '',
    `export const PLACES = ${JSON.stringify(projection.places, null, 2)} as const;`,
    '',
    `export const ARCS = ${JSON.stringify(projection.arcs, null, 2)} as const;`,
    '',
    `export const HISTORY_ARCS = ${JSON.stringify(projection.historyArcs, null, 2)} as const;`,
    '',
    `export const ENTRY_URLS = ${JSON.stringify(projection.entryUrls, null, 2)} as const;`,
    '',
    `export const ALLOW_URLS = ${JSON.stringify(projection.allowUrls, null, 2)} as const;`,
    '',
    `export const RECORDER_TRANSITIONS = ${JSON.stringify(recorderTransitions, null, 2)} as const;`,
    ...(projection.modelOverlay
      ? ['', `export const MODEL_OVERLAY = ${JSON.stringify(projection.modelOverlay, null, 2)} as const;`]
      : []),
    ''
  ].join('\n');
}

export async function generate({
  netPath = DEFAULT_NET,
  scopePath = DEFAULT_SCOPE,
  outPath = DEFAULT_OUT,
  modelPath = null,
  check = false
} = {}) {
  const envelope = loadNetEnvelope(netPath);
  const baseProjection = buildProjection({ netPath, scopePath });
  const modelDoc = modelPath ? JSON.parse(fs.readFileSync(modelPath, 'utf8')) : null;
  const projection = applyModelOverlay(baseProjection, modelDoc);
  const { RECORDER_TRANSITIONS } = await import(pathToFileURL(RECORDER_MODULE).href);
  const content = renderProjection(projection, RECORDER_TRANSITIONS, envelope.netId);
  const drift = triggerDrift(envelope);

  if (check) {
    const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
    if (current !== content) {
      return { ok: false, reason: `generated projection is stale: ${path.relative(ROOT_DIR, outPath)}`, drift };
    }
    if (drift.length > 0) return { ok: false, reason: 'trigger drift', drift };
    return { ok: true, drift };
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf8');
  return { ok: drift.length === 0, wrote: outPath, drift };
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') opts.check = true;
    else if (arg === '--net') opts.netPath = path.resolve(argv[++i]);
    else if (arg === '--scope') opts.scopePath = path.resolve(argv[++i]);
    else if (arg === '--out') opts.outPath = path.resolve(argv[++i]);
    else if (arg === '--model') opts.modelPath = path.resolve(argv[++i]);
  }
  return opts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const result = await generate(parseArgs(process.argv.slice(2)));
  for (const problem of result.drift || []) console.error(`[bombadil:nets] DRIFT ${problem}`);
  if (!result.ok) {
    console.error(`[bombadil:nets] FAIL ${result.reason}`);
    process.exit(1);
  }
  console.log(result.wrote ? `[bombadil:nets] Wrote ${path.relative(ROOT_DIR, result.wrote)}` : '[bombadil:nets] PASS');
}
