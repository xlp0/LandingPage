/**
 * Device Presets and Device Manager UI Controller
 * Renders the single-select dimension preset list (a radiogroup of grouped rows),
 * custom device persistence UI, and modal interactions.
 */

import { aspectRatio } from './viewport-geometry.js';
import { createIconElement } from '../ui/icons.js';

const BUILTIN_CHIP_IDS = {
  'iphone-16-pro': 'btn-size-mobile',
  'ipad-air-11': 'btn-size-tablet',
  'macbook-air-13': 'btn-size-desktop',
};

export const FULL_PRESET_ID = 'btn-size-full';
export const PRESET_CATEGORY_ORDER = ['phone', 'tablet', 'desktop', 'wearable', 'custom'];
export const PRESET_CATEGORY_LABELS = {
  responsive: 'Responsive',
  phone: 'Phone',
  tablet: 'Tablet',
  desktop: 'Desktop',
  wearable: 'Wearable',
  custom: 'Custom',
};

export function chipIdFor(device) {
  return BUILTIN_CHIP_IDS[device.id] || `btn-size-${device.id}`;
}

export function formatPresetDims(device) {
  return `${device.width} × ${device.height}`;
}

export function presetTitle(device) {
  return `${device.name}, ${device.width} × ${device.height}px (${aspectRatio(device.width, device.height)})`;
}

/** Groups devices by category in a stable display order; unknown categories fall into custom. */
export function groupDevices(devices = []) {
  const buckets = new Map(PRESET_CATEGORY_ORDER.map((c) => [c, []]));
  for (const d of devices) {
    const key = buckets.has(d.category) ? d.category : 'custom';
    buckets.get(key).push(d);
  }
  return PRESET_CATEGORY_ORDER
    .filter((c) => buckets.get(c).length > 0)
    .map((c) => ({ category: c, label: PRESET_CATEGORY_LABELS[c], devices: buckets.get(c) }));
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
    : FULL_PRESET_ID;
  const cleanupFns = [];

  function listen(target, eventName, handler) {
    if (!target) return;
    target.addEventListener(eventName, handler);
    cleanupFns.push(() => target.removeEventListener(eventName, handler));
  }

  function presetRows() {
    return presetsContainer ? [...presetsContainer.querySelectorAll('.size-preset-btn')] : [];
  }

  /** Keeps the visible selection inside the list's own scroll box without scrolling the page. */
  function revealRow(row) {
    if (!presetsContainer || !row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    const viewTop = presetsContainer.scrollTop;
    const viewBottom = viewTop + presetsContainer.clientHeight;
    if (top < viewTop + 24) presetsContainer.scrollTop = Math.max(0, top - 24);
    else if (bottom > viewBottom) presetsContainer.scrollTop = bottom - presetsContainer.clientHeight;
  }

  function syncCheckedRows({ reveal = false } = {}) {
    const rows = presetRows();
    let checkedRow = null;
    for (const row of rows) {
      const checked = Boolean(activeChipId && row.id === activeChipId);
      row.classList.toggle('active', checked);
      row.setAttribute('aria-checked', String(checked));
      row.tabIndex = -1;
      if (checked) checkedRow = row;
    }
    const focusTarget = checkedRow || rows[0];
    if (focusTarget) focusTarget.tabIndex = 0;
    if (reveal && checkedRow) revealRow(checkedRow);
  }

  function markActiveChip(deviceId) {
    activeChipId = deviceId === 'full' ? FULL_PRESET_ID : deviceId ? chipIdFor({ id: deviceId }) : null;
    syncCheckedRows({ reveal: true });
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

  function applyFullPreset() {
    if (typeof stage?.selectFullViewport === 'function') {
      stage.selectFullViewport('preset');
    } else {
      stage?.setViewportSize(100, 100, '%', 'Full (100%)', null, 'preset');
    }
    markActiveChip('full');
  }

  function buildGroup(text, category) {
    const group = document.createElement('div');
    group.className = 'preset-group';
    group.setAttribute('role', 'none');
    group.dataset.category = category;
    const label = document.createElement('div');
    label.className = 'preset-group-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = text;
    group.appendChild(label);
    return group;
  }

  function buildRow({ id, name, dims, title, category, deviceId, isCustom, icon }) {
    const row = document.createElement('button');
    row.type = 'button';
    row.id = id;
    row.className = 'size-preset-btn preset-row';
    row.setAttribute('role', 'radio');
    row.setAttribute('aria-checked', 'false');
    row.tabIndex = -1;
    row.dataset.testid = id;
    row.dataset.category = category;
    if (deviceId) row.dataset.deviceId = deviceId;
    row.title = title;

    const nameEl = document.createElement('span');
    nameEl.className = 'preset-row-name';
    const leadIcon = icon ? createIconElement(icon) : null;
    if (leadIcon) nameEl.append(leadIcon);
    nameEl.append(document.createTextNode(name));
    if (isCustom) {
      const dot = document.createElement('span');
      dot.className = 'chip-custom-dot';
      dot.setAttribute('aria-hidden', 'true');
      nameEl.appendChild(dot);
    }

    const dimsEl = document.createElement('span');
    dimsEl.className = 'preset-row-dims';
    dimsEl.textContent = dims;

    const check = createIconElement('check', { className: 'preset-row-check' }) || document.createElement('span');
    check.classList.add('preset-row-check');
    row.append(nameEl, dimsEl, check);
    return row;
  }

  function renderPresets() {
    if (!presetsContainer || !registry) return;
    presetsContainer.replaceChildren();

    const responsiveGroup = buildGroup(PRESET_CATEGORY_LABELS.responsive, 'responsive');
    const full = buildRow({
      id: FULL_PRESET_ID,
      name: 'Full stage',
      dims: '100%',
      title: 'Fill the stage at 100% of its container',
      category: 'responsive',
      icon: 'maximize',
    });
    full.addEventListener('click', applyFullPreset);
    responsiveGroup.appendChild(full);
    presetsContainer.appendChild(responsiveGroup);

    for (const group of groupDevices(registry.getAll())) {
      const groupEl = buildGroup(group.label, group.category);
      for (const d of group.devices) {
        const row = buildRow({
          id: chipIdFor(d),
          name: d.name,
          dims: formatPresetDims(d),
          title: presetTitle(d),
          category: group.category,
          deviceId: d.id,
          isCustom: !d.isBuiltin,
        });
        row.addEventListener('click', () => applyDevicePreset(d));
        groupEl.appendChild(row);
      }
      presetsContainer.appendChild(groupEl);
    }

    syncCheckedRows({ reveal: true });
  }

  /** Radio-group keyboard model: arrows and Home/End move the selection and apply it. */
  function onPresetKeydown(e) {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const rows = presetRows();
    if (rows.length === 0) return;
    const current = rows.indexOf(document.activeElement);
    let next = current < 0 ? 0 : current;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (next + 1) % rows.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (next - 1 + rows.length) % rows.length;
    else if (e.key === 'Home') next = 0;
    else next = rows.length - 1;
    e.preventDefault();
    rows[next].focus();
    rows[next].click();
  }

  listen(presetsContainer, 'keydown', onPresetKeydown);

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
    applyFullPreset,
    destroy
  };
}
