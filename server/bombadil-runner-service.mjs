import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TARGETS,
  envExtraArgs,
  resolveBombadilBin,
  stripServerContractImport
} from '../scripts/bombadil/run.mjs';
import {
  findTraceFilesDeep,
  readFirings,
  toNetTraces
} from '../scripts/bombadil/trace-to-net.mjs';
import {
  DEFAULT_NET_FILES,
  computeTransitionCoverage,
  loadNetEnvelope,
  replayBombadilTraces
} from '../scripts/check-net.mjs';
import { resolvePlaywrightServerContract } from '../tests/fixtures/server-contract.js';
import {
  BOMBADIL_COVERAGE_SCHEMA,
  BOMBADIL_RUN_SCHEMA,
  BOMBADIL_TARGETS,
  BOMBADIL_TIME_LIMIT_RE,
  BOMBADIL_TRIGGER_SCHEMA,
  canonicalJson
} from '../js/harness/test-run-schema.js';
import { DEFAULT_ALGORITHM, formatGTime } from './mcard-api.mjs';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(SERVER_DIR, '..');
const DEFAULT_TIME_LIMIT = '30s';
const STOP_GRACE_MS = 5_000;
const TRACE_POLL_MS = 350;
const HEALTH_TIMEOUT_MS = 30_000;
const HEALTH_POLL_MS = 250;

function makeError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

export function getFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, host, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close((closeErr) => {
        if (closeErr) reject(closeErr);
        else resolve(port);
      });
    });
  });
}

export function buildTriggerHandleCatalog() {
  return BOMBADIL_TARGETS.map((target) => {
    const spec = TARGETS[target];
    return {
      handle: `urn:mcard:bombadil:trigger:${target}`,
      target,
      spec: spec.spec,
      path: spec.path,
      singlePageFramed: target === 'spa' || target === 'spa-canary'
    };
  });
}

function buildScrubbedChildEnv(baseEnv, overrides = {}) {
  const clean = { ...baseEnv };
  delete clean.MCARD_DB_PATH;
  delete clean.PORT;
  delete clean.PW_REUSE_SERVER;
  delete clean.PW_EPHEMERAL_MCARD_DB;
  delete clean.PW_SERVER_BOOT_GUARD;
  delete clean.BOMBADIL_CHILD_RUN;
  const cleanedNodeOpts = stripServerContractImport(clean.NODE_OPTIONS);
  if (cleanedNodeOpts) clean.NODE_OPTIONS = cleanedNodeOpts;
  else delete clean.NODE_OPTIONS;
  return { ...clean, ...overrides };
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function listCandidateTraceFiles(outputDir) {
  if (!outputDir || !fs.existsSync(outputDir)) return [];
  const rootTrace = path.join(outputDir, 'trace.jsonl');
  if (fs.existsSync(rootTrace)) return [rootTrace];
  try {
    return fs
      .readdirSync(outputDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('entry-'))
      .map((entry) => path.join(outputDir, entry.name, 'trace.jsonl'))
      .filter((p) => fs.existsSync(p))
      .sort();
  } catch {
    return [];
  }
}

function scanOutputTraces(outputDir) {
  const files = listCandidateTraceFiles(outputDir);
  let actionsCount = 0;
  let quiescenceWarnings = 0;
  const allFirings = [];
  const violations = [];
  const seenViolations = new Set();

  for (const file of files) {
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const validLines = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (!row || typeof row !== 'object') continue;
        validLines.push(line);
        if (typeof row.timestamp === 'number' && Array.isArray(row.snapshots)) {
          actionsCount += 1;
        }
        if (Array.isArray(row.violations)) {
          for (const v of row.violations) {
            const key = `${v?.name || 'violation'}:${v?.time ?? ''}:${row.timestamp ?? ''}`;
            if (!seenViolations.has(key)) {
              seenViolations.add(key);
              violations.push({
                name: String(v?.name || 'violation'),
                time: v?.time ?? row.timestamp ?? null,
                url: row?.state?.url || null
              });
            }
          }
        }
      } catch {
        // Ignore truncated trailing line while Bombadil is writing.
      }
    }
    if (validLines.length > 0) {
      try {
        allFirings.push(...readFirings(validLines.join('\n'), { source: file }));
      } catch {
        // Partial trace before netReport arrives.
      }
    }
  }

  const distinctTransitions = new Set(
    allFirings.map((f) => f.transitionId).filter(Boolean)
  ).size;
  const lastFiring = allFirings.length > 0 ? allFirings[allFirings.length - 1] : null;
  return {
    actionsCount,
    firingsCount: allFirings.length,
    distinctTransitions,
    currentPlaceId: lastFiring?.toPlaceId || null,
    quiescenceWarnings,
    violations
  };
}

function watchExit(child) {
  return new Promise((resolve) => {
    if (!child) {
      resolve({ code: 1, signal: null, error: new Error('Missing child process') });
      return;
    }
    child.once('exit', (code, signal) => resolve({ code, signal, error: null }));
    child.once('error', (error) => resolve({ code: null, signal: null, error }));
  });
}

async function stopChild(child, exited) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.kill('SIGTERM');
  } catch {
    return;
  }
  const timer = setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {}
  }, STOP_GRACE_MS);
  if (typeof timer.unref === 'function') timer.unref();
  await exited;
  clearTimeout(timer);
}

async function waitForHealth(url, { fetchImpl, timeoutMs = HEALTH_TIMEOUT_MS, shouldStop = () => false } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !shouldStop()) {
    try {
      const res = await fetchImpl(url);
      if (res?.ok) return;
    } catch {
      // Server still booting.
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
  if (shouldStop()) return;
  throw new Error(`Shrink server did not answer ${url} within ${timeoutMs} ms`);
}

export function createBombadilRunnerService({
  storage,
  env = process.env,
  repoRoot = DEFAULT_REPO_ROOT,
  tmpRoot = os.tmpdir(),
  spawnImpl = spawn,
  fetchImpl = fetch,
  getFreePortImpl = getFreePort,
  registerSignals = true
} = {}) {
  if (!storage) {
    throw new Error('createBombadilRunnerService requires a storage backend instance');
  }

  let activeJob = null;
  let activeShrinkJob = null;
  const subscribers = new Set();

  const isChildRun = () => env.BOMBADIL_CHILD_RUN === '1';
  const isRunnerDisabled = () => env.BOMBADIL_ENABLE_RUNNER === '0';
  const triggerEnabled = () => !isChildRun() && !isRunnerDisabled();

  function broadcast(eventName, data) {
    const payload = { event: eventName, data };
    for (const listener of [...subscribers]) {
      try {
        listener(payload);
      } catch {}
    }
  }

  function persistCard(payload, gTimeSuffix) {
    const now = new Date();
    const gTime = `${formatGTime(DEFAULT_ALGORITHM, now, 'en-US')}|${gTimeSuffix}`;
    return storage.put(canonicalJson(payload), {
      algorithm: DEFAULT_ALGORITHM,
      gTime
    });
  }

  function persistRunRecord(runRecord, { bindLatest = false } = {}) {
    const putRes = persistCard(
      runRecord,
      `type=bombadil_run|target=${runRecord.target}|status=${runRecord.status}`
    );
    const runHandle = `urn:mcard:bombadil:run:${runRecord.runId}`;
    storage.bindHandle(runHandle, putRes.hash);
    let latestHandle = null;
    if (bindLatest) {
      latestHandle = `urn:mcard:bombadil:latest:${runRecord.target}`;
      storage.bindHandle(latestHandle, putRes.hash);
    }
    return { hash: putRes.hash, runHandle, latestHandle };
  }

  async function persistCoverageRollup(outputDir) {
    let files = [];
    try {
      files = findTraceFilesDeep(outputDir, { excludeCanary: true });
    } catch {
      return null;
    }
    if (files.length === 0) return null;

    const guiCoveragePath = path.join(repoRoot, 'tests/gui-coverage.json');
    const guiCoverage = fs.existsSync(guiCoveragePath)
      ? JSON.parse(fs.readFileSync(guiCoveragePath, 'utf8'))
      : null;

    const envelopes = DEFAULT_NET_FILES.map((relPath) =>
      loadNetEnvelope(path.join(repoRoot, relPath))
    );
    const resolveNetId = (firing) =>
      firing.netId ??
      envelopes.find((envelope) => envelope.bindings?.transitions?.[firing.transitionId])?.netId ??
      null;

    const traces = files.flatMap((file) => {
      try {
        return toNetTraces(readFirings(fs.readFileSync(file, 'utf8'), { source: file }), {
          resolveNetId,
          source: file
        });
      } catch {
        return [];
      }
    });

    const nets = {};
    const rejectedTraces = [];
    for (const [index, envelope] of envelopes.entries()) {
      const own = traces.filter((trace) => trace.netId === envelope.netId);
      const { replayed, failures } = await replayBombadilTraces(envelope, own);
      const cov = computeTransitionCoverage(envelope, { guiCoverage, replayedTraces: replayed });
      nets[envelope.netId] = {
        filePath: DEFAULT_NET_FILES[index],
        declared: cov.declared,
        fired: cov.fired,
        asserted: cov.asserted,
        exploredOnly: cov.exploredOnly,
        neverFired: cov.neverFired,
        coverageRatio: cov.coverageRatio,
        assertedTransitionIds: cov.assertedTransitionIds,
        exploredOnlyTransitionIds: cov.exploredOnlyTransitionIds,
        neverFiredTransitionIds: cov.neverFiredTransitionIds
      };
      for (const failure of failures) {
        rejectedTraces.push({ ...failure, netId: envelope.netId });
      }
    }

    const checkedIds = new Set(envelopes.map((e) => e.netId).filter(Boolean));
    for (const trace of traces) {
      if (!checkedIds.has(trace.netId)) {
        rejectedTraces.push({
          netId: trace.netId || 'unresolved',
          traceId: trace.traceId,
          reason: 'unresolved-trace-net',
          message: `Trace "${trace.traceId}" could not be attributed to any checked net`
        });
      }
    }

    const coverageRecord = {
      schema: BOMBADIL_COVERAGE_SCHEMA,
      generatedAt: new Date().toISOString(),
      sourceDir: outputDir,
      nets,
      rejectedTraces
    };
    const putRes = persistCard(coverageRecord, 'type=bombadil_coverage');
    const coverageHandle = 'urn:mcard:bombadil:coverage:latest';
    storage.bindHandle(coverageHandle, putRes.hash);
    return { hash: putRes.hash, handle: coverageHandle, coverage: coverageRecord };
  }

  function resolveStoredRun(handle) {
    const hash = storage.resolveHandle(handle);
    if (!hash) return null;
    const card = storage.get(hash);
    if (!card) return null;
    try {
      return { hash, handle, run: JSON.parse(card.content) };
    } catch {
      return null;
    }
  }

  function getHandles() {
    const catalog = buildTriggerHandleCatalog().map((entry) => {
      const latestHandle = `urn:mcard:bombadil:latest:${entry.target}`;
      const latest = resolveStoredRun(latestHandle);
      return {
        ...entry,
        latestHash: latest?.hash || null,
        latestRun: latest?.run || null
      };
    });
    return {
      handles: catalog,
      targets: [...BOMBADIL_TARGETS],
      defaults: {
        timeLimit: DEFAULT_TIME_LIMIT,
        minFirings: 1
      },
      activeJob: activeJob
        ? {
            runId: activeJob.runId,
            target: activeJob.target,
            status: activeJob.status,
            actionsCount: activeJob.runRecord.actionsCount,
            firingsCount: activeJob.runRecord.firingsCount,
            distinctTransitions: activeJob.runRecord.distinctTransitions,
            currentPlaceId: activeJob.currentPlaceId,
            violations: activeJob.runRecord.violations
          }
        : null,
      childRun: isChildRun(),
      triggerEnabled: triggerEnabled()
    };
  }

  function listRuns() {
    const handles = storage.listHandles('urn:mcard:bombadil:run:');
    const runs = [];
    for (const h of handles) {
      const card = storage.get(h.currentHash);
      if (!card) continue;
      try {
        const parsed = JSON.parse(card.content);
        runs.push({
          ...parsed,
          hash: h.currentHash,
          runHandle: h.handle
        });
      } catch {}
    }
    runs.sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')));
    return runs;
  }

  function getRun(runId) {
    if (typeof runId !== 'string' || !runId.trim()) return null;
    return resolveStoredRun(`urn:mcard:bombadil:run:${runId.trim()}`);
  }

  function getCoverage() {
    const handle = 'urn:mcard:bombadil:coverage:latest';
    const hash = storage.resolveHandle(handle);
    if (!hash) {
      return { empty: true, nets: {}, rejectedTraces: [] };
    }
    const card = storage.get(hash);
    if (!card) {
      return { empty: true, nets: {}, rejectedTraces: [] };
    }
    try {
      return {
        empty: false,
        hash,
        handle,
        ...JSON.parse(card.content)
      };
    } catch {
      return { empty: true, nets: {}, rejectedTraces: [] };
    }
  }

  function assertAllowedTrigger(body) {
    const rawHandle = typeof body?.handle === 'string' ? body.handle.trim() : '';
    let target = typeof body?.target === 'string' ? body.target.trim() : '';
    if (!target && rawHandle.startsWith('urn:mcard:bombadil:trigger:')) {
      target = rawHandle.slice('urn:mcard:bombadil:trigger:'.length);
    }
    if (!BOMBADIL_TARGETS.includes(target)) {
      throw makeError(
        `Unknown or invalid Bombadil target "${target}". Allowed targets: ${BOMBADIL_TARGETS.join(', ')}`,
        400,
        'INVALID_BOMBADIL_TARGET'
      );
    }
    const handle = `urn:mcard:bombadil:trigger:${target}`;
    if (rawHandle && rawHandle !== handle) {
      throw makeError(
        `Handle "${rawHandle}" does not match target "${target}"`,
        400,
        'MISMATCHED_BOMBADIL_HANDLE'
      );
    }

    const timeLimit = body?.timeLimit === undefined ? DEFAULT_TIME_LIMIT : String(body.timeLimit).trim();
    if (!BOMBADIL_TIME_LIMIT_RE.test(timeLimit)) {
      throw makeError(
        `Invalid timeLimit "${timeLimit}". Expected 10s..900s or 1m..15m.`,
        400,
        'INVALID_TIME_LIMIT'
      );
    }

    const minFirings = body?.minFirings === undefined ? 1 : Number(body.minFirings);
    if (!Number.isInteger(minFirings) || minFirings < 0) {
      throw makeError('minFirings must be a non-negative integer', 400, 'INVALID_MIN_FIRINGS');
    }

    const requestedBy =
      typeof body?.requestedBy === 'string' && body.requestedBy.trim()
        ? body.requestedBy.trim()
        : 'workbench';

    if (!triggerEnabled()) {
      throw makeError(
        isChildRun()
          ? 'Bombadil triggers are disabled inside child Bombadil runs'
          : 'Bombadil runner is disabled (BOMBADIL_ENABLE_RUNNER=0)',
        403,
        'BOMBADIL_RUNNER_DISABLED'
      );
    }
    if (activeJob || activeShrinkJob) {
      throw makeError(
        'Another Bombadil job is currently running',
        409,
        'BOMBADIL_JOB_CONFLICT'
      );
    }

    return { handle, target, timeLimit, minFirings, requestedBy };
  }

  async function triggerRun(body = {}) {
    const params = assertAllowedTrigger(body);
    const { handle, target, timeLimit, minFirings, requestedBy } = params;

    const triggerPayload = {
      schema: BOMBADIL_TRIGGER_SCHEMA,
      triggerId: createId('trig'),
      handle,
      target,
      timeLimit,
      minFirings,
      requestedBy,
      requestedAt: new Date().toISOString()
    };
    const triggerPut = persistCard(triggerPayload, `type=bombadil_trigger|target=${target}`);
    storage.bindHandle(handle, triggerPut.hash);

    const runId = createId('run');
    const outputDir = path.join(tmpRoot, 'landingpage-bombadil-runs', `${target}-${runId}`);
    fs.mkdirSync(path.dirname(outputDir), { recursive: true });

    const port = await getFreePortImpl();
    const runnerScript = path.join(repoRoot, 'scripts/bombadil/run.mjs');
    const reproduceCommand = `node scripts/bombadil/run.mjs ${target} --time-limit ${timeLimit}`;
    const shrinkCommand =
      TARGETS[target].path === null
        ? null
        : `npx bombadil browser shrink --headless --time-limit ${timeLimit}`;

    const startedAtMs = Date.now();
    const runRecord = {
      schema: BOMBADIL_RUN_SCHEMA,
      runId,
      triggerHash: triggerPut.hash,
      target,
      status: 'running',
      exitCode: null,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: null,
      durationMs: null,
      actionsCount: 0,
      firingsCount: 0,
      distinctTransitions: 0,
      quiescenceWarnings: 0,
      violations: [],
      outputDir,
      shrunkTracePath: null,
      reproduceCommand,
      shrinkCommand
    };

    const initialPersist = persistRunRecord(runRecord, { bindLatest: false });

    const childEnv = buildScrubbedChildEnv(env, {
      BOMBADIL_PORT: String(port)
    });

    const job = {
      runId,
      target,
      status: 'running',
      currentPlaceId: null,
      stopRequested: false,
      child: null,
      exitPromise: null,
      runRecord,
      pollTimer: null,
      donePromise: null
    };
    activeJob = job;

    const child = spawnImpl(
      process.execPath,
      [runnerScript, target, '--time-limit', timeLimit, '--output-path', outputDir],
      {
        cwd: repoRoot,
        env: childEnv,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    job.child = child;
    job.exitPromise = watchExit(child);

    const emitProgress = () => {
      const stats = scanOutputTraces(outputDir);
      runRecord.actionsCount = Math.max(runRecord.actionsCount, stats.actionsCount);
      runRecord.firingsCount = Math.max(runRecord.firingsCount, stats.firingsCount);
      runRecord.distinctTransitions = Math.max(runRecord.distinctTransitions, stats.distinctTransitions);
      if (stats.currentPlaceId) job.currentPlaceId = stats.currentPlaceId;

      if (stats.violations.length > runRecord.violations.length) {
        const newlySeen = stats.violations.slice(runRecord.violations.length);
        runRecord.violations = stats.violations;
        for (const v of newlySeen) {
          broadcast('violation', {
            runId,
            target,
            status: job.status,
            violation: v,
            violations: runRecord.violations,
            currentPlaceId: job.currentPlaceId
          });
        }
      }

      broadcast('progress', {
        runId,
        target,
        status: job.status,
        actionsCount: runRecord.actionsCount,
        firingsCount: runRecord.firingsCount,
        distinctTransitions: runRecord.distinctTransitions,
        quiescenceWarnings: runRecord.quiescenceWarnings,
        currentPlaceId: job.currentPlaceId,
        violations: runRecord.violations
      });
    };

    const handleLogChunk = (chunk) => {
      const text = String(chunk || '');
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/quiesc/i.test(trimmed)) {
          runRecord.quiescenceWarnings += 1;
        }
      }
    };

    child.stdout?.on('data', handleLogChunk);
    child.stderr?.on('data', handleLogChunk);

    job.pollTimer = setInterval(emitProgress, TRACE_POLL_MS);
    if (typeof job.pollTimer.unref === 'function') job.pollTimer.unref();

    broadcast('progress', {
      runId,
      target,
      status: 'running',
      actionsCount: 0,
      firingsCount: 0,
      distinctTransitions: 0,
      quiescenceWarnings: 0,
      currentPlaceId: null,
      violations: []
    });

    job.donePromise = (async () => {
      let exitInfo = { code: null, signal: null, error: null };
      try {
        exitInfo = await job.exitPromise;
      } finally {
        clearInterval(job.pollTimer);
        job.pollTimer = null;
      }

      const finalStats = scanOutputTraces(outputDir);
      runRecord.actionsCount = Math.max(runRecord.actionsCount, finalStats.actionsCount);
      runRecord.firingsCount = Math.max(runRecord.firingsCount, finalStats.firingsCount);
      runRecord.distinctTransitions = Math.max(runRecord.distinctTransitions, finalStats.distinctTransitions);
      if (finalStats.violations.length > runRecord.violations.length) {
        runRecord.violations = finalStats.violations;
      }
      if (finalStats.currentPlaceId) {
        job.currentPlaceId = finalStats.currentPlaceId;
      }

      const finishedAtMs = Date.now();
      runRecord.finishedAt = new Date(finishedAtMs).toISOString();
      runRecord.durationMs = Math.max(0, finishedAtMs - startedAtMs);
      runRecord.exitCode = Number.isInteger(exitInfo.code) ? exitInfo.code : null;

      let finalStatus = 'error';
      if (job.stopRequested) {
        finalStatus = 'stopped';
      } else if (exitInfo.error) {
        finalStatus = 'error';
      } else if (exitInfo.code === 0) {
        finalStatus = 'clean';
      } else if (exitInfo.code === 2 || runRecord.violations.length > 0) {
        finalStatus = 'violated';
      } else {
        finalStatus = 'error';
      }
      runRecord.status = finalStatus;
      job.status = finalStatus;

      const finalPersist = persistRunRecord(runRecord, { bindLatest: true });

      let coverageSummary = null;
      if (target !== 'spa-canary') {
        coverageSummary = await persistCoverageRollup(outputDir);
      }

      const terminalEvent = finalStatus === 'error' ? 'job-error' : 'complete';
      const errorMessage =
        exitInfo.error?.message ||
        (finalStatus === 'error' ? `Bombadil exited with code ${exitInfo.code ?? 'null'}` : null);

      broadcast(terminalEvent, {
        runId,
        target,
        status: finalStatus,
        exitCode: runRecord.exitCode,
        hash: finalPersist.hash,
        runHandle: finalPersist.runHandle,
        latestHandle: finalPersist.latestHandle,
        coverageHash: coverageSummary?.hash || null,
        actionsCount: runRecord.actionsCount,
        firingsCount: runRecord.firingsCount,
        distinctTransitions: runRecord.distinctTransitions,
        quiescenceWarnings: runRecord.quiescenceWarnings,
        currentPlaceId: job.currentPlaceId,
        violations: runRecord.violations,
        error: errorMessage,
        run: runRecord
      });

      if (activeJob === job) {
        activeJob = null;
      }
      return {
        hash: finalPersist.hash,
        run: runRecord
      };
    })();

    return {
      runId,
      target,
      status: 'running',
      triggerHandle: handle,
      triggerHash: triggerPut.hash,
      runHandle: initialPersist.runHandle,
      runHash: initialPersist.hash,
      streamUrl: '/api/test-runs/bombadil/stream'
    };
  }

  async function stopRun(runId = null) {
    if (!activeJob || (activeJob.status !== 'queued' && activeJob.status !== 'running')) {
      throw makeError('No Bombadil run is currently active', 409, 'NO_ACTIVE_JOB');
    }
    if (runId && activeJob.runId !== runId) {
      throw makeError(`Active job does not match runId "${runId}"`, 404, 'RUN_NOT_ACTIVE');
    }
    const job = activeJob;
    job.stopRequested = true;
    await stopChild(job.child, job.exitPromise);
    const finished = await job.donePromise;
    return finished;
  }

  async function shrinkRun({ runId, timeLimit = DEFAULT_TIME_LIMIT } = {}) {
    const cleanId = typeof runId === 'string' ? runId.trim() : '';
    if (!cleanId) {
      throw makeError('runId is required for shrink', 400, 'MISSING_RUN_ID');
    }
    const normalizedTimeLimit =
      timeLimit === undefined ? DEFAULT_TIME_LIMIT : String(timeLimit).trim();
    if (!BOMBADIL_TIME_LIMIT_RE.test(normalizedTimeLimit)) {
      throw makeError(
        `Invalid timeLimit "${normalizedTimeLimit}". Expected 10s..900s or 1m..15m.`,
        400,
        'INVALID_TIME_LIMIT'
      );
    }
    if (!triggerEnabled()) {
      throw makeError(
        isChildRun()
          ? 'Bombadil shrink is disabled inside child Bombadil runs'
          : 'Bombadil runner is disabled (BOMBADIL_ENABLE_RUNNER=0)',
        403,
        'BOMBADIL_RUNNER_DISABLED'
      );
    }
    if (activeJob || activeShrinkJob) {
      throw makeError('Another Bombadil job is currently active', 409, 'BOMBADIL_JOB_CONFLICT');
    }

    const stored = getRun(cleanId);
    if (!stored?.run) {
      throw makeError(`Run "${cleanId}" not found`, 404, 'RUN_NOT_FOUND');
    }
    const existingRun = stored.run;
    const targetSpec = TARGETS[existingRun.target];
    if (!targetSpec || targetSpec.path === null) {
      throw makeError(
        `Shrink requires a single-entry target; "${existingRun.target}" has multiple entries`,
        400,
        'SHRINK_UNSUPPORTED_TARGET'
      );
    }

    const tracePath = path.join(existingRun.outputDir, 'trace.jsonl');
    if (!fs.existsSync(tracePath)) {
      throw makeError(
        `No trace.jsonl found at ${tracePath}`,
        400,
        'MISSING_TRACE_FOR_SHRINK'
      );
    }

    const shrinkOutDir = path.join(
      path.dirname(existingRun.outputDir),
      `${existingRun.target}-${existingRun.runId}-shrunk-${Date.now()}`
    );
    fs.mkdirSync(shrinkOutDir, { recursive: true });

    const port = await getFreePortImpl();
    const baseCleanEnv = buildScrubbedChildEnv(env);
    const contract = resolvePlaywrightServerContract({
      ...baseCleanEnv,
      BASE_URL: '',
      TEST_PORT: String(port)
    });
    const serverEnv = {
      ...baseCleanEnv,
      ...contract.env,
      BOMBADIL_CHILD_RUN: '1'
    };
    const [serverCmd, ...serverArgs] = contract.command.split(/\s+/);
    const bombadilBin = resolveBombadilBin(repoRoot, baseCleanEnv);
    const shrinkArgs = [
      'browser',
      'shrink',
      '--headless',
      '--output-path',
      shrinkOutDir,
      '--time-limit',
      normalizedTimeLimit,
      '--trace',
      tracePath,
      ...(targetSpec.allowUrls || []).flatMap((pattern) => ['--allow-url', pattern]),
      ...envExtraArgs(baseCleanEnv),
      `${contract.baseURL}${targetSpec.path}`,
      ...(targetSpec.spec ? [path.join(repoRoot, targetSpec.spec)] : [])
    ];

    let serverChild = null;
    let serverExit = null;
    let shrinkChild = null;
    let shrinkExit = null;
    activeShrinkJob = { runId: cleanId, stop: null };

    try {
      serverChild = spawnImpl(serverCmd, serverArgs, {
        cwd: repoRoot,
        env: serverEnv,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      serverExit = watchExit(serverChild);

      let starting = true;
      const serverDied = serverExit.then((res) => {
        if (starting) {
          throw new Error(
            res.error?.message || `Shrink server exited unexpectedly (${res.signal ?? res.code})`
          );
        }
      });
      await Promise.race([
        waitForHealth(contract.url, { fetchImpl, shouldStop: () => !starting }),
        serverDied
      ]);
      starting = false;

      shrinkChild = spawnImpl(bombadilBin, shrinkArgs, {
        cwd: repoRoot,
        env: baseCleanEnv,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      shrinkExit = watchExit(shrinkChild);
      activeShrinkJob.stop = () => stopChild(shrinkChild, shrinkExit);

      const shrinkRes = await shrinkExit;
      if (shrinkRes.error) {
        throw makeError(
          `Could not run bombadil shrink: ${shrinkRes.error.message}`,
          500,
          'SHRINK_SPAWN_FAILED'
        );
      }
      if ((shrinkRes.code ?? 1) !== 0 && !fs.existsSync(path.join(shrinkOutDir, 'trace.jsonl'))) {
        throw makeError(
          `bombadil shrink exited with code ${shrinkRes.code ?? 'null'}`,
          500,
          'SHRINK_FAILED'
        );
      }
    } finally {
      activeShrinkJob = null;
      await stopChild(shrinkChild, shrinkExit);
      await stopChild(serverChild, serverExit);
    }

    const shrunkTraceFile = path.join(shrinkOutDir, 'trace.jsonl');
    let stepsCount = 0;
    if (fs.existsSync(shrunkTraceFile)) {
      stepsCount = fs
        .readFileSync(shrunkTraceFile, 'utf8')
        .split('\n')
        .filter((line) => line.trim()).length;
    }

    const updatedRun = {
      ...existingRun,
      shrunkTracePath: shrinkOutDir
    };
    const latestOnTarget = resolveStoredRun(`urn:mcard:bombadil:latest:${existingRun.target}`);
    const isLatestForTarget = latestOnTarget?.run?.runId === existingRun.runId;
    const saved = persistRunRecord(updatedRun, { bindLatest: isLatestForTarget });

    return {
      runId: cleanId,
      shrunkTracePath: shrinkOutDir,
      stepsCount,
      hash: saved.hash,
      runHandle: saved.runHandle,
      run: updatedRun
    };
  }

  function subscribe(listener) {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  async function shutdown() {
    if (activeShrinkJob?.stop) {
      try {
        await activeShrinkJob.stop();
      } catch {}
    }
    if (activeJob) {
      const job = activeJob;
      job.stopRequested = true;
      clearInterval(job.pollTimer);
      await stopChild(job.child, job.exitPromise);
      try {
        await job.donePromise;
      } catch {}
    }
  }

  const onSignal = () => {
    void shutdown();
  };
  if (registerSignals) {
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
  }

  function destroy() {
    if (registerSignals) {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
    }
    return shutdown();
  }

  return {
    getHandles,
    triggerRun,
    stopRun,
    shrinkRun,
    listRuns,
    getRun,
    getCoverage,
    isActive: () => Boolean(activeJob || activeShrinkJob),
    subscribe,
    shutdown,
    destroy
  };
}
