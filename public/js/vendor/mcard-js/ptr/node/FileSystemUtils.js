import * as fs from 'fs';
import * as path from 'path';
/**
 * Find the project root directory by looking for pyproject.toml
 */
export function findProjectRoot(startDir = process.cwd()) {
    let searchDir = startDir;
    for (let i = 0; i < 5; i++) {
        if (fs.existsSync(path.join(searchDir, 'pyproject.toml'))) {
            return searchDir;
        }
        searchDir = path.dirname(searchDir);
    }
    return startDir;
}
/**
 * List files in a directory, optionally recursively.
 * Skips hidden files and problematic binary files.
 */
export function listFiles(dirPath, recursive) {
    const files = [];
    if (!fs.existsSync(dirPath)) {
        return files;
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isFile()) {
            // Skip hidden files and problematic patterns
            if (!entry.name.startsWith('.') && !isProblematicFile(fullPath)) {
                files.push(fullPath);
            }
        }
        else if (entry.isDirectory() && recursive) {
            files.push(...listFiles(fullPath, recursive));
        }
    }
    return files;
}
/**
 * Check if a file is likely problematic (too large, binary garbage, etc.)
 */
export function isProblematicFile(filePath) {
    try {
        const stats = fs.statSync(filePath);
        // Skip files larger than 50MB
        if (stats.size > 50 * 1024 * 1024)
            return true;
        // Check for unstructured binary by sampling
        if (stats.size > 1024) {
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(1024);
            fs.readSync(fd, buffer, 0, 1024, 0);
            fs.closeSync(fd);
            // Count null bytes and control characters
            let nullCount = 0;
            let controlCount = 0;
            for (let i = 0; i < buffer.length; i++) {
                if (buffer[i] === 0)
                    nullCount++;
                else if (buffer[i] < 32 && buffer[i] !== 9 && buffer[i] !== 10 && buffer[i] !== 13)
                    controlCount++;
            }
            // If >30% null bytes, likely unstructured binary
            if (nullCount > 300)
                return true;
        }
        return false;
    }
    catch {
        return true;
    }
}
/**
 * Detect content type based on extension and content buffer.
 */
export function detectContentType(filePath, content) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.json': 'application/json',
        '.yaml': 'text/yaml',
        '.yml': 'text/yaml',
        '.js': 'text/javascript',
        '.ts': 'text/typescript',
        '.py': 'text/x-python',
        '.html': 'text/html',
        '.css': 'text/css',
        '.xml': 'text/xml',
        '.csv': 'text/csv',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.pdf': 'application/pdf',
    };
    if (mimeTypes[ext]) {
        return mimeTypes[ext];
    }
    if (content.length >= 4) {
        if (content[0] === 0x89 && content[1] === 0x50 && content[2] === 0x4e && content[3] === 0x47) {
            return 'image/png';
        }
        if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) {
            return 'image/jpeg';
        }
        if (content[0] === 0x47 && content[1] === 0x49 && content[2] === 0x46) {
            return 'image/gif';
        }
        if (content[0] === 0x25 && content[1] === 0x50 && content[2] === 0x44 && content[3] === 0x46) {
            return 'application/pdf';
        }
    }
    const sample = content.slice(0, Math.min(512, content.length));
    let textChars = 0;
    for (let i = 0; i < sample.length; i++) {
        const b = sample[i];
        if ((b >= 32 && b < 127) || b === 9 || b === 10 || b === 13) {
            textChars++;
        }
    }
    if (sample.length > 0 && textChars / sample.length > 0.85) {
        return 'text/plain';
    }
    return 'application/octet-stream';
}
function toRecord(value) {
    return typeof value === 'object' && value !== null ? value : {};
}
/**
 * Extract loader-specific parameters from CLM context, mirroring Python behavior.
 */
export function extractLoaderParams(ctx, defaults = {}) {
    const params = toRecord(ctx.params);
    const balanced = toRecord(ctx.balanced);
    const inputArgs = {
        ...toRecord(balanced.input_arguments),
        ...toRecord(ctx.input_arguments),
    };
    const outputArgs = {
        ...toRecord(balanced.output_arguments),
        ...toRecord(ctx.output_arguments),
    };
    const allParams = { ...inputArgs, ...outputArgs, ...params };
    const sourceDir = allParams.source_dir ?? defaults.sourceDir ?? 'test_data';
    const recursive = params.recursive !== undefined ? params.recursive !== false : allParams.recursive !== false;
    const dbPath = allParams.db_path ?? defaults.dbPath;
    return {
        params,
        inputArgs,
        outputArgs,
        allParams,
        sourceDir,
        recursive,
        dbPath,
    };
}
export function computeTimingMetrics(startTime, processedCount) {
    const durationSeconds = (Date.now() - startTime) / 1000;
    const time_s = Math.round(durationSeconds * 10000) / 10000;
    const files_per_sec = durationSeconds > 0 ? Math.round((processedCount / durationSeconds) * 100) / 100 : 0;
    return { durationSeconds, time_s, files_per_sec };
}
//# sourceMappingURL=FileSystemUtils.js.map