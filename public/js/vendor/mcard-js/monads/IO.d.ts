/**
 * IO Monad - Defers side effects until execution
 *
 * Enables pure functional composition of effectful operations
 */
export declare class IO<T> {
    private readonly effect;
    private constructor();
    /**
     * Create an IO from an effect (lazy evaluation)
     */
    static of<T>(effect: () => T | Promise<T>): IO<T>;
    /**
     * Lift a pure value into IO
     */
    static pure<T>(value: T): IO<T>;
    /**
     * Monadic bind - chain IO operations
     */
    bind<U>(fn: (value: T) => IO<U>): IO<U>;
    /**
     * Map a function over the result
     */
    map<U>(fn: (value: T) => U): IO<U>;
    /**
     * Execute the IO and get the result
     */
    run(): Promise<T>;
    /**
     * Run multiple IOs in sequence
     */
    static sequence<T>(ios: IO<T>[]): IO<T[]>;
    /**
     * Run multiple IOs in parallel
     */
    static parallel<T>(ios: IO<T>[]): IO<T[]>;
}
//# sourceMappingURL=IO.d.ts.map