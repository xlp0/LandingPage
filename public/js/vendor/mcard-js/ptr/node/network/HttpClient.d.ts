import { HttpSuccessResponse, HttpErrorResponse, RetryConfig, CacheConfig, ResponseType } from '../NetworkConfig.js';
import { RateLimiter, NetworkCache } from './NetworkInfrastructure.js';
export declare class HttpClient {
    private rateLimiter;
    private cache;
    constructor(rateLimiter: RateLimiter, cache: NetworkCache);
    request(url: string, method: string, headers: Record<string, string>, body: BodyInit | undefined, config: {
        retry?: RetryConfig;
        cache?: CacheConfig;
        timeout?: number;
        responseType?: ResponseType;
    }): Promise<HttpSuccessResponse | HttpErrorResponse>;
}
//# sourceMappingURL=HttpClient.d.ts.map