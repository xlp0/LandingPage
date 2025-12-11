import { MCard } from './MCard';
import { Maybe } from '../monads/Maybe';
/**
 * CardCollection - High-level interface for MCard operations with monadic API
 */
export class CardCollection {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    // =========== Standard Operations ===========
    /**
     * Add a card to the collection
     * Handles duplicates (same content, same hash) and collisions (diff content, same hash)
     */
    async add(card) {
        // Check existing by hash
        const existingCard = await this.engine.get(card.hash);
        if (existingCard) {
            // Compare content
            const isDuplicate = this.areContentsEqual(existingCard.content, card.content);
            if (isDuplicate) {
                // Duplicate detected
                // console.debug(`Duplicate detected for hash ${card.hash}`);
                const { generateDuplicationEvent } = await import('./EventProducer');
                const eventStr = generateDuplicationEvent(card);
                const eventCard = await MCard.create(eventStr);
                // Store duplicate event but do not overwrite original card
                await this.engine.add(eventCard);
                return card.hash;
            }
            else {
                // Collision detected
                // console.warn(`Collision detected for hash ${card.hash}`);
                const { generateCollisionEvent } = await import('./EventProducer');
                const eventStr = await generateCollisionEvent(card);
                // Store collision event
                const eventCard = await MCard.create(eventStr);
                await this.engine.add(eventCard);
                // Store colliding card with upgraded hash function
                const eventObj = JSON.parse(eventStr);
                const nextAlgo = eventObj.upgraded_function;
                if (!nextAlgo) {
                    throw new Error("Failed to determine next hash algorithm for collision");
                }
                const upgradedCard = await MCard.create(card.content, nextAlgo);
                return this.engine.add(upgradedCard);
            }
        }
        return this.engine.add(card);
    }
    areContentsEqual(a, b) {
        if (a.length !== b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i])
                return false;
        }
        return true;
    }
    /**
     * Get a card by hash
     */
    async get(hash) {
        return this.engine.get(hash);
    }
    /**
     * Delete a card by hash
     */
    async delete(hash) {
        return this.engine.delete(hash);
    }
    /**
     * Get a page of cards
     */
    async getPage(pageNumber = 1, pageSize = 10) {
        return this.engine.getPage(pageNumber, pageSize);
    }
    /**
     * Count total cards
     */
    async count() {
        return this.engine.count();
    }
    // =========== Handle Operations ===========
    /**
     * Add a card and register a handle for it
     */
    async addWithHandle(card, handle) {
        const hash = await this.add(card);
        await this.engine.registerHandle(handle, hash);
        return hash;
    }
    /**
     * Get card by handle
     */
    async getByHandle(handle) {
        return this.engine.getByHandle(handle);
    }
    /**
     * Resolve handle to hash
     */
    async resolveHandle(handle) {
        return this.engine.resolveHandle(handle);
    }
    /**
     * Update handle to point to new card
     */
    async updateHandle(handle, newCard) {
        const hash = await this.add(newCard);
        await this.engine.updateHandle(handle, hash);
        return hash;
    }
    /**
     * Get version history for a handle
     */
    async getHandleHistory(handle) {
        return this.engine.getHandleHistory(handle);
    }
    // =========== Monadic Operations ===========
    /**
     * Monadic get - returns Maybe<MCard>
     */
    async getM(hash) {
        const card = await this.get(hash);
        return card ? Maybe.just(card) : Maybe.nothing();
    }
    /**
     * Monadic getByHandle - returns Maybe<MCard>
     */
    async getByHandleM(handle) {
        const card = await this.getByHandle(handle);
        return card ? Maybe.just(card) : Maybe.nothing();
    }
    /**
     * Monadic resolveHandle - returns Maybe<string>
     */
    async resolveHandleM(handle) {
        const hash = await this.resolveHandle(handle);
        return hash ? Maybe.just(hash) : Maybe.nothing();
    }
    /**
     * Resolve handle and get card in one monadic operation
     */
    async resolveAndGetM(handle) {
        const maybeHash = await this.resolveHandleM(handle);
        if (maybeHash.isNothing)
            return Maybe.nothing();
        return this.getM(maybeHash.value);
    }
    /**
     * Prune version history for a handle.
     * @param handle The handle string.
     * @param options Options for pruning (olderThan date, or deleteAll).
     * @returns Number of deleted entries.
     */
    async pruneHandleHistory(handle, options = {}) {
        if (this.engine.pruneHandleHistory) {
            return this.engine.pruneHandleHistory(handle, options);
        }
        return 0; // Or throw error if engine doesn't support it
    }
    // =========== Search & Bulk Operations ===========
    async clear() {
        return this.engine.clear();
    }
    async searchByString(query, pageNumber = 1, pageSize = 10) {
        return this.engine.search(query, pageNumber, pageSize);
    }
    async searchByContent(query, pageNumber = 1, pageSize = 10) {
        return this.engine.search(query, pageNumber, pageSize);
    }
    async searchByHash(hashPrefix) {
        return this.engine.searchByHash(hashPrefix);
    }
    async getAllMCardsRaw() {
        return this.engine.getAll();
    }
    async getAllCards(pageSize = 10, processCallback) {
        const cards = [];
        let pageNumber = 1;
        let total = 0;
        while (true) {
            const page = await this.getPage(pageNumber, pageSize);
            if (!page.items || page.items.length === 0)
                break;
            for (const card of page.items) {
                if (processCallback) {
                    processCallback(card);
                }
                cards.push(card);
            }
            total = page.totalItems;
            if (!page.hasNext)
                break;
            pageNumber++;
        }
        return { cards, total };
    }
    async printAllCards() {
        const cards = await this.getAllMCardsRaw();
        cards.forEach(card => {
            console.log(`Hash: ${card.hash}`);
            // Try to print as text if possible
            try {
                const text = new TextDecoder().decode(card.content);
                const preview = text.slice(0, 100).replace(/\n/g, ' ');
                console.log(`Content: ${preview}${text.length > 100 ? '...' : ''}`);
            }
            catch {
                console.log(`Content (binary): ${card.content.length} bytes`);
            }
            console.log('---');
        });
    }
}
//# sourceMappingURL=CardCollection.js.map