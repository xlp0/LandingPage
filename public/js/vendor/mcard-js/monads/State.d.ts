/**
 * State Monad - State Management
 * Encapsulates state transitions
 */
export declare class State<S, T> {
    private readonly run;
    constructor(run: (state: S) => [T, S]);
    /**
     * Lift pure value
     */
    static pure<S, T>(value: T): State<S, T>;
    /**
     * Get current state
     */
    static get<S>(): State<S, S>;
    /**
     * Set new state
     */
    static put<S>(newState: S): State<S, void>;
    /**
     * Monadic bind
     */
    bind<U>(fn: (value: T) => State<S, U>): State<S, U>;
    /**
     * Map
     */
    map<U>(fn: (value: T) => U): State<S, U>;
    /**
     * Execute state transition
     */
    evaluate(initialState: S): [T, S];
}
//# sourceMappingURL=State.d.ts.map