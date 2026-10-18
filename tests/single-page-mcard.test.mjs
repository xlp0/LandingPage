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
  algorithmOf,
  formatGTime,
  hashContent,
  verifyRecord,
} from '../server/mcard-api.mjs';
import {
  PILL_ID,
  buildDeepLink,
  mountSinglePageMCard,
  parseSwitchIntent,
  renderPage,
  renderPill,
} from '../js/landing-page-mcard.js';
import {
  SANDBOX_ATTRIBUTES,
  assertSafeUrl,
  classifyProbe,
  createMembrane,
  renderGatewayCard,
  snapshotBody,
} from '../js/external-portal-membrane.js';
import { SAMPLES, VIEWPORTS, seed, verify } from '../scripts/seed-portal-samples.mjs';

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
  await new Promise((resolve) => fixtures.close(resolve));
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
    const resolved = lock[`${consumer}/node_modules/clm-kernel`] || {};
    assert.match(
      String(resolved.resolved || ''),
      /registry\.npmjs\.org\/clm-kernel/,
      `${consumer} must resolve clm-kernel from the registry, not the ${workspaceVersion} workspace source (spec: ${spec})`
    );
    assert.notEqual(
      String(resolved.version),
      workspaceVersion,
      `${consumer} must not resolve the unpublished workspace version ${workspaceVersion}`
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
