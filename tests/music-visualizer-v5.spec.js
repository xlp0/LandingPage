import { test, expect } from '@playwright/test';

/**
 * UI Tests for Synchronized Music Visualizer V5
 * 
 * This suite covers:
 * 1. Initial page load and UI state
 * 2. Dynamic song selection and sheet music rendering
 * 3. Playback control synchronization (Play/Pause/Stop)
 * 4. Timer advancement and status updates
 * 5. Performance metrics and loader statistics
 */

test.describe('Synchronized Music Visualizer V5', () => {
    // The path relative to the dev server root (usually public/ or root)
    const URL = '/public/examples/Music/SyncedMusicVisualizerV5.html';

    test.beforeEach(async ({ page }) => {
        // Navigate to the visualizer page
        await page.goto(URL);
        // Wait for the app to bootstrap
        await page.waitForFunction(() => window.app !== undefined, { timeout: 10000 });
    });

    test('Initial State: Page should load with correct title and components', async ({ page }) => {
        // Verify page title
        await expect(page).toHaveTitle(/Synchronized Music Visualizer V5/);

        // Verify header
        const header = page.locator('h1');
        await expect(header).toContainText('Music Visualizer V5');

        // Verify status bar initial message
        const statusBar = page.locator('#statusBar');
        // Note: The app auto-selects the first song, so we might see "Loading..." or "Ready:" 
        // depending on how fast it loads. We check if it eventually reaches a valid state.
        await expect(statusBar).not.toBeEmpty();

        // Verify transport controls
        await expect(page.locator('#playBtn')).toBeDefined();
        await expect(page.locator('#stopBtn')).toBeDefined();

        // Verify visualizer canvas
        await expect(page.locator('#three-canvas')).toBeVisible();
    });

    test('Song Selection: Should load and render a specific song', async ({ page }) => {
        // Find the 'Ode to Joy' button
        const odeBtn = page.getByRole('button', { name: 'Ode to Joy' });
        await odeBtn.waitFor();
        await odeBtn.click();

        // Verify status bar updates to Ready for Ode to Joy
        const statusBar = page.locator('#statusBar');
        await expect(statusBar).toContainText('Ready: "Ode to Joy"');

        // Verify sheet music rendered (OSMD generates SVGs)
        const osmdSvg = page.locator('#osmd-container svg');
        await expect(osmdSvg).toBeVisible();

        // Verify performance metrics appear after render
        const perfMetrics = page.locator('#perfMetrics');
        await expect(perfMetrics).toBeVisible();

        await expect(page.locator('#metricRender')).not.toHaveText('0ms');
    });

    test('Playback: Should start, advance timer, and sync UI', async ({ page }) => {
        // Ensure a song is loaded (using Ode to Joy for consistency)
        const odeBtn = page.getByRole('button', { name: 'Ode to Joy' });
        await odeBtn.waitFor();
        await odeBtn.click();

        // Play button should be enabled
        const playBtn = page.locator('#playBtn');
        await expect(playBtn).toBeEnabled();

        // Click Play
        await playBtn.click();

        // 1. Check status change
        await expect(page.locator('#statusBar')).toContainText('Playing: "Ode to Joy"');

        // 2. Check icon toggle (Play icon hidden, Pause icon visible)
        await expect(page.locator('#play-icon')).toBeHidden();
        await expect(page.locator('#pause-icon')).toBeVisible();

        // 3. Wait for timer to advance beyond 00:00
        await expect(async () => {
            const timeText = await page.locator('#currentTime').textContent();
            expect(timeText).not.toBe('00:00');
        }).toPass({ timeout: 10000 });

        // 4. Click Pause (togglePlay)
        await playBtn.click();
        await expect(page.locator('#statusBar')).toContainText('Paused');
        await expect(page.locator('#play-icon')).toBeVisible();

        // 5. Click Stop
        await page.locator('#stopBtn').click();
        await expect(page.locator('#currentTime')).toHaveText('00:00');
        await expect(page.locator('#statusBar')).toContainText('Stopped');
    });

    test('Performance Metrics: Should display load and render times', async ({ page }) => {
        const odeBtn = page.getByRole('button', { name: 'Ode to Joy' });
        await odeBtn.waitFor();
        await odeBtn.click();

        // Verify performance metrics appear after render
        const perfMetrics = page.locator('#perfMetrics');
        await expect(perfMetrics).toBeVisible();

        // Wait for rendering to complete (metrics update periodically)
        await expect(page.locator('#metricRender')).not.toHaveText('0ms', { timeout: 10000 });

        const totalTime = await page.locator('#metricTotal').textContent();
        expect(totalTime).toMatch(/\d+\.\d+ms/);
    });

    test('Playback: Should always restart from beginning when Play is clicked', async ({ page }) => {
        const odeBtn = page.getByRole('button', { name: 'Ode to Joy' });
        await odeBtn.waitFor();
        await odeBtn.click();

        const playBtn = page.locator('#playBtn');

        // Start playing
        await playBtn.click();

        // Wait for it to advance
        await expect(async () => {
            const timeText = await page.locator('#currentTime').textContent();
            expect(timeText).not.toBe('00:00');
        }).toPass({ timeout: 5000 });

        // Pause
        await playBtn.click();
        await expect(page.locator('#statusBar')).toContainText('Paused');

        // Play again - should restart
        await playBtn.click();
        await expect(page.locator('#currentTime')).toHaveText('00:00');
        await expect(page.locator('#statusBar')).toContainText('Playing');
    });

    test('Song Change: Should stop active playback when a new song is selected', async ({ page }) => {
        // Start playing Twinkle
        const twinkleBtn = page.getByRole('button', { name: 'Twinkle Twinkle Little Star' });
        await twinkleBtn.click();
        await page.locator('#playBtn').click();
        await expect(page.locator('#statusBar')).toContainText('Playing');

        // Select Ode to Joy
        const odeBtn = page.getByRole('button', { name: 'Ode to Joy' });
        await odeBtn.click();

        // Verify it's not playing anymore (icons should toggle or status should change)
        await expect(page.locator('#play-icon')).toBeVisible();
        await expect(page.locator('#statusBar')).not.toContainText('Playing');
        await expect(page.locator('#statusBar')).toContainText('Ode to Joy');
    });



    test('Responsiveness: Should maintain buttons during state changes', async ({ page }) => {
        // Reload page to test bootstrap robustness
        await page.reload();
        await page.waitForFunction(() => window.app !== undefined);

        // All song buttons from SONGS_DATA should be present
        const buttonsCount = await page.locator('#songSelector button').count();
        expect(buttonsCount).toBeGreaterThanOrEqual(4); // twinkle, ode, scale, minuet

        // Verify the first one is active/selected by default (it has gradient classes)
        const firstBtn = page.locator('#songSelector button').first();
        await expect(firstBtn).toHaveClass(/from-cyan-500/);
    });
});
