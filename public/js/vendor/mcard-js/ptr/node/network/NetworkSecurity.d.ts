import { NetworkSecurityConfig } from '../NetworkConfig.js';
export declare class NetworkSecurity {
    private config;
    constructor(config?: NetworkSecurityConfig);
    /**
     * Load security configuration from environment variables
     */
    private loadSecurityConfigFromEnv;
    /**
     * Validate URL against security policy
     * Throws SecurityViolationError if URL is not allowed
     */
    validateUrl(urlString: string): void;
    /**
     * Match hostname against domain pattern (supports wildcards like *.example.com)
     */
    private matchDomainPattern;
    /**
     * Check if hostname is a private IP address
     */
    private isPrivateIP;
    private createSecurityError;
}
//# sourceMappingURL=NetworkSecurity.d.ts.map