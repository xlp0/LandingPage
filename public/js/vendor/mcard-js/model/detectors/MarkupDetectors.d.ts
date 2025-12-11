import { BaseDetector } from './BaseDetector';
export declare class XMLDetector implements BaseDetector {
    readonly contentTypeName = "xml";
    private static readonly XML_DECLARATION;
    private static readonly BASIC_TAG_PAIR;
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
}
export declare class MarkdownDetector implements BaseDetector {
    readonly contentTypeName = "markdown";
    private static readonly MD_PATTERNS;
    private static readonly SETEXT_HEADER;
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
}
export declare class PlainTextDetector implements BaseDetector {
    readonly contentTypeName = "text";
    private static readonly IMAGE_EXTS;
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
}
//# sourceMappingURL=MarkupDetectors.d.ts.map