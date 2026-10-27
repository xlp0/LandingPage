import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  LAB_CONFIG_SCHEMA,
  RUNTIME_CONFIG_SCHEMA,
  validateLabConfig,
  validateRuntimeConfig,
  buildCorsAllowlist,
  buildContentSecurityPolicy,
  extractApprovedCaptureOrigins,
  classifyTargetSelection,
  createTargetMembrane
} from '../../js/harness/target-membrane.js';
import { createCaptureSource } from '../../js/harness/membrane-interceptor.js';
import { CaptureProbeAgentSource } from '../../js/harness/capture-probe-agent.js';
import { InteractionRecorder } from '../../js/harness/recorder.js';
import { loadNetEnvelope, replayNetTrace } from '../../scripts/check-net.mjs';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(THIS_DIR, '../..');
const APP_CONFIG_PATH = path.join(ROOT_DIR, 'app-config.json');
const WORKBENCH_NET_PATH = path.join(ROOT_DIR, 'src/net/workbench-net.yaml');

function createDomShim(origin = 'http://localhost:3001') {
  const winListeners = new Map();
  const prevWindow = globalThis.window;
  const prevLocation = globalThis.location;

  const fakeWindow = {
    location: new URL(`${origin}/responsive-lab.html`),
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, new Set());
      winListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      winListeners.get(type)?.delete(fn);
    },
    dispatchMessage(event) {
      for (const fn of [...(winListeners.get('message') || [])]) {
        fn(event);
      }
    },
    listenerCount(type) {
      return winListeners.get(type)?.size || 0;
    }
  };

  globalThis.window = fakeWindow;
  globalThis.location = fakeWindow.location;

  return {
    fakeWindow,
    restore() {
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
      if (prevLocation === undefined) delete globalThis.location;
      else globalThis.location = prevLocation;
    }
  };
}

function createFakeIframe() {
  const loadListeners = new Set();
  const sentMessages = [];
  const contentWindow = {
    postMessage(msg, targetOrigin) {
      sentMessages.push({ msg, targetOrigin });
    }
  };
  return {
    src: '',
    attrs: {},
    contentWindow,
    sentMessages,
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
    removeAttribute(k) {
      delete this.attrs[k];
    },
    addEventListener(type, fn) {
      if (type === 'load') loadListeners.add(fn);
    },
    removeEventListener(type, fn) {
      if (type === 'load') loadListeners.delete(fn);
    },
    loadListenerCount() {
      return loadListeners.size;
    },
    triggerLoad() {
      for (const fn of [...loadListeners]) fn();
    }
  };
}

test('GQC-03-UNIT-01: validates lab and runtime configuration envelopes and rejects invalid fields', () => {
  const committedConfig = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf8'));
  const validLab = validateLabConfig(committedConfig);
  assert.equal(validLab.ok, true);
  assert.equal(committedConfig.schema, LAB_CONFIG_SCHEMA);

  const missingSchema = validateLabConfig({ ...committedConfig, schema: 'wrong' });
  assert.equal(missingSchema.ok, false);

  const blockedQuickLaunch = structuredClone(committedConfig);
  const blockedItem = blockedQuickLaunch.labTargets.find((t) => t.status === 'blocked');
  blockedItem.quickLaunch = true;
  assert.equal(validateLabConfig(blockedQuickLaunch).ok, false);

  const unsafeTarget = structuredClone(committedConfig);
  unsafeTarget.labTargets[0].url = 'javascript:alert(1)';
  assert.equal(validateLabConfig(unsafeTarget).ok, false);

  const invalidType = structuredClone(committedConfig);
  invalidType.labTargets[0].targetType = 'penpot-board';
  assert.equal(validateLabConfig(invalidType).ok, false);

  const runtimeValid = validateRuntimeConfig({
    schema: RUNTIME_CONFIG_SCHEMA,
    owner: 'Architect',
    WEBSOCKET_URL: null,
    MCARD_STUDIO_URL: 'https://mcardstudio.pkc.pub/',
    NODE_ENV: 'test',
    PORT: 3001,
    STUN_SERVERS: null,
    wsHost: 'localhost',
    wsPort: 8765,
    wsPath: '/ws/'
  });
  assert.equal(runtimeValid.ok, true);

  const runtimeBadPort = validateRuntimeConfig({
    schema: RUNTIME_CONFIG_SCHEMA,
    owner: 'Architect',
    WEBSOCKET_URL: null,
    MCARD_STUDIO_URL: 'ftp://invalid',
    NODE_ENV: 'test',
    PORT: 99999,
    STUN_SERVERS: 'invalid',
    wsHost: '',
    wsPort: 0,
    wsPath: 'ws'
  });
  assert.equal(runtimeBadPort.ok, false);
  assert.ok(runtimeBadPort.errors.length >= 4);
});

test('GQC-03-UNIT-02: createCaptureSource and CaptureProbeAgentSource fail closed on empty allowlist, non-approved targetType, and port/host mismatch', () => {
  const shim = createDomShim('http://localhost:3001');
  try {
    const iframe = createFakeIframe();

    const emptyAllowlistSource = createCaptureSource(
      {
        url: 'http://127.0.0.1:3001/tests/fixtures/probe-target.html',
        origin: 'http://127.0.0.1:3001',
        sameOrigin: false,
        targetType: 'probe-fixture',
        status: 'allowed',
        captureAllowed: true
      },
      { iframe, allowedOrigins: [] }
    );
    assert.equal(emptyAllowlistSource.kind, 'unavailable');

    const unlistedOriginSource = createCaptureSource(
      {
        url: 'https://unlisted.example.org/app',
        origin: 'https://unlisted.example.org',
        sameOrigin: false,
        targetType: 'webapp',
        status: 'allowed',
        captureAllowed: true
      },
      { iframe, allowedOrigins: ['http://127.0.0.1:3001'] }
    );
    assert.equal(unlistedOriginSource.kind, 'unavailable');

    for (const nonCapturableType of ['undecided', 'blocked', 'custom']) {
      const src = createCaptureSource(
        {
          url: 'http://localhost:3001/pkc-docs-index.html',
          origin: 'http://localhost:3001',
          sameOrigin: true,
          targetType: nonCapturableType,
          status: nonCapturableType === 'blocked' ? 'blocked' : 'allowed',
          captureAllowed: false,
          penpotBoardId: 'board-123',
          clmTypeUri: 'clm://type/view/workbench/responsive-lab'
        },
        { iframe, allowedOrigins: ['http://localhost:3001'] }
      );
      assert.equal(src.kind, 'unavailable');
    }

    const probe = new CaptureProbeAgentSource({
      iframe,
      allowedOrigins: ['http://127.0.0.1:3001'],
      targetOrigin: 'http://127.0.0.1:3001',
      handshakeTimeoutMs: 2000
    });

    shim.fakeWindow.dispatchMessage({
      origin: 'http://localhost:3001',
      source: iframe.contentWindow,
      data: { schema: 'lab-capture/v1', type: 'lab:hello' }
    });
    assert.equal(probe.connected, false);
    assert.equal(probe.stats().rejectReasons.origin_mismatch, 1);

    shim.fakeWindow.dispatchMessage({
      origin: 'http://127.0.0.1:3000',
      source: iframe.contentWindow,
      data: { schema: 'lab-capture/v1', type: 'lab:hello' }
    });
    assert.equal(probe.connected, false);
    assert.equal(probe.stats().rejectReasons.origin_mismatch, 2);

    shim.fakeWindow.dispatchMessage({
      origin: 'http://127.0.0.1:3001',
      source: iframe.contentWindow,
      data: { schema: 'lab-capture/v1', type: 'lab:hello' }
    });
    assert.equal(probe.connected, true);
    assert.equal(probe.kind, 'probe-agent');

    probe.destroy();
  } finally {
    shim.restore();
  }
});

test('GQC-03-UNIT-03: replacing a probe-agent source via recorder.setSource destroys listeners, timers, and nonces', () => {
  const shim = createDomShim('http://localhost:3001');
  try {
    const iframe = createFakeIframe();
    const recorder = new InteractionRecorder();

    const firstProbe = new CaptureProbeAgentSource({
      iframe,
      allowedOrigins: ['http://127.0.0.1:3001'],
      targetOrigin: 'http://127.0.0.1:3001',
      handshakeTimeoutMs: 5000
    });

    recorder.setSource(firstProbe, { targetUrl: 'http://127.0.0.1:3001/tests/fixtures/probe-target.html' });

    shim.fakeWindow.dispatchMessage({
      origin: 'http://127.0.0.1:3001',
      source: iframe.contentWindow,
      data: { schema: 'lab-capture/v1', type: 'lab:hello' }
    });
    recorder.start({ targetUrl: 'http://127.0.0.1:3001/tests/fixtures/probe-target.html' });

    const issuedNonce = firstProbe._currentNonce;
    assert.ok(issuedNonce);
    assert.equal(shim.fakeWindow.listenerCount('message'), 1);
    assert.equal(iframe.loadListenerCount(), 1);

    recorder.setSource(null);

    assert.equal(firstProbe._destroyed, true);
    assert.equal(firstProbe._pingTimer, null);
    assert.equal(firstProbe._handshakeTimer, null);
    assert.equal(firstProbe._currentNonce, null);
    assert.equal(shim.fakeWindow.listenerCount('message'), 0);
    assert.equal(iframe.loadListenerCount(), 0);

    shim.fakeWindow.dispatchMessage({
      origin: 'http://127.0.0.1:3001',
      source: iframe.contentWindow,
      data: {
        schema: 'lab-capture/v1',
        type: 'lab:event',
        nonce: issuedNonce,
        payload: { type: 'pointer', coords: { nx: 0.5, ny: 0.5 } }
      }
    });
    assert.equal(recorder.snapshot().length, 0);

    recorder.destroy();
  } finally {
    shim.restore();
  }
});

test('GQC-03-UNIT-04: blocked targets in labTargets are excluded from CORS allowlist and capture origins', () => {
  const committedConfig = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf8'));
  const corsList = buildCorsAllowlist(['http://localhost:3000'], committedConfig, [3001]);

  assert.equal(corsList.includes('https://github.com'), false);
  assert.equal(corsList.includes('https://www.google.com'), false);
  assert.equal(corsList.includes('https://developer.mozilla.org'), false);
  assert.equal(corsList.includes('http://localhost:4321'), true);
  assert.equal(corsList.includes('http://127.0.0.1:5320'), true);
  assert.equal(corsList.includes('http://127.0.0.1:3001'), true);

  const captureOrigins = extractApprovedCaptureOrigins(committedConfig.labTargets, 'http://localhost:3001');
  assert.equal(captureOrigins.includes('https://github.com'), false);
  assert.equal(captureOrigins.includes('http://127.0.0.1:3001'), true);
});

test('GQC-03-UNIT-05: bounded handshake timeout marks source capture-unavailable and clears retry timers', async () => {
  const shim = createDomShim('http://localhost:3001');
  try {
    const iframe = createFakeIframe();
    const outcomes = [];

    const probe = new CaptureProbeAgentSource({
      iframe,
      allowedOrigins: ['http://127.0.0.1:3001'],
      targetOrigin: 'http://127.0.0.1:3001',
      handshakeTimeoutMs: 70,
      pingIntervalMs: 25,
      onHandshakeStatus: (outcome, reason) => outcomes.push({ outcome, reason })
    });

    assert.notEqual(probe._pingTimer, null);
    assert.notEqual(probe._handshakeTimer, null);

    await new Promise((resolve) => setTimeout(resolve, 130));

    assert.equal(probe.connected, false);
    assert.equal(probe.timedOut, true);
    assert.equal(probe.kind, 'unavailable');
    assert.equal(probe.policyState, 'handshake-timeout');
    assert.equal(probe._pingTimer, null);
    assert.equal(probe._handshakeTimer, null);
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].outcome, 'timeout');

    probe.destroy();
  } finally {
    shim.restore();
  }
});

test('GQC-03-UNIT-06: TargetMembrane emits replayable Petri net traces across all policy error Places and recover Transitions', async () => {
  const committedConfig = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf8'));
  const workbenchNet = loadNetEnvelope(WORKBENCH_NET_PATH);
  const iframe = createFakeIframe();

  const membrane = createTargetMembrane({
    iframe,
    baseHref: 'http://localhost:3001/responsive-lab.html',
    registry: committedConfig.labTargets
  });

  membrane.bindTarget('https://github.com', 'dropdown-select');
  assert.equal(membrane.getPolicyPlaceId(), 'p_error_target_blocked');
  membrane.recoverToDefault('app.html');
  assert.equal(membrane.getPolicyPlaceId(), 'p_page_responsive_lab');

  membrane.bindTarget('pkc-docs-index.html', 'dropdown-select');
  assert.equal(membrane.getPolicyPlaceId(), 'p_error_capture_unavailable');
  membrane.recoverToDefault('app.html');
  assert.equal(membrane.getPolicyPlaceId(), 'p_page_responsive_lab');

  membrane.bindTarget('http://127.0.0.1:3001/tests/fixtures/probe-target-noagent.html', 'dropdown-select');
  assert.equal(membrane.getPolicyPlaceId(), 'p_pending_probe_handshake');
  membrane.notifyProbeHandshakeOutcome('timeout', '5000ms timeout');
  assert.equal(membrane.getPolicyPlaceId(), 'p_error_handshake_timeout');
  membrane.recoverToDefault('app.html');
  assert.equal(membrane.getPolicyPlaceId(), 'p_page_responsive_lab');

  assert.throws(() => membrane.bindTarget('javascript:alert(1)', 'user-input'));
  assert.equal(membrane.getPolicyPlaceId(), 'p_error_target_unapproved');
  membrane.recoverToDefault('app.html');
  assert.equal(membrane.getPolicyPlaceId(), 'p_page_responsive_lab');

  const events = membrane.getPolicyTrace();
  assert.equal(events.length, 9);

  const replay = await replayNetTrace(workbenchNet, {
    traceId: 'unit-membrane-policy-trace',
    entryPlaceId: 'p_page_responsive_lab',
    events
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.finalPlaceId, 'p_page_responsive_lab');
});

test('GQC-03-INT-01, GQC-03-INT-02, GQC-03-INT-03: configuration contracts, mount ownership, and identical CORS/CSP headers across Astro prerendered, SSR handler, and legacy static mounts', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc03-int-'));
  const prevDbPath = process.env.MCARD_DB_PATH;
  process.env.MCARD_DB_PATH = path.join(tempDir, 'int.db');

  let listener = null;
  try {
    const astroClientConfigPath = path.join(ROOT_DIR, 'dist', 'client', 'app-config.json');
    assert.equal(fs.existsSync(astroClientConfigPath), false);

    const astroConfigModule = await import('../../astro.config.mjs');
    const astroHeaders = astroConfigModule.default?.server?.headers || {};
    assert.equal(astroHeaders['Cache-Control'], 'no-store');
    assert.equal(astroHeaders['Content-Security-Policy'], buildContentSecurityPolicy());

    const wsMod = await import('../../ws-server.js');
    assert.equal(wsMod.dynamicOrigins.includes('https://github.com'), false);
    assert.equal(wsMod.dynamicOrigins.includes('https://www.google.com'), false);
    assert.equal(wsMod.dynamicOrigins.includes('https://developer.mozilla.org'), false);

    listener = http.createServer(wsMod.app);
    await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
    const { port } = listener.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    const appConfigRes = await fetch(`${baseUrl}/app-config.json`);
    assert.equal(appConfigRes.status, 200);
    assert.equal(appConfigRes.headers.get('x-gqc-mount'), 'ws-server-config');
    assert.equal(appConfigRes.headers.get('cache-control'), 'no-store');
    const appConfigBody = await appConfigRes.json();
    assert.equal(validateLabConfig(appConfigBody).ok, true);

    const apiConfigRes = await fetch(`${baseUrl}/api/config`, {
      headers: { Origin: 'http://localhost:3001' }
    });
    assert.equal(apiConfigRes.status, 200);
    assert.equal(apiConfigRes.headers.get('x-gqc-mount'), 'ws-server-config');
    assert.equal(apiConfigRes.headers.get('cache-control'), 'no-store');
    assert.equal(apiConfigRes.headers.get('access-control-allow-origin'), 'http://localhost:3001');
    const apiConfigBody = await apiConfigRes.json();
    assert.equal(validateRuntimeConfig(apiConfigBody).ok, true);

    const apiEnvRes = await fetch(`${baseUrl}/api/env`);
    assert.equal(apiEnvRes.status, 200);
    assert.equal(apiEnvRes.headers.get('x-gqc-mount'), 'ws-server-config');
    assert.equal(apiEnvRes.headers.get('cache-control'), 'no-store');
    const apiEnvBody = await apiEnvRes.json();
    assert.equal(typeof apiEnvBody.NODE_ENV, 'string');

    const prerenderRes = await fetch(`${baseUrl}/responsive-lab.html`, {
      headers: { Origin: 'http://localhost:3001' }
    });
    assert.equal(prerenderRes.status, 200);
    assert.equal(prerenderRes.headers.get('x-gqc-page-mount'), 'astro-prerendered');

    const handlerRes = await fetch(`${baseUrl}/_server-islands/probe`, {
      headers: { Origin: 'http://localhost:3001' }
    });
    assert.equal(handlerRes.headers.get('x-gqc-page-mount'), 'astro-ssr-handler');

    const legacyRes = await fetch(`${baseUrl}/pkc-docs-index.html`, {
      headers: { Origin: 'http://localhost:3001' }
    });
    assert.equal(legacyRes.status, 200);
    assert.equal(legacyRes.headers.get('x-gqc-page-mount'), 'legacy-static');

    const expectedCsp = buildContentSecurityPolicy();
    assert.equal(expectedCsp.includes('*;'), false);
    assert.equal(expectedCsp.includes("'unsafe-eval'"), false);
    assert.equal(expectedCsp.includes('github.com'), false);

    assert.equal(prerenderRes.headers.get('content-security-policy'), expectedCsp);
    assert.equal(handlerRes.headers.get('content-security-policy'), expectedCsp);
    assert.equal(legacyRes.headers.get('content-security-policy'), expectedCsp);

    assert.equal(prerenderRes.headers.get('access-control-allow-origin'), 'http://localhost:3001');
    assert.equal(handlerRes.headers.get('access-control-allow-origin'), 'http://localhost:3001');
    assert.equal(legacyRes.headers.get('access-control-allow-origin'), 'http://localhost:3001');

    const blockedCorsRes = await fetch(`${baseUrl}/responsive-lab.html`, {
      headers: { Origin: 'https://github.com' }
    });
    assert.equal(blockedCorsRes.headers.get('access-control-allow-origin'), null);
      const blockedApiCfgRes = await fetch(`${baseUrl}/api/config`, { headers: { Origin: 'https://github.com' } });
      assert.equal(blockedApiCfgRes.headers.get('access-control-allow-origin'), null);
      const blockedRoomsRes = await fetch(`${baseUrl}/api/rooms`, { headers: { Origin: 'https://github.com' } });
      assert.equal(blockedRoomsRes.headers.get('access-control-allow-origin'), null);
  } finally {
    if (listener) {
      await new Promise((resolve) => listener.close(() => resolve()));
    }
    if (prevDbPath === undefined) delete process.env.MCARD_DB_PATH;
    else process.env.MCARD_DB_PATH = prevDbPath;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
