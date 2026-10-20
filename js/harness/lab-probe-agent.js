/**
 * Lab Probe Agent (SPRINT-ERB-02 §4.3)
 * Lightweight script injected into or embedded by cross-origin targets to allow
 * normalized interaction capture via armed postMessage telemetry.
 */

import {
  computeNormalizedCoords,
  deriveSelector,
  redactValue,
  auditTapErgonomics,
  normalizeKeyEvent,
  normalizePointerEvent
} from './normalize-event.js';

(function initLabProbeAgent() {
  if (typeof window === 'undefined' || window.self === window.top) {
    return; // Do not run when not embedded in an iframe
  }

  const SCHEMA = 'lab-capture/v1';
  let activeNonce = null;
  let armed = false;
  let listeners = [];

  function postToParent(type, payload = {}) {
    window.parent.postMessage(
      {
        schema: SCHEMA,
        type,
        nonce: activeNonce,
        payload
      },
      '*'
    );
  }

  function getViewport() {
    return {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  }

  function attachListeners() {
    detachListeners();

    const handlePointer = (e) => {
      if (!armed) return;
      const targetEl = e.target;
      const targetRect = targetEl?.getBoundingClientRect?.();
      const vp = getViewport();
      const normalized = normalizePointerEvent(e, {
        viewport: vp,
        deviceProfile: { pointer: window.matchMedia?.('(pointer: coarse)').matches ? 'coarse' : 'fine' },
        targetEl,
        targetRect
      });
      postToParent('lab:event', normalized);
    };

    const handleKey = (e) => {
      if (!armed) return;
      const normKey = normalizeKeyEvent(e);
      if (normKey) {
        postToParent('lab:event', {
          ...normKey,
          viewport: getViewport()
        });
      }
    };

    const handleInput = (e) => {
      if (!armed) return;
      const target = e.target;
      const val = redactValue(target.value, {
        type: target.type,
        autocomplete: target.autocomplete
      });
      postToParent('lab:event', {
        type: 'input',
        value: val,
        target: {
          selector: deriveSelector(target),
          tag: target.tagName.toLowerCase()
        },
        viewport: getViewport()
      });
    };

    document.addEventListener('click', handlePointer, { capture: true, passive: true });
    document.addEventListener('keydown', handleKey, { capture: true, passive: true });
    document.addEventListener('input', handleInput, { capture: true, passive: true });

    listeners = [
      () => document.removeEventListener('click', handlePointer, { capture: true }),
      () => document.removeEventListener('keydown', handleKey, { capture: true }),
      () => document.removeEventListener('input', handleInput, { capture: true })
    ];
  }

  function detachListeners() {
    for (const unsub of listeners) {
      try {
        unsub();
      } catch {}
    }
    listeners = [];
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'lab:arm' && typeof data.nonce === 'string') {
      activeNonce = data.nonce;
      armed = true;
      attachListeners();
      postToParent('lab:ready', { viewport: getViewport() });
    } else if (data.type === 'lab:disarm') {
      armed = false;
      detachListeners();
      activeNonce = null;
    }
  });

  // Announce presence to parent lab
  window.parent.postMessage(
    {
      schema: SCHEMA,
      type: 'lab:hello'
    },
    '*'
  );
})();
