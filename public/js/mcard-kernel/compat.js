/**
 * Neutral compatibility layer for LandingPage (INV-PKG-10, INV-PKG-11).
 *
 * Provides the legacy view layer with MCard, CardCollection, ContentTypeInterpreter,
 * and ContentHash interfaces without any dependency on clm-kernel or mcard-studio.
 */
import { createHash } from './node-shims/crypto.js';

export class ContentHash {
  constructor(hex) {
    this._hex = String(hex).toLowerCase();
  }
  asHex() { return this._hex; }
  toString() { return this._hex; }
  static fromHex(hex) { return new ContentHash(hex); }
  static of(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
    const hex = createHash('sha256').update(text).digest('hex');
    return new ContentHash(hex);
  }
}

export class AgentDid {
  constructor(did) { this._did = String(did); }
  toString() { return this._did; }
  static create(did) { return new AgentDid(did); }
}

const DEFAULT_AUTHOR = AgentDid.create('did:clm:landing-page');
let sequenceCounter = 0;

/** Native MCard implementation adhering to MCard G-Set specification */
export class NativeMCard {
  constructor(uri, payload, author, sequence, metadata) {
    this.uri = uri;
    this.payload = typeof payload === 'object' && payload !== null && 'value' in payload
      ? payload
      : { value: payload };
    this.author = author || DEFAULT_AUTHOR;
    this.sequence = sequence ?? sequenceCounter++;
    this.metadata = metadata instanceof Map ? metadata : new Map(Object.entries(metadata ?? {}));
    const text = typeof this.payload.value === 'string'
      ? this.payload.value
      : JSON.stringify(this.payload.value ?? '');
    this.hash = ContentHash.of(text);
    Object.freeze(this);
  }

  getMetadata(key) {
    return this.metadata.get(key);
  }

  toJSON() {
    return {
      uri: this.uri,
      hash: this.hash.asHex(),
      author: String(this.author),
      sequence: this.sequence,
      payload: this.payload,
      metadata: Object.fromEntries(this.metadata.entries()),
    };
  }

  static create(uri, payload, author, sequence, metadata) {
    return new NativeMCard(uri, payload, author, sequence, metadata);
  }

  static fromJSON(json) {
    if (!json) return null;
    const card = new NativeMCard(
      json.uri || `mcard:${Date.now()}`,
      json.payload?.value !== undefined ? json.payload.value : json.payload,
      json.author || DEFAULT_AUTHOR,
      json.sequence || 0,
      json.metadata || {}
    );
    return card;
  }

  static fromStorage(hash, uri, payload, author, sequence, metadata) {
    return new NativeMCard(uri, payload, author, sequence, metadata);
  }

  static withMetadata(card, newMeta) {
    const meta = new Map(card.metadata.entries());
    for (const [k, v] of Object.entries(newMeta)) meta.set(k, v);
    return new NativeMCard(card.uri, card.payload, card.author, card.sequence + 1, meta);
  }
}

/**
 * Wraps a card with the legacy accessors the view layer calls.
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
    return this._card.getMetadata ? this._card.getMetadata(key) : this.metadata?.get?.(key);
  }

  toJSON() {
    return this._card.toJSON ? this._card.toJSON() : this._card;
  }

  get kernel() {
    return this._card;
  }
}

/** Wraps a card in the legacy facade (idempotent). */
export function decorate(card) {
  if (!card) return card;
  return card instanceof LegacyCard ? card : new LegacyCard(card);
}

/** Legacy-shaped MCard facade. */
export const MCard = {
  create(content, options = {}) {
    const uri = options.uri ?? options.handle ?? `mcard:${Date.now()}-${sequenceCounter++}`;
    const metadata = new Map(Object.entries(options.metadata ?? {}));
    return decorate(NativeMCard.create(
      uri, content, options.author ?? DEFAULT_AUTHOR, sequenceCounter++, metadata,
    ));
  },

  fromObject(obj) {
    return decorate(NativeMCard.fromJSON(obj));
  },

  fromJSON: (json) => decorate(NativeMCard.fromJSON(json)),
  fromStorage: (...args) => decorate(NativeMCard.fromStorage(...args)),
  withMetadata: (...args) => decorate(NativeMCard.withMetadata(...args)),

  kernel: NativeMCard,
};

/** MCardCollection maintaining in-memory or storage-backed cards */
export class MCardCollection {
  constructor(storageBackend) {
    this.storageBackend = storageBackend;
    this._cards = new Map();
    this._handles = new Map();
    this._history = new Map();
  }

  put(card) {
    const dec = decorate(card);
    const hex = dec.hash.asHex ? dec.hash.asHex() : String(dec.hash);
    this._cards.set(hex, dec);
    if (this.storageBackend?.put) {
      this.storageBackend.put(dec.hash, dec);
    }
    return dec.hash;
  }

  putWithHandle(card, handle) {
    const hash = this.put(card);
    const hex = hash.asHex ? hash.asHex() : String(hash);
    this._handles.set(handle, hex);
    const hist = this._history.get(handle) || [];
    hist.push(hex);
    this._history.set(handle, hist);
    if (this.storageBackend?.registerHandle) {
      this.storageBackend.registerHandle(handle, hash);
    }
    return hash;
  }

  get(hash) {
    const hex = hash.asHex ? hash.asHex() : String(hash);
    return this._cards.get(hex) || (this.storageBackend?.get ? this.storageBackend.get(hash) : undefined);
  }

  resolve(handle) {
    return this._handles.get(handle) || (this.storageBackend?.resolveHandle ? this.storageBackend.resolveHandle(handle) : undefined);
  }

  resolveHandle(handle) {
    return this.resolve(handle);
  }

  history(handle) {
    return this._history.get(handle) || [];
  }

  list() {
    if (this.storageBackend?.list) {
      return this.storageBackend.list();
    }
    return Array.from(this._cards.values());
  }

  count() {
    if (this.storageBackend?.count) {
      return typeof this.storageBackend.count === 'function' ? this.storageBackend.count() : this.storageBackend.count;
    }
    return this._cards.size;
  }
}

/** CardCollection adapter over MCardCollection */
export class CardCollection {
  constructor(backendOrEngine) {
    this.engine = backendOrEngine;
    this._collection = new MCardCollection(backendOrEngine);
  }

  add(card) {
    const hash = this._collection.put(decorate(card));
    return hash.asHex ? hash.asHex() : String(hash);
  }

  addWithHandle(card, handle) {
    const hash = this._collection.putWithHandle(decorate(card), handle);
    return hash.asHex ? hash.asHex() : String(hash);
  }

  get(hash) {
    const h = typeof hash === 'string' ? ContentHash.fromHex(hash) : hash;
    return decorate(this._collection.get(h));
  }

  getByHandle(handle) {
    const hash = this._collection.resolve(handle);
    return hash ? this.get(hash) : undefined;
  }

  updateHandle(handle, hashOrCard) {
    let hex = hashOrCard;
    if (hashOrCard && typeof hashOrCard === 'object' && hashOrCard.hash) {
      hex = hashOrCard.hash.asHex ? hashOrCard.hash.asHex() : hashOrCard.hash;
    }
    const h = typeof hex === 'string' ? ContentHash.fromHex(hex) : hex;
    return this._collection.storageBackend?.registerHandle
      ? this._collection.storageBackend.registerHandle(handle, h)
      : this._collection.putWithHandle(this.get(h) || { hash: h }, handle);
  }

  resolveHandle(handle) {
    const hash = this._collection.resolveHandle(handle);
    return hash ? (hash.asHex ? hash.asHex() : String(hash)) : undefined;
  }

  getHandleHistory(handle) {
    return this._collection.history(handle).map((h) => (h.asHex ? h.asHex() : String(h)));
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

export class ContentTypeInterpreter {
  static detect(content, extHint = '') {
    const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
    if (ContentTypeInterpreter.isBinaryContent(text)) return 'application/octet-stream';

    const sniffed = ContentTypeInterpreter._sniff(text);
    if (sniffed) return sniffed;

    return 'text/plain';
  }

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
}

export function detectMime(bytes, extHint = '') {
  return ContentTypeInterpreter.detect(bytes, extHint);
}

export function classifyClm(mime) {
  return {
    abstract: `mcard.${String(mime).replace('/', '.')}`,
    concrete: `renderers/${String(mime).split('/')[1] || 'default'}.html`,
    balanced: true,
  };
}

export const GTime = {
  now() { return Date.now(); },
  format(ts) { return new Date(ts).toISOString(); },
};
