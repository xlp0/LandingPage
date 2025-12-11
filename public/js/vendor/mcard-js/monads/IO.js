/**
 * IO Monad - Defers side effects until execution
 *
 * Enables pure functional composition of effectful operations
 */
export class IO {
    effect;
    constructor(effect) {
        this.effect = effect;
    }
    /**
     * Create an IO from an effect (lazy evaluation)
     */
    static of(effect) {
        return new IO(effect);
    }
    /**
     * Lift a pure value into IO
     */
    static pure(value) {
        return new IO(() => value);
    }
    /**
     * Monadic bind - chain IO operations
     */
    bind(fn) {
        return new IO(async () => {
            const result = await this.run();
            return fn(result).run();
        });
    }
    /**
     * Map a function over the result
     */
    map(fn) {
        return new IO(async () => {
            const result = await this.run();
            return fn(result);
        });
    }
    /**
     * Execute the IO and get the result
     */
    async run() {
        return this.effect();
    }
    /**
     * Run multiple IOs in sequence
     */
    static sequence(ios) {
        return new IO(async () => {
            const results = [];
            for (const io of ios) {
                results.push(await io.run());
            }
            return results;
        });
    }
    /**
     * Run multiple IOs in parallel
     */
    static parallel(ios) {
        return new IO(() => Promise.all(ios.map(io => io.run())));
    }
}
//# sourceMappingURL=IO.js.map