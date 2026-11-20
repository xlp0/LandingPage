import { useEffect } from 'preact/hooks';
import LabIcon from '../components/LabIcon.jsx';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';
import { chipIdFor, initDevicePresetsUI } from '../../js/harness/device-presets-ui.js';
import { aspectRatio } from '../../js/harness/viewport-geometry.js';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

export default function DevicePresetsIsland() {
  useEffect(() => {
    const runtime = getLabRuntime();
    const presetsUI = initDevicePresetsUI({
      registry: runtime.registry,
      stage: runtime.stage
    });
    presetsUI.renderPresets();
    runtime.attachPresetsUI(presetsUI);
    runtime.markBootParticipant('presets');

    const root = document.getElementById('controlled-size-controller');
    if (root) root.dataset.islandState = 'ready';

    return () => {
      runtime.detachPresetsUI(presetsUI);
      presetsUI.destroy();
    };
  }, []);

  return (
    <div className="workbench-toolbar" id="controlled-size-controller" data-island="device-presets" data-island-state="mounting">

      <div className="toolbar-group">
        <span className="group-label">Viewport orientation</span>
        <div className="toolbar-group-row">
          <button
            id="btn-orient-vertical"
            className="toolbar-btn orientation-btn-primary"
            data-orientation="portrait"
            title="Switch to Portrait orientation"
            aria-pressed="false"
            aria-disabled="true"
            disabled
           data-testid="btn-orient-vertical">
            <LabIcon name="smartphone" />
            <span>Portrait</span>
          </button>
          <button
            id="btn-orient-horizontal"
            className="toolbar-btn orientation-btn-primary"
            data-orientation="landscape"
            title="Switch to Landscape orientation"
            aria-pressed="false"
            aria-disabled="true"
            disabled
           data-testid="btn-orient-horizontal">
            <LabIcon name="columns" />
            <span>Landscape</span>
          </button>
        </div>
      </div>

      <div className="toolbar-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span className="group-label">Dimension presets</span>
          <button
            id="btn-open-device-manager"
            className="toolbar-btn"
            title="Open Device Preset Manager"
            aria-label="Open Device Preset Manager"
           data-testid="btn-open-device-manager">
            <LabIcon name="settings" />
            <span>Manage</span>
          </button>
        </div>
        <div
          id="device-presets-container"
          className="toolbar-group-row preset-chips-scroll"
          role="group"
          aria-label="Device dimension presets"
        >
          {BUILTIN_DEVICES.map((device) => (
            <button
              key={device.id}
              type="button"
              id={chipIdFor(device)}
              className="toolbar-btn size-preset-btn"
              data-device-id={device.id}
              title={`${device.name} — ${device.width} × ${device.height}px (${aspectRatio(device.width, device.height)})`}
              aria-pressed="false"
             data-testid={chipIdFor(device)}>
              <span>{`${device.name} (${device.width}px)`}</span>
            </button>
          ))}
          <button
            type="button"
            id="btn-size-full"
            className="toolbar-btn size-preset-btn active"
            title="Reset to full container size (100%)"
            aria-pressed="true"
           data-testid="btn-size-full">
            <LabIcon name="maximize" />
            <span>Full (100%)</span>
          </button>
        </div>
      </div>

      <div className="toolbar-group">
        <span className="group-label">Custom geometry</span>
        <div
          className="custom-dim-form"
          style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr auto', gap: '0.25rem', alignItems: 'center' }}
        >
          <label htmlFor="controlled-width-input" style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            W:
          </label>
          <input
            id="controlled-width-input"
            type="number"
            className="dim-input"
            defaultValue="393"
            min="100"
            max="7680"
            aria-label="Width in pixels"
          data-testid="controlled-width-input" />
          <label htmlFor="controlled-height-input" style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            H:
          </label>
          <input
            id="controlled-height-input"
            type="number"
            className="dim-input"
            defaultValue="852"
            min="100"
            max="7680"
            aria-label="Height in pixels"
          data-testid="controlled-height-input" />
          <button id="btn-apply-custom-dim" type="button" className="toolbar-btn" style={{ padding: '0.2rem 0.5rem' }} data-testid="btn-apply-custom-dim">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
