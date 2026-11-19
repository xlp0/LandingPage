#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FIXTURE_PATH = path.join(REPO_ROOT, 'tests/fixtures/spa-test-target.html');
export const CANARY_PATH = path.join(REPO_ROOT, 'tests/bombadil/fixtures/spa-test-target-canary.html');
// The listener ends at the `});` indented like its first line; a nested `});` inside it is
// indented deeper and must not end the match.
const POPSTATE_LISTENER = /\n([ \t]*)window\.addEventListener\('popstate', \(\) => \{\n[\s\S]*?\n\1\}\);\n/;
const CANARY_MARK = "\n    // Canary: the popstate listener is removed on purpose. See SPRINT-BPV-00.\n";

export function renderCanary(fixtureSource) {
  const matches = fixtureSource.match(new RegExp(POPSTATE_LISTENER.source, 'g')) ?? [];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one popstate listener in the SPA fixture, found ${matches.length}.`);
  }
  return fixtureSource.replace(POPSTATE_LISTENER, CANARY_MARK);
}

function main(argv) {
  const expected = renderCanary(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  if (argv.includes('--check')) {
    const current = fs.existsSync(CANARY_PATH) ? fs.readFileSync(CANARY_PATH, 'utf8') : '';
    if (current !== expected) {
      console.error('[canary] tests/bombadil/fixtures/spa-test-target-canary.html is stale. Run node scripts/bombadil/make-canary.mjs.');
      process.exitCode = 1;
    }
    return;
  }
  fs.writeFileSync(CANARY_PATH, expected);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2));
}
