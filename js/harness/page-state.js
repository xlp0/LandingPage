/**
 * Page state contract (BPV-03, decision BPV-D02).
 *
 * One vocabulary for every workbench document. The body carries the net id,
 * the declared places, the current place, the page state and a boot nonce.
 * Islands report their own state through data-island-state. Firings land in a
 * bounded window.__netReport log that Bombadil and Playwright both read.
 */

const STATES = new Set(['loading', 'redirecting', 'ready', 'busy', 'error']);
const ISLAND_STATES = new Set(['mounting', 'ready', 'busy', 'empty', 'error']);
const MAX_REPORTS = 200;
const STORAGE_KEY = 'gqc:page-state:last';

function currentBody() {
  return typeof document === 'undefined' ? null : document.body;
}

function bootNonce() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseArcs(raw) {
  return String(raw || '')
    .split(';')
    .map((entry) => entry.split('>'))
    .filter((parts) => parts.length === 3)
    .map(([fromPlaceId, toPlaceId, transitionId]) => ({ fromPlaceId, toPlaceId, transitionId }));
}

function indexOfArcs(arcs) {
  const index = new Map();
  for (const arc of arcs) {
    const key = `${arc.fromPlaceId}->${arc.toPlaceId}`;
    const bucket = index.get(key) || [];
    bucket.push(arc);
    index.set(key, bucket);
  }
  return index;
}

function declaredPlaces(body) {
  if (!body) return [];
  const raw = body.dataset.placeIds || body.dataset.placeId || '';
  return raw
    .split(',')
    .map((place) => place.trim())
    .filter(Boolean);
}

function writeStatus(text) {
  const status = typeof document === 'undefined' ? null : document.getElementById('page-status');
  if (status) status.textContent = text;
}

function writeAlert(text) {
  const alert = typeof document === 'undefined' ? null : document.getElementById('page-alert');
  if (alert) alert.textContent = text;
}

const body = currentBody();
const places = declaredPlaces(body);
const arcs = body ? parseArcs(body.dataset.navArcs) : [];
const arcIndex = indexOfArcs(arcs);
const nonce = (body && body.dataset.bootNonce) || bootNonce();
const reports = [];
let reportSeq = 0;

if (body) {
  if (!body.dataset.bootNonce) body.dataset.bootNonce = nonce;
  if (!body.dataset.pageState) body.dataset.pageState = 'loading';
  if (!body.dataset.placeId && places.length === 1) body.dataset.placeId = places[0];
}

if (typeof window !== 'undefined') {
  window.__netReport = reports;
}

// Only the tab's own document navigates between places. A same-origin target framed by
// the lab shares the tab's sessionStorage, so it must not read or write the hand-off.
function isTopLevel() {
  if (typeof window === 'undefined') return true;
  try {
    return !window.parent || window.parent === window;
  } catch {
    return false;
  }
}

// A page that declares several places names its place in a page script, after this
// module ran. Its arrival is reported when that first place is set.
let handoffPending = true;

function restoreCrossDocumentFiring() {
  if (!handoffPending) return;
  if (!body || typeof sessionStorage === 'undefined' || !isTopLevel()) {
    handoffPending = false;
    return;
  }
  if (!body.dataset.placeId) return;
  handoffPending = false;
  let stored = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    stored = null;
  }
  const here = body.dataset.placeId;
  if (!stored || !stored.placeId || stored.bootNonce === nonce || !here || stored.placeId === here) return;
  const matches = arcIndex.get(`${stored.placeId}->${here}`) || [];
  const reverseMatches = matches.length === 0 ? (arcIndex.get(`${here}->${stored.placeId}`) || []) : [];
  const transitionId =
    matches.length === 1
      ? matches[0].transitionId
      : matches.length === 0 && reverseMatches.length > 0
        ? `history:${reverseMatches[0].transitionId}`
        : null;
  reportTransition({
    transitionId,
    fromPlaceId: stored.placeId,
    toPlaceId: here
  });
}

function persistPlace() {
  if (!body || typeof sessionStorage === 'undefined' || !isTopLevel()) return;
  const placeId = body.dataset.placeId;
  if (!placeId) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ placeId, bootNonce: nonce }));
  } catch {
    // Storage can be blocked. The contract degrades to same-document reporting.
  }
}

export function setPageState(state, code) {
  if (!STATES.has(state)) throw new Error(`Unknown page state: ${state}`);
  const node = currentBody();
  if (!node) return;
  node.dataset.pageState = state;
  if (state === 'error') {
    node.dataset.pageError = code || 'unknown';
    writeAlert(`Error: ${code || 'unknown'}`);
  } else {
    delete node.dataset.pageError;
    writeAlert('');
  }
  writeStatus(`State: ${state}`);
}

export function setPlace(placeId) {
  const node = currentBody();
  if (!node) return;
  const allowed = declaredPlaces(node);
  if (allowed.length > 0 && !allowed.includes(placeId)) {
    throw new Error(`Place ${placeId} is not declared for this page (${allowed.join(', ')})`);
  }
  node.dataset.placeId = placeId;
  writeStatus(`Place: ${placeId}`);
  restoreCrossDocumentFiring();
  persistPlace();
}

export function reportTransition({ transitionId = null, fromPlaceId, toPlaceId } = {}) {
  const node = currentBody();
  if (!node) return;
  if (toPlaceId) setPlace(toPlaceId);
  reportSeq += 1;
  reports.push({
    seq: reportSeq,
    transitionId: transitionId || null,
    fromPlaceId: fromPlaceId || null,
    toPlaceId: toPlaceId || null
  });
  if (reports.length > MAX_REPORTS) reports.shift();
}

export function islandState(element, state) {
  if (!element) return;
  if (!ISLAND_STATES.has(state)) throw new Error(`Unknown island state: ${state}`);
  element.dataset.islandState = state;
}

export function getReports() {
  return reports.slice();
}

if (typeof window !== 'undefined') {
  window.PageState = { setPageState, setPlace, reportTransition, islandState, getReports };
  window.addEventListener('pagehide', persistPlace);
  restoreCrossDocumentFiring();
  if (body && body.dataset.pageState === 'loading' && !body.dataset.placeId && places.length === 1) {
    writeStatus(`Place: ${places[0]}`);
  }
}
