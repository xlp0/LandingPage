/**
 * Compatibility layer over the published clm-kernel (INV-CDO-33).
 *
 * The UI code was written against the removed `mcard-js` API. Rather than
 * rewriting ~7,000 lines of view logic, this module presents that same API
 * shape while every actual operation is performed by clm-kernel. Nothing here
 * reimplements MCard semantics — it adapts names and signatures.
 *
 *   legacy mcard-js            →  published clm-kernel
 *   MCard.create(content, o)   →  MCard.create(uri, payload, author, seq, meta)
 *   card.getContentAsText()    →  card.content
 *   card.getContent()          →  card.payload
 *   card.getSize()             →  byte length of the serialized payload
 *   MCard.fromObject(o)        →  MCard.fromJSON(o)
 *   CardCollection             →  MCardCollection
 *   ContentTypeInterpreter     →  detectMime / classifyClm
 *   validateHandle             →  local handle rule check (no kernel equivalent)
 *   IndexedDBEngine            →  local IndexedDBBackend (no kernel equivalent)
 */
import {
  MCard as KernelMCard,
  MCardCollection,
  ContentHash,
  detectMime,
  classifyClm,
  AgentDid,
} from 'clm-kernel';
import { IndexedDBBackend } from './indexeddb-backend.js';

const DEFAULT_AUTHOR = AgentDid.create('did:clm:landing-page');
let sequenceCounter = 0;

/**
 * Wraps a kernel MCard with the legacy accessors the view layer calls.
 *
 * A wrapper rather than a decoration: kernel MCards are frozen (non-extensible),
 * so properties cannot be added to the instance.
 */
export class LegacyCard {
  constructor(card) {
    this._card = card;
    this.uri = card.uri;
    this.hash = card.hash;
    this.payload = card.payload;
    this.metadata = card.metadata;
    this.author = card.author;
    this.sequence = card.sequence;
  }

  _value() {
    const p = this._card.payload;
    return p && typeof p === 'object' && 'value' in p ? p.value : p;
  }

  getContentAsText() {
    const v = this._value();
    return typeof v === 'string' ? v : JSON.stringify(v);
  }

  getContent() {
    return this._card.payload;
  }

  getSize() {
    const v = this._value();
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return new TextEncoder().encode(s ?? '').length;
  }

  getMetadata(key) {
    return this._card.getMetadata(key);
  }

  toJSON() {
    return this._card.toJSON();
  }

  /** The underlying kernel MCard, for code that needs the real thing. */
  get kernel() {
    return this._card;
  }
}

/** Wraps a kernel MCard in the legacy facade (idempotent). */
export function decorate(card) {
  if (!card) return card;
  return card instanceof LegacyCard ? card : new LegacyCard(card);
}

/** Legacy-shaped MCard facade over the kernel's MCard. */
export const MCard = {
  create(content, options = {}) {
    const uri = options.uri ?? options.handle ?? `mcard:${Date.now()}-${sequenceCounter++}`;
    const metadata = new Map(Object.entries(options.metadata ?? {}));
    return decorate(KernelMCard.create(
      uri, content, options.author ?? DEFAULT_AUTHOR, sequenceCounter++, metadata,
    ));
  },

  fromObject(obj) {
    return decorate(KernelMCard.fromJSON(obj));
  },

  fromJSON: (json) => decorate(KernelMCard.fromJSON(json)),
  fromStorage: (...args) => decorate(KernelMCard.fromStorage(...args)),
  withMetadata: (...args) => decorate(KernelMCard.withMetadata(...args)),

  /** The unwrapped kernel class, for code that needs the real thing. */
  kernel: KernelMCard,
};

/**
 * CardCollection adapter over MCardCollection.
 *
 * The view layer calls `add`, `addWithHandle`, `getByHandle`, `updateHandle`,
 * `getHandleHistory`, `getAllMCardsRaw` and reads `.count` as a property; the
 * kernel exposes `put`, `putWithHandle`, `resolve`, `history`, `list` and
 * `count()` as a method.
 */
export class CardCollection {
  constructor(backendOrEngine) {
    this.engine = backendOrEngine;
    this._collection = new MCardCollection(backendOrEngine);
  }

  add(card) {
    const hash = this._collection.put(decorate(card));
    return hash.asHex ? hash.asHex() : hash;
  }

  addWithHandle(card, handle) {
    const hash = this._collection.putWithHandle(decorate(card), handle);
    return hash.asHex ? hash.asHex() : hash;
  }

  get(hash) {
    const h = typeof hash === 'string' ? ContentHash.fromHex(hash) : hash;
    return decorate(this._collection.get(h));
  }

  getByHandle(handle) {
    const hash = this._collection.resolve(handle);
    return hash ? this.get(hash) : undefined;
  }

  /** Accepts either a hash or a card, matching the legacy call shapes. */
  updateHandle(handle, hashOrCard) {
    let hex = hashOrCard;
    if (hashOrCard && typeof hashOrCard === 'object' && hashOrCard.hash) {
      hex = hashOrCard.hash.asHex ? hashOrCard.hash.asHex() : hashOrCard.hash;
    }
    const h = typeof hex === 'string' ? ContentHash.fromHex(hex) : hex;
    return this._collection.storageBackend.registerHandle(handle, h);
  }

  resolveHandle(handle) {
    const hash = this._collection.resolveHandle(handle);
    return hash ? (hash.asHex ? hash.asHex() : hash) : undefined;
  }

  getHandleHistory(handle) {
    return this._collection.history(handle).map((h) => (h.asHex ? h.asHex() : h));
  }

  getAllMCardsRaw() {
    return this._collection.list().map(decorate);
  }

  get count() {
    return this._collection.count();
  }

  list() {
    return this._collection.list().map(decorate);
  }

  get backend() {
    return this._collection.storageBackend;
  }
}

/** Handle rules enforced locally — the kernel exposes no handle validator. */
export class HandleValidationError extends Error {
  constructor(message, handle) {
    super(message);
    this.name = 'HandleValidationError';
    this.handle = handle;
  }
}

const HANDLE_RE = /^[A-Za-z0-9][A-Za-z0-9._:\/-]{0,254}$/;

export function validateHandle(handle) {
  if (typeof handle !== 'string' || handle.length === 0) {
    throw new HandleValidationError('Handle must be a non-empty string', handle);
  }
  if (handle.length > 255) {
    throw new HandleValidationError('Handle must be 255 characters or fewer', handle);
  }
  if (!HANDLE_RE.test(handle)) {
    throw new HandleValidationError(
      'Handle may contain letters, digits, and . _ : / - only, and must start alphanumeric',
      handle,
    );
  }
  if (handle.includes('..') || handle.includes('//')) {
    throw new HandleValidationError('Handle may not contain ".." or "//"', handle);
  }
  return true;
}

/**
 * Content-type facade over the kernel's `detectMime`.
 *
 * `detectMime(data, extHint)` takes bytes and is accurate when given an
 * extension hint (it consults both magic bytes and an extension map). With no
 * hint it only separates text from binary, so a content sniff runs first for the
 * common text formats the UI displays.
 */
export class ContentTypeInterpreter {
  static detect(content, extHint = '') {
    const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
    if (ContentTypeInterpreter.isBinaryContent(text)) return 'application/octet-stream';

    const sniffed = ContentTypeInterpreter._sniff(text);
    if (sniffed) return sniffed;

    const bytes = new TextEncoder().encode(text);
    try {
      const mime = detectMime(bytes, extHint);
      if (mime && mime !== 'application/octet-stream') return mime;
    } catch { /* fall through */ }
    return 'text/plain';
  }

  /** Structural sniff for the text formats the UI renders. */
  static _sniff(text) {
    const t = text.trimStart();
    if (/^<(!doctype|html|head|body)\b/i.test(t)) return 'text/html';
    if (/^<\?xml\b/i.test(t)) return 'application/xml';
    if (/^<[a-z][\w:-]*(\s|>|\/>)/i.test(t)) return 'application/xml';
    if (/^[\[{]/.test(t)) {
      try { JSON.parse(t); return 'application/json'; } catch { /* not JSON */ }
    }
    if (/^(---|\w[\w.-]*:\s)/m.test(t) && /^[\w.-]+:\s/m.test(t)) return 'application/yaml';
    if (/^#{1,6}\s+\S/m.test(t)) return 'text/markdown';
    if (/^#!\/(usr\/bin|bin)\//.test(t)) return 'application/javascript';
    if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i.test(t)) return 'application/sql';
    return null;
  }

  static detectContentType(content, extHint) {
    return ContentTypeInterpreter.detect(content, extHint);
  }

  static isBinaryContent(content) {
    const s = typeof content === 'string' ? content : '';
    return /[\u0000-\u0008\u000E-\u001F]/.test(s);
  }

  static isUnstructuredBinary(content) {
    return ContentTypeInterpreter.isBinaryContent(content);
  }

  static hasPathologicalLines(content, maxLength = 10000) {
    const s = typeof content === 'string' ? content : '';
    return s.split('\n').some((line) => line.length > maxLength);
  }

  static isKnownLongLineExtension(ext) {
    const known = new Set(['json', 'map', 'csv', 'svg', 'lock', 'wasm', 'b64']);
    const e = String(ext ?? '').replace(/^\./, '').toLowerCase();
    return known.has(e) || e.endsWith('.min.js');
  }
}

/** GTime facade: the kernel produces ISO-8601 strings via computeGTime. */
export class GTime {
  constructor(value) {
    this.value = value instanceof Date ? value.toISOString() : String(value ?? new Date().toISOString());
  }

  static now() {
    return new GTime(new Date());
  }

  static from(value) {
    return new GTime(value);
  }

  toISOString() {
    return this.value;
  }

  toString() {
    return this.value;
  }
}

export { MCardCollection, ContentHash, IndexedDBBackend, detectMime, classifyClm };
