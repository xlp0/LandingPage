/**
 * MCard Vector Store for JavaScript
 *
 * SQLite-based vector storage for semantic search using sqlite-vec extension.
 * Compatible with the Python MCardVectorStore implementation.
 */
import Database from 'better-sqlite3';
import { createRequire } from 'module';
import { MCardSchema, getVec0Schema, VECTOR_METADATA_SCHEMA, VECTOR_METADATA_INDEX, VECTOR_EMBEDDINGS_SCHEMA, VECTOR_FTS_SCHEMA } from './schema';
const require = createRequire(import.meta.url);
// Adapter for better-sqlite3 in Node.js
export class BetterSqliteAdapter {
    db;
    constructor(db) {
        this.db = db;
    }
    exec(sql) {
        this.db.exec(sql);
    }
    prepare(sql) {
        const stmt = this.db.prepare(sql);
        return {
            run: (...params) => stmt.run(...params),
            all: (...params) => stmt.all(...params),
            get: (...params) => stmt.get(...params),
            loadVecExtension: (dimensions) => {
                try {
                    // Dynamic import of sqlite-vec so browser bundles are unaffected.
                    // This is Node-only.
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const sqliteVec = require('sqlite-vec');
                    sqliteVec.load(this.db);
                    // Create vec0 table using schema helper
                    // Note: This is dynamically generated because dimensions are runtime-determined
                    const schema = getVec0Schema(dimensions);
                    this.db.exec(schema);
                    return true;
                }
                catch (e) {
                    console.warn(`[VectorStore] sqlite-vec not available in Node adapter: ${e}`);
                    return false;
                }
            },
        };
    }
}
export const DEFAULT_VECTOR_CONFIG = {
    embeddingModel: 'nomic-embed-text',
    dimensions: 768,
    ollamaBaseUrl: 'http://localhost:11434',
    chunkSize: 512,
    chunkOverlap: 50,
    enableHybridSearch: true,
};
// ─────────────────────────────────────────────────────────────────────────────
// Vector Utilities
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Serialize a float array to bytes (little-endian float32).
 */
export function serializeVector(vector) {
    const buffer = Buffer.alloc(vector.length * 4);
    for (let i = 0; i < vector.length; i++) {
        buffer.writeFloatLE(vector[i], i * 4);
    }
    return buffer;
}
/**
 * Deserialize bytes to a float array.
 */
export function deserializeVector(buffer) {
    const count = buffer.length / 4;
    const vector = [];
    for (let i = 0; i < count; i++) {
        vector.push(buffer.readFloatLE(i * 4));
    }
    return vector;
}
/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0)
        return 0;
    return dotProduct / (normA * normB);
}
// ─────────────────────────────────────────────────────────────────────────────
// Vector Store
// ─────────────────────────────────────────────────────────────────────────────
export class MCardVectorStore {
    db;
    config;
    hasVecExtension = false;
    /**
     * Construct a vector store.
     *
     * - Node.js: pass a string path (uses better-sqlite3 under the hood)
     * - Advanced: pass a VectorDb adapter (e.g., SqlJsVectorAdapter for WASM)
     */
    constructor(dbOrPath = ':memory:', config) {
        this.config = { ...DEFAULT_VECTOR_CONFIG, ...config };
        if (typeof dbOrPath === 'string') {
            const raw = new Database(dbOrPath);
            this.db = new BetterSqliteAdapter(raw);
        }
        else {
            this.db = dbOrPath;
        }
        this.initDatabase();
        this.tryLoadVecExtension();
    }
    /**
     * Initialize database tables.
     * Uses schema from the unified MCardSchema singleton (schema/mcard_schema.sql).
     */
    initDatabase() {
        // Import from singleton schema loader
        // This ensures all SQL comes from schema/mcard_schema.sql
        try {
            // Try to use singleton if running in Node.js with file access
            const schema = MCardSchema.getInstance();
            // Vector metadata table
            const metadataSchema = schema.getTable('mcard_vector_metadata');
            if (metadataSchema) {
                this.db.exec(metadataSchema);
            }
            // Metadata index
            const metadataIndex = schema.getIndex('idx_vector_metadata_hash');
            if (metadataIndex) {
                this.db.exec(metadataIndex);
            }
            // Embeddings fallback table
            const embeddingsSchema = schema.getTable('mcard_embeddings');
            if (embeddingsSchema) {
                this.db.exec(embeddingsSchema);
            }
            // FTS table for hybrid search
            if (this.config.enableHybridSearch) {
                const ftsSchema = schema.getTable('mcard_fts');
                if (ftsSchema) {
                    this.db.exec(ftsSchema);
                }
            }
        }
        catch (e) {
            // Fallback for browser/WASM environments where file access isn't available
            // In this case, we use the exported constants from schema.ts
            console.warn('[VectorStore] Could not load MCardSchema directly, using fallback');
            this.initDatabaseFallback();
        }
    }
    /**
     * Fallback initialization for browser/WASM environments.
     * Uses exported constants from schema.ts which are loaded from the SQL file.
     */
    initDatabaseFallback() {
        try {
            if (VECTOR_METADATA_SCHEMA) {
                this.db.exec(VECTOR_METADATA_SCHEMA);
            }
            if (VECTOR_METADATA_INDEX) {
                this.db.exec(VECTOR_METADATA_INDEX);
            }
            if (VECTOR_EMBEDDINGS_SCHEMA) {
                this.db.exec(VECTOR_EMBEDDINGS_SCHEMA);
            }
            if (this.config.enableHybridSearch && VECTOR_FTS_SCHEMA) {
                this.db.exec(VECTOR_FTS_SCHEMA);
            }
        }
        catch (e) {
            console.error('[VectorStore] Failed to initialize database from schema:', e);
            throw e;
        }
    }
    /**
     * Try to load sqlite-vec extension.
     */
    tryLoadVecExtension() {
        try {
            const anyDb = this.db;
            if (typeof anyDb.prepare === 'function') {
                // If the adapter exposes a loadVecExtension hook (Node or WASM), use it.
                const prepared = anyDb.prepare('SELECT 1');
                if (typeof prepared.loadVecExtension === 'function') {
                    const ok = prepared.loadVecExtension(this.config.dimensions);
                    this.hasVecExtension = ok;
                    return ok;
                }
            }
            // No extension hook available; fallback mode only.
            this.hasVecExtension = false;
            return false;
        }
        catch (e) {
            console.warn(`[VectorStore] Failed to load sqlite-vec extension: ${e}. Using fallback.`);
            this.hasVecExtension = false;
            return false;
        }
    }
    /**
     * Generate embedding using Ollama.
     */
    async embed(text) {
        const response = await fetch(`${this.config.ollamaBaseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.config.embeddingModel,
                prompt: text
            })
        });
        if (!response.ok) {
            throw new Error(`Ollama embedding failed: ${response.statusText}`);
        }
        const data = await response.json();
        return data.embedding;
    }
    /**
     * Index content with its embedding.
     */
    async index(hash, content, metadata, chunk = true) {
        const chunks = chunk ? this.chunkText(content) : [content];
        let indexed = 0;
        for (let i = 0; i < chunks.length; i++) {
            const chunkContent = chunks[i];
            const preview = chunkContent.substring(0, 200);
            try {
                // Generate embedding
                const embedding = await this.embed(chunkContent);
                // Insert metadata (matches Python mcard_vector_metadata schema)
                const insertMeta = this.db.prepare(`
                    INSERT OR REPLACE INTO mcard_vector_metadata 
                    (hash, model_name, dimensions, chunk_index, chunk_total, chunk_text, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                const result = insertMeta.run(hash, this.config.embeddingModel, this.config.dimensions, i, chunks.length, preview, new Date().toISOString());
                const lastId = result.lastInsertRowid;
                if (lastId === undefined) {
                    throw new Error("Vector metadata insert failed: no rowid returned");
                }
                const rowId = BigInt(lastId);
                // Store embedding
                if (this.hasVecExtension) {
                    // Use vec0 virtual table (matches Python mcard_vec)
                    const insertVec = this.db.prepare(`
                        INSERT INTO mcard_vec (metadata_id, embedding)
                        VALUES (?, ?)
                    `);
                    insertVec.run(rowId, serializeVector(embedding));
                }
                else {
                    // Use fallback embeddings table (matches Python mcard_embeddings)
                    const insertEmb = this.db.prepare(`
                        INSERT OR REPLACE INTO mcard_embeddings (metadata_id, embedding)
                        VALUES (?, ?)
                    `);
                    insertEmb.run(rowId, serializeVector(embedding));
                }
                // Update FTS (matches Python mcard_fts)
                if (this.config.enableHybridSearch) {
                    const insertFts = this.db.prepare(`
                        INSERT INTO mcard_fts (hash, content)
                        VALUES (?, ?)
                    `);
                    insertFts.run(hash, chunkContent);
                }
                indexed++;
            }
            catch (e) {
                console.error(`[VectorStore] Failed to index chunk ${i}: ${e}`);
            }
        }
        return indexed;
    }
    /**
     * Search for similar content.
     */
    async search(query, k = 5) {
        const queryEmbedding = await this.embed(query);
        if (this.hasVecExtension) {
            return this.searchWithVec(queryEmbedding, k);
        }
        else {
            return this.searchFallback(queryEmbedding, k);
        }
    }
    /**
     * Search using sqlite-vec KNN.
     */
    searchWithVec(queryEmbedding, k) {
        const stmt = this.db.prepare(`
            SELECT 
                m.hash,
                m.chunk_index,
                m.chunk_text,
                v.distance
            FROM (
                SELECT metadata_id, distance
                FROM mcard_vec
                WHERE embedding MATCH ?
                ORDER BY distance
                LIMIT ${k}
            ) v
            JOIN mcard_vector_metadata m ON v.metadata_id = m.id
            ORDER BY v.distance
        `);
        // Serialize vector and pass as BLOB
        const rows = stmt.all(serializeVector(queryEmbedding));
        return rows.map(row => ({
            hash: row.hash,
            score: 1 - row.distance, // Convert distance to similarity
            content: row.chunk_text || undefined,
            chunkIndex: row.chunk_index
        }));
    }
    /**
     * Fallback brute-force similarity search.
     */
    searchFallback(queryEmbedding, k) {
        const stmt = this.db.prepare(`
            SELECT m.id, m.hash, m.chunk_index, m.chunk_text, e.embedding
            FROM mcard_vector_metadata m
            JOIN mcard_embeddings e ON m.id = e.metadata_id
        `);
        const rows = stmt.all();
        // Calculate similarities
        const scored = rows.map(row => ({
            hash: row.hash,
            chunkIndex: row.chunk_index,
            content: row.chunk_text || undefined,
            score: cosineSimilarity(queryEmbedding, deserializeVector(row.embedding))
        }));
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, k);
    }
    /**
     * Hybrid search combining vector and FTS.
     */
    async hybridSearch(query, k = 5, vectorWeight = 0.7) {
        if (!this.config.enableHybridSearch) {
            return this.search(query, k);
        }
        // Get vector results
        const vectorResults = await this.search(query, k * 2);
        // Get FTS results
        const ftsStmt = this.db.prepare(`
            SELECT hash, rank
            FROM mcard_fts
            WHERE mcard_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        `);
        const ftsRows = ftsStmt.all(query, k * 2);
        // Merge results with weighted scoring
        const merged = new Map();
        for (const result of vectorResults) {
            merged.set(result.hash, {
                ...result,
                score: result.score * vectorWeight
            });
        }
        const ftsWeight = 1 - vectorWeight;
        const maxFtsRank = Math.max(...ftsRows.map(r => Math.abs(r.rank)), 1);
        for (const row of ftsRows) {
            const ftsScore = (1 - Math.abs(row.rank) / maxFtsRank) * ftsWeight;
            const existing = merged.get(row.hash);
            if (existing) {
                existing.score += ftsScore;
            }
            else {
                merged.set(row.hash, {
                    hash: row.hash,
                    score: ftsScore
                });
            }
        }
        // Sort and return top k
        const results = Array.from(merged.values());
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, k);
    }
    /**
     * Split text into overlapping chunks.
     */
    chunkText(text) {
        const { chunkSize, chunkOverlap } = this.config;
        if (text.length <= chunkSize) {
            return [text];
        }
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            chunks.push(text.slice(start, end));
            start += chunkSize - chunkOverlap;
        }
        return chunks;
    }
    /**
     * Get count of indexed vectors.
     */
    count() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM mcard_vector_metadata');
        const row = stmt.get?.();
        return row?.count ?? 0;
    }
    /**
     * Get list of all indexed hashes (distinct)
     */
    async getIndexedHashes() {
        const stmt = this.db.prepare('SELECT DISTINCT hash FROM mcard_vector_metadata');
        const rows = stmt.all();
        return rows.map(r => r.hash);
    }
    /**
     * Count unique indexed cards
     */
    countUnique() {
        const stmt = this.db.prepare('SELECT COUNT(DISTINCT hash) as count FROM mcard_vector_metadata');
        const row = stmt.get();
        return row?.count ?? 0;
    }
    /**
     * Delete vectors for a hash.
     */
    delete(hash) {
        const getIds = this.db.prepare('SELECT id FROM mcard_vector_metadata WHERE hash = ?');
        const ids = getIds.all(hash);
        for (const { id } of ids) {
            if (this.hasVecExtension) {
                this.db.prepare('DELETE FROM mcard_vec WHERE metadata_id = ?').run(id);
            }
            else {
                this.db.prepare('DELETE FROM mcard_embeddings WHERE metadata_id = ?').run(id);
            }
        }
        const deleteMeta = this.db.prepare('DELETE FROM mcard_vector_metadata WHERE hash = ?');
        const result = deleteMeta.run(hash);
        if (this.config.enableHybridSearch) {
            this.db.prepare('DELETE FROM mcard_fts WHERE hash = ?').run(hash);
        }
        return result.changes ?? 0;
    }
    /**
     * Clear all vectors.
     */
    clear() {
        if (this.hasVecExtension) {
            this.db.exec('DELETE FROM mcard_vec');
        }
        else {
            this.db.exec('DELETE FROM mcard_embeddings');
        }
        this.db.exec('DELETE FROM mcard_vector_metadata');
        if (this.config.enableHybridSearch) {
            this.db.exec('DELETE FROM mcard_fts');
        }
    }
    /**
     * Check if sqlite-vec extension is available.
     */
    hasVectorExtension() {
        return this.hasVecExtension;
    }
    /**
     * Get information about the vector store.
     */
    getInfo() {
        const count = this.count();
        return {
            vectorCount: count,
            embeddingModel: this.config.embeddingModel,
            dimensions: this.config.dimensions,
            hasVecExtension: this.hasVecExtension,
            enableHybridSearch: this.config.enableHybridSearch,
        };
    }
    /**
     * Close the database connection.
     */
    close() {
        // VectorDb interface does not require close; for better-sqlite3 this is
        // handled by the adapter's underlying instance lifecycle.
        const anyDb = this.db;
        if (typeof anyDb.close === 'function') {
            anyDb.close();
        }
    }
}
/**
 * Adapter for sql.js / SQLite WASM so VectorStore can run in the browser.
 *
 * NOTE: Parameter binding and stepping are left as a TODO because the exact
 * sql.js API usage (bind/step/getAsObject) depends on how you want to map
 * VectorDb semantics to sql.js. For now, this adapter is scaffolding that
 * shows where to integrate sql.js.
 */
export class SqlJsVectorAdapter {
    db;
    constructor(db) {
        this.db = db;
    }
    exec(sql) {
        this.db.run(sql);
    }
    prepare(_sql) {
        // TODO: Implement proper sql.js Statement handling here, including:
        //   - stmt = this.db.prepare(sql)
        //   - stmt.bind(params)
        //   - stmt.step()/getAsObject() loops for all()/get()
        //   - stmt.free() when done
        // For now, this is a stub so the TypeScript wiring compiles; you
        // should replace this with a real implementation once you decide on
        // the exact sql.js usage pattern.
        return {
            run: (..._params) => ({}),
            all: (..._params) => [],
            get: (..._params) => undefined,
            loadVecExtension: (_dimensions) => {
                // TODO: Load sqlite-vec WASM extension for sql.js here.
                // This will depend on which build of sqlite-vec WASM you use
                // (Alex Garcia's official builds, CR-SQLite integration, etc.).
                // For now, return false so the VectorStore stays in fallback mode.
                return false;
            },
        };
    }
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
export function createWasmVectorStore(wasmDb, config) {
    const adapter = new SqlJsVectorAdapter(wasmDb);
    return new MCardVectorStore(adapter, config);
}
//# sourceMappingURL=VectorStore.js.map