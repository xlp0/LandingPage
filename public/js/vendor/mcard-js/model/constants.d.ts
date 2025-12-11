/**
 * Event constants for MCard
 */
export declare const EVENT_CONSTANTS: {
    TYPE: string;
    HASH: string;
    FIRST_G_TIME: string;
    CONTENT_SIZE: string;
    COLLISION_TIME: string;
    UPGRADED_FUNCTION: string;
    UPGRADED_HASH: string;
    DUPLICATE_TIME: string;
    DUPLICATE_EVENT_TYPE: string;
    COLLISION_EVENT_TYPE: string;
};
/**
 * Hash Algorithm Hierarchy
 */
export declare const ALGORITHM_HIERARCHY: {
    sha1: {
        strength: number;
        next: string;
    };
    sha224: {
        strength: number;
        next: string;
    };
    sha256: {
        strength: number;
        next: string;
    };
    sha384: {
        strength: number;
        next: string;
    };
    sha512: {
        strength: number;
        next: string;
    };
    custom: {
        strength: number;
        next: null;
    };
};
//# sourceMappingURL=constants.d.ts.map