import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNetEnvelope } from './check-net.mjs';
import {
  renderWorkbenchNetDocs,
  WORKBENCH_NET_REL,
  WORKBENCH_DOC_REL
} from './gen-net-docs.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
export const ALLOWLIST_REL = 'scripts/docs-link-allowlist.json';
export const ALLOWLIST_SCHEMA = 'urn:gqc:docs-link-allowlist:v1';

const FORBIDDEN_ALLOWLIST_KEYS = [
  'excludeDirectories',
  'directories',
  'ignoredDirectories',
  'excludePatterns',
  'globs'
];

export const MAINTAINED_DOC_SET_ENTRYPOINTS = [
  'README.md',
  'docs/README.md',
  'docs/INDEX.md',
  'docs/00-getting-started/README.md',
  'docs/00-getting-started/START_HERE.md',
  'docs/01-architecture/README.md',
  'docs/01-architecture/landing-page-architecture.md',
  'docs/01-architecture/astro-host-and-islands.md',
  'docs/01-architecture/workbench-net.md',
  'docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md',
  'docs/02-authentication/README.md',
  'docs/03-data-management/README.md',
  'docs/04-networking/README.md',
  'docs/05-state-management/README.md',
  'docs/06-components/README.md',
  'docs/07-deployment/README.md',
  'docs/08-testing/README.md',
  'docs/09-performance/README.md',
  'docs/11-standards/README.md',
  'docs/functionalities/README.md',
  'tests/README.md',
  'tests/TEST_DOCUMENTATION.md'
];

const EXPECTED_ISLAND_NAMES = [
  'TargetToolbarIsland',
  'DevicePresetsIsland',
  'ViewportStageIsland',
  'RecordingRibbonIsland',
  'SpaTestWorkflow',
  'ConformancePanelIsland',
  'MCardResultIsland'
];

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

export function isHistoricalDoc(relPath) {
  const posix = toPosix(relPath);
  return (
    posix.startsWith('docs/sprints/') ||
    posix.startsWith('docs/archive/') ||
    posix.startsWith('docs/10-project-management/') ||
    posix === 'CHANGELOG.md' ||
    posix === 'docs/03-data-management/MCARD-UPDATE-2.1.13.md'
  );
}

export function validateLinkAllowlist(allowlistData, { now = new Date() } = {}) {
  const errors = [];
  const allowMap = new Map();

  if (!allowlistData || typeof allowlistData !== 'object' || Array.isArray(allowlistData)) {
    return {
      valid: false,
      errors: ['scripts/docs-link-allowlist.json: allowlist root must be a JSON object'],
      allowMap
    };
  }

  for (const forbiddenKey of FORBIDDEN_ALLOWLIST_KEYS) {
    if (Object.prototype.hasOwnProperty.call(allowlistData, forbiddenKey)) {
      errors.push(
        `scripts/docs-link-allowlist.json: directory-wide exclusion key "${forbiddenKey}" is forbidden`
      );
    }
  }

  if (allowlistData.schema !== ALLOWLIST_SCHEMA) {
    errors.push(
      `scripts/docs-link-allowlist.json: schema must equal "${ALLOWLIST_SCHEMA}"`
    );
  }

  if (!Array.isArray(allowlistData.exceptions)) {
    errors.push('scripts/docs-link-allowlist.json: "exceptions" must be an array');
    return { valid: false, errors, allowMap };
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  allowlistData.exceptions.forEach((entry, index) => {
    const prefix = `scripts/docs-link-allowlist.json#${index}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${prefix}: exception entry must be an object`);
      return;
    }

    for (const field of ['file', 'target', 'owner', 'reason', 'reviewBy']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        errors.push(`${prefix}: missing non-empty string field "${field}"`);
      }
    }

    if (typeof entry.file === 'string' && entry.file.trim()) {
      const f = entry.file.trim();
      if (/[*?]/.test(f)) {
        errors.push(`${prefix}: wildcard pattern in file "${f}" is forbidden`);
      }
      if (f.endsWith('/') || !f.endsWith('.md')) {
        errors.push(
          `${prefix}: directory-wide or non-Markdown exclusion "${f}" is forbidden; name an exact .md file`
        );
      }
      if (!isHistoricalDoc(f)) {
        errors.push(
          `${prefix}: allowlist file "${f}" is a maintained guide; only historical records may register link exceptions`
        );
      }
    }

    if (typeof entry.target === 'string' && entry.target.trim()) {
      const t = entry.target.trim();
      if (/[*?]/.test(t)) {
        errors.push(`${prefix}: wildcard pattern in target "${t}" is forbidden`);
      }
    }

    if (typeof entry.reviewBy === 'string' && entry.reviewBy.trim()) {
      const rb = entry.reviewBy.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rb)) {
        errors.push(`${prefix}: reviewBy "${rb}" must use ISO YYYY-MM-DD format`);
      } else {
        const expiryMs = Date.parse(`${rb}T23:59:59.999Z`);
        if (Number.isNaN(expiryMs)) {
          errors.push(`${prefix}: reviewBy "${rb}" is not a valid calendar date`);
        } else if (expiryMs < nowMs) {
          errors.push(`${prefix}: historical link exception for "${entry.file}" -> "${entry.target}" expired on ${rb}`);
        }
      }
    }

    if (typeof entry.file === 'string' && typeof entry.target === 'string') {
      const key = `${entry.file.trim()}\0${entry.target.trim()}`;
      if (allowMap.has(key)) {
        errors.push(`${prefix}: duplicate allowlist exception for "${entry.file}" -> "${entry.target}"`);
      } else {
        allowMap.set(key, entry);
      }
    }
  });

  return { valid: errors.length === 0, errors, allowMap };
}

function walkMarkdownDir(rootDir, absDir, out) {
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdownDir(rootDir, full, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(toPosix(path.relative(rootDir, full)));
    }
  }
}

export function collectMarkdownFiles(rootDir = DEFAULT_ROOT_DIR) {
  const files = [];
  if (fs.existsSync(rootDir)) {
    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(entry.name);
      }
    }
  }
  walkMarkdownDir(rootDir, path.join(rootDir, 'docs'), files);
  walkMarkdownDir(rootDir, path.join(rootDir, 'tests'), files);
  return [...new Set(files)].sort();
}

function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, (match) => ' '.repeat(match.length));
}

function normalizeLinkTarget(rawInsideParens) {
  let trimmed = rawInsideParens.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    trimmed = trimmed.slice(1, -1).trim();
  } else {
    const titleMatch = trimmed.match(/^(\S+)\s+["'(].*$/);
    if (titleMatch) {
      trimmed = titleMatch[1];
    }
  }
  return trimmed;
}

export function parseMarkdownDocument(source) {
  const lines = source.split(/\r?\n/);
  const links = [];
  const npmScripts = [];
  const playwrightProjects = [];
  const netIds = [];
  const workstationUrls = [];

  let inFence = false;
  let fenceChar = '';

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmedStart = line.trimStart();
    const fenceMatch = trimmedStart.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const ch = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceChar = ch;
        return;
      }
      if (ch === fenceChar) {
        inFence = false;
        fenceChar = '';
        return;
      }
    }

    for (const scriptMatch of line.matchAll(/\bnpm\s+run\s+([a-zA-Z0-9:_-]+)/g)) {
      npmScripts.push({ line: lineNo, script: scriptMatch[1] });
    }

    for (const projMatch of line.matchAll(/--project(?:=|\s+)([a-zA-Z0-9_-]+)/g)) {
      playwrightProjects.push({ line: lineNo, project: projMatch[1] });
    }

    if (inFence) return;

    for (const codeSpan of line.matchAll(/`([^`]+)`/g)) {
      const token = codeSpan[1].trim();
      if (/^[pt]_[a-z0-9_]+$/.test(token)) {
        netIds.push({ line: lineNo, id: token });
      }
    }

    const maskedLine = stripInlineCode(line);
    if (/file:\/\/\/Users\//i.test(maskedLine)) {
      workstationUrls.push({ line: lineNo, text: line.trim() });
    }

    for (const linkMatch of maskedLine.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)) {
      const target = normalizeLinkTarget(linkMatch[2]);
      if (!target) continue;
      links.push({
        line: lineNo,
        label: linkMatch[1],
        target
      });
    }
  });

  return {
    links,
    npmScripts,
    playwrightProjects,
    netIds,
    workstationUrls
  };
}

export function loadValidScriptsAndProjects(rootDir = DEFAULT_ROOT_DIR) {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    : { scripts: {} };
  const validScripts = new Set(Object.keys(pkg.scripts || {}));

  const validProjects = new Set();
  const pwConfigPath = path.join(rootDir, 'playwright.config.js');
  if (fs.existsSync(pwConfigPath)) {
    const pwSrc = fs.readFileSync(pwConfigPath, 'utf8');
    for (const m of pwSrc.matchAll(/name:\s*['"]([a-zA-Z0-9_-]+)['"]/g)) {
      validProjects.add(m[1]);
    }
  }
  if (validProjects.size === 0) {
    for (const fallback of ['smoke', 'components', 'features', 'smoke-firefox', 'smoke-webkit']) {
      validProjects.add(fallback);
    }
  }

  return { pkg, validScripts, validProjects };
}

export function loadDeclaredNetIds(rootDir = DEFAULT_ROOT_DIR) {
  const validNetIds = new Set(['p_error_modal']);
  const wbPath = path.join(rootDir, WORKBENCH_NET_REL);
  if (fs.existsSync(wbPath)) {
    const wbEnvelope = loadNetEnvelope(wbPath);
    for (const place of wbEnvelope?.topology?.places || []) {
      if (place?.id) validNetIds.add(place.id);
    }
    for (const tr of wbEnvelope?.topology?.transitions || []) {
      if (tr?.id) validNetIds.add(tr.id);
    }
  }

  const spaPath = path.join(rootDir, 'tests/fixtures/spa-test-target.graph.json');
  if (fs.existsSync(spaPath)) {
    const spaEnvelope = JSON.parse(fs.readFileSync(spaPath, 'utf8'));
    for (const place of spaEnvelope?.topology?.places || []) {
      if (place?.id) validNetIds.add(place.id);
    }
    for (const tr of spaEnvelope?.topology?.transitions || []) {
      if (tr?.id) validNetIds.add(tr.id);
    }
  }

  return validNetIds;
}

function isExternalScheme(target) {
  return /^(https?:|mailto:|tel:|data:|javascript:|ws:|wss:|urn:|clm:|mcard:|hash:)/i.test(target);
}

export function checkMarkdownFiles({
  rootDir = DEFAULT_ROOT_DIR,
  allowMap = new Map(),
  validScripts = new Set(),
  validProjects = new Set(),
  validNetIds = new Set(['p_error_modal'])
} = {}) {
  const errors = [];
  const files = collectMarkdownFiles(rootDir);
  const resolvedRoot = path.resolve(rootDir);

  for (const relPath of files) {
    const absPath = path.join(resolvedRoot, relPath);
    const stat = fs.statSync(absPath);
    if (stat.size === 0) {
      errors.push(`${relPath}:1: zero-byte Markdown file is forbidden`);
      continue;
    }

    const content = fs.readFileSync(absPath, 'utf8');
    const historical = isHistoricalDoc(relPath);
    const parsed = parseMarkdownDocument(content);

    if (!historical) {
      for (const hit of parsed.workstationUrls) {
        errors.push(`${relPath}:${hit.line}: workstation-specific file:///Users/ link is forbidden`);
      }
    }

    for (const link of parsed.links) {
      const rawTarget = link.target;
      if (/^file:/i.test(rawTarget)) {
        errors.push(`${relPath}:${link.line}: file:// URL "${rawTarget}" is forbidden; use a repository-relative link`);
        continue;
      }
      if (rawTarget.startsWith('#') || isExternalScheme(rawTarget)) {
        continue;
      }

      const withoutFragment = rawTarget.split('#')[0].split('?')[0];
      if (!withoutFragment) continue;

      const allowKey = `${relPath}\0${withoutFragment}`;
      const allowRawKey = `${relPath}\0${rawTarget}`;
      const isAllowlisted = allowMap.has(allowKey) || allowMap.has(allowRawKey);

      const resolvedTarget = withoutFragment.startsWith('/')
        ? path.resolve(resolvedRoot, `.${withoutFragment}`)
        : path.resolve(path.dirname(absPath), withoutFragment);

      const relativeToRoot = path.relative(resolvedRoot, resolvedTarget);
      const escapesRepo = relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot);

      if (escapesRepo) {
        if (!isAllowlisted) {
          errors.push(
            `${relPath}:${link.line}: link "${rawTarget}" escapes repository root without a valid allowlist entry`
          );
        }
        continue;
      }

      if (!fs.existsSync(resolvedTarget)) {
        if (!isAllowlisted) {
          errors.push(`${relPath}:${link.line}: broken local Markdown link "${rawTarget}"`);
        }
      }
    }

    if (historical) continue;

    for (const ref of parsed.npmScripts) {
      if (!validScripts.has(ref.script)) {
        errors.push(
          `${relPath}:${ref.line}: documented package script "npm run ${ref.script}" does not exist in package.json`
        );
      }
    }

    for (const proj of parsed.playwrightProjects) {
      if (!validProjects.has(proj.project)) {
        errors.push(
          `${relPath}:${proj.line}: documented Playwright project "--project=${proj.project}" does not exist in playwright.config.js`
        );
      }
    }

    for (const netRef of parsed.netIds) {
      if (!validNetIds.has(netRef.id)) {
        errors.push(
          `${relPath}:${netRef.line}: unknown Place or Transition ID "${netRef.id}" is not declared in workbench-net.yaml or spa-test-target.graph.json`
        );
      }
    }

    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (
        /clm-kernel@0\.0\.(3|9|10|11|12)\b/.test(line) &&
        !/historical|graduated|superseded|earlier|legacy|smo/i.test(line)
      ) {
        errors.push(
          `${relPath}:${idx + 1}: stale kernel version claim "${line.trim()}" must use clm-kernel@0.0.13 or explicitly label historical context`
        );
      }
    });
  }

  return { filesChecked: files.length, errors };
}

export function checkVersionAndPortContracts(rootDir = DEFAULT_ROOT_DIR) {
  const errors = [];
  const pkgPath = path.join(rootDir, 'package.json');
  const lockPath = path.join(rootDir, 'package-lock.json');
  const modalityPath = path.join(rootDir, 'server/mcard-modality.mjs');
  const recorderPath = path.join(rootDir, 'js/harness/recorder.js');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const expectedKernel = pkg?.dependencies?.['clm-kernel'];
  if (!expectedKernel) {
    errors.push('package.json:1: missing dependencies["clm-kernel"]');
    return { errors };
  }

  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const lockVer = lock?.packages?.['node_modules/clm-kernel']?.version;
    if (lockVer !== expectedKernel) {
      errors.push(
        `package-lock.json:1: locked clm-kernel version "${lockVer}" disagrees with package.json "${expectedKernel}"`
      );
    }
  }

  if (fs.existsSync(modalityPath)) {
    const modalitySrc = fs.readFileSync(modalityPath, 'utf8');
    if (!modalitySrc.includes(`clm-kernel@${expectedKernel}`)) {
      errors.push(
        `server/mcard-modality.mjs:1: KERNEL_PROVENANCE does not match clm-kernel@${expectedKernel}`
      );
    }
  }

  if (fs.existsSync(recorderPath)) {
    const recorderSrc = fs.readFileSync(recorderPath, 'utf8');
    const match = recorderSrc.match(/DEFAULT_CLM_KERNEL_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (!match || match[1] !== expectedKernel) {
      errors.push(
        `js/harness/recorder.js:1: DEFAULT_CLM_KERNEL_VERSION "${match ? match[1] : 'missing'}" disagrees with package.json "${expectedKernel}"`
      );
    }
  }

  for (const docRel of ['README.md', 'docs/00-getting-started/START_HERE.md', 'tests/README.md']) {
    const docAbs = path.join(rootDir, docRel);
    if (!fs.existsSync(docAbs)) {
      errors.push(`${docRel}:1: required setup or test entrypoint guide is missing`);
      continue;
    }
    const text = fs.readFileSync(docAbs, 'utf8');
    for (const port of ['3000', '3001', '4322']) {
      if (!text.includes(port)) {
        errors.push(`${docRel}:1: guide must document verified port ${port}`);
      }
    }
    if (!text.includes(`clm-kernel@${expectedKernel}`) && !text.includes(expectedKernel)) {
      errors.push(`${docRel}:1: guide must state current clm-kernel version ${expectedKernel}`);
    }
  }

  for (const setupRel of ['README.md', 'docs/01-architecture/astro-host-and-islands.md']) {
    const setupAbs = path.join(rootDir, setupRel);
    if (!fs.existsSync(setupAbs)) continue;
    const text = fs.readFileSync(setupAbs, 'utf8');
    for (const cmd of ['npm run dev', 'npm run build', 'npm start']) {
      if (!text.includes(cmd)) {
        errors.push(`${setupRel}:1: guide must document "${cmd}"`);
      }
    }
  }

  return { errors, expectedKernel };
}

export function checkDomainAndOwnershipContracts(rootDir = DEFAULT_ROOT_DIR) {
  const errors = [];

  for (const relPath of MAINTAINED_DOC_SET_ENTRYPOINTS) {
    const absPath = path.join(rootDir, relPath);
    if (!fs.existsSync(absPath)) {
      errors.push(`${relPath}:1: required maintained documentation entrypoint is missing`);
      continue;
    }
    const text = fs.readFileSync(absPath, 'utf8');
    if (!/\bAudience\b/i.test(text)) {
      errors.push(`${relPath}:1: maintained documentation set must declare Audience metadata`);
    }
    if (!/\b(BMAD Owner|Owner)\b/i.test(text)) {
      errors.push(`${relPath}:1: maintained documentation set must declare BMAD Owner metadata`);
    }
    if (!/\bSource of Truth\b/i.test(text)) {
      errors.push(`${relPath}:1: maintained documentation set must declare Source of Truth metadata`);
    }
  }

  const archRel = 'docs/01-architecture/landing-page-architecture.md';
  const archAbs = path.join(rootDir, archRel);
  if (fs.existsSync(archAbs)) {
    const arch = fs.readFileSync(archAbs, 'utf8');
    const requiredArchTerms = [
      { pattern: /workbench/i, label: 'Responsive UI Lab workbench distinction' },
      { pattern: /spa-test-target\.html/, label: 'target SPA fixture (spa-test-target.html)' },
      { pattern: /\bnoredirect=1\b/, label: 'single-page MCard viewer (?noredirect=1)' },
      { pattern: /\bPlaceMCard\b/, label: 'Page-as-Place (PlaceMCard)' },
      { pattern: /\bTransitionMCard\b/, label: 'Functional-Link-as-Transition (TransitionMCard)' },
      { pattern: /clm:\/\/type\/view\//, label: 'CLM view type URI (clm://type/view/...)' },
      { pattern: /\bp_error_modal\b/, label: 'Layer 4 error Place (p_error_modal)' },
      { pattern: /\bFiringReceiptMCard\b/, label: 'Layer 4 FiringReceiptMCard' },
      { pattern: /responsive_test_run:v1/, label: 'closed responsive_test_run:v1 schema' },
      { pattern: /urn:gqc:navigation-run-link:v1/, label: 'urn:gqc:navigation-run-link:v1 graph-to-run link' },
      { pattern: /public\/js\/mcard-kernel\/compat\.js/, label: 'browser compatibility hash domain' },
      { pattern: /scripts\/penpot-zip\.mjs/, label: 'PenPot navigation graph hash domain' },
      { pattern: /Optional\s*\/\s*Deferred|optional/i, label: 'optional/deferred PenPot MPA target scope' }
    ];
    for (const req of requiredArchTerms) {
      if (!req.pattern.test(arch)) {
        errors.push(`${archRel}:1: architecture guide is missing required contract "${req.label}"`);
      }
    }
  }

  const astroRel = 'docs/01-architecture/astro-host-and-islands.md';
  const astroAbs = path.join(rootDir, astroRel);
  if (fs.existsSync(astroAbs)) {
    const astroText = fs.readFileSync(astroAbs, 'utf8');
    if (!/Vitest remains un-adopted|Vitest is not/i.test(astroText)) {
      errors.push(`${astroRel}:1: must state that Astro is adopted while Vitest remains un-adopted`);
    }
    for (const island of EXPECTED_ISLAND_NAMES) {
      if (!astroText.includes(island)) {
        errors.push(`${astroRel}:1: island ownership map is missing "${island}"`);
      }
    }
  }

  return { errors };
}

export function checkWorkbenchNetFreshness(rootDir = DEFAULT_ROOT_DIR) {
  const errors = [];
  const netAbs = path.join(rootDir, WORKBENCH_NET_REL);
  const docAbs = path.join(rootDir, WORKBENCH_DOC_REL);

  if (!fs.existsSync(netAbs)) {
    errors.push(`${WORKBENCH_NET_REL}:1: workbench net envelope is missing`);
    return { errors };
  }
  if (!fs.existsSync(docAbs)) {
    errors.push(`${WORKBENCH_DOC_REL}:1: generated workbench net doc is missing; run "npm run docs:gen-net"`);
    return { errors };
  }

  const envelope = loadNetEnvelope(netAbs);
  const expectedMarkdown = renderWorkbenchNetDocs(envelope);
  const actualMarkdown = fs.readFileSync(docAbs, 'utf8');

  if (actualMarkdown !== expectedMarkdown) {
    errors.push(
      `${WORKBENCH_DOC_REL}:1: generated workbench net documentation is stale; run "npm run docs:gen-net"`
    );
  }

  return { errors };
}

export function checkDocs({
  rootDir = DEFAULT_ROOT_DIR,
  allowlistPath = path.join(rootDir, ALLOWLIST_REL),
  now = new Date(),
  enforceRepoContracts = true
} = {}) {
  const errors = [];

  let allowMap = new Map();
  if (fs.existsSync(allowlistPath)) {
    const allowlistData = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    const allowRes = validateLinkAllowlist(allowlistData, { now });
    errors.push(...allowRes.errors);
    allowMap = allowRes.allowMap;
  } else if (enforceRepoContracts) {
    errors.push(`${ALLOWLIST_REL}:1: allowlist file is missing`);
  }

  const { validScripts, validProjects } = loadValidScriptsAndProjects(rootDir);
  const validNetIds = loadDeclaredNetIds(rootDir);

  const mdRes = checkMarkdownFiles({
    rootDir,
    allowMap,
    validScripts,
    validProjects,
    validNetIds
  });
  errors.push(...mdRes.errors);

  if (enforceRepoContracts) {
    errors.push(...checkVersionAndPortContracts(rootDir).errors);
    errors.push(...checkDomainAndOwnershipContracts(rootDir).errors);
    errors.push(...checkWorkbenchNetFreshness(rootDir).errors);
  }

  return {
    ok: errors.length === 0,
    filesChecked: mdRes.filesChecked,
    allowlistCount: allowMap.size,
    declaredNetIdCount: validNetIds.size,
    errors
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const startedAt = performance.now();
  const result = checkDocs();
  const elapsedMs = (performance.now() - startedAt).toFixed(2);
  if (!result.ok) {
    for (const err of result.errors) {
      console.error(`[docs:check] FAIL ${err}`);
    }
    console.error(`[docs:check] FAILED (${result.errors.length} error(s) across ${result.filesChecked} Markdown files in ${elapsedMs}ms)`);
    process.exit(1);
  }
  console.log(
    `[docs:check] PASS (files=${result.filesChecked}, allowlisted=${result.allowlistCount}, netIds=${result.declaredNetIdCount}, durationMs=${elapsedMs})`
  );
}
