#!/usr/bin/env node
/**
 * Builds browser bundles for d3 and chart.js for lazy dynamic import (CDO-13).
 * Keeps core initial payload free of chart libraries (INV-REF-01).
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const landingRoot = resolve(here, '..');
const repoRoot = resolve(landingRoot, '..');
const vendorDir = join(landingRoot, 'public', 'js', 'vendor');

console.log('[build-chart-bundles] Bundling d3 and chart.js...');

await Promise.all([
  build({
    stdin: {
      contents: "export * from 'd3';",
      resolveDir: repoRoot,
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: true,
    outfile: join(vendorDir, 'd3.bundle.js'),
    logLevel: 'info',
  }),
  build({
    stdin: {
      contents: "export * from 'chart.js/auto';",
      resolveDir: repoRoot,
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: true,
    outfile: join(vendorDir, 'chartjs.bundle.js'),
    logLevel: 'info',
  }),
]);

console.log('[build-chart-bundles] Completed successfully.');
