/**
 * Semantic Versioning API for MCards
 *
 * High-level API functions for managing MCard versions linked to handles
 * with semantic similarity detection.
 *
 * This module provides a simplified interface for:
 * - Linking MCards to handles
 * - Retrieving version history with semantic info
 * - Comparing versions by semantic similarity
 * - Searching within a handle's version history
 *
 * @module mcard-js/rag/semanticVersioning
 */
import { MCard } from '../model/MCard';
import { HandleVectorStore, VersionSimilarityResult, VectorStoreConfig } from './HandleVectorStore';
/**
 * Get the default HandleVectorStore instance.
 *
 * @param dbPath Path to SQLite database (undefined = in-memory)
 * @param config RAG configuration
 * @param reinitialize Force re-initialization of the store
 * @returns HandleVectorStore instance
 */
export declare function getStore(dbPath?: string, config?: Partial<VectorStoreConfig>, reinitialize?: boolean): HandleVectorStore;
/**
 * Reset the default store (useful for testing).
 */
export declare function resetStore(): void;
/**
 * Link an MCard to a handle with semantic embedding.
 *
 * This function:
 * 1. Indexes the MCard content with vector embeddings
 * 2. Associates the MCard with the specified handle
 * 3. Computes semantic delta from previous version (if exists)
 * 4. Classifies the upgrade type based on similarity
 *
 * @param mcard MCard to link
 * @param handle Handle name (stable identifier)
 * @param isCurrent Whether this becomes the current version
 * @param store Optional custom HandleVectorStore instance
 * @returns True if successful, false if indexing failed
 *
 * @example
 * ```typescript
 * import { MCard } from 'mcard-js';
 * import { linkMCardToHandle } from 'mcard-js/rag';
 *
 * const doc = await MCard.create('Introduction to Machine Learning...');
 * await linkMCardToHandle(doc, 'ml_intro');
 * ```
 */
export declare function linkMCardToHandle(mcard: MCard, handle: string, isCurrent?: boolean, store?: HandleVectorStore): Promise<boolean>;
/**
 * Get version history for a handle with semantic info.
 *
 * @param handle Handle name to query
 * @param store Optional custom HandleVectorStore instance
 * @returns List of version objects with hash, order, timestamps, embedding status, and upgrade type
 *
 * @example
 * ```typescript
 * const history = getHandleVersionHistory('ml_intro');
 * for (const v of history) {
 *     console.log(`v${v.versionOrder}: ${v.hash.slice(0, 8)} (${v.upgradeType})`);
 * }
 * ```
 */
export declare function getHandleVersionHistory(handle: string, store?: HandleVectorStore): Array<{
    hash: string;
    versionOrder: number;
    isCurrent: boolean;
    createdAt: string;
    hasEmbedding: boolean;
    parentHash?: string;
    semanticDelta?: number;
    upgradeType?: string;
}>;
/**
 * Compare all versions of a handle by semantic similarity.
 *
 * This is useful for:
 * - Understanding how content has evolved
 * - Finding which version is most similar to current
 * - Identifying major semantic drift points
 *
 * @param handle Handle name
 * @param referenceHash Compare to this hash (default: current version)
 * @param metric 'cosine' (higher = more similar) or 'euclidean' (lower = closer)
 * @param store Optional custom HandleVectorStore instance
 * @returns Versions sorted by similarity to reference
 *
 * @example
 * ```typescript
 * const results = compareVersionsBySimilarity('ml_intro');
 * for (const r of results) {
 *     console.log(`v${r.versionOrder}: sim=${r.similarityToCurrent.toFixed(4)}`);
 * }
 * ```
 */
export declare function compareVersionsBySimilarity(handle: string, referenceHash?: string, metric?: 'cosine' | 'euclidean', store?: HandleVectorStore): VersionSimilarityResult[];
/**
 * Search semantically within a handle's version history.
 *
 * Useful for finding which version of a document best matches
 * a specific concept, topic, or query.
 *
 * @param handle Handle name to filter by
 * @param query Search query text
 * @param k Number of results to return
 * @param store Optional custom HandleVectorStore instance
 * @returns Matching versions sorted by query similarity
 *
 * @example
 * ```typescript
 * const results = await searchWithinHandle('ml_intro', 'neural networks');
 * for (const r of results) {
 *     console.log(`v${r.versionOrder}: query_sim=${r.similarityToQuery?.toFixed(4)}`);
 * }
 * ```
 */
export declare function searchWithinHandle(handle: string, query: string, k?: number, store?: HandleVectorStore): Promise<VersionSimilarityResult[]>;
/**
 * Compute pairwise semantic distances between all versions.
 *
 * Returns a Map mapping "hash_a:hash_b" string keys to their cosine similarity scores.
 *
 * @param handle Handle name
 * @param cache Whether to cache computed similarities
 * @param store Optional custom HandleVectorStore instance
 * @returns Map of hash pair keys to cosine similarity [-1, 1]
 *
 * @example
 * ```typescript
 * const distances = getVersionDistances('ml_intro');
 * distances.forEach((sim, key) => {
 *     console.log(`${key}: ${sim.toFixed(4)}`);
 * });
 * ```
 */
export declare function getVersionDistances(handle: string, cache?: boolean, store?: HandleVectorStore): Map<string, number>;
/**
 * Find the version most similar to a query.
 *
 * @param handle Handle name
 * @param query Search query text
 * @param store Optional custom HandleVectorStore instance
 * @returns Most similar version, or undefined if no versions exist
 */
export declare function findMostSimilarVersion(handle: string, query: string, store?: HandleVectorStore): Promise<VersionSimilarityResult | undefined>;
/**
 * Get the semantic evolution of a handle's versions.
 *
 * Returns version history annotated with semantic deltas,
 * showing how content has evolved over time.
 *
 * @param handle Handle name
 * @param store Optional custom HandleVectorStore instance
 * @returns List of version objects with evolution info
 */
export declare function getSemanticEvolution(handle: string, store?: HandleVectorStore): Array<{
    hash: string;
    version: number;
    isCurrent: boolean;
    createdAt: string;
    parentHash?: string;
    semanticDelta?: number;
    upgradeType?: string;
    interpretation: string;
}>;
/**
 * List all handles with indexed versions.
 *
 * @param store Optional custom HandleVectorStore instance
 * @returns List of handle names
 */
export declare function listHandles(store?: HandleVectorStore): string[];
/**
 * Get information about the vector store.
 *
 * @param store Optional custom HandleVectorStore instance
 * @returns Object with store statistics
 */
export declare function getStoreInfo(store?: HandleVectorStore): Record<string, unknown>;
export { HandleVersion, VersionSimilarityResult } from './HandleVectorStore';
//# sourceMappingURL=semanticVersioning.d.ts.map