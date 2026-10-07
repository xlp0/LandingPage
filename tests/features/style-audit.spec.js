/**
 * A measurement pass over the unit's pages: what colours are actually rendered, where
 * they come from, and whether the text is readable against them.
 *
 * This is an *audit*, not a gate. It emits JSON so the assessment is based on measured
 * values rather than on reading the stylesheets — the same discipline the rest of this
 * repository uses for its claims.
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '..', '..', 'style-audit');

const PAGES = [
  { path: '/app.html', name: 'app' },
  { path: '/index.html', name: 'index' },
  { path: '/responsive-lab.html', name: 'responsive-lab' },
  { path: '/fiber-inspector.html', name: 'fiber-inspector' },
  { path: '/fiber-conformance.html', name: 'fiber-conformance' },
  { path: '/pkc-docs-index.html', name: 'pkc-docs-index' },
];

const audit = (mode) => {
  const norm = (s) => String(s ?? '').trim();
  const isTransparent = (s) => /^(transparent|rgba?\(0,\s*0,\s*0,\s*0\))$/.test(norm(s));

  // STY-06 DV-03: high-contrast must clear AAA (7:1), not merely AA.
  const highContrast = document.documentElement.dataset.theme === 'high-contrast';

  // ── every declared custom property on :root, and whether anything reads it ──
  const declared = new Set();
  const used = new Set();
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin
    if (!rules) continue;
    const walk = (list) => {
      for (const rule of list) {
        // Read the rule's cssText, not its enumerated properties: a declaration
        // whose value contains var() is held as a pending-substitution value and
        // is NOT yielded by `for (const p of rule.style)`. Enumerating therefore
        // reported var()-only tokens as unused — a false "declared but unused"
        // census. cssText sees every declaration verbatim.
        if (rule.style) {
          const text = rule.style.cssText ?? '';
          for (const m of text.matchAll(/(^|;)\s*(--[\w-]+)\s*:/g)) declared.add(m[2]);
          for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) used.add(m[1]);
        }
        if (rule.cssRules) walk(rule.cssRules);
        // @import: the referenced sheet hangs off .styleSheet, not .cssRules
        if (rule.styleSheet) {
          try { walk(rule.styleSheet.cssRules); } catch { /* cross-origin */ }
        }
      }
    };
    walk(rules);
  }

  // Inline style attributes are paint too: a token read only from an element's
  // style="" is *used*. Without this the census calls such tokens unused, which
  // would send STY-03's "adopt or retire" work in the wrong direction.
  // (<style> blocks need no special case — they are in document.styleSheets.)
  for (const el of document.querySelectorAll('[style]')) {
    const s = el.getAttribute('style') ?? '';
    for (const m of s.matchAll(/var\(\s*(--[\w-]+)/g)) used.add(m[1]);
  }

  // ── what is actually painted ──
  const colors = { color: new Map(), background: new Map(), border: new Map() };
  const bump = (bucket, v) => {
    if (!v || isTransparent(v)) return;
    bucket.set(v, (bucket.get(v) ?? 0) + 1);
  };

  const inlineStyled = [];
  const textNodes = [];
  let elements = 0;

  for (const el of document.querySelectorAll('*')) {
    elements += 1;
    const s = getComputedStyle(el);
    bump(colors.color, s.color);
    bump(colors.background, s.backgroundColor);
    if (s.borderTopWidth !== '0px') bump(colors.border, s.borderTopColor);

    if (el.hasAttribute('style') && norm(el.getAttribute('style'))) {
      inlineStyled.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 60),
        style: norm(el.getAttribute('style')).slice(0, 160),
      });
    }

    // text-bearing leaves, for contrast
    const hasText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
    );
    if (hasText) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        textNodes.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).slice(0, 60),
          color: s.color,
          fontSize: parseFloat(s.fontSize) || 16,
          fontWeight: parseInt(s.fontWeight, 10) || 400,
        });
      }
    }
  }

  // ── contrast, resolving the effective background through transparent ancestors ──
  const chan = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  const parse = (s) => {
    const m = String(s).match(/[\d.]+/g) ?? [];
    const n = m.map(Number);
    return { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 };
  };
  // layer over below — full alpha compositing, so rgba() never reports as its opaque rgb().
  const comp = (layer, below) => {
    const a = layer.a + below.a * (1 - layer.a);
    if (a === 0) return { rgb: [255, 255, 255], a: 0 };
    return {
      rgb: layer.rgb.map((v, i) => (v * layer.a + below.rgb[i] * below.a * (1 - layer.a)) / a),
      a,
    };
  };
  // painted layers from the element up to <html>; a background-image gradient branches
  // into one candidate surface per stop, so a gradient is measured, not walked through.
  const gradStops = (img) =>
    /gradient\(/.test(String(img))
      ? [...String(img).matchAll(/rgba?\([^)]*\)/g)].map((m) => parse(m[0]))
      : null;
  const effSurfaces = (el) => {
    const layers = [];
    let cur = el;
    while (cur) {
      const cs = getComputedStyle(cur);
      layers.push({ color: parse(cs.backgroundColor), stops: gradStops(cs.backgroundImage) });
      cur = cur.parentElement;
    }
    // bottom-up: every candidate is opaque, since the canvas beneath is white.
    let cands = [{ rgb: [255, 255, 255], a: 1 }];
    for (let i = layers.length - 1; i >= 0; i--) {
      const { color, stops } = layers[i];
      let next = cands.map((b) => (color.a > 0 ? comp(color, b) : b));
      if (stops && stops.length) {
        const expanded = [];
        for (const st of stops) for (const b of next) expanded.push(st.a > 0 ? comp(st, b) : b);
        next = expanded;
      }
      cands = next;
    }
    return cands;
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)];
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  };

  // ── fidelity controls: constructed fixtures run through this same resolver ──
  if (mode === 'controls') {
    const mk = (parent, css, text) => {
      const d = document.createElement('div');
      d.style.cssText = css;
      d.textContent = text;
      (parent ?? document.body).appendChild(d);
      return d;
    };
    const worstOf = (el) => {
      const fg = parse(getComputedStyle(el).color);
      const rs = effSurfaces(el).map((s) => Math.round(ratio(comp(fg, s).rgb, s.rgb) * 100) / 100);
      return { worst: Math.min(...rs), best: Math.max(...rs), surfaces: effSurfaces(el).length };
    };
    const out = {};
    // positive: dark text on a 10%-alpha dark wash over white ≈ 16:1 — the old resolver
    // read the wash as opaque and reported ~1.15:1.
    const aBox = mk(null, 'background:#fff;padding:8px;');
    const a = mk(aBox, 'background:rgba(15,23,42,0.1);color:#0f172a;display:inline-block;', 'A');
    out.positive_translucent_wash = worstOf(a);
    // negative: 6%-alpha white on black ≈ 1.06:1 — genuinely unreadable, must fail.
    const bBox = mk(null, 'background:#000;padding:8px;');
    const b = mk(bBox, 'color:rgba(255,255,255,0.06);display:inline-block;', 'B');
    out.near_invisible_text = worstOf(b);
    // regression: white on a dark gradient must not read as white-on-white.
    const c = mk(null, 'background:linear-gradient(90deg,#111827,#374151);color:#fff;display:inline-block;', 'C');
    out.gradient_dark = worstOf(c);
    // gradient with a truly invisible stop must still fail — the gate is not softened.
    const d = mk(null, 'background:linear-gradient(90deg,#fff,#fff);color:#fff;display:inline-block;', 'D');
    out.gradient_invisible = worstOf(d);
    [aBox, bBox, c, d].forEach((e) => e.remove());
    return out;
  }

  const failures = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('*')) {
    const hasText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
    );
    if (!hasText) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const fg = parse(s.color);
    const cands = effSurfaces(el);
    const hasGradient = cands.length > 1;
    const sizePx = parseFloat(s.fontSize) || 16;
    const weight = parseInt(s.fontWeight, 10) || 400;
    const isLarge = sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
    const floor = highContrast ? (isLarge ? 4.5 : 7) : (isLarge ? 3 : 4.5);
    // conservative: the worst candidate surface decides; a pass is a pass on every stop.
    let worst = null, allFail = true;
    for (const surf of cands) {
      const effFg = comp(fg, surf);
      const cr = Math.round(ratio(effFg.rgb, surf.rgb) * 100) / 100;
      if (cr >= floor) allFail = false;
      if (worst === null || cr < worst.cr) worst = { cr, surf };
    }
    if (worst.cr < floor) {
      const text = (el.textContent ?? '').trim();
      // gradient-clipped text paints the gradient as its own fill — fg/bg contrast
      // is meaningless; emoji paint their own palette and ignore `color`.
      const clipText = s.webkitTextFillColor === 'rgba(0, 0, 0, 0)' &&
        (s.webkitBackgroundClip === 'text' || s.backgroundClip === 'text');
      const emojiOnly = !/[A-Za-z0-9]/.test(text);
      let classification = hasGradient
        ? (allFail ? 'confirmed-gradient' : 'unverifiable-gradient')
        : 'confirmed';
      if (clipText) classification = 'unverifiable-clip-text';
      else if (emojiOnly) classification = 'artifact-emoji';
      if (classification === 'confirmed' && emojiOnly) classification = 'artifact-emoji';
      const key = `${s.color}|${worst.surf.rgb.map(Math.round).join(',')}|${floor}|${classification}`;
      if (seen.has(key)) continue;
      seen.add(key);
      failures.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 60),
        text: text.slice(0, 50),
        fg: s.color,
        bg: `rgb(${worst.surf.rgb.map(Math.round).join(',')})`,
        ratio: worst.cr,
        floor,
        fontSize: sizePx,
        // solid surface → real failure; all gradient stops fail → confirmed wherever the
        // text sits; mixed stops → flagged for visual confirmation, not hidden.
        classification,
      });
    }
  }

  const top = (m, n = 24) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));

  return {
    elements,
    theme: document.documentElement.dataset.theme ?? null,
    prefersColorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    customProperties: {
      declared: [...declared].sort(),
      used: [...used].sort(),
      declaredButUnused: [...declared].filter((p) => !used.has(p)).sort(),
      usedButUndeclared: [...used].filter((p) => !declared.has(p)).sort(),
    },
    colors: {
      text: top(colors.color),
      background: top(colors.background),
      border: top(colors.border),
      distinct: {
        text: colors.color.size,
        background: colors.background.size,
        border: colors.border.size,
      },
    },
    inlineStyledCount: inlineStyled.length,
    inlineStyledSample: inlineStyled.slice(0, 30),
    contrastFailures: failures,
    contrastFailureCount: failures.length,
    textNodeCount: textNodes.length,
  };
};

test.describe('Style audit', () => {
  test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

  // STY_THEME=light|dark|high-contrast forces a theme for the coverage matrix:
  // the attribute engages [data-theme] rules, emulateMedia engages prefers-color-scheme.
  const theme = process.env.STY_THEME || null;

  for (const p of PAGES) {
    test(`audit ${p.name}${theme ? ` [${theme}]` : ''}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      if (theme === 'light' || theme === 'dark') {
        await page.emulateMedia({ colorScheme: theme });
      }
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
      await page.goto(p.path);
      if (theme) {
        await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
      }
      await page.waitForTimeout(2500);

      const result = await page.evaluate(audit);
      const suffix = theme ? `.${theme}` : '';
      writeFileSync(resolve(OUT, `${p.name}${suffix}.json`),
        JSON.stringify({ page: p.path, forcedTheme: theme, errors: errs, ...result }, null, 2) + '\n');
      console.log(`AUDIT ${p.name}${suffix}: elements=${result.elements} ` +
        `distinctText=${result.colors.distinct.text} distinctBg=${result.colors.distinct.background} ` +
        `inline=${result.inlineStyledCount} contrastFailures=${result.contrastFailureCount} ` +
        `tokens=${result.customProperties.declared.length} ` +
        `declaredUnused=${result.customProperties.declaredButUnused.length} ` +
        `usedUndeclared=${result.customProperties.usedButUndeclared.length}`);
    });
  }

  // STY-06 follow-up: the component surfaces (deployment inspector, least-action
  // modal, side panes) are `display: none` until opened, and the audit skips
  // zero-size elements — so the page audit above has never measured them. This
  // pass opens them and audits their interiors, per theme. Without it, "the
  // panels are theme-adaptive" would be a claim about code nobody looked at.
  for (const t of ['dark', 'light', 'high-contrast']) {
    test(`components index [${t}]`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      if (t !== 'high-contrast') await page.emulateMedia({ colorScheme: t });
      await page.goto('/index.html');
      await page.evaluate((th) => { document.documentElement.dataset.theme = th; }, t);
      await page.waitForTimeout(1500);
      const opened = await page.evaluate(() => {
        const done = [];
        try { window.__deployment_inspector?.open?.(); done.push('inspector'); } catch { /* */ }
        try { window.__least_action_navigator?.open?.(); done.push('least-action'); } catch { /* */ }
        return done;
      });
      await page.waitForTimeout(1500);
      const result = await page.evaluate(audit);
      writeFileSync(resolve(OUT, `index.components.${t}.json`),
        JSON.stringify({ page: '/index.html', surface: 'components', forcedTheme: t,
                         opened, ...result }, null, 2) + '\n');
      console.log(`AUDIT index.components.${t}: opened=[${opened.join(',')}] ` +
        `elements=${result.elements} contrastFailures=${result.contrastFailureCount} ` +
        `distinctBg=${result.colors.distinct.background}`);
    });
  }

  // RVP-03: the Device Manager is likewise `display: none` until opened, so it
  // needs the same treatment — otherwise the new UI's contrast would be an
  // assertion about markup rather than a measurement.
  for (const t of ['dark', 'light', 'high-contrast']) {
    test(`components responsive-lab [${t}]`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      if (t !== 'high-contrast') await page.emulateMedia({ colorScheme: t });
      await page.goto('/responsive-lab.html');
      await page.evaluate((th) => { document.documentElement.dataset.theme = th; }, t);
      await page.waitForTimeout(1200);
      const opened = await page.evaluate(() => {
        const done = [];
        try {
          document.getElementById('btn-open-device-manager')?.click();
          done.push('device-manager');
        } catch { /* */ }
        return done;
      });
      await page.waitForTimeout(800);
      const result = await page.evaluate(audit);
      writeFileSync(resolve(OUT, `responsive-lab.components.${t}.json`),
        JSON.stringify({ page: '/responsive-lab.html', surface: 'components', forcedTheme: t,
                         opened, ...result }, null, 2) + '\n');
      console.log(`AUDIT responsive-lab.components.${t}: opened=[${opened.join(',')}] ` +
        `elements=${result.elements} contrastFailures=${result.contrastFailureCount} ` +
        `distinctBg=${result.colors.distinct.background}`);
    });
  }

  // DV-STY-01-02 controls: constructed fixtures through the same resolver.
  test('audit fidelity controls', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(800);
    const c = await page.evaluate(audit, 'controls');
    console.log('CONTROLS', JSON.stringify(c));
    // positive: the translucent wash composites to a readable surface
    expect(c.positive_translucent_wash.worst).toBeGreaterThanOrEqual(4.5);
    // negative: genuinely near-invisible text still fails
    expect(c.near_invisible_text.worst).toBeLessThan(4.5);
    // gradient regression: a dark gradient is not the white canvas
    expect(c.gradient_dark.worst).toBeGreaterThanOrEqual(4.5);
    expect(c.gradient_dark.surfaces).toBeGreaterThan(1);
    // an all-white gradient is honestly invisible, not softened
    expect(c.gradient_invisible.worst).toBeLessThan(1.1);
  });
});
