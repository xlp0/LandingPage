/**
 * ContentTypeInterpreter - Detects content type from bytes
 */
export class ContentTypeInterpreter {
    /**
     * Detect content type from Uint8Array content
     */
    static detect(content) {
        // Simple heuristics for MVP parity
        // 1. Check for null bytes (Binary indicator)
        // Scan first 1024 bytes
        const scanLength = Math.min(content.length, 1024);
        for (let i = 0; i < scanLength; i++) {
            if (content[i] === 0)
                return 'application/octet-stream';
        }
        // 2. Try UTF-8 decode
        try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            const text = decoder.decode(content);
            // Text detected. Check specific formats.
            if (this.isJson(text))
                return 'application/json';
            // Default text
            return 'text/plain';
        }
        catch (e) {
            // Decoding failed, treat as binary
            return 'application/octet-stream';
        }
    }
    static isJson(text) {
        // Optimization: Quick check first char
        const trimmed = text.trim();
        if (!trimmed)
            return false;
        const first = trimmed[0];
        const last = trimmed[trimmed.length - 1];
        if ((first === '{' && last === '}') || (first === '[' && last === ']')) {
            try {
                JSON.parse(text);
                return true;
            }
            catch {
                return false;
            }
        }
        return false;
    }
}
//# sourceMappingURL=ContentTypeInterpreter.js.map