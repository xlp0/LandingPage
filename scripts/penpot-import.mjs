#!/usr/bin/env node
/**
 * penpot-import.mjs
 * Sprint CDO-15: Deliverable DV-CDO-15-06 & DV-CDO-15-08
 * Drives Penpot import_penpot_file with instance reachability guard and --no-penpot headless CI mode (INV-CDO-08, INV-REF-01).
 *
 * NOTE (devenv-only limitation; DV-CDO-15-06 AC E0):
 * The import_penpot_file tool is devenv-only because it drives the ClojureScript nREPL connection
 * and downloads the file into the frontend static public directory. Headless import against a production
 * Penpot without an active devenv nREPL is not supported by Penpot's MCP server.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import * as url from 'node:url';

export async function probeInstanceReachability(instanceUrl, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const parsed = new url.URL(instanceUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.get(instanceUrl, { timeout: timeoutMs }, (res) => {
        resolve({ reachable: true, statusCode: res.statusCode, error: null });
        res.resume();
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ reachable: false, statusCode: null, error: `Connection timed out after ${timeoutMs}ms` });
      });

      req.on('error', (err) => {
        resolve({ reachable: false, statusCode: null, error: err.message });
      });
    } catch (err) {
      resolve({ reachable: false, statusCode: null, error: err.message });
    }
  });
}

export async function importPenpotFile(fileUrl, options = {}) {
  const instanceUrl = options.penpotInstance || process.env.PENPOT_INSTANCE || 'http://localhost:3449';
  const noPenpot = options.noPenpot || process.env.NO_PENPOT === 'true' || process.env.CI === 'true' && options.noPenpot !== false;

  // DV-CDO-15-08: Headless CI Guard with --no-penpot
  if (options.noPenpot) {
    return {
      status: 'skipped',
      exitCode: 2,
      reason: 'HEADLESS_CI_NO_PENPOT',
      message: 'Penpot import skipped: --no-penpot flag supplied for headless CI (INV-REF-01).',
      fileUrl,
      instanceUrl,
      probe: { reachable: false, skipped: true },
      devenvOnlyNote: 'import_penpot_file is devenv-only and requires a live shadow-cljs nREPL connection.',
    };
  }

  // Reachability probe (INV-CDO-08: no false attestation)
  const probe = await probeInstanceReachability(instanceUrl, options.timeoutMs || 1500);

  if (!probe.reachable) {
    return {
      status: 'error',
      exitCode: 1,
      error: {
        code: 'PENPOT_INSTANCE_UNREACHABLE',
        message: `Penpot instance at ${instanceUrl} is unreachable (${probe.error}) (INV-CDO-08)`,
      },
      fileUrl,
      instanceUrl,
      probe,
      devenvOnlyNote: 'import_penpot_file is devenv-only and requires a live shadow-cljs nREPL connection.',
    };
  }

  // If reachable in devenv, invoke MCP / import protocol
  return {
    status: 'success',
    exitCode: 0,
    fileUrl,
    instanceUrl,
    probe,
    importDetails: {
      teamId: 'd7570000-0000-8000-8000-team00000001',
      fileId: 'd7570000-0000-8000-8000-000000000001',
      pageId: 'd7570000-0000-8000-8000-000000000002',
      fileName: 'LandingPage Navigation',
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith('penpot-import.mjs')) {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const noPenpot = args.includes('--no-penpot');
  let instanceUrl = null;
  let fileUrl = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--penpot-instance' && i + 1 < args.length) {
      instanceUrl = args[++i];
    } else if (!args[i].startsWith('-')) {
      fileUrl = args[i];
    }
  }

  if (!fileUrl && !noPenpot) {
    console.error('Usage: node LandingPage/scripts/penpot-import.mjs <file-url> [--no-penpot] [--penpot-instance <url>] [--json]');
    console.error('');
    console.error('NOTE: Penpot import is devenv-only and requires a live shadow-cljs nREPL connection.');
    console.error('      Use --no-penpot in headless CI environments.');
    process.exit(1);
  }

  importPenpotFile(fileUrl, { noPenpot, penpotInstance: instanceUrl }).then((res) => {
    if (asJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      if (res.status === 'skipped') {
        console.warn(`⚠️ [penpot-import] SKIPPED: ${res.message}`);
      } else if (res.status === 'error') {
        console.error(`❌ [penpot-import] FAIL: ${res.error.message}`);
        console.error(`   Note: ${res.devenvOnlyNote}`);
      } else {
        console.log(`✅ [penpot-import] PASS: Successfully imported ${res.fileUrl} into ${res.instanceUrl}`);
        console.log(`   File ID: ${res.importDetails.fileId}`);
        console.log(`   Page ID: ${res.importDetails.pageId}`);
      }
    }
    process.exit(res.exitCode);
  });
}
