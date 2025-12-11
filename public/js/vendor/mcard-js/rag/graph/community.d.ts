/**
 * Community Detection and Summarization
 *
 * Label Propagation Algorithm (LPA) for community detection
 * and LLM-based hierarchical summarization.
 *
 * Mirrors Python: mcard/rag/graph/community.py
 */
import { GraphStore } from './store';
/**
 * Detect communities using asynchronous Label Propagation.
 *
 * @param store - GraphStore instance
 * @param maxIter - Maximum iterations
 * @returns List of communities, where each community is a list of entity IDs
 */
export declare function detectCommunities(store: GraphStore, maxIter?: number): number[][];
export interface CommunitySummarizerConfig {
    model: string;
    ollamaBaseUrl: string;
}
/**
 * Summarizes graph communities using LLM.
 */
export declare class CommunitySummarizer {
    private store;
    private config;
    constructor(store: GraphStore, config?: Partial<CommunitySummarizerConfig>);
    /**
     * Summarize communities and store them in the DB.
     *
     * @returns Count of summaries generated
     */
    summarizeAndStore(communities: number[][]): Promise<number>;
    /**
     * Prepare entity context for summarization
     */
    private prepareContext;
    /**
     * Generate summary using LLM
     */
    private generateSummary;
}
/**
 * Detect communities and optionally summarize them.
 *
 * @param store - GraphStore instance
 * @param summarize - Whether to generate LLM summaries
 * @param config - Summarizer configuration
 * @returns Object with communities and summary count
 */
export declare function detectAndSummarizeCommunities(store: GraphStore, summarize?: boolean, config?: Partial<CommunitySummarizerConfig>): Promise<{
    communities: number[][];
    summaryCount: number;
}>;
//# sourceMappingURL=community.d.ts.map