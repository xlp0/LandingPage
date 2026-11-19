import assert from 'node:assert/strict';
import test from 'node:test';

class FakeBody {
  constructor(dataset = {}) {
    Object.assign(this, { dataset: { ...dataset } });
  }
}

function installDom({ dataset = {}, alertText = '', framed = false } = {}) {
  // A framed document has a parent window other than itself.
  if (framed) globalThis.parent = {};
  else delete globalThis.parent;
  const status = { textContent: '' };
  const alert = { textContent: alertText };
  const body = new FakeBody(dataset);
  globalThis.document = {
    body,
    getElementById(id) {
      if (id === 'page-status') return status;
      if (id === 'page-alert') return alert;
      return null;
    }
  };
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  };
  globalThis.addEventListener = () => {};
  globalThis.window = globalThis;
  return { body, status, alert, store };
}

async function loadModule(tag) {
  return import(`../../js/harness/page-state.js?case=${tag}`);
}

test('setPageState writes the contract and rejects unknown states', async () => {
  const { body, alert } = installDom({ dataset: { netId: 'landingpage-workbench-net', placeIds: 'p_page_app' } });
  const { setPageState } = await loadModule('state');
  setPageState('ready');
  assert.equal(body.dataset.pageState, 'ready');
  assert.equal(body.dataset.pageError, undefined);
  setPageState('error', 'boom');
  assert.equal(body.dataset.pageState, 'error');
  assert.equal(body.dataset.pageError, 'boom');
  assert.equal(alert.textContent, 'Error: boom');
  assert.throws(() => setPageState('nonsense'), /Unknown page state/);
});

test('setPlace rejects a place outside the declared list', async () => {
  const { body } = installDom({ dataset: { placeIds: 'p_page_app,p_page_index' } });
  const { setPlace } = await loadModule('place');
  setPlace('p_page_index');
  assert.equal(body.dataset.placeId, 'p_page_index');
  assert.throws(() => setPlace('p_page_responsive_lab'), /not declared/);
});

test('the net report is bounded and assigns sequence numbers', async () => {
  installDom({ dataset: { placeIds: 'p_page_app,p_page_index' } });
  const { reportTransition, getReports } = await loadModule('report');
  for (let i = 0; i < 205; i += 1) {
    reportTransition({ transitionId: `t_${i}`, fromPlaceId: 'p_page_app', toPlaceId: 'p_page_index' });
  }
  const reports = getReports();
  assert.equal(reports.length, 200);
  assert.equal(reports[0].transitionId, 't_5');
  assert.equal(reports.at(-1).seq, 205);
  assert.deepEqual(globalThis.window.__netReport, reports);
});

test('a cross-document boot reports the single declared transition', async () => {
  const { store } = installDom({
    dataset: {
      placeIds: 'p_page_app,p_page_index',
      placeId: 'p_page_index',
      navArcs: 'p_page_app>p_page_index>t_link_app_to_index;p_page_app>p_page_index>t_second_path'
    }
  });
  store.set('gqc:page-state:last', JSON.stringify({ placeId: 'p_page_app', bootNonce: 'older-nonce' }));
  // Two arcs match, so the transition id must stay unresolved.
  const { getReports, setPlace } = await loadModule('handoff-ambiguous');
  assert.equal(getReports().length, 1);
  assert.equal(getReports()[0].transitionId, null);
  assert.equal(getReports()[0].fromPlaceId, 'p_page_app');
  assert.equal(document.body.dataset.placeId, 'p_page_index');
  setPlace('p_page_app');
  assert.equal(document.body.dataset.placeId, 'p_page_app');
});

test('a page that names its place after boot still reports the hand-off once', async () => {
  // The portal declares two places and picks its view in a page script, after this module ran.
  const { store } = installDom({
    dataset: {
      placeIds: 'p_page_index,p_view_index_mcard_viewer',
      navArcs: 'p_page_responsive_lab>p_view_index_mcard_viewer>t_link_lab_to_index'
    }
  });
  store.set('gqc:page-state:last', JSON.stringify({ placeId: 'p_page_responsive_lab', bootNonce: 'lab-nonce' }));
  const { getReports, setPlace } = await loadModule('handoff-deferred');
  assert.equal(getReports().length, 0);
  setPlace('p_view_index_mcard_viewer');
  assert.deepEqual(
    getReports().map(({ transitionId, fromPlaceId, toPlaceId }) => ({ transitionId, fromPlaceId, toPlaceId })),
    [{ transitionId: 't_link_lab_to_index', fromPlaceId: 'p_page_responsive_lab', toPlaceId: 'p_view_index_mcard_viewer' }]
  );
  setPlace('p_page_index');
  assert.equal(getReports().length, 1, 'only the first place of a boot takes the hand-off');
});

test('a framed document takes no part in the cross-document hand-off', async () => {
  // A same-origin target inside the lab shares the tab's sessionStorage. Its place must
  // neither produce a firing nor overwrite the hand-off of the top-level page.
  const handoff = JSON.stringify({ placeId: 'p_page_app', bootNonce: 'lab-nonce' });
  const { store } = installDom({
    framed: true,
    dataset: {
      placeIds: 'p_page_app,p_page_index',
      placeId: 'p_page_index',
      navArcs: 'p_page_app>p_page_index>t_link_app_to_index'
    }
  });
  store.set('gqc:page-state:last', handoff);
  const { getReports, setPlace } = await loadModule('handoff-framed');
  assert.equal(getReports().length, 0);
  setPlace('p_page_app');
  assert.equal(store.get('gqc:page-state:last'), handoff);
});

test('a boot with the same nonce reports nothing', async () => {
  const { store } = installDom({
    dataset: {
      placeIds: 'p_page_app,p_page_index',
      placeId: 'p_page_index',
      bootNonce: 'nonce-test',
      navArcs: 'p_page_app>p_page_index>t_link_app_to_index'
    }
  });
  store.set('gqc:page-state:last', JSON.stringify({ placeId: 'p_page_app', bootNonce: 'nonce-test' }));
  const { getReports } = await loadModule('handoff-same');
  assert.equal(getReports().length, 0);
});

test('a reverse cross-document navigation reports a history:<transitionId> arc', async () => {
  const { store } = installDom({
    dataset: {
      placeIds: 'p_page_responsive_lab',
      placeId: 'p_page_responsive_lab',
      navArcs: 'p_page_responsive_lab>p_page_app>t_link_lab_to_app'
    }
  });
  store.set('gqc:page-state:last', JSON.stringify({ placeId: 'p_page_app', bootNonce: 'app-nonce' }));
  const { getReports } = await loadModule('handoff-history');
  assert.deepEqual(
    getReports().map(({ transitionId, fromPlaceId, toPlaceId }) => ({ transitionId, fromPlaceId, toPlaceId })),
    [{ transitionId: 'history:t_link_lab_to_app', fromPlaceId: 'p_page_app', toPlaceId: 'p_page_responsive_lab' }]
  );
});
