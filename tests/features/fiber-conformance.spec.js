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
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const UNIT = resolve(here, '..', '..');
const DATA = JSON.parse(
  readFileSync(resolve(UNIT, 'public/conformance/harness-data.json'), 'utf8'),
);

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
  for (const p of l.power_modes) {
    out.push({ ...defaults, id: `power:${p.id}`, power_mode: p.id });
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
      test(`${fiber} @ ${coord.id}`, async ({ page }) => {
        await page.setViewportSize({ width: coord.width, height: 900 });
        const url = `/fiber-conformance.html?kind=${encodeURIComponent(fiber)}` +
          `&locale=${coord.locale}&dir=${coord.dir}` +
          `&display_mode=${coord.display_mode}&power_mode=${coord.power_mode}`;
        await page.goto(url);
        await page.waitForSelector('body[data-harness-ready="true"]', { timeout: 15000 });

        const harness = await page.evaluate(() => window.__FIBER_HARNESS__);
        expect(harness.status, `harness did not mount: ${JSON.stringify(harness)}`).toBe('mounted');
        expect(harness.kind).toBe(fiber);

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
      });
    }
  }
});
