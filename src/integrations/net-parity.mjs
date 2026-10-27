import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT_DIR,
  loadNetEnvelope,
  validateExpressEndpointCoverage,
  validateNetEnvelope
} from '../../scripts/check-net.mjs';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_NET_PATH = path.resolve(THIS_DIR, '../net/workbench-net.yaml');
const MIGRATED_STATES = new Set(['astro-wrapped', 'astro-islands']);
const NAV_TRIGGER_KINDS = new Set(['link', 'open-external']);
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

function stripQueryAndHash(raw) {
  return String(raw || '').split('#')[0].split('?')[0] || '/';
}

export function normalizeAstroPageRoute(pattern, buildFormat = 'file') {
  const clean = stripQueryAndHash(pattern).trim() || '/';
  const withSlash = clean.startsWith('/') ? clean : `/${clean}`;
  if (withSlash === '/' || withSlash === '/index' || withSlash === '/index.html') {
    return { publicRoute: '/', htmlRelPath: 'index.html' };
  }
  const trimmed = withSlash.replace(/\/+$/, '');
  if (trimmed.endsWith('.html')) {
    return { publicRoute: trimmed, htmlRelPath: trimmed.slice(1) };
  }
  if (buildFormat === 'file') {
    return { publicRoute: `${trimmed}.html`, htmlRelPath: `${trimmed.slice(1)}.html` };
  }
  return { publicRoute: trimmed, htmlRelPath: `${trimmed.slice(1)}/index.html` };
}

function decodeBasicEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&');
}

export function extractInternalHrefsFromHtml(html) {
  const withoutScriptsStylesComments = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  const hrefs = [];
  const anchorRegex = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi;
  for (const match of withoutScriptsStylesComments.matchAll(anchorRegex)) {
    const raw = decodeBasicEntities(match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (!raw) continue;
    if (raw.startsWith('#')) continue;
    if (/^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) continue;
    if (/^(?:https?:)?\/\//i.test(raw)) continue;
    hrefs.push(raw);
  }
  return hrefs;
}

export function extractEndpointMethodsFromSource(sourceText) {
  const found = new Set();
  const text = String(sourceText || '');
  const fnRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|ALL)\b/g;
  const constRegex = /export\s+const\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|ALL)\b/g;
  for (const m of text.matchAll(fnRegex)) found.add(m[1]);
  for (const m of text.matchAll(constRegex)) found.add(m[1]);
  return [...found];
}

export function discoverAstroActions(rootDir = ROOT_DIR) {
  const actionsDir = path.join(rootDir, 'src', 'actions');
  if (!fs.existsSync(actionsDir)) return [];
  const actions = [];
  for (const entry of fs.readdirSync(actionsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:m?js|ts)$/.test(entry.name)) continue;
    const fullPath = path.join(actionsDir, entry.name);
    const src = fs.readFileSync(fullPath, 'utf8');
    const serverBlock = /export\s+const\s+server\s*=\s*\{([\s\S]*?)\}/.exec(src);
    if (serverBlock) {
      for (const propMatch of serverBlock[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) {
        const name = propMatch[1];
        if (name !== 'input' && name !== 'handler') {
          actions.push({ name, entrypoint: path.relative(rootDir, fullPath) });
        }
      }
    }
    if (actions.length === 0 && /defineAction\s*\(/.test(src)) {
      actions.push({ name: path.basename(entry.name, path.extname(entry.name)), entrypoint: path.relative(rootDir, fullPath) });
    }
  }
  return actions;
}

function resolvePlacesForPublicRoute(placeBindings, publicRoute) {
  const matched = [];
  for (const [placeId, binding] of Object.entries(placeBindings)) {
    if (!binding || (binding.kind !== 'page' && binding.kind !== 'view')) continue;
    const candidates = [binding.route, ...(binding.routeAliases || [])]
      .filter(Boolean)
      .map(stripQueryAndHash);
    if (candidates.includes(publicRoute)) {
      matched.push({ placeId, binding });
    }
  }
  return matched;
}

function resolveDocumentPlaceIds(placeBindings, primaryPlaceId, primaryBinding, publicRoute) {
  const ids = new Set([primaryPlaceId]);
  const pagePath = primaryBinding?.pagePath;
  for (const [placeId, binding] of Object.entries(placeBindings)) {
    if (!binding || (binding.kind !== 'page' && binding.kind !== 'view')) continue;
    if (pagePath && binding.pagePath === pagePath) {
      ids.add(placeId);
      continue;
    }
    const candidates = [binding.route, ...(binding.routeAliases || [])]
      .filter(Boolean)
      .map(stripQueryAndHash);
    if (candidates.includes(publicRoute)) {
      ids.add(placeId);
    }
  }
  return ids;
}

export function evaluateNetParity({
  envelope,
  routes = [],
  builtHtmlByRoute = new Map(),
  actions = [],
  buildFormat = 'file',
  rootDir = ROOT_DIR,
  runExpressEndpointAudit = true,
  currentSprint = 'SPRINT-GQC-02B'
} = {}) {
  const violations = [];
  const addViolation = (violation) => {
    violations.push(violation);
  };

  const netCheck = validateNetEnvelope(envelope, {
    filePath: 'src/net/workbench-net.yaml',
    currentSprint
  });
  for (const v of netCheck.violations) {
    addViolation({
      rule: 'net-envelope-invalid',
      id: v.id,
      message: `[${v.rule}] ${v.message}`
    });
  }

  if (runExpressEndpointAudit && Array.isArray(envelope?.bindings?.nonUiEndpoints)) {
    const expressAudit = validateExpressEndpointCoverage(envelope, rootDir);
    for (const v of expressAudit.violations) {
      addViolation({
        rule: 'net-envelope-invalid',
        id: v.id,
        message: `[${v.rule}] ${v.message}`
      });
    }
  }

  const placeBindings = envelope?.bindings?.places || {};
  const transitionBindings = envelope?.bindings?.transitions || {};
  const nonUiEndpoints = envelope?.bindings?.nonUiEndpoints || [];

  const boundServerCalls = new Set();
  const boundServerPaths = new Set();
  const boundActions = new Set();
  for (const binding of Object.values(transitionBindings)) {
    if (binding?.kind !== 'server-call-request') continue;
    if (binding.httpPath) {
      boundServerPaths.add(binding.httpPath);
      if (binding.httpMethod) {
        boundServerCalls.add(`${String(binding.httpMethod).toUpperCase()} ${binding.httpPath}`);
      }
    }
    if (binding.action) {
      boundActions.add(binding.action);
    }
  }

  const nonUiSet = new Set();
  const nonUiPaths = new Set();
  const nonUiActions = new Set();
  for (const entry of nonUiEndpoints) {
    if (entry?.status !== 'not-ui-reachable' || !entry.owner || !entry.reason) continue;
    if (entry.httpPath) {
      nonUiPaths.add(entry.httpPath);
      if (entry.httpMethod) {
        nonUiSet.add(`${String(entry.httpMethod).toUpperCase()} ${entry.httpPath}`);
      }
    }
    if (entry.action) {
      nonUiActions.add(entry.action);
    }
  }

  const htmlLookup = builtHtmlByRoute instanceof Map
    ? builtHtmlByRoute
    : new Map(Object.entries(builtHtmlByRoute || {}));

  const projectRoutes = routes.filter((r) => (r.origin ?? 'project') === 'project');
  const builtPageRouteMap = new Map();
  const checkedRoutes = [];

  for (const routeEntry of projectRoutes) {
    const rawPattern = routeEntry.pattern ?? routeEntry.route ?? '';
    if (routeEntry.type === 'page') {
      const { publicRoute, htmlRelPath } = normalizeAstroPageRoute(rawPattern, buildFormat);
      checkedRoutes.push(publicRoute);
      builtPageRouteMap.set(publicRoute, { routeEntry, htmlRelPath });

      const matchedPlaces = resolvePlacesForPublicRoute(placeBindings, publicRoute);
      if (matchedPlaces.length === 0) {
        addViolation({
          rule: 'unbound-astro-route',
          id: publicRoute,
          route: publicRoute,
          message: `Astro page route "${publicRoute}" (from "${routeEntry.entrypoint || rawPattern}") has no page or view Place binding in workbench-net.yaml`
        });
      }
    } else if (routeEntry.type === 'endpoint') {
      const endpointPath = stripQueryAndHash(rawPattern);
      let methods = Array.isArray(routeEntry.methods) ? routeEntry.methods.map((m) => m.toUpperCase()) : [];
      if (methods.length === 0 && routeEntry.entrypoint) {
        const fullEntry = path.isAbsolute(routeEntry.entrypoint)
          ? routeEntry.entrypoint
          : path.join(rootDir, routeEntry.entrypoint);
        if (fs.existsSync(fullEntry)) {
          methods = extractEndpointMethodsFromSource(fs.readFileSync(fullEntry, 'utf8'));
        }
      }

      if (methods.length === 0 || methods.includes('ALL')) {
        const coveredAny = boundServerPaths.has(endpointPath) || nonUiPaths.has(endpointPath);
        if (!coveredAny) {
          addViolation({
            rule: 'unbound-astro-endpoint',
            id: `ALL ${endpointPath}`,
            route: endpointPath,
            message: `Astro endpoint "${endpointPath}" has no server-call-request Transition binding and no not-ui-reachable mark`
          });
        }
      } else {
        for (const method of methods) {
          if (!HTTP_METHODS.includes(method)) continue;
          const key = `${method} ${endpointPath}`;
          if (!boundServerCalls.has(key) && !nonUiSet.has(key)) {
            addViolation({
              rule: 'unbound-astro-endpoint',
              id: key,
              route: endpointPath,
              message: `Astro endpoint "${key}" has no server-call-request Transition binding and no not-ui-reachable mark`
            });
          }
        }
      }
    }
  }

  for (const action of actions) {
    const actionName = action?.name || action?.actionName || '';
    const actionPath = `/_actions/${actionName}`;
    const isBound =
      boundActions.has(actionName) ||
      boundServerCalls.has(`POST ${actionPath}`) ||
      boundServerPaths.has(actionPath) ||
      nonUiActions.has(actionName) ||
      nonUiSet.has(`POST ${actionPath}`);
    if (!isBound) {
      addViolation({
        rule: 'unbound-astro-action',
        id: actionName,
        message: `Astro Action "${actionName}" has no server-call-request Transition binding and no not-ui-reachable mark`
      });
    }
  }

  const triggeredTransitionIds = new Set();
  const checkedPages = [];

  for (const [placeId, binding] of Object.entries(placeBindings)) {
    if (binding?.kind !== 'page') continue;
    if (!MIGRATED_STATES.has(binding.migrationState)) continue;

    const { publicRoute, htmlRelPath } = normalizeAstroPageRoute(binding.route, buildFormat);
    const hasRoute = builtPageRouteMap.has(publicRoute);
    const htmlContent = htmlLookup.has(publicRoute)
      ? htmlLookup.get(publicRoute)
      : htmlLookup.get(htmlRelPath);

    if (!hasRoute || typeof htmlContent !== 'string') {
      addViolation({
        rule: 'missing-astro-page',
        id: placeId,
        placeId,
        route: publicRoute,
        message: `Migrated Place "${placeId}" (state="${binding.migrationState}", route="${publicRoute}") has no built Astro page`
      });
      continue;
    }

    checkedPages.push(placeId);
    const docPlaceIds = resolveDocumentPlaceIds(placeBindings, placeId, binding, publicRoute);
    const candidateTransitions = [];
    for (const [tid, tBinding] of Object.entries(transitionBindings)) {
      if (!tBinding || !NAV_TRIGGER_KINDS.has(tBinding.kind)) continue;
      if (!docPlaceIds.has(tBinding.fromPlaceId)) continue;
      const targetPaths = new Set();
      if (tBinding.route) {
        targetPaths.add(stripQueryAndHash(tBinding.route));
      }
      if (tBinding.triggerHref) {
        const resolvedTrigger = new URL(tBinding.triggerHref, `http://workbench.local${publicRoute}`);
        targetPaths.add(resolvedTrigger.pathname);
      }
      candidateTransitions.push({ tid, tBinding, targetPaths });
    }

    const hrefs = extractInternalHrefsFromHtml(htmlContent);
    for (const rawHref of hrefs) {
      const resolved = new URL(rawHref, `http://workbench.local${publicRoute}`);
      const matching = candidateTransitions.filter((c) => c.targetPaths.has(resolved.pathname));
      if (matching.length === 0) {
        addViolation({
          rule: 'undeclared-internal-href',
          id: placeId,
          placeId,
          route: publicRoute,
          href: rawHref,
          message: `Built HTML for Place "${placeId}" ("${publicRoute}") contains undeclared internal href "${rawHref}" (resolved "${resolved.pathname}")`
        });
      } else {
        for (const m of matching) {
          triggeredTransitionIds.add(m.tid);
        }
      }
    }
  }

  const untriggeredTransitions = [];
  for (const t of envelope?.topology?.transitions || []) {
    if (triggeredTransitionIds.has(t.id)) continue;
    const tBinding = transitionBindings[t.id] || {};
    untriggeredTransitions.push({
      transitionId: t.id,
      kind: tBinding.kind || 'unknown',
      fromPlaceId: tBinding.fromPlaceId || (t.inputs && t.inputs[0]) || null,
      triggerHref: tBinding.triggerHref || null
    });
  }

  return {
    valid: violations.length === 0,
    violations,
    checkedPages,
    checkedRoutes,
    triggeredTransitionIds: [...triggeredTransitionIds].sort(),
    untriggeredTransitions
  };
}

export function formatNetParityViolationError(report) {
  const lines = report.violations.map(
    (v) => `[net-parity] rule=${v.rule} id=${v.id}${v.placeId ? ` place=${v.placeId}` : ''}${v.href ? ` href=${v.href}` : ''} ${v.message}`
  );
  return new Error(`Astro net-parity check failed with ${report.violations.length} violation(s):\n${lines.join('\n')}`);
}

export function netParityIntegration(options = {}) {
  const netPath = options.netPath || DEFAULT_NET_PATH;
  const rootDir = options.rootDir || ROOT_DIR;
  let resolvedRoutes = [];
  let buildFormat = 'file';

  return {
    name: 'gqc-net-parity',
    hooks: {
      'astro:config:done': ({ config }) => {
        buildFormat = config?.build?.format || 'file';
      },
      'astro:routes:resolved': ({ routes }) => {
        resolvedRoutes = routes;
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, _res, next) => {
          if (!req.url) return next();
          const qIndex = req.url.indexOf('?');
          const pathname = qIndex >= 0 ? req.url.slice(0, qIndex) : req.url;
          const search = qIndex >= 0 ? req.url.slice(qIndex) : '';
          if (pathname === '/index.html') {
            req.url = `/${search}`;
          } else if (pathname.endsWith('.html') && !pathname.slice(1).includes('/')) {
            const slug = pathname.slice(1, -5);
            const astroPagePath = path.join(rootDir, 'src', 'pages', `${slug}.astro`);
            if (fs.existsSync(astroPagePath)) {
              req.url = `/${slug}${search}`;
            }
          }
          next();
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const clientDir = fileURLToPath(dir);
        const envelope = loadNetEnvelope(netPath);
        const builtHtmlByRoute = new Map();

        for (const routeEntry of resolvedRoutes) {
          if ((routeEntry.origin ?? 'project') !== 'project') continue;
          if (routeEntry.type !== 'page') continue;
          const { publicRoute, htmlRelPath } = normalizeAstroPageRoute(routeEntry.pattern, buildFormat);
          const fullHtmlPath = path.join(clientDir, htmlRelPath);
          if (fs.existsSync(fullHtmlPath)) {
            const html = fs.readFileSync(fullHtmlPath, 'utf8');
            builtHtmlByRoute.set(publicRoute, html);
            builtHtmlByRoute.set(htmlRelPath, html);
          }
        }

        const actions = discoverAstroActions(rootDir);
        const report = evaluateNetParity({
          envelope,
          routes: resolvedRoutes,
          builtHtmlByRoute,
          actions,
          buildFormat,
          rootDir,
          runExpressEndpointAudit: options.runExpressEndpointAudit ?? fs.existsSync(path.join(rootDir, 'ws-server.js'))
        });

        if (!report.valid) {
          throw formatNetParityViolationError(report);
        }

        const untriggeredIds = report.untriggeredTransitions.map((t) => t.transitionId).join(', ');
        logger.info(
          `PASS pages=${report.checkedPages.length} staticTriggered=${report.triggeredTransitionIds.length} untriggered=${report.untriggeredTransitions.length} [${untriggeredIds}]`
        );
      }
    }
  };
}

export default netParityIntegration;
