import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Wikipedia Search Component Test', () => {
  test('should load and display wikipedia search component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'Wikipedia Search', 'wikipedia-search');
    await takeScreenshot(page, 'clm-wikipedia-search', testInfo);
  });
});
