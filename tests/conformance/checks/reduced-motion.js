/**
 * Conformance Check: Respects Reduced Motion Preference
 */

export default {
  id: 'reduced-motion',
  appliesTo: () => true,
  requires: ['reducedMotion'],
  async run(page, params = {}) {
    const scope = params.scope || 'body';
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const animations = await page.evaluate((scopeSel) => {
      const root = document.querySelector(scopeSel) || document.body;
      const anims = document.getAnimations ? document.getAnimations() : [];
      let longRunning = 0;
      for (const a of anims) {
        if (a.playState === 'running') {
          const dur = a.effect?.getTiming?.()?.duration;
          if (typeof dur === 'number' && dur > 100) {
            longRunning++;
          }
        }
      }
      return { total: anims.length, longRunning };
    }, scope);

    // Restore media
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    const pass = animations.longRunning === 0;
    return {
      status: pass ? 'pass' : 'fail',
      evidence: animations
    };
  }
};
