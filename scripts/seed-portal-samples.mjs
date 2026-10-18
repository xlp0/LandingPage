#!/usr/bin/env node
/**
 * SMR-09 — Deterministic generator for the single-page & external-portal samples.
 *
 * Writes `data/samples/portal_samples.mcard.db` through the same canonical Triad
 * store the API uses (one record law, no second schema) plus a declarative
 * `data/samples/portal_samples_manifest.yaml` describing each sample's target URL,
 * pinned snapshot hash, and four-class viewport budgets.
 *
 * Determinism: the card hash is content-only, and every row is stamped with the
 * fixed `STAMP`, so re-running reproduces the same database.
 *
 * Usage: node scripts/seed-portal-samples.mjs [--db <file>] [--manifest <file>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

import { CanonicalTriadBackend, formatGTime, hashContent } from '../server/mcard-api.mjs';

export const STAMP = '2026-10-18T00:00:00.000Z';
export const ALGORITHM = 'blake3';

/** Four responsive classes the corpus is engineered to exercise. */
export const VIEWPORTS = {
  cellphone: { width: 375, height: 812, max_bytes: 180 * 1024 },
  laptop: { width: 1440, height: 900, max_bytes: 512 * 1024 },
  desktop: { width: 1920, height: 1080, max_bytes: 768 * 1024 },
  wearable: { width: 198, height: 242, max_bytes: 120 * 1024 },
};

const ALL_VIEWPORTS = Object.keys(VIEWPORTS);
const GLANCE_VIEWPORTS = ['wearable', 'cellphone'];

/**
 * The six canonical samples. External samples carry a descriptive live URL plus a
 * deterministic local fixture; CI never fetches a public site.
 */
export const SAMPLES = [
  {
    handle: 'urn:mcard:content:landing_sample:pkc_sovereign_hero',
    label: 'PKC Sovereign Hero',
    kind: 'inline',
    url: null,
    viewports: ALL_VIEWPORTS,
    content: [
      '# PKC Sovereign Knowledge Portal',
      '',
      'A single page held as one MCard. Every revision is a new content-addressed',
      'record; the handle always resolves to the current one.',
      '',
      '- One page, one handle: `urn:mcard:content:landing_page`',
      '- Hash law: `card.hash = hex(H(content))`, algorithm declared in `g_time`',
    ].join('\n'),
  },
  {
    handle: 'urn:mcard:content:landing_sample:govtech_civic_portal',
    label: 'GovTech Civic Portal',
    kind: 'external',
    url: 'https://example.gov/civic',
    fixture: 'frameable',
    viewports: ALL_VIEWPORTS,
    content: [
      '<section class="civic-grid">',
      '  <h1>GovTech Civic Services</h1>',
      '  <div class="card-grid"><article>Permits</article><article>Records</article><article>Payments</article></div>',
      '</section>',
    ].join('\n'),
  },
  {
    handle: 'urn:mcard:content:landing_sample:mdn_docs_portal',
    label: 'MDN Documentation Portal',
    kind: 'external',
    url: 'https://developer.mozilla.org/',
    fixture: 'csp-frame-ancestors',
    viewports: ALL_VIEWPORTS,
    content: [
      '# Documentation Portal Snapshot',
      '',
      'Fixture declares `CSP frame-ancestors`, so the membrane falls back to this',
      'pinned snapshot instead of rendering a blank iframe.',
    ].join('\n'),
  },
  {
    handle: 'urn:mcard:content:landing_sample:github_org_portal',
    label: 'GitHub Organization Portal',
    kind: 'external',
    url: 'https://github.com/',
    fixture: 'x-frame-options-deny',
    viewports: ALL_VIEWPORTS,
    content: [
      '# Organization Portal Snapshot',
      '',
      'Fixture declares `X-Frame-Options: DENY`; the Sovereign Snapshot Gateway Card',
      'is shown with a launch CTA.',
    ].join('\n'),
  },
  {
    handle: 'urn:mcard:content:landing_sample:open_wikimedia_portal',
    label: 'Open Wikimedia Portal',
    kind: 'external',
    url: 'https://www.wikipedia.org/',
    fixture: 'frameable',
    viewports: ALL_VIEWPORTS,
    content: [
      '<article class="wiki-portal"><h1>Open Wikimedia Portal</h1>',
      '<p>Frameable fixture with responsive mobile/desktop adaptation.</p></article>',
    ].join('\n'),
  },
  {
    handle: 'urn:mcard:content:landing_sample:wearable_glance_portal',
    label: 'Wearable Glance Portal',
    kind: 'inline',
    url: null,
    viewports: GLANCE_VIEWPORTS,
    content: [
      '# Glance',
      '',
      'Compact telemetry for 198x242 and 375x812 viewports:',
      '',
      '- steps 4,182 · hr 62 · focus 3',
      '- touch targets >= 48px',
    ].join('\n'),
  },
];

/** Seeds the corpus and writes the manifest. Returns the manifest object. */
export function seed({
  dbFile = path.join(process.cwd(), 'data', 'samples', 'portal_samples.mcard.db'),
  manifestFile = path.join(process.cwd(), 'data', 'samples', 'portal_samples_manifest.yaml'),
  stamp = STAMP,
} = {}) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });

  const store = new CanonicalTriadBackend(dbFile);
  const gTime = formatGTime(ALGORITHM, stamp);
  const entries = [];
  try {
    for (const sample of SAMPLES) {
      const { hash } = store.put(sample.content, { gTime });
      store.bindHandle(sample.handle, hash);
      entries.push({
        handle: sample.handle,
        label: sample.label,
        kind: sample.kind,
        url: sample.url,
        fixture: sample.fixture ?? null,
        snapshot_hash: hash,
        content_bytes: Buffer.byteLength(sample.content, 'utf8'),
        viewports: Object.fromEntries(sample.viewports.map((name) => [name, VIEWPORTS[name]])),
      });
    }
  } finally {
    store.close();
  }

  const manifest = {
    generator: 'LandingPage/scripts/seed-portal-samples.mjs',
    generated_at: stamp,
    hash_algorithm: ALGORITHM,
    schema: 'card(hash, content, g_time) · handle_registry · handle_history',
    sample_count: entries.length,
    samples: entries,
  };
  fs.writeFileSync(manifestFile, yaml.dump(manifest, { lineWidth: 100, noRefs: true }));
  // JSON mirror for the browser (the HUD sample switcher reads it); the YAML stays
  // the declarative record for CI and docs. One generator, one catalog.
  fs.writeFileSync(manifestFile.replace(/\.ya?ml$/, '.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

/** Verifies a seeded corpus against its manifest. */
export function verify({ dbFile, manifestFile }) {
  const manifest = yaml.load(fs.readFileSync(manifestFile, 'utf8'));
  const store = new CanonicalTriadBackend(dbFile);
  try {
    const problems = [];
    for (const sample of manifest.samples) {
      const bound = store.resolveHandle(sample.handle);
      if (bound !== sample.snapshot_hash) problems.push(`${sample.handle}: handle resolves to ${bound}`);
      const card = store.get(sample.snapshot_hash);
      if (!card) problems.push(`${sample.handle}: snapshot card missing`);
      else if (!card.verified) problems.push(`${sample.handle}: digest does not recompute`);
      else if (hashContent(card.content, card.algorithm) !== sample.snapshot_hash) {
        problems.push(`${sample.handle}: content-only hash mismatch`);
      }
      if (!Object.keys(sample.viewports ?? {}).length) problems.push(`${sample.handle}: no viewport budget`);
    }
    return { ok: problems.length === 0, problems, samples: manifest.samples.length };
  } finally {
    store.close();
  }
}

const invokedDirectly =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? fallback : argv[index + 1];
  };
  const dbFile = flag('db', path.join(process.cwd(), 'data', 'samples', 'portal_samples.mcard.db'));
  const manifestFile = flag('manifest', path.join(process.cwd(), 'data', 'samples', 'portal_samples_manifest.yaml'));
  const manifest = seed({ dbFile, manifestFile });
  const result = verify({ dbFile, manifestFile });
  console.log(`seeded ${manifest.sample_count} samples into ${dbFile}`);
  console.log(result.ok ? 'verification: PASS' : `verification: FAIL\n${result.problems.join('\n')}`);
  process.exit(result.ok ? 0 : 1);
}
