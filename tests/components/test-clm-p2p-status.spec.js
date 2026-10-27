import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM P2P Status Component Test', () => {
  test('should load and display p2p status component correctly', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'P2P Status Panel', 'p2p-status');
    await takeScreenshot(page, 'clm-p2p-status', testInfo);
  });
});
