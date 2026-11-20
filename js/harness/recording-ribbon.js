/**
 * Recording Ribbon UI Component (SPRINT-ERB-02 §2, R6)
 * Provides interactive recorder controls, live event/drop telemetry,
 * and touch-target health indicators styled with semantic tokens.
 */

import { setIcon } from '../ui/icons.js';

export function initRecordingRibbon(options = {}) {
  const {
    recorder,
    getFidelity = () => ({ tier: 0, runner: 'lab-iframe', emulated: [], notEmulated: [] }),
    getTarget = () => null,
    getDevice = () => null,
    getSelection = () => null,
    getOrientation = () => 'portrait',
    onOpenSavedRun = null
  } = options;

  const ribbon = document.getElementById('lab-recording-ribbon');
  if (!ribbon) return null;

  const btnStart = ribbon.querySelector('#btn-rec-start');
  const btnPause = ribbon.querySelector('#btn-rec-pause');
  const btnResume = ribbon.querySelector('#btn-rec-resume');
  const btnStop = ribbon.querySelector('#btn-rec-stop');
  const sourcePill = ribbon.querySelector('#rec-source-pill');
  const fidelityBadge = ribbon.querySelector('#rec-fidelity-badge');
  const eventCount = ribbon.querySelector('#rec-event-count');
  const dropCount = ribbon.querySelector('#rec-drop-count');
  const undersizedPill = ribbon.querySelector('#rec-undersized-pill');
  const undersizedText = ribbon.querySelector('#rec-undersized-text');
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
      btnStart.hidden = false;
      btnPause.hidden = true;
      btnResume.hidden = true;
      btnStop.hidden = true;
    } else if (state === 'RECORDING') {
      btnStart.hidden = true;
      btnPause.hidden = false;
      btnResume.hidden = true;
      btnStop.hidden = false;
    } else if (state === 'PAUSED') {
      btnStart.hidden = true;
      btnPause.hidden = true;
      btnResume.hidden = false;
      btnStop.hidden = false;
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
        const target = undersizedText || undersizedPill;
        target.textContent = `${stats.undersizedTaps} undersized`;
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

  function openSavedResult() {
    if (!recorder?.lastSavedRun) return;
    if (typeof onOpenSavedRun === 'function') {
      onOpenSavedRun();
      return;
    }
    const disclosure = typeof document !== 'undefined' ? document.getElementById('mcard-result-disclosure') : null;
    if (disclosure) {
      disclosure.open = true;
      disclosure.scrollIntoView?.({ block: 'nearest' });
    }
  }

  listen(savedPill, 'click', (e) => {
    if (copyBtn && (e.target === copyBtn || copyBtn.contains?.(e.target))) return;
    if (downloadLink && (e.target === downloadLink || downloadLink.contains?.(e.target))) return;
    openSavedResult();
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
        selection: getSelection(),
        orientation: getOrientation(),
        fidelity: getFidelity()
      });

      if (saveResult?.ok) {
        if (savedPill && savedLabel) {
          savedPill.style.display = 'inline-flex';
          savedPill.style.background = 'var(--badge-success-bg)';
          savedPill.style.color = 'var(--badge-success-text)';
          const shortHandle = saveResult.data.handle.length > 32 ? `${saveResult.data.handle.slice(0, 32)}…` : saveResult.data.handle;
          savedLabel.textContent = `${shortHandle} (${saveResult.data.hash.slice(0, 8)})`;
          if (copyBtn) {
            copyBtn.style.display = 'inline-flex';
            copyBtn.onclick = () => {
              navigator.clipboard?.writeText(saveResult.data.handle);
              setIcon(copyBtn, 'check');
              if (copyResetTimer) clearTimeout(copyResetTimer);
              copyResetTimer = setTimeout(() => {
                setIcon(copyBtn, 'copy');
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
          savedLabel.textContent = saveResult?.blocked ? `${saveResult.error || 'Viewport < 100px'}` : 'Offline';
          if (copyBtn) copyBtn.style.display = 'none';
          if (downloadLink && saveResult?.run) {
            downloadLink.style.display = 'inline-flex';
            if (activeBlobUrl) {
              URL.revokeObjectURL(activeBlobUrl);
            }
            const blob = new Blob([JSON.stringify(saveResult.run, null, 2)], { type: 'application/json' });
            activeBlobUrl = URL.createObjectURL(blob);
            downloadLink.href = activeBlobUrl;
          } else if (downloadLink) {
            downloadLink.style.display = 'none';
          }
        }
        if (saveResult?.blocked && typeof document !== 'undefined') {
          if (typeof onOpenSavedRun === 'function') {
            onOpenSavedRun();
          } else {
            const disclosure = document.getElementById('mcard-result-disclosure');
            if (disclosure) disclosure.open = true;
          }
          const pageStatus = document.getElementById('page-status');
          if (pageStatus) pageStatus.textContent = saveResult.error;
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
      } catch { }
    }
  }

  return { updateUI, destroy };
}
