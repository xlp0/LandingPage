import fs from 'node:fs';
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

const astroNestedExternals = {
  cookie: new URL('./node_modules/astro/node_modules/cookie/dist/index.js', import.meta.url).href,
  send: new URL('./node_modules/@astrojs/node/node_modules/send/index.js', import.meta.url).href
};

function resolveAstroNestedDepsPlugin() {
  return {
    name: 'gqc-resolve-astro-nested-deps',
    enforce: 'pre',
    resolveId(source) {
      if (Object.hasOwn(astroNestedExternals, source)) {
        return { id: astroNestedExternals[source], external: true };
      }
      return null;
    }
  };
}

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
    plugins: [resolveAstroNestedDepsPlugin()],
    server: {
      proxy
    }
  }
});
