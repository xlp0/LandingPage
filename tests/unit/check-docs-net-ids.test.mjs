import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ALLOWLIST_SCHEMA,
  DEFAULT_ROOT_DIR,
  MAINTAINED_DOC_SET_ENTRYPOINTS,
  validateLinkAllowlist,
  checkMarkdownFiles,
  checkVersionAndPortContracts,
  checkDomainAndOwnershipContracts,
  checkWorkbenchNetFreshness,
  checkDocs
} from '../../scripts/check-docs.mjs';
import { generateWorkbenchNetDocs } from '../../scripts/gen-net-docs.mjs';

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc07-docs-test-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeRel(rootDir, relPath, content) {
  const abs = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}

describe('GQC-07 documentation alignment and gate contracts', () => {
  it('GQC-07-UNIT-01: parses Markdown links, package scripts, Playwright projects, and passes on clean checkout', () => {
    const repoResult = checkDocs({
      rootDir: DEFAULT_ROOT_DIR,
      now: new Date('2026-10-28T12:00:00Z')
    });
    assert.equal(repoResult.ok, true, repoResult.errors.join('\n'));
    assert.ok(repoResult.filesChecked >= 229);
    assert.equal(repoResult.allowlistCount, 14);

    withTempDir((tmpDir) => {
      writeRel(
        tmpDir,
        'package.json',
        JSON.stringify({
          name: 'fixture-docs',
          scripts: { build: 'echo ok', 'test:smoke': 'echo smoke' },
          dependencies: { 'clm-kernel': '0.0.13' }
        })
      );
      writeRel(tmpDir, 'docs/guide.md', '# Guide\n\nSee [Target](./target.md) and run `npm run build` or `npx playwright test --project=smoke`.\n');
      writeRel(tmpDir, 'docs/target.md', '# Target\n\nContent.\n');

      const clean = checkDocs({ rootDir: tmpDir, enforceRepoContracts: false });
      assert.equal(clean.ok, true, clean.errors.join('\n'));

      writeRel(
        tmpDir,
        'docs/broken-commands.md',
        [
          '# Broken Commands',
          '',
          'Run `npm run nonexistent:script` first.',
          'Then run `npx playwright test --project=imaginary`.',
          'Avoid [Local File](file:///Users/dev/project/README.md).'
        ].join('\n')
      );
      writeRel(tmpDir, 'docs/empty.md', '');

      const broken = checkDocs({ rootDir: tmpDir, enforceRepoContracts: false });
      assert.equal(broken.ok, false);
      assert.ok(broken.errors.some((e) => e.includes('docs/broken-commands.md:3') && e.includes('npm run nonexistent:script')));
      assert.ok(broken.errors.some((e) => e.includes('docs/broken-commands.md:4') && e.includes('--project=imaginary')));
      assert.ok(broken.errors.some((e) => e.includes('docs/broken-commands.md:5') && e.includes('file://')));
      assert.ok(broken.errors.some((e) => e.includes('docs/empty.md:1') && e.includes('zero-byte')));
    });
  });

  it('GQC-07-UNIT-02: verifies kernel version consensus and server/test/Astro port ownership', () => {
    const repoCheck = checkVersionAndPortContracts(DEFAULT_ROOT_DIR);
    assert.deepEqual(repoCheck.errors, []);
    assert.equal(repoCheck.expectedKernel, '0.0.13');

    withTempDir((tmpDir) => {
      writeRel(
        tmpDir,
        'package.json',
        JSON.stringify({ dependencies: { 'clm-kernel': '0.0.13' } })
      );
      writeRel(
        tmpDir,
        'package-lock.json',
        JSON.stringify({ packages: { 'node_modules/clm-kernel': { version: '0.0.13' } } })
      );
      writeRel(tmpDir, 'server/mcard-modality.mjs', "export const KERNEL_PROVENANCE = 'clm-kernel@0.0.10';\n");
      writeRel(tmpDir, 'js/harness/recorder.js', "export const DEFAULT_CLM_KERNEL_VERSION = '0.0.10';\n");
      writeRel(tmpDir, 'README.md', '# Root\nPort 3001 only.\n');
      writeRel(tmpDir, 'docs/00-getting-started/START_HERE.md', '# Start\nPort 3000 and 3001 and 4322 with clm-kernel@0.0.13.\n');
      writeRel(tmpDir, 'tests/README.md', '# Tests\nPort 3000, 3001, 4322 with clm-kernel@0.0.13.\n');

      const mismatch = checkVersionAndPortContracts(tmpDir);
      assert.ok(mismatch.errors.some((e) => e.includes('server/mcard-modality.mjs')));
      assert.ok(mismatch.errors.some((e) => e.includes('js/harness/recorder.js')));
      assert.ok(mismatch.errors.some((e) => e.includes('README.md') && e.includes('3000')));
      assert.ok(mismatch.errors.some((e) => e.includes('README.md') && e.includes('4322')));

      writeRel(tmpDir, 'docs/stale-version.md', '# Stale\nUses `clm-kernel@0.0.9` today.\n');
      writeRel(tmpDir, 'docs/labeled-historical.md', '# Historical Note\nGraduated SMO sprints recorded `clm-kernel@0.0.10` as historical provenance.\n');
      const mdCheck = checkMarkdownFiles({ rootDir: tmpDir });
      assert.ok(mdCheck.errors.some((e) => e.includes('docs/stale-version.md:2')));
      assert.ok(!mdCheck.errors.some((e) => e.includes('docs/labeled-historical.md')));
    });
  });

  it('GQC-07-UNIT-04: verifies Audience/Owner/Source metadata, Page-as-Place and Functional-Link-as-Transition domain map, and optional PenPot MPA scope', () => {
    const domainRes = checkDomainAndOwnershipContracts(DEFAULT_ROOT_DIR);
    assert.deepEqual(domainRes.errors, []);

    withTempDir((tmpDir) => {
      for (const relPath of MAINTAINED_DOC_SET_ENTRYPOINTS) {
        writeRel(
          tmpDir,
          relPath,
          '# Doc\n| Field | Value |\n| --- | --- |\n| Audience | Engineers |\n| BMAD Owner | Architect |\n| Source of Truth | package.json |\n'
        );
      }
      writeRel(tmpDir, 'README.md', '# Root\nNo owner metadata here.\n');
      writeRel(tmpDir, 'docs/01-architecture/landing-page-architecture.md', '# Arch\nAudience: Dev\nBMAD Owner: Architect\nSource of Truth: ws-server.js\nMissing Place and Transition contracts.\n');
      writeRel(tmpDir, 'docs/01-architecture/astro-host-and-islands.md', '# Astro\nAudience: Dev\nBMAD Owner: Architect\nSource of Truth: astro.config.mjs\nMissing Vitest note and islands.\n');

      const failing = checkDomainAndOwnershipContracts(tmpDir);
      assert.ok(failing.errors.some((e) => e.includes('README.md') && e.includes('Audience')));
      assert.ok(failing.errors.some((e) => e.includes('landing-page-architecture.md') && e.includes('PlaceMCard')));
      assert.ok(failing.errors.some((e) => e.includes('landing-page-architecture.md') && e.includes('PenPot MPA')));
      assert.ok(failing.errors.some((e) => e.includes('astro-host-and-islands.md') && e.includes('Vitest')));
      assert.ok(failing.errors.some((e) => e.includes('astro-host-and-islands.md') && e.includes('SpaTestWorkflow')));
    });
  });

  it('GQC-07-INT-01: CLI fails non-zero with exact file:line on broken links and rejects directory-wide, wildcard, or expired allowlist entries', () => {
    const badAllowlist = validateLinkAllowlist(
      {
        schema: ALLOWLIST_SCHEMA,
        excludeDirectories: ['docs/sprints/'],
        exceptions: [
          {
            file: 'docs/sprints/01-architecture/',
            target: '../../../../README.md',
            owner: 'Architect',
            reason: 'Directory exclusion attempt',
            reviewBy: '2027-06-30'
          },
          {
            file: 'docs/sprints/01-architecture/*.md',
            target: '../*',
            owner: 'Architect',
            reason: 'Wildcard attempt',
            reviewBy: '2025-01-01'
          },
          {
            file: 'docs/01-architecture/README.md',
            target: './missing.md',
            owner: 'Architect',
            reason: 'Maintained doc in allowlist',
            reviewBy: '2027-06-30'
          }
        ]
      },
      { now: new Date('2026-10-28T00:00:00Z') }
    );

    assert.equal(badAllowlist.valid, false);
    assert.ok(badAllowlist.errors.some((e) => e.includes('excludeDirectories')));
    assert.ok(badAllowlist.errors.some((e) => e.includes('directory-wide')));
    assert.ok(badAllowlist.errors.some((e) => e.includes('wildcard pattern')));
    assert.ok(badAllowlist.errors.some((e) => e.includes('expired on 2025-01-01')));
    assert.ok(badAllowlist.errors.some((e) => e.includes('maintained guide')));

    withTempDir((tmpDir) => {
      writeRel(tmpDir, 'package.json', JSON.stringify({ scripts: {}, dependencies: { 'clm-kernel': '0.0.13' } }));
      writeRel(tmpDir, 'docs/guide.md', '# Guide\n\nLine three has a [Broken Link](./does-not-exist.md) right here.\n');
      writeRel(tmpDir, 'docs/sprints/old-sprint.md', '# Sprint\n\nUnlisted [Missing Archive](../unlisted-archive.md).\n');
      writeRel(
        tmpDir,
        'scripts/docs-link-allowlist.json',
        JSON.stringify({ schema: ALLOWLIST_SCHEMA, exceptions: [] })
      );

      const runnerScript = `
        import { checkDocs } from ${JSON.stringify(path.join(DEFAULT_ROOT_DIR, 'scripts/check-docs.mjs'))};
        const res = checkDocs({ rootDir: ${JSON.stringify(tmpDir)}, enforceRepoContracts: false });
        if (!res.ok) {
          for (const err of res.errors) console.error('[docs:check] FAIL ' + err);
          process.exit(1);
        }
      `;
      const proc = spawnSync(process.execPath, ['--input-type=module', '-e', runnerScript], {
        encoding: 'utf8'
      });
      assert.equal(proc.status, 1);
      assert.match(proc.stderr, /docs\/guide\.md:3: broken local Markdown link "\.\/does-not-exist\.md"/);
      assert.match(proc.stderr, /docs\/sprints\/old-sprint\.md:3: broken local Markdown link "\.\.\/unlisted-archive\.md"/);
    });

    const workflowYml = fs.readFileSync(
      path.join(DEFAULT_ROOT_DIR, '.github/workflows/playwright-quality.yml'),
      'utf8'
    );
    assert.match(workflowYml, /npm run check:net/);
    assert.match(workflowYml, /node scripts\/check-package-source-parity\.mjs/);
    assert.match(workflowYml, /npm run docs:check/);
    assert.match(workflowYml, /npm run build/);
  });

  it('GQC-07-UNIT-05: fails when a maintained doc names an unknown Place or Transition ID and identifies file, line, and ID', () => {
    withTempDir((tmpDir) => {
      fs.cpSync(
        path.join(DEFAULT_ROOT_DIR, 'src/net/workbench-net.yaml'),
        path.join(tmpDir, 'src/net/workbench-net.yaml'),
        { recursive: true }
      );
      fs.cpSync(
        path.join(DEFAULT_ROOT_DIR, 'tests/fixtures/spa-test-target.graph.json'),
        path.join(tmpDir, 'tests/fixtures/spa-test-target.graph.json'),
        { recursive: true }
      );
      writeRel(tmpDir, 'package.json', JSON.stringify({ scripts: {}, dependencies: { 'clm-kernel': '0.0.13' } }));
      writeRel(
        tmpDir,
        'docs/01-architecture/sample-net-doc.md',
        [
          '# Sample Net Guide',
          '',
          'Valid IDs include `p_page_responsive_lab`, `p_spa_overview`, `t_spa_open_details`, and `p_error_modal`.',
          'Line four names `p_unknown_ghost_place` which no net declares.',
          'Line five names `t_unknown_ghost_transition` which no net declares.'
        ].join('\n')
      );

      const res = checkDocs({ rootDir: tmpDir, enforceRepoContracts: false });
      assert.equal(res.ok, false);
      assert.ok(
        res.errors.some(
          (e) =>
            e.includes('docs/01-architecture/sample-net-doc.md:4') &&
            e.includes('p_unknown_ghost_place')
        ),
        res.errors.join('\n')
      );
      assert.ok(
        res.errors.some(
          (e) =>
            e.includes('docs/01-architecture/sample-net-doc.md:5') &&
            e.includes('t_unknown_ghost_transition')
        ),
        res.errors.join('\n')
      );
    });
  });

  it('GQC-07-UNIT-06: fails staleness check when workbench-net.yaml changes without regenerating workbench-net.md', () => {
    assert.deepEqual(checkWorkbenchNetFreshness(DEFAULT_ROOT_DIR).errors, []);

    withTempDir((tmpDir) => {
      const srcYaml = fs.readFileSync(
        path.join(DEFAULT_ROOT_DIR, 'src/net/workbench-net.yaml'),
        'utf8'
      );
      writeRel(tmpDir, 'src/net/workbench-net.yaml', srcYaml);
      generateWorkbenchNetDocs({ rootDir: tmpDir, write: true });
      assert.deepEqual(checkWorkbenchNetFreshness(tmpDir).errors, []);

      const mutatedYaml = srcYaml.replaceAll(
        't_redirect_index_to_lab',
        't_redirect_index_to_lab_mutated'
      );
      assert.notEqual(mutatedYaml, srcYaml);
      writeRel(tmpDir, 'src/net/workbench-net.yaml', mutatedYaml);

      const staleRes = checkWorkbenchNetFreshness(tmpDir);
      assert.equal(staleRes.errors.length, 1);
      assert.match(staleRes.errors[0], /docs\/01-architecture\/workbench-net\.md:1: .*stale/);

      generateWorkbenchNetDocs({ rootDir: tmpDir, write: true });
      assert.deepEqual(checkWorkbenchNetFreshness(tmpDir).errors, []);
    });
  });
});
