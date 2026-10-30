/**
 * SMR-09 verification suite — single-page MCard, canonical Triad store.
 *
 * Run from the repository root:
 *   node --test LandingPage/tests/single-page-mcard.test.mjs
 *
 * Covers: canonical 3-table schema and hash law (DoD-SMR-09-01), single-page
 * handle revision history (DoD-SMR-09-02), external URL membrane verdicts
 * (DoD-SMR-09-03), negative controls (DoD-SMR-09-06), and the Contract D line
 * ceiling (DoD-SMR-09-07, skipped until its files land).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';

import express from 'express';
import yaml from 'js-yaml';
import Ajv from 'ajv';

import mcardRoutes, {
  CanonicalTriadBackend,
  DEFAULT_ALGORITHM,
  LANDING_HANDLE,
  PROBE_BUDGET_MS,
  algorithmOf,
  configureProbePolicy,
  evaluateFramingPolicy,
  formatGTime,
  hashContent,
  initMCardAPI,
  isProhibitedHostOrIp,
  resetProbePolicy,
  validateProbeHop,
  verifyRecord,
} from '../server/mcard-api.mjs';
import {
  PILL_ID,
  buildDeepLink,
  classifyCardModality,
  mountSinglePageMCard,
  parseSwitchIntent,
  renderPage,
  renderPill,
} from '../js/landing-page-mcard.js';
import { classifyMCardModality } from '../server/mcard-modality.mjs';
import { EmbedRenderer } from '../js/renderers/EmbedRenderer.js';
import {
  MEMBRANE_STATES,
  PROBE_VERDICTS,
  SANDBOX_ATTRIBUTES,
  TELEMETRY_MESSAGE_TYPES,
  TELEMETRY_SCHEMA_VERSION,
  assertSafeUrl,
  classifyProbe,
  createMembrane,
  createTelemetryReceiver,
  renderGatewayCard,
  snapshotBody,
  validatePortalTelemetryMessage,
} from '../js/external-portal-membrane.js';
import { SAMPLES, STAMP, VIEWPORTS, seed, verify } from '../scripts/seed-portal-samples.mjs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

function tempDb(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smr09-'));
  return path.join(dir, name);
}

/** Builds a legacy 4-table store, exactly as the retired code laid it out. */
function writeLegacyStore(file, { hash, content, createdAt }) {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS blobs (
      payload_hash TEXT PRIMARY KEY NOT NULL, size_bytes INTEGER NOT NULL, data BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mcards (
      hash TEXT PRIMARY KEY NOT NULL, schema_version TEXT NOT NULL, created_at INTEGER NOT NULL,
      mime_type TEXT NOT NULL, author_did TEXT NOT NULL, payload_hash TEXT NOT NULL,
      metadata_json TEXT, sequence INTEGER NOT NULL DEFAULT 0, uri TEXT
    );
    CREATE TABLE IF NOT EXISTS handle_registry (
      handle TEXT PRIMARY KEY NOT NULL, current_hash TEXT NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS relations (
      source_hash TEXT NOT NULL, predicate TEXT NOT NULL, target_hash TEXT NOT NULL,
      PRIMARY KEY (source_hash, predicate, target_hash)
    );
  `);
  const buf = Buffer.from(content, 'utf8');
  db.prepare('INSERT INTO blobs (payload_hash, size_bytes, data) VALUES (?, ?, ?)').run(hash, buf.length, buf);
  db.prepare(
    'INSERT INTO mcards (hash, schema_version, created_at, mime_type, author_did, payload_hash, metadata_json, sequence, uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(hash, '1.0.0', createdAt, 'text/plain', 'did:clm:legacy', hash, '{}', 0, 'mcard:legacy');
  db.prepare('INSERT INTO handle_registry (handle, current_hash, updated_at) VALUES (?, ?, ?)').run(
    'urn:mcard:content:legacy_page',
    hash,
    createdAt
  );
  db.close();
}

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use('/api/mcard', mcardRoutes);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('DoD-SMR-09-01: the store deploys exactly the canonical 3-table Triad', () => {
  const store = new CanonicalTriadBackend(tempDb('triad.db'));
  try {
    assert.deepEqual(store.tables().sort(), ['card', 'handle_history', 'handle_registry']);
    for (const table of ['card', 'handle_registry', 'handle_history']) {
      const columns = store.db
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((row) => row.name);
      assert.equal(columns.length, 3, `${table} must carry exactly 3 columns`);
    }
    assert.deepEqual(
      store.db.prepare('PRAGMA table_info(card)').all().map((r) => r.name),
      ['hash', 'content', 'g_time']
    );
  } finally {
    store.close();
  }
});

test('DoD-SMR-09-01: card.hash is content-only under the algorithm g_time declares', () => {
  const store = new CanonicalTriadBackend(tempDb('hashlaw.db'));
  try {
    const { hash, gTime, inserted } = store.put('hello');
    assert.equal(inserted, true);
    assert.equal(algorithmOf(gTime), DEFAULT_ALGORITHM);
    assert.equal(gTime.split('|').length >= 3, true, 'g_time is ALGORITHM|TIMESTAMP|LOCALE');
    assert.equal(hash, hashContent('hello', DEFAULT_ALGORITHM));
    assert.equal(hash, 'ea8f163db38682925e4491c5e58d4bb3506ef8c14eb78a86e908c5624a67200f');

    const card = store.get(hash);
    assert.equal(card.verified, true, 'every row recomputes to its hash');
    assert.equal(card.algorithm, 'blake3');
    assert.equal(verifyRecord(hash, 'hello', formatGTime('blake3')), true);
    assert.equal(store.put('hello').inserted, false, 'content addressing is idempotent');
  } finally {
    store.close();
  }
});

test('DoD-SMR-09-01: legacy rows keep their sha256 digest and declare it in g_time', () => {
  const file = tempDb('legacy.db');
  const content = 'legacy landing page body';
  const legacyHash = hashContent(content, 'sha256');
  writeLegacyStore(file, { hash: legacyHash, content, createdAt: Date.UTC(2026, 9, 11) });

  const store = new CanonicalTriadBackend(file);
  try {
    assert.deepEqual(store.tables().sort(), ['card', 'handle_history', 'handle_registry']);
    assert.equal(store.has(legacyHash), true, 'the migrated row keeps its original digest');
    const card = store.get(legacyHash);
    assert.equal(card.algorithm, 'sha256');
    assert.equal(card.verified, true, 'the sha256 row still verifies under its declared algorithm');
    assert.equal(card.content, content);
    assert.equal(store.resolveHandle('urn:mcard:content:legacy_page'), legacyHash);

    const reminted = store.put(content, { algorithm: 'blake3' });
    assert.notEqual(reminted.hash, legacyHash, 're-minting creates a new record, never an in-place rewrite');
    assert.equal(store.has(legacyHash), true, 'the legacy record survives the re-mint');
  } finally {
    store.close();
  }
});

test('DoD-SMR-09-02: re-binding the landing handle records every superseded hash', () => {
  const store = new CanonicalTriadBackend(tempDb('landing.db'));
  try {
    const versions = ['v1', 'v2', 'v3'].map((body) => store.put(body));
    for (const version of versions) store.bindHandle(LANDING_HANDLE, version.hash);

    const history = store.handleHistory(LANDING_HANDLE);
    assert.equal(store.resolveHandle(LANDING_HANDLE), versions[2].hash);
    assert.equal(history.length, 2, 'two supersessions are recorded for three bindings');
    assert.deepEqual(
      history.map((h) => h.previousHash),
      [versions[0].hash, versions[1].hash]
    );
    const recoverable = new Set([...history.map((h) => h.previousHash), store.resolveHandle(LANDING_HANDLE)]);
    assert.equal(recoverable.size, 3, 'all three versions stay recoverable');
  } finally {
    store.close();
  }
});

test('DoD-SMR-09-06: unsafe URIs and malformed payloads are rejected without mutating the store', async () => {
  const file = tempDb('negative.db');
  const store = await (await import('../server/mcard-api.mjs')).initMCardAPI(file);
  const before = store.count();

  await withServer(async (base) => {
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>x</script>', 'not a url', '']) {
      const response = await fetch(`${base}/api/mcard/landing`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(url)}`);
    }
    const empty = await fetch(`${base}/api/mcard/landing`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(empty.status, 400);
  });

  assert.equal(store.count(), before, 'no rejected payload created a card');
  assert.equal(store.resolveHandle(LANDING_HANDLE), null, 'the landing handle stays unbound');
  store.close();
});

test('DoD-SMR-09-02: the landing endpoint stores a page and reports its history', async () => {
  const store = await (await import('../server/mcard-api.mjs')).initMCardAPI(tempDb('endpoint.db'));
  await withServer(async (base) => {
    const first = await fetch(`${base}/api/mcard/landing`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '# Sovereign portal' }),
    });
    assert.equal(first.status, 201);
    const created = await first.json();
    assert.equal(created.handle, LANDING_HANDLE);
    assert.equal(algorithmOf(created.gTime), 'blake3');

    const second = await fetch(`${base}/api/mcard/landing`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '# Sovereign portal v2' }),
    });
    const updated = await second.json();
    assert.equal(updated.previousHash, created.hash);
    assert.equal(updated.history.length, 1);

    const read = await fetch(`${base}/api/mcard/landing`);
    const page = await read.json();
    assert.equal(page.bound, true);
    assert.equal(page.verified, true);
    assert.equal(page.hash, updated.hash);

    const stats = await (await fetch(`${base}/api/mcard/stats`)).json();
    assert.equal(stats.defaultAlgorithm, 'blake3');
    assert.equal(stats.engine.includes('CanonicalTriadBackend'), true);
  });
  store.close();
});

test('DoD-SMR-09-03: the probe reports frameable and blocked verdicts from local fixtures', async () => {
  const fixtures = http.createServer((req, res) => {
    if (req.url === '/blocked') {
      res.writeHead(200, { 'x-frame-options': 'DENY' });
      return res.end('<html>blocked</html>');
    }
    if (req.url === '/csp') {
      res.writeHead(200, { 'content-security-policy': "frame-ancestors 'none'" });
      return res.end('<html>csp</html>');
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end('<html>frameable</html>');
  });
  await new Promise((resolve) => fixtures.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${fixtures.address().port}`;
  configureProbePolicy({ allowedFixtureOrigins: [origin] });

  try {
    await withServer(async (base) => {
      const frameable = await (await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(origin)}`)).json();
      assert.equal(frameable.verdict, 'frameable');
      assert.equal(frameable.frameable, true);

      const blocked = await (await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(`${origin}/blocked`)}`)).json();
      assert.equal(blocked.verdict, 'blocked');
      assert.equal(blocked.evidence.xFrameOptions, 'deny');

      const csp = await (await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(`${origin}/csp`)}`)).json();
      assert.equal(csp.verdict, 'blocked');
      assert.equal(csp.evidence.frameAncestors, true);

      const bad = await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent('javascript:1')}`);
      assert.equal(bad.status, 400);
    });
  } finally {
    resetProbePolicy();
    await new Promise((resolve) => fixtures.close(resolve));
  }
});

test('DoD-SMR-09-01 (guard): no legacy 4-table DDL survives in LandingPage', () => {
  const legacy = /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(mcards|blobs|relations)\b/i;
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mjs|js|cjs|ts)$/.test(entry.name) && legacy.test(fs.readFileSync(full, 'utf8'))) {
        offenders.push(path.relative(REPO_ROOT, full));
      }
    }
  };
  for (const dir of ['server', 'scripts', 'js', 'packages']) {
    const target = path.join(REPO_ROOT, 'LandingPage', dir);
    if (fs.existsSync(target)) walk(target);
  }
  assert.deepEqual(offenders, [], `the 4-table rule is broken in: ${offenders.join(', ')}`);
});

test('(guard): LandingPage and mcard-studio resolve clm-kernel to the PUBLISHED package', () => {
  const workspaceVersion = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'clm/kernel/clm_js_core/package.json'), 'utf8')
  ).version;
  for (const consumer of ['LandingPage', 'mcard-studio']) {
    const spec = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, consumer, 'package.json'), 'utf8'))
      .dependencies['clm-kernel'];
    assert.ok(spec, `${consumer} must declare clm-kernel`);
    const lock = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package-lock.json'), 'utf8')).packages;
    // npm hoists identical versions to the root, so a consumer's copy may be either nested or
    // hoisted. Both are valid resolutions; only a workspace link is not.
    const resolved =
      lock[`${consumer}/node_modules/clm-kernel`] || lock['node_modules/clm-kernel'] || {};
    assert.match(
      String(resolved.resolved || ''),
      /registry\.npmjs\.org\/clm-kernel/,
      `${consumer} must resolve clm-kernel from the registry, not the ${workspaceVersion} workspace source (spec: ${spec})`
    );
    // Version alone no longer discriminates: once the workspace version is published, a registry
    // install and a workspace link report the same number. A link is the thing to forbid.
    assert.notEqual(
      resolved.link,
      true,
      `${consumer} must not resolve clm-kernel through a workspace link`,
    );
  }
});

test('DoD-SMR-09-02: index.html hosts the single page and the controller renders it', () => {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'LandingPage/index.html'), 'utf8');
  assert.match(html, /id="single-page-mcard-host"/, 'index.html must host the single page');
  assert.match(html, /data-handle="urn:mcard:content:landing_page"/, 'the host declares the active handle');
  assert.match(html, /id="mcard-sovereign-pill-mount"/, 'index.html must mount the HUD pill');
  assert.match(html, /js\/landing-page-mcard\.js/, 'index.html must load the controller');

  const rendered = renderPage({ hash: 'a'.repeat(64), content: '# Hello', gTime: formatGTime('blake3') });
  assert.match(rendered, /data-handle="urn:mcard:content:landing_page"/);
  assert.match(rendered, new RegExp(`data-hash="${'a'.repeat(64)}"`));
  assert.match(rendered, /# Hello/);
  assert.match(renderPage(null), /No active page bound/);
});

test('DoD-SMR-09-03: the membrane falls back to a snapshot gateway and rejects unsafe URLs', async () => {
  assert.equal(classifyProbe({ verdict: 'frameable' }), 'live');
  assert.equal(classifyProbe({ verdict: 'blocked' }), 'snapshot');
  assert.equal(classifyProbe(null), 'offline');

  const pinned = [];
  const store = {
    pin: async (body) => {
      pinned.push(body);
      return hashContent(body, 'blake3');
    },
  };

  const frameable = createMembrane({ probe: async () => ({ verdict: 'frameable' }) });
  const live = await frameable.resolve('https://example.test/frameable');
  assert.equal(live.state, 'live');
  assert.match(live.html, /sandbox="allow-scripts allow-forms"/);
  assert.equal(SANDBOX_ATTRIBUTES, 'allow-scripts allow-forms');

  const blocked = createMembrane({ probe: async () => ({ verdict: 'blocked' }), store });
  const gated = await blocked.resolve('https://example.test/blocked');
  assert.equal(gated.state, 'snapshot');
  assert.match(gated.html, /mcard-snapshot-gateway/);
  assert.match(gated.html, new RegExp(gated.snapshotHash));
  assert.equal(pinned.length, 1);
  assert.match(pinned[0], /^snapshot: external-landing-page/m);

  const offline = createMembrane({ probe: async () => ({ verdict: 'unreachable' }), store });
  const cached = await offline.resolve('https://example.test/offline');
  assert.equal(cached.state, 'offline');
  assert.match(cached.html, /mcard-snapshot-offline/);

  assert.match(renderGatewayCard({ url: 'https://x.test', snapshotHash: 'abc' }), /↗ Launch External Website/);
  assert.match(snapshotBody({ url: 'https://x.test', reason: 'blocked' }), /url: https:\/\/x\.test/);
  for (const unsafe of ['javascript:alert(1)', 'data:text/html,x', 'not a url', '']) {
    assert.throws(() => assertSafeUrl(unsafe), (error) => error.status === 400, `${unsafe} must be rejected`);
  }
});

test('DoD-SMR-09-04: the seed generator produces the 6-sample corpus with 4 viewport classes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smr09-samples-'));
  const dbFile = path.join(dir, 'portal_samples.mcard.db');
  const manifestFile = path.join(dir, 'portal_samples_manifest.yaml');
  const manifest = seed({ dbFile, manifestFile });

  assert.equal(manifest.sample_count, 6);
  assert.deepEqual(
    manifest.samples.map((s) => s.handle.split(':').pop()).sort(),
    ['github_org_portal', 'govtech_civic_portal', 'mdn_docs_portal', 'open_wikimedia_portal', 'pkc_sovereign_hero', 'wearable_glance_portal']
  );
  assert.deepEqual(Object.keys(VIEWPORTS).sort(), ['cellphone', 'desktop', 'laptop', 'wearable']);

  const store = new CanonicalTriadBackend(dbFile);
  try {
    assert.deepEqual(store.tables().sort(), ['card', 'handle_history', 'handle_registry']);
    for (const sample of SAMPLES) {
      const bound = store.resolveHandle(sample.handle);
      assert.equal(bound, manifest.samples.find((s) => s.handle === sample.handle).snapshot_hash);
      const card = store.get(bound);
      assert.equal(card.verified, true, `${sample.handle} must recompute to its hash`);
      assert.equal(card.algorithm, 'blake3');
      assert.equal(hashContent(card.content, card.algorithm), bound);
    }
    for (const name of ['cellphone', 'laptop', 'desktop', 'wearable']) {
      assert.equal(
        manifest.samples.some((s) => Object.keys(s.viewports).includes(name)),
        true,
        `some sample must declare the ${name} budget`
      );
    }
  } finally {
    store.close();
  }

  const result = verify({ dbFile, manifestFile });
  assert.equal(result.ok, true, result.problems.join('; '));
  assert.equal(fs.existsSync(path.join(REPO_ROOT, 'LandingPage/data/samples/portal_samples.mcard.db')), true);
  assert.equal(fs.existsSync(path.join(REPO_ROOT, 'LandingPage/data/samples/portal_samples_manifest.yaml')), true);
});

test('DoD-SMR-09-04: the corpus validates against crd_landing_viewport.schema.json', () => {
  const schemaPath = path.join(REPO_ROOT, 'clm/docs/spec/60-verification/crd_landing_viewport.schema.json');
  assert.equal(fs.existsSync(schemaPath), true, 'the named viewport schema must exist');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const manifest = yaml.load(
    fs.readFileSync(path.join(REPO_ROOT, 'LandingPage/data/samples/portal_samples_manifest.yaml'), 'utf8')
  );

  const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
  const validate = ajv.compile(schema);
  assert.equal(validate(manifest), true, ajv.errorsText(validate.errors));
  assert.equal(manifest.samples.length, 6, 'the corpus carries six samples');

  const classes = new Set(manifest.samples.flatMap((sample) => Object.keys(sample.viewports)));
  for (const name of ['cellphone', 'laptop', 'desktop', 'wearable']) {
    assert.equal(classes.has(name), true, `the corpus must cover the ${name} class`);
  }

  const store = new CanonicalTriadBackend(
    path.join(REPO_ROOT, 'LandingPage/data/samples/portal_samples.mcard.db')
  );
  try {
    const handlePattern = new RegExp(schema.definitions.viewportSample.properties.handle.pattern);
    for (const sample of manifest.samples) {
      assert.match(sample.handle, handlePattern);
      assert.equal(store.resolveHandle(sample.handle), sample.snapshot_hash);
      assert.equal(store.get(sample.snapshot_hash).verified, true);
    }
  } finally {
    store.close();
  }
});

test('DoD-SMR-09-05: the HUD pill renders hash, switcher, and the Studio deep link', async () => {
  const samples = [
    { handle: 'urn:mcard:content:landing_sample:pkc_sovereign_hero', label: 'PKC Sovereign Hero' },
    { handle: 'urn:mcard:content:landing_sample:wearable_glance_portal', label: 'Wearable Glance Portal' },
  ];
  const hash = 'b'.repeat(64);
  const pill = renderPill({ hash, verified: true, samples, activeSample: samples[1].handle });

  assert.match(pill, new RegExp(`id="${PILL_ID}"`));
  assert.match(pill, /🪪 bbbbbbbbbb…/, 'the pill shows the active MCard hash');
  assert.match(pill, /✓ Witnessed/);
  assert.match(pill, /data-role="sample-switcher"/);
  assert.match(pill, /selected/, 'the active sample is preselected');
  assert.match(pill, /data-role="open-in-studio"/);
  assert.match(pill, new RegExp(`card=${hash}`));
  assert.match(pill, /handle=urn%3Amcard%3Acontent%3Alanding_page/);
  assert.match(pill, /Open in mcard-studio/);
  assert.match(renderPill({ hash: '', verified: false }), /⚠ Unverified/);

  assert.equal(
    buildDeepLink(hash),
    `./?card=${hash}&handle=urn%3Amcard%3Acontent%3Alanding_page`
  );
  assert.equal(parseSwitchIntent(samples[0].handle, samples).kind, 'sample');
  assert.equal(parseSwitchIntent('https://example.test/x', samples).kind, 'url');
  assert.equal(parseSwitchIntent('javascript:1', samples).kind, 'invalid');
  assert.equal(parseSwitchIntent('', samples).kind, 'none');

  // Cmd/Ctrl + K opens the URL switcher, exercised through a stub document.
  const listeners = {};
  const stub = (id) => ({ id, innerHTML: '', querySelector: () => ({ addEventListener: () => {}, click: () => { listeners.clicked = true; } }), addEventListener: () => {} });
  const documentStub = {
    getElementById: (id) => stub(id),
    querySelector: (selector) => stub(selector),
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
  };
  const api = { landing: async () => ({ bound: true, hash, verified: true }), setLanding: async () => ({}), probe: async () => ({}) };
  await mountSinglePageMCard({ root: documentStub, api, samples });
  assert.equal(typeof listeners.keydown, 'function', 'the controller binds the quick-switch key');
  listeners.keydown({ metaKey: true, key: 'k', preventDefault: () => { listeners.prevented = true; } });
  assert.equal(listeners.prevented, true, 'Cmd+K is intercepted');
});

test('DoD-SMR-09-08: the receipt and documentation delta are emitted and schema-shaped', () => {
  const receiptPath = path.join(REPO_ROOT, 'docs/sprints/programs/smr/evidence/smr-09-landing-single-card-receipt.json');
  const deltaPath = path.join(REPO_ROOT, 'docs/sprints/programs/smr/evidence/smr-09-doc-delta.yaml');
  assert.equal(fs.existsSync(receiptPath), true, 'the receipt must exist');
  assert.equal(fs.existsSync(deltaPath), true, 'the documentation delta must exist');

  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  assert.equal(receipt.sprint, 'SMR-09');
  assert.equal(receipt.program, 'EPIC-SMR');
  assert.ok(Array.isArray(receipt.verified_by) && receipt.verified_by.length > 0);
  assert.ok(receipt.dod_count >= 8);

  const delta = yaml.load(fs.readFileSync(deltaPath, 'utf8'));
  const content = delta.content ?? delta;
  assert.equal(content.record_type, 'DocumentationDeltaRecord');
  assert.match(content.sprint_id, /^[A-Z0-9]+-[0-9]{2}$/);
  assert.ok(['queued', 'applied', 'certified'].includes(content.status));
  assert.ok(content.targets.length > 0 && content.evidence_refs.length > 0);
  for (const target of content.targets) {
    assert.ok(target.path && target.section && target.proposed_change, 'each target carries path/section/proposed_change');
  }
});

test('DoD-SMR-09-07: the three SMR-09 modules stay within the 250-line ceiling', () => {
  for (const relative of [
    'LandingPage/js/landing-page-mcard.js',
    'LandingPage/js/external-portal-membrane.js',
    'LandingPage/scripts/seed-portal-samples.mjs',
  ]) {
    const lines = fs.readFileSync(path.join(REPO_ROOT, relative), 'utf8').split('\n').length;
    assert.equal(lines <= 250, true, `${relative} is ${lines} lines`);
  }
});

test('DoD-ULR-05-01 & DoD-ULR-05-02 (SCN-ULR-05-A): deterministic temp-seeded 6-sample corpus with pinned stamp and Triad hash-law', () => {
  const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'ulr05-seed1-'));
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ulr05-seed2-'));
  const db1 = path.join(dir1, 'portal_samples.mcard.db');
  const mf1 = path.join(dir1, 'portal_samples_manifest.yaml');
  const db2 = path.join(dir2, 'portal_samples.mcard.db');
  const mf2 = path.join(dir2, 'portal_samples_manifest.yaml');

  const manifest1 = seed({ dbFile: db1, manifestFile: mf1, stamp: STAMP });
  const manifest2 = seed({ dbFile: db2, manifestFile: mf2, stamp: STAMP });
  assert.equal(STAMP, '2026-10-18T00:00:00.000Z');
  assert.equal(manifest1.sample_count, 6);
  assert.deepEqual(manifest1, manifest2, 're-seeding with pinned STAMP produces identical manifest');

  const canonicalManifest = yaml.load(
    fs.readFileSync(path.join(REPO_ROOT, 'LandingPage/data/samples/portal_samples_manifest.yaml'), 'utf8')
  );
  assert.deepEqual(manifest1, canonicalManifest, 'temp-seeded manifest matches canonical manifest');

  const store = new CanonicalTriadBackend(db1);
  try {
    assert.deepEqual(store.tables().sort(), ['card', 'handle_history', 'handle_registry']);
    assert.equal(store.count(), 6);
    for (const entry of manifest1.samples) {
      const bound = store.resolveHandle(entry.handle);
      assert.equal(bound, entry.snapshot_hash);
      const card = store.get(bound);
      assert.equal(card.verified, true);
      assert.equal(card.gTime.startsWith('blake3|2026-10-18T00:00:00.000Z|'), true);
      assert.equal(verifyRecord(card.hash, card.content, card.gTime), true);
    }
  } finally {
    store.close();
  }
});

test('DoD-ULR-05-03 (SCN-ULR-05-B): probe verdicts are distinct from render states and timeout aborts within budget', async () => {
  assert.deepEqual([...PROBE_VERDICTS], ['frameable', 'blocked', 'unreachable']);
  assert.deepEqual([...MEMBRANE_STATES], ['live', 'snapshot', 'offline']);
  assert.equal(PROBE_BUDGET_MS, 600);

  const requestLog = [];
  const fixtures = http.createServer((req, res) => {
    requestLog.push({ method: req.method, url: req.url });
    if (req.url === '/delayed') {
      const timer = setTimeout(() => {
        if (!res.writableEnded) {
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end('<html>too late</html>');
        }
      }, PROBE_BUDGET_MS + 400);
      req.on('close', () => clearTimeout(timer));
      return;
    }
    if (req.url === '/blocked-xfo') {
      res.writeHead(200, { 'x-frame-options': 'DENY' });
      res.end('<html>blocked</html>');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<html>ok</html>');
  });
  await new Promise((resolve) => fixtures.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${fixtures.address().port}`;
  configureProbePolicy({ allowedFixtureOrigins: [origin] });

  try {
    await withServer(async (base) => {
      const probeFn = async (targetUrl) =>
        (await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(targetUrl)}`)).json();
      const membrane = createMembrane({
        probe: probeFn,
        store: { pin: async (body) => hashContent(body, 'blake3') },
        clock: () => STAMP,
      });

      const liveRes = await membrane.resolve(`${origin}/ok`, { nonce: 'nonce-123' });
      assert.equal(liveRes.probeVerdict, 'frameable');
      assert.equal(liveRes.state, 'live');
      assert.match(liveRes.html, /data-mount-nonce="nonce-123"/);

      const snapRes = await membrane.resolve(`${origin}/blocked-xfo`);
      assert.equal(snapRes.probeVerdict, 'blocked');
      assert.equal(snapRes.state, 'snapshot');

      const started = Date.now();
      const timeoutProbe = await probeFn(`${origin}/delayed`);
      const elapsed = Date.now() - started;
      assert.equal(timeoutProbe.verdict, 'unreachable');
      assert.equal(timeoutProbe.frameable, false);
      assert.equal(timeoutProbe.evidence.reason, 'budget exceeded');
      assert.ok(elapsed < PROBE_BUDGET_MS + 350, `abort took ${elapsed}ms, expected near ${PROBE_BUDGET_MS}ms budget`);

      const offRes = await membrane.resolve(`${origin}/delayed`);
      assert.equal(offRes.probeVerdict, 'unreachable');
      assert.equal(offRes.state, 'offline');
    });
    assert.equal(requestLog.length, 4, 'only local fixture endpoints were contacted');
  } finally {
    resetProbePolicy();
    await new Promise((resolve) => fixtures.close(resolve));
  }
});

test('DoD-ULR-05-04 & DoD-ULR-05-06 (SCN-ULR-05-C, Negative Control): SSRF, private/loopback/metadata, credentials, and prohibited redirects are rejected with zero hits', async () => {
  const prohibitedHits = [];
  const prohibitedServer = http.createServer((req, res) => {
    prohibitedHits.push(req.url);
    res.writeHead(200);
    res.end('secret internal metadata');
  });
  await new Promise((resolve) => prohibitedServer.listen(0, '127.0.0.1', resolve));
  const prohibitedOrigin = `http://127.0.0.1:${prohibitedServer.address().port}`;

  const approvedHits = [];
  const approvedFixture = http.createServer((req, res) => {
    approvedHits.push(req.url);
    if (req.url === '/redirect-to-loopback') {
      res.writeHead(302, { location: `${prohibitedOrigin}/secret` });
      return res.end();
    }
    if (req.url === '/redirect-to-metadata') {
      res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' });
      return res.end();
    }
    if (req.url === '/redirect-to-private') {
      res.writeHead(302, { location: 'http://10.0.0.1/admin' });
      return res.end();
    }
    if (req.url === '/redirect-to-unapproved-origin') {
      res.writeHead(302, { location: 'https://evil.example.invalid/phish' });
      return res.end();
    }
    res.writeHead(200);
    return res.end('ok');
  });
  await new Promise((resolve) => approvedFixture.listen(0, '127.0.0.1', resolve));
  const approvedOrigin = `http://127.0.0.1:${approvedFixture.address().port}`;

  configureProbePolicy({
    allowedFixtureOrigins: [approvedOrigin],
    resolver: async (hostname) => {
      if (hostname === 'example.gov') return ['10.24.0.5'];
      return ['93.184.216.34'];
    },
  });

  try {
    await withServer(async (base) => {
      for (const directBad of [
        `${prohibitedOrigin}/secret`,
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.1/internal',
        'http://172.16.5.4/internal',
        'http://192.168.1.1/router',
        'http://[::1]:8080/loopback',
        'http://localhost:8080/admin',
        'http://metadata.google.internal/computeMetadata/v1/',
        'https://user:password@example.gov/civic',
        'https://unapproved.example.com/page',
        'https://example.gov/rebound-to-private',
      ]) {
        const res = await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(directBad)}`);
        assert.equal(res.status, 400, `expected 400 rejection for ${directBad}`);
        const body = await res.json();
        assert.equal(body.frameable, false);
        assert.equal(body.verdict, 'unreachable');
      }

      for (const redirectPath of [
        '/redirect-to-loopback',
        '/redirect-to-metadata',
        '/redirect-to-private',
        '/redirect-to-unapproved-origin',
      ]) {
        const res = await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(`${approvedOrigin}${redirectPath}`)}`);
        assert.equal(res.status, 400, `expected 400 rejection for redirect ${redirectPath}`);
        const body = await res.json();
        assert.match(body.error, /redirect rejected/);
        assert.equal(body.frameable, false);
      }
    });

    assert.deepEqual(prohibitedHits, [], 'zero requests reached the prohibited loopback/internal server');
    assert.equal(approvedHits.length, 4, 'only the initial approved fixture redirect endpoints were queried');
  } finally {
    resetProbePolicy();
    await new Promise((resolve) => approvedFixture.close(resolve));
    await new Promise((resolve) => prohibitedServer.close(resolve));
  }
});

test('DoD-ULR-05-05 (SCN-ULR-05-D, Negative Control): sandbox omits allow-same-origin and postMessage telemetry validates source, nonce, and schema fail-closed', () => {
  assert.equal(SANDBOX_ATTRIBUTES.includes('allow-same-origin'), false, 'allow-same-origin must stay absent');
  assert.equal(TELEMETRY_SCHEMA_VERSION, 'mcard-portal-telemetry/v1');
  assert.deepEqual([...TELEMETRY_MESSAGE_TYPES], ['portal:ready', 'portal:resize', 'portal:metric', 'portal:error']);

  const childWindow = { id: 'sandbox-iframe-window' };
  const forgedWindow = { id: 'attacker-window' };
  const mountNonce = 'nonce-ulr05-abc';
  const studioState = { accepted: [], rejected: [] };

  const receiver = createTelemetryReceiver({
    expectedSource: childWindow,
    expectedNonce: mountNonce,
    onTelemetry: (msg) => studioState.accepted.push(msg),
    onReject: (err) => studioState.rejected.push(err.reason),
  });

  // Opaque origin ("null") with valid source, nonce, and schema succeeds.
  const validVerdict = receiver.handleMessage({
    source: childWindow,
    origin: 'null',
    data: {
      schema: TELEMETRY_SCHEMA_VERSION,
      type: 'portal:ready',
      nonce: mountNonce,
      payload: { height: 640 },
    },
  });
  assert.equal(validVerdict.ok, true);
  assert.equal(studioState.accepted.length, 1);
  assert.equal(studioState.accepted[0].payload.height, 640);

  // Forged source, wrong nonce, unknown schema version, unsupported type, and malformed payload all fail closed.
  const forgedCases = [
    {
      event: { source: forgedWindow, origin: 'null', data: { schema: TELEMETRY_SCHEMA_VERSION, type: 'portal:ready', nonce: mountNonce } },
      reason: 'source_mismatch',
    },
    {
      event: { source: childWindow, origin: 'null', data: { schema: TELEMETRY_SCHEMA_VERSION, type: 'portal:ready', nonce: 'wrong-nonce' } },
      reason: 'nonce_mismatch',
    },
    {
      event: { source: childWindow, origin: 'null', data: { schema: 'mcard-portal-telemetry/v0', type: 'portal:ready', nonce: mountNonce } },
      reason: 'unsupported_schema_version',
    },
    {
      event: { source: childWindow, origin: 'null', data: { schema: TELEMETRY_SCHEMA_VERSION, type: 'portal:exec', nonce: mountNonce } },
      reason: 'unsupported_message_type',
    },
    {
      event: { source: childWindow, origin: 'null', data: 'not-an-object' },
      reason: 'malformed_payload',
    },
    {
      event: { source: childWindow, origin: 'null', data: { schema: TELEMETRY_SCHEMA_VERSION, type: 'portal:metric', nonce: mountNonce, payload: ['bad'] } },
      reason: 'invalid_payload_object',
    },
  ];

  for (const { event, reason } of forgedCases) {
    const verdict = receiver.handleMessage(event);
    assert.equal(verdict.ok, false);
    assert.equal(verdict.reason, reason);
  }
  assert.equal(studioState.accepted.length, 1, 'rejected messages must never mutate Studio state');
  assert.equal(studioState.rejected.length, forgedCases.length);

  // Nonce revocation closes the receiver against replay.
  receiver.revokeNonce();
  const afterRevoke = receiver.handleMessage({
    source: childWindow,
    origin: 'null',
    data: { schema: TELEMETRY_SCHEMA_VERSION, type: 'portal:ready', nonce: mountNonce },
  });
  assert.equal(afterRevoke.ok, false);
  assert.equal(afterRevoke.reason, 'nonce_unconfigured');
  assert.equal(studioState.accepted.length, 1);
});

test('DoD-ULR-05-07 (SCN-ULR-05-E): CSP frame-ancestors and X-Frame-Options are evaluated against the configured embedding origin', async () => {
  const studioOrigin = 'https://studio.pkc.pub';
  const fixtures = http.createServer((req, res) => {
    if (req.url === '/csp-none') {
      res.writeHead(200, { 'content-security-policy': "frame-ancestors 'none'" });
      return res.end('none');
    }
    if (req.url === '/csp-other') {
      res.writeHead(200, { 'content-security-policy': 'frame-ancestors https://other.example' });
      return res.end('other');
    }
    if (req.url === '/csp-allow-studio') {
      res.writeHead(200, { 'content-security-policy': `frame-ancestors 'self' ${studioOrigin}` });
      return res.end('allowed');
    }
    if (req.url === '/xfo-sameorigin') {
      res.writeHead(200, { 'x-frame-options': 'SAMEORIGIN' });
      return res.end('sameorigin');
    }
    res.writeHead(200);
    return res.end('ok');
  });
  await new Promise((resolve) => fixtures.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${fixtures.address().port}`;
  configureProbePolicy({ allowedFixtureOrigins: [origin], embedderOrigin: studioOrigin });

  try {
    await withServer(async (base) => {
      const cspNone = await (await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(`${origin}/csp-none`)}`)).json();
      assert.equal(cspNone.verdict, 'blocked');
      assert.equal(cspNone.frameable, false);

      const cspOther = await (await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(`${origin}/csp-other`)}`)).json();
      assert.equal(cspOther.verdict, 'blocked');
      assert.equal(cspOther.frameable, false);

      const cspAllowed = await (await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(`${origin}/csp-allow-studio`)}`)).json();
      assert.equal(cspAllowed.verdict, 'frameable', 'configured embedderOrigin allowed by frame-ancestors must remain frameable');
      assert.equal(cspAllowed.frameable, true);
      assert.equal(cspAllowed.evidence.frameAncestors, true);
      assert.equal(cspAllowed.evidence.embedderOrigin, studioOrigin);

      const xfoCross = await (await fetch(`${base}/api/mcard/probe-url?url=${encodeURIComponent(`${origin}/xfo-sameorigin`)}`)).json();
      assert.equal(xfoCross.verdict, 'blocked');

      const xfoSame = await (
        await fetch(
          `${base}/api/mcard/probe-url?url=${encodeURIComponent(`${origin}/xfo-sameorigin`)}&embedderOrigin=${encodeURIComponent(origin)}`
        )
      ).json();
      assert.equal(xfoSame.verdict, 'frameable', 'SAMEORIGIN is frameable when embedderOrigin matches targetOrigin');
    });
  } finally {
    resetProbePolicy();
    await new Promise((resolve) => fixtures.close(resolve));
  }
});

test('DoD-SMO-01: binary media round-trip verifies rawBytes digest and streams via GET /api/mcard/:hash/raw with nosniff', async () => {
  // Construct a synthetic PNG payload with non-UTF-8 bytes (0x89, 0xff, 0xfe, 0x00)
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0xff, 0xfe, 0xfd, 0x80, 0x00, 0x49, 0x45, 0x4e, 0x44,
  ]);
  const b64 = Buffer.from(pngBytes).toString('base64');
  const store = await initMCardAPI(tempDb('smo01.db'));

  try {
    await withServer(async (base) => {
      const postRes = await fetch(`${base}/api/mcard`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contentBase64: b64, handle: 'urn:mcard:test:png_sample' }),
      });
      assert.equal(postRes.status, 201);
      const created = await postRes.json();
      assert.equal(created.verified, true, 'binary PNG digest must verify on rawBytes without UTF-8 replacement corruption');
      assert.equal(created.contentType, 'image/png');
      assert.equal(created.modality, 'media');
      assert.equal(created.isBinary, true);
      assert.equal(created.rawUrl, `/api/mcard/${created.hash}/raw`);

      const getRes = await fetch(`${base}/api/mcard/${created.hash}`);
      assert.equal(getRes.status, 200);
      const metadata = await getRes.json();
      assert.equal(metadata.verified, true);
      assert.equal(metadata.contentType, 'image/png');
      assert.equal(metadata.modality, 'media');
      assert.equal(metadata.contentBase64, b64);

      const rawRes = await fetch(`${base}/api/mcard/${created.hash}/raw`);
      assert.equal(rawRes.status, 200);
      assert.equal(rawRes.headers.get('x-content-type-options'), 'nosniff');
      assert.match(rawRes.headers.get('content-type') ?? '', /^image\/png/);
      const rawBuf = new Uint8Array(await rawRes.arrayBuffer());
      assert.deepEqual(rawBuf, pngBytes, 'GET /api/mcard/:hash/raw must stream exact byte-for-byte payload');
    });
  } finally {
    store.close();
  }
});

test('DoD-SMO-02: classifyMCardModality delegates to clm-kernel@0.0.10 TypeInterpreter across all 4 modalities', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
  const mediaPng = classifyMCardModality(pngBytes);
  assert.equal(mediaPng.modality, 'media');
  assert.equal(mediaPng.contentType, 'image/png');
  assert.equal(mediaPng.isBinary, true);

  const mdDoc = classifyMCardModality('# Universal MCard Browser\n\nParagraph with [[urn:mcard:sample]].');
  assert.equal(mdDoc.modality, 'document');
  assert.equal(mdDoc.contentType, 'text/markdown');
  assert.equal(mdDoc.rendererType, 'markdown');

  const jsonDoc = classifyMCardModality(JSON.stringify({ schema: 'mcard/v1', items: [1, 2, 3] }));
  assert.equal(jsonDoc.modality, 'document');
  assert.equal(jsonDoc.contentType, 'application/json');

  const clmSpec = classifyMCardModality('abstract_spec:\n  goal: verify\nconcrete_impl:\n  module: test\nbalanced_exp:\n  cases: []\n');
  assert.equal(clmSpec.modality, 'code');
  assert.equal(clmSpec.contentType, 'application/x-clm');
  assert.equal(clmSpec.rendererType, 'clm');

  const jsCode = classifyMCardModality('export function add(a, b) {\n  return a + b;\n}\n', { filename: 'math.js' });
  assert.equal(jsCode.modality, 'code');
  assert.equal(jsCode.rendererType, 'code');

  const htmlWebapp = classifyMCardModality('<!DOCTYPE html><html><body><h1>Interactive App</h1></body></html>');
  assert.equal(htmlWebapp.modality, 'webapp');
  assert.equal(htmlWebapp.contentType, 'text/html');
  assert.equal(htmlWebapp.rendererType, 'html');

  const portalWebapp = classifyMCardModality('external-url: https://pkc.pub/portal');
  assert.equal(portalWebapp.modality, 'webapp');
  assert.equal(portalWebapp.contentType, 'text/uri-list');
  assert.equal(portalWebapp.rendererType, 'portal');
});

test('DoD-SMO-03: renderPage projects all 4 modalities with execution isolation and EmbedRenderer enforces sandbox', async () => {
  const gTime = formatGTime('blake3');
  const hash = 'b'.repeat(64);

  // Modality 1: media (image/png)
  const mediaHtml = renderPage({ hash, contentType: 'image/png', modality: 'media', isBinary: true, gTime });
  assert.match(mediaHtml, /data-modality="media"/);
  assert.match(mediaHtml, /<img src="\/api\/mcard\/b{64}\/raw"/);
  assert.doesNotMatch(mediaHtml, /<script/i);

  // Modality 2: document (text/markdown with [[hash]] transclusion)
  const docHtml = renderPage({
    hash,
    contentType: 'text/markdown',
    modality: 'document',
    content: '# Civic Charter\nSee [[urn:mcard:sample:hero|Hero Sample]] <script>alert(1)</script>',
    gTime,
  });
  assert.match(docHtml, /data-modality="document"/);
  assert.match(docHtml, /# Civic Charter/);
  assert.match(docHtml, /data-mcard-ref="urn:mcard:sample:hero"/);
  assert.doesNotMatch(docHtml, /<script>alert\(1\)<\/script>/, 'document renderer must escape script tags');

  // Modality 3: code (inert inspection — browsing code never executes it)
  const codeHtml = renderPage({
    hash,
    contentType: 'application/javascript',
    modality: 'code',
    content: 'console.log("<script>evil()</script>");\nexport const x = 42;',
    gTime,
  });
  assert.match(codeHtml, /data-modality="code"/);
  assert.match(codeHtml, /data-execution="inert"/);
  assert.match(codeHtml, /data-line="1"/);
  assert.match(codeHtml, /data-line="2"/);
  assert.doesNotMatch(codeHtml, /<script>evil\(\)<\/script>/);

  // Modality 4: webapp (sandboxed iframe srcdoc without allow-same-origin; never raw host.innerHTML injection)
  const webappCard = {
    hash,
    contentType: 'text/html',
    modality: 'webapp',
    content: '<!DOCTYPE html><html><body><script>window.parent.hacked = true;</script><h1>App</h1></body></html>',
    gTime,
  };
  const webappHtml = renderPage(webappCard);
  assert.match(webappHtml, /data-modality="webapp"/);
  assert.match(webappHtml, /<iframe class="mcard-webapp-frame" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer"/);
  assert.doesNotMatch(webappHtml, /allow-same-origin/);
  assert.doesNotMatch(webappHtml, /<script>window\.parent\.hacked/, 'raw <script> must never be injected directly into host DOM');

  // Modality 4 source view mode switches to inert code projection
  const webappSourceHtml = renderPage(webappCard, { viewMode: 'source' });
  assert.match(webappSourceHtml, /data-modality="code"/);
  assert.match(webappSourceHtml, /data-execution="inert"/);

  // EmbedRenderer hardens iframe with sandbox="allow-scripts allow-forms" and rejects unsafe protocols
  const embedRenderer = new EmbedRenderer();
  const safeEmbed = await embedRenderer.render(JSON.stringify({ title: 'Demo', url: 'https://example.com/embed' }));
  assert.match(safeEmbed, /sandbox="allow-scripts allow-forms"/);
  assert.match(safeEmbed, /referrerpolicy="no-referrer"/);
  await assert.rejects(
    () => embedRenderer.render(JSON.stringify({ title: 'XSS', url: 'javascript:alert(1)' })),
    /Unsafe embed URL protocol/
  );

  // Server Module Line Budget (Contract D <= 500 lines)
  for (const rel of ['server/mcard-api.mjs', 'server/mcard-modality.mjs', 'server/mcard-probe-policy.mjs']) {
    const lines = fs.readFileSync(path.join(REPO_ROOT, 'LandingPage', rel), 'utf8').split('\n').length;
    assert.ok(lines <= 500, `${rel} is ${lines} lines (budget: 500)`);
  }
});


