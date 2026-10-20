/**
 * Same-Origin Capture Source (SPRINT-ERB-02 §4.1)
 * Captures interactions from an iframe with the same origin using DOM event listeners.
 */

import {
  normalizePointerEvent,
  normalizeKeyEvent,
  redactValue,
  computeNormalizedCoords
} from './normalize-event.js';

export class CaptureSameOriginSource {
  constructor(options = {}) {
    this.iframe = options.iframe || document.getElementById('mission-control-iframe');
    this.getDeviceProfile = options.getDeviceProfile || (() => null);
    this.getViewport = options.getViewport || (() => ({ w: window.innerWidth, h: window.innerHeight, dpr: 1, orientation: 'portrait' }));
    this.kind = 'same-origin';
    this._onEvent = null;
    this._listeners = [];
    this._received = 0;
    this._scrollRafPending = false;
  }

  attach(onEvent) {
    this._onEvent = onEvent;
    const doc = this.iframe?.contentDocument;
    const win = this.iframe?.contentWindow;
    if (!doc || !win) return;

    const handlePointer = (e) => {
      if (!this._onEvent) return;
      const targetEl = e.target;
      const targetRect = targetEl?.getBoundingClientRect?.();
      const vp = {
        w: win.innerWidth,
        h: win.innerHeight,
        dpr: win.devicePixelRatio || 1,
        orientation: win.innerWidth > win.innerHeight ? 'landscape' : 'portrait'
      };
      const normalized = normalizePointerEvent(e, {
        viewport: vp,
        deviceProfile: this.getDeviceProfile(),
        targetEl,
        targetRect
      });
      this._received++;
      this._onEvent(normalized);
    };

    const handleKey = (e) => {
      if (!this._onEvent) return;
      const normKey = normalizeKeyEvent(e);
      if (normKey) {
        this._received++;
        this._onEvent({
          ...normKey,
          viewport: this.getViewport()
        });
      }
    };

    const handleInput = (e) => {
      if (!this._onEvent) return;
      const target = e.target;
      const val = redactValue(target.value, {
        type: target.type,
        autocomplete: target.autocomplete
      });
      this._received++;
      this._onEvent({
        type: 'input',
        value: val,
        target: {
          selector: target.id ? `#${target.id}` : (target.name ? `[name="${target.name}"]` : target.tagName.toLowerCase()),
          tag: target.tagName.toLowerCase()
        },
        viewport: this.getViewport()
      });
    };

    const handleScroll = () => {
      if (this._scrollRafPending || !this._onEvent) return;
      this._scrollRafPending = true;
      win.requestAnimationFrame(() => {
        this._scrollRafPending = false;
        if (!this._onEvent) return;
        this._received++;
        this._onEvent({
          type: 'scroll',
          scroll: {
            x: win.scrollX || doc.documentElement.scrollLeft || 0,
            y: win.scrollY || doc.documentElement.scrollTop || 0,
            docW: doc.documentElement.scrollWidth,
            docH: doc.documentElement.scrollHeight
          },
          viewport: this.getViewport()
        });
      });
    };

    doc.addEventListener('click', handlePointer, { capture: true, passive: true });
    doc.addEventListener('keydown', handleKey, { capture: true, passive: true });
    doc.addEventListener('input', handleInput, { capture: true, passive: true });
    win.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    this._listeners = [
      () => doc.removeEventListener('click', handlePointer, { capture: true }),
      () => doc.removeEventListener('keydown', handleKey, { capture: true }),
      () => doc.removeEventListener('input', handleInput, { capture: true }),
      () => win.removeEventListener('scroll', handleScroll, { capture: true })
    ];
  }

  detach() {
    this._onEvent = null;
    for (const unsub of this._listeners) {
      try {
        unsub();
      } catch {}
    }
    this._listeners = [];
  }

  stats() {
    return {
      received: this._received,
      rejected: 0,
      rejectReasons: {}
    };
  }
}
