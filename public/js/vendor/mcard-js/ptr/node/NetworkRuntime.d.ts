import { Runtime } from './RuntimeInterface.js';
import { CardCollection } from '../../model/CardCollection.js';
/**
 * Network Runtime for handling declarative network operations.
 */
export declare class NetworkRuntime implements Runtime {
    private collection?;
    private security;
    private cache;
    private rateLimiter;
    private httpClient;
    private sessions;
    constructor(collection?: CardCollection);
    execute(_code: string, context: unknown, config: any, _chapterDir: string): Promise<unknown>;
    private handleHttpGet;
    private handleHttpPost;
    private handleHttpRequest;
    private handleLoadUrl;
    private handleMCardSend;
    private handleListenHttp;
    private handleMCardSync;
    private getPeerConnectionClass;
    private handleWebRTCConnect;
    private _setupP2PProtocol;
    private handleWebRTCListen;
    private handleListenSync;
    private interpolate;
    private interpolateHeaders;
    private handleSessionRecord;
    private handleMCardRead;
    handleOrchestrator(config: any, context: any): Promise<any>;
    handleRunCommand(config: {
        command: string;
        background?: boolean;
    }, context: any): Promise<any>;
    private handleSignalingServer;
}
//# sourceMappingURL=NetworkRuntime.d.ts.map