import { BinarySignatureDetector } from './BinaryDetector';
import { ProgrammingLanguageDetector } from './LanguageDetector';
import { XMLDetector, MarkdownDetector, PlainTextDetector } from './MarkupDetectors';
import { JSONDetector, YAMLDetector, CSVDetector, SQLDetector } from './DataFormatDetectors';
import { OBJDetector } from './OBJDetector';
/**
 * Central registry for all content type detectors.
 */
export class DetectorRegistry {
    detectors;
    constructor() {
        this.detectors = [
            new BinarySignatureDetector(),
            // Programming languages
            new ProgrammingLanguageDetector(),
            // Structured data
            new XMLDetector(),
            new JSONDetector(),
            new OBJDetector(),
            // Markup
            new MarkdownDetector(),
            // Data formats (lower priority)
            new SQLDetector(),
            new CSVDetector(),
            new YAMLDetector(),
            // Fallback
            new PlainTextDetector()
        ];
    }
    /**
     * Detect content type and return the most likely MIME type.
     */
    detect(contentSample, lines, firstLine, fileExtension) {
        // Handle ambiguous CSV special case (from Python logic)
        const textIsString = typeof contentSample === 'string';
        if (textIsString && contentSample.includes(',')) {
            if (lines.length < 3) {
                const commaLines = lines.filter(l => l.includes(',')).length;
                if (commaLines > 0 && commaLines === lines.length) {
                    const delimCounts = lines.filter(l => l.trim()).map(l => (l.match(/,/g) || []).length);
                    if (delimCounts.length > 0 && delimCounts.every(c => c <= 2)) {
                        return 'text/plain';
                    }
                }
            }
        }
        let bestConfidence = 0.0;
        let bestMime = 'text/plain';
        for (const detector of this.detectors) {
            const confidence = detector.detect(contentSample, lines, firstLine, fileExtension);
            if (confidence > bestConfidence) {
                const mime = detector.getMimeType(contentSample, lines, firstLine, fileExtension);
                if (mime) {
                    bestConfidence = confidence;
                    bestMime = mime;
                    // Optimization: if very high confidence, stop?
                    // Python doesn't stop. It finds max.
                    if (confidence >= 0.99)
                        break;
                }
            }
        }
        return bestMime;
    }
}
export const registry = new DetectorRegistry();
//# sourceMappingURL=registry.js.map