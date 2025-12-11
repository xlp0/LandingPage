/**
 * CLMRunner - Execute JavaScript logic from CLM specifications
 *
 * Node.js PTR runtime for interpreting Cubical Logic Models
 */
import { CLMSpec } from './CLMLoader';
import { CardCollection } from '../../model/CardCollection';
export interface ExecutionResult {
    success: boolean;
    result?: unknown;
    error?: string;
    executionTime: number;
    clm: {
        chapter: string;
        concept: string;
        manifestation: string;
        boundary?: string;
    };
}
export interface CLMBannerLines {
    header: string[];
}
export interface RuntimeResult {
    runtime: string;
    success: boolean;
    result?: unknown;
    error?: string;
    executionTime: number;
}
export interface MultiRuntimeResult {
    success: boolean;
    consensus: boolean;
    results: RuntimeResult[];
    consensusValue?: unknown;
    error?: string;
    executionTime: number;
    clm: {
        chapter: string;
        concept: string;
        manifestation: string;
        boundary?: string;
    };
}
export interface VerificationResult {
    verified: boolean;
    expected: unknown;
    actual: unknown;
    executionResult: ExecutionResult;
}
export interface RunExamplesSummary {
    total: number;
    passed: number;
    results: Array<{
        case: number;
        name: string;
        input: unknown;
        result: unknown;
        error?: string;
        expected: unknown;
        match: boolean;
    }>;
}
export interface ExecutionReport {
    status: 'success' | 'failure';
    result?: unknown;
    error?: string;
    chapter_id: number;
    chapter_title: string;
}
export interface SummaryReport {
    status: 'success' | 'failure';
    result: {
        success: boolean;
        total: number;
        results: Array<{
            case: number;
            name: string;
            result: unknown;
            error?: string;
        }>;
    };
    chapter_id: number;
    chapter_title: string;
}
export declare class CLMRunner {
    private loader;
    private timeout;
    private collection?;
    constructor(basePath?: string, timeout?: number, collection?: CardCollection);
    /**
     * Run a CLM directly from a file path
     */
    runFile(clmPath: string, input?: unknown): Promise<ExecutionResult>;
    /**
     * Execute a CLM specification with given input
     */
    executeCLM(clm: CLMSpec, chapterDir: string, input: unknown): Promise<ExecutionResult>;
    private resolveCodeOrPath;
    private buildExecutionResult;
    /**
     * Verify CLM output against expected result
     */
    verifyCLM(clm: CLMSpec, chapterDir: string, input: unknown, expected: unknown): Promise<VerificationResult>;
    /**
     * Run all examples from a CLM specification
     */
    runExamples(clm: CLMSpec, chapterDir: string): Promise<Array<{
        name: string;
        result: ExecutionResult;
    }>>;
    summarizeExampleRuns(clm: CLMSpec, results: Array<{
        name: string;
        result: ExecutionResult;
    }>): RunExamplesSummary;
    buildCLMBanner(clm: CLMSpec): CLMBannerLines;
    buildExecutionReport(clm: CLMSpec, execution: ExecutionResult): ExecutionReport;
    buildSummaryReport(clm: CLMSpec, summary: RunExamplesSummary): SummaryReport;
    private executeRecursive;
    /**
     * Execute a CLM across multiple runtimes and verify consensus
     *
     * All runtimes must produce the same result for consensus to be achieved.
     */
    executeMultiRuntime(clm: CLMSpec, chapterDir: string, input: unknown): Promise<MultiRuntimeResult>;
    /**
     * Check if a CLM is a multi-runtime CLM
     */
    isMultiRuntime(clm: CLMSpec): boolean;
    /**
     * Handle versioning builtin: update a handle through multiple versions.
     */
    private executeHandleVersion;
    private runVersionExamples;
    private executeVersionSingle;
    /**
     * Handle pruning builtin: prune handle history.
     */
    private executeHandlePrune;
    private runPruneExamples;
    private executePruneSingle;
}
//# sourceMappingURL=CLMRunner.d.ts.map