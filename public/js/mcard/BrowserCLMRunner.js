/**
 * BrowserCLMRunner - Browser-compatible CLM executor
 * 
 * Inspired by mcard-js CLMRunner but adapted for browser environment
 * Uses Function() instead of vm.Script for sandboxed execution
 * 
 * ✅ Fixed: Added logic helper, optimized test execution, added recursion guards
 */

import * as yaml from 'https://cdn.jsdelivr.net/npm/yaml@2.3.4/+esm';

export class BrowserCLMRunner {
  constructor(timeout = 5000) {
    this.timeout = timeout;
    this.maxRecursionDepth = 100; // Guard against infinite recursion
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
      const config = clm.clm?.concrete || {};
      
      // Check runtime - browser can only execute JavaScript
      const runtime = config.runtime?.toLowerCase() || 'javascript';
      if (runtime !== 'javascript' && runtime !== 'js' && runtime !== 'browser') {
        // For non-JS runtimes, generate JS code from operation if possible
        const generatedCode = this.generateJSFromOperation(config, input);
        if (generatedCode) {
          const result = await this.executeJavaScript(generatedCode, input);
          return {
            success: true,
            result,
            executionTime: Date.now() - startTime,
            clm: {
              chapter: clm.chapter?.title || 'CLM',
              concept: clm.clm?.abstract?.concept || 'Unknown'
            }
          };
        }
        throw new Error(`Runtime '${runtime}' not supported in browser. Use JavaScript CLM or provide inline code.`);
      }
      
      // Get JavaScript code
      const code = config.code || '';
      if (!code) {
        // Try to generate from operation
        const generatedCode = this.generateJSFromOperation(config, input);
        if (generatedCode) {
          const result = await this.executeJavaScript(generatedCode, input);
          return {
            success: true,
            result,
            executionTime: Date.now() - startTime,
            clm: {
              chapter: clm.chapter?.title || 'CLM',
              concept: clm.clm?.abstract?.concept || 'Unknown'
            }
          };
        }
        throw new Error('No executable JavaScript code found in CLM');
      }
      
      // Execute in sandbox
      const result = await this.executeJavaScript(code, input);
      
      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        clm: {
          chapter: clm.chapter?.title || 'CLM',
          concept: clm.clm?.abstract?.concept || 'Unknown'
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
   * Generate JavaScript code from CLM operation metadata
   * ✅ Allows browser execution of non-JS CLMs with standard operations
   * @param {Object} config - CLM concrete configuration
   * @param {Object} input - Input context
   * @returns {string|null} - Generated JS code or null
   */
  generateJSFromOperation(config, input) {
    // Prioritize entry_point over operation when operation is 'custom'
    let operation = config.entry_point?.toLowerCase() || config.operation?.toLowerCase();
    if (config.operation?.toLowerCase() === 'custom' && config.entry_point) {
      operation = config.entry_point.toLowerCase();
    }
    
    if (!operation) return null;
    
    // Map common operations to JS logic helper calls
    const operationMap = {
      'add': 'result = logic.add(context.a, context.b);',
      'addition': 'result = logic.add(context.a, context.b);',
      'subtract': 'result = logic.subtract(context.a, context.b);',
      'subtraction': 'result = logic.subtract(context.a, context.b);',
      'multiply': 'result = logic.multiply(context.a, context.b);',
      'multiplication': 'result = logic.multiply(context.a, context.b);',
      'divide': 'result = logic.divide(context.a, context.b);',
      'division': 'result = logic.divide(context.a, context.b);',
      'sum': 'result = logic.sum(context.values || [context.a, context.b]);',
      'average': 'result = logic.avg(context.values || [context.a, context.b]);',
      'avg': 'result = logic.avg(context.values || [context.a, context.b]);',
      'min': 'result = logic.min(context.a, context.b);',
      'max': 'result = logic.max(context.a, context.b);',
      'abs': 'result = logic.abs(context.value || context.a);',
      'sqrt': 'result = logic.sqrt(context.value || context.a);',
      'power': 'result = logic.power(context.base || context.a, context.exp || context.b);',
      'mod': 'result = logic.mod(context.a, context.b);',
      'modulo': 'result = logic.mod(context.a, context.b);',
    };
    
    return operationMap[operation] || null;
  }

  /**
   * Execute JavaScript code in a sandboxed environment
   * @param {string} code - JavaScript code
   * @param {Object} context - Execution context
   * @returns {Promise<any>} - Execution result
   */
  async executeJavaScript(code, context) {
    // Create logic helper object for CLM code that expects it
    const logic = {
      add: (a, b) => a + b,
      subtract: (a, b) => a - b,
      multiply: (a, b) => a * b,
      divide: (a, b) => b !== 0 ? a / b : NaN,
      mod: (a, b) => a % b,
      power: (a, b) => Math.pow(a, b),
      sqrt: (a) => Math.sqrt(a),
      abs: (a) => Math.abs(a),
      min: (...args) => Math.min(...args),
      max: (...args) => Math.max(...args),
      floor: (a) => Math.floor(a),
      ceil: (a) => Math.ceil(a),
      round: (a) => Math.round(a),
      // Comparison
      eq: (a, b) => a === b,
      ne: (a, b) => a !== b,
      lt: (a, b) => a < b,
      le: (a, b) => a <= b,
      gt: (a, b) => a > b,
      ge: (a, b) => a >= b,
      // Logic
      and: (a, b) => a && b,
      or: (a, b) => a || b,
      not: (a) => !a,
      // String
      concat: (...args) => args.join(''),
      length: (a) => a?.length ?? 0,
      // Array
      sum: (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0,
      avg: (arr) => Array.isArray(arr) && arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
      map: (arr, fn) => Array.isArray(arr) ? arr.map(fn) : [],
      filter: (arr, fn) => Array.isArray(arr) ? arr.filter(fn) : [],
      reduce: (arr, fn, init) => Array.isArray(arr) ? arr.reduce(fn, init) : init,
    };

    // Create sandbox with safe globals
    const sandbox = {
      context,
      target: context,
      input: context, // Alias for convenience
      result: undefined,
      logic, // ✅ Added logic helper
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
      Map,
      Set,
      RegExp,
      Error,
      Promise,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      // Browser APIs
      fetch: typeof window !== 'undefined' ? window.fetch?.bind(window) : undefined,
      Headers: typeof window !== 'undefined' ? window.Headers : undefined,
      Request: typeof window !== 'undefined' ? window.Request : undefined,
      Response: typeof window !== 'undefined' ? window.Response : undefined,
      URL: typeof window !== 'undefined' ? window.URL : undefined,
      URLSearchParams: typeof window !== 'undefined' ? window.URLSearchParams : undefined,
      setTimeout: undefined, // Disabled for safety
      setInterval: undefined, // Disabled for safety
    };

    // Build function with timeout
    const wrappedCode = `
      'use strict';
      try {
        ${code}
        return result !== undefined ? result : (typeof target !== 'undefined' ? target : context);
      } catch (e) {
        throw new Error('CLM execution failed: ' + e.message);
      }
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
   * ✅ Optimized: Parse CLM once, execute code directly for each test
   * @param {string} yamlContent - CLM YAML content
   * @returns {Promise<Object>} - Test results
   */
  async runTests(yamlContent) {
    try {
      const clm = this.parseCLM(yamlContent);
      const examples = clm.examples || [];
      
      if (examples.length === 0) {
        return {
          success: true,
          message: 'No test cases found',
          totalTests: 0,
          passed: 0,
          failed: 0,
          results: []
        };
      }

      // ✅ Get code once instead of re-parsing for each test
      const config = clm.clm?.concrete || {};
      let code = config.code || '';
      
      // ✅ Generate code from operation if no inline code
      if (!code) {
        code = this.generateJSFromOperation(config, {});
      }
      
      if (!code) {
        return {
          success: false,
          error: 'No executable code found in CLM (try adding inline JS or use a supported operation)',
          totalTests: examples.length,
          passed: 0,
          failed: examples.length,
          results: examples.map(ex => ({
            name: ex.name,
            input: ex.input,
            expected: ex.expected_output,
            actual: undefined,
            passed: false,
            executionTime: 0,
            error: 'No code to execute'
          }))
        };
      }

      const results = [];
      
      for (const example of examples) {
        const startTime = Date.now();
        let result, error;
        
        try {
          // ✅ Execute code directly instead of calling execute() which re-parses
          result = await this.executeJavaScript(code, example.input);
        } catch (e) {
          error = e.message;
        }
        
        const executionTime = Date.now() - startTime;
        const passed = error ? false : (
          example.expected_output !== undefined
            ? this.resultsEqual(result, example.expected_output)
            : true
        );
        
        results.push({
          name: example.name,
          input: example.input,
          expected: example.expected_output,
          actual: result,
          passed,
          executionTime,
          error
        });
      }

      const passedCount = results.filter(r => r.passed).length;
      const failedCount = results.filter(r => !r.passed).length;
      
      return {
        success: failedCount === 0,
        totalTests: results.length,
        passed: passedCount,
        failed: failedCount,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        totalTests: 0,
        passed: 0,
        failed: 0,
        results: []
      };
    }
  }

  /**
   * Compare two values with tolerance for numbers
   * ✅ Added depth parameter to prevent stack overflow on circular/deep structures
   * @param {any} a - First value
   * @param {any} b - Second value
   * @param {number} tolerance - Tolerance for numeric comparison
   * @param {number} depth - Current recursion depth
   * @returns {boolean} - Whether values are equal
   */
  resultsEqual(a, b, tolerance = 1e-9, depth = 0) {
    // ✅ Guard against infinite recursion
    if (depth > this.maxRecursionDepth) {
      console.warn('[CLM] Max recursion depth reached in resultsEqual');
      return false;
    }

    if (a === b) return true;
    if (a == null || b == null) return a === b;
    
    // Numbers with tolerance
    if (typeof a === 'number' && typeof b === 'number') {
      if (Number.isNaN(a) && Number.isNaN(b)) return true;
      if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
      return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
    }
    
    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => this.resultsEqual(val, b[i], tolerance, depth + 1));
    }
    
    // Objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => 
        keysB.includes(key) && this.resultsEqual(a[key], b[key], tolerance, depth + 1)
      );
    }
    
    // String comparison for other types
    return String(a) === String(b);
  }
}

export default BrowserCLMRunner;
