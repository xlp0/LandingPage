import { MCard } from '../model/MCard';
/**
 * Page - Pagination container for query results
 */
export interface Page<T> {
    items: T[];
    totalItems: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}
/**
 * StorageEngine - Abstract interface for storage backends
 *
 * Implementations: IndexedDBEngine, SqliteWasmEngine
 */
export interface StorageEngine {
    add(card: MCard): Promise<string>;
    get(hash: string): Promise<MCard | null>;
    delete(hash: string): Promise<void>;
    searchByHash(hashPrefix: string): Promise<MCard[]>;
    getPage(pageNumber: number, pageSize: number): Promise<Page<MCard>>;
    search(query: string, pageNumber: number, pageSize: number): Promise<Page<MCard>>;
    getAll(): Promise<MCard[]>;
    count(): Promise<number>;
    clear(): Promise<void>;
    registerHandle(handle: string, hash: string): Promise<void>;
    resolveHandle(handle: string): Promise<string | null>;
    getByHandle(handle: string): Promise<MCard | null>;
    updateHandle(handle: string, newHash: string): Promise<string>;
    getHandleHistory(handle: string): Promise<{
        previousHash: string;
        changedAt: string;
    }[]>;
    pruneHandleHistory?(handle: string, options: {
        olderThan?: string;
        deleteAll?: boolean;
    }): Promise<number>;
}
//# sourceMappingURL=StorageAdapter.d.ts.map