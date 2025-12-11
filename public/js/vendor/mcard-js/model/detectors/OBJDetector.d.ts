import { BaseDetector } from './BaseDetector';
export declare class OBJDetector implements BaseDetector {
    readonly contentTypeName = "obj";
    private static readonly COMMANDS;
    detect(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): number;
    getMimeType(contentSample: string | Uint8Array, lines: string[], firstLine: string, fileExtension?: string): string | null;
}
//# sourceMappingURL=OBJDetector.d.ts.map