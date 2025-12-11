/**
 * HashValidator - Computes SHA-256 hashes using Web Crypto API
 */
export declare class HashValidator {
    /**
     * Compute hash of content using specified algorithm
     */
    static computeHash(content: Uint8Array | string, algorithm?: string): Promise<string>;
    /**
     * Validate that content matches expected hash
     */
    static validate(content: Uint8Array | string, expectedHash: string): Promise<boolean>;
}
//# sourceMappingURL=HashValidator.d.ts.map