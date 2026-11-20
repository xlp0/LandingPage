import { PresentationController } from './presentation-controller.js';
import { setIcon } from '../ui/icons.js';

function resolveController() {
  if (typeof window === 'undefined') return null;
  if (!window.__presentation_controller) {
    window.__presentation_controller = new PresentationController();
  }
  return window.__presentation_controller;
}

function resolveThemeDisplay(theme) {
  if (theme === 'light') return { label: 'Light', icon: 'sun' };
  if (theme === 'high-contrast') return { label: 'Contrast', icon: 'eye' };
  return { label: 'Dark', icon: 'moon' };
}

function resolvePowerDisplay(powerMode) {
  if (powerMode === 'energy-saving') return { label: 'Eco', icon: 'battery', pressed: true };
  return { label: 'Normal', icon: 'zap', pressed: false };
}

export function syncPresentationControls(state) {
  if (typeof document === 'undefined' || !state) return;
  const themeLabel = document.getElementById('theme-label');
  const themeIcon = document.getElementById('theme-icon');
  const powerLabel = document.getElementById('power-label');
  const powerIcon = document.getElementById('power-icon');
  const powerBtn = document.getElementById('power-toggle-btn');

  const themeDisplay = resolveThemeDisplay(state.theme);
  if (themeLabel) themeLabel.textContent = themeDisplay.label;
  if (themeIcon) setIcon(themeIcon, themeDisplay.icon);

  const powerDisplay = resolvePowerDisplay(state.powerMode);
  if (powerLabel) powerLabel.textContent = powerDisplay.label;
  if (powerIcon) setIcon(powerIcon, powerDisplay.icon);
  if (powerBtn) powerBtn.setAttribute('aria-pressed', String(powerDisplay.pressed));
}

function bindControls() {
  if (typeof document === 'undefined') return;
  const controller = resolveController();
  if (!controller) return;

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn && themeBtn.dataset.presentationBound !== 'true') {
    themeBtn.dataset.presentationBound = 'true';
    themeBtn.addEventListener('click', () => controller.toggleTheme());
  }

  const powerBtn = document.getElementById('power-toggle-btn');
  if (powerBtn && powerBtn.dataset.presentationBound !== 'true') {
    powerBtn.dataset.presentationBound = 'true';
    powerBtn.addEventListener('click', () => controller.toggleEnergySaving());
  }

  syncPresentationControls({
    theme: controller.currentTheme,
    powerMode: controller.currentPowerMode,
    animationEngine: controller.animationEngine
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  resolveController();
  if (!document.__presentationChangeBound) {
    document.__presentationChangeBound = true;
    document.addEventListener('lab:presentation-change', (ev) => {
      if (ev?.detail) syncPresentationControls(ev.detail);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  } else {
    bindControls();
  }
}
