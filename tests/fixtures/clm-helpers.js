/**
 * Shared CLM Dashboard Test Helpers
 * 
 * Common utilities for testing CLM Dashboard components.
 * These helpers abstract common patterns like waiting for dashboard load,
 * selecting components, and verifying iframes.
 */

const { expect } = require('@playwright/test');

// Use port 8000 for Playwright tests (Python HTTP server started by Playwright)
// Use port 3000 only when WebSocket server is running separately
const CLM_DASHBOARD_URL = 'http://localhost:8000/archive/html/index-clm-dashboard.html';

/**
 * Navigate to CLM Dashboard and wait for it to fully load
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function navigateToDashboard(page) {
    await page.goto(CLM_DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
}

/**
 * Wait for the dashboard to be ready (loading overlay hidden, components visible)
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} timeout - Maximum wait time in ms (default: 15000)
 */
async function waitForDashboardReady(page, timeout = 15000) {
    await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout });
    await page.waitForSelector('.component-item', { timeout });
}

/**
 * Click a component in the sidebar by its display name
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} componentName - Display name of the component (e.g., "YouTube Video Viewer")
 */
async function clickComponent(page, componentName) {
    const button = page.locator(`div.component-item:has-text("${componentName}")`);
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();
    // Wait for potential loading after click
    await page.waitForTimeout(500);
}

/**
 * Verify a component iframe is visible
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} componentHash - Component hash ID (e.g., "youtube-viewer")
 * @returns {import('@playwright/test').Locator} - The iframe locator
 */
async function verifyComponentIframe(page, componentHash) {
    const iframe = page.locator(`iframe[id="iframe-${componentHash}"]`);
    await expect(iframe).toBeVisible({ timeout: 10000 });
    return iframe;
}

/**
 * Get a frame locator for interacting with component iframe content
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} componentHash - Component hash ID
 * @returns {import('@playwright/test').FrameLocator}
 */
function getComponentFrame(page, componentHash) {
    return page.frameLocator(`iframe[id="iframe-${componentHash}"]`);
}

/**
 * Full setup: navigate to dashboard, wait for ready, click component
 * @param {import('@playwright/test').Page} page 
 * @param {string} componentName
 * @param {string} componentHash
 */
async function setupComponent(page, componentName, componentHash) {
    await navigateToDashboard(page);
    await waitForDashboardReady(page);
    await clickComponent(page, componentName);
    await verifyComponentIframe(page, componentHash);
}

/**
 * Take a screenshot with standardized naming
 * @param {import('@playwright/test').Page} page
 * @param {string} name - Screenshot name (will be prefixed with 'clm-')
 * @param {string} outputDir - Directory for screenshots
 */
async function takeScreenshot(page, name, outputDir) {
    const path = require('path');
    const screenshotPath = path.join(outputDir, `clm-${name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
}

module.exports = {
    CLM_DASHBOARD_URL,
    navigateToDashboard,
    waitForDashboardReady,
    clickComponent,
    verifyComponentIframe,
    getComponentFrame,
    setupComponent,
    takeScreenshot,
};
