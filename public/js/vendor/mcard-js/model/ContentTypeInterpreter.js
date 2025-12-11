import { registry } from './detectors/registry';
export class ContentTypeInterpreter {
    static MIME_TO_EXT = {
        'text/plain': '.txt',
        'application/json': '.json',
        'text/csv': '.csv',
        'text/x-python': '.py',
        'text/javascript': '.js',
        'text/jsx': '.jsx',
        'text/typescript': '.ts',
        'text/x-c': '.c',
        'text/x-c++': '.cpp',
        'application/xml': '.xml',
        'text/html': '.html',
        'application/x-yaml': '.yaml',
        'text/markdown': '.md',
        'text/x-sql': '.sql',
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/gif': '.gif',
        'image/bmp': '.bmp',
        'image/x-icon': '.ico',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
        'application/pdf': '.pdf',
        'application/zip': '.zip',
        'application/gzip': '.gz',
        'application/x-rar-compressed': '.rar',
        'application/x-7z-compressed': '.7z',
        'application/x-sqlite3': '.db',
        'audio/wav': '.wav',
        // Add more as needed
    };
    /**
     * Detect content type and suggest extension.
     *
     * @param content Content string or binary buffer
     * @param fileExtension Optional file extension hint
     * @returns Object containing detected mimeType and suggested extension
     */
    static detectContentType(content, fileExtension) {
        // Prepare sample lines for detectors
        let lines = [];
        let firstLine = '';
        // Convert to string for line analysis (even if binary, we try loosely)
        // Note: For large binary, this might be expensive/messy, but detectors handle it.
        // Python implementation converts to string for lines.
        let textSample = '';
        if (typeof content === 'string') {
            textSample = content.slice(0, 8192); // Limit sample size
        }
        else {
            // Decode ignoring errors for text analysis on binary
            textSample = new TextDecoder('utf-8', { fatal: false }).decode(content.slice(0, 8192));
        }
        lines = textSample.split('\n').slice(0, 20);
        firstLine = lines[0] || '';
        const mimeType = registry.detect(content, lines, firstLine, fileExtension);
        let extension = this.getExtension(mimeType);
        // If detected extension matches provided hint, prefer the hint (case insensitive)
        if (fileExtension && extension) {
            if (fileExtension.toLowerCase() === extension || fileExtension.toLowerCase() === `.${extension}`) {
                extension = fileExtension;
            }
        }
        if (!extension && fileExtension) {
            extension = fileExtension;
        }
        if (!extension) {
            extension = '.txt'; // Default
        }
        return { mimeType, extension };
    }
    static getExtension(mimeType) {
        return this.MIME_TO_EXT[mimeType] || '';
    }
    /**
     * Check if content should be treated as binary.
     */
    static isBinaryContent(content, mimeType) {
        if (mimeType) {
            if (mimeType.startsWith('text/') ||
                mimeType.includes('json') ||
                mimeType.includes('xml') ||
                mimeType.includes('javascript') ||
                mimeType.includes('ecmascript')) {
                return false;
            }
            return true;
        }
        // If string, assume text
        if (typeof content === 'string')
            return false;
        // Heuristic check
        const detection = this.detectContentType(content);
        return !detection.mimeType.startsWith('text/') &&
            !detection.mimeType.includes('json') &&
            !detection.mimeType.includes('xml');
    }
    static isKnownLongLineExtension(extension) {
        if (!extension)
            return false;
        const ext = extension.toLowerCase();
        return ['.min.js', '.min.css', '.map', '.svg', '.json', '.geojson'].some(e => ext.endsWith(e));
    }
    static isUnstructuredBinary(sample) {
        // Match Python's heuristic:
        // if len(sample) < 512: return False
        if (sample.length < 512)
            return false;
        let nullCount = 0;
        let controlCount = 0;
        const len = Math.min(sample.length, 32 * 1024); // match larger sample if available
        for (let i = 0; i < len; i++) {
            const byte = sample[i];
            if (byte === 0) {
                nullCount++;
            }
            // Control chars: < 32, excluding TAB (9), LF (10), CR (13)
            if ((byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
                controlCount++;
            }
        }
        const nullRatio = nullCount / len;
        const controlRatio = controlCount / len;
        // Python Constants: _NULL_RATIO_THRESHOLD = 0.1, _CTRL_RATIO_THRESHOLD = 0.2
        return nullRatio > 0.1 || controlRatio > 0.2;
    }
    static hasPathologicalLines(sample, isKnownType) {
        if (isKnownType || sample.length < 32768)
            return false;
        // Check if there are no newlines in the first 32KB
        for (let i = 0; i < sample.length; i++) {
            if (sample[i] === 10 || sample[i] === 13)
                return false;
        }
        return true;
    }
}
//# sourceMappingURL=ContentTypeInterpreter.js.map