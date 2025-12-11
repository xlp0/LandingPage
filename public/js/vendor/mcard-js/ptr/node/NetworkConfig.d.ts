/**
 * NetworkConfig - Type definitions for Network IO operations
 *
 * Provides strong typing for all network builtin configurations
 * as defined in CLM_Network_IO_Specification.md
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type ResponseType = 'json' | 'text' | 'binary' | 'stream';
export type BackoffStrategy = 'exponential' | 'linear' | 'constant';
export interface RetryConfig {
    max_attempts: number;
    backoff: BackoffStrategy;
    base_delay: number;
    max_delay?: number;
    retry_on?: number[];
}
export interface CacheConfig {
    enabled: boolean;
    ttl: number;
    key?: string;
    storage: 'mcard' | 'memory';
}
export interface TimeoutConfig {
    connect?: number;
    read?: number;
    total?: number;
}
export interface HttpRequestConfig {
    url: string;
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: string | object;
    query_params?: Record<string, string>;
    timeout?: number | TimeoutConfig;
    response_type?: ResponseType;
    retry?: RetryConfig;
    cache?: CacheConfig;
    validate_ssl?: boolean;
    follow_redirects?: boolean;
    max_redirects?: number;
}
export interface HttpGetConfig extends Omit<HttpRequestConfig, 'method' | 'body'> {
}
export interface HttpPostConfig extends Omit<HttpRequestConfig, 'method'> {
    json?: object;
}
export interface HttpTiming {
    dns: number;
    connect: number;
    ttfb: number;
    total: number;
}
export interface HttpError {
    code: 'TIMEOUT' | 'CONNECTION_REFUSED' | 'SSL_ERROR' | 'HTTP_ERROR' | 'UNKNOWN';
    message: string;
    status: number | null;
    retries_attempted: number;
}
export interface HttpSuccessResponse {
    success: true;
    status: number;
    headers: Record<string, string>;
    body: unknown;
    timing: HttpTiming;
    mcard_hash?: string;
}
export interface HttpErrorResponse {
    success: false;
    error: HttpError;
}
export type HttpResponse = HttpSuccessResponse | HttpErrorResponse;
export interface MCardPayload {
    hash: string;
    content: string;
    g_time: string;
    contentType: string;
    hashFunction: string;
}
export interface MCardSendConfig {
    url: string;
    hash: string;
    headers?: Record<string, string>;
}
export interface ListenHttpConfig {
    port?: number;
    path?: string;
}
export type SyncMode = 'push' | 'pull' | 'both' | 'bidirectional';
export interface MCardSyncConfig {
    url: string;
    mode: SyncMode;
    headers?: Record<string, string>;
}
export interface ListenSyncConfig {
    port?: number;
    base_path?: string;
}
export interface SyncStats {
    mode: SyncMode;
    local_total: number;
    remote_total: number;
    synced: number;
}
export interface SyncResult {
    success: true;
    stats: SyncStats;
}
export interface IceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}
export interface WebRTCConfig {
    signaling_url: string;
    ice_servers?: IceServer[];
    peer_id?: string;
}
export interface WebRTCConnectConfig extends WebRTCConfig {
    target_peer_id: string;
    message?: string | object;
    await_response?: boolean;
    timeout?: number;
}
export interface WebRTCListenConfig extends WebRTCConfig {
    allowed_peers?: string[];
    on_message?: string;
}
export interface SessionRecordConfig {
    operation: 'init' | 'add' | 'flush' | 'batch' | 'summarize';
    sessionId: string;
    sender?: string;
    content?: string;
    maxBufferSize?: number;
    initialHeadHash?: string | null;
    operations?: SessionRecordConfig[];
    keepOriginals?: boolean;
}
export interface MCardReadConfig {
    hash: string;
    parse_json?: boolean;
}
export interface NetworkBuiltinConfig {
    builtin: 'http_request' | 'http_get' | 'http_post' | 'load_url' | 'mcard_send' | 'listen_http' | 'mcard_sync' | 'listen_sync' | 'webrtc_connect' | 'webrtc_listen' | 'session_record' | 'mcard_read' | 'run_command';
    config: HttpRequestConfig | HttpGetConfig | HttpPostConfig | MCardSendConfig | ListenHttpConfig | MCardSyncConfig | ListenSyncConfig | WebRTCConnectConfig | WebRTCListenConfig | SessionRecordConfig | MCardReadConfig | {
        command: string;
    };
}
export interface LoadUrlConfig {
    url: string;
    extract?: {
        mode: 'auto' | 'html' | 'pdf' | 'raw';
        selector?: string;
        remove?: string[];
    };
    process?: {
        clean_html?: boolean;
        normalize_whitespace?: boolean;
        max_length?: number;
    };
    cache?: CacheConfig;
}
export interface LoadUrlResult {
    url: string;
    content: string;
    status: number;
    headers: Record<string, string>;
    mcard_hash?: string;
}
/**
 * Network security configuration
 *
 * Environment Variables:
 * - CLM_ALLOWED_DOMAINS: Comma-separated list of allowed domains (e.g., "api.example.com,*.trusted.com")
 * - CLM_BLOCKED_DOMAINS: Comma-separated list of blocked domains (takes precedence)
 * - CLM_ALLOWED_PROTOCOLS: Comma-separated protocols (default: "https,http")
 * - CLM_BLOCK_PRIVATE_IPS: Set to "true" to block private IP ranges
 * - CLM_BLOCK_LOCALHOST: Set to "true" to block localhost/127.0.0.1
 */
export interface NetworkSecurityConfig {
    allowed_domains?: string[];
    blocked_domains?: string[];
    allowed_protocols?: string[];
    block_private_ips?: boolean;
    block_localhost?: boolean;
}
export interface SecurityViolationError {
    code: 'DOMAIN_BLOCKED' | 'DOMAIN_NOT_ALLOWED' | 'PROTOCOL_NOT_ALLOWED' | 'PRIVATE_IP_BLOCKED' | 'LOCALHOST_BLOCKED';
    message: string;
    url: string;
}
//# sourceMappingURL=NetworkConfig.d.ts.map