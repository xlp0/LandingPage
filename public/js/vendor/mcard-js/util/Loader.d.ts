import { CardCollection } from '../model/CardCollection';
export interface FileProcessingResult {
    hash: string;
    contentType?: string;
    isBinary?: boolean;
    filename?: string;
    size?: number;
    filePath: string;
    originalSize?: number;
    originalSha256Prefix?: string;
    metadataOnly?: boolean;
}
export declare function processAndStoreFile(filePath: string, collection: CardCollection, options?: {
    allowProblematic?: boolean;
    maxBytesOnProblem?: number;
    metadataOnly?: boolean;
    rootPath?: string;
}): Promise<FileProcessingResult | null>;
export interface LoaderMetrics {
    filesCount: number;
    directoriesCount: number;
    directoryLevels: number;
}
export interface LoaderResponse {
    metrics: LoaderMetrics;
    results: FileProcessingResult[];
}
export declare function loadFileToCollection(targetPath: string, collection: CardCollection, options?: {
    recursive?: boolean;
    includeProblematic?: boolean;
    maxBytesOnProblem?: number;
    metadataOnly?: boolean;
}): Promise<LoaderResponse>;
//# sourceMappingURL=Loader.d.ts.map