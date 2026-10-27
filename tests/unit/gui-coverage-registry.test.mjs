import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  KNOWN_ZERO_TEST_EXCEPTIONS,
  countPlaywrightTests,
  evaluateDiscoveryResults
} from '../../scripts/check-playwright-discovery.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(ROOT_DIR, 'tests/gui-coverage.json');

const ALLOWED_TARGET_TYPES = new Set([
  'workbench',
  'spa',
  'mpa-candidate',
  'webapp',
  'probe-fixture',
  'internal-diagnostic',
  'legacy-catalog',
  'undecided'
]);

const WORKBENCH_ALLOWED_TYPES = new Set([
  'workbench',
  'internal-diagnostic',
  'legacy-catalog',
  'undecided'
]);

const TARGET_ALLOWED_TYPES = new Set([
  'spa',
  'mpa-candidate',
  'webapp',
  'probe-fixture',
  'undecided'
]);

const REQUIRED_P0_SPA_STEPS = [
  'select-spa-target',
  'choose-device-and-viewport',
  'exercise-functional-link',
  'capture-and-replay-journey',
  'inspect-mcard-result'
];

export function validateGuiCoverageRegistry(registry, { rootDir = ROOT_DIR, checkDiskFiles = true } = {}) {
  const errors = [];

  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    return { valid: false, errors: ['Registry must be a non-null JSON object'] };
  }

  if (!Array.isArray(registry.workbenchSurfaces) || registry.workbenchSurfaces.length === 0) {
    errors.push('workbenchSurfaces must be a non-empty array');
  }
  if (!Array.isArray(registry.targetSurfaces) || registry.targetSurfaces.length === 0) {
    errors.push('targetSurfaces must be a non-empty array');
  }
  if (!Array.isArray(registry.journeys) || registry.journeys.length === 0) {
    errors.push('journeys must be a non-empty array');
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const surfaceIds = new Set();
  const surfaceById = new Map();

  const checkClmUri = (label, routeHandle, clmTypeUri) => {
    if (typeof routeHandle !== 'string' || !routeHandle.trim()) {
      errors.push(`${label} is missing routeHandle`);
    }
    if (typeof clmTypeUri !== 'string' || !clmTypeUri.trim()) {
      errors.push(`${label} is missing clmTypeUri`);
    } else if (!clmTypeUri.startsWith('clm://type/') || clmTypeUri.startsWith('mcard:')) {
      errors.push(`${label} must use a clm://type/ URI for clmTypeUri, got "${clmTypeUri}"`);
    }
  };

  const validateSurface = (surface, expectedKind) => {
    const id = surface?.surfaceId;
    if (typeof id !== 'string' || !id.trim()) {
      errors.push(`Surface in ${expectedKind}Surfaces is missing surfaceId`);
      return;
    }
    if (surfaceIds.has(id)) {
      errors.push(`Duplicate surfaceId "${id}"`);
    }
    surfaceIds.add(id);
    surfaceById.set(id, surface);

    if (surface.surfaceKind !== expectedKind) {
      errors.push(`Surface "${id}" has surfaceKind "${surface.surfaceKind}", expected "${expectedKind}"`);
    }
    if (!ALLOWED_TARGET_TYPES.has(surface.targetType)) {
      errors.push(`Surface "${id}" has invalid targetType "${surface.targetType}"`);
    }
    if (expectedKind === 'workbench' && !WORKBENCH_ALLOWED_TYPES.has(surface.targetType)) {
      errors.push(`Workbench surface "${id}" conflates workbench with targetType "${surface.targetType}"`);
    }
    if (expectedKind === 'target' && !TARGET_ALLOWED_TYPES.has(surface.targetType)) {
      errors.push(`Target surface "${id}" conflates target with targetType "${surface.targetType}"`);
    }
    if (typeof surface.owner !== 'string' || !surface.owner.trim()) {
      errors.push(`Surface "${id}" is missing owner`);
    }
    if (typeof surface.docPath !== 'string' || !surface.docPath.trim()) {
      errors.push(`Surface "${id}" is missing docPath`);
    } else if (checkDiskFiles && !fs.existsSync(path.join(rootDir, surface.docPath))) {
      errors.push(`Surface "${id}" docPath does not exist on disk ("${surface.docPath}")`);
    }

    checkClmUri(`Surface "${id}"`, surface.routeHandle, surface.clmTypeUri);

    const isExternal = surface.locationKind === 'external-origin' || surface.locationKind === 'external-blocked';
    if (isExternal) {
      if (typeof surface.externalUrl !== 'string' || !/^https?:\/\//.test(surface.externalUrl)) {
        errors.push(`External surface "${id}" must declare an http(s) externalUrl`);
      }
    } else {
      if (typeof surface.pagePath !== 'string' || !surface.pagePath.trim()) {
        errors.push(`Surface "${id}" is missing pagePath`);
      } else if (surface.status === 'planned-gqc-02') {
        if (surface.targetSprint !== 'SPRINT-GQC-02') {
          errors.push(`Planned surface "${id}" must declare targetSprint "SPRINT-GQC-02"`);
        }
      } else if (checkDiskFiles && !fs.existsSync(path.join(rootDir, surface.pagePath))) {
        errors.push(`Surface "${id}" pagePath does not exist on disk ("${surface.pagePath}")`);
      }
    }

    if (surface.pagePath === 'app.html') {
      if (surface.p0 === true || surface.targetType === 'spa') {
        errors.push('app.html must remain non-P0 and unclassified (not spa) until Product Manager approval');
      }
    }
    if (surface.pagePath === 'index.html' && surface.targetType === 'spa') {
      errors.push('index.html single-page MCard viewer must not be classified as an spa target');
    }
    if (surface.targetType === 'mpa-candidate') {
      if (surface.optional !== true || surface.excludedFromP0Denominator !== true || surface.p0 === true) {
        errors.push(`MPA candidate surface "${id}" must be optional and excluded from P0 SPA denominator`);
      }
    }

    if (Array.isArray(surface.places)) {
      for (const place of surface.places) {
        checkClmUri(`Place "${place.placeId}" on "${id}"`, place.routeHandle, place.clmTypeUri);
      }
    }
  };

  for (const s of registry.workbenchSurfaces) validateSurface(s, 'workbench');
  for (const s of registry.targetSurfaces) validateSurface(s, 'target');

  const journeyIds = new Set();
  let p0SpaCount = 0;

  for (const journey of registry.journeys) {
    const jid = journey?.journeyId;
    if (typeof jid !== 'string' || !jid.trim()) {
      errors.push('Journey entry is missing journeyId');
      continue;
    }
    if (journeyIds.has(jid)) {
      errors.push(`Duplicate journeyId "${jid}"`);
    }
    journeyIds.add(jid);

    if (typeof journey.pagePath !== 'string' || !journey.pagePath.trim()) {
      errors.push(`Journey "${jid}" is missing pagePath`);
    }
    if (typeof journey.specPath !== 'string' || !journey.specPath.trim()) {
      errors.push(`Journey "${jid}" is missing specPath`);
    }
    if (typeof journey.owner !== 'string' || !journey.owner.trim()) {
      errors.push(`Journey "${jid}" is missing owner`);
    }

    const linkedSurface = surfaceById.get(journey.surfaceId);
    if (!linkedSurface) {
      errors.push(`Journey "${jid}" references unknown surfaceId "${journey.surfaceId}"`);
    } else if (linkedSurface.surfaceKind !== journey.surfaceKind || linkedSurface.targetType !== journey.targetType) {
      errors.push(`Journey "${jid}" conflates surfaceKind or targetType with surface "${journey.surfaceId}"`);
    }

    if (journey.status === 'planned-gqc-02') {
      if (journey.targetSprint !== 'SPRINT-GQC-02') {
        errors.push(`Planned journey "${jid}" must declare targetSprint "SPRINT-GQC-02"`);
      }
    } else if (checkDiskFiles) {
      if (journey.pagePath && !fs.existsSync(path.join(rootDir, journey.pagePath))) {
        errors.push(`Journey "${jid}" pagePath does not exist on disk ("${journey.pagePath}")`);
      }
      if (journey.specPath && !fs.existsSync(path.join(rootDir, journey.specPath))) {
        errors.push(`Journey "${jid}" specPath does not exist on disk ("${journey.specPath}")`);
      }
      for (const extraSpec of journey.additionalSpecPaths || []) {
        if (!fs.existsSync(path.join(rootDir, extraSpec))) {
          errors.push(`Journey "${jid}" additionalSpecPath does not exist on disk ("${extraSpec}")`);
        }
      }
    }

    if (journey.inP0SpaDenominator === true) {
      p0SpaCount += 1;
      if (journey.surfaceKind !== 'target' || journey.targetType !== 'spa') {
        errors.push(`P0 SPA denominator journey "${jid}" must target a target surface with targetType "spa"`);
      }
      if (!Array.isArray(journey.journeySteps)) {
        errors.push(`P0 SPA journey "${jid}" must declare journeySteps`);
      } else {
        for (const step of REQUIRED_P0_SPA_STEPS) {
          if (!journey.journeySteps.includes(step)) {
            errors.push(`P0 SPA journey "${jid}" is missing required step "${step}"`);
          }
        }
      }
    }

    if (journey.targetType === 'mpa-candidate' && (journey.inP0SpaDenominator === true || journey.optional !== true)) {
      errors.push(`MPA journey "${jid}" must remain optional and excluded from P0 SPA denominator`);
    }
  }

  if (registry.p0SpaDenominatorCount !== p0SpaCount) {
    errors.push(
      `p0SpaDenominatorCount (${registry.p0SpaDenominatorCount}) does not match P0 SPA journey count (${p0SpaCount})`
    );
  }

  if (checkDiskFiles) {
    const rootHtmlOnDisk = fs
      .readdirSync(rootDir)
      .filter((f) => f.endsWith('.html'))
      .sort();
    const registeredWorkbenchPages = new Set(registry.workbenchSurfaces.map((s) => s.pagePath));
    for (const htmlFile of rootHtmlOnDisk) {
      if (!registeredWorkbenchPages.has(htmlFile)) {
        errors.push(`Root HTML file "${htmlFile}" is missing from workbenchSurfaces`);
      }
    }

    const fixtureHtmlOnDisk = fs
      .readdirSync(path.join(rootDir, 'tests/fixtures'))
      .filter((f) => f.endsWith('.html'))
      .map((f) => `tests/fixtures/${f}`)
      .sort();
    const registeredTargetPages = new Set(registry.targetSurfaces.map((s) => s.pagePath).filter(Boolean));
    for (const fixtureFile of fixtureHtmlOnDisk) {
      if (!registeredTargetPages.has(fixtureFile)) {
        errors.push(`Fixture HTML file "${fixtureFile}" is missing from targetSurfaces`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function loadCommittedRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

test('committed tests/gui-coverage.json satisfies workbench/target separation and file existence contracts', () => {
  const registry = loadCommittedRegistry();
  const result = validateGuiCoverageRegistry(registry);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(registry.p0SpaDenominatorCount, 2);
});

test('validator rejects missing or non-existent pagePath', () => {
  const missingPage = structuredClone(loadCommittedRegistry());
  missingPage.workbenchSurfaces[0].pagePath = '';
  const res1 = validateGuiCoverageRegistry(missingPage);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some((e) => e.includes('missing pagePath')));

  const ghostPage = structuredClone(loadCommittedRegistry());
  ghostPage.workbenchSurfaces[0].pagePath = 'does-not-exist.html';
  const res2 = validateGuiCoverageRegistry(ghostPage);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.includes('pagePath does not exist on disk')));
});

test('validator rejects missing or non-existent specPath on active journeys', () => {
  const missingSpec = structuredClone(loadCommittedRegistry());
  const activeIdx = missingSpec.journeys.findIndex((j) => j.status === 'active');
  missingSpec.journeys[activeIdx].specPath = '';
  const res1 = validateGuiCoverageRegistry(missingSpec);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some((e) => e.includes('missing specPath')));

  const ghostSpec = structuredClone(loadCommittedRegistry());
  ghostSpec.journeys[activeIdx].specPath = 'tests/features/missing-file.spec.js';
  const res2 = validateGuiCoverageRegistry(ghostSpec);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.includes('specPath does not exist on disk')));
});

test('validator rejects duplicate journeyId and duplicate surfaceId', () => {
  const dupJourney = structuredClone(loadCommittedRegistry());
  dupJourney.journeys.push({ ...dupJourney.journeys[0] });
  const res1 = validateGuiCoverageRegistry(dupJourney);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some((e) => e.includes('Duplicate journeyId')));

  const dupSurface = structuredClone(loadCommittedRegistry());
  dupSurface.targetSurfaces.push({ ...dupSurface.targetSurfaces[0] });
  const res2 = validateGuiCoverageRegistry(dupSurface);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.includes('Duplicate surfaceId')));
});

test('validator rejects workbench/target conflation, app.html SPA promotion, mcard route handle as clmTypeUri, and MPA in P0 denominator', () => {
  const conflatedWorkbench = structuredClone(loadCommittedRegistry());
  conflatedWorkbench.workbenchSurfaces[0].targetType = 'spa';
  const res1 = validateGuiCoverageRegistry(conflatedWorkbench, { checkDiskFiles: false });
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some((e) => e.includes('conflates workbench')));

  const promotedApp = structuredClone(loadCommittedRegistry());
  const appTarget = promotedApp.targetSurfaces.find((s) => s.pagePath === 'app.html');
  appTarget.targetType = 'spa';
  const res2 = validateGuiCoverageRegistry(promotedApp, { checkDiskFiles: false });
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.includes('app.html must remain non-P0 and unclassified')));

  const badTypeUri = structuredClone(loadCommittedRegistry());
  badTypeUri.workbenchSurfaces[1].clmTypeUri = 'mcard:route:/index.html';
  const res3 = validateGuiCoverageRegistry(badTypeUri, { checkDiskFiles: false });
  assert.equal(res3.valid, false);
  assert.ok(res3.errors.some((e) => e.includes('clm://type/')));

  const mpaInP0 = structuredClone(loadCommittedRegistry());
  const mpaJourney = mpaInP0.journeys.find((j) => j.targetType === 'mpa-candidate');
  mpaJourney.inP0SpaDenominator = true;
  const res4 = validateGuiCoverageRegistry(mpaInP0, { checkDiskFiles: false });
  assert.equal(res4.valid, false);
  assert.ok(res4.errors.some((e) => e.includes('excluded from P0 SPA denominator')));
});

test('Playwright discovery evaluator enforces non-empty category projects, zero exceptions, and zero category overlap', () => {
  assert.deepEqual(KNOWN_ZERO_TEST_EXCEPTIONS, {});

  const healthy = [
    { project: 'smoke', testCount: 30, fileCount: 11, files: ['smoke/a.spec.js'], exitCode: 0, fatalErrors: [] },
    { project: 'components', testCount: 18, fileCount: 14, files: ['components/b.spec.js'], exitCode: 0, fatalErrors: [] },
    { project: 'features', testCount: 557, fileCount: 17, files: ['features/c.spec.js'], exitCode: 0, fatalErrors: [] }
  ];

  const okVerdict = evaluateDiscoveryResults(healthy);
  assert.equal(okVerdict.ok, true);
  assert.equal(okVerdict.warnings.length, 0);
  assert.equal(okVerdict.uniqueCategoryFiles, 42);

  const emptyComponents = [
    healthy[0],
    { project: 'components', testCount: 0, fileCount: 0, files: [], exitCode: 1, fatalErrors: [] },
    healthy[2]
  ];
  const failedComponents = evaluateDiscoveryResults(emptyComponents);
  assert.equal(failedComponents.ok, false);
  assert.ok(failedComponents.failures.some((f) => f.includes('components')));

  const overlappingCategories = [
    healthy[0],
    { project: 'components', testCount: 18, fileCount: 1, files: ['smoke/a.spec.js'], exitCode: 0, fatalErrors: [] },
    healthy[2]
  ];
  const overlapVerdict = evaluateDiscoveryResults(overlappingCategories);
  assert.equal(overlapVerdict.ok, false);
  assert.ok(overlapVerdict.failures.some((f) => f.includes('claimed by multiple category projects')));

  const withCrossBrowserRepeat = [
    ...healthy,
    {
      project: 'smoke-firefox',
      repeatsCategory: 'smoke',
      testCount: 30,
      fileCount: 11,
      files: ['smoke/a.spec.js'],
      exitCode: 0,
      fatalErrors: []
    }
  ];
  const repeatVerdict = evaluateDiscoveryResults(withCrossBrowserRepeat);
  assert.equal(repeatVerdict.ok, true);
  assert.equal(repeatVerdict.crossBrowserRepeatFiles, 11);

  const parsedCounts = countPlaywrightTests({
    suites: [
      {
        file: 'smoke/a.spec.js',
        specs: [{ file: 'smoke/a.spec.js', tests: [{}, {}] }]
      }
    ],
    errors: [{ message: 'Error: No tests found' }]
  });
  assert.deepEqual(parsedCounts, {
    testCount: 2,
    fileCount: 1,
    files: ['smoke/a.spec.js'],
    fatalErrors: []
  });
});
