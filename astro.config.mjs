import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import { netParityIntegration } from './src/integrations/net-parity.mjs';
import { buildContentSecurityPolicy } from './js/harness/target-membrane.js';

const astroPublicUrl = new URL('./.cache/astro-public', import.meta.url);
fs.mkdirSync(astroPublicUrl, { recursive: true });

const backendOrigin = `http://localhost:${process.env.PORT || 3000}`;
const httpProxyPrefixes = [
  '/app-config.json',
  '/health',
  '/public',
  '/js',
  '/css',
  '/components',
  '/data',
  '/docs',
  '/tests',
  '/archive',
  '/packages',
  '/vendor',
  '/assets',
  '/icons',
  '/examples',
  '/conformance',
  '/icon.svg',
  '/icon-192.png',
  '/sw.js',
  '/sw-clm.js',
  '/manifest.json',
  '/manifest-clm.json',
  '/pkc-docs-index.html'
];

const proxy = {
  '/api': { target: backendOrigin, changeOrigin: false, ws: true },
  '/ws': { target: backendOrigin, changeOrigin: false, ws: true }
};
for (const prefix of httpProxyPrefixes) {
  proxy[prefix] = { target: backendOrigin, changeOrigin: false };
}

// Astro and @astrojs/node pin some dependencies at majors the workspace root hoists
// differently (e.g. clsx 2 vs 1, devalue 6 vs 5). Left external, the server bundle's bare
// imports would resolve from dist/ to the wrong root copy, so bundle each owner's nested
// packages instead. Works under both standalone and workspace-hoisted installs.
const nestedDepNames = ['astro', '@astrojs/node'].flatMap((pkg) => {
  const entry = fileURLToPath(import.meta.resolve(pkg));
  const marker = `node_modules/${pkg}/`;
  const nestedDir = entry.slice(0, entry.lastIndexOf(marker) + marker.length) + 'node_modules';
  if (!fs.existsSync(nestedDir)) return [];
  return fs.readdirSync(nestedDir).filter((name) => !name.startsWith('.')).flatMap((name) =>
    name.startsWith('@') ? fs.readdirSync(`${nestedDir}/${name}`).map((sub) => `${name}/${sub}`) : [name]
  );
});

export default defineConfig({
  adapter: node({ mode: 'middleware' }),
  integrations: [preact(), netParityIntegration()],
  cacheDir: './.cache/astro',
  publicDir: './.cache/astro-public',
  build: {
    format: 'file'
  },
  server: {
    port: Number(process.env.ASTRO_PORT || 4322),
    headers: {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': buildContentSecurityPolicy()
    }
  },
  vite: {
    ssr: {
      noExternal: nestedDepNames
    },
    environments: {
      prerender: { resolve: { noExternal: nestedDepNames } }
    },
    server: {
      proxy
    }
  }
});
