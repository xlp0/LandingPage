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
import { HandleVectorStore } from './HandleVectorStore';
// Default store instance (lazy-initialized)
let _defaultStore = null;
/**
 * Get the default HandleVectorStore instance.
 *
 * @param dbPath Path to SQLite database (undefined = in-memory)
 * @param config RAG configuration
 * @param reinitialize Force re-initialization of the store
 * @returns HandleVectorStore instance
 */
export function getStore(dbPath, config, reinitialize = false) {
    if (_defaultStore === null || reinitialize) {
        _defaultStore = new HandleVectorStore(dbPath ?? ':memory:', config);
    }
    return _defaultStore;
}
/**
 * Reset the default store (useful for testing).
 */
export function resetStore() {
    if (_defaultStore) {
        _defaultStore.close();
        _defaultStore = null;
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Core API Functions
// ─────────────────────────────────────────────────────────────────────────────
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
export async function linkMCardToHandle(mcard, handle, isCurrent = true, store) {
    const s = store ?? getStore();
    const indexed = await s.indexWithHandle(mcard, handle, isCurrent);
    return indexed > 0;
}
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
export function getHandleVersionHistory(handle, store) {
    const s = store ?? getStore();
    const versions = s.getHandleVersions(handle);
    return versions.map(v => ({
        hash: v.hash,
        versionOrder: v.versionOrder,
        isCurrent: v.isCurrent,
        createdAt: v.createdAt,
        hasEmbedding: v.embeddingId !== undefined,
        parentHash: v.parentHash,
        semanticDelta: v.semanticDelta,
        upgradeType: v.upgradeType,
    }));
}
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
export function compareVersionsBySimilarity(handle, referenceHash, metric = 'cosine', store) {
    const s = store ?? getStore();
    return s.getVersionsBySimilarity(handle, referenceHash, metric);
}
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
export async function searchWithinHandle(handle, query, k = 10, store) {
    const s = store ?? getStore();
    return s.searchHandleVersions(handle, query, k);
}
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
export function getVersionDistances(handle, cache = true, store) {
    const s = store ?? getStore();
    return s.computeVersionDistances(handle, cache);
}
/**
 * Find the version most similar to a query.
 *
 * @param handle Handle name
 * @param query Search query text
 * @param store Optional custom HandleVectorStore instance
 * @returns Most similar version, or undefined if no versions exist
 */
export async function findMostSimilarVersion(handle, query, store) {
    const results = await searchWithinHandle(handle, query, 1, store);
    return results.length > 0 ? results[0] : undefined;
}
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
export function getSemanticEvolution(handle, store) {
    const s = store ?? getStore();
    const versions = s.getHandleVersions(handle);
    return versions.map(v => {
        let interpretation;
        if (v.parentHash && v.semanticDelta !== undefined) {
            if (v.semanticDelta >= 0.95) {
                interpretation = 'Nearly identical to parent';
            }
            else if (v.semanticDelta >= 0.85) {
                interpretation = 'Minor changes from parent';
            }
            else if (v.semanticDelta >= 0.70) {
                interpretation = 'Significant changes from parent';
            }
            else {
                interpretation = 'Major semantic shift from parent';
            }
        }
        else {
            interpretation = 'Initial version (no parent)';
        }
        return {
            hash: v.hash,
            version: v.versionOrder,
            isCurrent: v.isCurrent,
            createdAt: v.createdAt,
            parentHash: v.parentHash,
            semanticDelta: v.semanticDelta,
            upgradeType: v.upgradeType,
            interpretation,
        };
    });
}
// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────
/**
 * List all handles with indexed versions.
 *
 * @param store Optional custom HandleVectorStore instance
 * @returns List of handle names
 */
export function listHandles(store) {
    const s = store ?? getStore();
    return s.listHandles();
}
/**
 * Get information about the vector store.
 *
 * @param store Optional custom HandleVectorStore instance
 * @returns Object with store statistics
 */
export function getStoreInfo(store) {
    const s = store ?? getStore();
    return s.getInfo();
}
//# sourceMappingURL=semanticVersioning.js.map