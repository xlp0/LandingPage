/**
 * Conformance Check: Breakpoint Layout Category Visibility
 */

export default {
  id: 'breakpoint-layout',
  appliesTo: (profile, run) => Boolean(run?.params?.byCategory?.[profile?.category]),
  requires: ['viewport'],
  async run(page, params = {}) {
    const rules = params.rules || params.byCategory || {};
    // Extract rules for category if nested
    const categoryRules = rules[params.activeCategory] || rules;
    const visibleSelectors = categoryRules.visible || [];
    const hiddenSelectors = categoryRules.hidden || [];

    const failures = [];

    for (const sel of visibleSelectors) {
      const loc = page.locator(sel).first();
      const count = await loc.count();
      if (count === 0 || !(await loc.isVisible().catch(() => false))) {
        failures.push(`Expected '${sel}' to be visible, but it was not`);
      }
    }

    for (const sel of hiddenSelectors) {
      const loc = page.locator(sel).first();
      const count = await loc.count();
      if (count > 0 && (await loc.isVisible().catch(() => false))) {
        failures.push(`Expected '${sel}' to be hidden, but it was visible`);
      }
    }

    return {
      status: failures.length === 0 ? 'pass' : 'fail',
      evidence: { failures }
    };
  }
};
