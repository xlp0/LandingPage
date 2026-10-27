import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Wikipedia Viewer Component Test', () => {
  test('should load and display wikipedia viewer component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'Wikipedia Knowledge Base', 'wikipedia-viewer');
    await takeScreenshot(page, 'clm-wikipedia-viewer', testInfo);
  });
});
