#!/usr/bin/env node
/**
 * check-penpot-declaration.mjs
 * Sprint CDO-15: Deliverable DV-CDO-15-01
 * Lint that compares navigation.penpot_file in mcard.yaml against the filesystem
 * and fails when the declared file is absent (INV-CDO-11, INV-CDO-08).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

function findUnitDir(startDir) {
  let cur = path.resolve(startDir);
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(cur, 'mcard.yaml');
    if (fs.existsSync(candidate)) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

function parsePenpotDeclaration(yamlContent) {
  // Simple, robust YAML parser for the navigation block
  const lines = yamlContent.split('\n');
  let inNav = false;
  let penpotFile = null;
  let penpotInstance = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^navigation\s*:/.test(line)) {
      inNav = true;
      continue;
    }
    if (inNav) {
      if (/^[a-zA-Z0-9_-]+\s*:/.test(line) && !line.startsWith(' ') && !line.startsWith('\t')) {
        inNav = false;
        continue;
      }
      const fileMatch = trimmed.match(/^penpot_file\s*:\s*["']?([^"']+)["']?/);
      if (fileMatch) {
        penpotFile = fileMatch[1].trim();
      }
      const instMatch = trimmed.match(/^penpot_instance\s*:\s*["']?([^"']+)["']?/);
      if (instMatch) {
        penpotInstance = instMatch[1].trim();
      }
    }
  }

  return { penpotFile, penpotInstance };
}

export function checkDeclaration(unitPath = process.cwd()) {
  let resolvedUnit = path.resolve(unitPath);
  if (!fs.existsSync(path.join(resolvedUnit, 'mcard.yaml'))) {
    const found = findUnitDir(resolvedUnit);
    if (found) {
      resolvedUnit = found;
    } else {
      const lp = path.join(resolvedUnit, 'LandingPage');
      if (fs.existsSync(path.join(lp, 'mcard.yaml'))) {
        resolvedUnit = lp;
      }
    }
  }

  const manifestPath = path.join(resolvedUnit, 'mcard.yaml');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ [check-penpot-declaration] Error: mcard.yaml not found at ${manifestPath}`);
    return { ok: false, error: 'MANIFEST_NOT_FOUND', manifestPath };
  }

  const content = fs.readFileSync(manifestPath, 'utf8');
  const { penpotFile, penpotInstance } = parsePenpotDeclaration(content);

  if (!penpotFile) {
    console.log(`ℹ️ [check-penpot-declaration] No navigation.penpot_file declared in ${manifestPath}. Clean.`);
    return { ok: true, declared: false, manifestPath };
  }

  const fullPenpotPath = path.resolve(resolvedUnit, penpotFile);
  const exists = fs.existsSync(fullPenpotPath);

  if (!exists) {
    console.error(`❌ [check-penpot-declaration] FAIL (dangling declaration; INV-CDO-11, INV-CDO-08):`);
    console.error(`   Manifest: ${manifestPath}`);
    console.error(`   Declared navigation.penpot_file: ${penpotFile}`);
    console.error(`   Expected file missing on disk:   ${fullPenpotPath}`);
    return {
      ok: false,
      error: 'DANGLING_DECLARATION',
      manifestPath,
      penpotFile,
      fullPenpotPath,
    };
  }

  const stat = fs.statSync(fullPenpotPath);
  console.log(`✅ [check-penpot-declaration] PASS: navigation.penpot_file declaration matches filesystem`);
  console.log(`   File: ${fullPenpotPath} (${stat.size} bytes)`);
  console.log(`   Instance target: ${penpotInstance || 'default'}`);

  return {
    ok: true,
    declared: true,
    manifestPath,
    penpotFile,
    fullPenpotPath,
    sizeBytes: stat.size,
  };
}

if (process.argv[1] && process.argv[1].endsWith('check-penpot-declaration.mjs')) {
  const target = process.argv[2] || process.cwd();
  const res = checkDeclaration(target);
  process.exit(res.ok ? 0 : 1);
}
