import { test, expect } from '@playwright/test';
import {
  clickComponent,
  navigateToDashboard,
  takeScreenshot,
  waitForDashboardReady,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Crash Test Component Test', () => {
  test('should load crash test component and verify isolation', async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    await navigateToDashboard(page);
    await waitForDashboardReady(page);
    await clickComponent(page, 'Intentional Failure Component');

    await expect(page.locator('.main-content')).toBeVisible();
    await takeScreenshot(page, 'clm-crash-test', testInfo);
  });
});
