import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Redux State Viewer Component Test', () => {
  test('should load and display redux state viewer component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'Redux Store Monitor', 'redux-state-viewer');
    await takeScreenshot(page, 'clm-redux-state-viewer', testInfo);
  });
});
