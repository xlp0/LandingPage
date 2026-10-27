import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  SPA_FIXTURE_PATH,
  parseSavedRunBadge
} from '../fixtures/app-fixtures.js';
import { ensureTargetReachable } from '../fixtures/target-preflight.js';
import { test, expect } from '../fixtures/net-trace.js';
import { targetSlug } from '../../js/harness/test-run-schema.js';

const REPO_ROOT = process.cwd();

function collectFiles(dirPath, predicate) {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

const LIFECYCLE_TRACKER_INIT_SCRIPT = () => {
  const targetMaps = new WeakMap();

  function normalizeCapture(options) {
    if (typeof options === 'boolean') return options;
    if (options && typeof options === 'object') return Boolean(options.capture);
    return false;
  }

  function isOnce(options) {
    return Boolean(options && typeof options === 'object' && options.once);
  }

  function getSignal(options) {
    return options && typeof options === 'object' ? options.signal || null : null;
  }

  function getBucket(target, key, create) {
    let byKey = targetMaps.get(target);
    if (!byKey && create) {
      byKey = new Map();
      targetMaps.set(target, byKey);
    }
    if (!byKey) return null;
    let map = byKey.get(key);
    if (!map && create) {
      map = new Map();
      byKey.set(key, map);
    }
    return map || null;
  }

  const origAdd = EventTarget.prototype.addEventListener;
  const origRemove = EventTarget.prototype.removeEventListener;

  EventTarget.prototype.addEventListener = function patchedAdd(type, listener, options) {
    if (!listener || (typeof listener !== 'function' && typeof listener.handleEvent !== 'function')) {
      return origAdd.call(this, type, listener, options);
    }
    const signal = getSignal(options);
    if (signal?.aborted) {
      return undefined;
    }
    const key = `${String(type)}:${normalizeCapture(options) ? '1' : '0'}`;
    const bucket = getBucket(this, key, true);
    if (bucket.has(listener)) {
      return undefined;
    }
    const once = isOnce(options);
    const self = this;
    const wrapped = function wrappedListener(...args) {
      if (once) {
        bucket.delete(listener);
      }
      if (typeof listener === 'function') {
        return listener.apply(this, args);
      }
      return listener.handleEvent(args[0]);
    };
    bucket.set(listener, wrapped);
    if (signal) {
      origAdd.call(signal, 'abort', () => {
        bucket.delete(listener);
      }, { once: true });
    }
    return origAdd.call(this, type, wrapped, options);
  };

  EventTarget.prototype.removeEventListener = function patchedRemove(type, listener, options) {
    if (!listener) {
      return origRemove.call(this, type, listener, options);
    }
    const key = `${String(type)}:${normalizeCapture(options) ? '1' : '0'}`;
    const bucket = getBucket(this, key, false);
    const wrapped = bucket ? bucket.get(listener) : null;
    if (wrapped) {
      bucket.delete(listener);
      return origRemove.call(this, type, wrapped, options);
    }
    return origRemove.call(this, type, listener, options);
  };

  function countTargetListeners(target) {
    if (!target) return 0;
    const byKey = targetMaps.get(target);
    if (!byKey) return 0;
    let total = 0;
    for (const bucket of byKey.values()) {
      total += bucket.size;
    }
    return total;
  }

  const resizeObserverSets = new Set();
  const OrigResizeObserver = window.ResizeObserver;
  if (OrigResizeObserver) {
    window.ResizeObserver = class PatchedResizeObserver extends OrigResizeObserver {
      constructor(callback) {
        super(callback);
        this.__targets = new Set();
        resizeObserverSets.add(this.__targets);
      }
      observe(target, options) {
        this.__targets.add(target);
        return super.observe(target, options);
      }
      unobserve(target) {
        this.__targets.delete(target);
        return super.unobserve(target);
      }
      disconnect() {
        this.__targets.clear();
        return super.disconnect();
      }
    };
  }

  const activeIntervals = new Set();
  const origSetInterval = window.setInterval.bind(window);
  const origClearInterval = window.clearInterval.bind(window);
  window.setInterval = function patchedSetInterval(fn, delay, ...args) {
    const id = origSetInterval(fn, delay, ...args);
    activeIntervals.add(id);
    return id;
  };
  window.clearInterval = function patchedClearInterval(id) {
    activeIntervals.delete(id);
    return origClearInterval(id);
  };

  const activeTimeouts = new Set();
  const origSetTimeout = window.setTimeout.bind(window);
  const origClearTimeout = window.clearTimeout.bind(window);
  window.setTimeout = function patchedSetTimeout(fn, delay, ...args) {
    let id = null;
    const wrapped = (...cbArgs) => {
      if (id !== null) activeTimeouts.delete(id);
      if (typeof fn === 'function') return fn(...cbArgs);
      return undefined;
    };
    id = origSetTimeout(wrapped, delay, ...args);
    activeTimeouts.add(id);
    return id;
  };
  window.clearTimeout = function patchedClearTimeout(id) {
    activeTimeouts.delete(id);
    return origClearTimeout(id);
  };

  window.__gqcLifecycleStats = () => {
    const persistentIds = [
      'btn-arrange-horizontal',
      'btn-arrange-vertical',
      'mission-control-popout-btn',
      'device-manager-modal',
      'btn-close-modal',
      'btn-close-modal-footer',
      'btn-reset-devices',
      'device-form',
      'conformance-disclosure',
      'mcard-result-disclosure'
    ];
    let persistentListeners = 0;
    for (const id of persistentIds) {
      persistentListeners += countTargetListeners(document.getElementById(id));
    }
    let resizeTargets = 0;
    for (const s of resizeObserverSets) {
      resizeTargets += s.size;
    }
    return {
      windowListeners: countTargetListeners(window),
      documentListeners: countTargetListeners(document),
      persistentListeners,
      resizeTargets,
      activeIntervals: activeIntervals.size,
      activeTimeouts: activeTimeouts.size
    };
  };
};

test.describe('SPRINT-GQC-02B.2: Responsive Lab Preact Islands', () => {
  test('Static & bundle boundary: workbench-net.yaml declares astro-islands and zero island or client bundle imports clm-kernel', async ({
    isolatedLabPage,
    workbench
  }) => {
    const netDoc = yaml.load(fs.readFileSync(path.join(REPO_ROOT, 'src/net/workbench-net.yaml'), 'utf8'));
    expect(netDoc?.bindings?.places?.p_page_responsive_lab?.migrationState).toBe('astro-islands');

    const islandFiles = collectFiles(path.join(REPO_ROOT, 'src/islands'), (f) => /\.(jsx|js|mjs|ts|tsx)$/.test(f));
    expect(islandFiles.length).toBe(7);
    for (const file of islandFiles) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src, `${path.basename(file)} must not reference clm-kernel`).not.toContain('clm-kernel');
    }

    const harnessFiles = collectFiles(path.join(REPO_ROOT, 'js/harness'), (f) => /\.(js|mjs)$/.test(f));
    for (const file of harnessFiles) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src, `${path.basename(file)} must not import clm-kernel`).not.toContain('clm-kernel');
    }

    const clientBundles = collectFiles(path.join(REPO_ROOT, 'dist/client/_astro'), (f) => f.endsWith('.js'));
    expect(clientBundles.length).toBeGreaterThanOrEqual(7);
    for (const bundle of clientBundles) {
      const code = fs.readFileSync(bundle, 'utf8');
      expect(code, `${path.basename(bundle)} must not bundle clm-kernel`).not.toContain('clm-kernel');
    }

    const { page } = isolatedLabPage;
    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const islandCount = await page.locator('astro-island').count();
    expect(islandCount).toBe(7);

    const staticOutsideIslands = await page.evaluate(() => {
      const header = document.querySelector('header.lab-navbar');
      const modal = document.getElementById('device-manager-modal');
      const footer = document.querySelector('footer.lab-footer');
      const backHome = document.getElementById('btn-back-home');
      const missionControl = document.getElementById('btn-nav-mission-control');
      return {
        headerOutside: Boolean(header && !header.closest('astro-island')),
        modalOutside: Boolean(modal && !modal.closest('astro-island')),
        footerOutside: Boolean(footer && !footer.closest('astro-island')),
        backHref: backHome?.getAttribute('href'),
        mcHref: missionControl?.getAttribute('href')
      };
    });
    expect(staticOutsideIslands).toEqual({
      headerOutside: true,
      modalOutside: true,
      footerOutside: true,
      backHref: '/',
      mcHref: 'app.html'
    });
  });

  test('Region 1 (TargetToolbar): omnibar loads target URL, syncs query param, clears input, and updates status pill', async ({
    isolatedLabPage,
    workbench,
    request
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });
    expect(await ensureTargetReachable(request, SPA_FIXTURE_PATH)).toBe(true);

    await workbench.open();
    await expect(page.locator('#pane-url-bar')).toBeVisible();
    await expect(page.locator('#public-site-selector')).toBeVisible();
    await expect(page.locator('#target-quick-chips')).toBeVisible();
    await expect(page.locator('#cors-status-pill')).toContainText(/Controlled Viewport Active/i);

    const urlInput = page.locator('#target-url-input');
    const clearBtn = page.locator('#btn-clear-target-url');
    await urlInput.fill(SPA_FIXTURE_PATH);
    await expect(clearBtn).toBeVisible();
    await page.locator('#btn-load-in-iframe').click();

    const frame = workbench.targetFrame();
    await expect(frame.getByRole('heading', { name: 'Citizen Service Overview' })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('target')).toBe(SPA_FIXTURE_PATH);

    await clearBtn.click();
    await expect(urlInput).toHaveValue('');
    await expect(clearBtn).toBeHidden();
  });

  test('Region 2 (DevicePresets): preset chips, rotation, custom geometry, and device manager modal preserve geometry invariants', async ({
    isolatedLabPage,
    workbench,
    request
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });
    expect(await ensureTargetReachable(request, SPA_FIXTURE_PATH)).toBe(true);

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    await expect(page.locator('#controlled-size-controller')).toBeVisible();
    await expect(page.locator('#device-presets-container')).toBeVisible();
    await expect(page.locator('#btn-size-mobile')).toBeVisible();
    await expect(page.locator('#btn-size-full')).toBeVisible();

    const phone = await workbench.selectBuiltinDevice('iphone-16-pro');
    const beforeRotate = await workbench.readStageDimensions();
    expect([phone.width, phone.height]).toContain(beforeRotate.width);

    const afterRotate = await workbench.rotateViewport();
    expect(afterRotate.width).toBe(beforeRotate.height);
    expect(afterRotate.height).toBe(beforeRotate.width);

    await page.locator('#controlled-width-input').fill('640');
    await page.locator('#controlled-height-input').fill('480');
    await page.locator('#btn-apply-custom-dim').click();
    expect(await workbench.readStageDimensions()).toEqual({ width: 640, height: 480 });

    await page.locator('#btn-open-device-manager').click();
    const modal = page.locator('#device-manager-modal');
    await expect(modal).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(modal).not.toHaveClass(/open/);
  });

  test('Region 3 (ViewportStage): removes lab-booting, exposes window.__lab, scales large viewports, and shows blocked-target alert', async ({
    isolatedLabPage,
    workbench
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1280, height: 720 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
    await expect(page.locator('#viewport-scale-wrapper')).toBeVisible();
    await expect(page.locator('#controlled-panel-frame')).toBeVisible();

    const labVersion = await page.evaluate(() => window.__lab?.version);
    expect(labVersion).toBe(1);

    await page.evaluate(() => window.__lab.geometry.set(1920, 1080));
    const autoScale = await page.evaluate(() => window.__lab.geometry.get().scale);
    expect(autoScale).toBeLessThan(1);

    await page.locator('#btn-scale-toggle').click();
    await expect(page.locator('#btn-scale-toggle')).toContainText('100%');
    const actualScale = await page.evaluate(() => window.__lab.geometry.get().scale);
    expect(actualScale).toBe(1);

    const blockedValue = await page.evaluate(() => {
      const sel = document.getElementById('public-site-selector');
      if (!sel) return null;
      const opt = [...sel.options].find((o) => o.getAttribute('data-status') === 'blocked');
      return opt ? opt.value : null;
    });
    if (blockedValue) {
      await workbench.selectPresetTarget(blockedValue);
      await expect(page.locator('#cors-block-alert')).toBeVisible();
    }
  });

  test('Region 4 (RecordingRibbon): start, pause, resume, and stop update live state and event counters', async ({
    isolatedLabPage,
    workbench
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    await expect(page.locator('#lab-recording-ribbon')).toBeVisible();
    await expect(page.locator('#rec-source-pill')).toContainText('Source: same-origin');
    await expect(page.locator('#rec-fidelity-badge')).toContainText('T0');

    const frame = workbench.targetFrame();
    await expect(frame.getByRole('heading', { name: 'Citizen Service Overview' })).toBeVisible();

    await page.locator('#btn-rec-start').click();
    await expect(page.locator('#btn-rec-pause')).toBeVisible();
    await expect(page.locator('#btn-rec-stop')).toBeVisible();

    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    await page.locator('#btn-rec-pause').click();
    await expect(page.locator('#btn-rec-resume')).toBeVisible();

    await page.locator('#btn-rec-resume').click();
    await expect(page.locator('#btn-rec-pause')).toBeVisible();
    await expect(page.locator('#rec-event-count')).not.toHaveText('0 ev');

    const saveResp = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
    );
    await page.locator('#btn-rec-stop').click();
    expect((await saveResp).status()).toBe(201);
  });

  test('Region 5 (ConformancePanel): renders Standby before device selection and Passed report summary for certified device', async ({
    isolatedLabPage,
    workbench,
    request
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    await expect(page.locator('#conformance-panel-group')).toBeVisible();
    await expect(page.locator('#conformance-status-badge')).toHaveText('Standby');

    const resolvedTargetUrl = await page.evaluate(() => window.__lab.target.get().url);
    const reportPayload = {
      schema: 'urn:mcard:schema:device_conformance_report:v1',
      specHash: 'blake3:gqc02b2spec',
      target: { url: resolvedTargetUrl, slug: targetSlug(resolvedTargetUrl) },
      device: { id: 'iphone-16-pro', orientation: 'portrait' },
      fidelity: { tier: 1, runner: 'playwright', emulated: ['viewport'], notEmulated: [] },
      summary: { pass: 2, fail: 0, skipped: 0, notApplicable: 0 },
      results: [
        { id: 'no-horizontal-overflow', status: 'pass' },
        { id: 'no-console-errors', status: 'pass' }
      ]
    };
    const postRes = await request.post('/api/test-runs', { data: reportPayload });
    expect(postRes.status()).toBe(201);

    await page.locator('#btn-orient-vertical').click();
    await workbench.selectBuiltinDevice('iphone-16-pro');
    const dims = await workbench.readStageDimensions();
    if (dims.width > dims.height) {
      await workbench.rotateViewport();
    }

    const disclosure = page.locator('#conformance-disclosure');
    await disclosure.locator('summary').click();

    await expect(page.locator('#conformance-status-badge')).toHaveText('Passed');
    await expect(page.locator('#conformance-details')).toContainText('no-horizontal-overflow');
  });

  test('Region 6 (MCardResult): displays persisted MCard handle and content hash after stopping a recorded run', async ({
    isolatedLabPage,
    workbench
  }) => {
    const { page } = isolatedLabPage;
    await page.setViewportSize({ width: 1440, height: 960 });

    await workbench.open({ targetPath: SPA_FIXTURE_PATH });
    const frame = workbench.targetFrame();
    await expect(frame.getByRole('heading', { name: 'Citizen Service Overview' })).toBeVisible();

    await workbench.selectBuiltinDevice('iphone-16-pro');
    await workbench.startRecording();
    await frame.getByRole('button', { name: 'Open Service Details' }).click();
    const saved = await workbench.stopAndSaveRecording();

    expect(saved.status).toBe(201);
    const parsedBadge = parseSavedRunBadge(saved.badgeText);
    expect(parsedBadge).not.toBeNull();
    expect(saved.data.hash.startsWith(parsedBadge.hashPrefix)).toBe(true);

    const persisted = await workbench.fetchPersistedRun(saved.data.hash);
    expect(persisted.ok).toBe(true);

    await page.locator('#rec-saved-label').click();
    await expect.poll(() => page.locator('#mcard-result-disclosure').evaluate((el) => el.open)).toBe(true);
    await expect(page.locator('#mcard-result-handle')).toHaveText(saved.data.handle);
    await expect(page.locator('#mcard-result-hash')).toHaveText(saved.data.hash);
  });

  test('GQC-02B-E2E-05: cold load downloads only client:load and client:only island bundles before interaction and defers client:visible bundles', async ({
    browser
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    const downloadedScripts = [];

    page.on('response', async (res) => {
      const url = res.url();
      if (!url.includes('/_astro/') || !url.endsWith('.js')) return;
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch {}
      downloadedScripts.push({
        url,
        status: res.status(),
        bytes: Buffer.byteLength(bodyText, 'utf8'),
        hasClmKernel: bodyText.includes('clm-kernel')
      });
    });

    await page.goto(`/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`);
    await page.waitForSelector('body:not(.lab-booting)', { timeout: 10000 });
    await page.waitForTimeout(250);

    const coldNames = downloadedScripts.map((entry) => new URL(entry.url).pathname);
    expect(coldNames.some((n) => n.includes('TargetToolbarIsland'))).toBe(true);
    expect(coldNames.some((n) => n.includes('DevicePresetsIsland'))).toBe(true);
    expect(coldNames.some((n) => n.includes('RecordingRibbonIsland'))).toBe(true);
    expect(coldNames.some((n) => n.includes('ViewportStageIsland'))).toBe(true);
    expect(coldNames.some((n) => n.includes('SpaTestWorkflow'))).toBe(true);
    expect(coldNames.some((n) => n.includes('ConformancePanelIsland'))).toBe(false);
    expect(coldNames.some((n) => n.includes('MCardResultIsland'))).toBe(false);
    expect(downloadedScripts.every((entry) => entry.status === 200 && !entry.hasClmKernel)).toBe(true);

    const deferredHydratedBefore = await page.evaluate(() => ({
      conformanceHydrated: !document.querySelector('#conformance-disclosure astro-island')?.hasAttribute('ssr'),
      mcardHydrated: !document.querySelector('#mcard-result-disclosure astro-island')?.hasAttribute('ssr')
    }));
    expect(deferredHydratedBefore).toEqual({
      conformanceHydrated: false,
      mcardHydrated: false
    });

    await page.locator('#conformance-disclosure summary').click();
    await page.locator('#mcard-result-disclosure summary').click();

    await expect.poll(() =>
      page.evaluate(() => ({
        conformanceHydrated: !document.querySelector('#conformance-disclosure astro-island')?.hasAttribute('ssr'),
        mcardHydrated: !document.querySelector('#mcard-result-disclosure astro-island')?.hasAttribute('ssr')
      }))
    ).toEqual({
      conformanceHydrated: true,
      mcardHydrated: true
    });

    const afterNames = downloadedScripts.map((entry) => new URL(entry.url).pathname);
    expect(afterNames.some((n) => n.includes('ConformancePanelIsland'))).toBe(true);
    expect(afterNames.some((n) => n.includes('MCardResultIsland'))).toBe(true);

    await context.close();
  });

  test('GQC-02B-E2E-04: mounting and unmounting all 7 islands 50 times across target and page changes returns listener, observer, and timer counts to baseline', async ({
    browser
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await context.addInitScript(LIFECYCLE_TRACKER_INIT_SCRIPT);
    const page = await context.newPage();

    await page.goto(`/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`);
    await page.waitForSelector('body:not(.lab-booting)', { timeout: 10000 });
    await page.locator('#conformance-disclosure summary').click();
    await page.locator('#mcard-result-disclosure summary').click();

    await expect.poll(() =>
      page.evaluate(() => {
        const islands = [...document.querySelectorAll('astro-island')];
        const allHydrated = islands.length === 7 && islands.every((el) => !el.hasAttribute('ssr'));
        const toolbarReady = document.getElementById('pane-url-bar')?.getAttribute('data-toolbar-ready') === 'true';
        return allHydrated && toolbarReady;
      })
    ).toBe(true);
    await page.waitForTimeout(100);

    const baseline = await page.evaluate(() => window.__gqcLifecycleStats());
    expect(baseline.resizeTargets).toBe(1);
    expect(baseline.activeIntervals).toBe(0);

    const cycleReport = await page.evaluate(async (spaPath) => {
      const waitToolbarReady = async () => {
        for (let attempt = 0; attempt < 100; attempt++) {
          if (document.getElementById('pane-url-bar')?.getAttribute('data-toolbar-ready') === 'true') {
            return;
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      };

      let unmountedMidCheck = null;
      for (let i = 0; i < 50; i++) {
        if (i === 15) {
          window.__lab?.target?.set('http://127.0.0.1:5320/');
        } else if (i === 30) {
          window.__lab?.target?.set(spaPath);
        }

        const islands = [...document.querySelectorAll('astro-island')];
        for (const el of islands) {
          el.dispatchEvent(new CustomEvent('astro:unmount'));
        }

        if (i === 25) {
          await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
          unmountedMidCheck = window.__gqcLifecycleStats();
        }

        for (const el of islands) {
          el.setAttribute('ssr', '');
          el.setAttribute('client', 'only');
          await el.hydrate();
        }
        await waitToolbarReady();
      }

      return {
        unmountedMidCheck,
        afterCycles: window.__gqcLifecycleStats()
      };
    }, SPA_FIXTURE_PATH);

    expect(cycleReport.unmountedMidCheck.resizeTargets).toBe(0);
    expect(cycleReport.unmountedMidCheck.activeIntervals).toBe(0);
    expect(cycleReport.afterCycles.windowListeners).toBe(baseline.windowListeners);
    expect(cycleReport.afterCycles.documentListeners).toBe(baseline.documentListeners);
    expect(cycleReport.afterCycles.persistentListeners).toBe(baseline.persistentListeners);
    expect(cycleReport.afterCycles.resizeTargets).toBe(baseline.resizeTargets);
    expect(cycleReport.afterCycles.activeIntervals).toBe(0);
    expect(cycleReport.afterCycles.activeTimeouts).toBe(0);

    await page.goto('/index.html?noredirect=1');
    await page.waitForLoadState('domcontentloaded');
    await page.goto(`/responsive-lab.html?target=${encodeURIComponent(SPA_FIXTURE_PATH)}`);
    await page.waitForSelector('body:not(.lab-booting)', { timeout: 10000 });
    await page.locator('#conformance-disclosure summary').click();
    await page.locator('#mcard-result-disclosure summary').click();

    await expect.poll(() =>
      page.evaluate(() => {
        const islands = [...document.querySelectorAll('astro-island')];
        const allHydrated = islands.length === 7 && islands.every((el) => !el.hasAttribute('ssr'));
        const toolbarReady = document.getElementById('pane-url-bar')?.getAttribute('data-toolbar-ready') === 'true';
        return allHydrated && toolbarReady;
      })
    ).toBe(true);
    await page.waitForTimeout(100);

    const afterNavigation = await page.evaluate(() => window.__gqcLifecycleStats());
    expect(afterNavigation.windowListeners).toBe(baseline.windowListeners);
    expect(afterNavigation.documentListeners).toBe(baseline.documentListeners);
    expect(afterNavigation.persistentListeners).toBe(baseline.persistentListeners);
    expect(afterNavigation.resizeTargets).toBe(baseline.resizeTargets);
    expect(afterNavigation.activeIntervals).toBe(0);
    expect(afterNavigation.activeTimeouts).toBe(0);

    await context.close();
  });
});
