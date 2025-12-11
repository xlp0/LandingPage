import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ContentTypeInterpreter } from '../model/ContentTypeInterpreter';
/**
 * Stream-read bytes up to byte_cap, decode, and soft wrap.
 */
export async function streamReadNormalizedText(filePath, options) {
    const { byteCap, wrapWidth } = options;
    const sha = crypto.createHash('sha256');
    let totalSize = 0;
    let producedText = '';
    let currentLen = 0;
    const handle = await fs.open(filePath, 'r');
    try {
        const buffer = new Uint8Array(8192);
        let remaining = byteCap;
        // Check if TextDecoder supports replacement (it does by default fatal: false)
        const decoder = new TextDecoder('utf-8', { fatal: false });
        // Use position variable manually to be safe with handle.read
        let position = 0;
        while (remaining > 0) {
            const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, remaining), position);
            if (bytesRead === 0)
                break;
            position += bytesRead;
            const chunk = buffer.subarray(0, bytesRead);
            sha.update(chunk);
            totalSize += bytesRead;
            remaining -= bytesRead;
            const s = decoder.decode(chunk, { stream: true });
            for (const ch of s) {
                if (ch === '\r')
                    continue;
                producedText += ch;
                if (ch === '\n') {
                    currentLen = 0;
                }
                else {
                    currentLen++;
                    if (wrapWidth > 0 && currentLen >= wrapWidth) {
                        producedText += '\n';
                        currentLen = 0;
                    }
                }
            }
        }
        // Flush decoder
        const s = decoder.decode();
        for (const ch of s) {
            if (ch === '\r')
                continue;
            producedText += ch;
            if (ch === '\n') {
                currentLen = 0;
            }
            else {
                currentLen++;
                if (wrapWidth > 0 && currentLen >= wrapWidth) {
                    producedText += '\n';
                    currentLen = 0;
                }
            }
        }
    }
    finally {
        await handle.close();
    }
    return {
        text: producedText,
        originalSize: totalSize,
        originalSha256Prefix: sha.digest('hex').substring(0, 16)
    };
}
// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const READ_TIMEOUT_MS = 5000;
/**
 * Check if a file is likely to cause processing issues.
 */
export async function isProblematicFile(filePath) {
    try {
        const stats = await fs.stat(filePath);
        if (stats.size === 0)
            return false;
        // Skip hidden files/directories (starting with .)
        if (path.basename(filePath).startsWith('.'))
            return true;
        if (stats.size > MAX_FILE_SIZE)
            return true;
        const ext = path.extname(filePath);
        const isKnownType = ContentTypeInterpreter.isKnownLongLineExtension(ext);
        if (isKnownType && stats.size > 1024 * 1024)
            return true; // >1MB known type skip
        // Sample content
        const handle = await fs.open(filePath, 'r');
        try {
            const buffer = new Uint8Array(32 * 1024);
            const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
            const sample = buffer.subarray(0, bytesRead);
            if (ContentTypeInterpreter.isUnstructuredBinary(sample))
                return true;
            if (ContentTypeInterpreter.hasPathologicalLines(sample, isKnownType))
                return true;
        }
        finally {
            await handle.close();
        }
        return false;
    }
    catch {
        return true;
    }
}
/**
 * Safely read a file with limits and timeouts.
 */
export async function readFileSafely(filePath, options = {}) {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_SIZE)
        throw new Error(`File too large: ${stats.size}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    try {
        const handle = await fs.open(filePath, 'r');
        try {
            const buffer = new Uint8Array(stats.size);
            await handle.read(buffer, 0, stats.size, 0);
            return buffer;
        }
        finally {
            await handle.close();
        }
    }
    catch (e) {
        if (e.name === 'AbortError')
            throw new Error(`Read timeout for ${filePath}`);
        throw e;
    }
    finally {
        clearTimeout(timeout);
    }
}
/**
 * List files in directory, filtering out problematic ones.
 */
export async function listFiles(dirPath, recursive = false) {
    let files = [];
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            // Skip hidden
            if (entry.name.startsWith('.'))
                continue;
            if (entry.isDirectory()) {
                if (recursive) {
                    files = files.concat(await listFiles(fullPath, true));
                }
            }
            else if (entry.isFile()) {
                if (!(await isProblematicFile(fullPath))) {
                    files.push(fullPath);
                }
            }
        }
    }
    catch (e) {
        console.warn(`Error listing directory ${dirPath}:`, e);
    }
    return files;
}
/**
 * Process a file and return metadata and content.
 */
export async function processFileContent(filePath, options = {}) {
    const rawContent = await readFileSafely(filePath, { allowPathological: options.allowPathological, maxBytes: options.maxBytes });
    // Detect type using sample
    const sample = rawContent.subarray(0, 1024 * 1024);
    const detection = ContentTypeInterpreter.detectContentType(sample, path.extname(filePath));
    let isBinary = ContentTypeInterpreter.isBinaryContent(sample, detection.mimeType);
    if (options.forceBinary)
        isBinary = true;
    let content = rawContent;
    if (!isBinary) {
        try {
            content = new TextDecoder('utf-8', { fatal: true }).decode(rawContent);
        }
        catch {
            // Fallback to replacement
            content = new TextDecoder('utf-8', { fatal: false }).decode(rawContent);
        }
    }
    return {
        content,
        filename: path.basename(filePath),
        mimeType: detection.mimeType,
        extension: detection.extension,
        isBinary,
        size: rawContent.length
    };
}
//# sourceMappingURL=FileIO.js.map