#!/usr/bin/env node
/**
 * Explicit consumer pull for coordinator sprint display and witness projections (FRO-02 / INV-FRO-03).
 *
 * Usage:
 *   node LandingPage/scripts/pull-registry-projection.mjs --source <file-or-url> [--witness-source <file-or-url>] [--check]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LANDING_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_REGISTRY = path.join(LANDING_ROOT, 'clm-registry.yaml');
const DEFAULT_WITNESS = path.join(LANDING_ROOT, 'public', 'conformance', 'witness.json');

function parseArgs(argv) {
  const opts = {
    source: null,
    witnessSource: null,
    registry: DEFAULT_REGISTRY,
    witnessDest: DEFAULT_WITNESS,
    check: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--check') opts.check = true;
    else if (a === '--source' && argv[i + 1]) opts.source = argv[++i];
    else if (a === '--witness-source' && argv[i + 1]) opts.witnessSource = argv[++i];
    else if (a === '--registry' && argv[i + 1]) opts.registry = path.resolve(argv[++i]);
    else if (a === '--witness-dest' && argv[i + 1]) opts.witnessDest = path.resolve(argv[++i]);
  }
  return opts;
}

function isUrl(spec) {
  return /^https?:\/\//i.test(spec);
}

async function readTextSource(spec) {
  if (isUrl(spec)) {
    const res = await fetch(spec);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${spec}`);
    return await res.text();
  }
  const p = path.resolve(spec);
  return fs.readFileSync(p, 'utf8');
}

async function readBytesSourceIfPresent(spec) {
  if (!spec) return null;
  if (isUrl(spec)) {
    const res = await fetch(spec);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${spec}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const p = path.resolve(spec);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

function stripTopLevelSection(text, key) {
  const re = new RegExp(`^${key}:.*?(?=^[A-Za-z_][\\w-]*:|(?![\\s\\S]))`, 'gms');
  return text.replace(re, '');
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function siblingWitness(source) {
  if (isUrl(source)) {
    return new URL('witness-projection.json', source).toString();
  }
  return path.join(path.dirname(path.resolve(source)), 'witness-projection.json');
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.source) {
  console.error('Usage: pull-registry-projection.mjs --source <file-or-url> [--witness-source <file-or-url>] [--check]');
  process.exit(2);
}

const rawJson = await readTextSource(opts.source);
const doc = JSON.parse(rawJson);
if (!Array.isArray(doc.sprints) || !doc.projection_provenance || typeof doc.projection_provenance !== 'object') {
  console.error(`Invalid projection payload in ${opts.source}: expected sprints[] and projection_provenance{}`);
  process.exit(1);
}

const regText = fs.readFileSync(opts.registry, 'utf8');
const witnessSpec = opts.witnessSource || siblingWitness(opts.source);
const witnessBytes = await readBytesSourceIfPresent(witnessSpec);

const errors = [];
if (opts.check) {
  const parsed = yaml.load(regText) || {};
  const gotSprints = JSON.stringify(parsed.sprints ?? null);
  const wantSprints = JSON.stringify(doc.sprints);
  if (gotSprints !== wantSprints) {
    errors.push('LandingPage/clm-registry.yaml sprints[] differs from --source');
  }
  const gotProv = JSON.stringify(parsed.projection_provenance ?? null);
  const wantProv = JSON.stringify(doc.projection_provenance);
  if (gotProv !== wantProv) {
    errors.push('LandingPage/clm-registry.yaml projection_provenance differs from --source');
  }
  if (witnessBytes) {
    if (!fs.existsSync(opts.witnessDest)) {
      errors.push('LandingPage/public/conformance/witness.json is missing');
    } else if (sha256(fs.readFileSync(opts.witnessDest)) !== sha256(witnessBytes)) {
      errors.push('LandingPage/public/conformance/witness.json differs from witness source');
    }
  }
} else {
  const stripped = stripTopLevelSection(stripTopLevelSection(regText, 'sprints'), 'projection_provenance').replace(/\n+$/, '');
  const sprintsYaml = yaml.dump({ sprints: doc.sprints }, { lineWidth: -1, noRefs: true, indent: 2 }).trimEnd();
  const provYaml = yaml.dump({ projection_provenance: doc.projection_provenance }, { lineWidth: -1, noRefs: true, indent: 2 }).trimEnd();
  const nextText = `${stripped}\n\n${sprintsYaml}\n\n${provYaml}\n`;
  fs.writeFileSync(opts.registry, nextText, 'utf8');
  if (witnessBytes) {
    fs.mkdirSync(path.dirname(opts.witnessDest), { recursive: true });
    fs.writeFileSync(opts.witnessDest, witnessBytes);
  }
}

console.log(`── pull-registry-projection: ${doc.sprints.length} sprint(s) from ${opts.source}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.log('pull-registry-projection: FAIL');
  process.exit(1);
}
console.log('pull-registry-projection: PASS');
