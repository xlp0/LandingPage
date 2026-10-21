/**
 * MCard Universal 4-Modality Content Classifier (Sprints SMO-01 & SMO-02).
 *
 * Delegates magic-byte, extension, and structural type judgment to the published
 * `clm-kernel@0.0.10` package (`TypeInterpreter`, `detectMime`, `isBinary`) and maps
 * every MCard payload deterministically onto one of the four browser modalities:
 *   - `media`    (Static Media Files: image/*, audio/*, video/*, application/pdf, model/*)
 *   - `document` (Text & Structured Documents: markdown, plain text, json, yaml, latex)
 *   - `code`     (Source Code & CLM Descriptors: js, ts, py, rs, sql, css, xml, .clm)
 *   - `webapp`   (Executable Web Pages & Portals: text/html, text/uri-list, external-url)
 */
import { TypeInterpreter, detectMime, isBinary } from 'clm-kernel';

export const MODALITY_TYPES = Object.freeze(['media', 'document', 'code', 'webapp']);

const interpreter = TypeInterpreter.createDefault();

const CODE_MIMES = new Set([
  'text/javascript',
  'application/javascript',
  'text/x-typescript',
  'application/typescript',
  'text/x-python',
  'text/rust',
  'text/x-rust',
  'text/x-sh',
  'application/x-sh',
  'text/css',
  'application/sql',
  'text/x-sql',
  'application/xml',
  'text/xml',
  'application/clm',
  'text/x-c',
  'text/x-c++',
  'text/x-java',
]);

const MEDIA_PREFIXES = ['image/', 'audio/', 'video/', 'model/'];
const MEDIA_MIMES = new Set(['application/pdf', 'application/octet-stream']);

/** Convert string, Buffer, or Uint8Array into a Node Buffer without corrupting binary bytes. */
export function toRawBuffer(content) {
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content.buffer, content.byteOffset, content.byteLength);
  return Buffer.from(typeof content === 'string' ? content : JSON.stringify(content ?? ''), 'utf8');
}

/** True when the byte buffer contains binary magic signatures or non-text control bytes. */
export function isBinaryContent(rawBytes) {
  const buf = toRawBuffer(rawBytes);
  if (buf.length === 0) return false;
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  if (isBinary(uint8)) return true;
  const sampleLen = Math.min(buf.length, 512);
  for (let i = 0; i < sampleLen; i += 1) {
    const byte = buf[i];
    if (byte === 0 || (byte < 8) || (byte > 13 && byte < 32 && byte !== 27)) {
      return true;
    }
  }
  return false;
}

/** Map a resolved MIME type and binary flag onto one of the 4 canonical browser modalities. */
export function resolveModality(mimeType, { binary = false } = {}) {
  const mime = String(mimeType || 'text/plain').toLowerCase();
  if (mime === 'text/html' || mime === 'text/uri-list' || mime === 'application/x-webapp') {
    return 'webapp';
  }
  if (CODE_MIMES.has(mime)) {
    return 'code';
  }
  if (MEDIA_MIMES.has(mime) || MEDIA_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return 'media';
  }
  if (binary) {
    return 'media';
  }
  return 'document';
}

/**
 * Classify raw MCard bytes or text using `clm-kernel@0.0.10` `TypeInterpreter` + `detectMime`
 * with deterministic structural disambiguation for headless text payloads.
 */
export function classifyMCardContent(content, { filename = '', mimeHint = '' } = {}) {
  const rawBytes = toRawBuffer(content);
  const uint8 = new Uint8Array(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
  const binary = isBinaryContent(rawBytes);

  const extHint = filename ? filename.split('.').pop()?.toLowerCase() : '';
  const judgment = interpreter.judge({
    data: uint8,
    filename: filename || undefined,
    extHint: extHint || undefined,
  });

  if (mimeHint && mimeHint.includes('/')) {
    const modality = resolveModality(mimeHint, { binary });
    return {
      mimeType: mimeHint,
      category: judgment.category || modality,
      universe: judgment.universe || 'U0',
      isBinary: binary,
      modality,
    };
  }

  // Trust magic_bytes and explicit extension_hint from clm-kernel TypeInterpreter
  if (judgment.matchedRule === 'magic_bytes' || (extHint && judgment.matchedRule === 'extension_hint')) {
    const mimeType = judgment.mime || detectMime(uint8, extHint);
    return {
      mimeType,
      category: judgment.category || 'media',
      universe: judgment.universe || 'U0',
      isBinary: Boolean(judgment.isBinary || binary),
      modality: resolveModality(mimeType, { binary: Boolean(judgment.isBinary || binary) }),
    };
  }

  if (binary) {
    const sniffed = detectMime(uint8, extHint);
    const mimeType = sniffed !== 'text/plain' ? sniffed : 'application/octet-stream';
    return {
      mimeType,
      category: 'media',
      universe: judgment.universe || 'U0',
      isBinary: true,
      modality: 'media',
    };
  }

  const text = rawBytes.toString('utf8');
  const trimmed = text.trimStart();

  if (/^external-url:\s*https?:\/\//i.test(trimmed) || /^https?:\/\/\S+$/i.test(trimmed.trim())) {
    return { mimeType: 'text/uri-list', category: 'webapp', universe: 'U0', isBinary: false, modality: 'webapp' };
  }
  if (/^<svg\b/i.test(trimmed)) {
    return { mimeType: 'image/svg+xml', category: 'media', universe: 'U0', isBinary: false, modality: 'media' };
  }
  if (/^<(!doctype|html|head|body|section|article|main)\b/i.test(trimmed)) {
    return { mimeType: 'text/html', category: 'webapp', universe: 'U0', isBinary: false, modality: 'webapp' };
  }
  if (/^<\?xml\b/i.test(trimmed)) {
    return { mimeType: 'application/xml', category: 'code', universe: 'U0', isBinary: false, modality: 'code' };
  }
  if (/^[\[{]/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return { mimeType: 'application/json', category: 'document', universe: 'U0', isBinary: false, modality: 'document' };
    } catch {
      /* not JSON */
    }
  }
  if (
    (trimmed.includes('specification:') &&
      trimmed.includes('implementation:') &&
      (trimmed.includes('verification:') || trimmed.includes('balanced:'))) ||
    (trimmed.includes('abstract_spec:') &&
      trimmed.includes('concrete_impl:') &&
      trimmed.includes('balanced_exp:'))
  ) {
    return { mimeType: 'application/x-clm', contentType: 'application/x-clm', rendererType: 'clm', category: 'code', universe: 'U2', isBinary: false, modality: 'code' };
  }
  if (/\\documentclass\b|\\begin\{document\}|\\frac\{/i.test(trimmed)) {
    return { mimeType: 'application/x-latex', contentType: 'application/x-latex', rendererType: 'latex', category: 'document', universe: 'U0', isBinary: false, modality: 'document' };
  }
  // Disambiguate Markdown `# Heading` from Wavefront `.obj` comments when no `.obj` geometry exists
  if (/^#{1,6}\s+\S/m.test(trimmed) && !(/^v\s+-?\d/m.test(trimmed) && /^f\s+\d/m.test(trimmed))) {
    return { mimeType: 'text/markdown', contentType: 'text/markdown', rendererType: 'markdown', category: 'document', universe: 'U0', isBinary: false, modality: 'document' };
  }
  if (judgment.category === 'code' && judgment.mime && judgment.mime !== 'model/obj') {
    return {
      mimeType: judgment.mime,
      contentType: judgment.mime,
      rendererType: 'code',
      category: 'code',
      universe: judgment.universe || 'U0',
      isBinary: false,
      modality: 'code',
    };
  }

  return { mimeType: 'text/plain', contentType: 'text/plain', rendererType: 'text', category: 'document', universe: 'U0', isBinary: false, modality: 'document' };
}

/** Enriched 4-modality classifier returning both `mimeType` and `contentType` + `rendererType`. */
export function classifyMCardModality(content, options = {}) {
  const res = classifyMCardContent(content, options);
  const contentType = res.contentType || res.mimeType;
  let rendererType = res.rendererType;
  if (!rendererType) {
    if (contentType === 'text/uri-list') rendererType = 'portal';
    else if (contentType === 'text/html') rendererType = 'html';
    else if (contentType === 'text/markdown') rendererType = 'markdown';
    else if (contentType === 'application/json') rendererType = 'json';
    else if (contentType === 'application/x-clm' || contentType === 'application/clm') rendererType = 'clm';
    else if (res.modality === 'code') rendererType = 'code';
    else if (res.modality === 'media') rendererType = contentType.split('/')[0] || 'media';
    else rendererType = 'text';
  }
  return { ...res, contentType, rendererType };
}

/** Backward-compatible MIME string detector backed by `classifyMCardContent`. */
export function detectContentType(content, options = {}) {
  return classifyMCardContent(content, options).mimeType;
}
