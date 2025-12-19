/**
 * Environment Detector
 * Automatically detects BASE_URL from browser location
 * No .env dependency - works client-side
 */

export class EnvDetector {
  /**
   * Get the base URL from current browser location
   * @returns {string} Base URL (e.g., 'http://localhost:8765', 'https://henry.pkc.pub')
   */
  static getBaseUrl() {
    const { protocol, hostname, port } = window.location;

    // Build base URL from current location
    let baseUrl = `${protocol}//${hostname}`;

    // Add port if not default (80 for http, 443 for https)
    if (port && port !== '80' && port !== '443') {
      baseUrl += `:${port}`;
    }

    return baseUrl;
  }

  /**
   * Detect environment based on hostname
   * @returns {'development' | 'staging' | 'production'}
   */
  static getEnvironment() {
    const { hostname } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }

    if (hostname.includes('dev.pkc.pub')) {
      return 'staging';
    }

    // henry.pkc.pub, ben.pkc.pub, etc.
    if (hostname.includes('.pkc.pub')) {
      return 'production';
    }

    // Default to production for unknown domains
    return 'production';
  }

  /**
   * Get CSS path for current environment
   * @returns {string} CSS directory path
   */
  static getCssPath() {
    return `${this.getBaseUrl()}/public/css`;
  }

  /**
   * Get vendor path for current environment
   * @returns {string} Vendor directory path
   */
  static getVendorPath() {
    return `${this.getBaseUrl()}/public/vendor`;
  }

  /**
   * Get full URL for a CSS file
   * @param {string} filename - CSS filename (e.g., 'main.css')
   * @returns {string} Full CSS URL
   */
  static getCssUrl(filename) {
    return `${this.getCssPath()}/${filename}`;
  }

  /**
   * Get full URL for a vendor library
   * @param {string} vendor - Vendor name (e.g., 'lucide', 'redux')
   * @param {string} filename - File name (e.g., 'lucide.min.js')
   * @returns {string} Full vendor URL
   */
  static getVendorUrl(vendor, filename) {
    return `${this.getVendorPath()}/${vendor}/${filename}`;
  }

  /**
   * Get WebSocket URL based on current protocol
   * @param {string} path - WebSocket path (default: '/ws/')
   * @returns {string} WebSocket URL
   */
  static getWebSocketUrl(path = '/ws/') {
    const { protocol, hostname, port } = window.location;

    // Use wss:// for HTTPS, ws:// for HTTP
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

    let wsUrl = `${wsProtocol}//${hostname}`;

    // Add port if not default
    if (port && port !== '80' && port !== '443') {
      wsUrl += `:${port}`;
    }

    wsUrl += path;

    return wsUrl;
  }

  /**
   * Get configuration object for current environment
   * @returns {Object} Configuration object
   */
  static getConfig() {
    return {
      baseUrl: this.getBaseUrl(),
      environment: this.getEnvironment(),
      cssPath: this.getCssPath(),
      vendorPath: this.getVendorPath(),
      websocketUrl: this.getWebSocketUrl(),
      isProduction: this.getEnvironment() === 'production',
      isDevelopment: this.getEnvironment() === 'development',
      isStaging: this.getEnvironment() === 'staging',
    };
  }

  /**
   * Log current environment configuration
   */
  static logConfig() {
    const config = this.getConfig();
    console.group('🌍 Environment Configuration');
    console.log('Base URL:', config.baseUrl);
    console.log('Environment:', config.environment);
    console.log('CSS Path:', config.cssPath);
    console.log('Vendor Path:', config.vendorPath);
    console.log('WebSocket URL:', config.websocketUrl);
    console.groupEnd();
  }

  /**
   * Generate import map for ES modules
   * @returns {Object} Import map object
   */
  static generateImportMap() {
    const vendorPath = this.getVendorPath();

    return {
      imports: {
        'redux': `${vendorPath}/redux/redux.esm.js`,
        'redux-thunk': `${vendorPath}/redux/redux-thunk.esm.js`,
        'immer': `${vendorPath}/redux/immer.esm.js`,
        'reselect': `${vendorPath}/redux/reselect.esm.js`,
        '@reduxjs/toolkit': `${vendorPath}/redux/toolkit.esm.js`,
        'mcard-js': '/public/js/vendor/mcard-js.bundle.js'
      }
    };
  }

  /**
   * Inject import map into document
   */
  static injectImportMap() {
    const importMap = this.generateImportMap();
    const script = document.createElement('script');
    script.type = 'importmap';
    script.textContent = JSON.stringify(importMap, null, 2);
    document.head.insertBefore(script, document.head.firstChild);
  }

  /**
   * Load CSS dynamically
   * @param {string} filename - CSS filename
   * @param {string} id - Optional element ID
   * @returns {Promise<void>}
   */
  static loadCSS(filename, id = null) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (id && document.getElementById(id)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = this.getCssUrl(filename);
      if (id) link.id = id;

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load CSS: ${filename}`));

      document.head.appendChild(link);
    });
  }

  /**
   * Load vendor script dynamically
   * @param {string} vendor - Vendor name
   * @param {string} filename - Script filename
   * @param {string} id - Optional element ID
   * @returns {Promise<void>}
   */
  static loadVendorScript(vendor, filename, id = null) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (id && document.getElementById(id)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = this.getVendorUrl(vendor, filename);
      if (id) script.id = id;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${vendor}/${filename}`));

      document.head.appendChild(script);
    });
  }
}

// Export singleton instance
export default EnvDetector;

// Auto-log config in development
if (EnvDetector.getEnvironment() === 'development') {
  EnvDetector.logConfig();
}
