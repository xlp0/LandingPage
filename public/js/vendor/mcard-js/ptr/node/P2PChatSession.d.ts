import { CardCollection } from '../../model/CardCollection.js';
export interface SessionMessage {
    sender: string;
    content: string;
    timestamp: number;
}
export interface SessionSegmentPayload {
    type: 'p2p_session_segment';
    sessionId: string;
    sequence: number;
    messages: SessionMessage[];
    previousHash: string | null;
    timestamp: number;
}
export interface SessionSummaryPayload {
    type: 'p2p_session_summary';
    sessionId: string;
    originalHeadHash: string | null;
    fullTranscript: SessionMessage[];
    timestamp: number;
}
/**
 * Manages the incremental recording of a P2P session into MCards.
 * Acts as a linked-list generator, where each MCard points to the previous one.
 */
export declare class P2PChatSession {
    private sessionId;
    private collection;
    private buffer;
    private previousHash;
    private sequence;
    private maxBufferSize;
    constructor(collection: CardCollection, sessionId: string, maxBufferSize?: number, initialHeadHash?: string | null);
    /**
     * Add a message to the current session buffer.
     * Automatically checkpoints if buffer exceeds size.
     */
    addMessage(sender: string, content: string): Promise<string | null>;
    /**
     * Force write the current buffer to a new MCard.
     */
    checkpoint(): Promise<string>;
    /**
     * Get the hash of the latest segment (Head of the list)
     */
    getHeadHash(): string | null;
    /**
     * Compile all segments into one MCard and remove original segments unless keepOriginals is true.
     */
    summarize(keepOriginals?: boolean): Promise<string>;
    private traverseChain;
}
//# sourceMappingURL=P2PChatSession.d.ts.map