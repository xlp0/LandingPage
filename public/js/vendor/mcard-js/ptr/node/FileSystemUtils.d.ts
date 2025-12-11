/**
 * Find the project root directory by looking for pyproject.toml
 */
export declare function findProjectRoot(startDir?: string): string;
/**
 * List files in a directory, optionally recursively.
 * Skips hidden files and problematic binary files.
 */
export declare function listFiles(dirPath: string, recursive: boolean): string[];
/**
 * Check if a file is likely problematic (too large, binary garbage, etc.)
 */
export declare function isProblematicFile(filePath: string): boolean;
/**
 * Detect content type based on extension and content buffer.
 */
export declare function detectContentType(filePath: string, content: Buffer): string;
export interface LoaderParamsDefaults {
    sourceDir?: string;
    dbPath?: string;
}
export interface LoaderParamsResult {
    params: Record<string, unknown>;
    inputArgs: Record<string, unknown>;
    outputArgs: Record<string, unknown>;
    allParams: Record<string, unknown>;
    sourceDir: string;
    recursive: boolean;
    dbPath?: string;
}
/**
 * Extract loader-specific parameters from CLM context, mirroring Python behavior.
 */
export declare function extractLoaderParams(ctx: Record<string, unknown>, defaults?: LoaderParamsDefaults): LoaderParamsResult;
export declare function computeTimingMetrics(startTime: number, processedCount: number): {
    durationSeconds: number;
    time_s: number;
    files_per_sec: number;
};
//# sourceMappingURL=FileSystemUtils.d.ts.map