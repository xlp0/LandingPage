import { useEffect, useState } from 'preact/hooks';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

export default function MCardResultIsland() {
  const [savedRun, setSavedRun] = useState(null);

  useEffect(() => {
    const runtime = getLabRuntime();
    const syncSaved = () => {
      const latest = runtime.recorder.lastSavedRun || null;
      setSavedRun(latest);
      const summaryBadge = typeof document !== 'undefined' ? document.getElementById('mcard-result-summary-badge') : null;
      if (!summaryBadge) return;
      if (!latest) {
        summaryBadge.textContent = 'Idle';
        summaryBadge.style.color = 'var(--color-text-muted)';
      } else if (latest.blocked) {
        summaryBadge.textContent = 'Blocked';
        summaryBadge.style.color = 'var(--badge-danger-text)';
      } else if (latest.ok && (latest.incomplete || latest.run?.incomplete === true || latest.run?.schema === 'urn:gqc:interrupted-capture:v1')) {
        summaryBadge.textContent = 'Incomplete';
        summaryBadge.style.color = 'var(--badge-warning-text)';
      } else if (latest.ok) {
        summaryBadge.textContent = latest.data.hash.slice(0, 8);
        summaryBadge.style.color = 'var(--badge-success-text)';
      } else {
        summaryBadge.textContent = 'Offline';
        summaryBadge.style.color = 'var(--badge-danger-text)';
      }
    };

    syncSaved();
    const unsub = runtime.recorder.onChange((type) => {
      if (type === 'saved' || type === 'save-failed' || type === 'reset') {
        syncSaved();
      }
    });

    const disclosure = typeof document !== 'undefined' ? document.getElementById('mcard-result-disclosure') : null;
    const onToggle = () => {
      if (disclosure?.open) {
        syncSaved();
      }
    };
    disclosure?.addEventListener('toggle', onToggle);

    return () => {
      unsub();
      disclosure?.removeEventListener('toggle', onToggle);
    };
  }, []);

  if (!savedRun) {
    return (
      <div
        id="mcard-result-details"
        className="lab-disclosure-body"
        data-island="mcard-result"
        data-island-state="empty"
      >
        <span style={{ color: 'var(--color-text-muted)' }}>No saved MCard test run in this session yet.</span>
      </div>
    );
  }

  if (!savedRun.ok) {
    return (
      <div
        id="mcard-result-details"
        className="lab-disclosure-body"
        data-island="mcard-result"
        data-island-state="error"
      >
        <div style={{ color: 'var(--badge-danger-text)', fontWeight: 600 }}>
          {savedRun.blocked ? 'Save Blocked (< 100px)' : 'Persistence Offline'}
        </div>
        <div id="mcard-result-error" style={{ color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          {savedRun.error || 'Unable to store test run.'}
        </div>
      </div>
    );
  }

  const handle = savedRun.data?.handle || '';
  const hash = savedRun.data?.hash || '';
  const targetUrl = savedRun.run?.target?.url || '';
  const isInterrupted = Boolean(
    savedRun.incomplete ||
    savedRun.run?.incomplete === true ||
    savedRun.run?.schema === 'urn:gqc:interrupted-capture:v1'
  );

  if (isInterrupted) {
    const lifecycleState = savedRun.run?.lifecycleState || 'INTERRUPTED';
    const reason = savedRun.run?.reason || 'Target policy invalidated active capture';
    return (
      <div
        id="mcard-result-details"
        className="lab-disclosure-body"
        data-island="mcard-result"
        data-island-state="ready"
        data-mcard-hash={hash}
        data-mcard-handle={handle}
      >
        <div
          data-testid="mcard-result-incomplete-badge"
          data-incomplete="true"
          style={{ color: 'var(--badge-warning-text)', fontWeight: 600, marginBottom: '0.35rem' }}
        >
          Incomplete Capture (Interrupted)
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">Handle:</span>
          <code id="mcard-result-handle" className="mcard-result-val">{handle}</code>
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">Hash:</span>
          <code id="mcard-result-hash" className="mcard-result-val">{hash}</code>
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">Target:</span>
          <span id="mcard-result-target" className="mcard-result-val">{targetUrl}</span>
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">State:</span>
          <code id="mcard-result-state" className="mcard-result-val">{lifecycleState}</code>
        </div>
        <div className="mcard-result-row">
          <span className="mcard-result-key">Reason:</span>
          <span id="mcard-result-reason" className="mcard-result-val">{reason}</span>
        </div>
      </div>
    );
  }

  const deviceLabel = savedRun.run?.device?.id
    ? `${savedRun.run.device.id} (${savedRun.run?.orientation || 'portrait'})`
    : 'default';
  const eventCount = savedRun.run?.metrics?.eventCount ?? 0;

  return (
    <div
      id="mcard-result-details"
      className="lab-disclosure-body"
      data-island="mcard-result"
      data-island-state="ready"
      data-mcard-hash={hash}
      data-mcard-handle={handle}
    >
      <div className="mcard-result-row">
        <span className="mcard-result-key">Handle:</span>
        <code id="mcard-result-handle" className="mcard-result-val">{handle}</code>
      </div>
      <div className="mcard-result-row">
        <span className="mcard-result-key">Hash:</span>
        <code id="mcard-result-hash" className="mcard-result-val">{hash}</code>
      </div>
      <div className="mcard-result-row">
        <span className="mcard-result-key">Target:</span>
        <span id="mcard-result-target" className="mcard-result-val">{targetUrl}</span>
      </div>
      <div className="mcard-result-row">
        <span className="mcard-result-key">Device:</span>
        <span id="mcard-result-device" className="mcard-result-val">{deviceLabel}</span>
      </div>
      <div className="mcard-result-row">
        <span className="mcard-result-key">Events:</span>
        <span id="mcard-result-events" className="mcard-result-val">{String(eventCount)}</span>
      </div>
    </div>
  );
}
