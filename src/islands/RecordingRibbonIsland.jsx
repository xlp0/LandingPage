import { useEffect } from 'preact/hooks';
import LabIcon from '../components/LabIcon.jsx';
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
      getSelection: () => runtime.stage.getSelection(),
      getOrientation: () => runtime.stage.getGeometry().orientation,
      onOpenSavedRun: () => runtime.openSavedRunResult()
    });
    runtime.attachCaptureRibbon(ribbon);
    runtime.markBootParticipant('ribbon');

    const root = document.getElementById('lab-recording-ribbon');
    if (root) root.dataset.islandState = 'ready';
    const applyState = () => {
      if (root) root.dataset.recorderState = runtime.recorder.state;
    };
    applyState();
    const unsubscribe = runtime.recorder.onChange(applyState);

    return () => {
      unsubscribe();
      runtime.detachCaptureRibbon(ribbon);
      ribbon.destroy();
    };
  }, []);

  return (
    <div
      id="lab-recording-ribbon"
      className="toolbar-group recording-ribbon"
      data-island="recording-ribbon"
      data-island-state="mounting"
      data-recorder-state="IDLE"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}
    >
      <span className="group-label">Record</span>
      <button id="btn-rec-start" className="toolbar-btn" title="Start recording interactions" data-testid="btn-rec-start">
        <LabIcon name="circle-dot" /> Start
      </button>
      <button id="btn-rec-pause" className="toolbar-btn" hidden title="Pause recording" data-testid="btn-rec-pause">
        <LabIcon name="pause" /> Pause
      </button>
      <button id="btn-rec-resume" className="toolbar-btn" hidden title="Resume recording" data-testid="btn-rec-resume">
        <LabIcon name="play" /> Resume
      </button>
      <button id="btn-rec-stop" className="toolbar-btn" hidden title="Stop recording" data-testid="btn-rec-stop" data-effect="persist">
        <LabIcon name="square" /> Stop
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
        <LabIcon name="alert-triangle" />
        <span id="rec-undersized-text">0 undersized</span>
      </span>
      <span id="rec-saved-pill" className="lab-badge" style={{ display: 'none', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
        <LabIcon name="save" />
        <span id="rec-saved-label">Saved</span>
        <button
          type="button"
          id="btn-copy-handle"
          className="toolbar-btn"
          style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', display: 'none' }}
          title="Copy Handle"
          data-testid="btn-copy-handle">
          <LabIcon name="copy" />
        </button>
        <a
          id="btn-download-json"
          href="#"
          download="session-recording.json"
          data-effect="download"
          style={{ display: 'none', color: 'inherit', textDecoration: 'underline', fontSize: '0.75rem', alignItems: 'center', gap: '0.25rem' }}
          data-testid="btn-download-json">
          <LabIcon name="download" /> Download JSON
        </a>
      </span>
    </div>
  );
}
