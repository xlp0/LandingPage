/**
 * Performance Monitoring for MCard Manager PWA
 * Tracks and logs loading performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.init();
  }

  init() {
    if ('performance' in window) {
      // Wait for page load to complete
      window.addEventListener('load', () => {
        setTimeout(() => this.collectMetrics(), 0);
      });
    }
  }

  collectMetrics() {
    const perfData = window.performance;
    const navigation = perfData.getEntriesByType('navigation')[0];
    const paint = perfData.getEntriesByType('paint');

    if (!navigation) {
      console.warn('[Performance] Navigation timing not available');
      return;
    }

    // Core Web Vitals and Performance Metrics
    this.metrics = {
      // Page Load Metrics
      dns: this.round(navigation.domainLookupEnd - navigation.domainLookupStart),
      tcp: this.round(navigation.connectEnd - navigation.connectStart),
      request: this.round(navigation.responseStart - navigation.requestStart),
      response: this.round(navigation.responseEnd - navigation.responseStart),
      dom: this.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
      load: this.round(navigation.loadEventEnd - navigation.loadEventStart),
      
      // Total Times
      domReady: this.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
      windowLoad: this.round(navigation.loadEventEnd - navigation.fetchStart),
      
      // Paint Metrics
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      
      // Cache Status
      cacheHit: navigation.transferSize === 0,
      transferSize: this.formatBytes(navigation.transferSize),
      
      // Connection
      connectionType: this.getConnectionType()
    };

    // Get Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // Get First Input Delay (FID)
    this.observeFID();
    
    // Get Cumulative Layout Shift (CLS)
    this.observeCLS();

    // Log results
    this.logMetrics();
  }

  observeLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.largestContentfulPaint = this.round(lastEntry.startTime);
          this.checkWebVitals();
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('[Performance] LCP observation failed:', e);
      }
    }
  }

  observeFID() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.metrics.firstInputDelay = this.round(entry.processingStart - entry.startTime);
            this.checkWebVitals();
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('[Performance] FID observation failed:', e);
      }
    }
  }

  observeCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.cumulativeLayoutShift = this.round(clsValue, 4);
              this.checkWebVitals();
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('[Performance] CLS observation failed:', e);
      }
    }
  }

  checkWebVitals() {
    const { largestContentfulPaint, firstInputDelay, cumulativeLayoutShift } = this.metrics;
    
    if (largestContentfulPaint && firstInputDelay && cumulativeLayoutShift !== undefined) {
      this.metrics.webVitalsScore = this.calculateWebVitalsScore();
      this.logWebVitals();
    }
  }

  calculateWebVitalsScore() {
    const { largestContentfulPaint, firstInputDelay, cumulativeLayoutShift } = this.metrics;
    
    // Scoring based on Google's thresholds
    const lcpScore = largestContentfulPaint < 2500 ? 'good' : largestContentfulPaint < 4000 ? 'needs-improvement' : 'poor';
    const fidScore = firstInputDelay < 100 ? 'good' : firstInputDelay < 300 ? 'needs-improvement' : 'poor';
    const clsScore = cumulativeLayoutShift < 0.1 ? 'good' : cumulativeLayoutShift < 0.25 ? 'needs-improvement' : 'poor';
    
    return { lcp: lcpScore, fid: fidScore, cls: clsScore };
  }

  getConnectionType() {
    if ('connection' in navigator) {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return {
        effectiveType: conn?.effectiveType || 'unknown',
        downlink: conn?.downlink || 'unknown',
        rtt: conn?.rtt || 'unknown',
        saveData: conn?.saveData || false
      };
    }
    return 'unknown';
  }

  round(value, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes (cached)';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  logMetrics() {
    console.group('📊 Performance Metrics');
    console.log('⏱️  Page Load Times:');
    console.log(`   DNS Lookup: ${this.metrics.dns}ms`);
    console.log(`   TCP Connection: ${this.metrics.tcp}ms`);
    console.log(`   Request: ${this.metrics.request}ms`);
    console.log(`   Response: ${this.metrics.response}ms`);
    console.log(`   DOM Processing: ${this.metrics.dom}ms`);
    console.log(`   Load Event: ${this.metrics.load}ms`);
    console.log('');
    console.log('🎯 Key Metrics:');
    console.log(`   DOM Ready: ${this.metrics.domReady}ms`);
    console.log(`   Window Load: ${this.metrics.windowLoad}ms`);
    console.log(`   First Paint: ${this.round(this.metrics.firstPaint)}ms`);
    console.log(`   First Contentful Paint: ${this.round(this.metrics.firstContentfulPaint)}ms`);
    console.log('');
    console.log('💾 Cache:');
    console.log(`   Cache Hit: ${this.metrics.cacheHit ? '✅ YES (instant load!)' : '❌ NO'}`);
    console.log(`   Transfer Size: ${this.metrics.transferSize}`);
    console.log('');
    console.log('🌐 Connection:');
    console.log(`   Type: ${this.metrics.connectionType.effectiveType || 'unknown'}`);
    console.groupEnd();
  }

  logWebVitals() {
    const { largestContentfulPaint, firstInputDelay, cumulativeLayoutShift, webVitalsScore } = this.metrics;
    
    console.group('🎯 Core Web Vitals');
    console.log(`LCP (Largest Contentful Paint): ${this.round(largestContentfulPaint)}ms [${webVitalsScore.lcp}]`);
    console.log(`   Target: < 2.5s (good), < 4s (needs improvement)`);
    console.log('');
    console.log(`FID (First Input Delay): ${this.round(firstInputDelay)}ms [${webVitalsScore.fid}]`);
    console.log(`   Target: < 100ms (good), < 300ms (needs improvement)`);
    console.log('');
    console.log(`CLS (Cumulative Layout Shift): ${this.round(cumulativeLayoutShift, 4)} [${webVitalsScore.cls}]`);
    console.log(`   Target: < 0.1 (good), < 0.25 (needs improvement)`);
    console.groupEnd();
  }

  // Public method to get metrics
  getMetrics() {
    return this.metrics;
  }

  // Check if PWA is running from cache
  isPWACached() {
    return this.metrics.cacheHit;
  }

  // Get load time category
  getLoadTimeCategory() {
    const loadTime = this.metrics.windowLoad;
    if (loadTime < 1000) return 'excellent';
    if (loadTime < 2000) return 'good';
    if (loadTime < 3000) return 'fair';
    return 'poor';
  }
}

// Auto-initialize
const performanceMonitor = new PerformanceMonitor();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}

// Make available globally
window.performanceMonitor = performanceMonitor;
