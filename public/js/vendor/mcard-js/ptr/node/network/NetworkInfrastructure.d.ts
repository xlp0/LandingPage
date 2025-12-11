import { CardCollection } from '../../../model/CardCollection.js';
import { HttpSuccessResponse, BackoffStrategy } from '../NetworkConfig.js';
export declare class RateLimiter {
    private limits;
    private defaultLimit;
    constructor(tokensPerSecond?: number, maxBurst?: number);
    /**
     * Check if request allowed. Consumes a token if allowed.
     */
    check(domain: string): boolean;
    /**
     * Wait until rate limit allows request
     */
    waitFor(domain: string): Promise<void>;
}
export declare class NetworkCache {
    private memoryCache;
    private collection?;
    constructor(collection?: CardCollection);
    /**
     * Generate cache key from request config
     */
    static generateKey(method: string, url: string, body?: string): string;
    /**
     * Get cached response if valid
     */
    get(cacheKey: string): HttpSuccessResponse | null;
    /**
     * Cache a response with TTL
     */
    set(cacheKey: string, response: HttpSuccessResponse, ttlSeconds: number, persist?: boolean): Promise<void>;
}
export declare class RetryUtils {
    static calculateBackoffDelay(attempt: number, strategy: BackoffStrategy, baseDelay: number, maxDelay?: number): number;
    static shouldRetryStatus(status: number, retryOn?: number[]): boolean;
}
//# sourceMappingURL=NetworkInfrastructure.d.ts.map