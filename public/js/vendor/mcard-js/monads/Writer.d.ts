/**
 * Writer Monad - Logging Side-Effects
 * Aggregates logs alongside computation values
 */
export declare class Writer<L, T> {
    private readonly run;
    constructor(run: () => [T, L[]]);
    /**
     * Lift a pure value into Writer (empty log)
     */
    static pure<L, T>(value: T): Writer<L, T>;
    /**
     * Write to log
     */
    static tell<L>(log: L[]): Writer<L, void>;
    /**
     * Monadic bind
     */
    bind<U>(fn: (value: T) => Writer<L, U>): Writer<L, U>;
    /**
     * Map
     */
    map<U>(fn: (value: T) => U): Writer<L, U>;
    /**
     * Run the writer
     */
    evaluate(): [T, L[]];
}
//# sourceMappingURL=Writer.d.ts.map