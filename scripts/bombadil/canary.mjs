#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CANARY_PATH, FIXTURE_PATH, renderCanary } from './make-canary.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUNNER = path.join(REPO_ROOT, 'scripts/bombadil/run.mjs');
const VIOLATION_EXIT_CODE = 2;
export const EXPECTED_PROPERTY = 'hashMatchesPlace';

export function parseCanaryArgs(argv) {
  const options = { runs: 5, minViolations: 4, timeLimit: '2m' };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split('=');
    const value = inline ?? argv[++i];
    if (flag === '--runs') options.runs = Number(value);
    else if (flag === '--min-violations') options.minViolations = Number(value);
    else if (flag === '--time-limit') options.timeLimit = value;
    else throw new Error(`Unknown canary option "${flag}".`);
  }
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer.');
  if (!Number.isInteger(options.minViolations) || options.minViolations < 1 || options.minViolations > options.runs) {
    throw new Error('--min-violations must be an integer from 1 to --runs.');
  }
  return options;
}

function parseTraceLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    // A run killed mid-write leaves a truncated last line.
    return null;
  }
}

export function violatedProperties(traceFile) {
  if (!fs.existsSync(traceFile)) return [];
  return fs
    .readFileSync(traceFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(parseTraceLine)
    .flatMap((state) => state?.violations ?? [])
    .map((violation) => violation.name);
}

export function isDetection(exitCode, properties) {
  return exitCode === VIOLATION_EXIT_CODE && properties.includes(EXPECTED_PROPERTY);
}

function assertCanaryCurrent() {
  const expected = renderCanary(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  if (!fs.existsSync(CANARY_PATH) || fs.readFileSync(CANARY_PATH, 'utf8') !== expected) {
    throw new Error('The canary fixture is stale. Run node scripts/bombadil/make-canary.mjs first.');
  }
}

function runOnce(timeLimit, outputDir) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [RUNNER, 'spa-canary', '--time-limit', timeLimit, '--output-path', outputDir], {
      cwd: REPO_ROOT,
      stdio: 'inherit'
    });
    child.once('exit', (code) => resolve(code ?? 1));
    child.once('error', () => resolve(1));
  });
}

async function main(argv) {
  const options = parseCanaryArgs(argv);
  assertCanaryCurrent();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let detected = 0;
  for (let run = 1; run <= options.runs; run += 1) {
    const outputDir = path.join(REPO_ROOT, 'bombadil-output', `spa-canary-${stamp}-run${run}`);
    const code = await runOnce(options.timeLimit, outputDir);
    const properties = violatedProperties(path.join(outputDir, 'trace.jsonl'));
    const found = properties.includes(EXPECTED_PROPERTY);
    if (isDetection(code, properties)) detected += 1;
    console.error(`[canary] run ${run}: exit ${code}, ${EXPECTED_PROPERTY} ${found ? 'violated' : 'not violated'}`);
  }
  console.error(`[canary] detected in ${detected} of ${options.runs} runs, need ${options.minViolations}`);
  process.exitCode = detected >= options.minViolations ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`[canary] ${error.message}`);
    process.exitCode = 1;
  });
}
