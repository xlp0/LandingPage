/**
 * Conformance Check: High-DPI Image Assets
 */

export default {
  id: 'dpr-assets',
  appliesTo: (profile) => (profile?.pixelRatio || 1) >= 2,
  requires: ['pixelRatio'],
  async run(page, params = {}) {
    const scope = params.scope || 'img';
    const audit = await page.evaluate((scopeSel) => {
      const imgs = Array.from(document.querySelectorAll(scopeSel));
      const checked = imgs.length;
      const issues = [];
      for (const img of imgs) {
        if (!img.src && !img.srcset) continue;
        const dpr = window.devicePixelRatio || 1;
        if (dpr >= 2 && img.srcset && !img.currentSrc) {
          issues.push(`Image ${img.id || img.src} failed to pick responsive candidate on 2x DPR`);
        }
      }
      return { checked, issues };
    }, scope);

    return {
      status: audit.issues.length === 0 ? 'pass' : 'fail',
      evidence: audit
    };
  }
};
