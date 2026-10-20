/**
 * Conformance Check: Viewport Meta Tag (isMobile)
 */

export default {
  id: 'viewport-meta',
  appliesTo: (profile) => Boolean(profile?.isMobile),
  requires: ['isMobile'],
  async run(page) {
    const content = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.getAttribute('content') : null;
    });

    const pass = Boolean(content && content.includes('width=device-width'));
    return {
      status: pass ? 'pass' : 'fail',
      evidence: { content }
    };
  }
};
