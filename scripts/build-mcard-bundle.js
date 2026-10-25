#!/usr/bin/env node
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const shimDir = join(root, 'public', 'js', 'mcard-kernel', 'node-shims');

const DISK_SHIMS = new Set(['crypto', 'events', 'path']);
const VIRTUAL_SHIMS = new Set(['dgram', 'fs', 'http', 'https', 'module', 'url', 'zlib']);
const ALL_BUILTINS = [...DISK_SHIMS, ...VIRTUAL_SHIMS];

const VIRTUAL_NOOP_SOURCE = `
const unavailable = (name) => () => {
  throw new Error(\`node-noop shim: '\${name}' is unavailable in the browser\`);
};
export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;
export const fileURLToPath = unavailable('fileURLToPath');
export const createRequire = () => unavailable('require');
export const existsSync = () => false;
export const readdirSync = () => [];
export const readFileSync = unavailable('readFileSync');
export const writeFileSync = unavailable('writeFileSync');
export const mkdirSync = unavailable('mkdirSync');
export const statSync = unavailable('statSync');
export const rmSync = unavailable('rmSync');
export const promises = new Proxy({}, { get: (_t, p) => unavailable(String(p)) });
export const createSocket = unavailable('createSocket');
export const createServer = unavailable('createServer');
export const request = unavailable('request');
export const get = unavailable('get');
export const inflateRawSync = unavailable('inflateRawSync');
export const deflateRawSync = unavailable('deflateRawSync');
export const inflateSync = unavailable('inflateSync');
export const deflateSync = unavailable('deflateSync');
export default {
  URL, URLSearchParams, fileURLToPath, createRequire,
  existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, rmSync, promises,
  createSocket, createServer, request, get,
  inflateRawSync, deflateRawSync, inflateSync, deflateSync,
};
`;

const shimPlugin = {
  name: 'node-builtin-shims',
  setup(b) {
    const filter = new RegExp(`^(?:node:)?(${ALL_BUILTINS.join('|')})(/.*)?$`);
    b.onResolve({ filter }, (args) => {
      const bare = args.path.replace(/^node:/, '').split('/')[0];
      if (VIRTUAL_SHIMS.has(bare)) {
        return { path: bare, namespace: 'node-noop' };
      }
      return { path: join(shimDir, `${bare}.js`) };
    });
    b.onLoad({ filter: /.*/, namespace: 'node-noop' }, () => ({
      contents: VIRTUAL_NOOP_SOURCE,
      loader: 'js',
    }));
  },
};

await build({
  entryPoints: [join(root, 'public', 'js', 'mcard-kernel', 'bundle-entry.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: join(root, 'public', 'js', 'vendor', 'mcard-bundle.js'),
  plugins: [shimPlugin],
  // `Buffer` is a Node *global*, not an import, so a resolve plugin cannot catch
  // it. esbuild's inject replaces the free reference instead.
  inject: [join(shimDir, 'buffer.js')],
  logLevel: 'info',
});
