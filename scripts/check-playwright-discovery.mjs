import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const REQUIRED_PROJECTS = Object.freeze(['smoke', 'components', 'features']);

export const KNOWN_ZERO_TEST_EXCEPTIONS = Object.freeze({
  components: Object.freeze({
    owner: 'SPRINT-GQC-01',
    reason:
      'playwright.config.js matches "**/*.spec.js" while 14 component specs use ".spec.cjs". SPRINT-GQC-01 restores component discovery and removes this exception.'
  })
});

export function countPlaywrightTests(report) {
  if (!report || typeof report !== 'object') {
    return { testCount: 0, fileCount: 0, fatalErrors: ['Invalid JSON output from Playwright --list'] };
  }

  const files = new Set();
  let testCount = 0;

  function visitSuite(suite) {
    if (!suite || typeof suite !== 'object') return;
    if (typeof suite.file === 'string' && suite.file.length > 0) {
      files.add(suite.file);
    }
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        if (typeof spec?.file === 'string' && spec.file.length > 0) {
          files.add(spec.file);
        }
        const testsLen = Array.isArray(spec?.tests) ? spec.tests.length : 0;
        testCount += testsLen > 0 ? testsLen : 1;
      }
    }
    if (Array.isArray(suite.suites)) {
      for (const child of suite.suites) {
        visitSuite(child);
      }
    }
  }

  if (Array.isArray(report.suites)) {
    for (const suite of report.suites) {
      visitSuite(suite);
    }
  }

  const fatalErrors = [];
  if (Array.isArray(report.errors)) {
    for (const err of report.errors) {
      const msg = String(err?.message || '').trim();
      if (msg && !/^Error:\s*No tests found$/i.test(msg)) {
        fatalErrors.push(msg);
      }
    }
  }

  return { testCount, fileCount: files.size, fatalErrors };
}

export function evaluateDiscoveryResults(
  projectResults,
  {
    requiredProjects = REQUIRED_PROJECTS,
    exceptions = KNOWN_ZERO_TEST_EXCEPTIONS,
    allowExceptions = true
  } = {}
) {
  const summaries = [];
  const warnings = [];
  const failures = [];
  const seen = new Set();

  for (const item of projectResults) {
    const project = item?.project;
    if (typeof project !== 'string' || !project.trim()) {
      failures.push('Playwright discovery entry is missing a project name.');
      continue;
    }
    seen.add(project);

    const testCount = Number(item.testCount ?? 0);
    const fileCount = Number(item.fileCount ?? 0);
    const exitCode = Number(item.exitCode ?? 1);
    const fatalErrors = Array.isArray(item.fatalErrors) ? item.fatalErrors : [];

    if (fatalErrors.length > 0) {
      failures.push(`${project} encountered a fatal discovery error (${fatalErrors.join(', ')})`);
      continue;
    }

    if (testCount <= 0 || fileCount <= 0) {
      const exception = allowExceptions && exceptions && Object.hasOwn(exceptions, project) ? exceptions[project] : null;
      if (exception) {
        summaries.push(`${project}: ${testCount} tests in ${fileCount} files (exception owned by ${exception.owner})`);
        warnings.push(
          `WARNING [${exception.owner}] Project "${project}" discovered 0 tests in 0 files. ${exception.reason}`
        );
      } else {
        summaries.push(`${project}: ${testCount} tests in ${fileCount} files`);
        failures.push(`${project} discovered ${testCount} tests in ${fileCount} files and has no approved exception`);
      }
      continue;
    }

    if (exitCode !== 0) {
      failures.push(`${project} exited with status ${exitCode}`);
      continue;
    }

    summaries.push(`${project}: ${testCount} tests in ${fileCount} files`);
  }

  for (const required of requiredProjects) {
    if (!seen.has(required)) {
      failures.push(`${required} is missing from Playwright discovery results`);
    }
  }

  return {
    ok: failures.length === 0,
    summaries,
    warnings,
    failures
  };
}

export function runPlaywrightDiscovery({
  cwd = process.cwd(),
  projects = REQUIRED_PROJECTS,
  allowExceptions = true
} = {}) {
  const projectResults = [];

  for (const project of projects) {
    const proc = spawnSync(
      'npx',
      ['playwright', 'test', '--list', `--project=${project}`, '--reporter=json'],
      { cwd, encoding: 'utf8' }
    );

    let parsed = null;
    try {
      parsed = JSON.parse(proc.stdout || '');
    } catch {
      parsed = null;
    }

    const { testCount, fileCount, fatalErrors } = countPlaywrightTests(parsed);
    if (!parsed && proc.stderr) {
      fatalErrors.push(proc.stderr.trim().split('\n')[0]);
    }

    projectResults.push({
      project,
      testCount,
      fileCount,
      exitCode: proc.status ?? 1,
      fatalErrors
    });
  }

  return {
    projectResults,
    verdict: evaluateDiscoveryResults(projectResults, { allowExceptions })
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { verdict } = runPlaywrightDiscovery();
  for (const line of verdict.summaries) {
    console.log(line);
  }
  for (const warning of verdict.warnings) {
    console.warn(warning);
  }
  if (!verdict.ok) {
    for (const failure of verdict.failures) {
      console.error(`ERROR ${failure}`);
    }
    process.exit(1);
  }
}
