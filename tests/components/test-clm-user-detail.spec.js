import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM User Detail Component Test', () => {
  test('should load and display user detail component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'User Account Detail', 'user-detail');
    await takeScreenshot(page, 'clm-user-detail', testInfo);
  });
});
