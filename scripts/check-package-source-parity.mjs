import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sha256File(absPath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}

function stripAstroFrontmatterPreservingLines(src) {
  const match = src.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (!match) return src;
  const replaced = match[0].replace(/[^\n]/g, ' ');
  return replaced + src.slice(match[0].length);
}

function stripJsCommentsPreservingLines(src) {
  let out = '';
  let i = 0;
  let state = 'code';
  let quote = '';
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (state === 'code') {
      if (ch === '/' && next === '/') {
        out += '  ';
        i += 2;
        state = 'line-comment';
        continue;
      }
      if (ch === '/' && next === '*') {
        out += '  ';
        i += 2;
        state = 'block-comment';
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        state = 'string';
        quote = ch;
        out += ch;
        i += 1;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }
    if (state === 'line-comment') {
      if (ch === '\n') {
        out += '\n';
        state = 'code';
      } else {
        out += ' ';
      }
      i += 1;
      continue;
    }
    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        out += '  ';
        i += 2;
        state = 'code';
        continue;
      }
      out += ch === '\n' ? '\n' : ' ';
      i += 1;
      continue;
    }
    if (state === 'string') {
      if (ch === '\\') {
        out += ch + (next || '');
        i += 2;
        continue;
      }
      if (ch === quote) {
        state = 'code';
        quote = '';
      }
      out += ch;
      i += 1;
    }
  }
  return out;
}

function walkClientFiles(dirAbs, out = []) {
  if (!fs.existsSync(dirAbs)) return out;
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const full = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      walkClientFiles(full, out);
    } else if (/\.(js|jsx|mjs|ts|tsx|astro)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function lineAtOffset(src, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < src.length; i += 1) {
    if (src[i] === '\n') line += 1;
  }
  return line;
}

function normalizeEndpointPath(rawEndpoint) {
  const withoutQuery = rawEndpoint.split('?')[0].split('#')[0].trim();
  if (withoutQuery.startsWith('./')) {
    return '/' + withoutQuery.slice(2);
  }
  return withoutQuery;
}

function collectSameFileStringBindings(cleanSrc) {
  const bindings = new Map();
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(['"`])([^'"`$\n]+)\2/g;
  let m;
  while ((m = re.exec(cleanSrc)) !== null) {
    bindings.set(m[1], m[3]);
  }
  return bindings;
}

function extractBalancedCallSlice(src, openParenIdx) {
  let depth = 0;
  let i = openParenIdx;
  let quote = '';
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (quote) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === quote) quote = '';
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        return src.slice(openParenIdx + 1, i);
      }
    }
    i += 1;
  }
  return src.slice(openParenIdx + 1, openParenIdx + 240);
}

function resolveArgEndpoint(argText, bindings) {
  const trimmed = argText.trim();
  const lit = trimmed.match(/^(['"])([^'"]+)\1/);
  if (lit) return lit[2];
  const tpl = trimmed.match(/^`([^$`]+)(?:\$\{[\s\S]*\}[\s\S]*)?`/);
  if (tpl) return tpl[1];
  const ident = trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*[,)])?/);
  if (ident && bindings.has(ident[1])) {
    return bindings.get(ident[1]);
  }
  return null;
}

export function checkPackageSourceParity({
  rootDir = DEFAULT_ROOT,
  manifestPath = path.join(rootDir, 'scripts', 'package-source-parity.json')
} = {}) {
  const errors = [];
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (!Array.isArray(manifest.migratedPairIds) || manifest.migratedPairIds.length > manifest.migratedPairLimit) {
    errors.push(`Migrated pair count ${manifest.migratedPairIds?.length} exceeds limit ${manifest.migratedPairLimit}`);
  }

  const normalizedRoot = path.resolve(rootDir);

  for (const pair of manifest.sourcePairs || []) {
    if (!pair.classification || !pair.owner) {
      errors.push(`Pair ${pair.id} missing classification or owner`);
      continue;
    }
    if (pair.classification === 'shared-source') {
      const canonicalAbs = path.resolve(rootDir, pair.canonicalSource.path);
      const browserAbs = path.resolve(rootDir, pair.browserEntry.path);
      if (!fs.existsSync(canonicalAbs)) {
        errors.push(`Missing canonical source ${pair.canonicalSource.path}`);
        continue;
      }
      if (!fs.existsSync(browserAbs)) {
        errors.push(`Missing browser entry ${pair.browserEntry.path}`);
        continue;
      }
      const actualCanonicalSha = sha256File(canonicalAbs);
      if (actualCanonicalSha !== pair.canonicalSource.sha256) {
        errors.push(`Canonical source SHA mismatch for ${pair.canonicalSource.path}: expected ${pair.canonicalSource.sha256}, got ${actualCanonicalSha}`);
      }
      const actualBrowserSha = sha256File(browserAbs);
      if (actualBrowserSha !== pair.browserEntry.sha256) {
        errors.push(`Browser entry SHA mismatch for ${pair.browserEntry.path}: expected ${pair.browserEntry.sha256}, got ${actualBrowserSha}`);
      }
      const browserSrc = fs.readFileSync(browserAbs, 'utf8');
      if (!browserSrc.includes(pair.browserEntry.expectedReExportTarget)) {
        errors.push(`Browser entry ${pair.browserEntry.path} does not re-export ${pair.browserEntry.expectedReExportTarget}`);
      }
      const resolvedTarget = path.resolve(path.dirname(browserAbs), pair.browserEntry.expectedReExportTarget);
      if (!resolvedTarget.startsWith(normalizedRoot + path.sep)) {
        errors.push(`Browser entry ${pair.browserEntry.path} escapes repository root: ${resolvedTarget}`);
      }
      if (resolvedTarget !== canonicalAbs) {
        errors.push(`Browser entry ${pair.browserEntry.path} target ${resolvedTarget} does not resolve to ${canonicalAbs}`);
      }
      const pkgJsonAbs = path.resolve(rootDir, pair.packageMeta.packageJson);
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonAbs, 'utf8'));
      if (pkgJson.exports?.['.'] !== pair.packageMeta.exportsDot) {
        errors.push(`Package ${pair.packageMeta.packageName} exports["."] mismatch: expected ${pair.packageMeta.exportsDot}, got ${pkgJson.exports?.['.']}`);
      }
    } else if (pair.classification === 'separate-product-variant') {
      const appAbs = path.resolve(rootDir, pair.appVariant.path);
      const pkgAbs = path.resolve(rootDir, pair.packageVariant.path);
      if (!fs.existsSync(appAbs) || !fs.existsSync(pkgAbs)) {
        errors.push(`Missing variant file for ${pair.id}`);
        continue;
      }
      const appSha = sha256File(appAbs);
      const pkgSha = sha256File(pkgAbs);
      if (appSha !== pair.appVariant.sha256) {
        errors.push(`App variant SHA mismatch for ${pair.appVariant.path}: expected ${pair.appVariant.sha256}, got ${appSha}`);
      }
      if (pkgSha !== pair.packageVariant.sha256) {
        errors.push(`Package variant SHA mismatch for ${pair.packageVariant.path}: expected ${pair.packageVariant.sha256}, got ${pkgSha}`);
      }
    } else if (pair.classification === 'unmigrated-exact-copy-gated' || pair.classification === 'unused-package-copy') {
      for (const copy of pair.exactCopies || []) {
        const appAbs = path.resolve(rootDir, copy.appPath);
        const pkgAbs = path.resolve(rootDir, copy.packagePath);
        if (!fs.existsSync(appAbs) || !fs.existsSync(pkgAbs)) {
          errors.push(`Missing exact copy member for ${pair.id}: ${copy.appPath} or ${copy.packagePath}`);
          continue;
        }
        const appSha = sha256File(appAbs);
        const pkgSha = sha256File(pkgAbs);
        if (appSha !== pkgSha) {
          errors.push(`Exact copy drift detected between ${copy.appPath} (${appSha}) and ${copy.packagePath} (${pkgSha})`);
        }
        if (appSha !== copy.sha256) {
          errors.push(`Exact copy SHA mismatch for ${copy.appPath}: expected ${copy.sha256}, got ${appSha}`);
        }
      }
    } else {
      errors.push(`Unknown pair classification ${pair.classification} on ${pair.id}`);
    }
  }

  return { ok: errors.length === 0, errors, pairCount: (manifest.sourcePairs || []).length };
}

export function checkServerOwnershipParity({
  rootDir = DEFAULT_ROOT,
  manifestPath = path.join(rootDir, 'scripts', 'package-source-parity.json')
} = {}) {
  const errors = [];
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const ownership = manifest.serverOwnership;
  if (!ownership) {
    return { ok: false, errors: ['Missing serverOwnership block in package-source-parity.json'] };
  }

  const rootServerAbs = path.resolve(rootDir, ownership.variants.rootServer.path);
  const pkgServerAbs = path.resolve(rootDir, ownership.variants.packageServer.path);

  const rootSha = sha256File(rootServerAbs);
  const pkgSha = sha256File(pkgServerAbs);

  if (rootSha !== ownership.variants.rootServer.sha256) {
    errors.push(`Root server SHA changed unexpectedly: expected ${ownership.variants.rootServer.sha256}, got ${rootSha}`);
  }
  if (pkgSha !== ownership.variants.packageServer.sha256) {
    errors.push(`Package server SHA changed unexpectedly: expected ${ownership.variants.packageServer.sha256}, got ${pkgSha}`);
  }

  const rootSrc = fs.readFileSync(rootServerAbs, 'utf8');
  const pkgSrc = fs.readFileSync(pkgServerAbs, 'utf8');

  if (!rootSrc.includes("dist', 'server', 'entry.mjs'") && !rootSrc.includes('dist/server/entry.mjs')) {
    errors.push('Root ws-server.js missing Astro SSR entry mount');
  }
  if (pkgSrc.includes('entry.mjs') || ownership.packagedServerServesAstro !== false) {
    errors.push('Package ws-server.js Astro mount state contradicts ownership manifest');
  }

  return { ok: errors.length === 0, errors };
}

export function checkUiServerCallCoverage({
  rootDir = DEFAULT_ROOT,
  scanDirs = ['src', 'js/harness'],
  envelopePath = path.join(rootDir, 'src', 'net', 'workbench-net.yaml')
} = {}) {
  const errors = [];
  const checkedCalls = [];
  const doc = YAML.parse(fs.readFileSync(envelopePath, 'utf8'));
  const transitions = doc?.bindings?.transitions || {};
  const staticAssets = new Set(
    (doc?.bindings?.staticJsonAssets || []).map((item) =>
      typeof item === 'string'
        ? `GET ${item}`
        : `${String(item?.httpMethod || 'GET').toUpperCase()} ${item?.httpPath || ''}`
    )
  );

  const declaredUiCalls = new Set();
  for (const binding of Object.values(transitions)) {
    if (binding?.kind === 'server-call-request' && binding.httpMethod && binding.httpPath) {
      declaredUiCalls.add(`${String(binding.httpMethod).toUpperCase()} ${binding.httpPath}`);
    }
  }

  for (const relDir of scanDirs) {
    const absDir = path.resolve(rootDir, relDir);
    const files = walkClientFiles(absDir);
    for (const absFile of files) {
      const relFile = path.relative(rootDir, absFile).split(path.sep).join('/');
      const rawSrc = fs.readFileSync(absFile, 'utf8');
      const noFrontmatter = absFile.endsWith('.astro')
        ? stripAstroFrontmatterPreservingLines(rawSrc)
        : rawSrc;
      const cleanSrc = stripJsCommentsPreservingLines(noFrontmatter);
      const bindings = collectSameFileStringBindings(cleanSrc);

      const fetchRe = /(?:\bwindow\.|\bglobalThis\.)?\bfetch\s*\(/g;
      let match;
      while ((match = fetchRe.exec(cleanSrc)) !== null) {
        const prefix = cleanSrc.slice(Math.max(0, match.index - 20), match.index);
        if (/(?:function|async\s+function)\s*$/.test(prefix) || /\.\s*$/.test(prefix) && !/(?:window|globalThis)\.\s*$/.test(prefix)) {
          continue;
        }
        const openIdx = cleanSrc.indexOf('(', match.index);
        const callBody = extractBalancedCallSlice(cleanSrc, openIdx);
        const line = lineAtOffset(cleanSrc, match.index);
        const rawEndpoint = resolveArgEndpoint(callBody, bindings);
        if (!rawEndpoint) {
          errors.push({
            file: relFile,
            line,
            method: 'UNKNOWN',
            endpoint: '<dynamic>',
            message: `${relFile}:${line} unresolved dynamic UI fetch call`
          });
          continue;
        }
        if (/^https?:\/\//i.test(rawEndpoint)) {
          continue;
        }
        const endpoint = normalizeEndpointPath(rawEndpoint);
        const methodMatch = callBody.match(/\bmethod\s*:\s*(['"])([A-Za-z]+)\1/);
        const method = methodMatch ? methodMatch[2].toUpperCase() : 'GET';
        const key = `${method} ${endpoint}`;
        const isStaticAsset = staticAssets.has(key);
        const isDeclaredTransition = declaredUiCalls.has(key);
        checkedCalls.push({ file: relFile, line, method, endpoint });
        if (!isStaticAsset && !isDeclaredTransition) {
          errors.push({
            file: relFile,
            line,
            method,
            endpoint,
            message: `${relFile}:${line} undeclared UI server call ${method} ${endpoint}`
          });
        }
      }

      const beaconRe = /\bsendBeacon\s*\(/g;
      while ((match = beaconRe.exec(cleanSrc)) !== null) {
        const openIdx = cleanSrc.indexOf('(', match.index);
        const callBody = extractBalancedCallSlice(cleanSrc, openIdx);
        const line = lineAtOffset(cleanSrc, match.index);
        const rawEndpoint = resolveArgEndpoint(callBody, bindings);
        const endpoint = rawEndpoint ? normalizeEndpointPath(rawEndpoint) : '<dynamic>';
        const key = `POST ${endpoint}`;
        checkedCalls.push({ file: relFile, line, method: 'POST', endpoint });
        if (!rawEndpoint || !declaredUiCalls.has(key)) {
          errors.push({
            file: relFile,
            line,
            method: 'POST',
            endpoint,
            message: `${relFile}:${line} undeclared UI server call POST ${endpoint}`
          });
        }
      }

      if (/\bXMLHttpRequest\b/.test(cleanSrc)) {
        const xhrOpenRe = /\.open\s*\(\s*(['"])([A-Za-z]+)\1\s*,\s*([^,)]+)/g;
        while ((match = xhrOpenRe.exec(cleanSrc)) !== null) {
          const line = lineAtOffset(cleanSrc, match.index);
          const method = match[2].toUpperCase();
          const rawEndpoint = resolveArgEndpoint(match[3], bindings);
          const endpoint = rawEndpoint ? normalizeEndpointPath(rawEndpoint) : '<dynamic>';
          const key = `${method} ${endpoint}`;
          const isStaticAsset = staticAssets.has(key);
          checkedCalls.push({ file: relFile, line, method, endpoint });
          if (!rawEndpoint || (!isStaticAsset && !declaredUiCalls.has(key))) {
            errors.push({
              file: relFile,
              line,
              method,
              endpoint,
              message: `${relFile}:${line} undeclared UI server call ${method} ${endpoint}`
            });
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, checkedCalls, errors };
}

export function runAllParityChecks(options = {}) {
  const packageParity = checkPackageSourceParity(options);
  const serverParity = checkServerOwnershipParity(options);
  const uiServerCalls = checkUiServerCallCoverage(options);
  const errors = [
    ...packageParity.errors,
    ...serverParity.errors,
    ...uiServerCalls.errors.map((e) => e.message)
  ];
  return {
    ok: errors.length === 0,
    packageParity,
    serverParity,
    uiServerCalls,
    errors
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runAllParityChecks();
  if (!result.ok) {
    for (const err of result.errors) {
      console.error(`[parity-fail] ${err}`);
    }
    process.exit(1);
  }
  console.log(
    `[parity-ok] pairs=${result.packageParity.pairCount} uiCalls=${result.uiServerCalls.checkedCalls.length}`
  );
}
