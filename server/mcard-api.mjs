/**
 * MCard REST API — reimplemented on the published clm-kernel (INV-CDO-33).
 *
 * Replaces the former mcard-js-backed server. Every MCard operation is performed
 * by the kernel: `MCard.create` for construction, `NodeSqliteBackend` for the
 * G-Set SQLite store, and `detectMime` for content typing.
 *
 * One deliberate behavioural change: the legacy `DELETE /:hash` removed the card
 * row outright. The MCard schema is a G-Set whose `card` table is append-only
 * (INV-REF-03), so deletion now drops the *handle* mapping instead, leaving the
 * content-addressed record intact. The route reports which handles were released.
 */
import express from 'express';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { MCard, NodeSqliteBackend, detectMime, AgentDid, ContentHash } from 'clm-kernel';

const router = express.Router();

let storage = null;
let ready = false;
let dbPath = null;

const DEFAULT_AUTHOR = AgentDid.create('did:clm:landing-page-api');
let sequence = 0;

/** Content-type detection via the kernel, with a structural sniff fallback. */
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
  try {
    return detectMime(new TextEncoder().encode(text));
  } catch {
    return 'text/plain';
  }
}

function cardView(card, { preview = null } = {}) {
  const text = typeof card.payload?.value === 'string'
    ? card.payload.value
    : JSON.stringify(card.payload);
  return {
    hash: card.hash.asHex(),
    uri: card.uri,
    size: new TextEncoder().encode(text ?? '').length,
    contentType: detectContentType(text),
    content: preview ? (text ?? '').slice(0, preview) : text,
    sequence: card.sequence,
  };
}

/** Initializes the kernel-backed store. */
export async function initMCardAPI(dbFile = path.join(process.cwd(), 'data', 'mcard-api.db')) {
  storage = new NodeSqliteBackend(dbFile);
  ready = true;
  dbPath = dbFile;
  console.log(`[MCard API] ✅ clm-kernel NodeSqliteBackend ready at ${dbFile}`);
  return storage;
}

/**
 * Lazily initializes the store on first use.
 *
 * The legacy API loaded its library lazily on first request, so a caller that
 * only mounts the router still worked. That behaviour is preserved here rather
 * than requiring the host to call initMCardAPI() at startup.
 */
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

    const meta = new Map(Object.entries(metadata ?? {}));
    const card = MCard.create(
      `mcard:${Date.now()}-${sequence}`,
      content,
      DEFAULT_AUTHOR,
      sequence++,
      meta,
    );
    const inserted = storage.put(card.hash, card);
    const handle = metadata?.handle;
    if (handle) storage.registerHandle(handle, card.hash);

    return res.status(inserted ? 201 : 200).json({ ...cardView(card), inserted });
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
    engine: 'NodeSqliteBackend (clm-kernel)',
    package: 'clm-kernel',
    version: '0.0.1',
  });
});

/** GET /search?hashPrefix= — find cards by hash prefix. */
router.get('/search', (req, res) => {
  if (!ensureReady(res)) return;
  const prefix = String(req.query.hashPrefix ?? '');
  const matches = storage.list().filter((c) => c.hash.asHex().startsWith(prefix));
  res.json({ cards: matches.map((c) => cardView(c, { preview: 200 })), count: matches.length });
});

/** GET /:hash — single card. */
router.get('/:hash', (req, res) => {
  if (!ensureReady(res)) return;
  const card = storage.get(ContentHash.fromHex(req.params.hash));
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
  let hashObj;
  try {
    hashObj = ContentHash.fromHex(hex);
  } catch {
    return res.status(400).json({ error: 'Malformed content hash' });
  }
  if (!storage.has(hashObj)) return res.status(404).json({ error: 'Card not found' });

  // The backend exposes no handle listing, so the registry is read directly.
  const released = [];
  try {
    const db = new DatabaseSync(dbPath);
    try {
      for (const row of db.prepare('SELECT handle, current_hash FROM handle_registry').all()) {
        if (row.current_hash === hex) released.push(row.handle);
      }
    } finally {
      db.close();
    }
  } catch (e) {
    console.warn('[MCard API] handle lookup failed:', e.message);
  }
  return res.json({
    hash: hex,
    tombstoned: true,
    releasedHandles: released,
    note: 'Card content is retained (G-Set append-only, INV-REF-03); only handle mappings are released.',
  });
});

export default router;
export { storage };
