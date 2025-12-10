// node_modules/mcard-js/dist/hash/HashValidator.js
var HashValidator = class {
  /**
   * Compute hash of content using specified algorithm
   */
  static async computeHash(content, algorithm = "sha256") {
    const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
    let algoName = "SHA-256";
    switch (algorithm.toLowerCase()) {
      case "sha1":
        algoName = "SHA-1";
        break;
      case "sha-1":
        algoName = "SHA-1";
        break;
      case "sha256":
        algoName = "SHA-256";
        break;
      case "sha-256":
        algoName = "SHA-256";
        break;
      case "sha384":
        algoName = "SHA-384";
        break;
      case "sha-384":
        algoName = "SHA-384";
        break;
      case "sha512":
        algoName = "SHA-512";
        break;
      case "sha-512":
        algoName = "SHA-512";
        break;
      default:
        console.warn(`Algorithm ${algorithm} not natively supported or mapped, defaulting to SHA-256`);
        algoName = "SHA-256";
    }
    const buffer = new Uint8Array(data).buffer;
    const hashBuffer = await crypto.subtle.digest(algoName, buffer);
    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  /**
   * Validate that content matches expected hash
   */
  static async validate(content, expectedHash) {
    const computedHash = await this.computeHash(content);
    return computedHash === expectedHash;
  }
};

// node_modules/mcard-js/dist/model/GTime.js
var VALID_HASH_ALGORITHMS = ["md5", "sha1", "sha224", "sha256", "sha384", "sha512"];
var GTime = class {
  static DEFAULT_ALGORITHM = "sha256";
  /**
   * Generate a GTime stamp for the current moment
   * Format: HASH_ALGO|TIMESTAMP|REGION_CODE
   */
  static stampNow(hashAlgorithm = this.DEFAULT_ALGORITHM) {
    const algo = hashAlgorithm.toLowerCase();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const region = "UTC";
    return `${algo}|${timestamp}|${region}`;
  }
  /**
   * Parse a GTime string
   */
  static parse(gtime) {
    const parts = gtime.split("|");
    if (parts.length !== 3) {
      throw new Error(`Invalid GTime format: ${gtime}`);
    }
    return {
      algorithm: parts[0],
      timestamp: new Date(parts[1]),
      region: parts[2]
    };
  }
  /**
   * Get the hash algorithm from a GTime string
   */
  static getHashAlgorithm(gtime) {
    return this.parse(gtime).algorithm;
  }
  /**
   * Get the timestamp from a GTime string
   */
  static getTimestamp(gtime) {
    return this.parse(gtime).timestamp;
  }
  /**
   * Get the region code from a GTime string
   */
  static getRegionCode(gtime) {
    return this.parse(gtime).region;
  }
  /**
   * Check if the provided hash function is valid.
   * Matches Python's GTime.is_valid_hash_function()
   */
  static isValidHashFunction(hashFunction) {
    if (!hashFunction || typeof hashFunction !== "string") {
      return false;
    }
    return VALID_HASH_ALGORITHMS.includes(hashFunction.toLowerCase());
  }
  /**
   * Check if the provided region code is valid.
   * Matches Python's GTime.is_valid_region_code()
   */
  static isValidRegionCode(regionCode) {
    return Boolean(regionCode && regionCode === regionCode.toUpperCase());
  }
  /**
   * Check if the provided timestamp is in ISO format.
   * Matches Python's GTime.is_iso_format()
   */
  static isIsoFormat(timestamp) {
    if (!timestamp || typeof timestamp !== "string") {
      return false;
    }
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return false;
      }
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      return isoPattern.test(timestamp);
    } catch {
      return false;
    }
  }
};

// node_modules/mcard-js/dist/model/detectors/ContentTypeInterpreter.js
var ContentTypeInterpreter = class {
  /**
   * Detect content type from Uint8Array content
   */
  static detect(content) {
    const scanLength = Math.min(content.length, 1024);
    for (let i = 0; i < scanLength; i++) {
      if (content[i] === 0)
        return "application/octet-stream";
    }
    try {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      const text = decoder.decode(content);
      if (this.isJson(text))
        return "application/json";
      return "text/plain";
    } catch (e) {
      return "application/octet-stream";
    }
  }
  static isJson(text) {
    const trimmed = text.trim();
    if (!trimmed)
      return false;
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if (first === "{" && last === "}" || first === "[" && last === "]") {
      try {
        JSON.parse(text);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};

// node_modules/mcard-js/dist/model/MCard.js
var MCard = class _MCard {
  content;
  hash;
  g_time;
  contentType;
  // Defaulting to specific string or null
  hashFunction;
  constructor(content, hash, g_time, contentType, hashFunction) {
    this.content = content;
    this.hash = hash;
    this.g_time = g_time;
    this.contentType = contentType;
    this.hashFunction = hashFunction;
  }
  /**
   * Create a new MCard from content
   */
  static async create(content, hashAlgorithm = "sha256") {
    if (content === null || content === void 0) {
      throw new Error("Content cannot be null or undefined");
    }
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
    if (bytes.length === 0) {
      throw new Error("Content cannot be empty");
    }
    const hash = await HashValidator.computeHash(bytes, hashAlgorithm);
    const g_time = GTime.stampNow(hashAlgorithm);
    const contentType = ContentTypeInterpreter.detect(bytes);
    return new _MCard(bytes, hash, g_time, contentType, hashAlgorithm);
  }
  /**
   * Create an MCard from existing data (e.g., from database)
   */
  static fromData(content, hash, g_time) {
    const alg = GTime.getHashAlgorithm(g_time);
    const contentType = ContentTypeInterpreter.detect(content);
    return new _MCard(content, hash, g_time, contentType, alg);
  }
  /**
   * Get content as text (UTF-8 decoded)
   */
  getContentAsText() {
    return new TextDecoder().decode(this.content);
  }
  /**
   * Get content as raw bytes
   */
  getContent() {
    return this.content;
  }
  /**
   * Convert to plain object
   */
  toObject() {
    return {
      hash: this.hash,
      content: this.getContentAsText(),
      g_time: this.g_time,
      contentType: this.contentType,
      hashFunction: this.hashFunction
    };
  }
};

// node_modules/idb/build/wrap-idb-value.js
var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
var idbProxyableTypes;
var cursorAdvanceMethods;
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBDatabase,
    IDBObjectStore,
    IDBIndex,
    IDBCursor,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = [
    IDBCursor.prototype.advance,
    IDBCursor.prototype.continue,
    IDBCursor.prototype.continuePrimaryKey
  ]);
}
var cursorRequestMap = /* @__PURE__ */ new WeakMap();
var transactionDoneMap = /* @__PURE__ */ new WeakMap();
var transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
var transformCache = /* @__PURE__ */ new WeakMap();
var reverseTransformCache = /* @__PURE__ */ new WeakMap();
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  promise.then((value) => {
    if (value instanceof IDBCursor) {
      cursorRequestMap.set(value, request);
    }
  }).catch(() => {
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
var idbProxyTraps = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      if (prop === "done")
        return transactionDoneMap.get(target);
      if (prop === "objectStoreNames") {
        return target.objectStoreNames || transactionStoreNamesMap.get(target);
      }
      if (prop === "store") {
        return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
      }
    }
    return wrap(target[prop]);
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
      return true;
    }
    return prop in target;
  }
};
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
    return function(storeNames, ...args) {
      const tx = func.call(unwrap(this), storeNames, ...args);
      transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
      return wrap(tx);
    };
  }
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(cursorRequestMap.get(this));
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
var unwrap = (value) => reverseTransformCache.get(value);

// node_modules/idb/build/index.js
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
  const request = indexedDB.open(name, version);
  const openPromise = wrap(request);
  if (upgrade) {
    request.addEventListener("upgradeneeded", (event) => {
      upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
    });
  }
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event.newVersion,
      event
    ));
  }
  openPromise.then((db) => {
    if (terminated)
      db.addEventListener("close", () => terminated());
    if (blocking) {
      db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
    }
  }).catch(() => {
  });
  return openPromise;
}
var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
var writeMethods = ["put", "add", "delete", "clear"];
var cachedMethods = /* @__PURE__ */ new Map();
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods.get(prop))
    return cachedMethods.get(prop);
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  cachedMethods.set(prop, method);
  return method;
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
}));

// node_modules/mcard-js/dist/model/Handle.js
var MAX_HANDLE_LENGTH = 63;
function isValidStartChar(char) {
  return /^\p{L}$/u.test(char);
}
function isValidBodyChar(char) {
  return /^[\p{L}\p{N}_-]$/u.test(char);
}
var HandleValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "HandleValidationError";
  }
};
function validateHandle(handle) {
  if (!handle) {
    throw new HandleValidationError("Handle cannot be empty.");
  }
  const normalized = handle.trim().normalize("NFC").toLowerCase();
  if (normalized.length === 0) {
    throw new HandleValidationError("Handle cannot be empty after normalization.");
  }
  if (normalized.length > MAX_HANDLE_LENGTH) {
    throw new HandleValidationError(`Handle '${handle}' is too long (${normalized.length} chars). Maximum is ${MAX_HANDLE_LENGTH}.`);
  }
  if (!isValidStartChar(normalized[0])) {
    throw new HandleValidationError(`Invalid handle '${handle}'. Must start with a letter (any language).`);
  }
  for (let i = 1; i < normalized.length; i++) {
    if (!isValidBodyChar(normalized[i])) {
      throw new HandleValidationError(`Invalid character '${normalized[i]}' at position ${i} in handle '${handle}'.`);
    }
  }
  return normalized;
}

// node_modules/mcard-js/dist/storage/IndexedDBEngine.js
var IndexedDBEngine = class {
  db = null;
  dbName;
  constructor(dbName = "mcard-db") {
    this.dbName = dbName;
  }
  /**
   * Initialize the database connection
   */
  async init() {
    this.db = await openDB(this.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cards")) {
          db.createObjectStore("cards", { keyPath: "hash" });
        }
        if (!db.objectStoreNames.contains("handles")) {
          const handleStore = db.createObjectStore("handles", { keyPath: "handle" });
          handleStore.createIndex("by-hash", "currentHash");
        }
        if (!db.objectStoreNames.contains("handleHistory")) {
          const historyStore = db.createObjectStore("handleHistory", {
            keyPath: "id",
            autoIncrement: true
          });
          historyStore.createIndex("by-handle", "handle");
        }
      }
    });
  }
  ensureDb() {
    if (!this.db) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.db;
  }
  // =========== Card Operations ===========
  async add(card) {
    const db = this.ensureDb();
    await db.put("cards", {
      hash: card.hash,
      content: card.content,
      g_time: card.g_time
    });
    return card.hash;
  }
  async get(hash) {
    const db = this.ensureDb();
    const record = await db.get("cards", hash);
    if (!record)
      return null;
    return MCard.fromData(record.content, record.hash, record.g_time);
  }
  async delete(hash) {
    const db = this.ensureDb();
    await db.delete("cards", hash);
  }
  async getPage(pageNumber, pageSize) {
    const db = this.ensureDb();
    const totalItems = await db.count("cards");
    const totalPages = Math.ceil(totalItems / pageSize);
    const allCards = await db.getAll("cards");
    const start = (pageNumber - 1) * pageSize;
    const pageRecords = allCards.slice(start, start + pageSize);
    const items = pageRecords.map((r) => MCard.fromData(r.content, r.hash, r.g_time));
    return {
      items,
      totalItems,
      pageNumber,
      pageSize,
      totalPages,
      hasNext: pageNumber < totalPages,
      hasPrevious: pageNumber > 1
    };
  }
  async count() {
    const db = this.ensureDb();
    return db.count("cards");
  }
  async searchByHash(hashPrefix) {
    const db = this.ensureDb();
    const start = hashPrefix;
    const end = hashPrefix + "\uFFFF";
    const range = IDBKeyRange.bound(start, end);
    const records = await db.getAll("cards", range);
    return records.map((r) => MCard.fromData(r.content, r.hash, r.g_time));
  }
  async search(query, pageNumber, pageSize) {
    const db = this.ensureDb();
    const records = await db.getAll("cards");
    const decoder = new TextDecoder();
    const filtered = records.filter((r) => {
      try {
        const text = decoder.decode(r.content);
        return text.includes(query);
      } catch {
        return false;
      }
    });
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const start = (pageNumber - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize).map((r) => MCard.fromData(r.content, r.hash, r.g_time));
    return {
      items: pageItems,
      totalItems,
      pageNumber,
      pageSize,
      totalPages,
      hasNext: pageNumber < totalPages,
      hasPrevious: pageNumber > 1
    };
  }
  async getAll() {
    const db = this.ensureDb();
    const records = await db.getAll("cards");
    return records.map((r) => MCard.fromData(r.content, r.hash, r.g_time));
  }
  async clear() {
    const db = this.ensureDb();
    await db.clear("cards");
    await db.clear("handles");
    await db.clear("handleHistory");
  }
  // =========== Handle Operations ===========
  async registerHandle(handle, hash) {
    const db = this.ensureDb();
    const normalized = validateHandle(handle);
    const existing = await db.get("handles", normalized);
    if (existing) {
      throw new Error(`Handle '${handle}' already exists.`);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.put("handles", {
      handle: normalized,
      currentHash: hash,
      createdAt: now,
      updatedAt: now
    });
  }
  async resolveHandle(handle) {
    const db = this.ensureDb();
    const normalized = validateHandle(handle);
    const record = await db.get("handles", normalized);
    return record?.currentHash ?? null;
  }
  async getByHandle(handle) {
    const hash = await this.resolveHandle(handle);
    if (!hash)
      return null;
    return this.get(hash);
  }
  async updateHandle(handle, newHash) {
    const db = this.ensureDb();
    const normalized = validateHandle(handle);
    const existing = await db.get("handles", normalized);
    if (!existing) {
      throw new Error(`Handle '${handle}' not found.`);
    }
    const previousHash = existing.currentHash;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await db.add("handleHistory", {
      handle: normalized,
      previousHash,
      changedAt: now
    });
    await db.put("handles", {
      ...existing,
      currentHash: newHash,
      updatedAt: now
    });
    return previousHash;
  }
  async getHandleHistory(handle) {
    const db = this.ensureDb();
    const normalized = validateHandle(handle);
    const records = await db.getAllFromIndex("handleHistory", "by-handle", normalized);
    return records.map((r) => ({ previousHash: r.previousHash, changedAt: r.changedAt })).reverse();
  }
};
export {
  ContentTypeInterpreter,
  GTime,
  HashValidator,
  IndexedDBEngine,
  MCard
};
//# sourceMappingURL=mcard-js.bundle.js.map
