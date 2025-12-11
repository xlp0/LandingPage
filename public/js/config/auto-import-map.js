/**
 * Auto Import Map Generator
 * Automatically generates import map based on current URL
 * 
 * Usage: <script src="/js/config/auto-import-map.js"></script>
 * 
 * IMPORTANT: Must be loaded as regular script (NOT type="module")
 * to ensure synchronous execution before any module imports
 */

(function() {
  // Get base URL from current location
  const { protocol, hostname, port } = window.location;
  let baseUrl = `${protocol}//${hostname}`;
  if (port && port !== '80' && port !== '443') {
    baseUrl += `:${port}`;
  }

  const vendorPath = `${baseUrl}/vendor`;

  // Generate import map
  const importMap = {
    imports: {
      'redux': `${vendorPath}/redux/redux.esm.js`,
      'redux-thunk': `${vendorPath}/redux/redux-thunk-esm.js`,
      'immer': `${vendorPath}/redux/immer-esm.js`,
      'reselect': `${vendorPath}/redux/reselect-esm.js`,
      '@reduxjs/toolkit': `${vendorPath}/redux/toolkit.esm.js`,
      'mcard-js': `${baseUrl}/js/vendor/mcard-js/index.js`
    }
  };

  // Inject import map immediately after this script
  const script = document.createElement('script');
  script.type = 'importmap';
  script.textContent = JSON.stringify(importMap, null, 2);
  document.currentScript.parentNode.insertBefore(script, document.currentScript.nextSibling);

  // Log in development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🌍 Auto-detected BASE_URL:', baseUrl);
    console.log('📦 Import Map:', importMap);
  }
  
  // Make config available globally
  window.ENV_CONFIG = {
    baseUrl,
    vendorPath,
    cssPath: `${baseUrl}/css`,
    environment: hostname === 'localhost' || hostname === '127.0.0.1' ? 'development' 
                : hostname.includes('dev.pkc.pub') ? 'staging' 
                : 'production'
  };
})();
