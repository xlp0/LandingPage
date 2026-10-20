/**
 * Conformance Check: Orientation Reflow Preserves State & Geometry (INV-DEV-03)
 */

export default {
  id: 'orientation-preserves-state',
  appliesTo: (profile) => ['phone', 'tablet'].includes(profile?.category),
  requires: ['viewport'],
  async run(page, params = {}) {
    const fields = params.fields || ['input[type="text"]', 'input[type="email"]'];
    const currentVp = page.viewportSize();
    if (!currentVp) {
      return { status: 'pass', evidence: { note: 'No explicit viewport' } };
    }

    // Fill fields if present
    const testValue = `test-preserve-${Date.now()}`;
    const filledSelectors = [];
    for (const sel of fields) {
      const loc = page.locator(sel).first();
      const count = await loc.count();
      if (count > 0 && (await loc.isVisible().catch(() => false))) {
        await loc.fill(testValue).catch(() => {});
        filledSelectors.push(sel);
      }
    }

    // Swap viewport dimensions (rotate 90 degrees)
    await page.setViewportSize({
      width: currentVp.height,
      height: currentVp.width
    });
    await page.waitForTimeout(200);

    // 1. Check layout overflow after swap
    const overflowAfterSwap = await page.evaluate(() => {
      const scrollW = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0);
      const innerW = window.innerWidth;
      return scrollW > innerW + 1;
    });

    // 2. Check value survival
    let valuesIntact = true;
    for (const sel of filledSelectors) {
      const val = await page.locator(sel).first().inputValue().catch(() => '');
      if (val !== testValue) {
        valuesIntact = false;
      }
    }

    // Restore original dimensions
    await page.setViewportSize(currentVp);
    await page.waitForTimeout(100);

    const pass = !overflowAfterSwap && valuesIntact;

    return {
      status: pass ? 'pass' : 'fail',
      evidence: {
        swappedDims: { width: currentVp.height, height: currentVp.width },
        overflowAfterSwap,
        fieldsChecked: filledSelectors.length,
        valuesPreserved: valuesIntact
      }
    };
  }
};
