/**
 * Writer Monad - Logging Side-Effects
 * Aggregates logs alongside computation values
 */
export class Writer {
    run;
    constructor(run) {
        this.run = run;
    }
    /**
     * Lift a pure value into Writer (empty log)
     */
    static pure(value) {
        return new Writer(() => [value, []]);
    }
    /**
     * Write to log
     */
    static tell(log) {
        return new Writer(() => [undefined, log]);
    }
    /**
     * Monadic bind
     */
    bind(fn) {
        return new Writer(() => {
            const [val1, log1] = this.run();
            const writer2 = fn(val1);
            const [val2, log2] = writer2.evaluate();
            return [val2, [...log1, ...log2]];
        });
    }
    /**
     * Map
     */
    map(fn) {
        return this.bind(val => Writer.pure(fn(val)));
    }
    /**
     * Run the writer
     */
    evaluate() {
        return this.run();
    }
}
//# sourceMappingURL=Writer.js.map