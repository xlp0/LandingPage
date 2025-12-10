/**
 * BrowserCLMRunner - Browser-compatible CLM executor
 * 
 * Inspired by mcard-js CLMRunner but adapted for browser environment
 * Uses Function() instead of vm.Script for sandboxed execution
 */

import * as yaml from 'https://cdn.jsdelivr.net/npm/yaml@2.3.4/+esm';

export class BrowserCLMRunner {
  constructor(timeout = 5000) {
    this.timeout = timeout;
  }

  /**
   * Parse CLM YAML content
   * @param {string} yamlContent - YAML content
   * @returns {Object} - Parsed CLM structure
   */
  parseCLM(yamlContent) {
    const parsed = yaml.parse(yamlContent);
    
    // Normalize legacy format (abstract/concrete/balanced at root)
    if (parsed.abstract && !parsed.clm) {
      return {
        version: '1.0',
        chapter: { id: 0, title: parsed.metadata?.name || 'CLM' },
        clm: {
          abstract: parsed.abstract,
          concrete: parsed.concrete,
          balanced: parsed.balanced
        },
        examples: this.extractExamples(parsed.balanced)
      };
    }
    
    // Standard format with clm key
    if (parsed.clm?.balanced?.test_cases && !parsed.examples) {
      parsed.examples = this.extractExamples(parsed.clm.balanced);
    }
    
    return parsed;
  }

  /**
   * Extract examples from balanced.test_cases
   * @param {Object} balanced - Balanced section
   * @returns {Array} - Examples array
   */
  extractExamples(balanced) {
    if (!balanced?.test_cases) return [];
    
    return balanced.test_cases.map(tc => {
      let input = tc.given;
      
      if (tc.when) {
        const params = tc.when.params || {};
        const context = tc.when.context || {};
        
        if (Object.keys(params).length > 0 || Object.keys(context).length > 0) {
          input = { ...tc.when, ...context, ...params };
          if (input.__input_content__ === undefined) {
            input.__input_content__ = tc.given;
          }
        } else if (typeof tc.when === 'object' && Object.keys(tc.when).length > 0) {
          input = { ...tc.when };
          if (input.__input_content__ === undefined) {
            input.__input_content__ = tc.given;
          }
        }
      }
      
      return {
        name: `Test Case: ${tc.given}`,
        input: input,
        expected_output: tc.then?.result
      };
    });
  }

  /**
   * Execute CLM with given input
   * @param {string} yamlContent - CLM YAML content
   * @param {Object} input - Input data
   * @returns {Promise<Object>} - Execution result
   */
  async execute(yamlContent, input = {}) {
    const startTime = Date.now();
    
    try {
      // Parse CLM
      const clm = this.parseCLM(yamlContent);
      const config = clm.clm.concrete;
      
      // Get JavaScript code
      const code = config.code || config.code_file || '';
      if (!code) {
        throw new Error('No JavaScript code found in CLM');
      }
      
      // Execute in sandbox
      const result = await this.executeJavaScript(code, input);
      
      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        clm: {
          chapter: clm.chapter?.title || 'CLM',
          concept: clm.clm.abstract?.concept || 'Unknown'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute JavaScript code in a sandboxed environment
   * @param {string} code - JavaScript code
   * @param {Object} context - Execution context
   * @returns {Promise<any>} - Execution result
   */
  async executeJavaScript(code, context) {
    // Create sandbox with safe globals
    const sandbox = {
      context,
      target: context,
      result: undefined,
      console: {
        log: (...args) => console.log('[CLM]', ...args),
        error: (...args) => console.error('[CLM]', ...args),
        warn: (...args) => console.warn('[CLM]', ...args),
      },
      Math,
      JSON,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      // Browser APIs
      fetch: window.fetch.bind(window),
      Headers: window.Headers,
      Request: window.Request,
      Response: window.Response,
      URL: window.URL,
      URLSearchParams: window.URLSearchParams,
    };

    // Build function with timeout
    const wrappedCode = `
      'use strict';
      ${code}
      return result !== undefined ? result : (typeof target !== 'undefined' ? target : context);
    `;

    try {
      // Create function from code
      const fn = new Function(...Object.keys(sandbox), wrappedCode);
      
      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), this.timeout);
      });
      
      const executionPromise = Promise.resolve(fn(...Object.values(sandbox)));
      
      const result = await Promise.race([executionPromise, timeoutPromise]);
      return result;
    } catch (error) {
      console.error('[CLM] Execution error:', error);
      throw error;
    }
  }

  /**
   * Run all test cases from CLM
   * @param {string} yamlContent - CLM YAML content
   * @returns {Promise<Object>} - Test results
   */
  async runTests(yamlContent) {
    const clm = this.parseCLM(yamlContent);
    const examples = clm.examples || [];
    
    if (examples.length === 0) {
      return {
        success: true,
        message: 'No test cases found',
        results: []
      };
    }

    const results = [];
    
    for (const example of examples) {
      const result = await this.execute(yamlContent, example.input);
      
      const passed = example.expected_output !== undefined
        ? this.resultsEqual(result.result, example.expected_output)
        : true;
      
      results.push({
        name: example.name,
        input: example.input,
        expected: example.expected_output,
        actual: result.result,
        passed,
        executionTime: result.executionTime,
        error: result.error
      });
    }

    const allPassed = results.every(r => r.passed);
    
    return {
      success: allPassed,
      totalTests: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    };
  }

  /**
   * Compare two values with tolerance for numbers
   * @param {any} a - First value
   * @param {any} b - Second value
   * @param {number} tolerance - Tolerance for numeric comparison
   * @returns {boolean} - Whether values are equal
   */
  resultsEqual(a, b, tolerance = 1e-9) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    
    // Numbers with tolerance
    if (typeof a === 'number' && typeof b === 'number') {
      if (Number.isNaN(a) && Number.isNaN(b)) return true;
      if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
      return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
    }
    
    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => this.resultsEqual(val, b[i], tolerance));
    }
    
    // Objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => 
        keysB.includes(key) && this.resultsEqual(a[key], b[key], tolerance)
      );
    }
    
    return a === b;
  }
}

export default BrowserCLMRunner;
