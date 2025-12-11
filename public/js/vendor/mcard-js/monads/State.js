/**
 * State Monad - State Management
 * Encapsulates state transitions
 */
export class State {
    run;
    constructor(run) {
        this.run = run;
    }
    /**
     * Lift pure value
     */
    static pure(value) {
        return new State(state => [value, state]);
    }
    /**
     * Get current state
     */
    static get() {
        return new State(state => [state, state]);
    }
    /**
     * Set new state
     */
    static put(newState) {
        return new State(_ => [undefined, newState]);
    }
    /**
     * Monadic bind
     */
    bind(fn) {
        return new State(state => {
            const [val, newState] = this.run(state);
            return fn(val).run(newState);
        });
    }
    /**
     * Map
     */
    map(fn) {
        return this.bind(val => State.pure(fn(val)));
    }
    /**
     * Execute state transition
     */
    evaluate(initialState) {
        return this.run(initialState);
    }
}
//# sourceMappingURL=State.js.map