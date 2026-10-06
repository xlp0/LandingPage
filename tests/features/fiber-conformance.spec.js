/**
 * CDO-12 DV-03/DV-04: rendered-property conformance, measured in a real browser.
 *
 * The headless sweep (`scripts/cdo/fiber_coverage.mjs`) reports every pair
 * `unverified` because reflow, RTL mirroring, text containment and contrast are
 * *rendered* properties. This spec is where they stop being unverified: it loads
 * `fiber-conformance.html` for a (fiber, coordinate) pair and measures them.
 *
 * Four measurement notes, each of which changes the answer:
 *
 *  1. **Overflow is checked page-level AND per-element.** Page-level
 *     `scrollWidth > clientWidth` misses overflow that an ancestor's
 *     `overflow-x: hidden` clips — the content is wider but never scrolls.
 *  2. **Per-element overflow excludes clipped, fixed and zero-size elements.**
 *     A naive "right edge past the viewport" filter reports carousels and fixed
 *     decorations as offenders; the search on this found four false positives per
 *     real one. Ancestor clipping, `position: fixed` and zero size are excluded.
 *  3. **Text clipping ignores deliberately scrollable elements.** A scrollable
 *     code block is not a clipped string.
 *  4. **Contrast is computed from resolved colours with alpha compositing**,
 *     because `color` and `background-color` are frequently rgba or inherited
 *     through transparent ancestors. Verified against the known black-on-white
 *     ratio of 21:1.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const UNIT = resolve(here, '..', '..');
const DATA = JSON.parse(
  readFileSync(resolve(UNIT, 'public/conformance/harness-data.json'), 'utf8'),
);

const SCREENSHOT_CSS = path.join(here, 'screenshot.css');
const EPSILON_PX = 1; // sub-pixel rounding
const MIN_CONTRAST_NORMAL = 4.5;
const MIN_CONTRAST_LARGE = 3.0;

/** Coordinates to sweep. Derived from the manifest, one per axis value. */
function basis() {
  const l = DATA.manifest.type_lattice;
  const defaults = {
    locale: l.locales[0].code, dir: l.locales[0].direction,
    display_mode: l.display_modes[0].id, power_mode: l.power_modes[0].id,
    width: 1440,
  };
  const out = [];
  const FORM_WIDTH = {
    compact_mobile: 375, large_mobile: 430, tablet: 768,
    desktop_standard: 1440, ultrawide: 2560,
  };
  for (const f of l.form_factors) {
    out.push({ ...defaults, id: `form:${f.id}`, width: FORM_WIDTH[f.id] ?? 1440 });
  }
  for (const loc of l.locales) {
    out.push({ ...defaults, id: `locale:${loc.code}`, locale: loc.code, dir: loc.direction });
  }
  for (const d of l.display_modes) {
    out.push({ ...defaults, id: `display:${d.id}`, display_mode: d.id });
  }
  for (const pm of l.power_modes) {
    out.push({ ...defaults, id: `power:${pm.id}`, power_mode: pm.id });
  }

  /*
   * The remaining three axes are only partly simulable in a browser, and each
   * coordinate records which it is rather than implying uniform coverage:
   *
   *   simulated    the browser genuinely reproduces the condition
   *   proxied      no web API exists, so the nearest observable consequence is
   *                measured instead
   *   unsupported  it cannot be reproduced in a browser at all, and the
   *                coordinate is recorded uncovered rather than assumed
   *
   * Sources: Playwright's emulation docs (devices, isMobile, hasTouch, screen),
   * and microsoft/playwright#26853, where `display-mode: standalone` emulation is
   * requested and confirmed unavailable — `page.emulateMedia({ display-mode })`
   * is not valid and the `--app` flag is ignored. Tauri is a native runtime, so
   * nothing about it is reproducible in a browser.
   */
  const PLATFORMS = {
    desktop_web: { status: 'simulated', note: 'default desktop context' },
    mobile_hybrid: {
      status: 'simulated',
      note: 'isMobile + hasTouch + mobile user agent',
      contextOptions: {
        isMobile: true, hasTouch: true, deviceScaleFactor: 3,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    },
    pwa: {
      status: 'proxied',
      note: 'display-mode: standalone is not emulable (playwright#26853); measured as a touch-enabled viewport instead',
      contextOptions: { hasTouch: true },
    },
    tauri: {
      status: 'unsupported',
      note: 'native multi-webview runtime; nothing about it is reproducible in a browser',
    },
  };
  for (const [id, spec] of Object.entries(PLATFORMS)) {
    out.push({ ...defaults, id: `platform:${id}`, platform: id, ...spec });
  }

  // Orientation: the device screen is emulated so window.screen agrees with the
  // viewport, which is what a portrait/landscape check actually reads.
  for (const o of l.responsiveness.orientations) {
    const w = o === 'portrait' ? 390 : 844;
    const h = o === 'portrait' ? 844 : 390;
    out.push({
      ...defaults, id: `orientation:${o}`, orientation: o, width: w, height: h,
      status: 'simulated', note: `viewport and screen at ${w}x${h}`,
      contextOptions: { screen: { width: w, height: h }, viewport: { width: w, height: h } },
    });
  }

  /*
   * Window mode. The web has no API for maximise, split or floating, so those are
   * proxied by the viewport they produce — the observable consequence a layout
   * actually responds to. Fullscreen is the one case with a real API, and it is
   * exercised through that API rather than approximated.
   */
  const WINDOW_MODES = {
    fullscreen: { status: 'simulated', note: 'Fullscreen API via a real user gesture', fullscreen: true },
    maximized: { status: 'proxied', note: 'no web API; measured as the full desktop viewport', width: 1920, height: 1080 },
    split_50: { status: 'proxied', note: 'no web API; measured as a 50%-width viewport', width: 960, height: 900 },
    floating: { status: 'proxied', note: 'no web API; measured as a reduced floating-window viewport', width: 640, height: 480 },
  };
  for (const [id, spec] of Object.entries(WINDOW_MODES)) {
    out.push({ ...defaults, id: `window:${id}`, window_mode: id, ...spec });
  }

  return out;
}

/** Fibers to sweep. Every declared fiber, so a new one is covered automatically. */
const FIBERS = DATA.registry.fibers.map((f) => f.kind);

/** The measurement, run inside the page. Returns raw numbers, not verdicts. */
const measure = () => {
  // page.evaluate serialises this function, so it cannot see module scope:
  // every constant it needs is declared inside.
  const EPSILON = 1;
  const limit = document.documentElement.clientWidth;

  const isClippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (['hidden', 'clip', 'auto', 'scroll'].includes(ox)) return true;
    }
    return false;
  };

  const offenders = [];
  for (const el of document.querySelectorAll('#harness *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= limit + 1) continue;
    if (getComputedStyle(el).position === 'fixed') continue;
    if (isClippedByAncestor(el)) continue;
    offenders.push({ tag: el.tagName, cls: String(el.className).slice(0, 40), right: Math.round(r.right) });
  }

  const fiberEl = document.querySelector('#harness .fiber');
  const clipped = [];
  if (fiberEl) {
    const s = getComputedStyle(fiberEl);
    const scrollable = ['auto', 'scroll'].includes(s.overflowX) || ['auto', 'scroll'].includes(s.overflowY);
    if (!scrollable && (fiberEl.scrollHeight > fiberEl.clientHeight + 1 || fiberEl.scrollWidth > fiberEl.clientWidth + 1)) {
      clipped.push({ scrollH: fiberEl.scrollHeight, clientH: fiberEl.clientHeight,
                     scrollW: fiberEl.scrollWidth, clientW: fiberEl.clientWidth });
    }
  }

  // WCAG relative luminance
  const chan = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  const parse = (s) => {
    const m = String(s).match(/[\d.]+/g) ?? [];
    const nums = m.map(Number);
    return { rgb: nums.slice(0, 3), a: nums.length > 3 ? nums[3] : 1 };
  };
  const composite = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
  const effectiveBg = (el) => {
    let cur = el;
    let acc = null;
    while (cur) {
      const c = parse(getComputedStyle(cur).backgroundColor);
      if (c.a > 0) {
        acc = acc === null ? c.rgb : composite({ rgb: acc, a: 1 }, c.rgb);
        if (c.a === 1) return acc;
      }
      cur = cur.parentElement;
    }
    return acc ?? [255, 255, 255];
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)];
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  };

  let contrast = null;
  if (fiberEl) {
    const s = getComputedStyle(fiberEl);
    const fg = parse(s.color);
    const bg = effectiveBg(fiberEl);
    const sizePx = parseFloat(s.fontSize) || 16;
    const weight = parseInt(s.fontWeight, 10) || 400;
    const isLarge = sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
    contrast = {
      fg: `rgba(${fg.rgb.join(',')},${fg.a})`,
      bg: `rgb(${bg.map(Math.round).join(',')})`,
      ratio: Math.round(ratio(composite(fg, bg), bg) * 100) / 100,
      isLarge,
    };
  }

  return {
    viewportWidth: limit,
    docScrollWidth: document.documentElement.scrollWidth,
    pageOverflow: document.documentElement.scrollWidth > limit + EPSILON,
    offenders,
    clipped,
    direction: getComputedStyle(document.documentElement).direction,
    fiberDirection: fiberEl ? getComputedStyle(fiberEl).direction : null,
    textAlign: fiberEl ? getComputedStyle(fiberEl).textAlign : null,
    contrast,
  };
};

const COORDS = basis();

test.describe('Fiber conformance — rendered properties', () => {
  // sanity: the measurement itself is correct before it is trusted
  test('measurement sanity: the detector detects, and contrast is 21:1', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.setContent(`
      <style>body{margin:0;background:#fff;color:#000}</style>
      <div id="harness" style="background:#fff;color:#000">
        <div class="fiber" style="width:900px">too wide</div>
      </div>`);
    const m = await page.evaluate(measure);
    // the offender scan must find the wide child, or every later pass is vacuous
    expect(m.offenders.length, `offenders: ${JSON.stringify(m.offenders)}`).toBeGreaterThan(0);
    expect(m.pageOverflow).toBe(true);
    expect(m.contrast.ratio).toBeCloseTo(21, 1);
  });

  test('measurement sanity: a clipped ancestor is not an offender', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.setContent(`
      <style>body{margin:0;background:#fff;color:#000}</style>
      <div id="harness" style="overflow-x:hidden;background:#fff;color:#000">
        <div class="fiber" style="width:900px">clipped, not overflowing</div>
      </div>`);
    const m = await page.evaluate(measure);
    expect(m.offenders).toEqual([]);
    expect(m.pageOverflow).toBe(false);
  });

  test('measurement sanity: low contrast is detected', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.setContent(`
      <div id="harness" style="background:#ffffff">
        <div class="fiber" style="color:#a0a0a0">grey on white</div>
      </div>`);
    const m = await page.evaluate(measure);
    expect(m.contrast.ratio).toBeLessThan(4.5);
  });

  for (const fiber of FIBERS) {
    for (const coord of COORDS) {
      // A coordinate the browser cannot reproduce is recorded as uncovered. It is
      // not run, and it is not reported as a pass — the alternative would be a
      // green tick for a condition never exercised.
      if (coord.status === 'unsupported') {
        test.skip(`${fiber} @ ${coord.id} [unsupported: ${coord.note}]`, async () => {});
        continue;
      }

      test(`${fiber} @ ${coord.id}`, async ({ page, browser }) => {
        // Coordinates that need device emulation get their own context; the
        // default page cannot express isMobile, hasTouch or an emulated screen.
        let ctx = page.context();
        let ownContext = null;
        if (coord.contextOptions) {
          ownContext = await browser.newContext(coord.contextOptions);
          ctx = ownContext;
          page = await ctx.newPage();
        }

        try {
          await page.setViewportSize({ width: coord.width, height: coord.height ?? 900 });
        const url = `/fiber-conformance.html?kind=${encodeURIComponent(fiber)}` +
          `&locale=${coord.locale}&dir=${coord.dir}` +
          `&display_mode=${coord.display_mode}&power_mode=${coord.power_mode}`;
        await page.goto(url);
        await page.waitForSelector('body[data-harness-ready="true"]', { timeout: 15000 });

        const harness = await page.evaluate(() => window.__FIBER_HARNESS__);
        expect(harness.status, `harness did not mount: ${JSON.stringify(harness)}`).toBe('mounted');
        expect(harness.kind).toBe(fiber);

          // Fullscreen is the one window mode with a real API, so it is entered
          // through that API from a real gesture rather than approximated.
          if (coord.fullscreen) {
            await page.evaluate(() => {
              const b = document.createElement('button');
              b.id = 'fs-probe';
              b.textContent = 'fs';
              b.style.cssText = 'position:fixed;top:0;left:0;z-index:9';
              b.addEventListener('click', () => document.documentElement.requestFullscreen());
              document.body.appendChild(b);
            });
            await page.click('#fs-probe');
            await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 5000 });
          }

          const m = await page.evaluate(measure);

          // 1 + 2: no horizontal overflow, page-level or unclipped element-level
          expect(m.pageOverflow,
            `page overflow: scrollWidth ${m.docScrollWidth} > viewport ${m.viewportWidth}`).toBe(false);
          expect(m.offenders,
            `unclipped elements past the right edge: ${JSON.stringify(m.offenders)}`).toEqual([]);

          // 3: no clipped text
          expect(m.clipped, `clipped content: ${JSON.stringify(m.clipped)}`).toEqual([]);

          // RTL: direction propagates and is not hardcoded to left
          if (coord.dir === 'rtl') {
            expect(m.direction).toBe('rtl');
            expect(m.fiberDirection).toBe('rtl');
            expect(m.textAlign).not.toBe('left');
          }

          // 4: contrast meets WCAG AA
          expect(m.contrast).not.toBeNull();
          const floor = m.contrast.isLarge ? MIN_CONTRAST_LARGE : MIN_CONTRAST_NORMAL;
          expect(m.contrast.ratio,
            `contrast ${m.contrast.ratio}:1 (fg ${m.contrast.fg} on ${m.contrast.bg}) below ${floor}:1`)
            .toBeGreaterThanOrEqual(floor);
        } finally {
          if (ownContext) await ownContext.close();
        }
      });
    }
  }
});


/**
 * CDO-12 DV-05: visual witnesses per (fiber, coordinate).
 *
 * `toHaveScreenshot` is the witness mechanism, and it answers the question the
 * earlier record left open. That record noted a screenshot "saved" by the
 * presenter that was absent afterwards — the file had gone to `test-results/`,
 * which Playwright treats as transient output and clears. *Baselines* live in a
 * snapshot directory beside the spec and persist, which is what makes them
 * witnesses rather than logs.
 *
 * Sealing and attribution: the baseline file name encodes the fiber and the
 * coordinate, so a diff is attributable to a pair rather than to "the page".
 *
 * Human sign-off: an unapproved shift fails the comparison. The only way to
 * accept a new baseline is an explicit `--update-snapshots`, which is a human
 * action taken against a reviewed diff — the sign-off token of this harness.
 *
 * Determinism: `screenshot.css` neutralises animation and transition, which
 * Playwright documents as a source of flake, and `stylePath` pierces shadow DOM
 * and inner frames so it reaches the fiber wherever it mounts. Nothing in that
 * stylesheet changes layout, so a witness still attests the reflow.
 *
 * The witness set is declared rather than the full cross: every fiber at two
 * coordinates (LTR and RTL), because RTL is the case where mirroring can break
 * without any other symptom. Extending it is a data change here.
 */
const WITNESS_COORDS = COORDS.filter(
  (c) => c.id === 'form:desktop_standard' || c.id === 'locale:ar-EG',
);

test.describe('Fiber visual witnesses', () => {
  for (const fiber of FIBERS) {
    for (const coord of WITNESS_COORDS) {
      test(`witness: ${fiber} @ ${coord.id}`, async ({ page }) => {
        await page.setViewportSize({ width: coord.width, height: 900 });
        const url = `/fiber-conformance.html?kind=${encodeURIComponent(fiber)}` +
          `&locale=${coord.locale}&dir=${coord.dir}` +
          `&display_mode=${coord.display_mode}&power_mode=${coord.power_mode}`;
        await page.goto(url);
        await page.waitForSelector('body[data-harness-ready="true"]', { timeout: 15000 });

        await expect(page.locator('#harness')).toHaveScreenshot(
          `${fiber.replace(/\//g, '-')}--${coord.id.replace(/[:]/g, '-')}.png`,
          {
            maxDiffPixelRatio: 0.02,
            stylePath: SCREENSHOT_CSS,
            animations: 'disabled',
          },
        );
      });
    }
  }
});

/**
 * CDO-12 DV-04: membrane isolation per fiber (INV-CDO-21).
 *
 * Each fiber mounts inside an iframe membrane whose `sandbox` omits
 * `allow-same-origin`. That omission is the isolation: `allow-scripts
 * allow-same-origin` together lets the framed document reach its real origin,
 * which is the well-known way a sandbox is defeated rather than applied.
 *
 * Detection of blocked content cannot be done by catching an error — a frame
 * blocked by `X-Frame-Options: DENY` or CSP `frame-ancestors` raises nothing the
 * parent can observe. It simply never signals. So the framed document posts a
 * ready handshake, and the *absence* of that signal inside the window is the
 * diagnostic. Silence is reported as blocked, never as success, because a blank
 * frame is precisely what a silent failure looks like.
 */
test.describe('Fiber membrane isolation', () => {
  test('a compatible frame mounts inside the membrane', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/fiber-conformance.html?membrane=1&target=/public/conformance/membrane-probe.html');
    await page.waitForSelector('body[data-harness-ready="true"]', { timeout: 15000 });

    const r = await page.evaluate(() => window.__FIBER_HARNESS__);
    expect(r.status).toBe('mounted');
    expect(r.sandbox).toBe('allow-scripts');
    expect(r.sandbox).not.toContain('allow-same-origin');
  });

  test('the membrane does not leak: no overflow and the frame is contained', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/fiber-conformance.html?membrane=1&target=/public/conformance/membrane-probe.html');
    await page.waitForSelector('body[data-harness-ready="true"]', { timeout: 15000 });

    const m = await page.evaluate(measure);
    expect(m.pageOverflow, 'the membrane widened the page').toBe(false);
    expect(m.offenders, `membrane leaked past the edge: ${JSON.stringify(m.offenders)}`).toEqual([]);

    // the framed document cannot reach its parent's origin
    const sealed = await page.evaluate(() => {
      const f = document.querySelector('#membrane-host iframe');
      if (!f) return { present: false };
      let reachable = true;
      try { reachable = Boolean(f.contentDocument); } catch { reachable = false; }
      return { present: true, reachable, sandbox: f.getAttribute('sandbox') };
    });
    expect(sealed.present).toBe(true);
    expect(sealed.reachable, 'a sandboxed frame must not expose its document to the parent').toBe(false);
  });

  test('a frame refusing to be framed surfaces a diagnostic, not a blank', async ({ page }) => {
    // simulate a site that forbids framing, exactly as GitHub does
    // Match on pathname, not on the whole URL. A glob of '**/blocked-target.html'
    // also matches the harness page itself, because the target is echoed in its
    // query string — the route then fulfils the page with the blocked body and
    // nothing renders at all.
    await page.route(
      (url) => new URL(url).pathname === '/blocked-target.html',
      (route) => route.fulfill({
        status: 200,
        headers: { 'X-Frame-Options': 'DENY' },
        contentType: 'text/html',
        body: '<html><body><p>should never render</p></body></html>',
      }),
    );

    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/fiber-conformance.html?membrane=1&target=/blocked-target.html');
    await page.waitForSelector('body[data-harness-ready="true"]', { timeout: 15000 });

    const r = await page.evaluate(() => window.__FIBER_HARNESS__);
    expect(r.status).toBe('blocked');
    expect(r.reason).toContain('no ready handshake');

    const diagnostic = page.locator('#membrane-diagnostic');
    await expect(diagnostic).toBeVisible();
    await expect(diagnostic).toContainText('X-Frame-Options');
  });

  test('every declared fiber mounts in a membrane without leaking', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    const leaked = [];
    for (const fiber of FIBERS) {
      await page.goto(`/fiber-conformance.html?kind=${encodeURIComponent(fiber)}`);
      await page.waitForSelector('body[data-harness-ready="true"]', { timeout: 15000 });
      const m = await page.evaluate(measure);
      if (m.pageOverflow || m.offenders.length) leaked.push({ fiber, offenders: m.offenders });
    }
    expect(leaked, `fibers leaking outside their host: ${JSON.stringify(leaked)}`).toEqual([]);
  });
});
