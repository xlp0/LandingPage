export class NetworkSecurity {
    config;
    constructor(config) {
        this.config = config || this.loadSecurityConfigFromEnv();
    }
    /**
     * Load security configuration from environment variables
     */
    loadSecurityConfigFromEnv() {
        const parseList = (value) => {
            if (!value)
                return undefined;
            return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
        };
        return {
            allowed_domains: parseList(process.env.CLM_ALLOWED_DOMAINS),
            blocked_domains: parseList(process.env.CLM_BLOCKED_DOMAINS),
            allowed_protocols: parseList(process.env.CLM_ALLOWED_PROTOCOLS),
            block_private_ips: process.env.CLM_BLOCK_PRIVATE_IPS === 'true',
            block_localhost: process.env.CLM_BLOCK_LOCALHOST === 'true'
        };
    }
    /**
     * Validate URL against security policy
     * Throws SecurityViolationError if URL is not allowed
     */
    validateUrl(urlString) {
        let url;
        try {
            url = new URL(urlString);
        }
        catch {
            throw this.createSecurityError('DOMAIN_BLOCKED', `Invalid URL: ${urlString}`, urlString);
        }
        const hostname = url.hostname.toLowerCase();
        const protocol = url.protocol.replace(':', '');
        // 1. Check blocked domains (takes precedence)
        if (this.config.blocked_domains) {
            for (const pattern of this.config.blocked_domains) {
                if (this.matchDomainPattern(hostname, pattern)) {
                    throw this.createSecurityError('DOMAIN_BLOCKED', `Domain '${hostname}' is blocked by security policy`, urlString);
                }
            }
        }
        // 2. Check allowed domains (if configured, only these are allowed)
        if (this.config.allowed_domains && this.config.allowed_domains.length > 0) {
            const isAllowed = this.config.allowed_domains.some(pattern => this.matchDomainPattern(hostname, pattern));
            if (!isAllowed) {
                throw this.createSecurityError('DOMAIN_NOT_ALLOWED', `Domain '${hostname}' is not in the allowed list`, urlString);
            }
        }
        // 3. Check allowed protocols
        if (this.config.allowed_protocols && this.config.allowed_protocols.length > 0) {
            if (!this.config.allowed_protocols.includes(protocol)) {
                throw this.createSecurityError('PROTOCOL_NOT_ALLOWED', `Protocol '${protocol}' is not allowed. Allowed: ${this.config.allowed_protocols.join(', ')}`, urlString);
            }
        }
        // 4. Check localhost blocking
        if (this.config.block_localhost) {
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
                throw this.createSecurityError('LOCALHOST_BLOCKED', 'Localhost access is blocked by security policy', urlString);
            }
        }
        // 5. Check private IP blocking
        if (this.config.block_private_ips) {
            if (this.isPrivateIP(hostname)) {
                throw this.createSecurityError('PRIVATE_IP_BLOCKED', `Private IP '${hostname}' is blocked by security policy`, urlString);
            }
        }
    }
    /**
     * Match hostname against domain pattern (supports wildcards like *.example.com)
     */
    matchDomainPattern(hostname, pattern) {
        const patternLower = pattern.toLowerCase();
        if (patternLower.startsWith('*.')) {
            // Wildcard pattern: *.example.com matches sub.example.com, a.b.example.com
            const suffix = patternLower.slice(1); // .example.com
            return hostname.endsWith(suffix) || hostname === patternLower.slice(2);
        }
        return hostname === patternLower;
    }
    /**
     * Check if hostname is a private IP address
     */
    isPrivateIP(hostname) {
        // Simple regex checks for common private IP ranges
        const privatePatterns = [
            /^10\.\d+\.\d+\.\d+$/, // 10.x.x.x
            /^192\.168\.\d+\.\d+$/, // 192.168.x.x
            /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // 172.16-31.x.x
            /^169\.254\.\d+\.\d+$/, // Link-local
            /^fc00:/i, // IPv6 private
            /^fd00:/i, // IPv6 private
        ];
        return privatePatterns.some(pattern => pattern.test(hostname));
    }
    createSecurityError(code, message, url) {
        const error = new Error(message);
        error.securityViolation = { code, message, url };
        return error;
    }
}
//# sourceMappingURL=NetworkSecurity.js.map