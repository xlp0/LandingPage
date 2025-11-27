/**
 * CLM Iframe Loader
 * Loads components in isolated iframes based on CLM YAML registry
 * Ensures component failures don't crash the main page
 */

class CLMIframeLoader {
  constructor(registryUrl = '/api/clm/registry') {
    this.registryUrl = registryUrl;
    this.registry = null;
    this.loadedComponents = new Map();
    this.telemetryEndpoint = '/api/clm/telemetry';
  }

  /**
   * Initialize the loader by fetching the CLM registry
   */
  async init() {
    try {
      const response = await fetch(this.registryUrl);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to load CLM registry');
      }
      
      this.registry = data.registry;
      console.log('[CLM] Registry loaded:', this.registry);
      
      return this.registry;
    } catch (error) {
      console.error('[CLM] Registry load failed:', error);
      throw error;
    }
  }

  /**
   * Load a component by ID into a container
   * @param {string} componentId - Component ID from registry
   * @param {HTMLElement} container - DOM element to mount iframe
   * @param {Object} options - Additional options (height, width, etc.)
   */
  async loadComponent(componentId, container, options = {}) {
    if (!this.registry) {
      throw new Error('CLM registry not initialized. Call init() first.');
    }

    const component = this.registry.components.find(c => c.id === componentId);
    
    if (!component) {
      console.error(`[CLM] Component '${componentId}' not found in registry`);
      this.renderError(container, componentId, 'Component not found in registry');
      return null;
    }

    console.log(`[CLM] Loading component: ${component.name}`);

    // Create iframe wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'clm-component-wrapper';
    wrapper.dataset.componentId = componentId;
    wrapper.style.position = 'relative';
    wrapper.style.width = options.width || '100%';
    wrapper.style.minHeight = options.height || '200px';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = component.concrete.implementation;
    iframe.sandbox = component.concrete.sandbox || 'allow-scripts allow-same-origin';
    iframe.style.width = '100%';
    iframe.style.height = options.height || '200px';
    iframe.style.border = 'none';
    iframe.dataset.componentId = componentId;

    // Create loading indicator
    const loadingIndicator = this.createLoadingIndicator(component.name);
    wrapper.appendChild(loadingIndicator);

    // Create error boundary
    const errorBoundary = this.createErrorBoundary(componentId);
    wrapper.appendChild(errorBoundary);

    // Track load time
    const loadStart = performance.now();

    // Handle iframe load
    iframe.addEventListener('load', () => {
      const loadTime = performance.now() - loadStart;
      loadingIndicator.style.display = 'none';
      
      console.log(`[CLM] Component '${componentId}' loaded in ${loadTime.toFixed(2)}ms`);
      
      // Send telemetry
      this.sendTelemetry(componentId, 'load_success', {
        load_time_ms: loadTime,
        expected_time_ms: component.balanced.expected_load_time_ms
      });

      // Check if load time exceeds expected
      if (loadTime > component.balanced.expected_load_time_ms) {
        console.warn(`[CLM] Component '${componentId}' exceeded expected load time`);
      }
    });

    // Handle iframe error
    iframe.addEventListener('error', (error) => {
      const loadTime = performance.now() - loadStart;
      loadingIndicator.style.display = 'none';
      errorBoundary.style.display = 'block';
      
      console.error(`[CLM] Component '${componentId}' failed to load:`, error);
      
      // Send telemetry
      this.sendTelemetry(componentId, 'load_failure', {
        load_time_ms: loadTime,
        error: error.message
      });

      // Show error in boundary
      this.showError(errorBoundary, componentId, 'Failed to load component');
    });

    // Monitor iframe for crashes (using postMessage heartbeat)
    this.setupHealthMonitoring(iframe, componentId, component.balanced.expected_failure);

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    // Store reference
    this.loadedComponents.set(componentId, {
      component,
      iframe,
      wrapper,
      container
    });

    return iframe;
  }

  /**
   * Create loading indicator
   */
  createLoadingIndicator(componentName) {
    const indicator = document.createElement('div');
    indicator.className = 'clm-loading-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 8px;
      font-family: monospace;
      z-index: 1000;
    `;
    indicator.innerHTML = `
      <div style="text-align: center;">
        <div class="spinner" style="
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        "></div>
        <div>Loading ${componentName}...</div>
      </div>
    `;
    return indicator;
  }

  /**
   * Create error boundary
   */
  createErrorBoundary(componentId) {
    const boundary = document.createElement('div');
    boundary.className = 'clm-error-boundary';
    boundary.dataset.componentId = componentId;
    boundary.style.cssText = `
      display: none;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 0, 0, 0.1);
      border: 2px solid #ff0000;
      border-radius: 8px;
      padding: 20px;
      z-index: 999;
    `;
    return boundary;
  }

  /**
   * Show error in boundary
   */
  showError(boundary, componentId, message) {
    boundary.style.display = 'block';
    boundary.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 4px; font-family: monospace;">
        <h3 style="color: #ff0000; margin-top: 0;">⚠️ Component Error</h3>
        <p><strong>Component ID:</strong> ${componentId}</p>
        <p><strong>Error:</strong> ${message}</p>
        <p style="color: #666; font-size: 12px;">
          This component has failed, but the rest of the page continues to function normally.
        </p>
        <button onclick="location.reload()" style="
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        ">Reload Page</button>
      </div>
    `;
  }

  /**
   * Render error directly in container
   */
  renderError(container, componentId, message) {
    container.innerHTML = `
      <div class="clm-error" style="
        background: rgba(255, 0, 0, 0.1);
        border: 2px solid #ff0000;
        border-radius: 8px;
        padding: 20px;
        margin: 10px 0;
      ">
        <h3 style="color: #ff0000; margin-top: 0;">⚠️ Component Error</h3>
        <p><strong>Component ID:</strong> ${componentId}</p>
        <p><strong>Error:</strong> ${message}</p>
      </div>
    `;
  }

  /**
   * Setup health monitoring for iframe
   */
  setupHealthMonitoring(iframe, componentId, expectedFailure = false) {
    // Skip monitoring if failure is expected
    if (expectedFailure) {
      console.log(`[CLM] Component '${componentId}' is expected to fail - monitoring disabled`);
      return;
    }

    // Implement heartbeat monitoring via postMessage
    const healthCheckInterval = 5000; // 5 seconds
    let lastHeartbeat = Date.now();

    const checkHealth = setInterval(() => {
      const timeSinceHeartbeat = Date.now() - lastHeartbeat;
      
      if (timeSinceHeartbeat > healthCheckInterval * 2) {
        console.warn(`[CLM] Component '${componentId}' may have crashed (no heartbeat)`);
        
        this.sendTelemetry(componentId, 'health_check_failed', {
          time_since_heartbeat_ms: timeSinceHeartbeat
        });
      }
    }, healthCheckInterval);

    // Listen for heartbeat messages from iframe
    window.addEventListener('message', (event) => {
      if (event.data.type === 'clm_heartbeat' && event.data.componentId === componentId) {
        lastHeartbeat = Date.now();
      }
    });

    // Store interval for cleanup
    iframe.dataset.healthCheckInterval = checkHealth;
  }

  /**
   * Send telemetry to server
   */
  async sendTelemetry(componentId, eventType, data) {
    try {
      await fetch(this.telemetryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_id: componentId,
          event_type: eventType,
          data,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('[CLM] Telemetry send failed:', error);
    }
  }

  /**
   * Unload a component
   */
  unloadComponent(componentId) {
    const loaded = this.loadedComponents.get(componentId);
    
    if (!loaded) {
      console.warn(`[CLM] Component '${componentId}' not loaded`);
      return;
    }

    // Clear health check interval
    if (loaded.iframe.dataset.healthCheckInterval) {
      clearInterval(parseInt(loaded.iframe.dataset.healthCheckInterval));
    }

    // Remove from DOM
    loaded.wrapper.remove();

    // Remove from map
    this.loadedComponents.delete(componentId);

    console.log(`[CLM] Component '${componentId}' unloaded`);
  }

  /**
   * Load all components from registry into specified containers
   */
  async loadAll(containerMap) {
    if (!this.registry) {
      await this.init();
    }

    const loadPromises = [];

    for (const [componentId, container] of Object.entries(containerMap)) {
      loadPromises.push(
        this.loadComponent(componentId, container).catch(error => {
          console.error(`[CLM] Failed to load component '${componentId}':`, error);
        })
      );
    }

    await Promise.allSettled(loadPromises);
    console.log('[CLM] All components loaded');
  }
}

// Add CSS animation for spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Export for use
window.CLMIframeLoader = CLMIframeLoader;
