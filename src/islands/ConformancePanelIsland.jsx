import { useEffect } from 'preact/hooks';
import { initConformancePanel } from '../../js/harness/conformance-panel.js';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

export default function ConformancePanelIsland() {
  useEffect(() => {
    const runtime = getLabRuntime();
    const panel = initConformancePanel({
      getTarget: () => runtime.membrane.getTarget(),
      getDevice: () => runtime.getActiveDevice(),
      getOrientation: () => runtime.stage.getGeometry().orientation,
      getSelectionKey: () => runtime.stage.getGeometry().selectionKey
    });

    const disclosure = typeof document !== 'undefined' ? document.getElementById('conformance-disclosure') : null;
    const onToggle = () => {
      if (disclosure?.open) {
        panel?.refresh();
      }
    };

    disclosure?.addEventListener('toggle', onToggle);

    return () => {
      disclosure?.removeEventListener('toggle', onToggle);
      panel?.destroy();
    };
  }, []);

  return (
    <div id="conformance-details" className="lab-disclosure-body" data-island="conformance-panel" data-island-state="ready">
      <span style={{ color: 'var(--color-text-muted)' }}>No active target or device selected.</span>
    </div>
  );
}
