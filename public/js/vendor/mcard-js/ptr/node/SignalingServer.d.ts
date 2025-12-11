/**
 * Signaling Server Module for WebRTC P2P Coordination.
 *
 * This module provides a reusable signaling server that can be started
 * programmatically from NetworkRuntime or standalone.
 *
 * Features:
 * - SSE (Server-Sent Events) for real-time message delivery
 * - Message buffering for offline peers
 * - Port conflict resolution (kill or fallback)
 * - Graceful shutdown
 */
import { Server } from 'http';
export interface SignalingServerConfig {
    port?: number;
    maxPortTries?: number;
    autoFindPort?: boolean;
}
export interface SignalingServerResult {
    success: boolean;
    port?: number;
    server?: Server;
    message?: string;
    error?: string;
}
/**
 * Create and start a signaling server.
 *
 * @param config - Server configuration
 * @returns Promise with server result
 */
export declare function createSignalingServer(config?: SignalingServerConfig): Promise<SignalingServerResult>;
/**
 * Stop a signaling server.
 */
export declare function stopSignalingServer(server: Server): Promise<void>;
//# sourceMappingURL=SignalingServer.d.ts.map