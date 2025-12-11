/**
 * ContentHandle - UTF-8 aware handle validation and management
 *
 * Supports international characters (文檔, مستند, ドキュメント, документ)
 * Uses Unicode categories for validation
 */
const MAX_HANDLE_LENGTH = 255;
/**
 * Check if character is a valid starting character (Unicode letter)
 */
function isValidStartChar(char) {
    // Unicode letter categories: L (Letter)
    return /^\p{L}$/u.test(char);
}
/**
 * Check if character is valid in handle body
 */
function isValidBodyChar(char) {
    // Letters, numbers, underscore, hyphen, period, forward slash, space
    return /^[\p{L}\p{N}_./ -]$/u.test(char);
}
export class HandleValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'HandleValidationError';
    }
}
/**
 * Validate and normalize a handle string
 * @returns Normalized handle (NFC + lowercase)
 * @throws HandleValidationError if invalid
 */
export function validateHandle(handle) {
    if (!handle) {
        throw new HandleValidationError('Handle cannot be empty.');
    }
    // Normalize: NFC + trim + lowercase
    const normalized = handle.trim().normalize('NFC').toLowerCase();
    if (normalized.length === 0) {
        throw new HandleValidationError('Handle cannot be empty after normalization.');
    }
    if (normalized.length > MAX_HANDLE_LENGTH) {
        throw new HandleValidationError(`Handle '${handle}' is too long (${normalized.length} chars). Maximum is ${MAX_HANDLE_LENGTH}.`);
    }
    // Validate first character
    if (!isValidStartChar(normalized[0])) {
        throw new HandleValidationError(`Invalid handle '${handle}'. Must start with a letter (any language).`);
    }
    // Validate remaining characters
    for (let i = 1; i < normalized.length; i++) {
        if (!isValidBodyChar(normalized[i])) {
            throw new HandleValidationError(`Invalid character '${normalized[i]}' at position ${i} in handle '${handle}'.`);
        }
    }
    return normalized;
}
/**
 * ContentHandle - Mutable pointer to immutable MCard hash
 */
export class ContentHandle {
    handle;
    currentHash;
    createdAt;
    updatedAt;
    constructor(handle, currentHash, createdAt, updatedAt) {
        this.handle = validateHandle(handle);
        this.currentHash = currentHash;
        this.createdAt = createdAt ?? new Date();
        this.updatedAt = updatedAt ?? this.createdAt;
    }
    /**
     * Update handle to point to new hash
     * @returns Previous hash for history tracking
     */
    update(newHash) {
        const previousHash = this.currentHash;
        this.currentHash = newHash;
        this.updatedAt = new Date();
        return previousHash;
    }
    toObject() {
        return {
            handle: this.handle,
            currentHash: this.currentHash,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }
}
//# sourceMappingURL=Handle.js.map