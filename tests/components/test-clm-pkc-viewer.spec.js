import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM PKC Viewer Component Test', () => {
  test('should load and display PKC viewer component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'PKC Document Viewer', 'pkc-viewer');
    await takeScreenshot(page, 'clm-pkc-viewer', testInfo);
  });
});
