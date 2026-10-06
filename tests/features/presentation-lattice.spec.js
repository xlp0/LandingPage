/**
 * Playwright Test Suite: Multi-Dimensional Presentation Lattice & Faro Telemetry
 * 
 * Verifies:
 * 1. Initial mission control state & top control bar mounting
 * 2. Interactive theme switching (Dark -> Light -> High-Contrast -> Dark)
 * 3. Energy-saving low power mode (0ms animation duration, 0px blur)
 * 4. Grafana Faro Web SDK RUM telemetry and lattice coordinate decoration
 * 5. Responsive form-factor layout integrity (zero horizontal overflow)
 * 
 * Designed for headed execution with slow-motion visual observation.
 */

import { test, expect } from '@playwright/test';

test.describe('LandingPage Presentation Lattice & Observability', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to landing page root
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.top-controls', { state: 'visible', timeout: 10000 });

    // Wait for ES modules and presentation controller to hydrate
    await page.waitForFunction(() => 
      window.__presentation_controller !== undefined && 
      window.__faro_collector !== undefined &&
      window.__least_action_navigator !== undefined
    );

    // Initialize to canonical baseline: dark theme + balanced power mode
    await page.evaluate(() => {
      window.__presentation_controller.setTheme('dark', false);
      window.__presentation_controller.setPowerMode('balanced', false);
    });
    await page.waitForTimeout(200);
  });

  test('1. Page loads with mission control title and top controls', async ({ page }) => {
    // Verify title
    await expect(page).toHaveTitle(/GovTech Platform \| Mission Control/);

    // Verify top controls are mounted
    const themeBtn = page.locator('#theme-toggle-btn');
    const powerBtn = page.locator('#power-toggle-btn');
    const faroBadge = page.locator('#faro-status-badge');

    await expect(themeBtn).toBeVisible();
    await expect(powerBtn).toBeVisible();
    await expect(faroBadge).toBeVisible();

    // Verify initial labels
    await expect(themeBtn).toContainText('Dark');
    await expect(powerBtn).toContainText('Normal');
    await expect(faroBadge).toContainText('Faro RUM');
  });

  test('2. Interactive theme switching: Dark -> Light -> High-Contrast -> Dark', async ({ page }) => {
    const themeBtn = page.locator('#theme-toggle-btn');
    const html = page.locator('html');

    // Initial state: Dark
    console.log('[Test] Step 1: Initial dark theme verified');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(themeBtn).toContainText('Dark');
    await page.waitForTimeout(600);

    // Click 1: Switch to Light Theme
    console.log('[Test] Step 2: Toggling to Light theme');
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(themeBtn).toContainText('Light');
    await expect(page.locator('#theme-icon')).toHaveText('☀️');

    // Verify light background semantic token applied
    const lightBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    });
    console.log(`[Test] Light mode --color-bg token: ${lightBg}`);
    expect(lightBg).toBe('#f8fafc');
    await page.waitForTimeout(700);

    // Click 2: Switch to High-Contrast Theme
    console.log('[Test] Step 3: Toggling to High-Contrast theme');
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'high-contrast');
    await expect(themeBtn).toContainText('Contrast');
    await expect(page.locator('#theme-icon')).toHaveText('👁️');

    // Verify high-contrast black background semantic token
    const contrastBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    });
    console.log(`[Test] High-contrast --color-bg token: ${contrastBg}`);
    expect(contrastBg).toBe('#000000');
    await page.waitForTimeout(700);

    // Click 3: Return to Dark Theme
    console.log('[Test] Step 4: Returning to Dark theme');
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(themeBtn).toContainText('Dark');
    await expect(page.locator('#theme-icon')).toHaveText('🌙');
    await page.waitForTimeout(500);
  });

  test('3. Energy-saving mode: enforces 0ms animations and eliminates blur', async ({ page }) => {
    const powerBtn = page.locator('#power-toggle-btn');
    const html = page.locator('html');

    // Verify initial normal mode
    console.log('[Test] Power step 1: Initial balanced power mode');
    await expect(powerBtn).toContainText('Normal');

    // Check normal animation duration (250ms)
    const normalDuration = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--motion-duration-normal').trim();
    });
    console.log(`[Test] Normal motion duration: ${normalDuration}`);
    expect(normalDuration).toBe('250ms');
    await page.waitForTimeout(500);

    // Click: Switch to Energy-Saving (Eco)
    console.log('[Test] Power step 2: Toggling to Energy-Saving (Eco) mode');
    await powerBtn.click();
    await expect(html).toHaveAttribute('data-power-mode', 'energy-saving');
    await expect(powerBtn).toContainText('Eco');
    await expect(page.locator('#power-icon')).toHaveText('🔋');

    // Verify zero motion duration in eco mode
    const ecoDuration = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--motion-duration-normal').trim();
    });
    console.log(`[Test] Eco motion duration: ${ecoDuration}`);
    expect(ecoDuration).toBe('0ms');

    // Verify blur is eliminated (0px)
    const ecoBlur = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--blur-surface').trim();
    });
    console.log(`[Test] Eco blur surface: ${ecoBlur}`);
    expect(ecoBlur).toBe('0px');
    await page.waitForTimeout(700);

    // Click: Return to Normal mode
    console.log('[Test] Power step 3: Returning to Normal power mode');
    await powerBtn.click();
    await expect(html).toHaveAttribute('data-power-mode', 'balanced');
    await expect(powerBtn).toContainText('Normal');
    await expect(page.locator('#power-icon')).toHaveText('⚡');
    await page.waitForTimeout(500);
  });

  test('4. Grafana Faro telemetry collector and lattice coordinate decoration', async ({ page }) => {
    // Verify telemetry collector is initialized in browser runtime
    const telemetryInfo = await page.evaluate(() => {
      const faro = window.__faro_collector;
      if (!faro) return { initialized: false };
      return {
        initialized: true,
        appName: faro.appName,
        appVersion: faro.appVersion,
        endpoint: faro.collectorUrl,
        coordinate: faro.getLatticeCoordinate()
      };
    });

    console.log('[Test] Telemetry info:', JSON.stringify(telemetryInfo, null, 2));
    expect(telemetryInfo.initialized).toBe(true);
    expect(telemetryInfo.appName).toBe('landing-page-deployment-unit');
    expect(telemetryInfo.coordinate).toHaveProperty('display_mode');
    expect(telemetryInfo.coordinate).toHaveProperty('power_mode');
    await page.waitForTimeout(500);
  });

  test('5. Responsive layout invariance across Type Lattice viewports', async ({ page }) => {
    // Mobile Viewport (iPhone 14)
    console.log('[Test] Responsive check: Mobile (390x844)');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);

    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(mobileOverflow).toBe(false);

    // Tablet Viewport (iPad)
    console.log('[Test] Responsive check: Tablet (768x1024)');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(600);

    const tabletOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(tabletOverflow).toBe(false);

    // Desktop Viewport (1440x900)
    console.log('[Test] Responsive check: Desktop (1440x900)');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(600);

    const desktopOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(desktopOverflow).toBe(false);
  });

  test('6. Meta-Portal Deployment Unit Inspector: G-Set SQLite db examination across Web, Desktop, Mobile, Wearables, AR/VR', async ({ page }) => {
    const inspectorBtn = page.locator('#deployment-inspector-btn');
    const modal = page.locator('#deployment-inspector-modal');

    await expect(inspectorBtn).toBeVisible();
    console.log('[Test] Step 1: Clicking Deployment Units button to open Inspector');
    await inspectorBtn.click();

    // Verify modal is open
    await expect(modal).toBeVisible();
    await expect(page.locator('#inspector-title')).toContainText('Deployment Process & Unit Inspector');

    // Verify G-Set SQLite DB packaging info and Invariant tag
    await expect(page.locator('.gset-immortal-tag')).toContainText('INV-REF-03: G-Set Immortal');
    await expect(page.locator('#target-db-filename')).toContainText('landingpage.web.mcard.db');

    // Verify Merkle Root and size metrics
    await expect(page.locator('#merkle-root-display')).toBeVisible();
    await expect(page.locator('#metric-total-size')).toContainText('MB');
    await page.waitForTimeout(600);

    // Switch to Desktop Target
    console.log('[Test] Step 2: Switching to Desktop Target (Tauri)');
    await page.locator('#tab-desktop').click();
    await expect(page.locator('#current-target-name')).toContainText('Desktop (Tauri');
    await expect(page.locator('#target-db-filename')).toHaveText('landingpage.desktop.mcard.db');
    await page.waitForTimeout(600);

    // Switch to Mobile Target
    console.log('[Test] Step 3: Switching to Mobile Target (iOS / Android)');
    await page.locator('#tab-mobile').click();
    await expect(page.locator('#current-target-name')).toContainText('Mobile Devices');
    await expect(page.locator('#target-db-filename')).toHaveText('landingpage.mobile.mcard.db');
    await page.waitForTimeout(600);

    // Switch to Wearables Target (Micro-screen, 2MB budget, zero-motion)
    console.log('[Test] Step 4: Switching to Wearable Target (watchOS / WearOS)');
    await page.locator('#tab-wearable').click();
    await expect(page.locator('#current-target-name')).toContainText('Wearable Devices');
    await expect(page.locator('#target-db-filename')).toHaveText('landingpage.wearable.mcard.db');
    await expect(page.locator('.budget-ratio')).toContainText('2 MB');
    await page.waitForTimeout(600);

    // Switch to AR / VR Spatial Target (WebXR, 150MB budget, 3D glTF)
    console.log('[Test] Step 5: Switching to AR/VR Spatial Target (WebXR / VisionPro / Quest)');
    await page.locator('#tab-arvr').click();
    await expect(page.locator('#current-target-name')).toContainText('AR / VR Spatial');
    await expect(page.locator('#target-db-filename')).toHaveText('landingpage.arvr.mcard.db');
    await expect(page.locator('.budget-ratio')).toContainText('150 MB');
    await page.waitForTimeout(600);

    // Close Inspector
    console.log('[Test] Step 6: Closing inspector modal');
    await page.locator('#inspector-close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('7. Direct portal card triggers Deployment Unit Inspector', async ({ page }) => {
    const deploymentCard = page.locator('#deployment-inspector-card');
    const modal = page.locator('#deployment-inspector-modal');

    await expect(deploymentCard).toBeVisible();
    console.log('[Test] Clicking Deployment Units card on main landing grid');
    await deploymentCard.click();

    await expect(modal).toBeVisible();
    await expect(page.locator('#inspector-title')).toContainText('Deployment Process & Unit Inspector');
    await page.waitForTimeout(500);

    // Close via close button
    await page.locator('#inspector-close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('8. Mission Control Observability Gateway: split tab launch leading to backend observable data (Grafana Faro & telemetry)', async ({ page, context }) => {
    const missionBtn = page.locator('#mission-control-btn');
    const splitBtn = page.locator('#mission-control-split-btn');
    const missionCard = page.locator('#mission-control-card');
    const missionLink = page.locator('#mission-control-link');
    const corsBadge = page.locator('.cors-safe-badge');

    await expect(missionBtn).toBeVisible();
    await expect(splitBtn).toBeAttached();
    await expect(missionCard).toBeVisible();
    await expect(missionLink).toBeVisible();
    await expect(corsBadge).toBeVisible();
    await expect(corsBadge).toContainText('Grafana Faro Telemetry • CORS & Frame-Isolation Safe');

    // Verify missionLink has target="_blank"
    await expect(missionLink).toHaveAttribute('target', '_blank');
    await expect(missionLink).toHaveAttribute('href', 'app.html');

    // Test window.open behavior on split button click
    console.log('[Test] Triggering Mission Control Observability Cockpit launch');
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      missionBtn.click()
    ]);

    await newPage.waitForLoadState('domcontentloaded');
    console.log('[Test] Mission Control tab successfully opened with URL:', newPage.url());
    expect(newPage.url()).toContain('app.html');
    await newPage.close();
  });

  test('9. Least Action & Directionality Navigator: Epiplexity (S_T), Axiomatic Entropy (H_T), and Geodesic Sprints (δS = 0)', async ({ page }) => {
    const leastActionBtn = page.locator('#least-action-btn');
    const modal = page.locator('#least-action-modal');

    await expect(leastActionBtn).toBeVisible();
    console.log('[Test] Step 1: Opening Least Action Navigator');
    await leastActionBtn.click();

    await expect(modal).toBeVisible();
    await expect(page.locator('#least-action-title')).toContainText('Least Action & Directionality Navigator');

    // Verify CDO-11 optimal stationary geodesic metrics
    console.log('[Test] Step 2: Verifying CDO-11 stationary action metrics');
    await expect(page.locator('#current-direction-name')).toContainText('CDO-11: Multi-Target Native Packaging');
    await expect(page.locator('#metric-epiplexity')).toHaveText('94.5');
    await expect(page.locator('#metric-entropy')).toHaveText('12.2');
    await expect(page.locator('#metric-lagrangian')).toHaveText('+82.3');
    await expect(page.locator('#metric-distance-display')).toContainText('Physical Geodesic');
    await expect(page.locator('.matrix-status-tag')).toContainText('Uncoupled (Diagonal [A])');

    // Verify Vector Compass SVG is rendered with ∇S gradient
    await expect(page.locator('#compass-svg-element')).toBeVisible();
    await expect(page.locator('#compass-svg-element')).toContainText('∇S (SSOT)');

    // Test candidate direction switching: Anti-Pattern A (Demonic Pruning)
    console.log('[Test] Step 3: Inspecting Anti-Pattern A (Ad-Hoc Coupling)');
    await page.locator('#dir-tab-anti-monolith').click();
    await expect(page.locator('#current-direction-name')).toContainText('Ad-Hoc Monolithic Feature Sprawl');
    await expect(page.locator('#metric-epiplexity')).toHaveText('24');
    await expect(page.locator('#metric-entropy')).toHaveText('86.5');
    await expect(page.locator('#metric-lagrangian')).toHaveText('-62.5');
    await expect(page.locator('#metric-distance-display')).toContainText('Imaginary Action');
    await expect(page.locator('.matrix-status-tag')).toContainText('Coupled (Full Cross-Talk)');

    // Switch back to CDO-11 and lock direction
    console.log('[Test] Step 4: Re-selecting CDO-11 and locking direction');
    await page.locator('#dir-tab-cdo-11').click();
    await expect(page.locator('#current-direction-name')).toContainText('CDO-11');
    const lockBtn = page.locator('#lock-direction-btn');
    await lockBtn.click();
    await expect(lockBtn).toContainText('Locked to Sprint CDO-11');

    // Close modal
    console.log('[Test] Step 5: Closing Least Action Navigator modal');
    await page.locator('#least-action-close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('10. Responsive UI Lab: verify full-window workbench navigation from top control button and landing card link', async ({ page }) => {
    const labBtn = page.locator('#responsive-ui-lab-btn');
    const fullpageCardLink = page.locator('#responsive-ui-lab-fullpage-link');

    await expect(labBtn).toBeVisible();
    await expect(labBtn).toHaveAttribute('href', 'responsive-lab.html');
    await expect(fullpageCardLink).toBeVisible();
    await expect(fullpageCardLink).toHaveAttribute('href', 'responsive-lab.html');

    // Step 1: Navigate to Responsive UI Lab via top control button
    console.log('[Test] Step 1: Navigating to Responsive UI Lab full-window workbench via top button');
    await labBtn.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify full-window workbench URL and header
    expect(page.url()).toContain('responsive-lab.html');
    await expect(page.locator('#lab-main-heading')).toContainText('Responsive UI Lab');
    await expect(page.locator('.lab-badge')).toContainText('Full-Window Workbench');
    await expect(page.locator('#cors-notice-banner')).toBeVisible();
    await expect(page.locator('#cors-notice-banner')).toContainText('Full-Window Real-Estate');

    // Step 2: Return to Portal via back button
    console.log('[Test] Step 2: Returning to GovTech OS Portal via back button');
    await page.locator('#btn-back-home').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1')).toContainText('GovTech OS');

    // Step 3: Navigate to Responsive UI Lab via landing card link
    console.log('[Test] Step 3: Navigating to Responsive UI Lab full-window workbench via card link');
    await page.locator('#responsive-ui-lab-fullpage-link').click();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('responsive-lab.html');
    await expect(page.locator('#lab-main-heading')).toContainText('Responsive UI Lab');
  });

  test('11. Responsive UI Lab Viewport & Orientation Test Harness: full-window workbench orientation toggles, size presets, and iframe sandbox diagnostics', async ({ page }) => {
    // Navigate directly to responsive-lab.html
    console.log('[Test] Step 1: Loading Responsive UI Lab full-window workbench directly');
    await page.goto('/responsive-lab.html');
    await page.waitForLoadState('domcontentloaded');

    const workspaceContainer = page.locator('#lab-workspace-container');
    const controlledSizeController = page.locator('#controlled-size-controller');
    const controlledFrame = page.locator('#controlled-panel-frame');
    const controlledFrameDim = page.locator('#controlled-frame-dim');
    const controlledStatus = page.locator('#controlled-panel-status');
    const customWidthInput = page.locator('#controlled-width-input');
    const applyCustomWidthBtn = page.locator('#btn-apply-custom-width');
    const btnRotate = page.locator('#btn-rotate-viewport');
    const iframe = page.locator('#mission-control-iframe');
    const btnOrientVertical = page.locator('#btn-orient-vertical');
    const btnOrientHorizontal = page.locator('#btn-orient-horizontal');
    const btnArrangeHorizontal = page.locator('#btn-arrange-horizontal');
    const btnArrangeVertical = page.locator('#btn-arrange-vertical');
    const siteSelector = page.locator('#public-site-selector');
    const loadIframeBtn = page.locator('#btn-load-in-iframe');
    const corsBlockAlert = page.locator('#cors-block-alert');
    const corsBlockReason = page.locator('#cors-block-reason');
    const corsStatusPill = page.locator('#cors-status-pill');

    // Step 1: Verify full-window stage container and 100% screen real-estate
    await expect(page.locator('.lab-stage-container')).toBeVisible();
    await expect(controlledSizeController).toBeVisible();
    await expect(iframe).toHaveAttribute('src', 'app.html');
    await expect(corsStatusPill).toContainText('Controlled Viewport Active');

    // Step 2: Test Dual Workspace Arrangement (Side-by-Side Horizontal vs Stacked Vertical)
    console.log('[Test] Step 2a: Verifying default Horizontal (Side-by-Side) workspace arrangement');
    await expect(btnArrangeHorizontal).toHaveClass(/active/);
    await expect(workspaceContainer).toHaveClass(/arrangement-horizontal/);

    console.log('[Test] Step 2b: Switching to Vertical (Stacked) workspace arrangement');
    await btnArrangeVertical.click();
    await page.waitForTimeout(300);
    await expect(btnArrangeVertical).toHaveClass(/active/);
    await expect(workspaceContainer).toHaveClass(/arrangement-vertical/);

    console.log('[Test] Step 2c: Switching back to Horizontal (Side-by-Side) workspace arrangement');
    await btnArrangeHorizontal.click();
    await page.waitForTimeout(300);
    await expect(btnArrangeHorizontal).toHaveClass(/active/);
    await expect(workspaceContainer).toHaveClass(/arrangement-horizontal/);

    // Step 3: Test Horizontal (Landscape) Viewport Orientation & Capture Artifact
    console.log('[Test] Step 3: Activating Horizontal (Landscape) Viewport Orientation');
    await btnOrientHorizontal.click();
    await page.waitForTimeout(400);
    await expect(btnOrientHorizontal).toHaveClass(/active/);
    await expect(controlledFrame).toHaveClass(/orientation-horizontal/);
    await expect(controlledFrameDim).toContainText('Horizontal (Landscape)');
    await expect(controlledStatus).toContainText('Horizontal (Landscape)');

    // Set 1024px Desktop preset in Horizontal orientation arrangement with app.html
    await page.locator('#btn-size-desktop').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#btn-size-desktop')).toHaveClass(/active/);
    await expect(controlledFrameDim).toContainText('1024px');

    // Save visual screenshot artifact for Horizontal orientation arrangement
    await page.screenshot({ path: '/Users/bkoo/.gemini/antigravity-ide/brain/5a248492-2b93-4a68-b3a9-8cb161d32e58/responsive_ui_lab_horizontal_arrangement.png' });
    console.log('[Test] Visual screenshot artifact saved: responsive_ui_lab_horizontal_arrangement.png');

    // Step 4: Test Vertical (Portrait) Orientation Toggling
    console.log('[Test] Step 4a: Switching to Vertical (Portrait) orientation');
    await btnOrientVertical.click();
    await page.waitForTimeout(400);
    await expect(btnOrientVertical).toHaveClass(/active/);
    await expect(controlledFrame).toHaveClass(/orientation-vertical/);
    await expect(controlledFrameDim).toContainText('Vertical (Portrait)');

    console.log('[Test] Step 4b: Testing Rotate button');
    await btnRotate.click();
    await page.waitForTimeout(400);
    await expect(btnOrientHorizontal).toHaveClass(/active/);
    await expect(controlledFrame).toHaveClass(/orientation-horizontal/);

    await btnOrientVertical.click();
    await page.waitForTimeout(300);

    // Step 5: Test size presets on the full-window stage
    console.log('[Test] Step 5a: Testing Mobile Viewport (390px)');
    await page.locator('#btn-size-mobile').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#btn-size-mobile')).toHaveClass(/active/);
    await expect(controlledFrame).toHaveCSS('width', '390px');
    await expect(controlledFrameDim).toContainText('390px');

    console.log('[Test] Step 5b: Testing Tablet Viewport (768px)');
    await page.locator('#btn-size-tablet').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#btn-size-tablet')).toHaveClass(/active/);
    await expect(controlledFrame).toHaveCSS('width', '768px');
    await expect(controlledFrameDim).toContainText('768px');

    console.log('[Test] Step 5c: Testing Split Viewport (50%)');
    await page.locator('#btn-size-split').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#btn-size-split')).toHaveClass(/active/);
    await expect(controlledFrameDim).toContainText('50%');

    console.log('[Test] Step 5d: Testing Custom Width Input (850px)');
    await customWidthInput.fill('850');
    await applyCustomWidthBtn.click();
    await page.waitForTimeout(400);
    await expect(controlledFrame).toHaveCSS('width', '850px');
    await expect(controlledFrameDim).toContainText('850px');

    console.log('[Test] Step 5e: Resetting to Full Container Width (100%)');
    await page.locator('#btn-size-full').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#btn-size-full')).toHaveClass(/active/);
    await expect(controlledFrameDim).toContainText('100%');

    // Step 6: Test browser security boundary on iframe-incompatible pages
    console.log('[Test] Step 6: Testing browser sandbox boundary with GitHub (X-Frame-Options: DENY)');
    await siteSelector.selectOption('https://github.com');
    await loadIframeBtn.click();
    await page.waitForTimeout(600);

    // Verify browser security alert displays Desktop Tauri notice
    await expect(corsBlockAlert).toBeVisible();
    await expect(corsBlockReason).toContainText('X-Frame-Options: DENY');
    await expect(corsBlockAlert).toContainText('In Desktop mode (Tauri)');
    await expect(corsStatusPill).toContainText('Iframe Blocked');
  });

});

