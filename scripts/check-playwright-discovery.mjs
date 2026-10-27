import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const REQUIRED_PROJECTS = Object.freeze(['smoke', 'components', 'features']);

export const KNOWN_ZERO_TEST_EXCEPTIONS = Object.freeze({});

export const APPROVED_CROSS_BROWSER_REPEATS = Object.freeze({
  'smoke-firefox': 'smoke',
  'smoke-webkit': 'smoke',
});

export function countPlaywrightTests(report) {
  if (!report || typeof report !== 'object') {
    return {
      testCount: 0,
      fileCount: 0,
      files: [],
      fatalErrors: ['Invalid JSON output from Playwright --list'],
    };
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

  const sortedFiles = [...files].sort();
  return { testCount, fileCount: sortedFiles.length, files: sortedFiles, fatalErrors };
}

export async function loadConfiguredProjects({
  cwd = process.cwd(),
  configPath = path.join(cwd, 'playwright.config.js'),
} = {}) {
  const resolved = path.resolve(cwd, configPath);
  const configUrl = `${pathToFileURL(resolved).href}?t=${Date.now()}`;
  const mod = await import(configUrl);
  const config = mod?.default ?? mod;
  const projects = Array.isArray(config?.projects) ? config.projects : [];
  return projects.map((project) => ({
    name: String(project?.name || '').trim(),
    repeatsCategory:
      project?.metadata?.repeatsCategory ||
      APPROVED_CROSS_BROWSER_REPEATS[project?.name] ||
      null,
  }));
}

export function evaluateDiscoveryResults(
  projectResults,
  {
    requiredProjects = REQUIRED_PROJECTS,
    exceptions = KNOWN_ZERO_TEST_EXCEPTIONS,
    allowExceptions = false,
    approvedCrossBrowserRepeats = APPROVED_CROSS_BROWSER_REPEATS,
  } = {}
) {
  const summaries = [];
  const warnings = [];
  const failures = [];
  const seen = new Set();
  const categoryFileOwners = new Map();
  let uniqueCategoryFiles = 0;
  let crossBrowserRepeatFiles = 0;

  for (const item of projectResults) {
    const project = item?.project;
    if (typeof project !== 'string' || !project.trim()) {
      failures.push('Playwright discovery entry is missing a project name.');
      continue;
    }
    if (seen.has(project)) {
      failures.push(`Duplicate Playwright project name "${project}" in configuration`);
      continue;
    }
    seen.add(project);

    const files = Array.isArray(item.files) ? item.files : [];
    const testCount = Number(item.testCount ?? 0);
    const fileCount = Number(item.fileCount ?? files.length);
    const exitCode = Number(item.exitCode ?? 1);
    const fatalErrors = Array.isArray(item.fatalErrors) ? item.fatalErrors : [];
    const repeatsCategory = item.repeatsCategory || approvedCrossBrowserRepeats[project] || null;

    if (fatalErrors.length > 0) {
      failures.push(`${project} encountered a fatal discovery error (${fatalErrors.join(', ')})`);
      continue;
    }

    if (testCount <= 0 || fileCount <= 0) {
      const exception =
        allowExceptions && exceptions && Object.hasOwn(exceptions, project)
          ? exceptions[project]
          : null;
      if (exception) {
        summaries.push(
          `${project} discovered ${testCount} tests in ${fileCount} files (exception owned by ${exception.owner})`
        );
        warnings.push(
          `WARNING [${exception.owner}] Project "${project}" discovered 0 tests in 0 files. ${exception.reason}`
        );
      } else {
        summaries.push(`${project} discovered ${testCount} tests in ${fileCount} files`);
        failures.push(
          `${project} discovered ${testCount} tests in ${fileCount} files and has no approved exception`
        );
      }
      continue;
    }

    if (exitCode !== 0) {
      failures.push(`${project} exited with status ${exitCode}`);
      continue;
    }

    if (repeatsCategory) {
      crossBrowserRepeatFiles += fileCount;
      summaries.push(
        `${project} discovered ${testCount} tests in ${fileCount} files (cross-browser repeat of ${repeatsCategory})`
      );
    } else {
      uniqueCategoryFiles += fileCount;
      summaries.push(`${project} discovered ${testCount} tests in ${fileCount} files`);
      for (const specFile of files) {
        const existingOwner = categoryFileOwners.get(specFile);
        if (existingOwner && existingOwner !== project) {
          failures.push(
            `Spec file "${specFile}" is claimed by multiple category projects ("${existingOwner}" and "${project}")`
          );
        } else {
          categoryFileOwners.set(specFile, project);
        }
      }
    }
  }

  for (const required of requiredProjects) {
    if (!seen.has(required)) {
      failures.push(`${required} is missing from Playwright discovery results`);
    }
  }

  return {
    ok: failures.length === 0,
    uniqueCategoryFiles,
    crossBrowserRepeatFiles,
    summaries,
    warnings,
    failures,
  };
}

export async function runPlaywrightDiscovery({
  cwd = process.cwd(),
  configPath = path.join(cwd, 'playwright.config.js'),
  projects = null,
  allowExceptions = false,
} = {}) {
  const configured = projects
    ? projects.map((p) => (typeof p === 'string' ? { name: p, repeatsCategory: APPROVED_CROSS_BROWSER_REPEATS[p] || null } : p))
    : await loadConfiguredProjects({ cwd, configPath });

  if (configured.length === 0) {
    return {
      projectResults: [],
      verdict: {
        ok: false,
        uniqueCategoryFiles: 0,
        crossBrowserRepeatFiles: 0,
        summaries: [],
        warnings: [],
        failures: [`No Playwright projects configured in ${configPath}`],
      },
    };
  }

  const projectResults = [];

  for (const entry of configured) {
    const project = entry.name;
    const args = ['playwright', 'test', '--list', `--project=${project}`, '--reporter=json'];
    if (configPath && path.resolve(cwd, configPath) !== path.join(cwd, 'playwright.config.js')) {
      args.push(`--config=${configPath}`);
    }
    const proc = spawnSync('npx', args, { cwd, encoding: 'utf8' });

    let parsed = null;
    try {
      parsed = JSON.parse(proc.stdout || '');
    } catch {
      parsed = null;
    }

    const { testCount, fileCount, files, fatalErrors } = countPlaywrightTests(parsed);
    if (!parsed && proc.stderr) {
      fatalErrors.push(proc.stderr.trim().split('\n')[0]);
    }

    projectResults.push({
      project,
      repeatsCategory: entry.repeatsCategory,
      testCount,
      fileCount,
      files,
      exitCode: proc.status ?? 1,
      fatalErrors,
    });
  }

  return {
    projectResults,
    verdict: evaluateDiscoveryResults(projectResults, {
      requiredProjects: projects ? [] : REQUIRED_PROJECTS,
      allowExceptions,
    }),
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { verdict } = await runPlaywrightDiscovery();
  for (const line of verdict.summaries) {
    console.log(line);
  }
  console.log(
    `Category files total ${verdict.uniqueCategoryFiles} unique and ${verdict.crossBrowserRepeatFiles} cross-browser repeats`
  );
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
