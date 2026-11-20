import { useEffect, useRef } from 'preact/hooks';
import LabIcon from '../components/LabIcon.jsx';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

export default function ViewportStageIsland() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const runtime = getLabRuntime();
    runtime.attachStageSurface(iframeRef.current);
    runtime.markBootParticipant('stage');
    const root = document.getElementById('viewport-scale-wrapper');
    if (root) root.dataset.islandState = 'ready';

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
        <LabIcon name="alert-triangle" size={16} />
        <div id="cors-block-alert-content" style={{ flex: 1 }}>
          <strong>Browser Sandbox Boundary:</strong> <span id="cors-block-target-name">GitHub</span> enforces{' '}
          <code id="cors-block-reason">X-Frame-Options: DENY</code>. Capture is disabled for blocked targets.
        </div>
        <button
          type="button"
          id="btn-cors-alert-recover"
          className="toolbar-btn"
          onClick={handleRecoverClick}
         data-testid="btn-cors-alert-recover">
          <LabIcon name="rotate-ccw" /> Reset to Default Target
        </button>
      </div>

      <div
        className="viewport-scale-wrapper stage-scale-rig"
        id="viewport-scale-wrapper"
        data-island="viewport-stage"
        data-island-state="mounting"
        data-unit="%"
        data-scale-mode="auto"
        data-frame-style="unframed"
      >
        <div
          className="viewport-frame"
          id="controlled-panel-frame"
          data-testid="viewport-frame"
          data-orientation="responsive"
          data-frame-style="unframed"
          data-safe-area="off"
          data-unit="%"
          style={{
            '--frame-inner-width': '100%',
            '--frame-inner-height': '100%',
            '--frame-outer-width': '100%',
            '--frame-outer-height': '100%',
            '--frame-target-width': '100%',
            '--frame-target-height': '100%',
            '--frame-scale-factor': '1'
          }}
        >
          <div className="stage-window-bar viewport-frame-bar" id="stage-window-bar">
            <div className="frame-controls-dots" aria-hidden="true">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <span className="stage-window-title" id="stage-window-title">
              Responsive Iframe Surface
            </span>
          </div>
          <div
            className="viewport-iframe-wrapper stage-screen-slot"
            id="stage-screen-slot"
            data-testid="viewport-screen"
          >
            <iframe
              ref={iframeRef}
              id="mission-control-iframe"
              title="Responsive UI Lab Test Frame"
              loading="lazy"
              className="viewport-iframe"
            />
            <div
              className="stage-safe-area-overlay"
              id="stage-safe-area-overlay"
              data-testid="stage-safe-area-overlay"
              aria-hidden="true"
              hidden
            >
              <span className="safe-area-band safe-area-top" />
              <span className="safe-area-band safe-area-right" />
              <span className="safe-area-band safe-area-bottom" />
              <span className="safe-area-band safe-area-left" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
