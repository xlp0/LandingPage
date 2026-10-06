/**
 * UIComponents — reimplemented on the published clm-kernel (INV-CDO-33).
 *
 * Replaces the former mcard-js-backed module. It carries no MCard logic: the
 * content-type work is delegated to the kernel's detectors through the compat
 * layer, and the rest is presentation.
 */
import { ContentTypeInterpreter } from './compat.js';

export class UIComponents {
  static showToast(message, type = 'info', duration = 3000) {
    let host = document.getElementById('toast-container');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-container';
      document.body.appendChild(host);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = String(message);
    host.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
    return toast;
  }

  static formatGTime(gtime) {
    const iso = typeof gtime === 'string' ? gtime : gtime?.toISOString?.();
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  }

  static contentTypeBadge(content) {
    return ContentTypeInterpreter.detect(content);
  }

  static escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
