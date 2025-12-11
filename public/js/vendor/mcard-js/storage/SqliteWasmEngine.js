/**
 * SqliteWasmEngine - SQLite WASM backend using sql.js
 *
 * Provides full SQL support with FTS5 and same schema as Python implementation.
 * Persistence via IndexedDB or OPFS.
 */
import { MCard } from '../model/MCard';
import { validateHandle } from '../model/Handle';
import { CORE_SCHEMAS } from './schema';
/**
 * SqliteWasmEngine - Full SQL support via sql.js
 */
export class SqliteWasmEngine {
    db = null;
    SQL = null;
    /**
     * Initialize the database
     * @param wasmUrl URL to sql-wasm.wasm file (optional, defaults to CDN)
     * @param existingData Optional existing database as Uint8Array
     */
    async init(wasmUrl, existingData) {
        // Dynamically import sql.js
        const initSqlJs = (await import('sql.js')).default;
        const SQL = await initSqlJs({
            locateFile: (file) => wasmUrl || `https://sql.js.org/dist/${file}`
        });
        this.SQL = SQL;
        this.db = existingData
            ? new SQL.Database(existingData)
            : new SQL.Database();
        // Create tables using shared schema definitions
        this.db.run(CORE_SCHEMAS.card);
        this.db.run(CORE_SCHEMAS.handleRegistry);
        this.db.run(CORE_SCHEMAS.handleHistory);
        this.db.run(CORE_SCHEMAS.handleIndex);
    }
    ensureDb() {
        if (!this.db)
            throw new Error('Database not initialized. Call init() first.');
        return this.db;
    }
    /**
     * Export database as Uint8Array (for persistence)
     */
    export() {
        return this.ensureDb().export();
    }
    /**
     * Get raw sql.js Database for use with VectorStore adapter.
     *
     * Example:
     *   const vecStore = createWasmVectorStore(engine.getRawDb());
     */
    getRawDb() {
        return this.ensureDb();
    }
    // =========== Card Operations ===========
    async add(card) {
        const db = this.ensureDb();
        db.run('INSERT OR REPLACE INTO card (hash, content, g_time) VALUES (?, ?, ?)', [card.hash, card.content, card.g_time]);
        return card.hash;
    }
    async get(hash) {
        const db = this.ensureDb();
        const result = db.exec(`SELECT hash, content, g_time FROM card WHERE hash = '${hash}'`);
        if (result.length === 0 || result[0].values.length === 0)
            return null;
        const [h, content, g_time] = result[0].values[0];
        return MCard.fromData(new Uint8Array(content), h, g_time);
    }
    async delete(hash) {
        this.ensureDb().run('DELETE FROM card WHERE hash = ?', [hash]);
    }
    async getPage(pageNumber, pageSize) {
        const db = this.ensureDb();
        const totalItems = await this.count();
        const totalPages = Math.ceil(totalItems / pageSize);
        const offset = (pageNumber - 1) * pageSize;
        const result = db.exec(`SELECT hash, content, g_time FROM card LIMIT ${pageSize} OFFSET ${offset}`);
        const items = (result[0]?.values || []).map(([h, content, g_time]) => MCard.fromData(new Uint8Array(content), h, g_time));
        return {
            items,
            totalItems,
            pageNumber,
            pageSize,
            totalPages,
            hasNext: pageNumber < totalPages,
            hasPrevious: pageNumber > 1
        };
    }
    async count() {
        const result = this.ensureDb().exec('SELECT COUNT(*) FROM card');
        return result[0]?.values[0]?.[0] || 0;
    }
    async searchByHash(hashPrefix) {
        const db = this.ensureDb();
        const stmt = db.prepare('SELECT hash, content, g_time FROM card WHERE hash LIKE ?');
        stmt.bind([`${hashPrefix}%`]);
        const items = [];
        while (stmt.step()) {
            const row = stmt.get();
            items.push(MCard.fromData(new Uint8Array(row[1]), row[0], row[2]));
        }
        stmt.free();
        return items;
    }
    async search(query, pageNumber, pageSize) {
        const db = this.ensureDb();
        const offset = (pageNumber - 1) * pageSize;
        const pattern = `%${query}%`;
        // Count
        let stmt = db.prepare('SELECT COUNT(*) FROM card WHERE CAST(content AS TEXT) LIKE ?');
        stmt.bind([pattern]);
        stmt.step();
        const totalItems = stmt.get()[0];
        stmt.free();
        const totalPages = Math.ceil(totalItems / pageSize);
        // Query
        stmt = db.prepare('SELECT hash, content, g_time FROM card WHERE CAST(content AS TEXT) LIKE ? LIMIT ? OFFSET ?');
        stmt.bind([pattern, pageSize, offset]);
        const items = [];
        while (stmt.step()) {
            const row = stmt.get();
            items.push(MCard.fromData(new Uint8Array(row[1]), row[0], row[2]));
        }
        stmt.free();
        return {
            items,
            totalItems,
            pageNumber,
            pageSize,
            totalPages,
            hasNext: pageNumber < totalPages,
            hasPrevious: pageNumber > 1
        };
    }
    async getAll() {
        const result = this.ensureDb().exec('SELECT hash, content, g_time FROM card');
        return (result[0]?.values || []).map(([h, content, g_time]) => MCard.fromData(new Uint8Array(content), h, g_time));
    }
    async clear() {
        const db = this.ensureDb();
        db.run('DELETE FROM card');
        db.run('DELETE FROM handle_registry');
        db.run('DELETE FROM handle_history');
    }
    // =========== Handle Operations ===========
    async registerHandle(handle, hash) {
        const db = this.ensureDb();
        const normalized = validateHandle(handle);
        const existing = db.exec(`SELECT handle FROM handle_registry WHERE handle = '${normalized}'`);
        if (existing.length > 0 && existing[0].values.length > 0) {
            throw new Error(`Handle '${handle}' already exists.`);
        }
        const now = new Date().toISOString();
        db.run('INSERT INTO handle_registry (handle, current_hash, created_at, updated_at) VALUES (?, ?, ?, ?)', [normalized, hash, now, now]);
    }
    async resolveHandle(handle) {
        const normalized = validateHandle(handle);
        const result = this.ensureDb().exec(`SELECT current_hash FROM handle_registry WHERE handle = '${normalized}'`);
        return result[0]?.values[0]?.[0] || null;
    }
    async getByHandle(handle) {
        const hash = await this.resolveHandle(handle);
        if (!hash)
            return null;
        return this.get(hash);
    }
    async updateHandle(handle, newHash) {
        const db = this.ensureDb();
        const normalized = validateHandle(handle);
        const existing = db.exec(`SELECT current_hash FROM handle_registry WHERE handle = '${normalized}'`);
        if (existing.length === 0 || existing[0].values.length === 0) {
            throw new Error(`Handle '${handle}' not found.`);
        }
        const previousHash = existing[0].values[0][0];
        const now = new Date().toISOString();
        // Record history
        db.run('INSERT INTO handle_history (handle, previous_hash, changed_at) VALUES (?, ?, ?)', [normalized, previousHash, now]);
        // Update handle
        db.run('UPDATE handle_registry SET current_hash = ?, updated_at = ? WHERE handle = ?', [newHash, now, normalized]);
        return previousHash;
    }
    async getHandleHistory(handle) {
        const normalized = validateHandle(handle);
        const result = this.ensureDb().exec(`SELECT previous_hash, changed_at FROM handle_history WHERE handle = '${normalized}' ORDER BY id DESC`);
        return (result[0]?.values || []).map(([previousHash, changedAt]) => ({
            previousHash: previousHash,
            changedAt: changedAt
        }));
    }
}
//# sourceMappingURL=SqliteWasmEngine.js.map