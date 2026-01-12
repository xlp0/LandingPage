/**
 * Smoke Tests: Apps Menu Navigation
 * 
 * Fast validation of Apps menu and view switching.
 * Focus: Menu opens, views can be opened and closed.
 * 
 * @category smoke
 * @timeout 30000
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/index.html';

test.describe('Apps Menu - Smoke Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);

        // Handle PWA modal if it appears - wait longer and ensure it's fully gone
        const modalDismissBtn = page.locator('#modal-dismiss-btn');
        try {
            await modalDismissBtn.waitFor({ state: 'visible', timeout: 8000 });
            await modalDismissBtn.click();
            // Wait for backdrop to fully hide
            await page.locator('#pwa-install-backdrop').waitFor({ state: 'hidden', timeout: 5000 });
            // Extra wait for any animations
            await page.waitForTimeout(500);
        } catch (e) {
            // Modal didn't appear
        }

        // Ensure main container is ready
        await expect(page.locator('.container')).toBeVisible();
    });

    test('Apps submenu contains expected items', async ({ page }) => {
        const appsHeader = page.locator('.apps-header');
        await appsHeader.click();

        const appsSubmenu = page.locator('#appsSubmenu');
        await expect(appsSubmenu).toBeVisible();

        // Verify key app items exist
        await expect(appsSubmenu.locator('.app-item[title="Music Visualizer"]')).toBeVisible();
        await expect(appsSubmenu.locator('.app-item[title="Map"]')).toBeVisible();
        await expect(appsSubmenu.locator('.app-item[title="3D Viewer"]')).toBeVisible();
    });

    test('Music Visualizer view can be opened and closed', async ({ page }) => {
        const appsHeader = page.locator('.apps-header');
        await appsHeader.click();

        const musicItem = page.locator('.app-item[title="Music Visualizer"]');
        await musicItem.click();

        const musicView = page.locator('#musicView');
        await expect(musicView).toBeVisible();

        // Close the view
        const closeBtn = musicView.locator('button.header-btn', { hasText: 'Close' });
        await closeBtn.click();
        await expect(musicView).toBeHidden();
    });

    test('Map view can be opened and closed', async ({ page }) => {
        const appsHeader = page.locator('.apps-header');
        await appsHeader.click();

        const mapItem = page.locator('.app-item[title="Map"]');
        await mapItem.click();

        const mapView = page.locator('#mapView');
        await expect(mapView).toBeVisible();

        const closeBtn = mapView.locator('button.header-btn', { hasText: 'Close' });
        await closeBtn.click();
        await expect(mapView).toBeHidden();
    });

    test('3D Viewer can be opened and closed', async ({ page }) => {
        const appsHeader = page.locator('.apps-header');
        await appsHeader.click();

        const viewerItem = page.locator('.app-item[title="3D Viewer"]');
        await viewerItem.click();

        const viewerView = page.locator('#threeDView');
        await expect(viewerView).toBeVisible();

        const closeBtn = viewerView.locator('button.header-btn', { hasText: 'Close' });
        await closeBtn.click();
        await expect(viewerView).toBeHidden();
    });

});
