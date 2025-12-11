export declare class GTime {
    private static readonly DEFAULT_ALGORITHM;
    /**
     * Generate a GTime stamp for the current moment
     * Format: HASH_ALGO|TIMESTAMP|REGION_CODE
     */
    static stampNow(hashAlgorithm?: string): string;
    /**
     * Parse a GTime string
     */
    static parse(gtime: string): {
        timestamp: Date;
        algorithm: string;
        region: string;
    };
    /**
     * Get the hash algorithm from a GTime string
     */
    static getHashAlgorithm(gtime: string): string;
    /**
     * Get the timestamp from a GTime string
     */
    static getTimestamp(gtime: string): Date;
    /**
     * Get the region code from a GTime string
     */
    static getRegionCode(gtime: string): string;
    /**
     * Check if the provided hash function is valid.
     * Matches Python's GTime.is_valid_hash_function()
     */
    static isValidHashFunction(hashFunction: string): boolean;
    /**
     * Check if the provided region code is valid.
     * Matches Python's GTime.is_valid_region_code()
     */
    static isValidRegionCode(regionCode: string): boolean;
    /**
     * Check if the provided timestamp is in ISO format.
     * Matches Python's GTime.is_iso_format()
     */
    static isIsoFormat(timestamp: string): boolean;
}
//# sourceMappingURL=GTime.d.ts.map