import { useEffect, useRef } from 'preact/hooks';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

export default function ViewportStageIsland() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const runtime = getLabRuntime();
    runtime.attachStageSurface(iframeRef.current);
    runtime.markBootParticipant('stage');

    return () => {
      runtime.detachStageSurface();
    };
  }, []);

  function handleRecoverClick() {
    window.__lab?.policy?.recover?.();
  }

  return (
    <>
      <div className="cors-alert-toast" id="cors-block-alert" role="alert" aria-live="assertive" style={{ display: 'none' }}>
        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
        <div id="cors-block-alert-content" style={{ flex: 1 }}>
          <strong>Browser Sandbox Boundary:</strong> <span id="cors-block-target-name">GitHub</span> enforces{' '}
          <code id="cors-block-reason">X-Frame-Options: DENY</code>. Capture is disabled for blocked targets.
        </div>
        <button
          type="button"
          id="btn-cors-alert-recover"
          className="toolbar-btn"
          onClick={handleRecoverClick}
        >
          ↺ Reset to Default Target
        </button>
      </div>

      <div className="viewport-scale-wrapper" id="viewport-scale-wrapper" data-island="viewport-stage">
        <div
          className="viewport-frame orientation-horizontal"
          id="controlled-panel-frame"
          style={{ '--frame-target-width': '100%', '--frame-target-height': '100%' }}
        >
          <div className="viewport-frame-bar">
            <div className="frame-controls-dots">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginLeft: '0.5rem' }}>
                Responsive Iframe Surface
              </span>
            </div>
            <span className="frame-dimension-pill" id="controlled-frame-dim">
              100% × 100% • ↔ Horizontal (Landscape)
            </span>
          </div>
          <div className="viewport-iframe-wrapper">
            <iframe
              ref={iframeRef}
              id="mission-control-iframe"
              title="Responsive UI Lab Test Frame"
              loading="lazy"
              className="viewport-iframe"
            />
          </div>
        </div>
      </div>
    </>
  );
}
