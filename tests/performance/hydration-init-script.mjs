export const ISLAND_HYDRATION_INIT_SCRIPT = () => {
  const state = {
    islands: {},
    islandOrder: [],
    longTasks: [],
    lcpEntries: [],
    clsEntries: [],
    observersSupported: {
      longtask: false,
      lcp: false,
      cls: false
    },
    labReadyAtMs: null
  };

  Object.defineProperty(window, '__gqc06Perf', {
    value: state,
    writable: false,
    configurable: true
  });

  if (typeof PerformanceObserver === 'function') {
    try {
      const ltObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.longTasks.push({
            name: entry.name || 'longtask',
            startTime: Number(entry.startTime.toFixed(3)),
            duration: Number(entry.duration.toFixed(3)),
            endTime: Number((entry.startTime + entry.duration).toFixed(3))
          });
        }
      });
      ltObs.observe({ type: 'longtask', buffered: true });
      state.observersSupported.longtask = true;
    } catch {}

    try {
      const lcpObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.lcpEntries.push({
            startTime: Number(entry.startTime.toFixed(3)),
            size: entry.size || 0,
            tagName: entry.element ? entry.element.tagName : null
          });
        }
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
      state.observersSupported.lcp = true;
    } catch {}

    try {
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          state.clsEntries.push({
            value: entry.value,
            hadRecentInput: Boolean(entry.hadRecentInput),
            startTime: Number(entry.startTime.toFixed(3))
          });
        }
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
      state.observersSupported.cls = true;
    } catch {}
  }

  function formatDirective(clientAttr) {
    const raw = String(clientAttr || '').trim();
    if (raw === 'only') return 'client:only="preact"';
    if (raw) return `client:${raw}`;
    return 'unknown';
  }

  function parseIslandName(componentUrl, uid) {
    const raw = String(componentUrl || '');
    const file = raw.split('/').pop() || '';
    const base = file.split('.')[0];
    return base || `island-${uid || 'unknown'}`;
  }

  function finalizeIslandHydration(el, record, triggerSource) {
    if (record.hydrated) return;
    const now = Number(performance.now().toFixed(3));
    record.hydrated = true;
    record.hydratedAtMs = now;
    record.hydrateDurationFromConnectMs = Number(Math.max(0, now - record.discoveredAtMs).toFixed(3));
    record.triggerSource = triggerSource;

    const markHydrated = `gqc06:island:hydrated:${record.islandName}`;
    const measureFromNav = `gqc06:island:nav-to-hydrated:${record.islandName}`;
    try {
      performance.mark(markHydrated);
      performance.measure(measureFromNav, { start: 0, end: now });
    } catch {}

    record.longTasksUntilHydrated = state.longTasks.filter(
      (lt) => lt.startTime <= now && lt.endTime >= 0
    );
    record.longTasksDuringMount = state.longTasks.filter(
      (lt) => lt.endTime >= record.discoveredAtMs && lt.startTime <= now
    );
  }

  function registerIslandElement(el) {
    if (!el || el.__gqc06Tracked) return;
    el.__gqc06Tracked = true;

    const uid = el.getAttribute('uid') || String(state.islandOrder.length + 1);
    const componentUrl = el.getAttribute('component-url') || '';
    const clientAttr = el.getAttribute('client') || '';
    const islandName = parseIslandName(componentUrl, uid);
    const discoveredAtMs = Number(performance.now().toFixed(3));

    try {
      performance.mark(`gqc06:island:discovered:${islandName}`);
    } catch {}

    const record = {
      uid,
      islandName,
      componentUrl,
      rendererUrl: el.getAttribute('renderer-url') || '',
      clientAttr,
      directive: formatDirective(clientAttr),
      discoveredAtMs,
      hydrated: false,
      hydratedAtMs: null,
      hydrateDurationFromConnectMs: null,
      triggerSource: null,
      longTasksUntilHydrated: [],
      longTasksDuringMount: []
    };

    state.islands[islandName] = record;
    state.islandOrder.push(islandName);

    el.addEventListener('astro:hydrate', () => {
      finalizeIslandHydration(el, record, 'astro:hydrate');
    });

    if (!el.hasAttribute('ssr') && !el.hasAttribute('hydrating')) {
      finalizeIslandHydration(el, record, 'already-hydrated');
    }
  }

  function scanDocument() {
    if (document.body && !document.body.classList.contains('lab-booting') && state.labReadyAtMs === null) {
      state.labReadyAtMs = Number(performance.now().toFixed(3));
      try {
        performance.mark('gqc06:lab:ready');
      } catch {}
    }
    const nodes = document.getElementsByTagName('astro-island');
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      registerIslandElement(node);
      const uid = node.getAttribute('uid') || '';
      const name = parseIslandName(node.getAttribute('component-url') || '', uid);
      const rec = state.islands[name];
      if (rec && !rec.hydrated && !node.hasAttribute('ssr') && !node.hasAttribute('hydrating')) {
        finalizeIslandHydration(node, rec, 'ssr-attribute-removed');
      }
    }
  }

  const domObserver = new MutationObserver(() => {
    scanDocument();
  });

  domObserver.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['ssr', 'hydrating', 'class']
  });

  if (document.readyState !== 'loading') {
    scanDocument();
  } else {
    document.addEventListener('DOMContentLoaded', scanDocument, { once: true });
  }
};

export async function readBrowserPerfSnapshot(page) {
  return page.evaluate(() => {
    const perf = window.__gqc06Perf || null;
    const nav = performance.getEntriesByType('navigation')[0] || null;
    const marks = performance.getEntriesByType('mark')
      .filter((m) => m.name.startsWith('gqc06:'))
      .map((m) => ({ name: m.name, startTime: Number(m.startTime.toFixed(3)) }));
    const measures = performance.getEntriesByType('measure')
      .filter((m) => m.name.startsWith('gqc06:'))
      .map((m) => ({ name: m.name, duration: Number(m.duration.toFixed(3)) }));

    let lcpMs = null;
    if (perf && perf.observersSupported.lcp && perf.lcpEntries.length > 0) {
      lcpMs = perf.lcpEntries[perf.lcpEntries.length - 1].startTime;
    }

    let cls = null;
    if (perf && perf.observersSupported.cls) {
      let sum = 0;
      for (const item of perf.clsEntries) {
        if (!item.hadRecentInput && typeof item.value === 'number') {
          sum += item.value;
        }
      }
      cls = Number(sum.toFixed(4));
    }

    return {
      navigation: nav
        ? {
            responseEndMs: Number(nav.responseEnd.toFixed(3)),
            domInteractiveMs: Number(nav.domInteractive.toFixed(3)),
            domContentLoadedMs: Number(nav.domContentLoadedEventEnd.toFixed(3)),
            loadEventMs: Number(nav.loadEventEnd.toFixed(3)),
            transferSize: nav.transferSize,
            decodedBodySize: nav.decodedBodySize
          }
        : null,
      labReadyAtMs: perf ? perf.labReadyAtMs : null,
      lcpMs,
      cls,
      longTasks: perf ? perf.longTasks : [],
      islands: perf ? perf.islands : {},
      islandOrder: perf ? perf.islandOrder : [],
      marks,
      measures
    };
  });
}
