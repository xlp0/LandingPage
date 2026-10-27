import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CubicalApp, CubicalComponent } from '../../js/cubical-core.js';
import { PKC } from '../../js/pkc-core.js';
import * as viewportGeometry from '../../js/harness/viewport-geometry.js';
import * as fidelityModule from '../../js/harness/fidelity.js';
import { initConformancePanel } from '../../js/harness/conformance-panel.js';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, '../..');

function createFakeDom() {
  const docListeners = new Map();
  const elementsById = new Map();

  function makeElement(tagName, id = '') {
    const elListeners = new Map();
    const attrs = new Map();
    const el = {
      tagName: String(tagName || 'div').toUpperCase(),
      id,
      className: '',
      innerHTML: '',
      textContent: '',
      style: {},
      dataset: {},
      children: [],
      setAttribute(name, val) {
        attrs.set(name, String(val));
        if (name === 'id') {
          this.id = String(val);
          elementsById.set(this.id, this);
        }
      },
      getAttribute(name) {
        return attrs.has(name) ? attrs.get(name) : null;
      },
      querySelector(sel) {
        if (!this._subCache) this._subCache = new Map();
        if (!this._subCache.has(sel)) {
          const sub = makeElement('span', sel.startsWith('#') ? sel.slice(1) : '');
          sub.classList = { add() {}, remove() {}, toggle() {} };
          this._subCache.set(sel, sub);
        }
        return this._subCache.get(sel);
      },
      querySelectorAll() {
        return [];
      },
      appendChild(child) {
        this.children.push(child);
        if (child?.id) {
          elementsById.set(child.id, child);
        }
        return child;
      },
      addEventListener(type, fn) {
        if (!elListeners.has(type)) elListeners.set(type, new Set());
        elListeners.get(type).add(fn);
      },
      removeEventListener(type, fn) {
        elListeners.get(type)?.delete(fn);
      }
    };
    if (id) {
      elementsById.set(id, el);
    }
    return el;
  }

  const fakeDocument = {
    baseURI: 'http://127.0.0.1:3001/',
    readyState: 'complete',
    createElement(tag) {
      return makeElement(tag);
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      docListeners.get(type)?.delete(fn);
    },
    dispatchEvent(event) {
      const set = docListeners.get(event.type);
      if (!set) return true;
      for (const fn of [...set]) {
        fn(event);
      }
      return true;
    },
    listenerCount(type) {
      return docListeners.get(type)?.size || 0;
    },
    makeElement
  };

  return fakeDocument;
}

test('CubicalApp indexes components by id and stateless modules carry no ceremonial dispose methods', () => {
  const prevDoc = globalThis.document;
  const fakeDoc = createFakeDom();
  fakeDoc.makeElement('div', 'test-root');
  globalThis.document = fakeDoc;

  try {
    assert.equal('dispose' in CubicalComponent.prototype, false);
    assert.equal('destroy' in CubicalComponent.prototype, false);
    assert.equal('dispose' in viewportGeometry, false);
    assert.equal('dispose' in fidelityModule, false);

    const app = new CubicalApp('test-root');
    const stateless = new CubicalComponent('auth-status-bar', 'status-pill');
    let destroyedCount = 0;
    const stateful = new CubicalComponent('live-socket-panel', 'socket-pill');
    stateful.destroy = () => {
      destroyedCount += 1;
    };

    app.addComponent(stateless);
    app.addComponent(stateful);

    assert.equal(app.components.get('auth-status-bar'), stateless);
    assert.equal(app.components.get('live-socket-panel'), stateful);

    app.clear();
    assert.equal(destroyedCount, 1);
    assert.equal(app.components.size, 0);
  } finally {
    globalThis.document = prevDoc;
  }
});

test('PKC.init enforces startup order, isolates optional module failures with owner, and stops stateful modules in reverse order', async () => {
  const lifecycleEvents = [];
  const reportedErrors = [];

  const statelessModule = {
    async init() {
      lifecycleEvents.push('init:stateless');
    },
    async start() {
      lifecycleEvents.push('start:stateless');
    }
  };

  const modulesByEntry = {
    'mod:alpha': {
      async init() {
        lifecycleEvents.push('init:alpha');
      },
      async start() {
        lifecycleEvents.push('start:alpha');
      },
      async stop() {
        lifecycleEvents.push('stop:alpha');
      }
    },
    'mod:broken-optional': {
      async init() {
        lifecycleEvents.push('init:broken-optional');
        throw new Error('optional telemetry socket unreachable');
      },
      async start() {
        lifecycleEvents.push('start:broken-optional');
      }
    },
    'mod:stateless': statelessModule,
    'mod:beta': {
      async init() {
        lifecycleEvents.push('init:beta');
      },
      async start() {
        lifecycleEvents.push('start:beta');
      },
      async stop() {
        lifecycleEvents.push('stop:beta');
      }
    }
  };

  assert.equal('stop' in statelessModule, false);
  assert.equal('dispose' in statelessModule, false);

  const loaded = await PKC.init(
    {
      modules: [
        { id: 'alpha', owner: 'Architect', required: true, entry: 'mod:alpha' },
        { id: 'broken-optional', owner: 'Operations', required: false, entry: 'mod:broken-optional' },
        { id: 'stateless-view', owner: 'Product Manager', required: false, entry: 'mod:stateless' },
        { id: 'beta', owner: 'TEA', required: true, dependsOn: ['alpha'], entry: 'mod:beta' },
        { id: 'orphan-dep', owner: 'UX Designer', required: false, dependsOn: ['broken-optional'], entry: 'mod:beta' }
      ]
    },
    {
      skipAppConfig: true,
      loader: async (entry) => modulesByEntry[entry],
      onModuleError: (failure) => reportedErrors.push(failure)
    }
  );

  assert.deepEqual(Object.keys(loaded), ['alpha', 'stateless-view', 'beta']);
  assert.deepEqual(lifecycleEvents, [
    'init:alpha',
    'start:alpha',
    'init:broken-optional',
    'init:stateless',
    'start:stateless',
    'init:beta',
    'start:beta'
  ]);
  assert.equal(reportedErrors.length, 2);
  assert.deepEqual(reportedErrors[0], {
    id: 'broken-optional',
    owner: 'Operations',
    phase: 'init',
    required: false,
    message: 'optional telemetry socket unreachable'
  });
  assert.equal(reportedErrors[1].id, 'orphan-dep');
  assert.equal(reportedErrors[1].owner, 'UX Designer');
  assert.equal(reportedErrors[1].phase, 'dependency');

  const firstStop = await PKC.stop();
  assert.deepEqual(firstStop, ['beta', 'alpha']);
  assert.deepEqual(lifecycleEvents.slice(-2), ['stop:beta', 'stop:alpha']);

  const secondStop = await PKC.stop();
  assert.deepEqual(secondStop, []);
  assert.equal(lifecycleEvents.length, 9);
});

test('PKC.init rejects when a required module fails and names its id and owner', async () => {
  await assert.rejects(
    () =>
      PKC.init(
        {
          modules: [
            { id: 'critical-membrane', owner: 'Security Owner', required: true, entry: 'mod:missing' }
          ]
        },
        {
          skipAppConfig: true,
          loader: async () => {
            throw new Error('bundle 404');
          }
        }
      ),
    /critical-membrane.*Security Owner.*bundle 404/
  );
  await PKC.stop();
});

test('modules.json assigns explicit owner and optional flag to every manifest descriptor', async () => {
  const manifestRaw = fs.readFileSync(path.join(REPO_ROOT, 'modules.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  assert.equal(manifest.modules.length, 4);
  for (const mod of manifest.modules) {
    assert.equal(typeof mod.id, 'string');
    assert.equal(typeof mod.owner, 'string');
    assert.ok(mod.owner.length > 0);
    assert.equal(mod.required, false);
  }
});

test('AppEntry binds auth listener by component id and cleans up timer, listener, and PKC on destroy', async () => {
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const fakeDoc = createFakeDom();
  fakeDoc.makeElement('div', 'app-root');
  globalThis.document = fakeDoc;
  globalThis.window = { location: { href: 'http://127.0.0.1:3001/' } };

  let pkcStopped = 0;
  const fakePkc = {
    async init() {
      return { 'markdown-renderer': {} };
    },
    async stop() {
      pkcStopped += 1;
    }
  };
  const fakeAuthManager = {
    store: {
      getState: () => ({ auth: { user: { profile: { name: 'Initial Operator' } } } })
    },
    async init() {},
    login() {},
    logout() {}
  };

  try {
    const { AppEntry } = await import('../../js/app-entry.js');
    const entry = new AppEntry({
      rootId: 'app-root',
      pkc: fakePkc,
      authManager: fakeAuthManager
    });

    await entry.init();
    const authComp = entry.app.components.get('auth-status-bar');
    assert.ok(authComp, 'auth-status-bar should be registered by component id');
    assert.equal(fakeDoc.listenerCount('auth:status-changed'), 1);
    assert.equal(typeof globalThis.window.app.login, 'function');

    let updatedName = null;
    authComp.updateUser = (u) => {
      updatedName = u?.name || null;
    };
    fakeDoc.dispatchEvent({ type: 'auth:status-changed', detail: { user: { name: 'Verified User' } } });
    assert.equal(updatedName, 'Verified User');

    await entry.destroy();
    assert.equal(fakeDoc.listenerCount('auth:status-changed'), 0);
    assert.equal(globalThis.window.app, undefined);
    assert.equal(pkcStopped, 1);
    assert.equal(entry._loaderTimer, null);
  } finally {
    fakeDoc.removeEventListener('DOMContentLoaded', () => {});
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('initConformancePanel listens on document for lab:viewport-change and lab:target-change and detaches on destroy', async () => {
  const prevDoc = globalThis.document;
  const prevFetch = globalThis.fetch;
  const fakeDoc = createFakeDom();
  fakeDoc.makeElement('div', 'conformance-details');
  fakeDoc.makeElement('span', 'conformance-status-badge');
  globalThis.document = fakeDoc;

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      async json() {
        return {
          reports: [
            {
              device: { id: 'iphone-16-pro', orientation: 'portrait' },
              summary: { pass: 5, fail: 0, skipped: 0, notApplicable: 0 },
              results: [{ id: 'no-horizontal-overflow', status: 'pass' }]
            }
          ]
        };
      }
    };
  };

  try {
    const panel = initConformancePanel({
      getTarget: () => ({ url: 'http://127.0.0.1:3001/tests/fixtures/spa-test-target.html' }),
      getDevice: () => ({ id: 'iphone-16-pro', name: 'iPhone 16 Pro' }),
      getOrientation: () => 'portrait'
    });

    await new Promise((r) => setTimeout(r, 10));
    assert.equal(fetchCalls, 1);
    assert.equal(fakeDoc.getElementById('conformance-status-badge').textContent, 'Passed');

    fakeDoc.dispatchEvent({ type: 'lab:viewport-change', detail: {} });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(fetchCalls, 2);

    fakeDoc.dispatchEvent({ type: 'lab:target-change', detail: {} });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(fetchCalls, 3);

    panel.destroy();
    assert.equal(fakeDoc.listenerCount('lab:viewport-change'), 0);
    assert.equal(fakeDoc.listenerCount('lab:target-change'), 0);

    fakeDoc.dispatchEvent({ type: 'lab:target-change', detail: {} });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(fetchCalls, 3);
  } finally {
    globalThis.document = prevDoc;
    globalThis.fetch = prevFetch;
  }
});
