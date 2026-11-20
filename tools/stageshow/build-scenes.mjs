#!/usr/bin/env node
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import esbuild from 'esbuild';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';

const DESKTOP_DEVICE = BUILTIN_DEVICES.find((d) => d.id === 'macbook-air-13') ?? { width: 1280, height: 832 };
const PHONE_DEVICE = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro') ?? { width: 393, height: 852 };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const SCENES_DIR = path.join(HERE, 'scenes');
const OUTPUT_DIR = path.join(REPO_ROOT, 'public', 'stageshow');
const require = createRequire(import.meta.url);

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeStyleClose(css) {
  return css.replace(/<\/style/gi, '<\\/style');
}

function escapeScriptClose(js) {
  return js.replace(/<\/script/gi, '<\\/script');
}

function createStageShowAliasPlugin({ slimCursors = false } = {}) {
  const aliases = new Map([
    ['react', require.resolve('preact/compat')],
    ['react-dom', require.resolve('preact/compat')],
    ['react-dom/client', require.resolve('preact/compat/client')],
    ['react/jsx-runtime', require.resolve('preact/compat/jsx-runtime')],
    ['react/jsx-dev-runtime', require.resolve('preact/compat/jsx-dev-runtime')],
    ['lucide-react', path.resolve(HERE, 'shims', 'lucide-react.mjs')]
  ]);

  return {
    name: 'stageshow-preact-compat-aliases',
    setup(build) {
      build.onResolve(
        { filter: /^(?:react|react-dom|react-dom\/client|react\/jsx-runtime|react\/jsx-dev-runtime|lucide-react)$/ },
        (args) => {
          const resolved = aliases.get(args.path);
          if (resolved) {
            return { path: resolved };
          }
          return undefined;
        }
      );
      if (slimCursors) {
        build.onResolve({ filter: /^\.\/cursors$/ }, (args) => {
          if (args.importer.replaceAll('\\', '/').endsWith('/tools/stageshow/kit/cursor.tsx')) {
            return { path: path.resolve(HERE, 'shims', 'cursors-slim.tsx') };
          }
          return undefined;
        });
      }
    }
  };
}

function renderSceneHtml({ sceneName, css, js }) {
  const baseCss = [
    '* { box-sizing: border-box; }',
    'html, body { margin: 0; background: transparent; }',
    "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }",
    '#example { width: 100%; min-height: 1px; }',
    '#example > .ss-fit { margin-inline: auto; }'
  ].join('\n');

  const combinedCss = [baseCss, css.trim()].filter(Boolean).join('\n');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '    <meta name="color-scheme" content="light dark" />',
    '    <link rel="icon" href="data:," />',
    `    <title>StageShow - ${escapeHtml(sceneName)}</title>`,
    `    <style>\n${escapeStyleClose(combinedCss)}\n    </style>`,
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    `    <script type="module">\n${escapeScriptClose(js)}\n    </script>`,
    '  </body>',
    '</html>',
    ''
  ].join('\n');
}

export function listScenes(scenesRoot = SCENES_DIR) {
  if (!fs.existsSync(scenesRoot)) return [];
  return fs
    .readdirSync(scenesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(scenesRoot, name, 'index.tsx')))
    .sort((a, b) => a.localeCompare(b));
}

export async function compileScene(sceneName) {
  const sceneDir = path.join(SCENES_DIR, sceneName);
  const standaloneEntrySource = [
    "import { createRoot } from 'react-dom/client';",
    "import { StillContext } from '../../kit/reduced-motion';",
    "import Scene from './index';",
    '',
    "const params = new URLSearchParams(location.search);",
    "const still = params.get('still') === '1';",
    "const mount = document.getElementById('root');",
    'if (mount) {',
    '  createRoot(mount).render(',
    '    <div id="example">',
    '      <StillContext.Provider value={still}>',
    '        <Scene />',
    '      </StillContext.Provider>',
    '    </div>',
    '  );',
    '}'
  ].join('\n');

  const embedEntrySource = [
    "import { createRoot } from 'react-dom/client';",
    "import { StillContext } from '../../kit/reduced-motion';",
    "import Scene from './index';",
    '',
    'export function mountStageShowScene(container, options = {}) {',
    '  const still = Boolean(options?.still);',
    '  const initialTheme = options?.initialTheme;',
    '  const root = createRoot(container);',
    '  root.render(',
    '    <div className="ssg-embed-root">',
    '      <StillContext.Provider value={still}>',
    '        <Scene initialTheme={initialTheme} />',
    '      </StillContext.Provider>',
    '    </div>',
    '  );',
    '  return {',
    '    unmount() {',
    '      root.unmount();',
    '    }',
    '  };',
    '}'
  ].join('\n');

  const buildBundle = async (contents, sourcefile, { slimCursors = false } = {}) => {
    const result = await esbuild.build({
      stdin: {
        contents,
        resolveDir: sceneDir,
        sourcefile,
        loader: 'tsx'
      },
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: ['chrome120', 'safari17', 'firefox120'],
      jsx: 'automatic',
      jsxImportSource: 'react',
      minify: true,
      treeShaking: true,
      outdir: 'out',
      entryNames: 'bundle',
      legalComments: 'none',
      metafile: true,
      define: {
        __SSG_DESKTOP_DIMS__: JSON.stringify(`${DESKTOP_DEVICE.width} × ${DESKTOP_DEVICE.height}`),
        __SSG_PHONE_DIMS__: JSON.stringify(`${PHONE_DEVICE.width} × ${PHONE_DEVICE.height}`)
      },
      plugins: [createStageShowAliasPlugin({ slimCursors })]
    });

    const reactInputs = Object.keys(result.metafile?.inputs ?? {}).filter((inputPath) =>
      /(?:^|\/)node_modules\/react(?:-dom)?\//.test(inputPath.replaceAll('\\', '/'))
    );
    if (reactInputs.length > 0) {
      throw new Error(
        `Scene "${sceneName}" resolved disallowed React inputs instead of preact/compat: ${reactInputs.join(', ')}`
      );
    }

    let js = '';
    let css = '';
    for (const file of result.outputFiles ?? []) {
      if (file.path.endsWith('.js')) js = file.text;
      else if (file.path.endsWith('.css')) css = file.text;
    }

    if (!js.trim()) {
      throw new Error(`Scene "${sceneName}" produced empty JS output.`);
    }
    return { js, css };
  };

  const standalone = await buildBundle(standaloneEntrySource, 'scene-entry.tsx', { slimCursors: false });
  const embed = await buildBundle(embedEntrySource, 'scene-embed-entry.tsx', { slimCursors: true });

  const embedCssPrefix = [
    '*, *::before, *::after { box-sizing: border-box; }',
    '.ssg-embed-root { width: 100%; min-height: 1px; }',
    '.ssg-embed-root > .ss-fit { margin-inline: auto; }'
  ].join('\n');
  const embedCss = [embedCssPrefix, embed.css.trim()].filter(Boolean).join('\n');
  const embedJs = embed.js;
  const embedJsGzipBytes = zlib.gzipSync(embedJs).length;
  const embedCssGzipBytes = zlib.gzipSync(embedCss).length;
  const embedGzipBytes = embedJsGzipBytes + embedCssGzipBytes;

  if (sceneName === 'workbench-bombadil-pair' && embedGzipBytes > 35 * 1024) {
    throw new Error(
      `Scene "${sceneName}" exceeds 35 KB gzipped embed budget (${embedGzipBytes} B: js=${embedJsGzipBytes} B, css=${embedCssGzipBytes} B)`
    );
  }

  const html = renderSceneHtml({ sceneName, css: standalone.css, js: standalone.js });
  return {
    sceneName,
    html,
    embedJs,
    embedCss,
    rawBytes: Buffer.byteLength(html, 'utf8'),
    gzipBytes: zlib.gzipSync(html).length,
    embedJsGzipBytes,
    embedCssGzipBytes,
    embedGzipBytes
  };
}

export async function buildScenes({ check = false } = {}) {
  const scenes = listScenes();
  if (scenes.length === 0) {
    throw new Error(`No StageShow scenes found under ${path.relative(REPO_ROOT, SCENES_DIR)}`);
  }

  const results = [];
  for (const sceneName of scenes) {
    const compiled = await compileScene(sceneName);
    const sceneOutDir = path.join(OUTPUT_DIR, sceneName);
    const outFile = path.join(sceneOutDir, 'index.html');
    const outJsFile = path.join(sceneOutDir, 'scene.js');
    const outCssFile = path.join(sceneOutDir, 'scene.css');
    const relOut = path.relative(REPO_ROOT, outFile);

    const pairs = [
      { file: outFile, content: compiled.html },
      { file: outJsFile, content: compiled.embedJs },
      { file: outCssFile, content: compiled.embedCss }
    ];

    if (check) {
      for (const pair of pairs) {
        const rel = path.relative(REPO_ROOT, pair.file);
        if (!fs.existsSync(pair.file)) {
          throw new Error(`Compiled scene missing (run node tools/stageshow/build-scenes.mjs): ${rel}`);
        }
        const existing = fs.readFileSync(pair.file, 'utf8');
        if (existing !== pair.content) {
          throw new Error(`Compiled scene is out of date (run node tools/stageshow/build-scenes.mjs): ${rel}`);
        }
      }
      console.log(
        `[stageshow-build] ok ${relOut} (${compiled.rawBytes} B raw, ${compiled.gzipBytes} B gzip; embed=${compiled.embedGzipBytes} B gzip)`
      );
    } else {
      fs.mkdirSync(sceneOutDir, { recursive: true });
      for (const pair of pairs) {
        fs.writeFileSync(pair.file, pair.content, 'utf8');
      }
      console.log(
        `[stageshow-build] built ${relOut} (${compiled.rawBytes} B raw, ${compiled.gzipBytes} B gzip; embed=${compiled.embedGzipBytes} B gzip)`
      );
    }

    results.push({ ...compiled, outFile: relOut });
  }

  return results;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = new Set(process.argv.slice(2));
  const check = args.has('--check');
  try {
    await buildScenes({ check });
  } catch (err) {
    console.error(`[stageshow-build] ${err.message}`);
    process.exitCode = 1;
  }
}
