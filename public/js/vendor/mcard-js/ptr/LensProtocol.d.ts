/**
 * LensProtocol - JSON-RPC 2.0 communication for PTR
 *
 * Provides standardized message format for PCard execution
 */
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: unknown;
}
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export interface ExecuteParams {
    pcard_hash: string;
    target_hash: string;
    context?: Record<string, unknown>;
}
export interface VerifyParams {
    pcard_hash: string;
    target_hash: string;
    context?: Record<string, unknown>;
}
export interface RevealParams {
    card_hash: string;
    aspect: string;
}
/**
 * LensProtocol - Create and parse JSON-RPC messages
 */
export declare class LensProtocol {
    private static idCounter;
    /**
     * Create an execute request
     */
    static createExecuteRequest(pcard_hash: string, target_hash: string, context?: Record<string, unknown>): JsonRpcRequest;
    /**
     * Create a verify request
     */
    static createVerifyRequest(pcard_hash: string, target_hash: string, context?: Record<string, unknown>): JsonRpcRequest;
    /**
     * Create a reveal request
     */
    static createRevealRequest(card_hash: string, aspect: string): JsonRpcRequest;
    /**
     * Create a system status request
     */
    static createStatusRequest(): JsonRpcRequest;
    /**
     * Create a system health request
     */
    static createHealthRequest(): JsonRpcRequest;
    /**
     * Create a success response
     */
    static createSuccessResponse(id: string | number, result: unknown): JsonRpcResponse;
    /**
     * Create an error response
     */
    static createErrorResponse(id: string | number, code: number, message: string, data?: unknown): JsonRpcResponse;
    /**
     * Parse a JSON-RPC response
     */
    static parseResponse<T>(response: JsonRpcResponse): T;
}
export declare const ErrorCodes: {
    readonly PARSE_ERROR: -32700;
    readonly INVALID_REQUEST: -32600;
    readonly METHOD_NOT_FOUND: -32601;
    readonly INVALID_PARAMS: -32602;
    readonly INTERNAL_ERROR: -32603;
    readonly EXECUTION_ERROR: -32000;
    readonly VERIFICATION_FAILED: -32001;
    readonly TIMEOUT: -32002;
};
//# sourceMappingURL=LensProtocol.d.ts.map