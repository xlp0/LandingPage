/**
 * Test Run Persistence REST API (SPRINT-ERB-03 §4)
 * Stores immutable test runs in Canonical Triad SQLite database via clm-kernel blake3 hashing.
 */

import express from 'express';
import { computeHash } from 'clm-kernel';
import {
  validateTestRun,
  canonicalJson,
  targetSlug
} from '../js/harness/test-run-schema.js';
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
export function createTestRunRouter({ storage }) {
  if (!storage) {
    throw new Error('createTestRunRouter requires a valid storage backend instance');
  }

  const router = express.Router();

  /**
   * POST /api/test-runs
   * Stores a test run idempotently.
   */
  router.post('/', (req, res) => {
    const run = req.body;

    // Schema validation
    const schemaResult = validateTestRun(run);
    if (!schemaResult.valid) {
      return res.status(400).json({
        error: 'Test run schema validation failed',
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
