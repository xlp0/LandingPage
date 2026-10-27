import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Hero Content Component Test', () => {
  test('should load and display hero content component correctly', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'Hero Content', 'hero-content');
    await takeScreenshot(page, 'clm-hero-content', testInfo);
  });
});
