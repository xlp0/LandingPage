/**
 * SandboxWorker - Execute code in isolated Web Worker
 *
 * Provides safe execution environment for PCard logic
 */
/**
 * Worker code as inline string (will be converted to Blob URL)
 */
const WORKER_CODE = `
// Sandboxed execution environment
self.onmessage = async function(e) {
  const request = e.data;
  
  try {
    if (request.method === 'pcard.execute') {
      const { pcard, context } = request.params;
      const result = await executeCode(pcard.code, pcard.input, context);
      self.postMessage({
        jsonrpc: '2.0',
        id: request.id,
        result
      });
    } else if (request.method === 'pcard.verify') {
      const { expectedOutput, actualOutput } = request.params;
      const matches = JSON.stringify(expectedOutput) === JSON.stringify(actualOutput);
      self.postMessage({
        jsonrpc: '2.0',
        id: request.id,
        result: { verified: matches }
      });
    } else {
      throw new Error('Method not found: ' + request.method);
    }
  } catch (error) {
    self.postMessage({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32000,
        message: error.message || 'Execution error'
      }
    });
  }
};

// Execute JavaScript code in sandbox
async function executeCode(code, input, context) {
  // Create a sandboxed function
  const fn = new Function('input', 'context', code);
  return fn(input, context || {});
}
`;
/**
 * SandboxWorker - Manages Web Worker for isolated execution
 */
export class SandboxWorker {
    worker = null;
    pendingRequests = new Map();
    defaultTimeout = 5000; // 5 seconds
    /**
     * Initialize the sandbox worker
     */
    async init() {
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl);
        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);
        // Clean up blob URL
        URL.revokeObjectURL(workerUrl);
    }
    /**
     * Execute code in sandbox
     */
    requestCounter = 0;
    /**
     * Execute code in sandbox
     * Note: Uses internal JSON-RPC format with direct code, not LensProtocol Standard (hashes)
     */
    async execute(code, input, context) {
        if (!this.worker) {
            throw new Error('Worker not initialized. Call init() first.');
        }
        const request = {
            jsonrpc: '2.0',
            id: ++this.requestCounter,
            method: 'pcard.execute',
            params: { pcard: { code, input }, context }
        };
        return this.sendRequest(request);
    }
    /**
     * Verify output matches expected
     * Note: Uses internal JSON-RPC format with direct values
     */
    async verify(hash, expectedOutput, actualOutput) {
        if (!this.worker) {
            throw new Error('Worker not initialized. Call init() first.');
        }
        const request = {
            jsonrpc: '2.0',
            id: ++this.requestCounter,
            method: 'pcard.verify',
            params: { hash, expectedOutput, actualOutput }
        };
        return this.sendRequest(request);
    }
    /**
     * Send request and wait for response
     */
    sendRequest(request) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(request.id);
                reject(new Error(`Request ${request.id} timed out`));
            }, this.defaultTimeout);
            this.pendingRequests.set(request.id, { resolve, reject, timeout });
            this.worker.postMessage(request);
        });
    }
    /**
     * Handle worker message
     */
    handleMessage(event) {
        const response = event.data;
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(response.id);
            if (response.error) {
                pending.reject(new Error(`Error ${response.error.code}: ${response.error.message}`));
            }
            else {
                pending.resolve(response.result);
            }
        }
    }
    /**
     * Handle worker error
     */
    handleError(event) {
        console.error('Worker error:', event.message);
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(`Worker error: ${event.message}`));
        }
        this.pendingRequests.clear();
    }
    /**
     * Terminate the worker
     */
    terminate() {
        if (this.worker) {
            // Reject pending requests
            for (const [id, pending] of this.pendingRequests) {
                clearTimeout(pending.timeout);
                pending.reject(new Error('Worker terminated'));
            }
            this.pendingRequests.clear();
            this.worker.terminate();
            this.worker = null;
        }
    }
    /**
     * Set timeout for requests
     */
    setTimeout(ms) {
        this.defaultTimeout = ms;
    }
}
//# sourceMappingURL=SandboxWorker.js.map