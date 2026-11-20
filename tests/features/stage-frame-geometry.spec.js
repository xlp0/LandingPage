import { test, expect } from '../fixtures/app-fixtures.js';

const EXPECTED_INSETS = {
  'phone-ios': { x: 20, y: 20 },
  'phone-android': { x: 16, y: 16 },
  tablet: { x: 28, y: 28 },
  'browser-window': { x: 2, y: 40 },
  'hairline-ruler': { x: 2, y: 22 },
  unframed: { x: 0, y: 0 }
};

test.describe('SSG-03 StageShow device frames and stage geometry', () => {
  test('renders 3-slot stage chrome and exact 1:1 inner iframe layout pixels across all 6 frame archetypes', async ({ isolatedLabPage, workbench }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1600, height: 1100 });
    await workbench.open({ targetPath: '/tests/fixtures/spa-test-target.html' });

    // 3-part stage architecture visible cleanly with surviving toolbar + transport controls
    await expect(page.locator('#stage-toolbar')).toBeVisible();
    await expect(page.locator('#stage-well')).toBeVisible();
    await expect(page.locator('#stage-transport')).toBeVisible();
    await expect(page.getByTestId('stage-target-place')).toBeVisible();
    await expect(page.locator('#controlled-frame-dim')).toBeVisible();
    await expect(page.locator('#btn-rotate-viewport')).toBeVisible();
    await expect(page.locator('#btn-scale-toggle')).toBeVisible();
    await expect(page.locator('#btn-safe-area-toggle')).toBeVisible();
    await expect(page.locator('#lab-recording-ribbon')).toBeVisible();

    const cases = [
      { label: 'iPhone 16 Pro portrait', deviceId: 'iphone-16-pro', w: 393, h: 852, frameStyle: 'phone-ios' },
      { label: 'iPhone 16 Pro landscape', rotateAfter: true, w: 852, h: 393, frameStyle: 'phone-ios' },
      { label: 'Large Mobile', deviceId: 'mobile-large', w: 430, h: 932, frameStyle: 'phone-ios' },
      { label: 'Google Pixel 8', deviceId: 'pixel-8', w: 412, h: 915, frameStyle: 'phone-android' },
      { label: 'Samsung Galaxy S24', deviceId: 'galaxy-s24', w: 360, h: 780, frameStyle: 'phone-android' },
      { label: 'iPad Air 11"', deviceId: 'ipad-air-11', w: 820, h: 1180, frameStyle: 'tablet' },
      { label: 'MacBook Air 13"', deviceId: 'macbook-air-13', w: 1280, h: 832, frameStyle: 'browser-window' },
      { label: 'Custom 500x500', custom: [500, 500], w: 500, h: 500, frameStyle: 'hairline-ruler' }
    ];

    for (const c of cases) {
      if (c.deviceId) {
        await workbench.selectBuiltinDevice(c.deviceId);
      } else if (c.rotateAfter) {
        await workbench.rotateStageViewport();
      } else if (c.custom) {
        await page.fill('#controlled-width-input', String(c.custom[0]));
        await page.fill('#controlled-height-input', String(c.custom[1]));
        await page.locator('#btn-apply-custom-dim').click();
      }

      const inset = EXPECTED_INSETS[c.frameStyle];
      const frame = page.getByTestId('viewport-frame');
      const screen = page.getByTestId('viewport-screen');
      await expect(frame, c.label).toHaveAttribute('data-frame-style', c.frameStyle);
      await expect(frame, c.label).toHaveAttribute('data-inner-width', String(c.w));
      await expect(frame, c.label).toHaveAttribute('data-inner-height', String(c.h));
      await expect(screen, c.label).toHaveCSS('border-radius', '0px');

      await expect(async () => {
        const measured = await page.evaluate(() => {
          const f = document.querySelector('[data-testid="viewport-frame"]');
          const s = document.querySelector('[data-testid="viewport-screen"]');
          const iframe = document.getElementById('mission-control-iframe');
          const well = document.getElementById('stage-well');
          const scale = Number(f.style.getPropertyValue('--frame-scale-factor') || f.dataset.outerScale || '1');
          const fb = f.getBoundingClientRect();
          const sb = s.getBoundingClientRect();
          const wb = well.getBoundingClientRect();
          return {
            scale,
            iframeClientW: iframe.clientWidth,
            iframeClientH: iframe.clientHeight,
            winInnerW: iframe.contentWindow?.innerWidth ?? null,
            winInnerH: iframe.contentWindow?.innerHeight ?? null,
            frameUnscaledW: fb.width / scale,
            frameUnscaledH: fb.height / scale,
            screenUnscaledW: sb.width / scale,
            screenUnscaledH: sb.height / scale,
            fitsWellX: fb.right <= wb.right + 1 && fb.left >= wb.left - 1,
            fitsWellY: fb.bottom <= wb.bottom + 1 && fb.top >= wb.top - 1,
            wellScrollX: well.scrollWidth - well.clientWidth,
            wellScrollY: well.scrollHeight - well.clientHeight
          };
        });

        expect(measured.iframeClientW, `${c.label} clientWidth`).toBe(c.w);
        expect(measured.iframeClientH, `${c.label} clientHeight`).toBe(c.h);
        expect(measured.winInnerW, `${c.label} contentWindow.innerWidth`).toBe(c.w);
        expect(measured.winInnerH, `${c.label} contentWindow.innerHeight`).toBe(c.h);
        expect(Math.abs(measured.screenUnscaledW - c.w), `${c.label} screen unscaled width`).toBeLessThanOrEqual(1);
        expect(Math.abs(measured.screenUnscaledH - c.h), `${c.label} screen unscaled height`).toBeLessThanOrEqual(1);
        expect(
          Math.abs(measured.frameUnscaledW - (c.w + inset.x)),
          `${c.label} frame outer width chrome inset`
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(measured.frameUnscaledH - (c.h + inset.y)),
          `${c.label} frame outer height chrome inset`
        ).toBeLessThanOrEqual(1);
        expect(measured.fitsWellX, `${c.label} fits stage-well horizontally`).toBe(true);
        expect(measured.fitsWellY, `${c.label} fits stage-well vertically`).toBe(true);
        expect(measured.wellScrollX, `${c.label} zero horizontal well scroll`).toBeLessThanOrEqual(1);
        expect(measured.wellScrollY, `${c.label} zero vertical well scroll`).toBeLessThanOrEqual(1);
      }).toPass({ timeout: 3000 });
    }

    // Return to Full (100%) unframed mode
    await page.locator('#btn-size-full').click();
    await expect(page.getByTestId('viewport-frame')).toHaveAttribute('data-frame-style', 'unframed');
    await expect(page.getByTestId('viewport-screen')).toHaveCSS('border-radius', '0px');
    await expect(page.getByTestId('stage-target-place')).toBeVisible();
  });

  test('renders pointer-events: none safe-area guides that rotate in landscape and pass clicks through to iframe', async ({ isolatedLabPage, workbench }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 1050 });
    await workbench.open({ targetPath: '/tests/fixtures/spa-test-target.html' });

    const safeBtn = page.getByTestId('btn-safe-area-toggle');
    const overlay = page.getByTestId('stage-safe-area-overlay');
    const frame = page.getByTestId('viewport-frame');

    await expect(safeBtn).toBeDisabled();

    // iPhone 16 Pro portrait safe-area (top=59, bottom=34)
    await workbench.selectBuiltinDevice('iphone-16-pro');
    await expect(safeBtn).toBeEnabled();
    await safeBtn.click();
    await expect(frame).toHaveAttribute('data-safe-area', 'on');
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveCSS('pointer-events', 'none');

    await expect(async () => {
      const hitId = await page.evaluate(() => {
        const band = document.querySelector('#stage-safe-area-overlay .safe-area-top');
        const r = band.getBoundingClientRect();
        if (r.height < 10) return null;
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return el?.id || el?.tagName;
      });
      expect(hitId).toBe('mission-control-iframe');
    }).toPass({ timeout: 3000 });

    // Rotate to landscape -> safe-area shifts to left=59, right=34 and remains click-through
    await workbench.rotateStageViewport();
    await expect(async () => {
      const result = await page.evaluate(() => {
        const leftBand = document.querySelector('#stage-safe-area-overlay .safe-area-left');
        const topBand = document.querySelector('#stage-safe-area-overlay .safe-area-top');
        const lr = leftBand.getBoundingClientRect();
        const tr = topBand.getBoundingClientRect();
        const el = lr.width > 10 ? document.elementFromPoint(lr.left + lr.width / 2, lr.top + lr.height / 2) : null;
        return { leftWidth: lr.width, topHeight: tr.height, hitId: el?.id || null };
      });
      expect(result.leftWidth).toBeGreaterThan(30);
      expect(result.topHeight).toBeLessThan(2);
      expect(result.hitId).toBe('mission-control-iframe');
    }).toPass({ timeout: 3000 });

    // Google Pixel 8 punch-hole safe-area click-through
    await workbench.selectBuiltinDevice('pixel-8');
    await expect(frame).toHaveAttribute('data-frame-style', 'phone-android');
    await expect(frame).toHaveAttribute('data-safe-area', 'on');
    await expect(async () => {
      const hitId = await page.evaluate(() => {
        const band = document.querySelector('#stage-safe-area-overlay .safe-area-top');
        const r = band.getBoundingClientRect();
        if (r.height < 5) return null;
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.id;
      });
      expect(hitId).toBe('mission-control-iframe');
    }).toPass({ timeout: 3000 });
  });

  test('Scale: Actual (1:1) allows 4-corner scroll reachability on oversized Desktop 1080p inside 1280x720', async ({ isolatedLabPage, workbench }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1280, height: 720 });
    await workbench.open({ targetPath: '/tests/fixtures/spa-test-target.html' });

    await workbench.selectBuiltinDevice('desktop-fhd');
    const scaleBtn = page.getByTestId('btn-scale-toggle');
    await expect(scaleBtn).toContainText('Scale: Fit');

    await scaleBtn.click();
    await expect(scaleBtn).toContainText('Scale: Actual (1:1)');
    await expect(scaleBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('viewport-frame')).toHaveAttribute('data-outer-scale', '1');

    await expect(async () => {
      const wellStats = await page.evaluate(() => {
        const well = document.getElementById('stage-well');
        const iframe = document.getElementById('mission-control-iframe');
        const wrapper = document.getElementById('viewport-scale-wrapper');
        const frame = document.getElementById('controlled-panel-frame');
        const ir = iframe.getBoundingClientRect();
        const animCount =
          (wrapper.getAnimations ? wrapper.getAnimations().length : 0) +
          (frame.getAnimations ? frame.getAnimations().length : 0);
        return {
          clientW: iframe.clientWidth,
          clientH: iframe.clientHeight,
          renderedW: ir.width,
          renderedH: ir.height,
          animCount,
          overflowX: well.scrollWidth - well.clientWidth,
          overflowY: well.scrollHeight - well.clientHeight
        };
      });
      expect(wellStats.clientW).toBe(1920);
      expect(wellStats.clientH).toBe(1080);
      expect(Math.abs(wellStats.renderedW - 1920)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(wellStats.renderedH - 1080)).toBeLessThanOrEqual(0.2);
      expect(wellStats.animCount).toBe(0);
      expect(wellStats.overflowX).toBeGreaterThan(200);
      expect(wellStats.overflowY).toBeGreaterThan(200);
    }).toPass({ timeout: 4000 });

    const corners = await page.evaluate(() => {
      const well = document.getElementById('stage-well');
      const iframe = document.getElementById('mission-control-iframe');
      const maxX = well.scrollWidth - well.clientWidth;
      const maxY = well.scrollHeight - well.clientHeight;
      const checkCorner = (x, y) => {
        well.scrollTo({ left: x, top: y, behavior: 'instant' });
        const w = well.getBoundingClientRect();
        const i = iframe.getBoundingClientRect();
        return {
          x,
          y,
          iRect: { left: i.left, top: i.top, right: i.right, bottom: i.bottom },
          wRect: { left: w.left, top: w.top, right: w.right, bottom: w.bottom },
          topLeftVisible: i.left >= w.left - 1 && i.top >= w.top - 1,
          topRightVisible: i.right <= w.right + 1 && i.top >= w.top - 1,
          bottomLeftVisible: i.left >= w.left - 1 && i.bottom <= w.bottom + 1,
          bottomRightVisible: i.right <= w.right + 1 && i.bottom <= w.bottom + 1
        };
      };
      return {
        tl: checkCorner(0, 0),
        tr: checkCorner(maxX, 0),
        bl: checkCorner(0, maxY),
        br: checkCorner(maxX, maxY)
      };
    });

    const dbg = JSON.stringify(corners);
    expect(corners.tl.topLeftVisible, `(0,0) top-left reachable: ${dbg}`).toBe(true);
    expect(corners.tr.topRightVisible, `(1920,0) top-right reachable: ${dbg}`).toBe(true);
    expect(corners.bl.bottomLeftVisible, `(0,1080) bottom-left reachable: ${dbg}`).toBe(true);
    expect(corners.br.bottomRightVisible, `(1920,1080) bottom-right reachable: ${dbg}`).toBe(true);
  });
});
