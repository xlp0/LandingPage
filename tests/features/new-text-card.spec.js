/**
 * Feature Tests: New Text Card Panel
 * 
 * Deep testing of the New Text Card creation functionality.
 * 
 * @category feature
 * @timeout 120000
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8888/index.html';

test.describe('New Text Card - Feature Tests', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);

        // Handle PWA modal if it appears
        const modalDismissBtn = page.locator('#modal-dismiss-btn');
        try {
            await modalDismissBtn.waitFor({ state: 'visible', timeout: 5000 });
            await modalDismissBtn.click();
            await page.locator('#pwa-install-backdrop').waitFor({ state: 'hidden', timeout: 3000 });
        } catch (e) {
            // Modal didn't appear
        }
    });

    test('New Text Card panel opens with correct elements', async ({ page }) => {
        // Click "New Text" button in header
        await page.getByText('New Text', { exact: true }).click();

        // Verify "Create New Card" panel appears
        const viewerTitle = page.locator('#viewerTitle');
        await expect(viewerTitle).toContainText('Create New Card');

        // Verify input fields are present
        await expect(page.locator('#newCardHandle')).toBeVisible();
        await expect(page.locator('#newCardContent')).toBeVisible();
    });

    test('New Text Card panel allows text input', async ({ page }) => {
        await page.getByText('New Text', { exact: true }).click();

        // Type in the handle field
        const handleInput = page.locator('#newCardHandle');
        await handleInput.fill('my-test-card');
        await expect(handleInput).toHaveValue('my-test-card');

        // Type in the content field
        const contentInput = page.locator('#newCardContent');
        await contentInput.fill('This is test content for the card.');
        await expect(contentInput).toHaveValue('This is test content for the card.');
    });

});
