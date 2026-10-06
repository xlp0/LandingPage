/**
 * Shared render-descriptor helper for fiber adapters.
 *
 * An adapter returns a **descriptor** — a plain data description of what to
 * render — rather than touching the DOM directly. That keeps `mount` pure with
 * respect to the card, makes the rendering testable outside a browser, and means
 * the same adapter serves the harness and the live surface.
 *
 * `applyDescriptor` is the only place that touches the DOM, and it degrades to a
 * no-op when there is no host element (Node, the conformance harness).
 */

/** Textual view of a card's payload, whatever its shape. */
export function payloadText(card) {
  const p = card?.payload;
  const v = p && typeof p === 'object' && 'value' in p ? p.value : p;
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Uint8Array) return '';
  return JSON.stringify(v);
}

/** Bytes of a binary payload, or null for other shapes. */
export function payloadBytes(card) {
  const p = card?.payload;
  if (p?.kind === 'binary' && p.data instanceof Uint8Array) return p.data;
  return null;
}

export function bytesToHex(bytes, limit = 32) {
  const slice = bytes.slice(0, limit);
  return [...slice].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

export function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return typeof btoa === 'function' ? btoa(s) : s;
}

/** Mime type for a binary payload, if the card carries one. */
export function payloadMime(card) {
  return card?.payload?.mimeType ?? 'application/octet-stream';
}

/**
 * Builds the descriptor for a kind. This is the only per-mode logic; the
 * dispatcher never branches on kind.
 */
export function toDescriptor(kind, card, ctx = {}) {
  const text = payloadText(card);
  const hash = card?.hash?.asHex?.() ?? String(card?.hash ?? '');
  const base = { kind, hash, fallback: Boolean(ctx.fallback), meta: ctx.fiber ?? null };

  switch (kind) {
    case 'scalar/value':
      return { ...base, mode: 'scalar', text: String(text) };
    case 'text/plain':
      return { ...base, mode: 'text', text };
    case 'text/markup':
      return { ...base, mode: 'markup', text, sanitized: true };
    case 'text/markdown':
      return { ...base, mode: 'markdown', text };
    case 'text/script':
    case 'text/style':
    case 'executable/pcard':
      return { ...base, mode: 'code', text };
    case 'text/data':
      return {
        ...base, mode: 'table',
        rows: text.split('\n').filter(Boolean).map((l) => l.split(',')),
      };
    case 'structured/data':
      return { ...base, mode: 'json', text };
    case 'structured/triad':
      return {
        ...base, mode: 'triad',
        sections: ['abstract', 'concrete', 'balanced'].map((name) => ({
          name, present: Boolean(card?.payload?.value?.[name]),
        })),
      };
    case 'satori/message':
      return { ...base, mode: 'message', text: card?.payload?.value?.content ?? text };
    case 'binary/image':
    case 'binary/audio':
    case 'binary/3d':
    case 'binary/octet': {
      const bytes = payloadBytes(card);
      const n = bytes?.length ?? 0;
      return {
        ...base,
        mode: kind.split('/')[1],
        mime: payloadMime(card),
        sizeBytes: n,
        hex: bytes ? bytesToHex(bytes) : '',
        dataUrl: bytes && kind === 'binary/image'
          ? `data:${payloadMime(card)};base64,${bytesToBase64(bytes)}`
          : null,
      };
    }
    default:
      return { ...base, mode: 'fallback', text, unclassified: true };
  }
}

/** Applies a descriptor to a host element. No-op without a DOM host. */
export function applyDescriptor(d, host) {
  if (!host || typeof host.appendChild !== 'function' || typeof document === 'undefined') {
    return null;
  }
  const el = document.createElement('div');
  el.className = `fiber fiber-${d.mode}`;
  el.dataset.fiberKind = d.kind;
  el.dataset.fiberHash = d.hash;
  if (d.fallback) el.dataset.fiberFallback = 'true';
  if (d.mode === 'image' && d.dataUrl) {
    const img = document.createElement('img');
    img.src = d.dataUrl;
    img.alt = `image fiber ${d.hash.slice(0, 12)}`;
    el.appendChild(img);
  } else {
    el.textContent = d.text ?? d.hex ?? '';
  }
  host.appendChild(el);
  return el;
}
