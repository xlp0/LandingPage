import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  loadNetEnvelope,
  replayNetTrace,
  computeTransitionCoverage,
  formatNetCoverageMarkdown
} from '../../scripts/check-net.mjs';
import { attachWorkbenchNetTracer } from '../fixtures/net-trace.js';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(CURRENT_DIR, '../..');
const WORKBENCH_NET_PATH = path.join(ROOT_DIR, 'src/net/workbench-net.yaml');
const SPA_NET_PATH = path.join(ROOT_DIR, 'tests/fixtures/spa-test-target.graph.json');

function createFakePage(initialUrl = 'about:blank') {
  const emitter = new EventEmitter();
  let currentUrl = initialUrl;
  const mainFrameObj = {
    url: () => currentUrl
  };
  return Object.assign(emitter, {
    url: () => currentUrl,
    mainFrame: () => mainFrameObj,
    navigateMain(nextUrl) {
      currentUrl = nextUrl;
      emitter.emit('framenavigated', mainFrameObj);
    },
    navigateChildIframe(iframeUrl) {
      emitter.emit('framenavigated', { url: () => iframeUrl });
    },
    emitFetch(url, { method = 'GET', status = 200, fromChildFrame = false } = {}) {
      const req = {
        url: () => url,
        method: () => method,
        resourceType: () => 'fetch',
        frame: () => (fromChildFrame ? { url: () => 'about:srcdoc' } : mainFrameObj),
        failure: () => null
      };
      emitter.emit('request', req);
      return {
        respond(code = status) {
          emitter.emit('response', {
            url: () => url,
            status: () => code,
            request: () => req
          });
        },
        fail(errorText = 'net::ERR_FAILED') {
          req.failure = () => ({ errorText });
          emitter.emit('requestfailed', req);
        }
      };
    },
    openPopup(popupUrl) {
      const popup = createFakePage('about:blank');
      emitter.emit('popup', popup);
      popup.navigateMain(popupUrl);
      return popup;
    }
  });
}

test('GQC-02A-UNIT-06 replays approved workbench, deep-link, open-external, and error-recovery traces cleanly', async () => {
  const workbenchNet = loadNetEnvelope(WORKBENCH_NET_PATH);
  const spaNet = loadNetEnvelope(SPA_NET_PATH);

  const labJourneyTrace = {
    traceId: 'approved-entry-and-lab-save',
    entryPlaceId: 'p_page_index',
    events: [
      {
        transitionId: 't_redirect_index_to_lab',
        fromPlaceId: 'p_page_index',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T00:00:00.000Z'
      },
      {
        transitionId: 't_req_get_app_config',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_pending_get_app_config',
        at: '2026-10-28T00:00:00.010Z'
      },
      {
        transitionId: 't_ok_get_app_config',
        fromPlaceId: 'p_pending_get_app_config',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T00:00:00.020Z'
      },
      {
        transitionId: 't_req_post_test_runs',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_pending_post_test_runs',
        at: '2026-10-28T00:00:00.100Z'
      },
      {
        transitionId: 't_ok_post_test_runs',
        fromPlaceId: 'p_pending_post_test_runs',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T00:00:00.120Z'
      }
    ]
  };

  const replayLab = await replayNetTrace(workbenchNet, labJourneyTrace);
  assert.equal(replayLab.ok, true);
  assert.equal(replayLab.finalPlaceId, 'p_page_responsive_lab');
  assert.equal(replayLab.sessionInvariantHolds, true);
  assert.equal(replayLab.stepCount, 5);

  const appAndExternalTrace = {
    traceId: 'approved-deep-link-app-and-game',
    entryPlaceId: 'p_page_app',
    events: [
      {
        transitionId: 't_open_external_monopoly',
        fromPlaceId: 'p_page_app',
        toPlaceId: 'p_page_app',
        at: '2026-10-28T00:01:00.000Z'
      },
      {
        transitionId: 't_link_app_to_index',
        fromPlaceId: 'p_page_app',
        toPlaceId: 'p_page_index',
        at: '2026-10-28T00:01:01.000Z'
      },
      {
        transitionId: 't_redirect_index_to_lab',
        fromPlaceId: 'p_page_index',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T00:01:01.050Z'
      }
    ]
  };

  const replayApp = await replayNetTrace(workbenchNet, appAndExternalTrace);
  assert.equal(replayApp.ok, true);
  assert.equal(replayApp.finalPlaceId, 'p_page_responsive_lab');
  assert.equal(replayApp.finalMarking.p_external_games, 1);
  assert.equal(replayApp.finalMarking.p_page_responsive_lab, 1);
  assert.equal(replayApp.sessionInvariantHolds, true);

  const errorRecoveryTrace = {
    traceId: 'approved-error-and-recover',
    entryPlaceId: 'p_page_responsive_lab',
    events: [
      {
        transitionId: 't_req_post_test_runs',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_pending_post_test_runs',
        at: '2026-10-28T00:02:00.000Z'
      },
      {
        transitionId: 't_fail_post_test_runs',
        fromPlaceId: 'p_pending_post_test_runs',
        toPlaceId: 'p_error_post_test_runs',
        at: '2026-10-28T00:02:00.020Z'
      },
      {
        transitionId: 't_recover_post_test_runs',
        fromPlaceId: 'p_error_post_test_runs',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T00:02:00.100Z'
      }
    ]
  };
  const replayRecover = await replayNetTrace(workbenchNet, errorRecoveryTrace);
  assert.equal(replayRecover.ok, true);
  assert.equal(replayRecover.finalPlaceId, 'p_page_responsive_lab');

  const spaDeepLink = await replayNetTrace(spaNet, {
    traceId: 'spa-deep-link-details',
    entryPlaceId: 'p_spa_details',
    events: [
      {
        transitionId: 't_spa_back_overview',
        fromPlaceId: 'p_spa_details',
        toPlaceId: 'p_spa_overview',
        at: '2026-10-28T00:03:00.000Z'
      }
    ]
  });
  assert.equal(spaDeepLink.ok, true);
  assert.equal(spaDeepLink.finalPlaceId, 'p_spa_overview');
});

test('GQC-02A-UNIT-07 rejects out-of-order, undeclared, and non-deep-link traces and names the failing Transition', async () => {
  const workbenchNet = loadNetEnvelope(WORKBENCH_NET_PATH);

  const skippedPageTrace = {
    traceId: 'skip-redirect-trace',
    entryPlaceId: 'p_page_index',
    events: [
      {
        transitionId: 't_link_lab_to_app',
        fromPlaceId: 'p_page_index',
        toPlaceId: 'p_page_app',
        at: '2026-10-28T00:04:00.000Z'
      }
    ]
  };

  const skippedRes = await replayNetTrace(workbenchNet, skippedPageTrace);
  assert.equal(skippedRes.ok, false);
  assert.equal(skippedRes.reason, 'disabled-transition');
  assert.equal(skippedRes.failedEventIndex, 0);
  assert.equal(skippedRes.transitionId, 't_link_lab_to_app');
  assert.match(skippedRes.message, /t_link_lab_to_app/);

  const unmappedRes = await replayNetTrace(workbenchNet, {
    traceId: 'undecided-link-trace',
    entryPlaceId: 'p_page_responsive_lab',
    events: [
      {
        transitionId: null,
        unmapped: true,
        url: 'http://127.0.0.1:4100/pkc-docs-index.html',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: null,
        at: '2026-10-28T00:05:00.000Z'
      }
    ]
  });
  assert.equal(unmappedRes.ok, false);
  assert.equal(unmappedRes.reason, 'undeclared-transition');
  assert.equal(unmappedRes.failedEventIndex, 0);
  assert.match(unmappedRes.message, /pkc-docs-index.html/);

  const badEntryRes = await replayNetTrace(workbenchNet, {
    traceId: 'pending-cannot-be-entry',
    entryPlaceId: 'p_pending_post_test_runs',
    events: []
  });
  assert.equal(badEntryRes.ok, false);
  assert.equal(badEntryRes.reason, 'invalid-trace-entry-place');
});

test('attachWorkbenchNetTracer derives FIFO server calls, popup promotions, open-external forks, and unmapped URLs from Playwright events alone', async () => {
  const workbenchNet = loadNetEnvelope(WORKBENCH_NET_PATH);
  const page = createFakePage();
  const tracer = attachWorkbenchNetTracer(page, {
    envelope: workbenchNet,
    traceId: 'unit-mock-browser',
    expectedOrigin: 'http://127.0.0.1:4100'
  });

  page.navigateMain('http://127.0.0.1:4100/index.html?noredirect=1');
  page.navigateChildIframe('http://127.0.0.1:4100/tests/fixtures/spa-test-target.html');

  const passiveSample = page.emitFetch('http://127.0.0.1:4100/data/samples/portal_samples_manifest.json');
  const externalFaro = page.emitFetch('http://127.0.0.1:12347/collect', { method: 'POST' });
  const iframeCall = page.emitFetch('http://127.0.0.1:4100/api/env', { fromChildFrame: true });
  const envCall = page.emitFetch('http://127.0.0.1:4100/api/env');
  const landingCall = page.emitFetch('http://127.0.0.1:4100/api/mcard/landing');

  passiveSample.respond(200);
  externalFaro.fail('net::ERR_CONNECTION_REFUSED');
  iframeCall.respond(200);
  landingCall.respond(200);
  envCall.respond(200);

  page.navigateMain('http://127.0.0.1:4100/responsive-lab.html');
  page.emitFetch('http://127.0.0.1:4100/app-config.json').respond(200);

  const appPopup = page.openPopup('http://127.0.0.1:4100/app.html');
  assert.equal(tracer.getActivePage(), appPopup);
  appPopup.openPopup('http://127.0.0.1:4100/public/examples/games/monopoly-auth.html');
  assert.equal(tracer.getActivePage(), appPopup);

  const trace = tracer.getTrace();
  assert.equal(trace.entryPlaceId, 'p_view_index_mcard_viewer');
  assert.deepEqual(
    trace.events.map((e) => e.transitionId),
    [
      't_req_get_env',
      't_ok_get_env',
      't_req_get_mcard_landing',
      't_ok_get_mcard_landing',
      't_link_viewer_to_lab',
      't_req_get_app_config',
      't_ok_get_app_config',
      't_link_lab_to_app',
      't_open_external_monopoly'
    ]
  );

  const replay = await replayNetTrace(workbenchNet, trace);
  assert.equal(replay.ok, true);
  assert.equal(replay.finalPlaceId, 'p_page_app');
  assert.equal(replay.finalMarking.p_external_games, 1);

  const coverage = computeTransitionCoverage(workbenchNet, {
    replayedTraces: [{ ...replay, asserted: true }]
  });
  assert.equal(coverage.declared, 65);
  assert.equal(coverage.fired, 9);
  assert.equal(coverage.asserted, 9);
  assert.equal(coverage.policy, 'ADVISORY');
  assert.equal(coverage.blocking, false);

  const md = formatNetCoverageMarkdown([
    { filePath: 'src/net/workbench-net.yaml', placeCount: 31, coverage }
  ]);
  assert.match(md, /ADVISORY/);
  assert.equal(md.includes('\u2014'), false);
  assert.equal(md.includes('\u2013'), false);

  appPopup.navigateMain('http://127.0.0.1:4100/pkc-docs-index.html');
  const dirtyTrace = tracer.getTrace();
  assert.equal(dirtyTrace.unmappedNavigations.length, 1);
  const rejected = await replayNetTrace(workbenchNet, dirtyTrace);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'undeclared-transition');

  tracer.detach();
});

test('GQC-03-UNIT-06 replays blocked-target, capture-unavailable, handshake-timeout, and custom-unapproved traces through error Places and recover Transitions', async () => {
  const workbenchNet = loadNetEnvelope(WORKBENCH_NET_PATH);
  const policyRecoveryTrace = {
    traceId: 'gqc03-policy-error-and-recover',
    entryPlaceId: 'p_page_responsive_lab',
    events: [
      {
        transitionId: 't_req_get_app_config',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_pending_get_app_config',
        at: '2026-10-28T05:00:00.000Z'
      },
      {
        transitionId: 't_ok_get_app_config',
        fromPlaceId: 'p_pending_get_app_config',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T05:00:00.010Z'
      },
      {
        transitionId: 't_enter_target_blocked',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_error_target_blocked',
        at: '2026-10-28T05:00:00.020Z'
      },
      {
        transitionId: 't_recover_target_blocked',
        fromPlaceId: 'p_error_target_blocked',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T05:00:00.030Z'
      },
      {
        transitionId: 't_req_probe_handshake',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_pending_probe_handshake',
        at: '2026-10-28T05:00:00.040Z'
      },
      {
        transitionId: 't_fail_probe_handshake_timeout',
        fromPlaceId: 'p_pending_probe_handshake',
        toPlaceId: 'p_error_handshake_timeout',
        at: '2026-10-28T05:00:05.040Z'
      },
      {
        transitionId: 't_recover_handshake_timeout',
        fromPlaceId: 'p_error_handshake_timeout',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T05:00:05.050Z'
      },
      {
        transitionId: 't_enter_capture_unavailable',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_error_capture_unavailable',
        at: '2026-10-28T05:00:05.060Z'
      },
      {
        transitionId: 't_recover_capture_unavailable',
        fromPlaceId: 'p_error_capture_unavailable',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T05:00:05.070Z'
      },
      {
        transitionId: 't_enter_target_unapproved',
        fromPlaceId: 'p_page_responsive_lab',
        toPlaceId: 'p_error_target_unapproved',
        at: '2026-10-28T05:00:05.080Z'
      },
      {
        transitionId: 't_recover_target_unapproved',
        fromPlaceId: 'p_error_target_unapproved',
        toPlaceId: 'p_page_responsive_lab',
        at: '2026-10-28T05:00:05.090Z'
      }
    ]
  };

  const replay = await replayNetTrace(workbenchNet, policyRecoveryTrace);
  assert.equal(replay.ok, true);
  assert.equal(replay.finalPlaceId, 'p_page_responsive_lab');
  assert.equal(replay.finalMarking.p_page_responsive_lab, 1);
  assert.equal(replay.finalMarking.p_error_target_blocked, 0);
  assert.equal(replay.finalMarking.p_error_handshake_timeout, 0);
  assert.equal(replay.finalMarking.p_error_capture_unavailable, 0);
  assert.equal(replay.finalMarking.p_error_target_unapproved, 0);
});
