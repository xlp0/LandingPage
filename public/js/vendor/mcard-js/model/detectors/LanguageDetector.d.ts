import { BaseDetector } from './BaseDetector';
export declare class ProgrammingLanguageDetector implements BaseDetector {
    readonly contentTypeName = "code";
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
    private isPython;
    private detectCFamily;
    private detectJsType;
    private isTypescript;
}
//# sourceMappingURL=LanguageDetector.d.ts.map