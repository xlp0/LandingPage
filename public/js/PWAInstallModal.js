/**
 * PWAInstallModal - Data-driven PWA install modal UI generator
 * Handles modal creation, display, and user interactions
 */
class PWAInstallModal {
  constructor(config) {
    this.config = config;
    this.modal = null;
    this.backdrop = null;
    this.onInstall = null;
    this.onDismiss = null;
  }

  /**
   * Show the install promotion modal
   * @param {Function} onInstall - Callback when install button clicked
   * @param {Function} onDismiss - Callback when dismiss button clicked
   */
  show(onInstall, onDismiss) {
    this.onInstall = onInstall;
    this.onDismiss = onDismiss;

    this._createBackdrop();
    this._createModal();
    this._attachEventListeners();
    this._initializeIcons();
  }

  /**
   * Close and remove the modal
   */
  close() {
    if (!this.backdrop) return;

    this.backdrop.style.animation = 'fadeOut 0.2s ease-out';
    this.modal.style.animation = 'slideDown 0.2s ease-out';
    setTimeout(() => {
      if (this.backdrop && this.backdrop.parentNode) {
        this.backdrop.remove();
      }
      this.backdrop = null;
      this.modal = null;
    }, 200);
  }

  /**
   * Show success message after installation
   */
  showSuccess() {
    const { successMessage } = this.config.installModal;
    
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${successMessage.gradient};
      color: white;
      padding: 24px 32px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      animation: fadeIn 0.3s ease-out;
    `;
    
    successMsg.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <i data-lucide="${successMessage.icon}" style="width: 24px; height: 24px;"></i>
        <div>
          <div style="font-size: 18px; margin-bottom: 4px;">${successMessage.title}</div>
          <div style="font-size: 14px; opacity: 0.9;">${successMessage.subtitle}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(successMsg);
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => successMsg.remove(), successMessage.duration);
  }

  /**
   * Show manual installation instructions based on platform
   */
  showManualInstructions() {
    const platform = this._detectPlatform();
    const instructions = this.config.manualInstructions[platform];
    
    if (!instructions) {
      console.error('[PWAInstallModal] No instructions for platform:', platform);
      return;
    }

    const message = [
      instructions.title,
      '',
      ...instructions.steps.map((step, i) => `${i + 1}. ${step}`),
      '',
      instructions.footer
    ].filter(line => line !== '').join('\n');

    alert(message);
    this.close();
  }

  /**
   * Create modal backdrop
   * @private
   */
  _createBackdrop() {
    this.backdrop = document.createElement('div');
    this.backdrop.id = 'pwa-install-backdrop';
    this.backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
      padding: 20px;
    `;
    document.body.appendChild(this.backdrop);
  }

  /**
   * Create modal content
   * @private
   */
  _createModal() {
    const { header, features, buttons } = this.config.installModal;

    this.modal = document.createElement('div');
    this.modal.id = 'pwa-install-modal';
    this.modal.style.cssText = `
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 480px;
      width: 100%;
      animation: slideUp 0.3s ease-out;
      overflow: hidden;
    `;

    this.modal.innerHTML = `
      ${this._getAnimationStyles()}
      ${this._getHeaderHTML(header)}
      ${this._getBodyHTML(features, buttons)}
    `;

    this._injectHoverStyles();
    this.backdrop.appendChild(this.modal);
  }

  /**
   * Get animation CSS
   * @private
   */
  _getAnimationStyles() {
    return `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideDown {
          from { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to { 
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
        }
      </style>
    `;
  }

  /**
   * Get header HTML
   * @private
   */
  _getHeaderHTML(header) {
    return `
      <div style="
        background: ${header.gradient};
        padding: 32px 24px;
        text-align: center;
        color: white;
      ">
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto 16px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i data-lucide="${header.icon}" style="width: 48px; height: 48px;"></i>
        </div>
        <h2 style="
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">${header.title}</h2>
        <p style="
          margin: 0;
          font-size: 15px;
          opacity: 0.95;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">${header.subtitle}</p>
      </div>
    `;
  }

  /**
   * Get body HTML with features and buttons
   * @private
   */
  _getBodyHTML(features, buttons) {
    const featuresHTML = features.map(feature => `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="
          width: 40px;
          height: 40px;
          min-width: 40px;
          background: ${feature.backgroundColor};
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i data-lucide="${feature.icon}" style="width: 20px; height: 20px; color: ${feature.iconColor};"></i>
        </div>
        <div>
          <div style="font-weight: 600; font-size: 15px; color: #1a1a1a; margin-bottom: 4px;">
            ${feature.title}
          </div>
          <div style="font-size: 14px; color: #666; line-height: 1.5;">
            ${feature.description}
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div style="padding: 24px;">
        <div style="
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          ${featuresHTML}
        </div>

        <div style="display: flex; gap: 12px;">
          <button id="modal-install-btn" style="
            flex: 1;
            background: ${buttons.install.gradient};
            color: white;
            border: none;
            padding: 14px 24px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            font-size: 15px;
            transition: all 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
          ">
            ${buttons.install.text}
          </button>
          <button id="modal-dismiss-btn" style="
            flex: 1;
            background: #f5f5f5;
            color: #666;
            border: none;
            padding: 14px 24px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            font-size: 15px;
            transition: all 0.2s;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            ${buttons.dismiss.text}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Inject hover styles
   * @private
   */
  _injectHoverStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #modal-install-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 122, 204, 0.4);
      }
      #modal-install-btn:active {
        transform: translateY(0);
      }
      #modal-dismiss-btn:hover {
        background: #e0e0e0;
      }
      @media (max-width: 480px) {
        #pwa-install-modal {
          margin: 0 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Install button
    document.getElementById('modal-install-btn').addEventListener('click', () => {
      if (this.onInstall) this.onInstall();
    });

    // Dismiss button
    document.getElementById('modal-dismiss-btn').addEventListener('click', () => {
      if (this.onDismiss) this.onDismiss();
    });

    // Close on backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    // Close on ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Initialize Lucide icons
   * @private
   */
  _initializeIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Detect platform for manual instructions
   * @private
   */
  _detectPlatform() {
    const ua = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return 'ios';
    }
    if (/Android/i.test(ua)) {
      return 'android';
    }
    if (/Chrome/i.test(ua) && !/Edge/i.test(ua) && !/Mobile|Android/i.test(ua)) {
      return 'desktopChrome';
    }
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      return 'safari';
    }
    
    return 'generic';
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAInstallModal;
}
