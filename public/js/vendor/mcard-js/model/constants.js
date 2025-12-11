/**
 * Event constants for MCard
 */
export const EVENT_CONSTANTS = {
    TYPE: "type",
    HASH: "hash",
    FIRST_G_TIME: "first_g_time",
    CONTENT_SIZE: "content_size",
    COLLISION_TIME: "collision_time",
    UPGRADED_FUNCTION: "upgraded_function",
    UPGRADED_HASH: "upgraded_hash",
    DUPLICATE_TIME: "duplicate_time",
    DUPLICATE_EVENT_TYPE: "duplicate",
    COLLISION_EVENT_TYPE: "collision",
};
/**
 * Hash Algorithm Hierarchy
 */
export const ALGORITHM_HIERARCHY = {
    'sha1': { strength: 1, next: 'sha224' },
    'sha224': { strength: 2, next: 'sha256' },
    'sha256': { strength: 3, next: 'sha384' },
    'sha384': { strength: 4, next: 'sha512' },
    'sha512': { strength: 5, next: 'custom' },
    'custom': { strength: 6, next: null }
};
//# sourceMappingURL=constants.js.map