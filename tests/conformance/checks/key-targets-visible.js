/**
 * Conformance Check: Key Targets Visible and Contained
 */

export default {
  id: 'key-targets-visible',
  appliesTo: () => true,
  requires: ['viewport'],
  async run(page, params = {}) {
    const selectors = params.selectors || ['main', 'h1'];
    const requirePresent = params.requirePresent ?? false;
    const results = [];
    let allPass = true;

    for (const sel of selectors) {
      const count = await page.locator(sel).count();
      if (count === 0) {
        if (requirePresent) {
          results.push({ selector: sel, found: false, visible: false, withinViewport: false });
          allPass = false;
        } else {
          results.push({ selector: sel, found: false, skipped: true });
        }
        continue;
      }
      const loc = page.locator(sel).first();
      const visible = await loc.isVisible().catch(() => false);
      const withinViewport = await loc
        .evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.right <= window.innerWidth + 1 && rect.left >= -1;
        })
        .catch(() => false);

      const pass = visible && withinViewport;
      if (!pass) allPass = false;
      results.push({ selector: sel, found: true, visible, withinViewport });
    }

    return {
      status: allPass ? 'pass' : 'fail',
      evidence: { checked: results }
    };
  }
};
