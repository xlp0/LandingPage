import { MCard } from '../../../model/MCard.js';
// ============ Rate Limiting ============
export class RateLimiter {
    limits;
    defaultLimit;
    constructor(tokensPerSecond = 10, maxBurst = 20) {
        this.limits = new Map();
        this.defaultLimit = { tokensPerSecond, maxBurst };
    }
    /**
     * Check if request allowed. Consumes a token if allowed.
     */
    check(domain) {
        const now = Date.now();
        const bucket = this.limits.get(domain) || {
            tokens: this.defaultLimit.maxBurst,
            lastRefill: now
        };
        // Refill tokens based on time elapsed
        const elapsed = (now - bucket.lastRefill) / 1000;
        const refill = elapsed * this.defaultLimit.tokensPerSecond;
        bucket.tokens = Math.min(this.defaultLimit.maxBurst, bucket.tokens + refill);
        bucket.lastRefill = now;
        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            this.limits.set(domain, bucket);
            return true;
        }
        this.limits.set(domain, bucket);
        return false;
    }
    /**
     * Wait until rate limit allows request
     */
    async waitFor(domain) {
        while (!this.check(domain)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}
// ============ Response Caching ============
export class NetworkCache {
    memoryCache;
    collection;
    constructor(collection) {
        this.memoryCache = new Map();
        this.collection = collection;
    }
    /**
     * Generate cache key from request config
     */
    static generateKey(method, url, body) {
        const keyData = `${method}:${url}:${body || ''}`;
        // Simple hash for cache key
        let hash = 0;
        for (let i = 0; i < keyData.length; i++) {
            const char = keyData.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `cache_${Math.abs(hash).toString(36)}`;
    }
    /**
     * Get cached response if valid
     */
    get(cacheKey) {
        const cached = this.memoryCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return { ...cached.response, timing: { ...cached.response.timing, total: 0 } };
        }
        if (cached) {
            this.memoryCache.delete(cacheKey);
        }
        return null;
    }
    /**
     * Cache a response with TTL
     */
    async set(cacheKey, response, ttlSeconds, persist = false) {
        this.memoryCache.set(cacheKey, {
            response,
            expiresAt: Date.now() + (ttlSeconds * 1000)
        });
        if (persist && this.collection) {
            const cacheEntry = {
                key: cacheKey,
                response,
                expiresAt: Date.now() + (ttlSeconds * 1000),
                cachedAt: new Date().toISOString()
            };
            const card = await MCard.create(JSON.stringify(cacheEntry));
            await this.collection.add(card);
        }
    }
}
// ============ Retry Logic Helper ============
export class RetryUtils {
    static calculateBackoffDelay(attempt, strategy, baseDelay, maxDelay) {
        let delay;
        switch (strategy) {
            case 'exponential':
                delay = baseDelay * Math.pow(2, attempt - 1);
                break;
            case 'linear':
                delay = baseDelay * attempt;
                break;
            case 'constant':
            default:
                delay = baseDelay;
        }
        const jitter = delay * 0.1 * (Math.random() * 2 - 1);
        delay = Math.round(delay + jitter);
        return maxDelay ? Math.min(delay, maxDelay) : delay;
    }
    static shouldRetryStatus(status, retryOn) {
        const defaultRetryStatuses = [408, 429, 500, 502, 503, 504];
        const retryStatuses = retryOn || defaultRetryStatuses;
        return retryStatuses.includes(status);
    }
}
//# sourceMappingURL=NetworkInfrastructure.js.map