/**
 * Valid hash algorithms supported by the system
 */
const VALID_HASH_ALGORITHMS = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'];
export class GTime {
    static DEFAULT_ALGORITHM = 'sha256';
    /**
     * Generate a GTime stamp for the current moment
     * Format: HASH_ALGO|TIMESTAMP|REGION_CODE
     */
    static stampNow(hashAlgorithm = this.DEFAULT_ALGORITHM) {
        const algo = hashAlgorithm.toLowerCase();
        // Use ISO string for timestamp (UTC)
        const timestamp = new Date().toISOString();
        const region = 'UTC'; // Defaulting to UTC for JS implementation
        return `${algo}|${timestamp}|${region}`;
    }
    /**
     * Parse a GTime string
     */
    static parse(gtime) {
        const parts = gtime.split('|');
        if (parts.length !== 3) {
            throw new Error(`Invalid GTime format: ${gtime}`);
        }
        return {
            algorithm: parts[0],
            timestamp: new Date(parts[1]),
            region: parts[2]
        };
    }
    /**
     * Get the hash algorithm from a GTime string
     */
    static getHashAlgorithm(gtime) {
        return this.parse(gtime).algorithm;
    }
    /**
     * Get the timestamp from a GTime string
     */
    static getTimestamp(gtime) {
        return this.parse(gtime).timestamp;
    }
    /**
     * Get the region code from a GTime string
     */
    static getRegionCode(gtime) {
        return this.parse(gtime).region;
    }
    /**
     * Check if the provided hash function is valid.
     * Matches Python's GTime.is_valid_hash_function()
     */
    static isValidHashFunction(hashFunction) {
        if (!hashFunction || typeof hashFunction !== 'string') {
            return false;
        }
        return VALID_HASH_ALGORITHMS.includes(hashFunction.toLowerCase());
    }
    /**
     * Check if the provided region code is valid.
     * Matches Python's GTime.is_valid_region_code()
     */
    static isValidRegionCode(regionCode) {
        return Boolean(regionCode && regionCode === regionCode.toUpperCase());
    }
    /**
     * Check if the provided timestamp is in ISO format.
     * Matches Python's GTime.is_iso_format()
     */
    static isIsoFormat(timestamp) {
        if (!timestamp || typeof timestamp !== 'string') {
            return false;
        }
        try {
            const date = new Date(timestamp);
            // Check if it's a valid date and the string contains expected ISO patterns
            if (isNaN(date.getTime())) {
                return false;
            }
            // ISO format should have 'T' separator or be a valid date string
            // Accept formats like: 2024-12-04T12:00:00.000Z or 2024-12-04T12:00:00
            const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
            return isoPattern.test(timestamp);
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=GTime.js.map