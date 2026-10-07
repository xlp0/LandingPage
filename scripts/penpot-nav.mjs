#!/usr/bin/env node
/**
 * penpot-nav.mjs
 * Sprint CDO-15: Deliverable DV-CDO-15-02
 * Extracts pages, frames, flows, interactions, and plugin-data from a .penpot archive (INV-CDO-11, INV-CDO-12, INV-CDO-13).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { readZip, sha256, deterministicStringify } from './penpot-zip.mjs';

export function extractNavigationGraph(penpotFilePath) {
  const resolvedPath = path.resolve(penpotFilePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`FILE_NOT_FOUND: Penpot file does not exist at ${resolvedPath} (INV-CDO-08)`);
  }

  const archiveBuffer = fs.readFileSync(resolvedPath);
  const archiveHash = sha256(archiveBuffer);

  // readZip throws MALFORMED_ARCHIVE on corrupt/invalid zip (INV-CDO-08)
  const zip = readZip(archiveBuffer);

  const manifest = zip.getJson('manifest.json');
  if (!manifest) {
    throw new Error(`MALFORMED_ARCHIVE: Missing manifest.json in .penpot archive ${resolvedPath} (INV-CDO-08)`);
  }

  const fileList = manifest.files || [];
  const pagesList = [];
  const allFlows = [];
  const allFrames = [];
  const allInteractions = [];
  const allPluginData = [];

  // Find all file JSONs
  const zipFiles = zip.list();

  for (const f of fileList) {
    const fileId = f.id;
    // Find pages for this file: files/<fileId>/pages/<pageId>.json
    const pagePrefix = `files/${fileId}/pages/`;
    const pageFiles = zipFiles.filter(p => p.startsWith(pagePrefix) && p.endsWith('.json') && p.split('/').length === 4);

    for (const pageFilePath of pageFiles) {
      const pageData = zip.getJson(pageFilePath);
      if (!pageData) continue;

      const pageId = pageData.id || path.basename(pageFilePath, '.json');
      const pageName = pageData.name || 'Untitled Page';
      const pageIndex = typeof pageData.index === 'number' ? pageData.index : 0;

      // Extract flows for this page
      const pageFlows = [];
      const rawFlows = pageData.flows || {};
      for (const flowKey of Object.keys(rawFlows).sort()) {
        const flowObj = rawFlows[flowKey];
        const flowId = flowObj.id || flowKey;
        const startingFrame = flowObj['starting-frame'] || flowObj.startingFrame;
        const flowEntry = {
          id: String(flowId),
          name: flowObj.name || 'Flow',
          startingFrame: startingFrame ? String(startingFrame) : null,
          pageId: String(pageId),
        };
        pageFlows.push(flowEntry);
        allFlows.push(flowEntry);
      }

      // Find shapes for this page: files/<fileId>/pages/<pageId>/<shapeId>.json
      const shapePrefix = `files/${fileId}/pages/${pageId}/`;
      const shapeFiles = zipFiles.filter(p => p.startsWith(shapePrefix) && p.endsWith('.json') && p.split('/').length === 5);

      const pageFrames = [];

      for (const shapeFilePath of shapeFiles) {
        const shapeData = zip.getJson(shapeFilePath);
        if (!shapeData) continue;

        // In Penpot, frames have type === "frame" or (type === "group" and frameId is set)
        const isFrame = shapeData.type === 'frame' || shapeData.frame === true;
        if (!isFrame) continue;

        const frameId = String(shapeData.id || path.basename(shapeFilePath, '.json'));
        const frameName = shapeData.name || 'Untitled Frame';

        // Extract pluginData (CLM handle and hash)
        const rawPluginData = shapeData['plugin-data'] || shapeData.pluginData || {};
        const clmData = rawPluginData.clm || rawPluginData[':clm'] || null;

        const frameInteractions = [];
        const rawInteractions = shapeData.interactions || [];

        for (const inter of rawInteractions) {
          const actionType = inter['action-type'] || inter.actionType;
          if (actionType === 'navigate' || actionType === ':navigate') {
            const dest = inter.destination ? String(inter.destination) : null;
            const interEntry = {
              id: inter.id ? String(inter.id) : `${frameId}->${dest}`,
              sourceFrameId: frameId,
              actionType: 'navigate',
              destination: dest,
              eventType: inter['event-type'] || inter.eventType || 'click',
              animation: inter.animation || null,
            };
            frameInteractions.push(interEntry);
            allInteractions.push(interEntry);
          }
        }

        const frameEntry = {
          id: frameId,
          name: frameName,
          pageId: String(pageId),
          pluginData: clmData ? { clm: clmData } : {},
          interactions: frameInteractions.sort((a, b) => a.destination.localeCompare(b.destination)),
        };

        pageFrames.push(frameEntry);
        allFrames.push(frameEntry);

        if (clmData) {
          allPluginData.push({
            frameId,
            frameName,
            handle: clmData.handle || null,
            hash: clmData.hash || null,
          });
        }
      }

      pageFrames.sort((a, b) => a.id.localeCompare(b.id));

      pagesList.push({
        id: String(pageId),
        name: pageName,
        index: pageIndex,
        flows: pageFlows.sort((a, b) => a.id.localeCompare(b.id)),
        frames: pageFrames,
      });
    }
  }

  pagesList.sort((a, b) => a.index - b.index || a.id.localeCompare(b.id));
  allFlows.sort((a, b) => a.id.localeCompare(b.id));
  allFrames.sort((a, b) => a.id.localeCompare(b.id));
  allInteractions.sort((a, b) => a.sourceFrameId.localeCompare(b.sourceFrameId) || (a.destination || '').localeCompare(b.destination || ''));
  allPluginData.sort((a, b) => a.frameId.localeCompare(b.frameId));

  // Compute canonical graph hash over structural content
  const canonicalGraph = {
    pages: pagesList,
    flows: allFlows,
    frames: allFrames,
    interactions: allInteractions,
    pluginData: allPluginData,
  };

  const graphHash = sha256(deterministicStringify(canonicalGraph));

  return {
    ...canonicalGraph,
    meta: {
      archiveHash,
      graphHash,
      sourceFile: path.relative(process.cwd(), resolvedPath),
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith('penpot-nav.mjs')) {
  const args = process.argv.slice(2);
  const targetFile = args.find(a => !a.startsWith('-'));
  const asJson = args.includes('--json');

  if (!targetFile) {
    console.error('Usage: node LandingPage/scripts/penpot-nav.mjs <file.penpot> [--json]');
    process.exit(1);
  }

  try {
    const graph = extractNavigationGraph(targetFile);
    if (asJson) {
      console.log(JSON.stringify(graph, null, 2));
    } else {
      console.log(`✅ [penpot-nav] Extracted Navigation Graph from ${targetFile}`);
      console.log(`   Archive Hash: ${graph.meta.archiveHash}`);
      console.log(`   Graph Hash:   ${graph.meta.graphHash}`);
      console.log(`   Pages:        ${graph.pages.length}`);
      console.log(`   Flows:        ${graph.flows.length}`);
      console.log(`   Frames:       ${graph.frames.length}`);
      console.log(`   Interactions: ${graph.interactions.length}`);
      console.log(`   Plugin Handles: ${graph.pluginData.length}`);
    }
    process.exit(0);
  } catch (err) {
    if (asJson) {
      console.log(JSON.stringify({
        status: 'error',
        error: { code: err.message.startsWith('MALFORMED_ARCHIVE') ? 'MALFORMED_ARCHIVE' : 'EXTRACTION_ERROR', message: err.message }
      }, null, 2));
    } else {
      console.error(`❌ [penpot-nav] Error: ${err.message}`);
    }
    process.exit(1);
  }
}
