/**
 * Bombadil Dashboard Client & Event Handle Bridge (SPRINT-SSG-04)
 * Pure browser ESM controller.
 */

const FRAMED_TARGET_PATHS = Object.freeze({
  spa: '/tests/fixtures/spa-test-target.html',
  'spa-canary': '/tests/bombadil/fixtures/spa-test-target-canary.html'
});

function normalizeTargetId(targetOrHandle) {
  if (typeof targetOrHandle !== 'string') return '';
  const trimmed = targetOrHandle.trim();
  if (trimmed.startsWith('urn:mcard:bombadil:trigger:')) {
    return trimmed.slice('urn:mcard:bombadil:trigger:'.length);
  }
  return trimmed;
}

async function readJsonResponse(res, fallbackMessage) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || fallbackMessage || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data?.code || null;
    err.data = data;
    throw err;
  }
  return data;
}

export function createBombadilClient({
  selectTarget = null,
  fetchImpl = null,
  eventTarget = typeof document !== 'undefined' ? document : null
} = {}) {
  let destroyed = false;
  let streamAbort = null;
  const listeners = new Set();

  let currentState = {
    runId: null,
    target: 'spa',
    status: 'idle',
    actionsCount: 0,
    firingsCount: 0,
    distinctTransitions: 0,
    quiescenceWarnings: 0,
    currentPlaceId: null,
    violations: [],
    triggerHandle: null,
    mcardHandle: null,
    mcardHash: null,
    startedAt: null,
    durationMs: 0,
    childRun: false,
    triggerEnabled: true,
    error: null,
    lastRun: null,
    catalog: null,
    runsList: [],
    coverageReport: null
  };

  function emitState(patch = {}) {
    currentState = {
      ...currentState,
      ...patch
    };
    const detail = {
      runId: currentState.runId,
      target: currentState.target,
      status: currentState.status,
      actionsCount: currentState.actionsCount,
      firingsCount: currentState.firingsCount,
      distinctTransitions: currentState.distinctTransitions,
      quiescenceWarnings: currentState.quiescenceWarnings,
      currentPlaceId: currentState.currentPlaceId,
      violations: currentState.violations,
      triggerHandle: currentState.triggerHandle,
      childRun: currentState.childRun,
      triggerEnabled: currentState.triggerEnabled,
      error: currentState.error
    };
    for (const fn of [...listeners]) {
      try {
        fn({ ...detail, state: { ...currentState } });
      } catch {}
    }
    if (eventTarget && typeof CustomEvent === 'function' && typeof eventTarget.dispatchEvent === 'function') {
      eventTarget.dispatchEvent(new CustomEvent('lab:bombadil-state', { detail }));
    }
    return detail;
  }

  function closeStream() {
    if (streamAbort) {
      try {
        streamAbort.abort();
      } catch {}
      streamAbort = null;
    }
  }

  function applyStreamEvent(eventName, payload) {
    if (!payload || typeof payload !== 'object') return;
    if (eventName === 'progress') {
      emitState({
        runId: payload.runId ?? currentState.runId,
        target: payload.target ?? currentState.target,
        status: payload.status ?? 'running',
        actionsCount: payload.actionsCount ?? currentState.actionsCount,
        firingsCount: payload.firingsCount ?? currentState.firingsCount,
        distinctTransitions: payload.distinctTransitions ?? currentState.distinctTransitions,
        quiescenceWarnings: payload.quiescenceWarnings ?? currentState.quiescenceWarnings,
        currentPlaceId: payload.currentPlaceId ?? currentState.currentPlaceId,
        violations: Array.isArray(payload.violations) ? payload.violations : currentState.violations,
        durationMs: payload.durationMs ?? (currentState.startedAt ? Date.now() - currentState.startedAt : currentState.durationMs),
        error: null
      });
      return;
    }
    if (eventName === 'violation') {
      emitState({
        runId: payload.runId ?? currentState.runId,
        target: payload.target ?? currentState.target,
        status: payload.status ?? currentState.status,
        currentPlaceId: payload.currentPlaceId ?? currentState.currentPlaceId,
        violations: Array.isArray(payload.violations) ? payload.violations : currentState.violations
      });
      return;
    }
    if (eventName === 'complete' || eventName === 'job-error') {
      const nextRun = payload.run || currentState.lastRun;
      emitState({
        runId: payload.runId ?? currentState.runId,
        target: payload.target ?? currentState.target,
        status: payload.status ?? (eventName === 'job-error' ? 'error' : 'clean'),
        actionsCount: payload.actionsCount ?? nextRun?.actionsCount ?? nextRun?.metrics?.actions ?? currentState.actionsCount,
        firingsCount: payload.firingsCount ?? nextRun?.firingsCount ?? nextRun?.metrics?.firings ?? currentState.firingsCount,
        distinctTransitions: payload.distinctTransitions ?? nextRun?.distinctTransitions ?? nextRun?.metrics?.distinctTransitions ?? currentState.distinctTransitions,
        quiescenceWarnings: payload.quiescenceWarnings ?? nextRun?.quiescenceWarnings ?? nextRun?.metrics?.quiescenceWarnings ?? currentState.quiescenceWarnings,
        currentPlaceId: payload.currentPlaceId ?? nextRun?.currentPlaceId ?? currentState.currentPlaceId,
        violations: Array.isArray(payload.violations)
          ? payload.violations
          : (Array.isArray(nextRun?.violations) ? nextRun.violations : currentState.violations),
        mcardHandle: payload.runHandle ?? payload.mcardHandle ?? nextRun?.runHandle ?? nextRun?.mcardHandle ?? currentState.mcardHandle,
        mcardHash: payload.hash ?? payload.mcardHash ?? nextRun?.hash ?? nextRun?.mcardHash ?? currentState.mcardHash,
        durationMs: payload.durationMs ?? nextRun?.durationMs ?? nextRun?.metrics?.durationMs ?? (currentState.startedAt ? Date.now() - currentState.startedAt : currentState.durationMs),
        error: payload.error || null,
        lastRun: nextRun
      });
      closeStream();
    }
  }

  async function connectStream() {
    if (destroyed) return;
    if (currentState.status !== 'queued' && currentState.status !== 'running') return;
    closeStream();
    streamAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const signal = streamAbort ? streamAbort.signal : undefined;

    try {
      const res = fetchImpl
        ? await fetchImpl('/api/test-runs/bombadil/stream', {
            signal,
            headers: { Accept: 'text/event-stream' }
          })
        : await fetch('/api/test-runs/bombadil/stream', {
            signal,
            headers: { Accept: 'text/event-stream' }
          });

      if (!res || res.status === 204 || !res.ok || !res.body) {
        closeStream();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!destroyed) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');

        let splitIdx = buffer.indexOf('\n\n');
        while (splitIdx !== -1) {
          const frame = buffer.slice(0, splitIdx);
          buffer = buffer.slice(splitIdx + 2);
          splitIdx = buffer.indexOf('\n\n');

          let eventName = 'message';
          const dataLines = [];
          for (const rawLine of frame.split('\n')) {
            if (rawLine.startsWith('event:')) {
              eventName = rawLine.slice(6).trim();
            } else if (rawLine.startsWith('data:')) {
              dataLines.push(rawLine.slice(5).trim());
            }
          }
          if (dataLines.length > 0) {
            try {
              const parsed = JSON.parse(dataLines.join('\n'));
              applyStreamEvent(eventName, parsed);
            } catch {}
          }
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError' && !destroyed) {
        emitState({ error: err?.message || 'Bombadil stream disconnected' });
      }
    } finally {
      closeStream();
    }
  }

  async function handles() {
    const res = fetchImpl
      ? await fetchImpl('/api/test-runs/bombadil/handles')
      : await fetch('/api/test-runs/bombadil/handles');
    const data = await readJsonResponse(res, 'Failed to fetch Bombadil handles');
    const active = data?.activeJob || null;
    emitState({
      catalog: data,
      childRun: Boolean(data?.childRun),
      triggerEnabled: data?.triggerEnabled !== false,
      runId: active ? active.runId : currentState.runId,
      target: active ? active.target : currentState.target,
      status: active ? active.status : (currentState.status === 'running' ? 'idle' : currentState.status),
      actionsCount: active ? active.actionsCount : currentState.actionsCount,
      firingsCount: active ? active.firingsCount : currentState.firingsCount,
      distinctTransitions: active ? active.distinctTransitions : currentState.distinctTransitions,
      currentPlaceId: active ? active.currentPlaceId : currentState.currentPlaceId,
      violations: active ? active.violations : currentState.violations
    });
    if (active && (active.status === 'queued' || active.status === 'running') && !streamAbort) {
      void connectStream();
    }
    return data;
  }

  async function trigger(options = {}) {
    const body = {};
    if (options.handle) body.handle = options.handle;
    if (options.target) body.target = options.target;
    if (options.timeLimit) body.timeLimit = options.timeLimit;
    if (options.minFirings !== undefined) body.minFirings = options.minFirings;
    if (options.requestedBy) body.requestedBy = options.requestedBy;

    const res = fetchImpl
      ? await fetchImpl('/api/test-runs/bombadil/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      : await fetch('/api/test-runs/bombadil/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
    const receipt = await readJsonResponse(res, 'Failed to trigger Bombadil run');
    emitState({
      runId: receipt.runId,
      target: receipt.target,
      status: receipt.status || 'running',
      actionsCount: 0,
      firingsCount: 0,
      distinctTransitions: 0,
      quiescenceWarnings: 0,
      currentPlaceId: null,
      violations: [],
      triggerHandle: receipt.triggerHandle || null,
      mcardHandle: null,
      mcardHash: null,
      startedAt: Date.now(),
      durationMs: 0,
      error: null
    });
    void connectStream();
    return receipt;
  }

  async function stop(runId = currentState.runId) {
    const body = runId ? { runId } : {};
    const res = fetchImpl
      ? await fetchImpl('/api/test-runs/bombadil/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      : await fetch('/api/test-runs/bombadil/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
    const result = await readJsonResponse(res, 'Failed to stop Bombadil run');
    closeStream();
    const run = result?.run || result;
    emitState({
      runId: run?.runId || currentState.runId,
      target: run?.target || currentState.target,
      status: run?.status || 'stopped',
      actionsCount: run?.actionsCount ?? run?.metrics?.actions ?? currentState.actionsCount,
      firingsCount: run?.firingsCount ?? run?.metrics?.firings ?? currentState.firingsCount,
      distinctTransitions: run?.distinctTransitions ?? run?.metrics?.distinctTransitions ?? currentState.distinctTransitions,
      quiescenceWarnings: run?.quiescenceWarnings ?? run?.metrics?.quiescenceWarnings ?? currentState.quiescenceWarnings,
      violations: Array.isArray(run?.violations) ? run.violations : currentState.violations,
      mcardHandle: result?.runHandle ?? run?.runHandle ?? run?.mcardHandle ?? currentState.mcardHandle,
      mcardHash: result?.hash ?? run?.hash ?? run?.mcardHash ?? currentState.mcardHash,
      durationMs: run?.durationMs ?? run?.metrics?.durationMs ?? (currentState.startedAt ? Date.now() - currentState.startedAt : currentState.durationMs),
      lastRun: run
    });
    return result;
  }

  async function shrink(options = {}) {
    const runId = typeof options === 'string' ? options : (options.runId || currentState.runId);
    const body = { runId };
    if (typeof options === 'object' && options?.timeLimit) {
      body.timeLimit = options.timeLimit;
    }
    const res = fetchImpl
      ? await fetchImpl('/api/test-runs/bombadil/shrink', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      : await fetch('/api/test-runs/bombadil/shrink', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
    const data = await readJsonResponse(res, 'Failed to shrink Bombadil trace');
    const nextLastRun = data?.run
      ? {
          ...data.run,
          ...(typeof data?.stepsCount === 'number' ? { stepsCount: data.stepsCount } : {})
        }
      : currentState.lastRun;
    emitState({
      mcardHandle: data?.runHandle ?? data?.mcardHandle ?? data?.run?.runHandle ?? data?.run?.mcardHandle ?? currentState.mcardHandle,
      mcardHash: data?.hash ?? data?.mcardHash ?? data?.run?.hash ?? data?.run?.mcardHash ?? currentState.mcardHash,
      lastRun: nextLastRun,
      error: null
    });
    return data;
  }

  async function runs() {
    const res = fetchImpl
      ? await fetchImpl('/api/test-runs/bombadil/runs')
      : await fetch('/api/test-runs/bombadil/runs');
    const data = await readJsonResponse(res, 'Failed to list Bombadil runs');
    emitState({
      runsList: Array.isArray(data?.runs) ? data.runs : []
    });
    return data;
  }

  async function run(runId) {
    const cleanRunId = typeof runId === 'string' ? runId.trim() : '';
    const res = fetchImpl
      ? await fetchImpl(`/api/test-runs/bombadil/run?runId=${encodeURIComponent(cleanRunId)}`)
      : await fetch(`/api/test-runs/bombadil/run?runId=${encodeURIComponent(cleanRunId)}`);
    return readJsonResponse(res, 'Failed to load Bombadil run');
  }

  async function coverage() {
    const res = fetchImpl
      ? await fetchImpl('/api/test-runs/bombadil/coverage')
      : await fetch('/api/test-runs/bombadil/coverage');
    const data = await readJsonResponse(res, 'Failed to load Bombadil coverage');
    emitState({
      coverageReport: data
    });
    return data;
  }

  function openTarget(targetOrHandle) {
    const target = normalizeTargetId(targetOrHandle);
    const targetPath = FRAMED_TARGET_PATHS[target];
    if (!targetPath) {
      return {
        ok: false,
        target: target || null,
        error: `Target "${target || targetOrHandle}" cannot be loaded inside single-page stage; only spa and spa-canary are framed.`
      };
    }
    if (typeof selectTarget === 'function') {
      selectTarget(targetPath, 'bombadil-open-target');
    }
    return { ok: true, target, path: targetPath };
  }

  function status() {
    return {
      runId: currentState.runId,
      target: currentState.target,
      status: currentState.status,
      actionsCount: currentState.actionsCount,
      firingsCount: currentState.firingsCount,
      distinctTransitions: currentState.distinctTransitions,
      quiescenceWarnings: currentState.quiescenceWarnings,
      currentPlaceId: currentState.currentPlaceId,
      violations: currentState.violations,
      triggerHandle: currentState.triggerHandle,
      childRun: currentState.childRun,
      triggerEnabled: currentState.triggerEnabled,
      error: currentState.error
    };
  }

  function getState() {
    return { ...currentState };
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  const onCommand = (ev) => {
    const detail = ev?.detail || {};
    const action = detail.action;
    if (action === 'trigger') {
      void trigger(detail).catch((err) => emitState({ status: 'error', error: err.message }));
    } else if (action === 'stop') {
      void stop(detail.runId).catch((err) => emitState({ error: err.message }));
    } else if (action === 'shrink') {
      void shrink(detail).catch((err) => emitState({ error: err.message }));
    } else if (action === 'refresh') {
      void Promise.all([handles(), runs(), coverage()]).catch((err) => emitState({ error: err.message }));
    } else if (action === 'open-target') {
      const opened = openTarget(detail.target || detail.handle);
      if (!opened.ok) {
        emitState({ error: opened.error });
      }
    }
  };

  if (eventTarget && typeof eventTarget.addEventListener === 'function') {
    eventTarget.addEventListener('lab:bombadil-command', onCommand);
  }

  function destroy() {
    destroyed = true;
    closeStream();
    listeners.clear();
    if (eventTarget && typeof eventTarget.removeEventListener === 'function') {
      eventTarget.removeEventListener('lab:bombadil-command', onCommand);
    }
  }

  return {
    handles,
    trigger,
    stop,
    shrink,
    openTarget,
    status,
    getState,
    runs,
    run,
    coverage,
    subscribe,
    destroy
  };
}
