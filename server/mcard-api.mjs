/**
 * MCard REST API — canonical Triad SQLite dataset engine for LandingPage.
 *
 * One record law (EPIC-CAS L6, INV-510):
 *   card.hash = hex(H(content)), where the algorithm H is named by coordinate *a*
 *   of `g_time` and `g_time = ALGORITHM|TIMESTAMP|LOCALE[|key=value...]`.
 *
 * The hash capability is provisioned by the published `clm-kernel` npm module —
 * LandingPage carries no cryptographic implementation of its own. The store is the
 * canonical 3-table, 3-column Triad schema (`card`, `handle_registry`,
 * `handle_history`); the legacy 4-table layout (`mcards`, `blobs`, `relations`) is
 * migrated in place, preserving each row's original digest and declaring `sha256`
 * in its `g_time`. Re-minting a record creates a new card plus a `handle_history`
 * transition — never an in-place rewrite.
 */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { computeHash } from 'clm-kernel';

const router = express.Router();

export const LANDING_HANDLE = 'urn:mcard:content:landing_page';
export const DEFAULT_ALGORITHM = 'blake3';
export const LEGACY_ALGORITHM = 'sha256';
export const PROBE_BUDGET_MS = 600;
const SAFE_URL_SCHEMES = new Set(['http:', 'https:']);

let storage = null;
let ready = false;
let dbPath = null;
let sequence = 0;

/** ISO-8601 timestamp for coordinate *b* of `g_time`. */
function nowIso() {
  return new Date().toISOString();
}

/** Locale for coordinate *c* of `g_time`. */
function currentLocale() {
  return process.env.CLM_LOCALE || Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
}

/** `ALGORITHM|TIMESTAMP|LOCALE` — the normative pipe form. */
export function formatGTime(algorithm = DEFAULT_ALGORITHM, timestamp = nowIso(), locale = currentLocale()) {
  return `${algorithm}|${timestamp}|${locale}`;
}

/** Coordinate *a* of a `g_time` value; defaults to blake3 for a malformed value. */
export function algorithmOf(gTime) {
  const algorithm = String(gTime ?? '').split('|')[0].trim().toLowerCase();
  return algorithm || DEFAULT_ALGORITHM;
}

/** Deterministic bytes for a card body. */
function bytesOf(content) {
  if (Buffer.isBuffer(content)) return content;
  return Buffer.from(typeof content === 'string' ? content : JSON.stringify(content ?? ''), 'utf8');
}

/** `hex(H(content))` through the kernel's parameterised hash. */
export function hashContent(content, algorithm = DEFAULT_ALGORITHM) {
  return computeHash(algorithm, new Uint8Array(bytesOf(content)));
}

/** Recompute a stored record's digest under the algorithm its `g_time` declares. */
export function verifyRecord(hash, content, gTime) {
  return hashContent(content, algorithmOf(gTime)) === String(hash).toLowerCase();
}

/** Content-type detection with structural sniff fallback. */
export function detectContentType(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000E-\u001F]/.test(text)) return 'application/octet-stream';
  const t = text.trimStart();
  if (/^<(!doctype|html|head|body)\b/i.test(t)) return 'text/html';
  if (/^<\?xml\b/i.test(t)) return 'application/xml';
  if (/^[\[{]/.test(t)) {
    try {
      JSON.parse(t);
      return 'application/json';
    } catch {
      /* not JSON */
    }
  }
  if (/^#{1,6}\s+\S/m.test(t)) return 'text/markdown';
  return 'text/plain';
}

/**
 * Rejects anything that is not an absolute http(s) URL.
 * Returns `{ ok: true, url }` or `{ ok: false, reason }`.
 */
export function validateExternalUrl(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, reason: 'url must be a non-empty string' };
  }
  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'url is malformed' };
  }
  if (!SAFE_URL_SCHEMES.has(parsed.protocol)) {
    return { ok: false, reason: `url scheme '${parsed.protocol}' is not allowed` };
  }
  return { ok: true, url: parsed.toString() };
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

/** Canonical 3-table, 3-column Triad store (INV-510, `schema/mcard_schema.sql`). */
export class CanonicalTriadBackend {
  constructor(filename) {
    this.filename = filename;
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new DatabaseSync(filename);
    this.db.exec(TRIAD_DDL);
    this.migrated = this.migrateLegacyTables();
  }

  /** Tables present before this backend opened the file. */
  tables() {
    return this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row) => row.name);
  }

  /**
   * Migrate the legacy 4-table layout into the Triad, preserving every digest.
   * A migrated row keeps the digest it was written with and declares `sha256` in
   * its `g_time`; nothing is re-hashed in place.
   */
  migrateLegacyTables() {
    const tables = this.tables();
    if (!tables.includes('mcards')) return { cards: 0, handles: 0 };

    const cards = this.db
      .prepare('SELECT hash, created_at, payload_hash FROM mcards')
      .all();
    const blobs = new Map(
      this.db
        .prepare('SELECT payload_hash, data FROM blobs')
        .all()
        .map((row) => [row.payload_hash, row.data])
    );

    let migratedCards = 0;
    const insertCard = this.db.prepare(
      'INSERT OR IGNORE INTO card (hash, content, g_time) VALUES (?, ?, ?)'
    );
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

  /** Append-only insert. Returns false when the hash already exists. */
  put(content, { algorithm = DEFAULT_ALGORITHM, gTime = null } = {}) {
    const hash = hashContent(content, algorithm);
    const exists = this.db.prepare('SELECT 1 FROM card WHERE hash = ?').get(hash);
    if (exists) return { hash, gTime: this.gTimeOf(hash), inserted: false };

    const stamp = gTime || formatGTime(algorithm);
    this.db
      .prepare('INSERT INTO card (hash, content, g_time) VALUES (?, ?, ?)')
      .run(hash, bytesOf(content), stamp);
    return { hash, gTime: stamp, inserted: true };
  }

  gTimeOf(hash) {
    const row = this.db.prepare('SELECT g_time FROM card WHERE hash = ?').get(hash);
    return row ? row.g_time : null;
  }

  get(hash) {
    const row = this.db.prepare('SELECT hash, content, g_time FROM card WHERE hash = ?').get(hash);
    if (!row) return null;
    const content = Buffer.isBuffer(row.content)
      ? row.content.toString('utf8')
      : new TextDecoder().decode(row.content);
    return {
      hash: row.hash,
      content,
      gTime: row.g_time,
      algorithm: algorithmOf(row.g_time),
      verified: verifyRecord(row.hash, content, row.g_time),
      mimeType: detectContentType(content),
      size: Buffer.byteLength(content, 'utf8'),
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

  /** Current binding of a handle, or null. */
  resolveHandle(handle) {
    const row = this.db
      .prepare('SELECT current_hash FROM handle_registry WHERE handle = ?')
      .get(handle);
    return row ? row.current_hash : null;
  }

  /**
   * Bind a handle to a hash. Re-binding records the prior hash in `handle_history`
   * so the revision chain is auditable and nothing is silently overwritten.
   */
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

  /** Revision chain for a handle, oldest first. */
  handleHistory(handle) {
    return this.db
      .prepare(
        'SELECT previous_hash, changed_at FROM handle_history WHERE handle = ? ORDER BY changed_at ASC'
      )
      .all(handle)
      .map((row) => ({ previousHash: row.previous_hash, changedAt: row.changed_at }));
  }

  /** Release every handle bound to a hash. Cards are never deleted (G-Set, INV-REF-03). */
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
      /* already closed */
    }
  }
}

function cardView(card, { preview = null } = {}) {
  const content = card.content ?? '';
  return {
    hash: card.hash,
    uri: `urn:mcard:card:${card.hash}`,
    size: card.size ?? Buffer.byteLength(content, 'utf8'),
    contentType: card.mimeType || detectContentType(content),
    content: preview ? content.slice(0, preview) : content,
    gTime: card.gTime,
    algorithm: card.algorithm,
    verified: card.verified,
  };
}

/** Initializes the canonical Triad store. */
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

/** POST / — store a card body; content-only hash under the declared algorithm. */
router.post('/', async (req, res) => {
  if (!ensureReady(res)) return;
  try {
    const { content, metadata, algorithm = DEFAULT_ALGORITHM } = req.body ?? {};
    if (content === undefined) return res.status(400).json({ error: 'content is required' });
    if (algorithm !== DEFAULT_ALGORITHM && algorithm !== LEGACY_ALGORITHM) {
      return res.status(400).json({ error: `algorithm '${algorithm}' is not supported` });
    }

    const { hash, gTime, inserted } = storage.put(content, { algorithm });
    const handle = metadata?.handle;
    if (handle) storage.bindHandle(handle, hash);
    sequence += inserted ? 1 : 0;

    const card = storage.get(hash);
    return res.status(inserted ? 201 : 200).json({ ...cardView(card), inserted, gTime });
  } catch (e) {
    return res.status(500).json({ error: String(e.message ?? e) });
  }
});

/** GET /landing — the single active page record. Declared before /:hash. */
router.get('/landing', (req, res) => {
  if (!ensureReady(res)) return;
  const hash = storage.resolveHandle(LANDING_HANDLE);
  if (!hash) return res.status(404).json({ handle: LANDING_HANDLE, bound: false });
  const card = storage.get(hash);
  return res.json({ handle: LANDING_HANDLE, bound: true, ...cardView(card) });
});

/**
 * PUT /landing — set the single active page (inline body or external URL).
 * Unsafe schemes (`javascript:`, `data:`) and malformed payloads are rejected with
 * HTTP 400 and mutate nothing.
 */
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

/**
 * GET /probe-url?url= — framing verdict for an external page.
 * `frameable` | `blocked` | `unreachable`, decided inside the configured budget.
 * Tests point this at local fixtures; no live third-party request is required.
 */
router.get('/probe-url', async (req, res) => {
  const verdict = validateExternalUrl(req.query.url);
  if (!verdict.ok) return res.status(400).json({ error: verdict.reason });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_BUDGET_MS);
  try {
    const response = await fetch(verdict.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'MCard-LandingPage-Probe/1.0' },
    });
    const xfo = (response.headers.get('x-frame-options') || '').toLowerCase();
    const csp = (response.headers.get('content-security-policy') || '').toLowerCase();
    const frameAncestors = /frame-ancestors/.test(csp);
    const blocked = xfo.includes('deny') || xfo.includes('sameorigin') || frameAncestors;
    return res.json({
      url: verdict.url,
      status: response.status,
      frameable: !blocked,
      verdict: blocked ? 'blocked' : 'frameable',
      evidence: { xFrameOptions: xfo || null, frameAncestors },
      budgetMs: PROBE_BUDGET_MS,
    });
  } catch (e) {
    return res.json({
      url: verdict.url,
      frameable: false,
      verdict: 'unreachable',
      evidence: { reason: e.name === 'AbortError' ? 'budget exceeded' : String(e.message ?? e) },
      budgetMs: PROBE_BUDGET_MS,
    });
  } finally {
    clearTimeout(timer);
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
    engine: 'CanonicalTriadBackend (3-table, 3-column Triad SQLite)',
    hashProvider: 'clm-kernel (npm module)',
    defaultAlgorithm: DEFAULT_ALGORITHM,
    package: 'LandingPage',
  });
});

/** GET /search?hashPrefix= — find cards by hash prefix. */
router.get('/search', (req, res) => {
  if (!ensureReady(res)) return;
  const prefix = String(req.query.hashPrefix ?? '').toLowerCase();
  const matches = storage.list().filter((c) => c.hash.startsWith(prefix));
  res.json({ cards: matches.map((c) => cardView(c, { preview: 200 })), count: matches.length });
});

/** GET /:hash — single card, with its digest re-verified under its declared algorithm. */
router.get('/:hash', (req, res) => {
  if (!ensureReady(res)) return;
  const card = storage.get(req.params.hash.toLowerCase());
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
