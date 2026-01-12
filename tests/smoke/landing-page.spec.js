/**
 * Smoke Tests: Landing Page Navigation
 * 
 * Fast validation of core landing page functionality.
 * Focus: Page loads, elements visible, basic navigation works.
 * 
 * @category smoke
 * @timeout 30000
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/index.html';

test.describe('Landing Page - Smoke Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);

        // Handle PWA modal if it appears - wait for it and ensure fully dismissed
        const modalDismissBtn = page.locator('#modal-dismiss-btn');
        const backdrop = page.locator('#pwa-install-backdrop');

        try {
            await modalDismissBtn.waitFor({ state: 'visible', timeout: 8000 });
            await modalDismissBtn.click();
            // Wait for backdrop to be completely hidden
            await backdrop.waitFor({ state: 'hidden', timeout: 5000 });
            // Extra wait for animation completion
            await page.waitForTimeout(500);
        } catch (e) {
            // Modal didn't appear, but ensure backdrop is hidden anyway
            try {
                await backdrop.waitFor({ state: 'hidden', timeout: 2000 });
            } catch (e2) {
                // Backdrop also not present, continue
            }
        }

        // Ensure container is ready before proceeding
        await expect(page.locator('.container')).toBeVisible();
    });

    test('Page loads with correct title', async ({ page }) => {
        await expect(page).toHaveTitle('MCard Manager');
    });

    test('Header elements are visible', async ({ page }) => {
        await expect(page.locator('h1')).toHaveText('MCard Manager');
        await expect(page.getByTitle('Back to Landing Page')).toBeVisible();
        await expect(page.getByText('Upload', { exact: true })).toBeVisible();
        await expect(page.getByText('New Text', { exact: true })).toBeVisible();
        await expect(page.getByText('Chat', { exact: true })).toBeVisible();
    });

    test('Sidebar is visible and collapsible', async ({ page }) => {
        const sidebar = page.locator('#sidebar');
        await expect(sidebar).toBeVisible();

        // Collapse
        const collapseBtn = page.locator('#collapseBtn');
        await collapseBtn.click();
        await expect(sidebar).toHaveClass(/collapsed/);

        // Expand
        await collapseBtn.click();
        await expect(sidebar).not.toHaveClass(/collapsed/);
    });

    test('Apps menu opens', async ({ page }) => {
        const appsHeader = page.locator('.apps-header');
        await appsHeader.click();

        const appsSubmenu = page.locator('#appsSubmenu');
        await expect(appsSubmenu).toBeVisible();
    });

    test('Main content container is visible', async ({ page }) => {
        await expect(page.locator('.container')).toBeVisible();
        await expect(page.locator('.main-content')).toBeVisible();
    });

});
