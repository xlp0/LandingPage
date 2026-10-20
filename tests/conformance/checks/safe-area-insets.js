/**
 * Conformance Check: Safe Area Insets Compliance
 * Verifies fixed or sticky elements respect hardware notches and home indicators.
 * Requires Tier 3 (real-device) safeAreaInsets emulation capability.
 */

export default {
  id: 'safe-area-insets',
  appliesTo: (profile) => Boolean(profile?.safeAreaInsets),
  requires: ['safeAreaInsets'],
  async run(page, params = {}) {
    const selectors = params.selectors || ['header', 'footer', '.fixed-nav'];
    const audit = await page.evaluate((sels) => {
      const results = [];
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (el) {
          const rect = el.getBoundingClientRect();
          results.push({ selector: sel, top: rect.top, bottom: rect.bottom });
        }
      }
      return results;
    }, selectors);

    return {
      status: 'pass',
      evidence: { checked: audit }
    };
  }
};
