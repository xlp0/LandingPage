import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BROWSER_MATRIX,
  RETRY_POLICY,
  SNAPSHOT_POLICY,
  buildPlaywrightProjects,
  createPlaywrightConfig,
} from '../../playwright.config.js';
import {
  KNOWN_ZERO_TEST_EXCEPTIONS,
  runPlaywrightDiscovery,
} from '../../scripts/check-playwright-discovery.mjs';
import { CLM_DASHBOARD_PATH } from '../fixtures/clm-helpers.js';
import {
  ASTRO_DEV_PORT,
  DEFAULT_TEST_SERVER_COMMAND,
  EXPRESS_DEFAULT_PORT,
  PLAYWRIGHT_DEFAULT_PORT,
  resolvePlaywrightServerContract,
} from '../fixtures/server-contract.js';
import {
  ROOT_PAGE_CHARACTERIZATIONS,
  resolveTestConfig,
} from '../fixtures/test-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

test('GQC-01-UNIT-01 configured Playwright projects partition specs cleanly, enforce retry and snapshot policies, and fail on unassigned zero-test projects', async () => {
  assert.deepEqual(KNOWN_ZERO_TEST_EXCEPTIONS, {});

  const defaultProjects = buildPlaywrightProjects({});
  assert.deepEqual(
    defaultProjects.map((project) => project.name),
    ['smoke', 'components', 'features']
  );

  const crossBrowserProjects = buildPlaywrightProjects({ PW_CROSS_BROWSER: '1' });
  assert.deepEqual(
    crossBrowserProjects.map((project) => project.name),
    ['smoke', 'components', 'features', 'smoke-firefox', 'smoke-webkit']
  );

  const localCfg = createPlaywrightConfig({}, ['node', 'playwright'], 'darwin');
  assert.equal(localCfg.retries, 0);
  assert.equal(localCfg.ignoreSnapshots, false);
  assert.deepEqual(
    localCfg.projects.map((project) => [project.name, project.retries]),
    [
      ['smoke', 0],
      ['components', 0],
      ['features', 0],
    ]
  );

  const ciLinuxCfg = createPlaywrightConfig({ CI: '1' }, ['node', 'playwright'], 'linux');
  assert.equal(ciLinuxCfg.retries, 0);
  assert.equal(ciLinuxCfg.ignoreSnapshots, true);
  assert.deepEqual(
    ciLinuxCfg.projects.map((project) => [project.name, project.retries]),
    [
      ['smoke', 0],
      ['components', 0],
      ['features', 1],
    ]
  );
  assert.equal(RETRY_POLICY.projects.features.owner, 'TEA (SPRINT-GQC-02)');
  assert.equal(SNAPSHOT_POLICY.owner, 'Architect and TEA');
  assert.deepEqual(BROWSER_MATRIX.pullRequest, ['Desktop Chrome']);

  const { projectResults, verdict } = await runPlaywrightDiscovery({ cwd: ROOT_DIR });
  assert.equal(verdict.ok, true, verdict.failures.join('; '));

  const byName = new Map(projectResults.map((entry) => [entry.project, entry]));
  assert.equal(byName.get('smoke')?.fileCount, 11);
  assert.equal(byName.get('components')?.fileCount, 14);
  assert.equal(byName.get('features')?.fileCount, 17);
  assert.equal(verdict.uniqueCategoryFiles, 42);

  for (const dir of ['tests/components', 'tests/smoke']) {
    const cjsLeftovers = fs
      .readdirSync(path.join(ROOT_DIR, dir))
      .filter((file) => file.endsWith('.cjs'));
    assert.deepEqual(cjsLeftovers, []);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc01-orphan-cfg-'));
  const tmpCfgPath = path.join(tmpDir, 'orphan.playwright.config.mjs');
  try {
    fs.writeFileSync(
      tmpCfgPath,
      [
        "export default {",
        "  testDir: './tests',",
        "  testMatch: '**/*.spec.js',",
        "  projects: [",
        "    { name: 'smoke', testDir: './tests/smoke' },",
        "    { name: 'components', testDir: './tests/components' },",
        "    { name: 'features', testDir: './tests/features' },",
        "    { name: 'orphan-zero-project', testDir: './tests/smoke', testMatch: '**/never-matches-*.spec.js' },",
        "  ],",
        "};",
      ].join('\n'),
      'utf8'
    );

    const orphanRun = await runPlaywrightDiscovery({ cwd: ROOT_DIR, configPath: tmpCfgPath });
    assert.equal(orphanRun.verdict.ok, false);
    assert.ok(
      orphanRun.verdict.failures.some((failure) => failure.includes('orphan-zero-project'))
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('GQC-01-UNIT-02 test-config and CLM helpers resolve URLs from TEST_PORT and BASE_URL and cover all seven root HTML surfaces', () => {
  const defaultConfig = resolveTestConfig({});
  assert.equal(defaultConfig.TEST_PORT, 3001);
  assert.equal(defaultConfig.EXPRESS_DEFAULT_PORT, 3000);
  assert.equal(defaultConfig.ASTRO_DEV_PORT, 4322);
  assert.equal(defaultConfig.BASE_URL, 'http://localhost:3001');
  assert.equal(
    defaultConfig.CLM_DASHBOARD_URL,
    `http://localhost:3001${CLM_DASHBOARD_PATH}`
  );

  const portOverrideConfig = resolveTestConfig({ TEST_PORT: '4123' });
  assert.equal(portOverrideConfig.TEST_PORT, 4123);
  assert.equal(portOverrideConfig.BASE_URL, 'http://localhost:4123');
  assert.equal(
    portOverrideConfig.CLM_DASHBOARD_URL,
    'http://localhost:4123/archive/html/index-clm-dashboard.html'
  );
  assert.equal(portOverrideConfig.APP_PAGE_URL, 'http://localhost:4123/app.html');

  const baseOverrideConfig = resolveTestConfig({
    TEST_PORT: '4123',
    BASE_URL: 'http://127.0.0.1:4555/',
  });
  assert.equal(baseOverrideConfig.BASE_URL, 'http://127.0.0.1:4555');
  assert.equal(
    baseOverrideConfig.RESPONSIVE_LAB_URL,
    'http://127.0.0.1:4555/responsive-lab.html'
  );

  for (const dir of ['tests/components', 'tests/smoke']) {
    for (const file of fs.readdirSync(path.join(ROOT_DIR, dir))) {
      if (!file.endsWith('.js')) continue;
      const source = fs.readFileSync(path.join(ROOT_DIR, dir, file), 'utf8');
      assert.equal(
        /localhost:3000|127\.0\.0\.1:3000/.test(source),
        false,
        `Found hardcoded port 3000 in ${dir}/${file}`
      );
    }
  }

  const registry = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'tests/gui-coverage.json'), 'utf8')
  );
  const workbenchPages = registry.workbenchSurfaces.map((surface) => surface.pagePath).sort();
  const characterizedPages = ROOT_PAGE_CHARACTERIZATIONS.map((entry) => entry.pagePath).sort();
  assert.deepEqual(characterizedPages, workbenchPages);
  assert.equal(ROOT_PAGE_CHARACTERIZATIONS.length, 7);

  const registeredSpecs = new Set();
  for (const journey of registry.journeys) {
    registeredSpecs.add(journey.specPath);
    for (const extra of journey.additionalSpecPaths || []) {
      registeredSpecs.add(extra);
    }
  }

  for (const entry of ROOT_PAGE_CHARACTERIZATIONS) {
    assert.equal(
      fs.existsSync(path.join(ROOT_DIR, entry.specPath)),
      true,
      `Missing characterization spec ${entry.specPath}`
    );
    assert.equal(
      registeredSpecs.has(entry.specPath),
      true,
      `Characterization spec ${entry.specPath} is not registered in tests/gui-coverage.json`
    );
  }
});

test('GQC-01-UNIT-03 server contract enforces Express default, port 3001, health readiness, CI reuse prohibition, isolated MCARD_DB_PATH, and Astro seam override', () => {
  const defaultContract = resolvePlaywrightServerContract({});
  assert.equal(defaultContract.command, DEFAULT_TEST_SERVER_COMMAND);
  assert.equal(defaultContract.command, 'node ws-server.js');
  assert.equal(defaultContract.port, PLAYWRIGHT_DEFAULT_PORT);
  assert.equal(defaultContract.port, 3001);
  assert.equal(defaultContract.expressDefaultPort, EXPRESS_DEFAULT_PORT);
  assert.equal(defaultContract.astroDevPort, ASTRO_DEV_PORT);
  assert.equal(defaultContract.url, 'http://localhost:3001/health');
  assert.equal(defaultContract.reuseExistingServer, false);
  assert.notEqual(
    path.resolve(defaultContract.mcardDbPath),
    path.join(ROOT_DIR, 'data', 'mcard-api.db')
  );

  const localOptIn = resolvePlaywrightServerContract({ PW_REUSE_SERVER: '1' });
  assert.equal(localOptIn.reuseExistingServer, true);

  const ciOverridesOptIn = resolvePlaywrightServerContract({
    CI: 'true',
    PW_REUSE_SERVER: '1',
  });
  assert.equal(ciOverridesOptIn.reuseExistingServer, false);

  const astroOverride = resolvePlaywrightServerContract({
    TEST_PORT: String(ASTRO_DEV_PORT),
    TEST_SERVER_COMMAND: 'npx astro dev --port 4322',
    MCARD_DB_PATH: path.join(os.tmpdir(), 'gqc01-custom-db', 'mcard.db'),
  });
  assert.equal(astroOverride.command, 'npx astro dev --port 4322');
  assert.equal(astroOverride.port, 4322);
  assert.equal(astroOverride.url, 'http://localhost:4322/health');
  assert.equal(astroOverride.reuseExistingServer, false);
  assert.equal(
    astroOverride.mcardDbPath,
    path.join(os.tmpdir(), 'gqc01-custom-db', 'mcard.db')
  );

  assert.throws(
    () =>
      resolvePlaywrightServerContract({
        MCARD_DB_PATH: path.join(ROOT_DIR, 'data', 'mcard-api.db'),
      }),
    /must not target the repository data\/mcard-api\.db/
  );
});
