import { MCard } from '../../../model/MCard.js';
export class MCardSerialization {
    /**
     * Serialize an MCard to a JSON-safe payload for network transfer
     */
    static serialize(card) {
        return {
            hash: card.hash,
            content: Buffer.from(card.content).toString('base64'),
            g_time: card.g_time,
            contentType: card.contentType,
            hashFunction: card.hashFunction
        };
    }
    /**
     * Deserialize a JSON payload back to an MCard
     * Uses fromData if hash/g_time provided (preserves identity)
     * Otherwise creates new MCard (generates new hash/g_time)
     */
    static async deserialize(json) {
        if (!json.content) {
            throw new Error('Missing content in MCard payload');
        }
        const content = Buffer.from(json.content, 'base64');
        if (json.hash && json.g_time) {
            return MCard.fromData(content, json.hash, json.g_time);
        }
        return MCard.create(content);
    }
    /**
     * Verify hash matches content (optional strict mode)
     */
    static verifyHash(card, expectedHash) {
        if (card.hash !== expectedHash) {
            console.warn(`[Network] Hash mismatch. Expected: ${expectedHash}, Got: ${card.hash}`);
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=MCardSerialization.js.map