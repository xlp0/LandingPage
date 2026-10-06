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
    sep = "/";
    posix = { sep };
    path_default = { sep, posix, join, normalize, dirname, basename, extname, resolve, relative, isAbsolute };
  }
});

// node_modules/ws/browser.js
var require_browser = __commonJS({
  "node_modules/ws/browser.js"(exports, module) {
    "use strict";
    module.exports = function() {
      throw new Error(
        "ws does not work in the browser. Browser clients must use the native WebSocket object"
      );
    };
  }
});

// node_modules/clm-kernel/dist/chunk-R5U7XKVJ.js
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
  if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
    return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  return arr;
}

// node_modules/clm-kernel/dist/chunk-AOSZNTDH.js
init_crypto();
var ED25519_SPKI_PREFIX2 = toBuffer(ED25519_SPKI_PREFIX);

// node_modules/clm-kernel/dist/chunk-4G2UCRE5.js
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
  return Buffer.from(CANONICAL_MCARD_SCHEMA_B64, "base64").toString("utf-8");
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
    const bytes = Buffer.from(json, "utf-8");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const insertStmt = this.#db.prepare("INSERT INTO card (hash, content, g_time) VALUES (?, ?, ?)");
    insertStmt.run(key, bytes, now);
    return true;
  }
  get(hash) {
    const stmt = this.#db.prepare("SELECT content FROM card WHERE hash = ?");
    const row = stmt.get(hash.asHex());
    if (!row) return void 0;
    const json = typeof row.content === "string" ? row.content : Buffer.from(row.content).toString("utf-8");
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
      const json = typeof r.content === "string" ? r.content : Buffer.from(r.content).toString("utf-8");
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
    const bytes = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    const now = gTime ?? (/* @__PURE__ */ new Date()).toISOString();
    const insertStmt = this.#db.prepare("INSERT INTO card (hash, content, g_time) VALUES (?, ?, ?)");
    insertStmt.run(hash, bytes, now);
    return true;
  }
  getRaw(hash) {
    const stmt = this.#db.prepare("SELECT content, g_time FROM card WHERE hash = ?");
    const row = stmt.get(hash);
    if (!row) return void 0;
    const content = typeof row.content === "string" ? row.content : Buffer.from(row.content).toString("utf-8");
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

// node_modules/clm-kernel/dist/chunk-MY7DUMYC.js
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
    key: Buffer.concat([toBuffer(X25519_PKCS8_PREFIX), Buffer.from(privateKey)]),
    format: "der",
    type: "pkcs8"
  });
  const pubObj = (void 0)({
    key: Buffer.concat([toBuffer(X25519_SPKI_PREFIX), Buffer.from(publicKey)]),
    format: "der",
    type: "spki"
  });
  return new Uint8Array((void 0)({ privateKey: privObj, publicKey: pubObj }));
}
function generateEphemeralX25519(seed) {
  const privBytes = seed ? new Uint8Array(seed) : new Uint8Array(randomBytes(32));
  const privObj = (void 0)({
    key: Buffer.concat([toBuffer(X25519_PKCS8_PREFIX), Buffer.from(privBytes)]),
    format: "der",
    type: "pkcs8"
  });
  const pubObj = (void 0)(privObj);
  const pub = pubObj.export({ type: "spki", format: "der" }).subarray(-32);
  return { privateKey: privBytes, publicKey: new Uint8Array(pub) };
}

// node_modules/clm-kernel/dist/chunk-HGOFBNYK.js
init_crypto();

// public/js/mcard-kernel/node-shims/dgram.js
var unavailable2 = (name) => () => {
  throw new Error(`dgram shim: '${name}' is a Node-only API and is unavailable in the browser`);
};
var createSocket = unavailable2("createSocket");

// node_modules/clm-kernel/dist/chunk-HGOFBNYK.js
init_crypto();

// public/js/mcard-kernel/node-shims/http.js
var unavailable3 = (name) => () => {
  throw new Error(`http shim: '${name}' is a Node-only API and is unavailable in the browser`);
};
var createServer = unavailable3("createServer");
var request = unavailable3("request");
var get = unavailable3("get");

// node_modules/clm-kernel/dist/chunk-HGOFBNYK.js
var import_ws = __toESM(require_browser(), 1);
var import_ws2 = __toESM(require_browser(), 1);
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
    if (typeof Buffer !== "undefined") {
      return Buffer.from(payload.data).toString("utf8");
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
var X25519_SPKI_HEADER = Buffer.from("302a300506032b656e032100", "hex");

// node_modules/clm-kernel/dist/chunk-TJBHIBS5.js
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
init_fs();
init_fs();
init_path();

// node_modules/clm-kernel/dist/chunk-CSOLQ77U.js
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
  if (input && typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
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

// node_modules/clm-kernel/dist/chunk-RB7KYILQ.js
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
  GTime,
  HandleValidationError,
  IndexedDBBackend as IndexedDBEngine,
  MCard2 as MCard,
  MCardCollection,
  classifyClm,
  detectMime,
  validateHandle
};
