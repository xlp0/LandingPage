/**
 * PersistentIndexer - Auto-indexing MCards for semantic search
 *
 * Manages automatic indexing of MCards into the vector store,
 * with persistent storage alongside the main MCard database.
 *
 * Mirrors Python: mcard/rag/indexer.py
 */
import { MCardVectorStore, DEFAULT_VECTOR_CONFIG } from '../storage/VectorStore';
import { OllamaEmbeddingProvider } from '../ptr/llm/providers/OllamaEmbeddingProvider';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// ─────────────────────────────────────────────────────────────────────────────
// PersistentIndexer Class
// ─────────────────────────────────────────────────────────────────────────────
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
export class PersistentIndexer {
    static instance = null;
    collection;
    config;
    vectorDbPath;
    embedder;
    vectorStore;
    autoIndex;
    indexingInProgress = false;
    indexedHashes = new Set();
    initialized = false;
    /**
     * Get singleton instance of PersistentIndexer
     */
    static getInstance(collection, config, vectorDbPath) {
        if (!PersistentIndexer.instance) {
            PersistentIndexer.instance = new PersistentIndexer(collection, config, vectorDbPath);
        }
        return PersistentIndexer.instance;
    }
    /**
     * Reset singleton instance (for testing)
     */
    static resetInstance() {
        PersistentIndexer.instance = null;
    }
    constructor(collection, config, vectorDbPath) {
        this.config = config || { ...DEFAULT_VECTOR_CONFIG, autoIndex: false };
        this.autoIndex = this.config.autoIndex ?? false;
        // Vector DB path - try to derive from collection if not provided
        this.vectorDbPath = vectorDbPath || this.deriveVectorDbPath(collection) || ':memory:';
        // Initialize embedding provider
        this.embedder = new OllamaEmbeddingProvider(this.config.embeddingModel || DEFAULT_VECTOR_CONFIG.embeddingModel, this.config.ollamaBaseUrl || 'http://localhost:11434');
        // Initialize vector store
        this.vectorStore = new MCardVectorStore(this.vectorDbPath, this.config);
        // Collection will be set later if not provided
        this.collection = collection;
        this.initialized = true;
        console.debug(`PersistentIndexer initialized: ${this.vectorDbPath}`);
    }
    /**
     * Set the collection to index from
     */
    setCollection(collection) {
        this.collection = collection;
    }
    /**
     * Try to derive vector DB path from collection's storage engine
     */
    deriveVectorDbPath(collection) {
        if (!collection)
            return null;
        try {
            // Access private engine via any cast (runtime inspection)
            const engine = collection.engine;
            // Check for getDbPath method (SqliteNodeEngine)
            if (engine && typeof engine.getDbPath === 'function') {
                const dbPath = engine.getDbPath();
                if (dbPath && dbPath !== ':memory:') {
                    const path = require('path');
                    const parsed = path.parse(dbPath);
                    // Use same directory, append _vectors to name
                    return path.join(parsed.dir, `${parsed.name}_vectors${parsed.ext}`);
                }
            }
        }
        catch (e) {
            console.warn('Failed to derive vector DB path:', e);
        }
        return null;
    }
    /**
     * Load already-indexed hashes from the vector store
     */
    async loadIndexedHashes() {
        try {
            // Query for distinct hashes from metadata table
            const hashes = await this.vectorStore.getIndexedHashes();
            this.indexedHashes = new Set(hashes);
            console.debug(`Loaded ${this.indexedHashes.size} indexed hashes`);
        }
        catch (error) {
            console.warn(`Failed to load indexed hashes: ${error}`);
            this.indexedHashes = new Set();
        }
    }
    /**
     * Check if an MCard is already indexed
     */
    isIndexed(hash) {
        return this.indexedHashes.has(hash);
    }
    /**
     * Index a single MCard
     *
     * @param mcard - MCard to index
     * @param force - Re-index even if already indexed
     * @returns True if indexed successfully
     */
    async indexMCard(mcard, force = false) {
        if (!force && this.isIndexed(mcard.hash)) {
            console.debug(`MCard ${mcard.hash.slice(0, 8)} already indexed, skipping`);
            return true;
        }
        try {
            const content = mcard.getContentAsText();
            const count = await this.vectorStore.index(mcard.hash, content);
            if (count > 0) {
                this.indexedHashes.add(mcard.hash);
                console.debug(`Indexed MCard ${mcard.hash.slice(0, 8)} (${count} vectors)`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error(`Failed to index MCard ${mcard.hash.slice(0, 8)}: ${error}`);
            return false;
        }
    }
    /**
     * Index all MCards in the collection
     *
     * @param force - Re-index even if already indexed
     * @param progressCallback - Optional callback(current, total)
     * @param batchSize - Number of cards to process at once
     * @returns Statistics about the indexing operation
     */
    async indexAll(force = false, progressCallback, batchSize = 50) {
        if (this.indexingInProgress) {
            console.warn('Indexing already in progress');
            return { indexed: 0, skipped: 0, failed: 0, total: 0, status: 'busy' };
        }
        if (!this.collection) {
            throw new Error('No collection set for indexer');
        }
        this.indexingInProgress = true;
        const stats = { indexed: 0, skipped: 0, failed: 0, total: 0 };
        try {
            // Get all cards through pagination
            let pageNumber = 1;
            const pageSize = batchSize;
            let allCards = [];
            while (true) {
                const page = await this.collection.getPage(pageNumber, pageSize);
                allCards.push(...page.items);
                if (!page.hasNext)
                    break;
                pageNumber++;
            }
            stats.total = allCards.length;
            for (let i = 0; i < allCards.length; i++) {
                const mcard = allCards[i];
                if (!force && this.isIndexed(mcard.hash)) {
                    stats.skipped++;
                }
                else if (await this.indexMCard(mcard, force)) {
                    stats.indexed++;
                }
                else {
                    stats.failed++;
                }
                // Progress callback
                if (progressCallback && (i + 1) % 10 === 0) {
                    progressCallback(i + 1, stats.total);
                }
            }
            console.info(`Indexing complete: ${JSON.stringify(stats)}`);
        }
        finally {
            this.indexingInProgress = false;
        }
        return stats;
    }
    /**
     * Search for similar MCards
     *
     * @param query - Search query
     * @param k - Number of results
     * @param hybrid - Use hybrid (vector + FTS) search
     * @returns List of search results
     */
    async search(query, k = 5, hybrid = true) {
        if (hybrid && this.config.enableHybridSearch) {
            return this.vectorStore.hybridSearch(query, k);
        }
        else {
            return this.vectorStore.search(query, k);
        }
    }
    /**
     * Delete an MCard from the index
     */
    async delete(hash) {
        const count = await this.vectorStore.delete(hash);
        if (count > 0) {
            this.indexedHashes.delete(hash);
            return true;
        }
        return false;
    }
    /**
     * Clear the entire vector index
     */
    async clear() {
        await this.vectorStore.clear();
        this.indexedHashes.clear();
        console.info('Vector index cleared');
    }
    /**
     * Get indexer statistics
     */
    getStats() {
        return {
            vectorDbPath: this.vectorDbPath,
            embeddingModel: this.config.embeddingModel || DEFAULT_VECTOR_CONFIG.embeddingModel,
            dimensions: this.config.dimensions || DEFAULT_VECTOR_CONFIG.dimensions,
            indexedCount: this.indexedHashes.size,
            vectorCount: this.vectorStore.count(),
            uniqueMCards: this.vectorStore.countUnique ? this.vectorStore.countUnique() : this.indexedHashes.size,
            hasVecExtension: this.vectorStore.hasVectorExtension(),
            hybridSearchEnabled: this.config.enableHybridSearch ?? false,
            indexingInProgress: this.indexingInProgress,
        };
    }
    /**
     * Close the indexer
     */
    close() {
        this.vectorStore.close();
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Global Convenience Functions
// ─────────────────────────────────────────────────────────────────────────────
let defaultIndexer = null;
/**
 * Get or create the default persistent indexer
 */
export function getIndexer(collection, config) {
    if (!defaultIndexer) {
        defaultIndexer = PersistentIndexer.getInstance(collection, config);
    }
    return defaultIndexer;
}
/**
 * Convenience function for semantic search
 */
export async function semanticSearch(query, k = 5) {
    return getIndexer().search(query, k);
}
/**
 * Convenience function to index an MCard
 */
export async function indexMCard(mcard, force = false) {
    return getIndexer().indexMCard(mcard, force);
}
/**
 * Reset the default indexer (for testing)
 */
export function resetIndexer() {
    if (defaultIndexer) {
        defaultIndexer.close();
        defaultIndexer = null;
    }
    PersistentIndexer.resetInstance();
}
//# sourceMappingURL=PersistentIndexer.js.map