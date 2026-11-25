import { useEffect, useRef, useState } from 'preact/hooks';
import {
  DEFAULT_LAB_DRAG_SPEC,
  DEFAULT_LAB_SNAPSHOT,
  createAtom,
  previewDragSpec,
  projectDragSpecToZx,
} from '../../js/harness/pkc-dragology-preview.js';

const TARGETS = ['slot-compact', 'slot-tablet', 'slot-desktop'];
const pkcCardAtom = createAtom({ activeIndex: -1, previewState: 'candidate', lastIntent: null, announcement: 'Ready' });

export default function PkcCardIsland({ onCommitIntent, onCancelPreview } = {}) {
  const [view, setView] = useState(() => pkcCardAtom.get());
  const mountedRef = useRef(true);
  const startBtnRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    const unsub = pkcCardAtom.subscribe((next) => {
      if (mountedRef.current) setView({ ...next });
    });
    return () => {
      mountedRef.current = false;
      unsub();
      if (typeof onCancelPreview === 'function') onCancelPreview('unmount');
    };
  }, [onCancelPreview]);

  const selectAt = (idx, modality) => {
    if (!mountedRef.current) return;
    const tid = TARGETS[idx];
    const res = previewDragSpec(DEFAULT_LAB_DRAG_SPEC, DEFAULT_LAB_SNAPSHOT, { selectedTargetId: tid, modality });
    pkcCardAtom.set({
      ...pkcCardAtom.get(),
      activeIndex: idx,
      previewState: res.state,
      announcement: `${res.state}: ${tid ?? 'none'}`,
    });
  };

  const commitPreviewSelection = (modality, idxOverride) => {
    if (!mountedRef.current) return;
    const cur = pkcCardAtom.get();
    const idx = idxOverride ?? cur.activeIndex;
    const tid = TARGETS[idx >= 0 ? idx : 0];
    const res = previewDragSpec(DEFAULT_LAB_DRAG_SPEC, DEFAULT_LAB_SNAPSHOT, { selectedTargetId: tid, modality });
    pkcCardAtom.set({
      activeIndex: idx >= 0 ? idx : 0,
      previewState: res.state,
      lastIntent: res.candidateIntent ?? null,
      announcement: `committed-preview: ${tid ?? 'none'}`,
    });
    if (res.state === 'candidate' && res.candidateIntent && typeof onCommitIntent === 'function') {
      onCommitIntent(res.candidateIntent);
    }
  };

  const cancel = (reason = 'escape') => {
    if (!mountedRef.current) return;
    pkcCardAtom.set({
      activeIndex: -1,
      previewState: 'cancelled',
      lastIntent: null,
      announcement: `cancelled: ${reason}`,
    });
    if (typeof onCancelPreview === 'function') onCancelPreview(reason);
    startBtnRef.current?.focus?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = view.activeIndex < 0 ? 0 : (view.activeIndex + 1) % TARGETS.length;
      selectAt(next, 'keyboard');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = view.activeIndex <= 0 ? TARGETS.length - 1 : view.activeIndex - 1;
      selectAt(prev, 'keyboard');
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (e.target === startBtnRef.current) return;
      e.preventDefault();
      commitPreviewSelection('keyboard');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel('escape');
    }
  };

  const diagram = projectDragSpecToZx(DEFAULT_LAB_DRAG_SPEC, view.previewState);
  const svgW = Math.max(195, diagram.spiders.length * 65);
  const selectedId = view.activeIndex >= 0 ? TARGETS[view.activeIndex] : undefined;

  return (
    <pkc-card
      id="pkc-card-island"
      data-testid="pkc-card-island"
      data-island="pkc-card"
      data-island-state="ready"
      data-preview-state={view.previewState}
      onKeyDown={onKeyDown}
    >
      <div className="pkc-card-controls" style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
        <button
          ref={startBtnRef}
          type="button"
          className="toolbar-btn"
          data-testid="pkc-card-start"
          aria-label="Start PKC card drag preview"
          onClick={() => selectAt(0, 'pointer')}
        >
          Start
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-testid="pkc-card-confirm"
          aria-label="Confirm selected PKC card slot"
          disabled={view.activeIndex < 0 || view.previewState !== 'candidate'}
          onClick={() => commitPreviewSelection('pointer')}
        >
          Confirm
        </button>
      </div>
      <svg
        role="img"
        aria-label={`Read-only ZX diagram (${view.previewState})`}
        width={svgW}
        height={60}
        viewBox={`0 0 ${svgW} 60`}
      >
        {diagram.wires.map((w, i) => {
          const fromIdx = diagram.spiders.findIndex((s) => s.id === w.from);
          const toIdx = diagram.spiders.findIndex((s) => s.id === w.to);
          if (fromIdx < 0 || toIdx < 0) return null;
          return (
            <line
              key={`${w.from}-${w.to}-${i}`}
              x1={30 + fromIdx * 60}
              y1={26}
              x2={30 + toIdx * 60}
              y2={26}
              stroke="#64748b"
              strokeWidth={2}
            />
          );
        })}
        {diagram.spiders.map((sp, i) => (
          <circle
            key={sp.id}
            cx={30 + i * 60}
            cy={26}
            r={sp.kind === 'boundary' ? 6 : 10}
            fill={sp.kind === 'Z' ? '#22c55e' : sp.kind === 'X' ? '#ef4444' : '#94a3b8'}
          />
        ))}
      </svg>
      <div role="listbox" aria-label="PKC card slots" style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        {TARGETS.map((tid, idx) => (
          <button
            key={tid}
            type="button"
            role="option"
            className="toolbar-btn"
            aria-selected={selectedId === tid}
            data-testid={`pkc-card-slot-${tid}`}
            onClick={() => {
              selectAt(idx, 'pointer');
              commitPreviewSelection('pointer', idx);
            }}
          >
            {tid}
          </button>
        ))}
      </div>
      <div role="status" aria-live="polite" data-testid="pkc-card-status">
        {view.announcement}
      </div>
    </pkc-card>
  );
}
