import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Google Maps Component Test', () => {
  test('should load and display google maps component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'Google Maps', 'google-maps');
    await takeScreenshot(page, 'clm-google-maps', testInfo);
  });
});
