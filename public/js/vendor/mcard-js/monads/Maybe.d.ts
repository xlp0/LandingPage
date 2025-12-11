/**
 * Maybe Monad - Represents optional values
 *
 * Enables functional composition with .bind() chaining
 * Just(value) = has value, Nothing = no value
 */
export declare class Maybe<T> {
    private readonly _value;
    private readonly _isNothing;
    private constructor();
    /**
     * Create a Just (has value)
     */
    static just<T>(value: T): Maybe<T>;
    /**
     * Create a Nothing (no value)
     */
    static nothing<T>(): Maybe<T>;
    /**
     * Check if this is Nothing
     */
    get isNothing(): boolean;
    /**
     * Check if this is Just
     */
    get isJust(): boolean;
    /**
     * Get the value (throws if Nothing)
     */
    get value(): T;
    /**
     * Monadic bind - chain operations
     * Short-circuits on Nothing
     */
    bind<U>(fn: (value: T) => Maybe<U>): Maybe<U>;
    /**
     * Map a function over the value
     */
    map<U>(fn: (value: T) => U): Maybe<U>;
    /**
     * Get value or default
     */
    getOrElse(defaultValue: T): T;
}
//# sourceMappingURL=Maybe.d.ts.map