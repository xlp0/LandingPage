/**
 * Grafana Faro Observability Collector for Deployment Units
 * Connects frontend telemetry to Grafana via Faro Web SDK.
 * Binds every trace and metric to the active Type Lattice coordinate.
 */

export class FaroDeploymentUnitCollector {
  constructor(config = {}) {
    this.appName = config.appName || 'landing-page-deployment-unit';
    this.appVersion = config.appVersion || '1.0.0';
    this.collectorUrl = config.collectorUrl || (window.FARO_COLLECTOR_URL || 'http://localhost:12347/collect');
    this.latticeCoordinate = {};
    this.initialized = false;
    this.queue = [];

    this.init();
  }

  init() {
    console.info(`[FaroCollector] Initializing Grafana Faro for ${this.appName} (v${this.appVersion})`);

    // Capture initial Web Vitals & Error listener
    window.addEventListener('error', (event) => {
      this.pushError(event.error || new Error(event.message));
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.pushError(event.reason || new Error('Unhandled Promise Rejection'));
    });

    // Record Web Vitals if PerformanceObserver available
    if (typeof PerformanceObserver === 'function') {
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.pushMeasurement('web_vitals_lcp', entry.startTime);
            }
            if (entry.entryType === 'first-input') {
              this.pushMeasurement('web_vitals_fid', entry.processingStart - entry.startTime);
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              this.pushMeasurement('web_vitals_cls', entry.value);
            }
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        observer.observe({ type: 'first-input', buffered: true });
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch (err) {
        // Fallback for browsers that do not support buffered entryTypes
      }
    }

    this.initialized = true;
  }

  /**
   * Updates the active Type Lattice coordinate tagged on all future telemetry events.
   */
  setLatticeCoordinate(coord = {}) {
    this.latticeCoordinate = {
      platform: coord.platform || 'web',
      form_factor: coord.form_factor || (window.innerWidth < 768 ? 'mobile' : 'desktop'),
      orientation: coord.orientation || (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
      locale: coord.locale || (document.documentElement.lang || 'en-US'),
      display_mode: coord.theme || document.documentElement.getAttribute('data-theme') || 'dark',
      power_mode: coord.powerMode || document.documentElement.getAttribute('data-power-mode') || 'balanced',
      styling_engine: coord.styling_engine || 'semantic_tokens_css',
      animation_engine: coord.animation_engine || 'waapi',
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      pixel_ratio: window.devicePixelRatio || 1
    };

    this.pushEvent('lattice_coordinate_synchronized', this.latticeCoordinate);
  }

  getLatticeCoordinate() {
    return { ...this.latticeCoordinate };
  }

  setFiberCoordinate(coord = {}) {
    this.fiberCoordinate = {
      kind: coord.kind || null,
      shape: coord.shape || null,
      position: coord.position || 'covered',
      fallback: Boolean(coord.fallback),
      subsumed: Boolean(coord.subsumed),
      mount_point: coord.mount_point || null,
    };
    this.pushEvent('fiber_coordinate_synchronized', { fiber: this.fiberCoordinate });
  }

  getFiberCoordinate() {
    return this.fiberCoordinate ? { ...this.fiberCoordinate } : null;
  }

  pushMeasurement(name, value, fiber = null) {
    const fiberCoord = fiber || this.fiberCoordinate || null;
    const payload = {
      type: 'measurement',
      name,
      value,
      lattice: this.latticeCoordinate,
      fiber: fiberCoord,
      timestamp: new Date().toISOString()
    };
    this._dispatch(payload);
  }

  pushEvent(eventName, attributes = {}, fiber = null) {
    const fiberCoord = fiber || attributes.fiber || this.fiberCoordinate || null;
    const payload = {
      type: 'event',
      name: eventName,
      attributes: {
        ...this.latticeCoordinate,
        ...(fiberCoord ? { fiber_kind: fiberCoord.kind, fiber_position: fiberCoord.position } : {}),
        ...attributes
      },
      fiber: fiberCoord,
      timestamp: new Date().toISOString()
    };
    this._dispatch(payload);
  }

  pushError(error, fiber = null) {
    const fiberCoord = fiber || this.fiberCoordinate || null;
    const payload = {
      type: 'exception',
      value: error.message,
      stacktrace: error.stack,
      lattice: this.latticeCoordinate,
      fiber: fiberCoord,
      timestamp: new Date().toISOString()
    };
    this._dispatch(payload);
  }

  _dispatch(data) {
    if (window.faro && typeof window.faro.api === 'object') {
      if (data.type === 'measurement') window.faro.api.pushMeasurement({ type: data.name, values: { val: data.value } });
      if (data.type === 'event') window.faro.api.pushEvent(data.name, data.attributes);
      if (data.type === 'exception') window.faro.api.pushError(new Error(data.value));
      return;
    }

    // Direct HTTP POST to Faro Receiver if window.faro SDK script isn't loaded
    if (this.collectorUrl) {
      try {
        fetch(this.collectorUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app: { name: this.appName, version: this.appVersion },
            ...data
          }),
          keepalive: true
        }).catch(() => {
          // Collector unreachable: buffer in memory
          this.queue.push(data);
          if (this.queue.length > 50) this.queue.shift();
        });
      } catch (err) {}
    }
  }
}
