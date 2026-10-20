/**
 * Conformance Check: Graceful Fallback When Geolocation Denied
 */

export default {
  id: 'geolocation-denied',
  appliesTo: (profile, run) => Boolean(run?.params?.enabled),
  requires: ['permissions', 'geolocation'],
  async run(page, params = {}) {
    const fallbackSel = params.fallbackSelector || '[data-testid="geo-fallback"]';
    const hasFallback = (await page.locator(fallbackSel).count()) > 0;
    return {
      status: hasFallback ? 'pass' : 'fail',
      evidence: { fallbackSelector: fallbackSel, found: hasFallback }
    };
  }
};
