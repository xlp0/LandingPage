import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as appTest, expect } from './app-fixtures.js';
import {
  loadNetEnvelope,
  replayNetTrace
} from '../../scripts/check-net.mjs';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, '../..');
export const DEFAULT_WORKBENCH_NET_PATH = path.join(REPO_ROOT, 'src/net/workbench-net.yaml');

function stripQuery(routeStr) {
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

function buildStaticAssetSet(envelope) {
  const set = new Set();
  for (const asset of envelope?.bindings?.staticJsonAssets || []) {
    set.add(`${String(asset.httpMethod || 'GET').toUpperCase()} ${asset.httpPath}`);
  }
  return set;
}

function findNavigationTransition(envelope, fromPlaceId, toPlaceId) {
  const transitionBindings = envelope?.bindings?.transitions || {};
  const navKinds = new Set(['redirect', 'link', 'client-route', 'recover']);
  for (const [transitionId, binding] of Object.entries(transitionBindings)) {
    if (!binding || !navKinds.has(binding.kind)) continue;
    if (binding.fromPlaceId === fromPlaceId && binding.toPlaceId === toPlaceId) {
      return { transitionId, binding };
    }
  }
  return null;
}

function findOpenExternalTransition(envelope, fromPlaceId, externalPlaceId, pathname) {
  const transitionBindings = envelope?.bindings?.transitions || {};
  let fallback = null;
  for (const [transitionId, binding] of Object.entries(transitionBindings)) {
    if (!binding || binding.kind !== 'open-external') continue;
    if (binding.fromPlaceId !== fromPlaceId) continue;
    if (binding.route && stripQuery(binding.route) === pathname) {
      return { transitionId, binding };
    }
    if (binding.externalPlaceId === externalPlaceId && !fallback) {
      fallback = { transitionId, binding };
    }
  }
  return fallback;
}

function findServerCallPair(envelope, callingPlaceId, method, pathname) {
  const transitionBindings = envelope?.bindings?.transitions || {};
  const topologyTransitions = envelope?.topology?.transitions || [];

  let reqEntry = null;
  for (const [transitionId, binding] of Object.entries(transitionBindings)) {
    if (!binding || binding.kind !== 'server-call-request') continue;
    if (
      binding.fromPlaceId === callingPlaceId &&
      String(binding.httpMethod || '').toUpperCase() === method &&
      binding.httpPath === pathname
    ) {
      reqEntry = { transitionId, binding };
      break;
    }
  }
  if (!reqEntry) return null;

  const pendingPlaceId = reqEntry.binding.toPlaceId;
  let okEntry = null;
  let failEntry = null;
  for (const t of topologyTransitions) {
    if (!t.inputs.includes(pendingPlaceId)) continue;
    const b = transitionBindings[t.id];
    if (b?.kind === 'server-call-ok' && !okEntry) {
      okEntry = { transitionId: t.id, binding: b };
    } else if (b?.kind === 'server-call-fail' && !failEntry) {
      failEntry = { transitionId: t.id, binding: b };
    }
  }

  return {
    reqTransitionId: reqEntry.transitionId,
    pendingPlaceId,
    okTransitionId: okEntry?.transitionId || null,
    okToPlaceId: okEntry?.binding?.toPlaceId || callingPlaceId,
    failTransitionId: failEntry?.transitionId || null,
    failToPlaceId: failEntry?.binding?.toPlaceId || callingPlaceId
  };
}

export function attachWorkbenchNetTracer(
  initialPage,
  {
    envelope = loadNetEnvelope(DEFAULT_WORKBENCH_NET_PATH),
    traceId = 'playwright-workbench-trace',
    expectedOrigin = null
  } = {}
) {
  const staticAssetSet = buildStaticAssetSet(envelope);
  const events = [];
  const unmappedNavigations = [];
  const inflightQueue = [];
  const requestEntryMap = new Map();
  const cleanups = [];

  let activePage = initialPage;
  let trackedOrigin = expectedOrigin;
  let entryPlaceId = null;
  let currentPlaceId = null;
  let suppressedMainNavUrl = null;

  function flushSettledServerCalls() {
    while (inflightQueue.length > 0 && inflightQueue[0].settled) {
      const head = inflightQueue.shift();
      if (head.abortedOnUnload) {
        continue;
      }
      if (currentPlaceId !== head.callingPlaceId) {
        continue;
      }
      events.push({
        transitionId: head.pair.reqTransitionId,
        fromPlaceId: head.callingPlaceId,
        toPlaceId: head.pair.pendingPlaceId,
        httpMethod: head.method,
        httpPath: head.pathname,
        at: head.startedAt
      });

      const isOk = head.status !== null && head.status >= 200 && head.status < 400;
      const resultTid = isOk ? head.pair.okTransitionId : head.pair.failTransitionId;
      const postPlaceId = isOk ? head.pair.okToPlaceId : head.pair.failToPlaceId;

      events.push({
        transitionId: resultTid,
        fromPlaceId: head.pair.pendingPlaceId,
        toPlaceId: postPlaceId,
        httpMethod: head.method,
        httpPath: head.pathname,
        status: head.status,
        at: head.finishedAt
      });

      currentPlaceId = postPlaceId;
    }
  }

  function recordUnmappedNavigation(urlStr, atIso) {
    const rec = {
      transitionId: null,
      unmapped: true,
      url: urlStr,
      fromPlaceId: currentPlaceId,
      toPlaceId: null,
      at: atIso
    };
    events.push(rec);
    unmappedNavigations.push(rec);
    currentPlaceId = null;
  }

  function handleMainNavigation(urlStr) {
    if (!urlStr || urlStr === 'about:blank') return;
    if (suppressedMainNavUrl && urlStr === suppressedMainNavUrl) {
      suppressedMainNavUrl = null;
      return;
    }
    suppressedMainNavUrl = null;

    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch {
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    if (!trackedOrigin) {
      trackedOrigin = parsed.origin;
    }

    flushSettledServerCalls();
    inflightQueue.length = 0;

    const nowIso = new Date().toISOString();
    const resolved = resolvePlaceForUrl(envelope, urlStr);
    if (!resolved) {
      recordUnmappedNavigation(urlStr, nowIso);
      return;
    }

    if (entryPlaceId === null && events.length === 0) {
      entryPlaceId = resolved.placeId;
      currentPlaceId = resolved.placeId;
      return;
    }

    if (currentPlaceId === null) {
      recordUnmappedNavigation(urlStr, nowIso);
      return;
    }

    if (resolved.placeId === currentPlaceId) {
      return;
    }

    const navMatch = findNavigationTransition(envelope, currentPlaceId, resolved.placeId);
    if (!navMatch) {
      recordUnmappedNavigation(urlStr, nowIso);
      return;
    }

    events.push({
      transitionId: navMatch.transitionId,
      fromPlaceId: currentPlaceId,
      toPlaceId: resolved.placeId,
      url: urlStr,
      at: nowIso
    });
    currentPlaceId = resolved.placeId;
  }

  function attachToPage(targetPage) {
    const onFrameNavigated = (frame) => {
      if (targetPage !== activePage) return;
      if (frame !== targetPage.mainFrame()) return;
      handleMainNavigation(frame.url());
    };

    const onRequest = (req) => {
      if (targetPage !== activePage) return;
      const rType = req.resourceType();
      if (rType !== 'fetch' && rType !== 'xhr') return;
      if (req.frame() !== targetPage.mainFrame()) return;
      if (!currentPlaceId) return;

      let parsed;
      try {
        parsed = new URL(req.url());
      } catch {
        return;
      }
      if (trackedOrigin && parsed.origin !== trackedOrigin) return;

      const method = String(req.method() || 'GET').toUpperCase();
      const pathname = parsed.pathname || '/';
      if (staticAssetSet.has(`${method} ${pathname}`)) return;

      const pair = findServerCallPair(envelope, currentPlaceId, method, pathname);
      if (!pair) {
        if (pathname.startsWith('/api/') || pathname.endsWith('.json')) {
          const rec = {
            transitionId: null,
            unmapped: true,
            url: req.url(),
            httpMethod: method,
            httpPath: pathname,
            fromPlaceId: currentPlaceId,
            toPlaceId: null,
            at: new Date().toISOString()
          };
          events.push(rec);
          unmappedNavigations.push(rec);
        }
        return;
      }

      const item = {
        callingPlaceId: currentPlaceId,
        method,
        pathname,
        pair,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        status: null,
        settled: false,
        abortedOnUnload: false
      };
      inflightQueue.push(item);
      requestEntryMap.set(req, item);
    };

    const onResponse = (res) => {
      const req = res.request();
      const item = requestEntryMap.get(req);
      if (!item) return;
      requestEntryMap.delete(req);
      item.status = res.status();
      item.finishedAt = new Date().toISOString();
      item.settled = true;
      flushSettledServerCalls();
    };

    const onRequestFailed = (req) => {
      const item = requestEntryMap.get(req);
      if (!item) return;
      requestEntryMap.delete(req);
      const errText = req.failure()?.errorText || '';
      if (/ERR_ABORTED|NS_BINDING_ABORTED/i.test(errText)) {
        item.abortedOnUnload = true;
      }
      item.status = null;
      item.finishedAt = new Date().toISOString();
      item.settled = true;
      flushSettledServerCalls();
    };

    const onPopup = (popupPage) => {
      if (targetPage !== activePage) return;
      let popupHandled = false;

      const processPopupUrl = (popupUrl) => {
        if (popupHandled) return;
        if (!popupUrl || popupUrl === 'about:blank') return;
        let parsed;
        try {
          parsed = new URL(popupUrl);
        } catch {
          return;
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
        popupHandled = true;

        flushSettledServerCalls();
        const nowIso = new Date().toISOString();
        const resolved = resolvePlaceForUrl(envelope, popupUrl);
        if (!resolved || !currentPlaceId) {
          recordUnmappedNavigation(popupUrl, nowIso);
          return;
        }

        if (resolved.kind === 'external') {
          const extMatch = findOpenExternalTransition(
            envelope,
            currentPlaceId,
            resolved.placeId,
            parsed.pathname
          );
          if (!extMatch) {
            recordUnmappedNavigation(popupUrl, nowIso);
            return;
          }
          events.push({
            transitionId: extMatch.transitionId,
            fromPlaceId: currentPlaceId,
            toPlaceId: currentPlaceId,
            externalPlaceId: resolved.placeId,
            url: popupUrl,
            at: nowIso
          });
          return;
        }

        const navMatch = findNavigationTransition(envelope, currentPlaceId, resolved.placeId);
        if (!navMatch) {
          recordUnmappedNavigation(popupUrl, nowIso);
          return;
        }

        events.push({
          transitionId: navMatch.transitionId,
          fromPlaceId: currentPlaceId,
          toPlaceId: resolved.placeId,
          url: popupUrl,
          at: nowIso
        });
        currentPlaceId = resolved.placeId;
        inflightQueue.length = 0;
        activePage = popupPage;
        suppressedMainNavUrl = popupUrl;
        attachToPage(popupPage);
      };

      const onPopupFrameNav = (frame) => {
        if (frame !== popupPage.mainFrame()) return;
        processPopupUrl(frame.url());
      };

      popupPage.on('framenavigated', onPopupFrameNav);
      cleanups.push(() => {
        if (typeof popupPage.off === 'function') {
          popupPage.off('framenavigated', onPopupFrameNav);
        }
      });

      const immediateUrl = typeof popupPage.url === 'function' ? popupPage.url() : '';
      if (immediateUrl && immediateUrl !== 'about:blank') {
        processPopupUrl(immediateUrl);
      }
    };

    targetPage.on('framenavigated', onFrameNavigated);
    targetPage.on('request', onRequest);
    targetPage.on('response', onResponse);
    targetPage.on('requestfailed', onRequestFailed);
    targetPage.on('popup', onPopup);

    cleanups.push(() => {
      if (typeof targetPage.off === 'function') {
        targetPage.off('framenavigated', onFrameNavigated);
        targetPage.off('request', onRequest);
        targetPage.off('response', onResponse);
        targetPage.off('requestfailed', onRequestFailed);
        targetPage.off('popup', onPopup);
      }
    });
  }

  attachToPage(initialPage);

  return {
    getActivePage() {
      return activePage;
    },
    getCurrentPlaceId() {
      flushSettledServerCalls();
      return currentPlaceId;
    },
    getTrace() {
      flushSettledServerCalls();
      return {
        traceId,
        netId: envelope.netId,
        entryPlaceId,
        currentPlaceId,
        events: structuredClone(events),
        unmappedNavigations: structuredClone(unmappedNavigations)
      };
    },
    async replay() {
      return replayNetTrace(envelope, this.getTrace());
    },
    detach() {
      while (cleanups.length > 0) {
        const fn = cleanups.pop();
        fn();
      }
    }
  };
}

export const test = appTest.extend({
  workbenchNetTracer: async ({ isolatedLabPage }, use, testInfo) => {
    const tracer = attachWorkbenchNetTracer(isolatedLabPage.page, {
      traceId: testInfo.title
    });
    await use(tracer);
    tracer.detach();
  }
});

export { expect };
