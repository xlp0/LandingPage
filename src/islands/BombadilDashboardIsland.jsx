import { useEffect, useRef, useState } from 'preact/hooks';
import LabIcon from '../components/LabIcon.jsx';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

const DEFAULT_HANDLES = [
  { handle: 'urn:mcard:bombadil:trigger:spa', target: 'spa', singlePageFramed: true },
  { handle: 'urn:mcard:bombadil:trigger:spa-canary', target: 'spa-canary', singlePageFramed: true },
  { handle: 'urn:mcard:bombadil:trigger:lab-smoke', target: 'lab-smoke', singlePageFramed: false },
  { handle: 'urn:mcard:bombadil:trigger:page-load', target: 'page-load', singlePageFramed: false },
  { handle: 'urn:mcard:bombadil:trigger:workbench', target: 'workbench', singlePageFramed: false }
];

const HANDLE_LABELS = {
  spa: 'SPA fixture property run',
  'spa-canary': 'SPA canary fault probe',
  'lab-smoke': 'Lab shell smoke run',
  'page-load': 'All places page-load sweep',
  workbench: 'Workbench dual-net exploration'
};

const DURATION_OPTIONS = ['10s', '30s', '2m', '5m'];
const MULTI_ENTRY_TARGETS = new Set(['page-load', 'workbench']);

function formatDurationMs(ms) {
  const numeric = Number(ms || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0.0s';
  return `${(numeric / 1000).toFixed(1)}s`;
}

function summarizeCoverage(coverageReport) {
  const nets = Object.entries(coverageReport?.nets || {});
  if (nets.length === 0) {
    return { declared: 0, asserted: 0, exploredOnly: 0, neverFired: 0, perNet: [] };
  }
  let declared = 0;
  let asserted = 0;
  let exploredOnly = 0;
  let neverFired = 0;
  const perNet = [];
  for (const [netId, stats] of nets) {
    const d = Number(stats?.declared || 0);
    const a = Number(stats?.asserted || 0);
    const e = Number(stats?.exploredOnly || 0);
    const n = Number(stats?.neverFired || Math.max(0, d - a - e));
    declared += d;
    asserted += a;
    exploredOnly += e;
    neverFired += n;
    perNet.push({ netId, declared: d, asserted: a, exploredOnly: e, neverFired: n });
  }
  return { declared, asserted, exploredOnly, neverFired, perNet };
}

function resolveHero(state) {
  const status = state.status || 'idle';
  const violationsCount = Array.isArray(state.violations) ? state.violations.length : 0;
  if (status === 'queued' || status === 'running') {
    return {
      value: String(state.actionsCount ?? 0),
      label: 'Actions'
    };
  }
  if (status === 'violated' || violationsCount > 0) {
    return {
      value: String(violationsCount),
      label: violationsCount === 1 ? 'Violation' : 'Violations'
    };
  }
  if (status === 'clean') {
    return {
      value: 'Pass',
      label: `${state.actionsCount ?? 0} actions`
    };
  }
  if (status === 'stopped') {
    return {
      value: 'Stopped',
      label: `${state.actionsCount ?? 0} actions`
    };
  }
  if (status === 'error') {
    return {
      value: 'Error',
      label: 'Run failed'
    };
  }
  return {
    value: '0',
    label: 'Actions'
  };
}

function resolveBadgeTone(status) {
  if (status === 'violated' || status === 'error') return 'danger';
  if (status === 'clean') return 'success';
  if (status === 'running' || status === 'queued') return 'info';
  return 'neutral';
}

export default function BombadilDashboardIsland() {
  const runtimeRef = useRef(null);
  const copyTimerRef = useRef(null);
  const prevStatusRef = useRef('idle');

  const [state, setState] = useState({
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
    durationMs: 0,
    childRun: false,
    triggerEnabled: true,
    error: null,
    lastRun: null,
    catalog: null,
    runsList: [],
    coverageReport: null
  });
  const [durations, setDurations] = useState({
    spa: '30s',
    'spa-canary': '30s',
    'lab-smoke': '30s',
    'page-load': '30s',
    workbench: '30s'
  });
  const [busy, setBusy] = useState(false);
  const [copiedRepro, setCopiedRepro] = useState(false);
  const [stageNotice, setStageNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    const runtime = getLabRuntime();
    runtimeRef.current = runtime;

    const client = runtime.bombadil;
    if (client) {
      setState(client.getState());
      const unsub = client.subscribe((ev) => {
        if (cancelled) return;
        const next = ev?.state || client.getState();
        setState(next);
        const wasActive = prevStatusRef.current === 'queued' || prevStatusRef.current === 'running';
        const isTerminal =
          next.status === 'clean' ||
          next.status === 'violated' ||
          next.status === 'stopped' ||
          next.status === 'error';
        prevStatusRef.current = next.status || 'idle';
        if (wasActive && isTerminal) {
          void Promise.allSettled([client.runs(), client.coverage()]);
        }
      });

      const current = client.getState();
      if (!current.catalog) {
        void Promise.allSettled([client.handles(), client.runs(), client.coverage()]);
      }

      return () => {
        cancelled = true;
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
          copyTimerRef.current = null;
        }
        unsub();
      };
    }

    return () => {
      cancelled = true;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

  const client = runtimeRef.current?.bombadil || null;
  const handlesList = Array.isArray(state.catalog?.handles) && state.catalog.handles.length > 0
    ? state.catalog.handles
    : DEFAULT_HANDLES;

  const isRunning = state.status === 'queued' || state.status === 'running';
  const executionLocked = Boolean(state.childRun || state.triggerEnabled === false);
  const hero = resolveHero(state);
  const statusTone = resolveBadgeTone(state.status);
  const activeHandleHash =
    state.mcardHash ||
    state.lastRun?.hash ||
    state.mcardHandle ||
    state.lastRun?.runHandle ||
    state.triggerHandle ||
    'None';
  const shortHandleDisplay =
    typeof activeHandleHash === 'string' && activeHandleHash.length > 28
      ? `${activeHandleHash.slice(0, 12)}...${activeHandleHash.slice(-8)}`
      : activeHandleHash;

  const activeTargetForShrink = state.lastRun?.target || state.target;
  const canShrink =
    Boolean(state.runId) &&
    !executionLocked &&
    !isRunning &&
    !busy &&
    !MULTI_ENTRY_TARGETS.has(activeTargetForShrink);

  const violationsList = Array.isArray(state.violations) ? state.violations : [];
  const showViolationCard = state.status === 'violated' || violationsList.length > 0;
  const reproCommand =
    state.lastRun?.reproduceCommand ||
    (state.runId ? `npm run bombadil:${activeTargetForShrink} -- --trace ${state.runId}` : '');
  const shrunkStepsCount = state.lastRun?.shrunkTracePath ? (state.lastRun?.stepsCount ?? null) : null;
  const coverageStats = summarizeCoverage(state.coverageReport);
  const recentRuns = Array.isArray(state.runsList) ? state.runsList.slice(0, 5) : [];

  async function handleRefresh() {
    if (!client) return;
    setBusy(true);
    try {
      await Promise.allSettled([client.handles(), client.runs(), client.coverage()]);
    } finally {
      setBusy(false);
    }
  }

  async function handleTrigger(item) {
    if (!client || executionLocked || isRunning || busy) return;
    setStageNotice('');
    setBusy(true);
    try {
      await client.trigger({
        handle: item.handle,
        target: item.target,
        timeLimit: durations[item.target] || '30s'
      });
    } catch {
      // client state stores and emits error
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    if (!client || executionLocked || !isRunning || busy) return;
    setBusy(true);
    try {
      await client.stop(state.runId);
      await Promise.allSettled([client.runs(), client.coverage()]);
    } catch {
      // client state stores error
    } finally {
      setBusy(false);
    }
  }

  async function handleShrink() {
    if (!client || !canShrink) return;
    setBusy(true);
    try {
      await client.shrink({ runId: state.runId });
      await client.runs();
    } catch {
      // client state stores error
    } finally {
      setBusy(false);
    }
  }

  function handleOpenTarget(item) {
    if (!client) return;
    const res = client.openTarget(item.target);
    setStageNotice(res?.ok ? `Loaded ${item.path || res.path} into stage.` : (res?.error || 'Target cannot be framed.'));
  }

  function handleCopyRepro() {
    if (!reproCommand || typeof navigator === 'undefined') return;
    navigator.clipboard?.writeText(reproCommand).catch(() => {});
    setCopiedRepro(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopiedRepro(false);
      copyTimerRef.current = null;
    }, 1500);
  }

  return (
    <section
      id="bombadil-dashboard-panel"
      className="bombadil-dashboard"
      data-island="bombadil-dashboard"
      data-island-state="ready"
      data-testid="bombadil-dashboard-panel"
      data-bombadil-status={state.status || 'idle'}
      aria-labelledby="bombadil-dashboard-heading"
    >
      <div className="bombadil-panel-header">
        <div className="bombadil-heading-group">
          <h2 id="bombadil-dashboard-heading" className="group-label bombadil-title">
            <LabIcon name="activity" /> Bombadil Property Verification
          </h2>
          <p className="bombadil-subtitle">Event handles, live LTL traces, and Petri net coverage</p>
        </div>
        <div className="bombadil-header-actions">
          <button
            type="button"
            className="toolbar-btn bombadil-compact-btn"
            data-testid="bombadil-refresh"
            disabled={busy}
            onClick={handleRefresh}
            title="Refresh handles, runs, and coverage"
          >
            <LabIcon name="refresh-cw" /> Refresh
          </button>
          <button
            type="button"
            className="toolbar-btn bombadil-compact-btn"
            data-testid="bombadil-stop"
            disabled={executionLocked || !isRunning || busy}
            onClick={handleStop}
            title="Stop active Bombadil run"
          >
            <LabIcon name="square" /> Stop
          </button>
        </div>
      </div>

      {executionLocked && (
        <div className="bombadil-notice" role="status" data-testid="bombadil-child-run-notice">
          <LabIcon name="lock" /> Nested Bombadil child run detected; external execution triggers are locked.
        </div>
      )}

      {state.error && (
        <div className="bombadil-error-banner" role="alert" data-testid="bombadil-error-banner">
          <LabIcon name="alert-triangle" /> {state.error}
        </div>
      )}

      {stageNotice && (
        <div className="bombadil-stage-notice" role="status" data-testid="bombadil-stage-notice">
          {stageNotice}
        </div>
      )}

      <div className="bombadil-hero" data-testid="bombadil-hero">
        <div className="bombadil-hero-metric-col">
          <div className="bombadil-hero-metric lab-tabular" data-testid="bombadil-hero-metric">
            {hero.value}
          </div>
          <div className="bombadil-hero-label" data-testid="bombadil-hero-label">
            {hero.label}
          </div>
        </div>
        <div className="bombadil-hero-badge-col">
          <span
            className={`lab-badge bombadil-status-badge tone-${statusTone}`}
            data-testid="bombadil-status-badge"
          >
            {state.status || 'idle'}
          </span>
          <span className="bombadil-active-target" data-testid="bombadil-active-target">
            {state.target || 'spa'}
          </span>
        </div>
      </div>

      <div className="bombadil-metrics-list" data-testid="bombadil-metrics-list">
        <div className="mcard-result-row">
          <span className="mcard-result-key">Current Place</span>
          <code className="mcard-result-val" data-testid="bombadil-current-place">
            {state.currentPlaceId || 'none'}
          </code>
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">Distinct Firings</span>
          <code className="mcard-result-val lab-tabular" data-testid="bombadil-distinct-firings">
            {`${state.distinctTransitions ?? 0} transitions (${state.firingsCount ?? 0} total)`}
          </code>
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">Duration</span>
          <code className="mcard-result-val lab-tabular" data-testid="bombadil-duration-value">
            {formatDurationMs(state.durationMs)}
          </code>
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">Quiescence Warnings</span>
          <code className="mcard-result-val lab-tabular" data-testid="bombadil-quiescence-warnings">
            {String(state.quiescenceWarnings ?? 0)}
          </code>
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">MCard Handle Hash</span>
          <code className="mcard-result-val" data-testid="bombadil-mcard-hash" title={String(activeHandleHash)}>
            {shortHandleDisplay}
          </code>
        </div>
      </div>

      {showViolationCard && (
        <div className="bombadil-violation-card" role="region" aria-label="Violation and shrink" data-testid="bombadil-violation-card">
          <div className="bombadil-violation-header">
            <span className="bombadil-violation-title">
              <LabIcon name="alert-triangle" /> Violated LTL properties ({violationsList.length})
            </span>
          </div>
          <ul className="bombadil-violation-list">
            {violationsList.map((v, idx) => (
              <li key={`${v?.name || 'v'}-${idx}`} className="bombadil-violation-item" data-testid={`bombadil-violation-item-${idx}`}>
                <strong>{v?.name || 'Property violation'}</strong>
                {v?.url ? <span className="bombadil-violation-url">{v.url}</span> : null}
              </li>
            ))}
          </ul>
          {state.lastRun?.shrunkTracePath && (
            <div className="bombadil-shrunk-note" data-testid="bombadil-shrunk-path">
              Shrunk trace{shrunkStepsCount !== null ? ` (${shrunkStepsCount} steps)` : ''}: <code>{state.lastRun.shrunkTracePath}</code>
            </div>
          )}
          <div className="bombadil-violation-actions">
            <button
              type="button"
              className="toolbar-btn bombadil-compact-btn"
              data-effect="external"
              data-testid="bombadil-shrink"
              disabled={!canShrink}
              onClick={handleShrink}
              title={
                MULTI_ENTRY_TARGETS.has(activeTargetForShrink)
                  ? 'Shrink unavailable for multi-entry targets'
                  : 'Shrink failing Bombadil trace to minimal reproduction'
              }
            >
              <LabIcon name="minimize-2" /> Shrink Trace
            </button>
            <button
              type="button"
              className="toolbar-btn bombadil-compact-btn"
              data-testid="bombadil-copy-repro"
              disabled={!reproCommand}
              onClick={handleCopyRepro}
              title="Copy reproduction command"
            >
              <LabIcon name={copiedRepro ? 'check' : 'copy'} /> {copiedRepro ? 'Copied' : 'Copy --reproduce'}
            </button>
          </div>
        </div>
      )}

      <div className="bombadil-section">
        <div className="group-label">Trigger handles</div>
        <div className="bombadil-handles-grid" data-testid="bombadil-handles-grid">
          {handlesList.map((item) => {
            const target = item.target;
            const timeLimit = durations[target] || '30s';
            const isFramedTarget = Boolean(item.singlePageFramed || target === 'spa' || target === 'spa-canary');
            return (
              <div key={target} className="bombadil-handle-row" data-testid={`bombadil-handle-row-${target}`}>
                <div className="bombadil-handle-meta">
                  <span className="bombadil-handle-name">{HANDLE_LABELS[target] || target}</span>
                  <code className="bombadil-handle-urn">{item.handle}</code>
                </div>
                <div className="bombadil-handle-controls">
                  <select
                    aria-label={`Duration for ${target}`}
                    className="bombadil-duration-select"
                    data-testid={`bombadil-duration-${target}`}
                    value={timeLimit}
                    disabled={executionLocked || isRunning}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      setDurations((prev) => ({ ...prev, [target]: val }));
                    }}
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="toolbar-btn bombadil-compact-btn bombadil-trigger-btn"
                    data-effect="external"
                    data-testid={`bombadil-trigger-${target}`}
                    disabled={executionLocked || isRunning || busy}
                    onClick={() => handleTrigger(item)}
                  >
                    <LabIcon name="play" /> Trigger
                  </button>
                  {isFramedTarget && (
                    <button
                      type="button"
                      className="toolbar-btn bombadil-compact-btn"
                      data-testid={`bombadil-open-target-${target}`}
                      onClick={() => handleOpenTarget(item)}
                      title={`Load ${target} in Viewport Stage`}
                    >
                      <LabIcon name="external-link" /> Load Target in Stage
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bombadil-section" data-testid="bombadil-coverage-section">
        <div className="group-label">Transition coverage</div>
        {coverageStats.declared === 0 ? (
          <div className="bombadil-empty-note" data-testid="bombadil-coverage-empty">
            No Bombadil coverage rollup recorded yet.
          </div>
        ) : (
          <div className="bombadil-coverage-bars">
            <div className="bombadil-coverage-row">
              <span>Asserted</span>
              <code className="lab-tabular" data-testid="bombadil-cov-asserted">
                {`${coverageStats.asserted}/${coverageStats.declared}`}
              </code>
            </div>
            <div className="bombadil-coverage-track" aria-hidden="true">
              <div
                className="bombadil-coverage-fill-asserted"
                style={{ width: `${Math.round((coverageStats.asserted / coverageStats.declared) * 100)}%` }}
              />
            </div>
            <div className="bombadil-coverage-row">
              <span>Explored only</span>
              <code className="lab-tabular" data-testid="bombadil-cov-explored">
                {`${coverageStats.exploredOnly}/${coverageStats.declared}`}
              </code>
            </div>
            <div className="bombadil-coverage-track" aria-hidden="true">
              <div
                className="bombadil-coverage-fill-explored"
                style={{ width: `${Math.round((coverageStats.exploredOnly / coverageStats.declared) * 100)}%` }}
              />
            </div>
            <div className="bombadil-coverage-row">
              <span>Never fired</span>
              <code className="lab-tabular" data-testid="bombadil-cov-never">
                {`${coverageStats.neverFired}/${coverageStats.declared}`}
              </code>
            </div>
          </div>
        )}
      </div>

      <div className="bombadil-section" data-testid="bombadil-runs-section">
        <div className="group-label">Recent runs</div>
        {recentRuns.length === 0 ? (
          <div className="bombadil-empty-note" data-testid="bombadil-runs-empty">
            No persisted Bombadil runs in this session.
          </div>
        ) : (
          <ul className="bombadil-runs-list" data-testid="bombadil-runs-list">
            {recentRuns.map((r) => (
              <li key={r.runId || r.hash} className="bombadil-run-row" data-testid={`bombadil-run-row-${r.runId || r.hash}`}>
                <div className="bombadil-run-left">
                  <span className="bombadil-run-target">{r.target}</span>
                  <code className="bombadil-run-hash">{String(r.hash || r.runId || '').slice(0, 12)}</code>
                </div>
                <span className={`lab-badge tone-${resolveBadgeTone(r.status)}`}>{r.status || 'unknown'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
