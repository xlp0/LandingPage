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

import dns from 'node:dns';

const router = express.Router();

export const LANDING_HANDLE = 'urn:mcard:content:landing_page';
export const DEFAULT_ALGORITHM = 'blake3';
export const LEGACY_ALGORITHM = 'sha256';
export const PROBE_BUDGET_MS = 600;
export const MAX_PROBE_REDIRECTS = 3;
export const MANIFEST_APPROVED_ORIGINS = Object.freeze([
  'https://example.gov',
  'https://developer.mozilla.org',
  'https://github.com',
  'https://www.wikipedia.org',
]);
const SAFE_URL_SCHEMES = new Set(['http:', 'https:']);

const defaultResolver = async (hostname) => {
  const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return records.map((r) => r.address);
};

let probePolicy = {
  allowedOrigins: [...MANIFEST_APPROVED_ORIGINS],
  allowedFixtureOrigins: [],
  embedderOrigin: '',
  maxRedirects: MAX_PROBE_REDIRECTS,
  resolver: defaultResolver,
};

/** Configure or override the server-side URL probe policy (used by tests and embedder configuration). */
export function configureProbePolicy(overrides = {}) {
  probePolicy = {
    ...probePolicy,
    ...overrides,
    allowedOrigins: overrides.allowedOrigins ? [...overrides.allowedOrigins] : probePolicy.allowedOrigins,
    allowedFixtureOrigins: overrides.allowedFixtureOrigins
      ? [...overrides.allowedFixtureOrigins]
      : probePolicy.allowedFixtureOrigins,
  };
  return probePolicy;
}

/** Reset probe policy to production defaults. */
export function resetProbePolicy() {
  probePolicy = {
    allowedOrigins: [...MANIFEST_APPROVED_ORIGINS],
    allowedFixtureOrigins: [],
    embedderOrigin: '',
    maxRedirects: MAX_PROBE_REDIRECTS,
    resolver: defaultResolver,
  };
  return probePolicy;
}

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
 * Classifies whether a hostname or IP literal falls in loopback, private RFC1918,
 * CGNAT, link-local, cloud metadata, or unspecified address ranges.
 */
export function isProhibitedHostOrIp(rawHost, { allowLoopback = false } = {}) {
  const host = String(rawHost ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return { prohibited: true, reason: 'empty host' };
  if (host === 'localhost' || host.endsWith('.localhost') || host === 'metadata.google.internal') {
    return { prohibited: true, reason: `prohibited hostname '${host}'` };
  }
  const v4Mapped = host.startsWith('::ffff:') ? host.slice(7) : null;
  const candidateIp = v4Mapped || host;
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(candidateIp);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) return { prohibited: true, reason: 'invalid IPv4 address' };
    const [a, b] = octets;
    if (a === 127) {
      return allowLoopback ? { prohibited: false } : { prohibited: true, reason: 'loopback address is prohibited' };
    }
    if (a === 0) return { prohibited: true, reason: 'unspecified address is prohibited' };
    if (a === 10) return { prohibited: true, reason: 'private RFC1918 10.0.0.0/8 address is prohibited' };
    if (a === 172 && b >= 16 && b <= 31) return { prohibited: true, reason: 'private RFC1918 172.16.0.0/12 address is prohibited' };
    if (a === 192 && b === 168) return { prohibited: true, reason: 'private RFC1918 192.168.0.0/16 address is prohibited' };
    if (a === 169 && b === 254) return { prohibited: true, reason: 'link-local / cloud metadata address is prohibited' };
    if (a === 100 && b >= 64 && b <= 127) return { prohibited: true, reason: 'CGNAT 100.64.0.0/10 address is prohibited' };
    if (a >= 224) return { prohibited: true, reason: 'multicast/reserved IPv4 address is prohibited' };
    return { prohibited: false };
  }
  if (host.includes(':')) {
    if (host === '::1' || host === '0:0:0:0:0:0:0:1') {
      return allowLoopback ? { prohibited: false } : { prohibited: true, reason: 'IPv6 loopback is prohibited' };
    }
    if (host === '::' || host === '0:0:0:0:0:0:0:0') return { prohibited: true, reason: 'IPv6 unspecified is prohibited' };
    if (/^fe[89ab][0-9a-f]:/.test(host)) return { prohibited: true, reason: 'IPv6 link-local is prohibited' };
    if (/^f[cd][0-9a-f]{2}:/.test(host)) return { prohibited: true, reason: 'IPv6 unique-local is prohibited' };
  }
  return { prohibited: false };
}

/**
 * Rejects anything that is not an absolute http(s) URL without credentials or
 * prohibited private/loopback/link-local/metadata host literals.
 * Returns `{ ok: true, url, origin, hostname }` or `{ ok: false, reason }`.
 */
export function validateExternalUrl(raw, { allowLoopback = false } = {}) {
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
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'url credentials are not allowed' };
  }
  const hostCheck = isProhibitedHostOrIp(parsed.hostname, { allowLoopback });
  if (hostCheck.prohibited) {
    return { ok: false, reason: hostCheck.reason };
  }
  return { ok: true, url: parsed.toString(), origin: parsed.origin, hostname: parsed.hostname };
}

/**
 * Evaluates X-Frame-Options and CSP frame-ancestors headers against the configured
 * embedding origin (DoD-ULR-05-07).
 */
export function evaluateFramingPolicy({ xFrameOptions = '', csp = '', targetOrigin = '', embedderOrigin = '' } = {}) {
  const xfo = String(xFrameOptions ?? '').trim().toLowerCase();
  const cspText = String(csp ?? '').trim();
  const match = /(?:^|;)\s*frame-ancestors\s+([^;]+)/i.exec(cspText);
  const directive = match ? match[1].trim() : null;
  const hasFrameAncestors = Boolean(directive);
  const normTarget = String(targetOrigin ?? '').trim().toLowerCase();
  const normEmbedder = String(embedderOrigin ?? '').trim().toLowerCase();

  let blocked = false;
  if (hasFrameAncestors) {
    const tokens = directive.split(/\s+/).map((t) => t.toLowerCase()).filter(Boolean);
    if (tokens.includes("'none'")) {
      blocked = true;
    } else if (!normEmbedder) {
      blocked = !tokens.includes('*');
    } else {
      let embedderProtocol = '';
      try {
        embedderProtocol = new URL(normEmbedder).protocol.toLowerCase();
      } catch {
        embedderProtocol = '';
      }
      const allowed = tokens.some((token) => {
        if (token === '*') return true;
        if (token === "'self'") return Boolean(normTarget) && normEmbedder === normTarget;
        if (embedderProtocol && token === embedderProtocol) return true;
        return token === normEmbedder;
      });
      blocked = !allowed;
    }
  } else if (xfo.includes('deny')) {
    blocked = true;
  } else if (xfo.includes('sameorigin')) {
    blocked = !normEmbedder || !normTarget || normEmbedder !== normTarget;
  }

  return {
    blocked,
    frameable: !blocked,
    verdict: blocked ? 'blocked' : 'frameable',
    evidence: {
      xFrameOptions: xfo || null,
      frameAncestors: hasFrameAncestors,
      frameAncestorsDirective: directive,
      embedderOrigin: normEmbedder || null,
    },
  };
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
 * Validates a probe hop against URL syntax, credential prohibition, origin allowlist,
 * and resolved-address public-IP checks (DoD-ULR-05-04).
 */
export async function validateProbeHop(rawUrl, policy = probePolicy) {
  let parsedOrigin = '';
  try {
    parsedOrigin = new URL(String(rawUrl ?? '').trim()).origin;
  } catch {
    /* handled by validateExternalUrl */
  }
  const isFixtureOrigin = Boolean(parsedOrigin) && policy.allowedFixtureOrigins.includes(parsedOrigin);
  const urlCheck = validateExternalUrl(rawUrl, { allowLoopback: isFixtureOrigin });
  if (!urlCheck.ok) return urlCheck;

  if (!isFixtureOrigin && !policy.allowedOrigins.includes(urlCheck.origin)) {
    return { ok: false, reason: `origin '${urlCheck.origin}' is not in the manifest-approved allowlist` };
  }

  if (!isFixtureOrigin) {
    let resolved;
    try {
      resolved = await policy.resolver(urlCheck.hostname);
    } catch {
      return { ok: false, reason: `DNS resolution failed for '${urlCheck.hostname}'` };
    }
    if (!Array.isArray(resolved) || resolved.length === 0) {
      return { ok: false, reason: `no DNS records resolved for '${urlCheck.hostname}'` };
    }
    for (const addr of resolved) {
      const addrCheck = isProhibitedHostOrIp(addr, { allowLoopback: false });
      if (addrCheck.prohibited) {
        return { ok: false, reason: `resolved address '${addr}' is prohibited: ${addrCheck.reason}` };
      }
    }
  }

  return { ok: true, url: urlCheck.url, origin: urlCheck.origin, hostname: urlCheck.hostname, isFixtureOrigin };
}

/**
 * GET /probe-url?url= — framing verdict for an external page.
 * `frameable` | `blocked` | `unreachable`, decided inside the configured budget.
 * Tests point this at local fixtures; no live third-party request is required.
 */
router.get('/probe-url', async (req, res) => {
  const initial = await validateProbeHop(req.query.url, probePolicy);
  if (!initial.ok) {
    return res.status(400).json({ error: initial.reason, frameable: false, verdict: 'unreachable' });
  }

  const embedderOrigin = String(req.query.embedderOrigin ?? probePolicy.embedderOrigin ?? '').trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_BUDGET_MS);
  try {
    let currentUrl = initial.url;
    let currentOrigin = initial.origin;

    for (let hop = 0; hop <= probePolicy.maxRedirects; hop += 1) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'MCard-LandingPage-Probe/1.0' },
      });
      await response.body?.cancel?.().catch(() => {});

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return res.status(400).json({ error: 'redirect missing location header', frameable: false, verdict: 'unreachable' });
        }
        if (hop === probePolicy.maxRedirects) {
          return res.status(400).json({ error: 'redirect limit exceeded', frameable: false, verdict: 'unreachable' });
        }
        let nextUrl;
        try {
          nextUrl = new URL(location, currentUrl).toString();
        } catch {
          return res.status(400).json({ error: 'redirect location is malformed', frameable: false, verdict: 'unreachable' });
        }
        const nextHop = await validateProbeHop(nextUrl, probePolicy);
        if (!nextHop.ok) {
          return res.status(400).json({
            error: `redirect rejected: ${nextHop.reason}`,
            blockedRedirect: nextUrl,
            frameable: false,
            verdict: 'unreachable',
          });
        }
        currentUrl = nextHop.url;
        currentOrigin = nextHop.origin;
        continue;
      }

      const framing = evaluateFramingPolicy({
        xFrameOptions: response.headers.get('x-frame-options') || '',
        csp: response.headers.get('content-security-policy') || '',
        targetOrigin: currentOrigin,
        embedderOrigin,
      });
      return res.json({
        url: currentUrl,
        status: response.status,
        frameable: framing.frameable,
        verdict: framing.verdict,
        evidence: framing.evidence,
        budgetMs: PROBE_BUDGET_MS,
      });
    }
    return res.status(400).json({ error: 'redirect limit exceeded', frameable: false, verdict: 'unreachable' });
  } catch (e) {
    return res.json({
      url: initial.url,
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
