#!/usr/bin/env node
/**
 * Builds the browser bundle for the published clm-kernel (INV-CDO-33).
 *
 * The kernel's ESM entry imports Node built-ins unconditionally (`crypto`, `fs`,
 * `module`, `path`, `events`, `http`, `dgram`), so it cannot be bundled for the
 * browser as shipped. This script uses esbuild's JS API with a resolve plugin
 * that maps each built-in to a browser shim under
 * public/js/mcard-kernel/node-shims/. `--alias` cannot express this because it
 * maps package names, not file paths.
 *
 * Shims are functional where the work is pure string/hash handling (path,
 * events, crypto.sha256) and throw loudly where the API is genuinely Node-only
 * (fs, http, dgram, module.createRequire), so a mistaken browser call fails
 * visibly rather than silently.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const shimDir = join(root, 'public', 'js', 'mcard-kernel', 'node-shims');

const NODE_BUILTINS = ['crypto', 'fs', 'module', 'path', 'events', 'http', 'dgram'];

const shimPlugin = {
  name: 'node-builtin-shims',
  setup(b) {
    const filter = new RegExp(`^(${NODE_BUILTINS.join('|')})(/.*)?$`);
    b.onResolve({ filter }, (args) => ({
      path: join(shimDir, `${args.path.split('/')[0]}.js`),
    }));
  },
};

await build({
  entryPoints: [join(root, 'public', 'js', 'mcard-kernel', 'bundle-entry.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: join(root, 'public', 'js', 'vendor', 'clm-kernel.bundle.js'),
  plugins: [shimPlugin],
  logLevel: 'info',
});
