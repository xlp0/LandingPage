import { useEffect } from 'preact/hooks';
import { initRecordingRibbon } from '../../js/harness/recording-ribbon.js';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

export default function RecordingRibbonIsland() {
  useEffect(() => {
    const runtime = getLabRuntime();
    const ribbon = initRecordingRibbon({
      recorder: runtime.recorder,
      getFidelity: () => runtime.getFidelity(),
      getTarget: () => runtime.membrane.getTarget(),
      getDevice: () => runtime.getActiveDevice(),
      getOrientation: () => runtime.stage.getGeometry().orientation
    });
    runtime.attachCaptureRibbon(ribbon);
    runtime.markBootParticipant('ribbon');

    return () => {
      runtime.detachCaptureRibbon(ribbon);
      ribbon.destroy();
    };
  }, []);

  return (
    <div
      id="lab-recording-ribbon"
      className="toolbar-group recording-ribbon"
      data-island="recording-ribbon"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderLeft: '1px solid var(--border-subtle)',
        paddingLeft: '0.75rem'
      }}
    >
      <span className="group-label">Record:</span>
      <button id="btn-rec-start" className="toolbar-btn" title="Start recording interactions">
        🔴 Start
      </button>
      <button id="btn-rec-pause" className="toolbar-btn" style={{ display: 'none' }} title="Pause recording">
        ⏸ Pause
      </button>
      <button id="btn-rec-resume" className="toolbar-btn" style={{ display: 'none' }} title="Resume recording">
        ▶ Resume
      </button>
      <button id="btn-rec-stop" className="toolbar-btn" style={{ display: 'none' }} title="Stop recording">
        ⏹ Stop
      </button>

      <span id="rec-source-pill" className="lab-badge" title="Active capture channel">
        Source: same-origin
      </span>
      <span
        id="rec-fidelity-badge"
        className="lab-badge"
        style={{ background: 'var(--overlay-subtle)' }}
        title="Emulation fidelity tier"
      >
        T0 · viewport only
      </span>
      <span id="rec-event-count" className="group-label" style={{ fontSize: '0.75rem' }}>
        0 ev
      </span>
      <span
        id="rec-drop-count"
        className="group-label"
        style={{ display: 'none', fontSize: '0.75rem', color: 'var(--color-danger)' }}
      >
        0 drop
      </span>
      <span
        id="rec-undersized-pill"
        className="lab-badge"
        style={{ display: 'none', background: 'var(--badge-danger-bg)', color: 'var(--badge-danger-text)' }}
        title="Taps on targets < 44px"
      >
        ⚠️ 0 undersized
      </span>
      <span id="rec-saved-pill" className="lab-badge" style={{ display: 'none', alignItems: 'center', gap: '0.35rem' }}>
        <span id="rec-saved-label">💾 Saved</span>
        <button
          id="btn-copy-handle"
          className="toolbar-btn"
          style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', display: 'none' }}
          title="Copy Handle"
        >
          📋
        </button>
        <a
          id="btn-download-json"
          href="#"
          download="session-recording.json"
          style={{ display: 'none', color: 'inherit', textDecoration: 'underline', fontSize: '0.75rem' }}
        >
          📥 Download JSON
        </a>
      </span>
    </div>
  );
}
