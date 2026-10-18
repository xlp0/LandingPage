/**
 * SMR-09 — Single-Page MCard controller for LandingPage.
 *
 * Manages exactly one active page handle (`urn:mcard:content:landing_page`) against
 * the canonical Triad store and renders the Chrome-Light Sovereign HUD Pill.
 *
 * The module is deliberately split into pure render/build helpers (unit-testable
 * without a DOM) and a `mountSinglePageMCard` entry point that wires them to the
 * document. No cryptographic code lives here: hashing is the kernel's job.
 */
export const LANDING_HANDLE = 'urn:mcard:content:landing_page';
export const PILL_ID = 'mcard-sovereign-pill';
export const STUDIO_DEEP_LINK = 'https://www.npmjs.com/package/mcard-studio';
export const QUICK_BIND_KEY = 'k';

/** `?card=<hash>&handle=urn:mcard:content:landing_page` for the Studio deep link. */
export function buildDeepLink(hash, handle = LANDING_HANDLE, base = './') {
  const params = new URLSearchParams({ card: String(hash ?? ''), handle });
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${params.toString()}`;
}

/** Escapes text for safe interpolation into rendered markup. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

/**
 * The Sovereign HUD Pill: active hash, witness state, sample switcher, and the
 * one-click deep link into `mcard-studio`.
 */
export function renderPill({ hash = '', verified = false, samples = [], activeSample = null } = {}) {
  const shortHash = hash ? `${hash.slice(0, 10)}…` : 'unbound';
  const options = samples
    .map(
      (sample) =>
        `<option value="${escapeHtml(sample.handle)}"${sample.handle === activeSample ? ' selected' : ''}>` +
        `${escapeHtml(sample.label)}</option>`
    )
    .join('');
  return [
    `<div id="${PILL_ID}" class="mcard-sovereign-pill" role="status" aria-live="polite">`,
    `<span class="pill-hash" title="${escapeHtml(hash)}">🪪 ${escapeHtml(shortHash)}</span>`,
    `<span class="pill-witness">${verified ? '✓ Witnessed' : '⚠ Unverified'}</span>`,
    `<label class="pill-switcher"><span class="visually-hidden">Switch sample</span>`,
    `<select data-role="sample-switcher">${options}</select></label>`,
    `<button type="button" data-role="open-url" title="Paste an external LandingPage URL (Cmd/Ctrl + K)">🌐 URL</button>`,
    `<a class="pill-studio" href="${escapeHtml(buildDeepLink(hash))}"`,
    ` data-role="open-in-studio" title="Open and refine this page in mcard-studio">✨ Open in mcard-studio</a>`,
    `</div>`,
  ].join('');
}

/** Renders the active page body plus its provenance line. */
export function renderPage(card) {
  if (!card) return '<article class="mcard-page mcard-page--empty">No active page bound.</article>';
  const body = escapeHtml(card.content ?? '');
  const contentType = card.contentType ?? 'text/plain';
  const rendered = contentType === 'text/html' ? card.content : `<pre class="mcard-page-body">${body}</pre>`;
  return [
    `<article class="mcard-page" data-hash="${escapeHtml(card.hash)}" data-handle="${LANDING_HANDLE}">`,
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
    host.innerHTML = renderPage(page && page.bound !== false ? page : null);
    pillMount.innerHTML = renderPill({ hash: page?.hash ?? '', verified: page?.verified ?? false, samples });
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

  // Mounting paints immediately; without this the host and pill stay empty until
  // something else calls paint(), which is how the pill first went missing.
  const initial = await paint();
  return { paint, bind, initial };
}
