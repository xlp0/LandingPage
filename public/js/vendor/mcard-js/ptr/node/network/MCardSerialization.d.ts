import { MCard } from '../../../model/MCard.js';
import { MCardPayload } from '../NetworkConfig.js';
export declare class MCardSerialization {
    /**
     * Serialize an MCard to a JSON-safe payload for network transfer
     */
    static serialize(card: MCard): MCardPayload;
    /**
     * Deserialize a JSON payload back to an MCard
     * Uses fromData if hash/g_time provided (preserves identity)
     * Otherwise creates new MCard (generates new hash/g_time)
     */
    static deserialize(json: Partial<MCardPayload>): Promise<MCard>;
    /**
     * Verify hash matches content (optional strict mode)
     */
    static verifyHash(card: MCard, expectedHash: string): boolean;
}
//# sourceMappingURL=MCardSerialization.d.ts.map