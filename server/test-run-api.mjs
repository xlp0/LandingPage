/**
 * Test Run Persistence REST API (SPRINT-ERB-03 §4)
 * Stores immutable test runs in Canonical Triad SQLite database via clm-kernel blake3 hashing.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { computeHash } from 'clm-kernel';
import {
  TEST_RUN_SCHEMA,
  NAVIGATION_RUN_LINK_SCHEMA,
  INTERRUPTED_CAPTURE_SCHEMA,
  validateTestRun,
  validateNavigationRunLink,
  parseStoredTestRunRecord,
  canonicalJson,
  targetSlug
} from '../js/harness/test-run-schema.js';
import { loadNetEnvelope } from '../scripts/check-net.mjs';
import { createLayer4TargetAdapter } from '../scripts/net-to-netmcard.mjs';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SPA_GRAPH_PATH = path.resolve(SERVER_DIR, '../tests/fixtures/spa-test-target.graph.json');
import {
  validateExternalUrl,
  formatGTime,
  verifyRecord,
  DEFAULT_ALGORITHM
} from './mcard-api.mjs';

/**
 * Creates the test-run Express router mounted on /api/test-runs.
 * @param {{ storage: import('./mcard-api.mjs').CanonicalTriadBackend }} options
 */
export function createTestRunRouter({ storage, targetEnvelopes = null, beforeLinkHandleBind = null }) {
  if (!storage) {
    throw new Error('createTestRunRouter requires a valid storage backend instance');
  }

  const router = express.Router();
  const targetAdapters = new Map();

  function getOrCreateTargetAdapter(netId = 'spa-test-target-net', customEnvelope = null) {
    if (customEnvelope) {
      return createLayer4TargetAdapter(customEnvelope, { storage });
    }
    if (targetAdapters.has(netId)) {
      return targetAdapters.get(netId);
    }
    const configured = targetEnvelopes && targetEnvelopes[netId]
      ? targetEnvelopes[netId]
      : (netId === 'spa-test-target-net' ? loadNetEnvelope(DEFAULT_SPA_GRAPH_PATH) : null);
    if (!configured) {
      const err = new Error(`Unknown target net "${netId}"`);
      err.statusCode = 404;
      err.code = 'UNKNOWN_TARGET_NET';
      throw err;
    }
    const adapter = createLayer4TargetAdapter(configured, { storage });
    targetAdapters.set(netId, adapter);
    return adapter;
  }

  /**
   * POST /api/test-runs
   * Stores a test run idempotently.
   */
  router.post('/', (req, res) => {
    const run = req.body;

    // Schema validation
    if (run?.schema === NAVIGATION_RUN_LINK_SCHEMA) {
      return res.status(400).json({
        error: 'Use POST /api/test-runs/navigation/link to verify and bind graph-to-run links'
      });
    }

    const schemaResult = validateTestRun(run);
    if (!schemaResult.valid) {
      return res.status(400).json({
        error: schemaResult.unsupportedVersion
          ? 'Unsupported test run schema version'
          : 'Test run schema validation failed',
        unsupportedVersion: Boolean(schemaResult.unsupportedVersion),
        errors: schemaResult.errors
      });
    }

    // Boundary URL safety validation
    const urlCheck = validateExternalUrl(run.target.url, { allowLoopback: true });
    if (!urlCheck.ok) {
      return res.status(400).json({
        error: 'Target URL is prohibited or unsafe',
        reason: urlCheck.reason
      });
    }

    const slug = run.target?.slug || targetSlug(run.target?.url || '');
    const canonicalString = canonicalJson(run);

    if (run.schema === 'urn:mcard:schema:replay_result:v1') {
      const now = new Date();
      const gTime = `${formatGTime('blake3', now, 'en-US')}|type=replay_result|target=${slug}|verdict=${run.verdict}`;
      const putResult = storage.put(canonicalString, {
        algorithm: DEFAULT_ALGORITHM,
        gTime
      });
      const deviceId = run.device?.id || 'unknown';
      const orient = run.device?.orientation || 'portrait';
      const handle = `urn:mcard:replay_result:${slug}:${run.sourceRunHash}:${deviceId}:${orient}`;
      storage.bindHandle(handle, putResult.hash);
      const statusCode = putResult.inserted ? 201 : 200;
      return res.status(statusCode).json({
        hash: putResult.hash,
        inserted: putResult.inserted,
        handle,
        gTime: putResult.gTime
      });
    }

    if (run.schema === 'urn:mcard:schema:device_conformance_report:v1') {
      const now = new Date();
      const deviceId = run.device?.id || 'unknown';
      const orient = run.device?.orientation || 'portrait';
      const tier = run.fidelity?.tier ?? 1;
      const gTime = `${formatGTime('blake3', now, 'en-US')}|type=device_conformance_report|target=${slug}|device=${deviceId}|orient=${orient}|tier=${tier}`;
      const putResult = storage.put(canonicalString, {
        algorithm: DEFAULT_ALGORITHM,
        gTime
      });
      const runHandle = `urn:mcard:conformance:${slug}:${deviceId}:${orient}:${Date.now()}`;
      storage.bindHandle(runHandle, putResult.hash);
      const latestHandle = `urn:mcard:conformance_latest:${slug}:${deviceId}:${orient}`;
      const latestBind = storage.bindHandle(latestHandle, putResult.hash);
      const statusCode = putResult.inserted ? 201 : 200;
      return res.status(statusCode).json({
        hash: putResult.hash,
        inserted: putResult.inserted,
        handle: runHandle,
        latestHandle,
        previousHash: latestBind.previousHash || null,
        gTime: putResult.gTime
      });
    }

    if (run.schema === INTERRUPTED_CAPTURE_SCHEMA) {
      const now = new Date();
      const gTime = `${formatGTime('blake3', now, 'en-US')}|type=interrupted_capture|target=${slug}|state=${run.lifecycleState}`;
      const putResult = storage.put(canonicalString, {
        algorithm: DEFAULT_ALGORITHM,
        gTime
      });
      const shortHandle = `interrupted_capture_${putResult.hash.slice(0, 16)}`;
      const sessionHandle = `urn:mcard:interrupted_capture:${slug}:${run.sessionId}`;
      storage.bindHandle(shortHandle, putResult.hash);
      storage.bindHandle(sessionHandle, putResult.hash);
      const statusCode = putResult.inserted ? 201 : 200;
      return res.status(statusCode).json({
        hash: putResult.hash,
        inserted: putResult.inserted,
        handle: shortHandle,
        sessionHandle,
        incomplete: true,
        passing: false,
        certified: false,
        verdict: 'incomplete',
        gTime: putResult.gTime
      });
    }

    if (run.schema === 'urn:mcard:certification:responsive:v1') {
      const now = new Date();
      const gTime = `${formatGTime('blake3', now, 'en-US')}|type=certification|target=${slug}|certified=${run.certified}`;
      const putResult = storage.put(canonicalString, {
        algorithm: DEFAULT_ALGORITHM,
        gTime
      });
      const latestHandle = `urn:mcard:certification_latest:${slug}`;
      const latestBind = storage.bindHandle(latestHandle, putResult.hash);
      const statusCode = putResult.inserted ? 201 : 200;
      return res.status(statusCode).json({
        hash: putResult.hash,
        inserted: putResult.inserted,
        handle: latestHandle,
        previousHash: latestBind.previousHash || null,
        gTime: putResult.gTime
      });
    }

    const startedDate = new Date(run.metrics.startedAt);
    const baseGTime = formatGTime('blake3', startedDate, 'en-US');
    const gTime = `${baseGTime}|type=responsive_test_run|target=${slug}|tier=${run.fidelity.tier}`;

    // Insert into storage
    const putResult = storage.put(canonicalString, {
      algorithm: DEFAULT_ALGORITHM,
      gTime
    });

    const hash = putResult.hash;

    // Bind handles
    const sessionHandle = `urn:mcard:test_run:${slug}:${run.sessionId}`;
    storage.bindHandle(sessionHandle, hash);

    const latestHandle = `urn:mcard:test_run_latest:${slug}:${run.device.id}:${run.orientation}`;
    const latestBind = storage.bindHandle(latestHandle, hash);

    const statusCode = putResult.inserted ? 201 : 200;
    return res.status(statusCode).json({
      hash,
      inserted: putResult.inserted,
      handle: sessionHandle,
      latestHandle,
      previousHash: latestBind.previousHash || null,
      gTime: putResult.gTime
    });
  });

  /**
   * GET /api/test-runs/conformance/diff?target=<url>&device=<id>&orientation=<o>
   * Compares current and previous report under the latest handle.
   */
  router.get('/conformance/diff', (req, res) => {
    const { target, device, orientation } = req.query;
    if (!target || !device || !orientation) {
      return res.status(400).json({
        error: 'Query parameters target, device, and orientation are all required'
      });
    }

    const slug = targetSlug(target);
    const latestHandle = `urn:mcard:conformance_latest:${slug}:${device}:${orientation}`;
    const currentHash = storage.resolveHandle(latestHandle);

    if (!currentHash) {
      return res.status(404).json({ error: `No conformance report found for ${latestHandle}` });
    }

    const currentCard = storage.get(currentHash);
    const currentReport = currentCard ? JSON.parse(currentCard.content) : null;

    const history = storage.handleHistory(latestHandle);
    let previousHash = null;
    let previousReport = null;

    if (history && history.length > 0) {
      previousHash = history[history.length - 1].previousHash;
      if (previousHash) {
        const previousCard = storage.get(previousHash);
        if (previousCard) {
          try {
            previousReport = JSON.parse(previousCard.content);
          } catch {}
        }
      }
    }

    const transitions = [];
    if (currentReport && currentReport.results) {
      const prevResultsMap = new Map();
      if (previousReport && previousReport.results) {
        for (const r of previousReport.results) {
          prevResultsMap.set(r.id, r.status);
        }
      }

      for (const cur of currentReport.results) {
        const prevStatus = prevResultsMap.get(cur.id) || 'none';
        transitions.push({
          id: cur.id,
          from: prevStatus,
          to: cur.status,
          transition: `${prevStatus} → ${cur.status}`,
          changed: prevStatus !== cur.status
        });
      }
    }

    return res.json({
      target,
      slug,
      device,
      orientation,
      currentHash,
      previousHash,
      transitions
    });
  });

  /**
   * GET /api/test-runs/conformance/latest?target=<url>
   * Returns latest conformance summary for target devices.
   */
  router.get('/conformance/latest', (req, res) => {
    const { target } = req.query;
    if (!target) {
      return res.status(400).json({ error: 'Query parameter target is required' });
    }

    const slug = targetSlug(target);
    const prefix = `urn:mcard:conformance_latest:${slug}:`;
    const handles = storage.listHandles(prefix);

    const reports = [];
    for (const item of handles) {
      const card = storage.get(item.currentHash);
      if (!card) continue;
      try {
        const report = JSON.parse(card.content);
        reports.push({
          handle: item.handle,
          hash: item.currentHash,
          device: report.device,
          fidelity: report.fidelity,
          summary: report.summary,
          updatedAt: item.updatedAt,
          results: report.results
        });
      } catch {}
    }

    return res.json({
      target,
      slug,
      count: reports.length,
      reports
    });
  });

  /**
   * GET /api/test-runs/latest/history?target=<url>&device=<id>&orientation=<o>
   * Returns revision chain for a target/device/orientation triple.
   */
  router.get('/latest/history', (req, res) => {
    const { target, device, orientation } = req.query;
    if (!target || !device || !orientation) {
      return res.status(400).json({
        error: 'Query parameters target, device, and orientation are all required'
      });
    }

    const slug = targetSlug(target);
    const latestHandle = `urn:mcard:test_run_latest:${slug}:${device}:${orientation}`;
    const currentHash = storage.resolveHandle(latestHandle);
    const history = storage.handleHistory(latestHandle);

    if (!currentHash && (!history || history.length === 0)) {
      return res.status(404).json({
        error: `No test run history found for handle: ${latestHandle}`
      });
    }

    return res.json({
      handle: latestHandle,
      currentHash,
      history
    });
  });

  /**
   * GET /api/test-runs?target=<url>[&device=<id>][&orientation=<o>]
   * Lists runs for a target, filtered and newest first.
   */
  router.get('/', (req, res) => {
    const { target, device, orientation } = req.query;
    if (!target) {
      return res.status(400).json({ error: 'Query parameter target is required' });
    }

    const slug = targetSlug(target);
    const prefix = `urn:mcard:test_run:${slug}:`;
    const handles = storage.listHandles(prefix);

    const results = [];
    for (const item of handles) {
      const card = storage.get(item.currentHash);
      if (!card) continue;

      let run = null;
      try {
        run = JSON.parse(card.content);
      } catch {}

      if (device && run?.device?.id !== device) continue;
      if (orientation && run?.orientation !== orientation) continue;

      results.push({
        handle: item.handle,
        hash: item.currentHash,
        gTime: card.gTime,
        updatedAt: item.updatedAt
      });
    }

    return res.json({
      target,
      slug,
      runs: results,
      count: results.length
    });
  });

  router.post('/navigation/session', (req, res) => {
    try {
      const {
        netId = 'spa-test-target-net',
        sessionId,
        entryPlaceId,
        targetEnvelope = null
      } = req.body || {};
      const resolvedSessionId = sessionId || `l4_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const adapter = getOrCreateTargetAdapter(netId, targetEnvelope);
      const summary = adapter.startSession({
        sessionId: resolvedSessionId,
        ...(entryPlaceId ? { entryPlaceId } : {})
      });
      return res.status(200).json({ ok: true, ...summary });
    } catch (err) {
      const statusCode = err?.statusCode || (err instanceof TypeError ? 400 : 500);
      return res.status(statusCode).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        code: err?.code || 'NAVIGATION_SESSION_ERROR'
      });
    }
  });

  router.post('/navigation/fire', async (req, res) => {
    try {
      const {
        netId = 'spa-test-target-net',
        sessionId,
        transitionId = null,
        actionName = null,
        mode = 'auto',
        requestId = null
      } = req.body || {};
      const adapter = getOrCreateTargetAdapter(netId);
      const result = await adapter.fireTransition({
        sessionId,
        transitionId,
        actionName,
        mode,
        requestId
      });
      return res.status(200).json(result);
    } catch (err) {
      const statusCode = err?.statusCode || (err instanceof TypeError ? 400 : 500);
      return res.status(statusCode).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        code: err?.code || 'NAVIGATION_FIRE_ERROR',
        requiresRecovery: Boolean(err?.requiresRecovery)
      });
    }
  });

  router.post('/navigation/link', async (req, res) => {
    try {
      const {
        runHash,
        netId = 'spa-test-target-net',
        sessionId,
        targetNetMCardHash: explicitNetHash = null,
        bindingsMCardHash: explicitBindingsHash = null,
        initialMarkingHash: explicitMarkingHash = null,
        receiptHashes: explicitReceipts = null,
        finalPlaceId: explicitFinalPlace = null,
        sessionStatus: explicitStatus = null
      } = req.body || {};

      const normalizedRunHash = String(runHash || '').toLowerCase();
      const runCard = storage.get(normalizedRunHash);
      if (!runCard || !runCard.verified) {
        return res.status(409).json({
          ok: false,
          error: 'Cannot link navigation graph: completed test run MCard is missing or unverified'
        });
      }

      let parsedRun = null;
      try {
        parsedRun = JSON.parse(runCard.content);
      } catch {}
      if (!parsedRun || parsedRun.schema !== TEST_RUN_SCHEMA) {
        return res.status(400).json({
          ok: false,
          error: `Only finalized ${TEST_RUN_SCHEMA} runs may bind a navigation-run-link handle`
        });
      }

      const adapter = getOrCreateTargetAdapter(netId);
      const sessionSummary = sessionId ? adapter.getSessionSummary(sessionId) : null;

      const resolvedNetHash = explicitNetHash || sessionSummary?.netMCardHash || adapter.netMCardHash;
      const resolvedBindingsHash = explicitBindingsHash || sessionSummary?.bindingsMCardHash || adapter.bindingsMCardHash;
      const resolvedMarkingHash = explicitMarkingHash || sessionSummary?.initialMarkingHash || '';
      const resolvedReceipts = Array.isArray(explicitReceipts)
        ? explicitReceipts
        : (sessionSummary?.receiptHashes || []);
      const resolvedFinalPlace = explicitFinalPlace || sessionSummary?.currentViewPlaceId || adapter.entryPlaceId;
      const resolvedStatus = explicitStatus || sessionSummary?.sessionStatus || 'ACTIVE';
      const resolvedSessionId = String(sessionId || sessionSummary?.sessionId || parsedRun.sessionId || '');

      const linkPayload = {
        schema: NAVIGATION_RUN_LINK_SCHEMA,
        runHash: normalizedRunHash,
        sessionId: resolvedSessionId,
        targetNetId: adapter.netId,
        targetNetMCardHash: resolvedNetHash,
        bindingsMCardHash: resolvedBindingsHash,
        initialMarkingHash: resolvedMarkingHash,
        receiptHashes: resolvedReceipts,
        finalPlaceId: resolvedFinalPlace,
        sessionStatus: resolvedStatus
      };

      const linkValid = validateNavigationRunLink(linkPayload);
      if (!linkValid.valid) {
        return res.status(400).json({
          ok: false,
          error: 'Navigation run link validation failed',
          errors: linkValid.errors
        });
      }

      const netCard = storage.get(resolvedNetHash);
      const bindCard = storage.get(resolvedBindingsHash);
      const markCard = storage.get(resolvedMarkingHash);
      if (!netCard?.verified || !bindCard?.verified || !markCard?.verified) {
        return res.status(409).json({
          ok: false,
          error: 'Cannot publish navigation-run-link: target NetMCard, bindings MCard, or initial marking MCard failed verification'
        });
      }
      const parsedNet = JSON.parse(netCard.content);
      if (parsedNet.kind !== 'net_mcard') {
        return res.status(409).json({
          ok: false,
          error: 'Target net hash does not reference a canonical net_mcard'
        });
      }

      for (const rHash of resolvedReceipts) {
        const rCard = storage.get(rHash);
        if (!rCard?.verified) {
          return res.status(409).json({
            ok: false,
            error: `Cannot publish navigation-run-link: FiringReceiptMCard ${rHash} missing or unverified`
          });
        }
        const parsedReceipt = JSON.parse(rCard.content);
        if (parsedReceipt.kind !== 'firing_receipt_mcard') {
          return res.status(409).json({
            ok: false,
            error: `Referenced receipt ${rHash} is not a canonical firing_receipt_mcard`
          });
        }
      }

      if (typeof beforeLinkHandleBind === 'function') {
        await beforeLinkHandleBind({ runHash: normalizedRunHash, linkPayload });
      }

      const linkCanonical = canonicalJson(linkPayload);
      const linkGTime = `${formatGTime('blake3', new Date('2026-04-16T00:00:00.000Z'), 'en-US')}|type=navigation_run_link|net=${adapter.netId}`;
      const linkPut = storage.put(linkCanonical, {
        algorithm: DEFAULT_ALGORITHM,
        gTime: linkGTime
      });
      const linkHandle = `nav_run_link_${normalizedRunHash}`;
      storage.bindHandle(linkHandle, linkPut.hash);

      return res.status(linkPut.inserted ? 201 : 200).json({
        ok: true,
        inserted: linkPut.inserted,
        linkHandle,
        linkHash: linkPut.hash,
        link: linkPayload
      });
    } catch (err) {
      const statusCode = err?.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        code: err?.code || 'NAVIGATION_LINK_ERROR'
      });
    }
  });

  router.get('/navigation/link', (req, res) => {
    const normalizedRunHash = String(req.query.runHash || '').toLowerCase();
    if (!normalizedRunHash) {
      return res.status(400).json({ ok: false, error: 'Query parameter runHash is required' });
    }
    const linkHandle = `nav_run_link_${normalizedRunHash}`;
    const linkHash = storage.resolveHandle(linkHandle);
    if (!linkHash) {
      return res.status(404).json({ ok: false, error: `No navigation-run-link found for ${linkHandle}` });
    }
    const linkCard = storage.get(linkHash);
    if (!linkCard) {
      return res.status(404).json({ ok: false, error: 'Navigation link card missing' });
    }
    const link = JSON.parse(linkCard.content);
    const runCard = storage.get(link.runHash);
    const netCard = storage.get(link.targetNetMCardHash);
    const bindCard = storage.get(link.bindingsMCardHash);
    const markCard = storage.get(link.initialMarkingHash);
    const receipts = (link.receiptHashes || []).map((rh) => {
      const rc = storage.get(rh);
      return rc
        ? { hash: rc.hash, verified: rc.verified, receipt: JSON.parse(rc.content) }
        : { hash: rh, verified: false, receipt: null };
    });

    const verified = Boolean(
      linkCard.verified &&
      runCard?.verified &&
      netCard?.verified &&
      bindCard?.verified &&
      markCard?.verified &&
      receipts.every((r) => r.verified)
    );

    return res.json({
      ok: true,
      verified,
      linkHandle,
      linkHash: linkCard.hash,
      link,
      receipts
    });
  });

  /**
   * GET /api/test-runs/:hash
   * Fetches single run with content verification.
   */
  router.get('/:hash', (req, res) => {
    const hash = String(req.params.hash || '').toLowerCase();
    const card = storage.get(hash);
    if (!card) {
      return res.status(404).json({ error: 'Test run not found' });
    }

    let parsed = null;
    try {
      parsed = JSON.parse(card.content);
    } catch {
      parsed = card.content;
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.schema === 'string') {
      const check = parseStoredTestRunRecord(parsed);
      if (check.unsupportedVersion) {
        return res.status(422).json({
          error: check.errors[0],
          schema: parsed.schema,
          unsupportedVersion: true,
          downgradedToV1: false,
          verified: card.verified
        });
      }
      if (parsed.schema === INTERRUPTED_CAPTURE_SCHEMA) {
        return res.json({
          hash: card.hash,
          gTime: card.gTime,
          algorithm: card.algorithm,
          verified: card.verified,
          incomplete: true,
          passing: false,
          certified: false,
          verdict: 'incomplete',
          run: parsed
        });
      }
    }

    return res.json({
      hash: card.hash,
      gTime: card.gTime,
      algorithm: card.algorithm,
      verified: card.verified,
      run: parsed
    });
  });

  return router;
}
