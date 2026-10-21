/**
 * Lab Probe Agent (SPRINT-ERB-02 §4.3)
 * Lightweight, self-contained telemetry probe script embedded by cross-origin targets.
 * Works seamlessly as both classic (<script src="...">) and module script.
 * Provides resilient handshake beaconing, spatial coordinate normalization,
 * tap ergonomics auditing, and privacy-compliant event forwarding.
 */

(function initLabProbeAgent() {
  if (typeof window === 'undefined' || window.self === window.top) {
    return; // Only execute when embedded inside an iframe workbench
  }

  const SCHEMA = 'lab-capture/v1';
  let activeNonce = null;
  let armed = false;
  let ackReceived = false;
  let listeners = [];

  const ALLOWED_CONTROL_KEYS = new Set([
    'Enter',
    'Escape',
    'Tab',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Space',
    'Backspace'
  ]);

  const SENSITIVE_AUTOCOMPLETE = new Set([
    'cc-number',
    'cc-exp',
    'cc-csc',
    'current-password',
    'new-password',
    'one-time-code'
  ]);

  function computeNormalizedCoords(clientX, clientY, viewportWidth, viewportHeight) {
    const w = viewportWidth || 1;
    const h = viewportHeight || 1;
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const round4 = (v) => Math.round(v * 10000) / 10000;
    return {
      nx: round4(clamp(clientX / w)),
      ny: round4(clamp(clientY / h))
    };
  }

  function deriveSelector(el) {
    if (!el || typeof el !== 'object') return '';
    const testId = el.dataset?.testid || (typeof el.getAttribute === 'function' ? el.getAttribute('data-testid') : null);
    if (testId) return `[data-testid="${testId}"]`;

    if (el.id && typeof el.id === 'string' && el.id.trim() && !el.id.includes(':')) {
      return `#${el.id.trim()}`;
    }

    const tag = (el.tagName || '').toLowerCase();
    const ariaLabel = typeof el.getAttribute === 'function' ? el.getAttribute('aria-label') : null;
    if (ariaLabel) {
      return `${tag}[aria-label="${ariaLabel}"]`;
    }

    const segments = [];
    let curr = el;
    let depth = 0;
    while (curr && depth < 5 && curr.tagName && curr.tagName !== 'BODY' && curr.tagName !== 'HTML') {
      const curTag = curr.tagName.toLowerCase();
      if (curr.id) {
        segments.unshift(`#${curr.id}`);
        break;
      }
      let index = 1;
      if (curr.parentElement && curr.parentElement.children) {
        let sibling = curr.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === curr.tagName) index++;
          sibling = sibling.previousElementSibling;
        }
      }
      segments.unshift(`${curTag}:nth-of-type(${index})`);
      curr = curr.parentElement;
      depth++;
    }
    return segments.join(' > ') || tag || '*';
  }

  function redactValue(val, attrs = {}) {
    const type = String(attrs.type || '').toLowerCase();
    const autocomplete = String(attrs.autocomplete || '').toLowerCase();
    if (type === 'password' || SENSITIVE_AUTOCOMPLETE.has(autocomplete)) {
      return '<redacted>';
    }
    return val;
  }

  function auditTapErgonomics(rect = {}, deviceProfile = {}, minTapTarget = 44) {
    const w = Math.round(rect.width || rect.w || 0);
    const h = Math.round(rect.height || rect.h || 0);
    const isCoarse = deviceProfile?.pointer === 'coarse' || window.matchMedia?.('(pointer: coarse)').matches;
    const undersized = Boolean(isCoarse && (w < minTapTarget || h < minTapTarget));
    return {
      rect: { w, h },
      undersized
    };
  }

  function normalizeKeyEvent(e) {
    if (!e || !ALLOWED_CONTROL_KEYS.has(e.key)) return null;
    return {
      type: 'key',
      key: e.key,
      code: e.code || e.key
    };
  }

  function getViewport() {
    return {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  }

  function normalizePointerEvent(e, { viewport, targetEl, targetRect }) {
    const coords = computeNormalizedCoords(
      e.clientX,
      e.clientY,
      viewport?.w || window.innerWidth,
      viewport?.h || window.innerHeight
    );
    const ergonomics = auditTapErgonomics(targetRect || (targetEl?.getBoundingClientRect?.() ?? {}));

    return {
      type: 'pointer',
      target: {
        selector: deriveSelector(targetEl),
        tag: targetEl?.tagName?.toLowerCase() || '',
        role: targetEl?.getAttribute?.('role') || undefined
      },
      pointer: {
        pointerType: e.pointerType || (window.matchMedia?.('(pointer: coarse)').matches ? 'touch' : 'mouse'),
        button: typeof e.button === 'number' ? e.button : 0
      },
      ergonomics,
      coords,
      viewport: {
        w: viewport?.w || 0,
        h: viewport?.h || 0,
        dpr: viewport?.dpr || 1,
        orientation: viewport?.orientation || 'portrait'
      }
    };
  }

  function postToParent(type, payload = {}) {
    if (!window.parent || window.parent === window) return;
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

  function attachListeners() {
    detachListeners();

    const handlePointer = (e) => {
      if (!armed) return;
      const targetEl = e.target;
      const targetRect = targetEl?.getBoundingClientRect?.();
      const vp = getViewport();
      const normalized = normalizePointerEvent(e, {
        viewport: vp,
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

  function announceHello() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          schema: SCHEMA,
          type: 'lab:hello'
        },
        '*'
      );
    }
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'lab:ping') {
      announceHello();
      return;
    }

    if (data.type === 'lab:ack') {
      ackReceived = true;
      return;
    }

    if (data.type === 'lab:arm' && typeof data.nonce === 'string') {
      ackReceived = true;
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

  // Announce presence immediately
  announceHello();

  // Retry beacon every 400ms until acknowledged (up to 20 attempts = 8s)
  let retryCount = 0;
  const retryInterval = setInterval(() => {
    if (ackReceived || retryCount++ >= 20) {
      clearInterval(retryInterval);
      return;
    }
    announceHello();
  }, 400);
})();
