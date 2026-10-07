/**
 * EPIC-RVP — Responsive Viewport Rotation & Dynamic Device Registry (RVP-05)
 *
 * Every claim this program makes is browser-observable: a dimension swap, a
 * containment bound, a persistence round-trip, a schema rejection. None can be
 * settled by reading source, so each invariant below is bound to a measurement
 * of the DOM or of storage.
 *
 * Selector note: the stage element is `#lab-stage-container` (there is no
 * `#workbench-stage`). The `beforeEach` pins a deterministic stage because
 * INV-RVP-02 scales a device that exceeds it and `boundingBox()` reports the
 * rendered box — without a fixed viewport, an exact-dimension assertion and a
 * containment assertion would disagree about whether scaling is active.
 */
import { test, expect } from '@playwright/test';

const STAGE = '#lab-stage-container';
const FRAME = '#controlled-panel-frame';
const STORAGE_KEY = 'pkc_responsive_lab_devices_v1';

test.describe('EPIC-RVP: Responsive Viewport Rotation & Dynamic Device Registry', () => {
  test.beforeEach(async ({ page }) => {
    // 1600x1200: the 393x852 portrait device fits unscaled (RVP-T01), while the
    // 1920x1080 desktop does not (RVP-T02). Do not change without revisiting both.
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.goto('/responsive-lab.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INV-RVP-01 — Symmetric Orientation Inversion
  // ──────────────────────────────────────────────────────────────────────────
  test('RVP-T01: rotation physically swaps width and height, and twice is identity', async ({ page }) => {
    const frame = page.locator(FRAME);

    // portrait device, portrait orientation
    await page.locator('#btn-orient-vertical').click();
    await page.locator('#btn-size-mobile').click();
    await page.waitForTimeout(500);

    const portrait = await frame.boundingBox();
    expect(portrait.width, 'portrait width is the device width').toBeCloseTo(393, 0);
    expect(portrait.height, 'portrait height is the device height').toBeCloseTo(852, 0);
    expect(portrait.height).toBeGreaterThan(portrait.width);

    // rotate to landscape: the dimensions must exchange, not just the label
    await page.locator('#btn-rotate-viewport').click();
    await page.waitForTimeout(500);

    const landscape = await frame.boundingBox();
    expect(landscape.width, 'landscape width is the former height').toBeCloseTo(852, 0);
    expect(landscape.height, 'landscape height is the former width').toBeCloseTo(393, 0);
    expect(landscape.width).toBeGreaterThan(landscape.height);
    await expect(frame).toHaveClass(/orientation-horizontal/);

    // rotate again: identity
    await page.locator('#btn-rotate-viewport').click();
    await page.waitForTimeout(500);

    const back = await frame.boundingBox();
    expect(back.width, 'double rotation restores the width').toBeCloseTo(portrait.width, 0);
    expect(back.height, 'double rotation restores the height').toBeCloseTo(portrait.height, 0);

    // the telemetry reports both axes, not width alone
    await expect(page.locator('#controlled-frame-dim')).toContainText('393px');
    await expect(page.locator('#controlled-frame-dim')).toContainText('852px');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INV-RVP-02 — Stage Containment & Non-Collapse
  // ──────────────────────────────────────────────────────────────────────────
  test('RVP-T02: an oversized landscape device is contained by the stage', async ({ page }) => {
    const frame = page.locator(FRAME);
    const stage = page.locator(STAGE);

    // 1920x1080 exceeds the stage, so auto-fit must bound it
    await page.locator('#btn-orient-horizontal').click();
    await page.locator('#btn-size-desktop').click();
    await page.waitForTimeout(600);

    const frameBox = await frame.boundingBox();
    const stageBox = await stage.boundingBox();

    expect(frameBox.x).toBeGreaterThanOrEqual(stageBox.x - 1);
    expect(frameBox.y).toBeGreaterThanOrEqual(stageBox.y - 1);
    expect(frameBox.x + frameBox.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);
    expect(frameBox.y + frameBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);

    // contained, and not collapsed
    expect(frameBox.width).toBeGreaterThan(100);
    expect(frameBox.height).toBeGreaterThan(100);

    // the layout box — not only the paint — is bounded: the wrapper is the
    // scaled size, so the stage has nothing to scroll
    const overflow = await page.evaluate(() => {
      const s = document.querySelector('#lab-stage-container');
      return { x: s.scrollWidth - s.clientWidth, y: s.scrollHeight - s.clientHeight };
    });
    expect(overflow.x).toBeLessThanOrEqual(1);
    expect(overflow.y).toBeLessThanOrEqual(1);

    // …and the *page* must not scroll either. If it does, the stage has inflated
    // to fit the device, the scale is computed against a stage that already
    // contains it, and the frame is cut off by the window while this test still
    // reports containment. RVP-04's DoD requires "no scrollbars".
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(pageOverflow, 'the workbench must not scroll').toBeLessThanOrEqual(1);
  });

  test('RVP-T02c: containment holds in a small window, where the stage could inflate', async ({ page }) => {
    // The regression this covers: with `body { min-height: 100vh }` the stage's
    // content pushed the body past the viewport (904px of document in a 700px
    // window). The stage then reported 749px of available height, the scale
    // resolved to 60% instead of 44%, and the 1180px-tall device was clipped by
    // the window — the containment assertion passed while the user saw a frame
    // that did not fit. A short window is what exposes it.
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/responsive-lab.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    await page.locator('#btn-orient-vertical').click();
    await page.locator('#btn-size-tablet').click();   // 820 x 1180 portrait
    await page.waitForTimeout(700);

    const m = await page.evaluate(() => {
      const stage = document.querySelector('#lab-stage-container');
      const frame = document.querySelector('#controlled-panel-frame');
      const host = stage.getBoundingClientRect();
      const fb = frame.getBoundingClientRect();
      return {
        docOverflow: document.documentElement.scrollHeight - window.innerHeight,
        frameVisible: Math.min(fb.bottom, host.bottom) - Math.max(fb.top, host.top),
        frameHeight: fb.height,
        scale: Number(frame.style.getPropertyValue('--frame-scale-factor')),
        aspect: fb.width / fb.height,
      };
    });

    expect(m.docOverflow, 'the page does not scroll').toBeLessThanOrEqual(1);
    expect(m.frameVisible, 'the whole frame height is visible').toBeGreaterThanOrEqual(m.frameHeight - 1);
    expect(m.scale, 'the device is scaled down, not left at 100%').toBeLessThan(1);
    expect(m.aspect, 'the rendered frame keeps the device aspect').toBeCloseTo(820 / 1180, 2);
  });

  test('RVP-T02b: a device that fits is never upscaled by the margin', async ({ page }) => {
    // INV-RVP-02: s = min(1, ...). The 5% margin lives inside the scaled branch
    // only, so a fitting device must render at exactly 1:1.
    await page.locator('#btn-orient-vertical').click();
    await page.locator('#btn-size-mobile').click();
    await page.waitForTimeout(500);

    const scale = await page.evaluate(() =>
      document.querySelector('#controlled-panel-frame').style.getPropertyValue('--frame-scale-factor'));
    expect(Number(scale || 1)).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INV-RVP-03 & INV-RVP-04 — Device CRUD, Persistence, Graceful Fallback
  // ──────────────────────────────────────────────────────────────────────────
  test('RVP-T03: a custom device adds, persists across reload, applies, and deletes', async ({ page }) => {
    await page.locator('#btn-open-device-manager').click();
    await expect(page.locator('#device-manager-modal')).toBeVisible();

    await page.fill('#input-device-name', 'Playwright Ultra');
    await page.selectOption('#select-device-category', 'phone');
    await page.fill('#input-device-width', '420');
    await page.fill('#input-device-height', '900');
    await page.click('#btn-save-device');
    await page.locator('#btn-close-modal').click();

    // the chip appears without a reload
    const chip = page.locator('.size-preset-btn').filter({ hasText: 'Playwright Ultra' });
    await expect(chip).toBeVisible();

    // and applies its dimensions
    await page.locator('#btn-orient-vertical').click();
    await chip.click();
    await page.waitForTimeout(500);
    const box = await page.locator(FRAME).boundingBox();
    expect(box.width).toBeCloseTo(420, 0);

    // persists across a reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await expect(page.locator('.size-preset-btn').filter({ hasText: 'Playwright Ultra' })).toBeVisible();

    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), STORAGE_KEY);
    expect(stored.some((d) => d.name === 'Playwright Ultra')).toBe(true);

    // deletes cleanly (the confirm prompt must be accepted)
    page.once('dialog', (d) => d.accept());
    await page.locator('#btn-open-device-manager').click();
    await page.locator('button[data-delete-device="playwright-ultra"]').click();
    await page.locator('#btn-close-modal').click();

    await expect(page.locator('.size-preset-btn').filter({ hasText: 'Playwright Ultra' })).toHaveCount(0);
    const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), STORAGE_KEY);
    expect(after.some((d) => d.name === 'Playwright Ultra')).toBe(false);
  });

  test('RVP-T03b: built-in devices are protected from deletion', async ({ page }) => {
    await page.locator('#btn-open-device-manager').click();
    // every factory row offers a lock, none offers a delete
    await expect(page.locator('.dm-lock').first()).toBeVisible();
    const builtinDelete = page.locator('button[data-delete-device="iphone-16-pro"]');
    await expect(builtinDelete).toHaveCount(0);
  });

  test('RVP-T03c: corrupted storage degrades to the factory set', async ({ page }) => {
    // INV-RVP-04: unusable storage must not surface a runtime error.
    // Only registry-path errors count here: the lab embeds app.html in its test
    // iframe, and that page has two pre-existing module errors unrelated to
    // storage ("Unexpected identifier 'ENABLE_PWA_SYSTEM'" and a missing
    // 'clm-kernel' export). Asserting on every pageerror would make this test
    // fail for a defect it does not govern.
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message)));
    await page.evaluate((k) => localStorage.setItem(k, '{not json'), STORAGE_KEY);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    await expect(page.locator('#btn-size-mobile')).toBeVisible();
    await expect(page.locator('#btn-size-desktop')).toBeVisible();

    const registryErrors = errors.filter((m) => /registry|localStorage|JSON/i.test(m));
    expect(registryErrors, 'no registry error reaches the page').toHaveLength(0);

    // and the factory set is genuinely intact, not merely rendered
    const stored = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(stored === null || JSON.parse(stored).some((d) => d.id === 'iphone-16-pro')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INV-RVP-03 — Schema rejection at the boundary
  // ──────────────────────────────────────────────────────────────────────────
  test('RVP-T04: invalid device payloads are rejected and reach no storage', async ({ page }) => {
    await page.locator('#btn-open-device-manager').click();

    // `type="number"` makes non-numeric entry unreachable through the UI, so the
    // three reachable invalid cases are driven through the form and the
    // non-numeric payload is driven straight at the registry boundary below.
    const cases = [
      { name: '', width: '420', height: '900', why: 'empty name' },
      { name: 'Too Small', width: '10', height: '900', why: 'below the 100 floor' },
      { name: 'Too Big', width: '420', height: '99999', why: 'above the 7680 ceiling' },
    ];

    for (const c of cases) {
      await page.fill('#input-device-name', c.name);
      await page.fill('#input-device-width', c.width);
      await page.fill('#input-device-height', c.height);
      await page.click('#btn-save-device');
      await page.waitForTimeout(120);

      // the modal stays open and an explanation is shown
      await expect(page.locator('#device-manager-modal'), `${c.why}: modal stays open`).toBeVisible();
      await expect(page.locator('#device-form-error'), `${c.why}: an error is reported`).not.toBeEmpty();

      if (c.name) {
        await expect(
          page.locator('.size-preset-btn').filter({ hasText: c.name }),
          `${c.why}: no chip is created`,
        ).toHaveCount(0);
      }
    }

    // the registry rejects a non-numeric payload that the UI cannot produce
    const rejected = await page.evaluate(() => {
      try {
        window.__device_registry.add({ name: 'Not A Number', category: 'phone', width: 'abc', height: 900 });
        return null;
      } catch (e) {
        return e.message;
      }
    });
    expect(rejected, 'a non-numeric dimension is refused by the store').toContain('width');

    // nothing invalid reached storage
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), STORAGE_KEY);
    for (const c of [...cases, { name: 'Not A Number' }]) {
      expect(stored.some((d) => d.name === c.name), `${c.name}: not persisted`).toBe(false);
    }
    // and the factory set is intact
    expect(stored.some((d) => d.id === 'iphone-16-pro')).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // INV-RVP-06 — the new UI paints from the token layer only
  // ──────────────────────────────────────────────────────────────────────────
  test('RVP-T05: the manager UI resolves its colours from tokens', async ({ page }) => {
    await page.locator('#btn-open-device-manager').click();
    await expect(page.locator('#device-manager-modal')).toBeVisible();

    const painted = await page.evaluate(() => {
      const modal = document.querySelector('.device-manager-modal');
      const row = document.querySelector('.dm-row');
      const s = getComputedStyle(modal);
      return {
        bg: s.backgroundColor,
        color: s.color,
        rowBg: getComputedStyle(row).backgroundColor,
        // a token-resolved colour is never the transparent/initial default
        transparent: s.backgroundColor === 'rgba(0, 0, 0, 0)',
      };
    });

    expect(painted.transparent, 'the modal resolves a token background').toBe(false);
    expect(painted.bg).not.toBe(painted.rowBg);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // The tested page must remain reachable inside the device viewport
  // ──────────────────────────────────────────────────────────────────────────
  test('RVP-T06: a tested page taller than the device viewport can be scrolled to', async ({ page }) => {
    // The reported defect: index.html pinned its own body to `height: 100vh;
    // overflow: hidden`, so content taller than the emulated device was
    // unreachable — the lab faithfully showed a page that hid its own content.
    // A responsive lab is useless if the page under test cannot be inspected.
    await page.selectOption('#public-site-selector', 'index.html');
    await page.locator('#btn-load-in-iframe').click();
    await page.waitForTimeout(1200);
    await page.locator('#btn-orient-vertical').click();
    await page.fill('#controlled-width-input', '832');
    await page.fill('#controlled-height-input', '1133');
    await page.locator('#btn-apply-custom-dim').click();
    await page.waitForTimeout(1500);

    const m = await page.evaluate(() => {
      const doc = document.querySelector('#mission-control-iframe').contentDocument;
      return {
        contentH: doc.documentElement.scrollHeight,
        viewH: doc.documentElement.clientHeight,
        bodyOverflowY: getComputedStyle(doc.body).overflowY,
      };
    });

    expect(m.contentH, 'the portal is taller than the device viewport').toBeGreaterThan(m.viewH);
    expect(m.bodyOverflowY, 'the page does not hide its own overflow').not.toBe('hidden');

    // and it actually scrolls
    const after = await page.evaluate(() => {
      const doc = document.querySelector('#mission-control-iframe').contentDocument;
      doc.documentElement.scrollTop = 400;
      return doc.documentElement.scrollTop;
    });
    expect(after, 'the tested page scrolls inside the device viewport').toBeGreaterThan(0);
  });
});
