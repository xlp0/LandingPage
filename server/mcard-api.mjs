import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { computeHash } from 'clm-kernel';

import {
  MODALITY_TYPES, classifyMCardContent, detectContentType, isBinaryContent, resolveModality, toRawBuffer,
} from './mcard-modality.mjs';
import {
  DEFAULT_FIXTURE_ORIGINS, MANIFEST_APPROVED_ORIGINS, MAX_PROBE_REDIRECTS, PROBE_BUDGET_MS,
  configureProbePolicy, evaluateFramingPolicy, executeProbeUrl, getProbePolicy,
  isProhibitedHostOrIp, resetProbePolicy, validateExternalUrl, validateProbeHop,
} from './mcard-probe-policy.mjs';

export {
  DEFAULT_FIXTURE_ORIGINS, MANIFEST_APPROVED_ORIGINS, MAX_PROBE_REDIRECTS, MODALITY_TYPES, PROBE_BUDGET_MS,
  classifyMCardContent, configureProbePolicy, detectContentType, evaluateFramingPolicy, isBinaryContent,
  isProhibitedHostOrIp, resetProbePolicy, resolveModality, toRawBuffer, validateExternalUrl, validateProbeHop,
};

const router = express.Router();

export const KERNEL_PROVENANCE = 'clm-kernel@0.0.12';
export const LANDING_HANDLE = 'urn:mcard:content:landing_page';
export const DEFAULT_ALGORITHM = 'blake3';
export const LEGACY_ALGORITHM = 'sha256';

let storage = null;
let ready = false;
let dbPath = null;
let sequence = 0;

function nowIso() {
  return new Date().toISOString();
}

function currentLocale() {
  return process.env.CLM_LOCALE || Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
}

export function formatGTime(algorithm = DEFAULT_ALGORITHM, timestamp = nowIso(), locale = currentLocale()) {
  return `${algorithm}|${timestamp}|${locale}`;
}

export function algorithmOf(gTime) {
  const algorithm = String(gTime ?? '').split('|')[0].trim().toLowerCase();
  return algorithm || DEFAULT_ALGORITHM;
}

function bytesOf(content) {
  return toRawBuffer(content);
}

export function hashContent(content, algorithm = DEFAULT_ALGORITHM) {
  const buf = bytesOf(content);
  return computeHash(algorithm, new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
}

export function verifyRecord(hash, content, gTime) {
  return hashContent(content, algorithmOf(gTime)) === String(hash).toLowerCase();
}

const TRIAD_DDL = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS card (
    hash TEXT PRIMARY KEY NOT NULL,
    content BLOB NOT NULL,
    g_time TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS handle_registry (
    handle TEXT PRIMARY KEY NOT NULL,
    current_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS handle_history (
    handle TEXT NOT NULL,
    previous_hash TEXT NOT NULL,
    changed_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_handle_history_handle
    ON handle_history (handle, changed_at);
`;

export class CanonicalTriadBackend {
  constructor(filename) {
    this.filename = filename;
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new DatabaseSync(filename);
    this.db.exec(TRIAD_DDL);
    this.migrated = this.migrateLegacyTables();
  }

  tables() {
    return this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row) => row.name);
  }

  migrateLegacyTables() {
    const tables = this.tables();
    if (!tables.includes('mcards')) return { cards: 0, handles: 0 };

    const cards = this.db.prepare('SELECT hash, created_at, payload_hash FROM mcards').all();
    const blobs = new Map(
      this.db
        .prepare('SELECT payload_hash, data FROM blobs')
        .all()
        .map((row) => [row.payload_hash, row.data])
    );

    let migratedCards = 0;
    const insertCard = this.db.prepare('INSERT OR IGNORE INTO card (hash, content, g_time) VALUES (?, ?, ?)');
    for (const row of cards) {
      const blob = blobs.get(row.payload_hash);
      if (blob === undefined) continue;
      const content = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
      const stamp = new Date(Number(row.created_at) || Date.now()).toISOString();
      insertCard.run(row.hash, content, formatGTime(LEGACY_ALGORITHM, stamp));
      migratedCards += 1;
    }

    let migratedHandles = 0;
    if (tables.includes('handle_registry')) {
      const insertHandle = this.db.prepare(
        'INSERT OR REPLACE INTO handle_registry (handle, current_hash, updated_at) VALUES (?, ?, ?)'
      );
      for (const row of this.db.prepare('SELECT handle, current_hash, updated_at FROM handle_registry').all()) {
        const updated = Number.isFinite(Number(row.updated_at))
          ? new Date(Number(row.updated_at)).toISOString()
          : String(row.updated_at ?? nowIso());
        insertHandle.run(row.handle, row.current_hash, updated);
        migratedHandles += 1;
      }
    }

    this.db.exec('DROP TABLE IF EXISTS relations; DROP TABLE IF EXISTS blobs; DROP TABLE IF EXISTS mcards;');
    return { cards: migratedCards, handles: migratedHandles };
  }

  put(content, { algorithm = DEFAULT_ALGORITHM, gTime = null } = {}) {
    const rawBytes = bytesOf(content);
    const hash = hashContent(rawBytes, algorithm);
    const exists = this.db.prepare('SELECT 1 FROM card WHERE hash = ?').get(hash);
    if (exists) return { hash, gTime: this.gTimeOf(hash), inserted: false };

    const stamp = gTime || formatGTime(algorithm);
    this.db.prepare('INSERT INTO card (hash, content, g_time) VALUES (?, ?, ?)').run(hash, rawBytes, stamp);
    return { hash, gTime: stamp, inserted: true };
  }

  gTimeOf(hash) {
    const row = this.db.prepare('SELECT g_time FROM card WHERE hash = ?').get(hash);
    return row ? row.g_time : null;
  }

  get(hash, options = {}) {
    const row = this.db.prepare('SELECT hash, content, g_time FROM card WHERE hash = ?').get(hash);
    if (!row) return null;
    const rawBytes = Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content);
    const verified = verifyRecord(row.hash, rawBytes, row.g_time);
    const classification = classifyMCardContent(rawBytes, options);
    const content = classification.isBinary
      ? rawBytes.toString('base64')
      : rawBytes.toString('utf8');

    return {
      hash: row.hash,
      content,
      ...(classification.isBinary ? { contentBase64: content } : {}),
      rawBytes,
      isBinary: classification.isBinary,
      gTime: row.g_time,
      algorithm: algorithmOf(row.g_time),
      verified,
      mimeType: classification.mimeType,
      category: classification.category,
      universe: classification.universe,
      modality: classification.modality,
      size: rawBytes.byteLength,
    };
  }

  has(hash) {
    return Boolean(this.db.prepare('SELECT 1 FROM card WHERE hash = ?').get(hash));
  }

  count() {
    return Number(this.db.prepare('SELECT COUNT(*) AS count FROM card').get()?.count || 0);
  }

  list() {
    return this.db
      .prepare('SELECT hash FROM card ORDER BY g_time ASC')
      .all()
      .map((row) => this.get(row.hash));
  }

  resolveHandle(handle) {
    const row = this.db.prepare('SELECT current_hash FROM handle_registry WHERE handle = ?').get(handle);
    return row ? row.current_hash : null;
  }

  bindHandle(handle, hash) {
    if (!this.has(hash)) throw new Error(`cannot bind ${handle}: card ${hash} is not stored`);
    const previous = this.resolveHandle(handle);
    if (previous === hash) return { handle, hash, changed: false, previousHash: null };

    const now = nowIso();
    if (previous) {
      this.db
        .prepare('INSERT INTO handle_history (handle, previous_hash, changed_at) VALUES (?, ?, ?)')
        .run(handle, previous, now);
    }
    this.db
      .prepare(
        `INSERT INTO handle_registry (handle, current_hash, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(handle) DO UPDATE SET current_hash = excluded.current_hash,
                                           updated_at = excluded.updated_at`
      )
      .run(handle, hash, now);
    return { handle, hash, changed: true, previousHash: previous };
  }

  handleHistory(handle) {
    return this.db
      .prepare('SELECT previous_hash, changed_at FROM handle_history WHERE handle = ? ORDER BY changed_at ASC')
      .all(handle)
      .map((row) => ({ previousHash: row.previous_hash, changedAt: row.changed_at }));
  }

  listHandles(prefix = '') {
    const escaped = String(prefix).replace(/([%_\\])/g, '\\$1');
    const pattern = `${escaped}%`;
    return this.db
      .prepare(
        "SELECT handle, current_hash, updated_at FROM handle_registry WHERE handle LIKE ? ESCAPE '\\' ORDER BY updated_at DESC"
      )
      .all(pattern)
      .map((row) => ({
        handle: row.handle,
        currentHash: row.current_hash,
        updatedAt: row.updated_at,
      }));
  }

  releaseHandles(hash) {
    const rows = this.db.prepare('SELECT handle FROM handle_registry WHERE current_hash = ?').all(hash);
    const handles = rows.map((row) => row.handle);
    if (handles.length > 0) {
      this.db.prepare('DELETE FROM handle_registry WHERE current_hash = ?').run(hash);
    }
    return handles;
  }

  close() {
    try {
      this.db.close();
    } catch {
    }
  }
}

function cardView(card, { preview = null } = {}) {
  const content = card.content ?? '';
  const contentType = card.mimeType || detectContentType(content);
  const modality = card.modality || resolveModality(contentType, { binary: Boolean(card.isBinary) });
  return {
    hash: card.hash,
    uri: `urn:mcard:card:${card.hash}`,
    rawUrl: `/api/mcard/${card.hash}/raw`,
    size: card.size ?? Buffer.byteLength(content, 'utf8'),
    contentType,
    category: card.category || modality,
    universe: card.universe || 'U0',
    modality,
    isBinary: Boolean(card.isBinary),
    ...(card.contentBase64 ? { contentBase64: card.contentBase64 } : {}),
    content: preview ? content.slice(0, preview) : content,
    gTime: card.gTime,
    algorithm: card.algorithm,
    verified: card.verified,
  };
}

export async function initMCardAPI(dbFile = path.join(process.cwd(), 'data', 'mcard-api.db')) {
  storage = new CanonicalTriadBackend(dbFile);
  ready = true;
  dbPath = dbFile;
  console.log(`[MCard API] ✅ CanonicalTriadBackend ready at ${dbFile}`);
  return storage;
}

function ensureReady(res) {
  if (!ready || !storage) {
    try {
      initMCardAPI();
    } catch (e) {
      res.status(503).json({ error: `MCard API unavailable: ${e.message ?? e}` });
      return false;
    }
  }
  return true;
}

router.post('/', async (req, res) => {
  if (!ensureReady(res)) return;
  try {
    const { content, contentBase64, filename = '', mimeType = '', metadata, algorithm = DEFAULT_ALGORITHM } = req.body ?? {};
    if (content === undefined && contentBase64 === undefined) {
      return res.status(400).json({ error: 'content or contentBase64 is required' });
    }
    if (algorithm !== DEFAULT_ALGORITHM && algorithm !== LEGACY_ALGORITHM) {
      return res.status(400).json({ error: `algorithm '${algorithm}' is not supported` });
    }

    const payload = contentBase64 !== undefined ? Buffer.from(String(contentBase64), 'base64') : content;
    const { hash, gTime, inserted } = storage.put(payload, { algorithm });
    const handle = metadata?.handle;
    if (handle) storage.bindHandle(handle, hash);
    sequence += inserted ? 1 : 0;

    const card = storage.get(hash, { filename: filename || metadata?.filename || handle || '', mimeHint: mimeType });
    return res.status(inserted ? 201 : 200).json({ ...cardView(card), inserted, gTime });
  } catch (e) {
    return res.status(500).json({ error: String(e.message ?? e) });
  }
});

router.get('/landing', (req, res) => {
  if (!ensureReady(res)) return;
  const hash = storage.resolveHandle(LANDING_HANDLE);
  if (!hash) return res.status(404).json({ handle: LANDING_HANDLE, bound: false });
  const card = storage.get(hash);
  return res.json({ handle: LANDING_HANDLE, bound: true, ...cardView(card) });
});

router.put('/landing', (req, res) => {
  if (!ensureReady(res)) return;
  const { content, url } = req.body ?? {};

  let body = content;
  if (url !== undefined) {
    const verdict = validateExternalUrl(url);
    if (!verdict.ok) return res.status(400).json({ error: verdict.reason });
    body = content ?? `external-url: ${verdict.url}`;
  }
  if (typeof body !== 'string' || body.trim() === '') {
    return res.status(400).json({ error: 'content or a valid url is required' });
  }

  const { hash, gTime, inserted } = storage.put(body, { algorithm: DEFAULT_ALGORITHM });
  const binding = storage.bindHandle(LANDING_HANDLE, hash);
  return res.status(inserted ? 201 : 200).json({
    handle: LANDING_HANDLE,
    hash,
    gTime,
    inserted,
    previousHash: binding.previousHash,
    history: storage.handleHistory(LANDING_HANDLE),
  });
});

router.get('/probe-url', async (req, res) => {
  const { statusHttp, body } = await executeProbeUrl(req.query.url, req.query.embedderOrigin);
  return res.status(statusHttp).json(body);
});

router.get('/', (req, res) => {
  if (!ensureReady(res)) return;
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
  const pageSize = Math.max(1, parseInt(req.query.pageSize ?? '20', 10) || 20);
  const all = storage.list().slice().reverse();
  const start = (page - 1) * pageSize;
  res.json({
    cards: all.slice(start, start + pageSize).map((c) => cardView(c, { preview: 200 })),
    total: all.length,
    page,
    pageSize,
  });
});

router.get('/stats', (req, res) => {
  if (!ensureReady(res)) return;
  res.json({
    totalCards: storage.count(),
    engine: 'CanonicalTriadBackend (3-table, 3-column Triad SQLite)',
    hashProvider: 'clm-kernel (npm module)',
    defaultAlgorithm: DEFAULT_ALGORITHM,
    package: 'LandingPage',
  });
});

router.get('/search', (req, res) => {
  if (!ensureReady(res)) return;
  const prefix = String(req.query.hashPrefix ?? '').toLowerCase();
  const matches = storage.list().filter((c) => c.hash.startsWith(prefix));
  res.json({ cards: matches.map((c) => cardView(c, { preview: 200 })), count: matches.length });
});

router.get('/:hash/raw', (req, res) => {
  if (!ensureReady(res)) return;
  const card = storage.get(req.params.hash.toLowerCase(), {
    filename: String(req.query.filename ?? ''),
    mimeHint: String(req.query.mimeType ?? ''),
  });
  if (!card) return res.status(404).json({ error: 'Card not found' });
  if (!card.verified) return res.status(422).json({ error: 'Card digest verification failed' });

  res.setHeader('Content-Type', card.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', String(card.rawBytes.byteLength));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'unsafe-inline'"
  );
  return res.status(200).send(card.rawBytes);
});

router.get('/:hash', (req, res) => {
  if (!ensureReady(res)) return;
  const card = storage.get(req.params.hash.toLowerCase(), {
    filename: String(req.query.filename ?? ''),
    mimeHint: String(req.query.mimeType ?? ''),
  });
  if (!card) return res.status(404).json({ error: 'Card not found' });
  return res.json(cardView(card));
});

router.delete('/:hash', (req, res) => {
  if (!ensureReady(res)) return;
  const hex = req.params.hash.toLowerCase();
  if (!storage.has(hex)) return res.status(404).json({ error: 'Card not found' });

  const released = storage.releaseHandles(hex);
  return res.json({
    hash: hex,
    tombstoned: true,
    releasedHandles: released,
    note: 'Card content is retained (G-Set append-only, INV-REF-03); only handle mappings are released.',
  });
});

export default router;
export { storage };
export function getStorage() {
  return storage;
}
