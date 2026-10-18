/**
 * SMR-09 — Three-state External Website LandingPage URL Membrane.
 *
 * State 1 — Online & frameable   → live sandboxed embed.
 * State 2 — Online & blocking    → pinned CAS Snapshot Gateway Card + launch CTA.
 * State 3 — Offline / air-gapped → immutable snapshot served from `card(hash)`.
 *
 * No live third-party request is required: `resolve()` accepts an injected probe so
 * tests drive it with local fixtures. The snapshot is a normal card, so the membrane
 * never invents storage of its own.
 */
export const SANDBOX_ATTRIBUTES = 'allow-scripts allow-forms';
export const MEMBRANE_STATES = Object.freeze(['live', 'snapshot', 'offline']);

/** The strict sandboxed frame used only in the live state. */
export function renderSandboxedFrame(url) {
  return [
    `<iframe class="mcard-portal-frame" src="${escapeAttr(url)}"`,
    ` sandbox="${SANDBOX_ATTRIBUTES}" referrerpolicy="no-referrer"`,
    ` loading="lazy" title="External LandingPage (sandboxed)"></iframe>`,
  ].join('');
}

/** The High-Craft Sovereign Preview Card shown when framing is refused. */
export function renderGatewayCard({ url = '', snapshotHash = null, reason = 'blocked', launchLabel = '↗ Launch External Website' } = {}) {
  return [
    `<section class="mcard-snapshot-gateway" data-state="snapshot" data-reason="${escapeAttr(reason)}">`,
    `<header><h2>External LandingPage</h2><p class="mcard-gateway-url">${escapeAttr(url)}</p></header>`,
    `<p class="mcard-gateway-notice">This site refuses framing (<code>${escapeAttr(reason)}</code>). `,
    `Showing the pinned content-addressable snapshot instead of a blank frame.</p>`,
    snapshotHash
      ? `<p class="mcard-gateway-snapshot">Snapshot: <code>${escapeAttr(snapshotHash)}</code></p>`
      : `<p class="mcard-gateway-snapshot">No snapshot pinned yet.</p>`,
    `<a class="mcard-gateway-cta" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${launchLabel}</a>`,
    `</section>`,
  ].join('');
}

/** Offline notice pointing at the immutable snapshot. */
export function renderOfflineNotice({ url = '', snapshotHash = null } = {}) {
  return [
    `<section class="mcard-snapshot-offline" data-state="offline">`,
    `<p>Offline or air-gapped: serving the immutable snapshot for <code>${escapeAttr(url)}</code>.</p>`,
    snapshotHash ? `<p>Snapshot: <code>${escapeAttr(snapshotHash)}</code></p>` : `<p>No snapshot available.</p>`,
    `</section>`,
  ].join('');
}

/** Maps a probe verdict to a membrane state. */
export function classifyProbe(probe) {
  if (!probe) return 'offline';
  if (probe.verdict === 'frameable') return 'live';
  if (probe.verdict === 'blocked') return 'snapshot';
  return 'offline';
}

/** Rejects anything that is not an absolute http(s) URL. */
export function assertSafeUrl(raw) {
  let url;
  try {
    url = new URL(String(raw ?? '').trim());
  } catch {
    throw Object.assign(new Error('url is malformed'), { status: 400 });
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw Object.assign(new Error(`url scheme '${url.protocol}' is not allowed`), { status: 400 });
  }
  return url.toString();
}

/** Deterministic snapshot body — the text pinned as a card for a blocked origin. */
export function snapshotBody({ url, reason = 'blocked', capturedAt = '' }) {
  return [
    'snapshot: external-landing-page',
    `url: ${url}`,
    `reason: ${reason}`,
    `captured_at: ${capturedAt}`,
  ].join('\n');
}

/**
 * Builds the membrane. `probe` and `store` are injected so the same code runs in the
 * browser (fetch + MCard API) and in tests (fixtures + in-process store).
 */
export function createMembrane({ probe, store = null, clock = () => new Date().toISOString() } = {}) {
  if (typeof probe !== 'function') throw new Error('createMembrane requires a probe function');

  /** Resolve one URL to a membrane state, pinning a snapshot when framing is refused. */
  async function resolve(rawUrl, { snapshotHash = null } = {}) {
    const url = assertSafeUrl(rawUrl);
    let verdict = null;
    try {
      verdict = await probe(url);
    } catch (error) {
      verdict = { verdict: 'unreachable', reason: String(error?.message ?? error) };
    }
    const state = classifyProbe(verdict);

    if (state === 'live') {
      return { url, state, html: renderSandboxedFrame(url), snapshotHash };
    }

    let pinned = snapshotHash;
    if (store && !pinned) {
      const reason = verdict?.verdict === 'blocked' ? 'framing-blocked' : (verdict?.evidence?.reason ?? 'unreachable');
      pinned = await store.pin(snapshotBody({ url, reason, capturedAt: clock() }));
    }

    return state === 'snapshot'
      ? { url, state, html: renderGatewayCard({ url, snapshotHash: pinned, reason: 'framing-blocked' }), snapshotHash: pinned }
      : { url, state, html: renderOfflineNotice({ url, snapshotHash: pinned }), snapshotHash: pinned };
  }

  return { resolve, states: MEMBRANE_STATES };
}

function escapeAttr(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}
