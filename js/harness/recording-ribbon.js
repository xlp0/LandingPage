/**
 * Recording Ribbon UI Component (SPRINT-ERB-02 §2, R6)
 * Provides interactive recorder controls, live event/drop telemetry,
 * and touch-target health indicators styled with semantic tokens.
 */

export function initRecordingRibbon(options = {}) {
  const {
    recorder,
    container = options.container || document.getElementById('lab-recording-bar') || document.querySelector('.workbench-toolbar') || document.body,
    getFidelity = () => ({ tier: 0, runner: 'lab-iframe', emulated: [], notEmulated: [] }),
    getTarget = () => null,
    getDevice = () => null,
    getOrientation = () => 'portrait'
  } = options;

  let ribbon = document.getElementById('lab-recording-ribbon');
  if (!ribbon) {
    ribbon = document.createElement('div');
    ribbon.id = 'lab-recording-ribbon';
    ribbon.className = 'toolbar-group recording-ribbon';
    ribbon.style.display = 'flex';
    ribbon.style.alignItems = 'center';
    ribbon.style.gap = '0.5rem';
    ribbon.style.borderLeft = '1px solid var(--border-subtle)';
    ribbon.style.paddingLeft = '0.75rem';

    ribbon.innerHTML = `
      <span class="group-label">Record:</span>
      <button id="btn-rec-start" class="toolbar-btn" title="Start recording interactions">🔴 Start</button>
      <button id="btn-rec-pause" class="toolbar-btn" style="display:none;" title="Pause recording">⏸ Pause</button>
      <button id="btn-rec-resume" class="toolbar-btn" style="display:none;" title="Resume recording">▶ Resume</button>
      <button id="btn-rec-stop" class="toolbar-btn" style="display:none;" title="Stop recording">⏹ Stop</button>
      
      <span id="rec-source-pill" class="lab-badge" title="Active capture channel">Source: same-origin</span>
      <span id="rec-fidelity-badge" class="lab-badge" style="background:var(--overlay-subtle);" title="Emulation fidelity tier">T0 · viewport only</span>
      <span id="rec-event-count" class="group-label" style="font-size:0.75rem;">0 ev</span>
      <span id="rec-drop-count" class="group-label" style="font-size:0.75rem; color:var(--color-danger); display:none;">0 drop</span>
      <span id="rec-undersized-pill" class="lab-badge" style="display:none; background:var(--badge-danger-bg); color:var(--badge-danger-text);" title="Taps on targets < 44px">⚠️ 0 undersized</span>
      <span id="rec-saved-pill" class="lab-badge" style="display:none; align-items:center; gap:0.35rem;">
        <span id="rec-saved-label">💾 Saved</span>
        <button id="btn-copy-handle" class="toolbar-btn" style="padding:0.1rem 0.35rem; font-size:0.68rem; display:none;" title="Copy Handle">📋</button>
        <a id="btn-download-json" href="#" download="session-recording.json" style="display:none; color:inherit; text-decoration:underline; font-size:0.75rem;">📥 Download JSON</a>
      </span>
    `;

    container.appendChild(ribbon);
  }

  const btnStart = ribbon.querySelector('#btn-rec-start');
  const btnPause = ribbon.querySelector('#btn-rec-pause');
  const btnResume = ribbon.querySelector('#btn-rec-resume');
  const btnStop = ribbon.querySelector('#btn-rec-stop');
  const sourcePill = ribbon.querySelector('#rec-source-pill');
  const fidelityBadge = ribbon.querySelector('#rec-fidelity-badge');
  const eventCount = ribbon.querySelector('#rec-event-count');
  const dropCount = ribbon.querySelector('#rec-drop-count');
  const undersizedPill = ribbon.querySelector('#rec-undersized-pill');
  const savedPill = ribbon.querySelector('#rec-saved-pill');
  const savedLabel = ribbon.querySelector('#rec-saved-label');
  const copyBtn = ribbon.querySelector('#btn-copy-handle');
  const downloadLink = ribbon.querySelector('#btn-download-json');

  const cleanupFns = [];
  let copyResetTimer = null;
  let activeBlobUrl = null;

  function listen(target, eventName, handler) {
    if (!target) return;
    target.addEventListener(eventName, handler);
    cleanupFns.push(() => target.removeEventListener(eventName, handler));
  }

  function updateUI() {
    if (!recorder) return;
    const stats = recorder.stats();
    const state = stats.state;
    const sourceKind = recorder.source?.kind || 'unavailable';

    if (sourcePill) {
      sourcePill.textContent = `Source: ${sourceKind}`;
      if (sourceKind === 'unavailable') {
        sourcePill.style.background = 'var(--badge-danger-bg)';
        sourcePill.style.color = 'var(--badge-danger-text)';
        sourcePill.title = recorder.source?.reason || 'Recording unavailable';
      } else {
        sourcePill.style.background = 'var(--badge-info-bg)';
        sourcePill.style.color = 'var(--badge-info-text)';
      }
    }

    if (sourceKind === 'unavailable') {
      btnStart.disabled = true;
      btnStart.title = recorder.source?.reason || 'Recording unavailable';
    } else {
      btnStart.disabled = false;
      btnStart.title = 'Start recording interactions';
    }

    if (state === 'IDLE' || state === 'FINALIZED') {
      btnStart.style.display = 'inline-flex';
      btnPause.style.display = 'none';
      btnResume.style.display = 'none';
      btnStop.style.display = 'none';
    } else if (state === 'RECORDING') {
      btnStart.style.display = 'none';
      btnPause.style.display = 'inline-flex';
      btnResume.style.display = 'none';
      btnStop.style.display = 'inline-flex';
    } else if (state === 'PAUSED') {
      btnStart.style.display = 'none';
      btnPause.style.display = 'none';
      btnResume.style.display = 'inline-flex';
      btnStop.style.display = 'inline-flex';
    }

    if (eventCount) eventCount.textContent = `${stats.size || 0} ev`;
    if (dropCount) {
      if (stats.dropped > 0) {
        dropCount.style.display = 'inline';
        dropCount.textContent = `${stats.dropped} drops`;
      } else {
        dropCount.style.display = 'none';
      }
    }

    if (undersizedPill) {
      if (stats.undersizedTaps > 0) {
        undersizedPill.style.display = 'inline-flex';
        undersizedPill.textContent = `⚠️ ${stats.undersizedTaps} undersized`;
      } else {
        undersizedPill.style.display = 'none';
      }
    }

    const fidelity = getFidelity();
    if (fidelityBadge) {
      fidelityBadge.textContent = `T${fidelity.tier} · ${fidelity.tier === 0 ? 'viewport only' : 'emulated'}`;
      if (fidelity.notEmulated?.length) {
        fidelityBadge.title = `Not emulated: ${fidelity.notEmulated.join(', ')}`;
      }
    }
  }

  listen(btnStart, 'click', () => {
    if (savedPill) savedPill.style.display = 'none';
    recorder?.start();
    updateUI();
  });

  listen(btnPause, 'click', () => {
    recorder?.pause();
    updateUI();
  });

  listen(btnResume, 'click', () => {
    recorder?.resume();
    updateUI();
  });

  listen(savedLabel, 'click', () => {
    if (!recorder?.lastSavedRun) return;
    const disclosure = typeof document !== 'undefined' ? document.getElementById('mcard-result-disclosure') : null;
    if (disclosure) {
      disclosure.open = true;
      disclosure.scrollIntoView({ block: 'nearest' });
    }
  });

  listen(btnStop, 'click', async () => {
    recorder?.stop();
    updateUI();

    if (savedPill && savedLabel) {
      savedPill.style.display = 'inline-flex';
      savedLabel.textContent = 'Saving run…';
    }

    try {
      const saveResult = await recorder?.saveTestRun({
        target: getTarget(),
        device: getDevice(),
        orientation: getOrientation(),
        fidelity: getFidelity()
      });

      if (saveResult?.ok) {
        if (savedPill && savedLabel) {
          savedPill.style.display = 'inline-flex';
          savedPill.style.background = 'var(--badge-success-bg)';
          savedPill.style.color = 'var(--badge-success-text)';
          const shortHandle = saveResult.data.handle.length > 32 ? `${saveResult.data.handle.slice(0, 32)}…` : saveResult.data.handle;
          savedLabel.textContent = `💾 ${shortHandle} (${saveResult.data.hash.slice(0, 8)})`;
          if (copyBtn) {
            copyBtn.style.display = 'inline-block';
            copyBtn.onclick = () => {
              navigator.clipboard?.writeText(saveResult.data.handle);
              copyBtn.textContent = '✓';
              if (copyResetTimer) clearTimeout(copyResetTimer);
              copyResetTimer = setTimeout(() => {
                copyBtn.textContent = '📋';
                copyResetTimer = null;
              }, 1500);
            };
          }
          if (downloadLink) downloadLink.style.display = 'none';
        }
      } else {
        if (savedPill && savedLabel) {
          savedPill.style.display = 'inline-flex';
          savedPill.style.background = 'var(--badge-danger-bg)';
          savedPill.style.color = 'var(--badge-danger-text)';
          savedLabel.textContent = '⚠️ Offline';
          if (copyBtn) copyBtn.style.display = 'none';
          if (downloadLink && saveResult?.run) {
            downloadLink.style.display = 'inline';
            if (activeBlobUrl) {
              URL.revokeObjectURL(activeBlobUrl);
            }
            const blob = new Blob([JSON.stringify(saveResult.run, null, 2)], { type: 'application/json' });
            activeBlobUrl = URL.createObjectURL(blob);
            downloadLink.href = activeBlobUrl;
          }
        }
      }
    } catch (err) {
      console.warn('[recording-ribbon] saveTestRun error:', err);
    }
  });

  if (recorder) {
    const unsub = recorder.onChange(() => updateUI());
    cleanupFns.push(unsub);
  }
  if (typeof document !== 'undefined') {
    listen(document, 'lab:viewport-change', updateUI);
    listen(document, 'lab:target-change', updateUI);
  }

  updateUI();

  function destroy() {
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    if (activeBlobUrl) {
      URL.revokeObjectURL(activeBlobUrl);
      activeBlobUrl = null;
    }
    if (copyBtn) {
      copyBtn.onclick = null;
    }
    while (cleanupFns.length > 0) {
      const fn = cleanupFns.pop();
      try {
        fn();
      } catch {}
    }
  }

  return { updateUI, destroy };
}
