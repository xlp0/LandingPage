/**
 * Conformance Check: Hover Menus Have Touch Paths (hover === false)
 */

export default {
  id: 'hover-has-touch-path',
  appliesTo: (profile) => profile?.hover === false,
  requires: ['hasTouch', 'hover'],
  async run(page, params = {}) {
    const menus = params.hoverMenus || [];
    const failures = [];

    for (const sel of menus) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) {
        try {
          await loc.tap({ timeout: 1000 });
        } catch (err) {
          failures.push(`Hover element '${sel}' could not be opened via touch tap: ${err.message}`);
        }
      }
    }

    return {
      status: failures.length === 0 ? 'pass' : 'fail',
      evidence: { checked: menus.length, failures }
    };
  }
};
