import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';
import { CLM_DASHBOARD_PATH, CLM_DASHBOARD_URL } from './test-config.js';

export { CLM_DASHBOARD_PATH, CLM_DASHBOARD_URL };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export async function stubExternalComponentRequests(page) {
  await page.route(/^https?:\/\//, async (route) => {
    const reqUrl = route.request().url();
    try {
      const parsed = new URL(reqUrl);
      if (LOCAL_HOSTS.has(parsed.hostname)) {
        await route.continue();
        return;
      }

      if (parsed.hostname === 'esm.run' || parsed.pathname.includes('web-llm')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'export const CreateMLCEngine = async () => ({}); export const prebuiltAppConfig = { model_list: [] }; export default {};',
        });
        return;
      }

      if (parsed.pathname.includes('faro-web-sdk')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'window.GrafanaFaroWebSdk = { initializeFaro: () => ({ api: { pushLog() {}, pushError() {}, pushEvent() {}, pushMeasurement() {} } }) };',
        });
        return;
      }

      if (parsed.hostname.includes('faro-collector')) {
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: '{}',
        });
        return;
      }

      if (parsed.pathname.endsWith('.json') || parsed.search.includes('format=json') || parsed.pathname.includes('oembed')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            stubbed: true,
            title: 'Stubbed External Resource',
            author_name: 'PKC Stub',
            query: {
              search: [{ title: 'PKC Architecture', snippet: 'Stubbed search result', pageid: 1 }],
              pages: { '1': { pageid: 1, title: 'PKC Architecture', extract: 'Stubbed Wikipedia extract.' } },
            },
          }),
        });
        return;
      }

      const resourceType = route.request().resourceType();
      if (resourceType === 'script' || parsed.pathname.endsWith('.js')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'window.__stubbedExternalScript = true;',
        });
        return;
      }

      if (resourceType === 'stylesheet' || parsed.pathname.endsWith('.css')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/css',
          body: 'body { margin: 0; }',
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Stubbed External Embed</title></head><body><main id="stubbed-external-embed">External embed stubbed at test boundary</main></body></html>',
      });
    } catch {
      await route.continue();
    }
  });
}

export async function collectOutgoingSameOriginLinks(page, { includeSearch = false } = {}) {
  return page.evaluate(({ withSearch }) => {
    const origin = window.location.origin;
    const links = new Set();
    for (const anchor of document.querySelectorAll('a[href]')) {
      if (anchor.hasAttribute('download')) continue;
      const raw = (anchor.getAttribute('href') || '').trim();
      if (!raw || raw.startsWith('#') || raw.startsWith('?')) continue;
      if (/^(javascript|mailto|tel|blob|data):/i.test(raw)) continue;
      try {
        const resolved = new URL(raw, window.location.href);
        if (resolved.origin !== origin) continue;
        links.add(withSearch ? `${resolved.pathname}${resolved.search}` : resolved.pathname);
      } catch {}
    }
    return [...links].sort();
  }, { withSearch: includeSearch });
}

export async function navigateToDashboard(page) {
  await stubExternalComponentRequests(page);
  await page.goto(CLM_DASHBOARD_PATH, { waitUntil: 'domcontentloaded' });
}

export async function waitForDashboardReady(page, timeout = 15000) {
  await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout });
  await page.waitForSelector('.component-item', { timeout });
}

export async function clickComponent(page, componentName) {
  const button = page.locator(`div.component-item:has-text("${componentName}")`);
  await expect(button).toBeVisible({ timeout: 10000 });
  await button.click();
  await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout: 15000 });
  await page.waitForSelector('.component-item', { timeout: 15000 });
}

export async function verifyComponentIframe(page, componentHash) {
  const iframe = page.locator(`iframe[id="iframe-${componentHash}"]`);
  await expect(iframe).toBeVisible({ timeout: 10000 });
  return iframe;
}

export function getComponentFrame(page, componentHash) {
  return page.frameLocator(`iframe[id="iframe-${componentHash}"]`);
}

export async function setupComponent(page, componentName, componentHash) {
  await navigateToDashboard(page);
  await waitForDashboardReady(page);
  await clickComponent(page, componentName);
  return verifyComponentIframe(page, componentHash);
}

export async function takeScreenshot(page, name, target) {
  const filename = name.startsWith('clm-') ? `${name}.png` : `clm-${name}.png`;
  let screenshotPath;
  if (target && typeof target.outputPath === 'function') {
    screenshotPath = target.outputPath(filename);
  } else {
    const dir = typeof target === 'string' && target ? target : path.resolve('test-results', 'components');
    fs.mkdirSync(dir, { recursive: true });
    screenshotPath = path.join(dir, filename);
  }
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}
