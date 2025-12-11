import { EVENT_CONSTANTS, ALGORITHM_HIERARCHY } from './constants';
import { GTime } from './GTime';
import { HashValidator } from '../hash/HashValidator';
/**
 * Generate a collision event for the given card.
 */
export async function generateCollisionEvent(card) {
    const currentHashFunction = GTime.getHashAlgorithm(card.g_time);
    const nextAlgo = nextHashFunction(currentHashFunction);
    // Compute upgraded hash
    const upgradedHash = await HashValidator.computeHash(card.content, nextAlgo);
    const event = {
        [EVENT_CONSTANTS.TYPE]: EVENT_CONSTANTS.COLLISION_EVENT_TYPE,
        [EVENT_CONSTANTS.HASH]: card.hash,
        [EVENT_CONSTANTS.FIRST_G_TIME]: card.g_time,
        [EVENT_CONSTANTS.COLLISION_TIME]: card.g_time, // Using original card's time as per Python logic reference
        [EVENT_CONSTANTS.CONTENT_SIZE]: card.content.length,
        [EVENT_CONSTANTS.UPGRADED_FUNCTION]: nextAlgo,
        [EVENT_CONSTANTS.UPGRADED_HASH]: upgradedHash
    };
    return JSON.stringify(event);
}
/**
 * Generate a duplication event for the given card.
 */
export function generateDuplicationEvent(card) {
    const event = {
        [EVENT_CONSTANTS.TYPE]: EVENT_CONSTANTS.DUPLICATE_EVENT_TYPE,
        [EVENT_CONSTANTS.HASH]: card.hash,
        [EVENT_CONSTANTS.DUPLICATE_TIME]: card.g_time
    };
    return JSON.stringify(event);
}
/**
 * Get the next hash function in the hierarchy.
 */
function nextHashFunction(current) {
    const currentLower = current.toLowerCase();
    const entry = ALGORITHM_HIERARCHY[currentLower];
    if (entry && entry.next) {
        return entry.next;
    }
    // Fallback logic
    return 'sha256';
}
//# sourceMappingURL=EventProducer.js.map