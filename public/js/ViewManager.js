/**
 * ViewManager - Data-driven view management system
 * Handles show/hide logic for app views based on JSON configuration
 * Reduces verbosity and centralizes view management logic
 */
class ViewManager {
  constructor() {
    this.config = null;
    this.views = new Map();
    this.submenus = new Map();
    this.mainContentSelector = '.main-content';
    this.initialized = false;
  }

  /**
   * Initialize ViewManager with configuration
   * @param {string} configUrl - URL to the JSON config file
   */
  async init(configUrl = '/public/config/app-views.json') {
    if (this.initialized) {
      console.log('[ViewManager] Already initialized');
      return;
    }

    try {
      const response = await fetch(configUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }
      
      this.config = await response.json();
      this.mainContentSelector = this.config.mainContentSelector || '.main-content';
      
      // Index views by ID for quick lookup
      for (const view of this.config.views || []) {
        this.views.set(view.id, view);
      }
      
      // Index submenus
      for (const submenu of this.config.submenus || []) {
        this.submenus.set(submenu.id, submenu);
      }
      
      // Setup ESC key handler
      this._setupEscapeHandler();
      
      this.initialized = true;
      console.log(`[ViewManager] Initialized with ${this.views.size} views and ${this.submenus.size} submenus`);
      
    } catch (error) {
      console.error('[ViewManager] Initialization failed:', error);
      // Fallback: use empty config so app doesn't break
      this.config = { views: [], submenus: [] };
      this.initialized = true;
    }
  }

  /**
   * Show a view by ID
   * @param {string} viewId - The view identifier
   */
  show(viewId) {
    const view = this.views.get(viewId);
    if (!view) {
      console.warn(`[ViewManager] Unknown view: ${viewId}`);
      return false;
    }

    const viewElement = document.getElementById(view.elementId);
    const mainContent = document.querySelector(this.mainContentSelector);

    if (!viewElement) {
      console.warn(`${view.logPrefix} Element not found: ${view.elementId}`);
      return false;
    }

    console.log(`${view.logPrefix} Opening ${view.label}`);

    // Hide main content
    if (mainContent) {
      mainContent.style.display = 'none';
    }

    // Show the view
    viewElement.style.display = view.displayStyle || 'flex';

    // Re-initialize Lucide icons
    this._refreshIcons();

    console.log(`${view.logPrefix} ${view.label} opened`);
    return true;
  }

  /**
   * Hide a view by ID
   * @param {string} viewId - The view identifier
   */
  hide(viewId) {
    const view = this.views.get(viewId);
    if (!view) {
      console.warn(`[ViewManager] Unknown view: ${viewId}`);
      return false;
    }

    const viewElement = document.getElementById(view.elementId);
    const mainContent = document.querySelector(this.mainContentSelector);

    if (!viewElement) {
      console.warn(`${view.logPrefix} Element not found: ${view.elementId}`);
      return false;
    }

    console.log(`${view.logPrefix} Closing ${view.label}`);

    // Hide the view
    viewElement.style.display = 'none';

    // Show main content
    if (mainContent) {
      mainContent.style.display = 'flex';
    }

    console.log(`${view.logPrefix} ${view.label} closed`);
    return true;
  }

  /**
   * Toggle a view (show if hidden, hide if shown)
   * @param {string} viewId - The view identifier
   */
  toggle(viewId) {
    const view = this.views.get(viewId);
    if (!view) {
      console.warn(`[ViewManager] Unknown view: ${viewId}`);
      return false;
    }

    const viewElement = document.getElementById(view.elementId);
    if (!viewElement) {
      return false;
    }

    if (viewElement.style.display === 'none' || viewElement.style.display === '') {
      return this.show(viewId);
    } else {
      return this.hide(viewId);
    }
  }

  /**
   * Check if a view is currently visible
   * @param {string} viewId - The view identifier
   * @returns {boolean}
   */
  isVisible(viewId) {
    const view = this.views.get(viewId);
    if (!view) return false;

    const viewElement = document.getElementById(view.elementId);
    if (!viewElement) return false;

    const displayStyle = view.displayStyle || 'flex';
    return viewElement.style.display === displayStyle;
  }

  /**
   * Hide all views and show main content
   */
  hideAll() {
    for (const [viewId] of this.views) {
      const view = this.views.get(viewId);
      const viewElement = document.getElementById(view.elementId);
      if (viewElement && viewElement.style.display !== 'none') {
        viewElement.style.display = 'none';
      }
    }

    const mainContent = document.querySelector(this.mainContentSelector);
    if (mainContent) {
      mainContent.style.display = 'flex';
    }
  }

  /**
   * Toggle a submenu (e.g., Apps dropdown)
   * @param {string} submenuId - The submenu identifier
   */
  toggleSubmenu(submenuId) {
    const submenu = this.submenus.get(submenuId);
    if (!submenu) {
      console.warn(`[ViewManager] Unknown submenu: ${submenuId}`);
      return false;
    }

    const submenuElement = document.getElementById(submenu.elementId);
    const chevronElement = submenu.chevronId ? document.getElementById(submenu.chevronId) : null;

    if (!submenuElement) {
      console.warn(`[ViewManager] Submenu element not found: ${submenu.elementId}`);
      return false;
    }

    if (submenuElement.style.display === 'none' || submenuElement.style.display === '') {
      submenuElement.style.display = 'block';
      if (chevronElement) {
        chevronElement.style.transform = 'rotate(180deg)';
      }
    } else {
      submenuElement.style.display = 'none';
      if (chevronElement) {
        chevronElement.style.transform = 'rotate(0deg)';
      }
    }

    this._refreshIcons();
    return true;
  }

  /**
   * Get all registered view IDs
   * @returns {string[]}
   */
  getViewIds() {
    return Array.from(this.views.keys());
  }

  /**
   * Get view configuration by ID
   * @param {string} viewId 
   * @returns {object|null}
   */
  getViewConfig(viewId) {
    return this.views.get(viewId) || null;
  }

  /**
   * Dynamically register a new view at runtime
   * @param {object} viewConfig - View configuration object
   */
  registerView(viewConfig) {
    if (!viewConfig.id || !viewConfig.elementId) {
      console.error('[ViewManager] View must have id and elementId');
      return false;
    }

    this.views.set(viewConfig.id, {
      displayStyle: 'flex',
      logPrefix: `[${viewConfig.label || viewConfig.id}]`,
      ...viewConfig
    });

    console.log(`[ViewManager] Registered view: ${viewConfig.id}`);
    return true;
  }

  /**
   * Unregister a view
   * @param {string} viewId 
   */
  unregisterView(viewId) {
    return this.views.delete(viewId);
  }

  /**
   * Setup ESC key handler to close any open view
   * @private
   */
  _setupEscapeHandler() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        for (const [viewId] of this.views) {
          if (this.isVisible(viewId)) {
            this.hide(viewId);
          }
        }
      }
    });
  }

  /**
   * Refresh Lucide icons
   * @private
   */
  _refreshIcons() {
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

// Create singleton instance
const viewManager = new ViewManager();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => viewManager.init());
} else {
  viewManager.init();
}

// Expose globally for onclick handlers
window.viewManager = viewManager;

// Legacy function wrappers for backward compatibility
// These allow existing onclick="showCalendar()" to continue working
function showCalendar() { viewManager.show('calendar'); }
function hideCalendar() { viewManager.hide('calendar'); }
function showMap() { viewManager.show('map'); }
function hideMap() { viewManager.hide('map'); }
function show3DViewer() { viewManager.show('threeD'); }
function hide3DViewer() { viewManager.hide('threeD'); }
function showMusicVisualizer() { viewManager.show('music'); }
function hideMusicVisualizer() { viewManager.hide('music'); }
function showMorphismV1() { viewManager.show('morphismV1'); }
function hideMorphismV1() { viewManager.hide('morphismV1'); }
function showMorphismV2() { viewManager.show('morphismV2'); }
function hideMorphismV2() { viewManager.hide('morphismV2'); }
function toggleApps() { viewManager.toggleSubmenu('apps'); }
