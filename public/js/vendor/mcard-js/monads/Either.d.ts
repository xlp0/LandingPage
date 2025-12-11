/**
 * Either Monad - Represents success (Right) or failure (Left)
 *
 * Used for error handling without exceptions
 */
export declare class Either<L, R> {
    private readonly _value;
    private readonly _isLeft;
    private constructor();
    /**
     * Create a Left (failure/error)
     */
    static left<L, R>(value: L): Either<L, R>;
    /**
     * Create a Right (success)
     */
    static right<L, R>(value: R): Either<L, R>;
    /**
     * Check if Left
     */
    get isLeft(): boolean;
    /**
     * Check if Right
     */
    get isRight(): boolean;
    /**
     * Get Left value (throws if Right)
     */
    get left(): L;
    /**
     * Get Right value (throws if Left)
     */
    get right(): R;
    /**
     * Monadic bind - chain operations (short-circuits on Left)
     */
    bind<U>(fn: (value: R) => Either<L, U>): Either<L, U>;
    /**
     * Map a function over Right value
     */
    map<U>(fn: (value: R) => U): Either<L, U>;
    /**
     * Get Right or default
     */
    getOrElse(defaultValue: R): R;
    /**
     * Fold: apply leftFn if Left, rightFn if Right
     */
    fold<U>(leftFn: (l: L) => U, rightFn: (r: R) => U): U;
}
//# sourceMappingURL=Either.d.ts.map