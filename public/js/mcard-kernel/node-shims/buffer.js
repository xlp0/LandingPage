/**
 * Browser shim for Node's `Buffer` global, injected at bundle time.
 *
 * The kernel's ESM build assumes `Buffer` exists as a global. Only the surface
 * the kernel actually uses is implemented: construction from bytes or a string,
 * and the `base64` / `hex` / `utf8` string encodings. Anything else throws
 * rather than returning a silently wrong value.
 */
class BufferShim extends Uint8Array {
  static from(input, encoding) {
    if (typeof input === 'string') {
      if (encoding === 'base64') {
        const bin = atob(input);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return new BufferShim(out.buffer);
      }
      if (encoding === 'hex') {
        const out = new Uint8Array(input.length / 2);
        for (let i = 0; i < out.length; i++) out[i] = parseInt(input.substr(i * 2, 2), 16);
        return new BufferShim(out.buffer);
      }
      return new BufferShim(new TextEncoder().encode(input).buffer);
    }
    if (input instanceof ArrayBuffer) return new BufferShim(input);
    if (ArrayBuffer.isView(input)) {
      return new BufferShim(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
    }
    if (Array.isArray(input)) return new BufferShim(new Uint8Array(input).buffer);
    throw new TypeError('Buffer shim: unsupported input');
  }

  static isBuffer(v) { return v instanceof BufferShim || v instanceof Uint8Array; }

  static alloc(n) { return new BufferShim(new Uint8Array(n).buffer); }

  toString(encoding = 'utf8') {
    const bytes = this;
    if (encoding === 'base64') {
      let s = '';
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    }
    if (encoding === 'hex') {
      return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    if (encoding === 'utf8' || encoding === 'utf-8') return new TextDecoder().decode(bytes);
    throw new Error(`Buffer shim: unsupported encoding '${encoding}'`);
  }
}

export { BufferShim as Buffer };
export default { Buffer: BufferShim };
