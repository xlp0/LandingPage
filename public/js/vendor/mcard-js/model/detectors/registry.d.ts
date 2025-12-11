/**
 * Central registry for all content type detectors.
 */
export declare class DetectorRegistry {
    private detectors;
    constructor();
    /**
     * Detect content type and return the most likely MIME type.
     */
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string;
}
export declare const registry: DetectorRegistry;
//# sourceMappingURL=registry.d.ts.map