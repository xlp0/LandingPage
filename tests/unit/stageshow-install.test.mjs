import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_CHECK_CSS_ARGS,
  isRootRelativeTarget,
  parseStageShowRunnerArgs,
  resolveDefaultCheckCssArgs
} from '../../scripts/stageshow/run.mjs';
import { resolvePlaywrightServerContract } from '../fixtures/server-contract.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools', 'stageshow');
const SKILL_DIR = path.join(ROOT_DIR, '.agents', 'skills', 'stageshow');

test('tools/stageshow UPSTREAM.json pins Stageshow 1.1.1 at verified commit', () => {
  const upstreamPath = path.join(TOOLS_DIR, 'UPSTREAM.json');
  const upstream = JSON.parse(fs.readFileSync(upstreamPath, 'utf8'));
  assert.equal(upstream.name, 'stageshow');
  assert.equal(upstream.version, '1.1.1');
  assert.equal(upstream.commit, '299140fafd08df55a9c234e610c3f64af3f45531');
  assert.equal(upstream.license, 'MIT');
});

test('.agents/skills/stageshow mirrors SKILL.md and all 15 reference guides', () => {
  const toolSkill = fs.readFileSync(path.join(TOOLS_DIR, 'SKILL.md'), 'utf8');
  const agentSkill = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
  assert.equal(agentSkill, toolSkill);

  const expectedRefs = [
    'annotations.md',
    'backgrounds.md',
    'bento.md',
    'brands.md',
    'choreography.md',
    'craft.md',
    'framing.md',
    'kit.md',
    'looks.md',
    'motion.md',
    'products.md',
    'rehearse.md',
    'review.md',
    'teaching.md',
    'verify.md'
  ];
  for (const refFile of expectedRefs) {
    assert.equal(
      fs.existsSync(path.join(SKILL_DIR, 'references', refFile)),
      true,
      `Missing .agents/skills/stageshow/references/${refFile}`
    );
  }
});

test('tools/stageshow kit and verification scripts exist locally', () => {
  for (const rel of [
    'kit/index.ts',
    'kit/phone.tsx',
    'kit/window.tsx',
    'kit/stage.tsx',
    'scripts/browser.mjs',
    'scripts/layout.mjs',
    'scripts/layout-core.mjs',
    'scripts/film.mjs',
    'scripts/film-checks.mjs',
    'scripts/jumps.mjs',
    'scripts/jumps-core.mjs',
    'scripts/class-clash.mjs',
    'scripts/class-clash-core.mjs'
  ]) {
    assert.equal(fs.existsSync(path.join(TOOLS_DIR, rel)), true, `Missing tools/stageshow/${rel}`);
  }
});

test('scripts/stageshow/run.mjs parses runner arguments and enforces production DB refusal', () => {
  assert.equal(isRootRelativeTarget('/responsive-lab.html'), true);
  assert.equal(isRootRelativeTarget('//evil.example/test'), false);
  assert.equal(isRootRelativeTarget('http://127.0.0.1:3001/responsive-lab.html'), false);

  const layoutParsed = parseStageShowRunnerArgs(['layout', '--width', '390', '/responsive-lab.html']);
  assert.equal(layoutParsed.command, 'layout');
  assert.equal(layoutParsed.target, '/responsive-lab.html');
  assert.equal(layoutParsed.targetIndex, 2);

  const sweepParsed = parseStageShowRunnerArgs(['sweep', '--strict', '--output-dir=stageshow-output/custom']);
  assert.equal(sweepParsed.command, 'sweep');
  assert.equal(sweepParsed.strict, true);
  assert.equal(sweepParsed.outputDir, 'stageshow-output/custom');

  assert.deepEqual(resolveDefaultCheckCssArgs([]), [...DEFAULT_CHECK_CSS_ARGS]);
  assert.throws(
    () => resolvePlaywrightServerContract({ MCARD_DB_PATH: path.join(ROOT_DIR, 'data', 'mcard-api.db') }),
    /must not target the repository data\/mcard-api\.db/
  );
});

test('npm run stageshow:check-css executes without class collisions', () => {
  const out = execFileSync(process.execPath, ['scripts/stageshow/run.mjs', 'check-css'], {
    cwd: ROOT_DIR,
    encoding: 'utf8'
  });
  assert.match(out, /no overlapping class namespaces detected/);
});
