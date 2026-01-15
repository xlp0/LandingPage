/**
 * Execution Mode Manager
 * Handles the selection and persistence of CLM execution strategies.
 * Modes:
 * - 'auto': Automatically selects best available runtime (Browser > Server)
 * - 'browser': Forces in-browser execution (via Pyodide/WebWorkers)
 * - 'server': Forces server-side execution (via /api/clm/execute)
 */
export class ExecutionModeManager {
  constructor() {
    this.STORAGE_KEY = 'mcard_clm_execution_mode';
    this.validModes = ['auto', 'browser', 'server'];
    this.currentMode = this.loadMode();
  }

  /**
   * Load persisted mode or default to 'auto'
   */
  loadMode() {
    if (typeof localStorage === 'undefined') return 'auto';
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return this.validModes.includes(saved) ? saved : 'auto';
  }

  /**
   * Save mode selection
   */
  setMode(mode) {
    if (!this.validModes.includes(mode)) {
      console.warn(`[ExecutionMode] Invalid mode '${mode}', ignoring.`);
      return;
    }
    this.currentMode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, mode);
    }
    console.log(`[ExecutionMode] Set to '${mode}'`);
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('clm-execution-mode-changed', { detail: { mode } }));
  }

  /**
   * Get current mode
   */
  getMode() {
    return this.currentMode;
  }

  /**
   * Resolve the actual runner type to use based on mode and capabilities
   * Returns: 'browser' | 'server'
   */
  async resolveRunner() {
    if (this.currentMode === 'browser') return 'browser';
    if (this.currentMode === 'server') return 'server';

    // Auto mode logic
    // 1. Prefer Browser if capable (Pyodide loaded or loadable)
    // 2. Fallback to Server if browser capability is missing (e.g. strict CSP blocking WASM)
    // For now, we default 'auto' -> 'browser' as we want local-first.
    // In future this can check navigator.onLine, server health, etc.
    return 'browser'; 
  }
}

// Singleton instance
export const executionModeManager = new ExecutionModeManager();
