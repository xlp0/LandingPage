/**
 * PWA Initialization - Data-Driven Architecture
 * 
 * This file now serves as a minimal bootstrap that loads the modular PWA system:
 * 
 * Architecture:
 * - /public/config/pwa-config.json - All PWA configuration, content, and text
 * - /public/js/PWAInstallModal.js - UI generation for install modal
 * - /public/js/PWAManager.js - Orchestrates all PWA functionality
 * 
 * Benefits:
 * - Configuration-driven: Change text/content without touching code
 * - Modular: Each component has a single responsibility
 * - Testable: Components can be tested independently
 * - Maintainable: Easy to reason about and modify
 * - Extensible: Add new features without bloating this file
 * 
 * External Interfaces Preserved:
 * - window.pwaManager - Global access to PWA functionality
 * - All service worker registration and update handling
 * - Install prompt behavior and timing
 * - Online/offline detection
 * - PWA mode detection
 * 
 * To customize PWA behavior:
 * 1. Edit /public/config/pwa-config.json for content/settings
 * 2. Modify PWAInstallModal.js for UI changes
 * 3. Modify PWAManager.js for functionality changes
 * 
 * Note: PWAManager and PWAInstallModal are loaded via index.html
 * and auto-initialize on DOM ready.
 */

/**
 * View Management - Now handled by ViewManager.js
 * 
 * All view toggle functions (showCalendar, hideCalendar, showMap, etc.) 
 * are now provided by the data-driven ViewManager loaded via:
 * /public/js/ViewManager.js
 * 
 * Configuration is loaded from:
 * /public/config/app-views.json
 * 
 * To add a new view:
 * 1. Add entry to app-views.json with id, elementId, label, icon, etc.
 * 2. Add corresponding HTML element to index.html
 * 3. The ViewManager auto-registers ESC key handling
 * 
 * Legacy function names (showCalendar, hideCalendar, toggleApps, etc.)
 * are preserved for backward compatibility with existing onclick handlers.
 */