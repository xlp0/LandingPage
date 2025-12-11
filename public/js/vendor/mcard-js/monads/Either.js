/**
 * Either Monad - Represents success (Right) or failure (Left)
 *
 * Used for error handling without exceptions
 */
export class Either {
    _value;
    _isLeft;
    constructor(_value, _isLeft) {
        this._value = _value;
        this._isLeft = _isLeft;
    }
    /**
     * Create a Left (failure/error)
     */
    static left(value) {
        return new Either(value, true);
    }
    /**
     * Create a Right (success)
     */
    static right(value) {
        return new Either(value, false);
    }
    /**
     * Check if Left
     */
    get isLeft() {
        return this._isLeft;
    }
    /**
     * Check if Right
     */
    get isRight() {
        return !this._isLeft;
    }
    /**
     * Get Left value (throws if Right)
     */
    get left() {
        if (!this._isLeft)
            throw new Error('Cannot get left from Right');
        return this._value;
    }
    /**
     * Get Right value (throws if Left)
     */
    get right() {
        if (this._isLeft)
            throw new Error('Cannot get right from Left');
        return this._value;
    }
    /**
     * Monadic bind - chain operations (short-circuits on Left)
     */
    bind(fn) {
        if (this._isLeft)
            return Either.left(this._value);
        return fn(this._value);
    }
    /**
     * Map a function over Right value
     */
    map(fn) {
        if (this._isLeft)
            return Either.left(this._value);
        return Either.right(fn(this._value));
    }
    /**
     * Get Right or default
     */
    getOrElse(defaultValue) {
        return this._isLeft ? defaultValue : this._value;
    }
    /**
     * Fold: apply leftFn if Left, rightFn if Right
     */
    fold(leftFn, rightFn) {
        return this._isLeft ? leftFn(this._value) : rightFn(this._value);
    }
}
//# sourceMappingURL=Either.js.map