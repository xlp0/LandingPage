var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require3() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// public/js/mcard-kernel/node-shims/buffer.js
var BufferShim;
var init_buffer = __esm({
  "public/js/mcard-kernel/node-shims/buffer.js"() {
    "use strict";
    BufferShim = class _BufferShim extends Uint8Array {
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
  }
});

// public/js/mcard-kernel/node-shims/crypto.js
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
function createHash(algo) {
  return new Hash(algo);
}
function randomBytes(n) {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}
var K, Hash;
var init_crypto = __esm({
  "public/js/mcard-kernel/node-shims/crypto.js"() {
    init_buffer();
    K = [
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
    Hash = class {
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
  }
});

// public/js/mcard-kernel/node-shims/fs.js
var fs_exports = {};
__export(fs_exports, {
  default: () => fs_default,
  existsSync: () => existsSync,
  mkdirSync: () => mkdirSync,
  promises: () => promises,
  readFileSync: () => readFileSync,
  readdirSync: () => readdirSync,
  rmSync: () => rmSync,
  statSync: () => statSync,
  writeFileSync: () => writeFileSync
});
var unavailable, readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, promises, fs_default;
var init_fs = __esm({
  "public/js/mcard-kernel/node-shims/fs.js"() {
    init_buffer();
    unavailable = (name) => () => {
      throw new Error(`fs shim: '${name}' is a Node-only API and is unavailable in the browser`);
    };
    readFileSync = unavailable("readFileSync");
    writeFileSync = unavailable("writeFileSync");
    existsSync = () => false;
    mkdirSync = unavailable("mkdirSync");
    readdirSync = () => [];
    statSync = unavailable("statSync");
    rmSync = unavailable("rmSync");
    promises = new Proxy({}, { get: (_t, p) => unavailable(String(p)) });
    fs_default = { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync, promises };
  }
});

// public/js/mcard-kernel/node-shims/path.js
var path_exports = {};
__export(path_exports, {
  basename: () => basename,
  default: () => path_default,
  dirname: () => dirname,
  extname: () => extname,
  isAbsolute: () => isAbsolute,
  join: () => join,
  normalize: () => normalize,
  posix: () => posix,
  relative: () => relative,
  resolve: () => resolve,
  sep: () => sep
});
function join(...parts) {
  const joined = parts.filter((p) => p !== void 0 && p !== null && p !== "").join("/");
  return normalize(joined);
}
function normalize(p) {
  const isAbs = String(p).startsWith("/");
  const out = [];
  for (const seg of String(p).split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return (isAbs ? "/" : "") + out.join("/");
}
function dirname(p) {
  const s = String(p);
  const i = s.lastIndexOf("/");
  if (i < 0) return ".";
  if (i === 0) return "/";
  return s.slice(0, i);
}
function basename(p, ext) {
  const s = String(p);
  const b = s.slice(s.lastIndexOf("/") + 1);
  return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b;
}
function extname(p) {
  const b = basename(p);
  const i = b.lastIndexOf(".");
  return i <= 0 ? "" : b.slice(i);
}
function resolve(...parts) {
  return normalize(parts.filter(Boolean).join("/"));
}
function relative(from, to) {
  const a = normalize(from).split("/").filter(Boolean);
  const b = normalize(to).split("/").filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill(".."), ...b.slice(i)].join("/");
}
function isAbsolute(p) {
  return String(p).startsWith("/");
}
var sep, posix, path_default;
var init_path = __esm({
  "public/js/mcard-kernel/node-shims/path.js"() {
    init_buffer();
    sep = "/";
    posix = { sep };
    path_default = { sep, posix, join, normalize, dirname, basename, extname, resolve, relative, isAbsolute };
  }
});

// node_modules/ws/browser.js
var require_browser = __commonJS({
  "node_modules/ws/browser.js"(exports, module) {
    "use strict";
    init_buffer();
    module.exports = function() {
      throw new Error(
        "ws does not work in the browser. Browser clients must use the native WebSocket object"
      );
    };
  }
});

// public/js/mcard-kernel/bundle-entry.js
init_buffer();

// public/js/mcard-kernel/compat.js
init_buffer();

// node_modules/clm-kernel/dist/index.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-AOSZNTDH.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-EXLRJ3FR.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-R5U7XKVJ.js
init_buffer();
var __defProp2 = Object.defineProperty;
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof __require !== "undefined" ? __require : a)[b]
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export2 = (target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
};

// node_modules/clm-kernel/dist/chunk-EXLRJ3FR.js
var BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
var BASE58_MAP = {};
for (let i = 0; i < BASE58_ALPHABET.length; i++) {
  BASE58_MAP[BASE58_ALPHABET[i]] = i;
}
function encodeBase58(bytes) {
  if (bytes.length === 0) return "";
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = carry / 58 | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = carry / 58 | 0;
    }
  }
  let str = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) {
    str += BASE58_ALPHABET[digits[i]];
  }
  return str;
}
function decodeBase58(str) {
  if (!str) return new Uint8Array(0);
  let zeros = 0;
  while (zeros < str.length && str[zeros] === "1") zeros++;
  const bytes = [];
  for (let i = zeros; i < str.length; i++) {
    const c = str[i];
    const val = BASE58_MAP[c];
    if (val === void 0) {
      throw new Error(`Invalid Base58 character: ${c}`);
    }
    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 255;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  const result = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < zeros; i++) result[i] = 0;
  for (let i = 0; i < bytes.length; i++) {
    result[zeros + i] = bytes[bytes.length - 1 - i];
  }
  return result;
}
function bytesToHex(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
function hexToBytes(hex) {
  const clean = hex.length % 2 !== 0 ? `0${hex}` : hex;
  const len = clean.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
function generateRandomNonce(length = 32) {
  try {
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
      const crypto = __require2("crypto");
      return crypto.randomBytes(length).toString("hex");
    }
  } catch {
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const buf = new Uint8Array(length);
    globalThis.crypto.getRandomValues(buf);
    return bytesToHex(buf);
  }
  let rand = "";
  for (let i = 0; i < length * 2; i++) {
    rand += Math.floor(Math.random() * 16).toString(16);
  }
  return rand;
}
var ED25519_PKCS8_PREFIX = new Uint8Array([
  48,
  46,
  2,
  1,
  0,
  48,
  5,
  6,
  3,
  43,
  101,
  112,
  4,
  34,
  4,
  32
]);
var ED25519_SPKI_PREFIX = new Uint8Array([
  48,
  42,
  48,
  5,
  6,
  3,
  43,
  101,
  112,
  3,
  33,
  0
]);
var X25519_PKCS8_PREFIX = new Uint8Array([
  48,
  46,
  2,
  1,
  0,
  48,
  5,
  6,
  3,
  43,
  101,
  110,
  4,
  34,
  4,
  32
]);
var X25519_SPKI_PREFIX = new Uint8Array([
  48,
  42,
  48,
  5,
  6,
  3,
  43,
  101,
  110,
  3,
  33,
  0
]);
function toBuffer(arr) {
  if (typeof BufferShim !== "undefined" && typeof BufferShim.from === "function") {
    return BufferShim.from(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  return arr;
}

// node_modules/clm-kernel/dist/chunk-RPWRJJO2.js
init_buffer();
var DisposableList = class {
  #disposers = [];
  #disposed = false;
  /** Register a disposer function. Returns the list for chaining. */
  add(disposer) {
    if (this.#disposed) {
      throw new Error("DisposableList: cannot add to an already-disposed list");
    }
    this.#disposers.push(disposer);
    return this;
  }
  /** Number of registered disposers. */
  get length() {
    return this.#disposers.length;
  }
  /** Whether this list has been disposed. */
  get disposed() {
    return this.#disposed;
  }
  /**
   * Unwind all disposers in LIFO (reverse) order.
   * Collects all errors and throws an aggregate if any failed.
   */
  async dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (let i = this.#disposers.length - 1; i >= 0; i--) {
      try {
        await this.#disposers[i]();
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }
    this.#disposers.length = 0;
    if (errors.length > 0) {
      const msg = `DisposableList: ${errors.length} disposer(s) failed:
${errors.map((e) => e.message).join("\n")}`;
      throw new Error(msg);
    }
  }
  /**
   * Dispose synchronously. Only safe if all disposers are synchronous.
   * For mixed async/sync disposers, use `dispose()` instead.
   */
  disposeSync() {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors = [];
    for (let i = this.#disposers.length - 1; i >= 0; i--) {
      try {
        const result = this.#disposers[i]();
        if (result && typeof result.then === "function") {
          errors.push(new Error("DisposableList.disposeSync: encountered async disposer"));
        }
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
      }
    }
    this.#disposers.length = 0;
    if (errors.length > 0) {
      throw new Error(`DisposableList: ${errors.length} disposer(s) failed`);
    }
  }
};
var SavepointGuard = class {
  #state = "idle";
  #snapshot;
  #disposables = new DisposableList();
  #onRollback;
  /**
   * @param onRollback - Optional callback invoked with the snapshot during rollback
   */
  constructor(onRollback) {
    this.#onRollback = onRollback;
  }
  /** Current guard state. */
  get state() {
    return this.#state;
  }
  /** The DisposableList for registering cleanup actions. */
  get disposables() {
    return this.#disposables;
  }
  /**
   * Begin a savepoint, capturing the given snapshot.
   * Transitions: idle → active.
   */
  begin(snapshot) {
    if (this.#state !== "idle") {
      throw new Error(`SavepointGuard: cannot begin from state "${this.#state}"`);
    }
    this.#snapshot = snapshot;
    this.#state = "active";
  }
  /**
   * Commit the savepoint — finalizes the transaction.
   * Transitions: active → committed.
   * Does NOT run disposers (they are cleanup for rollback scenarios).
   */
  commit() {
    if (this.#state !== "active") {
      throw new Error(`SavepointGuard: cannot commit from state "${this.#state}"`);
    }
    this.#state = "committed";
    this.#snapshot = void 0;
  }
  /**
   * Rollback to the snapshot — restores state and runs disposers.
   * Transitions: active → rolled-back.
   */
  async rollback() {
    if (this.#state !== "active") {
      throw new Error(`SavepointGuard: cannot rollback from state "${this.#state}"`);
    }
    this.#state = "rolled-back";
    if (this.#onRollback && this.#snapshot !== void 0) {
      await this.#onRollback(this.#snapshot);
    }
    await this.#disposables.dispose();
    this.#snapshot = void 0;
  }
};

// node_modules/clm-kernel/dist/chunk-AOSZNTDH.js
init_crypto();
var ED25519_SPKI_PREFIX2 = toBuffer(ED25519_SPKI_PREFIX);

// node_modules/clm-kernel/dist/chunk-FGQYYOHK.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-OUDH6PYT.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-Q5CHOHIL.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-XI7IK44B.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-4G2UCRE5.js
init_buffer();
var BLAKE3_HASH_PREFIX = "blake3:";
var SHA256_HASH_PREFIX = "sha256:";
var B3_IV = [
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
];
var B3_MSG_PERM = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];
var B3_CHUNK_START = 1;
var B3_CHUNK_END = 2;
var B3_PARENT = 4;
var B3_ROOT = 8;
var B3_BLOCK_LEN = 64;
var B3_CHUNK_LEN = 1024;
function b3Rotr(w, r) {
  return (w >>> r | w << 32 - r) >>> 0;
}
function b3G(state, a, b, c, d, mx, my) {
  state[a] = state[a] + state[b] + mx >>> 0;
  state[d] = b3Rotr(state[d] ^ state[a], 16);
  state[c] = state[c] + state[d] >>> 0;
  state[b] = b3Rotr(state[b] ^ state[c], 12);
  state[a] = state[a] + state[b] + my >>> 0;
  state[d] = b3Rotr(state[d] ^ state[a], 8);
  state[c] = state[c] + state[d] >>> 0;
  state[b] = b3Rotr(state[b] ^ state[c], 7);
}
function b3Round(state, m) {
  b3G(state, 0, 4, 8, 12, m[0], m[1]);
  b3G(state, 1, 5, 9, 13, m[2], m[3]);
  b3G(state, 2, 6, 10, 14, m[4], m[5]);
  b3G(state, 3, 7, 11, 15, m[6], m[7]);
  b3G(state, 0, 5, 10, 15, m[8], m[9]);
  b3G(state, 1, 6, 11, 12, m[10], m[11]);
  b3G(state, 2, 7, 8, 13, m[12], m[13]);
  b3G(state, 3, 4, 9, 14, m[14], m[15]);
}
function b3Permute(m) {
  const permuted = new Array(16);
  for (let i = 0; i < 16; i++) {
    permuted[i] = m[B3_MSG_PERM[i]];
  }
  return permuted;
}
function b3Compress(chainingValue, blockWords, counter, blockLen, flags) {
  const state = [
    chainingValue[0],
    chainingValue[1],
    chainingValue[2],
    chainingValue[3],
    chainingValue[4],
    chainingValue[5],
    chainingValue[6],
    chainingValue[7],
    B3_IV[0],
    B3_IV[1],
    B3_IV[2],
    B3_IV[3],
    counter >>> 0,
    // counter low 32 bits
    0,
    // counter high 32 bits (always 0 for < 2^32 inputs)
    blockLen,
    flags
  ];
  let m = blockWords.slice();
  for (let round = 0; round < 7; round++) {
    b3Round(state, m);
    m = b3Permute(m);
  }
  for (let i = 0; i < 8; i++) {
    state[i] = (state[i] ^ state[i + 8]) >>> 0;
  }
  for (let i = 8; i < 16; i++) {
    state[i] = (state[i] ^ chainingValue[i - 8]) >>> 0;
  }
  return state;
}
function bytesToWords(bytes, offset, count) {
  const words = [];
  for (let i = 0; i < count; i++) {
    const idx = offset + i * 4;
    words.push(
      (bytes[idx] | bytes[idx + 1] << 8 | bytes[idx + 2] << 16 | bytes[idx + 3] << 24) >>> 0
    );
  }
  return words;
}
function wordsToHex(words, count) {
  let hex = "";
  for (let i = 0; i < count; i++) {
    const w = words[i];
    for (let b = 0; b < 4; b++) {
      hex += (w >>> b * 8 & 255).toString(16).padStart(2, "0");
    }
  }
  return hex;
}
function blake3Hash(content) {
  const padded = new Uint8Array(Math.max(B3_BLOCK_LEN, Math.ceil(content.length / B3_BLOCK_LEN) * B3_BLOCK_LEN));
  padded.set(content);
  const totalChunks = Math.max(1, Math.ceil(content.length / B3_CHUNK_LEN));
  if (totalChunks === 1) {
    const blocksInChunk = Math.max(1, Math.ceil(content.length / B3_BLOCK_LEN));
    let cv = B3_IV.slice();
    for (let blockIdx = 0; blockIdx < blocksInChunk; blockIdx++) {
      const blockStart = blockIdx * B3_BLOCK_LEN;
      const remaining = Math.min(B3_BLOCK_LEN, Math.max(0, content.length - blockStart));
      const blockBytes = new Uint8Array(B3_BLOCK_LEN);
      if (remaining > 0) {
        blockBytes.set(content.subarray(blockStart, blockStart + remaining));
      }
      const blockWords = bytesToWords(blockBytes, 0, 16);
      let flags = 0;
      if (blockIdx === 0) flags |= B3_CHUNK_START;
      if (blockIdx === blocksInChunk - 1) {
        flags |= B3_CHUNK_END | B3_ROOT;
        const result2 = b3Compress(cv, blockWords, 0, remaining > 0 ? remaining : 0, flags);
        return wordsToHex(result2, 8);
      }
      const result = b3Compress(cv, blockWords, 0, B3_BLOCK_LEN, flags);
      cv = result.slice(0, 8);
    }
  }
  const chunkCVs = [];
  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const chunkStart = chunkIdx * B3_CHUNK_LEN;
    const chunkEnd = Math.min(chunkStart + B3_CHUNK_LEN, content.length);
    const chunkLen = chunkEnd - chunkStart;
    const blocksInChunk = Math.max(1, Math.ceil(chunkLen / B3_BLOCK_LEN));
    let cv = B3_IV.slice();
    for (let blockIdx = 0; blockIdx < blocksInChunk; blockIdx++) {
      const blockStart = chunkStart + blockIdx * B3_BLOCK_LEN;
      const remaining = Math.min(B3_BLOCK_LEN, Math.max(0, chunkEnd - blockStart));
      const blockBytes = new Uint8Array(B3_BLOCK_LEN);
      if (remaining > 0) {
        blockBytes.set(content.subarray(blockStart, blockStart + remaining));
      }
      const blockWords = bytesToWords(blockBytes, 0, 16);
      let flags = 0;
      if (blockIdx === 0) flags |= B3_CHUNK_START;
      if (blockIdx === blocksInChunk - 1) flags |= B3_CHUNK_END;
      const result = b3Compress(cv, blockWords, chunkIdx, remaining, flags);
      cv = result.slice(0, 8);
    }
    chunkCVs.push(cv);
  }
  let level = chunkCVs;
  while (level.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        const parentWords = new Array(16).fill(0);
        for (let j = 0; j < 8; j++) parentWords[j] = level[i][j];
        for (let j = 0; j < 8; j++) parentWords[j + 8] = level[i + 1][j];
        const flags = B3_PARENT | (level.length <= 2 && i === 0 ? B3_ROOT : 0);
        const result = b3Compress(B3_IV, parentWords, 0, B3_BLOCK_LEN, flags);
        nextLevel.push(result.slice(0, 8));
      } else {
        nextLevel.push(level[i]);
      }
    }
    level = nextLevel;
  }
  if (level.length === 1) {
    return wordsToHex(level[0], 8);
  }
  return wordsToHex(B3_IV, 8);
}
function sha256HashSync(content) {
  try {
    const crypto = globalThis.crypto;
    if (crypto && "subtle" in crypto) {
      throw new Error("Use async variant");
    }
  } catch {
  }
  try {
    const { createHash: createHash2 } = __require2("crypto");
    return createHash2("sha256").update(content).digest("hex");
  } catch {
    throw new Error("SHA-256 requires Node.js crypto module or Web Crypto API");
  }
}
var Blake3Provider = class {
  hash(content) {
    return blake3Hash(content);
  }
  prefix() {
    return BLAKE3_HASH_PREFIX;
  }
};
var Sha256Provider = class {
  hash(content) {
    return sha256HashSync(content);
  }
  prefix() {
    return SHA256_HASH_PREFIX;
  }
};
var _defaultProvider = new Blake3Provider();
function getDefaultProvider() {
  return _defaultProvider;
}

// node_modules/clm-kernel/dist/chunk-XI7IK44B.js
var HEX_64_REGEX = /^[0-9a-f]{64}$/;
var ContentHash = class _ContentHash {
  #hex;
  constructor(hex) {
    this.#hex = hex;
    Object.freeze(this);
  }
  /**
   * Create a ContentHash from a raw 64-char hex string.
   * Throws if the format is invalid.
   */
  static fromHex(hex) {
    const lower = hex.toLowerCase();
    if (!HEX_64_REGEX.test(lower)) {
      throw new Error(`ContentHash: expected 64-char hex string, got "${hex.slice(0, 20)}..." (length ${hex.length})`);
    }
    return new _ContentHash(lower);
  }
  /**
   * Create a ContentHash from a prefixed hash string (e.g. "blake3:<hex>").
   * Strips the prefix and validates the hex portion.
   */
  static fromPrefixed(prefixed) {
    const colonIdx = prefixed.indexOf(":");
    if (colonIdx === -1) {
      return _ContentHash.fromHex(prefixed);
    }
    return _ContentHash.fromHex(prefixed.slice(colonIdx + 1));
  }
  /**
   * Parse a hash string, handling either raw hex or prefixed format ("blake3:<hex>").
   */
  static parse(input) {
    return _ContentHash.fromPrefixed(input);
  }
  /**
   * Compute a ContentHash from raw binary content using BLAKE3.
   */
  static compute(data) {
    const hex = blake3Hash(data);
    return new _ContentHash(hex);
  }
  /**
   * Compute a ContentHash from a UTF-8 string using BLAKE3.
   */
  static computeString(content) {
    return _ContentHash.compute(new TextEncoder().encode(content));
  }
  /** Raw 64-char lowercase hex digest. */
  asHex() {
    return this.#hex;
  }
  /** Prefixed format: "blake3:<hex>". */
  asPrefixed() {
    return `${getDefaultProvider().prefix()}${this.#hex}`;
  }
  /** Check equality with another ContentHash. */
  equals(other) {
    return this.#hex === other.#hex;
  }
  toString() {
    return this.#hex;
  }
  toJSON() {
    return this.#hex;
  }
};
var DID_PREFIX = "did:";
var AgentDid = class _AgentDid {
  #did;
  constructor(did) {
    this.#did = did;
    Object.freeze(this);
  }
  /**
   * Create an AgentDid from a DID string.
   * Throws if the string doesn't start with "did:".
   */
  static create(did) {
    if (!did.startsWith(DID_PREFIX)) {
      throw new Error(`AgentDid: expected string starting with "did:", got "${did.slice(0, 20)}"`);
    }
    if (did.length < 8) {
      throw new Error(`AgentDid: DID string too short: "${did}"`);
    }
    return new _AgentDid(did);
  }
  /** The full DID string. */
  asString() {
    return this.#did;
  }
  /** The method portion (e.g. "key" from "did:key:z6Mk..."). */
  method() {
    const parts = this.#did.split(":");
    return parts[1] ?? "";
  }
  /** Check equality with another AgentDid. */
  equals(other) {
    return this.#did === other.#did;
  }
  toString() {
    return this.#did;
  }
  toJSON() {
    return this.#did;
  }
};
var Handle = class _Handle {
  #handle;
  constructor(handle) {
    this.#handle = handle;
    Object.freeze(this);
  }
  /**
   * Create a Handle from a colon-delimited string.
   */
  static create(handle) {
    if (handle.length === 0) {
      throw new Error("Handle: cannot be empty");
    }
    return new _Handle(handle);
  }
  /**
   * Parse a colon-delimited handle string. Alias for create().
   */
  static parse(handle) {
    return _Handle.create(handle);
  }
  /**
   * Create a Handle from a filesystem path (converts '/' to ':').
   */
  static fromPath(path) {
    const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
    return new _Handle(normalized.replace(/\//g, ":"));
  }
  /** The colon-delimited handle string. */
  asString() {
    return this.#handle;
  }
  /** Convert to filesystem path (converts ':' to '/'). */
  toPath() {
    return this.#handle.replace(/:/g, "/");
  }
  /** The final segment (filename). */
  name() {
    const parts = this.#handle.split(":");
    return parts[parts.length - 1] ?? this.#handle;
  }
  /** Check equality with another Handle. */
  equals(other) {
    return this.#handle === other.#handle;
  }
  toString() {
    return this.#handle;
  }
  toJSON() {
    return this.#handle;
  }
};

// node_modules/clm-kernel/dist/chunk-Q5CHOHIL.js
async function resolveCoeffects(coeffects, ctx, timeoutMs) {
  const required = coeffects.requiredServices ?? [];
  if (required.length === 0) {
    return ctx;
  }
  const isAvailable = (s) => {
    return ctx[s] !== void 0 || typeof ctx.get === "function" && ctx.get(s) !== void 0;
  };
  const missing = required.filter((s) => !isAvailable(s));
  if (missing.length === 0) {
    return ctx;
  }
  if (typeof ctx.inject !== "function") {
    throw new Error(`Missing required Cordis services: ${missing.join(", ")}`);
  }
  return new Promise((resolve2, reject) => {
    let timer;
    if (timeoutMs !== void 0 && timeoutMs > 0) {
      timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for Cordis services: ${missing.join(", ")}`));
      }, timeoutMs);
    }
    try {
      ctx.inject(required, (injectedCtx) => {
        if (timer) clearTimeout(timer);
        resolve2(injectedCtx);
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      reject(err);
    }
  });
}
var PrimitivePCard = class {
  type = "primitive";
  pcardType = "primitive";
  mcard;
  constructor(mcard) {
    this.mcard = mcard;
  }
  /**
   * Evaluates to its underlying resting state.
   * Under FND: PrimitivePCard.evaluate() returns the wrapped MCard unchanged.
   */
  evaluate() {
    return this.mcard;
  }
  toJSON() {
    return {
      type: this.type,
      pcard_type: this.pcardType,
      mcard: this.mcard.toJSON()
    };
  }
};
function toPayload(raw) {
  if (raw && typeof raw === "object" && "kind" in raw && typeof raw.kind === "string") {
    return raw;
  }
  if (typeof raw === "string") {
    return { kind: "text", value: raw };
  }
  if (raw instanceof Uint8Array) {
    return { kind: "binary", mimeType: "application/octet-stream", data: raw };
  }
  if (raw !== null && typeof raw === "object") {
    return { kind: "structured", value: raw };
  }
  return { kind: "scalar", value: raw };
}
var MCard = class _MCard {
  /** Canonical URI (e.g., "mcard:workspace/config/settings"). */
  uri;
  /** Cryptographic BLAKE3 hash of canonical serialized payload. */
  hash;
  /** Underlying data payload. */
  payload;
  /** Immutable metadata attributes. */
  metadata;
  /** Cryptographic author DID. */
  author;
  /** Monotonic logical sequence or version counter. */
  sequence;
  constructor(uri, hash, payload, metadata, author, sequence) {
    this.uri = uri;
    this.hash = hash;
    this.payload = payload;
    this.metadata = metadata;
    this.author = author;
    this.sequence = sequence;
    Object.freeze(this);
  }
  /**
   * Construct a new MCard, computing its BLAKE3 hash automatically from its serialized payload.
   * Matches Rust `MCard::new()`.
   */
  static create(uri, payload, author, sequence, metadata = /* @__PURE__ */ new Map()) {
    const normPayload = toPayload(payload);
    const serialized = serializePayload(normPayload);
    const hash = ContentHash.compute(serialized);
    return new _MCard(uri, hash, normPayload, metadata, author, sequence);
  }
  /**
   * Construct an MCard with explicit metadata.
   * Matches Rust `MCard::with_metadata()`.
   */
  static withMetadata(uri, payload, metadata, author, sequence) {
    const serialized = serializePayload(payload);
    const hash = ContentHash.compute(serialized);
    return new _MCard(uri, hash, payload, metadata, author, sequence);
  }
  /**
   * Construct an MCard with an explicit pre-computed hash.
   * Used when loading from storage where the hash is already known.
   */
  static fromStorage(uri, hash, payload, metadata, author, sequence) {
    return new _MCard(uri, hash, payload, metadata, author, sequence);
  }
  /**
   * Interpret this MCard as a PrimitivePCard (constant function 1 → X).
   * Under FND, this is always valid.
   */
  asPrimitivePCard() {
    return new PrimitivePCard(this);
  }
  /**
   * Helper to retrieve a metadata attribute value.
   */
  getMetadata(key) {
    return this.metadata.get(key);
  }
  /**
   * Textual or stringified representation of the payload content.
   */
  get content() {
    if (this.payload.kind === "text") {
      return this.payload.value;
    }
    if (this.payload.kind === "scalar") {
      return String(this.payload.value);
    }
    return JSON.stringify(this.payload);
  }
  /** Serialize this MCard to a plain JSON-compatible object. */
  toJSON() {
    return {
      uri: this.uri,
      hash: this.hash.asHex(),
      payload: serializePayloadToJSON(this.payload),
      metadata: Object.fromEntries(this.metadata),
      author: this.author.asString(),
      sequence: this.sequence
    };
  }
  /** Deserialize an MCard from a plain JSON-compatible object. */
  static fromJSON(json) {
    const uri = String(json.uri || "");
    const hash = ContentHash.fromHex(String(json.hash || ""));
    const payload = deserializePayload(json.payload);
    const metadata = new Map(
      json.metadata && typeof json.metadata === "object" ? Object.entries(json.metadata) : []
    );
    const authorStr = String(json.author || "did:key:z6MkhaXgBZDvotDkL5257faiz48Z8x28qqwjp64guC54Po39");
    const author = AgentDid.create(authorStr);
    const sequence = Number(json.sequence ?? 0);
    return new _MCard(uri, hash, payload, metadata, author, sequence);
  }
};
function canonicalJson(value) {
  if (value === null || value === void 0) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (typeof value === "object") {
    const record = value;
    const sortedKeys = Object.keys(record).sort();
    const parts = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`);
    return "{" + parts.join(",") + "}";
  }
  return JSON.stringify(value);
}
function serializePayload(payload) {
  const json = canonicalJson(serializePayloadToJSON(payload));
  return new TextEncoder().encode(json);
}
function serializePayloadToJSON(payload) {
  switch (payload.kind) {
    case "scalar":
      return { kind: "scalar", value: payload.value };
    case "text":
      return { kind: "text", value: payload.value };
    case "satori":
      return { kind: "satori", value: payload.value };
    case "binary":
      return {
        kind: "binary",
        mime_type: payload.mimeType,
        data: Array.from(payload.data)
      };
    case "structured":
      return { kind: "structured", value: payload.value };
    case "executable":
      return { kind: "executable", value: payload.value };
  }
}
function deserializePayload(raw) {
  if (!raw || typeof raw !== "object") {
    return { kind: "scalar", value: raw };
  }
  const obj = raw;
  const kind = obj.kind;
  switch (kind) {
    case "scalar":
      return { kind: "scalar", value: obj.value };
    case "text":
      return { kind: "text", value: String(obj.value ?? "") };
    case "satori":
      return { kind: "satori", value: obj.value };
    case "binary": {
      const dataArr = Array.isArray(obj.data) ? obj.data : [];
      const mimeType = String(obj.mime_type || obj.mimeType || "application/octet-stream");
      return { kind: "binary", mimeType, data: new Uint8Array(dataArr) };
    }
    case "structured":
      return { kind: "structured", value: obj.value };
    case "executable":
      return { kind: "executable", value: obj.value };
    default:
      return { kind: "structured", value: raw };
  }
}

// public/js/mcard-kernel/node-shims/module.js
init_buffer();
function createRequire() {
  return () => {
    throw new Error("module shim: createRequire() is unavailable in the browser");
  };
}

// node_modules/clm-kernel/dist/chunk-OUDH6PYT.js
init_fs();
init_path();
var MemoryBackend = class {
  #cards = /* @__PURE__ */ new Map();
  #handles = /* @__PURE__ */ new Map();
  // handle string → array of hash hexes
  put(hash, mcard) {
    const key = hash.asHex();
    if (this.#cards.has(key)) return false;
    this.#cards.set(key, mcard);
    return true;
  }
  get(hash) {
    return this.#cards.get(hash.asHex());
  }
  has(hash) {
    return this.#cards.has(hash.asHex());
  }
  list() {
    return Array.from(this.#cards.values());
  }
  count() {
    return this.#cards.size;
  }
  registerHandle(handle, hash) {
    const key = handle.asString();
    const history = this.#handles.get(key) ?? [];
    history.push(hash.asHex());
    this.#handles.set(key, history);
  }
  resolveHandle(handle) {
    const history = this.#handles.get(handle.asString());
    if (!history || history.length === 0) return void 0;
    const latestHex = history[history.length - 1];
    if (!latestHex) return void 0;
    return ContentHash.fromHex(latestHex);
  }
  handleHistory(handle) {
    const history = this.#handles.get(handle.asString());
    if (!history) return [];
    return history.map((hex) => ContentHash.fromHex(hex));
  }
  snapshot() {
    return {
      timestamp: Date.now(),
      cardCount: this.#cards.size,
      cards: new Map(this.#cards),
      handles: new Map(
        Array.from(this.#handles.entries()).map(([k, v]) => [k, [...v]])
      )
    };
  }
  restore(snapshot) {
    const memSnap = snapshot;
    this.#cards = new Map(memSnap.cards);
    this.#handles = new Map(
      Array.from(memSnap.handles.entries()).map(([k, v]) => [k, [...v]])
    );
  }
};
var CANONICAL_MCARD_SCHEMA_B64 = "LS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQ0KLS0gTUNhcmQgVW5pZmllZCBEYXRhYmFzZSBTY2hlbWEgKE1vbmFkaWMgQ29yZSkNCi0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0NCi0tIFZlcnNpb246IDMuMC4zIChNZXRhLUNpcmN1bGFyIFNjaGVtYSBCb290c3RyYXBwaW5nIFJlZmluZW1lbnQpDQotLSBMYXN0IFVwZGF0ZWQ6IDIwMjYtMDQtMTMNCi0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0NCg0KLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQ0KLS0gTEFZRVIgMTogQ09SRSBDT05URU5ULUFERFJFU1NBQkxFIFNUT1JBR0UgKFRoZSBNb25hZCAvIEV4cG9uZW50KQ0KLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQ0KQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgY2FyZCAoDQogICAgaGFzaCBURVhUIFBSSU1BUlkgS0VZLA0KICAgIGNvbnRlbnQgQkxPQiBOT1QgTlVMTCwNCiAgICBnX3RpbWUgVEVYVCBOT1QgTlVMTCBERUZBVUxUIChzdHJmdGltZSgnJVktJW0tJWRUJUg6JU06JWZaJywgJ25vdycpKQ0KKTsNCg0KLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQ0KLS0gTEFZRVIgMjogSEFORExFIFNZU1RFTSAoQXBwZXRpdGlvbiAvIFN1bSkNCi0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0NCkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGhhbmRsZV9yZWdpc3RyeSAoDQogICAgaGFuZGxlIFRFWFQgUFJJTUFSWSBLRVksDQogICAgY3VycmVudF9oYXNoIFRFWFQgTk9UIE5VTEwsDQogICAgY3JlYXRlZF9hdCBURVhUIE5PVCBOVUxMLA0KICAgIHVwZGF0ZWRfYXQgVEVYVCBOT1QgTlVMTCwNCiAgICBGT1JFSUdOIEtFWSAoY3VycmVudF9oYXNoKSBSRUZFUkVOQ0VTIGNhcmQoaGFzaCkNCik7DQoNCkNSRUFURSBJTkRFWCBJRiBOT1QgRVhJU1RTIGlkeF9oYW5kbGVfY3VycmVudF9oYXNoDQpPTiBoYW5kbGVfcmVnaXN0cnkoY3VycmVudF9oYXNoKTsNCg0KQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgaGFuZGxlX2hpc3RvcnkgKA0KICAgIGlkIElOVEVHRVIgUFJJTUFSWSBLRVkgQVVUT0lOQ1JFTUVOVCwNCiAgICBoYW5kbGUgVEVYVCBOT1QgTlVMTCwNCiAgICBwcmV2aW91c19oYXNoIFRFWFQgTk9UIE5VTEwsDQogICAgY2hhbmdlZF9hdCBURVhUIE5PVCBOVUxMLA0KICAgIEZPUkVJR04gS0VZIChoYW5kbGUpIFJFRkVSRU5DRVMgaGFuZGxlX3JlZ2lzdHJ5KGhhbmRsZSksDQogICAgRk9SRUlHTiBLRVkgKHByZXZpb3VzX2hhc2gpIFJFRkVSRU5DRVMgY2FyZChoYXNoKQ0KKTsNCg0KQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X2hhbmRsZV9oaXN0b3J5X2hhbmRsZQ0KT04gaGFuZGxlX2hpc3RvcnkoaGFuZGxlKTsNCg0KLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQ0KLS0gTEVHQUNZIFNVUFBPUlQ6IEZUUzUgRG9jdW1lbnRzIFRhYmxlDQotLSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09DQpDUkVBVEUgVklSVFVBTCBUQUJMRSBJRiBOT1QgRVhJU1RTIGRvY3VtZW50cyBVU0lORyBmdHM1KGNvbnRlbnQpOw0KDQpDUkVBVEUgVFJJR0dFUiBJRiBOT1QgRVhJU1RTIGNhcmRfaW5zZXJ0IEFGVEVSIElOU0VSVCBPTiBjYXJkDQpCRUdJTg0KICAgIElOU0VSVCBJTlRPIGRvY3VtZW50cyhjb250ZW50KSBWQUxVRVMgKG5ldy5jb250ZW50KTsNCkVORDsNCg0KQ1JFQVRFIFRSSUdHRVIgSUYgTk9UIEVYSVNUUyBjYXJkX3VwZGF0ZSBBRlRFUiBVUERBVEUgT04gY2FyZA0KQkVHSU4NCiAgICBVUERBVEUgZG9jdW1lbnRzIFNFVCBjb250ZW50ID0gbmV3LmNvbnRlbnQNCiAgICBXSEVSRSByb3dpZCA9IChTRUxFQ1Qgcm93aWQgRlJPTSBkb2N1bWVudHMgV0hFUkUgY29udGVudCA9IG9sZC5jb250ZW50IExJTUlUIDEpOw0KRU5EOw0KDQpDUkVBVEUgVFJJR0dFUiBJRiBOT1QgRVhJU1RTIGNhcmRfZGVsZXRlIEFGVEVSIERFTEVURSBPTiBjYXJkDQpCRUdJTg0KICAgIERFTEVURSBGUk9NIGRvY3VtZW50cyBXSEVSRSBjb250ZW50ID0gb2xkLmNvbnRlbnQ7DQpFTkQ7DQoNCi0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0NCi0tIExBWUVSIDM6IExFQVJOSU5HIEVWRU5UIENSRFQgU1lOQyAoRmVkZXJhdGlvbikNCi0tID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0NCkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGxlYXJuaW5nX2V2ZW50ICgNCiAgICB2Y2FyZF9oYXNoIFRFWFQgUFJJTUFSWSBLRVksDQogICAgcGNhcmRfaGFzaCBURVhUIE5PVCBOVUxMLA0KICAgIGFnZW50X2RpZCBURVhUIE5PVCBOVUxMLA0KICAgIHRpbWVzdGFtcCBURVhUIE5PVCBOVUxMLA0KICAgIHZlY3Rvcl9jbG9jayBURVhUIE5PVCBOVUxMLA0KICAgIG1hcmtpbmdfZGVsdGEgVEVYVCBOT1QgTlVMTCwNCiAgICBub2RlX2lkIFRFWFQgTk9UIE5VTEwsDQogICAgc3luY2VkX2F0IFRFWFQNCik7DQoNCkNSRUFURSBJTkRFWCBJRiBOT1QgRVhJU1RTIGlkeF9sZWFybmluZ19ldmVudF90aW1lc3RhbXANCk9OIGxlYXJuaW5nX2V2ZW50KHRpbWVzdGFtcCk7DQoNCkNSRUFURSBJTkRFWCBJRiBOT1QgRVhJU1RTIGlkeF9sZWFybmluZ19ldmVudF9ub2RlDQpPTiBsZWFybmluZ19ldmVudChub2RlX2lkKTsNCg0KLS0gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQ0KLS0gU0NIRU1BIE1FVEFEQVRBDQotLSA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09DQpDUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBzY2hlbWFfdmVyc2lvbiAoDQogICAgdmVyc2lvbiBURVhUIFBSSU1BUlkgS0VZLA0KICAgIGFwcGxpZWRfYXQgVEVYVCBOT1QgTlVMTCwNCiAgICBkZXNjcmlwdGlvbiBURVhUDQopOw0KDQpJTlNFUlQgT1IgSUdOT1JFIElOVE8gc2NoZW1hX3ZlcnNpb24gKHZlcnNpb24sIGFwcGxpZWRfYXQsIGRlc2NyaXB0aW9uKQ0KVkFMVUVTICgnMy4wLjMnLCBkYXRldGltZSgnbm93JyksICdNb25hZGljIENvcmUgU2NoZW1hIChzcGxpdCB2ZWN0b3JzIHRvIG1jYXJkX3ZlY3Rvcl9zY2hlbWEuc3FsKScpOw0K";
function loadCanonicalMCardSchema(customRoot) {
  try {
    const candidates = [
      customRoot ? join(customRoot, "types", "schemas", "mcard_schema.sql") : null,
      resolve(process.cwd(), "types", "schemas", "mcard_schema.sql"),
      resolve(__dirname, "../../../../types/schemas/mcard_schema.sql"),
      resolve(__dirname, "../../../../../types/schemas/mcard_schema.sql")
    ].filter((p) => Boolean(p));
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return readFileSync(candidate, "utf-8");
      }
    }
  } catch {
  }
  return BufferShim.from(CANONICAL_MCARD_SCHEMA_B64, "base64").toString("utf-8");
}
var CANONICAL_MCARD_SCHEMA_SQL = loadCanonicalMCardSchema();
function loadNodeSqlite() {
  try {
    const fileUrl = typeof import.meta !== "undefined" && import.meta.url ? import.meta.url : "file:///index.js";
    const req = createRequire(fileUrl);
    return req("node:sqlite");
  } catch (err) {
    throw new Error(`node:sqlite is only available in Node.js v22+ environments: ${err}`);
  }
}
var NodeSqliteBackend = class {
  #db;
  #savepointCounter = 0;
  constructor(optionsOrPath = ":memory:") {
    const { DatabaseSync } = loadNodeSqlite();
    const path2 = typeof optionsOrPath === "string" ? optionsOrPath : optionsOrPath.path ?? ":memory:";
    const readOnly = typeof optionsOrPath === "object" ? Boolean(optionsOrPath.readOnly) : false;
    this.#db = new DatabaseSync(path2, { readOnly });
    this.#initSchema();
  }
  #initSchema() {
    const schemaSql = loadCanonicalMCardSchema();
    this.#db.exec(schemaSql);
    try {
      this.#db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
      `);
    } catch {
    }
  }
  put(hash, mcard) {
    const key = hash.asHex();
    const checkStmt = this.#db.prepare("SELECT hash FROM card WHERE hash = ?");
    const existing = checkStmt.get(key);
    if (existing) return false;
    const json = JSON.stringify(mcard.toJSON());
    const bytes = BufferShim.from(json, "utf-8");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const insertStmt = this.#db.prepare("INSERT INTO card (hash, content, g_time) VALUES (?, ?, ?)");
    insertStmt.run(key, bytes, now);
    return true;
  }
  get(hash) {
    const stmt = this.#db.prepare("SELECT content FROM card WHERE hash = ?");
    const row = stmt.get(hash.asHex());
    if (!row) return void 0;
    const json = typeof row.content === "string" ? row.content : BufferShim.from(row.content).toString("utf-8");
    return MCard.fromJSON(JSON.parse(json));
  }
  has(hash) {
    const stmt = this.#db.prepare("SELECT 1 FROM card WHERE hash = ?");
    return Boolean(stmt.get(hash.asHex()));
  }
  list() {
    const stmt = this.#db.prepare("SELECT content FROM card");
    const rows = stmt.all();
    return rows.map((r) => {
      const json = typeof r.content === "string" ? r.content : BufferShim.from(r.content).toString("utf-8");
      return MCard.fromJSON(JSON.parse(json));
    });
  }
  count() {
    const stmt = this.#db.prepare("SELECT COUNT(*) as count FROM card");
    const row = stmt.get();
    return row.count;
  }
  putRaw(hash, content, gTime) {
    const checkStmt = this.#db.prepare("SELECT hash FROM card WHERE hash = ?");
    const existing = checkStmt.get(hash);
    if (existing) return false;
    const bytes = typeof content === "string" ? BufferShim.from(content, "utf-8") : content;
    const now = gTime ?? (/* @__PURE__ */ new Date()).toISOString();
    const insertStmt = this.#db.prepare("INSERT INTO card (hash, content, g_time) VALUES (?, ?, ?)");
    insertStmt.run(hash, bytes, now);
    return true;
  }
  getRaw(hash) {
    const stmt = this.#db.prepare("SELECT content, g_time FROM card WHERE hash = ?");
    const row = stmt.get(hash);
    if (!row) return void 0;
    const content = typeof row.content === "string" ? row.content : BufferShim.from(row.content).toString("utf-8");
    return { content, g_time: row.g_time };
  }
  registerHandle(handle, hash) {
    const hStr = typeof handle === "string" ? handle : handle.asString();
    const hHex = typeof hash === "string" ? hash : hash.asHex();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const checkStmt = this.#db.prepare("SELECT current_hash, created_at FROM handle_registry WHERE handle = ?");
    const existing = checkStmt.get(hStr);
    if (existing) {
      if (existing.current_hash !== hHex) {
        const histStmt = this.#db.prepare(`
          INSERT INTO handle_history (handle, previous_hash, changed_at)
          VALUES (?, ?, ?)
        `);
        histStmt.run(hStr, existing.current_hash, now);
        const updateStmt = this.#db.prepare(`
          UPDATE handle_registry
          SET current_hash = ?, updated_at = ?
          WHERE handle = ?
        `);
        updateStmt.run(hHex, now, hStr);
      }
    } else {
      const insertStmt = this.#db.prepare(`
        INSERT INTO handle_registry (handle, current_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run(hStr, hHex, now, now);
    }
  }
  resolveHandle(handle) {
    const hStr = typeof handle === "string" ? handle : handle.asString();
    const stmt = this.#db.prepare("SELECT current_hash FROM handle_registry WHERE handle = ?");
    const row = stmt.get(hStr);
    if (!row) return void 0;
    return ContentHash.parse(row.current_hash);
  }
  handleHistory(handle) {
    const hStr = typeof handle === "string" ? handle : handle.asString();
    const stmt = this.#db.prepare("SELECT previous_hash FROM handle_history WHERE handle = ? ORDER BY id ASC");
    const rows = stmt.all(hStr);
    const hashes = rows.map((r) => ContentHash.parse(r.previous_hash));
    const current = this.resolveHandle(hStr);
    if (current && !hashes.some((h) => h.asHex() === current.asHex())) {
      hashes.push(current);
    }
    return hashes;
  }
  snapshot() {
    this.#savepointCounter += 1;
    const name = `sp_${this.#savepointCounter}_${Date.now()}`;
    this.#db.exec(`SAVEPOINT ${name};`);
    return {
      timestamp: Date.now(),
      cardCount: this.count(),
      savepointName: name
    };
  }
  restore(snapshot) {
    const snap = snapshot;
    if (snap.savepointName) {
      this.#db.exec(`ROLLBACK TO SAVEPOINT ${snap.savepointName};`);
      this.#db.exec(`RELEASE SAVEPOINT ${snap.savepointName};`);
    }
  }
  close() {
    this.#db.close();
  }
};
var SqlJsBackend = class {
  #db;
  #savepointCounter = 0;
  constructor(db) {
    this.#db = db;
    this.#initSchema();
  }
  #initSchema() {
    const schemaSql = loadCanonicalMCardSchema();
    try {
      this.#db.run(schemaSql);
    } catch {
      const stmts = schemaSql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
      for (const s of stmts) {
        try {
          this.#db.run(s);
        } catch {
        }
      }
    }
  }
  put(hash, mcard) {
    const key = hash.asHex();
    const existing = this.#db.exec("SELECT hash FROM card WHERE hash = ?", [key]);
    const firstRow = existing[0];
    if (firstRow && firstRow.values.length > 0) return false;
    const json = JSON.stringify(mcard.toJSON());
    const now = (/* @__PURE__ */ new Date()).toISOString();
    this.#db.run("INSERT INTO card (hash, content, g_time) VALUES (?, ?, ?)", [key, json, now]);
    return true;
  }
  get(hash) {
    const res = this.#db.exec("SELECT content FROM card WHERE hash = ?", [hash.asHex()]);
    const table = res[0];
    if (!table || table.values.length === 0) return void 0;
    const row = table.values[0];
    if (!row || row[0] === void 0 || row[0] === null) return void 0;
    const raw = row[0];
    const json = typeof raw === "string" ? raw : new TextDecoder("utf-8").decode(raw);
    return MCard.fromJSON(JSON.parse(json));
  }
  has(hash) {
    const res = this.#db.exec("SELECT 1 FROM card WHERE hash = ?", [hash.asHex()]);
    const table = res[0];
    return Boolean(table && table.values.length > 0);
  }
  list() {
    const res = this.#db.exec("SELECT content FROM card");
    const table = res[0];
    if (!table) return [];
    return table.values.map((row) => {
      const raw = row[0];
      const json = typeof raw === "string" ? raw : new TextDecoder("utf-8").decode(raw);
      return MCard.fromJSON(JSON.parse(json));
    });
  }
  count() {
    const res = this.#db.exec("SELECT COUNT(*) FROM card");
    const table = res[0];
    if (!table || table.values.length === 0) return 0;
    const val = table.values[0]?.[0];
    return typeof val === "number" ? val : 0;
  }
  registerHandle(handle, hash) {
    const hStr = handle.asString();
    const hHex = hash.asHex();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existingRes = this.#db.exec("SELECT current_hash, created_at FROM handle_registry WHERE handle = ?", [hStr]);
    const existingTable = existingRes[0];
    const hasRow = Boolean(existingTable && existingTable.values.length > 0);
    if (hasRow) {
      const existingHash = String(existingTable.values[0][0]);
      if (existingHash !== hHex) {
        this.#db.run(
          "INSERT INTO handle_history (handle, previous_hash, changed_at) VALUES (?, ?, ?)",
          [hStr, existingHash, now]
        );
        this.#db.run(
          "UPDATE handle_registry SET current_hash = ?, updated_at = ? WHERE handle = ?",
          [hHex, now, hStr]
        );
      }
    } else {
      this.#db.run(
        "INSERT INTO handle_registry (handle, current_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [hStr, hHex, now, now]
      );
    }
  }
  resolveHandle(handle) {
    const res = this.#db.exec("SELECT current_hash FROM handle_registry WHERE handle = ?", [handle.asString()]);
    const table = res[0];
    if (!table || table.values.length === 0) return void 0;
    const val = table.values[0]?.[0];
    if (typeof val !== "string") return void 0;
    return ContentHash.parse(val);
  }
  handleHistory(handle) {
    const res = this.#db.exec("SELECT previous_hash FROM handle_history WHERE handle = ? ORDER BY id ASC", [handle.asString()]);
    const table = res[0];
    const hashes = [];
    if (table) {
      for (const row of table.values) {
        if (typeof row[0] === "string") {
          hashes.push(ContentHash.parse(row[0]));
        }
      }
    }
    const current = this.resolveHandle(handle);
    if (current && !hashes.some((h) => h.asHex() === current.asHex())) {
      hashes.push(current);
    }
    return hashes;
  }
  snapshot() {
    this.#savepointCounter += 1;
    const name = `sp_${this.#savepointCounter}_${Date.now()}`;
    try {
      this.#db.run(`SAVEPOINT ${name};`);
      return {
        timestamp: Date.now(),
        cardCount: this.count(),
        savepointName: name
      };
    } catch {
      const exportedData = this.#db.export ? this.#db.export() : void 0;
      return {
        timestamp: Date.now(),
        cardCount: this.count(),
        exportedData
      };
    }
  }
  restore(snapshot) {
    const snap = snapshot;
    if (snap.savepointName) {
      this.#db.run(`ROLLBACK TO SAVEPOINT ${snap.savepointName};`);
      this.#db.run(`RELEASE SAVEPOINT ${snap.savepointName};`);
    }
  }
  exportBinary() {
    return this.#db.export ? this.#db.export() : void 0;
  }
  close() {
    if (this.#db.close) {
      this.#db.close();
    }
  }
};

// node_modules/clm-kernel/dist/chunk-6Q6G7HQX.js
init_buffer();
function parseYamlOrJson(text) {
  const trimmed = text.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
    }
  }
  return parseYamlLines(text);
}
function parseYamlLines(yaml) {
  const lines = yaml.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, container: root }];
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const commentIdx = rawLine.indexOf("#");
    const lineWithoutComment = commentIdx >= 0 ? rawLine.slice(0, commentIdx) : rawLine;
    if (!lineWithoutComment.trim()) continue;
    const indent = rawLine.search(/\S/);
    const trimmed = lineWithoutComment.trim();
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const current = stack[stack.length - 1];
    if (trimmed.startsWith("- ")) {
      const itemContent = trimmed.slice(2).trim();
      let listTarget;
      if (Array.isArray(current.container)) {
        listTarget = current.container;
      } else {
        listTarget = [];
        const parent = stack.length > 1 ? stack[stack.length - 2] : null;
        if (parent && current.key && !Array.isArray(parent.container)) {
          parent.container[current.key] = listTarget;
        } else if (current.key) {
          current.container[current.key] = listTarget;
        }
        current.container = listTarget;
      }
      if (itemContent.includes(": ") && !itemContent.startsWith('"') && !itemContent.startsWith("'")) {
        const objItem = {};
        listTarget.push(objItem);
        const colonIdx2 = itemContent.indexOf(": ");
        const k = itemContent.slice(0, colonIdx2).trim();
        const v = parseYamlValue(itemContent.slice(colonIdx2 + 2).trim());
        objItem[k] = v;
        stack.push({ indent, container: objItem });
      } else {
        listTarget.push(parseYamlValue(itemContent));
      }
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      const valStr = trimmed.slice(colonIdx + 1).trim();
      if (valStr === "") {
        const newObj = {};
        if (Array.isArray(current.container)) {
          const wrapper = {};
          wrapper[key] = newObj;
          current.container.push(wrapper);
        } else {
          current.container[key] = newObj;
        }
        stack.push({ indent, container: newObj, key });
      } else {
        const parsedVal = parseYamlValue(valStr);
        if (Array.isArray(current.container)) {
          const wrapper = {};
          wrapper[key] = parsedVal;
          current.container.push(wrapper);
        } else {
          current.container[key] = parsedVal;
        }
      }
    }
  }
  return root;
}
function parseYamlValue(val) {
  if (val === "" || val === "~" || val === "null") return null;
  if (val === "true" || val === "yes" || val === "on") return true;
  if (val === "false" || val === "no" || val === "off") return false;
  if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1);
  }
  if (val.startsWith("{") && val.endsWith("}")) {
    try {
      return JSON.parse(val);
    } catch {
    }
  }
  if (val.startsWith("[") && val.endsWith("]")) {
    const inner = val.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => parseYamlValue(s.trim()));
  }
  if (/^-?\d+(\.\d+)?$/.test(val)) {
    const num = Number(val);
    if (!isNaN(num)) return num;
  }
  return val;
}

// node_modules/clm-kernel/dist/chunk-FGQYYOHK.js
var backendRegistry = /* @__PURE__ */ new Map();
function registerBackendPlugin(plugin) {
  backendRegistry.set(plugin.id, plugin);
}
registerBackendPlugin({
  id: "memory",
  priority: 1,
  isSupported: (env, options) => Boolean(options?.forceMemory || env.isZeroFs),
  createBackend: () => new MemoryBackend()
});
registerBackendPlugin({
  id: "sqljs",
  priority: 1,
  isSupported: (_env, options) => Boolean(options?.sqlJsDb),
  createBackend: (options) => new SqlJsBackend(options.sqlJsDb)
});
registerBackendPlugin({
  id: "node-sqlite",
  priority: 0,
  isSupported: (env, options) => env.isNode && !options?.forceMemory && !env.isZeroFs,
  createBackend: (options) => {
    try {
      return new NodeSqliteBackend(options?.dbPath ?? ":memory:");
    } catch {
      return new MemoryBackend();
    }
  }
});
function isBinary(data) {
  if (data.length === 0) {
    return false;
  }
  const limit = Math.min(data.length, 8192);
  const sample = data.subarray(0, limit);
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) {
      return true;
    }
  }
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const text = decoder.decode(sample);
    let controlCount = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 9 || code > 13 && code < 32) {
        controlCount++;
      }
    }
    return controlCount > sample.length * 0.1;
  } catch {
    return true;
  }
}
var STATIC_MAGIC_RULES = [
  // PNG: \x89PNG\r\n\x1a\n
  { magic: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), mime: "image/png" },
  // JPEG: \xFF\xD8\xFF
  { magic: new Uint8Array([255, 216, 255]), mime: "image/jpeg" },
  // GIF: GIF87a or GIF89a
  { magic: new Uint8Array([71, 73, 70, 56]), mime: "image/gif" },
  // PDF: %PDF
  { magic: new Uint8Array([37, 80, 68, 70]), mime: "application/pdf" },
  // ZIP: PK\x03\x04
  { magic: new Uint8Array([80, 75, 3, 4]), mime: "application/zip" },
  // SQLite format 3\0
  {
    magic: new Uint8Array([
      83,
      81,
      76,
      105,
      116,
      101,
      32,
      102,
      111,
      114,
      109,
      97,
      116,
      32,
      51,
      0
    ]),
    mime: "application/sqlite3"
  },
  // GLB: glTF
  { magic: new Uint8Array([103, 108, 84, 70]), mime: "model/gltf-binary" },
  // MP3 ID3 tag
  { magic: new Uint8Array([73, 68, 51]), mime: "audio/mpeg" }
];
var EXTENSION_MAP = {
  // Documents & specifications
  pdf: "application/pdf",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  text: "text/plain",
  json: "application/json",
  yaml: "application/yaml",
  yml: "application/yaml",
  xml: "text/xml",
  html: "text/html",
  htm: "text/html",
  csv: "text/csv",
  // Code & scripts
  js: "application/javascript",
  mjs: "application/javascript",
  cjs: "application/javascript",
  ts: "text/typescript",
  tsx: "text/typescript",
  py: "text/x-python",
  sh: "text/x-shellscript",
  // Images
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  // 3D Spatial Models
  "3ds": "model/x-3ds",
  obj: "model/obj",
  stl: "model/stl",
  gltf: "model/gltf+json",
  glb: "model/gltf-binary",
  // Audio & Video
  wav: "audio/wav",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  // Fonts
  ttf: "font/ttf",
  woff2: "font/woff2",
  // Mathematical & Category Diagrams
  tikz: "text/x-tikz",
  tikzcd: "text/x-tikzcd",
  "tikz-cd": "text/x-tikzcd",
  tex: "application/x-tex"
};
function detectMime(data, extHint = "") {
  if (data.length === 0) {
    if (extHint) {
      const ext = extHint.includes(".") ? extHint.split(".").pop() : extHint;
      const cleanHint = ext.replace(/^\.+/, "").toLowerCase();
      if (cleanHint in EXTENSION_MAP) {
        return EXTENSION_MAP[cleanHint];
      }
    }
    return "application/octet-stream";
  }
  if (data.length >= 12 && data[0] === 82 && data[1] === 73 && data[2] === 70 && data[3] === 70) {
    const formatTag = String.fromCharCode(data[8], data[9], data[10], data[11]);
    if (formatTag === "WEBP") return "image/webp";
    if (formatTag === "WAVE") return "audio/wav";
  }
  if (data.length >= 8 && data[4] === 102 && data[5] === 116 && data[6] === 121 && data[7] === 112) {
    return "video/mp4";
  }
  for (const rule of STATIC_MAGIC_RULES) {
    if (data.length >= rule.magic.length) {
      let matched = true;
      for (let i = 0; i < rule.magic.length; i++) {
        if (data[i] !== rule.magic[i]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return rule.mime;
      }
    }
  }
  if (extHint) {
    const ext = extHint.includes(".") ? extHint.split(".").pop() : extHint;
    const cleanHint = ext.replace(/^\.+/, "").toLowerCase();
    if (cleanHint in EXTENSION_MAP) {
      return EXTENSION_MAP[cleanHint];
    }
  }
  return isBinary(data) ? "application/octet-stream" : "text/plain";
}
function classifyClm(data) {
  if (!data || typeof data !== "object") {
    return "Number";
  }
  const obj = data;
  const clm = obj.clm ?? obj;
  const abstractSpec = clm.abstract_spec?.context ?? clm.abstract?.context ?? clm.abstract_spec ?? clm.abstract;
  const concreteImpl = clm.concrete_impl?.process?.type ?? clm.concrete_impl?.process_behavior_exec?.dispatcher ?? clm.concrete_impl?.runtime ?? clm.concrete?.runtime ?? clm.concrete_impl?.operation ?? clm.concrete?.process;
  const hasAbstract = abstractSpec !== void 0 && abstractSpec !== null && String(abstractSpec).trim() !== "";
  const hasConcrete = concreteImpl !== void 0 && concreteImpl !== null && String(concreteImpl).trim() !== "";
  if (hasAbstract && hasConcrete) {
    return "Function";
  }
  return "Number";
}

// node_modules/clm-kernel/dist/chunk-HGOFBNYK.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-5PM2X6RO.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-MY7DUMYC.js
init_buffer();
var MCardCollection = class _MCardCollection {
  #backend;
  constructor(backend) {
    this.#backend = backend ?? new MemoryBackend();
  }
  /** Returns the underlying StorageBackend instance. */
  get storageBackend() {
    return this.#backend;
  }
  /**
   * Constructs an MCardCollection sharing the underlying storage backend of a virtual filesystem.
   * Zero-copy bridge connecting Layer 2 VFS with Layer 0 collection.
   */
  static fromFileSystem(fs) {
    return new _MCardCollection(fs.storageBackend);
  }
  /**
   * Store an MCard in the collection by its content hash.
   * Returns the content hash. Duplicate puts are idempotent.
   */
  put(mcard) {
    this.#backend.put(mcard.hash, mcard);
    return mcard.hash;
  }
  /**
   * Store an MCard and register it under a handle.
   * The handle history preserves all prior hashes.
   */
  putWithHandle(mcard, handle) {
    const h = typeof handle === "string" ? Handle.create(handle) : handle;
    this.#backend.put(mcard.hash, mcard);
    this.#backend.registerHandle(h, mcard.hash);
    return mcard.hash;
  }
  /** Retrieve an MCard by its content hash. */
  get(hash) {
    return this.#backend.get(hash);
  }
  /** Check if a content hash exists. */
  has(hash) {
    return this.#backend.has(hash);
  }
  /** List all stored MCards. */
  list() {
    return this.#backend.list();
  }
  /** Total count of stored MCards. */
  count() {
    return this.#backend.count();
  }
  /** Resolve a handle to its latest content hash. */
  resolve(handle) {
    const h = typeof handle === "string" ? Handle.create(handle) : handle;
    return this.#backend.resolveHandle(h);
  }
  /** Resolve a handle to its latest content hash (alias for resolve matching StorageBackend API). */
  resolveHandle(handle) {
    return this.resolve(handle);
  }
  /** Get the full hash history for a handle (oldest first). */
  history(handle) {
    const h = typeof handle === "string" ? Handle.create(handle) : handle;
    return this.#backend.handleHistory(h);
  }
  /** Create a snapshot for SavepointGuard rollback. */
  snapshot() {
    return this.#backend.snapshot();
  }
  /** Restore from a previous snapshot. */
  restore(snapshot) {
    this.#backend.restore(snapshot);
  }
  /** The underlying storage backend. */
  get backend() {
    return this.#backend;
  }
};

// node_modules/clm-kernel/dist/chunk-F6Q5OORP.js
init_buffer();
init_crypto();
var NOISE_BLOCKLEN = 64;
var NOISE_HASHLEN = 32;
function blake3Digest(data) {
  return hexToBytes(blake3Hash(data));
}
function hmacBlake3(key, data) {
  const blockSize = NOISE_BLOCKLEN;
  const k = new Uint8Array(blockSize);
  if (key.length > blockSize) {
    k.set(blake3Digest(key));
  } else {
    k.set(key);
  }
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = k[i] ^ 54;
    opad[i] = k[i] ^ 92;
  }
  const innerBuf = new Uint8Array(blockSize + data.length);
  innerBuf.set(ipad, 0);
  innerBuf.set(data, blockSize);
  const innerHash = blake3Digest(innerBuf);
  const outerBuf = new Uint8Array(blockSize + 32);
  outerBuf.set(opad, 0);
  outerBuf.set(innerHash, blockSize);
  return blake3Digest(outerBuf);
}
function hkdf2(ck, ikm) {
  const prk = hmacBlake3(ck, ikm);
  const out1 = hmacBlake3(prk, new Uint8Array([1]));
  const info2 = new Uint8Array(33);
  info2.set(out1, 0);
  info2[32] = 2;
  const out2 = hmacBlake3(prk, info2);
  return [out1, out2];
}
function hkdf3(ck, ikm) {
  const prk = hmacBlake3(ck, ikm);
  const out1 = hmacBlake3(prk, new Uint8Array([1]));
  const info2 = new Uint8Array(33);
  info2.set(out1, 0);
  info2[32] = 2;
  const out2 = hmacBlake3(prk, info2);
  const info3 = new Uint8Array(33);
  info3.set(out2, 0);
  info3[32] = 3;
  const out3 = hmacBlake3(prk, info3);
  return [out1, out2, out3];
}
function diffieHellmanX25519(privateKey, publicKey) {
  if (privateKey.length !== 32) throw new Error(`X25519 private key must be 32 bytes, got ${privateKey.length}`);
  if (publicKey.length !== 32) throw new Error(`X25519 public key must be 32 bytes, got ${publicKey.length}`);
  const privObj = (void 0)({
    key: BufferShim.concat([toBuffer(X25519_PKCS8_PREFIX), BufferShim.from(privateKey)]),
    format: "der",
    type: "pkcs8"
  });
  const pubObj = (void 0)({
    key: BufferShim.concat([toBuffer(X25519_SPKI_PREFIX), BufferShim.from(publicKey)]),
    format: "der",
    type: "spki"
  });
  return new Uint8Array((void 0)({ privateKey: privObj, publicKey: pubObj }));
}
function generateEphemeralX25519(seed) {
  const privBytes = seed ? new Uint8Array(seed) : new Uint8Array(randomBytes(32));
  const privObj = (void 0)({
    key: BufferShim.concat([toBuffer(X25519_PKCS8_PREFIX), BufferShim.from(privBytes)]),
    format: "der",
    type: "pkcs8"
  });
  const pubObj = (void 0)(privObj);
  const pub = pubObj.export({ type: "spki", format: "der" }).subarray(-32);
  return { privateKey: privBytes, publicKey: new Uint8Array(pub) };
}

// node_modules/clm-kernel/dist/chunk-LP6KEZAL.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-HGOFBNYK.js
init_crypto();

// public/js/mcard-kernel/node-shims/dgram.js
init_buffer();
var unavailable2 = (name) => () => {
  throw new Error(`dgram shim: '${name}' is a Node-only API and is unavailable in the browser`);
};
var createSocket = unavailable2("createSocket");

// public/js/mcard-kernel/node-shims/events.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-HGOFBNYK.js
init_crypto();

// public/js/mcard-kernel/node-shims/http.js
init_buffer();
var unavailable3 = (name) => () => {
  throw new Error(`http shim: '${name}' is a Node-only API and is unavailable in the browser`);
};
var createServer = unavailable3("createServer");
var request = unavailable3("request");
var get = unavailable3("get");

// node_modules/clm-kernel/dist/chunk-HGOFBNYK.js
var import_ws = __toESM(require_browser(), 1);
var import_ws2 = __toESM(require_browser(), 1);

// node_modules/cordis/lib/index.js
init_buffer();

// node_modules/cosmokit/lib/index.mjs
init_buffer();
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

// node_modules/cordis/lib/index.js
var __defProp3 = Object.defineProperty;
var __name = (target, value) => __defProp3(target, "name", { value, configurable: true });
var DisposableList2 = class {
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
        const hooks = this.fiber._hooks["internal/update"] ??= new DisposableList2();
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
  _disposables = new DisposableList2();
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
  function resolve2(inject, result = /* @__PURE__ */ Object.create(null)) {
    if (!inject) return result;
    if (Array.isArray(inject)) {
      for (const name of inject) {
        result[name] = null;
      }
    } else if (Reflect.has(inject, symbols.checkProto)) {
      Object.assign(result, resolve2(Object.getPrototypeOf(inject)));
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
  Inject2.resolve = resolve2;
  __name(resolve2, "resolve");
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
      runtime = { name, callback, fibers: new DisposableList2(), Config: plugin.Config };
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

// node_modules/clm-kernel/dist/chunk-HGOFBNYK.js
var import_ws3 = __toESM(require_browser(), 1);
init_crypto();
init_crypto();
init_crypto();
init_crypto();
init_crypto();
init_crypto();
var LocalMediaPlugin = class {
  medium = "local";
  async resolve(context) {
    try {
      const card = context.backend.get(context.contentHash);
      if (card) {
        return {
          content: extractPayloadString(card.payload),
          status: 0
        };
      }
    } catch {
    }
    return { content: "", status: 2 };
  }
};
var FileMediaPlugin = class {
  medium = "file";
  async resolve(context) {
    const fileUri = String(context.routeData.uri ?? "");
    const filePath = fileUri.replace(/^file:\/\//, "");
    try {
      if (typeof process !== "undefined" && process.versions && process.versions.node) {
        const fs = await Promise.resolve().then(() => (init_fs(), fs_exports));
        const path = await Promise.resolve().then(() => (init_path(), path_exports));
        let resolvedPath = filePath;
        if (!path.isAbsolute(filePath)) {
          resolvedPath = path.resolve(context.workspaceRoot, filePath);
        }
        const fileText = await fs.readFile(resolvedPath, "utf8");
        return { content: fileText, status: 0 };
      }
    } catch {
    }
    return { content: "", status: 2 };
  }
};
var HttpMediaPlugin = class {
  medium;
  constructor(medium = "http") {
    this.medium = medium;
  }
  async resolve(context) {
    const url = String(context.routeData.uri ?? "");
    if (!context.fetchFn) {
      return { content: "", status: 2 };
    }
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : void 0;
      const timeoutId = controller ? setTimeout(() => controller.abort(), context.timeoutMs) : void 0;
      const res = await context.fetchFn(url, {
        headers: { "User-Agent": "CLM/1.0" },
        signal: controller ? controller.signal : void 0
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        return { content: text, status: 0 };
      }
    } catch {
    }
    return { content: "", status: 2 };
  }
};
var IpfsMediaPlugin = class {
  medium = "ipfs";
  async resolve(context) {
    const ipfsUri = String(context.routeData.uri ?? "");
    const cid = ipfsUri.replace(/^ipfs:\/\//, "");
    if (!context.fetchFn) {
      return { content: "", status: 2 };
    }
    const urls = [
      `http://127.0.0.1:5001/api/v0/cat?arg=${cid}`,
      `https://ipfs.io/ipfs/${cid}`
    ];
    for (const u of urls) {
      try {
        const controller = typeof AbortController !== "undefined" ? new AbortController() : void 0;
        const timeoutId = controller ? setTimeout(() => controller.abort(), context.timeoutMs) : void 0;
        const res = await context.fetchFn(u, { signal: controller ? controller.signal : void 0 });
        if (timeoutId) clearTimeout(timeoutId);
        if (res.ok) {
          const text = await res.text();
          return { content: text, status: 0 };
        }
      } catch {
      }
    }
    return { content: "", status: 2 };
  }
};
var IndexedDbMediaPlugin = class {
  medium = "indexeddb";
  async resolve(_context) {
    return { content: "", status: 2 };
  }
};
var MediumRegistry = class {
  plugins = /* @__PURE__ */ new Map();
  register(plugin) {
    this.plugins.set(plugin.medium.toLowerCase(), plugin);
  }
  get(medium) {
    return this.plugins.get(medium.toLowerCase());
  }
};
function extractPayloadString(payload) {
  if (payload.kind === "text") return payload.value;
  if (payload.kind === "scalar") return String(payload.value ?? "");
  if (payload.kind === "structured") return JSON.stringify(payload.value);
  if (payload.kind === "binary") {
    if (typeof BufferShim !== "undefined") {
      return BufferShim.from(payload.data).toString("utf8");
    }
    return new TextDecoder().decode(payload.data);
  }
  return "";
}
var defaultMediumRegistry = new MediumRegistry();
defaultMediumRegistry.register(new LocalMediaPlugin());
defaultMediumRegistry.register(new FileMediaPlugin());
defaultMediumRegistry.register(new HttpMediaPlugin("http"));
defaultMediumRegistry.register(new HttpMediaPlugin("https"));
defaultMediumRegistry.register(new IpfsMediaPlugin());
defaultMediumRegistry.register(new IndexedDbMediaPlugin());
var VALID_TRANSITIONS = {
  "pending": ["loading", "error"],
  "loading": ["active", "error"],
  "active": ["suspended", "unloading", "error"],
  "suspended": ["active", "unloading", "error"],
  "unloading": ["disposed", "error"],
  "disposed": [],
  "error": ["disposed"]
};
var FiberLifecycle = class {
  id;
  coeffects;
  #state = "pending";
  #listeners = [];
  #disposables = new DisposableList();
  #guard;
  constructor(id, coeffects) {
    this.id = id;
    this.coeffects = coeffects;
  }
  /** Current fiber state. */
  get state() {
    return this.#state;
  }
  /** The DisposableList for registering cleanup actions during Active phase. */
  get disposables() {
    return this.#disposables;
  }
  /** The SavepointGuard (only available during active transaction). */
  get guard() {
    return this.#guard;
  }
  /** Register a transition event listener. */
  onTransition(listener) {
    this.#listeners.push(listener);
    return () => {
      const idx = this.#listeners.indexOf(listener);
      if (idx >= 0) this.#listeners.splice(idx, 1);
    };
  }
  /**
   * Transition: Pending → Loading → Active.
   * Creates a SavepointGuard, resolves any declared coeffects, and executes the loading function.
   * On failure: transitions to Error state, rolls back the guard, and unwinds disposables.
   */
  async load(fn, optionsOrSnapshot) {
    this.#transition("loading");
    let snapshot;
    let ctx;
    let timeoutMs;
    if (optionsOrSnapshot !== null && typeof optionsOrSnapshot === "object" && ("ctx" in optionsOrSnapshot || "snapshot" in optionsOrSnapshot || "timeoutMs" in optionsOrSnapshot)) {
      const opts = optionsOrSnapshot;
      snapshot = opts.snapshot;
      ctx = opts.ctx;
      timeoutMs = opts.timeoutMs;
    } else {
      snapshot = optionsOrSnapshot;
    }
    const guard = new SavepointGuard();
    this.#guard = guard;
    guard.begin(snapshot ?? {});
    try {
      if (this.coeffects && this.coeffects.requiredServices && this.coeffects.requiredServices.length > 0) {
        if (!ctx) {
          throw new Error(
            `FiberLifecycle [${this.id}]: Cordis Context required to resolve coeffects: ${this.coeffects.requiredServices.join(", ")}`
          );
        }
        await resolveCoeffects(this.coeffects, ctx, timeoutMs);
      }
      await fn(guard);
      this.#transition("active");
    } catch (err) {
      this.#transitionToError(err instanceof Error ? err : new Error(String(err)));
      if (guard.state === "active") {
        await guard.rollback();
      }
      await this.#disposables.dispose();
      throw err;
    }
  }
  /**
   * Execute work in the Active state.
   * On failure: transitions to Error, rolls back the guard, and unwinds disposables.
   */
  async activate(fn) {
    if (this.#state !== "active") {
      throw new Error(`FiberLifecycle: expected state "active", got "${this.#state}"`);
    }
    try {
      await fn();
    } catch (err) {
      this.#transitionToError(err instanceof Error ? err : new Error(String(err)));
      if (this.#guard?.state === "active") {
        await this.#guard.rollback();
      }
      await this.#disposables.dispose();
      throw err;
    }
  }
  /**
   * Transition: Active → Suspended (Delimited Continuation parking).
   */
  suspend() {
    if (this.#state !== "active") {
      throw new Error(`FiberLifecycle: expected state "active" to suspend, got "${this.#state}"`);
    }
    this.#transition("suspended");
  }
  /**
   * Transition: Suspended → Active (Resuming from continuation).
   */
  resume() {
    if (this.#state !== "suspended") {
      throw new Error(`FiberLifecycle: expected state "suspended" to resume, got "${this.#state}"`);
    }
    this.#transition("active");
  }
  /**
   * Transition: Active → Unloading → Disposed.
   * Commits the SavepointGuard, unwinds registered disposables, and transitions to Disposed.
   */
  async unload(fn) {
    if (this.#state !== "active") {
      throw new Error(`FiberLifecycle: expected state "active", got "${this.#state}"`);
    }
    this.#transition("unloading");
    try {
      if (fn) await fn();
      if (this.#guard?.state === "active") {
        this.#guard.commit();
      }
      await this.#disposables.dispose();
      this.#transition("disposed");
    } catch (err) {
      this.#transitionToError(err instanceof Error ? err : new Error(String(err)));
      if (this.#guard?.state === "active") {
        await this.#guard.rollback();
      }
      await this.#disposables.dispose();
      throw err;
    }
  }
  /** Force-dispose from any state (cleanup). */
  async forceDispose() {
    if (this.#state === "disposed") return;
    const from = this.#state;
    if (this.#guard?.state === "active") {
      await this.#guard.rollback();
    }
    if (!this.#disposables.disposed) {
      await this.#disposables.dispose();
    }
    this.#state = "disposed";
    this.#emitEvent(from, "disposed");
  }
  // ── Private ───────────────────────────────────────────────────────────
  #transition(to) {
    const from = this.#state;
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed?.includes(to)) {
      throw new Error(`FiberLifecycle: invalid transition "${from}" \u2192 "${to}"`);
    }
    this.#state = to;
    this.#emitEvent(from, to);
  }
  #transitionToError(error) {
    const from = this.#state;
    this.#state = "error";
    this.#emitEvent(from, "error", error);
  }
  #emitEvent(from, to, error) {
    const event = {
      fiberId: this.id,
      from,
      to,
      timestamp: Date.now(),
      error
    };
    for (const listener of this.#listeners) {
      try {
        listener(event);
      } catch {
      }
    }
  }
};
var SATORI_OPCODES = {
  text: 1,
  at: 2,
  quote: 3,
  image: 4,
  audio: 5,
  video: 6,
  button: 7,
  action: 8,
  card: 9,
  execute: 10,
  witness: 11,
  custom: 12,
  message: 16
};
var OPCODES_TO_TYPE = Object.fromEntries(
  Object.entries(SATORI_OPCODES).map(([k, v]) => [v, k])
);
var ED25519_PKCS8_PREFIX2 = toBuffer(ED25519_PKCS8_PREFIX);
var ED25519_SPKI_PREFIX22 = toBuffer(ED25519_SPKI_PREFIX);
var X25519_PKCS8_PREFIX2 = toBuffer(X25519_PKCS8_PREFIX);
var X25519_SPKI_PREFIX2 = toBuffer(X25519_SPKI_PREFIX);
var X25519_SPKI_HEADER = BufferShim.from("302a300506032b656e032100", "hex");

// node_modules/clm-kernel/dist/chunk-TJBHIBS5.js
init_buffer();
init_crypto();
init_crypto();
function computeDeltaE(baselineScore, candidateScore) {
  const diff = candidateScore - baselineScore;
  return Math.round(diff * 1e6) / 1e6;
}
function sha256Hex(data) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}
function evaluateEpistemicFitness(candidateScore, baselineScore = 1, evaluationSpec = "default_spec") {
  const delta = computeDeltaE(baselineScore, candidateScore);
  const monotonic = delta >= 0;
  const status = monotonic ? "COMMITTED" : "REJECTED_REGRESSION";
  return {
    baseline_score: baselineScore,
    candidate_score: candidateScore,
    delta_e: delta,
    monotonic,
    status,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    details: {
      evaluation_spec: typeof evaluationSpec === "string" ? evaluationSpec : JSON.stringify(evaluationSpec)
    }
  };
}
function sealEpoch(epochId, deltaE, hypothesisHash, baselineFitness) {
  const stateRepr = `epoch:${epochId}:fitness:${baselineFitness}:delta:${deltaE}:hyp:${hypothesisHash}`;
  const epochHash = sha256Hex(stateRepr);
  return {
    epoch_id: epochId,
    epoch_hash: epochHash,
    baseline_fitness: baselineFitness,
    sealed_at: (/* @__PURE__ */ new Date()).toISOString(),
    hypothesis_history: hypothesisHash ? [hypothesisHash] : []
  };
}
function advanceBoundary(currentEpoch, newFitness) {
  const nextId = currentEpoch.epoch_id + 1;
  const stateRepr = `epoch:${nextId}:parent:${currentEpoch.epoch_hash}:fitness:${newFitness}`;
  const nextHash = sha256Hex(stateRepr);
  return {
    epoch_id: nextId,
    epoch_hash: nextHash,
    baseline_fitness: newFitness,
    sealed_at: (/* @__PURE__ */ new Date()).toISOString(),
    hypothesis_history: [...currentEpoch.hypothesis_history]
  };
}
function closeGammaLoop(hypothesis, currentEpoch, evaluationSpec, evaluator) {
  const candidateScore = evaluator ? evaluator(hypothesis, evaluationSpec) : 1;
  const report = evaluateEpistemicFitness(
    candidateScore,
    currentEpoch.baseline_fitness,
    evaluationSpec
  );
  if (!report.monotonic) {
    return [false, currentEpoch, report];
  }
  const sealed = sealEpoch(
    currentEpoch.epoch_id,
    report.delta_e,
    hypothesis.candidate_state_hash,
    report.candidate_score
  );
  const nextEpoch = advanceBoundary(sealed, report.candidate_score);
  return [true, nextEpoch, report];
}
var ContinuousLearningEngine = class {
  currentEpoch;
  history = [];
  quarantinedMutations = /* @__PURE__ */ new Map();
  constructor(initialEpoch = 1, initialFitness = 1) {
    const genesisRepr = `genesis:${initialEpoch}`;
    this.currentEpoch = {
      epoch_id: initialEpoch,
      epoch_hash: sha256Hex(genesisRepr),
      baseline_fitness: initialFitness,
      sealed_at: (/* @__PURE__ */ new Date()).toISOString(),
      hypothesis_history: []
    };
  }
  /**
   * Submit candidate refinement under write-scope quarantine (INV-14).
   */
  submitHypothesis(hypothesisId, authorDid, candidateStateHash, patches = [], targetInvariants = ["INV-14"]) {
    const hyp = {
      hypothesis_id: hypothesisId,
      author_did: authorDid,
      epoch_id: this.currentEpoch.epoch_id,
      candidate_state_hash: candidateStateHash,
      candidate_patches: patches,
      target_invariants: targetInvariants,
      status: "QUARANTINED"
    };
    this.quarantinedMutations.set(hypothesisId, hyp);
    return hyp;
  }
  /**
   * Evaluate a quarantined hypothesis and commit if monotonic.
   */
  evaluateAndCommit(hypothesisId, evaluationSpec, candidateFitness) {
    const hyp = this.quarantinedMutations.get(hypothesisId);
    if (!hyp) {
      throw new Error(`No quarantined hypothesis found for ${hypothesisId}`);
    }
    const [success, nextEpoch, report] = closeGammaLoop(
      hyp,
      this.currentEpoch,
      evaluationSpec,
      () => candidateFitness
    );
    this.history.push(report);
    if (success) {
      report.status = "COMMITTED";
      this.currentEpoch = nextEpoch;
      this.quarantinedMutations.delete(hypothesisId);
      return [true, report];
    } else {
      report.status = "REJECTED_REGRESSION";
      this.quarantinedMutations.delete(hypothesisId);
      return [false, report];
    }
  }
  /**
   * Karpathy write-scope quarantine security check (INV-14).
   */
  canCommitToHandleRegistry(hypothesis, report) {
    if (hypothesis.status === "QUARANTINED" && report.status !== "COMMITTED") {
      return false;
    }
    return report.monotonic && report.delta_e >= 0 && report.status === "COMMITTED";
  }
};
var LoopGammaTelemetryHook = class {
  authorDid;
  currentEpoch;
  evaluatedReports = [];
  hypotheses = [];
  constructor(authorDid, initialEpoch) {
    this.authorDid = authorDid ?? "did:clm:meta-loop-gamma";
    this.currentEpoch = initialEpoch ?? sealEpoch(1, 0, "0".repeat(64), 1);
  }
  /**
   * Processes a telemetry event. If the event denotes an execution anomaly or failure,
   * triggers autonomous hypothesis generation and epistemic evaluation.
   */
  onTelemetryEvent(eventType, payload, candidateEvaluator) {
    const isFailure = payload["success"] === false || Boolean(payload["error"]) || payload["status"] === "failed" || payload["status"] === "error" || eventType.includes("invariant_breach");
    if (!isFailure) {
      return null;
    }
    const errorMsg = String(payload["error"] ?? "Simulated execution anomaly");
    const hypoId = `hypo_${randomBytes(6).toString("hex")}`;
    const stateRepr = `${eventType}:${errorMsg}:${Date.now()}`;
    const stateHash = createHash("sha256").update(stateRepr, "utf8").digest("hex");
    const hypothesis = {
      hypothesis_id: hypoId,
      author_did: this.authorDid,
      epoch_id: this.currentEpoch.epoch_id,
      candidate_state_hash: stateHash,
      candidate_patches: [
        {
          target: eventType,
          remedy: `Mitigate ${errorMsg}`
        }
      ],
      target_invariants: ["INV-14", "INV-391-03"],
      status: "QUARANTINED"
    };
    this.hypotheses.push(hypothesis);
    const [accepted, nextEpoch, report] = closeGammaLoop(
      hypothesis,
      this.currentEpoch,
      { anomaly_payload: payload, event_type: eventType },
      (hyp) => candidateEvaluator ? candidateEvaluator(hyp, payload) : 1
    );
    this.evaluatedReports.push(report);
    if (accepted) {
      this.currentEpoch = nextEpoch;
    }
    return report;
  }
  /**
   * Helper for test verification: injects an anomaly event and evaluates hypothesis.
   */
  simulateAnomalyAndEvaluate(errorMessage = "Simulated invariant breach", candidateFitness = 1) {
    const payload = { success: false, error: errorMessage };
    const report = this.onTelemetryEvent(
      "invariant_breach",
      payload,
      () => candidateFitness
    );
    if (!report) {
      throw new Error("Expected anomaly report to be generated");
    }
    return report;
  }
};
var UniverseLevel = /* @__PURE__ */ ((UniverseLevel2) => {
  UniverseLevel2[UniverseLevel2["U0_Mcard"] = 0] = "U0_Mcard";
  UniverseLevel2[UniverseLevel2["U1_Pcard"] = 1] = "U1_Pcard";
  UniverseLevel2[UniverseLevel2["U2_Vcard"] = 2] = "U2_Vcard";
  UniverseLevel2[UniverseLevel2["U3_Satori"] = 3] = "U3_Satori";
  UniverseLevel2[UniverseLevel2["U4_Membrane"] = 4] = "U4_Membrane";
  UniverseLevel2[UniverseLevel2["U5_MetaGamma"] = 5] = "U5_MetaGamma";
  return UniverseLevel2;
})(UniverseLevel || {});
function getUniverseCoordinates() {
  return [
    {
      level: 0,
      identifier: "U0",
      stratum_name: "mcard_cas",
      description: "Static Content-Addressable Storage (MCard)"
    },
    {
      level: 1,
      identifier: "U1",
      stratum_name: "pcard_net",
      description: "Linear Transitions & Colored Petri Net (PCard)"
    },
    {
      level: 2,
      identifier: "U2",
      stratum_name: "vcard_proof",
      description: "Cryptographic Verification & Hoare Receipts (VCard)"
    },
    {
      level: 3,
      identifier: "U3",
      stratum_name: "satori_fiber",
      description: "Distributed Reticulum Mesh & Satori Speech Acts"
    },
    {
      level: 4,
      identifier: "U4",
      stratum_name: "membrane_ui",
      description: "Omnichannel Interaction Surface & Generative Hypermedia"
    },
    {
      level: 5,
      identifier: "U5",
      stratum_name: "meta_gamma",
      description: "Meta-Circular Continuous Learning Stratum (Loop \u0393)"
    }
  ];
}
function isStratified(innerLevel, outerLevel) {
  return innerLevel <= outerLevel;
}
function validateUniverseLevel(level) {
  if (level < 0 || level > 5 || !Number.isInteger(level)) {
    throw new Error(`Invalid universe level: ${level} (expected integer 0..=5)`);
  }
  return level;
}
var layer5_exports = {};
__export2(layer5_exports, {
  AsyncEventBatcher: () => AsyncEventBatcher,
  ContinuousLearningEngine: () => ContinuousLearningEngine,
  LoopGammaTelemetryHook: () => LoopGammaTelemetryHook,
  UniverseLevel: () => UniverseLevel,
  advanceBoundary: () => advanceBoundary,
  closeGammaLoop: () => closeGammaLoop,
  computeDeltaE: () => computeDeltaE,
  evaluateEpistemicFitness: () => evaluateEpistemicFitness,
  getAsyncEventBatcher: () => getAsyncEventBatcher,
  getUniverseCoordinates: () => getUniverseCoordinates,
  isStratified: () => isStratified,
  sealEpoch: () => sealEpoch,
  validateUniverseLevel: () => validateUniverseLevel
});
var AsyncEventBatcher = class {
  buffer = [];
  maxBatchSize;
  flushIntervalMs;
  timer = null;
  isFlushing = false;
  constructor(maxBatchSize = 256, flushIntervalMs = 10) {
    this.maxBatchSize = maxBatchSize;
    this.flushIntervalMs = flushIntervalMs;
  }
  /**
   * Enqueue a telemetry event with sub-10 microsecond overhead.
   */
  record(record) {
    this.buffer.push(record);
    if (this.buffer.length >= this.maxBatchSize) {
      this.flushSync();
    } else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flushSync();
      }, this.flushIntervalMs);
    }
    return true;
  }
  /**
   * Flush all buffered events synchronously.
   */
  flushSync() {
    if (this.buffer.length === 0 || this.isFlushing) {
      return;
    }
    this.isFlushing = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.buffer.splice(0, this.buffer.length);
    this.isFlushing = false;
  }
  /**
   * Return number of currently queued records.
   */
  get queueLength() {
    return this.buffer.length;
  }
};
var globalBatcher = null;
function getAsyncEventBatcher() {
  if (!globalBatcher) {
    globalBatcher = new AsyncEventBatcher();
  }
  return globalBatcher;
}

// node_modules/clm-kernel/dist/chunk-UEE3EGVQ.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-KQ4I5C33.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-SXY3UQYM.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-UEE3EGVQ.js
init_fs();
init_fs();
init_path();

// node_modules/clm-kernel/dist/chunk-CSOLQ77U.js
init_buffer();
var shared_exports = {};
__export2(shared_exports, {
  ED25519_PKCS8_PREFIX: () => ED25519_PKCS8_PREFIX,
  ED25519_SPKI_PREFIX: () => ED25519_SPKI_PREFIX,
  NOISE_BLOCKLEN: () => NOISE_BLOCKLEN,
  NOISE_HASHLEN: () => NOISE_HASHLEN,
  X25519_PKCS8_PREFIX: () => X25519_PKCS8_PREFIX,
  X25519_SPKI_PREFIX: () => X25519_SPKI_PREFIX,
  blake3Digest: () => blake3Digest,
  bytesToHex: () => bytesToHex,
  constantTimeEqual: () => constantTimeEqual,
  decodeBase58: () => decodeBase58,
  diffieHellmanX25519: () => diffieHellmanX25519,
  encodeBase58: () => encodeBase58,
  extractBalancedBraces: () => extractBalancedBraces,
  generateEphemeralX25519: () => generateEphemeralX25519,
  generateRandomNonce: () => generateRandomNonce,
  hexToBytes: () => hexToBytes,
  hkdf2: () => hkdf2,
  hkdf3: () => hkdf3,
  hmacBlake3: () => hmacBlake3,
  normalizeToUint8Array: () => normalizeToUint8Array,
  parseYamlLines: () => parseYamlLines,
  parseYamlOrJson: () => parseYamlOrJson,
  parseYamlValue: () => parseYamlValue,
  toBuffer: () => toBuffer
});
function extractBalancedBraces(text, startIndex) {
  const openIdx = text.indexOf("{", startIndex);
  if (openIdx === -1) return null;
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        return { content: text.slice(openIdx + 1, i), endIndex: i };
      }
    }
  }
  return null;
}
function normalizeToUint8Array(input) {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (typeof input === "string") {
    return new TextEncoder().encode(input);
  }
  if (input && typeof BufferShim !== "undefined" && BufferShim.isBuffer(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (Array.isArray(input)) {
    return new Uint8Array(input);
  }
  return new Uint8Array(0);
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

// node_modules/clm-kernel/dist/chunk-35YKTZUZ.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-T7KCRONF.js
init_buffer();

// node_modules/clm-kernel/dist/chunk-RB7KYILQ.js
init_buffer();
var blake3Provider = new Blake3Provider();
var sha256Provider = new Sha256Provider();

// node_modules/clm-kernel/dist/chunk-T7KCRONF.js
var B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
var B58_MAP = new Array(128).fill(-1);
for (let i = 0; i < B58_ALPHABET.length; i++) {
  B58_MAP[B58_ALPHABET.charCodeAt(i)] = i;
}

// node_modules/clm-kernel/dist/index.js
init_crypto();

// public/js/mcard-kernel/indexeddb-backend.js
init_buffer();
var DB_NAME_DEFAULT = "mcard-storage";
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
    this.db = await new Promise((resolve2, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_CARDS)) db.createObjectStore(STORE_CARDS);
        if (!db.objectStoreNames.contains(STORE_HANDLES)) db.createObjectStore(STORE_HANDLES);
        if (!db.objectStoreNames.contains(STORE_HISTORY)) db.createObjectStore(STORE_HISTORY);
      };
      req.onsuccess = () => resolve2(req.result);
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
    return new Promise((resolve2) => {
      if (!this.db) return resolve2([]);
      const tx = this.db.transaction(store, "readonly");
      const req = tx.objectStore(store).openCursor();
      const out = [];
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve2(out);
        out.push([cur.key, cur.value]);
        cur.continue();
      };
      req.onerror = () => resolve2(out);
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

// public/js/mcard-kernel/compat.js
var DEFAULT_AUTHOR = AgentDid.create("did:clm:landing-page");
var sequenceCounter = 0;
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
    return this._card.getMetadata(key);
  }
  toJSON() {
    return this._card.toJSON();
  }
  /** The underlying kernel MCard, for code that needs the real thing. */
  get kernel() {
    return this._card;
  }
};
function decorate(card) {
  if (!card) return card;
  return card instanceof LegacyCard ? card : new LegacyCard(card);
}
var MCard2 = {
  create(content, options = {}) {
    const uri = options.uri ?? options.handle ?? `mcard:${Date.now()}-${sequenceCounter++}`;
    const metadata = new Map(Object.entries(options.metadata ?? {}));
    return decorate(MCard.create(
      uri,
      content,
      options.author ?? DEFAULT_AUTHOR,
      sequenceCounter++,
      metadata
    ));
  },
  fromObject(obj) {
    return decorate(MCard.fromJSON(obj));
  },
  fromJSON: (json) => decorate(MCard.fromJSON(json)),
  fromStorage: (...args) => decorate(MCard.fromStorage(...args)),
  withMetadata: (...args) => decorate(MCard.withMetadata(...args)),
  /** The unwrapped kernel class, for code that needs the real thing. */
  kernel: MCard
};
var CardCollection = class {
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
    const h = typeof hash === "string" ? ContentHash.fromHex(hash) : hash;
    return decorate(this._collection.get(h));
  }
  getByHandle(handle) {
    const hash = this._collection.resolve(handle);
    return hash ? this.get(hash) : void 0;
  }
  /** Accepts either a hash or a card, matching the legacy call shapes. */
  updateHandle(handle, hashOrCard) {
    let hex = hashOrCard;
    if (hashOrCard && typeof hashOrCard === "object" && hashOrCard.hash) {
      hex = hashOrCard.hash.asHex ? hashOrCard.hash.asHex() : hashOrCard.hash;
    }
    const h = typeof hex === "string" ? ContentHash.fromHex(hex) : hex;
    return this._collection.storageBackend.registerHandle(handle, h);
  }
  resolveHandle(handle) {
    const hash = this._collection.resolveHandle(handle);
    return hash ? hash.asHex ? hash.asHex() : hash : void 0;
  }
  getHandleHistory(handle) {
    return this._collection.history(handle).map((h) => h.asHex ? h.asHex() : h);
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
    const bytes = new TextEncoder().encode(text);
    try {
      const mime = detectMime(bytes, extHint);
      if (mime && mime !== "application/octet-stream") return mime;
    } catch {
    }
    return "text/plain";
  }
  /** Structural sniff for the text formats the UI renders. */
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
  static isUnstructuredBinary(content) {
    return _ContentTypeInterpreter.isBinaryContent(content);
  }
  static hasPathologicalLines(content, maxLength = 1e4) {
    const s = typeof content === "string" ? content : "";
    return s.split("\n").some((line) => line.length > maxLength);
  }
  static isKnownLongLineExtension(ext) {
    const known = /* @__PURE__ */ new Set(["json", "map", "csv", "svg", "lock", "wasm", "b64"]);
    const e = String(ext ?? "").replace(/^\./, "").toLowerCase();
    return known.has(e) || e.endsWith(".min.js");
  }
};
var GTime = class _GTime {
  constructor(value) {
    this.value = value instanceof Date ? value.toISOString() : String(value ?? (/* @__PURE__ */ new Date()).toISOString());
  }
  static now() {
    return new _GTime(/* @__PURE__ */ new Date());
  }
  static from(value) {
    return new _GTime(value);
  }
  toISOString() {
    return this.value;
  }
  toString() {
    return this.value;
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
  MCard2 as MCard,
  MCardCollection,
  Service,
  classifyClm,
  detectMime,
  validateHandle
};
