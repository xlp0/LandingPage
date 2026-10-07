/**
 * A measurement pass over the unit's pages: what colours are actually rendered, where
 * they come from, and whether the text is readable against them.
 *
 * This is an *audit*, not a gate. It emits JSON so the assessment is based on measured
 * values rather than on reading the stylesheets — the same discipline the rest of this
 * repository uses for its claims.
 */
import { test } from '@playwright/test';
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

const audit = () => {
  const norm = (s) => String(s ?? '').trim();
  const isTransparent = (s) => /^(transparent|rgba?\(0,\s*0,\s*0,\s*0\))$/.test(norm(s));

  // ── every declared custom property on :root, and whether anything reads it ──
  const declared = new Set();
  const used = new Set();
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin
    if (!rules) continue;
    const walk = (list) => {
      for (const rule of list) {
        if (rule.style) {
          for (const prop of rule.style) {
            if (prop.startsWith('--')) declared.add(prop);
          }
          // a var() reference anywhere in a declaration
          for (const prop of rule.style) {
            const v = rule.style.getPropertyValue(prop);
            for (const m of String(v).matchAll(/var\(\s*(--[\w-]+)/g)) used.add(m[1]);
          }
        }
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    walk(rules);
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
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
  const effBg = (el) => {
    let cur = el, acc = null;
    while (cur) {
      const c = parse(getComputedStyle(cur).backgroundColor);
      if (c.a > 0) {
        acc = acc === null ? c.rgb : over({ rgb: acc, a: 1 }, c.rgb);
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
    const bg = effBg(el);
    const sizePx = parseFloat(s.fontSize) || 16;
    const weight = parseInt(s.fontWeight, 10) || 400;
    const isLarge = sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
    const floor = isLarge ? 3 : 4.5;
    const cr = Math.round(ratio(over(fg, bg), bg) * 100) / 100;
    if (cr < floor) {
      const key = `${s.color}|${bg.map(Math.round).join(',')}|${floor}`;
      if (seen.has(key)) continue;
      seen.add(key);
      failures.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 60),
        text: (el.textContent ?? '').trim().slice(0, 50),
        fg: s.color,
        bg: `rgb(${bg.map(Math.round).join(',')})`,
        ratio: cr,
        floor,
        fontSize: sizePx,
      });
    }
  }

  const top = (m, n = 24) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count }));

  return {
    elements,
    theme: document.documentElement.dataset.theme ?? null,
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

  for (const p of PAGES) {
    test(`audit ${p.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
      await page.goto(p.path);
      await page.waitForTimeout(2500);

      const result = await page.evaluate(audit);
      writeFileSync(resolve(OUT, `${p.name}.json`),
        JSON.stringify({ page: p.path, errors: errs, ...result }, null, 2) + '\n');
      console.log(`AUDIT ${p.name}: elements=${result.elements} ` +
        `distinctText=${result.colors.distinct.text} distinctBg=${result.colors.distinct.background} ` +
        `inline=${result.inlineStyledCount} contrastFailures=${result.contrastFailureCount} ` +
        `tokens=${result.customProperties.declared.length} ` +
        `declaredUnused=${result.customProperties.declaredButUnused.length} ` +
        `usedUndeclared=${result.customProperties.usedButUndeclared.length}`);
    });
  }
});
