/**
 * Smoke Tests: CLM Dashboard
 * 
 * Fast validation of CLM Dashboard core functionality.
 * Focus: Dashboard loads, registry populates, component list visible.
 * 
 * NOTE: These tests require the WebSocket server to be running on port 3000
 * (node ws-server.js) for the component registry to populate.
 * 
 * @category smoke
 * @timeout 30000
 */

const { test, expect } = require('@playwright/test');
const {
    navigateToDashboard,
    waitForDashboardReady
} = require('../fixtures/clm-helpers');

// Skip if WS server isn't available - these tests need the full backend
test.describe('CLM Dashboard - Smoke Tests', () => {
    // These tests are designed to run with the WS server
    // For CI without WS server, use: test.skip()

    test('Dashboard loads successfully', async ({ page }) => {
        await navigateToDashboard(page);

        // Verify dashboard title
        await expect(page).toHaveTitle(/CLM Dashboard/);
    });

    test('Component registry loads and populates sidebar', async ({ page }) => {
        await navigateToDashboard(page);
        await waitForDashboardReady(page);

        // Verify at least some component items are visible
        const componentItems = page.locator('.component-item');
        const count = await componentItems.count();
        expect(count).toBeGreaterThan(0);
    });

    test('Loading overlay disappears after registry load', async ({ page }) => {
        await navigateToDashboard(page);

        // Loading overlay should eventually hide
        await expect(page.locator('.loading-overlay')).toBeHidden({ timeout: 15000 });
    });

    test('Types column is visible', async ({ page }) => {
        await navigateToDashboard(page);
        await waitForDashboardReady(page);

        const typesColumn = page.locator('.types-column');
        await expect(typesColumn).toBeVisible();
    });

    test('Components column is visible', async ({ page }) => {
        await navigateToDashboard(page);
        await waitForDashboardReady(page);

        const componentsColumn = page.locator('.components-column');
        await expect(componentsColumn).toBeVisible();
    });

    test('Main content area is visible', async ({ page }) => {
        await navigateToDashboard(page);
        await waitForDashboardReady(page);

        const mainContent = page.locator('.main-content');
        await expect(mainContent).toBeVisible();
    });

});
