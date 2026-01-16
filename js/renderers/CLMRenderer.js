/**
 * CLM (Cubical Logic Model) Renderer
 * Renders CLM YAML files with three-dimensional structure visualization
 * ✅ Uses BrowserCLMRunner (library's CLMRunner not exported)
 * ✅ Extends BaseRenderer for consistent architecture
 */

import { BaseRenderer } from './BaseRenderer.js';
import { BrowserCLMRunner } from '/public/js/mcard/BrowserCLMRunner.js?v=2';
import { executionModeManager } from '/js/execution/ExecutionModeManager.js';
import { ServerCLMRunner } from './ServerCLMRunner.js?v=6';

export class CLMRenderer extends BaseRenderer {
  constructor() {
    super('clm');
    this.name = 'CLM Renderer';
    this.runner = new BrowserCLMRunner();
    this.serverRunner = new ServerCLMRunner();
  }

  /**
   * Unicode-safe Base64 encoder
   */
  toBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
  }

  /**
   * Unicode-safe Base64 decoder
   */
  fromBase64(str) {
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  }

  /**
   * Check if this renderer can handle the content
   */
  canRender(content, options = {}) {
    if (typeof content !== 'string') return false;

    // Check for CLM structure
    return content.includes('specification:') &&
      content.includes('implementation:') &&
      (content.includes('verification:') || content.includes('balanced:'));
  }

  /**
   * Parse YAML content into structured data using js-yaml library
   * ✅ Replaced custom parser with proper YAML library
   */
  parseYAML(content) {
    try {
      // Use js-yaml library (loaded globally via script tag)
      if (typeof jsyaml === 'undefined') {
        console.error('[CLM] js-yaml library not loaded');
        return null;
      }

      const parsed = jsyaml.load(content);

      // Ensure CLM structure exists
      if (!parsed || typeof parsed !== 'object') {
        console.error('[CLM] Invalid YAML structure');
        return null;
      }

      // 1. Preserve top-level metadata
      const result = {
        ...parsed, // Copy all existing fields (version, chapter, examples, etc.)
        specification: {},
        implementation: {},
        verification: {},
        metadata: parsed.metadata || {}
      };

      // 2. Map 'clm' subsections if they exist (New Format)
      if (parsed.clm) {
        result.specification = parsed.clm.abstract_spec || parsed.clm.abstract || {};
        result.implementation = parsed.clm.concrete_impl || parsed.clm.concrete || {};
        result.verification = parsed.clm.balanced_exp || parsed.clm.balanced || {};
      }
      // 3. Fallback to old format if 'clm' key doesn't exist
      else {
        result.specification = parsed.specification || {};
        result.implementation = parsed.implementation || {};
        result.verification = parsed.verification || {};
      }

      return result;
    } catch (error) {
      console.error('[CLM] YAML parsing error:', error);
      return null;
    }
  }

  /**
   * Serialize data back to YAML format
   * ✅ New method for editing support
   */
  serializeYAML(data) {
    try {
      if (typeof jsyaml === 'undefined') {
        console.error('[CLM] js-yaml library not loaded');
        return null;
      }

      return jsyaml.dump(data, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
        sortKeys: false
      });
    } catch (error) {
      console.error('[CLM] YAML serialization error:', error);
      return null;
    }
  }

  /**
   * Render CLM content as HTML with tabbed interface
   */
  async render(content, options = {}) {
    const parsed = this.parseYAML(content);

    if (!parsed) {
      return `<div class="clm-error">Failed to parse CLM content</div>`;
    }

    // Extract version and chapter info from parsed YAML
    const version = parsed.version || 'N/A';
    const chapter = parsed.chapter || {};
    const clm = parsed.clm || {};

    const html = `
      <div class="clm-container">
        <div class="clm-header">
          <h2 class="clm-title">
            <i data-lucide="box" style="width: 20px; height: 20px;"></i>
            Cubical Logic Model
          </h2>
          
          <!-- Version and Chapter Metadata -->
          <div class="clm-metadata-header">
            <div class="clm-version">Version: ${this.escapeHtml(parsed.version || 'N/A')}</div>
            ${parsed.chapter?.id ? `<div class="clm-chapter-id">Chapter: ${this.escapeHtml(parsed.chapter.id)}</div>` : ''}
            ${parsed.chapter?.title ? `<div class="clm-chapter-title">${this.escapeHtml(parsed.chapter.title)}</div>` : ''}
            ${parsed.chapter?.mvp_card ? `<div class="clm-mvp-card">MVP Card: ${this.escapeHtml(parsed.chapter.mvp_card)}</div>` : ''}
            ${parsed.chapter?.pkc_task ? `<div class="clm-pkc-task">PKC Task: ${this.escapeHtml(parsed.chapter.pkc_task)}</div>` : ''}
            ${parsed.metadata?.author ? `<div class="clm-author">Author: ${this.escapeHtml(parsed.metadata.author)}</div>` : ''}
          </div>
        </div>

        <!-- Tabbed Interface -->
        <div class="clm-tabs">
          <div class="clm-tab-buttons">
            <button class="clm-tab-btn active" data-tab="abstract" onclick="window.clmRenderer.switchTab(this, 'abstract')">
              <i data-lucide="file-text" style="width: 16px; height: 16px;"></i>
              Abstract
            </button>
            <button class="clm-tab-btn" data-tab="concrete" onclick="window.clmRenderer.switchTab(this, 'concrete')">
              <i data-lucide="code" style="width: 16px; height: 16px;"></i>
              Concrete
            </button>
            <button class="clm-tab-btn" data-tab="balanced" onclick="window.clmRenderer.switchTab(this, 'balanced')">
              <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
              Balanced
            </button>
          </div>

          <div class="clm-tab-content">
            <!-- Abstract Tab -->
            <div class="clm-tab-panel active" data-panel="abstract">
              <h3>Specification (Abstract)</h3>
              ${this.renderSection(parsed.specification, 'specification')}
            </div>

            <!-- Concrete Tab -->
            <div class="clm-tab-panel" data-panel="concrete">
              <h3>Implementation (Concrete)</h3>
              ${this.renderSection(parsed.implementation, 'implementation')}
            </div>

            <!-- Balanced Tab -->
            <div class="clm-tab-panel" data-panel="balanced">
              <h3>Verification (Balanced)</h3>
              ${this.renderSection(parsed.verification, 'verification')}
            </div>
          </div>
        </div>

        <!-- Execution Controls -->
        <div class="clm-execution-controls">
          <div class="clm-mode-selector" style="display: inline-block; margin-right: 10px;">
            <label class="clm-mode-label" style="font-size: 12px; margin-right: 4px;">Mode:</label>
            <select class="clm-mode-select" onchange="window.clmRenderer.changeMode(this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
              <option value="auto" ${executionModeManager.getMode() === 'auto' ? 'selected' : ''}>Auto</option>
              <option value="browser" ${executionModeManager.getMode() === 'browser' ? 'selected' : ''}>Browser (Local)</option>
              <option value="server" ${executionModeManager.getMode() === 'server' ? 'selected' : ''}>Server (Remote)</option>
            </select>
          </div>
          <div class="clm-test-selector" style="display: inline-block; margin-right: 10px;">
            <label class="clm-test-label" style="font-size: 12px; margin-right: 4px;">Test Case:</label>
            <select class="clm-test-select" onchange="window.clmRenderer.updateExecuteButton(this)" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc;">
              <option value="">Select test case...</option>
              ${this.renderTestCaseOptions(parsed.verification || parsed.balanced)}
            </select>
          </div>
          <button onclick="window.clmRenderer.executeOrTest(this)" class="clm-execute-btn" data-clm-content='${this.toBase64(JSON.stringify(parsed))}' data-clm-raw='${this.toBase64(content)}'>
            <i data-lucide="play" style="width: 16px; height: 16px;"></i>
            <span class="clm-execute-label">Run All Tests</span>
          </button>
        </div>

        <!-- Execution Results -->
        <div class="clm-execution-results" style="display: none;">
          <div class="clm-results-header">
            <h4>Execution Results</h4>
            <button onclick="this.parentElement.parentElement.style.display='none'" class="clm-close-btn">×</button>
          </div>
          <div class="clm-results-content"></div>
        </div>

        <!-- Raw YAML Toggle -->
        <div class="clm-raw-toggle">
          <button onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.textContent = this.textContent.includes('Show') ? 'Hide Raw YAML' : 'Show Raw YAML';" class="clm-toggle-btn">
            Show Raw YAML
          </button>
          <pre class="clm-raw-yaml" style="display: none;"><code>${this.escapeHtml(content)}</code></pre>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Render test case options for dropdown selector
   */
  renderTestCaseOptions(verification) {
    if (!verification || !verification.test_cases) {
      return '';
    }

    const testCases = verification.test_cases;
    if (!Array.isArray(testCases) || testCases.length === 0) {
      return '';
    }

    return testCases.map((testCase, index) => {
      const given = testCase.given || 'N/A';
      const label = `Test ${index + 1}: ${given}`;
      return `<option value="${index}">${this.escapeHtml(label)}</option>`;
    }).join('');
  }

  /**
   * Render a section of the CLM with improved formatting
   * - Keys use bold monospace font
   * - Values use regular text
   * - Arrays are rendered as lists
   * - Nested objects are properly indented
   */
  renderSection(section, sectionType) {
    if (!section || typeof section !== 'object') {
      return '<p class="clm-empty">No data</p>';
    }

    let html = '<div class="clm-properties">';

    for (const [key, value] of Object.entries(section)) {
      html += this.renderProperty(key, value, 0);
    }

    html += '</div>';
    return html;
  }

  /**
   * Render a single property with proper formatting
   */
  renderProperty(key, value, depth) {
    const formattedKey = this.formatKey(key);

    // Handle null/undefined
    if (value === null || value === undefined) {
      return `
        <div class="clm-property" style="margin-left: ${depth * 16}px;">
          <span class="clm-property-key">${formattedKey}</span>
          <span class="clm-property-value clm-value-null">null</span>
        </div>
      `;
    }

    // Handle arrays - render as list
    if (Array.isArray(value)) {
      return this.renderArrayProperty(key, value, depth);
    }

    // Handle nested objects
    if (typeof value === 'object') {
      return this.renderNestedObject(key, value, depth);
    }

    // Handle primitive values (string, number, boolean)
    return `
      <div class="clm-property" style="margin-left: ${depth * 16}px;">
        <span class="clm-property-key">${formattedKey}</span>
        <span class="clm-property-value">${this.formatValue(value)}</span>
      </div>
    `;
  }

  /**
   * Format a key name to be more readable
   */
  formatKey(key) {
    // Convert snake_case or camelCase to Title Case
    const formatted = key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return this.escapeHtml(formatted) + ':';
  }

  /**
   * Format a value based on its type
   */
  formatValue(value) {
    if (typeof value === 'boolean') {
      return `<span class="clm-value-boolean">${value ? 'Yes' : 'No'}</span>`;
    }
    if (typeof value === 'number') {
      return `<span class="clm-value-number">${value}</span>`;
    }
    // String - escape HTML and preserve line breaks
    return this.escapeHtml(String(value)).replace(/\n/g, '<br>');
  }

  /**
   * Render an array as a list
   */
  renderArrayProperty(key, arr, depth) {
    const formattedKey = this.formatKey(key);

    if (arr.length === 0) {
      return `
        <div class="clm-property" style="margin-left: ${depth * 16}px;">
          <span class="clm-property-key">${formattedKey}</span>
          <span class="clm-property-value clm-value-empty">(empty list)</span>
        </div>
      `;
    }

    let html = `
      <div class="clm-property clm-array-property" style="margin-left: ${depth * 16}px;">
        <span class="clm-property-key">${formattedKey}</span>
        <span class="clm-array-count">(${arr.length} items)</span>
        <ul class="clm-list">
    `;

    arr.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        // Complex object in array
        html += `
          <li class="clm-list-item clm-list-item-object">
            <div class="clm-list-item-header">Item ${index + 1}</div>
            <div class="clm-list-item-content">
              ${this.renderObjectContent(item, depth + 1)}
            </div>
          </li>
        `;
      } else {
        // Simple value in array
        html += `<li class="clm-list-item">${this.formatValue(item)}</li>`;
      }
    });

    html += '</ul></div>';
    return html;
  }

  /**
   * Render a nested object
   */
  renderNestedObject(key, obj, depth) {
    const formattedKey = this.formatKey(key);

    return `
      <div class="clm-property clm-nested-property" style="margin-left: ${depth * 16}px;">
        <span class="clm-property-key">${formattedKey}</span>
        <div class="clm-nested-content">
          ${this.renderObjectContent(obj, depth + 1)}
        </div>
      </div>
    `;
  }

  /**
   * Render the content of an object
   */
  renderObjectContent(obj, depth) {
    let html = '';
    for (const [key, value] of Object.entries(obj)) {
      html += this.renderProperty(key, value, depth);
    }
    return html;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Switch active tab in CLM renderer
   */
  switchTab(button, tabName) {
    // Debug logging
    console.log('[CLM] Switching to tab:', tabName);

    // Find the button (handle case if called from child)
    const targetBtn = button.closest('.clm-tab-btn') || button;
    const container = targetBtn.closest('.clm-container');

    if (!container) {
      console.error('[CLM] Container not found');
      return;
    }

    // Update tab buttons
    const buttons = container.querySelectorAll('.clm-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    targetBtn.classList.add('active');

    // Update tab panels
    const panels = container.querySelectorAll('.clm-tab-panel');
    panels.forEach(panel => {
      if (panel.dataset.panel === tabName) {
        panel.classList.add('active');
        panel.style.display = 'block'; // Force show
      } else {
        panel.classList.remove('active');
        panel.style.display = 'none'; // Force hide
      }
    });

    // Re-initialize Lucide icons in the new tab if needed
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Execute CLM with user input or selected test case
   * ✅ Uses hybrid execution (BrowserCLMRunner or ServerCLMRunner based on mode)
   */
  async executeCLM(button) {
    const rawContent = atob(button.dataset.clmRaw);
    const clmContent = JSON.parse(atob(button.dataset.clmContent));
    const resultsDiv = button.closest('.clm-container').querySelector('.clm-execution-results');
    const resultsContent = resultsDiv.querySelector('.clm-results-content');
    const testSelector = button.closest('.clm-container').querySelector('.clm-test-select');

    // Show results panel
    resultsDiv.style.display = 'block';
    resultsContent.innerHTML = '<div class="clm-loading">Executing...</div>';

    try {
      // Determine runner based on mode
      const mode = executionModeManager.getMode();
      let runnerType = await executionModeManager.resolveRunner();
      
      // Force browser execution for lambda runtime (server doesn't support it)
      if (clmContent.concrete?.runtime === 'lambda') {
        runnerType = 'browser';
        console.log(`[CLM] Lambda runtime detected - forcing browser execution`);
      }
      
      const activeRunner = runnerType === 'server' ? this.serverRunner : this.runner;
      
      console.log(`[CLM] Executing in mode: ${mode} (Resolved: ${runnerType})`);

      let input;
      let testCase = null;
      let testIndex = null;

      // Check if a test case is selected
      if (testSelector && testSelector.value !== '') {
        testIndex = parseInt(testSelector.value);
        // Support both 'verification' and 'balanced' sections
        const testCases = clmContent.verification?.test_cases || clmContent.balanced?.test_cases;
        if (testCases && testCases[testIndex]) {
          testCase = testCases[testIndex];
          // Support both 'arguments' and 'context' fields
          input = testCase.when?.arguments || testCase.when?.context || {};
          console.log(`[CLM] Running test case ${testIndex + 1}:`, testCase.given);
        }
      }

      // If no test case selected, prompt for input
      if (!testCase) {
        const inputStr = prompt('Enter input (JSON format):', '{}');
        if (inputStr === null) {
          resultsDiv.style.display = 'none';
          return;
        }
        input = JSON.parse(inputStr);
      }

      // Execute using active runner
      const result = await activeRunner.execute(rawContent, input);

      // Verify result if test case was selected
      let verificationPassed = null;
      let expectedResult = null;
      if (testCase && (testCase.then?.result_contains !== undefined || testCase.then?.result !== undefined)) {
        // Support both 'result_contains' and 'result' fields
        expectedResult = testCase.then.result_contains !== undefined ? testCase.then.result_contains : testCase.then.result;
        verificationPassed = JSON.stringify(result.result) === JSON.stringify(expectedResult);
      }

      if (result.success) {
        const isTestRun = testCase !== null;
        const headerIcon = isTestRun ? (verificationPassed ? 'check-circle' : 'x-circle') : 'check-circle';
        const headerColor = isTestRun ? (verificationPassed ? '#4ade80' : '#f87171') : '#4ade80';
        const headerText = isTestRun ? 
          (verificationPassed ? `Test ${testIndex + 1} Passed` : `Test ${testIndex + 1} Failed`) :
          `Execution Successful (${runnerType})`;

        resultsContent.innerHTML = `
          <div class="clm-result-${isTestRun && !verificationPassed ? 'error' : 'success'}">
            <div class="clm-result-header">
              <i data-lucide="${headerIcon}" style="width: 20px; height: 20px; color: ${headerColor};"></i>
              <span>${headerText}</span>
            </div>
            <div class="clm-result-details">
              ${isTestRun ? `
                <div class="clm-result-item">
                  <strong>Test Case:</strong> ${this.escapeHtml(testCase.given)}
                </div>
              ` : ''}
              <div class="clm-result-item">
                <strong>Execution Time:</strong> ${result.executionTime}ms
              </div>
              <div class="clm-result-item">
                <strong>Chapter:</strong> ${result.clm?.chapter || 'N/A'}
              </div>
              <div class="clm-result-item">
                <strong>Concept:</strong> ${result.clm?.concept || 'N/A'}
              </div>
              ${isTestRun && expectedResult !== null ? `
                <div class="clm-result-item">
                  <strong>Expected Result:</strong>
                  <pre class="clm-result-output">${JSON.stringify(expectedResult, null, 2)}</pre>
                </div>
              ` : ''}
              <div class="clm-result-item">
                <strong>${isTestRun ? 'Actual Result:' : 'Result:'}</strong>
                <pre class="clm-result-output">${JSON.stringify(result.result, null, 2)}</pre>
              </div>
              ${isTestRun && !verificationPassed ? `
                <div class="clm-result-item" style="color: #f87171;">
                  <strong>Verification:</strong> Results do not match expected output
                </div>
              ` : ''}
              ${isTestRun && verificationPassed ? `
                <div class="clm-result-item" style="color: #4ade80;">
                  <strong>Verification:</strong> ✓ Results match expected output
                </div>
              ` : ''}
            </div>
          </div>
        `;
      } else {
        resultsContent.innerHTML = `
          <div class="clm-result-error">
            <div class="clm-result-header">
              <i data-lucide="x-circle" style="width: 20px; height: 20px; color: #f87171;"></i>
              <span>Execution Failed (${runnerType})</span>
            </div>
            <div class="clm-result-details">
              <div class="clm-result-item">
                <strong>Error:</strong> ${this.escapeHtml(result.error)}
              </div>
              <div class="clm-result-item">
                <strong>Execution Time:</strong> ${result.executionTime}ms
              </div>
            </div>
          </div>
        `;
      }

      // Re-initialize Lucide icons
      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (error) {
      resultsContent.innerHTML = `
        <div class="clm-result-error">
          <div class="clm-result-header">
            <i data-lucide="alert-circle" style="width: 20px; height: 20px; color: #f87171;"></i>
            <span>Error</span>
          </div>
          <div class="clm-result-details">
            <div class="clm-result-item">
              <strong>Message:</strong> ${this.escapeHtml(error.message)}
            </div>
          </div>
        </div>
      `;

      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }

  /**
   * Run all test cases
   * ✅ Uses BrowserCLMRunner (library's CLMRunner not exported)
   */
  async runTests(button) {
    const rawContent = atob(button.dataset.clmRaw);
    const resultsDiv = button.closest('.clm-container').querySelector('.clm-execution-results');
    const resultsContent = resultsDiv.querySelector('.clm-results-content');

    // Show results panel
    resultsDiv.style.display = 'block';
    resultsContent.innerHTML = '<div class="clm-loading">Running tests...</div>';

    try {
      // Run tests using BrowserCLMRunner
      const testResults = await this.runner.runTests(rawContent);

      if (testResults.success) {
        resultsContent.innerHTML = `
          <div class="clm-result-success">
            <div class="clm-result-header">
              <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #4ade80;"></i>
              <span>All Tests Passed</span>
            </div>
            <div class="clm-result-details">
              <div class="clm-result-item">
                <strong>Total Tests:</strong> ${testResults.totalTests}
              </div>
              <div class="clm-result-item">
                <strong>Passed:</strong> <span style="color: #4ade80;">${testResults.passed}</span>
              </div>
              <div class="clm-result-item">
                <strong>Failed:</strong> <span style="color: #f87171;">${testResults.failed}</span>
              </div>
            </div>
            <div class="clm-test-results">
              ${testResults.results.map(r => `
                <div class="clm-test-case ${r.passed ? 'passed' : 'failed'}">
                  <div class="clm-test-header">
                    <i data-lucide="${r.passed ? 'check' : 'x'}" style="width: 16px; height: 16px;"></i>
                    <span>${this.escapeHtml(r.name)}</span>
                    <span class="clm-test-time">${r.executionTime}ms</span>
                  </div>
                  ${!r.passed ? `
                    <div class="clm-test-details">
                      <div><strong>Expected:</strong> <code>${JSON.stringify(r.expected)}</code></div>
                      <div><strong>Actual:</strong> <code>${JSON.stringify(r.actual)}</code></div>
                      ${r.error ? `<div><strong>Error:</strong> ${this.escapeHtml(r.error)}</div>` : ''}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        resultsContent.innerHTML = `
          <div class="clm-result-error">
            <div class="clm-result-header">
              <i data-lucide="x-circle" style="width: 20px; height: 20px; color: #f87171;"></i>
              <span>Some Tests Failed</span>
            </div>
            <div class="clm-result-details">
              <div class="clm-result-item">
                <strong>Total Tests:</strong> ${testResults.totalTests}
              </div>
              <div class="clm-result-item">
                <strong>Passed:</strong> <span style="color: #4ade80;">${testResults.passed}</span>
              </div>
              <div class="clm-result-item">
                <strong>Failed:</strong> <span style="color: #f87171;">${testResults.failed}</span>
              </div>
            </div>
            <div class="clm-test-results">
              ${testResults.results.map(r => `
                <div class="clm-test-case ${r.passed ? 'passed' : 'failed'}">
                  <div class="clm-test-header">
                    <i data-lucide="${r.passed ? 'check' : 'x'}" style="width: 16px; height: 16px;"></i>
                    <span>${this.escapeHtml(r.name)}</span>
                    <span class="clm-test-time">${r.executionTime}ms</span>
                  </div>
                  ${!r.passed ? `
                    <div class="clm-test-details">
                      <div><strong>Expected:</strong> <code>${JSON.stringify(r.expected)}</code></div>
                      <div><strong>Actual:</strong> <code>${JSON.stringify(r.actual)}</code></div>
                      ${r.error ? `<div><strong>Error:</strong> ${this.escapeHtml(r.error)}</div>` : ''}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Re-initialize Lucide icons
      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (error) {
      resultsContent.innerHTML = `
        <div class="clm-result-error">
          <div class="clm-result-header">
            <i data-lucide="alert-circle" style="width: 20px; height: 20px; color: #f87171;"></i>
            <span>Error Running Tests</span>
          </div>
          <div class="clm-result-details">
            <div class="clm-result-item">
              <strong>Message:</strong> ${this.escapeHtml(error.message)}
            </div>
          </div>
        </div>
      `;

      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }

  /**
   * Update execute button label based on test selection
   */
  updateExecuteButton(selectElement) {
    const button = selectElement.closest('.clm-execution-controls').querySelector('.clm-execute-btn');
    const label = button.querySelector('.clm-execute-label');
    const icon = button.querySelector('i');
    
    if (selectElement.value === '') {
      // No test selected - show "Run All Tests"
      label.textContent = 'Run All Tests';
      icon.setAttribute('data-lucide', 'check-square');
    } else {
      // Test selected - show "Execute Test X"
      const testIndex = parseInt(selectElement.value) + 1;
      label.textContent = `Execute Test ${testIndex}`;
      icon.setAttribute('data-lucide', 'play');
    }
    
    // Re-initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Execute single test or run all tests based on selection
   */
  async executeOrTest(button) {
    const testSelector = button.closest('.clm-container').querySelector('.clm-test-select');
    
    if (testSelector && testSelector.value !== '') {
      // A test is selected - execute single test
      await this.executeCLM(button);
    } else {
      // No test selected - run all tests
      await this.runTests(button);
    }
  }

  /**
   * Strip TypeScript type annotations for browser execution
   */
  stripTypeScript(code) {
    return code
      // Remove function return type annotations
      .replace(/\)\s*:\s*\w+\s*\{/g, ') {')
      .replace(/\)\s*:\s*Map<[^>]+>\s*\{/g, ') {')
      .replace(/\)\s*:\s*Array<[^>]+>\s*\{/g, ') {')
      // Remove type annotations from function parameters and variables
      .replace(/(\w+)\s*:\s*Map<[^>]+>/g, '$1')
      .replace(/(\w+)\s*:\s*number(?=\s*[,;)\]=])/g, '$1')
      .replace(/(\w+)\s*:\s*string(?=\s*[,;)\]=])/g, '$1')
      .replace(/(\w+)\s*:\s*boolean(?=\s*[,;)\]=])/g, '$1')
      .replace(/(\w+)\s*:\s*any(?=\s*[,;)\]=])/g, '$1')
      .replace(/(\w+)\s*:\s*void(?=\s*[,;)\]=])/g, '$1')
      .replace(/(\w+)\s*:\s*Array<[^>]+>/g, '$1')
      .replace(/(\w+)\s*:\s*\w+\[\]/g, '$1')
      // Remove type assertions (as keyword)
      .replace(/\s+as\s+number\b/g, '')
      .replace(/\s+as\s+string\b/g, '')
      .replace(/\s+as\s+boolean\b/g, '')
      .replace(/\s+as\s+any\b/g, '')
      // Remove non-null assertions (! after expressions)
      .replace(/\.get\([^)]+\)!/g, match => match.replace('!', ''))
      .replace(/\.(\w+)!/g, '.$1');
  }

  /**
   * Extract tests from YAML content
   */
  extractTests(rawContent) {
    const tests = [];
    const testRegex = /- name:\s*"([^"]+)"\s+type:\s*"([^"]+)"\s+input:\s*(\d+)\s+expected:\s*(\d+)/g;
    let match;

    while ((match = testRegex.exec(rawContent)) !== null) {
      tests.push({
        name: match[1],
        type: match[2],
        input: parseInt(match[3]),
        expected: parseInt(match[4])
      });
    }

    return tests;
  }

  /**
   * Handle mode change from UI
   */
  changeMode(newMode) {
    executionModeManager.setMode(newMode);
  }
}

// Make CLMRenderer globally available for onclick handlers
if (typeof window !== 'undefined') {
  window.clmRenderer = new CLMRenderer();
}

// Auto-register if RendererRegistry is available
if (typeof window !== 'undefined' && window.rendererRegistry) {
  window.rendererRegistry.register('clm', new CLMRenderer());
  console.log('[CLM] CLM Renderer registered');
}
