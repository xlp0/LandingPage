/**
 * Pure workbench net helpers shared by the Playwright tracer and the Bombadil
 * spec generator. This module must not import Playwright or clm-kernel so a
 * browser spec, a Node test and a generator can all load it.
 */

export function stripQuery(routeStr) {
  return String(routeStr || '').split('?')[0] || '/';
}

export function resolvePlaceForUrl(envelope, rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  const placeBindings = envelope?.bindings?.places || {};
  const pathname = parsed.pathname || '/';

  for (const [placeId, binding] of Object.entries(placeBindings)) {
    if (!binding || (binding.kind !== 'page' && binding.kind !== 'view')) continue;
    if (!binding.queryFlag) continue;
    if (!parsed.searchParams.has(binding.queryFlag)) continue;
    const candidates = [binding.route, ...(binding.routeAliases || [])]
      .filter(Boolean)
      .map(stripQuery);
    if (candidates.includes(pathname)) {
      return { placeId, kind: binding.kind, binding, parsed };
    }
  }

  for (const [placeId, binding] of Object.entries(placeBindings)) {
    if (!binding || (binding.kind !== 'page' && binding.kind !== 'view')) continue;
    if (binding.queryFlag) continue;
    const candidates = [binding.route, ...(binding.routeAliases || [])]
      .filter(Boolean)
      .map(stripQuery);
    if (candidates.includes(pathname)) {
      return { placeId, kind: binding.kind, binding, parsed };
    }
  }

  for (const [placeId, binding] of Object.entries(placeBindings)) {
    if (!binding || binding.kind !== 'external') continue;
    if (binding.routePrefix && pathname.startsWith(binding.routePrefix)) {
      return { placeId, kind: 'external', binding, parsed };
    }
    if (binding.route && stripQuery(binding.route) === pathname) {
      return { placeId, kind: 'external', binding, parsed };
    }
  }

  return null;
}

export function navArcs(envelope) {
  const transitions = envelope?.bindings?.transitions || {};
  const navKinds = new Set(['redirect', 'link', 'client-route', 'recover']);
  return Object.entries(transitions)
    .filter(([, binding]) => binding && navKinds.has(binding.kind))
    .map(([transitionId, binding]) => ({
      transitionId,
      from: binding.fromPlaceId,
      to: binding.toPlaceId,
      kind: binding.kind
    }))
    .filter((arc) => arc.from && arc.to);
}
