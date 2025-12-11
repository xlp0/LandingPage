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
import { MCard } from '../../model/MCard.js';
/**
 * Status of an action execution.
 */
export declare enum ActionStatus {
    PENDING = "pending",
    RUNNING = "running",
    SUCCESS = "success",
    FAILURE = "failure",
    CANCELLED = "cancelled"
}
/**
 * Context passed to actions during execution.
 *
 * This is the Reader monad component - read-only configuration
 * and environment that flows through the action pipeline.
 */
export interface ActionContext {
    /** Session information */
    sessionId: string;
    agentId: string;
    /** Configuration */
    config: Record<string, any>;
    secrets: Record<string, string>;
    /** Input parameters (from CLM params interpolation) */
    params: Record<string, any>;
    /** Execution metadata */
    timestamp: number;
    traceId: string;
}
/**
 * Create a default ActionContext.
 */
export declare function createActionContext(partial?: Partial<ActionContext>): ActionContext;
/**
 * Create a new context with updated params.
 */
export declare function withParams(ctx: ActionContext, params: Record<string, any>): ActionContext;
/**
 * Side effects produced by an action.
 *
 * This is the Writer monad component - accumulated effects
 * that flow through the action pipeline.
 */
export interface ActionEffect {
    /** Memory updates (MCards to store) */
    memoryUpdates: MCard[];
    /** Tool calls made */
    toolCalls: Array<Record<string, any>>;
    /** Audit log entries */
    logs: string[];
    /** Token usage (for LLM actions) */
    tokens: {
        prompt: number;
        completion: number;
    };
    /** Execution time (ms) */
    executionTime: number;
}
/**
 * Create an empty effect (monoid identity).
 */
export declare function emptyEffect(): ActionEffect;
/**
 * Combine two effects (monoid append).
 */
export declare function combineEffects(a: ActionEffect, b: ActionEffect): ActionEffect;
/**
 * Result of an action execution.
 *
 * Combines the computed value with accumulated effects.
 * This is the full monad: Reader + Writer + Either.
 */
export interface ActionResult<A> {
    success: boolean;
    value?: A;
    error?: string;
    effects: ActionEffect;
}
/**
 * Create a successful result with a value.
 */
export declare function pureResult<A>(value: A): ActionResult<A>;
/**
 * Create a failed result with an error.
 */
export declare function failResult<A>(error: string): ActionResult<A>;
/**
 * Functor map: Apply function to value if successful.
 */
export declare function mapResult<A, B>(result: ActionResult<A>, f: (a: A) => B): ActionResult<B>;
export type ActionFn<A> = (ctx: ActionContext) => Promise<ActionResult<A>>;
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
export declare class Action<A> {
    private _run;
    /**
     * Create an action from a function.
     *
     * @param run - Async function (ActionContext -> ActionResult<A>)
     */
    constructor(run: ActionFn<A>);
    /**
     * Execute this action with the given context.
     *
     * @param ctx - The execution context
     * @returns The result of the action
     */
    execute(ctx: ActionContext): Promise<ActionResult<A>>;
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
    bind<B>(f: (a: A) => Action<B>): Action<B>;
    /**
     * Functor map.
     *
     * Apply a pure function to the action's result.
     *
     * @param f - Pure function from A to B
     * @returns A new action with the transformed result
     */
    map<B>(f: (a: A) => B): Action<B>;
    /**
     * Sequence with another action, ignoring this result.
     *
     * Useful for side-effect-only actions.
     *
     * @param nextAction - The action to execute after this one
     * @returns The result of nextAction
     */
    then<B>(nextAction: Action<B>): Action<B>;
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
    static pure<A>(value: A): Action<A>;
    /**
     * Create a failing action.
     *
     * @param error - The error message
     * @returns An action that immediately fails
     */
    static fail<A>(error: string): Action<A>;
    /**
     * Reader monad operation: Get the current context.
     *
     * @returns An action that returns the context
     */
    static ask(): Action<ActionContext>;
    /**
     * Reader monad operation: Apply function to context.
     *
     * @param f - Function to apply to context
     * @returns An action that returns f(context)
     */
    static asks<A>(f: (ctx: ActionContext) => A): Action<A>;
    /**
     * Writer monad operation: Emit an effect.
     *
     * @param effect - The effect to emit
     * @returns An action that emits the effect
     */
    static tell(effect: ActionEffect): Action<void>;
    /**
     * Convenience: Log a message.
     *
     * @param message - The log message
     * @returns An action that logs the message
     */
    static log(message: string): Action<void>;
    /**
     * Create an action from an async function.
     *
     * @param f - Async function (ctx -> A)
     * @returns An action wrapping the function
     */
    static fromAsync<A>(f: (ctx: ActionContext) => Promise<A>): Action<A>;
    /**
     * Create an action from a synchronous function.
     *
     * @param f - Sync function (ctx -> A)
     * @returns An action wrapping the function
     */
    static fromSync<A>(f: (ctx: ActionContext) => A): Action<A>;
}
/**
 * Sequence a list of actions, collecting results.
 *
 * @param actions - List of actions to sequence
 * @returns An action that produces a list of results
 */
export declare function sequence<A>(actions: Action<A>[]): Action<A[]>;
/**
 * Execute actions in parallel, collecting results.
 *
 * @param actions - List of actions to execute in parallel
 * @returns An action that produces a list of results
 */
export declare function parallel<A>(actions: Action<A>[]): Action<A[]>;
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
export declare function kleisliCompose<A, B, C>(f: (a: A) => Action<B>, g: (b: B) => Action<C>): (a: A) => Action<C>;
/**
 * The identity Kleisli arrow.
 *
 * This is Action.pure, serving as the identity for Kleisli composition.
 *
 * @returns The identity function in the Kleisli category
 */
export declare function identityAction<A>(): (a: A) => Action<A>;
/**
 * Verify Left Identity law: pure(a).bind(f) == f(a)
 *
 * @param a - A value
 * @param f - A Kleisli arrow
 * @param ctx - Execution context
 * @returns True if the law holds
 */
export declare function verifyLeftIdentity<A, B>(a: A, f: (a: A) => Action<B>, ctx: ActionContext): Promise<boolean>;
/**
 * Verify Right Identity law: m.bind(pure) == m
 *
 * @param m - An action
 * @param ctx - Execution context
 * @returns True if the law holds
 */
export declare function verifyRightIdentity<A>(m: Action<A>, ctx: ActionContext): Promise<boolean>;
/**
 * Verify Associativity law: (m.bind(f)).bind(g) == m.bind(x => f(x).bind(g))
 *
 * @param m - An action
 * @param f - First Kleisli arrow
 * @param g - Second Kleisli arrow
 * @param ctx - Execution context
 * @returns True if the law holds
 */
export declare function verifyAssociativity<A, B, C>(m: Action<A>, f: (a: A) => Action<B>, g: (b: B) => Action<C>, ctx: ActionContext): Promise<boolean>;
/**
 * A condition that can be evaluated against context or result.
 *
 * Conditions form the basis of Hoare Logic contracts:
 * {P} Action {Q} where P = preconditions, Q = postconditions
 */
export interface Condition<T = any> {
    /** Unique name for the condition */
    name: string;
    /** Human-readable description/expression */
    expression: string;
    /** Executable predicate */
    check: (value: T) => boolean;
}
/**
 * Contract defining pre/post conditions for an Action.
 *
 * Implements Hoare triple: {Preconditions} Action {Postconditions}
 */
export interface ActionContract<A> {
    /** Preconditions: must hold before execution (on ActionContext) */
    preconditions: Condition<ActionContext>[];
    /** Postconditions: must hold after execution (on ActionResult<A>) */
    postconditions: Condition<ActionResult<A>>[];
    /** Invariants: must hold throughout (optional) */
    invariants?: Condition<any>[];
}
/**
 * Result of verifying a single condition.
 */
export interface ConditionResult {
    name: string;
    expression: string;
    satisfied: boolean;
    error?: string;
}
/**
 * Result of contract verification for a phase.
 */
export interface ContractVerification {
    phase: 'pre' | 'post';
    conditions: ConditionResult[];
    allSatisfied: boolean;
    timestamp: number;
}
/**
 * VCard pair produced by contract verification.
 *
 * This represents the verification evidence for an Action execution:
 * - PreCondition VCard: Certifies input requirements were met
 * - PostCondition VCard: Certifies output guarantees were met
 */
export interface VCardPair {
    /** MCard hash of PreCondition verification evidence */
    preConditionVCard: string;
    /** MCard hash of PostCondition verification evidence */
    postConditionVCard: string;
    /** Hash identifying the action definition */
    actionHash: string;
    /** Timestamp when the VCards were linked */
    linkedAt: number;
}
/**
 * Result of contract-aware execution.
 */
export interface ContractExecutionResult<A> {
    result: ActionResult<A>;
    vCardPair: VCardPair;
    preVerification: ContractVerification;
    postVerification: ContractVerification;
}
/**
 * Contract-aware Action that produces VCard pairs.
 *
 * Extends the base Action monad with Hoare Logic contracts:
 * - Verifies preconditions before execution
 * - Verifies postconditions after execution
 * - Produces VCard pair as verification evidence
 */
export declare class ContractAction<A> extends Action<A> {
    private contract;
    constructor(run: ActionFn<A>, contract: ActionContract<A>);
    /**
     * Get the contract for this action.
     */
    getContract(): ActionContract<A>;
    /**
     * Verify preconditions against the context.
     */
    verifyPreconditions(ctx: ActionContext): ContractVerification;
    /**
     * Verify postconditions against the result.
     */
    verifyPostconditions(result: ActionResult<A>): ContractVerification;
    /**
     * Create a PreCondition VCard from verification result.
     * Returns a hash representing the VCard (in production, would store in MCard collection).
     */
    createPreConditionVCard(verification: ContractVerification, actionHash: string): string;
    /**
     * Create a PostCondition VCard from verification result.
     * Links back to the PreCondition VCard.
     */
    createPostConditionVCard(verification: ContractVerification, actionHash: string, preVCardHash: string, result: ActionResult<A>): string;
    /**
     * Generate a hash for this action (based on contract).
     */
    getActionHash(): string;
    /**
     * Execute with full contract verification, producing VCard pair.
     *
     * This is the primary method for contract-aware execution:
     * 1. Verify preconditions → create PreCondition VCard
     * 2. Execute action (only if preconditions pass)
     * 3. Verify postconditions → create PostCondition VCard
     * 4. Return result with VCard pair
     */
    executeWithContract(ctx: ActionContext): Promise<ContractExecutionResult<A>>;
    /**
     * Compose contract-aware actions, chaining VCard pairs.
     */
    bindWithContract<B>(f: (a: A) => ContractAction<B>): ContractAction<B>;
    /**
     * Create a contract-aware action from a pure value.
     */
    static pureWithContract<A>(value: A, contract?: ActionContract<A>): ContractAction<A>;
    /**
     * Create a contract-aware action from an async function.
     */
    static fromAsyncWithContract<A>(f: (ctx: ActionContext) => Promise<A>, contract: ActionContract<A>): ContractAction<A>;
}
//# sourceMappingURL=Action.d.ts.map