import { test, expect } from '@playwright/test';
import {
  navigateToDashboard,
  waitForDashboardReady,
} from '../fixtures/clm-helpers.js';

test.describe('CLM Dashboard Smoke Tests', () => {
  test('Dashboard loads successfully', async ({ page }) => {
    await navigateToDashboard(page);
    await expect(page).toHaveTitle(/CLM Dashboard/);
  });

  test('Component registry loads and populates sidebar', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForDashboardReady(page);

    const componentItems = page.locator('.component-item');
    const count = await componentItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Loading overlay disappears after registry load', async ({ page }) => {
    await navigateToDashboard(page);
    await expect(page.locator('.loading-overlay')).toBeHidden({ timeout: 15000 });
  });

  test('Types column is visible', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForDashboardReady(page);
    await expect(page.locator('.types-column')).toBeVisible();
  });

  test('Components column is visible', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForDashboardReady(page);
    await expect(page.locator('.components-column')).toBeVisible();
  });

  test('Main content area is visible', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForDashboardReady(page);
    await expect(page.locator('.main-content')).toBeVisible();
  });
});
