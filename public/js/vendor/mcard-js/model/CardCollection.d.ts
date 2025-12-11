import { MCard } from './MCard';
import { StorageEngine, Page } from '../storage/StorageAdapter';
import { Maybe } from '../monads/Maybe';
/**
 * CardCollection - High-level interface for MCard operations with monadic API
 */
export declare class CardCollection {
    private engine;
    constructor(engine: StorageEngine);
    /**
     * Add a card to the collection
     * Handles duplicates (same content, same hash) and collisions (diff content, same hash)
     */
    add(card: MCard): Promise<string>;
    private areContentsEqual;
    /**
     * Get a card by hash
     */
    get(hash: string): Promise<MCard | null>;
    /**
     * Delete a card by hash
     */
    delete(hash: string): Promise<void>;
    /**
     * Get a page of cards
     */
    getPage(pageNumber?: number, pageSize?: number): Promise<Page<MCard>>;
    /**
     * Count total cards
     */
    count(): Promise<number>;
    /**
     * Add a card and register a handle for it
     */
    addWithHandle(card: MCard, handle: string): Promise<string>;
    /**
     * Get card by handle
     */
    getByHandle(handle: string): Promise<MCard | null>;
    /**
     * Resolve handle to hash
     */
    resolveHandle(handle: string): Promise<string | null>;
    /**
     * Update handle to point to new card
     */
    updateHandle(handle: string, newCard: MCard): Promise<string>;
    /**
     * Get version history for a handle
     */
    getHandleHistory(handle: string): Promise<{
        previousHash: string;
        changedAt: string;
    }[]>;
    /**
     * Monadic get - returns Maybe<MCard>
     */
    getM(hash: string): Promise<Maybe<MCard>>;
    /**
     * Monadic getByHandle - returns Maybe<MCard>
     */
    getByHandleM(handle: string): Promise<Maybe<MCard>>;
    /**
     * Monadic resolveHandle - returns Maybe<string>
     */
    resolveHandleM(handle: string): Promise<Maybe<string>>;
    /**
     * Resolve handle and get card in one monadic operation
     */
    resolveAndGetM(handle: string): Promise<Maybe<MCard>>;
    /**
     * Prune version history for a handle.
     * @param handle The handle string.
     * @param options Options for pruning (olderThan date, or deleteAll).
     * @returns Number of deleted entries.
     */
    pruneHandleHistory(handle: string, options?: {
        olderThan?: string;
        deleteAll?: boolean;
    }): Promise<number>;
    clear(): Promise<void>;
    searchByString(query: string, pageNumber?: number, pageSize?: number): Promise<Page<MCard>>;
    searchByContent(query: string, pageNumber?: number, pageSize?: number): Promise<Page<MCard>>;
    searchByHash(hashPrefix: string): Promise<MCard[]>;
    getAllMCardsRaw(): Promise<MCard[]>;
    getAllCards(pageSize?: number, processCallback?: (card: MCard) => any): Promise<{
        cards: MCard[];
        total: number;
    }>;
    printAllCards(): Promise<void>;
}
//# sourceMappingURL=CardCollection.d.ts.map