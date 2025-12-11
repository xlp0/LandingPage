export declare class ContentTypeInterpreter {
    private static readonly MIME_TO_EXT;
    /**
     * Detect content type and suggest extension.
     *
     * @param content Content string or binary buffer
     * @param fileExtension Optional file extension hint
     * @returns Object containing detected mimeType and suggested extension
     */
    static detectContentType(content: string | Uint8Array, fileExtension?: string): {
        mimeType: string;
        extension: string;
    };
    static getExtension(mimeType: string): string;
    /**
     * Check if content should be treated as binary.
     */
    static isBinaryContent(content: string | Uint8Array, mimeType?: string): boolean;
    static isKnownLongLineExtension(extension?: string): boolean;
    static isUnstructuredBinary(sample: Uint8Array): boolean;
    static hasPathologicalLines(sample: Uint8Array, isKnownType: boolean): boolean;
}
//# sourceMappingURL=ContentTypeInterpreter.d.ts.map