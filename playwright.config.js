import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration
 * 
 * Uses Node WebSocket server (port 3000) which serves:
 * - Static files via express.static()
 * - API endpoints (/api/clm/registry, /api/env, etc.)
 * 
 * Projects:
 * - smoke: Fast navigation tests (~15s)
 * - components: CLM component tests (~60s)
 * - features: Deep feature tests (~120s)
 * - chromium: Default browser (all tests)
 * 
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL - WebSocket server on port 3000 */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for different test categories */
  projects: [
    // ═══════════════════════════════════════════════════════════════
    // SMOKE TESTS - Fast navigation validation (~15 seconds)
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'smoke',
      testDir: './tests/smoke',
      timeout: 30000,
      retries: 0,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPONENT TESTS - CLM component isolation (~60 seconds)
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'components',
      testDir: './tests/components',
      timeout: 60000,
      retries: 1,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // FEATURE TESTS - Deep feature testing (~120 seconds)
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'features',
      testDir: './tests/features',
      timeout: 120000,
      retries: 2,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT - Chromium browser (all tests)
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run Node WebSocket server before starting tests */
  webServer: {
    command: 'node ws-server.js',
    port: 3000,
    reuseExistingServer: false,  // Always start fresh to avoid stale server issues
    timeout: 30000,
  },
});
