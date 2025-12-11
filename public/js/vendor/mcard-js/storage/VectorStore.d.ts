/**
 * MCard Vector Store for JavaScript
 *
 * SQLite-based vector storage for semantic search using sqlite-vec extension.
 * Compatible with the Python MCardVectorStore implementation.
 */
import Database from 'better-sqlite3';
export interface VectorDbStatement {
    run: (...params: unknown[]) => {
        lastInsertRowid?: number | bigint;
        changes?: number;
    };
    all: (...params: unknown[]) => any[];
    get: (...params: unknown[]) => any;
    loadVecExtension?: (dimensions: number) => boolean;
}
export interface VectorDb {
    exec(sql: string): void;
    prepare(sql: string): VectorDbStatement;
}
export declare class BetterSqliteAdapter implements VectorDb {
    private db;
    constructor(db: Database.Database);
    exec(sql: string): void;
    prepare(sql: string): {
        run: (...params: unknown[]) => Database.RunResult;
        all: (...params: unknown[]) => unknown[];
        get: (...params: unknown[]) => unknown;
        loadVecExtension: (dimensions: number) => boolean;
    };
}
export interface VectorStoreConfig {
    /** Embedding model name (for Ollama) */
    embeddingModel: string;
    /** Vector dimensions (default: 768 for nomic-embed-text) */
    dimensions: number;
    /** Ollama base URL */
    ollamaBaseUrl: string;
    /** Chunk size for long documents */
    chunkSize: number;
    /** Chunk overlap */
    chunkOverlap: number;
    /** Enable FTS hybrid search */
    enableHybridSearch: boolean;
}
export declare const DEFAULT_VECTOR_CONFIG: VectorStoreConfig;
export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
    embedBatch?(texts: string[]): Promise<number[][]>;
    modelName?: string;
    dimensions?: number;
}
/**
 * Serialize a float array to bytes (little-endian float32).
 */
export declare function serializeVector(vector: number[]): Buffer;
/**
 * Deserialize bytes to a float array.
 */
export declare function deserializeVector(buffer: Buffer): number[];
/**
 * Calculate cosine similarity between two vectors.
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
export interface VectorSearchResult {
    hash: string;
    score: number;
    content?: string;
    chunkIndex?: number;
    metadata?: Record<string, unknown>;
}
export declare class MCardVectorStore {
    protected db: VectorDb;
    protected config: VectorStoreConfig;
    protected hasVecExtension: boolean;
    /**
     * Construct a vector store.
     *
     * - Node.js: pass a string path (uses better-sqlite3 under the hood)
     * - Advanced: pass a VectorDb adapter (e.g., SqlJsVectorAdapter for WASM)
     */
    constructor(dbOrPath?: string | VectorDb, config?: Partial<VectorStoreConfig>);
    /**
     * Initialize database tables.
     * Uses schema from the unified MCardSchema singleton (schema/mcard_schema.sql).
     */
    private initDatabase;
    /**
     * Fallback initialization for browser/WASM environments.
     * Uses exported constants from schema.ts which are loaded from the SQL file.
     */
    private initDatabaseFallback;
    /**
     * Try to load sqlite-vec extension.
     */
    private tryLoadVecExtension;
    /**
     * Generate embedding using Ollama.
     */
    embed(text: string): Promise<number[]>;
    /**
     * Index content with its embedding.
     */
    index(hash: string, content: string, metadata?: Record<string, unknown>, chunk?: boolean): Promise<number>;
    /**
     * Search for similar content.
     */
    search(query: string, k?: number): Promise<VectorSearchResult[]>;
    /**
     * Search using sqlite-vec KNN.
     */
    private searchWithVec;
    /**
     * Fallback brute-force similarity search.
     */
    private searchFallback;
    /**
     * Hybrid search combining vector and FTS.
     */
    hybridSearch(query: string, k?: number, vectorWeight?: number): Promise<VectorSearchResult[]>;
    /**
     * Split text into overlapping chunks.
     */
    private chunkText;
    /**
     * Get count of indexed vectors.
     */
    count(): number;
    /**
     * Get list of all indexed hashes (distinct)
     */
    getIndexedHashes(): Promise<string[]>;
    /**
     * Count unique indexed cards
     */
    countUnique(): number;
    /**
     * Delete vectors for a hash.
     */
    delete(hash: string): number;
    /**
     * Clear all vectors.
     */
    clear(): void;
    /**
     * Check if sqlite-vec extension is available.
     */
    hasVectorExtension(): boolean;
    /**
     * Get information about the vector store.
     */
    getInfo(): Record<string, unknown>;
    /**
     * Close the database connection.
     */
    close(): void;
}
/**
 * Minimal shape of a sql.js Database for adapter purposes.
 * We intentionally keep this loose to avoid tight coupling to sql.js types.
 */
export interface SqlJsDatabaseLike {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string): {
        columns: string[];
        values: unknown[][];
    }[];
    prepare(sql: string): any;
}
/**
 * Adapter for sql.js / SQLite WASM so VectorStore can run in the browser.
 *
 * NOTE: Parameter binding and stepping are left as a TODO because the exact
 * sql.js API usage (bind/step/getAsObject) depends on how you want to map
 * VectorDb semantics to sql.js. For now, this adapter is scaffolding that
 * shows where to integrate sql.js.
 */
export declare class SqlJsVectorAdapter implements VectorDb {
    private db;
    constructor(db: SqlJsDatabaseLike);
    exec(sql: string): void;
    prepare(_sql: string): {
        run: (..._params: unknown[]) => {
            lastInsertRowid?: number;
            changes?: number;
        };
        all: (..._params: unknown[]) => any[];
        get: (..._params: unknown[]) => any;
        loadVecExtension: (_dimensions: number) => boolean;
    };
}
/**
 * Factory to create a VectorStore backed by SqliteWasmEngine/sql.js.
 *
 * Example usage (browser):
 *
 *   const engine = new SqliteWasmEngine();
 *   await engine.init(wasmUrl, existingData);
 *   const vecStore = createWasmVectorStore(engine.getRawDb());
 */
export declare function createWasmVectorStore(wasmDb: SqlJsDatabaseLike, config?: Partial<VectorStoreConfig>): MCardVectorStore;
//# sourceMappingURL=VectorStore.d.ts.map