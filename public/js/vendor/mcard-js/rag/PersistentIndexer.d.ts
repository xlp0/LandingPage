/**
 * PersistentIndexer - Auto-indexing MCards for semantic search
 *
 * Manages automatic indexing of MCards into the vector store,
 * with persistent storage alongside the main MCard database.
 *
 * Mirrors Python: mcard/rag/indexer.py
 */
import { MCard } from '../model/MCard';
import { CardCollection } from '../model/CardCollection';
import { VectorStoreConfig } from '../storage/VectorStore';
export interface IndexerConfig extends VectorStoreConfig {
    autoIndex?: boolean;
}
export interface IndexStats {
    indexed: number;
    skipped: number;
    failed: number;
    total: number;
    status?: string;
}
export interface IndexerStats {
    vectorDbPath: string;
    embeddingModel: string;
    dimensions: number;
    indexedCount: number;
    vectorCount: number;
    uniqueMCards: number;
    hasVecExtension: boolean;
    hybridSearchEnabled: boolean;
    indexingInProgress: boolean;
}
/**
 * Manages persistent vector indexing for MCard collections.
 *
 * Features:
 * - Automatic indexing when MCards are added
 * - Persistent vector database alongside MCard database
 * - Background indexing for large collections
 * - Index status tracking
 *
 * Usage:
 *     import { PersistentIndexer } from './rag/PersistentIndexer';
 *
 *     const indexer = new PersistentIndexer();
 *
 *     // Index all existing content
 *     const stats = await indexer.indexAll();
 *
 *     // Search
 *     const results = await indexer.search("query");
 */
export declare class PersistentIndexer {
    private static instance;
    private collection;
    private config;
    private vectorDbPath;
    private embedder;
    private vectorStore;
    private autoIndex;
    private indexingInProgress;
    private indexedHashes;
    private initialized;
    /**
     * Get singleton instance of PersistentIndexer
     */
    static getInstance(collection?: CardCollection, config?: IndexerConfig, vectorDbPath?: string): PersistentIndexer;
    /**
     * Reset singleton instance (for testing)
     */
    static resetInstance(): void;
    private constructor();
    /**
     * Set the collection to index from
     */
    setCollection(collection: CardCollection): void;
    /**
     * Try to derive vector DB path from collection's storage engine
     */
    private deriveVectorDbPath;
    /**
     * Load already-indexed hashes from the vector store
     */
    private loadIndexedHashes;
    /**
     * Check if an MCard is already indexed
     */
    isIndexed(hash: string): boolean;
    /**
     * Index a single MCard
     *
     * @param mcard - MCard to index
     * @param force - Re-index even if already indexed
     * @returns True if indexed successfully
     */
    indexMCard(mcard: MCard, force?: boolean): Promise<boolean>;
    /**
     * Index all MCards in the collection
     *
     * @param force - Re-index even if already indexed
     * @param progressCallback - Optional callback(current, total)
     * @param batchSize - Number of cards to process at once
     * @returns Statistics about the indexing operation
     */
    indexAll(force?: boolean, progressCallback?: (current: number, total: number) => void, batchSize?: number): Promise<IndexStats>;
    /**
     * Search for similar MCards
     *
     * @param query - Search query
     * @param k - Number of results
     * @param hybrid - Use hybrid (vector + FTS) search
     * @returns List of search results
     */
    search(query: string, k?: number, hybrid?: boolean): Promise<any[]>;
    /**
     * Delete an MCard from the index
     */
    delete(hash: string): Promise<boolean>;
    /**
     * Clear the entire vector index
     */
    clear(): Promise<void>;
    /**
     * Get indexer statistics
     */
    getStats(): IndexerStats;
    /**
     * Close the indexer
     */
    close(): void;
}
/**
 * Get or create the default persistent indexer
 */
export declare function getIndexer(collection?: CardCollection, config?: IndexerConfig): PersistentIndexer;
/**
 * Convenience function for semantic search
 */
export declare function semanticSearch(query: string, k?: number): Promise<any[]>;
/**
 * Convenience function to index an MCard
 */
export declare function indexMCard(mcard: MCard, force?: boolean): Promise<boolean>;
/**
 * Reset the default indexer (for testing)
 */
export declare function resetIndexer(): void;
//# sourceMappingURL=PersistentIndexer.d.ts.map