import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

import {
  KERNEL_PROVENANCE,
  MODALITY_TYPES,
  classifyMCardContent,
  resolveModality
} from '../../server/mcard-modality.mjs';
import { validateExternalUrl } from '../../server/mcard-api.mjs';
import {
  classifyCardModality,
  renderPage,
  renderTransclusionLinks,
  parseSwitchIntent
} from '../../js/landing-page-mcard.js';
import { EmbedRenderer } from '../../js/renderers/EmbedRenderer.js';
import { TextRenderer } from '../../js/renderers/TextRenderer.js';
import { ImageRenderer } from '../../js/renderers/ImageRenderer.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

test('GQC-05.3: single-page MCard 4-modality contract covers media, Markdown/math, inert code, sandboxed webapp, unsupported MIME fallback, transclusion, and URL safety', () => {
  assert.deepEqual(MODALITY_TYPES, ['media', 'document', 'code', 'webapp']);
  assert.equal(KERNEL_PROVENANCE, 'clm-kernel@0.0.12');

  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
  const mediaClassified = classifyMCardContent(pngBytes, { mimeHint: 'image/png', filename: 'diagram.png' });
  assert.equal(mediaClassified.modality, 'media');
  const mediaHtml = renderPage({
    hash: '1'.repeat(64),
    contentType: 'image/png',
    modality: 'media',
    rawUrl: '/api/mcard/' + '1'.repeat(64) + '/raw',
    sizeBytes: pngBytes.length
  });
  assert.equal(mediaHtml.includes('data-modality="media"'), true);
  assert.equal(mediaHtml.includes('<figure class="mcard-media-body"'), true);
  assert.equal(mediaHtml.includes('alt="MCard Media 111111111111'), true);

  const mdContent = '# Heading\n\nInline math $E = mc^2$ and transclusion [[card_alpha|Alpha Card]].';
  const mdClassified = classifyMCardContent(mdContent, { mimeHint: 'text/markdown' });
  assert.equal(mdClassified.modality, 'document');
  const mdHtml = renderPage({
    hash: '2'.repeat(64),
    contentType: 'text/markdown',
    content: mdContent
  });
  assert.equal(mdHtml.includes('data-modality="document"'), true);
  assert.equal(mdHtml.includes('href="#mcard:card_alpha"'), true);
  assert.equal(mdHtml.includes('data-mcard-ref="card_alpha"'), true);
  assert.equal(mdHtml.includes('>Alpha Card</a>'), true);

  const dangerousJs = "window.__gqcExecuted = true; </script><script>alert('xss')</script>";
  const codeClassified = classifyMCardContent(dangerousJs, { mimeHint: 'text/javascript', filename: 'probe.js' });
  assert.equal(codeClassified.modality, 'code');
  const codeHtml = renderPage({
    hash: '3'.repeat(64),
    contentType: 'text/javascript',
    language: 'javascript',
    content: dangerousJs
  });
  assert.equal(codeHtml.includes('data-modality="code"'), true);
  assert.equal(codeHtml.includes('<pre class="mcard-page-body mcard-code-body"'), true);
  assert.equal(codeHtml.includes('<script>'), false);
  assert.equal(codeHtml.includes('&lt;/script&gt;&lt;script&gt;'), true);

  const webappUrl = 'https://example.org/interactive-widget';
  const webappClassified = classifyMCardContent(webappUrl, { mimeHint: 'text/uri-list' });
  assert.equal(webappClassified.modality, 'webapp');
  const webappHtml = renderPage({
    hash: '4'.repeat(64),
    contentType: 'text/uri-list',
    content: webappUrl
  });
  assert.equal(webappHtml.includes('data-modality="webapp"'), true);
  assert.equal(webappHtml.includes('sandbox="allow-scripts allow-forms"'), true);
  assert.equal(webappHtml.includes('referrerpolicy="no-referrer"'), true);

  const webappSourceHtml = renderPage(
    {
      hash: '4'.repeat(64),
      contentType: 'text/uri-list',
      content: webappUrl
    },
    { viewMode: 'source' }
  );
  assert.equal(webappSourceHtml.includes('data-modality="code"'), true);
  assert.equal(webappSourceHtml.includes('<iframe'), false);

  const unknownBinary = Buffer.from([0x00, 0xff, 0x10, 0x80]);
  const unknownBinClass = classifyMCardContent(unknownBinary, { mimeHint: 'application/x-unknown-gqc' });
  assert.equal(unknownBinClass.modality, 'media');
  const fallbackBinHtml = renderPage({
    hash: '5'.repeat(64),
    contentType: 'application/x-unknown-gqc',
    modality: unknownBinClass.modality,
    rawUrl: '/api/mcard/' + '5'.repeat(64) + '/raw',
    sizeBytes: unknownBinary.length
  });
  assert.equal(fallbackBinHtml.includes('mcard-raw-download'), true);
  assert.equal(fallbackBinHtml.includes('Download application/x-unknown-gqc'), true);
  assert.equal(fallbackBinHtml.toLowerCase().includes('<script'), false);

  assert.equal(resolveModality('application/x-unknown-gqc', { binary: false }), 'document');
  assert.equal(classifyCardModality({ contentType: 'application/x-unknown-gqc', content: 'plain unknown text' }), 'document');

  const transcluded = renderTransclusionLinks('See [[doc_ref_1|Spec One]] and [[doc_ref_2]]');
  assert.equal(transcluded.includes('href="#mcard:doc_ref_1"'), true);
  assert.equal(transcluded.includes('href="#mcard:doc_ref_2"'), true);

  assert.equal(validateExternalUrl('https://example.org/path').ok, true);
  assert.equal(validateExternalUrl('javascript:alert(1)').ok, false);
  assert.equal(validateExternalUrl('file:///etc/passwd').ok, false);
  assert.equal(validateExternalUrl('http://127.0.0.1:8080/internal').ok, false);
  assert.equal(validateExternalUrl('http://169.254.169.254/latest/meta-data').ok, false);

  const unsafeSwitch = parseSwitchIntent('javascript:alert(1)', []);
  assert.notEqual(unsafeSwitch.kind, 'url');
  assert.notEqual(unsafeSwitch.kind, 'sample');
});

test('GQC-05.3: MIME RendererRegistry renderers stay separate from single-page viewer and enforce sandbox and fallback contracts', async () => {
  const embed = new EmbedRenderer();
  const embedHtml = await embed.render(JSON.stringify({
    title: 'External App',
    url: 'https://example.org/sandboxed'
  }));
  assert.equal(embedHtml.includes('sandbox="allow-scripts allow-forms"'), true);
  assert.equal(embedHtml.includes('referrerpolicy="no-referrer"'), true);

  await assert.rejects(
    () => embed.render(JSON.stringify({ title: 'Unsafe JS URL', url: 'javascript:alert(1)' })),
    /Unsafe embed URL/i
  );

  const textRenderer = new TextRenderer();
  const escapedTextHtml = await textRenderer.render('<img src=x onerror=alert(1)>', { fileName: 'unknown.bin' });
  assert.equal(escapedTextHtml.includes('<img src=x'), false);
  assert.equal(escapedTextHtml.includes('&lt;img src=x onerror=alert(1)&gt;'), true);

  const imageRenderer = new ImageRenderer();
  assert.equal(imageRenderer.contentType, 'image');

  const registrySrc = fs.readFileSync(path.join(REPO_ROOT, 'js/renderers/RendererRegistry.js'), 'utf8');
  const landingMCardSrc = fs.readFileSync(path.join(REPO_ROOT, 'js/landing-page-mcard.js'), 'utf8');
  assert.equal(landingMCardSrc.includes('RendererRegistry'), false);
  assert.equal(registrySrc.includes('classifyCardModality'), false);
});

test('GQC-05.4: root ws-server.js and dormant packages/server variant match ownership table, routes, WebSocket path, CORS, CSP, config, and Astro mount contracts', async () => {
  const parityManifest = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'scripts/package-source-parity.json'), 'utf8')
  );
  const ownership = parityManifest.serverOwnership;
  assert.equal(ownership.decision, 'separate-deployment-variants-with-single-supported-product');
  assert.equal(ownership.packagedServerServesAstro, false);

  const pkgBootProbe = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, 'packages/server/src/ws-server.js')],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, PORT: '0' },
      encoding: 'utf8',
      timeout: 5000
    }
  );
  assert.notEqual(pkgBootProbe.status, 0);
  assert.equal(pkgBootProbe.stderr.includes('ERR_MODULE_NOT_FOUND'), true);

  const pkgWsSrc = fs.readFileSync(path.join(REPO_ROOT, 'packages/server/src/ws-server.js'), 'utf8');
  assert.equal(pkgWsSrc.includes("path: '/ws/'"), true);
  assert.equal(pkgWsSrc.includes("app.get('/health'"), true);
  assert.equal(pkgWsSrc.includes("app.get('/api/rooms'"), true);
  assert.equal(pkgWsSrc.includes("app.get('/api/env'"), true);
  assert.equal(pkgWsSrc.includes("app.get('/api/config'"), true);
  assert.equal(pkgWsSrc.includes("app.get('/app-config.json'"), true);
  assert.equal(pkgWsSrc.includes('/api/test-runs'), false);
  assert.equal(pkgWsSrc.includes('dist/server/entry.mjs'), false);
  assert.equal(pkgWsSrc.includes('unsafe-eval'), true);

  const port = await findFreePort();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc05-root-srv-'));
  const child = spawn(process.execPath, [path.join(REPO_ROOT, 'ws-server.js')], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      MCARD_DB_PATH: path.join(tmpDir, 'root-contract.db')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const baseHttp = 'http://127.0.0.1:' + port;
  try {
    let ready = false;
    for (let i = 0; i < 40; i += 1) {
      try {
        const r = await fetch(baseHttp + '/health');
        if (r.ok) { ready = true; break; }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(ready, true);

    const healthRes = await fetch(baseHttp + '/health');
    assert.equal(healthRes.status, 200);
    const csp = healthRes.headers.get('content-security-policy') || '';
    assert.equal(csp.includes("'unsafe-eval'"), false);
    assert.equal(csp.includes("default-src 'self'"), true);
    assert.equal(csp.includes("object-src 'none'"), true);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.status, 'ok');
    assert.equal(healthJson.mcard?.enabled, true);

    const noOriginCfg = await fetch(baseHttp + '/api/config');
    assert.equal(noOriginCfg.status, 200);
    assert.equal(noOriginCfg.headers.get('access-control-allow-origin'), null);
    const cfgJson = await noOriginCfg.json();
    assert.equal(cfgJson.PORT, port);
    assert.equal(cfgJson.wsPath, '/ws/');

    const allowedCors = await fetch(baseHttp + '/api/config', {
      headers: { Origin: baseHttp }
    });
    assert.equal(allowedCors.headers.get('access-control-allow-origin'), baseHttp);

    const deniedCors = await fetch(baseHttp + '/api/config', {
      headers: { Origin: 'https://github.com' }
    });
    assert.equal(deniedCors.headers.get('access-control-allow-origin'), null);

    const appCfgRes = await fetch(baseHttp + '/app-config.json');
    assert.equal(appCfgRes.status, 200);
    const appCfgJson = await appCfgRes.json();
    assert.equal(Array.isArray(appCfgJson.labTargets), true);

    const roomsRes = await fetch(baseHttp + '/api/rooms');
    assert.equal(roomsRes.status, 200);
    const envRes = await fetch(baseHttp + '/api/env');
    assert.equal(envRes.status, 200);

    const wsGreeting = await new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://127.0.0.1:' + port + '/ws/');
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error('Timed out waiting for WebSocket welcome message'));
      }, 4000);
      ws.on('message', (raw) => {
        clearTimeout(timer);
        const parsed = JSON.parse(String(raw));
        ws.close();
        resolve(parsed);
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    assert.equal(typeof wsGreeting.type, 'string');
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
