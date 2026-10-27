import { test } from '@playwright/test';
import {
  setupComponent,
  takeScreenshot,
} from '../fixtures/clm-helpers.js';

test.describe('CLM User List Component Test', () => {
  test('should load and display user list component', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await setupComponent(page, 'User Account List', 'user-list');
    await takeScreenshot(page, 'clm-user-list', testInfo);
  });
});
