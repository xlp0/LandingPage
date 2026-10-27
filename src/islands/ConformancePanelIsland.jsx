import { useEffect } from 'preact/hooks';
import { initConformancePanel } from '../../js/harness/conformance-panel.js';
import { getLabRuntime } from '../../js/harness/lab-runtime.js';

export default function ConformancePanelIsland() {
  useEffect(() => {
    const runtime = getLabRuntime();
    const panel = initConformancePanel({
      getTarget: () => runtime.membrane.getTarget(),
      getDevice: () => runtime.getActiveDevice(),
      getOrientation: () => runtime.stage.getGeometry().orientation
    });

    const onRefresh = () => {
      panel?.refresh();
    };
    const disclosure = typeof document !== 'undefined' ? document.getElementById('conformance-disclosure') : null;
    const scrollOpen = () => {
      if (disclosure?.open && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => disclosure.scrollIntoView({ block: 'nearest' }));
      }
    };
    scrollOpen();
    const onToggle = () => {
      if (disclosure?.open) {
        Promise.resolve(panel?.refresh()).finally(scrollOpen);
      }
    };

    document.addEventListener('lab:viewport-change', onRefresh);
    document.addEventListener('lab:target-change', onRefresh);
    disclosure?.addEventListener('toggle', onToggle);

    return () => {
      document.removeEventListener('lab:viewport-change', onRefresh);
      document.removeEventListener('lab:target-change', onRefresh);
      disclosure?.removeEventListener('toggle', onToggle);
      panel?.destroy();
    };
  }, []);

  return (
    <div id="conformance-details" className="lab-disclosure-body" data-island="conformance-panel">
      <span style={{ color: 'var(--color-text-muted)' }}>No active target or device selected.</span>
    </div>
  );
}
