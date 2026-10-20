/**
 * Conformance Check: Tap Target Size (INV-DEV-02)
 * Audits interactive elements on coarse pointer profiles for WCAG 44x44 AAA touch target ergonomics.
 */

export default {
  id: 'tap-target-size',
  appliesTo: (profile) => profile?.pointer === 'coarse',
  requires: ['hasTouch', 'pointer'],
  async run(page, params = {}) {
    const scope = params.scope || 'a, button, [role="button"], input, select';
    const minSize = params.min || 44;

    const audit = await page.evaluate(
      ([scopeSel, min]) => {
        const els = Array.from(document.querySelectorAll(scopeSel));
        const belowMin = [];
        const below24 = [];
        let checked = 0;

        for (const el of els) {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          checked++;
          const id = el.id ? `#${el.id}` : (el.getAttribute('data-testid') ? `[data-testid="${el.getAttribute('data-testid')}"]` : el.tagName.toLowerCase());

          if (rect.width < 24 || rect.height < 24) {
            below24.push({ id, w: Math.round(rect.width), h: Math.round(rect.height) });
          } else if (rect.width < min || rect.height < min) {
            belowMin.push({ id, w: Math.round(rect.width), h: Math.round(rect.height) });
          }
        }

        return { checked, below24, belowMin };
      },
      [scope, minSize]
    );

    const pass = audit.below24.length === 0 && (minSize <= 24 || audit.belowMin.length === 0);

    return {
      status: pass ? 'pass' : 'fail',
      evidence: {
        checked: audit.checked,
        minTargetPx: minSize,
        below24: audit.below24,
        below44Advisory: audit.belowMin
      }
    };
  }
};
