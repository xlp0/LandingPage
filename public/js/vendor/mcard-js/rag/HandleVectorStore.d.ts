/**
 * Handle-Aware Vector Store for Semantic Versioning
 *
 * Extends VectorStore to enable semantic similarity detection
 * across MCard versions linked to handles.
 *
 * Key Features:
 * - Link MCards to handles during indexing
 * - Compare versions within a handle by semantic similarity
 * - Filter searches by handle
 * - Sort version history by distance to current or query
 * - Automatic upgrade type classification based on semantic delta
 *
 * @module mcard-js/rag/HandleVectorStore
 */
import { MCard } from '../model/MCard';
import { MCardVectorStore, VectorStoreConfig } from '../storage/VectorStore';
export { VectorStoreConfig } from '../storage/VectorStore';
/**
 * A version in a handle's history with embedding info.
 */
export interface HandleVersion {
    hash: string;
    versionOrder: number;
    isCurrent: boolean;
    createdAt: string;
    parentHash?: string;
    embeddingId?: number;
    semanticDelta?: number;
    upgradeType?: string;
}
/**
 * Result from version similarity comparison.
 */
export interface VersionSimilarityResult {
    hash: string;
    versionOrder: number;
    similarityToCurrent: number;
    distanceToCurrent: number;
    similarityToQuery?: number;
    parentHash?: string;
    upgradeType?: string;
}
/**
 * Classify upgrade type based on semantic similarity to parent.
 *
 * Thresholds:
 * - >= 0.95: trivial (formatting, typo fixes)
 * - 0.85 - 0.94: minor (small edits, clarifications)
 * - 0.70 - 0.84: major (significant content changes)
 * - < 0.70: breaking (major semantic drift)
 *
 * @param semanticDelta Cosine similarity to parent version
 * @returns Upgrade type string
 */
export declare function classifyUpgradeType(semanticDelta: number): string;
/**
 * Calculate Euclidean distance between two vectors.
 */
export declare function euclideanDistance(a: number[], b: number[]): number;
/**
 * Extended vector store with handle-aware version similarity.
 *
 * This class implements the Handle-Hash Duality pattern with semantic
 * awareness, enabling:
 *
 * - Version tracking via handles
 * - Semantic similarity detection across versions
 * - Intelligent upgrade classification
 * - Cross-version semantic search
 *
 * Architecture:
 * - Handles remain stable identifiers (Proxy Pattern)
 * - Hashes reference immutable content (Content-Addressing)
 * - Embeddings enable semantic understanding (Vector Search)
 *
 * @example
 * ```typescript
 * const store = new HandleVectorStore(':memory:');
 *
 * // Index with handle association
 * await store.indexWithHandle(mcard, 'my_document');
 *
 * // Get versions sorted by similarity to current
 * const versions = await store.getVersionsBySimilarity('my_document');
 *
 * // Find versions similar to a query
 * const results = await store.searchHandleVersions('my_document', 'machine learning');
 * ```
 */
export declare class HandleVectorStore extends MCardVectorStore {
    constructor(dbPath?: string, config?: Partial<VectorStoreConfig>);
    /**
     * Create handle-vector bridge tables for semantic versioning.
     */
    private initHandleTables;
    /**
     * Index an MCard and associate it with a handle.
     *
     * This method:
     * 1. Indexes the MCard content with embeddings (via base class)
     * 2. Links the MCard hash to the handle with version tracking
     * 3. Computes semantic delta from parent version (if exists)
     * 4. Classifies the upgrade type based on similarity
     *
     * @param mcard MCard to index
     * @param handle Handle name to associate with
     * @param isCurrent Whether this is the current version
     * @param chunk Whether to chunk long content
     * @returns Number of vectors indexed (0 if content couldn't be indexed)
     */
    indexWithHandle(mcard: MCard, handle: string, isCurrent?: boolean, chunk?: boolean): Promise<number>;
    /**
     * Get all versions for a handle.
     *
     * @param handle Handle name to query
     * @returns List of HandleVersion objects, ordered by version_order (0 = current)
     */
    getHandleVersions(handle: string): HandleVersion[];
    /**
     * Get all version hashes for a handle.
     *
     * @param handle Handle name to query
     * @returns List of hashes, ordered by version_order
     */
    getHandleVersionHashes(handle: string): string[];
    /**
     * Get the current version for a handle.
     *
     * @param handle Handle name to query
     * @returns HandleVersion for current version, or undefined if handle not found
     */
    getCurrentVersion(handle: string): HandleVersion | undefined;
    /**
     * Get versions for a handle, sorted by similarity to a reference.
     *
     * @param handle Handle name
     * @param referenceHash Hash to compare against (default: current version)
     * @param metric 'cosine' (higher = more similar) or 'euclidean' (lower = more similar)
     * @returns List of VersionSimilarityResult, sorted by similarity
     */
    getVersionsBySimilarity(handle: string, referenceHash?: string, metric?: 'cosine' | 'euclidean'): VersionSimilarityResult[];
    /**
     * Search within a handle's versions by semantic query.
     *
     * Useful for finding which version of a document best matches
     * a specific concept or topic.
     *
     * @param handle Handle name to filter by
     * @param query Search query text
     * @param k Number of results
     * @returns List of VersionSimilarityResult with query similarity scores
     */
    searchHandleVersions(handle: string, query: string, k?: number): Promise<VersionSimilarityResult[]>;
    /**
     * Compute pairwise cosine similarities between all versions of a handle.
     *
     * Optionally caches results in the version_similarity_cache table.
     *
     * @param handle Handle name
     * @param cache Whether to cache computed similarities
     * @returns Map of (hash_a, hash_b) string key to cosine similarity
     */
    computeVersionDistances(handle: string, cache?: boolean): Map<string, number>;
    /**
     * Get embedding vector for a hash.
     *
     * @param hash MCard hash
     * @param chunkIndex Chunk index (default 0 for first/whole chunk)
     * @returns Embedding vector as array of floats, or undefined if not found
     */
    private getEmbedding;
    /**
     * List all handles with indexed versions.
     *
     * @returns List of unique handle names
     */
    listHandles(): string[];
    /**
     * Count versions for a handle.
     *
     * @param handle Handle name
     * @returns Number of versions
     */
    countVersions(handle: string): number;
    /**
     * Delete all version records for a handle.
     *
     * Note: This only removes the handle-version associations,
     * not the underlying MCard embeddings.
     *
     * @param handle Handle name
     * @returns Number of version records deleted
     */
    deleteHandle(handle: string): number;
    /**
     * Get extended vector store information including handle stats.
     */
    getInfo(): Record<string, unknown>;
}
//# sourceMappingURL=HandleVectorStore.d.ts.map