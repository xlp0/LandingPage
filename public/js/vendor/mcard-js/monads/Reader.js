/**
 * Reader Monad - Dependency Injection
 * COMPUTATION which reads from a shared environment
 */
export class Reader {
    run;
    constructor(run) {
        this.run = run;
    }
    /**
     * Lift a pure value into Reader
     */
    static pure(value) {
        return new Reader(_ => value);
    }
    /**
     * Get the environment
     */
    static ask() {
        return new Reader(env => env);
    }
    /**
     * Monadic bind (flatMap)
     */
    bind(fn) {
        return new Reader(env => {
            const value = this.run(env);
            return fn(value).run(env);
        });
    }
    /**
     * Map over the result
     */
    map(fn) {
        return this.bind(value => Reader.pure(fn(value)));
    }
    /**
     * Execute the Reader logic with an environment
     */
    evaluate(env) {
        return this.run(env);
    }
}
//# sourceMappingURL=Reader.js.map