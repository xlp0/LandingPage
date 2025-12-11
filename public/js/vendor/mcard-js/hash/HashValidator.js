/**
 * HashValidator - Computes SHA-256 hashes using Web Crypto API
 */
export class HashValidator {
    /**
     * Compute hash of content using specified algorithm
     */
    static async computeHash(content, algorithm = 'sha256') {
        const data = typeof content === 'string'
            ? new TextEncoder().encode(content)
            : content;
        let algoName = 'SHA-256';
        switch (algorithm.toLowerCase()) {
            case 'sha1':
                algoName = 'SHA-1';
                break;
            case 'sha-1':
                algoName = 'SHA-1';
                break;
            case 'sha256':
                algoName = 'SHA-256';
                break;
            case 'sha-256':
                algoName = 'SHA-256';
                break;
            case 'sha384':
                algoName = 'SHA-384';
                break;
            case 'sha-384':
                algoName = 'SHA-384';
                break;
            case 'sha512':
                algoName = 'SHA-512';
                break;
            case 'sha-512':
                algoName = 'SHA-512';
                break;
            default:
                console.warn(`Algorithm ${algorithm} not natively supported or mapped, defaulting to SHA-256`);
                algoName = 'SHA-256';
        }
        // Create a copy to ensure we have a standard ArrayBuffer (not SharedArrayBuffer)
        const buffer = new Uint8Array(data).buffer;
        const hashBuffer = await crypto.subtle.digest(algoName, buffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    /**
     * Validate that content matches expected hash
     */
    static async validate(content, expectedHash) {
        const computedHash = await this.computeHash(content);
        return computedHash === expectedHash;
    }
}
//# sourceMappingURL=HashValidator.js.map