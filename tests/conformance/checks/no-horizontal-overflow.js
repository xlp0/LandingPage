/**
 * Conformance Check: No Horizontal Overflow (INV-DEV-01)
 */

export default {
  id: 'no-horizontal-overflow',
  appliesTo: () => true,
  requires: ['viewport'],
  async run(page, params = {}) {
    const res = await page.evaluate(() => {
      const scrollW = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
      const innerW = window.innerWidth;
      const overflowing = [];
      if (scrollW > innerW + 1) {
        document.querySelectorAll('*').forEach((el) => {
          if (el === document.documentElement || el === document.body) return;
          const rect = el.getBoundingClientRect();
          if (rect.right > innerW + 1 && rect.width > 0 && rect.height > 0) {
            const id = el.id ? `#${el.id}` : '';
            const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : '';
            overflowing.push(`${el.tagName.toLowerCase()}${id || cls}`);
          }
        });
      }
      return { scrollW, innerW, overflowing: overflowing.slice(0, 10) };
    });

    const pass = res.scrollW <= res.innerW + 1;
    return {
      status: pass ? 'pass' : 'fail',
      evidence: {
        scrollWidth: res.scrollW,
        innerWidth: res.innerW,
        overflowingElements: res.overflowing
      }
    };
  }
};
