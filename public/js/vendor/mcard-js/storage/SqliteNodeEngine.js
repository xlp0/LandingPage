/**
 * SqliteNodeEngine - Native SQLite backend for Node.js using better-sqlite3
 *
 * Provides synchronous SQLite operations with the same schema as Python implementation.
 * Supports both file-based and in-memory databases.
 */
import { MCard } from '../model/MCard';
import { validateHandle } from '../model/Handle';
import { initCoreSchemas } from './schema';
import { createRequire } from 'module';
const DEFAULT_PAGE_SIZE = 10;
/**
 * SqliteNodeEngine - Native SQLite for Node.js
 *
 * Uses better-sqlite3 for synchronous, high-performance SQLite operations.
 */
export class SqliteNodeEngine {
    db;
    dbPath;
    /**
     * Create a new SqliteNodeEngine
     * @param dbPath Path to database file, or ':memory:' for in-memory database
     */
    constructor(dbPath = ':memory:') {
        this.dbPath = dbPath;
        // Dynamic require to avoid bundling issues
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const require = createRequire(import.meta.url);
        const Database = require('better-sqlite3');
        this.db = new Database(dbPath);
        this.setupDatabase();
    }
    /**
     * Initialize database schema
     */
    setupDatabase() {
        initCoreSchemas(this.db);
    }
    /**
     * Close the database connection
     */
    close() {
        this.db.close();
    }
    /**
     * Get the database path
     */
    getDbPath() {
        return this.dbPath;
    }
    // =========== Card Operations ===========
    async add(card) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO card (hash, content, g_time) VALUES (?, ?, ?)');
        stmt.run(card.hash, Buffer.from(card.content), card.g_time);
        return card.hash;
    }
    /**
     * Add a card synchronously (for performance-critical paths)
     */
    addSync(card) {
        const stmt = this.db.prepare('INSERT OR REPLACE INTO card (hash, content, g_time) VALUES (?, ?, ?)');
        stmt.run(card.hash, Buffer.from(card.content), card.g_time);
        return card.hash;
    }
    async get(hash) {
        return this.getSync(hash);
    }
    /**
     * Get a card synchronously
     */
    getSync(hash) {
        const stmt = this.db.prepare('SELECT hash, content, g_time FROM card WHERE hash = ?');
        const row = stmt.get(hash);
        if (!row)
            return null;
        const content = row.content instanceof Buffer
            ? new Uint8Array(row.content)
            : new Uint8Array(row.content);
        return MCard.fromData(content, row.hash, row.g_time);
    }
    async delete(hash) {
        this.deleteSync(hash);
    }
    /**
     * Delete a card synchronously
     */
    deleteSync(hash) {
        const stmt = this.db.prepare('DELETE FROM card WHERE hash = ?');
        const result = stmt.run(hash);
        return result.changes > 0;
    }
    async getPage(pageNumber = 1, pageSize = DEFAULT_PAGE_SIZE) {
        return this.getPageSync(pageNumber, pageSize);
    }
    /**
     * Get a page of cards synchronously
     */
    getPageSync(pageNumber = 1, pageSize = DEFAULT_PAGE_SIZE) {
        if (pageNumber < 1)
            throw new Error('Page number must be >= 1');
        if (pageSize < 1)
            throw new Error('Page size must be >= 1');
        const totalItems = this.countSync();
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const offset = (pageNumber - 1) * pageSize;
        const stmt = this.db.prepare('SELECT hash, content, g_time FROM card ORDER BY g_time DESC LIMIT ? OFFSET ?');
        const rows = stmt.all(pageSize, offset);
        const items = rows.map(row => {
            const content = row.content instanceof Buffer
                ? new Uint8Array(row.content)
                : new Uint8Array(row.content);
            return MCard.fromData(content, row.hash, row.g_time);
        });
        return {
            items,
            totalItems,
            pageNumber,
            pageSize,
            totalPages,
            hasNext: offset + items.length < totalItems,
            hasPrevious: pageNumber > 1
        };
    }
    async count() {
        return this.countSync();
    }
    /**
     * Count cards synchronously
     */
    countSync() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM card');
        const row = stmt.get();
        return row.count;
    }
    async searchByHash(hashPrefix) {
        const rows = this.db.prepare('SELECT hash, content, g_time FROM card WHERE hash LIKE ?').all(`${hashPrefix}%`);
        return rows.map((row) => MCard.fromData(new Uint8Array(row.content), row.hash, row.g_time));
    }
    async search(query, pageNumber, pageSize) {
        const offset = (pageNumber - 1) * pageSize;
        const searchPattern = `%${query}%`;
        const countResult = this.db.prepare('SELECT COUNT(*) as count FROM card WHERE CAST(content AS TEXT) LIKE ?').get(searchPattern);
        const totalItems = countResult.count;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        const rows = this.db.prepare('SELECT hash, content, g_time FROM card WHERE CAST(content AS TEXT) LIKE ? LIMIT ? OFFSET ?')
            .all(searchPattern, pageSize, offset);
        const items = rows.map((row) => MCard.fromData(new Uint8Array(row.content), row.hash, row.g_time));
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
        const rows = this.db.prepare('SELECT hash, content, g_time FROM card').all();
        return rows.map((row) => MCard.fromData(new Uint8Array(row.content), row.hash, row.g_time));
    }
    async clear() {
        this.clearSync();
    }
    /**
     * Clear all data synchronously
     * Delete in FK-safe order: children first, then parents
     */
    clearSync() {
        this.db.exec('DELETE FROM handle_history');
        this.db.exec('DELETE FROM handle_registry');
        this.db.exec('DELETE FROM card');
    }
    // =========== Search Operations ===========
    /**
     * Search cards by string in content, hash, or g_time
     */
    searchByString(searchString, pageNumber = 1, pageSize = DEFAULT_PAGE_SIZE) {
        if (pageNumber < 1)
            throw new Error('Page number must be >= 1');
        if (pageSize < 1)
            throw new Error('Page size must be >= 1');
        const pattern = `%${searchString}%`;
        const offset = (pageNumber - 1) * pageSize;
        // Count matching items
        const countStmt = this.db.prepare(`
            SELECT COUNT(*) as count FROM card 
            WHERE hash LIKE ? OR g_time LIKE ? OR CAST(content AS TEXT) LIKE ?
        `);
        const countRow = countStmt.get(pattern, pattern, pattern);
        const totalItems = countRow.count;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        // Get items
        const stmt = this.db.prepare(`
            SELECT hash, content, g_time FROM card 
            WHERE hash LIKE ? OR g_time LIKE ? OR CAST(content AS TEXT) LIKE ?
            ORDER BY g_time DESC LIMIT ? OFFSET ?
        `);
        const rows = stmt.all(pattern, pattern, pattern, pageSize, offset);
        const items = rows.map(row => {
            const content = row.content instanceof Buffer
                ? new Uint8Array(row.content)
                : new Uint8Array(row.content);
            return MCard.fromData(content, row.hash, row.g_time);
        });
        return {
            items,
            totalItems,
            pageNumber,
            pageSize,
            totalPages,
            hasNext: offset + items.length < totalItems,
            hasPrevious: pageNumber > 1
        };
    }
    /**
     * Search cards by content pattern (binary-safe)
     */
    searchByContent(searchPattern, pageNumber = 1, pageSize = DEFAULT_PAGE_SIZE) {
        if (pageNumber < 1)
            throw new Error('Page number must be >= 1');
        if (pageSize < 1)
            throw new Error('Page size must be >= 1');
        if (!searchPattern || (typeof searchPattern === 'string' && searchPattern.length === 0)) {
            throw new Error('Search pattern cannot be empty');
        }
        const searchBytes = typeof searchPattern === 'string'
            ? Buffer.from(searchPattern, 'utf-8')
            : Buffer.from(searchPattern);
        const offset = (pageNumber - 1) * pageSize;
        // Count matching items using INSTR for binary search
        const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM card WHERE INSTR(content, ?) > 0');
        const countRow = countStmt.get(searchBytes);
        const totalItems = countRow.count;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;
        // Get items
        const stmt = this.db.prepare(`
            SELECT hash, content, g_time FROM card 
            WHERE INSTR(content, ?) > 0
            ORDER BY g_time DESC LIMIT ? OFFSET ?
        `);
        const rows = stmt.all(searchBytes, pageSize, offset);
        const items = rows.map(row => {
            const content = row.content instanceof Buffer
                ? new Uint8Array(row.content)
                : new Uint8Array(row.content);
            return MCard.fromData(content, row.hash, row.g_time);
        });
        return {
            items,
            totalItems,
            pageNumber,
            pageSize,
            totalPages,
            hasNext: offset + items.length < totalItems,
            hasPrevious: pageNumber > 1
        };
    }
    /**
     * Get all cards (single page with all items)
     */
    getAllCards() {
        const stmt = this.db.prepare('SELECT hash, content, g_time FROM card ORDER BY g_time DESC');
        const rows = stmt.all();
        const items = rows.map(row => {
            const content = row.content instanceof Buffer
                ? new Uint8Array(row.content)
                : new Uint8Array(row.content);
            return MCard.fromData(content, row.hash, row.g_time);
        });
        return {
            items,
            totalItems: items.length,
            pageNumber: 1,
            pageSize: items.length || 1,
            totalPages: 1,
            hasNext: false,
            hasPrevious: false
        };
    }
    // =========== Handle Operations ===========
    async registerHandle(handle, hash) {
        this.registerHandleSync(handle, hash);
    }
    /**
     * Register a handle synchronously
     */
    registerHandleSync(handle, hash) {
        const normalized = validateHandle(handle);
        const now = new Date().toISOString();
        // Check if handle already exists
        const checkStmt = this.db.prepare('SELECT handle FROM handle_registry WHERE handle = ?');
        const existing = checkStmt.get(normalized);
        if (existing) {
            throw new Error(`Handle '${handle}' already exists.`);
        }
        const stmt = this.db.prepare('INSERT INTO handle_registry (handle, current_hash, created_at, updated_at) VALUES (?, ?, ?, ?)');
        stmt.run(normalized, hash, now, now);
    }
    async resolveHandle(handle) {
        return this.resolveHandleSync(handle);
    }
    /**
     * Resolve a handle synchronously
     */
    resolveHandleSync(handle) {
        const normalized = validateHandle(handle);
        const stmt = this.db.prepare('SELECT current_hash FROM handle_registry WHERE handle = ?');
        const row = stmt.get(normalized);
        return row?.current_hash || null;
    }
    async getByHandle(handle) {
        return this.getByHandleSync(handle);
    }
    /**
     * Get card by handle synchronously
     */
    getByHandleSync(handle) {
        const hash = this.resolveHandleSync(handle);
        if (!hash)
            return null;
        return this.getSync(hash);
    }
    async updateHandle(handle, newHash) {
        return this.updateHandleSync(handle, newHash);
    }
    /**
     * Update a handle synchronously
     */
    updateHandleSync(handle, newHash) {
        const normalized = validateHandle(handle);
        const now = new Date().toISOString();
        // Get current hash
        const getStmt = this.db.prepare('SELECT current_hash FROM handle_registry WHERE handle = ?');
        const row = getStmt.get(normalized);
        if (!row) {
            throw new Error(`Handle '${handle}' not found.`);
        }
        const previousHash = row.current_hash;
        // Record history
        const historyStmt = this.db.prepare('INSERT INTO handle_history (handle, previous_hash, changed_at) VALUES (?, ?, ?)');
        historyStmt.run(normalized, previousHash, now);
        // Update handle
        const updateStmt = this.db.prepare('UPDATE handle_registry SET current_hash = ?, updated_at = ? WHERE handle = ?');
        updateStmt.run(newHash, now, normalized);
        return previousHash;
    }
    async getHandleHistory(handle) {
        return this.getHandleHistorySync(handle);
    }
    /**
     * Get handle history synchronously
     */
    getHandleHistorySync(handle) {
        const normalized = validateHandle(handle);
        const stmt = this.db.prepare('SELECT previous_hash, changed_at FROM handle_history WHERE handle = ? ORDER BY id DESC');
        const rows = stmt.all(normalized);
        return rows.map(row => ({
            previousHash: row.previous_hash,
            changedAt: row.changed_at
        }));
    }
    async pruneHandleHistory(handle, options = {}) {
        return this.pruneHandleHistorySync(handle, options);
    }
    /**
     * Prune handle history synchronously
     */
    pruneHandleHistorySync(handle, options = {}) {
        const normalized = validateHandle(handle);
        let stmt;
        if (options.deleteAll) {
            stmt = this.db.prepare('DELETE FROM handle_history WHERE handle = ?');
            const result = stmt.run(normalized);
            return result.changes;
        }
        else if (options.olderThan) {
            stmt = this.db.prepare('DELETE FROM handle_history WHERE handle = ? AND changed_at < ?');
            const result = stmt.run(normalized, options.olderThan);
            return result.changes;
        }
        return 0;
    }
}
//# sourceMappingURL=SqliteNodeEngine.js.map