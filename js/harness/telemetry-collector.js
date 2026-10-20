/**
 * Device Telemetry Collector (SPRINT-ERB-03 §2, §4.1)
 * Audits horizontal layout overflow, frame rendering rates, layout shifts (CLS),
 * and tap target ergonomics during a recording session.
 * Zero dependencies, works inside browser iframe or probe agent.
 */

/**
 * Computes FPS statistics from an array of frame deltas (in milliseconds).
 * @param {number[]} deltas
 * @returns {{ avgFps: number, maxFrameMs: number, droppedFrames: number }}
 */
export function computeFrameStats(deltas = []) {
  if (!deltas || deltas.length === 0) {
    return { avgFps: 60.0, maxFrameMs: 16.6, droppedFrames: 0 };
  }

  const FRAME_TARGET_MS = 1000 / 60; // 16.666 ms
  let totalMs = 0;
  let maxFrameMs = 0;
  let droppedFrames = 0;

  for (const d of deltas) {
    totalMs += d;
    if (d > maxFrameMs) maxFrameMs = d;

    // Count missed frames when delta exceeds one 60Hz frame budget
    if (d > FRAME_TARGET_MS * 1.5) {
      const missed = Math.floor(d / FRAME_TARGET_MS) - 1;
      if (missed > 0) droppedFrames += missed;
    }
  }

  const avgDelta = totalMs / deltas.length;
  const avgFps = avgDelta > 0 ? Number((1000 / avgDelta).toFixed(1)) : 60.0;

  return {
    avgFps,
    maxFrameMs: Number(maxFrameMs.toFixed(1)),
    droppedFrames
  };
}

/**
 * Computes Cumulative Layout Shift (CLS) from PerformanceObserver layout-shift entries.
 * Excludes shifts with user input.
 * @param {Array<{ value: number, hadRecentInput: boolean }>} entries
 * @returns {number|null}
 */
export function computeCls(entries) {
  if (!entries || !Array.isArray(entries)) return null;

  let totalShift = 0;
  for (const entry of entries) {
    if (!entry.hadRecentInput && typeof entry.value === 'number') {
      totalShift += entry.value;
    }
  }

  return Number(totalShift.toFixed(4));
}

/**
 * Checks for horizontal layout overflow beyond viewport width.
 * @param {Document} doc
 * @param {Window} win
 * @returns {{ hasHorizontalOverflow: boolean, elements: string[] }}
 */
export function checkHorizontalOverflow(doc = (typeof document !== 'undefined' ? document : null), win = (typeof window !== 'undefined' ? window : null)) {
  if (!doc || !win) {
    return { hasHorizontalOverflow: false, elements: [] };
  }

  const root = doc.documentElement;
  const body = doc.body;
  const innerW = win.innerWidth;
  const scrollW = Math.max(root?.scrollWidth || 0, body?.scrollWidth || 0);

  const hasOverflow = scrollW > innerW + 1; // 1px tolerance for subpixel rounding
  const offendingElements = [];

  if (hasOverflow && doc.querySelectorAll) {
    const all = doc.querySelectorAll('*');
    for (let i = 0; i < all.length && offendingElements.length < 20; i++) {
      const el = all[i];
      if (el === root || el === body) continue;

      const rect = el.getBoundingClientRect();
      if (rect.right > innerW + 1 && rect.width > 0 && rect.height > 0) {
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : '';
        offendingElements.push(`${el.tagName.toLowerCase()}${id || cls}`);
      }
    }
  }

  return {
    hasHorizontalOverflow: hasOverflow,
    elements: offendingElements
  };
}

/**
 * Live Telemetry Collector session instance.
 */
export class TelemetryCollector {
  constructor(options = {}) {
    this.win = options.win || (typeof window !== 'undefined' ? window : null);
    this.doc = options.doc || (typeof document !== 'undefined' ? document : null);
    this.active = false;
    this.deltas = [];
    this.lastFrameTime = 0;
    this.rafId = null;
    this.clsEntries = [];
    this.clsObserver = null;
    this.clsSupported = true;
    this.tapViolations = 0;
    this.overflowState = { hasHorizontalOverflow: false, elements: [] };
  }

  start() {
    this.active = true;
    this.deltas = [];
    this.clsEntries = [];
    this.tapViolations = 0;
    this.lastFrameTime = 0;

    // Check initial overflow
    this.sampleOverflow();

    // Start frame loop
    if (this.win?.requestAnimationFrame) {
      const loop = (timestamp) => {
        if (!this.active) return;
        if (this.lastFrameTime > 0) {
          const delta = timestamp - this.lastFrameTime;
          if (delta > 0 && delta < 1000) {
            this.deltas.push(delta);
          }
        }
        this.lastFrameTime = timestamp;
        this.rafId = this.win.requestAnimationFrame(loop);
      };
      this.rafId = this.win.requestAnimationFrame(loop);
    }

    // Start PerformanceObserver for CLS
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.clsEntries.push(entry);
          }
        });
        this.clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        this.clsSupported = false;
      }
    } else {
      this.clsSupported = false;
    }
  }

  sampleOverflow() {
    this.overflowState = checkHorizontalOverflow(this.doc, this.win);
    return this.overflowState;
  }

  recordTapViolation() {
    this.tapViolations++;
  }

  stop() {
    this.active = false;
    if (this.rafId && this.win?.cancelAnimationFrame) {
      this.win.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.clsObserver) {
      try {
        this.clsObserver.disconnect();
      } catch {}
      this.clsObserver = null;
    }
    // Final overflow sample
    this.sampleOverflow();

    return this.summary();
  }

  summary() {
    const frameStats = computeFrameStats(this.deltas);
    const cls = this.clsSupported ? computeCls(this.clsEntries) : null;

    return {
      overflow: { ...this.overflowState },
      frames: frameStats,
      cls: cls !== null ? cls : 0,
      tapTargetViolations: this.tapViolations
    };
  }
}
