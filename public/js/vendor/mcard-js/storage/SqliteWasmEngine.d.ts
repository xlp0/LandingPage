/**
 * SqliteWasmEngine - SQLite WASM backend using sql.js
 *
 * Provides full SQL support with FTS5 and same schema as Python implementation.
 * Persistence via IndexedDB or OPFS.
 */
import { MCard } from '../model/MCard';
import { StorageEngine, Page } from './StorageAdapter';
export type SqlJsDatabase = {
    run: (sql: string, params?: unknown[]) => void;
    exec: (sql: string) => {
        columns: string[];
        values: unknown[][];
    }[];
    prepare: (sql: string) => unknown;
    export: () => Uint8Array;
};
/**
 * SqliteWasmEngine - Full SQL support via sql.js
 */
export declare class SqliteWasmEngine implements StorageEngine {
    private db;
    private SQL;
    /**
     * Initialize the database
     * @param wasmUrl URL to sql-wasm.wasm file (optional, defaults to CDN)
     * @param existingData Optional existing database as Uint8Array
     */
    init(wasmUrl?: string, existingData?: Uint8Array): Promise<void>;
    private ensureDb;
    /**
     * Export database as Uint8Array (for persistence)
     */
    export(): Uint8Array;
    /**
     * Get raw sql.js Database for use with VectorStore adapter.
     *
     * Example:
     *   const vecStore = createWasmVectorStore(engine.getRawDb());
     */
    getRawDb(): SqlJsDatabase;
    add(card: MCard): Promise<string>;
    get(hash: string): Promise<MCard | null>;
    delete(hash: string): Promise<void>;
    getPage(pageNumber: number, pageSize: number): Promise<Page<MCard>>;
    count(): Promise<number>;
    searchByHash(hashPrefix: string): Promise<MCard[]>;
    search(query: string, pageNumber: number, pageSize: number): Promise<Page<MCard>>;
    getAll(): Promise<MCard[]>;
    clear(): Promise<void>;
    registerHandle(handle: string, hash: string): Promise<void>;
    resolveHandle(handle: string): Promise<string | null>;
    getByHandle(handle: string): Promise<MCard | null>;
    updateHandle(handle: string, newHash: string): Promise<string>;
    getHandleHistory(handle: string): Promise<{
        previousHash: string;
        changedAt: string;
    }[]>;
}
//# sourceMappingURL=SqliteWasmEngine.d.ts.map