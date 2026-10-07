#!/usr/bin/env node
/**
 * penpot-drift.mjs
 * Sprint CDO-15: Deliverable DV-CDO-15-05
 * Compares the Penpot navigation graph with the live unit routes and artifacts,
 * reporting drifted, unbound, unmapped, and broken link cases (INV-CDO-11, INV-CDO-12, INV-CDO-13).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractNavigationGraph } from './penpot-nav.mjs';
import { sha256 } from './penpot-zip.mjs';
import { resolveUnitDir, DEFAULT_ROUTES, getRouteContent } from './penpot-init.mjs';

export function checkNavigationDrift(unitDir, options = {}) {
  const resolvedUnit = resolveUnitDir(unitDir);
  const manifestPath = path.join(resolvedUnit, 'mcard.yaml');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`MANIFEST_NOT_FOUND: mcard.yaml missing at ${manifestPath} (INV-CDO-08)`);
  }

  const manifestText = fs.readFileSync(manifestPath, 'utf8');
  let penpotRelFile = 'design/landing-navigation.penpot';
  const matchFile = manifestText.match(/penpot_file\s*:\s*["']?([^"']+)["']?/);
  if (matchFile) penpotRelFile = matchFile[1].trim();

  const penpotFullPath = path.join(resolvedUnit, penpotRelFile);
  if (!fs.existsSync(penpotFullPath)) {
    return {
      status: 'drift',
      driftCount: 1,
      error: 'MISSING_PENPOT_FILE',
      message: `Declared penpot file missing on disk: ${penpotFullPath}`,
      unbound: [],
      drifted: [],
      unmapped: [],
      brokenEdges: [],
      driftedArtifacts: [],
    };
  }

  const graph = extractNavigationGraph(penpotFullPath);

  const unbound = [];
  const drifted = [];
  const unmapped = [];
  const brokenEdges = [];
  const driftedArtifacts = [];

  const frameMap = new Map();
  const handleMap = new Map();

  // 1. Check each frame in the graph
  for (const f of graph.frames) {
    frameMap.set(f.id, f);
    const clm = f.pluginData?.clm;

    if (!clm || !clm.handle) {
      unbound.push({
        frameId: f.id,
        frameName: f.name,
        reason: 'Navigable frame has no plugin-data CLM handle (INV-CDO-12)',
      });
      continue;
    }

    handleMap.set(clm.handle, f);

    // Resolve route file from handle
    let relRoute = clm.handle.replace(/^mcard:route:/, '');
    if (relRoute.startsWith('/')) relRoute = relRoute.slice(1);
    const routeDiskPath = path.join(resolvedUnit, relRoute);

    if (!fs.existsSync(routeDiskPath)) {
      drifted.push({
        handle: clm.handle,
        frameId: f.id,
        frameName: f.name,
        expectedPath: relRoute,
        reason: `Route file does not exist on disk for handle ${clm.handle}`,
      });
    } else {
      const diskContent = getRouteContent(routeDiskPath);
      const actualHash = sha256(diskContent);
      if (clm.hash && clm.hash !== actualHash) {
        drifted.push({
          handle: clm.handle,
          frameId: f.id,
          frameName: f.name,
          path: relRoute,
          expectedHash: clm.hash,
          actualHash,
          reason: `Content hash mismatch between Penpot design (${clm.hash.slice(0, 12)}...) and deployed route (${actualHash.slice(0, 12)}...)`,
        });
      }
    }
  }

  // 2. Check for routes present in the unit but unmapped in the graph
  const expectedRoutes = options.routes || DEFAULT_ROUTES;
  for (const exp of expectedRoutes) {
    if (!handleMap.has(exp.handle)) {
      unmapped.push({
        handle: exp.handle,
        path: exp.path,
        name: exp.name,
        reason: `Route '${exp.path}' (${exp.handle}) exists in unit but has no bound frame in Penpot flow graph (INV-CDO-12)`,
      });
    }
  }

  // 3. Check interaction edges for broken destinations
  for (const inter of graph.interactions) {
    if (!inter.destination || !frameMap.has(inter.destination)) {
      brokenEdges.push({
        sourceFrameId: inter.sourceFrameId,
        destination: inter.destination,
        reason: `Flow edge points to non-existent or unmapped frame '${inter.destination}'`,
      });
    }
  }

  // 4. Check rendered navigation artifacts against graph
  const navJsPath = path.join(resolvedUnit, 'js', 'nav.js');
  if (fs.existsSync(navJsPath)) {
    const navJsContent = fs.readFileSync(navJsPath, 'utf8');
    if (!navJsContent.includes(graph.meta.graphHash)) {
      driftedArtifacts.push({
        target: 'js/nav.js',
        reason: `Rendered js/nav.js does not match current Penpot graphHash ${graph.meta.graphHash}`,
      });
    }
  } else {
    driftedArtifacts.push({
      target: 'js/nav.js',
      reason: 'Render target js/nav.js does not exist on disk (needs render)',
    });
  }

  const indexPath = path.join(resolvedUnit, 'index.html');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    if (!indexContent.includes(graph.meta.graphHash)) {
      driftedArtifacts.push({
        target: 'index.html',
        reason: `Rendered index.html navigation markup does not match current Penpot graphHash ${graph.meta.graphHash}`,
      });
    }
  }

  const totalDrift = unbound.length + drifted.length + unmapped.length + brokenEdges.length + driftedArtifacts.length;
  const isClean = totalDrift === 0;

  // Evolution record representation (DV-CDO-15-05 AC E2)
  const evolutionMCard = {
    handle: `mcard:evolution:navigation-drift:${Date.now()}`,
    unit: path.basename(resolvedUnit),
    graphHash: graph.meta.graphHash,
    archiveHash: graph.meta.archiveHash,
    driftCount: totalDrift,
    status: isClean ? 'clean' : 'drift',
    details: {
      unbound,
      drifted,
      unmapped,
      brokenEdges,
      driftedArtifacts,
    },
    timestamp: new Date().toISOString(),
  };

  return {
    status: isClean ? 'clean' : 'drift',
    driftCount: totalDrift,
    unbound,
    drifted,
    unmapped,
    brokenEdges,
    driftedArtifacts,
    meta: {
      penpotFile: penpotRelFile,
      graphHash: graph.meta.graphHash,
      archiveHash: graph.meta.archiveHash,
    },
    evolutionMCard,
  };
}

if (process.argv[1] && process.argv[1].endsWith('penpot-drift.mjs')) {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const unitDir = args.find(a => !a.startsWith('-')) || 'LandingPage';

  try {
    const res = checkNavigationDrift(unitDir);
    if (asJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      if (res.status === 'clean') {
        console.log(`✅ [penpot-drift] ZERO DRIFT: Navigation graph and unit code are 100% synchronized`);
        console.log(`   Graph Hash:   ${res.meta.graphHash}`);
        console.log(`   Archive Hash: ${res.meta.archiveHash}`);
      } else {
        console.error(`❌ [penpot-drift] DRIFT DETECTED: Found ${res.driftCount} navigation discrepancies:`);
        for (const u of res.unbound) console.error(`   - [UNBOUND] Frame '${u.frameName}' (${u.frameId}): ${u.reason}`);
        for (const d of res.drifted) console.error(`   - [DRIFTED] Handle '${d.handle}': ${d.reason}`);
        for (const m of res.unmapped) console.error(`   - [UNMAPPED] Route '${m.path}' (${m.handle}): ${m.reason}`);
        for (const b of res.brokenEdges) console.error(`   - [BROKEN] Edge ${b.sourceFrameId} -> ${b.destination}: ${b.reason}`);
        for (const a of res.driftedArtifacts) console.error(`   - [OUT-OF-DATE] ${a.target}: ${a.reason}`);
      }
    }
    process.exit(res.status === 'clean' ? 0 : 1);
  } catch (err) {
    if (asJson) {
      console.log(JSON.stringify({ status: 'error', error: { message: err.message } }, null, 2));
    } else {
      console.error(`❌ [penpot-drift] Error: ${err.message}`);
    }
    process.exit(1);
  }
}
