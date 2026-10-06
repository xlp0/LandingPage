/**
 * IndexedDB StorageBackend for the published clm-kernel (INV-CDO-33).
 *
 * The kernel's `StorageBackend` interface is synchronous, while IndexedDB is
 * asynchronous. This backend therefore keeps an in-memory mirror as the read
 * path and write-throughs to IndexedDB; `init()` hydrates the mirror from disk.
 * It replaces the former `IndexedDBEngine` from the removed mcard-js package.
 */
import { MCard, ContentHash, Handle } from 'clm-kernel';

const DB_NAME_DEFAULT = 'mcard-storage';
const DB_VERSION = 1;
const STORE_CARDS = 'cards';
const STORE_HANDLES = 'handles';
const STORE_HISTORY = 'handle_history';

export class IndexedDBBackend {
  constructor(dbName = DB_NAME_DEFAULT) {
    this.dbName = dbName;
    this.db = null;
    this.cards = new Map(); // hash hex -> MCard
    this.handles = new Map(); // handle string -> hash hex (latest)
    this.history = new Map(); // handle string -> [hash hex, ...]
  }

  static get available() {
    return typeof indexedDB !== 'undefined';
  }

  async init() {
    if (!IndexedDBBackend.available) {
      console.warn('[IndexedDBBackend] IndexedDB unavailable — running memory-only.');
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
      this._readAll(STORE_HISTORY),
    ]);
    for (const [hash, json] of cards) {
      try {
        this.cards.set(hash, MCard.fromJSON(json));
      } catch (e) {
        console.warn('[IndexedDBBackend] skipping unreadable card', hash, e.message);
      }
    }
    for (const [handle, hash] of handles) this.handles.set(handle, hash);
    for (const [handle, list] of history) this.history.set(handle, list);
  }

  _readAll(store) {
    return new Promise((resolve) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction(store, 'readonly');
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
      const tx = this.db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
    } catch (e) {
      console.warn('[IndexedDBBackend] write failed', store, key, e.message);
    }
  }

  _remove(store, key) {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
    } catch (e) {
      console.warn('[IndexedDBBackend] delete failed', store, key, e.message);
    }
  }

  // ── StorageBackend interface ────────────────────────────────────────────
  put(hash, mcard) {
    const hex = typeof hash === 'string' ? hash : hash.asHex();
    if (this.cards.has(hex)) return false;
    this.cards.set(hex, mcard);
    this._write(STORE_CARDS, hex, mcard.toJSON());
    return true;
  }

  get(hash) {
    const hex = typeof hash === 'string' ? hash : hash.asHex();
    return this.cards.get(hex);
  }

  has(hash) {
    const hex = typeof hash === 'string' ? hash : hash.asHex();
    return this.cards.has(hex);
  }

  list() {
    return Array.from(this.cards.values());
  }

  count() {
    return this.cards.size;
  }

  registerHandle(handle, hash) {
    const h = typeof handle === 'string' ? handle : handle.asString();
    const hex = typeof hash === 'string' ? hash : hash.asHex();
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
    const h = typeof handle === 'string' ? handle : handle.asString();
    const hex = this.handles.get(h);
    return hex ? ContentHash.fromHex(hex) : undefined;
  }

  handleHistory(handle) {
    const h = typeof handle === 'string' ? handle : handle.asString();
    return (this.history.get(h) ?? []).map((hex) => ContentHash.fromHex(hex));
  }

  snapshot() {
    return {
      cards: new Map(this.cards),
      handles: new Map(this.handles),
      history: new Map(Array.from(this.history, ([k, v]) => [k, [...v]])),
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
    } catch { /* already closed */ }
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
      pageSize: Number(pageSize),
    };
  }

  /** Find cards whose hash begins with a prefix. */
  searchByHash(prefix) {
    const p = String(prefix ?? '');
    return this.list().filter((c) => c.hash.asHex().startsWith(p));
  }

  /**
   * Tombstone instead of delete (INV-REF-03: the card table is append-only).
   * The handle mapping is dropped so the card is no longer reachable, while the
   * content-addressable record itself is preserved.
   */
  delete(hash) {
    const hex = typeof hash === 'string' ? hash : hash.asHex();
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
}

export { ContentHash, Handle };
