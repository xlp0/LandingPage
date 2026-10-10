/**
 * MCard REST API — Independent, neutral SQLite dataset engine (INV-PKG-10, INV-PKG-11).
 *
 * Implements the format-level MCard G-Set SQLite specification without any direct
 * dependency on clm-kernel or mcard-studio. Supports monotonic append-only storage,
 * content-addressing (SHA-256 CAS), handle mappings, and format-level queries.
 */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const router = express.Router();

let storage = null;
let ready = false;
let dbPath = null;
let sequence = 0;

/** Computes standard SHA-256 hexadecimal hash */
function computeHash(content) {
  const buf = typeof content === 'string'
    ? Buffer.from(content, 'utf8')
    : Buffer.from(JSON.stringify(content ?? ''));
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Content-type detection with structural sniff fallback */
function detectContentType(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000E-\u001F]/.test(text)) return 'application/octet-stream';
  const t = text.trimStart();
  if (/^<(!doctype|html|head|body)\b/i.test(t)) return 'text/html';
  if (/^<\?xml\b/i.test(t)) return 'application/xml';
  if (/^[\[{]/.test(t)) {
    try { JSON.parse(t); return 'application/json'; } catch { /* not JSON */ }
  }
  if (/^#{1,6}\s+\S/m.test(t)) return 'text/markdown';
  return 'text/plain';
}

/** Format-level Neutral SQLite Backend adhering to INV-PKG-11 */
export class NeutralSqliteBackend {
  constructor(filename) {
    this.filename = filename;
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS blobs (
        payload_hash TEXT PRIMARY KEY NOT NULL,
        size_bytes INTEGER NOT NULL,
        data BLOB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS mcards (
        hash TEXT PRIMARY KEY NOT NULL,
        schema_version TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        author_did TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        metadata_json TEXT,
        sequence INTEGER NOT NULL DEFAULT 0,
        uri TEXT
      );

      CREATE TABLE IF NOT EXISTS handle_registry (
        handle TEXT PRIMARY KEY NOT NULL,
        current_hash TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS relations (
        source_hash TEXT NOT NULL,
        predicate TEXT NOT NULL,
        target_hash TEXT NOT NULL,
        PRIMARY KEY (source_hash, predicate, target_hash)
      );

      CREATE INDEX IF NOT EXISTS idx_mcards_created ON mcards (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_mcards_payload ON mcards (payload_hash);
    `);
  }

  put(hash, card) {
    const existing = this.db.prepare('SELECT hash FROM mcards WHERE hash = ?').get(hash);
    if (existing) return false;

    const text = typeof card.content === 'string'
      ? card.content
      : (typeof card.payload?.value === 'string' ? card.payload.value : JSON.stringify(card.payload ?? card.content ?? ''));
    const buf = Buffer.from(text, 'utf8');
    const payloadHash = computeHash(buf);

    // Ensure blob exists
    const blobExists = this.db.prepare('SELECT payload_hash FROM blobs WHERE payload_hash = ?').get(payloadHash);
    if (!blobExists) {
      this.db.prepare(
        'INSERT INTO blobs (payload_hash, size_bytes, data) VALUES (?, ?, ?)'
      ).run(payloadHash, buf.length, buf);
    }

    // Insert card
    const metaJson = card.metadata
      ? (typeof card.metadata === 'string' ? card.metadata : JSON.stringify(Object.fromEntries(card.metadata.entries ? card.metadata.entries() : Object.entries(card.metadata))))
      : '{}';

    this.db.prepare(`
      INSERT INTO mcards (
        hash, schema_version, created_at, mime_type, author_did, payload_hash, metadata_json, sequence, uri
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      hash,
      card.schemaVersion || '1.0.0',
      card.createdAt || Date.now(),
      card.mimeType || detectContentType(text),
      card.authorDid || 'did:clm:landing-page-api',
      payloadHash,
      metaJson,
      card.sequence || 0,
      card.uri || `mcard:${Date.now()}-${card.sequence || 0}`
    );

    return true;
  }

  registerHandle(handle, hash) {
    this.db.prepare(`
      INSERT INTO handle_registry (handle, current_hash, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(handle) DO UPDATE SET
        current_hash = excluded.current_hash,
        updated_at = excluded.updated_at
    `).run(handle, hash, Date.now());
  }

  releaseHandles(hash) {
    const rows = this.db.prepare('SELECT handle FROM handle_registry WHERE current_hash = ?').all(hash);
    const handles = rows.map((r) => r.handle);
    if (handles.length > 0) {
      this.db.prepare('DELETE FROM handle_registry WHERE current_hash = ?').run(hash);
    }
    return handles;
  }

  get(hash) {
    const row = this.db.prepare(`
      SELECT m.*, b.data, b.size_bytes
      FROM mcards m
      JOIN blobs b ON m.payload_hash = b.payload_hash
      WHERE m.hash = ?
    `).get(hash);
    if (!row) return null;

    let content = '';
    try {
      content = Buffer.isBuffer(row.data) ? row.data.toString('utf8') : new TextDecoder().decode(row.data);
    } catch {
      content = String(row.data);
    }

    return {
      hash: row.hash,
      uri: row.uri,
      sequence: row.sequence,
      schemaVersion: row.schema_version,
      createdAt: row.created_at,
      mimeType: row.mime_type,
      authorDid: row.author_did,
      metadata: JSON.parse(row.metadata_json || '{}'),
      content,
      payload: { value: content },
    };
  }

  has(hash) {
    const row = this.db.prepare('SELECT 1 FROM mcards WHERE hash = ?').get(hash);
    return Boolean(row);
  }

  count() {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM mcards').get();
    return Number(row?.count || 0);
  }

  list() {
    const rows = this.db.prepare(`
      SELECT m.*, b.data, b.size_bytes
      FROM mcards m
      JOIN blobs b ON m.payload_hash = b.payload_hash
      ORDER BY m.created_at ASC
    `).all();

    return rows.map((row) => {
      let content = '';
      try {
        content = Buffer.isBuffer(row.data) ? row.data.toString('utf8') : new TextDecoder().decode(row.data);
      } catch {
        content = String(row.data);
      }

      return {
        hash: row.hash,
        uri: row.uri,
        sequence: row.sequence,
        schemaVersion: row.schema_version,
        createdAt: row.created_at,
        mimeType: row.mime_type,
        authorDid: row.author_did,
        metadata: JSON.parse(row.metadata_json || '{}'),
        content,
        payload: { value: content },
      };
    });
  }

  close() {
    try { this.db.close(); } catch {}
  }
}

function cardView(card, { preview = null } = {}) {
  const text = typeof card.content === 'string'
    ? card.content
    : (typeof card.payload?.value === 'string' ? card.payload.value : JSON.stringify(card.payload ?? card.content ?? ''));
  const hashStr = typeof card.hash === 'string' ? card.hash : (card.hash?.asHex ? card.hash.asHex() : String(card.hash));
  return {
    hash: hashStr,
    uri: card.uri || `mcard:${card.createdAt || Date.now()}-${card.sequence || 0}`,
    size: Buffer.byteLength(text, 'utf8'),
    contentType: card.mimeType || detectContentType(text),
    content: preview ? text.slice(0, preview) : text,
    sequence: card.sequence || 0,
  };
}

/** Initializes the neutral SQLite-backed dataset store. */
export async function initMCardAPI(dbFile = path.join(process.cwd(), 'data', 'mcard-api.db')) {
  storage = new NeutralSqliteBackend(dbFile);
  ready = true;
  dbPath = dbFile;
  console.log(`[MCard API] ✅ NeutralSqliteBackend ready at ${dbFile}`);
  return storage;
}

/** Lazily initializes the store on first use. */
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

/** POST / — create and store a card. */
router.post('/', async (req, res) => {
  if (!ensureReady(res)) return;
  try {
    const { content, metadata } = req.body ?? {};
    if (content === undefined) return res.status(400).json({ error: 'content is required' });

    const hash = computeHash(content);
    const cardData = {
      hash,
      uri: `mcard:${Date.now()}-${sequence}`,
      content,
      authorDid: 'did:clm:landing-page-api',
      sequence: sequence++,
      metadata: metadata || {},
      schemaVersion: '1.0.0',
      createdAt: Date.now(),
      mimeType: detectContentType(content),
    };

    const inserted = storage.put(hash, cardData);
    const handle = metadata?.handle;
    if (handle) storage.registerHandle(handle, hash);

    return res.status(inserted ? 201 : 200).json({ ...cardView(cardData), inserted });
  } catch (e) {
    return res.status(500).json({ error: String(e.message ?? e) });
  }
});

/** GET / — paged listing, newest first. */
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

/** GET /stats — store statistics. */
router.get('/stats', (req, res) => {
  if (!ensureReady(res)) return;
  res.json({
    totalCards: storage.count(),
    engine: 'NeutralSqliteBackend (MCard G-Set SQLite CAS)',
    package: 'LandingPage',
    contract: 'INV-PKG-11',
  });
});

/** GET /search?hashPrefix= — find cards by hash prefix. */
router.get('/search', (req, res) => {
  if (!ensureReady(res)) return;
  const prefix = String(req.query.hashPrefix ?? '');
  const matches = storage.list().filter((c) => c.hash.startsWith(prefix));
  res.json({ cards: matches.map((c) => cardView(c, { preview: 200 })), count: matches.length });
});

/** GET /:hash — single card. */
router.get('/:hash', (req, res) => {
  if (!ensureReady(res)) return;
  const card = storage.get(req.params.hash);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  return res.json(cardView(card));
});

/**
 * DELETE /:hash — releases handle mappings for a card.
 *
 * The card row itself is retained: the schema is a G-Set and its `card` table is
 * append-only (INV-REF-03). Returns the handles that were released.
 */
router.delete('/:hash', (req, res) => {
  if (!ensureReady(res)) return;
  const hex = req.params.hash;
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
