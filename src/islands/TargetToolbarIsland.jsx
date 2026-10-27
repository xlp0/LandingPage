import { useEffect } from 'preact/hooks';
import { initLabToolbar } from '../../js/harness/lab-toolbar.js';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

export default function TargetToolbarIsland() {
  useEffect(() => {
    let cancelled = false;
    let controller = null;
    const runtime = getLabRuntime();

    initLabToolbar({ membrane: runtime.membrane }).then((instance) => {
      if (cancelled) {
        instance?.destroy?.();
        return;
      }
      controller = instance;
      runtime.attachToolbar(instance);
      if (typeof document !== 'undefined') {
        document.getElementById('pane-url-bar')?.setAttribute('data-toolbar-ready', 'true');
      }
      runtime.markBootParticipant('toolbar');
    });

    return () => {
      cancelled = true;
      if (controller) {
        runtime.detachToolbar(controller);
        controller.destroy();
      }
    };
  }, []);

  return (
    <div className="url-selector-strip" id="pane-url-bar" data-island="target-toolbar">
      <div className="target-omnibar-header">
        <label
          htmlFor="target-url-input"
          className="group-label"
          style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <span>🌐 Test Target URL:</span>
        </label>
        <span className="target-omnibar-hint" style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
          Type URL &amp; press Enter
        </span>
      </div>
      <div className="target-url-input-wrap">
        <span className="target-url-icon" aria-hidden="true">🔗</span>
        <input
          type="text"
          id="target-url-input"
          className="target-url-input"
          placeholder="Type target URL or path (e.g. app.html, http://localhost:5320)..."
          autoComplete="off"
          spellCheck={false}
          aria-label="Test Target URL input"
        />
        <button
          type="button"
          id="btn-clear-target-url"
          className="url-clear-btn"
          title="Clear target URL"
          aria-label="Clear URL"
        >
          ✕
        </button>
        <button id="btn-load-in-iframe" className="toolbar-btn load-target-btn" title="Load target into viewport (Enter)">
          <span>▶ Load Target</span>
        </button>
      </div>
      <div
        className="target-policy-meta"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', flexWrap: 'wrap' }}
      >
        <span id="target-type-badge" data-testid="target-type-badge" className="lab-badge">
          Type: webapp
        </span>
        <span
          id="target-policy-status"
          data-testid="target-policy-status"
          role="status"
          aria-live="polite"
          data-policy-state="approved-same-origin"
          className="lab-badge"
        >
          Policy: Approved (Same-Origin)
        </span>
        <button
          type="button"
          id="btn-target-recover"
          data-testid="btn-target-recover"
          className="toolbar-btn"
          style={{ display: 'none', fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}
        >
          ↺ Reset to Default Target
        </button>
      </div>
      <div className="target-presets-row">
        <div className="preset-dropdown-wrap">
          <span className="preset-label" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Presets:
          </span>
          <select
            id="public-site-selector"
            className="target-url-select"
            aria-label="Select target website to test iframe compatibility"
          />
        </div>
        <div className="target-quick-chips" id="target-quick-chips" aria-label="Quick launch targets" />
      </div>
      <div className="target-status-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span
          id="cors-status-pill"
          role="status"
          aria-live="polite"
          className="footer-status-pill"
          style={{ marginTop: '0.05rem', width: '100%', justifyContent: 'center' }}
        >
          ● Controlled Viewport Active (Iframe Compatible)
        </span>
      </div>
    </div>
  );
}
