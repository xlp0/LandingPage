/**
 * LensProtocol - JSON-RPC 2.0 communication for PTR
 *
 * Provides standardized message format for PCard execution
 */
/**
 * LensProtocol - Create and parse JSON-RPC messages
 */
export class LensProtocol {
    static idCounter = 0;
    /**
     * Create an execute request
     */
    static createExecuteRequest(pcard_hash, target_hash, context) {
        return {
            jsonrpc: '2.0',
            id: ++this.idCounter,
            method: 'pcard.execute',
            params: { pcard_hash, target_hash, context }
        };
    }
    /**
     * Create a verify request
     */
    static createVerifyRequest(pcard_hash, target_hash, context) {
        return {
            jsonrpc: '2.0',
            id: ++this.idCounter,
            method: 'pcard.verify',
            params: { pcard_hash, target_hash, context }
        };
    }
    /**
     * Create a reveal request
     */
    static createRevealRequest(card_hash, aspect) {
        return {
            jsonrpc: '2.0',
            id: ++this.idCounter,
            method: 'lens.reveal',
            params: { card_hash, aspect }
        };
    }
    /**
     * Create a system status request
     */
    static createStatusRequest() {
        return {
            jsonrpc: '2.0',
            id: ++this.idCounter,
            method: 'system.status'
        };
    }
    /**
     * Create a system health request
     */
    static createHealthRequest() {
        return {
            jsonrpc: '2.0',
            id: ++this.idCounter,
            method: 'system.health'
        };
    }
    /**
     * Create a success response
     */
    static createSuccessResponse(id, result) {
        return { jsonrpc: '2.0', id, result };
    }
    /**
     * Create an error response
     */
    static createErrorResponse(id, code, message, data) {
        return { jsonrpc: '2.0', id, error: { code, message, data } };
    }
    /**
     * Parse a JSON-RPC response
     */
    static parseResponse(response) {
        if (response.error) {
            throw new Error(`JSON-RPC Error ${response.error.code}: ${response.error.message}`);
        }
        return response.result;
    }
}
// Standard JSON-RPC error codes
export const ErrorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    // Custom PTR errors
    EXECUTION_ERROR: -32000,
    VERIFICATION_FAILED: -32001,
    TIMEOUT: -32002
};
//# sourceMappingURL=LensProtocol.js.map