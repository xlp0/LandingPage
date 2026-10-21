/**
 * SMR-09 / SMO-03 — Single-Page Universal 4-Modality MCard controller for LandingPage.
 *
 * Manages the active page handle (`urn:mcard:content:landing_page`) against the
 * canonical Triad store, projects all 4 content modalities (`media`, `document`,
 * `code`, `webapp`) through an execution-isolated membrane, and renders the HUD Pill.
 */
export const LANDING_HANDLE = 'urn:mcard:content:landing_page';
export const PILL_ID = 'mcard-sovereign-pill';
export const STUDIO_DEEP_LINK = 'https://www.npmjs.com/package/mcard-studio';
export const QUICK_BIND_KEY = 'k';

const CODE_MIMES = new Set([
  'application/javascript', 'text/javascript', 'application/typescript', 'text/css',
  'text/x-python', 'text/x-rust', 'text/x-go', 'text/x-java', 'text/x-c',
  'text/x-c++', 'text/x-sql', 'text/x-sh', 'application/x-clm',
]);

/** `?card=<hash>&handle=urn:mcard:content:landing_page` for the Studio deep link. */
export function buildDeepLink(hash, handle = LANDING_HANDLE, base = './') {
  const params = new URLSearchParams({ card: String(hash ?? ''), handle });
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${params.toString()}`;
}

/** Escapes text for safe interpolation into rendered markup and attribute values. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

/** Classifies a card descriptor into one of: 'media' | 'document' | 'code' | 'webapp'. */
export function classifyCardModality(card = {}) {
  if (['media', 'document', 'code', 'webapp'].includes(card?.modality)) return card.modality;
  const mime = String(card?.contentType ?? 'text/plain').split(';')[0].trim().toLowerCase();
  const text = String(card?.content ?? '').trimStart();
  if (card?.isBinary === true || /^(image|audio|video|model|font)\//.test(mime) || mime === 'application/pdf' || mime === 'application/octet-stream') {
    return 'media';
  }
  if (mime === 'text/html' || mime === 'text/uri-list' || /^external-url:\s*https?:\/\//i.test(text) || /^<!doctype\s+html/i.test(text) || /^<html[\s>]/i.test(text)) {
    return 'webapp';
  }
  return CODE_MIMES.has(mime) ? 'code' : 'document';
}

/** Resolves [[hash]] and [[handle|label]] transclusion syntax on already-escaped text. */
export function renderTransclusionLinks(escapedText) {
  return String(escapedText ?? '').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const cleanTarget = target.trim();
    const display = (label ?? cleanTarget).trim();
    return `<a class="mcard-link" href="#mcard:${cleanTarget}" data-mcard-ref="${cleanTarget}">${display}</a>`;
  });
}

function renderCodeBody(rawText, language = 'text') {
  const numbered = String(rawText ?? '')
    .split(/\r?\n/)
    .map((line, idx) => `<span class="mcard-code-line" data-line="${idx + 1}">${escapeHtml(line)}</span>`)
    .join('\n');
  return `<pre class="mcard-page-body mcard-code-body" data-modality="code" data-execution="inert" data-language="${escapeHtml(language)}"><code>${numbered}</code></pre>`;
}

function renderMediaBody(card) {
  const mime = String(card.contentType ?? 'application/octet-stream').split(';')[0].trim().toLowerCase();
  const rawUrl = card.rawUrl || (card.hash ? `/api/mcard/${encodeURIComponent(card.hash)}/raw` : '');
  if (mime.startsWith('image/')) {
    const src = mime === 'image/svg+xml' && card.content && !card.rawUrl ? `data:image/svg+xml;utf8,${encodeURIComponent(card.content)}` : rawUrl;
    return `<figure class="mcard-media-body" data-modality="media"><img src="${escapeHtml(src)}" alt="MCard Media ${escapeHtml(card.hash ?? '')}" loading="lazy" /></figure>`;
  }
  if (mime.startsWith('audio/')) return `<figure class="mcard-media-body" data-modality="media"><audio controls preload="metadata" src="${escapeHtml(rawUrl)}"></audio></figure>`;
  if (mime.startsWith('video/')) return `<figure class="mcard-media-body" data-modality="media"><video controls preload="metadata" src="${escapeHtml(rawUrl)}"></video></figure>`;
  if (mime === 'application/pdf') return `<div class="mcard-media-body" data-modality="media"><iframe class="mcard-pdf-frame" sandbox="" referrerpolicy="no-referrer" src="${escapeHtml(rawUrl)}" title="MCard PDF"></iframe></div>`;
  return `<div class="mcard-media-body" data-modality="media"><a class="mcard-raw-download" href="${escapeHtml(rawUrl)}" download>Download ${escapeHtml(mime)}</a></div>`;
}

function renderWebappBody(card, options = {}) {
  if (options.viewMode === 'source') return renderCodeBody(card.content ?? '', card.language ?? card.contentType ?? 'html');
  const text = String(card.content ?? '').trim();
  if (card.contentType === 'text/uri-list' || /^external-url:\s*https?:\/\//i.test(text)) {
    const rawUrl = text.replace(/^external-url:\s*/i, '').split(/\r?\n/)[0].trim();
    return `<div class="mcard-webapp-body" data-modality="webapp"><iframe class="mcard-portal-frame" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer" loading="lazy" src="${escapeHtml(rawUrl)}" title="MCard External Portal"></iframe></div>`;
  }
  return `<div class="mcard-webapp-body" data-modality="webapp"><iframe class="mcard-webapp-frame" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer" loading="lazy" srcdoc="${escapeHtml(card.content ?? '')}" title="MCard Webapp"></iframe></div>`;
}

/**
 * The Sovereign HUD Pill: active hash, witness state, sample switcher, and the
 * one-click deep link into `mcard-studio`.
 */
export function renderPill({ hash = '', verified = false, samples = [], activeSample = null, modality = '' } = {}) {
  const shortHash = hash ? `${hash.slice(0, 10)}…` : 'unbound';
  const options = samples
    .map(
      (sample) =>
        `<option value="${escapeHtml(sample.handle)}"${sample.handle === activeSample ? ' selected' : ''}>` +
        `${escapeHtml(sample.label)}</option>`
    )
    .join('');
  const badge = modality ? `<span class="pill-modality" data-modality="${escapeHtml(modality)}">${escapeHtml(modality)}</span>` : '';
  return [
    `<div id="${PILL_ID}" class="mcard-sovereign-pill" role="status" aria-live="polite">`,
    `<span class="pill-hash" title="${escapeHtml(hash)}">🪪 ${escapeHtml(shortHash)}</span>`,
    `<span class="pill-witness">${verified ? '✓ Witnessed' : '⚠ Unverified'}</span>`,
    badge,
    `<label class="pill-switcher"><span class="visually-hidden">Switch sample</span>`,
    `<select data-role="sample-switcher">${options}</select></label>`,
    `<button type="button" data-role="open-url" title="Paste an external LandingPage URL (Cmd/Ctrl + K)">🌐 URL</button>`,
    `<a class="pill-studio" href="${escapeHtml(buildDeepLink(hash))}"`,
    ` data-role="open-in-studio" title="Open and refine this page in mcard-studio">✨ Open in mcard-studio</a>`,
    `</div>`,
  ].join('');
}

/** Renders the active MCard across the 4 universal modalities plus its provenance footer. */
export function renderPage(card, options = {}) {
  if (!card) return '<article class="mcard-page mcard-page--empty">No active page bound.</article>';
  const contentType = card.contentType ?? 'text/plain';
  const baseModality = classifyCardModality(card);
  const effectiveModality = baseModality === 'webapp' && options.viewMode === 'source' ? 'code' : baseModality;
  let rendered = '';
  if (baseModality === 'media') {
    rendered = renderMediaBody(card);
  } else if (baseModality === 'webapp') {
    rendered = renderWebappBody(card, options);
  } else if (baseModality === 'code') {
    rendered = renderCodeBody(card.content ?? '', card.language ?? contentType);
  } else {
    const linked = renderTransclusionLinks(escapeHtml(card.content ?? ''));
    rendered = `<pre class="mcard-page-body mcard-document-body" data-modality="document">${linked}</pre>`;
  }
  return [
    `<article class="mcard-page" data-hash="${escapeHtml(card.hash)}" data-handle="${LANDING_HANDLE}" data-modality="${escapeHtml(effectiveModality)}" data-content-type="${escapeHtml(contentType)}">`,
    rendered,
    `<footer class="mcard-page-provenance">`,
    `<code>${escapeHtml(card.hash)}</code> · <code>${escapeHtml(card.gTime ?? '')}</code>`,
    `</footer></article>`,
  ].join('');
}

/**
 * Interprets a Cmd/Ctrl+K submission: a known sample handle switches samples, an
 * http(s) URL switches to that external page, anything else is rejected.
 */
export function parseSwitchIntent(input, samples = []) {
  const text = String(input ?? '').trim();
  if (!text) return { kind: 'none' };
  const sample = samples.find((entry) => entry.handle === text);
  if (sample) return { kind: 'sample', handle: sample.handle };
  try {
    const url = new URL(text);
    if (url.protocol === 'http:' || url.protocol === 'https:') return { kind: 'url', url: url.toString() };
  } catch {
    /* not a URL */
  }
  return { kind: 'invalid', reason: 'expected a sample handle or an http(s) URL' };
}

/** Minimal JSON client for the MCard API. */
export function createApiClient(baseUrl = '') {
  const call = async (method, path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.error ?? `HTTP ${response.status}`), { status: response.status });
    return payload;
  };
  return {
    landing: () => call('GET', '/api/mcard/landing'),
    setLanding: (body) => call('PUT', '/api/mcard/landing', body),
    probe: (url) => call('GET', `/api/mcard/probe-url?url=${encodeURIComponent(url)}`),
    stats: () => call('GET', '/api/mcard/stats'),
    rawUrl: (hash) => `${baseUrl}/api/mcard/${encodeURIComponent(hash)}/raw`,
  };
}

/** Mounts the single-page MCard host and its HUD pill. */
export async function mountSinglePageMCard({
  root = globalThis.document,
  api = createApiClient(''),
  samples = [],
  onExternalUrl = null,
} = {}) {
  if (!root) throw new Error('mountSinglePageMCard requires a document');
  const host = root.getElementById?.('single-page-mcard-host') ?? root.querySelector('#single-page-mcard-host');
  const pillMount = root.getElementById?.('mcard-sovereign-pill-mount') ?? root.querySelector('#mcard-sovereign-pill-mount');
  if (!host || !pillMount) throw new Error('host markup missing: #single-page-mcard-host and #mcard-sovereign-pill-mount');

  const paint = async () => {
    let page = null;
    try {
      page = await api.landing();
    } catch {
      page = null;
    }
    const activeCard = page && page.bound !== false ? page : null;
    host.innerHTML = renderPage(activeCard);
    pillMount.innerHTML = renderPill({
      hash: page?.hash ?? '',
      verified: page?.verified ?? false,
      modality: activeCard ? classifyCardModality(activeCard) : '',
      samples,
    });
    wire();
    return page;
  };

  const bind = async (body) => {
    await api.setLanding(body);
    return paint();
  };

  function wire() {
    pillMount.querySelector('[data-role="sample-switcher"]')?.addEventListener('change', (event) => {
      const intent = parseSwitchIntent(event.target.value, samples);
      if (intent.kind === 'sample') bind({ content: `# Sample: ${intent.handle}` });
    });
    pillMount.querySelector('[data-role="open-url"]')?.addEventListener('click', async () => {
      const input = globalThis.prompt?.('External LandingPage URL') ?? '';
      const intent = parseSwitchIntent(input, samples);
      if (intent.kind === 'url' && onExternalUrl) return onExternalUrl(intent.url);
      if (intent.kind === 'url') return bind({ url: intent.url });
      return undefined;
    });
  }

  root.addEventListener?.('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === QUICK_BIND_KEY) {
      event.preventDefault?.();
      pillMount.querySelector('[data-role="open-url"]')?.click();
    }
  });

  const initial = await paint();
  return { paint, bind, initial };
}
