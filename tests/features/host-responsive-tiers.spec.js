import { test, expect } from '../fixtures/app-fixtures.js';
import { SWEEP_ROUTES } from '../../scripts/stageshow/run.mjs';

const TIER_VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 720 },
  { name: 'tablet-820', width: 820, height: 1180 },
  { name: 'compact-390', width: 390, height: 844 },
  { name: 'compact-358', width: 358, height: 800 }
];

async function collectViewportClipAudit(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const controls = Array.from(
      document.querySelectorAll('button, a[href], input, select, summary, [role="tab"]')
    );
    const clipped = [];
    for (const el of controls) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.left < -1 || r.right > vw + 1) {
        clipped.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          testId: el.dataset?.testid || '',
          left: Math.round(r.left * 10) / 10,
          right: Math.round(r.right * 10) / 10,
          vw
        });
      }
    }
    return {
      vw,
      scrollWidth,
      overflow: scrollWidth > vw + 1,
      clipped
    };
  });
}

async function waitForRouteReady(page, route) {
  await page.waitForLoadState('domcontentloaded');
  if (route === '/responsive-lab.html') {
    await page.waitForFunction(() => document.body?.dataset?.pageState === 'ready', null, { timeout: 15000 });
    await page.waitForSelector('#workbench-mode-tabs', { state: 'visible', timeout: 10000 });
  } else if (route.startsWith('/index.html')) {
    await page.waitForFunction(() => document.body?.dataset?.pageState === 'ready', null, { timeout: 15000 });
    await page.waitForSelector('#penpot-site-nav', { state: 'visible', timeout: 10000 });
  } else if (route === '/app.html') {
    await page.waitForFunction(() => document.body?.dataset?.pageState === 'ready', null, { timeout: 15000 });
  } else {
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(150);
}

async function collectVisibleTestIds(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const visible = [];
    const clipped = [];
    for (const el of document.querySelectorAll('[data-testid]')) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const id = el.dataset.testid;
      visible.push(id);
      if (r.left < -1 || r.right > vw + 1) {
        clipped.push({ id, left: r.left, right: r.right, vw });
      }
    }
    return { visible, clipped };
  });
}

test.describe('SPRINT-SSG-06: Host Responsive Tiers & Compact Architecture', () => {
  test('all 6 sweep routes stay within bidirectional viewport bounds across desktop, tablet, and compact widths', async ({ isolatedLabPage }) => {
    const { page } = isolatedLabPage;

    for (const route of SWEEP_ROUTES) {
      for (const vp of TIER_VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route);
        await waitForRouteReady(page, route);

        const audit = await collectViewportClipAudit(page);
        expect(audit.overflow, `${route} @ ${vp.name} overflow (scrollWidth=${audit.scrollWidth}, vw=${audit.vw})`).toBe(false);
        expect(audit.clipped, `${route} @ ${vp.name} clipped controls`).toEqual([]);
      }
    }
  });

  test('desktop 1280px horizontal dock, tablet 820px auto-vertical with manual override, and compact 358px Stage width + cached scale', async ({ isolatedLabPage }) => {
    const { page } = isolatedLabPage;

    // 1. Desktop 1280x720 defaults to horizontal arrangement with Stage tab hidden
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/responsive-lab.html');
    await waitForRouteReady(page, '/responsive-lab.html');

    const desktopState = await page.evaluate(() => {
      const ws = document.getElementById('lab-workspace-container');
      const dock = document.getElementById('workbench-controls-dock');
      const stageBtn = document.getElementById('btn-mode-stage');
      return {
        hasHorizontal: ws.classList.contains('arrangement-horizontal'),
        tier: ws.dataset.responsiveTier,
        pref: ws.dataset.arrangementPreference,
        effective: ws.dataset.effectiveArrangement,
        dockWidth: Math.round(dock.getBoundingClientRect().width),
        stageTabDisplay: stageBtn ? window.getComputedStyle(stageBtn).display : null,
        arrApi: window.__lab?.arrangement?.get()
      };
    });
    expect(desktopState.hasHorizontal).toBe(true);
    expect(desktopState.tier).toBe('desktop');
    expect(desktopState.pref).toBe('auto');
    expect(desktopState.effective).toBe('horizontal');
    expect(desktopState.dockWidth).toBe(320);
    expect(desktopState.stageTabDisplay).toBe('none');
    expect(desktopState.arrApi).toEqual({ preference: 'auto', effective: 'horizontal', tier: 'desktop' });

    // 2. Tablet 820x1180 auto-switches to vertical arrangement while allowing manual horizontal override
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.waitForTimeout(200);
    const tabletAuto = await page.evaluate(() => {
      const ws = document.getElementById('lab-workspace-container');
      return {
        hasVertical: ws.classList.contains('arrangement-vertical'),
        tier: ws.dataset.responsiveTier,
        pref: ws.dataset.arrangementPreference,
        effective: ws.dataset.effectiveArrangement
      };
    });
    expect(tabletAuto).toEqual({
      hasVertical: true,
      tier: 'tablet',
      pref: 'auto',
      effective: 'vertical'
    });

    await page.locator('#btn-arrange-horizontal').click();
    await page.waitForTimeout(150);
    const tabletOverride = await page.evaluate(() => {
      const ws = document.getElementById('lab-workspace-container');
      return {
        hasHorizontal: ws.classList.contains('arrangement-horizontal'),
        pref: ws.dataset.arrangementPreference,
        effective: ws.dataset.effectiveArrangement
      };
    });
    expect(tabletOverride).toEqual({
      hasHorizontal: true,
      pref: 'horizontal',
      effective: 'horizontal'
    });

    // 3. Compact 358x800 activates unified 5-tab bar on Stage, clamps arrangement, preserves >= 326px stage well, and caches positive scale
    await page.setViewportSize({ width: 358, height: 800 });
    await page.waitForTimeout(250);

    const compactStage = await page.evaluate(() => {
      const ws = document.getElementById('lab-workspace-container');
      const well = document.getElementById('stage-well');
      const stageContainer = document.getElementById('lab-stage-container');
      const transport = document.getElementById('stage-transport');
      const stageTab = document.getElementById('btn-mode-stage');
      return {
        tier: ws.dataset.responsiveTier,
        effective: ws.dataset.effectiveArrangement,
        compactPane: ws.dataset.compactPane,
        stageTabSelected: stageTab?.getAttribute('aria-selected'),
        wellWidth: well ? Math.round(well.getBoundingClientRect().width) : 0,
        stageContainerWidth: stageContainer ? Math.round(stageContainer.getBoundingClientRect().width) : 0,
        transportVisible: transport ? transport.getBoundingClientRect().height > 0 : false,
        scale: window.__lab?.geometry?.get()?.scale ?? 0
      };
    });
    expect(compactStage.tier).toBe('compact');
    expect(compactStage.effective).toBe('vertical');
    expect(compactStage.compactPane).toBe('stage');
    expect(compactStage.stageTabSelected).toBe('true');
    expect(compactStage.wellWidth).toBeGreaterThanOrEqual(326);
    expect(compactStage.stageContainerWidth).toBeGreaterThanOrEqual(326);
    expect(compactStage.transportVisible).toBe(true);
    expect(compactStage.scale).toBeGreaterThan(0);

    // Switch away to Explore and confirm cached containerRect keeps positive scale, then return to Stage
    await page.locator('#btn-mode-explore').click();
    await page.waitForTimeout(200);
    const scaleWhileInExplore = await page.evaluate(() => ({
      compactPane: document.getElementById('lab-workspace-container').dataset.compactPane,
      scale: window.__lab?.geometry?.get()?.scale ?? 0,
      transportVisible: document.getElementById('stage-transport').getBoundingClientRect().height > 0
    }));
    expect(scaleWhileInExplore.compactPane).toBe('explore');
    expect(scaleWhileInExplore.scale).toBeGreaterThan(0);
    expect(scaleWhileInExplore.transportVisible).toBe(true);

    await page.locator('#btn-mode-stage').click();
    await page.waitForTimeout(200);
    const scaleAfterReturn = await page.evaluate(() => ({
      compactPane: document.getElementById('lab-workspace-container').dataset.compactPane,
      scale: window.__lab?.geometry?.get()?.scale ?? 0,
      wellWidth: Math.round(document.getElementById('stage-well').getBoundingClientRect().width)
    }));
    expect(scaleAfterReturn.compactPane).toBe('stage');
    expect(scaleAfterReturn.scale).toBeGreaterThan(0);
    expect(scaleAfterReturn.wellWidth).toBeGreaterThanOrEqual(326);
  });

  test('compact 358px 5-tab cycling exposes every desktop dock/stage control without overflow and uses 1-column device manager', async ({ isolatedLabPage }) => {
    const { page } = isolatedLabPage;

    // Step 1: Collect desktop control testIds across all 4 modes
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/responsive-lab.html');
    await waitForRouteReady(page, '/responsive-lab.html');

    const desktopExcludedOnCompact = new Set(['btn-arrange-horizontal', 'btn-arrange-vertical']);
    const desktopControlSet = new Set();

    for (const modeBtn of ['#btn-mode-explore', '#btn-mode-guided-spa', '#btn-mode-bombadil', '#btn-mode-verify']) {
      await page.locator(modeBtn).click();
      await page.waitForTimeout(150);
      const { visible } = await collectVisibleTestIds(page);
      for (const id of visible) {
        if (!desktopExcludedOnCompact.has(id)) {
          desktopControlSet.add(id);
        }
      }
    }

    // Step 2: Cycle Stage | Explore | Guided | Bombadil | Verify at 358x800
    await page.setViewportSize({ width: 358, height: 800 });
    await page.waitForTimeout(250);

    const compactControlSet = new Set();
    for (const tabSelector of ['#btn-mode-stage', '#btn-mode-explore', '#btn-mode-guided-spa', '#btn-mode-bombadil', '#btn-mode-verify']) {
      await page.locator(tabSelector).click();
      await page.waitForTimeout(200);

      const { visible, clipped } = await collectVisibleTestIds(page);
      expect(clipped, `${tabSelector} @ 358px clipped controls`).toEqual([]);
      for (const id of visible) {
        compactControlSet.add(id);
      }

      const tabAudit = await collectViewportClipAudit(page);
      expect(tabAudit.overflow, `${tabSelector} @ 358px overflow=${tabAudit.scrollWidth}`).toBe(false);
      expect(tabAudit.clipped, `${tabSelector} @ 358px audit clipped`).toEqual([]);

      // Stage transport must stay docked visibly across all 5 compact tabs
      await expect(page.locator('#stage-transport')).toBeVisible();
      await expect(page.locator('#bombadil-transport-pill')).toBeVisible();
    }

    const missingInCompact = [...desktopControlSet].filter((id) => !compactControlSet.has(id));
    expect(missingInCompact, 'desktop controls missing across 5 compact tabs').toEqual([]);
    expect(compactControlSet.has('btn-mode-stage')).toBe(true);

    // Step 3: Verify 1-column device manager modal at 358x800 and unwrapped preset chips
    await page.locator('#btn-mode-explore').click();
    await page.waitForTimeout(150);
    const chipsScrollStyle = await page.locator('.preset-chips-scroll').evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { maxHeight: cs.maxHeight, overflowY: cs.overflowY };
    });
    expect(chipsScrollStyle.maxHeight).toBe('none');
    expect(chipsScrollStyle.overflowY).toBe('visible');

    await page.locator('#btn-open-device-manager').click();
    await expect(page.locator('#device-manager-modal')).toHaveClass(/open/);
    const modalMetrics = await page.evaluate(() => {
      const form = document.getElementById('device-form');
      const cols = window.getComputedStyle(form).gridTemplateColumns.trim().split(/\s+/);
      const modal = document.querySelector('.device-manager-modal').getBoundingClientRect();
      return {
        colCount: cols.length,
        modalLeft: modal.left,
        modalRight: modal.right,
        vw: document.documentElement.clientWidth
      };
    });
    expect(modalMetrics.colCount).toBe(1);
    expect(modalMetrics.modalLeft).toBeGreaterThanOrEqual(-1);
    expect(modalMetrics.modalRight).toBeLessThanOrEqual(modalMetrics.vw + 1);

    await page.locator('#btn-close-modal').click();
    await expect(page.locator('#device-manager-modal')).not.toHaveClass(/open/);
  });

  test('portal Home nav link uses aria-current=page, focuses #main-content, and stays clear of h1 at 358px/390px', async ({ isolatedLabPage }) => {
    const { page } = isolatedLabPage;
    for (const width of [358, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/index.html?noredirect=1');
      await waitForRouteReady(page, '/index.html?noredirect=1');

      const layoutMetrics = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const h1 = document.querySelector('h1');
        const nav = document.getElementById('penpot-site-nav');
        const controls = document.querySelector('.top-controls');
        const h1R = h1.getBoundingClientRect();
        const navR = nav.getBoundingClientRect();
        const ctrlR = controls.getBoundingClientRect();
        return {
          navRight: navR.right,
          ctrlRight: ctrlR.right,
          navBottom: navR.bottom,
          ctrlBottom: ctrlR.bottom,
          h1Top: h1R.top,
          vw
        };
      });
      expect(layoutMetrics.navRight).toBeLessThanOrEqual(layoutMetrics.vw + 1);
      expect(layoutMetrics.ctrlRight).toBeLessThanOrEqual(layoutMetrics.vw + 1);
      expect(layoutMetrics.navBottom).toBeLessThanOrEqual(layoutMetrics.ctrlBottom + 1);
      expect(layoutMetrics.ctrlBottom).toBeLessThanOrEqual(layoutMetrics.h1Top + 1);
    }

    const homeLink = page.locator('#penpot-site-nav a[data-penpot-handle="mcard:route:/index.html"]');
    await expect(homeLink).toHaveAttribute('aria-current', 'page');
    await homeLink.click();
    await expect(page).toHaveURL(/index\.html\?noredirect=1/);
    const focusedId = await page.evaluate(() => document.activeElement?.id || '');
    expect(focusedId).toBe('main-content');
  });
});
