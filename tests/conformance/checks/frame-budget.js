/**
 * Conformance Check: Frame Latency Budget (INV-DEV-04)
 * Measures rendering frame latency during reflow; advisory by default.
 */

export default {
  id: 'frame-budget',
  appliesTo: () => true,
  requires: ['viewport'],
  async run(page, params = {}) {
    const maxAllowedMs = params.avgMs || 25;
    const enforce = params.enforce === true;

    // Collect 10 frame intervals
    const frameStats = await page.evaluate(() => {
      return new Promise((resolve) => {
        let last = performance.now();
        const deltas = [];
        function loop(now) {
          deltas.push(now - last);
          last = now;
          if (deltas.length >= 10) {
            const sum = deltas.reduce((a, b) => a + b, 0);
            resolve({
              avgMs: Number((sum / deltas.length).toFixed(1)),
              maxMs: Number(Math.max(...deltas).toFixed(1))
            });
          } else {
            requestAnimationFrame(loop);
          }
        }
        requestAnimationFrame(loop);
      });
    });

    const pass = frameStats.avgMs <= maxAllowedMs;
    return {
      status: (!enforce || pass) ? 'pass' : 'fail',
      evidence: {
        avgFrameMs: frameStats.avgMs,
        maxFrameMs: frameStats.maxMs,
        thresholdMs: maxAllowedMs,
        enforce,
        advisory: !enforce && !pass
      }
    };
  }
};
