/**
 * Conformance Check: Layout Stability (CLS)
 */

export default {
  id: 'layout-stability',
  appliesTo: () => true,
  requires: ['viewport', 'layoutShiftApi'],
  async run(page, params = {}) {
    const maxCls = params.maxCls || 0.1;

    const cls = await page.evaluate(() => {
      if (typeof PerformanceObserver === 'undefined') return null;
      // Read accumulated shift entries
      const entries = performance.getEntriesByType?.('layout-shift') || [];
      let total = 0;
      for (const e of entries) {
        if (!e.hadRecentInput && typeof e.value === 'number') {
          total += e.value;
        }
      }
      return Number(total.toFixed(4));
    });

    if (cls === null) {
      return {
        status: 'skipped',
        reason: 'fidelity',
        missing: ['layoutShiftApi'],
        evidence: { note: 'PerformanceObserver layout-shift not supported' }
      };
    }

    const pass = cls <= maxCls;
    return {
      status: pass ? 'pass' : 'fail',
      evidence: { cls, threshold: maxCls }
    };
  }
};
