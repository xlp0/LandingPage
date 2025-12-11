/**
 * SqliteNodeEngine - Native SQLite backend for Node.js using better-sqlite3
 *
 * Provides synchronous SQLite operations with the same schema as Python implementation.
 * Supports both file-based and in-memory databases.
 */
import { MCard } from '../model/MCard';
import { StorageEngine, Page } from './StorageAdapter';
/**
 * SqliteNodeEngine - Native SQLite for Node.js
 *
 * Uses better-sqlite3 for synchronous, high-performance SQLite operations.
 */
export declare class SqliteNodeEngine implements StorageEngine {
    private db;
    private dbPath;
    /**
     * Create a new SqliteNodeEngine
     * @param dbPath Path to database file, or ':memory:' for in-memory database
     */
    constructor(dbPath?: string);
    /**
     * Initialize database schema
     */
    private setupDatabase;
    /**
     * Close the database connection
     */
    close(): void;
    /**
     * Get the database path
     */
    getDbPath(): string;
    add(card: MCard): Promise<string>;
    /**
     * Add a card synchronously (for performance-critical paths)
     */
    addSync(card: MCard): string;
    get(hash: string): Promise<MCard | null>;
    /**
     * Get a card synchronously
     */
    getSync(hash: string): MCard | null;
    delete(hash: string): Promise<void>;
    /**
     * Delete a card synchronously
     */
    deleteSync(hash: string): boolean;
    getPage(pageNumber?: number, pageSize?: number): Promise<Page<MCard>>;
    /**
     * Get a page of cards synchronously
     */
    getPageSync(pageNumber?: number, pageSize?: number): Page<MCard>;
    count(): Promise<number>;
    /**
     * Count cards synchronously
     */
    countSync(): number;
    searchByHash(hashPrefix: string): Promise<MCard[]>;
    search(query: string, pageNumber: number, pageSize: number): Promise<Page<MCard>>;
    getAll(): Promise<MCard[]>;
    clear(): Promise<void>;
    /**
     * Clear all data synchronously
     * Delete in FK-safe order: children first, then parents
     */
    clearSync(): void;
    /**
     * Search cards by string in content, hash, or g_time
     */
    searchByString(searchString: string, pageNumber?: number, pageSize?: number): Page<MCard>;
    /**
     * Search cards by content pattern (binary-safe)
     */
    searchByContent(searchPattern: string | Uint8Array, pageNumber?: number, pageSize?: number): Page<MCard>;
    /**
     * Get all cards (single page with all items)
     */
    getAllCards(): Page<MCard>;
    registerHandle(handle: string, hash: string): Promise<void>;
    /**
     * Register a handle synchronously
     */
    registerHandleSync(handle: string, hash: string): void;
    resolveHandle(handle: string): Promise<string | null>;
    /**
     * Resolve a handle synchronously
     */
    resolveHandleSync(handle: string): string | null;
    getByHandle(handle: string): Promise<MCard | null>;
    /**
     * Get card by handle synchronously
     */
    getByHandleSync(handle: string): MCard | null;
    updateHandle(handle: string, newHash: string): Promise<string>;
    /**
     * Update a handle synchronously
     */
    updateHandleSync(handle: string, newHash: string): string;
    getHandleHistory(handle: string): Promise<{
        previousHash: string;
        changedAt: string;
    }[]>;
    /**
     * Get handle history synchronously
     */
    getHandleHistorySync(handle: string): {
        previousHash: string;
        changedAt: string;
    }[];
    pruneHandleHistory(handle: string, options?: {
        olderThan?: string;
        deleteAll?: boolean;
    }): Promise<number>;
    /**
     * Prune handle history synchronously
     */
    pruneHandleHistorySync(handle: string, options?: {
        olderThan?: string;
        deleteAll?: boolean;
    }): number;
}
//# sourceMappingURL=SqliteNodeEngine.d.ts.map