import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { CanonicalTriadBackend } from '../../server/mcard-api.mjs';
import { createTestRunRouter } from '../../server/test-run-api.mjs';
import {
  TEST_RUN_SCHEMA,
  NAVIGATION_RUN_LINK_SCHEMA,
  INTERRUPTED_CAPTURE_SCHEMA,
  canonicalJson,
  parseStoredTestRunRecord
} from '../../js/harness/test-run-schema.js';
import { loadNetEnvelope } from '../../scripts/check-net.mjs';
import {
  validateClmViewTypeUri,
  buildWorkbenchNetMCard,
  persistWorkbenchNetToTriad,
  persistWorkbenchTraceToTriad,
  createLayer4TargetAdapter
} from '../../scripts/net-to-netmcard.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function makeValidRunPayload(sessionId) {
  return {
    schema: TEST_RUN_SCHEMA,
    sessionId,
    target: {
      url: 'http://localhost:3000/tests/fixtures/spa-test-target.html',
      slug: 'localhost-3000-tests-fixtures-spa-test-target-html'
    },
    captureSource: 'same-origin',
    device: {
      id: 'iphone-16-pro',
      name: 'iPhone 16 Pro',
      category: 'phone',
      width: 393,
      height: 852,
      pixelRatio: 3,
      hasTouch: true,
      isMobile: true,
      pointer: 'coarse',
      hover: false,
      safeAreaInsets: { top: 59, right: 0, bottom: 34, left: 0 },
      schemaVersion: 2
    },
    orientation: 'portrait',
    fidelity: {
      tier: 0,
      runner: 'lab-iframe',
      emulated: ['viewport'],
      notEmulated: ['pixelRatio', 'hasTouch', 'pointer', 'hover', 'isMobile', 'safeAreaInsets']
    },
    lab: { commit: '7734a24', clmKernel: '0.0.10' },
    metrics: {
      startedAt: '2026-10-28T00:00:00.000Z',
      activeDurationMs: 1200,
      eventCount: 2,
      droppedCount: 0,
      rejectedMessages: 0
    },
    telemetry: {
      overflow: { hasHorizontalOverflow: false, elements: [] },
      frames: { avgFps: 60, maxFrameMs: 16.7, droppedFrames: 0 },
      cls: 0,
      tapTargetViolations: 0
    },
    finalState: {
      url: 'http://localhost:3000/tests/fixtures/spa-test-target.html#details',
      domDigest: 'blake3:deadbeef'
    },
    events: [
      {
        seq: 1,
        t_rel_ms: 50,
        type: 'pointer',
        pointer: { pointerType: 'mouse', button: 0 },
        target: { selector: '[data-link-id="link_spa_open_details"]', tag: 'button' },
        viewport: { w: 393, h: 852, dpr: 1, orientation: 'portrait' },
        coords: { nx: 0.5, ny: 0.4 }
      }
    ]
  };
}

describe('Layer 4 target net, Layer 1 workbench net, and Canonical Triad persistence', () => {
  let tmpDir;
  let storage;
  let server;
  let baseUrl;
  let failNextLinkBind = false;

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gqc05-triad-'));
    storage = new CanonicalTriadBackend(path.join(tmpDir, 'triad.db'));

    const app = express();
    app.use(
      '/api/test-runs',
      express.json({ limit: '2mb' }),
      createTestRunRouter({
        storage,
        beforeLinkHandleBind: async () => {
          if (failNextLinkBind) {
            failNextLinkBind = false;
            throw new Error('Injected crash before link handle commit');
          }
        }
      })
    );

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
    storage?.close();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('GQC-05-UNIT-01: registers Page Place with clm://type/view/... URI and keeps routeHandle separate', () => {
    const spaEnvelope = loadNetEnvelope(path.join(ROOT_DIR, 'tests/fixtures/spa-test-target.graph.json'));
    const adapter = createLayer4TargetAdapter(spaEnvelope);

    const overviewPlace = adapter.placeCards.find((p) => p.placeId === 'p_spa_overview');
    assert.ok(overviewPlace);
    assert.equal(overviewPlace.typeExpr, 'clm://type/view/target/spa-overview');
    assert.notEqual(overviewPlace.typeExpr, spaEnvelope.bindings.places.p_spa_overview.routeHandle);

    const session = adapter.startSession({ sessionId: 'unit01-session' });
    assert.equal(session.currentViewPlaceId, 'p_spa_overview');
    assert.equal(session.sessionStatus, 'ACTIVE');
  });

  it('GQC-05-UNIT-02: rejects malformed or non-CLM view types before net execution', async () => {
    assert.throws(
      () => validateClmViewTypeUri('mcard:route:/tests/fixtures/spa-test-target.html#overview', { placeId: 'p_spa_overview' }),
      /must not pass route handle/
    );
    assert.throws(
      () => validateClmViewTypeUri('https://example.gov/view', { placeId: 'p_spa_overview' }),
      new RegExp("must match clm://type/view")
    );
    assert.throws(
      () => validateClmViewTypeUri('clm://type/session/active', { placeId: 'p_spa_overview' }),
      new RegExp("must match clm://type/view")
    );
    assert.throws(
      () => validateClmViewTypeUri('clm://type/view/Bad Uppercase', { placeId: 'p_spa_overview' }),
      new RegExp("must match clm://type/view")
    );

    const badEnvelope = loadNetEnvelope(path.join(ROOT_DIR, 'tests/fixtures/spa-test-target.graph.json'));
    badEnvelope.bindings.places.p_spa_overview.clmTypeUri = 'mcard:route:/spa#overview';
    assert.throws(() => createLayer4TargetAdapter(badEnvelope), /must not pass route handle/);

    const httpRes = await fetch(`${baseUrl}/api/test-runs/navigation/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        netId: 'bad-custom-net',
        sessionId: 'bad-uri-session',
        targetEnvelope: badEnvelope
      })
    });
    assert.equal(httpRes.status, 400);
    const body = await httpRes.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /must not pass route handle/);
  });

  it('GQC-05-INT-01: persists net, initial marking, run, and receipts in 3-table Triad and resolves navigation-run-link:v1 without changing v1 run', async () => {
    const tables = storage.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC")
      .all()
      .map((r) => r.name);
    assert.deepEqual(tables, ['card', 'handle_history', 'handle_registry']);

    const sessRes = await fetch(`${baseUrl}/api/test-runs/navigation/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'int01-session' })
    });
    assert.equal(sessRes.status, 200);
    const sessBody = await sessRes.json();
    assert.equal(sessBody.currentViewPlaceId, 'p_spa_overview');

    const fireRes = await fetch(`${baseUrl}/api/test-runs/navigation/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'int01-session',
        transitionId: 't_spa_open_details',
        requestId: 'int01-req-1'
      })
    });
    assert.equal(fireRes.status, 200);
    const fireBody = await fireRes.json();
    assert.equal(fireBody.navigated, true);
    assert.equal(fireBody.currentViewPlaceId, 'p_spa_details');
    assert.equal(fireBody.receipt.verdict, 'COMMITTED');

    const v1Run = makeValidRunPayload('int01-session');
    const v1SnapshotBefore = canonicalJson(v1Run);
    const runRes = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v1Run)
    });
    assert.equal(runRes.status, 201);
    const runBody = await runRes.json();

    const linkRes = await fetch(`${baseUrl}/api/test-runs/navigation/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runHash: runBody.hash,
        sessionId: 'int01-session'
      })
    });
    assert.equal(linkRes.status, 201);
    const linkBody = await linkRes.json();
    assert.equal(linkBody.link.schema, NAVIGATION_RUN_LINK_SCHEMA);
    assert.equal(linkBody.linkHandle, `nav_run_link_${runBody.hash}`);

    const reloadLinkRes = await fetch(`${baseUrl}/api/test-runs/navigation/link?runHash=${runBody.hash}`);
    assert.equal(reloadLinkRes.status, 200);
    const reloadLink = await reloadLinkRes.json();
    assert.equal(reloadLink.verified, true);
    assert.equal(reloadLink.link.targetNetMCardHash, sessBody.netMCardHash);
    assert.deepEqual(reloadLink.link.receiptHashes, [fireBody.receipt.receiptHash]);
    assert.equal(reloadLink.receipts[0].verified, true);
    assert.equal(reloadLink.receipts[0].receipt.kind, 'firing_receipt_mcard');

    const reloadRunRes = await fetch(`${baseUrl}/api/test-runs/${runBody.hash}`);
    assert.equal(reloadRunRes.status, 200);
    const reloadRun = await reloadRunRes.json();
    assert.equal(reloadRun.verified, true);
    assert.equal(canonicalJson(reloadRun.run), v1SnapshotBefore);

    const tablesAfter = storage.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC")
      .all()
      .map((r) => r.name);
    assert.deepEqual(tablesAfter, ['card', 'handle_history', 'handle_registry']);
  });

  it('GQC-05-INT-02: injected failure before link handle commit leaves no partial completed-run handle, and retry is idempotent', async () => {
    const sessRes = await fetch(`${baseUrl}/api/test-runs/navigation/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'int02-session' })
    });
    assert.equal(sessRes.status, 200);

    await fetch(`${baseUrl}/api/test-runs/navigation/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'int02-session',
        transitionId: 't_spa_open_details',
        requestId: 'int02-req-1'
      })
    });

    const v1Run = makeValidRunPayload('int02-session');
    const runRes = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v1Run)
    });
    const runBody = await runRes.json();

    const missingReceiptRes = await fetch(`${baseUrl}/api/test-runs/navigation/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runHash: runBody.hash,
        sessionId: 'int02-session',
        receiptHashes: ['f'.repeat(64)]
      })
    });
    assert.equal(missingReceiptRes.status, 409);
    assert.equal(storage.resolveHandle(`nav_run_link_${runBody.hash}`), null);

    failNextLinkBind = true;
    const crashedLinkRes = await fetch(`${baseUrl}/api/test-runs/navigation/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runHash: runBody.hash,
        sessionId: 'int02-session'
      })
    });
    assert.equal(crashedLinkRes.status, 500);
    assert.equal(storage.resolveHandle(`nav_run_link_${runBody.hash}`), null);

    const retry1 = await fetch(`${baseUrl}/api/test-runs/navigation/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runHash: runBody.hash,
        sessionId: 'int02-session'
      })
    });
    assert.equal(retry1.status, 201);
    const retryBody1 = await retry1.json();

    const retry2 = await fetch(`${baseUrl}/api/test-runs/navigation/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runHash: runBody.hash,
        sessionId: 'int02-session'
      })
    });
    assert.equal(retry2.status, 200);
    const retryBody2 = await retry2.json();
    assert.equal(retryBody2.inserted, false);
    assert.equal(retryBody2.linkHash, retryBody1.linkHash);
  });

  it('traps invalid link at p_error_modal, rejects normal transitions until explicit recovery, and serializes concurrent duplicate submissions', async () => {
    await fetch(`${baseUrl}/api/test-runs/navigation/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'trap-and-dedupe-session' })
    });

    const [dupA, dupB] = await Promise.all([
      fetch(`${baseUrl}/api/test-runs/navigation/fire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'trap-and-dedupe-session',
          transitionId: 't_spa_open_details',
          requestId: 'same-req-id'
        })
      }).then((r) => r.json()),
      fetch(`${baseUrl}/api/test-runs/navigation/fire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'trap-and-dedupe-session',
          transitionId: 't_spa_open_details',
          requestId: 'same-req-id'
        })
      }).then((r) => r.json())
    ]);

    assert.equal(dupA.receiptHash || dupA.receipt.receiptHash, dupB.receiptHash || dupB.receipt.receiptHash);
    assert.equal(dupA.stepCount, 1);
    assert.equal(dupB.stepCount, 1);
    assert.equal(Boolean(dupA.deduplicated || dupB.deduplicated), true);

    await fetch(`${baseUrl}/api/test-runs/navigation/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'trap-and-dedupe-session',
        transitionId: 't_spa_back_overview',
        requestId: 'back-1'
      })
    });

    const invalidRes = await fetch(`${baseUrl}/api/test-runs/navigation/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'trap-and-dedupe-session',
        transitionId: 't_spa_invalid_unmapped',
        requestId: 'invalid-1'
      })
    });
    assert.equal(invalidRes.status, 200);
    const invalidBody = await invalidRes.json();
    assert.equal(invalidBody.navigated, false);
    assert.equal(invalidBody.trappedToErrorModal, true);
    assert.equal(invalidBody.currentViewPlaceId, 'p_error_modal');
    assert.equal(invalidBody.mappedPlaceId, 'p_spa_missing_transition');
    assert.equal(invalidBody.requiresRecovery, true);

    const blockedNormalRes = await fetch(`${baseUrl}/api/test-runs/navigation/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'trap-and-dedupe-session',
        transitionId: 't_spa_open_details',
        requestId: 'blocked-normal-1'
      })
    });
    assert.equal(blockedNormalRes.status, 409);
    const blockedBody = await blockedNormalRes.json();
    assert.equal(blockedBody.code, 'SESSION_AT_ERROR_MODAL');
    assert.equal(blockedBody.requiresRecovery, true);

    const recoverRes = await fetch(`${baseUrl}/api/test-runs/navigation/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'trap-and-dedupe-session',
        transitionId: 't_spa_recover_overview',
        mode: 'recover',
        requestId: 'recover-1'
      })
    });
    assert.equal(recoverRes.status, 200);
    const recoverBody = await recoverRes.json();
    assert.equal(recoverBody.recovered, true);
    assert.equal(recoverBody.sessionStatus, 'ACTIVE');
    assert.equal(recoverBody.currentViewPlaceId, 'p_spa_overview');
    assert.equal(storage.get(recoverBody.receipt.receiptHash)?.verified, true);
  });

  it('quarantines interrupted captures from passing runs and fails visibly on unknown schema versions without downgrade', async () => {
    const interrupted = {
      schema: INTERRUPTED_CAPTURE_SCHEMA,
      sessionId: 'tr_interrupted_01',
      target: {
        url: 'http://localhost:3000/tests/fixtures/spa-test-target.html',
        slug: 'localhost-3000-tests-fixtures-spa-test-target-html'
      },
      lifecycleState: 'RECORDING',
      reason: 'Target switched to blocked external origin mid-capture',
      incomplete: true,
      passing: false,
      certified: false,
      partialEventCount: 1
    };

    const postInt = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interrupted)
    });
    assert.equal(postInt.status, 201);
    const intBody = await postInt.json();
    assert.match(intBody.handle, /^interrupted_capture_[a-f0-9]{16}$/);
    assert.equal(intBody.incomplete, true);
    assert.equal(intBody.passing, false);
    assert.equal(intBody.verdict, 'incomplete');

    assert.equal(
      storage.resolveHandle('urn:mcard:test_run:localhost-3000-tests-fixtures-spa-test-target-html:tr_interrupted_01'),
      null
    );

    const getInt = await fetch(`${baseUrl}/api/test-runs/${intBody.hash}`);
    assert.equal(getInt.status, 200);
    const getIntBody = await getInt.json();
    assert.equal(getIntBody.verified, true);
    assert.equal(getIntBody.incomplete, true);
    assert.equal(getIntBody.passing, false);
    assert.equal(getIntBody.verdict, 'incomplete');

    const linkIntAttempt = await fetch(`${baseUrl}/api/test-runs/navigation/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runHash: intBody.hash, sessionId: 'tr_interrupted_01' })
    });
    assert.equal(linkIntAttempt.status, 400);

    const futureRun = {
      ...makeValidRunPayload('tr_future_v2'),
      schema: 'urn:mcard:schema:responsive_test_run:v2'
    };
    const writeFuture = await fetch(`${baseUrl}/api/test-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(futureRun)
    });
    assert.equal(writeFuture.status, 400);
    const writeFutureBody = await writeFuture.json();
    assert.equal(writeFutureBody.unsupportedVersion, true);

    const directPut = storage.put(canonicalJson(futureRun));
    const readFuture = await fetch(`${baseUrl}/api/test-runs/${directPut.hash}`);
    assert.equal(readFuture.status, 422);
    const readFutureBody = await readFuture.json();
    assert.equal(readFutureBody.unsupportedVersion, true);
    assert.equal(readFutureBody.downgradedToV1, false);
    assert.equal(parseStoredTestRunRecord(futureRun).unsupportedVersion, true);
  });

  it('GQC-05-INT-03: workbench NetMCard hash is deterministic, invariant to binding edits, and sensitive to topology arc edits', () => {
    const wbEnvelope = loadNetEnvelope(path.join(ROOT_DIR, 'src/net/workbench-net.yaml'));
    const buildA = buildWorkbenchNetMCard(wbEnvelope);
    const buildB = buildWorkbenchNetMCard(wbEnvelope);
    assert.equal(buildA.netMCard.card.hash, buildB.netMCard.card.hash);

    const editedBindings = structuredClone(wbEnvelope);
    editedBindings.bindings.places.p_page_responsive_lab.route = '/renamed-lab-route.html';
    editedBindings.bindings.places.p_page_responsive_lab.owner = 'Changed Owner';
    const buildBindingEdited = persistWorkbenchNetToTriad(storage, editedBindings);
    const buildOriginal = persistWorkbenchNetToTriad(storage, wbEnvelope);

    assert.equal(buildBindingEdited.netMCardHash, buildOriginal.netMCardHash);
    assert.notEqual(buildBindingEdited.bindingsMCardHash, buildOriginal.bindingsMCardHash);

    const editedArc = structuredClone(wbEnvelope);
    editedArc.topology.transitions[0].outputs = ['p_page_app'];
    const buildArcEdited = buildWorkbenchNetMCard(editedArc);
    assert.notEqual(buildArcEdited.netMCard.card.hash, buildA.netMCard.card.hash);
  });

  it('GQC-05-INT-04: replays a P0 workbench trace via ColoredPetriVM, persists FiringRecord list linked to workbench NetMCard, and keeps browser clm-kernel-free', async () => {
    const wbEnvelope = loadNetEnvelope(path.join(ROOT_DIR, 'src/net/workbench-net.yaml'));
    const spaEnvelope = loadNetEnvelope(path.join(ROOT_DIR, 'tests/fixtures/spa-test-target.graph.json'));

    const trace = {
      traceId: 'p0-workbench-journey-sample',
      entryPlaceId: 'p_page_index',
      events: [
        { transitionId: 't_redirect_index_to_lab' },
        { transitionId: 't_req_get_app_config' },
        { transitionId: 't_ok_get_app_config' },
        { transitionId: 't_req_post_test_runs' },
        { transitionId: 't_ok_post_test_runs' }
      ]
    };

    const persistedTrace = await persistWorkbenchTraceToTriad(storage, wbEnvelope, trace);
    const spaAdapter = createLayer4TargetAdapter(spaEnvelope, { storage });

    assert.notEqual(persistedTrace.workbenchNetMCardHash, spaAdapter.netMCardHash);
    assert.equal(persistedTrace.firingRecordCount, 5);
    assert.equal(persistedTrace.finalPlaceId, 'p_page_responsive_lab');

    const storedTraceCard = storage.get(persistedTrace.traceMCardHash);
    assert.ok(storedTraceCard?.verified);
    const reloaded = JSON.parse(storedTraceCard.content);
    assert.equal(reloaded.workbenchNetMCardHash, persistedTrace.workbenchNetMCardHash);
    assert.deepEqual(
      reloaded.firingRecords.map((r) => r.transitionId),
      trace.events.map((e) => e.transitionId)
    );

    const clientDirs = ['src/islands', 'js/harness', 'js/renderers', 'js/modules'];
    for (const rel of clientDirs) {
      const absDir = path.join(ROOT_DIR, rel);
      const stack = [absDir];
      while (stack.length > 0) {
        const cur = stack.pop();
        for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
          const full = path.join(cur, ent.name);
          if (ent.isDirectory()) stack.push(full);
          else if (/\.(js|jsx|mjs)$/.test(ent.name)) {
            const text = fs.readFileSync(full, 'utf8');
            assert.equal(
              /from\s+['"]clm-kernel(?:\/[^'"]*)?['"]/.test(text),
              false,
              `Client file ${full} must not import clm-kernel`
            );
          }
        }
      }
    }
  });
});
