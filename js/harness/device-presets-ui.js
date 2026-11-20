/**
 * Device Presets and Device Manager UI Controller
 * Manages preset chips, custom device persistence UI, and modal interactions.
 */

import { aspectRatio } from './viewport-geometry.js';
import { createIconElement } from '../ui/icons.js';

const BUILTIN_CHIP_IDS = {
  'iphone-16-pro': 'btn-size-mobile',
  'ipad-air-11': 'btn-size-tablet',
  'macbook-air-13': 'btn-size-desktop',
};

export function chipIdFor(device) {
  return BUILTIN_CHIP_IDS[device.id] || `btn-size-${device.id}`;
}


function confirmPresetDelete(name) {
  return new Promise((resolve) => {
    let dialog = document.getElementById('preset-delete-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'preset-delete-dialog';
      dialog.innerHTML = `
        <form method="dialog">
          <p id="preset-delete-message"></p>
          <div class="dialog-actions">
            <button type="submit" value="cancel" data-testid="preset-delete-cancel">Cancel</button>
            <button type="submit" value="confirm" data-testid="preset-delete-confirm" data-effect="destructive">Delete preset</button>
          </div>
        </form>`;
      document.body.appendChild(dialog);
    }
    const message = dialog.querySelector('#preset-delete-message');
    if (message) message.textContent = `Delete preset '${name}'? This action cannot be undone.`;
    const onClose = () => resolve(dialog.returnValue === 'confirm');
    dialog.addEventListener('close', onClose, { once: true });
    dialog.showModal();
  });
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
    activeChipId = deviceId === 'full' ? 'btn-size-full' : deviceId ? chipIdFor({ id: deviceId }) : null;
    presetsContainer?.querySelectorAll('.size-preset-btn').forEach((b) => {
      const pressed = Boolean(activeChipId && b.id === activeChipId);
      b.classList.toggle('active', pressed);
      b.setAttribute('aria-pressed', String(pressed));
    });
  }

  function applyDevicePreset(device) {
    if (!stage) return;
    if (typeof stage.selectDevicePreset === 'function') {
      stage.selectDevicePreset(device, 'preset');
    } else {
      const isLandscape = device.defaultOrientation === 'landscape';
      const w = isLandscape ? Math.max(device.width, device.height) : Math.min(device.width, device.height);
      const h = isLandscape ? Math.min(device.width, device.height) : Math.max(device.width, device.height);
      stage.setViewportSize(w, h, 'px', device.name, device.id, 'preset');
    }
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
      btn.dataset.testid = chipIdFor(d);
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
    full.dataset.testid = 'btn-size-full';
    full.className = 'toolbar-btn size-preset-btn';
    full.title = 'Reset to full container size (100%)';
    const fullIcon = createIconElement('maximize');
    const fullLabel = document.createElement('span');
    fullLabel.textContent = 'Full (100%)';
    if (fullIcon) full.append(fullIcon, fullLabel);
    else full.append(fullLabel);
    full.addEventListener('click', () => {
      if (typeof stage?.selectFullViewport === 'function') {
        stage.selectFullViewport('preset');
      } else {
        stage?.setViewportSize(100, 100, '%', 'Full (100%)', null, 'preset');
      }
      markActiveChip('full');
    });
    presetsContainer.appendChild(full);

    for (const chip of presetsContainer.querySelectorAll('.size-preset-btn')) {
      const isActive = Boolean(activeChipId && chip.id === activeChipId);
      chip.classList.toggle('active', isActive);
      chip.setAttribute('aria-pressed', String(isActive));
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
        const lockIcon = createIconElement('lock');
        if (lockIcon) lock.append(lockIcon, ' Built-in');
        else lock.textContent = 'Built-in';
        row.appendChild(lock);
      } else {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'dm-delete';
        del.dataset.deleteDevice = d.id;
        const trashIcon = createIconElement('trash');
        if (trashIcon) del.append(trashIcon, ' Delete');
        else del.textContent = 'Delete';
        del.dataset.testid = `preset-delete-${d.id}`;
        del.addEventListener('click', async () => {
          const confirmed = await confirmPresetDelete(d.name);
          if (confirmed) registry.remove(d.id);
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
    listen(document, 'lab:viewport-change', (e) => {
      const detail = e?.detail;
      if (!detail) return;
      if (detail.kind === 'full') markActiveChip('full');
      else if (detail.kind === 'preset' && detail.deviceId) markActiveChip(detail.deviceId);
      else markActiveChip(null);
    });
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
    const frameStyleEl = document.getElementById('select-device-frame-style');

    const wRaw = wEl?.value.trim() ?? '';
    const hRaw = hEl?.value.trim() ?? '';
    const rawFrameStyle = frameStyleEl?.value?.trim?.() || '';
    try {
      registry.add({
        name: nameEl?.value,
        category: catEl?.value,
        width: wRaw === '' ? NaN : Number(wRaw),
        height: hRaw === '' ? NaN : Number(hRaw),
        ...(rawFrameStyle ? { frameStyle: rawFrameStyle } : {})
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
      } catch { }
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
