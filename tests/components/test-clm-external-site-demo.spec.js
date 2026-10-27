import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM External Site Demo Component Test', () => {
  test('should load and display external site demo component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'External Website Demo', 'external-site-demo');
    await takeScreenshot(page, 'clm-external-site-demo', testInfo);
  });
});
