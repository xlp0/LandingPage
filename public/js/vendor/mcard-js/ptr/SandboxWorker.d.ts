/**
 * SandboxWorker - Execute code in isolated Web Worker
 *
 * Provides safe execution environment for PCard logic
 */
/**
 * SandboxWorker - Manages Web Worker for isolated execution
 */
export declare class SandboxWorker {
    private worker;
    private pendingRequests;
    private defaultTimeout;
    /**
     * Initialize the sandbox worker
     */
    init(): Promise<void>;
    /**
     * Execute code in sandbox
     */
    private requestCounter;
    /**
     * Execute code in sandbox
     * Note: Uses internal JSON-RPC format with direct code, not LensProtocol Standard (hashes)
     */
    execute(code: string, input: unknown, context?: Record<string, unknown>): Promise<unknown>;
    /**
     * Verify output matches expected
     * Note: Uses internal JSON-RPC format with direct values
     */
    verify(hash: string, expectedOutput: unknown, actualOutput: unknown): Promise<{
        verified: boolean;
    }>;
    /**
     * Send request and wait for response
     */
    private sendRequest;
    /**
     * Handle worker message
     */
    private handleMessage;
    /**
     * Handle worker error
     */
    private handleError;
    /**
     * Terminate the worker
     */
    terminate(): void;
    /**
     * Set timeout for requests
     */
    setTimeout(ms: number): void;
}
//# sourceMappingURL=SandboxWorker.d.ts.map