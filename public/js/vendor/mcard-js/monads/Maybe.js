/**
 * Maybe Monad - Represents optional values
 *
 * Enables functional composition with .bind() chaining
 * Just(value) = has value, Nothing = no value
 */
export class Maybe {
    _value;
    _isNothing;
    constructor(_value, _isNothing) {
        this._value = _value;
        this._isNothing = _isNothing;
    }
    /**
     * Create a Just (has value)
     */
    static just(value) {
        return new Maybe(value, false);
    }
    /**
     * Create a Nothing (no value)
     */
    static nothing() {
        return new Maybe(null, true);
    }
    /**
     * Check if this is Nothing
     */
    get isNothing() {
        return this._isNothing;
    }
    /**
     * Check if this is Just
     */
    get isJust() {
        return !this._isNothing;
    }
    /**
     * Get the value (throws if Nothing)
     */
    get value() {
        if (this._isNothing) {
            throw new Error('Cannot get value from Nothing');
        }
        return this._value;
    }
    /**
     * Monadic bind - chain operations
     * Short-circuits on Nothing
     */
    bind(fn) {
        if (this._isNothing) {
            return Maybe.nothing();
        }
        return fn(this._value);
    }
    /**
     * Map a function over the value
     */
    map(fn) {
        if (this._isNothing) {
            return Maybe.nothing();
        }
        return Maybe.just(fn(this._value));
    }
    /**
     * Get value or default
     */
    getOrElse(defaultValue) {
        return this._isNothing ? defaultValue : this._value;
    }
}
//# sourceMappingURL=Maybe.js.map