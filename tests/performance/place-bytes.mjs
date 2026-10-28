import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadNetEnvelope } from '../../scripts/check-net.mjs';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT_DIR = path.resolve(THIS_DIR, '../..');

function emptyBucket() {
  return { rawBytes: 0, gzipBytes: 0, brotliBytes: 0, fileCount: 0 };
}

function measureBuffer(buf) {
  return {
    rawBytes: buf.length,
    gzipBytes: zlib.gzipSync(buf).length,
    brotliBytes: zlib.brotliCompressSync(buf).length
  };
}

function sumFileEntries(entries) {
  const bucket = emptyBucket();
  for (const item of entries) {
    bucket.rawBytes += item.rawBytes;
    bucket.gzipBytes += item.gzipBytes;
    bucket.brotliBytes += item.brotliBytes;
    bucket.fileCount += 1;
  }
  return bucket;
}

function parseAttributes(tagStr) {
  const attrs = {};
  const attrRe = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
  const inner = tagStr.replace(/^<[a-zA-Z0-9-]+\s*/, '').replace(/\/?>\s*$/, '');
  for (const match of inner.matchAll(attrRe)) {
    const key = match[1];
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = val;
  }
  return attrs;
}

function extractEsmSpecifiers(jsSource) {
  const specs = [];
  const staticRe = /(?:\bfrom\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["'])/g;
  for (const m of jsSource.matchAll(staticRe)) {
    if (m[1] || m[2]) specs.push(m[1] || m[2]);
  }
  return specs;
}

function indexAstroAssets(distClientDir) {
  const astroDir = path.join(distClientDir, '_astro');
  const map = new Map();
  if (!fs.existsSync(astroDir)) return map;

  for (const entry of fs.readdirSync(astroDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const absPath = path.join(astroDir, entry.name);
    const urlPath = `/_astro/${entry.name}`;
    const buf = fs.readFileSync(absPath);
    const src = buf.toString('utf8');
    const sizes = measureBuffer(buf);
    const imports = extractEsmSpecifiers(src)
      .filter((spec) => spec.startsWith('./') || spec.startsWith('/_astro/'))
      .map((spec) => (spec.startsWith('./') ? `/_astro/${spec.slice(2)}` : spec));

    map.set(urlPath, {
      fileName: entry.name,
      urlPath,
      absPath,
      ...sizes,
      imports
    });
  }
  return map;
}

function collectTransitiveAstroChunks(seedUrlPaths, astroMap, excludeSet = new Set()) {
  const visited = new Set();
  const queue = [...seedUrlPaths];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur || visited.has(cur)) continue;
    visited.add(cur);
    const info = astroMap.get(cur);
    if (!info) continue;
    for (const dep of info.imports) {
      if (!visited.has(dep)) queue.push(dep);
    }
  }
  const result = [];
  for (const urlPath of visited) {
    if (excludeSet.has(urlPath)) continue;
    const info = astroMap.get(urlPath);
    if (info) result.push(info);
  }
  return result.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

function resolveLocalStaticJsFile(rootDir, rawSpec, fromDir = rootDir) {
  const clean = String(rawSpec || '').split('?')[0].split('#')[0].trim();
  if (!clean || /^https?:\/\//i.test(clean) || clean.startsWith('/_astro/')) return null;

  const candidates = [];
  if (clean.startsWith('/public/')) {
    candidates.push(path.join(rootDir, clean.slice(1)));
  } else if (clean.startsWith('/')) {
    candidates.push(path.join(rootDir, clean.slice(1)));
    candidates.push(path.join(rootDir, 'public', clean.slice(1)));
  } else if (clean.startsWith('./') || clean.startsWith('../')) {
    candidates.push(path.resolve(fromDir, clean));
    candidates.push(path.resolve(rootDir, clean));
  } else {
    candidates.push(path.resolve(rootDir, clean));
    candidates.push(path.resolve(rootDir, 'public', clean));
  }

  for (const cand of candidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return cand;
    }
  }
  return null;
}

function walkLocalPageScripts(rootDir, seedSpecs, fileCache) {
  const visitedAbs = new Set();
  const queue = seedSpecs.map((spec) => ({ spec, fromDir: rootDir }));

  while (queue.length > 0) {
    const { spec, fromDir } = queue.shift();
    const abs = resolveLocalStaticJsFile(rootDir, spec, fromDir);
    if (!abs || visitedAbs.has(abs)) continue;
    visitedAbs.add(abs);

    if (!fileCache.has(abs)) {
      const buf = fs.readFileSync(abs);
      const src = buf.toString('utf8');
      fileCache.set(abs, {
        relPath: path.relative(rootDir, abs).split(path.sep).join('/'),
        absPath: abs,
        ...measureBuffer(buf),
        imports: extractEsmSpecifiers(src)
      });
    }

    const entry = fileCache.get(abs);
    for (const childSpec of entry.imports) {
      if (childSpec.startsWith('.') || childSpec.startsWith('/')) {
        queue.push({ spec: childSpec, fromDir: path.dirname(abs) });
      }
    }
  }

  return [...visitedAbs]
    .map((abs) => {
      const item = fileCache.get(abs);
      return {
        relPath: item.relPath,
        rawBytes: item.rawBytes,
        gzipBytes: item.gzipBytes,
        brotliBytes: item.brotliBytes
      };
    })
    .sort((a, b) => a.relPath.localeCompare(b.relPath));
}

function formatDirective(clientAttr) {
  const clean = String(clientAttr || '').trim();
  if (clean === 'only') return 'client:only="preact"';
  if (clean) return `client:${clean}`;
  return 'unknown';
}

function roundUpBudget(value, step = 4096, headroom = 1.15) {
  if (value === 0) return 0;
  return Math.ceil((value * headroom) / step) * step;
}

function analyzeHtmlSurface({
  placeId,
  kind,
  route,
  pagePath,
  migrationState,
  htmlAbsPath,
  rootDir,
  astroMap,
  localFileCache
}) {
  const html = fs.readFileSync(htmlAbsPath, 'utf8');

  const islandTags = [...html.matchAll(/<astro-island\b[^>]*>/gi)].map((m) => m[0]);
  const islands = islandTags.map((tag, index) => {
    const attrs = parseAttributes(tag);
    const componentUrl = String(attrs['component-url'] || '').trim();
    const rendererUrl = String(attrs['renderer-url'] || '').trim();
    const clientAttr = String(attrs.client || '').trim();
    const directive = formatDirective(clientAttr);
    const eagerBeforeInteraction = clientAttr === 'load' || clientAttr === 'only';
    const fileBase = (componentUrl.split('/').pop() || '').split('.')[0] || `island-${index + 1}`;
    const bundleInfo = astroMap.get(componentUrl) || null;

    return {
      uid: attrs.uid || String(index + 1),
      componentName: fileBase,
      componentUrl,
      rendererUrl,
      directive,
      eagerBeforeInteraction,
      rawBytes: bundleInfo ? bundleInfo.rawBytes : 0,
      gzipBytes: bundleInfo ? bundleInfo.gzipBytes : 0,
      brotliBytes: bundleInfo ? bundleInfo.brotliBytes : 0
    };
  });

  const allIslandBundleUrls = new Set(islands.map((i) => i.componentUrl).filter(Boolean));
  const eagerIslandBundleUrls = new Set(
    islands.filter((i) => i.eagerBeforeInteraction).map((i) => i.componentUrl).filter(Boolean)
  );
  const deferredIslandBundleUrls = new Set(
    islands.filter((i) => !i.eagerBeforeInteraction).map((i) => i.componentUrl).filter(Boolean)
  );

  const eagerIslandEntries = [...eagerIslandBundleUrls]
    .map((u) => astroMap.get(u))
    .filter(Boolean)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  const deferredIslandEntries = [...deferredIslandBundleUrls]
    .map((u) => astroMap.get(u))
    .filter(Boolean)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  const allIslandEntries = [...allIslandBundleUrls]
    .map((u) => astroMap.get(u))
    .filter(Boolean)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  const eagerSeeds = [
    ...eagerIslandBundleUrls,
    ...islands.filter((i) => i.eagerBeforeInteraction && i.rendererUrl).map((i) => i.rendererUrl)
  ];
  const allSeeds = [
    ...allIslandBundleUrls,
    ...islands.filter((i) => i.rendererUrl).map((i) => i.rendererUrl)
  ];

  const eagerSharedEntries = collectTransitiveAstroChunks(eagerSeeds, astroMap, allIslandBundleUrls);
  const allSharedEntries = collectTransitiveAstroChunks(allSeeds, astroMap, allIslandBundleUrls);

  let unukDedupSharedSum = 0;
  for (const island of allIslandEntries) {
    const perIslandShared = collectTransitiveAstroChunks([island.urlPath], astroMap, allIslandBundleUrls);
    for (const chunk of perIslandShared) {
      unukDedupSharedSum += chunk.rawBytes;
    }
  }

  const scriptMatches = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const astroScriptUrlsInTags = [];
  const localScriptSeedSpecs = [];
  let astroInlineBootstrapBytes = 0;
  let pageInlineScriptBytes = 0;
  let redirectsTopFrameBeforeBody = false;

  for (const match of scriptMatches) {
    const attrs = parseAttributes(`<script ${match[1]}>`);
    const body = match[2] || '';
    const src = String(attrs.src || '').trim();

    if (src) {
      if (src.includes('/_astro/') || src.startsWith('_astro/')) {
        astroScriptUrlsInTags.push(src);
      } else {
        localScriptSeedSpecs.push(src);
      }
      continue;
    }

    const byteLen = Buffer.byteLength(body, 'utf8');
    const isAstroBootstrap =
      body.includes('self.Astro') ||
      body.includes("customElements.define('astro-island'") ||
      body.includes('customElements.define(`astro-island`');

    if (isAstroBootstrap) {
      astroInlineBootstrapBytes += byteLen;
    } else {
      pageInlineScriptBytes += byteLen;
      if (body.includes('window.location.replace') && body.includes('noredirect')) {
        redirectsTopFrameBeforeBody = true;
      }
      for (const spec of extractEsmSpecifiers(body)) {
        if (spec.includes('/_astro/') || spec.startsWith('_astro/')) {
          astroScriptUrlsInTags.push(spec);
        } else {
          localScriptSeedSpecs.push(spec);
        }
      }
    }
  }

  const isTopFrameRedirectPlace =
    kind === 'page' && route === '/' && redirectsTopFrameBeforeBody;

  const pageExternalFiles = walkLocalPageScripts(rootDir, localScriptSeedSpecs, localFileCache);
  const pageExternalBucket = sumFileEntries(pageExternalFiles);

  const islandBundles = {
    eager: sumFileEntries(eagerIslandEntries),
    deferred: sumFileEntries(deferredIslandEntries),
    total: sumFileEntries(allIslandEntries),
    files: allIslandEntries.map((e) => ({
      fileName: e.fileName,
      urlPath: e.urlPath,
      rawBytes: e.rawBytes,
      gzipBytes: e.gzipBytes,
      brotliBytes: e.brotliBytes,
      eagerBeforeInteraction: eagerIslandBundleUrls.has(e.urlPath)
    }))
  };

  const sharedChunks = {
    eager: sumFileEntries(eagerSharedEntries),
    total: sumFileEntries(allSharedEntries),
    deduplicationSavingsRawBytes: Math.max(0, unukDedupSharedSum - sumFileEntries(allSharedEntries).rawBytes),
    files: allSharedEntries.map((e) => ({
      fileName: e.fileName,
      urlPath: e.urlPath,
      rawBytes: e.rawBytes,
      gzipBytes: e.gzipBytes,
      brotliBytes: e.brotliBytes
    }))
  };

  const astroEagerRawBytes = islandBundles.eager.rawBytes + sharedChunks.eager.rawBytes;
  const astroEagerGzipBytes = islandBundles.eager.gzipBytes + sharedChunks.eager.gzipBytes;
  const astroEagerBrotliBytes = islandBundles.eager.brotliBytes + sharedChunks.eager.brotliBytes;
  const astroManifestTotalRawBytes = islandBundles.total.rawBytes + sharedChunks.total.rawBytes;

  const expectedIslandFree = migrationState !== 'astro-islands';
  const leakedIslandSignals = [];
  if (expectedIslandFree) {
    if (islands.length > 0) leakedIslandSignals.push(`${islands.length} <astro-island> tags`);
    if (astroManifestTotalRawBytes > 0) leakedIslandSignals.push(`${astroManifestTotalRawBytes} B /_astro/ island chunks`);
    if (astroScriptUrlsInTags.length > 0) leakedIslandSignals.push(`/_astro/ script refs: ${astroScriptUrlsInTags.join(', ')}`);
    if (astroInlineBootstrapBytes > 0) leakedIslandSignals.push(`${astroInlineBootstrapBytes} B Astro island inline bootstrap`);
  }

  const eagerExternalDownloadRawBytes = isTopFrameRedirectPlace
    ? astroEagerRawBytes
    : astroEagerRawBytes + pageExternalBucket.rawBytes;
  const eagerExternalDownloadGzipBytes = isTopFrameRedirectPlace
    ? astroEagerGzipBytes
    : astroEagerGzipBytes + pageExternalBucket.gzipBytes;
  const eagerExternalDownloadBrotliBytes = isTopFrameRedirectPlace
    ? astroEagerBrotliBytes
    : astroEagerBrotliBytes + pageExternalBucket.brotliBytes;

  return {
    placeId,
    kind,
    route,
    pagePath,
    migrationState: migrationState || 'legacy-static',
    expectedIslandFree,
    zeroIslandPass: leakedIslandSignals.length === 0,
    zeroIslandViolations: leakedIslandSignals,
    islandCount: islands.length,
    islands,
    islandBundles,
    sharedChunks,
    astroInlineBootstrapBytes,
    astroEagerBeforeInteraction: {
      rawBytes: astroEagerRawBytes,
      gzipBytes: astroEagerGzipBytes,
      brotliBytes: astroEagerBrotliBytes,
      fileCount: islandBundles.eager.fileCount + sharedChunks.eager.fileCount
    },
    astroManifestTotalRawBytes,
    pageScripts: {
      redirectsTopFrameBeforeBody: isTopFrameRedirectPlace,
      inlineBytes: pageInlineScriptBytes,
      external: pageExternalBucket,
      files: pageExternalFiles
    },
    clientJsBeforeInteraction: {
      rawBytes: eagerExternalDownloadRawBytes,
      gzipBytes: eagerExternalDownloadGzipBytes,
      brotliBytes: eagerExternalDownloadBrotliBytes,
      inlineBytes: astroInlineBootstrapBytes + pageInlineScriptBytes
    },
    proposedAdvisoryBudget: {
      status: 'advisory',
      owner: 'Product Manager',
      maxIslandBundleRawBytes: expectedIslandFree ? 0 : roundUpBudget(islandBundles.eager.rawBytes),
      maxSharedChunkRawBytes: expectedIslandFree ? 0 : roundUpBudget(sharedChunks.eager.rawBytes),
      maxEagerClientJsRawBytes: roundUpBudget(eagerExternalDownloadRawBytes)
    }
  };
}

export function analyzePlaceBytes({
  rootDir = DEFAULT_ROOT_DIR,
  distClientDir = path.join(rootDir, 'dist', 'client'),
  netPath = path.join(rootDir, 'src', 'net', 'workbench-net.yaml')
} = {}) {
  if (!fs.existsSync(distClientDir)) {
    throw new Error(`Missing Astro client build directory: ${distClientDir}`);
  }

  const envelope = loadNetEnvelope(netPath);
  const astroMap = indexAstroAssets(distClientDir);
  const localFileCache = new Map();

  const pagePlaces = [];
  const viewPlaces = [];
  const violations = [];
  const referencedAstroUrls = new Set();

  for (const [placeId, binding] of Object.entries(envelope?.bindings?.places || {})) {
    if (!binding || (binding.kind !== 'page' && binding.kind !== 'view')) continue;
    const htmlAbsPath = path.join(distClientDir, binding.pagePath);
    if (!fs.existsSync(htmlAbsPath)) {
      violations.push(`${placeId}: missing built HTML file ${htmlAbsPath}`);
      continue;
    }

    const report = analyzeHtmlSurface({
      placeId,
      kind: binding.kind,
      route: binding.route,
      pagePath: binding.pagePath,
      migrationState: binding.migrationState || (binding.kind === 'view' ? 'astro-wrapped' : 'legacy-static'),
      htmlAbsPath,
      rootDir,
      astroMap,
      localFileCache
    });

    for (const f of report.islandBundles.files) referencedAstroUrls.add(f.urlPath);
    for (const f of report.sharedChunks.files) referencedAstroUrls.add(f.urlPath);

    if (!report.zeroIslandPass) {
      violations.push(`${placeId} (${binding.route}): island-free Place shipped ${report.zeroIslandViolations.join('; ')}`);
    }

    if (binding.kind === 'page') {
      pagePlaces.push(report);
    } else {
      viewPlaces.push(report);
    }
  }

  const additionalStaticSurfaces = [];
  const pkcDocsAbs = path.join(rootDir, 'pkc-docs-index.html');
  if (fs.existsSync(pkcDocsAbs)) {
    const pkcReport = analyzeHtmlSurface({
      placeId: 'p_undecided_pkc_docs_index',
      kind: 'undecided-static-page',
      route: '/pkc-docs-index.html',
      pagePath: 'pkc-docs-index.html',
      migrationState: 'legacy-static',
      htmlAbsPath: pkcDocsAbs,
      rootDir,
      astroMap,
      localFileCache
    });
    if (!pkcReport.zeroIslandPass) {
      violations.push(`pkc-docs-index.html: island-free page shipped ${pkcReport.zeroIslandViolations.join('; ')}`);
    }
    additionalStaticSurfaces.push(pkcReport);
  }

  const unreferencedAstroChunks = [...astroMap.values()]
    .filter((entry) => !referencedAstroUrls.has(entry.urlPath))
    .map((entry) => ({
      fileName: entry.fileName,
      urlPath: entry.urlPath,
      rawBytes: entry.rawBytes,
      gzipBytes: entry.gzipBytes,
      brotliBytes: entry.brotliBytes
    }));

  return {
    ok: violations.length === 0,
    violations,
    netId: envelope.netId,
    distClientDir,
    pagePlaces,
    viewPlaces,
    additionalStaticSurfaces,
    unreferencedAstroChunks
  };
}

export function reconcilePlaceBytesWithNetwork(placeReport, networkJsResources = []) {
  const astroNet = [];
  const pageNet = [];
  const seenUrls = new Set();

  for (const item of networkJsResources) {
    const rawUrl = String(item?.url || '');
    let pathname = rawUrl;
    try {
      pathname = new URL(rawUrl, 'http://127.0.0.1').pathname;
    } catch {}
    if (seenUrls.has(pathname)) continue;
    seenUrls.add(pathname);

    const decodedBytes = Number(item?.decodedBytes ?? item?.rawBytes ?? 0);
    const encodedBytes = Number(item?.encodedBytes ?? decodedBytes);
    const rec = { pathname, decodedBytes, encodedBytes };
    if (pathname.startsWith('/_astro/')) {
      astroNet.push(rec);
    } else {
      pageNet.push(rec);
    }
  }

  const networkAstroDecodedBytes = astroNet.reduce((a, r) => a + r.decodedBytes, 0);
  const networkPageDecodedBytes = pageNet.reduce((a, r) => a + r.decodedBytes, 0);

  const expectedAstroEagerBytes = placeReport.astroEagerBeforeInteraction.rawBytes;
  const astroEagerDeltaBytes = networkAstroDecodedBytes - expectedAstroEagerBytes;
  const deferredIslandDifferenceBytes = placeReport.islandBundles.deferred.rawBytes;
  const astroManifestVsNetworkDeltaBytes = placeReport.astroManifestTotalRawBytes - networkAstroDecodedBytes;

  const matchesWithinDocumentedChunkDifference = placeReport.expectedIslandFree
    ? networkAstroDecodedBytes === 0
    : astroEagerDeltaBytes === 0 && astroManifestVsNetworkDeltaBytes === deferredIslandDifferenceBytes;

  return {
    placeId: placeReport.placeId,
    route: placeReport.route,
    expectedIslandFree: placeReport.expectedIslandFree,
    staticAstroManifestRawBytes: placeReport.astroManifestTotalRawBytes,
    staticAstroEagerRawBytes: expectedAstroEagerBytes,
    deferredIslandRawBytes: deferredIslandDifferenceBytes,
    sharedChunkDeduplicationSavingsBytes: placeReport.sharedChunks.deduplicationSavingsRawBytes,
    networkAstroDecodedBytes,
    networkAstroFileCount: astroNet.length,
    astroEagerDeltaBytes,
    astroManifestVsNetworkDeltaBytes,
    networkPageDecodedBytes,
    staticPageExternalRawBytes: placeReport.pageScripts.external.rawBytes,
    pageDynamicImportDifferenceBytes: networkPageDecodedBytes - placeReport.pageScripts.external.rawBytes,
    matchesWithinDocumentedChunkDifference
  };
}

export function formatPlaceBytesMarkdown(analysis) {
  const lines = [
    '### Per-Place Client JavaScript Bytes (Static Astro Build Output)',
    '',
    '| Place ID | Route | Migration | Islands | Island Bundles (raw / gzip / br) | Shared Chunks (raw / gzip / br) | Page Scripts (raw / gzip) | Before-Interaction Total (raw / gzip) | Zero-Island Check |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  ];

  for (const p of [...analysis.pagePlaces, ...analysis.viewPlaces, ...analysis.additionalStaticSurfaces]) {
    const ib = `${p.islandBundles.eager.rawBytes} / ${p.islandBundles.eager.gzipBytes} / ${p.islandBundles.eager.brotliBytes} B`;
    const sc = `${p.sharedChunks.eager.rawBytes} / ${p.sharedChunks.eager.gzipBytes} / ${p.sharedChunks.eager.brotliBytes} B`;
    const ps = `${p.pageScripts.external.rawBytes} / ${p.pageScripts.external.gzipBytes} B`;
    const tot = `${p.clientJsBeforeInteraction.rawBytes} / ${p.clientJsBeforeInteraction.gzipBytes} B`;
    const check = p.expectedIslandFree ? (p.zeroIslandPass ? 'PASS (0 B)' : 'FAIL') : 'N/A (7 islands)';
    lines.push('| `' + p.placeId + '` | `' + p.route + '` | `' + p.migrationState + '` | ' + p.islandCount + ' | ' + ib + ' | ' + sc + ' | ' + ps + ' | ' + tot + ' | ' + check + ' |');
  }

  return lines.join('\n');
}

export function runCli(argv = process.argv.slice(2)) {
  const enforceZeroIsland = argv.includes('--enforce-zero-island-places');
  const emitMarkdown = argv.includes('--markdown');
  const writeStepSummary = argv.includes('--write-step-summary');
  const jsonFlag = argv.includes('--json');
  const jsonOutIdx = argv.indexOf('--json-out');
  const jsonOutPath = jsonOutIdx >= 0 ? argv[jsonOutIdx + 1] : null;

  const analysis = analyzePlaceBytes();

  if (jsonOutPath) {
    fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
    fs.writeFileSync(jsonOutPath, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');
  }

  if (emitMarkdown || writeStepSummary) {
    const md = formatPlaceBytesMarkdown(analysis);
    if (writeStepSummary && process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n\n`, 'utf8');
    } else {
      process.stdout.write(`${md}\n`);
    }
  } else if (jsonFlag) {
    process.stdout.write(`${JSON.stringify(analysis, null, 2)}\n`);
  } else {
    const islandFreeCount = analysis.pagePlaces.filter((p) => p.expectedIslandFree).length;
    process.stdout.write(
      `[gqc-place-bytes] ${analysis.ok ? 'PASS' : 'FAIL'} pagePlaces=${analysis.pagePlaces.length} islandFreePagePlaces=${islandFreeCount} violations=${analysis.violations.length}\n`
    );
  }

  if (enforceZeroIsland && !analysis.ok) {
    for (const v of analysis.violations) {
      process.stderr.write(`[gqc-place-bytes] VIOLATION: ${v}\n`);
    }
    process.exitCode = 1;
  }

  return analysis;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  runCli();
}
