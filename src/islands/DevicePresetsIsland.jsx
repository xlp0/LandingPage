import { useEffect } from 'preact/hooks';
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

    return () => {
      runtime.detachPresetsUI(presetsUI);
      presetsUI.destroy();
    };
  }, []);

  return (
    <div className="workbench-toolbar" id="controlled-size-controller" data-island="device-presets">
      <div className="toolbar-group">
        <span className="group-label">Workbench Arrangement:</span>
        <div className="toolbar-group-row">
          <button
            id="btn-arrange-horizontal-dock"
            className="toolbar-btn arrangement-btn active"
            data-arrangement="horizontal"
            title="Horizontal arrangement (Left Sidebar + Canvas)"
          >
            <span>☲ Horizontal (Side-by-Side)</span>
          </button>
          <button
            id="btn-arrange-vertical-dock"
            className="toolbar-btn arrangement-btn"
            data-arrangement="vertical"
            title="Vertical arrangement (Stacked Topbar + Canvas)"
          >
            <span>☰ Vertical (Stacked)</span>
          </button>
        </div>
      </div>

      <div className="toolbar-group">
        <span className="group-label">Viewport Orientation:</span>
        <div className="toolbar-group-row">
          <button
            id="btn-orient-vertical"
            className="toolbar-btn orientation-btn-primary"
            data-orientation="vertical"
            title="Switch to Vertical (Portrait) layout"
          >
            <span>↕ Vertical (Portrait)</span>
          </button>
          <button
            id="btn-orient-horizontal"
            className="toolbar-btn orientation-btn-primary active"
            data-orientation="horizontal"
            title="Switch to Horizontal (Landscape) layout"
          >
            <span>↔ Horizontal (Landscape)</span>
          </button>
        </div>
      </div>

      <div className="toolbar-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span className="group-label">Dimension Presets:</span>
          <button
            id="btn-open-device-manager"
            className="toolbar-btn"
            title="Open Device Preset Manager"
            aria-label="Open Device Preset Manager"
          >
            <span>⚙️ Manage</span>
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
              title={`${device.name} \u2014 ${device.width} \u00d7 ${device.height}px (${aspectRatio(device.width, device.height)})`}
            >
              <span>{`${device.name} (${device.width}px)`}</span>
            </button>
          ))}
          <button
            type="button"
            id="btn-size-full"
            className="toolbar-btn size-preset-btn active"
            title="Reset to full container size (100%)"
          >
            <span>↔ Full (100%)</span>
          </button>
        </div>
      </div>

      <div className="toolbar-group">
        <span className="group-label">Custom Geometry:</span>
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
          />
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
          />
          <button id="btn-apply-custom-dim" type="button" className="toolbar-btn" style={{ padding: '0.2rem 0.5rem' }}>
            Apply
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
          <button
            id="btn-rotate-viewport"
            type="button"
            className="toolbar-btn"
            style={{ flex: 1 }}
            title="Swap Width and Height (90° Rotation)"
          >
            🔄 Rotate (90°)
          </button>
          <button
            id="btn-scale-toggle"
            type="button"
            className="toolbar-btn"
            title="Toggle between 100% Actual Size and Fit-to-Screen"
          >
            🔍 Fit: Auto
          </button>
        </div>
      </div>
    </div>
  );
}
