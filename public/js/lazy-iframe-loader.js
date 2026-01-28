/**
 * Lazy Iframe Loader
 * Loads the default dashboard iframe only after page is fully loaded
 * to improve initial page load performance
 */

(function() {
  'use strict';

  function loadDefaultDashboard() {
    const defaultDashboard = document.getElementById('defaultDashboardFrame');
    
    if (defaultDashboard && defaultDashboard.hasAttribute('data-src')) {
      const src = defaultDashboard.getAttribute('data-src');
      
      // Load after a short delay to prioritize main content
      setTimeout(() => {
        console.log('[LazyLoader] Loading default dashboard iframe');
        defaultDashboard.src = src;
      }, 1000); // 1 second delay
    }
  }

  // Load default dashboard after page is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Wait for window.load to ensure all critical resources are loaded first
      window.addEventListener('load', loadDefaultDashboard);
    });
  } else if (document.readyState === 'interactive') {
    window.addEventListener('load', loadDefaultDashboard);
  } else {
    // Document already fully loaded
    loadDefaultDashboard();
  }
})();
