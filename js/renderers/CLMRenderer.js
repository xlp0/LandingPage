/**
 * CLM (Cubical Logic Model) Renderer
 * Renders CLM YAML files with three-dimensional structure visualization
 */

export class CLMRenderer {
  constructor() {
    this.name = 'CLM Renderer';
    this.contentType = 'clm';
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
   * Parse YAML-like content into structured data
   */
  parseYAML(content) {
    try {
      const lines = content.split('\n');
      const result = {
        specification: {},
        implementation: {},
        verification: {},
        metadata: {}
      };
      
      let currentSection = null;
      let currentSubsection = null;
      let indentLevel = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (trimmed.startsWith('#') || trimmed === '') continue;
        
        // Detect main sections
        if (trimmed.startsWith('specification:')) {
          currentSection = 'specification';
          continue;
        } else if (trimmed.startsWith('implementation:')) {
          currentSection = 'implementation';
          continue;
        } else if (trimmed.startsWith('verification:')) {
          currentSection = 'verification';
          continue;
        } else if (trimmed.startsWith('metadata:')) {
          currentSection = 'metadata';
          continue;
        }
        
        // Parse key-value pairs
        if (trimmed.includes(':') && currentSection) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          
          if (!result[currentSection][key]) {
            result[currentSection][key] = value || {};
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('[CLM] Error parsing YAML:', error);
      return null;
    }
  }

  /**
   * Render CLM content as HTML
   */
  async render(content, options = {}) {
    const parsed = this.parseYAML(content);
    
    if (!parsed) {
      return `<div class="clm-error">Failed to parse CLM content</div>`;
    }

    const html = `
      <div class="clm-container">
        <div class="clm-header">
          <h2 class="clm-title">
            <i data-lucide="box" style="width: 20px; height: 20px;"></i>
            Cubical Logic Model
          </h2>
          <p class="clm-subtitle">Three-Dimensional Verifiable Computation</p>
        </div>

        <div class="clm-dimensions">
          <!-- Specification Dimension -->
          <div class="clm-dimension clm-specification">
            <div class="clm-dimension-header">
              <div class="clm-dimension-icon">
                <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
              </div>
              <h3>Specification</h3>
              <span class="clm-dimension-label">Abstract</span>
            </div>
            <div class="clm-dimension-content">
              ${this.renderSection(parsed.specification, 'specification')}
            </div>
          </div>

          <!-- Implementation Dimension -->
          <div class="clm-dimension clm-implementation">
            <div class="clm-dimension-header">
              <div class="clm-dimension-icon">
                <i data-lucide="code" style="width: 18px; height: 18px;"></i>
              </div>
              <h3>Implementation</h3>
              <span class="clm-dimension-label">Concrete</span>
            </div>
            <div class="clm-dimension-content">
              ${this.renderSection(parsed.implementation, 'implementation')}
            </div>
          </div>

          <!-- Verification Dimension -->
          <div class="clm-dimension clm-verification">
            <div class="clm-dimension-header">
              <div class="clm-dimension-icon">
                <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i>
              </div>
              <h3>Verification</h3>
              <span class="clm-dimension-label">Balanced</span>
            </div>
            <div class="clm-dimension-content">
              ${this.renderSection(parsed.verification, 'verification')}
            </div>
          </div>
        </div>

        <!-- Metadata Section -->
        ${Object.keys(parsed.metadata).length > 0 ? `
          <div class="clm-metadata">
            <h4>Metadata</h4>
            ${this.renderSection(parsed.metadata, 'metadata')}
          </div>
        ` : ''}

        <!-- Execution Controls -->
        <div class="clm-execution-controls">
          <button onclick="window.clmRenderer.executeCLM(this)" class="clm-execute-btn" data-clm-content='${btoa(JSON.stringify(parsed))}' data-clm-raw='${btoa(content)}'>
            <i data-lucide="play" style="width: 16px; height: 16px;"></i>
            Execute CLM
          </button>
          <button onclick="window.clmRenderer.runTests(this)" class="clm-test-btn" data-clm-content='${btoa(JSON.stringify(parsed))}' data-clm-raw='${btoa(content)}'>
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
   * Render a section of the CLM
   */
  renderSection(section, sectionType) {
    if (!section || typeof section !== 'object') {
      return '<p class="clm-empty">No data</p>';
    }

    let html = '<div class="clm-properties">';
    
    for (const [key, value] of Object.entries(section)) {
      if (typeof value === 'string' && value) {
        html += `
          <div class="clm-property">
            <span class="clm-property-key">${this.escapeHtml(key)}:</span>
            <span class="clm-property-value">${this.escapeHtml(value)}</span>
          </div>
        `;
      } else if (typeof value === 'object' && value !== null) {
        html += `
          <div class="clm-property">
            <span class="clm-property-key">${this.escapeHtml(key)}:</span>
            <div class="clm-nested">${this.renderSection(value, sectionType)}</div>
          </div>
        `;
      }
    }
    
    html += '</div>';
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
   * Execute CLM implementation code
   */
  executeCLM(button) {
    try {
      const base64Data = button.getAttribute('data-clm-content');
      const rawBase64 = button.getAttribute('data-clm-raw');
      const parsed = JSON.parse(atob(base64Data));
      const rawContent = atob(rawBase64);
      const resultsDiv = button.closest('.clm-container').querySelector('.clm-execution-results');
      const resultsContent = resultsDiv.querySelector('.clm-results-content');
      
      // Extract implementation code from raw YAML content
      let code = '';
      
      // Extract multi-line string after "code: |"
      const match = rawContent.match(/code:\s*\|([^\n]*\n(?:\s{6,}.*\n?)*)/);
      if (match) {
        // Extract lines and remove common indentation
        code = match[1]
          .split('\n')
          .map(line => line.replace(/^\s{6}/, '')) // Remove 6-space indent
          .join('\n')
          .trim();
      }
      
      if (!code) {
        resultsContent.innerHTML = '<div class="clm-error">No implementation code found</div>';
        resultsDiv.style.display = 'block';
        return;
      }
      
      // Create execution sandbox
      const logs = [];
      const customConsole = {
        log: (...args) => logs.push({ type: 'log', message: args.join(' ') }),
        error: (...args) => logs.push({ type: 'error', message: args.join(' ') }),
        warn: (...args) => logs.push({ type: 'warn', message: args.join(' ') })
      };
      
      // Execute code in sandbox
      const startTime = performance.now();
      let result;
      let error = null;
      
      try {
        // Create function from code
        // Wrap code in function and execute it
        const fn = new Function('console', `
          ${code}
        `);
        result = fn(customConsole);
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
        html += `<div class="clm-return-value"><h5>Return Value:</h5><pre>${this.escapeHtml(JSON.stringify(result, null, 2))}</pre></div>`;
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
      const parsed = JSON.parse(atob(base64Data));
      const rawContent = atob(rawBase64);
      const resultsDiv = button.closest('.clm-container').querySelector('.clm-execution-results');
      const resultsContent = resultsDiv.querySelector('.clm-results-content');
      
      // Extract implementation code from raw YAML
      let implCode = '';
      const codeMatch = rawContent.match(/code:\s*\|([^\n]*\n(?:\s{6,}.*\n?)*)/);
      if (codeMatch) {
        implCode = codeMatch[1]
          .split('\n')
          .map(line => line.replace(/^\s{6}/, ''))
          .join('\n')
          .trim();
      }
      
      // Extract tests - for now, use empty array (we'll implement test parsing later)
      const tests = [];
      
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
          // Create test function
          const fn = new Function('console', implCode + '\n; return typeof main === "function" ? main : undefined;');
          const mainFn = fn(console);
          
          if (typeof mainFn !== 'function') {
            testResults.push({
              index: index + 1,
              passed: false,
              error: 'No main function found'
            });
            failed++;
            return;
          }
          
          // Run test
          const result = mainFn();
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
