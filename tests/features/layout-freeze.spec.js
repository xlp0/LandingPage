/**
 * STY-02 — The Layout Freeze.
 *
 * Captures every element's bounding box per page, per form-factor viewport, and
 * asserts no box moves between the baseline and any later revision. INV-STY-01:
 * a colour change alters no bounding box, so the freeze permits the whole
 * style program and forbids nothing it needs.
 *
 * Modes:
 *   STY_FREEZE=capture   write docs/sprints/programs/sty/style/layout-baseline.json
 *   (default)          re-capture and diff against the baseline — the freeze
 *   STY_MUTATE=…       inject a change, then diff (mutation controls)
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '..', '..', '..', 'docs', 'sprints', 'programs', 'sty', 'style', 'layout-baseline.json');

const PAGES = [
  { path: '/app.html', name: 'app' },
  { path: '/index.html', name: 'index' },
  { path: '/responsive-lab.html', name: 'responsive-lab' },
  { path: '/fiber-inspector.html', name: 'fiber-inspector' },
  { path: '/fiber-conformance.html', name: 'fiber-conformance' },
  { path: '/pkc-docs-index.html', name: 'pkc-docs-index' },
];

// The five form factors the Type Lattice declares (mcard.yaml budgets).
const VIEWPORTS = {
  wearable: { width: 360, height: 360 },
  mobile: { width: 390, height: 844 },
  web: { width: 1280, height: 800 },
  desktop: { width: 1920, height: 1080 },
  arvr: { width: 1440, height: 720 },
};

// Runtime-volatile regions: masked rather than excluded — each is an open
// obligation, recorded in the baseline, never silently treated as frozen.
const VOLATILE = {
  app: ['#card-list', '#cards-container', '.modal', '[id^="modal"]'],
  index: ['#nav-root', '#least-action-root', '[id^="inspector"]', '[id^="modal"]',
          '[class*="modal"]', '.target-status-badge', '.correctness-status-tag'],
  'responsive-lab': ['#lab-workspace-container iframe', '.frame-dimension-pill', '.footer-status-pill'],
  'fiber-inspector': [],
  'fiber-conformance': [],
  'pkc-docs-index': [],
};

const capture = (volatileSelectors) => {
  const boxes = [];
  const els = [...document.querySelectorAll('*')];
  const masked = (el) =>
    volatileSelectors.some((sel) => { try { return el.closest(sel); } catch { return false; } });
  els.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    boxes.push({
      i,
      tag: el.tagName.toLowerCase(),
      cls: String(el.className).slice(0, 40),
      masked: masked(el),
      box: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 2) / 2),
    });
  });
  return boxes;
};

async function run(page, p, vpName, vp, mutate) {
  await page.setViewportSize(vp);
  await page.goto(p.path);
  await page.waitForTimeout(2500);
  // Mutations must mutate, not insert — an injected <style> node would shift the
  // element indices and fool the diff into detecting itself.
  if (mutate === 'padding-1px') {
    await page.evaluate(() => {
      const el = document.querySelector('.card') ?? document.body.children[0];
      if (el) el.style.paddingTop = '1px';
    });
  } else if (mutate === 'colour-only') {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        el.style.color = '#123456';
        el.style.backgroundColor = 'rgba(101,67,33,0.5)';
      }
    });
  } else if (mutate === 'display') {
    await page.evaluate(() => {
      const el = document.querySelector('.card svg') ?? document.body.children[1] ?? document.body.children[0];
      if (el) el.style.display = 'none';
    });
  }
  if (mutate) await page.waitForTimeout(300);
  return page.evaluate(capture, VOLATILE[p.name] ?? []);
}

// The committed baseline is stored compact: interned tag/class vocabularies
// plus flat box arrays. It is 8x smaller and, more importantly, was converted
// from the original measurement rather than re-taken — the freeze is only
// meaningful if the baseline predates the style changes it polices.
const encode = (els, tagVocab, clsVocab) => {
  const tagI = new Map(tagVocab.map((t, i) => [t, i]));
  const clsI = new Map(clsVocab.map((c, i) => [c, i]));
  const tags = [], cls = [], boxes = [], masked = [];
  for (const e of els) {
    if (!tagI.has(e.tag)) { tagI.set(e.tag, tagVocab.length); tagVocab.push(e.tag); }
    if (!clsI.has(e.cls)) { clsI.set(e.cls, clsVocab.length); clsVocab.push(e.cls); }
    tags.push(tagI.get(e.tag));
    cls.push(clsI.get(e.cls));
    boxes.push(...e.box);
    if (e.masked) masked.push(e.i);
  }
  return { n: els.length, tags, cls, boxes, masked };
};

const decode = (c, tagVocab, clsVocab) => {
  const els = [];
  for (let k = 0; k < c.n; k++) {
    els.push({
      i: k,
      tag: tagVocab[c.tags[k]],
      cls: clsVocab[c.cls[k]],
      masked: c.masked.includes(k),
      box: c.boxes.slice(k * 4, k * 4 + 4),
    });
  }
  return els;
};

function diffBoxes(before, after) {
  const moved = [];
  const n = Math.min(before.length, after.length);
  for (let k = 0; k < n; k++) {
    const a = before[k], b = after[k];
    if (a.masked || b.masked) continue;
    if (a.tag !== b.tag) { moved.push({ i: k, reason: `tag ${a.tag}->${b.tag}`, a, b }); continue; }
    const d = a.box.map((v, j) => Math.abs(v - b.box[j]));
    if (d.some((v) => v > 0.5)) moved.push({ i: k, a: a.box, b: b.box, tag: a.tag, cls: a.cls });
  }
  if (before.length !== after.length) {
    moved.push({ reason: `element count ${before.length} -> ${after.length}` });
  }
  return moved;
}

test.describe('Layout freeze', () => {
  const mode = process.env.STY_FREEZE ?? 'check';
  const mutate = process.env.STY_MUTATE ?? null;

  test('capture baseline', async ({ page }) => {
    test.setTimeout(300000);
    test.skip(mode !== 'capture', 'capture mode only');
    mkdirSync(dirname(OUT), { recursive: true });
    const tagVocab = [], clsVocab = [];
    // A re-capture replaces the measurements but must not erase the record of
    // *why* earlier re-baselines happened — that history is the only thing that
    // distinguishes a sanctioned change from a laundered one.
    let rebaselines = [];
    try {
      rebaselines = JSON.parse(readFileSync(OUT, 'utf8')).rebaselines ?? [];
    } catch { /* first capture */ }
    const baseline = {
      captured: '2026-10-07', viewports: Object.keys(VIEWPORTS), format: 'compact-v1',
      tag_vocab: tagVocab, cls_vocab: clsVocab, rebaselines, pages: {},
    };
    for (const p of PAGES) {
      baseline.pages[p.name] = { masked_regions: VOLATILE[p.name], viewports: {} };
      for (const [vn, vp] of Object.entries(VIEWPORTS)) {
        const els = await run(page, p, vn, vp, null);
        baseline.pages[p.name].viewports[vn] = encode(els, tagVocab, clsVocab);
      }
      console.log(`CAPTURE ${p.name}: ${baseline.pages[p.name].viewports.wearable.n} elements x ${Object.keys(VIEWPORTS).length} viewports`);
    }
    writeFileSync(OUT, JSON.stringify(baseline) + '\n');
  });

  for (const p of PAGES) {
    for (const [vn, vp] of Object.entries(VIEWPORTS)) {
      test(`freeze ${p.name} @${vn}${mutate ? ` [${mutate}]` : ''}`, async ({ page }) => {
        test.skip(mode === 'capture', 'baseline capture mode');
        // the mutation controls are deterministic only on one known page/viewport
        test.skip(!!mutate && (p.name !== 'index' || vn !== 'web'), 'mutation controls run on index@web only');
        const baseline = JSON.parse(readFileSync(OUT, 'utf8'));
        const before = decode(baseline.pages[p.name].viewports[vn],
                              baseline.tag_vocab, baseline.cls_vocab);
        const after = await run(page, p, vn, vp, mutate);
        const moved = diffBoxes(before, after);
        if (moved.length) {
          const f = moved[0];
          console.log(`MOVED ${p.name}@${vn}: ${JSON.stringify(f).slice(0, 200)} (+${moved.length - 1} more)`);
        }
        if (mutate === 'colour-only') {
          expect(moved.length, 'a colour-only change must NOT move any box').toBe(0);
        } else if (mutate) {
          expect(moved.length, `mutation ${mutate} must be detected`).toBeGreaterThan(0);
        } else {
          expect(moved.length, `${moved.length} elements moved`).toBe(0);
        }
      });
    }
  }
});
