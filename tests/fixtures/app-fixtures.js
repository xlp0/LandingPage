import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { test as base, expect } from '@playwright/test';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';
import { CanonicalTriadBackend } from '../../server/mcard-api.mjs';
import { createTestRunRouter } from '../../server/test-run-api.mjs';
import { RESPONSIVE_LAB_PATH } from './test-config.js';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, '../..');
const TRACKED_PROD_DB = path.join(REPO_ROOT, 'data', 'mcard-api.db');

export const SPA_FIXTURE_PATH = '/tests/fixtures/spa-test-target.html';
export const SPA_FIXTURE_HANDLE = 'mcard:target:/tests/fixtures/spa-test-target.html';
export const SPA_GRAPH_REL_PATH = 'tests/fixtures/spa-test-target.graph.json';
export const SPA_GRAPH_ABS_PATH = path.join(REPO_ROOT, SPA_GRAPH_REL_PATH);

export function loadSpaFixtureGraph() {
  return JSON.parse(fs.readFileSync(SPA_GRAPH_ABS_PATH, 'utf8'));
}

export function parseSavedRunBadge(text) {
  const raw = String(text || '').trim();
  const match = /💾\s+(.+?)\s+\(([0-9a-f]{8})\)/i.exec(raw);
  if (!match) {
    return null;
  }
  return {
    handleSummary: match[1],
    hashPrefix: match[2].toLowerCase()
  };
}

export async function createIsolatedPersistenceHarness() {
  const prodExistsBefore = fs.existsSync(TRACKED_PROD_DB);
  const prodMtimeBefore = prodExistsBefore ? fs.statSync(TRACKED_PROD_DB).mtimeMs : null;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc02-triad-'));
  const dbPath = path.join(tempDir, 'isolated-triad.db');
  if (path.resolve(dbPath) === path.resolve(TRACKED_PROD_DB)) {
    throw new Error('Persistence harness resolved to tracked data/mcard-api.db');
  }

  const storage = new CanonicalTriadBackend(dbPath);
  const app = express();
  app.use('/api/test-runs', express.json({ limit: '2mb' }), createTestRunRouter({ storage }));
  app.use(express.json());

  const server = await new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function cleanup() {
    await new Promise((resolve) => server.close(() => resolve()));
    if (typeof storage.close === 'function') {
      storage.close();
    }
    fs.rmSync(tempDir, { recursive: true, force: true });

    const prodExistsAfter = fs.existsSync(TRACKED_PROD_DB);
    if (!prodExistsBefore && prodExistsAfter) {
      throw new Error('Persistence test created tracked data/mcard-api.db');
    }
    if (prodExistsBefore && prodExistsAfter) {
      const prodMtimeAfter = fs.statSync(TRACKED_PROD_DB).mtimeMs;
      if (prodMtimeAfter !== prodMtimeBefore) {
        throw new Error('Persistence test mutated tracked data/mcard-api.db');
      }
    }
  }

  return {
    baseUrl,
    dbPath,
    tempDir,
    storage,
    cleanup
  };
}

export async function installExternalBoundaryStubs(context) {
  const stubbedRequests = [];

  await context.route('**/api/auth/**', async (route) => {
    stubbedRequests.push({ boundary: 'oauth', url: route.request().url() });
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'oauth_stubbed_in_test_boundary' })
    });
  });

  await context.route(/^https:\/\/(huggingface\.co|raw\.githubusercontent\.com)\/.*/i, async (route) => {
    stubbedRequests.push({ boundary: 'webllm', url: route.request().url() });
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'webllm_model_download_stubbed' })
    });
  });

  await context.route(/^https:\/\/(github\.com|www\.google\.com|developer\.mozilla\.org)(\/.*)?$/i, async (route) => {
    const reqUrl = route.request().url();
    stubbedRequests.push({ boundary: 'blocked-external-origin', url: reqUrl });
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "frame-ancestors 'none'"
      },
      body: '<!DOCTYPE html><html><body>Blocked by frame policy stub</body></html>'
    });
  });

  return { stubbedRequests };
}

export function createResponsiveLabWorkbench(page, request) {
  const targetFrame = () => page.frameLocator('iframe[title="Responsive UI Lab Test Frame"]');

  async function open({ targetPath = null } = {}) {
    const dest = targetPath
      ? `${RESPONSIVE_LAB_PATH}?target=${encodeURIComponent(targetPath)}`
      : RESPONSIVE_LAB_PATH;
    await page.goto(dest);
    await expect(page.getByRole('heading', { name: /Responsive UI Lab/i })).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/lab-booting/);
    await expect(page.getByRole('button', { name: /Start/i })).toBeVisible();
  }

  async function loadTargetByUrl(targetUrl) {
    const input = page.getByRole('textbox', { name: /Test Target URL input/i });
    await input.fill(targetUrl);
    await page.getByRole('button', { name: /Load Target/i }).click();
  }

  async function selectPresetTarget(optionValue) {
    const selector = page.getByRole('combobox', { name: /Select target website/i });
    await selector.selectOption(optionValue);
  }

  async function selectBuiltinDevice(deviceId) {
    const device = BUILTIN_DEVICES.find((d) => d.id === deviceId);
    if (!device) {
      throw new Error(`Unknown builtin deviceId "${deviceId}"`);
    }
    await page.getByRole('button', { name: new RegExp(device.name, 'i') }).click();
    const widthInput = page.locator('#controlled-width-input');
    const heightInput = page.locator('#controlled-height-input');
    await expect(widthInput).toHaveValue(new RegExp(`^(${device.width}|${device.height})$`));
    await expect(heightInput).toHaveValue(new RegExp(`^(${device.height}|${device.width})$`));
    return device;
  }

  async function readStageDimensions() {
    const width = Number(await page.locator('#controlled-width-input').inputValue());
    const height = Number(await page.locator('#controlled-height-input').inputValue());
    return { width, height };
  }

  async function rotateViewport() {
    const before = await readStageDimensions();
    await page.getByRole('button', { name: /Rotate \(90°\)/i }).click();
    await expect(page.locator('#controlled-width-input')).toHaveValue(String(before.height));
    await expect(page.locator('#controlled-height-input')).toHaveValue(String(before.width));
    return { width: before.height, height: before.width };
  }

  async function startRecording() {
    const startBtn = page.getByRole('button', { name: /Start/i });
    await expect(startBtn).toBeEnabled();
    await startBtn.click();
    await expect(page.getByRole('button', { name: /Stop/i })).toBeVisible();
  }

  async function stopAndSaveRecording() {
    const saveResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/test-runs') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /Stop/i }).click();
    const response = await saveResponsePromise;
    const data = await response.json();
    const savedLabel = page.locator('#rec-saved-label');
    await expect(savedLabel).toContainText(/\([0-9a-f]{8}\)/i);
    const badgeText = await savedLabel.innerText();
    return {
      status: response.status(),
      data,
      badge: parseSavedRunBadge(badgeText),
      badgeText
    };
  }

  async function fetchPersistedRun(hash) {
    const res = await request.get(`/api/test-runs/${hash}`);
    const body = res.ok() ? await res.json() : await res.text();
    return { status: res.status(), ok: res.ok(), body };
  }

  return {
    open,
    loadTargetByUrl,
    selectPresetTarget,
    selectBuiltinDevice,
    readStageDimensions,
    rotateViewport,
    startRecording,
    stopAndSaveRecording,
    fetchPersistedRun,
    targetFrame
  };
}

async function clearOriginBrowserState(page) {
  try {
    const url = page.url();
    if (url && /^https?:\/\//.test(url)) {
      await page.evaluate(async () => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
    }
  } catch {
    return;
  }
}

export const test = base.extend({
  externalStubs: async ({ context }, use) => {
    const handle = await installExternalBoundaryStubs(context);
    await use(handle);
  },

  isolatedLabPage: async ({ context, page, externalStubs }, use) => {
    void externalStubs;
    const dialogs = [];
    const onDialog = async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.dismiss();
    };
    page.on('dialog', onDialog);
    await context.clearCookies();

    await use({ page, dialogs });

    page.off('dialog', onDialog);
    await clearOriginBrowserState(page);
    await context.clearCookies();
  },

  workbench: async ({ isolatedLabPage, request }, use) => {
    const controller = createResponsiveLabWorkbench(isolatedLabPage.page, request);
    await use(controller);
  }
});

export { expect };
