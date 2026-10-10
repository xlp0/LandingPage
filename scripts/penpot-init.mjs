#!/usr/bin/env node
/**
 * penpot-init.mjs
 * Sprint CDO-15: Deliverable DV-CDO-15-03
 * Generates a .penpot archive mirroring the unit's declared routes,
 * seeding each frame's plugin-data with its CLM handle and content hash (INV-CDO-11, INV-CDO-12).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256, writeZip } from './penpot-zip.mjs';
import {
  createRectShape,
  createTextShape,
  buildIndexHtmlShapes,
  buildAppHtmlShapes,
  buildResponsiveLabShapes,
} from './penpot-screens.mjs';

// Deterministic UUIDs for stable round-trips (INV-CDO-13)
export const PENPOT_FILE_ID = 'd7570000-0000-8000-8000-000000000001';
export const PENPOT_PAGE_ID = 'd7570000-0000-8000-8000-000000000002';
export const PENPOT_FLOW_ID = 'd7570000-0000-8000-8000-000000000003';

export const DEFAULT_ROUTES = [
  {
    path: 'index.html',
    name: 'Home',
    handle: 'mcard:route:/index.html',
    frameId: 'd7570000-0000-8000-8000-000000000011',
    isStart: true,
    destinations: ['d7570000-0000-8000-8000-000000000012', 'd7570000-0000-8000-8000-000000000013'],
  },
  {
    path: 'app.html',
    name: 'Mission Control',
    handle: 'mcard:route:/app.html',
    frameId: 'd7570000-0000-8000-8000-000000000012',
    isStart: false,
    destinations: ['d7570000-0000-8000-8000-000000000011'],
  },
  {
    path: 'responsive-lab.html',
    name: 'Responsive UI Lab',
    handle: 'mcard:route:/responsive-lab.html',
    frameId: 'd7570000-0000-8000-8000-000000000013',
    isStart: false,
    destinations: ['d7570000-0000-8000-8000-000000000011'],
  },
];

export function resolveUnitDir(unitArg) {
  let resolved = path.resolve(unitArg || process.cwd());
  if (fs.existsSync(path.join(resolved, 'mcard.yaml'))) return resolved;
  const lp = path.join(resolved, 'LandingPage');
  if (fs.existsSync(path.join(lp, 'mcard.yaml'))) return lp;
  return resolved;
}

export function getRouteContent(fullPath) {
  const raw = fs.readFileSync(fullPath, 'utf8');
  // Strip generated nav block so route content hash is stable across renders (INV-CDO-11, INV-CDO-13)
  return raw.replace(/<!-- BEGIN: PENPOT-GENERATED-NAV[\s\S]*?<!-- END: PENPOT-GENERATED-NAV -->/g, '');
}

export function generatePenpotArchive(unitDir, options = {}) {
  const resolvedUnit = resolveUnitDir(unitDir);
  const manifestPath = path.join(resolvedUnit, 'mcard.yaml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`MANIFEST_NOT_FOUND: mcard.yaml not found in ${resolvedUnit} (INV-CDO-08)`);
  }

  const manifestText = fs.readFileSync(manifestPath, 'utf8');

  // Parse navigation block from manifest
  let penpotRelFile = 'design/landing-navigation.penpot';
  const matchFile = manifestText.match(/penpot_file\s*:\s*["']?([^"']+)["']?/);
  if (matchFile) penpotRelFile = matchFile[1].trim();

  // Route definitions
  const routeConfigs = options.routes || DEFAULT_ROUTES;

  // Validation: Check that every route file exists on disk (AC E2: report at generation time)
  const routeEntries = [];
  for (const r of routeConfigs) {
    const fullPath = path.join(resolvedUnit, r.path);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`GENERATION_ERROR: Route file '${r.path}' does not exist on disk for handle '${r.handle}' (INV-CDO-12)`);
    }
    const content = getRouteContent(fullPath);
    const contentHash = sha256(content);
    routeEntries.push({
      ...r,
      fullPath,
      contentHash,
    });
  }

  // Ensure starting frame is defined
  const startingRoute = routeEntries.find(r => r.isStart) || routeEntries[0];
  const startingFrameId = startingRoute.frameId;

  // Build Penpot zip entries
  const entries = {};

  // 1. manifest.json
  entries['manifest.json'] = {
    type: 'penpot/export-files',
    version: 1,
    generatedBy: 'clm-kernel/0.0.3',
    referer: 'penpot',
    files: [
      {
        id: PENPOT_FILE_ID,
        name: 'LandingPage Navigation',
        features: [
          'fdata/path-data',
          'design-tokens/v1',
          'variants/v1',
          'layout/grid',
          'components/v2',
          'fdata/shape-data-type',
        ],
      },
    ],
  };

  // 2. files/<fileId>.json (Malli schema:file strictly requires version and features)
  entries[`files/${PENPOT_FILE_ID}.json`] = {
    id: PENPOT_FILE_ID,
    name: 'LandingPage Navigation',
    features: [
      'fdata/path-data',
      'design-tokens/v1',
      'variants/v1',
      'layout/grid',
      'components/v2',
      'fdata/shape-data-type',
    ],
    version: 67,
    revn: 1,
    vern: 0,
    'created-at': '2026-10-07T00:00:00.000Z',
    'modified-at': '2026-10-07T00:00:00.000Z',
    'is-shared': true,
    'has-media-trimmed': false,
    options: {
      componentsV2: true,
      baseFontSize: '16px',
    },
    metadata: {
      referer: 'penpot',
      generatedBy: 'clm-kernel/0.0.3',
    },
  };

  // 3. files/<fileId>/pages/<pageId>.json
  entries[`files/${PENPOT_FILE_ID}/pages/${PENPOT_PAGE_ID}.json`] = {
    id: PENPOT_PAGE_ID,
    name: 'Main Navigation Flow',
    index: 0,
    flows: {
      [PENPOT_FLOW_ID]: {
        id: PENPOT_FLOW_ID,
        name: 'main-nav',
        'starting-frame': startingFrameId,
        startingFrame: startingFrameId,
      },
    },
  };

  // 4. Root Canvas Frame: files/<fileId>/pages/<pageId>/00000000-0000-0000-0000-000000000000.json
  const PENPOT_ROOT_FRAME_ID = '00000000-0000-0000-0000-000000000000';
  entries[`files/${PENPOT_FILE_ID}/pages/${PENPOT_PAGE_ID}/${PENPOT_ROOT_FRAME_ID}.json`] = {
    id: PENPOT_ROOT_FRAME_ID,
    name: 'Root Frame',
    type: 'frame',
    x: 0,
    y: 0,
    width: 0.01,
    height: 0.01,
    rotation: 0,
    selrect: {
      x: 0,
      y: 0,
      width: 0.01,
      height: 0.01,
      x1: 0,
      y1: 0,
      x2: 0.01,
      y2: 0.01,
    },
    points: [
      { x: 0, y: 0 },
      { x: 0.01, y: 0 },
      { x: 0.01, y: 0.01 },
      { x: 0, y: 0.01 },
    ],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    'transform-inverse': { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    'parent-id': PENPOT_ROOT_FRAME_ID,
    'frame-id': PENPOT_ROOT_FRAME_ID,
    'page-id': PENPOT_PAGE_ID,
    'hide-fill-on-export': false,
    strokes: [],
    fills: [
      {
        'fill-color': '#FFFFFF',
        'fill-opacity': 1,
      },
    ],
    shapes: routeEntries.map(r => r.frameId),
  };

  // 5. Route Frames and shapes: files/<fileId>/pages/<pageId>/<shapeId>.json
  let xOffset = 100;
  for (const r of routeEntries) {
    const interactions = (r.destinations || []).map((destId, idx) => ({
      id: `nav-${r.frameId}-${destId}-${idx}`,
      'action-type': 'navigate',
      'event-type': 'click',
      destination: destId,
      'preserve-scroll': false,
      animation: {
        'animation-type': 'slide',
        duration: 250,
        easing: 'ease-in-out',
        direction: destId === startingFrameId ? 'left' : 'right',
        way: 'in',
        'offset-effect': false,
      },
    }));

    const frameWidth = 1200;
    const frameHeight = 800;

    let childShapes = [];
    if (r.path === 'index.html') {
      childShapes = buildIndexHtmlShapes(r, xOffset, PENPOT_PAGE_ID);
    } else if (r.path === 'app.html') {
      childShapes = buildAppHtmlShapes(r, xOffset, PENPOT_PAGE_ID);
    } else if (r.path === 'responsive-lab.html') {
      childShapes = buildResponsiveLabShapes(r, xOffset, PENPOT_PAGE_ID);
    }

    const frameShape = {
      id: r.frameId,
      name: r.name,
      type: 'frame',
      'page-id': PENPOT_PAGE_ID,
      x: xOffset,
      y: 100,
      width: frameWidth,
      height: frameHeight,
      rotation: 0,
      selrect: {
        x: xOffset,
        y: 100,
        width: frameWidth,
        height: frameHeight,
        x1: xOffset,
        y1: 100,
        x2: xOffset + frameWidth,
        y2: 100 + frameHeight,
      },
      points: [
        { x: xOffset, y: 100 },
        { x: xOffset + frameWidth, y: 100 },
        { x: xOffset + frameWidth, y: 100 + frameHeight },
        { x: xOffset, y: 100 + frameHeight },
      ],
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      'transform-inverse': { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      'parent-id': PENPOT_ROOT_FRAME_ID,
      'frame-id': PENPOT_ROOT_FRAME_ID,
      'hide-fill-on-export': false,
      strokes: [
        {
          'stroke-color': '#334155',
          'stroke-width': 1,
          'stroke-opacity': 1,
          'stroke-style': 'solid',
          'stroke-alignment': 'inner',
        },
      ],
      r1: 8,
      r2: 8,
      r3: 8,
      r4: 8,
      fills: [
        {
          'fill-color': '#0F172A',
          'fill-opacity': 1,
        },
      ],
      shapes: childShapes.map(s => s.id),
      'plugin-data': {
        clm: {
          handle: r.handle,
          hash: r.contentHash,
        },
      },
      interactions,
    };

    entries[`files/${PENPOT_FILE_ID}/pages/${PENPOT_PAGE_ID}/${r.frameId}.json`] = frameShape;
    for (const child of childShapes) {
      entries[`files/${PENPOT_FILE_ID}/pages/${PENPOT_PAGE_ID}/${child.id}.json`] = child;
    }

    xOffset += 1350;
  }

  // Create ZIP buffer
  const zipBuffer = writeZip(entries);

  // Write to destination
  const targetPenpotPath = options.out
    ? path.resolve(options.out)
    : path.join(resolvedUnit, penpotRelFile);

  const targetDir = path.dirname(targetPenpotPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetPenpotPath, zipBuffer);

  // Also mirror to /tmp/landing-navigation.penpot if running for LandingPage
  try {
    fs.writeFileSync('/tmp/landing-navigation.penpot', zipBuffer);
  } catch {}

  // Update mcard.yaml starting_frame if needed
  if (manifestText.includes('<frame-uuid>')) {
    const updatedYaml = manifestText.replace('<frame-uuid>', startingFrameId);
    fs.writeFileSync(manifestPath, updatedYaml, 'utf8');
  }

  return {
    ok: true,
    targetFile: targetPenpotPath,
    bytes: zipBuffer.length,
    archiveHash: sha256(zipBuffer),
    startingFrameId,
    routesCount: routeEntries.length,
  };
}

if (process.argv[1] && process.argv[1].endsWith('penpot-init.mjs')) {
  const args = process.argv.slice(2);
  let outPath = null;
  let unitDir = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && i + 1 < args.length) {
      outPath = args[++i];
    } else if (!args[i].startsWith('-')) {
      unitDir = args[i];
    }
  }

  try {
    const res = generatePenpotArchive(unitDir || 'LandingPage', { out: outPath });
    console.log(`✅ [penpot-init] Generated Penpot navigation archive:`);
    console.log(`   Destination:  ${res.targetFile}`);
    console.log(`   Size:         ${res.bytes} bytes`);
    console.log(`   Archive Hash: ${res.archiveHash}`);
    console.log(`   Routes:       ${res.routesCount}`);
    console.log(`   Start Frame:  ${res.startingFrameId}`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ [penpot-init] Error: ${err.message}`);
    process.exit(1);
  }
}
