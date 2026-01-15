// Must run synchronously before any module imports
(function () {
  const { protocol, hostname, port } = window.location;
  let baseUrl = `${protocol}//${hostname}`;
  if (port && port !== '80' && port !== '443') {
    baseUrl += `:${port}`;
  }

  const vendorPath = `${baseUrl}/public/vendor`;

  const importMap = {
    imports: {
      'redux': `${vendorPath}/redux/redux.esm.js`,
      'redux-thunk': `${vendorPath}/redux/redux-thunk-esm.js`,
      'immer': `${vendorPath}/redux/immer-esm.js`,
      'reselect': `${vendorPath}/redux/reselect-esm.js`,
      '@reduxjs/toolkit': `${vendorPath}/redux/toolkit.esm.js`,
      'mcard-js': `${baseUrl}/public/js/vendor/mcard-js.bundle.js`
    }
  };

  const script = document.createElement('script');
  script.type = 'importmap';
  script.textContent = JSON.stringify(importMap, null, 2);
  document.currentScript.parentNode.insertBefore(script, document.currentScript.nextSibling);

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🌍 Auto-detected BASE_URL:', baseUrl);
    console.log('📦 Import Map:', importMap);
  }
})();
