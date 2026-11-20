import { iconMarkup } from '../ui/icons.js';

export function initConformancePanel({ getTarget, getDevice, getOrientation, getSelectionKey }) {
  const container = typeof document !== 'undefined' ? document.getElementById('conformance-details') : null;
  const badge = typeof document !== 'undefined' ? document.getElementById('conformance-status-badge') : null;

  if (!container || !badge) return null;

  let lastTuple = null;

  async function refresh(arg = false) {
    const force = typeof arg === 'object' && arg !== null && Boolean(arg.force);
    const target = getTarget ? getTarget() : null;
    const targetUrl = target?.url || '';
    const device = getDevice ? getDevice() : null;
    const orientation = getOrientation ? getOrientation() : 'responsive';
    const selectionKey = getSelectionKey
      ? (getSelectionKey() || 'viewport-full')
      : (device?.id || 'viewport-full');

    const tupleKey = `${targetUrl}|${selectionKey}|${orientation}`;
    if (!force && lastTuple === tupleKey) {
      return;
    }

    if (!targetUrl || !device) {
      lastTuple = tupleKey;
      badge.textContent = 'Uncertified';
      badge.style.color = 'var(--color-text-muted)';
      const scopeLabel = selectionKey === 'viewport-full'
        ? 'Full (100%) responsive stage'
        : selectionKey;
      container.innerHTML = `<span style="color: var(--color-text-muted);">No conformance certification recorded for ${scopeLabel} (${orientation}). Select a certified device preset or run conformance suite.</span>`;
      return;
    }

    lastTuple = tupleKey;

    try {
      const res = await fetch(`/api/test-runs/conformance/latest?target=${encodeURIComponent(targetUrl)}`);
      if (!res.ok) {
        lastTuple = null;
        badge.textContent = 'Offline';
        container.innerHTML = '<span style="color: var(--color-text-muted);">Conformance service unavailable.</span>';
        return;
      }

      const data = await res.json();
      const report = (data.reports || []).find(
        (r) => r.device?.id === device.id && r.device?.orientation === orientation
      );

      if (!report) {
        badge.textContent = 'Uncertified';
        badge.style.color = 'var(--color-text-muted)';
        container.innerHTML = `
          <div style="color: var(--color-text-muted);">No conformance report recorded for <strong>${device.name || device.id}</strong> (${orientation}).</div>
          <div style="margin-top: 0.2rem; font-size: 0.68rem; color: var(--color-primary);">Run <code>npm run test:conformance</code> to evaluate.</div>
        `;
        return;
      }

      const { pass = 0, fail = 0, skipped = 0, notApplicable = 0 } = report.summary || {};
      const allPassed = fail === 0;

      badge.textContent = allPassed ? 'Passed' : `${fail} Failed`;
      badge.style.color = allPassed ? 'var(--badge-success-text)' : 'var(--badge-danger-text)';

      const summaryHtml = `
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.35rem; font-weight: 600; flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; gap: 0.25rem; color: var(--badge-success-text);">${iconMarkup('check-circle')} ${pass}</span>
          <span style="display: inline-flex; align-items: center; gap: 0.25rem; color: var(--badge-danger-text);">${iconMarkup('x-circle')} ${fail}</span>
          <span style="display: inline-flex; align-items: center; gap: 0.25rem; color: var(--badge-warning-text);">${iconMarkup('alert-triangle')} ${skipped}</span>
          <span style="display: inline-flex; align-items: center; gap: 0.25rem; color: var(--color-text-muted);">${iconMarkup('minus-circle')} ${notApplicable}</span>
        </div>
      `;

      const resultsList = (report.results || [])
        .map((r) => {
          let icon = iconMarkup('check-circle');
          let color = 'var(--badge-success-text)';
          if (r.status === 'fail') {
            icon = iconMarkup('x-circle');
            color = 'var(--badge-danger-text)';
          } else if (r.status === 'skipped') {
            icon = iconMarkup('alert-triangle');
            color = 'var(--badge-warning-text)';
          } else if (r.status === 'not-applicable') {
            icon = iconMarkup('minus-circle');
            color = 'var(--color-text-muted)';
          }
          const reasonText = r.reason ? ` (${r.reason})` : '';
          return `<div style="display: flex; justify-content: space-between; font-size: 0.68rem; padding: 1px 0; gap: 0.5rem;">
            <span style="color: var(--color-text-primary);">${r.id}</span>
            <span style="display: inline-flex; align-items: center; gap: 0.25rem; color: ${color}; font-weight: 500;">${icon} ${r.status}${reasonText}</span>
          </div>`;
        })
        .join('');

      container.innerHTML = `
        ${summaryHtml}
        <div style="max-height: 8rem; overflow-y: auto; padding-right: 2px;">
          ${resultsList}
        </div>
      `;
    } catch (err) {
      lastTuple = null;
      badge.textContent = 'Error';
      container.innerHTML = `<span style="color: var(--badge-danger-text);">${err.message}</span>`;
    }
  }

  const onViewportChange = () => refresh({ force: false });
  const onTargetChange = () => {
    lastTuple = null;
    refresh({ force: true });
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('lab:viewport-change', onViewportChange);
    document.addEventListener('lab:target-change', onTargetChange);
  }

  refresh({ force: true });

  function destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('lab:viewport-change', onViewportChange);
      document.removeEventListener('lab:target-change', onTargetChange);
    }
  }

  return { refresh, destroy };
}
