/**
 * Auto Import Map Generator
 * Automatically generates import map based on current URL
 * Usage: <script type="module" src="/js/config/auto-import-map.js"></script>
 */

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
    'redux-thunk': `${vendorPath}/redux/redux-thunk.esm.js`,
    'immer': `${vendorPath}/redux/immer.esm.js`,
    'reselect': `${vendorPath}/redux/reselect.esm.js`,
    '@reduxjs/toolkit': `${vendorPath}/redux/toolkit.esm.js`,
    'mcard-js': '/js/vendor/mcard-js.bundle.js'
  }
};

// Inject import map
const script = document.createElement('script');
script.type = 'importmap';
script.textContent = JSON.stringify(importMap, null, 2);
document.head.insertBefore(script, document.head.firstChild);

// Log in development
if (hostname === 'localhost' || hostname === '127.0.0.1') {
  console.log('🌍 Auto-detected BASE_URL:', baseUrl);
  console.log('📦 Import Map:', importMap);
}
