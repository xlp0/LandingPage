/**
 * ContentHandle - UTF-8 aware handle validation and management
 *
 * Supports international characters (文檔, مستند, ドキュメント, документ)
 * Uses Unicode categories for validation
 */
export declare class HandleValidationError extends Error {
    constructor(message: string);
}
/**
 * Validate and normalize a handle string
 * @returns Normalized handle (NFC + lowercase)
 * @throws HandleValidationError if invalid
 */
export declare function validateHandle(handle: string): string;
/**
 * ContentHandle - Mutable pointer to immutable MCard hash
 */
export declare class ContentHandle {
    readonly handle: string;
    currentHash: string;
    readonly createdAt: Date;
    updatedAt: Date;
    constructor(handle: string, currentHash: string, createdAt?: Date, updatedAt?: Date);
    /**
     * Update handle to point to new hash
     * @returns Previous hash for history tracking
     */
    update(newHash: string): string;
    toObject(): {
        handle: string;
        currentHash: string;
        createdAt: string;
        updatedAt: string;
    };
}
//# sourceMappingURL=Handle.d.ts.map