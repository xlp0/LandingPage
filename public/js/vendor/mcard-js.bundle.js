var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/mcard-js/dist/hash/HashValidator.js
var HashValidator;
var init_HashValidator = __esm({
  "node_modules/mcard-js/dist/hash/HashValidator.js"() {
    HashValidator = class {
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
  }
});

// node_modules/mcard-js/dist/model/GTime.js
var VALID_HASH_ALGORITHMS, GTime;
var init_GTime = __esm({
  "node_modules/mcard-js/dist/model/GTime.js"() {
    VALID_HASH_ALGORITHMS = ["md5", "sha1", "sha224", "sha256", "sha384", "sha512"];
    GTime = class {
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
  }
});

// node_modules/mcard-js/dist/model/constants.js
var EVENT_CONSTANTS, ALGORITHM_HIERARCHY;
var init_constants = __esm({
  "node_modules/mcard-js/dist/model/constants.js"() {
    EVENT_CONSTANTS = {
      TYPE: "type",
      HASH: "hash",
      FIRST_G_TIME: "first_g_time",
      CONTENT_SIZE: "content_size",
      COLLISION_TIME: "collision_time",
      UPGRADED_FUNCTION: "upgraded_function",
      UPGRADED_HASH: "upgraded_hash",
      DUPLICATE_TIME: "duplicate_time",
      DUPLICATE_EVENT_TYPE: "duplicate",
      COLLISION_EVENT_TYPE: "collision"
    };
    ALGORITHM_HIERARCHY = {
      "sha1": { strength: 1, next: "sha224" },
      "sha224": { strength: 2, next: "sha256" },
      "sha256": { strength: 3, next: "sha384" },
      "sha384": { strength: 4, next: "sha512" },
      "sha512": { strength: 5, next: "custom" },
      "custom": { strength: 6, next: null }
    };
  }
});

// node_modules/mcard-js/dist/model/EventProducer.js
var EventProducer_exports = {};
__export(EventProducer_exports, {
  generateCollisionEvent: () => generateCollisionEvent,
  generateDuplicationEvent: () => generateDuplicationEvent
});
async function generateCollisionEvent(card) {
  const currentHashFunction = GTime.getHashAlgorithm(card.g_time);
  const nextAlgo = nextHashFunction(currentHashFunction);
  const upgradedHash = await HashValidator.computeHash(card.content, nextAlgo);
  const event = {
    [EVENT_CONSTANTS.TYPE]: EVENT_CONSTANTS.COLLISION_EVENT_TYPE,
    [EVENT_CONSTANTS.HASH]: card.hash,
    [EVENT_CONSTANTS.FIRST_G_TIME]: card.g_time,
    [EVENT_CONSTANTS.COLLISION_TIME]: card.g_time,
    // Using original card's time as per Python logic reference
    [EVENT_CONSTANTS.CONTENT_SIZE]: card.content.length,
    [EVENT_CONSTANTS.UPGRADED_FUNCTION]: nextAlgo,
    [EVENT_CONSTANTS.UPGRADED_HASH]: upgradedHash
  };
  return JSON.stringify(event);
}
function generateDuplicationEvent(card) {
  const event = {
    [EVENT_CONSTANTS.TYPE]: EVENT_CONSTANTS.DUPLICATE_EVENT_TYPE,
    [EVENT_CONSTANTS.HASH]: card.hash,
    [EVENT_CONSTANTS.DUPLICATE_TIME]: card.g_time
  };
  return JSON.stringify(event);
}
function nextHashFunction(current) {
  const currentLower = current.toLowerCase();
  const entry = ALGORITHM_HIERARCHY[currentLower];
  if (entry && entry.next) {
    return entry.next;
  }
  return "sha256";
}
var init_EventProducer = __esm({
  "node_modules/mcard-js/dist/model/EventProducer.js"() {
    init_constants();
    init_GTime();
    init_HashValidator();
  }
});

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
init_HashValidator();
init_GTime();
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

// node_modules/mcard-js/dist/monads/Maybe.js
var Maybe = class _Maybe {
  _value;
  _isNothing;
  constructor(_value, _isNothing) {
    this._value = _value;
    this._isNothing = _isNothing;
  }
  /**
   * Create a Just (has value)
   */
  static just(value) {
    return new _Maybe(value, false);
  }
  /**
   * Create a Nothing (no value)
   */
  static nothing() {
    return new _Maybe(null, true);
  }
  /**
   * Check if this is Nothing
   */
  get isNothing() {
    return this._isNothing;
  }
  /**
   * Check if this is Just
   */
  get isJust() {
    return !this._isNothing;
  }
  /**
   * Get the value (throws if Nothing)
   */
  get value() {
    if (this._isNothing) {
      throw new Error("Cannot get value from Nothing");
    }
    return this._value;
  }
  /**
   * Monadic bind - chain operations
   * Short-circuits on Nothing
   */
  bind(fn) {
    if (this._isNothing) {
      return _Maybe.nothing();
    }
    return fn(this._value);
  }
  /**
   * Map a function over the value
   */
  map(fn) {
    if (this._isNothing) {
      return _Maybe.nothing();
    }
    return _Maybe.just(fn(this._value));
  }
  /**
   * Get value or default
   */
  getOrElse(defaultValue) {
    return this._isNothing ? defaultValue : this._value;
  }
};

// node_modules/mcard-js/dist/model/CardCollection.js
var CardCollection = class {
  engine;
  constructor(engine) {
    this.engine = engine;
  }
  // =========== Standard Operations ===========
  /**
   * Add a card to the collection
   * Handles duplicates (same content, same hash) and collisions (diff content, same hash)
   */
  async add(card) {
    const existingCard = await this.engine.get(card.hash);
    if (existingCard) {
      const isDuplicate = this.areContentsEqual(existingCard.content, card.content);
      if (isDuplicate) {
        const { generateDuplicationEvent: generateDuplicationEvent2 } = await Promise.resolve().then(() => (init_EventProducer(), EventProducer_exports));
        const eventStr = generateDuplicationEvent2(card);
        const eventCard = await MCard.create(eventStr);
        await this.engine.add(eventCard);
        return card.hash;
      } else {
        const { generateCollisionEvent: generateCollisionEvent2 } = await Promise.resolve().then(() => (init_EventProducer(), EventProducer_exports));
        const eventStr = await generateCollisionEvent2(card);
        const eventCard = await MCard.create(eventStr);
        await this.engine.add(eventCard);
        const eventObj = JSON.parse(eventStr);
        const nextAlgo = eventObj.upgraded_function;
        if (!nextAlgo) {
          throw new Error("Failed to determine next hash algorithm for collision");
        }
        const upgradedCard = await MCard.create(card.content, nextAlgo);
        return this.engine.add(upgradedCard);
      }
    }
    return this.engine.add(card);
  }
  areContentsEqual(a, b) {
    if (a.length !== b.length)
      return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i])
        return false;
    }
    return true;
  }
  /**
   * Get a card by hash
   */
  async get(hash) {
    return this.engine.get(hash);
  }
  /**
   * Delete a card by hash
   */
  async delete(hash) {
    return this.engine.delete(hash);
  }
  /**
   * Get a page of cards
   */
  async getPage(pageNumber = 1, pageSize = 10) {
    return this.engine.getPage(pageNumber, pageSize);
  }
  /**
   * Count total cards
   */
  async count() {
    return this.engine.count();
  }
  // =========== Handle Operations ===========
  /**
   * Add a card and register a handle for it
   */
  async addWithHandle(card, handle) {
    const hash = await this.add(card);
    await this.engine.registerHandle(handle, hash);
    return hash;
  }
  /**
   * Get card by handle
   */
  async getByHandle(handle) {
    return this.engine.getByHandle(handle);
  }
  /**
   * Resolve handle to hash
   */
  async resolveHandle(handle) {
    return this.engine.resolveHandle(handle);
  }
  /**
   * Update handle to point to new card
   */
  async updateHandle(handle, newCard) {
    const hash = await this.add(newCard);
    await this.engine.updateHandle(handle, hash);
    return hash;
  }
  /**
   * Get version history for a handle
   */
  async getHandleHistory(handle) {
    return this.engine.getHandleHistory(handle);
  }
  // =========== Monadic Operations ===========
  /**
   * Monadic get - returns Maybe<MCard>
   */
  async getM(hash) {
    const card = await this.get(hash);
    return card ? Maybe.just(card) : Maybe.nothing();
  }
  /**
   * Monadic getByHandle - returns Maybe<MCard>
   */
  async getByHandleM(handle) {
    const card = await this.getByHandle(handle);
    return card ? Maybe.just(card) : Maybe.nothing();
  }
  /**
   * Monadic resolveHandle - returns Maybe<string>
   */
  async resolveHandleM(handle) {
    const hash = await this.resolveHandle(handle);
    return hash ? Maybe.just(hash) : Maybe.nothing();
  }
  /**
   * Resolve handle and get card in one monadic operation
   */
  async resolveAndGetM(handle) {
    const maybeHash = await this.resolveHandleM(handle);
    if (maybeHash.isNothing)
      return Maybe.nothing();
    return this.getM(maybeHash.value);
  }
  // =========== Search & Bulk Operations ===========
  async clear() {
    return this.engine.clear();
  }
  async searchByString(query, pageNumber = 1, pageSize = 10) {
    return this.engine.search(query, pageNumber, pageSize);
  }
  async searchByContent(query, pageNumber = 1, pageSize = 10) {
    return this.engine.search(query, pageNumber, pageSize);
  }
  async searchByHash(hashPrefix) {
    return this.engine.searchByHash(hashPrefix);
  }
  async getAllMCardsRaw() {
    return this.engine.getAll();
  }
  async getAllCards(pageSize = 10, processCallback) {
    const cards = [];
    let pageNumber = 1;
    let total = 0;
    while (true) {
      const page = await this.getPage(pageNumber, pageSize);
      if (!page.items || page.items.length === 0)
        break;
      for (const card of page.items) {
        if (processCallback) {
          processCallback(card);
        }
        cards.push(card);
      }
      total = page.totalItems;
      if (!page.hasNext)
        break;
      pageNumber++;
    }
    return { cards, total };
  }
  async printAllCards() {
    const cards = await this.getAllMCardsRaw();
    cards.forEach((card) => {
      console.log(`Hash: ${card.hash}`);
      try {
        const text = new TextDecoder().decode(card.content);
        const preview = text.slice(0, 100).replace(/\n/g, " ");
        console.log(`Content: ${preview}${text.length > 100 ? "..." : ""}`);
      } catch {
        console.log(`Content (binary): ${card.content.length} bytes`);
      }
      console.log("---");
    });
  }
};

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
var ContentHandle = class {
  handle;
  currentHash;
  createdAt;
  updatedAt;
  constructor(handle, currentHash, createdAt, updatedAt) {
    this.handle = validateHandle(handle);
    this.currentHash = currentHash;
    this.createdAt = createdAt ?? /* @__PURE__ */ new Date();
    this.updatedAt = updatedAt ?? this.createdAt;
  }
  /**
   * Update handle to point to new hash
   * @returns Previous hash for history tracking
   */
  update(newHash) {
    const previousHash = this.currentHash;
    this.currentHash = newHash;
    this.updatedAt = /* @__PURE__ */ new Date();
    return previousHash;
  }
  toObject() {
    return {
      handle: this.handle,
      currentHash: this.currentHash,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
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
function deleteDB(name, { blocked } = {}) {
  const request = indexedDB.deleteDatabase(name);
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event
    ));
  }
  return wrap(request).then(() => void 0);
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

// mcard-browser-entry.js
init_GTime();
init_HashValidator();
export {
  CardCollection,
  ContentHandle,
  ContentTypeInterpreter,
  GTime,
  HandleValidationError,
  HashValidator,
  IndexedDBEngine,
  MCard,
  Maybe,
  validateHandle
};
//# sourceMappingURL=mcard-js.bundle.js.map
