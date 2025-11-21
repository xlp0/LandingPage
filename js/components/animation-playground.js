(function () {
  function loadScriptOnce(src, globalName) {
    return new Promise((resolve, reject) => {
      if (globalName && typeof window[globalName] !== 'undefined') return resolve();

      const existing = document.querySelector('script[data-src="' + src + '"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)), { once: true });
        return;
      }

      const s = document.createElement('script');
      s.src = src;
      s.dataset.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  async function mount(root) {
    if (!root) return;

    // Load dependencies lazily
    await loadScriptOnce('js/vendor/anime.min.js', 'anime');
    await loadScriptOnce('js/vendor/tailwind.js');

    const tmpl = document.getElementById('animation-playground-template');
    if (!tmpl) return;
    root.innerHTML = tmpl.innerHTML;

    const rotXInput = root.querySelector('#ap-rot-x');
    const rotYInput = root.querySelector('#ap-rot-y');
    const rotZInput = root.querySelector('#ap-rot-z');
    const scaleInput = root.querySelector('#ap-scale');
    const cube = root.querySelector('#ap-cube');

    const rotXValue = root.querySelector('#ap-rot-x-value');
    const rotYValue = root.querySelector('#ap-rot-y-value');
    const rotZValue = root.querySelector('#ap-rot-z-value');
    const scaleValue = root.querySelector('#ap-scale-value');

    if (rotXInput && rotXValue) {
      rotXInput.addEventListener('input', () => {
        rotXValue.textContent = rotXInput.value + '°';
      });
    }

    if (rotYInput && rotYValue) {
      rotYInput.addEventListener('input', () => {
        rotYValue.textContent = rotYInput.value + '°';
      });
    }

    if (rotZInput && rotZValue) {
      rotZInput.addEventListener('input', () => {
        rotZValue.textContent = rotZInput.value + '°';
      });
    }

    if (scaleInput && scaleValue) {
      scaleInput.addEventListener('input', () => {
        scaleValue.textContent = Number(scaleInput.value).toFixed(1) + '×';
      });
    }

    function updateCube() {
      if (typeof window.anime !== 'function' || !cube) return;

      const rotX = rotXInput ? parseInt(rotXInput.value, 10) || 0 : 0;
      const rotY = rotYInput ? parseInt(rotYInput.value, 10) || 0 : 0;
      const rotZ = rotZInput ? parseInt(rotZInput.value, 10) || 0 : 0;
      const scale = scaleInput ? parseFloat(scaleInput.value) || 1 : 1;

      anime({
        targets: cube,
        rotateX: rotX,
        rotateY: rotY,
        rotateZ: rotZ,
        scale,
        duration: 400,
        easing: 'easeOutQuad'
      });
    }

    if (cube && rotXInput && rotYInput && rotZInput && scaleInput) {
      updateCube();
      rotXInput.addEventListener('input', updateCube);
      rotYInput.addEventListener('input', updateCube);
      rotZInput.addEventListener('input', updateCube);
      scaleInput.addEventListener('input', updateCube);
    }
  }

  window.PKCAnimationPlayground = { mount };
})();
