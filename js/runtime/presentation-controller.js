/**
 * PresentationController (Framework-Agnostic Display & Power Engine)
 * Manages Display Modes (Light/Dark/High-Contrast) and Power Modes (Performance/Energy-Saving)
 * Exposes a pluggable animation adapter interface (WAAPI vs Anime.js).
 */

export class PresentationController {
  constructor(options = {}) {
    this.storageKeyTheme = options.storageKeyTheme || 'govtech_display_theme';
    this.storageKeyPower = options.storageKeyPower || 'govtech_power_mode';
    this.animationEngine = options.animationEngine || 'waapi';
    this.onStateChange = options.onStateChange || null;

    this.currentTheme = 'dark';
    this.currentPowerMode = 'balanced';

    this.init();
  }

  init() {
    // 1. Resolve Display Mode (Saved -> OS Media Query -> Default Dark)
    const savedTheme = localStorage.getItem(this.storageKeyTheme);
    if (savedTheme) {
      this.setTheme(savedTheme, false);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const prefersContrast = window.matchMedia('(prefers-contrast: more)').matches;
      if (prefersContrast) {
        this.setTheme('high-contrast', false);
      } else {
        this.setTheme(prefersDark ? 'dark' : 'light', false);
      }
    }

    // 2. Resolve Power Mode (Saved -> Battery/Reduced Motion -> Balanced)
    const savedPower = localStorage.getItem(this.storageKeyPower);
    if (savedPower) {
      this.setPowerMode(savedPower, false);
    } else {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isSaveData = navigator.connection && navigator.connection.saveData;
      if (prefersReducedMotion || isSaveData) {
        this.setPowerMode('energy-saving', false);
      } else {
        this.setPowerMode('balanced', false);
      }
    }

    // 3. Listen to OS preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKeyTheme)) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKeyPower)) {
        this.setPowerMode(e.matches ? 'energy-saving' : 'balanced', false);
      }
    });

    // 4. Inspect Battery status if API supported
    if (typeof navigator.getBattery === 'function') {
      navigator.getBattery().then((battery) => {
        const checkBattery = () => {
          if (!battery.charging && battery.level < 0.2) {
            // Low battery: automatically suggest or switch to energy saving
            if (this.currentPowerMode !== 'energy-saving') {
              console.info('[PresentationController] Low battery detected (<20%). Activating energy-saving mode.');
              this.setPowerMode('energy-saving', true);
            }
          }
        };
        checkBattery();
        battery.addEventListener('levelchange', checkBattery);
        battery.addEventListener('chargingchange', checkBattery);
      }).catch(() => {});
    }
  }

  setTheme(theme, persist = true) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      localStorage.setItem(this.storageKeyTheme, theme);
    }
    this._notify();
  }

  toggleTheme() {
    const cycle = {
      'dark': 'light',
      'light': 'high-contrast',
      'high-contrast': 'dark'
    };
    const next = cycle[this.currentTheme] || 'dark';
    this.setTheme(next);
    return next;
  }

  setPowerMode(mode, persist = true) {
    this.currentPowerMode = mode;
    document.documentElement.setAttribute('data-power-mode', mode);
    if (persist) {
      localStorage.setItem(this.storageKeyPower, mode);
    }
    this._notify();
  }

  toggleEnergySaving() {
    const next = this.currentPowerMode === 'energy-saving' ? 'balanced' : 'energy-saving';
    this.setPowerMode(next);
    return next;
  }

  /**
   * Framework-agnostic animation dispatcher
   * Gracefully degrades to zero animation when in energy-saving mode.
   */
  animate(element, keyframes, options = {}) {
    if (this.currentPowerMode === 'energy-saving') {
      // Zero motion fast-path
      if (options.onComplete) options.onComplete();
      return { cancel: () => {}, finish: () => {} };
    }

    if (this.animationEngine === 'animejs' && window.anime) {
      return window.anime({
        targets: element,
        ...keyframes,
        duration: options.duration || 300,
        easing: options.easing || 'easeOutQuad',
        complete: options.onComplete
      });
    }

    // Default: native WAAPI (Web Animations API)
    return element.animate(keyframes, {
      duration: options.duration || 300,
      easing: options.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards',
      ...options
    });
  }

  _notify() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        theme: this.currentTheme,
        powerMode: this.currentPowerMode,
        animationEngine: this.animationEngine
      });
    }
  }
}
