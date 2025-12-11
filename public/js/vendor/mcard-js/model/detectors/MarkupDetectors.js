// ─────────────────────────────────────────────────────────────────────────────
// XML Detector
// ─────────────────────────────────────────────────────────────────────────────
export class XMLDetector {
    contentTypeName = "xml";
    static XML_DECLARATION = /^\s*<\?xml/i;
    static BASIC_TAG_PAIR = /<(\w+)[^>]*>.*?<\/\1>/s;
    detect(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        let confidence = 0.0;
        if (fileExtension && fileExtension.toLowerCase() === '.xml') {
            confidence = Math.max(confidence, 0.95);
        }
        if (XMLDetector.XML_DECLARATION.test(firstLine) || text.trim().startsWith('<?xml')) {
            confidence = Math.max(confidence, 0.95);
        }
        if (text.includes('<') && text.includes('>') && text.includes('</')) {
            confidence = Math.max(confidence, 0.5);
            if (XMLDetector.BASIC_TAG_PAIR.test(text)) {
                confidence = Math.max(confidence, 0.7);
            }
        }
        if (text.toLowerCase().includes('<!doctype html')) {
            if (confidence > 0.3)
                confidence -= 0.4;
        }
        return Math.min(Math.max(confidence, 0.0), 1.0);
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        if (fileExtension === '.xml')
            return 'application/xml';
        if (text.toLowerCase().includes('<svg'))
            return 'image/svg+xml';
        if (text.toLowerCase().includes('<html') || text.toLowerCase().includes('<!doctype html'))
            return 'text/html';
        if (this.detect(contentSample, lines, firstLine, fileExtension) > 0.5)
            return 'application/xml';
        return 'text/plain';
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Markdown Detector
// ─────────────────────────────────────────────────────────────────────────────
export class MarkdownDetector {
    contentTypeName = "markdown";
    static MD_PATTERNS = [
        /^#{1,6}\s+\S+/, // ATX Headers
        /^\s*[\*\+\-]\s+\S+/, // List items
        /^\s*\d+\.\s+\S+/, // Ordered list items
        /`{1,3}[^`]+`{1,3}/, // Inline code
        /\[[^\]]+\]\([^\)]+\)/, // Links
        /!\[[^\]]+\]\([^\)]+\)/, // Images
        /^\s*>.*/ // Blockquotes
    ];
    static SETEXT_HEADER = /^.*\n(?:={3,}|-{3,})\s*$/m;
    detect(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        let confidence = 0.0;
        if (fileExtension && ['.md', '.markdown'].includes(fileExtension.toLowerCase())) {
            confidence = Math.max(confidence, 0.95);
        }
        let mdFeatures = 0;
        if (MarkdownDetector.SETEXT_HEADER.test(text))
            mdFeatures += 2;
        for (const line of lines.slice(0, 20)) {
            if (MarkdownDetector.MD_PATTERNS.some(p => p.test(line))) {
                mdFeatures++;
            }
        }
        const hasCodeFence = text.includes('```');
        if (hasCodeFence)
            mdFeatures++;
        if (mdFeatures > 1 && hasCodeFence)
            confidence = Math.max(confidence, 0.85);
        if (mdFeatures > 3 && hasCodeFence)
            confidence = Math.max(confidence, 0.95);
        else if (mdFeatures > 1)
            confidence = Math.max(confidence, 0.6);
        else if (mdFeatures > 3)
            confidence = Math.max(confidence, 0.8);
        else if (mdFeatures > 5)
            confidence = Math.max(confidence, 0.9);
        // Negative checks
        const stripped = text.trim();
        if ((stripped.startsWith('{') && stripped.endsWith('}')) || (stripped.startsWith('[') && stripped.endsWith(']'))) {
            try {
                JSON.parse(text);
                if (confidence > 0.3)
                    confidence -= 0.4;
            }
            catch { }
        }
        if (stripped.startsWith('<') && text.includes('<?xml')) {
            if (confidence > 0.3)
                confidence -= 0.4;
        }
        return Math.min(Math.max(confidence, 0.0), 1.0);
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        return this.detect(contentSample, lines, firstLine, fileExtension) > 0.5 ? 'text/markdown' : 'text/plain';
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// PlainText Detector
// ─────────────────────────────────────────────────────────────────────────────
export class PlainTextDetector {
    contentTypeName = "text";
    static IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];
    detect(contentSample, lines, firstLine, fileExtension) {
        if (!contentSample && lines.length === 0)
            return 0.1;
        if (fileExtension) {
            const ext = fileExtension.toLowerCase();
            if (PlainTextDetector.IMAGE_EXTS.includes(ext) || ext === '.pdf')
                return 0.0;
        }
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        if (text.includes(',') && lines.length < 5) {
            // Ambiguous CSV check
            const commaLines = lines.filter(l => l.includes(',')).length;
            if (commaLines > 0 && commaLines === lines.length) {
                return 0.8;
            }
        }
        return 0.15;
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        return 'text/plain';
    }
}
//# sourceMappingURL=MarkupDetectors.js.map