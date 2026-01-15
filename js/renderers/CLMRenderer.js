/**
 * CLM (Cubical Logic Model) Renderer
 * Renders CLM YAML files with three-dimensional structure visualization
 * ✅ Uses BrowserCLMRunner (library's CLMRunner not exported)
 */

import { BrowserCLMRunner } from '/public/js/mcard/BrowserCLMRunner.js';

export class CLMRenderer {
  constructor() {
    this.name = 'CLM Renderer';
    this.contentType = 'clm';
    this.runner = new BrowserCLMRunner();
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
        result.specification = parsed.clm.abstract_spec || {};
        result.implementation = parsed.clm.concrete_impl || {};
        result.verification = parsed.clm.balanced_exp || {};
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
          <button onclick="window.clmRenderer.executeCLM(this)" class="clm-execute-btn" data-clm-content='${this.toBase64(JSON.stringify(parsed))}' data-clm-raw='${this.toBase64(content)}'>
            <i data-lucide="play" style="width: 16px; height: 16px;"></i>
            Execute CLM
          </button>
          <button onclick="window.clmRenderer.runTests(this)" class="clm-test-btn" data-clm-content='${this.toBase64(JSON.stringify(parsed))}' data-clm-raw='${this.toBase64(content)}'>
            <i data-lucide="check-square" style="width: 16px; height: 16px;"></i>
            Run Tests
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
    const container = button.closest('.clm-container');

    // Update tab buttons
    const buttons = container.querySelectorAll('.clm-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Update tab panels
    const panels = container.querySelectorAll('.clm-tab-panel');
    panels.forEach(panel => {
      if (panel.dataset.panel === tabName) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Re-initialize Lucide icons in the new tab if needed
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * Execute CLM with user input
   * ✅ Uses BrowserCLMRunner (library's CLMRunner not exported)
   */
  async executeCLM(button) {
    const rawContent = atob(button.dataset.clmRaw);
    const resultsDiv = button.closest('.clm-container').querySelector('.clm-execution-results');
    const resultsContent = resultsDiv.querySelector('.clm-results-content');

    // Show results panel
    resultsDiv.style.display = 'block';
    resultsContent.innerHTML = '<div class="clm-loading">Executing...</div>';

    try {
      // Get input from user (simple prompt for now)
      const inputStr = prompt('Enter input (JSON format):', '{}');
      if (inputStr === null) {
        resultsDiv.style.display = 'none';
        return;
      }

      const input = JSON.parse(inputStr);

      // Execute using BrowserCLMRunner
      const result = await this.runner.execute(rawContent, input);

      if (result.success) {
        resultsContent.innerHTML = `
          <div class="clm-result-success">
            <div class="clm-result-header">
              <i data-lucide="check-circle" style="width: 20px; height: 20px; color: #4ade80;"></i>
              <span>Execution Successful</span>
            </div>
            <div class="clm-result-details">
              <div class="clm-result-item">
                <strong>Execution Time:</strong> ${result.executionTime}ms
              </div>
              <div class="clm-result-item">
                <strong>Chapter:</strong> ${result.clm.chapter}
              </div>
              <div class="clm-result-item">
                <strong>Concept:</strong> ${result.clm.concept}
              </div>
              <div class="clm-result-item">
                <strong>Result:</strong>
                <pre class="clm-result-output">${JSON.stringify(result.result, null, 2)}</pre>
              </div>
            </div>
          </div>
        `;
      } else {
        resultsContent.innerHTML = `
          <div class="clm-result-error">
            <div class="clm-result-header">
              <i data-lucide="x-circle" style="width: 20px; height: 20px; color: #f87171;"></i>
              <span>Execution Failed</span>
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
   * Execute CLM implementation code
   */
  executeCLM(button) {
    try {
      const base64Data = button.getAttribute('data-clm-content');
      const rawBase64 = button.getAttribute('data-clm-raw');
      const parsed = JSON.parse(this.fromBase64(base64Data));
      const rawContent = this.fromBase64(rawBase64);
      const resultsDiv = button.closest('.clm-container').querySelector('.clm-execution-results');
      const resultsContent = resultsDiv.querySelector('.clm-results-content');

      // Extract implementation code from raw YAML content
      let code = '';

      // Find the start of code block
      const codeStart = rawContent.indexOf('code: |');
      if (codeStart !== -1) {
        // Get everything after "code: |"
        const afterCode = rawContent.substring(codeStart + 7); // 7 = length of "code: |"

        // Find the next top-level key (dependencies, metadata, etc.)
        // Top-level keys have 4 spaces or less indentation
        const lines = afterCode.split('\n');
        const codeLines = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Stop if we hit a line with 4 or fewer leading spaces (next YAML key)
          if (line.length > 0 && !line.startsWith('      ') && line.trim() !== '') {
            break;
          }

          // Add line, removing 6-space indentation
          if (line.startsWith('      ')) {
            codeLines.push(line.substring(6));
          } else if (line.trim() === '') {
            codeLines.push(''); // Preserve empty lines
          }
        }

        code = codeLines.join('\n').trim();
      }

      if (!code) {
        resultsContent.innerHTML = '<div class="clm-error">No implementation code found</div>';
        resultsDiv.style.display = 'block';
        return;
      }

      // Strip TypeScript type annotations for browser execution
      code = this.stripTypeScript(code);

      // Create execution sandbox
      const logs = [];
      const customConsole = {
        log: (...args) => logs.push({ type: 'log', message: args.join(' ') }),
        error: (...args) => logs.push({ type: 'error', message: args.join(' ') }),
        warn: (...args) => logs.push({ type: 'warn', message: args.join(' ') })
      };

      // Detect if code expects numeric input or object data
      const expectsObject = code.includes('context.input') &&
        (code.includes('.hash') || code.includes('.type') || code.includes('.content'));

      // Create context object with appropriate input
      const context = {
        input: expectsObject ? {
          // Sample MCard data for DOM renderers
          hash: 'abc123def456789abcdef',
          type: 'clm',
          content: 'Sample CLM content for testing the DOM renderer',
          size: 1024,
          timestamp: Date.now()
        } : 5 // Default numeric input for calculators
      };

      // Execute code in sandbox
      const startTime = performance.now();
      let result;
      let error = null;

      try {
        // Create function from code with context
        // Wrap in IIFE to create fresh scope for each execution
        const fn = new Function('console', 'context', `
          'use strict';
          return (function() {
            ${code}
          })();
        `);
        result = fn(customConsole, context);
      } catch (e) {
        error = e;
      }

      const executionTime = (performance.now() - startTime).toFixed(2);

      // Display results
      let html = '<div class="clm-execution-output">';

      // Show execution time
      html += `<div class="clm-exec-time">⏱️ Execution time: ${executionTime}ms</div>`;

      // Show console logs
      if (logs.length > 0) {
        html += '<div class="clm-console-logs"><h5>Console Output:</h5>';
        logs.forEach(log => {
          html += `<div class="clm-log clm-log-${log.type}">${this.escapeHtml(log.message)}</div>`;
        });
        html += '</div>';
      }

      // Show return value
      if (result !== undefined) {
        html += `<div class="clm-return-value"><h5>Return Value:</h5>`;

        // Check if result is a DOM element
        if (result instanceof Element) {
          html += `<div class="clm-dom-result">`;
          html += `<div style="margin-bottom: 8px; color: #888; font-size: 13px;">DOM Element Preview:</div>`;
          html += `<div style="border: 1px solid #3e3e42; border-radius: 4px; padding: 12px; background: #2a2d2e;">`;
          html += result.outerHTML;
          html += `</div>`;
          html += `<div style="margin-top: 8px; color: #888; font-size: 13px;">HTML Source:</div>`;
          html += `<pre style="background: #2a2d2e; padding: 12px; border-radius: 4px; overflow-x: auto;">${this.escapeHtml(result.outerHTML)}</pre>`;
          html += `</div>`;
        } else {
          html += `<pre>${this.escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
        }

        html += `</div>`;
      }

      // Show error if any
      if (error) {
        html += `<div class="clm-error"><h5>Error:</h5><pre>${this.escapeHtml(error.toString())}</pre></div>`;
      }

      html += '</div>';

      resultsContent.innerHTML = html;
      resultsDiv.style.display = 'block';

      // Re-initialize Lucide icons
      if (window.lucide) lucide.createIcons();

    } catch (e) {
      console.error('[CLMRenderer] Execution error:', e);
      alert('Failed to execute CLM: ' + e.message);
    }
  }

  /**
   * Run verification tests
   */
  runTests(button) {
    try {
      const base64Data = button.getAttribute('data-clm-content');
      const rawBase64 = button.getAttribute('data-clm-raw');
      const parsed = JSON.parse(this.fromBase64(base64Data));
      const rawContent = this.fromBase64(rawBase64);
      const resultsDiv = button.closest('.clm-container').querySelector('.clm-execution-results');
      const resultsContent = resultsDiv.querySelector('.clm-results-content');

      // Extract implementation code from raw YAML
      let implCode = '';
      const codeStart = rawContent.indexOf('code: |');
      if (codeStart !== -1) {
        const afterCode = rawContent.substring(codeStart + 7);
        const lines = afterCode.split('\n');
        const codeLines = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.length > 0 && !line.startsWith('      ') && line.trim() !== '') {
            break;
          }
          if (line.startsWith('      ')) {
            codeLines.push(line.substring(6));
          } else if (line.trim() === '') {
            codeLines.push('');
          }
        }

        implCode = codeLines.join('\n').trim();
      }

      // Strip TypeScript
      implCode = this.stripTypeScript(implCode);

      // Extract tests from YAML
      const tests = this.extractTests(rawContent);

      if (!implCode) {
        resultsContent.innerHTML = '<div class="clm-error">No implementation code found</div>';
        resultsDiv.style.display = 'block';
        return;
      }

      if (!Array.isArray(tests) || tests.length === 0) {
        resultsContent.innerHTML = '<div class="clm-error">No tests found</div>';
        resultsDiv.style.display = 'block';
        return;
      }

      // Run tests
      const testResults = [];
      let passed = 0;
      let failed = 0;

      tests.forEach((test, index) => {
        try {
          // Create context with test input
          const context = {
            input: test.input
          };

          // Execute code with context in fresh scope
          const fn = new Function('console', 'context', `
            'use strict';
            return (function() {
              ${implCode}
            })();
          `);
          const result = fn(console, context);

          // Check result
          const expected = test.expected || test.output;
          const testPassed = JSON.stringify(result) === JSON.stringify(expected);

          testResults.push({
            index: index + 1,
            input: test.input,
            expected: expected,
            actual: result,
            passed: testPassed
          });

          if (testPassed) passed++;
          else failed++;

        } catch (e) {
          testResults.push({
            index: index + 1,
            passed: false,
            error: e.toString()
          });
          failed++;
        }
      });

      // Display test results
      let html = '<div class="clm-test-results">';
      html += `<div class="clm-test-summary">`;
      html += `<span class="clm-test-passed">✓ ${passed} passed</span>`;
      html += `<span class="clm-test-failed">✗ ${failed} failed</span>`;
      html += `<span class="clm-test-total">Total: ${testResults.length}</span>`;
      html += `</div>`;

      html += '<div class="clm-test-list">';
      testResults.forEach(test => {
        const status = test.passed ? 'passed' : 'failed';
        const icon = test.passed ? '✓' : '✗';

        html += `<div class="clm-test-case clm-test-${status}">`;
        html += `<div class="clm-test-header">${icon} Test ${test.index}</div>`;

        if (test.error) {
          html += `<div class="clm-test-error">${this.escapeHtml(test.error)}</div>`;
        } else {
          if (test.input !== undefined) {
            html += `<div class="clm-test-detail"><strong>Input:</strong> ${this.escapeHtml(JSON.stringify(test.input))}</div>`;
          }
          html += `<div class="clm-test-detail"><strong>Expected:</strong> ${this.escapeHtml(JSON.stringify(test.expected))}</div>`;
          html += `<div class="clm-test-detail"><strong>Actual:</strong> ${this.escapeHtml(JSON.stringify(test.actual))}</div>`;
        }

        html += `</div>`;
      });
      html += '</div>';
      html += '</div>';

      resultsContent.innerHTML = html;
      resultsDiv.style.display = 'block';

    } catch (e) {
      console.error('[CLMRenderer] Test execution error:', e);
      alert('Failed to run tests: ' + e.message);
    }
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
