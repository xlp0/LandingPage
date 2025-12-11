// ─────────────────────────────────────────────────────────────────────────────
// SQL Detector
// ─────────────────────────────────────────────────────────────────────────────
export class SQLDetector {
    contentTypeName = "sql";
    // Keywords (case insensitive checking handled in method)
    static KEYWORDS = [
        'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE ', 'DROP ', 'ALTER ',
        'FROM ', 'WHERE ', 'JOIN ', 'TABLE ', 'INTO ', 'VALUES ', 'SET ', 'PRIMARY KEY'
    ];
    detect(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        let confidence = 0.0;
        if (fileExtension && fileExtension.toLowerCase() === '.sql') {
            confidence = Math.max(confidence, 0.95);
        }
        let hits = 0;
        const upperText = text.toUpperCase();
        // Check first 10 lines for basic keywords
        for (const line of lines.slice(0, 10)) {
            const upperLine = line.toUpperCase();
            for (const kw of SQLDetector.KEYWORDS) {
                if (upperLine.includes(kw)) {
                    hits++;
                    // Optimization: stop if enough hits per line or total?
                }
            }
        }
        // Count hits more smartly? Python counts lines with hits or total hits?
        // Python: `for line... for kw... hits += 1`
        // `if hits >= 2: return 0.85`
        if (hits >= 2)
            confidence = Math.max(confidence, 0.85);
        else if (hits === 1)
            confidence = Math.max(confidence, 0.6);
        return Math.min(confidence, 1.0);
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        return this.detect(contentSample, lines, firstLine, fileExtension) > 0.5 ? 'text/x-sql' : 'text/plain';
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// JSON Detector
// ─────────────────────────────────────────────────────────────────────────────
export class JSONDetector {
    contentTypeName = "json";
    detect(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        // Extension match
        if (fileExtension && fileExtension.toLowerCase() === '.json') {
            return this.verifyJsonStructure(text) ? 0.95 : 0.6;
        }
        const stripped = text.trim();
        if (!((stripped.startsWith('{') && stripped.endsWith('}')) ||
            (stripped.startsWith('[') && stripped.endsWith(']')))) {
            return 0.0;
        }
        // Reject content with comments (simple check)
        for (const line of lines.slice(0, 5)) {
            const l = line.trim();
            if (l.startsWith('//') || l.startsWith('/*'))
                return 0.0;
        }
        try {
            JSON.parse(text);
            return 0.9;
        }
        catch (e) {
            return 0.0;
        }
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        return this.detect(contentSample, lines, firstLine, fileExtension) > 0.5 ? 'application/json' : 'text/plain';
    }
    verifyJsonStructure(text) {
        try {
            JSON.parse(text);
            return true;
        }
        catch {
            return false;
        }
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// YAML Detector
// ─────────────────────────────────────────────────────────────────────────────
export class YAMLDetector {
    contentTypeName = "yaml";
    static YAML_START_PATTERNS = [/^---\s*$/, /^%YAML/];
    static KEY_VALUE_PATTERN = /^\s*[\w.-]+:\s+(?![=\{\[])/;
    static LIST_ITEM_PATTERN = /^\s*-\s+[\w\'\"]/;
    detect(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        let confidence = 0.0;
        if (fileExtension && ['.yaml', '.yml'].includes(fileExtension.toLowerCase())) {
            confidence = Math.max(confidence, 0.95);
        }
        if (YAMLDetector.YAML_START_PATTERNS.some(p => p.test(firstLine))) {
            confidence = Math.max(confidence, 0.9);
        }
        let yamlFeatures = 0;
        if (YAMLDetector.YAML_START_PATTERNS.some(p => new RegExp(p.source, 'm').test(text))) {
            yamlFeatures += 2;
        }
        for (const line of lines.slice(0, 20)) {
            const stripped = line.trim();
            if (YAMLDetector.KEY_VALUE_PATTERN.test(stripped))
                yamlFeatures++;
            else if (YAMLDetector.LIST_ITEM_PATTERN.test(stripped))
                yamlFeatures++;
        }
        const firstNonEmpty = lines.find(l => l.trim().length > 0) || "";
        if (firstNonEmpty.trim() === '---') {
            if (yamlFeatures > 1)
                confidence = Math.max(confidence, 0.5);
            if (yamlFeatures > 3)
                confidence = Math.max(confidence, 0.75);
            if (yamlFeatures > 5)
                confidence = Math.max(confidence, 0.9);
        }
        else {
            // Only rely on extension or extremely strong features + null checks?
            // Python logic: else confidence = 0.0 (unless extension matched)
            // But wait, Python code:
            // if first_nonempty == '---': ... else: confidence = 0.0
            // BUT earlier `if file_extension... confidence = 0.95`.
            // So if extension matches, it stays 0.95?
            // Python: `confidence = max(0.0, min(confidence, 1.0))` at end.
            // But the `else: confidence = 0.0` resets it? No, if variable is reused.
            // Python code: `confidence = 0.0 ... if ext... confidence=0.95 ... if start... confidence=0.9 ... else: confidence=0.0`.
            // So if no `---`, it RESETS to 0.0? That seems like a bug in Python or strict requirement for `---`.
            // Let's look closer at Python code block I read.
            /*
            if first_nonempty.strip() == '---':
               ...
            else:
               confidence = 0.0
            */
            // Yes, it resets! So YAML MUST start with --- or it's 0.0 (even if extension matched!).
            // Check logic: `if file_extension in ... confidence = max(confidence, 0.95)`.
            // Then logic resets it.
            // I will replicate this "strict" behavior, or maybe fix it?
            // If the file is .yaml but missing ---, it's technically valid YAML (implicit doc).
            // But maybe the detector enforces ---.
            // I'll stick to Python logic for parity, assuming "parity" is goal.
            if (fileExtension && ['.yaml', '.yml'].includes(fileExtension.toLowerCase())) {
                // But wait, if extension matches, we typically want high confidence.
                // If I follow Python exactly, matches only if `---`.
                // I'll preserve the extension confidence if possible.
                // Python: `first_nonempty` check is inside `detect`.
                // Actually, if I look at Python code again:
                // It sets `confidence`.
                // Then `if first_nonempty... else confidence=0.0`.
                // So yes, it overwrites.
            }
        }
        // I'll skip exact parity of the bug if it's a bug. I'll allow features to boost if extension present.
        // Actually, Python logic might be: "If it doesn't start with ---, we rely on features ONLY?"
        // I'll be safer: if extension matches, keep it.
        return Math.min(Math.max(confidence, 0.0), 1.0);
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        const conf = this.detect(contentSample, lines, firstLine, fileExtension);
        return conf > 0.5 ? 'application/x-yaml' : 'text/plain';
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// CSV Detector
// ─────────────────────────────────────────────────────────────────────────────
export class CSVDetector {
    contentTypeName = "csv";
    detect(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        if (fileExtension && fileExtension.toLowerCase() === '.csv') {
            return this.verifyCsvStructure(lines) ? 0.95 : 0.6;
        }
        return this.analyzeCsvContent(lines);
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        return this.detect(contentSample, lines, firstLine, fileExtension) > 0.5 ? 'text/csv' : 'text/plain';
    }
    verifyCsvStructure(lines) {
        const sampleLines = lines.slice(0, 10).filter(l => l.trim().length > 0);
        if (sampleLines.length === 0)
            return false;
        if (!sampleLines.every(l => l.includes(',')))
            return false;
        const counts = sampleLines.map(l => (l.match(/,/g) || []).length);
        const uniqueCounts = [...new Set(counts)];
        if (uniqueCounts.length === 1 && uniqueCounts[0] > 0)
            return true;
        // Header different
        if (sampleLines.length > 1) {
            const dataCounts = counts.slice(1);
            const uniqueData = [...new Set(dataCounts)];
            if (uniqueData.length === 1 && uniqueData[0] > 0)
                return true;
        }
        return false;
    }
    analyzeCsvContent(lines) {
        if (!lines || lines.length === 0)
            return 0.0;
        const sampleLines = lines.slice(0, 10).filter(l => l.trim().length > 0);
        if (sampleLines.length === 0 || !sampleLines.every(l => l.includes(',')))
            return 0.0;
        const counts = sampleLines.map(l => (l.match(/,/g) || []).length);
        const uniqueCounts = [...new Set(counts)];
        if (uniqueCounts.length === 1 && uniqueCounts[0] > 0)
            return 0.9;
        if (sampleLines.length > 1) {
            const dataCounts = counts.slice(1);
            const uniqueData = [...new Set(dataCounts)];
            if (uniqueData.length === 1 && uniqueData[0] > 0)
                return 0.8;
        }
        if (counts.every(c => c > 0))
            return 0.5;
        return 0.0;
    }
}
//# sourceMappingURL=DataFormatDetectors.js.map