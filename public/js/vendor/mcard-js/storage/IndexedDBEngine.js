import { openDB } from 'idb';
import { MCard } from '../model/MCard';
import { validateHandle } from '../model/Handle';
/**
 * IndexedDBEngine - Browser storage using IndexedDB
 */
export class IndexedDBEngine {
    db = null;
    dbName;
    constructor(dbName = 'mcard-db') {
        this.dbName = dbName;
    }
    /**
     * Initialize the database connection
     */
    async init() {
        this.db = await openDB(this.dbName, 1, {
            upgrade(db) {
                // Cards store
                if (!db.objectStoreNames.contains('cards')) {
                    db.createObjectStore('cards', { keyPath: 'hash' });
                }
                // Handles store
                if (!db.objectStoreNames.contains('handles')) {
                    const handleStore = db.createObjectStore('handles', { keyPath: 'handle' });
                    handleStore.createIndex('by-hash', 'currentHash');
                }
                // Handle history store
                if (!db.objectStoreNames.contains('handleHistory')) {
                    const historyStore = db.createObjectStore('handleHistory', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    historyStore.createIndex('by-handle', 'handle');
                }
            }
        });
    }
    ensureDb() {
        if (!this.db) {
            throw new Error('Database not initialized. Call init() first.');
        }
        return this.db;
    }
    // =========== Card Operations ===========
    async add(card) {
        const db = this.ensureDb();
        await db.put('cards', {
            hash: card.hash,
            content: card.content,
            g_time: card.g_time
        });
        return card.hash;
    }
    async get(hash) {
        const db = this.ensureDb();
        const record = await db.get('cards', hash);
        if (!record)
            return null;
        return MCard.fromData(record.content, record.hash, record.g_time);
    }
    async delete(hash) {
        const db = this.ensureDb();
        await db.delete('cards', hash);
    }
    async getPage(pageNumber, pageSize) {
        const db = this.ensureDb();
        const totalItems = await db.count('cards');
        const totalPages = Math.ceil(totalItems / pageSize);
        const allCards = await db.getAll('cards');
        const start = (pageNumber - 1) * pageSize;
        const pageRecords = allCards.slice(start, start + pageSize);
        const items = pageRecords.map(r => MCard.fromData(r.content, r.hash, r.g_time));
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
        const db = this.ensureDb();
        return db.count('cards');
    }
    async searchByHash(hashPrefix) {
        const db = this.ensureDb();
        const start = hashPrefix;
        const end = hashPrefix + '\uffff';
        const range = IDBKeyRange.bound(start, end);
        const records = await db.getAll('cards', range);
        return records.map(r => MCard.fromData(r.content, r.hash, r.g_time));
    }
    async search(query, pageNumber, pageSize) {
        const db = this.ensureDb();
        // Naive implementation: load all and filter
        // Optimized implementation would use a full-text index if available
        const records = await db.getAll('cards');
        const decoder = new TextDecoder();
        const filtered = records.filter(r => {
            // Try to match query in content if it looks like text
            try {
                const text = decoder.decode(r.content);
                return text.includes(query);
            }
            catch {
                return false;
            }
        });
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const start = (pageNumber - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize)
            .map(r => MCard.fromData(r.content, r.hash, r.g_time));
        return {
            items: pageItems,
            totalItems,
            pageNumber,
            pageSize,
            totalPages,
            hasNext: pageNumber < totalPages,
            hasPrevious: pageNumber > 1
        };
    }
    async getAll() {
        const db = this.ensureDb();
        const records = await db.getAll('cards');
        return records.map(r => MCard.fromData(r.content, r.hash, r.g_time));
    }
    async clear() {
        const db = this.ensureDb();
        await db.clear('cards');
        await db.clear('handles');
        await db.clear('handleHistory');
    }
    // =========== Handle Operations ===========
    async registerHandle(handle, hash) {
        const db = this.ensureDb();
        const normalized = validateHandle(handle);
        const existing = await db.get('handles', normalized);
        if (existing) {
            throw new Error(`Handle '${handle}' already exists.`);
        }
        const now = new Date().toISOString();
        await db.put('handles', {
            handle: normalized,
            currentHash: hash,
            createdAt: now,
            updatedAt: now
        });
    }
    async resolveHandle(handle) {
        const db = this.ensureDb();
        const normalized = validateHandle(handle);
        const record = await db.get('handles', normalized);
        return record?.currentHash ?? null;
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
        const existing = await db.get('handles', normalized);
        if (!existing) {
            throw new Error(`Handle '${handle}' not found.`);
        }
        const previousHash = existing.currentHash;
        const now = new Date().toISOString();
        // Record history
        await db.add('handleHistory', {
            handle: normalized,
            previousHash,
            changedAt: now
        });
        // Update handle
        await db.put('handles', {
            ...existing,
            currentHash: newHash,
            updatedAt: now
        });
        return previousHash;
    }
    async getHandleHistory(handle) {
        const db = this.ensureDb();
        const normalized = validateHandle(handle);
        const records = await db.getAllFromIndex('handleHistory', 'by-handle', normalized);
        return records
            .map(r => ({ previousHash: r.previousHash, changedAt: r.changedAt }))
            .reverse(); // Newest first
    }
}
//# sourceMappingURL=IndexedDBEngine.js.map