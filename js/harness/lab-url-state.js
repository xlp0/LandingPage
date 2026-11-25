/**
 * Pure URL parameter codec for Responsive UI Lab state (SPRINT-DCI-03).
 *
 * Zero DOM access. Encodes and decodes: device, w, h, orientation, mode.
 */

import { DIM_MIN, DIM_MAX } from './viewport-geometry.js';

export const LAB_URL_PARAMS = Object.freeze(['device', 'w', 'h', 'orientation', 'mode']);
export const DEFAULT_WORKBENCH_MODES = Object.freeze(['explore', 'guided-spa', 'bombadil', 'verify']);
const VALID_ORIENTATIONS = new Set(['portrait', 'landscape']);

function parseWholeDim(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num < DIM_MIN || num > DIM_MAX) return null;
  return num;
}

export function parseLabUrlState(search, { deviceIds = [], modes = DEFAULT_WORKBENCH_MODES } = {}) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  const allowedDevices = deviceIds instanceof Set ? deviceIds : new Set(deviceIds || []);
  const allowedModes = modes instanceof Set ? modes : new Set(modes || []);

  const state = {};
  const issues = [];

  if (params.has('device')) {
    const rawDevice = params.get('device') ?? '';
    if (rawDevice === 'full' || allowedDevices.has(rawDevice)) {
      state.device = rawDevice;
    } else if (rawDevice !== '') {
      issues.push({ param: 'device', value: rawDevice, reason: 'unknown-value' });
    }
  }

  const hasW = params.has('w');
  const hasH = params.has('h');
  if (hasW || hasH) {
    const rawW = params.get('w') ?? '';
    const rawH = params.get('h') ?? '';
    const rawPair = `${rawW}x${rawH}`;
    if (state.device) {
      issues.push({ param: 'w', value: rawPair, reason: 'size-ignored' });
    } else {
      const parsedW = hasW ? parseWholeDim(rawW) : null;
      const parsedH = hasH ? parseWholeDim(rawH) : null;
      if (parsedW !== null && parsedH !== null) {
        state.w = parsedW;
        state.h = parsedH;
      } else {
        issues.push({ param: 'w', value: rawPair, reason: 'size-invalid' });
      }
    }
  }

  if (params.has('orientation')) {
    const rawOrientation = params.get('orientation') ?? '';
    if (VALID_ORIENTATIONS.has(rawOrientation)) {
      state.orientation = rawOrientation;
    } else if (rawOrientation !== '') {
      issues.push({ param: 'orientation', value: rawOrientation, reason: 'unknown-value' });
    }
  }

  if (params.has('mode')) {
    const rawMode = params.get('mode') ?? '';
    if (allowedModes.has(rawMode)) {
      state.mode = rawMode;
    } else if (rawMode !== '') {
      issues.push({ param: 'mode', value: rawMode, reason: 'unknown-value' });
    }
  }

  return { state, issues };
}

export function orientationIssue(geometry) {
  if (!geometry || geometry.rotatable !== false) return null;
  return {
    param: 'orientation',
    value: String(geometry.orientation ?? ''),
    reason: 'orientation-fixed'
  };
}

export function labUrlStateFromGeometry(geometry, mode = 'explore', isBuiltin = false) {
  const out = {};
  if (geometry && geometry.kind !== 'full') {
    const deviceId = geometry.deviceId || geometry.presetId;
    if (geometry.kind === 'preset' && isBuiltin && deviceId) {
      out.device = deviceId;
    } else if (Number.isFinite(geometry.width) && Number.isFinite(geometry.height)) {
      out.w = Math.round(geometry.width);
      out.h = Math.round(geometry.height);
    }
    if (geometry.rotatable === true && VALID_ORIENTATIONS.has(geometry.orientation)) {
      out.orientation = geometry.orientation;
    }
  }
  if (mode && mode !== 'explore') {
    out.mode = mode;
  }
  return out;
}

export function mergeLabUrlState(search, state = {}) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  for (const key of LAB_URL_PARAMS) {
    params.delete(key);
  }
  if (state?.device) params.set('device', String(state.device));
  if (state?.w !== undefined && state?.w !== null && state?.w !== '') params.set('w', String(state.w));
  if (state?.h !== undefined && state?.h !== null && state?.h !== '') params.set('h', String(state.h));
  if (state?.orientation) params.set('orientation', String(state.orientation));
  if (state?.mode) params.set('mode', String(state.mode));
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

export function issueSentence(issue) {
  if (!issue) return '';
  switch (issue.reason) {
    case 'unknown-value':
      return `Ignored ${issue.param} "${issue.value}". It is not an accepted value.`;
    case 'size-invalid':
      return `Ignored the size "${issue.value}". A link needs whole numbers for both w and h, each from ${DIM_MIN} to ${DIM_MAX}.`;
    case 'size-ignored':
      return 'Ignored w and h. The link also names a device.';
    case 'orientation-fixed':
      return 'Ignored the orientation. The selected size has one orientation.';
    default:
      return '';
  }
}
