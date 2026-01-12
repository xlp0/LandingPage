import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration
 * 
 * Projects:
 * - smoke: Fast navigation tests (~15s)
 * - components: CLM component tests (~60s)
 * - features: Deep feature tests (~120s)
 * - chromium: Default browser (runs all tests)
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
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8000',

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

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'python3 -m http.server 8000',
    port: 8000,
    reuseExistingServer: !process.env.CI,
  },
});
