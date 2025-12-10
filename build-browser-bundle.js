/**
 * Build browser bundle for mcard-js
 * Only includes browser-compatible parts
 */

import * as esbuild from 'esbuild';

// Create a wrapper that exports only browser-safe parts
const browserWrapper = `
// Browser-compatible exports from mcard-js
// Use direct file paths to bypass package.json exports restrictions
export { MCard } from './node_modules/mcard-js/dist/model/MCard.js';
export { GTime } from './node_modules/mcard-js/dist/model/GTime.js';
export { IndexedDBEngine } from './node_modules/mcard-js/dist/storage/IndexedDBEngine.js';
export { ContentTypeInterpreter } from './node_modules/mcard-js/dist/model/detectors/ContentTypeInterpreter.js';
export { HashValidator } from './node_modules/mcard-js/dist/hash/HashValidator.js';
`;

// Write wrapper file
import { writeFileSync } from 'fs';
writeFileSync('mcard-browser-entry.js', browserWrapper);

// Bundle for browser
await esbuild.build({
  entryPoints: ['mcard-browser-entry.js'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: 'public/js/vendor/mcard-js.bundle.js',
  external: [], // Bundle everything
  minify: false, // Keep readable for debugging
  sourcemap: true,
  logLevel: 'info'
});

console.log('✅ Browser bundle created: public/js/vendor/mcard-js.bundle.js');
