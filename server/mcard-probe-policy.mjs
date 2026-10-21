/**
 * MCard External URL SSRF Guard & Framing Policy Evaluator (Sprints ULR-05 & SMO-03).
 *
 * Enforces URL syntax, credential prohibition, RFC1918/loopback/link-local/metadata
 * host blocking, redirect hop validation, and CSP `frame-ancestors` / `X-Frame-Options`
 * evaluation for `/api/mcard/probe-url` and `/api/mcard/landing`.
 */
import dns from 'node:dns';

export const PROBE_BUDGET_MS = 600;
export const MAX_PROBE_REDIRECTS = 3;
export const MANIFEST_APPROVED_ORIGINS = Object.freeze([
  'https://example.gov',
  'https://developer.mozilla.org',
  'https://github.com',
  'https://www.wikipedia.org',
]);

export const DEFAULT_FIXTURE_ORIGINS = Object.freeze([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4321',
  'http://localhost:5320',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:4321',
  'http://127.0.0.1:5320',
]);

const SAFE_URL_SCHEMES = new Set(['http:', 'https:']);

const defaultResolver = async (hostname) => {
  const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return records.map((r) => r.address);
};

let probePolicy = {
  allowedOrigins: [...MANIFEST_APPROVED_ORIGINS],
  allowedFixtureOrigins: [...DEFAULT_FIXTURE_ORIGINS],
  embedderOrigin: '',
  maxRedirects: MAX_PROBE_REDIRECTS,
  resolver: defaultResolver,
};

export function getProbePolicy() {
  return probePolicy;
}

/** Configure or override the server-side URL probe policy (used by tests and embedder configuration). */
export function configureProbePolicy(overrides = {}) {
  probePolicy = {
    ...probePolicy,
    ...overrides,
    allowedOrigins: overrides.allowedOrigins ? [...overrides.allowedOrigins] : probePolicy.allowedOrigins,
    allowedFixtureOrigins: overrides.allowedFixtureOrigins
      ? [...overrides.allowedFixtureOrigins]
      : probePolicy.allowedFixtureOrigins,
  };
  return probePolicy;
}

/** Reset probe policy to production defaults. */
export function resetProbePolicy() {
  probePolicy = {
    allowedOrigins: [...MANIFEST_APPROVED_ORIGINS],
    allowedFixtureOrigins: [],
    embedderOrigin: '',
    maxRedirects: MAX_PROBE_REDIRECTS,
    resolver: defaultResolver,
  };
  return probePolicy;
}

/**
 * Classifies whether a hostname or IP literal falls in loopback, private RFC1918,
 * CGNAT, link-local, cloud metadata, or unspecified address ranges.
 */
export function isProhibitedHostOrIp(rawHost, { allowLoopback = false } = {}) {
  const host = String(rawHost ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return { prohibited: true, reason: 'empty host' };
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return allowLoopback ? { prohibited: false } : { prohibited: true, reason: `prohibited hostname '${host}'` };
  }
  if (host === 'metadata.google.internal') {
    return { prohibited: true, reason: `prohibited hostname '${host}'` };
  }
  const v4Mapped = host.startsWith('::ffff:') ? host.slice(7) : null;
  const candidateIp = v4Mapped || host;
  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(candidateIp);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) return { prohibited: true, reason: 'invalid IPv4 address' };
    const [a, b] = octets;
    if (a === 127) {
      return allowLoopback ? { prohibited: false } : { prohibited: true, reason: 'loopback address is prohibited' };
    }
    if (a === 0) return { prohibited: true, reason: 'unspecified address is prohibited' };
    if (a === 10) return { prohibited: true, reason: 'private RFC1918 10.0.0.0/8 address is prohibited' };
    if (a === 172 && b >= 16 && b <= 31) return { prohibited: true, reason: 'private RFC1918 172.16.0.0/12 address is prohibited' };
    if (a === 192 && b === 168) return { prohibited: true, reason: 'private RFC1918 192.168.0.0/16 address is prohibited' };
    if (a === 169 && b === 254) return { prohibited: true, reason: 'link-local / cloud metadata address is prohibited' };
    if (a === 100 && b >= 64 && b <= 127) return { prohibited: true, reason: 'CGNAT 100.64.0.0/10 address is prohibited' };
    if (a >= 224) return { prohibited: true, reason: 'multicast/reserved IPv4 address is prohibited' };
    return { prohibited: false };
  }
  if (host.includes(':')) {
    if (host === '::1' || host === '0:0:0:0:0:0:0:1') {
      return allowLoopback ? { prohibited: false } : { prohibited: true, reason: 'IPv6 loopback is prohibited' };
    }
    if (host === '::' || host === '0:0:0:0:0:0:0:0') return { prohibited: true, reason: 'IPv6 unspecified is prohibited' };
    if (/^fe[89ab][0-9a-f]:/.test(host)) return { prohibited: true, reason: 'IPv6 link-local is prohibited' };
    if (/^f[cd][0-9a-f]{2}:/.test(host)) return { prohibited: true, reason: 'IPv6 unique-local is prohibited' };
  }
  return { prohibited: false };
}

/**
 * Rejects anything that is not an absolute http(s) URL without credentials or
 * prohibited private/loopback/link-local/metadata host literals.
 */
export function validateExternalUrl(raw, { allowLoopback = false } = {}) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, reason: 'url must be a non-empty string' };
  }
  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'url is malformed' };
  }
  if (!SAFE_URL_SCHEMES.has(parsed.protocol)) {
    return { ok: false, reason: `url scheme '${parsed.protocol}' is not allowed` };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'url credentials are not allowed' };
  }
  const hostCheck = isProhibitedHostOrIp(parsed.hostname, { allowLoopback });
  if (hostCheck.prohibited) {
    return { ok: false, reason: hostCheck.reason };
  }
  return { ok: true, url: parsed.toString(), origin: parsed.origin, hostname: parsed.hostname };
}

/**
 * Evaluates X-Frame-Options and CSP frame-ancestors headers against the configured
 * embedding origin (DoD-ULR-05-07).
 */
export function evaluateFramingPolicy({ xFrameOptions = '', csp = '', targetOrigin = '', embedderOrigin = '' } = {}) {
  const xfo = String(xFrameOptions ?? '').trim().toLowerCase();
  const cspText = String(csp ?? '').trim();
  const match = /(?:^|;)\s*frame-ancestors\s+([^;]+)/i.exec(cspText);
  const directive = match ? match[1].trim() : null;
  const hasFrameAncestors = Boolean(directive);
  const normTarget = String(targetOrigin ?? '').trim().toLowerCase();
  const normEmbedder = String(embedderOrigin ?? '').trim().toLowerCase();

  let blocked = false;
  if (hasFrameAncestors) {
    const tokens = directive.split(/\s+/).map((t) => t.toLowerCase()).filter(Boolean);
    if (tokens.includes("'none'")) {
      blocked = true;
    } else if (!normEmbedder) {
      blocked = !tokens.includes('*');
    } else {
      let embedderProtocol = '';
      try {
        embedderProtocol = new URL(normEmbedder).protocol.toLowerCase();
      } catch {
        embedderProtocol = '';
      }
      const allowed = tokens.some((token) => {
        if (token === '*') return true;
        if (token === "'self'") return Boolean(normTarget) && normEmbedder === normTarget;
        if (embedderProtocol && token === embedderProtocol) return true;
        return token === normEmbedder;
      });
      blocked = !allowed;
    }
  } else if (xfo.includes('deny')) {
    blocked = true;
  } else if (xfo.includes('sameorigin')) {
    blocked = !normEmbedder || !normTarget || normEmbedder !== normTarget;
  }

  return {
    blocked,
    frameable: !blocked,
    verdict: blocked ? 'blocked' : 'frameable',
    evidence: {
      xFrameOptions: xfo || null,
      frameAncestors: hasFrameAncestors,
      frameAncestorsDirective: directive,
      embedderOrigin: normEmbedder || null,
    },
  };
}

/**
 * Validates a probe hop against URL syntax, credential prohibition, origin allowlist,
 * and resolved-address public-IP checks (DoD-ULR-05-04).
 */
export async function validateProbeHop(rawUrl, policy = probePolicy) {
  let parsedOrigin = '';
  try {
    parsedOrigin = new URL(String(rawUrl ?? '').trim()).origin;
  } catch {
    /* handled by validateExternalUrl */
  }
  const isFixtureOrigin = Boolean(parsedOrigin) && policy.allowedFixtureOrigins.includes(parsedOrigin);
  const urlCheck = validateExternalUrl(rawUrl, { allowLoopback: isFixtureOrigin });
  if (!urlCheck.ok) return urlCheck;

  if (!isFixtureOrigin && !policy.allowedOrigins.includes(urlCheck.origin)) {
    return { ok: false, reason: `origin '${urlCheck.origin}' is not in the manifest-approved allowlist` };
  }

  if (!isFixtureOrigin) {
    let resolved;
    try {
      resolved = await policy.resolver(urlCheck.hostname);
    } catch {
      return { ok: false, reason: `DNS resolution failed for '${urlCheck.hostname}'` };
    }
    if (!Array.isArray(resolved) || resolved.length === 0) {
      return { ok: false, reason: `no DNS records resolved for '${urlCheck.hostname}'` };
    }
    for (const addr of resolved) {
      const addrCheck = isProhibitedHostOrIp(addr, { allowLoopback: false });
      if (addrCheck.prohibited) {
        return { ok: false, reason: `resolved address '${addr}' is prohibited: ${addrCheck.reason}` };
      }
    }
  }

  return { ok: true, url: urlCheck.url, origin: urlCheck.origin, hostname: urlCheck.hostname, isFixtureOrigin };
}

/**
 * Executes a bounded URL framing probe with redirect hop validation and SSRF guards.
 * Returns `{ statusHttp, body }` for the `/api/mcard/probe-url` route.
 */
export async function executeProbeUrl(rawUrl, rawEmbedderOrigin = '') {
  const policy = getProbePolicy();
  const initial = await validateProbeHop(rawUrl, policy);
  if (!initial.ok) {
    return { statusHttp: 400, body: { error: initial.reason, frameable: false, verdict: 'unreachable' } };
  }

  const embedderOrigin = String(rawEmbedderOrigin || policy.embedderOrigin || '').trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_BUDGET_MS);
  try {
    let currentUrl = initial.url;
    let currentOrigin = initial.origin;

    for (let hop = 0; hop <= policy.maxRedirects; hop += 1) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'MCard-LandingPage-Probe/1.0' },
      });
      await response.body?.cancel?.().catch(() => {});

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return { statusHttp: 400, body: { error: 'redirect missing location header', frameable: false, verdict: 'unreachable' } };
        }
        if (hop === policy.maxRedirects) {
          return { statusHttp: 400, body: { error: 'redirect limit exceeded', frameable: false, verdict: 'unreachable' } };
        }
        let nextUrl;
        try {
          nextUrl = new URL(location, currentUrl).toString();
        } catch {
          return { statusHttp: 400, body: { error: 'redirect location is malformed', frameable: false, verdict: 'unreachable' } };
        }
        const nextHop = await validateProbeHop(nextUrl, policy);
        if (!nextHop.ok) {
          return {
            statusHttp: 400,
            body: {
              error: `redirect rejected: ${nextHop.reason}`,
              blockedRedirect: nextUrl,
              frameable: false,
              verdict: 'unreachable',
            },
          };
        }
        currentUrl = nextHop.url;
        currentOrigin = nextHop.origin;
        continue;
      }

      const framing = evaluateFramingPolicy({
        xFrameOptions: response.headers.get('x-frame-options') || '',
        csp: response.headers.get('content-security-policy') || '',
        targetOrigin: currentOrigin,
        embedderOrigin,
      });
      return {
        statusHttp: 200,
        body: {
          url: currentUrl,
          status: response.status,
          frameable: framing.frameable,
          verdict: framing.verdict,
          evidence: framing.evidence,
          budgetMs: PROBE_BUDGET_MS,
        },
      };
    }
    return { statusHttp: 400, body: { error: 'redirect limit exceeded', frameable: false, verdict: 'unreachable' } };
  } catch (e) {
    return {
      statusHttp: 200,
      body: {
        url: initial.url,
        frameable: false,
        verdict: 'unreachable',
        evidence: { reason: e.name === 'AbortError' ? 'budget exceeded' : String(e.message ?? e) },
        budgetMs: PROBE_BUDGET_MS,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
