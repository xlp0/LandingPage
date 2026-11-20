import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import { netParityIntegration } from './src/integrations/net-parity.mjs';
import { buildContentSecurityPolicy } from './js/harness/target-membrane.js';

dotenv.config();

const projectRootDir = fileURLToPath(new URL('.', import.meta.url));
const astroPublicUrl = new URL('./.cache/astro-public', import.meta.url);
fs.mkdirSync(astroPublicUrl, { recursive: true });

const backendOrigin = `http://127.0.0.1:${process.env.PORT || 3000}`;
export const httpProxyPrefixes = [
  '/app-config.json',
  '/modules.json',
  '/health',
  '/public',
  '/js',
  '/css',
  '/components',
  '/config',
  '/data',
  '/docs',
  '/tests',
  '/archive',
  '/packages',
  '/vendor',
  '/assets',
  '/icons',
  '/images',
  '/examples',
  '/conformance',
  '/pkc-docs',
  '/pkc-viewer.html',
  '/create-card-template.html',
  '/create-latex-card.html',
  '/latex-test.html',
  '/icon.svg',
  '/icon-192.png',
  '/sw.js',
  '/sw-clm.js',
  '/manifest.json',
  '/manifest-clm.json',
  '/pkc-docs-index.html'
];

export function normalizeDevRequestPathname(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('/') || rawUrl.startsWith('//')) {
    return null;
  }
  const queryIdx = rawUrl.indexOf('?');
  const hashIdx = rawUrl.indexOf('#');
  const cutIdx =
    queryIdx === -1 ? hashIdx : hashIdx === -1 ? queryIdx : Math.min(queryIdx, hashIdx);
  const rawPath = cutIdx === -1 ? rawUrl : rawUrl.slice(0, cutIdx);
  try {
    const decoded = decodeURIComponent(rawPath);
    const normalized = path.posix.normalize(decoded);
    return normalized.startsWith('/') ? normalized : null;
  } catch {
    return null;
  }
}

export function shouldBypassAstroDevRouteGuard(
  rawUrl,
  prefixes = ['/api', '/ws', ...httpProxyPrefixes]
) {
  const pathname = normalizeDevRequestPathname(rawUrl);
  if (!pathname) return false;
  if (pathname === '/index.html') return true;
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function sendArchivePkcViewer(res) {
  const viewerPath = path.join(projectRootDir, 'archive', 'html', 'pkc-viewer.html');
  if (!fs.existsSync(viewerPath) || res.headersSent || res.writableEnded) {
    return false;
  }
  const body = fs.readFileSync(viewerPath);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': String(body.length),
    'Cache-Control': 'no-store',
    'X-GQC-Page-Mount': 'legacy-static'
  });
  res.end(body);
  return true;
}

function astroDevStaticProxyPlugin() {
  return {
    name: 'gqc-dev-static-and-proxy',
    enforce: 'post',
    configureServer(viteServer) {
      return () => {
        for (const layer of viteServer.middlewares.stack) {
          if (layer.handle?.name !== 'devRouteGuard') continue;
          const originalGuard = layer.handle;
          layer.handle = function gqcBypassableDevRouteGuard(req, res, next) {
            const pathname = normalizeDevRequestPathname(req.url);
            if (pathname === '/index.html') {
              const queryIdx = (req.url || '').indexOf('?');
              req.url = queryIdx === -1 ? '/' : `/${req.url.slice(queryIdx)}`;
              return next();
            }
            if (shouldBypassAstroDevRouteGuard(req.url)) {
              return next();
            }
            return originalGuard(req, res, next);
          };
        }
      };
    }
  };
}

export function createDevProxy(targetOrigin = backendOrigin) {
  const entries = {
    '/api': { target: targetOrigin, changeOrigin: false, ws: true },
    '/ws': { target: targetOrigin, changeOrigin: false, ws: true }
  };
  for (const prefix of httpProxyPrefixes) {
    if (prefix === '/pkc-viewer.html') {
      entries[prefix] = {
        target: targetOrigin,
        changeOrigin: false,
        selfHandleResponse: true,
        configure(proxyServer) {
          proxyServer.on('proxyRes', (proxyRes, _req, res) => {
            if (proxyRes.statusCode === 404 && sendArchivePkcViewer(res)) {
              proxyRes.resume();
              return;
            }
            if (!res.headersSent) {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            }
            proxyRes.pipe(res);
          });
          proxyServer.on('error', (_err, _req, res) => {
            if (!res || res.headersSent || res.writableEnded) return;
            if (!sendArchivePkcViewer(res)) {
              res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('Bad Gateway');
            }
          });
        }
      };
    } else {
      entries[prefix] = { target: targetOrigin, changeOrigin: false };
    }
  }
  return entries;
}

const proxy = createDevProxy(backendOrigin);

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
    optimizeDeps: {
      include: ['preact', 'preact/jsx-runtime', 'preact/jsx-dev-runtime'],
      rolldownOptions: {
        transform: {
          jsx: {
            runtime: 'automatic',
            importSource: 'preact'
          }
        }
      }
    },
    plugins: [astroDevStaticProxyPlugin()],
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
