import * as fs from 'fs/promises';
import * as path from 'path';
import { MCard } from '../model/MCard';
import { isProblematicFile, processFileContent, streamReadNormalizedText, listFiles } from './FileIO';
import { ContentTypeInterpreter } from '../model/ContentTypeInterpreter';
// Constants replicating settings
const DEFAULT_MAX_PROBLEM_BYTES = 2 * 1024 * 1024; // 2MB
const WRAP_WIDTH_KNOWN = 1000;
const WRAP_WIDTH_DEFAULT = 80;
export async function processAndStoreFile(filePath, collection, options = {}) {
    const { allowProblematic = false, maxBytesOnProblem = DEFAULT_MAX_PROBLEM_BYTES, metadataOnly = false, rootPath } = options;
    try {
        let fileInfo;
        if (await isProblematicFile(filePath)) {
            if (!allowProblematic) {
                console.warn(`Skipping problematic file: ${filePath}`);
                return null;
            }
            const extension = path.extname(filePath).toLowerCase();
            const isKnownType = ContentTypeInterpreter.isKnownLongLineExtension(extension);
            const wrapWidth = isKnownType ? WRAP_WIDTH_KNOWN : WRAP_WIDTH_DEFAULT;
            console.warn(`Problematic file detected, processing as safe text: ${filePath}`);
            try {
                const streamed = await streamReadNormalizedText(filePath, {
                    byteCap: maxBytesOnProblem,
                    wrapWidth
                });
                fileInfo = {
                    content: streamed.text,
                    filename: path.basename(filePath),
                    mimeType: 'text/plain',
                    extension: extension,
                    isBinary: false,
                    size: streamed.text.length,
                    originalSize: streamed.originalSize,
                    originalSha256Prefix: streamed.originalSha256Prefix,
                    normalized: true,
                    wrapWidth
                };
            }
            catch (e) {
                console.warn(`Safe text processing failed, falling back to capped binary: ${filePath}`);
                fileInfo = await processFileContent(filePath, {
                    forceBinary: true,
                    allowPathological: true,
                    maxBytes: maxBytesOnProblem
                });
            }
        }
        else {
            console.log(`Processing file: ${filePath}`);
            fileInfo = await processFileContent(filePath);
        }
        if (!fileInfo)
            return null;
        let mcard = null;
        const isProblematic = await isProblematicFile(filePath);
        if (metadataOnly && isProblematic) {
            mcard = null;
        }
        else {
            mcard = await MCard.create(fileInfo.content);
            // Handle Logic
            const handle = path.basename(filePath);
            try {
                await collection.addWithHandle(mcard, handle);
            }
            catch (e) {
                let registered = false;
                if (rootPath) {
                    const relPath = path.relative(rootPath, filePath);
                    if (relPath !== handle) {
                        try {
                            await collection.addWithHandle(mcard, relPath);
                            registered = true;
                        }
                        catch (e2) {
                            console.warn(`Handle collision for fallback '${relPath}'`);
                        }
                    }
                }
                if (!registered) {
                    try {
                        await collection.add(mcard);
                    }
                    catch (e3) { }
                }
            }
        }
        const result = {
            hash: mcard ? mcard.hash : 'METADATA_ONLY',
            contentType: fileInfo.mimeType,
            isBinary: fileInfo.isBinary,
            filename: fileInfo.filename,
            size: fileInfo.size,
            filePath: filePath,
        };
        if (fileInfo.originalSize !== undefined)
            result.originalSize = fileInfo.originalSize;
        if (fileInfo.originalSha256Prefix)
            result.originalSha256Prefix = fileInfo.originalSha256Prefix;
        if (metadataOnly && isProblematic)
            result.metadataOnly = true;
        return result;
    }
    catch (e) {
        console.error(`Error processing ${filePath}:`, e);
        return null;
    }
}
export async function loadFileToCollection(targetPath, collection, options = {}) {
    const { recursive = false, includeProblematic = false, maxBytesOnProblem = DEFAULT_MAX_PROBLEM_BYTES, metadataOnly = false } = options;
    // Resolve absolute path
    const resolvedPath = path.resolve(targetPath);
    const stats = await fs.stat(resolvedPath);
    const results = [];
    // Determine files to process
    let files = [];
    let rootPath = resolvedPath;
    if (stats.isFile()) {
        files = [resolvedPath];
        rootPath = path.dirname(resolvedPath);
    }
    else if (stats.isDirectory()) {
        files = await listFiles(resolvedPath, recursive);
        rootPath = resolvedPath;
    }
    else {
        throw new Error(`Path ${targetPath} is not a file or directory`);
    }
    // Calculate Metrics
    const uniqueDirs = new Set();
    let maxDepth = 0;
    for (const file of files) {
        const dir = path.dirname(file);
        // We track directories relative to root to verify "loaded directories"
        // If file is directly in root, dir is root.
        if (dir.startsWith(rootPath)) {
            uniqueDirs.add(dir);
            // Depth calculation
            const rel = path.relative(rootPath, file);
            // parts length - 1 (filename) gives folder depth. 
            // e.g. "a.txt" -> 0 depth. "sub/a.txt" -> 1 depth.
            const parts = rel.split(path.sep);
            const depth = parts.length - 1;
            if (depth > maxDepth)
                maxDepth = depth;
        }
    }
    const metrics = {
        filesCount: files.length,
        directoriesCount: uniqueDirs.size,
        directoryLevels: maxDepth
    };
    console.log(`About to process ${files.length} files`);
    for (const file of files) {
        const result = await processAndStoreFile(file, collection, {
            allowProblematic: includeProblematic,
            maxBytesOnProblem,
            metadataOnly,
            rootPath
        });
        if (result)
            results.push(result);
    }
    return { metrics, results };
}
//# sourceMappingURL=Loader.js.map