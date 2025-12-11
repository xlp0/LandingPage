import { HashValidator } from '../hash/HashValidator';
import { GTime } from './GTime';
import { ContentTypeInterpreter } from './detectors/ContentTypeInterpreter';
/**
 * MCard - Content-addressable data container
 *
 * Each MCard has:
 * - content: Raw bytes (Uint8Array)
 * - hash: SHA-256 cryptographic hash
 * - g_time: Global timestamp with algorithm identifier
 */
export class MCard {
    content;
    hash;
    g_time;
    contentType; // Defaulting to specific string or null
    hashFunction;
    constructor(content, hash, g_time, contentType, hashFunction) {
        this.content = content;
        this.hash = hash;
        this.g_time = g_time;
        this.contentType = contentType;
        this.hashFunction = hashFunction;
    }
    /**
     * Create a new MCard from content
     */
    static async create(content, hashAlgorithm = 'sha256') {
        if (content === null || content === undefined) {
            throw new Error('Content cannot be null or undefined');
        }
        const bytes = typeof content === 'string'
            ? new TextEncoder().encode(content)
            : content;
        if (bytes.length === 0) {
            throw new Error('Content cannot be empty');
        }
        const hash = await HashValidator.computeHash(bytes, hashAlgorithm);
        const g_time = GTime.stampNow(hashAlgorithm);
        const contentType = ContentTypeInterpreter.detect(bytes);
        return new MCard(bytes, hash, g_time, contentType, hashAlgorithm);
    }
    /**
     * Create an MCard from existing data (e.g., from database)
     */
    static fromData(content, hash, g_time) {
        const alg = GTime.getHashAlgorithm(g_time);
        const contentType = ContentTypeInterpreter.detect(content);
        return new MCard(content, hash, g_time, contentType, alg);
    }
    /**
     * Get content as text (UTF-8 decoded)
     */
    getContentAsText() {
        return new TextDecoder().decode(this.content);
    }
    /**
     * Get content as raw bytes
     */
    getContent() {
        return this.content;
    }
    /**
     * Convert to plain object
     */
    toObject() {
        return {
            hash: this.hash,
            content: this.getContentAsText(),
            g_time: this.g_time,
            contentType: this.contentType,
            hashFunction: this.hashFunction
        };
    }
}
//# sourceMappingURL=MCard.js.map