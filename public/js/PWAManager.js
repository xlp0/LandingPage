/**
 * PWAManager - Orchestrates PWA functionality
 * Handles service worker registration, install prompts, and online/offline detection
 */
const ENABLE_PWA_SYSTEM = false; // Set to true to enable PWA features

class PWAManager {
  constructor(configUrl = '/public/config/pwa-config.json') {
    this.configUrl = configUrl;
    this.config = null;
    this.deferredPrompt = null;
    this.installPromptShown = false;
    this.installModal = null;
    this.initialized = false;
  }

  /**
   * Initialize PWA Manager
   */
  async init() {
    if (!ENABLE_PWA_SYSTEM) {
      console.log('[PWAManager] PWA System is explicitly disabled via ENABLE_PWA_SYSTEM flag.');
      return;
    }

    if (this.initialized) {
      console.log('[PWAManager] Already initialized');
      return;
    }

    try {
      await this._loadConfig();
      this._registerServiceWorker();
      this._setupInstallPrompt();
      this._setupOnlineOfflineDetection();
      this._detectPWAMode();
      this._handleShareTarget();

      this.initialized = true;
      console.log('[PWAManager] Initialized successfully');
    } catch (error) {
      console.error('[PWAManager] Initialization failed:', error);
    }
  }

  /**
   * Load configuration from JSON
   * @private
   */
  async _loadConfig() {
    try {
      const response = await fetch(this.configUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }
      this.config = await response.json();
      console.log(`${this.config.logging.prefix} Config loaded`);
    } catch (error) {
      console.error('[PWAManager] Config load failed:', error);
      throw error;
    }
  }

  /**
   * Register service worker
   * @private
   */
  _registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWAManager] Service workers not supported');
      return;
    }

    const prefix = this.config.logging.prefix;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log(`${prefix} Service Worker registered successfully:`, registration.scope);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log(`${prefix} New service worker found, installing...`);

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log(`${prefix} New version available! Refresh to update.`);

                if (confirm(`A new version of ${this.config.appName} is available. Reload to update?`)) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error(`${prefix} Service Worker registration failed:`, error);
        });

      // Handle service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  /**
   * Setup install prompt handling
   * @private
   */
  _setupInstallPrompt() {
    const prefix = this.config.logging.prefix;

    window.addEventListener('beforeinstallprompt', (e) => {
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent);

      console.log(`${prefix} ✅ Native install prompt available!`);
      console.log(`${prefix} Event details:`, e);
      console.log(`${prefix} Browser:`, navigator.userAgent);
      console.log(`${prefix} Is Android:`, isAndroid);
      console.log(`${prefix} Is Chrome:`, isChrome);
      console.log(`${prefix} Display mode:`, window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
      console.log(`${prefix} Screen width:`, window.innerWidth);

      e.preventDefault();
      this.deferredPrompt = e;

      if (!this.installPromptShown && !this._isInstalled()) {
        console.log(`${prefix} 🚀 Showing install modal with native prompt support`);
        if (isAndroid) {
          console.log(`${prefix} 📱 Android device detected - will show native Add to Home Screen`);
        }
        this.installPromptShown = true;
        // ENABLE_PWA_PROMPT: Disabled for now per user request
        // this._showInstallPromotion();
      } else {
        console.log(`${prefix} ℹ️  Install prompt not shown (already shown or app installed)`);
      }
    });

    // Diagnostic check
    setTimeout(() => this._runDiagnostics(), this.config.diagnosticDelay);

    // Fallback prompt
    setTimeout(() => {
      if (!this.installPromptShown && !this._isInstalled()) {
        console.log(`${prefix} ⚠️  Native prompt not available after ${this.config.fallbackPromptDelay}ms, showing manual instructions`);
        console.log(`${prefix} deferredPrompt status:`, !!this.deferredPrompt);
        this.installPromptShown = true;
        // ENABLE_PWA_PROMPT: Disabled for now per user request
        // this._showInstallPromotion();
      } else if (this._isInstalled()) {
        console.log(`${prefix} ✅ Already installed, skipping modal`);
      }
    }, this.config.fallbackPromptDelay);
  }

  /**
   * Show install promotion modal
   * @private
   */
  _showInstallPromotion() {
    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < this.config.dismissDuration) {
      console.log(`${this.config.logging.prefix} Install prompt dismissed recently`);
      return;
    }

    // Create modal instance
    this.installModal = new PWAInstallModal(this.config);

    // Show modal with callbacks
    this.installModal.show(
      () => this._handleInstallClick(),
      () => this._handleDismissClick()
    );
  }

  /**
   * Handle install button click
   * @private
   */
  async _handleInstallClick() {
    const prefix = this.config.logging.prefix;

    console.log(`${prefix} 🎯 Install button clicked!`);
    console.log(`${prefix} deferredPrompt available:`, !!this.deferredPrompt);
    console.log(`${prefix} deferredPrompt object:`, this.deferredPrompt);
    console.log(`${prefix} User agent:`, navigator.userAgent);
    console.log(`${prefix} Is standalone:`, window.matchMedia('(display-mode: standalone)').matches);
    console.log(`${prefix} Navigator standalone:`, window.navigator.standalone);

    if (this.deferredPrompt) {
      console.log(`${prefix} 🚀 Triggering native install prompt!`);

      try {
        const promptResult = await this.deferredPrompt.prompt();
        console.log(`${prefix} Prompt result:`, promptResult);

        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`${prefix} User choice:`, outcome);

        if (outcome === 'accepted') {
          console.log(`${prefix} ✅ App installed successfully!`);
          this.installModal.close();
          setTimeout(() => this.installModal.showSuccess(), 300);
        } else {
          console.log(`${prefix} ❌ User cancelled installation`);
          this.installModal.close();
        }

        this.deferredPrompt = null;
      } catch (error) {
        console.error(`${prefix} ❌ Install prompt error:`, error);
        console.error(`${prefix} Error details:`, error.message, error.stack);

        if (error.message && error.message.includes('The app is already installed')) {
          this.installModal.close();
          alert(`✅ ${this.config.appName} is already installed on your device!`);
        } else {
          this.installModal.showManualInstructions();
        }
      }
    } else {
      console.log(`${prefix} ⚠️  Native prompt not available, showing manual instructions`);

      if (this._isInstalled()) {
        this.installModal.close();
        alert(`✅ ${this.config.appName} is already installed on your device!`);
      } else {
        this.installModal.showManualInstructions();
      }
    }
  }

  /**
   * Handle dismiss button click
   * @private
   */
  _handleDismissClick() {
    localStorage.setItem('pwa-install-dismissed', Date.now());
    console.log(`${this.config.logging.prefix} Install prompt dismissed for 7 days`);
    this.installModal.close();
  }

  /**
   * Setup online/offline detection
   * @private
   */
  _setupOnlineOfflineDetection() {
    const prefix = this.config.logging.prefix;
    const { offline, online } = this.config.offlineIndicator;

    const updateStatus = () => {
      const indicator = document.getElementById('offline-indicator');
      if (!indicator) return;

      if (!navigator.onLine) {
        console.log(`${prefix} 🔌 OFFLINE MODE - Working from cache`);
        indicator.style.display = 'block';
        indicator.style.background = offline.gradient;
        indicator.innerHTML = `<i data-lucide="${offline.icon}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 8px;"></i>${offline.text}`;
        if (window.lucide) window.lucide.createIcons();
      } else {
        console.log(`${prefix} 🌐 ONLINE MODE`);
        indicator.style.display = 'none';
      }
    };

    window.addEventListener('online', () => {
      console.log(`${prefix} ✅ Connection restored!`);
      const indicator = document.getElementById('offline-indicator');
      if (!indicator) return;

      indicator.style.background = online.gradient;
      indicator.innerHTML = `<i data-lucide="${online.icon}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 8px;"></i>${online.text}`;
      indicator.style.display = 'block';
      if (window.lucide) window.lucide.createIcons();

      setTimeout(() => {
        indicator.style.display = 'none';
        indicator.style.background = offline.gradient;
        indicator.innerHTML = `<i data-lucide="${offline.icon}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 8px;"></i>${offline.text}`;
      }, online.duration);
    });

    window.addEventListener('offline', () => {
      console.log(`${prefix} ⚠️  Connection lost - Switching to offline mode`);
      updateStatus();
    });

    window.addEventListener('load', updateStatus);
  }

  /**
   * Detect if running as PWA
   * @private
   */
  _detectPWAMode() {
    window.addEventListener('load', () => {
      if (this._isInstalled()) {
        console.log(`${this.config.logging.prefix} Running as installed app`);
        document.body.classList.add('pwa-mode');
      }
    });
  }

  /**
   * Handle share target
   * @private
   */
  _handleShareTarget() {
    if (window.location.search.includes('share-target')) {
      console.log(`${this.config.logging.prefix} Received shared content`);
      // Handle shared content here
    }
  }

  /**
   * Run diagnostics
   * @private
   */
  _runDiagnostics() {
    const prefix = this.config.logging.prefix;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);

    console.log(`${prefix} 🔍 Diagnostic Check:`);
    console.log('  - beforeinstallprompt fired:', !!this.deferredPrompt);
    console.log('  - Service worker registered:', !!navigator.serviceWorker.controller);
    console.log('  - Is HTTPS:', location.protocol === 'https:' || location.hostname === 'localhost');
    console.log('  - Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser');
    console.log('  - Is Android:', isAndroid);
    console.log('  - Is Chrome:', isChrome);
    console.log('  - Screen width:', window.innerWidth);
    console.log('  - User agent:', navigator.userAgent);

    if (!this.deferredPrompt) {
      console.log(`${prefix} ⚠️  Possible reasons for no beforeinstallprompt:`);
      this.config.logging.diagnosticReasons.forEach((reason, i) => {
        console.log(`  ${i + 1}. ${reason}`);
      });

      if (isAndroid) {
        this.config.logging.androidSpecificReasons.forEach((reason, i) => {
          console.log(`  ${this.config.logging.diagnosticReasons.length + i + 1}. ${reason}`);
        });
      }
    }
  }

  /**
   * Check if app is installed
   * @private
   */
  _isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  }
}

// Create singleton instance
const pwaManager = new PWAManager();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pwaManager.init());
} else {
  pwaManager.init();
}

// Expose globally
window.pwaManager = pwaManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
}
