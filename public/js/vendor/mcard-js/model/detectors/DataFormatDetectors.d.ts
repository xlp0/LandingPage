import { BaseDetector } from './BaseDetector';
export declare class SQLDetector implements BaseDetector {
    readonly contentTypeName = "sql";
    private static readonly KEYWORDS;
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
}
export declare class JSONDetector implements BaseDetector {
    readonly contentTypeName = "json";
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
    private verifyJsonStructure;
}
export declare class YAMLDetector implements BaseDetector {
    readonly contentTypeName = "yaml";
    private static readonly YAML_START_PATTERNS;
    private static readonly KEY_VALUE_PATTERN;
    private static readonly LIST_ITEM_PATTERN;
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
}
export declare class CSVDetector implements BaseDetector {
    readonly contentTypeName = "csv";
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
    private verifyCsvStructure;
    private analyzeCsvContent;
}
//# sourceMappingURL=DataFormatDetectors.d.ts.map