/**
 * Server CLM Runner
 * Executes CLM logic via the backend API (/api/clm/execute).
 * Used when Execution Mode is set to 'server' or 'auto' (fallback).
 */
export class ServerCLMRunner {
  constructor(apiBase = '/api/clm') {
    this.apiBase = apiBase;
  }

  /**
   * Execute CLM on the server
   * @param {string} code - The CLM code (YAML/JSON)
   * @param {object} input - Input data for execution
   * @returns {Promise<object>} Execution result
   */
  async execute(code, input) {
    try {
      console.log('[ServerRunner] Sending execution request...');
      const response = await fetch(`${this.apiBase}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clm: code,
          input: input
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server execution failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('[ServerRunner] Result:', result);
      
      // Normalize result format to match BrowserCLMRunner
      return {
        success: true,
        result: result.output, // Server should return 'output'
        executionTime: result.duration || 0,
        clm: {
          chapter: 'Server-Executed', // Placeholder as server might not parse metadata same way
          concept: 'Remote'
        }
      };

    } catch (error) {
      console.error('[ServerRunner] Execution error:', error);
      return {
        success: false,
        error: error.message,
        executionTime: 0
      };
    }
  }

  /**
   * Run tests on the server (Not yet implemented on backend)
   */
  async runTests(code) {
    console.warn('[ServerRunner] Server-side testing not yet implemented');
    return {
      success: false,
      error: 'Server-side testing not supported yet.',
      totalTests: 0,
      passed: 0,
      failed: 0,
      results: []
    };
  }
}
