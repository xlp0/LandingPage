import { MCard } from '../../model/MCard.js';
/**
 * Manages the incremental recording of a P2P session into MCards.
 * Acts as a linked-list generator, where each MCard points to the previous one.
 */
export class P2PChatSession {
    sessionId;
    collection;
    buffer = [];
    previousHash = null;
    sequence = 0;
    maxBufferSize;
    constructor(collection, sessionId, maxBufferSize = 5, initialHeadHash = null) {
        this.collection = collection;
        this.sessionId = sessionId;
        this.maxBufferSize = maxBufferSize;
        this.previousHash = initialHeadHash;
        // Note: If resuming, sequence should be > 0. 
        // Ideally we fetch the previous card to get the sequence number. 
        // For simplicity, we assume the user doesn't care about sequence gaps in this demo, 
        // or we default to 0 (which might overlap seq numbers).
        // Let's at least mark it.
        if (initialHeadHash) {
            // We assume the sequence continues. 
            // Correct implementation would await collection.get(initialHeadHash)
            // But constructor is synchronous.
        }
    }
    /**
     * Add a message to the current session buffer.
     * Automatically checkpoints if buffer exceeds size.
     */
    async addMessage(sender, content) {
        this.buffer.push({
            sender,
            content,
            timestamp: Date.now()
        });
        if (this.buffer.length >= this.maxBufferSize) {
            return this.checkpoint();
        }
        return null; // No checkpoint yet
    }
    /**
     * Force write the current buffer to a new MCard.
     */
    async checkpoint() {
        if (this.buffer.length === 0) {
            return this.previousHash || '';
        }
        const payload = {
            type: 'p2p_session_segment',
            sessionId: this.sessionId,
            sequence: this.sequence++,
            messages: [...this.buffer],
            previousHash: this.previousHash,
            timestamp: Date.now()
        };
        // Create MCard
        const card = await MCard.create(JSON.stringify(payload));
        // Save to collection
        await this.collection.add(card);
        // Update state
        this.previousHash = card.hash;
        this.buffer = [];
        console.log(`[P2PSession] Checkpoint created: ${card.hash} (Seq: ${payload.sequence})`);
        return card.hash;
    }
    /**
     * Get the hash of the latest segment (Head of the list)
     */
    getHeadHash() {
        return this.previousHash;
    }
    /**
     * Compile all segments into one MCard and remove original segments unless keepOriginals is true.
     */
    async summarize(keepOriginals = false) {
        // 1. Flush any remaining buffer
        if (this.buffer.length > 0) {
            await this.checkpoint();
        }
        // if (!this.previousHash) {
        //    throw new Error('No session data to summarize.');
        // }
        // Allow empty summary
        const headToUse = this.previousHash || null;
        console.log(`[P2PSession] Summarizing session starting from head: ${headToUse}`);
        // 2. Traverse and Collect
        const { messages, hashes } = headToUse ? await this.traverseChain(headToUse) : { messages: [], hashes: [] };
        // 3. Create Summary MCard (Pretty Printed)
        const summaryPayload = {
            type: 'p2p_session_summary',
            sessionId: this.sessionId,
            originalHeadHash: headToUse, // Cast or update interface
            fullTranscript: messages,
            timestamp: Date.now()
        };
        const summaryContent = JSON.stringify(summaryPayload, null, 2);
        const summaryCard = await MCard.create(summaryContent);
        await this.collection.add(summaryCard);
        console.log(`[P2PSession] Summary created: ${summaryCard.hash}`);
        // 4. Cleanup (Delete old segments)
        if (!keepOriginals) {
            console.log(`[P2PSession] Cleaning up ${hashes.length} segment MCards...`);
            for (const hash of hashes) {
                try {
                    await this.collection.delete(hash);
                    // console.debug(`[P2PSession] Deleted segment ${hash}`);
                }
                catch (e) {
                    console.error(`[P2PSession] Failed to delete segment ${hash}`, e);
                }
            }
            console.log(`[P2PSession] Cleanup complete.`);
        }
        else {
            console.log(`[P2PSession] Skipping cleanup (keepOriginals=true). Preserved ${hashes.length} segments.`);
        }
        return summaryCard.hash;
    }
    async traverseChain(headHash) {
        const messages = [];
        const hashes = [];
        let currentHash = headHash;
        while (currentHash) {
            hashes.push(currentHash);
            const card = await this.collection.get(currentHash);
            if (!card) {
                console.warn(`[P2PSession] Broken chain at ${currentHash}`);
                break;
            }
            try {
                const contentStr = new TextDecoder().decode(card.content);
                const payload = JSON.parse(contentStr);
                if (payload.type === 'p2p_session_segment') {
                    // Prepend messages since we are traversing backwards
                    messages.unshift(...payload.messages);
                    currentHash = payload.previousHash;
                }
                else {
                    console.warn(`[P2PSession] Invalid card type at ${currentHash}`);
                    break;
                }
            }
            catch (e) {
                console.error(`[P2PSession] Parse error at ${currentHash}`, e);
                break;
            }
        }
        return { messages, hashes };
    }
}
//# sourceMappingURL=P2PChatSession.js.map