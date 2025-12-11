import { MCard } from '../../../model/MCard.js';
import { NetworkCache, RetryUtils } from './NetworkInfrastructure.js';
export class HttpClient {
    rateLimiter;
    cache;
    constructor(rateLimiter, cache) {
        this.rateLimiter = rateLimiter;
        this.cache = cache;
    }
    async request(url, method, headers, body, config) {
        const startTime = Date.now();
        const fetchUrl = new URL(url);
        // 1. Check cache first (only for GET requests)
        const cacheConfig = config.cache;
        const cacheKey = NetworkCache.generateKey(method, fetchUrl.toString(), typeof body === 'string' ? body : undefined);
        if (cacheConfig?.enabled && method === 'GET') {
            const cachedResponse = this.cache.get(cacheKey);
            if (cachedResponse) {
                console.log(`[Network] Cache hit for ${url}`);
                return { ...cachedResponse, cached: true };
            }
        }
        // 2. Rate limiting
        const domain = fetchUrl.hostname;
        await this.rateLimiter.waitFor(domain);
        // 3. Retry configuration
        const retryConfig = config.retry || {
            max_attempts: 1,
            backoff: 'exponential',
            base_delay: 1000,
            max_delay: 30000
        };
        let lastError = null;
        let lastStatus = null;
        let retriesAttempted = 0;
        for (let attempt = 1; attempt <= retryConfig.max_attempts; attempt++) {
            const timeout = config.timeout || 30000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const ttfbStart = Date.now();
                const response = await fetch(fetchUrl.toString(), {
                    method,
                    headers,
                    body,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                // Check if we should retry based on status
                if (!response.ok && RetryUtils.shouldRetryStatus(response.status, retryConfig.retry_on)) {
                    lastStatus = response.status;
                    if (attempt < retryConfig.max_attempts) {
                        retriesAttempted++;
                        const delay = RetryUtils.calculateBackoffDelay(attempt, retryConfig.backoff, retryConfig.base_delay, retryConfig.max_delay);
                        console.log(`[Network] Retry ${attempt}/${retryConfig.max_attempts} for ${url} (status: ${response.status}, delay: ${delay}ms)`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                }
                // Process Response
                const ttfbTime = Date.now() - ttfbStart;
                let responseBody;
                const responseType = config.responseType || 'json';
                if (responseType === 'json') {
                    try {
                        responseBody = await response.json();
                    }
                    catch {
                        responseBody = await response.text(); // Fallback
                    }
                }
                else if (responseType === 'text') {
                    responseBody = await response.text();
                }
                else if (responseType === 'binary') {
                    const arrayBuffer = await response.arrayBuffer();
                    responseBody = Buffer.from(arrayBuffer).toString('base64');
                }
                else {
                    responseBody = await response.text();
                }
                const totalTime = Date.now() - startTime;
                // Calculate mcard_hash for content-addressed response
                let mcard_hash;
                try {
                    const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
                    const responseCard = await MCard.create(bodyStr);
                    mcard_hash = responseCard.hash;
                }
                catch {
                    // Non-critical: skip hash if creation fails
                }
                const timing = {
                    dns: 0,
                    connect: 0,
                    ttfb: ttfbTime,
                    total: totalTime
                };
                const result = {
                    success: true,
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: responseBody,
                    timing,
                    mcard_hash
                };
                // Cache successful GET responses
                if (cacheConfig?.enabled && method === 'GET' && response.ok) {
                    await this.cache.set(cacheKey, result, cacheConfig.ttl, cacheConfig.storage === 'mcard');
                }
                return result;
            }
            catch (error) {
                clearTimeout(timeoutId);
                lastError = error;
                // Only retry on network errors or timeouts
                if (attempt < retryConfig.max_attempts) {
                    retriesAttempted++;
                    const delay = RetryUtils.calculateBackoffDelay(attempt, retryConfig.backoff, retryConfig.base_delay, retryConfig.max_delay);
                    console.log(`[Network] Retry ${attempt}/${retryConfig.max_attempts} for ${url} (error: ${lastError.message}, delay: ${delay}ms)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
        }
        // All retries exhausted
        const err = lastError;
        return {
            success: false,
            error: {
                code: err?.name === 'AbortError' ? 'TIMEOUT' : 'HTTP_ERROR',
                message: err?.message || 'Request failed after retries',
                status: lastStatus,
                retries_attempted: retriesAttempted
            }
        };
    }
}
//# sourceMappingURL=HttpClient.js.map