/**
 * Reader Monad - Dependency Injection
 * COMPUTATION which reads from a shared environment
 */
export declare class Reader<E, T> {
    private readonly run;
    constructor(run: (env: E) => T);
    /**
     * Lift a pure value into Reader
     */
    static pure<E, T>(value: T): Reader<E, T>;
    /**
     * Get the environment
     */
    static ask<E>(): Reader<E, E>;
    /**
     * Monadic bind (flatMap)
     */
    bind<U>(fn: (value: T) => Reader<E, U>): Reader<E, U>;
    /**
     * Map over the result
     */
    map<U>(fn: (value: T) => U): Reader<E, U>;
    /**
     * Execute the Reader logic with an environment
     */
    evaluate(env: E): T;
}
//# sourceMappingURL=Reader.d.ts.map