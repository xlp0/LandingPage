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
import { MCardVectorStore, cosineSimilarity, deserializeVector } from '../storage/VectorStore';
import { initSemanticSchemas, HANDLE_VERSION_VECTORS_SCHEMA, VERSION_SIMILARITY_CACHE_SCHEMA } from '../storage/schema';
// ─────────────────────────────────────────────────────────────────────────────
// Upgrade Type Classification
// ─────────────────────────────────────────────────────────────────────────────
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
export function classifyUpgradeType(semanticDelta) {
    if (semanticDelta >= 0.95) {
        return 'trivial';
    }
    else if (semanticDelta >= 0.85) {
        return 'minor';
    }
    else if (semanticDelta >= 0.70) {
        return 'major';
    }
    else {
        return 'breaking';
    }
}
/**
 * Calculate Euclidean distance between two vectors.
 */
export function euclideanDistance(a, b) {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same length');
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}
// ─────────────────────────────────────────────────────────────────────────────
// Handle-Aware Vector Store
// ─────────────────────────────────────────────────────────────────────────────
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
export class HandleVectorStore extends MCardVectorStore {
    constructor(dbPath = ':memory:', config = {}) {
        super(dbPath, config);
        this.initHandleTables();
    }
    /**
     * Create handle-vector bridge tables for semantic versioning.
     */
    initHandleTables() {
        // Create handle-version-vector bridge table
        if (HANDLE_VERSION_VECTORS_SCHEMA) {
            this.db.exec(HANDLE_VERSION_VECTORS_SCHEMA);
        }
        // Create similarity cache table
        if (VERSION_SIMILARITY_CACHE_SCHEMA) {
            this.db.exec(VERSION_SIMILARITY_CACHE_SCHEMA);
        }
        // Use the schema initialization function if tables weren't created
        try {
            initSemanticSchemas(this.db);
        }
        catch (e) {
            // Tables might already exist, ignore
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Indexing with Handle Association
    // ─────────────────────────────────────────────────────────────────────────
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
    async indexWithHandle(mcard, handle, isCurrent = true, chunk = true) {
        // Extract content from MCard for indexing
        const content = typeof mcard.content === 'string'
            ? mcard.content
            : typeof mcard.content === 'object' && mcard.content !== null
                ? JSON.stringify(mcard.content)
                : String(mcard.content ?? '');
        if (!content) {
            console.warn(`MCard ${mcard.hash.slice(0, 8)} has no content, skipping index`);
            return 0;
        }
        // Standard indexing (generates embeddings)
        const indexed = await this.index(mcard.hash, content, undefined, chunk);
        if (indexed === 0) {
            console.warn(`MCard ${mcard.hash.slice(0, 8)} could not be indexed, skipping handle link`);
            return 0;
        }
        const now = new Date().toISOString();
        // Get embedding ID for this hash (chunk 0)
        const metaRow = this.db.prepare(`
            SELECT id FROM mcard_vector_metadata 
            WHERE hash = ? AND chunk_index = 0 LIMIT 1
        `).get(mcard.hash);
        const embeddingId = metaRow?.id ?? null;
        // Get current version info for calculating semantic delta
        let parentHash = null;
        let semanticDelta = null;
        let upgradeType = null;
        if (isCurrent) {
            // Get the current version before updating
            const currentRow = this.db.prepare(`
                SELECT hash, embedding_id FROM handle_version_vectors 
                WHERE handle = ? AND is_current = TRUE LIMIT 1
            `).get(handle);
            if (currentRow) {
                parentHash = currentRow.hash;
                const parentEmbeddingId = currentRow.embedding_id;
                // Calculate semantic delta if both have embeddings
                if (embeddingId && parentEmbeddingId) {
                    const newEmbedding = this.getEmbedding(mcard.hash);
                    const parentEmbedding = this.getEmbedding(parentHash);
                    if (newEmbedding && parentEmbedding) {
                        semanticDelta = cosineSimilarity(newEmbedding, parentEmbedding);
                        upgradeType = classifyUpgradeType(semanticDelta);
                        console.debug(`Semantic delta for ${handle}: ${semanticDelta.toFixed(4)} (${upgradeType})`);
                    }
                }
            }
            // Shift existing versions down
            this.db.prepare(`
                UPDATE handle_version_vectors 
                SET version_order = version_order + 1, is_current = FALSE
                WHERE handle = ?
            `).run(handle);
        }
        // Determine version order
        let versionOrder;
        if (isCurrent) {
            versionOrder = 0;
        }
        else {
            const maxRow = this.db.prepare(`
                SELECT COALESCE(MAX(version_order), -1) + 1 as next_order
                FROM handle_version_vectors 
                WHERE handle = ?
            `).get(handle);
            versionOrder = maxRow.next_order;
        }
        // Insert version record
        this.db.prepare(`
            INSERT OR REPLACE INTO handle_version_vectors 
            (handle, hash, parent_hash, version_order, is_current, 
             embedding_id, semantic_delta_from_parent, upgrade_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(handle, mcard.hash, parentHash, versionOrder, isCurrent ? 1 : 0, embeddingId, semanticDelta, upgradeType, now);
        console.log(`Indexed MCard ${mcard.hash.slice(0, 8)} for handle '${handle}' ` +
            `(v${versionOrder}, current=${isCurrent}, type=${upgradeType})`);
        return indexed;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Version Retrieval
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Get all versions for a handle.
     *
     * @param handle Handle name to query
     * @returns List of HandleVersion objects, ordered by version_order (0 = current)
     */
    getHandleVersions(handle) {
        const rows = this.db.prepare(`
            SELECT hash, version_order, is_current, embedding_id, created_at,
                   parent_hash, semantic_delta_from_parent, upgrade_type
            FROM handle_version_vectors
            WHERE handle = ?
            ORDER BY version_order
        `).all(handle);
        return rows.map(row => ({
            hash: row.hash,
            versionOrder: row.version_order,
            isCurrent: Boolean(row.is_current),
            embeddingId: row.embedding_id ?? undefined,
            createdAt: row.created_at,
            parentHash: row.parent_hash ?? undefined,
            semanticDelta: row.semantic_delta_from_parent ?? undefined,
            upgradeType: row.upgrade_type ?? undefined,
        }));
    }
    /**
     * Get all version hashes for a handle.
     *
     * @param handle Handle name to query
     * @returns List of hashes, ordered by version_order
     */
    getHandleVersionHashes(handle) {
        const versions = this.getHandleVersions(handle);
        return versions.map(v => v.hash);
    }
    /**
     * Get the current version for a handle.
     *
     * @param handle Handle name to query
     * @returns HandleVersion for current version, or undefined if handle not found
     */
    getCurrentVersion(handle) {
        const row = this.db.prepare(`
            SELECT hash, version_order, is_current, embedding_id, created_at,
                   parent_hash, semantic_delta_from_parent, upgrade_type
            FROM handle_version_vectors
            WHERE handle = ? AND is_current = TRUE
            LIMIT 1
        `).get(handle);
        if (!row) {
            return undefined;
        }
        return {
            hash: row.hash,
            versionOrder: row.version_order,
            isCurrent: Boolean(row.is_current),
            embeddingId: row.embedding_id ?? undefined,
            createdAt: row.created_at,
            parentHash: row.parent_hash ?? undefined,
            semanticDelta: row.semantic_delta_from_parent ?? undefined,
            upgradeType: row.upgrade_type ?? undefined,
        };
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Semantic Similarity Operations
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Get versions for a handle, sorted by similarity to a reference.
     *
     * @param handle Handle name
     * @param referenceHash Hash to compare against (default: current version)
     * @param metric 'cosine' (higher = more similar) or 'euclidean' (lower = more similar)
     * @returns List of VersionSimilarityResult, sorted by similarity
     */
    getVersionsBySimilarity(handle, referenceHash, metric = 'cosine') {
        const versions = this.getHandleVersions(handle);
        if (versions.length === 0) {
            return [];
        }
        // Determine reference hash
        if (!referenceHash) {
            const current = versions.find(v => v.isCurrent);
            referenceHash = current?.hash ?? versions[0].hash;
        }
        // Get reference embedding
        const refEmbedding = this.getEmbedding(referenceHash);
        if (!refEmbedding) {
            console.warn(`No embedding found for reference hash ${referenceHash.slice(0, 8)}`);
            return [];
        }
        // Calculate similarities
        const results = [];
        for (const v of versions) {
            let similarity;
            let distance;
            if (v.hash === referenceHash) {
                // Self-similarity
                similarity = 1.0;
                distance = 0.0;
            }
            else {
                const vEmbedding = this.getEmbedding(v.hash);
                if (!vEmbedding) {
                    console.debug(`Skipping version ${v.hash.slice(0, 8)} - no embedding`);
                    continue;
                }
                similarity = cosineSimilarity(refEmbedding, vEmbedding);
                distance = euclideanDistance(refEmbedding, vEmbedding);
            }
            results.push({
                hash: v.hash,
                versionOrder: v.versionOrder,
                similarityToCurrent: similarity,
                distanceToCurrent: distance,
                parentHash: v.parentHash,
                upgradeType: v.upgradeType,
            });
        }
        // Sort by similarity (descending) or distance (ascending)
        if (metric === 'cosine') {
            results.sort((a, b) => b.similarityToCurrent - a.similarityToCurrent);
        }
        else {
            results.sort((a, b) => a.distanceToCurrent - b.distanceToCurrent);
        }
        return results;
    }
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
    async searchHandleVersions(handle, query, k) {
        // Default to 10 results if not specified
        const limit = k ?? 10;
        // Get version hashes for this handle
        const versionHashes = this.getHandleVersionHashes(handle);
        if (versionHashes.length === 0) {
            return [];
        }
        // Search for similar content (no hash filter in base class)
        // We'll filter by handle versions after the search
        const allResults = await this.search(query, limit * 2);
        // Filter results to only include versions from this handle
        const versionHashSet = new Set(versionHashes);
        const results = allResults.filter(r => versionHashSet.has(r.hash)).slice(0, limit);
        // Get version info for enrichment
        const versions = new Map(this.getHandleVersions(handle).map(v => [v.hash, v]));
        // Enrich results with version info
        const enriched = [];
        for (const r of results) {
            const v = versions.get(r.hash);
            if (v) {
                enriched.push({
                    hash: r.hash,
                    versionOrder: v.versionOrder,
                    similarityToCurrent: 0.0, // Not computed in this method
                    distanceToCurrent: 0.0, // Not computed in this method
                    similarityToQuery: r.score,
                    parentHash: v.parentHash,
                    upgradeType: v.upgradeType,
                });
            }
        }
        return enriched;
    }
    /**
     * Compute pairwise cosine similarities between all versions of a handle.
     *
     * Optionally caches results in the version_similarity_cache table.
     *
     * @param handle Handle name
     * @param cache Whether to cache computed similarities
     * @returns Map of (hash_a, hash_b) string key to cosine similarity
     */
    computeVersionDistances(handle, cache = true) {
        const versions = this.getHandleVersions(handle);
        const embeddings = new Map();
        for (const v of versions) {
            const emb = this.getEmbedding(v.hash);
            if (emb) {
                embeddings.set(v.hash, emb);
            }
        }
        const distances = new Map();
        const hashes = Array.from(embeddings.keys());
        const now = new Date().toISOString();
        for (let i = 0; i < hashes.length; i++) {
            for (let j = i; j < hashes.length; j++) {
                const h1 = hashes[i];
                const h2 = hashes[j];
                let sim;
                if (h1 === h2) {
                    sim = 1.0;
                }
                else {
                    sim = cosineSimilarity(embeddings.get(h1), embeddings.get(h2));
                    const dist = euclideanDistance(embeddings.get(h1), embeddings.get(h2));
                    // Cache the result
                    if (cache) {
                        try {
                            this.db.prepare(`
                                INSERT OR REPLACE INTO version_similarity_cache
                                (handle, hash_a, hash_b, similarity_score, distance_euclidean, computed_at)
                                VALUES (?, ?, ?, ?, ?, ?)
                            `).run(handle, h1, h2, sim, dist, now);
                        }
                        catch (e) {
                            console.warn(`Failed to cache similarity for ${h1.slice(0, 8)}<->${h2.slice(0, 8)}: ${e}`);
                        }
                    }
                }
                // Store both directions
                distances.set(`${h1}:${h2}`, sim);
                distances.set(`${h2}:${h1}`, sim);
            }
        }
        return distances;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Embedding Retrieval (Internal)
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Get embedding vector for a hash.
     *
     * @param hash MCard hash
     * @param chunkIndex Chunk index (default 0 for first/whole chunk)
     * @returns Embedding vector as array of floats, or undefined if not found
     */
    getEmbedding(hash, chunkIndex = 0) {
        // Get metadata ID
        const metaRow = this.db.prepare(`
            SELECT id FROM mcard_vector_metadata 
            WHERE hash = ? AND chunk_index = ?
        `).get(hash, chunkIndex);
        if (!metaRow) {
            return undefined;
        }
        const metadataId = metaRow.id;
        // Get embedding from appropriate table
        const embeddingRow = this.db.prepare(`
            SELECT embedding FROM mcard_embeddings WHERE metadata_id = ?
        `).get(metadataId);
        if (embeddingRow) {
            return deserializeVector(embeddingRow.embedding);
        }
        return undefined;
    }
    // ─────────────────────────────────────────────────────────────────────────
    // Utility Methods
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * List all handles with indexed versions.
     *
     * @returns List of unique handle names
     */
    listHandles() {
        const rows = this.db.prepare('SELECT DISTINCT handle FROM handle_version_vectors ORDER BY handle').all();
        return rows.map(row => row.handle);
    }
    /**
     * Count versions for a handle.
     *
     * @param handle Handle name
     * @returns Number of versions
     */
    countVersions(handle) {
        const row = this.db.prepare('SELECT COUNT(*) as count FROM handle_version_vectors WHERE handle = ?').get(handle);
        return row.count;
    }
    /**
     * Delete all version records for a handle.
     *
     * Note: This only removes the handle-version associations,
     * not the underlying MCard embeddings.
     *
     * @param handle Handle name
     * @returns Number of version records deleted
     */
    deleteHandle(handle) {
        // Delete similarity cache
        this.db.prepare('DELETE FROM version_similarity_cache WHERE handle = ?').run(handle);
        // Delete version records
        const result = this.db.prepare('DELETE FROM handle_version_vectors WHERE handle = ?').run(handle);
        console.log(`Deleted ${result.changes} version records for handle '${handle}'`);
        return result.changes ?? 0;
    }
    /**
     * Get extended vector store information including handle stats.
     */
    getInfo() {
        const info = super.getInfo();
        // Add handle-specific stats
        const handleCount = this.db.prepare('SELECT COUNT(DISTINCT handle) as count FROM handle_version_vectors').get();
        info.handleCount = handleCount.count;
        const versionCount = this.db.prepare('SELECT COUNT(*) as count FROM handle_version_vectors').get();
        info.versionCount = versionCount.count;
        const cachedSimilarities = this.db.prepare('SELECT COUNT(*) as count FROM version_similarity_cache').get();
        info.cachedSimilarities = cachedSimilarities.count;
        return info;
    }
}
//# sourceMappingURL=HandleVectorStore.js.map