#!/usr/bin/env node
/**
 * Explorable GUI lint (BPV-04).
 *
 * Fails when an interactive element in an island has no test id, when a native
 * dialog call survives, when an onclick attribute sits on a non-control, or
 * when a side-effect tag is unknown or carries no test id.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ISLAND_DIR = path.join(ROOT_DIR, 'src', 'islands');
const LAYOUT_DIR = path.join(ROOT_DIR, 'src', 'layouts');
const COMPONENT_DIR = path.join(ROOT_DIR, 'src', 'components');
const PAGE_DIR = path.join(ROOT_DIR, 'src', 'pages');
const HARNESS_DIR = path.join(ROOT_DIR, 'js', 'harness');
const EFFECTS = new Set(['navigate', 'persist', 'destructive', 'external', 'download', 'file-picker']);
const CONTROL_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea']);
const CLICKABLE_ONCLICK_TAGS = new Set(['button', 'a', 'input']);

function blankPreservingLines(segment) {
  return segment.replace(/[^\n]/g, ' ');
}

function scanOpeningTags(text, { isAstro = false } = {}) {
  let sanitized = isAstro ? text.replace(/^---\r?\n[\s\S]*?\r?\n---/, blankPreservingLines) : text;
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, blankPreservingLines);
  sanitized = sanitized.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blankPreservingLines);

  const tags = [];
  const opener = /<([a-z][a-z0-9-]*)(?=[\s>/])/g;
  let match;
  while ((match = opener.exec(sanitized)) !== null) {
    let i = match.index + match[0].length;
    const stack = [{ type: 'attr', quote: null }];
    let braceDepth = 0;
    let closed = false;

    while (i < sanitized.length) {
      const ch = sanitized[i];
      const top = stack[stack.length - 1];
      if (top.quote) {
        if (ch === '\\' && i + 1 < sanitized.length) {
          i += 2;
          continue;
        }
        if (top.quote === '`' && ch === '$' && sanitized[i + 1] === '{') {
          stack.push({ type: 'interp', quote: null });
          braceDepth += 1;
          i += 2;
          continue;
        }
        if (ch === top.quote) {
          top.quote = null;
        }
      } else if (ch === '"' || ch === "'" || ch === '`') {
        top.quote = ch;
      } else if (ch === '{') {
        stack.push({ type: 'brace', quote: null });
        braceDepth += 1;
      } else if (ch === '}') {
        if (stack.length > 1) stack.pop();
        if (braceDepth > 0) braceDepth -= 1;
      } else if (ch === '>' && braceDepth === 0) {
        closed = true;
        break;
      }
      i += 1;
    }

    if (!closed) continue;
    tags.push({
      tag: match[1],
      attrs: sanitized.slice(match.index + match[0].length, i),
      index: match.index
    });
    opener.lastIndex = i + 1;
  }
  return tags;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx|astro|js|mjs)$/.test(entry.name) && !entry.name.endsWith('.test.mjs')) out.push(full);
  }
  return out;
}

export function lintText(text, { file = 'inline', island = false, inScopePage = false } = {}) {
  const violations = [];
  const add = (rule, line, message) => violations.push({ file, line, rule, message });
  const isAstro = file.endsWith('.astro');

  for (const { tag, attrs, index } of scanOpeningTags(text, { isAstro })) {
    const line = text.slice(0, index).split('\n').length;
    if (CONTROL_TAGS.has(tag) && !/data-testid=/.test(attrs)) {
      if (island) add('island-control-without-testid', line, `<${tag}> has no data-testid`);
      else if (inScopePage) add('page-control-without-testid', line, `<${tag}> has no data-testid`);
    }
    if (/data-effect=("|')([^"']*)\1/.test(attrs)) {
      const effect = /data-effect=("|')([^"']*)\1/.exec(attrs)[2];
      if (!EFFECTS.has(effect)) add('unknown-effect', line, `data-effect="${effect}" is outside the taxonomy`);
      if (!/data-testid=/.test(attrs)) add('effect-without-testid', line, `data-effect="${effect}" has no data-testid`);
    }
    if (/\bonclick=/.test(attrs) && !CLICKABLE_ONCLICK_TAGS.has(tag)) {
      add('onclick-on-non-control', line, `onclick on <${tag}>`);
    }
  }

  for (const match of text.matchAll(/\b(?:window\s*\.\s*)?(confirm|alert|prompt)\s*\(/g)) {
    const line = text.slice(0, match.index).split('\n').length;
    const before = text.slice(Math.max(0, match.index - 20), match.index);
    if (/function\s+$/.test(before)) continue;
    add('native-dialog', line, `${match[1]}() is a native dialog`);
  }

  return violations;
}

export function lintTree({
  islandDir = ISLAND_DIR,
  layoutDir = LAYOUT_DIR,
  componentDir = COMPONENT_DIR,
  pageDir = PAGE_DIR,
  harnessDir = HARNESS_DIR
} = {}) {
  const violations = [];
  for (const file of walk(islandDir)) {
    violations.push(...lintText(fs.readFileSync(file, 'utf8'), { file, island: true }));
  }
  for (const file of walk(layoutDir)) {
    violations.push(...lintText(fs.readFileSync(file, 'utf8'), { file, island: false, inScopePage: true }));
  }
  for (const file of walk(componentDir)) {
    const island = !file.endsWith('.astro');
    violations.push(...lintText(fs.readFileSync(file, 'utf8'), { file, island, inScopePage: !island }));
  }
  for (const file of walk(pageDir)) {
    const inScopePage = file.endsWith('.astro');
    violations.push(...lintText(fs.readFileSync(file, 'utf8'), { file, island: false, inScopePage }));
  }
  for (const file of walk(harnessDir)) {
    violations.push(...lintText(fs.readFileSync(file, 'utf8'), { file, island: false }));
  }
  return violations;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const violations = lintTree();
  if (violations.length > 0) {
    for (const v of violations) {
      console.error(`[explorable-gui] ${path.relative(ROOT_DIR, v.file)}:${v.line} ${v.rule} ${v.message}`);
    }
    console.error(`[explorable-gui] FAIL ${violations.length} violation(s)`);
    process.exit(1);
  }
  console.log('[explorable-gui] PASS');
}
