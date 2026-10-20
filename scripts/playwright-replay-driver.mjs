/**
 * Deterministic Playwright Replay Driver (SPRINT-ERB-04 §4.2, §4.3, §4.4)
 * Loads recorded sessions and deterministically replays them in Playwright contexts,
 * executing parity checks and generating replay result records.
 */

import { hashContent } from '../server/mcard-api.mjs';
import { canonicalJson } from '../js/harness/test-run-schema.js';

/**
 * Derives DOM digest string from data-testid elements in page.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function computeDomDigest(page) {
  const digestInput = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('[data-testid]'));
    elements.sort((a, b) => a.getAttribute('data-testid').localeCompare(b.getAttribute('data-testid')));
    return elements
      .map((el) => {
        const testId = el.getAttribute('data-testid');
        const visible = el.offsetParent !== null || window.getComputedStyle(el).display !== 'none';
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        return `${testId}:${visible ? '1' : '0'}:${text}`;
      })
      .join('|');
  });

  const hash = hashContent(digestInput, 'blake3');
  return `blake3:${hash}`;
}

/**
 * Replays a test run against a Playwright Page.
 * @param {import('@playwright/test').Page} page
 * @param {Object} run Validated responsive test run payload
 * @param {Object} [options]
 * @param {'deterministic'|'paced'} [options.mode='deterministic']
 * @param {1|2|5} [options.speed=1]
 * @param {boolean} [options.viaLab=false]
 * @param {Object} [options.replayFixtures={}]
 * @param {string} [options.serverOrigin='http://localhost:3001']
 * @param {boolean} [options.mintResult=false]
 * @returns {Promise<Object>} ReplayResultV1 record
 */
export async function replayRun(page, run, options = {}) {
  const {
    mode = 'deterministic',
    speed = 1,
    viaLab = false,
    replayFixtures = {},
    serverOrigin = 'http://localhost:3001',
    mintResult = process.env.MINT_RESULTS === '1'
  } = options;

  let replayedCount = 0;
  let fallbacks = 0;
  let notReplayed = 0;
  let pointerCount = 0;

  let currentViewport = {
    width: run.device?.width || 393,
    height: run.device?.height || 852
  };

  let simulatedElapsedMs = 0;

  for (const ev of run.events || []) {
    // Timing pacing in paced mode
    if (mode === 'paced' && typeof ev.t_rel_ms === 'number') {
      const waitMs = Math.max(0, (ev.t_rel_ms - simulatedElapsedMs) / speed);
      if (waitMs > 5) {
        await page.waitForTimeout(waitMs);
      }
      simulatedElapsedMs = ev.t_rel_ms;
    }

    try {
      switch (ev.type) {
        case 'viewport_change':
        case 'orientation_change': {
          if (ev.viewport?.w && ev.viewport?.h) {
            currentViewport = { width: ev.viewport.w, height: ev.viewport.h };
            await page.setViewportSize(currentViewport);
            replayedCount++;
          }
          break;
        }

        case 'pointer': {
          pointerCount++;
          const isTouch = ev.pointer?.pointerType === 'touch' || run.device?.hasTouch;
          let clicked = false;

          // Attempt selector resolution first
          if (ev.target?.selector) {
            try {
              const loc = page.locator(ev.target.selector).first();
              const isVisible = await loc.isVisible({ timeout: 500 }).catch(() => false);
              if (isVisible) {
                if (isTouch) {
                  await loc.tap({ timeout: 1000 });
                } else {
                  await loc.click({ timeout: 1000 });
                }
                clicked = true;
                replayedCount++;
              }
            } catch {}
          }

          // Spatial fallback
          if (!clicked) {
            if (ev.coords && typeof ev.coords.nx === 'number' && typeof ev.coords.ny === 'number') {
              const x = Math.round(ev.coords.nx * currentViewport.width);
              const y = Math.round(ev.coords.ny * currentViewport.height);

              if (isTouch && page.touchscreen) {
                await page.touchscreen.tap(x, y);
              } else {
                await page.mouse.click(x, y);
              }
              fallbacks++;
              replayedCount++;
            } else {
              notReplayed++;
            }
          }
          break;
        }

        case 'input': {
          if (ev.target?.selector) {
            const loc = page.locator(ev.target.selector).first();
            let val = ev.value;
            if (val === '<redacted>') {
              val = replayFixtures[ev.target.selector] || 'fixture-input';
            }
            await loc.fill(val, { timeout: 1500 });
            replayedCount++;
          } else {
            notReplayed++;
          }
          break;
        }

        case 'key': {
          if (ev.key) {
            await page.keyboard.press(ev.key);
            replayedCount++;
          }
          break;
        }

        case 'scroll': {
          if (ev.scroll) {
            await page.evaluate(([x, y]) => window.scrollTo(x, y), [ev.scroll.x, ev.scroll.y]);
            replayedCount++;
          }
          break;
        }

        case 'media_change': {
          if (ev.media?.query?.includes('prefers-color-scheme')) {
            const colorScheme = ev.media.query.includes('dark') ? 'dark' : 'light';
            await page.emulateMedia({ colorScheme });
            replayedCount++;
          } else if (ev.media?.query?.includes('prefers-reduced-motion')) {
            const reducedMotion = ev.media.query.includes('reduce') ? 'reduce' : 'no-preference';
            await page.emulateMedia({ reducedMotion });
            replayedCount++;
          } else {
            notReplayed++;
          }
          break;
        }

        case 'navigation': {
          if (ev.url) {
            const currentUrl = page.url();
            if (!currentUrl.includes(ev.url) && !ev.url.includes(currentUrl)) {
              console.warn(`[ReplayDriver] Navigation divergence: current ${currentUrl}, expected ${ev.url}`);
            }
            replayedCount++;
          }
          break;
        }

        case 'pause':
        case 'resume':
        default:
          // Informational markers; no Playwright action required
          break;
      }
    } catch (err) {
      console.warn(`[ReplayDriver] Failed to replay event #${ev.seq} (${ev.type}):`, err.message);
      notReplayed++;
    }
  }

  // Parity checks
  await page.waitForTimeout(300);

  const finalUrl = page.url();
  const expectedUrl = run.finalState?.url || run.target?.url;
  const finalUrlPass = Boolean(expectedUrl && (finalUrl.includes(expectedUrl) || expectedUrl.includes(finalUrl)));

  const currentDomDigest = await computeDomDigest(page);
  const expectedDomDigest = run.finalState?.domDigest;
  // If recorded with placeholder digest, accept equality or digest match
  const domDigestPass = Boolean(
    !expectedDomDigest ||
    expectedDomDigest === 'blake3:pending' ||
    expectedDomDigest === 'blake3:placeholder' ||
    expectedDomDigest === currentDomDigest
  );

  const fallbackRatio = pointerCount > 0 ? fallbacks / pointerCount : 0;
  const droppedCount = run.metrics?.droppedCount || 0;

  let verdict = 'pass';
  if (!finalUrlPass || !domDigestPass) {
    verdict = 'fail';
  } else if (fallbackRatio > 0.2) {
    verdict = 'fragile';
  } else if (droppedCount > 0) {
    verdict = 'partial';
  }

  const resultRecord = {
    schema: 'urn:mcard:schema:replay_result:v1',
    sourceRunHash: run.hash || run.sessionId || 'anonymous_run',
    target: run.target || { url: finalUrl, slug: 'unknown' },
    device: {
      id: run.device?.id || 'desktop-fhd',
      orientation: run.orientation || 'portrait'
    },
    fidelity: {
      tier: viaLab ? 0 : 1,
      runner: viaLab ? 'lab-iframe' : 'playwright',
      emulated: viaLab ? ['viewport'] : ['viewport', 'pixelRatio', 'hasTouch', 'isMobile'],
      notEmulated: ['screenOrientationApi', 'safeAreaInsets']
    },
    mode,
    speed: mode === 'paced' ? speed : 1,
    verdict,
    checks: {
      finalUrl: finalUrlPass,
      domDigest: domDigestPass,
      fallbackRatio: Number(fallbackRatio.toFixed(3)),
      dropped: droppedCount
    },
    counts: {
      replayed: replayedCount,
      fallbacks,
      notReplayed
    }
  };

  // Mint result record if requested
  if (mintResult) {
    try {
      const res = await fetch(`${serverOrigin}/api/test-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultRecord)
      });
      if (res.ok) {
        const body = await res.json();
        resultRecord.mintedHash = body.hash;
        resultRecord.mintedHandle = body.handle;
      }
    } catch (err) {
      console.warn('[ReplayDriver] Failed to mint result record:', err.message);
    }
  }

  return resultRecord;
}
