// public/js/mcard-kernel/node-shims/buffer.js
var BufferShim = class _BufferShim extends Uint8Array {
  static from(input, encoding) {
    if (typeof input === "string") {
      if (encoding === "base64") {
        const bin = atob(input);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return new _BufferShim(out.buffer);
      }
      if (encoding === "hex") {
        const out = new Uint8Array(input.length / 2);
        for (let i = 0; i < out.length; i++) out[i] = parseInt(input.substr(i * 2, 2), 16);
        return new _BufferShim(out.buffer);
      }
      return new _BufferShim(new TextEncoder().encode(input).buffer);
    }
    if (input instanceof ArrayBuffer) return new _BufferShim(input);
    if (ArrayBuffer.isView(input)) {
      return new _BufferShim(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
    }
    if (Array.isArray(input)) return new _BufferShim(new Uint8Array(input).buffer);
    throw new TypeError("Buffer shim: unsupported input");
  }
  static isBuffer(v) {
    return v instanceof _BufferShim || v instanceof Uint8Array;
  }
  static alloc(n) {
    return new _BufferShim(new Uint8Array(n).buffer);
  }
  toString(encoding = "utf8") {
    const bytes = this;
    if (encoding === "base64") {
      let s = "";
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    }
    if (encoding === "hex") {
      return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    if (encoding === "utf8" || encoding === "utf-8") return new TextDecoder().decode(bytes);
    throw new Error(`Buffer shim: unsupported encoding '${encoding}'`);
  }
};

// public/js/mcard-kernel/node-shims/crypto.js
var K = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
];
function rotr(x, n) {
  return x >>> n | x << 32 - n;
}
function sha256Bytes(bytes) {
  const H = [
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ];
  const len = bytes.length;
  const bitLen = len * 8;
  const withPad = new Uint8Array((len + 9 >> 6) + 1 << 6);
  withPad.set(bytes);
  withPad[len] = 128;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 4, bitLen >>> 0, false);
  dv.setUint32(withPad.length - 8, Math.floor(bitLen / 4294967296), false);
  const w = new Uint32Array(64);
  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const t1 = h + S1 + ch + K[i] + w[i] >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const t2 = S0 + maj >>> 0;
      h = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    H[0] = H[0] + a >>> 0;
    H[1] = H[1] + b >>> 0;
    H[2] = H[2] + c >>> 0;
    H[3] = H[3] + d >>> 0;
    H[4] = H[4] + e >>> 0;
    H[5] = H[5] + f >>> 0;
    H[6] = H[6] + g >>> 0;
    H[7] = H[7] + h >>> 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  H.forEach((v, i) => odv.setUint32(i * 4, v, false));
  return out;
}
function toBytes(input, encoding) {
  if (input instanceof Uint8Array) return input;
  if (typeof input === "string") return new TextEncoder().encode(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  void encoding;
  throw new TypeError("crypto shim: unsupported input type");
}
function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
var Hash = class {
  constructor(algo) {
    if (String(algo).toLowerCase() !== "sha256") {
      throw new Error(`crypto shim: only sha256 is implemented (asked for '${algo}')`);
    }
    this._chunks = [];
  }
  update(data, encoding) {
    this._chunks.push(toBytes(data, encoding));
    return this;
  }
  digest(encoding) {
    const total = this._chunks.reduce((n, c) => n + c.length, 0);
    const joined = new Uint8Array(total);
    let off = 0;
    for (const c of this._chunks) {
      joined.set(c, off);
      off += c.length;
    }
    const out = sha256Bytes(joined);
    return encoding === "hex" ? toHex(out) : out;
  }
};
function createHash(algo) {
  return new Hash(algo);
}

// public/js/mcard-kernel/compat.js
var ContentHash = class _ContentHash {
  constructor(hex) {
    this._hex = String(hex).toLowerCase();
  }
  asHex() {
    return this._hex;
  }
  toString() {
    return this._hex;
  }
  static fromHex(hex) {
    return new _ContentHash(hex);
  }
  static of(content) {
    const text = typeof content === "string" ? content : JSON.stringify(content ?? "");
    const hex = createHash("sha256").update(text).digest("hex");
    return new _ContentHash(hex);
  }
};
var AgentDid = class _AgentDid {
  constructor(did) {
    this._did = String(did);
  }
  toString() {
    return this._did;
  }
  static create(did) {
    return new _AgentDid(did);
  }
};
var DEFAULT_AUTHOR = AgentDid.create("did:clm:landing-page");
var sequenceCounter = 0;
var NativeMCard = class _NativeMCard {
  constructor(uri, payload, author, sequence, metadata) {
    this.uri = uri;
    this.payload = typeof payload === "object" && payload !== null && "value" in payload ? payload : { value: payload };
    this.author = author || DEFAULT_AUTHOR;
    this.sequence = sequence ?? sequenceCounter++;
    this.metadata = metadata instanceof Map ? metadata : new Map(Object.entries(metadata ?? {}));
    const text = typeof this.payload.value === "string" ? this.payload.value : JSON.stringify(this.payload.value ?? "");
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
      metadata: Object.fromEntries(this.metadata.entries())
    };
  }
  static create(uri, payload, author, sequence, metadata) {
    return new _NativeMCard(uri, payload, author, sequence, metadata);
  }
  static fromJSON(json) {
    if (!json) return null;
    const card = new _NativeMCard(
      json.uri || `mcard:${Date.now()}`,
      json.payload?.value !== void 0 ? json.payload.value : json.payload,
      json.author || DEFAULT_AUTHOR,
      json.sequence || 0,
      json.metadata || {}
    );
    return card;
  }
  static fromStorage(hash, uri, payload, author, sequence, metadata) {
    return new _NativeMCard(uri, payload, author, sequence, metadata);
  }
  static withMetadata(card, newMeta) {
    const meta = new Map(card.metadata.entries());
    for (const [k, v] of Object.entries(newMeta)) meta.set(k, v);
    return new _NativeMCard(card.uri, card.payload, card.author, card.sequence + 1, meta);
  }
};
var LegacyCard = class {
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
    return p && typeof p === "object" && "value" in p ? p.value : p;
  }
  getContentAsText() {
    const v = this._value();
    return typeof v === "string" ? v : JSON.stringify(v);
  }
  getContent() {
    return this._card.payload;
  }
  getSize() {
    const v = this._value();
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return new TextEncoder().encode(s ?? "").length;
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
};
function decorate(card) {
  if (!card) return card;
  return card instanceof LegacyCard ? card : new LegacyCard(card);
}
var MCard = {
  create(content, options = {}) {
    const uri = options.uri ?? options.handle ?? `mcard:${Date.now()}-${sequenceCounter++}`;
    const metadata = new Map(Object.entries(options.metadata ?? {}));
    return decorate(NativeMCard.create(
      uri,
      content,
      options.author ?? DEFAULT_AUTHOR,
      sequenceCounter++,
      metadata
    ));
  },
  fromObject(obj) {
    return decorate(NativeMCard.fromJSON(obj));
  },
  fromJSON: (json) => decorate(NativeMCard.fromJSON(json)),
  fromStorage: (...args) => decorate(NativeMCard.fromStorage(...args)),
  withMetadata: (...args) => decorate(NativeMCard.withMetadata(...args)),
  kernel: NativeMCard
};
var MCardCollection = class {
  constructor(storageBackend) {
    this.storageBackend = storageBackend;
    this._cards = /* @__PURE__ */ new Map();
    this._handles = /* @__PURE__ */ new Map();
    this._history = /* @__PURE__ */ new Map();
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
    return this._cards.get(hex) || (this.storageBackend?.get ? this.storageBackend.get(hash) : void 0);
  }
  resolve(handle) {
    return this._handles.get(handle) || (this.storageBackend?.resolveHandle ? this.storageBackend.resolveHandle(handle) : void 0);
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
      return typeof this.storageBackend.count === "function" ? this.storageBackend.count() : this.storageBackend.count;
    }
    return this._cards.size;
  }
};
var CardCollection = class {
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
    const h = typeof hash === "string" ? ContentHash.fromHex(hash) : hash;
    return decorate(this._collection.get(h));
  }
  getByHandle(handle) {
    const hash = this._collection.resolve(handle);
    return hash ? this.get(hash) : void 0;
  }
  updateHandle(handle, hashOrCard) {
    let hex = hashOrCard;
    if (hashOrCard && typeof hashOrCard === "object" && hashOrCard.hash) {
      hex = hashOrCard.hash.asHex ? hashOrCard.hash.asHex() : hashOrCard.hash;
    }
    const h = typeof hex === "string" ? ContentHash.fromHex(hex) : hex;
    return this._collection.storageBackend?.registerHandle ? this._collection.storageBackend.registerHandle(handle, h) : this._collection.putWithHandle(this.get(h) || { hash: h }, handle);
  }
  resolveHandle(handle) {
    const hash = this._collection.resolveHandle(handle);
    return hash ? hash.asHex ? hash.asHex() : String(hash) : void 0;
  }
  getHandleHistory(handle) {
    return this._collection.history(handle).map((h) => h.asHex ? h.asHex() : String(h));
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
};
var HandleValidationError = class extends Error {
  constructor(message, handle) {
    super(message);
    this.name = "HandleValidationError";
    this.handle = handle;
  }
};
var HANDLE_RE = /^[A-Za-z0-9][A-Za-z0-9._:\/-]{0,254}$/;
function validateHandle(handle) {
  if (typeof handle !== "string" || handle.length === 0) {
    throw new HandleValidationError("Handle must be a non-empty string", handle);
  }
  if (handle.length > 255) {
    throw new HandleValidationError("Handle must be 255 characters or fewer", handle);
  }
  if (!HANDLE_RE.test(handle)) {
    throw new HandleValidationError(
      "Handle may contain letters, digits, and . _ : / - only, and must start alphanumeric",
      handle
    );
  }
  if (handle.includes("..") || handle.includes("//")) {
    throw new HandleValidationError('Handle may not contain ".." or "//"', handle);
  }
  return true;
}
var ContentTypeInterpreter = class _ContentTypeInterpreter {
  static detect(content, extHint = "") {
    const text = typeof content === "string" ? content : JSON.stringify(content ?? "");
    if (_ContentTypeInterpreter.isBinaryContent(text)) return "application/octet-stream";
    const sniffed = _ContentTypeInterpreter._sniff(text);
    if (sniffed) return sniffed;
    return "text/plain";
  }
  static _sniff(text) {
    const t = text.trimStart();
    if (/^<(!doctype|html|head|body)\b/i.test(t)) return "text/html";
    if (/^<\?xml\b/i.test(t)) return "application/xml";
    if (/^<[a-z][\w:-]*(\s|>|\/>)/i.test(t)) return "application/xml";
    if (/^[\[{]/.test(t)) {
      try {
        JSON.parse(t);
        return "application/json";
      } catch {
      }
    }
    if (/^(---|\w[\w.-]*:\s)/m.test(t) && /^[\w.-]+:\s/m.test(t)) return "application/yaml";
    if (/^#{1,6}\s+\S/m.test(t)) return "text/markdown";
    if (/^#!\/(usr\/bin|bin)\//.test(t)) return "application/javascript";
    if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\b/i.test(t)) return "application/sql";
    return null;
  }
  static detectContentType(content, extHint) {
    return _ContentTypeInterpreter.detect(content, extHint);
  }
  static isBinaryContent(content) {
    const s = typeof content === "string" ? content : "";
    return /[\u0000-\u0008\u000E-\u001F]/.test(s);
  }
};
function detectMime(bytes, extHint = "") {
  return ContentTypeInterpreter.detect(bytes, extHint);
}
function classifyClm(mime) {
  return {
    abstract: `mcard.${String(mime).replace("/", ".")}`,
    concrete: `renderers/${String(mime).split("/")[1] || "default"}.html`,
    balanced: true
  };
}
var GTime = {
  now() {
    return Date.now();
  },
  format(ts) {
    return new Date(ts).toISOString();
  }
};

// public/js/mcard-kernel/indexeddb-backend.js
var DB_VERSION = 1;
var STORE_CARDS = "cards";
var STORE_HANDLES = "handles";
var STORE_HISTORY = "handle_history";
var IndexedDBBackend = class _IndexedDBBackend {
  constructor(dbName = DB_NAME_DEFAULT) {
    this.dbName = dbName;
    this.db = null;
    this.cards = /* @__PURE__ */ new Map();
    this.handles = /* @__PURE__ */ new Map();
    this.history = /* @__PURE__ */ new Map();
  }
  static get available() {
    return typeof indexedDB !== "undefined";
  }
  async init() {
    if (!_IndexedDBBackend.available) {
      console.warn("[IndexedDBBackend] IndexedDB unavailable \u2014 running memory-only.");
      return this;
    }
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CARDS)) db.createObjectStore(STORE_CARDS);
        if (!db.objectStoreNames.contains(STORE_HANDLES)) db.createObjectStore(STORE_HANDLES);
        if (!db.objectStoreNames.contains(STORE_HISTORY)) db.createObjectStore(STORE_HISTORY);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await this._hydrate();
    return this;
  }
  async _hydrate() {
    const [cards, handles, history] = await Promise.all([
      this._readAll(STORE_CARDS),
      this._readAll(STORE_HANDLES),
      this._readAll(STORE_HISTORY)
    ]);
    for (const [hash, json] of cards) {
      try {
        this.cards.set(hash, MCard.fromJSON(json));
      } catch (e) {
        console.warn("[IndexedDBBackend] skipping unreadable card", hash, e.message);
      }
    }
    for (const [handle, hash] of handles) this.handles.set(handle, hash);
    for (const [handle, list] of history) this.history.set(handle, list);
  }
  _readAll(store) {
    return new Promise((resolve) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction(store, "readonly");
      const req = tx.objectStore(store).openCursor();
      const out = [];
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve(out);
        out.push([cur.key, cur.value]);
        cur.continue();
      };
      req.onerror = () => resolve(out);
    });
  }
  _write(store, key, value) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
    } catch (e) {
      console.warn("[IndexedDBBackend] write failed", store, key, e.message);
    }
  }
  _remove(store, key) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
    } catch (e) {
      console.warn("[IndexedDBBackend] delete failed", store, key, e.message);
    }
  }
  // ── StorageBackend interface ────────────────────────────────────────────
  put(hash, mcard) {
    const hex = typeof hash === "string" ? hash : hash.asHex();
    if (this.cards.has(hex)) return false;
    this.cards.set(hex, mcard);
    this._write(STORE_CARDS, hex, mcard.toJSON());
    return true;
  }
  get(hash) {
    const hex = typeof hash === "string" ? hash : hash.asHex();
    return this.cards.get(hex);
  }
  has(hash) {
    const hex = typeof hash === "string" ? hash : hash.asHex();
    return this.cards.has(hex);
  }
  list() {
    return Array.from(this.cards.values());
  }
  count() {
    return this.cards.size;
  }
  registerHandle(handle, hash) {
    const h = typeof handle === "string" ? handle : handle.asString();
    const hex = typeof hash === "string" ? hash : hash.asHex();
    const prev = this.handles.get(h);
    if (prev === hex) return;
    const trail = this.history.get(h) ?? [];
    if (prev) {
      trail.push(prev);
      this.history.set(h, trail);
      this._write(STORE_HISTORY, h, trail);
    }
    this.handles.set(h, hex);
    this._write(STORE_HANDLES, h, hex);
  }
  resolveHandle(handle) {
    const h = typeof handle === "string" ? handle : handle.asString();
    const hex = this.handles.get(h);
    return hex ? ContentHash.fromHex(hex) : void 0;
  }
  handleHistory(handle) {
    const h = typeof handle === "string" ? handle : handle.asString();
    return (this.history.get(h) ?? []).map((hex) => ContentHash.fromHex(hex));
  }
  snapshot() {
    return {
      cards: new Map(this.cards),
      handles: new Map(this.handles),
      history: new Map(Array.from(this.history, ([k, v]) => [k, [...v]]))
    };
  }
  restore(snapshot) {
    if (!snapshot) return;
    this.cards = new Map(snapshot.cards ?? []);
    this.handles = new Map(snapshot.handles ?? []);
    this.history = new Map(snapshot.history ?? []);
  }
  close() {
    try {
      this.db?.close();
    } catch {
    }
    this.db = null;
  }
  // ── Compatibility helpers used by the UI layer ──────────────────────────
  /** Page over stored cards, newest first. */
  getPage(page = 1, pageSize = 20) {
    const all = this.list();
    const start = Math.max(0, (Number(page) - 1) * Number(pageSize));
    return {
      cards: all.slice(start, start + Number(pageSize)),
      total: all.length,
      page: Number(page),
      pageSize: Number(pageSize)
    };
  }
  /** Find cards whose hash begins with a prefix. */
  searchByHash(prefix) {
    const p = String(prefix ?? "");
    return this.list().filter((c) => c.hash.asHex().startsWith(p));
  }
  /**
   * Tombstone instead of delete (INV-REF-03: the card table is append-only).
   * The handle mapping is dropped so the card is no longer reachable, while the
   * content-addressable record itself is preserved.
   */
  delete(hash) {
    const hex = typeof hash === "string" ? hash : hash.asHex();
    for (const [handle, h] of this.handles) {
      if (h === hex) {
        this.handles.delete(handle);
        this._remove(STORE_HANDLES, handle);
      }
    }
    return true;
  }
  getHandleHistory(handle) {
    return this.handleHistory(handle).map((h) => h.asHex());
  }
  getAllMCardsRaw() {
    return this.list();
  }
};

// ../node_modules/cosmokit/lib/index.mjs
function isNullable(value) {
  return value === null || value === void 0;
}
function defineProperty(object, key, value) {
  return Object.defineProperty(object, key, { writable: true, value, enumerable: false });
}
function is(type, value) {
  if (arguments.length === 1) return (value2) => is(type, value2);
  return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
  return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
  return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
var Binary;
((Binary2) => {
  Binary2.is = isArrayBufferLike;
  Binary2.isSource = isArrayBufferSource;
  function fromSource(source) {
    if (ArrayBuffer.isView(source)) {
      return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    } else {
      return source;
    }
  }
  Binary2.fromSource = fromSource;
  function toBase64(source) {
    source = fromSource(source);
    if (typeof BufferShim !== "undefined") {
      return BufferShim.from(source).toString("base64");
    }
    let binary = "";
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  Binary2.toBase64 = toBase64;
  function fromBase64(source) {
    if (typeof BufferShim !== "undefined") return fromSource(BufferShim.from(source, "base64"));
    return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  }
  Binary2.fromBase64 = fromBase64;
  function toHex2(source) {
    source = fromSource(source);
    if (typeof BufferShim !== "undefined") return BufferShim.from(source).toString("hex");
    return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Binary2.toHex = toHex2;
  function fromHex(source) {
    if (typeof BufferShim !== "undefined") return fromSource(BufferShim.from(source, "hex"));
    const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) {
      buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
    }
    return Uint8Array.from(buffer).buffer;
  }
  Binary2.fromHex = fromHex;
})(Binary || (Binary = {}));
var base64ToArrayBuffer = Binary.fromBase64;
var arrayBufferToBase64 = Binary.toBase64;
var hexToArrayBuffer = Binary.fromHex;
var arrayBufferToHex = Binary.toHex;
function tokenize(source, delimiters, delimiter) {
  const output = [];
  let state = 0;
  for (let i = 0; i < source.length; i++) {
    const code = source.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      if (state === 1) {
        const next = source.charCodeAt(i + 1);
        if (next >= 97 && next <= 122) {
          output.push(delimiter);
        }
        output.push(code + 32);
      } else {
        if (state !== 0) {
          output.push(delimiter);
        }
        output.push(code + 32);
      }
      state = 1;
    } else if (code >= 97 && code <= 122) {
      output.push(code);
      state = 2;
    } else if (delimiters.includes(code)) {
      if (state !== 0) {
        output.push(delimiter);
      }
      state = 0;
    } else {
      output.push(code);
    }
  }
  return String.fromCharCode(...output);
}
function paramCase(source) {
  return tokenize(source, [45, 95], 45);
}
var hyphenate = paramCase;
var Time;
((Time2) => {
  Time2.millisecond = 1;
  Time2.second = 1e3;
  Time2.minute = Time2.second * 60;
  Time2.hour = Time2.minute * 60;
  Time2.day = Time2.hour * 24;
  Time2.week = Time2.day * 7;
  let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
  function setTimezoneOffset(offset) {
    timezoneOffset = offset;
  }
  Time2.setTimezoneOffset = setTimezoneOffset;
  function getTimezoneOffset() {
    return timezoneOffset;
  }
  Time2.getTimezoneOffset = getTimezoneOffset;
  function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
    if (typeof date === "number") date = new Date(date);
    if (offset === void 0) offset = timezoneOffset;
    return Math.floor((date.valueOf() / Time2.minute - offset) / 1440);
  }
  Time2.getDateNumber = getDateNumber;
  function fromDateNumber(value, offset) {
    const date = new Date(value * Time2.day);
    if (offset === void 0) offset = timezoneOffset;
    return new Date(+date + offset * Time2.minute);
  }
  Time2.fromDateNumber = fromDateNumber;
  const numeric = /\d+(?:\.\d+)?/.source;
  const timeRegExp = new RegExp(`^${[
    "w(?:eek(?:s)?)?",
    "d(?:ay(?:s)?)?",
    "h(?:our(?:s)?)?",
    "m(?:in(?:ute)?(?:s)?)?",
    "s(?:ec(?:ond)?(?:s)?)?"
  ].map((unit) => `(${numeric}${unit})?`).join("")}$`);
  function parseTime(source) {
    const capture = timeRegExp.exec(source);
    if (!capture) return 0;
    return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
  }
  Time2.parseTime = parseTime;
  function parseDate(date) {
    const parsed = parseTime(date);
    if (parsed) {
      date = Date.now() + parsed;
    } else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) {
      date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
    } else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) {
      date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
    }
    return date ? new Date(date) : /* @__PURE__ */ new Date();
  }
  Time2.parseDate = parseDate;
  function format(ms) {
    const abs = Math.abs(ms);
    if (abs >= Time2.day - Time2.hour / 2) {
      return Math.round(ms / Time2.day) + "d";
    } else if (abs >= Time2.hour - Time2.minute / 2) {
      return Math.round(ms / Time2.hour) + "h";
    } else if (abs >= Time2.minute - Time2.second / 2) {
      return Math.round(ms / Time2.minute) + "m";
    } else if (abs >= Time2.second) {
      return Math.round(ms / Time2.second) + "s";
    }
    return ms + "ms";
  }
  Time2.format = format;
  function toDigits(source, length = 2) {
    return source.toString().padStart(length, "0");
  }
  Time2.toDigits = toDigits;
  function template(template2, time = /* @__PURE__ */ new Date()) {
    return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
  }
  Time2.template = template;
})(Time || (Time = {}));

// ../node_modules/cordis/lib/index.js
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var DisposableList = class {
  static {
    __name(this, "DisposableList");
  }
  sn = 0;
  map = /* @__PURE__ */ new Map();
  weak = /* @__PURE__ */ new WeakMap();
  get length() {
    return this.map.size;
  }
  push(value) {
    const sn = ++this.sn;
    this.map.set(sn, value);
    this.weak.set(value, sn);
    return () => this.map.delete(sn);
  }
  delete(value) {
    const sn = this.weak.get(value);
    if (!sn) return false;
    return this.map.delete(sn);
  }
  clear() {
    const values = [...this.map.values()];
    this.map.clear();
    return values.reverse();
  }
  [Symbol.iterator]() {
    return this.map.values();
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this];
  }
};
var symbols = {
  // internal symbols
  shadow: /* @__PURE__ */ Symbol.for("cordis.shadow"),
  caller: /* @__PURE__ */ Symbol.for("cordis.caller"),
  receiver: /* @__PURE__ */ Symbol.for("cordis.receiver"),
  original: /* @__PURE__ */ Symbol.for("cordis.original"),
  metadata: /* @__PURE__ */ Symbol.for("cordis.metadata"),
  initHooks: /* @__PURE__ */ Symbol.for("cordis.initHooks"),
  checkProto: /* @__PURE__ */ Symbol.for("cordis.checkProto"),
  // context symbols
  effect: /* @__PURE__ */ Symbol.for("cordis.effect"),
  filter: /* @__PURE__ */ Symbol.for("cordis.filter"),
  isolate: /* @__PURE__ */ Symbol.for("cordis.isolate"),
  intercept: /* @__PURE__ */ Symbol.for("cordis.intercept"),
  // service symbols
  init: /* @__PURE__ */ Symbol.for("cordis.init"),
  check: /* @__PURE__ */ Symbol.for("cordis.check"),
  config: /* @__PURE__ */ Symbol.for("cordis.config"),
  invoke: /* @__PURE__ */ Symbol.for("cordis.invoke"),
  extend: /* @__PURE__ */ Symbol.for("cordis.extend"),
  tracker: /* @__PURE__ */ Symbol.for("cordis.tracker"),
  resolveConfig: /* @__PURE__ */ Symbol.for("cordis.resolveConfig")
};
var GeneratorFunction = function* () {
}.constructor;
var AsyncGeneratorFunction = async function* () {
}.constructor;
function isConstructor(func) {
  if (!func.prototype) return false;
  if (func instanceof GeneratorFunction) return false;
  if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
  return true;
}
__name(isConstructor, "isConstructor");
function joinPrototype(proto1, proto2) {
  if (proto1 === Object.prototype) return proto2;
  const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
  for (const key of Reflect.ownKeys(proto1)) {
    Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
  }
  return result;
}
__name(joinPrototype, "joinPrototype");
function isObject(value) {
  return value && (typeof value === "object" || typeof value === "function");
}
__name(isObject, "isObject");
function getPropertyDescriptor(target, prop) {
  let proto = target;
  while (proto) {
    const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
    if (desc) return desc;
    proto = Object.getPrototypeOf(proto);
  }
}
__name(getPropertyDescriptor, "getPropertyDescriptor");
function getTraceable(ctx, value) {
  if (!isObject(value)) return value;
  if (Object.hasOwn(value, symbols.shadow)) {
    return Object.getPrototypeOf(value);
  }
  const tracker = value[symbols.tracker];
  if (!tracker) return value;
  return createTraceable(ctx, value, tracker);
}
__name(getTraceable, "getTraceable");
function withProps(target, props) {
  if (!props) return target;
  return new Proxy(target, {
    get: /* @__PURE__ */ __name((target2, prop, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
      return Reflect.get(target2, prop, receiver);
    }, "get"),
    set: /* @__PURE__ */ __name((target2, prop, value, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
      return Reflect.set(target2, prop, value, receiver);
    }, "set")
  });
}
__name(withProps, "withProps");
function withProp(target, prop, value) {
  return withProps(target, Object.defineProperty(/* @__PURE__ */ Object.create(null), prop, {
    value,
    writable: false
  }));
}
__name(withProp, "withProp");
function createShadow(useSite, target, property, receiver) {
  if (!property) return receiver;
  const value = getPropertyDescriptor(target, property)?.value;
  if (!value) return receiver;
  const defSite = value[symbols.shadow] ?? value;
  return withProp(receiver, property, useSite.extend({ [symbols.shadow]: defSite }));
}
__name(createShadow, "createShadow");
function createShadowMethod(ctx, value, outer, shadow) {
  return new Proxy(value, {
    apply: /* @__PURE__ */ __name((target, thisArg, args) => {
      if (thisArg === outer) thisArg = shadow;
      return getTraceable(ctx, Reflect.apply(target, thisArg, args));
    }, "apply")
  });
}
__name(createShadowMethod, "createShadowMethod");
function createTraceable(ctx, value, tracker) {
  const defSite = ctx[symbols.shadow] ?? ctx;
  const useSite = ctx[symbols.shadow] ? Object.getPrototypeOf(ctx) : ctx;
  const proxy = new Proxy(value, {
    get: /* @__PURE__ */ __name((target, prop, receiver) => {
      if (prop === symbols.original) return target;
      if (prop === symbols.caller) return defSite;
      if (prop === tracker.property) return useSite;
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }
      if (tracker.associate && useSite.reflect.props[`${tracker.associate}.${prop}`]) {
        return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
      }
      let shadow, innerValue;
      const desc = getPropertyDescriptor(target, prop);
      if (desc && "value" in desc) {
        innerValue = desc.value;
      } else {
        shadow = createShadow(useSite, target, tracker.property, receiver);
        innerValue = Reflect.get(target, prop, shadow);
      }
      const innerTracker = innerValue?.[symbols.tracker];
      if (innerTracker) {
        return createTraceable(useSite, innerValue, innerTracker);
      } else if (!tracker.noShadow && typeof innerValue === "function") {
        shadow ??= createShadow(useSite, target, tracker.property, receiver);
        return createShadowMethod(useSite, innerValue, receiver, shadow);
      } else {
        return innerValue;
      }
    }, "get"),
    set: /* @__PURE__ */ __name((target, prop, value2, receiver) => {
      if (prop === symbols.original) return false;
      if (prop === symbols.caller) return false;
      if (prop === tracker.property) return false;
      if (typeof prop === "symbol") {
        return Reflect.set(target, prop, value2, receiver);
      }
      if (tracker.associate && useSite.reflect.props[`${tracker.associate}.${prop}`]) {
        return Reflect.set(ctx, `${tracker.associate}.${prop}`, value2, withProp(ctx, symbols.receiver, receiver));
      }
      const shadow = createShadow(useSite, target, tracker.property, receiver);
      return Reflect.set(target, prop, value2, shadow);
    }, "set"),
    apply: /* @__PURE__ */ __name((target, thisArg, args) => {
      const receiver = tracker.noShadow ? proxy : createShadow(useSite, target, tracker.property, proxy);
      return applyTraceable(receiver, target, thisArg, args);
    }, "apply")
  });
  return proxy;
}
__name(createTraceable, "createTraceable");
function applyTraceable(proxy, value, thisArg, args) {
  if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
  return value[symbols.invoke].apply(proxy, args);
}
__name(applyTraceable, "applyTraceable");
function createCallable(name, proto, tracker) {
  const self = /* @__PURE__ */ __name(function(...args) {
    const proxy = createTraceable(self["ctx"], self, tracker);
    return Reflect.apply(proxy, this, args);
  }, "self");
  defineProperty(self, "name", name);
  return Object.setPrototypeOf(self, proto);
}
__name(createCallable, "createCallable");
function handleError(info, reason, getOuterStack) {
  const innerLines = info.error.stack.split("\n");
  if (typeof reason?.stack !== "string") {
    const outerError = new Error(reason);
    const lines2 = outerError.stack.split("\n");
    lines2.splice(1, Infinity, ...getOuterStack());
    outerError.stack = lines2.join("\n");
    throw outerError;
  }
  const lines = reason.stack.split("\n");
  let index = lines.indexOf(innerLines[2]);
  if (index === -1) throw reason;
  index -= info.offset;
  while (index > 0) {
    if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
    index -= 1;
  }
  lines.splice(index, Infinity, ...getOuterStack());
  reason.stack = lines.join("\n");
  throw reason;
}
__name(handleError, "handleError");
function composeError(callback, getOuterStack = buildOuterStack()) {
  const info = { offset: 1, error: new Error() };
  try {
    const result = callback(info);
    if (isObject(result) && "then" in result) {
      return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
    } else {
      return result;
    }
  } catch (reason) {
    handleError(info, reason, getOuterStack);
  }
}
__name(composeError, "composeError");
function buildOuterStack(offset = 0) {
  const outerError = new Error();
  return () => outerError.stack.split("\n").slice(3 + offset);
}
__name(buildOuterStack, "buildOuterStack");
function isBailed(value) {
  return value !== null && value !== false && value !== void 0;
}
__name(isBailed, "isBailed");
var EventsService = class {
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.on("internal/listener", function(name, listener, options) {
      if (name === "internal/update" && !options.global) {
        const hooks = this.fiber._hooks["internal/update"] ??= new DisposableList();
        const method = options.prepend ? "unshift" : "push";
        return hooks[method](listener);
      }
    });
    this.on("internal/update", function(config, noSave, next) {
      const cbs = [...this._hooks["internal/update"] || []];
      const _next = /* @__PURE__ */ __name(() => {
        const cb = cbs.shift() ?? next;
        return cb.call(this, config, noSave, _next);
      }, "_next");
      return _next();
    }, { global: true, prepend: true });
  }
  ctx;
  static {
    __name(this, "EventsService");
  }
  _hooks = /* @__PURE__ */ Object.create(null);
  _resolve(type, args) {
    const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
    const name = args.shift();
    if ((typeof name !== "string" || !name.startsWith("internal/")) && this._hooks["internal/dispatch"]?.length) {
      this.emit("internal/dispatch", type, name, args, thisArg);
    }
    const filter = thisArg?.[Context.filter];
    return [thisArg, (this._hooks[name] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback)];
  }
  /** @deprecated */
  dispatch(type, args) {
    const [thisArg, callbacks] = this._resolve(type, args);
    return callbacks.map((callback) => callback.bind(thisArg));
  }
  async parallel(...args) {
    const [thisArg, callbacks] = this._resolve("emit", args);
    const results = await Promise.allSettled(callbacks.map(async (callback) => Reflect.apply(callback, thisArg, args)));
    const errors = results.filter((result) => result.status === "rejected");
    if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
  }
  emit(...args) {
    const [thisArg, callbacks] = this._resolve("emit", args);
    for (const callback of callbacks) Reflect.apply(callback, thisArg, args);
  }
  async serial(...args) {
    const [thisArg, callbacks] = this._resolve("serial", args);
    for (const callback of callbacks) {
      const result = await Reflect.apply(callback, thisArg, args);
      if (isBailed(result)) return result;
    }
  }
  bail(...args) {
    const [thisArg, callbacks] = this._resolve("bail", args);
    for (const callback of callbacks) {
      const result = Reflect.apply(callback, thisArg, args);
      if (isBailed(result)) return result;
    }
  }
  waterfall(...args) {
    const [thisArg, callbacks] = this._resolve("waterfall", args);
    const inner = args.pop();
    const dispatch = /* @__PURE__ */ __name(() => {
      const callback = callbacks.shift();
      if (!callback) return inner();
      let called = false;
      const next = /* @__PURE__ */ __name(() => {
        if (called) throw new Error("next() called multiple times");
        called = true;
        return dispatch();
      }, "next");
      return Reflect.apply(callback, thisArg, [...args, next]);
    }, "dispatch");
    return dispatch();
  }
  register(label, name, callback, options) {
    const method = options.prepend ? "unshift" : "push";
    return this.ctx.fiber.effect(() => {
      const hooks = this._hooks[name] ??= [];
      hooks[method]({ ctx: this.ctx, callback, ...options });
      return () => this.unregister(name, callback);
    }, label);
  }
  unregister(name, callback) {
    const hooks = this._hooks[name];
    if (!hooks) return;
    const index = hooks.findIndex((hook) => hook.callback === callback);
    if (index >= 0) {
      hooks.splice(index, 1);
      if (!hooks.length) delete this._hooks[name];
      return true;
    }
  }
  on(name, listener, options) {
    if (typeof options !== "object") {
      options = { prepend: options };
    }
    this.ctx.fiber.assertActive();
    listener = this.ctx.reflect.bind(listener);
    const result = this.bail(this.ctx, "internal/listener", name, listener, options);
    if (result) return result;
    const label = `ctx.on(${typeof name === "string" ? JSON.stringify(name) : name.toString()})`;
    return this.register(label, name, listener, options);
  }
  once(name, listener, options) {
    const dispose = this.on(name, function(...args) {
      dispose();
      return listener.apply(this, args);
    }, options);
    return dispose;
  }
};
var defaultFormatters = {
  s: /* @__PURE__ */ __name((value) => String(value), "s"),
  d: /* @__PURE__ */ __name((value) => Math.trunc(Number(value)), "d"),
  i: /* @__PURE__ */ __name((value) => Math.trunc(Number(value)), "i"),
  f: /* @__PURE__ */ __name((value) => Number(value), "f"),
  o: /* @__PURE__ */ __name((value) => JSON.stringify(value), "o"),
  O: /* @__PURE__ */ __name((value) => JSON.stringify(value), "O"),
  c: /* @__PURE__ */ __name(() => "", "c"),
  C: /* @__PURE__ */ __name((value, exporter, message) => {
    return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
  }, "C")
};
function isAggregateError(error) {
  return error instanceof Error && Array.isArray(error["errors"]);
}
__name(isAggregateError, "isAggregateError");
var Logger = class {
  constructor(options, service) {
    this.service = service;
    Object.assign(this, options);
    this.error = this._method(
      "error",
      0
      /* ERROR */
    );
    this.info = this._method(
      "info",
      2
      /* INFO */
    );
    this.warn = this._method(
      "warn",
      1
      /* WARN */
    );
    this.debug = this._method(
      "debug",
      3
      /* DEBUG */
    );
  }
  service;
  static {
    __name(this, "Logger");
  }
  static color(exporter, code, value, decoration = "") {
    if (!exporter.colors) return "" + value;
    return `\x1B[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\x1B[0m`;
  }
  static code(name, level) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
      hash |= 0;
    }
    const colors = !level ? [] : level >= 2 ? c256 : c16;
    return colors[Math.abs(hash) % colors.length];
  }
  static format(exporter, message) {
    const args = message.args.slice();
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message;
      args.unshift("%s");
    } else if (typeof args[0] !== "string") {
      args.unshift("%o");
    }
    let format = args.shift();
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === "%%") return "%";
      const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
      if (typeof formatter === "function") {
        const value = args.shift();
        return formatter(value, exporter, message);
      }
      return match;
    });
    const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
    for (let arg of args) {
      if (typeof arg === "object" && arg) {
        arg = oFormatter(arg, exporter, message);
      }
      format += " " + arg;
    }
    const { maxLength = 10240 } = exporter;
    return format.split(/\r?\n/g).map((line) => {
      return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
    }).join("\n");
  }
  _method(type, level) {
    return (...args) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) {
          this[type](args[0].cause);
        } else if (isAggregateError(args[0])) {
          args[0].errors.forEach((error) => this[type](error));
          return;
        }
      }
      const sn = ++this.service._snMessage;
      const ts = Date.now();
      for (const exporter of this.service.exporters.values()) {
        const targetLevel = exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 2;
        if (targetLevel < level) continue;
        const message = { sn, ts, type, level, name: this.name, ...this.meta, args };
        exporter.export(message);
      }
    };
  }
};
var c16 = [6, 2, 3, 4, 5, 1];
var c256 = [
  20,
  21,
  26,
  27,
  32,
  33,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  56,
  57,
  62,
  63,
  68,
  69,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  92,
  93,
  98,
  99,
  112,
  113,
  129,
  134,
  135,
  148,
  149,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  178,
  179,
  184,
  185,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  214,
  215,
  220,
  221
];
var LoggerService = class _LoggerService {
  static {
    __name(this, "LoggerService");
  }
  bufferSize = 1e3;
  buffer = [];
  ctx;
  _snMessage = 0;
  _snExporter = 0;
  exporters = /* @__PURE__ */ new Map();
  constructor(ctx) {
    const tracker = {
      property: "ctx",
      noShadow: true
    };
    const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    Object.assign(self, this);
    self.ctx = ctx;
    defineProperty(self, symbols.tracker, tracker);
    self.exporter({
      colors: 3,
      export: /* @__PURE__ */ __name((message) => {
        self.buffer.push(message);
        const overflow = self.buffer.length - self.bufferSize;
        if (overflow === 1) {
          self.buffer.shift();
        } else if (overflow > 1) {
          self.buffer.splice(0, overflow);
        }
      }, "export")
    });
    return self;
  }
  exporter(exporter) {
    return this.ctx.effect(() => {
      const id = ++this._snExporter;
      this.exporters.set(id, exporter);
      return () => this.exporters.delete(id);
    }, "ctx.logger.exporter()");
  }
  _resolveConfig() {
    let intercept = this.ctx[symbols.intercept];
    const configs = [];
    while ("logger" in intercept) {
      if (Object.hasOwn(intercept, "logger")) {
        configs.unshift(intercept["logger"]);
      }
      intercept = Object.getPrototypeOf(intercept);
    }
    return Object.assign({}, ...configs);
  }
  [symbols.invoke](name) {
    const config = this._resolveConfig();
    const caller = this[symbols.caller];
    const fiber = (caller ?? this.ctx).fiber;
    name ??= config.name;
    name ??= hyphenate(fiber.name);
    return new Logger({
      name,
      level: config.level,
      meta: { fiber: new WeakRef(fiber) }
    }, this);
  }
  static {
    for (const type of ["error", "info", "warn", "debug"]) {
      ;
      _LoggerService.prototype[type] = function(...args) {
        return this()[type](...args);
      };
    }
  }
};
var kValidationError = /* @__PURE__ */ Symbol.for("ValidationError");
var ValidationError = class extends TypeError {
  static {
    __name(this, "ValidationError");
  }
  name = "ValidationError";
  constructor(issues) {
    super(`invalid config:
` + issues.map((issue) => {
      if (issue.path) {
        return `  - ${issue.message} (at ${issue.path.join(".")})`;
      } else {
        return `  - ${issue.message}`;
      }
    }).join("\n"));
  }
};
Object.defineProperty(ValidationError.prototype, kValidationError, {
  value: true
});
function resolveConfig(runtime, config) {
  if (!runtime.Config) return config;
  const result = runtime.Config["~standard"].validate(config);
  if ("then" in result) {
    throw new TypeError("Async config validation is not supported");
  }
  if (result.issues) {
    throw new ValidationError(result.issues);
  } else {
    return result.value;
  }
}
__name(resolveConfig, "resolveConfig");
var CordisError = class _CordisError extends Error {
  constructor(code, message) {
    super(message ?? _CordisError.Code[code]);
    this.code = code;
  }
  code;
  static {
    __name(this, "CordisError");
  }
};
((CordisError2) => {
  CordisError2.Code = {
    INACTIVE_EFFECT: "cannot create effect on inactive context"
  };
})(CordisError || (CordisError = {}));
var INACTIVE = "__INACTIVE__";
var Fiber = class {
  constructor(parent, config, inject, runtime, getOuterStack) {
    this.parent = parent;
    this.inject = inject;
    this.runtime = runtime;
    const collect = /* @__PURE__ */ __name((dispose) => {
      this._disposables.push(dispose);
    }, "collect");
    if (runtime) {
      this.uid = parent.registry.counter;
      this.ctx = this.context = parent.extend({ fiber: this });
      const injectEntries = Object.entries(this.inject);
      if (injectEntries.length) {
        this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
        for (const [name, config2] of injectEntries) {
          if (isNullable(config2)) continue;
          this.ctx[Context.intercept][name] = config2;
        }
      }
      this._runner = {
        epoch: INACTIVE,
        getOuterStack,
        execute: /* @__PURE__ */ __name(function() {
          if (isConstructor(runtime.callback)) {
            const instance = new runtime.callback(this.ctx, this.config);
            for (const hook of instance?.[symbols.initHooks] ?? []) {
              hook();
            }
            return instance?.[symbols.init]?.();
          } else {
            return runtime.callback(this.ctx, this.config);
          }
        }, "execute"),
        collect
      };
      this.context.emit("internal/plugin", this);
      for (const name of Object.keys(this.inject)) {
        this._checkImpl(name);
      }
      this.dispose = parent.fiber.effect(() => {
        const remove = runtime.fibers.push(this);
        try {
          this.config = resolveConfig(runtime, config);
          this._refresh();
        } catch (error) {
          this.ctx.logger.error(error);
          this._error = error;
        }
        return async () => {
          this.uid = null;
          this.context.emit("internal/plugin", this);
          if (this.ctx.registry.has(runtime.callback)) {
            remove();
            if (!runtime.fibers.length) {
              this.ctx.registry.delete(runtime.callback);
            }
          }
          this._setEpoch(INACTIVE);
          while (this.inertia) {
            await this.inertia;
          }
        };
      }, "ctx.plugin()");
    } else {
      this.uid = 0;
      this.ctx = this.context = parent;
      this.state = 2;
      this.store = /* @__PURE__ */ Object.create(null);
      this._runner = {
        epoch: "",
        getOuterStack,
        execute: /* @__PURE__ */ __name(() => {
        }, "execute"),
        collect
      };
      this.dispose = () => this.restart();
    }
  }
  parent;
  inject;
  runtime;
  static {
    __name(this, "Fiber");
  }
  uid;
  ctx;
  config;
  state = 0;
  dispose;
  store;
  inertia;
  _hooks = /* @__PURE__ */ Object.create(null);
  _disposables = new DisposableList();
  // Same as `this.ctx`, but with a more specific type.
  context;
  _error;
  _runner;
  _store = /* @__PURE__ */ Object.create(null);
  get name() {
    let fiber = this;
    do {
      if (fiber.runtime?.name) return fiber.runtime.name;
      fiber = fiber.parent.fiber;
    } while (fiber !== fiber.parent.fiber);
    return "root";
  }
  assertActive() {
    if (this.uid !== null) return;
    throw new CordisError("INACTIVE_EFFECT");
  }
  _execute(runner) {
    const oldEpoch = runner.epoch;
    return composeError((info) => {
      const safeCollect = /* @__PURE__ */ __name((dispose) => {
        if (typeof dispose === "function") {
          runner.collect(dispose);
        } else if (!isNullable(dispose)) {
          throw new TypeError("Invalid effect");
        }
      }, "safeCollect");
      const effect = runner.execute.call(this);
      if (typeof effect === "function") {
        return runner.collect(effect);
      } else if (isNullable(effect)) {
      } else if (!isObject(effect)) {
        throw new TypeError("Invalid effect");
      } else if ("then" in effect) {
        return effect.then(safeCollect);
      } else if (Symbol.iterator in effect) {
        info.error = new Error();
        const iter = effect[Symbol.iterator]();
        while (true) {
          const result = iter.next();
          safeCollect(result.value);
          if (result.done) return;
        }
      } else if (Symbol.asyncIterator in effect) {
        const iter = effect[Symbol.asyncIterator]();
        return (async () => {
          await Promise.resolve();
          info.error = new Error();
          while (true) {
            if (runner.epoch !== oldEpoch) return;
            const result = await iter.next();
            safeCollect(result.value);
            if (result.done) return;
          }
        })();
      } else {
        throw new TypeError("Invalid effect");
      }
    }, runner.getOuterStack);
  }
  effect(execute, label = "anonymous") {
    this.assertActive();
    const disposables = [];
    const dispose = /* @__PURE__ */ __name(() => {
      let task2;
      for (const dispose2 of disposables.splice(0).reverse()) {
        if (task2) {
          task2 = task2.then(dispose2);
        } else {
          const result = dispose2();
          if (isObject(result) && "then" in result) {
            task2 = result;
          }
        }
      }
      return task2;
    }, "dispose");
    const meta = { label, children: [] };
    const runner = {
      execute,
      epoch: true,
      collect: /* @__PURE__ */ __name((dispose2) => {
        disposables.push(dispose2);
        this._disposables.delete(dispose2);
        if (dispose2[symbols.effect]) {
          meta.children.push(dispose2[symbols.effect]);
        }
      }, "collect"),
      getOuterStack: buildOuterStack()
    };
    let task;
    try {
      task = this._execute(runner);
    } catch (reason) {
      dispose();
      throw reason;
    }
    task?.catch(dispose).catch((error) => this.ctx.logger.error(error));
    const wrapper = defineProperty(() => {
      if (!runner.epoch) return;
      runner.epoch = false;
      return task ? task.then(dispose) : dispose();
    }, symbols.effect, meta);
    const disposeAsync = /* @__PURE__ */ __name(() => {
      if (!runner.epoch) return;
      runner.epoch = false;
      return dispose();
    }, "disposeAsync");
    wrapper.then = async (onFulfilled, onRejected) => {
      return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
    };
    disposables.push(this._disposables.push(wrapper));
    return wrapper;
  }
  getEffects() {
    return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
  }
  _getState() {
    if (this.uid === null) return 4;
    if (this._error) return 3;
    if (this._runner.epoch !== INACTIVE) return 2;
    return 0;
  }
  _updateState(callback) {
    const oldState = this.state;
    this.state = callback() ?? this._getState();
    if (oldState === this.state) return;
    this.context.emit("internal/status", this, oldState);
    if (oldState !== 2 && this.state !== 2) return;
    for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
      const impl = this.ctx.reflect.store[key];
      if (impl.fiber !== this) continue;
      this.ctx.reflect.notify([impl.name]);
    }
  }
  _checkImpl(name) {
    const impl = this.ctx.reflect._getImpl(name, true);
    if (!impl) return delete this._store[name];
    try {
      if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) {
        return delete this._store[name];
      }
    } catch (error) {
      impl.fiber.ctx.logger.error(error);
      return delete this._store[name];
    }
    this._store[name] = impl;
  }
  _refresh() {
    let epoch = false;
    epoch = "";
    for (const name of Object.keys(this.inject)) {
      const impl = this._store[name];
      if (!impl) {
        epoch = INACTIVE;
        break;
      }
      epoch += ":" + impl.fiber.uid;
    }
    this._setEpoch(epoch);
  }
  _setEpoch(epoch) {
    const oldEpoch = this._runner.epoch;
    if (epoch === oldEpoch) return;
    if (this._error) return;
    this._runner.epoch = epoch;
    if (this.inertia) return;
    this._updateState(() => {
      if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
        this.inertia = this._reload();
        return 1;
      } else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  async _reload() {
    this.store = { ...this._store };
    const oldEpoch = this._runner.epoch;
    try {
      await Promise.resolve();
      await this._execute(this._runner);
    } catch (reason) {
      this.ctx.logger.error(reason);
      this._error = reason;
      this._runner.epoch = INACTIVE;
    }
    this._updateState(() => {
      if (this._runner.epoch === oldEpoch) {
        this.inertia = void 0;
      } else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  async _unload() {
    await Promise.all(this._disposables.clear().map(async (dispose) => {
      try {
        await composeError(async (info) => {
          await Promise.resolve();
          info.error = new Error();
          await dispose();
        }, this._runner.getOuterStack);
      } catch (reason) {
        this.ctx.logger.error(reason);
      }
    }));
    this.store = void 0;
    this._updateState(() => {
      if (this._runner.epoch === INACTIVE) {
        this.inertia = void 0;
      } else {
        this.inertia = this._reload();
        return 1;
      }
    });
  }
  async await() {
    while (this.inertia) {
      await this.inertia;
    }
    if (this._error) throw this._error;
    return this;
  }
  async restart() {
    const fiber = this.ctx.fiber;
    fiber.assertActive();
    fiber._setEpoch(INACTIVE);
    fiber._refresh();
    await fiber.await();
  }
  update(config, noSave = false) {
    const fiber = this.ctx.fiber;
    fiber.assertActive();
    config = resolveConfig(fiber.runtime, config);
    const result = fiber.context.waterfall(fiber, "internal/update", config, noSave, () => {
      fiber.config = config;
      fiber._error = void 0;
      return fiber.restart();
    });
    if (result === void 0) return;
    const task = Promise.resolve(result);
    task.catch(() => {
    });
    return task;
  }
};
function enhanceError(error) {
  const lines = error.stack.split("\n");
  lines.splice(0, 2, `Error: ${error.message}`);
  error.stack = lines.join("\n");
  return error;
}
__name(enhanceError, "enhanceError");
var RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
  return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
__name(isSpecialProperty, "isSpecialProperty");
var ReflectService = class {
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.mixin("reflect", ["get", "set", "provide", "accessor", "mixin"]);
    this.mixin("fiber", ["runtime", "effect"]);
    this.mixin("registry", ["inject", "plugin"]);
    this.mixin("events", ["on", "once", "parallel", "emit", "serial", "bail", "waterfall"]);
  }
  ctx;
  static {
    __name(this, "ReflectService");
  }
  static handler = {
    get: /* @__PURE__ */ __name((target, prop, ctx) => {
      if (isSpecialProperty(prop)) {
        return Reflect.get(target, prop, ctx);
      }
      if (Reflect.has(target, prop)) {
        return getTraceable(ctx, Reflect.get(target, prop, ctx));
      }
      const error = new Error(`cannot get property "${prop}" without inject`);
      try {
        const def = target.reflect.props[prop];
        if (def?.type === "accessor") {
          return def.get.call(ctx, ctx[symbols.receiver], error);
        }
        const defSite = ctx[symbols.shadow] ?? ctx;
        if (!defSite.fiber.runtime) return ctx.reflect.get(prop, false);
        return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
          const key = target[symbols.isolate][prop];
          let fiber = defSite.fiber;
          while (true) {
            const impl = fiber.store?.[prop];
            if (impl) return getTraceable(ctx, impl.value);
            if (prop in fiber.inject) {
              error.message = `cannot get required service "${prop}" in inactive context`;
              throw error;
            }
            if (!fiber.runtime) throw error;
            if (fiber.parent[symbols.isolate][prop] !== key) throw error;
            fiber = fiber.parent.fiber;
          }
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    }, "get"),
    set: /* @__PURE__ */ __name((target, prop, value, ctx) => {
      if (isSpecialProperty(prop)) {
        return Reflect.set(target, prop, value, ctx);
      }
      const error = new Error(`cannot set property "${prop}" without provide`);
      const def = target.reflect.props[prop];
      if (!def) {
        if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
        throw enhanceError(error);
      }
      try {
        if (def.type === "accessor") {
          if (!def.set) return false;
          return def.set.call(ctx, value, ctx[symbols.receiver], error);
        }
        return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
          return ctx.reflect.set(prop, value, error);
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    }, "set"),
    has: /* @__PURE__ */ __name((target, prop) => {
      if (isSpecialProperty(prop)) {
        return Reflect.has(target, prop);
      }
      if (Reflect.has(target, prop)) return true;
      return !!target.reflect.props[prop];
    }, "has")
  };
  store = /* @__PURE__ */ Object.create(null);
  props = /* @__PURE__ */ Object.create(null);
  get(name, strict = true) {
    return getTraceable(this.ctx, this._getImpl(name, strict)?.value);
  }
  _getImpl(name, strict = true) {
    const key = this.ctx[symbols.isolate][name];
    const impl = key && this.store[key];
    if (!impl) return;
    if (strict && impl.fiber.state !== 2) return;
    return impl;
  }
  set(name, value, error) {
    const key = this.ctx[symbols.isolate][name];
    const impl = this.store[key];
    if (!impl) {
      throw new Error(`cannot set property "${name}" without provide`);
    }
    if (impl.fiber !== this.ctx.fiber) {
      throw new Error(`cannot set property "${name}" in multiple fibers`);
    }
    impl.value = value;
    return true;
  }
  provide(name, value, check) {
    return this.ctx.fiber.effect(() => {
      if (!this.props[name]) {
        this.props[name] ??= { type: "service" };
      } else if (this.props[name].type !== "service") {
        throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
      }
      this.props[name] = { type: "service" };
      this.ctx.root[symbols.isolate][name] ??= Symbol(name);
      const key = this.ctx[symbols.isolate][name];
      const impl = { name, value, fiber: this.ctx.fiber, check };
      if (this.store[key]) {
        throw new Error(`service "${name}" has been registered at <${this.store[key].fiber.name}>`);
      }
      this.store[key] = impl;
      this.ctx.fiber.store[name] = impl;
      if (this.ctx.fiber.state === 2) {
        this.notify([name]);
      }
      return async () => {
        delete this.store[key];
        const fibers = this.notify([name]);
        await Promise.allSettled(fibers.map((fiber) => fiber.await()));
        delete this.ctx.fiber.store[name];
      };
    }, `ctx.provide(${JSON.stringify(name)})`);
  }
  notify(names, filter = (ctx, name) => ctx[symbols.isolate][name] === this.ctx[symbols.isolate][name]) {
    const fibers = [];
    for (const runtime of this.ctx.registry.values()) {
      for (const fiber of runtime.fibers) {
        let hasUpdate = false;
        for (const name of names) {
          if (!(name in fiber.inject)) continue;
          if (!filter(fiber.ctx, name)) continue;
          hasUpdate = true;
          fiber._checkImpl(name);
        }
        if (!hasUpdate) continue;
        fiber._refresh();
        fibers.push(fiber);
      }
    }
    for (const name of names) {
      const self = Object.create(this.ctx);
      self[symbols.filter] = (target) => filter(target, name);
      this.ctx.events.emit(self, "internal/service", name, this._getImpl(name, false)?.value);
    }
    return fibers;
  }
  accessor(name, options) {
    return this.ctx.fiber.effect(() => {
      if (name in this.props) {
        throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
      }
      this.props[name] = { type: "accessor", ...options };
      return () => delete this.props[name];
    }, `ctx.accessor(${JSON.stringify(name)})`);
  }
  mixin(source, mixins) {
    const self = this;
    return this.ctx.fiber.effect(function* () {
      const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
      const getTarget = /* @__PURE__ */ __name((ctx, error) => {
        return ctx[source];
      }, "getTarget");
      for (const [key, value] of entries) {
        yield self.accessor(value, {
          get(receiver, error) {
            const service = getTarget(this, error);
            if (isNullable(service)) return service;
            const mixin = receiver ? withProps(receiver, service) : service;
            const value2 = Reflect.get(service, key, mixin);
            if (typeof value2 !== "function") return value2;
            return value2.bind(mixin ?? service);
          },
          set(value2, receiver, error) {
            const service = getTarget(this, error);
            const mixin = receiver ? withProps(receiver, service) : service;
            return Reflect.set(service, key, value2, mixin);
          }
        });
      }
    }, `ctx.mixin(${JSON.stringify(source)})`);
  }
  trace(value) {
    return getTraceable(this.ctx, value);
  }
  bind(callback) {
    return new Proxy(callback, {
      apply: /* @__PURE__ */ __name((target, thisArg, args) => {
        return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
      }, "apply"),
      construct: /* @__PURE__ */ __name((target, args, newTarget) => {
        return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
      }, "construct")
    });
  }
};
function isApplicable(object) {
  return object && typeof object === "object" && typeof object.apply === "function";
}
__name(isApplicable, "isApplicable");
function Inject(name, config) {
  return function(value, decorator) {
    if (decorator.kind === "class") {
      if (!Object.hasOwn(value, "inject")) {
        defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
        defineProperty(value.inject, symbols.checkProto, true);
      }
      value.inject[name] = config;
    } else if (decorator.kind === "method") {
      const inject = (value[symbols.metadata] ??= {}).inject ??= /* @__PURE__ */ Object.create(null);
      inject[name] = config;
      decorator.addInitializer(function() {
        const property = this[symbols.tracker]?.property;
        (this[symbols.initHooks] ??= []).push(() => {
          this.ctx.inject(inject, (ctx) => {
            return value.call(property ? withProps(this, { [property]: ctx }) : this);
          });
        });
      });
    } else {
      throw new Error("@Inject() can only be used on class or class methods");
    }
  };
}
__name(Inject, "Inject");
((Inject2) => {
  function resolve(inject, result = /* @__PURE__ */ Object.create(null)) {
    if (!inject) return result;
    if (Array.isArray(inject)) {
      for (const name of inject) {
        result[name] = null;
      }
    } else if (Reflect.has(inject, symbols.checkProto)) {
      Object.assign(result, resolve(Object.getPrototypeOf(inject)));
      for (const name of Object.keys(inject)) {
        result[name] = inject[name] ?? null;
      }
    } else {
      for (const name of Object.keys(inject)) {
        result[name] = inject[name] ?? null;
      }
    }
    return result;
  }
  Inject2.resolve = resolve;
  __name(resolve, "resolve");
})(Inject || (Inject = {}));
var RegistryService = class {
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
  }
  ctx;
  static {
    __name(this, "RegistryService");
  }
  _counter = 0;
  _internal = /* @__PURE__ */ new Map();
  get counter() {
    return ++this._counter;
  }
  get size() {
    return this._internal.size;
  }
  resolve(plugin) {
    try {
      if (typeof plugin === "function") return plugin;
      if (isApplicable(plugin)) return plugin.apply;
    } catch {
    }
  }
  get(plugin) {
    const key = this.resolve(plugin);
    return key && this._internal.get(key);
  }
  has(plugin) {
    const key = this.resolve(plugin);
    return !!key && this._internal.has(key);
  }
  delete(plugin) {
    const key = this.resolve(plugin);
    const runtime = key && this._internal.get(key);
    if (!runtime) return;
    this._internal.delete(key);
    for (const fiber of runtime.fibers) {
      fiber.dispose();
    }
    return runtime;
  }
  keys() {
    return this._internal.keys();
  }
  values() {
    return this._internal.values();
  }
  entries() {
    return this._internal.entries();
  }
  forEach(callback) {
    return this._internal.forEach(callback);
  }
  inject(inject, callback) {
    return this.plugin({ inject, apply: callback, name: callback.name });
  }
  plugin(plugin, config, getOuterStack = buildOuterStack()) {
    const callback = this.resolve(plugin);
    if (!callback) throw new Error('invalid plugin, expect function or object with an "apply" method, received ' + typeof plugin);
    this.ctx.fiber.assertActive();
    let runtime = this._internal.get(callback);
    if (!runtime) {
      let name = plugin.name;
      if (name === "apply") name = void 0;
      runtime = { name, callback, fibers: new DisposableList(), Config: plugin.Config };
      this._internal.set(callback, runtime);
    }
    const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
    const wrapped = Object.create(fiber);
    wrapped.then = (onFulfilled, onRejected) => {
      return fiber.await().then(onFulfilled, onRejected);
    };
    return wrapped;
  }
};
var Context = class _Context {
  static {
    __name(this, "Context");
  }
  static effect = symbols.effect;
  static filter = symbols.filter;
  static isolate = symbols.isolate;
  static intercept = symbols.intercept;
  static is(value) {
    return !!value?.[_Context.is];
  }
  static {
    _Context.is[Symbol.toPrimitive] = () => /* @__PURE__ */ Symbol.for("cordis.is");
    _Context.prototype[_Context.is] = true;
  }
  constructor() {
    this[symbols.isolate] = /* @__PURE__ */ Object.create(null);
    this[symbols.intercept] = /* @__PURE__ */ Object.create(null);
    const self = new Proxy(this, ReflectService.handler);
    this.root = self;
    this.baseUrl = void 0;
    this.fiber = new Fiber(self, {}, /* @__PURE__ */ Object.create(null), null, () => []);
    this.reflect = new ReflectService(self);
    this.registry = new RegistryService(self);
    this.events = new EventsService(self);
    this.logger = new LoggerService(self);
    this.fiber._disposables.clear();
    return self;
  }
  [/* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom")]() {
    return `Context <${this.fiber.name}>`;
  }
  extend(meta = {}) {
    const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
    const self = Object.create(getTraceable(this, this));
    for (const prop of Reflect.ownKeys(meta)) {
      Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
    }
    if (!shadow) return self;
    return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
  }
  isolate(name, label) {
    const shadow = Object.create(this[symbols.isolate]);
    shadow[name] = label ?? Symbol(name);
    return this.extend({ [symbols.isolate]: shadow });
  }
  intercept(name, config) {
    const intercept = Object.create(this[symbols.intercept]);
    intercept[name] = config;
    return this.extend({ [symbols.intercept]: intercept });
  }
};
var Service = class _Service {
  constructor(ctx, name) {
    this.ctx = ctx;
    name ??= this.constructor["provide"];
    let self = this;
    const tracker = {
      associate: name,
      property: "ctx"
    };
    if (self[symbols.invoke]) {
      self = createCallable(name, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    }
    self.ctx = ctx;
    self.name = name;
    defineProperty(self, symbols.tracker, tracker);
    self.ctx.reflect.provide(name, self, this[symbols.check]);
    return self;
  }
  ctx;
  static {
    __name(this, "Service");
  }
  static init = symbols.init;
  static check = symbols.check;
  static config = symbols.config;
  static invoke = symbols.invoke;
  static extend = symbols.extend;
  static tracker = symbols.tracker;
  static resolveConfig = symbols.resolveConfig;
  name;
  [symbols.filter](ctx) {
    return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
  }
  [symbols.extend](props) {
    let self;
    if (this[_Service.invoke]) {
      self = createCallable(this.name, this, this[symbols.tracker]);
    } else {
      self = Object.create(this);
    }
    return Object.assign(self, props);
  }
  [symbols.resolveConfig](base, head) {
    let intercept = this.ctx[Context.intercept];
    const configs = [];
    while (this.name in intercept) {
      if (Object.hasOwn(intercept, this.name)) {
        configs.unshift(intercept[this.name]);
      }
      intercept = Object.getPrototypeOf(intercept);
    }
    if (base) configs.unshift(base);
    if (head) configs.push(head);
    if (this["Config"]?.merge) {
      return this["Config"].merge(...configs);
    } else {
      return Object.assign({}, ...configs);
    }
  }
  static [Symbol.hasInstance](instance) {
    if (!instance) return false;
    let constructor = instance.constructor;
    while (constructor) {
      constructor = constructor.prototype?.constructor;
      if (constructor === this) return true;
      constructor &&= Object.getPrototypeOf(constructor);
    }
    return false;
  }
};

// public/js/fibers/fiber-lifecycle.js
var DisposableList2 = class {
  constructor() {
    this._disposables = [];
  }
  push(fn) {
    if (typeof fn !== "function" && (!fn || typeof fn.dispose !== "function")) {
      throw new TypeError("Disposable must be a function or an object with a dispose() method");
    }
    this._disposables.push(fn);
  }
  async unwind() {
    while (this._disposables.length > 0) {
      const d = this._disposables.pop();
      try {
        if (typeof d === "function") {
          await d();
        } else if (typeof d.dispose === "function") {
          await d.dispose();
        }
      } catch (e) {
        console.warn("[FiberLifecycle] Error during disposable unwind:", e);
      }
    }
  }
  get size() {
    return this._disposables.length;
  }
  get length() {
    return this._disposables.length;
  }
  dispose() {
    return this.unwind();
  }
};
var FiberLifecycle = class {
  constructor(id, options = {}) {
    this.id = id;
    this.coeffects = {
      requiredServices: options.requiredServices ?? [],
      requiredCapabilities: options.requiredCapabilities ?? []
    };
    this.state = "pending";
    this.listeners = [];
    this._disposables = new DisposableList2();
    this.guard = { disposables: new DisposableList2() };
  }
  get disposables() {
    return this._disposables;
  }
  onTransition(fn) {
    if (typeof fn === "function") {
      this.listeners.push(fn);
    }
  }
  _transition(to) {
    const from = this.state;
    this.state = to;
    for (const fn of this.listeners) {
      try {
        fn({ from, to, timestamp: Date.now() });
      } catch (e) {
        console.warn("[FiberLifecycle] Transition listener error:", e);
      }
    }
  }
  async load(fn, opts = {}) {
    this._transition("loading");
    try {
      if (this.coeffects?.requiredServices?.length > 0) {
        if (!opts?.ctx) {
          throw new Error(
            `FiberLifecycle [${this.id}]: Cordis Context required to resolve coeffects: ${this.coeffects.requiredServices.join(", ")}`
          );
        }
      }
      if (fn) await fn(this.guard);
      this._transition("loaded");
    } catch (err) {
      this._transition("error");
      await this.guard.disposables.unwind();
      throw err;
    }
  }
  async activate(fn) {
    this._transition("active");
    try {
      if (fn) await fn();
    } catch (err) {
      this._transition("error");
      await this._disposables.unwind();
      throw err;
    }
  }
  async unload() {
    this._transition("unloading");
    await this._disposables.unwind();
    this._transition("disposed");
  }
};
export {
  CardCollection,
  ContentHash,
  ContentTypeInterpreter,
  Context,
  FiberLifecycle,
  GTime,
  HandleValidationError,
  IndexedDBBackend as IndexedDBEngine,
  MCard,
  MCardCollection,
  Service,
  classifyClm,
  detectMime,
  validateHandle
};
