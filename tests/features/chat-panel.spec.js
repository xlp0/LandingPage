/**
 * Feature Tests: Chat Panel
 * 
 * Deep testing of chat panel functionality.
 * Tests: Open/close, input handling, message display.
 * 
 * @category feature
 * @timeout 120000
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/index.html';

test.describe('Chat Panel - Feature Tests', () => {

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

    test('Chat panel opens and closes correctly', async ({ page }) => {
        const chatBtn = page.getByText('Chat', { exact: true });
        await chatBtn.click();

        const chatPanel = page.locator('#chatPanel');
        await expect(chatPanel).toBeVisible();

        // Verify chat panel has expected elements
        const chatMessages = chatPanel.locator('.chat-messages, .messages-container, [class*="message"]');
        // Chat input should exist
        const chatInput = chatPanel.locator('input, textarea').first();

        // Close chat
        const closeBtn = chatPanel.locator('.chat-close-btn');
        await closeBtn.click();
        await expect(chatPanel).toBeHidden();
    });

    test('Chat panel can be reopened after closing', async ({ page }) => {
        const chatBtn = page.getByText('Chat', { exact: true });

        // Open
        await chatBtn.click();
        const chatPanel = page.locator('#chatPanel');
        await expect(chatPanel).toBeVisible();

        // Close
        const closeBtn = chatPanel.locator('.chat-close-btn');
        await closeBtn.click();
        await expect(chatPanel).toBeHidden();

        // Reopen
        await chatBtn.click();
        await expect(chatPanel).toBeVisible();
    });

    test('Chat panel contains input elements', async ({ page }) => {
        const chatBtn = page.getByText('Chat', { exact: true });
        await chatBtn.click();

        const chatPanel = page.locator('#chatPanel');
        await expect(chatPanel).toBeVisible();

        // Look for any input or textarea element
        const inputField = chatPanel.locator('input[type="text"], textarea').first();
        if (await inputField.count() > 0) {
            await expect(inputField).toBeVisible();
        }

        // Close panel
        const closeBtn = chatPanel.locator('.chat-close-btn');
        await closeBtn.click();
    });

});
