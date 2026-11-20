// Must run synchronously before any module imports
(function () {
  const { protocol, hostname, port } = window.location;
  let baseUrl = `${protocol}//${hostname}`;
  if (port && port !== '80' && port !== '443') {
    baseUrl += `:${port}`;
  }

  const importMap = {
    imports: {}
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
