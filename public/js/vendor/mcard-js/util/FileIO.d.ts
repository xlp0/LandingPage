export interface NormalizedReadResult {
    text: string;
    originalSize: number;
    originalSha256Prefix: string;
}
/**
 * Stream-read bytes up to byte_cap, decode, and soft wrap.
 */
export declare function streamReadNormalizedText(filePath: string, options: {
    byteCap: number;
    wrapWidth: number;
}): Promise<NormalizedReadResult>;
export interface FileProcessingResult {
    content: Uint8Array | string;
    filename: string;
    mimeType: string;
    extension: string;
    isBinary: boolean;
    size: number;
}
/**
 * Check if a file is likely to cause processing issues.
 */
export declare function isProblematicFile(filePath: string): Promise<boolean>;
/**
 * Safely read a file with limits and timeouts.
 */
export declare function readFileSafely(filePath: string, options?: {
    allowPathological?: boolean;
    maxBytes?: number;
}): Promise<Uint8Array>;
/**
 * List files in directory, filtering out problematic ones.
 */
export declare function listFiles(dirPath: string, recursive?: boolean): Promise<string[]>;
/**
 * Process a file and return metadata and content.
 */
export declare function processFileContent(filePath: string, options?: {
    forceBinary?: boolean;
    allowPathological?: boolean;
    maxBytes?: number;
}): Promise<FileProcessingResult>;
//# sourceMappingURL=FileIO.d.ts.map