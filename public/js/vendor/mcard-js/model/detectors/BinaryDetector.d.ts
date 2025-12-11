import { BaseDetector } from './BaseDetector';
export declare class BinarySignatureDetector implements BaseDetector {
    readonly contentTypeName = "binary";
    private static readonly SIGNATURES;
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
    private toBytes;
    private startsWith;
    private detectRiffFormat;
    private detectZipType;
}
//# sourceMappingURL=BinaryDetector.d.ts.map