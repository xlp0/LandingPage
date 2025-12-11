import { MCard } from '../model/MCard';
import { StorageEngine, Page } from './StorageAdapter';
/**
 * IndexedDBEngine - Browser storage using IndexedDB
 */
export declare class IndexedDBEngine implements StorageEngine {
    private db;
    private dbName;
    constructor(dbName?: string);
    /**
     * Initialize the database connection
     */
    init(): Promise<void>;
    private ensureDb;
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
//# sourceMappingURL=IndexedDBEngine.d.ts.map