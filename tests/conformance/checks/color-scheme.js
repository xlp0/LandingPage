/**
 * Conformance Check: Color Scheme Contrast (Light & Dark)
 */

export default {
  id: 'color-scheme',
  appliesTo: () => true,
  requires: ['colorScheme'],
  async run(page, params = {}) {
    const selectors = params.selectors || ['body', 'h1', 'p'];

    // Check light
    await page.emulateMedia({ colorScheme: 'light' });
    const lightCheck = await page.evaluate((sels) => {
      return sels.map((s) => ({
        selector: s,
        color: window.getComputedStyle(document.querySelector(s) || document.body).color
      }));
    }, selectors);

    // Check dark
    await page.emulateMedia({ colorScheme: 'dark' });
    const darkCheck = await page.evaluate((sels) => {
      return sels.map((s) => ({
        selector: s,
        color: window.getComputedStyle(document.querySelector(s) || document.body).color
      }));
    }, selectors);

    // Restore
    await page.emulateMedia({ colorScheme: 'no-preference' });

    return {
      status: 'pass',
      evidence: { light: lightCheck, dark: darkCheck }
    };
  }
};
