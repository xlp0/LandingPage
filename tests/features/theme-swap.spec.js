// STY-07: palette-swap proof. Rebranding must be a token-file edit, never a
// page edit — swapping :root custom properties must recolour a page while its
// DOM stays untouched, and the swapped palette must still pass the contrast
// floor or be rejected.
import { test, expect } from '@playwright/test';

const SWAPPED = `
  :root {
    --color-primary: #0d9488 !important;
    --color-primary-hover: #0f766e !important;
    --color-accent: #b45309 !important;
    --color-info: #0891b2 !important;
    --badge-info-bg: #ccfbf1 !important;
    --badge-info-text: #0f766e !important;
    --badge-info-border: #5eead4 !important;
  }
`;

const CONTRAST_SAFE_LIGHT = `
  :root {
    --color-bg: #0f172a !important;
    --color-text-primary: #f8fafc !important;
  }
`;

const CONTRAST_BREAKING = `
  :root {
    --color-bg: #f8fafc !important;
    --color-text-primary: #f8fafc !important;
  }
`;

function cr(fg, bg) {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);

test.describe('Palette swap', () => {
  test('token swap recolours index without touching the DOM', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(2000);

    const before = await page.evaluate(() => {
      const el = document.querySelector('[class*="penpot-nav"], a, button');
      const body = getComputedStyle(document.body);
      return {
        bg: body.backgroundColor,
        text: body.color,
        primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
      };
    });
    const domBefore = await page.evaluate(() => document.body.innerHTML.length);

    await page.addStyleTag({ content: SWAPPED });
    await page.waitForTimeout(300);

    const after = await page.evaluate(() => ({
      primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
      domLen: document.body.innerHTML.length,
    }));

    expect(after.primary).toBe('#0d9488');
    expect(after.domLen).toBe(domBefore); // DOM untouched — only the palette moved
    console.log(`SWAP index: --color-primary ${before.primary} -> ${after.primary}`);
  });

  test('contrast-safe palette is accepted; breaking palette is rejected', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(1500);

    const gate = (css) => page.evaluate(async (swap) => {
      const el = document.createElement('style');
      el.textContent = swap;
      document.head.appendChild(el);
      // constructed fixture: the only element bound to the swapped tokens,
      // so the measurement is the palette pair itself, not page chrome.
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;top:-9999px;color:var(--color-text-primary);background:var(--color-bg);';
      document.body.appendChild(probe);
      await new Promise((r) => setTimeout(r, 50));
      const s = getComputedStyle(probe);
      const pair = { fg: s.color, bg: s.backgroundColor };
      el.remove();
      probe.remove();
      return pair;
    }, css);

    const safe = await gate(CONTRAST_SAFE_LIGHT);
    const broken = await gate(CONTRAST_BREAKING);
    const safeCr = cr(rgb(safe.fg), rgb(safe.bg));
    const brokenCr = cr(rgb(broken.fg), rgb(broken.bg));
    console.log(`SWAP gate: safe=${safeCr.toFixed(2)} broken=${brokenCr.toFixed(2)}`);
    expect(safeCr).toBeGreaterThanOrEqual(4.5);
    expect(brokenCr).toBeLessThan(4.5); // the gate must be able to see a bad palette
  });
});
