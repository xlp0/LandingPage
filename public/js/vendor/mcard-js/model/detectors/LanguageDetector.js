export class ProgrammingLanguageDetector {
    contentTypeName = "code";
    detect(contentSample, lines, firstLine, fileExtension) {
        const mime = this.getMimeType(contentSample, lines, firstLine, fileExtension);
        return (mime && mime !== 'text/plain') ? 0.95 : 0.0;
    }
    getMimeType(contentSample, lines, firstLine, fileExtension) {
        const text = typeof contentSample === 'string' ? contentSample : new TextDecoder().decode(contentSample);
        // 1. Python Detection
        if (this.isPython(firstLine, text, lines)) {
            return 'text/x-python';
        }
        // 2. C/C++ Detection
        const cType = this.detectCFamily(text);
        if (cType)
            return cType;
        // 3. JS/JSX Detection
        const jsType = this.detectJsType(text);
        if (jsType)
            return jsType;
        // 4. TypeScript Detection
        if (this.isTypescript(text)) {
            return 'text/typescript';
        }
        return 'text/plain';
    }
    isPython(firstLine, text, lines) {
        // Imports
        if (/^\s*import\s+(\w+|\w+\.\w+)/m.test(text) || /^\s*from\s+(\w+|\w+\.\w+)\s+import\s+/m.test(text)) {
            const stdLibs = ['os', 'sys', 're', 'json', 'math', 'random', 'datetime'];
            if (stdLibs.some(lib => text.includes(`import ${lib}`) || text.includes(`from ${lib}`))) {
                return true;
            }
        }
        // Shebang
        if (firstLine.startsWith('#!') && firstLine.toLowerCase().includes('python'))
            return true;
        // Strong indicators
        if (text.includes('if __name__ ==') && text.includes('__main__'))
            return true;
        if (/^\s*def\s+\w+\s*\(/.test(text) && !text.includes('function'))
            return true;
        if (/^\s*class\s+\w+\s*[\(:]/m.test(text))
            return true;
        if (/^\s*@\w+/m.test(text))
            return true; // Decorator
        // Pattern counting
        let count = 0;
        const patterns = [
            /\bif\b.*?:/, /\belif\b.*?:/, /\belse\s*:/, /\bfor\b.*?\bin\b.*?:/,
            /\bwhile\b.*?:/, /\btry\s*:/, /\bexcept\b.*?:/, /\bfinally\s*:/,
            /\bNone\b/, /\bTrue\b/, /\bFalse\b/, /f["'].*?\{.*?\}["']/, // f-string
            /\bdef\b/, /\bclass\b/, /\bimport\b/, /\bfrom\b/, /\blambda\b.*?:/
        ];
        for (const p of patterns) {
            if (p.test(text))
                count++;
        }
        // Short content heuristic
        const nonEmptyLines = lines.filter(l => l.trim().length > 0).length;
        if (nonEmptyLines <= 5 && count >= 1) {
            return true;
        }
        return count >= 3;
    }
    detectCFamily(text) {
        // C/C++ patterns
        const cPatterns = [
            /#include\s*<.*?>/, /#include\s*".*?"/,
            /\b(int|void|char|float|double)\s+main\s*\(.*\)\s*\{/,
            /\bstruct\s+\w+\s*\{/, /#define\s+\w+/,
            /printf\(.*?\);/, /scanf\(.*?\);/
        ];
        const cppPatterns = [
            /\bclass\s+\w+\s*\{/, /\bnamespace\s+\w+\s*\{/,
            /\btemplate\s*<.*?>/, /::/, /\bstd::/,
            /\bcout\s*<</, /\bcin\s*>>/,
            /\bnew\s+\w+/, /\bdelete\s+\w+/,
            /#include\s*<iostream>/
        ];
        let cCount = 0;
        let cppCount = 0;
        cPatterns.forEach(p => { if (p.test(text))
            cCount++; });
        cppPatterns.forEach(p => { if (p.test(text))
            cppCount++; });
        if (cppCount >= 2 || (cppCount >= 1 && text.includes('std::')))
            return 'text/x-c++';
        if (cCount >= 2)
            return 'text/x-c';
        return null;
    }
    detectJsType(text) {
        // JS patterns
        const jsPatterns = [
            /function\s+\w+\s*\(/.test(text), // function foo(
            /\bconst\s+\w+\s*=/.test(text),
            /\blet\s+\w+\s*=/.test(text),
            /\bvar\s+\w+\s*=/.test(text),
            /\bimport\s+.*\s+from/.test(text),
            /\bexport\s+/.test(text),
            /\=\>\s*\{/.test(text), // Arrow func
            /console\.log\(/.test(text)
        ];
        const jsxPatterns = [
            /<\w+(>|\s+.*?>)[\s\S]*?<\/\w+>/m.test(text),
            /<\w+\s+\/>/m.test(text),
            /className=/.test(text),
            /React\.createElement/.test(text)
        ];
        const jsCount = jsPatterns.filter(Boolean).length;
        const jsxCount = jsxPatterns.filter(Boolean).length;
        if (jsxCount > 0 && (text.includes('import React') || text.includes('from "react"')))
            return 'text/jsx';
        if (jsxCount >= 2)
            return 'text/jsx';
        if (jsCount >= 2) {
            // Avoid JSON misclassification
            const stripped = text.trim();
            if ((stripped.startsWith('{') && stripped.endsWith('}')) || (stripped.startsWith('[') && stripped.endsWith(']'))) {
                try {
                    JSON.parse(text);
                    if (jsCount < 2)
                        return null;
                }
                catch { }
            }
            return 'text/javascript';
        }
        return null;
    }
    isTypescript(text) {
        const tsPatterns = [
            /:\s*(string|number|boolean|any|void|null|undefined)\b/,
            /\binterface\s+\w+\s*\{/,
            /\bclass\s+\w+\s+implements\s+\w+/,
            /\btype\s+\w+\s*=/,
            /\b(public|private|protected)\s+/,
            /\bnamespace\s+\w+\s*\{/,
            /<\w+>/ // Generics (simple check)
        ];
        let count = 0;
        tsPatterns.forEach(p => { if (p.test(text))
            count++; });
        return count >= 2;
    }
}
//# sourceMappingURL=LanguageDetector.js.map