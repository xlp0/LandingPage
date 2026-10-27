/**
 * Conformance Diagnostics Panel (SPRINT-ERB-06 §4 Sally, §6.2)
 * Read-only panel displaying pass/fail/skip counts and per-check results for the active device.
 */

export function initConformancePanel({ getTarget, getDevice, getOrientation }) {
  const container = document.getElementById('conformance-details');
  const badge = document.getElementById('conformance-status-badge');

  if (!container || !badge) return null;

  async function refresh() {
    const target = getTarget ? getTarget() : null;
    const targetUrl = target?.url || '';
    const device = getDevice ? getDevice() : null;
    const orientation = getOrientation ? getOrientation() : 'portrait';

    if (!targetUrl || !device) {
      badge.textContent = 'Standby';
      container.innerHTML = '<span style="color: var(--color-text-muted);">No active target or device selected.</span>';
      return;
    }

    try {
      const res = await fetch(`/api/test-runs/conformance/latest?target=${encodeURIComponent(targetUrl)}`);
      if (!res.ok) {
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
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.35rem; font-weight: 600;">
          <span style="color: var(--badge-success-text);">✓ ${pass}</span>
          <span style="color: var(--badge-danger-text);">✗ ${fail}</span>
          <span style="color: var(--badge-warning-text);">⚠ ${skipped}</span>
          <span style="color: var(--color-text-muted);">○ ${notApplicable}</span>
        </div>
      `;

      const resultsList = (report.results || [])
        .map((r) => {
          let icon = '✓';
          let color = 'var(--badge-success-text)';
          if (r.status === 'fail') {
            icon = '✗';
            color = 'var(--badge-danger-text)';
          } else if (r.status === 'skipped') {
            icon = '⚠';
            color = 'var(--badge-warning-text)';
          } else if (r.status === 'not-applicable') {
            icon = '○';
            color = 'var(--color-text-muted)';
          }
          const reasonText = r.reason ? ` (${r.reason})` : '';
          return `<div style="display: flex; justify-content: space-between; font-size: 0.68rem; padding: 1px 0;">
            <span style="color: var(--color-text-primary);">${r.id}</span>
            <span style="color: ${color}; font-weight: 500;">${icon} ${r.status}${reasonText}</span>
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
      badge.textContent = 'Error';
      container.innerHTML = `<span style="color: var(--badge-danger-text);">${err.message}</span>`;
    }
  }

  window.addEventListener('lab:viewport-change', refresh);
  window.addEventListener('lab:target-changed', refresh);

  refresh();

  function destroy() {
    window.removeEventListener('lab:viewport-change', refresh);
    window.removeEventListener('lab:target-changed', refresh);
  }

  return { refresh, destroy };
}
