/**
 * Base interface for all content type detectors.
 */
export interface BaseDetector {
    /**
     * Friendly name of the content type this detector handles.
     */
    readonly contentTypeName: string;
    /**
     * Detect confidence level for the given content content.
     *
     * @param contentSample First ~2KB of content
     * @param lines First ~20 lines of content
     * @param firstLine The first line of content
     * @param fileExtension Optional file extension hint (e.g., ".json")
     * @returns Confidence score between 0.0 and 1.0
     */
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    /**
     * Get the specific MIME type for the detected content.
     *
     * @returns MIME type string (e.g., "application/json") or null if not detected
     */
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
}
//# sourceMappingURL=BaseDetector.d.ts.map