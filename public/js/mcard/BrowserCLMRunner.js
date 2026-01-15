/**
 * BrowserCLMRunner - Browser-compatible CLM executor
 * 
 * ✅ REFACTORED: Thin wrapper around mcard-js SandboxWorker
 * 
 * Delegates execution to mcard-js SandboxWorker for Web Worker isolation.
 * Only browser-specific adaptations are implemented here.
 * 
 * @see mcard-js/src/ptr/SandboxWorker.ts
 */

import * as yaml from '../vendor/yaml.esm.js';
import { SandboxWorker } from '../vendor/mcard-js/ptr/SandboxWorker.js';
import { LambdaRuntime } from '../vendor/mcard-js/ptr/lambda/LambdaRuntime.js';
import { MCardCollection } from '../vendor/mcard-js/MCardCollection.js';

// Operation code templates for standard CLM operations
const OPERATION_CODE = {
  add: 'result = input.a + input.b;',
  subtract: 'result = input.a - input.b;',
  multiply: 'result = input.a * input.b;',
  divide: 'result = input.b !== 0 ? input.a / input.b : NaN;',
  mod: 'result = input.a % input.b;',
  power: 'result = Math.pow(input.a, input.b);',
  sqrt: 'result = Math.sqrt(input.a);',
  abs: 'result = Math.abs(input.a);',
  min: 'result = Math.min(input.a, input.b);',
  max: 'result = Math.max(input.a, input.b);',
  sum: 'result = (input.values || [input.a, input.b]).reduce((a, b) => a + b, 0);',
  avg: 'const arr = input.values || [input.a, input.b]; result = arr.reduce((a, b) => a + b, 0) / arr.length;',
};

export class BrowserCLMRunner {
  constructor(timeout = 5000) {
    this.timeout = timeout;
    this.sandbox = new SandboxWorker();
    this.initialized = false;
  }

  /** Ensure SandboxWorker is initialized */
  async ensureInit() {
    if (!this.initialized) {
      await this.sandbox.init();
      this.sandbox.setTimeout(this.timeout);
      this.initialized = true;
    }
  }

  /** Terminate the SandboxWorker */
  terminate() {
    if (this.initialized) {
      this.sandbox.terminate();
      this.initialized = false;
    }
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
   */
  async execute(yamlContent, input = {}) {
    const startTime = Date.now();
    
    try {
      const clm = this.parseCLM(yamlContent);
      const config = clm.clm?.concrete || {};
      
      // Handle lambda runtime
      if (config.runtime === 'lambda') {
        return await this.executeLambda(clm, config, input, startTime);
      }
      
      // Handle regular JavaScript runtime
      const code = config.code || this.getOperationCode(config);
      
      if (!code) {
        throw new Error('No executable code found in CLM');
      }
      
      const result = await this.executeCode(code, input);
      
      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        clm: { chapter: clm.chapter?.title || 'CLM', concept: clm.clm?.abstract?.concept || 'Unknown' }
      };
    } catch (error) {
      return { success: false, error: error.message, executionTime: Date.now() - startTime };
    }
  }

  /**
   * Execute lambda calculus expression
   */
  async executeLambda(clm, config, input, startTime) {
    try {
      // Create in-memory collection for lambda terms
      const collection = new MCardCollection();
      const lambdaRuntime = new LambdaRuntime(collection);
      
      // Get the lambda expression from code or input
      const expression = input.expression || config.code;
      if (!expression) {
        throw new Error('No lambda expression provided');
      }
      
      // Execute lambda operation (normalize by default)
      const lambdaConfig = {
        operation: config.operation || 'normalize',
        strategy: config.strategy || 'normal',
        maxSteps: config.maxSteps || 1000
      };
      
      const result = await lambdaRuntime.execute(expression, input, lambdaConfig);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        result: result.prettyPrint || result.result,
        executionTime: Date.now() - startTime,
        clm: { chapter: clm.chapter?.title || 'CLM', concept: clm.clm?.abstract?.concept || 'Unknown' }
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
   * Get code for standard operation (uses OPERATION_CODE templates)
   */
  getOperationCode(config) {
    const op = (config.entry_point || config.operation || '').toLowerCase();
    return OPERATION_CODE[op] || OPERATION_CODE[op.replace('ition', '')] || null;
  }

  /**
   * Execute JavaScript code via mcard-js SandboxWorker
   * @param {string} code - JavaScript code
   * @param {Object} input - Input context
   * @returns {Promise<any>} - Execution result
   */
  async executeCode(code, input) {
    await this.ensureInit();
    
    const wrappedCode = `
      let result;
      ${code}
      return result;
    `;
    
    try {
      return await this.sandbox.execute(wrappedCode, input);
    } catch (error) {
      console.error('[CLM] Execution error:', error);
      throw error;
    }
  }

  /**
   * Run all test cases from CLM
   */
  async runTests(yamlContent) {
    try {
      const clm = this.parseCLM(yamlContent);
      const examples = clm.examples || [];
      
      if (examples.length === 0) {
        return { success: true, message: 'No test cases found', totalTests: 0, passed: 0, failed: 0, results: [] };
      }

      const config = clm.clm?.concrete || {};
      const code = config.code || this.getOperationCode(config);
      
      if (!code) {
        return {
          success: false,
          error: 'No executable code found in CLM',
          totalTests: examples.length,
          passed: 0,
          failed: examples.length,
          results: examples.map(ex => ({ name: ex.name, passed: false, error: 'No code' }))
        };
      }

      const results = [];
      for (const example of examples) {
        const startTime = Date.now();
        let result, error;
        
        try {
          result = await this.executeCode(code, example.input);
        } catch (e) {
          error = e.message;
        }
        
        const passed = !error && (example.expected_output === undefined || 
          JSON.stringify(result) === JSON.stringify(example.expected_output));
        
        results.push({
          name: example.name,
          input: example.input,
          expected: example.expected_output,
          actual: result,
          passed,
          executionTime: Date.now() - startTime,
          error
        });
      }

      const passedCount = results.filter(r => r.passed).length;
      return {
        success: passedCount === results.length,
        totalTests: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
        results
      };
    } catch (error) {
      return { success: false, error: error.message, totalTests: 0, passed: 0, failed: 0, results: [] };
    }
  }
}

export default BrowserCLMRunner;
