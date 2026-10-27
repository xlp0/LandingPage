import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));
import { resolvePlaywrightServerContract } from './tests/fixtures/server-contract.js';

export const RETRY_POLICY = Object.freeze({
  globalRetries: 0,
  projects: Object.freeze({
    smoke: Object.freeze({
      localRetries: 0,
      ciRetries: 0,
      owner: 'TEA',
      reason: 'Deterministic route, landmark, and API smoke checks run with zero retries.',
    }),
    components: Object.freeze({
      localRetries: 0,
      ciRetries: 0,
      owner: 'TEA',
      reason: 'Isolated CLM component checks stub external HTTP boundaries and run with zero retries.',
    }),
    features: Object.freeze({
      localRetries: 0,
      ciRetries: 1,
      owner: 'TEA (SPRINT-GQC-02)',
      reason: 'Legacy feature journeys retain wall-clock waits and multi-context WebRTC handshakes until SPRINT-GQC-02 seam cleanup.',
    }),
  }),
});

export const SNAPSHOT_POLICY = Object.freeze({
  baselinePlatform: 'darwin',
  owner: 'Architect and TEA',
  reason: 'Committed fiber-conformance PNG baselines target Darwin arm64. Non-Darwin runners skip pixel comparison via ignoreSnapshots while executing all DOM and structural assertions.',
});

export const BROWSER_MATRIX = Object.freeze({
  pullRequest: Object.freeze(['Desktop Chrome']),
  scheduled: Object.freeze(['Desktop Chrome', 'Desktop Firefox', 'Desktop Safari']),
});

function isCiEnv(env) {
  return Boolean(env?.CI && env.CI !== '0' && env.CI !== 'false');
}

export function buildPlaywrightProjects(env = process.env) {
  const ci = isCiEnv(env);
  const projects = [
    {
      name: 'smoke',
      testDir: './tests/smoke',
      timeout: 60000,
      retries: RETRY_POLICY.projects.smoke.localRetries,
      metadata: { category: 'smoke' },
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'components',
      testDir: './tests/components',
      timeout: 60000,
      retries: RETRY_POLICY.projects.components.localRetries,
      metadata: { category: 'components' },
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'features',
      testDir: './tests/features',
      timeout: 120000,
      retries: ci ? RETRY_POLICY.projects.features.ciRetries : RETRY_POLICY.projects.features.localRetries,
      metadata: {
        category: 'features',
        retryOwner: RETRY_POLICY.projects.features.owner,
        retryReason: RETRY_POLICY.projects.features.reason,
      },
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ];

  if (env?.PW_CROSS_BROWSER === '1') {
    projects.push(
      {
        name: 'smoke-firefox',
        testDir: './tests/smoke',
        timeout: 30000,
        retries: 0,
        metadata: { category: 'cross-browser-repeat', repeatsCategory: 'smoke' },
        use: {
          ...devices['Desktop Firefox'],
        },
      },
      {
        name: 'smoke-webkit',
        testDir: './tests/smoke',
        timeout: 30000,
        retries: 0,
        metadata: { category: 'cross-browser-repeat', repeatsCategory: 'smoke' },
        use: {
          ...devices['Desktop Safari'],
        },
      }
    );
  }

  return projects;
}

export function createPlaywrightConfig(env = process.env, argv = process.argv, platform = process.platform) {
  const ci = isCiEnv(env);
  const serverContract = resolvePlaywrightServerContract({
    ...env,
    TEST_SERVER_COMMAND: env?.TEST_SERVER_COMMAND || 'npm run build:astro && node ws-server.js',
  });
  const slowMo = env?.SLOWMO
    ? parseInt(env.SLOWMO, 10)
    : env?.HEADED || argv.includes('--headed')
      ? 800
      : 0;

  return {
    testDir: './tests',
    testMatch: '**/*.spec.js',
    fullyParallel: false,
    forbidOnly: ci,
    retries: RETRY_POLICY.globalRetries,
    workers: ci ? 1 : undefined,
    ignoreSnapshots: platform !== SNAPSHOT_POLICY.baselinePlatform,
    reporter: [
      ['list'],
      ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ['junit', { outputFile: 'test-results/junit.xml' }],
    ],
    use: {
      baseURL: serverContract.baseURL,
      screenshot: 'only-on-failure',
      trace: 'retain-on-failure',
      launchOptions: {
        slowMo,
      },
    },
    projects: buildPlaywrightProjects(env),
    webServer: {
      command: serverContract.command,
      cwd: CONFIG_DIR,
      url: serverContract.url,
      reuseExistingServer: serverContract.reuseExistingServer,
      env: serverContract.env,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 500 },
      timeout: 30000,
    },
  };
}

export default defineConfig(createPlaywrightConfig(process.env, process.argv));
