/**
 * CLMLoader - Load and parse Cubical Logic Model files
 *
 * Supports YAML CLM specifications from chapters/
 */
export interface CLMSpec {
    version: string;
    chapter: {
        id: number;
        title: string;
        mvp_card?: string;
        pkc_task?: string;
    };
    clm: {
        abstract: {
            concept: string;
            description: string;
            math_model?: string;
        };
        concrete: {
            manifestation: string;
            description: string;
            logic_source?: string;
            runtime?: string;
            code_file?: string;
            entry_point?: string;
            boundary?: 'intrinsic' | 'extrinsic';
            runtimes_config?: Array<{
                name: string;
                file?: string;
                binary?: string;
                module?: string;
                entry?: string;
            }>;
        };
        balanced: {
            expectation: string;
            description: string;
        };
    };
    examples?: Array<{
        name: string;
        input?: unknown;
        expected_output?: unknown;
        [key: string]: unknown;
    }>;
}
export declare class CLMLoader {
    basePath: string;
    constructor(basePath?: string);
    /**
     * Load a CLM file from path
     */
    load(clmPath: string): CLMSpec;
    /**
     * Load all CLM files from a directory
     */
    loadDirectory(dirPath: string): Map<string, CLMSpec>;
    /**
     * Load logic file content for a CLM
     */
    loadLogicFile(clm: CLMSpec, chapterDir: string): string | null;
}
//# sourceMappingURL=CLMLoader.d.ts.map