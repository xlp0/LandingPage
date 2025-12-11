/**
 * CLM Action Monad - Composable Actions following Monad Laws.
 *
 * This module implements the Action monad for CLM, enabling composable
 * agent actions that follow the three Monad Laws:
 *
 * 1. Left Identity:   return a >>= f  ≡  f a
 * 2. Right Identity:  m >>= return    ≡  m
 * 3. Associativity:   (m >>= f) >>= g ≡  m >>= (λx. f x >>= g)
 *
 * Actions are the atomic units of computation in CLM workflows.
 * Each action transforms context and produces a result while
 * accumulating effects (memory updates, tool calls, logs).
 *
 * Aligned with the Lambda Calculus interpretation:
 * - α-conversion: Action renaming (identity preservation)
 * - β-reduction: Action execution (input substitution)
 * - η-conversion: Behavioral equivalence (same I/O behavior)
 */
// ============ Types ============
/**
 * Status of an action execution.
 */
export var ActionStatus;
(function (ActionStatus) {
    ActionStatus["PENDING"] = "pending";
    ActionStatus["RUNNING"] = "running";
    ActionStatus["SUCCESS"] = "success";
    ActionStatus["FAILURE"] = "failure";
    ActionStatus["CANCELLED"] = "cancelled";
})(ActionStatus || (ActionStatus = {}));
/**
 * Create a default ActionContext.
 */
export function createActionContext(partial = {}) {
    return {
        sessionId: partial.sessionId ?? '',
        agentId: partial.agentId ?? '',
        config: partial.config ?? {},
        secrets: partial.secrets ?? {},
        params: partial.params ?? {},
        timestamp: partial.timestamp ?? Date.now(),
        traceId: partial.traceId ?? ''
    };
}
/**
 * Create a new context with updated params.
 */
export function withParams(ctx, params) {
    return {
        ...ctx,
        params: { ...ctx.params, ...params }
    };
}
/**
 * Create an empty effect (monoid identity).
 */
export function emptyEffect() {
    return {
        memoryUpdates: [],
        toolCalls: [],
        logs: [],
        tokens: { prompt: 0, completion: 0 },
        executionTime: 0
    };
}
/**
 * Combine two effects (monoid append).
 */
export function combineEffects(a, b) {
    return {
        memoryUpdates: [...a.memoryUpdates, ...b.memoryUpdates],
        toolCalls: [...a.toolCalls, ...b.toolCalls],
        logs: [...a.logs, ...b.logs],
        tokens: {
            prompt: a.tokens.prompt + b.tokens.prompt,
            completion: a.tokens.completion + b.tokens.completion
        },
        executionTime: a.executionTime + b.executionTime
    };
}
/**
 * Create a successful result with a value.
 */
export function pureResult(value) {
    return {
        success: true,
        value,
        effects: emptyEffect()
    };
}
/**
 * Create a failed result with an error.
 */
export function failResult(error) {
    return {
        success: false,
        error,
        effects: emptyEffect()
    };
}
/**
 * Functor map: Apply function to value if successful.
 */
export function mapResult(result, f) {
    if (result.success && result.value !== undefined) {
        try {
            return {
                success: true,
                value: f(result.value),
                effects: result.effects
            };
        }
        catch (e) {
            return {
                success: false,
                error: String(e),
                effects: result.effects
            };
        }
    }
    return {
        success: false,
        error: result.error,
        effects: result.effects
    };
}
/**
 * The Action Monad - A composable unit of computation.
 *
 * An Action encapsulates:
 * - An async function from context to result
 * - The ability to compose with other actions (bind/flatMap)
 * - Effects accumulated during execution (Writer)
 * - Context propagation (Reader)
 * - Error handling (Either)
 *
 * Satisfies the Monad Laws:
 *
 * 1. Left Identity:  Action.pure(a).bind(f) == f(a)
 * 2. Right Identity: m.bind(Action.pure) == m
 * 3. Associativity:  m.bind(f).bind(g) == m.bind(x => f(x).bind(g))
 */
export class Action {
    _run;
    /**
     * Create an action from a function.
     *
     * @param run - Async function (ActionContext -> ActionResult<A>)
     */
    constructor(run) {
        this._run = run;
    }
    /**
     * Execute this action with the given context.
     *
     * @param ctx - The execution context
     * @returns The result of the action
     */
    async execute(ctx) {
        const startTime = Date.now();
        try {
            const result = await this._run(ctx);
            // Add execution time to effects
            result.effects.executionTime += Date.now() - startTime;
            return result;
        }
        catch (e) {
            const elapsed = Date.now() - startTime;
            return {
                success: false,
                error: String(e),
                effects: {
                    ...emptyEffect(),
                    executionTime: elapsed,
                    logs: [`Exception: ${e}`]
                }
            };
        }
    }
    /**
     * Monadic bind (>>=, flatMap).
     *
     * Sequences this action with a function that produces
     * another action based on this action's result.
     *
     * This is the KEY operation that makes Action a monad.
     *
     * @param f - Function from A to Action<B>
     * @returns A new action that chains the computations
     */
    bind(f) {
        const self = this;
        const boundRun = async (ctx) => {
            // Execute this action
            const resultA = await self.execute(ctx);
            if (!resultA.success) {
                // Propagate failure with accumulated effects
                return {
                    success: false,
                    error: resultA.error,
                    effects: resultA.effects
                };
            }
            // Apply f to get the next action
            const actionB = f(resultA.value);
            // Execute the next action
            const resultB = await actionB.execute(ctx);
            // Combine effects from both actions
            const combinedEffects = combineEffects(resultA.effects, resultB.effects);
            return {
                success: resultB.success,
                value: resultB.value,
                error: resultB.error,
                effects: combinedEffects
            };
        };
        return new Action(boundRun);
    }
    /**
     * Functor map.
     *
     * Apply a pure function to the action's result.
     *
     * @param f - Pure function from A to B
     * @returns A new action with the transformed result
     */
    map(f) {
        return this.bind(a => Action.pure(f(a)));
    }
    /**
     * Sequence with another action, ignoring this result.
     *
     * Useful for side-effect-only actions.
     *
     * @param nextAction - The action to execute after this one
     * @returns The result of nextAction
     */
    then(nextAction) {
        return this.bind(_ => nextAction);
    }
    // ============ Static Constructors ============
    /**
     * Lift a pure value into Action (return/unit).
     *
     * This is the 'return' operation of the monad.
     *
     * Satisfies Left Identity: pure(a).bind(f) == f(a)
     * Satisfies Right Identity: m.bind(pure) == m
     *
     * @param value - The value to lift
     * @returns An action that immediately succeeds with the value
     */
    static pure(value) {
        return new Action(async (_ctx) => pureResult(value));
    }
    /**
     * Create a failing action.
     *
     * @param error - The error message
     * @returns An action that immediately fails
     */
    static fail(error) {
        return new Action(async (_ctx) => failResult(error));
    }
    /**
     * Reader monad operation: Get the current context.
     *
     * @returns An action that returns the context
     */
    static ask() {
        return new Action(async (ctx) => pureResult(ctx));
    }
    /**
     * Reader monad operation: Apply function to context.
     *
     * @param f - Function to apply to context
     * @returns An action that returns f(context)
     */
    static asks(f) {
        return Action.ask().map(f);
    }
    /**
     * Writer monad operation: Emit an effect.
     *
     * @param effect - The effect to emit
     * @returns An action that emits the effect
     */
    static tell(effect) {
        return new Action(async (_ctx) => ({
            success: true,
            value: undefined,
            effects: effect
        }));
    }
    /**
     * Convenience: Log a message.
     *
     * @param message - The log message
     * @returns An action that logs the message
     */
    static log(message) {
        return Action.tell({ ...emptyEffect(), logs: [message] });
    }
    /**
     * Create an action from an async function.
     *
     * @param f - Async function (ctx -> A)
     * @returns An action wrapping the function
     */
    static fromAsync(f) {
        return new Action(async (ctx) => {
            try {
                const result = await f(ctx);
                return pureResult(result);
            }
            catch (e) {
                return failResult(String(e));
            }
        });
    }
    /**
     * Create an action from a synchronous function.
     *
     * @param f - Sync function (ctx -> A)
     * @returns An action wrapping the function
     */
    static fromSync(f) {
        return new Action(async (ctx) => {
            try {
                const result = f(ctx);
                return pureResult(result);
            }
            catch (e) {
                return failResult(String(e));
            }
        });
    }
}
// ============ Action Composition Utilities ============
/**
 * Sequence a list of actions, collecting results.
 *
 * @param actions - List of actions to sequence
 * @returns An action that produces a list of results
 */
export function sequence(actions) {
    if (actions.length === 0) {
        return Action.pure([]);
    }
    return new Action(async (ctx) => {
        const results = [];
        let combinedEffects = emptyEffect();
        for (const action of actions) {
            const result = await action.execute(ctx);
            combinedEffects = combineEffects(combinedEffects, result.effects);
            if (!result.success) {
                return {
                    success: false,
                    error: result.error,
                    effects: combinedEffects
                };
            }
            results.push(result.value);
        }
        return {
            success: true,
            value: results,
            effects: combinedEffects
        };
    });
}
/**
 * Execute actions in parallel, collecting results.
 *
 * @param actions - List of actions to execute in parallel
 * @returns An action that produces a list of results
 */
export function parallel(actions) {
    if (actions.length === 0) {
        return Action.pure([]);
    }
    return new Action(async (ctx) => {
        // Execute all actions concurrently
        const resultPromises = actions.map(action => action.execute(ctx));
        const results = await Promise.all(resultPromises);
        // Combine effects and check for failures
        let combinedEffects = emptyEffect();
        const values = [];
        for (const result of results) {
            combinedEffects = combineEffects(combinedEffects, result.effects);
            if (!result.success) {
                return {
                    success: false,
                    error: result.error,
                    effects: combinedEffects
                };
            }
            values.push(result.value);
        }
        return {
            success: true,
            value: values,
            effects: combinedEffects
        };
    });
}
/**
 * Kleisli composition: Compose two monadic functions.
 *
 * (g <=< f)(a) = f(a).bind(g)
 *
 * This is the categorical composition in the Kleisli category.
 *
 * @param f - First Kleisli arrow (A -> Action<B>)
 * @param g - Second Kleisli arrow (B -> Action<C>)
 * @returns Composed Kleisli arrow (A -> Action<C>)
 */
export function kleisliCompose(f, g) {
    return (a) => f(a).bind(g);
}
/**
 * The identity Kleisli arrow.
 *
 * This is Action.pure, serving as the identity for Kleisli composition.
 *
 * @returns The identity function in the Kleisli category
 */
export function identityAction() {
    return Action.pure;
}
// ============ Monad Law Verification ============
/**
 * Verify Left Identity law: pure(a).bind(f) == f(a)
 *
 * @param a - A value
 * @param f - A Kleisli arrow
 * @param ctx - Execution context
 * @returns True if the law holds
 */
export async function verifyLeftIdentity(a, f, ctx) {
    const left = await Action.pure(a).bind(f).execute(ctx);
    const right = await f(a).execute(ctx);
    return (left.success === right.success &&
        JSON.stringify(left.value) === JSON.stringify(right.value) &&
        left.error === right.error);
}
/**
 * Verify Right Identity law: m.bind(pure) == m
 *
 * @param m - An action
 * @param ctx - Execution context
 * @returns True if the law holds
 */
export async function verifyRightIdentity(m, ctx) {
    const left = await m.bind(Action.pure).execute(ctx);
    const right = await m.execute(ctx);
    return (left.success === right.success &&
        JSON.stringify(left.value) === JSON.stringify(right.value) &&
        left.error === right.error);
}
/**
 * Verify Associativity law: (m.bind(f)).bind(g) == m.bind(x => f(x).bind(g))
 *
 * @param m - An action
 * @param f - First Kleisli arrow
 * @param g - Second Kleisli arrow
 * @param ctx - Execution context
 * @returns True if the law holds
 */
export async function verifyAssociativity(m, f, g, ctx) {
    const left = await m.bind(f).bind(g).execute(ctx);
    const right = await m.bind(x => f(x).bind(g)).execute(ctx);
    return (left.success === right.success &&
        JSON.stringify(left.value) === JSON.stringify(right.value) &&
        left.error === right.error);
}
/**
 * Contract-aware Action that produces VCard pairs.
 *
 * Extends the base Action monad with Hoare Logic contracts:
 * - Verifies preconditions before execution
 * - Verifies postconditions after execution
 * - Produces VCard pair as verification evidence
 */
export class ContractAction extends Action {
    contract;
    constructor(run, contract) {
        super(run);
        this.contract = contract;
    }
    /**
     * Get the contract for this action.
     */
    getContract() {
        return this.contract;
    }
    /**
     * Verify preconditions against the context.
     */
    verifyPreconditions(ctx) {
        const conditions = this.contract.preconditions.map(cond => {
            try {
                const satisfied = cond.check(ctx);
                return { name: cond.name, expression: cond.expression, satisfied };
            }
            catch (e) {
                return { name: cond.name, expression: cond.expression, satisfied: false, error: String(e) };
            }
        });
        return {
            phase: 'pre',
            conditions,
            allSatisfied: conditions.every(c => c.satisfied),
            timestamp: Date.now()
        };
    }
    /**
     * Verify postconditions against the result.
     */
    verifyPostconditions(result) {
        const conditions = this.contract.postconditions.map(cond => {
            try {
                const satisfied = cond.check(result);
                return { name: cond.name, expression: cond.expression, satisfied };
            }
            catch (e) {
                return { name: cond.name, expression: cond.expression, satisfied: false, error: String(e) };
            }
        });
        return {
            phase: 'post',
            conditions,
            allSatisfied: conditions.every(c => c.satisfied),
            timestamp: Date.now()
        };
    }
    /**
     * Create a PreCondition VCard from verification result.
     * Returns a hash representing the VCard (in production, would store in MCard collection).
     */
    createPreConditionVCard(verification, actionHash) {
        const vcard = {
            type: 'PreConditionVCard',
            actionHash,
            timestamp: new Date(verification.timestamp).toISOString(),
            preconditions: verification.conditions,
            certification: {
                allSatisfied: verification.allSatisfied,
                checkedAt: new Date(verification.timestamp).toISOString(),
                certifier: 'ptr_engine_v0.2.0'
            }
        };
        // In production: store as MCard and return hash
        // For now: return a deterministic hash representation
        return `vcard:pre:${actionHash}:${verification.timestamp}`;
    }
    /**
     * Create a PostCondition VCard from verification result.
     * Links back to the PreCondition VCard.
     */
    createPostConditionVCard(verification, actionHash, preVCardHash, result) {
        const vcard = {
            type: 'PostConditionVCard',
            actionHash,
            timestamp: new Date(verification.timestamp).toISOString(),
            preConditionVCardHash: preVCardHash,
            postconditions: verification.conditions,
            executionSummary: {
                success: result.success,
                executionTimeMs: result.effects.executionTime,
                effectsAccumulated: {
                    logCount: result.effects.logs.length,
                    memoryUpdates: result.effects.memoryUpdates.length,
                    toolCalls: result.effects.toolCalls.length
                }
            },
            certification: {
                allSatisfied: verification.allSatisfied,
                checkedAt: new Date(verification.timestamp).toISOString(),
                certifier: 'ptr_engine_v0.2.0'
            }
        };
        // In production: store as MCard and return hash
        return `vcard:post:${actionHash}:${verification.timestamp}`;
    }
    /**
     * Generate a hash for this action (based on contract).
     */
    getActionHash() {
        const contractSummary = {
            preConditions: this.contract.preconditions.map(c => c.name),
            postConditions: this.contract.postconditions.map(c => c.name)
        };
        return `action:${JSON.stringify(contractSummary)}`.substring(0, 64);
    }
    /**
     * Execute with full contract verification, producing VCard pair.
     *
     * This is the primary method for contract-aware execution:
     * 1. Verify preconditions → create PreCondition VCard
     * 2. Execute action (only if preconditions pass)
     * 3. Verify postconditions → create PostCondition VCard
     * 4. Return result with VCard pair
     */
    async executeWithContract(ctx) {
        const actionHash = this.getActionHash();
        // Phase 1: Verify preconditions
        const preVerification = this.verifyPreconditions(ctx);
        const preVCard = this.createPreConditionVCard(preVerification, actionHash);
        // If preconditions fail, return early with failure
        if (!preVerification.allSatisfied) {
            const failedConditions = preVerification.conditions
                .filter(c => !c.satisfied)
                .map(c => c.name)
                .join(', ');
            const failedResult = failResult(`Precondition failed: ${failedConditions}`);
            const postVerification = {
                phase: 'post',
                conditions: [],
                allSatisfied: false,
                timestamp: Date.now()
            };
            return {
                result: failedResult,
                vCardPair: {
                    preConditionVCard: preVCard,
                    postConditionVCard: '',
                    actionHash,
                    linkedAt: Date.now()
                },
                preVerification,
                postVerification
            };
        }
        // Phase 2: Execute action
        const result = await this.execute(ctx);
        // Phase 3: Verify postconditions
        const postVerification = result.success
            ? this.verifyPostconditions(result)
            : { phase: 'post', conditions: [], allSatisfied: false, timestamp: Date.now() };
        const postVCard = this.createPostConditionVCard(postVerification, actionHash, preVCard, result);
        return {
            result,
            vCardPair: {
                preConditionVCard: preVCard,
                postConditionVCard: postVCard,
                actionHash,
                linkedAt: Date.now()
            },
            preVerification,
            postVerification
        };
    }
    /**
     * Compose contract-aware actions, chaining VCard pairs.
     */
    bindWithContract(f) {
        const self = this;
        // Merged contract: preconditions from self, postconditions from f's result
        const mergedContract = {
            preconditions: this.contract.preconditions,
            postconditions: [] // Will be filled by the bound action
        };
        const boundRun = async (ctx) => {
            const resultA = await self.execute(ctx);
            if (!resultA.success) {
                return {
                    success: false,
                    error: resultA.error,
                    effects: resultA.effects
                };
            }
            const actionB = f(resultA.value);
            const resultB = await actionB.execute(ctx);
            return {
                success: resultB.success,
                value: resultB.value,
                error: resultB.error,
                effects: combineEffects(resultA.effects, resultB.effects)
            };
        };
        return new ContractAction(boundRun, mergedContract);
    }
    // ============ Static Constructors ============
    /**
     * Create a contract-aware action from a pure value.
     */
    static pureWithContract(value, contract) {
        const defaultContract = contract ?? {
            preconditions: [],
            postconditions: [{ name: 'has_value', expression: 'result.value !== undefined', check: r => r.value !== undefined }]
        };
        return new ContractAction(async (_ctx) => pureResult(value), defaultContract);
    }
    /**
     * Create a contract-aware action from an async function.
     */
    static fromAsyncWithContract(f, contract) {
        return new ContractAction(async (ctx) => {
            try {
                const result = await f(ctx);
                return pureResult(result);
            }
            catch (e) {
                return failResult(String(e));
            }
        }, contract);
    }
}
//# sourceMappingURL=Action.js.map