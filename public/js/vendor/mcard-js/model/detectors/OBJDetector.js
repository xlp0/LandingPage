export class OBJDetector {
    contentTypeName = "obj";
    // Check for 'v ' (vertex), 'f ' (face), 'vn ', 'vt '
    static COMMANDS = ['v ', 'vt ', 'vn ', 'f ', 'g ', 'o ', 's ', 'mtllib ', 'usemtl '];
    detect(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        let confidence = 0.0;
        if (fileExtension && fileExtension.toLowerCase() === '.obj') {
            confidence = Math.max(confidence, 0.95);
        }
        // Check content
        const validLines = lines.filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));
        let commandCount = 0;
        // Basic check: count recognized commands
        for (const line of validLines.slice(0, 20)) {
            const trimmed = line.trim();
            for (const cmd of OBJDetector.COMMANDS) {
                if (trimmed.startsWith(cmd)) {
                    commandCount++;
                    break;
                }
            }
        }
        if (commandCount >= 2) {
            // Basic confidence. 
            // Logic from Python:
            // if distinct commands >= 4 and ratio > 0.8 -> 0.9 
            // etc.
            // Im implementing simplified version:
            if (commandCount > 10)
                confidence = Math.max(confidence, 0.9);
            else if (commandCount > 5)
                confidence = Math.max(confidence, 0.8);
            else
                confidence = Math.max(confidence, 0.7);
        }
        // Negative check: standard code keywords
        const codeKeywords = ["def ", "class ", "import ", "function ", "var ", "let ", "const "];
        if (codeKeywords.some(k => text.includes(k))) {
            return 0.0;
        }
        return Math.min(confidence, 1.0);
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        return this.detect(contentSample, lines, firstLine, fileExtension) > 0.5 ? 'application/3d-obj' : 'text/plain';
    }
}
//# sourceMappingURL=OBJDetector.js.map