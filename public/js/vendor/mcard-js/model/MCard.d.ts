/**
 * MCard - Content-addressable data container
 *
 * Each MCard has:
 * - content: Raw bytes (Uint8Array)
 * - hash: SHA-256 cryptographic hash
 * - g_time: Global timestamp with algorithm identifier
 */
export declare class MCard {
    readonly content: Uint8Array;
    readonly hash: string;
    readonly g_time: string;
    readonly contentType: string;
    readonly hashFunction: string;
    private constructor();
    /**
     * Create a new MCard from content
     */
    static create(content: string | Uint8Array, hashAlgorithm?: string): Promise<MCard>;
    /**
     * Create an MCard from existing data (e.g., from database)
     */
    static fromData(content: Uint8Array, hash: string, g_time: string): MCard;
    /**
     * Get content as text (UTF-8 decoded)
     */
    getContentAsText(): string;
    /**
     * Get content as raw bytes
     */
    getContent(): Uint8Array;
    /**
     * Convert to plain object
     */
    toObject(): {
        hash: string;
        content: string;
        g_time: string;
        contentType: string;
        hashFunction: string;
    };
}
//# sourceMappingURL=MCard.d.ts.map