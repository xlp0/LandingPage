/**
 * Device Presets and Device Manager UI Controller
 * Manages preset chips, custom device persistence UI, and modal interactions.
 */

import { aspectRatio } from './viewport-geometry.js';

const BUILTIN_CHIP_IDS = {
  'iphone-16-pro': 'btn-size-mobile',
  'ipad-air-11': 'btn-size-tablet',
  'macbook-air-13': 'btn-size-desktop',
};

export function chipIdFor(device) {
  return BUILTIN_CHIP_IDS[device.id] || `btn-size-${device.id}`;
}

export function initDevicePresetsUI(options = {}) {
  const {
    registry,
    stage,
    presetsContainer = typeof document !== 'undefined' ? document.getElementById('device-presets-container') : null,
    managerModal = typeof document !== 'undefined' ? document.getElementById('device-manager-modal') : null,
    managerList = typeof document !== 'undefined' ? document.getElementById('device-manager-list') : null,
    deviceForm = typeof document !== 'undefined' ? document.getElementById('device-form') : null,
    deviceFormError = typeof document !== 'undefined' ? document.getElementById('device-form-error') : null
  } = options;

  let activeChipId = stage?.getGeometry?.()?.deviceId
    ? chipIdFor({ id: stage.getGeometry().deviceId })
    : 'btn-size-full';
  const cleanupFns = [];

  function listen(target, eventName, handler) {
    if (!target) return;
    target.addEventListener(eventName, handler);
    cleanupFns.push(() => target.removeEventListener(eventName, handler));
  }

  function markActiveChip(deviceId) {
    activeChipId = deviceId ? chipIdFor({ id: deviceId }) : null;
    presetsContainer?.querySelectorAll('.size-preset-btn').forEach((b) => {
      b.classList.toggle('active', b.id === activeChipId);
    });
  }

  function applyDevicePreset(device) {
    if (!stage) return;
    const geom = stage.getGeometry();
    const isLandscape = geom.internalOrientation === 'horizontal';
    const w = isLandscape ? device.height : device.width;
    const h = isLandscape ? device.width : device.height;
    stage.setViewportSize(w, h, 'px', device.name, device.id, 'preset');
    markActiveChip(device.id);
  }

  function renderPresets() {
    if (!presetsContainer || !registry) return;
    const devices = registry.getAll();
    presetsContainer.replaceChildren();

    for (const d of devices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = chipIdFor(d);
      btn.className = 'toolbar-btn size-preset-btn';
      btn.dataset.deviceId = d.id;
      btn.title = `${d.name} — ${d.width} × ${d.height}px (${aspectRatio(d.width, d.height)})`;
      btn.innerHTML = `<span>${d.name} (${d.width}px)</span>`;

      if (!d.isBuiltin) {
        const dot = document.createElement('span');
        dot.className = 'chip-custom-dot';
        dot.setAttribute('aria-hidden', 'true');
        btn.appendChild(dot);
      }

      btn.addEventListener('click', () => applyDevicePreset(d));
      presetsContainer.appendChild(btn);
    }

    const full = document.createElement('button');
    full.type = 'button';
    full.id = 'btn-size-full';
    full.className = 'toolbar-btn size-preset-btn';
    full.title = 'Reset to full container size (100%)';
    full.innerHTML = '<span>↔ Full (100%)</span>';
    full.addEventListener('click', () => {
      stage?.setViewportSize(100, 100, '%', 'Full (100%)', null, 'preset');
      markActiveChip(null);
      full.classList.add('active');
    });
    presetsContainer.appendChild(full);

    if (activeChipId) {
      presetsContainer.querySelector(`#${CSS.escape(activeChipId)}`)?.classList.add('active');
    }
  }

  function renderManagerList() {
    if (!managerList || !registry) return;
    managerList.replaceChildren();
    for (const d of registry.getAll()) {
      const row = document.createElement('div');
      row.className = 'dm-row';
      row.setAttribute('role', 'listitem');

      const name = document.createElement('span');
      name.className = 'dm-row-name';
      name.textContent = d.name;

      const dims = document.createElement('span');
      dims.className = 'dm-row-dims';
      dims.textContent = `${d.width} × ${d.height} px (${aspectRatio(d.width, d.height)})`;

      row.append(name, dims);

      if (d.isBuiltin) {
        const lock = document.createElement('span');
        lock.className = 'dm-lock';
        lock.textContent = 'Built-in 🔒';
        row.appendChild(lock);
      } else {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'dm-delete';
        del.dataset.deleteDevice = d.id;
        del.textContent = '🗑️ Delete';
        del.addEventListener('click', () => {
          if (!window.confirm(`Delete preset '${d.name}'? This action cannot be undone.`)) return;
          registry.remove(d.id);
        });
        row.appendChild(del);
      }
      managerList.appendChild(row);
    }
  }

  function openDeviceManager() {
    if (!managerModal) return;
    renderManagerList();
    managerModal.classList.add('open');
    document.getElementById('input-device-name')?.focus();
  }

  function closeDeviceManager() {
    managerModal?.classList.remove('open');
    if (deviceFormError) deviceFormError.textContent = '';
  }

  if (typeof document !== 'undefined') {
    listen(document.getElementById('btn-open-device-manager'), 'click', openDeviceManager);
    listen(document.getElementById('btn-close-modal'), 'click', closeDeviceManager);
    listen(document.getElementById('btn-close-modal-footer'), 'click', closeDeviceManager);
    listen(document, 'keydown', (e) => {
      if (e.key === 'Escape' && managerModal?.classList.contains('open')) closeDeviceManager();
    });
    listen(document.getElementById('btn-reset-devices'), 'click', () => registry?.resetToDefaults());
  }

  listen(managerModal, 'click', (e) => {
    if (e.target === managerModal) closeDeviceManager();
  });

  listen(deviceForm, 'submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('input-device-name');
    const catEl = document.getElementById('select-device-category');
    const wEl = document.getElementById('input-device-width');
    const hEl = document.getElementById('input-device-height');

    const wRaw = wEl?.value.trim() ?? '';
    const hRaw = hEl?.value.trim() ?? '';
    try {
      registry.add({
        name: nameEl?.value,
        category: catEl?.value,
        width: wRaw === '' ? NaN : Number(wRaw),
        height: hRaw === '' ? NaN : Number(hRaw),
      });
      deviceForm.reset();
      if (deviceFormError) deviceFormError.textContent = '';
    } catch (err) {
      if (deviceFormError) deviceFormError.textContent = err.message;
    }
  });

  if (registry) {
    const unsub = registry.subscribe((event) => {
      renderPresets();
      renderManagerList();
      if (event === 'reset') markActiveChip(null);
    });
    cleanupFns.push(unsub);
  }

  function destroy() {
    while (cleanupFns.length > 0) {
      const fn = cleanupFns.pop();
      try {
        fn();
      } catch {}
    }
  }

  return {
    renderPresets,
    renderManagerList,
    openDeviceManager,
    closeDeviceManager,
    markActiveChip,
    applyDevicePreset,
    destroy
  };
}
